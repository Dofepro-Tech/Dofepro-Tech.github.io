# Publicar la landing en tu cuenta

Artefactos listos:

- ZIP listo para hosting: `release/biblia-dj-public-site.zip`
- Landing dentro del sitio: `dist/download.html`
- APK dentro del sitio: `dist/biblia-dj-android.apk`
- APK release final local: `release/biblia-dj-release-public.apk`

## Opción 1: Netlify

1. Inicia sesión en Netlify.
2. Crea un nuevo sitio por drag-and-drop o abre `https://app.netlify.com/drop` ya autenticado.
3. Sube el contenido de `release/biblia-dj-public-site.zip`.
4. Cuando Netlify te dé la URL pública, copia la landing final:

   `https://TU-SITIO.netlify.app/download.html`

## Opción 2: Vercel

1. Inicia sesión en Vercel.
2. Crea un nuevo proyecto estático.
3. Sube el contenido descomprimido de `release/biblia-dj-public-site.zip` o la carpeta `dist/`.
4. Usa como URL pública final:

   `https://TU-SITIO.vercel.app/download.html`

## Opción 3: GitHub Pages

1. Crea un repo en GitHub.
2. Sube el contenido descomprimido de `release/biblia-dj-public-site.zip`.
3. Activa GitHub Pages desde la rama principal o `docs/`.
4. Usa como URL pública final:

   `https://TU-USUARIO.github.io/TU-REPO/download.html`

## Opción 4: GitHub Pages automático

1. Sube este proyecto a GitHub con la carpeta `.github/workflows/` incluida.
2. Deja una APK pública actualizada en `release/biblia-dj-release-public.apk` antes de hacer push.
3. Crea preferiblemente el repo `Dofepro-Tech.github.io` para usar la URL raíz del usuario.
4. Activa GitHub Pages con Source: GitHub Actions.
5. Cada push a `main` o `master` publicará la web y servirá también `biblia-dj-android.apk`.

La URL final será:

`https://dofepro-tech.github.io/download.html`

## Último paso en la app

Cuando tengas la URL pública final, reemplaza la línea 1 de `.env.production` con esa URL.

Ejemplo:

`VITE_APP_DOWNLOAD_URL=https://dofepro-tech.github.io/download.html`

Luego regenera la app:

1. `npm run mobile:sync`
2. `cd android`
3. `.\gradlew.bat assembleRelease`

El APK final volverá a salir en:

`release/biblia-dj-release-public.apk`