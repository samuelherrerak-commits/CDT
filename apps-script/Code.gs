/**
 * LA CONTABILIDAD DE TU TIEMPO — Backend (Google Apps Script)
 *
 * Hoja de cálculo con 3 pestañas (se crean solas al ejecutar setup()):
 *   Usuarios:  Email | Nombre | Sal | HashPassword | Creado | HoraDormir | HoraDespertar   (horario habitual)
 *   Registros: Email | Fecha (YYYY-MM-DD) | Hora (HH:mm, inicio del bloque) | Actividad | Categoria | Actualizado
 *   Sueno:     Email | Fecha (día en que despertó) | Durmio (HH:mm) | Desperto (HH:mm) | Minutos | Actualizado
 *
 * Configuración (Configuración del proyecto > Propiedades de la secuencia de comandos):
 *   CODIGO_ACCESO  Código que la profesora comparte con sus alumnos para poder registrarse.
 *   ADMIN_EMAILS   Correos del profesor/a (separados por comas) con acceso al panel de administración.
 *   (TOKEN_SECRET se genera automáticamente en setup()).
 */

var HOJA_USUARIOS = 'Usuarios';
var HOJA_REGISTROS = 'Registros';
var HOJA_SUENO = 'Sueno';
var CATEGORIAS = ['inversion', 'gasto', 'mantenimiento'];
var TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 días; se renueva en cada carga (sesión deslizante)
var HASH_ITERACIONES = 1000;
var BLOQUES_DIA_COMPLETO = 24; // un día cuenta como "completo" con >= 24 bloques registrados (12 h; unas 16 h despierto/a)

/** Ejecutar UNA vez desde el editor para crear hojas y secretos. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();

  var usuarios = ss.getSheetByName(HOJA_USUARIOS) || ss.insertSheet(HOJA_USUARIOS);
  usuarios.getRange(1, 1, 1, 7).setValues([['Email', 'Nombre', 'Sal', 'HashPassword', 'Creado', 'HoraDormir', 'HoraDespertar']]);
  usuarios.getRange('A:G').setNumberFormat('@'); // texto plano, evita conversiones de Sheets
  usuarios.setFrozenRows(1);

  var registros = ss.getSheetByName(HOJA_REGISTROS) || ss.insertSheet(HOJA_REGISTROS);
  registros.getRange(1, 1, 1, 6).setValues([['Email', 'Fecha', 'Hora', 'Actividad', 'Categoria', 'Actualizado']]);
  registros.getRange('A:F').setNumberFormat('@');
  registros.setFrozenRows(1);

  hojaSueno_();

  if (!props.getProperty('TOKEN_SECRET')) props.setProperty('TOKEN_SECRET', Utilities.getUuid() + Utilities.getUuid());
  if (props.getProperty('ADMIN_EMAILS') === null) props.setProperty('ADMIN_EMAILS', '');
  if (!props.getProperty('CODIGO_ACCESO')) props.setProperty('CODIGO_ACCESO', 'CAMBIA-ESTE-CODIGO');
}

function doGet() {
  return json_({ ok: true, servicio: 'La Contabilidad de tu Tiempo' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var data = JSON.parse(e.postData.contents);
    switch (data.action) {
      case 'registro':   return json_(registro_(data));
      case 'login':      return json_(login_(data));
      case 'nueva_password': return json_(nuevaPassword_(data));
      case 'admin_resumen':  return json_(adminResumen_(data));
      case 'admin_alumno':   return json_(adminAlumno_(data));
      case 'admin_reset':    return json_(adminReset_(data));
      case 'admin_exportar': return json_(adminExportar_(data));
      case 'guardar':    return json_(guardar_(data));
      case 'eliminar':   return json_(eliminar_(data));
      case 'registros':  return json_(listar_(data));
      case 'perfil':     return json_(guardarPerfil_(data));
      case 'sueno':      return json_(guardarSueno_(data));
      default:           return json_({ success: false, message: 'Acción no válida' });
    }
  } catch (err) {
    return json_({ success: false, message: err && err.message ? err.message : 'Error del servidor' });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/* ---------- Acciones ---------- */

function registro_(d) {
  var email = normEmail_(d.email);
  var nombre = String(d.nombre || '').trim().slice(0, 60);
  var password = String(d.password || '');
  if (!email || !nombre) return fail_('Nombre y correo son obligatorios');
  if (password.length < 6) return fail_('La contraseña debe tener al menos 6 caracteres');

  var esperado = PropertiesService.getScriptProperties().getProperty('CODIGO_ACCESO');
  if (!esperado || String(d.codigo || '').trim() !== esperado) return fail_('Código de acceso incorrecto');

  var ws = hoja_(HOJA_USUARIOS);
  if (buscarUsuario_(ws, email)) return fail_('Ese correo ya está registrado');

  var sal = Utilities.getUuid();
  ws.appendRow([email, nombre, sal, hash_(password, sal), new Date().toISOString()]);
  return { success: true, name: nombre, email: email, perfil: null, admin: esAdmin_(email), token: crearToken_(email) };
}

function login_(d) {
  var email = normEmail_(d.email);
  var fila = buscarUsuario_(hoja_(HOJA_USUARIOS), email);
  // Contraseña borrada en la hoja por la profesora: la app pide crear una nueva (ver nuevaPassword_).
  if (fila && String(fila.row[3]).trim() === '') return { success: false, needsPassword: true, message: 'Crea tu nueva contraseña' };
  // Mismo mensaje para "no existe" y "contraseña incorrecta".
  if (!fila || hash_(String(d.password || ''), fila.row[2]) !== fila.row[3]) return fail_('Credenciales inválidas');
  return { success: true, name: fila.row[1], email: email, perfil: perfil_(fila.row), admin: esAdmin_(email), token: crearToken_(email) };
}

/**
 * Restablecer contraseña: la profesora borra la celda HashPassword (columna D) del alumno en la hoja.
 * Mientras esté vacía, el alumno puede fijar una nueva, pero SOLO con el código de acceso del curso.
 */
function nuevaPassword_(d) {
  var email = normEmail_(d.email);
  var password = String(d.password || '');
  if (password.length < 6) return fail_('La contraseña debe tener al menos 6 caracteres');
  var esperado = PropertiesService.getScriptProperties().getProperty('CODIGO_ACCESO');
  if (!esperado || String(d.codigo || '').trim() !== esperado) return fail_('Código de acceso incorrecto');

  var ws = hoja_(HOJA_USUARIOS);
  var fila = buscarUsuario_(ws, email);
  if (!fila || String(fila.row[3]).trim() !== '') return fail_('Esta cuenta no está pendiente de una contraseña nueva');

  var sal = Utilities.getUuid();
  ws.getRange(fila.index, 3, 1, 2).setValues([[sal, hash_(password, sal)]]);
  return { success: true, name: fila.row[1], email: email, perfil: perfil_(fila.row), admin: esAdmin_(email), token: crearToken_(email) };
}

function guardar_(d) {
  var email = verificarToken_(d.token);
  var fecha = validarFecha_(d.fecha);
  var hora = validarHora_(d.hora);
  var actividad = String(d.actividad || '').trim().slice(0, 200);
  var categoria = String(d.categoria || '');
  if (!actividad) return fail_('Escribe qué hiciste');
  if (CATEGORIAS.indexOf(categoria) === -1) return fail_('Categoría no válida');

  var ws = hoja_(HOJA_REGISTROS);
  var ahora = new Date().toISOString();
  var fila = buscarRegistro_(ws, email, fecha, hora);
  if (fila) {
    ws.getRange(fila, 4, 1, 3).setValues([[actividad, categoria, ahora]]); // actualiza, no duplica
  } else {
    ws.appendRow([email, fecha, hora, actividad, categoria, ahora]);
  }
  return { success: true };
}

function eliminar_(d) {
  var email = verificarToken_(d.token);
  var ws = hoja_(HOJA_REGISTROS);
  var fila = buscarRegistro_(ws, email, validarFecha_(d.fecha), validarHora_(d.hora));
  if (fila) ws.deleteRow(fila);
  return { success: true };
}

/** Horario habitual de sueño del usuario (para los avisos de dormir y despertar). */
function guardarPerfil_(d) {
  var email = verificarToken_(d.token);
  var dormir = validarHoraLibre_(d.dormir);
  var despertar = validarHoraLibre_(d.despertar);
  var fila = buscarUsuario_(hoja_(HOJA_USUARIOS), email);
  if (!fila) return fail_('Usuario no encontrado');
  var ws = hoja_(HOJA_USUARIOS);
  ws.getRange(1, 6, 1, 2).setValues([['HoraDormir', 'HoraDespertar']]);
  ws.getRange(fila.index, 6, 1, 2).setNumberFormat('@').setValues([[dormir, despertar]]);
  return { success: true };
}

/** Sueño de la noche anterior; la fecha es el día en que despertó. Reemplaza si ya existe. */
function guardarSueno_(d) {
  var email = verificarToken_(d.token);
  var fecha = validarFecha_(d.fecha);
  var dormir = validarHoraLibre_(d.dormir);
  var despertar = validarHoraLibre_(d.despertar);
  var minutos = (minDe_(despertar) - minDe_(dormir) + 1440) % 1440;
  if (minutos < 30 || minutos > 1200) return fail_('Revisa las horas: el sueño debe durar entre 30 min y 20 h');

  var ws = hojaSueno_();
  var filas = ws.getDataRange().getValues();
  var fila = 0;
  for (var i = 1; i < filas.length; i++) {
    if (String(filas[i][0]).toLowerCase() === email && fechaTexto_(filas[i][1]) === fecha) { fila = i + 1; break; }
  }
  var datos = [dormir, despertar, String(minutos), new Date().toISOString()];
  if (fila) ws.getRange(fila, 3, 1, 4).setValues([datos]);
  else ws.appendRow([email, fecha].concat(datos));
  return { success: true, minutos: minutos };
}

/** Devuelve los registros del usuario entre dos fechas (inclusive). El frontend calcula el estado de resultados. */
function listar_(d) {
  var email = verificarToken_(d.token);
  var r = datosDe_(email, validarFecha_(d.desde), validarFecha_(d.hasta));
  return { success: true, data: r.data, sueno: r.sueno, perfil: r.perfil, admin: esAdmin_(email), token: crearToken_(email) }; // renueva la sesión
}

/** Registros, sueño y horario habitual de un usuario en un rango de fechas (ISO, inclusive). */
function datosDe_(email, desde, hasta) {
  var out = [];
  var filas = hoja_(HOJA_REGISTROS).getDataRange().getValues();
  for (var i = 1; i < filas.length; i++) {
    var r = filas[i];
    if (String(r[0]).toLowerCase() !== email) continue;
    var fecha = fechaTexto_(r[1]);
    if (fecha < desde || fecha > hasta) continue; // ISO se compara bien como texto
    out.push({ fecha: fecha, hora: horaTexto_(r[2]), actividad: r[3], categoria: r[4] });
  }
  var sueno = [];
  var fs = hojaSueno_().getDataRange().getValues();
  for (var j = 1; j < fs.length; j++) {
    var q = fs[j];
    if (String(q[0]).toLowerCase() !== email) continue;
    var f = fechaTexto_(q[1]);
    if (f < desde || f > hasta) continue;
    sueno.push({ fecha: f, dormir: horaTexto_(q[2]), despertar: horaTexto_(q[3]), minutos: Number(q[4]) });
  }
  var u = buscarUsuario_(hoja_(HOJA_USUARIOS), email);
  return { data: out, sueno: sueno, perfil: u ? perfil_(u.row) : null };
}

/* ---------- Administración (profesor/a) ---------- */

function admins_() {
  var v = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '';
  return v.split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
}
function esAdmin_(email) { return admins_().indexOf(email) !== -1; }
function requerirAdmin_(token) {
  var email = verificarToken_(token);
  if (!esAdmin_(email)) throw new Error('Sin permiso');
  return email;
}

/** Una fila por alumno con sus métricas del rango [desde, hasta]; "días completos" se cuenta sobre todo el curso. */
function adminResumen_(d) {
  requerirAdmin_(d.token);
  var desde = validarFecha_(d.desde), hasta = validarFecha_(d.hasta), hoy = validarFecha_(d.hoy);
  var admins = admins_();

  var alumnos = {}, orden = [];
  var us = hoja_(HOJA_USUARIOS).getDataRange().getValues();
  for (var i = 1; i < us.length; i++) {
    var email = String(us[i][0]).toLowerCase();
    if (!email || admins.indexOf(email) !== -1) continue;
    alumnos[email] = { email: email, nombre: us[i][1], perfil: perfil_(us[i]), pendientePassword: String(us[i][3]).trim() === '',
      bloques: 0, porCat: { inversion: 0, gasto: 0, mantenimiento: 0 }, suenoMin: 0, suenoDias: 0, ultimo: '', bloquesHoy: 0, _dias: {} };
    orden.push(email);
  }

  var filas = hoja_(HOJA_REGISTROS).getDataRange().getValues();
  for (var j = 1; j < filas.length; j++) {
    var a = alumnos[String(filas[j][0]).toLowerCase()];
    if (!a) continue;
    var f = fechaTexto_(filas[j][1]);
    a._dias[f] = (a._dias[f] || 0) + 1;
    if (f > a.ultimo) a.ultimo = f;
    if (f === hoy) a.bloquesHoy++;
    if (f >= desde && f <= hasta) {
      a.bloques++;
      var c = filas[j][4];
      if (a.porCat[c] !== undefined) a.porCat[c]++;
    }
  }

  var fs = hojaSueno_().getDataRange().getValues();
  for (var k = 1; k < fs.length; k++) {
    var b = alumnos[String(fs[k][0]).toLowerCase()];
    var fk = fechaTexto_(fs[k][1]);
    if (!b || fk < desde || fk > hasta) continue;
    b.suenoMin += Number(fs[k][4]) || 0;
    b.suenoDias++;
  }

  var lista = orden.map(function (e) {
    var x = alumnos[e], dias = Object.keys(x._dias), completos = 0;
    dias.forEach(function (dia) { if (x._dias[dia] >= BLOQUES_DIA_COMPLETO) completos++; });
    x.diasConActividad = dias.length;
    x.diasCompletos = completos;
    delete x._dias;
    return x;
  });
  lista.sort(function (p, q) { return String(p.nombre).localeCompare(String(q.nombre)); });
  return { success: true, alumnos: lista };
}

/** Los mismos datos que ve el alumno (registros, sueño, horario) para el rango pedido. */
function adminAlumno_(d) {
  requerirAdmin_(d.token);
  var email = normEmail_(d.email);
  if (!buscarUsuario_(hoja_(HOJA_USUARIOS), email)) return fail_('Alumno no encontrado');
  var r = datosDe_(email, validarFecha_(d.desde), validarFecha_(d.hasta));
  return { success: true, data: r.data, sueno: r.sueno, perfil: r.perfil };
}

/** Borra el hash: el alumno crea una contraseña nueva al entrar (ver nuevaPassword_). */
function adminReset_(d) {
  requerirAdmin_(d.token);
  var email = normEmail_(d.email);
  if (esAdmin_(email)) return fail_('Las cuentas de administrador se restablecen directamente en la hoja');
  var ws = hoja_(HOJA_USUARIOS);
  var fila = buscarUsuario_(ws, email);
  if (!fila) return fail_('Alumno no encontrado');
  ws.getRange(fila.index, 4).setValue('');
  return { success: true };
}

/** Todos los registros y sueño de los alumnos en el rango, con nombre, para descargar en CSV. */
function adminExportar_(d) {
  requerirAdmin_(d.token);
  var desde = validarFecha_(d.desde), hasta = validarFecha_(d.hasta);
  var admins = admins_(), nombres = {};
  var us = hoja_(HOJA_USUARIOS).getDataRange().getValues();
  for (var i = 1; i < us.length; i++) nombres[String(us[i][0]).toLowerCase()] = us[i][1];

  var registros = [], sueno = [];
  var filas = hoja_(HOJA_REGISTROS).getDataRange().getValues();
  for (var j = 1; j < filas.length; j++) {
    var e = String(filas[j][0]).toLowerCase(), f = fechaTexto_(filas[j][1]);
    if (admins.indexOf(e) !== -1 || f < desde || f > hasta) continue;
    registros.push({ nombre: nombres[e] || '', email: e, fecha: f, hora: horaTexto_(filas[j][2]), actividad: filas[j][3], categoria: filas[j][4] });
  }
  var fs = hojaSueno_().getDataRange().getValues();
  for (var k = 1; k < fs.length; k++) {
    var e2 = String(fs[k][0]).toLowerCase(), f2 = fechaTexto_(fs[k][1]);
    if (admins.indexOf(e2) !== -1 || f2 < desde || f2 > hasta) continue;
    sueno.push({ nombre: nombres[e2] || '', email: e2, fecha: f2, dormir: horaTexto_(fs[k][2]), despertar: horaTexto_(fs[k][3]), minutos: Number(fs[k][4]) });
  }
  return { success: true, registros: registros, sueno: sueno };
}

/* ---------- Utilidades ---------- */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function fail_(message) { return { success: false, message: message }; }
function hoja_(nombre) {
  var ws = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!ws) throw new Error('Falta la pestaña ' + nombre + '. Ejecuta setup().');
  return ws;
}
function normEmail_(v) { return String(v || '').trim().toLowerCase(); }

function validarFecha_(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) throw new Error('Fecha no válida');
  return String(v);
}
function validarHoraLibre_(v) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v))) throw new Error('Hora no válida');
  return String(v);
}
function minDe_(hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; }
function perfil_(row) {
  return row[5] && row[6] ? { dormir: horaTexto_(row[5]), despertar: horaTexto_(row[6]) } : null;
}
function hojaSueno_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName(HOJA_SUENO);
  if (!ws) {
    ws = ss.insertSheet(HOJA_SUENO);
    ws.getRange(1, 1, 1, 6).setValues([['Email', 'Fecha', 'Durmio', 'Desperto', 'Minutos', 'Actualizado']]);
    ws.getRange('A:F').setNumberFormat('@');
    ws.setFrozenRows(1);
  }
  return ws;
}
function validarHora_(v) {
  var m = /^(\d{2}):(\d{2})$/.exec(String(v));
  if (!m || (m[2] !== '00' && m[2] !== '30') || +m[1] > 23) throw new Error('Hora no válida');
  return String(v);
}
// Defensa por si Sheets convirtió el texto en Date.
function fechaTexto_(v) {
  return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v);
}
function horaTexto_(v) {
  return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm') : String(v);
}

function buscarUsuario_(ws, email) {
  var filas = ws.getDataRange().getValues();
  for (var i = 1; i < filas.length; i++) if (String(filas[i][0]).toLowerCase() === email) return { index: i + 1, row: filas[i] };
  return null;
}
function buscarRegistro_(ws, email, fecha, hora) {
  var filas = ws.getDataRange().getValues();
  for (var i = 1; i < filas.length; i++) {
    if (String(filas[i][0]).toLowerCase() === email && fechaTexto_(filas[i][1]) === fecha && horaTexto_(filas[i][2]) === hora) return i + 1;
  }
  return 0;
}

function toHex_(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function hash_(password, sal) {
  var h = sal + password;
  for (var i = 0; i < HASH_ITERACIONES; i++) {
    h = toHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + sal));
  }
  return h;
}

/** Token sin estado: base64(email|expira).firma-HMAC */
function secreto_() {
  var s = PropertiesService.getScriptProperties().getProperty('TOKEN_SECRET');
  if (!s) throw new Error('Falta TOKEN_SECRET. Ejecuta setup().');
  return s;
}
function firmar_(payload) {
  return toHex_(Utilities.computeHmacSha256Signature(payload, secreto_()));
}
function crearToken_(email) {
  var payload = Utilities.base64EncodeWebSafe(email + '|' + (Date.now() + TOKEN_TTL_MS));
  return payload + '.' + firmar_(payload);
}
function verificarToken_(token) {
  var partes = String(token || '').split('.');
  if (partes.length !== 2 || firmar_(partes[0]) !== partes[1]) throw new Error('Sesión no válida');
  var contenido = Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString().split('|');
  if (+contenido[1] < Date.now()) throw new Error('Sesión expirada');
  return contenido[0];
}

