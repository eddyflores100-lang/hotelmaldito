# Publicar GameLab by AliceLabs en GitHub Pages (5 minutos)

El proyecto ya incluye el workflow `.github/workflows/deploy.yml`:
cada push a `main` compila y publica el sitio automáticamente.

## Pasos

1. **Crea un repositorio** en github.com (ej.: `gamelab-alicelabs`), sin README.

2. **Sube este proyecto** desde la carpeta del proyecto:

   ```bash
   git init
   git add .
   git commit -m "GameLab by AliceLabs · v1.0 · Licencia AliceLabs"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/gamelab-alicelabs.git
   git push -u origin main
   ```

3. **Activa Pages**: en el repo, Settings → Pages → Build and
   deployment → Source: **GitHub Actions**.

4. **Espera ~1 minuto** (Actions → "Deploy GameLab to GitHub Pages"
   en verde) y abre tu link:

   ```
   https://TU-USUARIO.github.io/gamelab-alicelabs/
   ```

   Ese es el link que puedes compartir.

## Importante: ruta base

Vite compila con rutas absolutas (`/assets/...`). Dos opciones:

- **Opción A (sin tocar nada):** llama al repo `TU-USUARIO.github.io`
  (sitio de usuario). Funciona al instante en `https://TU-USUARIO.github.io/`.

- **Opción B (repo normal):** en `vite.config.ts` cambia
  `base: "/"` (o añade `base: "/gamelab-alicelabs/"`) con el nombre
  exacto de tu repo, y vuelve a hacer push. El workflow recompila solo.

## Licencia

Todo el contenido se publica bajo la **Licencia AliceLabs v1.0**
(archivo `LICENSE` en la raíz y visible en `/LICENSE.txt` del sitio).
Conserva los créditos al redistribuir.
