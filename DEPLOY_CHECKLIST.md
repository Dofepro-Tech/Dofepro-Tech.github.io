# Checklist de despliegue y publicación

## 1. Desarrollo local

- Verificar que `.env.local` exista en la raíz del proyecto.
- Confirmar que `AI_PROVIDER="openrouter"` esté definido.
- Confirmar que `OPENROUTER_API_KEY` tenga una clave válida.
- Mantener `OPENROUTER_SITE_URL="http://localhost:3000"` solo para pruebas locales.
- Ejecutar `npm run lint`.
- Ejecutar `npm run build`.
- Ejecutar `npm run dev` o `npm start`.
- Probar una llamada real a `/api/ai/explain`.
- Probar la búsqueda global en `/api/bible/search`.

## 2. Seguridad

- Si una clave fue expuesta en chat, capturas o repositorios, regenerarla de inmediato.
- No subir `.env.local` al repositorio.
- No colocar `OPENROUTER_API_KEY` en frontend, Android o iOS.
- Publicar el backend final usando HTTPS.

## 3. Producción backend

- Desplegar el backend Express en un hosting con HTTPS.
- Configurar en el hosting las variables:

```dotenv
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=TU_CLAVE_REAL
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_SITE_URL=https://tu-dominio.com
OPENROUTER_APP_NAME=Biblia NJ
```

- Confirmar que el backend responda en rutas como `/api/ai/explain`.
- Confirmar que el dominio público use HTTPS.
- Si frontend y backend se separan, definir `ALLOWED_ORIGINS` en el backend.
- Confirmar que `/assets/*.css` y `/assets/*.js` respondan con MIME correcto.
- Confirmar que un asset inexistente dentro de `/assets` responda `404` y no `index.html`.

## 4. App móvil

- Ejecutar `powershell -ExecutionPolicy Bypass -File .\scripts\generate-brand-assets.ps1` si hubo cambios de iconos, splash o branding.
- Ejecutar `npx cap sync android` después de cada `npm run build` que vaya a usarse en Android.
- Verificar que `android/app/src/main/assets/public/index.html` apunte a los hashes actuales del `dist/`.
- Generar la build debug con `android\gradlew.bat assembleDebug`.
- Generar la build release con `android\gradlew.bat assembleRelease`.
- Si la build release debe quedar firmada, preparar `android/keystore.properties` a partir de `android/keystore.properties.example` y colocar el `.jks` real.
- Hacer backup seguro del `.jks` y de `android/keystore.properties`; sin ellos no podrás publicar actualizaciones firmadas con la misma identidad.
- Configurar la app móvil para consumir el backend público por HTTPS.
- Definir una variable pública de cliente solo para la URL del backend.
- No almacenar claves de OpenRouter en la app.
- Para pruebas Android locales, usar `VITE_API_BASE_URL` con la IP LAN del backend.
- Recordar que la build release solo saldrá firmada si existe `android/keystore.properties` con un keystore válido.
- Para iOS, realizar la compilación final en macOS con Xcode.

## 5. Publicación en tiendas

- Publicar una política de privacidad accesible por URL pública.
- Declarar uso de servicios remotos si la tienda lo solicita.
- Declarar uso de funciones de IA si la tienda lo solicita.
- Mantener correo de contacto visible para soporte y privacidad.
- Verificar que icono, splash y nombre de aplicación sean los finales antes de subir la build.

## 6. Validación final

- Probar lectura bíblica sin IA.
- Probar explicación, chat y estudio guiado con IA.
- Probar retos diarios, racha, recompensas y contenido diario.
- Verificar errores de red y mensajes de fallback.
- Confirmar que el frontend no exponga claves.
- Si se usa un túnel temporal como localhost.run, tratarlo solo como pruebas; no usarlo como URL pública permanente.
