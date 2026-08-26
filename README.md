# Fuerza

PWA personal y móvil para registrar entrenamientos de fuerza sin conexión. Mantiene el borrador y el historial en IndexedDB y sincroniza cada sesión finalizada como Markdown con un repositorio privado de GitHub.

## Repositorios

- `fuerza-app`: esta aplicación, sus pruebas y el despliegue de GitHub Pages.
- `fuerza-data`: repositorio privado con `entrenamientos/Fuerza_YYYYMMDD.md`, `config/app.json` y `config/favoritos.json`.

La aplicación nunca incluye el token de GitHub en el código o en el paquete compilado. El token se guarda únicamente en IndexedDB en el dispositivo y debe ser un token fine-grained restringido a `fuerza-data`, con permiso `Contents: read and write`.

## Desarrollo

Requisitos: Node.js 24 y npm.

```bash
npm ci
npm run dev
```

Comprobaciones disponibles:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run check:build
npm run test:e2e
```

Las pruebas de navegador usan Chromium y WebKit. La primera vez es necesario ejecutar:

```bash
npx playwright install chromium webkit
```

## Configuración inicial

1. Mantén `fuerza-data` como repositorio privado.
2. Crea un token fine-grained con acceso exclusivo a ese repositorio y `Contents: read and write`.
3. Abre **Ajustes** en la aplicación.
4. Indica propietario, repositorio y token.
5. Pulsa **Probar y guardar conexión**.

La comprobación obtiene la rama predeterminada y escribe `config/app.json`; por tanto valida lectura y escritura reales antes de guardar la conexión local.

## Funcionamiento offline

El app shell y el catálogo de ejercicios se precargan con el service worker. Los GIF se solicitan al entrar en pantalla, con un máximo de seis cargas concurrentes, y se conservan en una caché separada y limitada. IndexedDB es la fuente inmediata de verdad para borradores, sesiones finalizadas y la cola de sincronización.

Si GitHub ya contiene un documento diferente para la misma fecha, la aplicación conserva ambas versiones y exige una segunda confirmación antes de reemplazar la remota.

## Catálogo

`src/catalog/exercises.json` se genera desde una revisión fija de [`hasaneyldrm/exercises-dataset`](https://github.com/hasaneyldrm/exercises-dataset). La compilación ordinaria no usa la red.

```bash
node scripts/update-catalog.mjs
```

## Despliegue

Vite usa la base `/fuerza-app/`. El workflow `pages.yml` valida formato, lint, tipos, pruebas, build y el recorrido móvil completo antes de desplegar `dist/` en GitHub Pages desde `main`.

En GitHub, configura **Settings → Pages → Source → GitHub Actions**. No hacen falta secrets para el token de datos: ese token pertenece al dispositivo y nunca a CI.

## Documentación

- [Producto](PRODUCT.md)
- [Sistema visual](DESIGN.md)
- [Diseño técnico](docs/superpowers/specs/2026-08-19-fuerza-mvp-design.md)
- [Plan de implementación](docs/superpowers/plans/2026-08-19-fuerza-mvp.md)
