# La Contabilidad de tu Tiempo

Portal estático (React + Vite + Tailwind + Framer Motion) para registrar el día en bloques de 30 min (06:00–22:00) y ver el **estado de resultados** semanal. Backend: Google Apps Script sobre una hoja de cálculo.

## 1. Backend (Google Sheets + Apps Script)
1. Crea una hoja de cálculo nueva → **Extensiones → Apps Script**.
2. Pega el contenido de `apps-script/Code.gs`.
3. Ejecuta la función `setup` (autoriza los permisos). Crea las pestañas `Usuarios`, `Registros` y `Sueno` y genera el secreto de sesión. Si actualizas desde una versión anterior, vuelve a ejecutarla y publica una **nueva versión** de la implementación.
4. **Configuración del proyecto → Propiedades de la secuencia de comandos**: cambia `CODIGO_ACCESO` por el código que tu jefa dará a sus alumnos.
5. **Implementar → Nueva implementación → Aplicación web**: ejecutar como *Yo*, acceso *Cualquier persona*. Copia la URL que termina en `/exec`.
   > Cada cambio en `Code.gs` requiere **Implementar → Administrar implementaciones → Editar → Nueva versión**.

## 2. Frontend en local
```bash
cp .env.example .env     # pega tu URL /exec en VITE_API_URL
npm install
npm run dev
```

## 3. Despliegue en Render (Static Site)
Con el repo en GitHub: **New → Blueprint** (usa `render.yaml`) o **New → Static Site** con:
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Environment: `VITE_API_URL` = URL `/exec`
- Redirects/Rewrites: `/*` → `/index.html` (rewrite)

## Sueño y días de 24 h
- Al crear la cuenta se pide el horario habitual de sueño (se edita con el ícono de luna). Con él se avisa cuando toca acostarse y despertar.
- Cada mañana se pregunta "¿cuánto dormiste?" (hora de dormir y de despertar). Los bloques anteriores a despertar cuentan como sueño y no se piden.
- El estado de resultados suma sueño + bloques de 06:00–22:00 + el hueco entre las 22:00 y la hora de acostarse, para que cada día sume 24 h.

## Notas
- Las contraseñas se guardan con sal + hash (nunca en texto plano) y la sesión es un token firmado (HMAC) de 90 días que se renueva con cada uso.
- Registrarse requiere el `CODIGO_ACCESO`, así solo entran los alumnos de la clase.
- Los recordatorios (:00 y :30) funcionan con la app abierta o instalada como PWA en segundo plano. Con la app totalmente cerrada haría falta Web Push con servidor, que rompe el enfoque 100 % estático. En iPhone hay que "Añadir a pantalla de inicio" primero.

## Video explicativo
`video/la-contabilidad-de-tu-tiempo.mp4` (1920×1080, 2 min, sin audio). El código fuente es `video/index.html` (animación determinista) y `video/render.mjs` (renderiza los cuadros; luego `ffmpeg -framerate 30 -i frames/%05d.jpg -c:v libx264 -crf 19 -pix_fmt yuv420p out.mp4`). Las capturas del portal están en `video/assets/`.
