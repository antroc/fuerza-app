# Fuerza MVP Design

## Objective

Construir una PWA React y TypeScript, móvil primero, que permita registrar entrenamientos de fuerza sin conexión y sincronizar sesiones finalizadas con `antroc/fuerza-data` mediante la API de contenidos de GitHub. `antroc/fuerza-app` contiene el código y se publica en GitHub Pages.

## Product Boundaries

El MVP es para una sola persona. Incluye sesión activa, catálogo filtrable, favoritos, series variables, historial, exportación Markdown, sincronización y PWA. Excluye usuarios, rutinas predefinidas, gráficos, récords, recomendaciones, backend y traducción completa del dataset.

## Architecture

- React, TypeScript y Vite para la interfaz estática.
- Dexie/IndexedDB como fuente inmediata de verdad y almacenamiento de `workouts`, `favorites`, `syncQueue` y `settings`.
- Dominio puro para validación, renumeración, volumen y finalización.
- Catálogo JSON normalizado y versionado, generado desde una revisión fija de `hasaneyldrm/exercises-dataset`.
- Renderizador y lector deterministas del Markdown `schema_version: 1`.
- Adaptador aislado para la API de GitHub y procesador secuencial de operaciones idempotentes.
- Service worker con cachés separadas para app shell, catálogo y GIF bajo demanda.

## Domain Decisions

`WorkoutSet.weightGrams` es `null` o un entero mayor o igual que cero; `repetitions` es `null` o entero mayor que cero. Una serie solo se completa con ambos valores válidos. Posiciones empiezan en uno y se renumeran tras eliminar o reordenar.

Un `Workout` usa como id la fecha local de `startedAt` en `Europe/Madrid`. Solo hay una sesión por fecha y un borrador activo por dispositivo. Cruzar medianoche no cambia el id. Finalizar exige una serie válida completada, fija `finishedAt`, bloquea la edición y crea la operación de sincronización en la misma transacción local.

Peso cero se admite para ejercicios sin carga externa. Al importar Markdown se generan UUID locales nuevos porque el formato público no contiene ids internos. El adaptador diferencia el SHA del contenido necesario para actualizaciones del SHA del commit guardado como auditoría.

## Markdown Contract

Cada sesión se guarda como `entrenamientos/Fuerza_YYYYMMDD.md`. Front matter y encabezados son estables; fechas ISO 8601 incluyen desplazamiento; pesos usan punto decimal. Solo se exportan ejercicios con series completadas y solo filas completadas válidas. `total_sets` cuenta filas y `total_volume_kg` suma exactamente gramos por repeticiones convertido a kilogramos. El lector rechaza versiones desconocidas sin alterar el documento remoto.

## GitHub Synchronization

La configuración valida que `antroc/fuerza-data` sea privado, obtiene la rama predeterminada y crea o actualiza `config/app.json` con su SHA actual antes de guardar el token localmente. El token fine-grained se restringe al repositorio con `Contents: read and write` y nunca entra en compilación, caché, URL o logs.

La cola procesa una operación cada vez. Para entrenamientos: crea si falta, acepta como sincronizado si el contenido remoto es idéntico y marca conflicto si difiere. Nunca sobrescribe un conflicto sin segunda confirmación. Errores de red mantienen la cola; autenticación detiene el procesamiento; rate limits respetan `Retry-After`.

Favoritos se sincronizan en `config/favoritos.json`; cada ejercicio se fusiona por `updated_at`, incluidos tombstones `is_favorite: false`. Antes de escribir se usa el SHA de contenido y se repite lectura/fusión si hubo una actualización concurrente.

Al conectar un dispositivo nuevo se listan documentos remotos, se validan y se importan como sesiones finalizadas. Un documento inválido se informa y no se modifica. Si existe un borrador local de la misma fecha, se conserva el borrador y la importación se marca como conflicto para decisión explícita.

## Experience

Navegación inferior: Inicio, Historial y Ajustes. Inicio permite comenzar o continuar el único borrador y muestra sesiones recientes y sincronización. Entrenamiento activo sigue la dirección visual B aprobada: registro compacto, ejercicios de ancho completo, filas alineadas, acciones persistentes y estados textuales.

El selector filtra Favoritos, Pecho, Espalda, Hombros, Brazos, Piernas y Core; busca sin mayúsculas ni acentos y ordena favoritos primero. Los resultados se paginan en grupos pequeños. GIF e imagen estática se solicitan solo al entrar en viewport, con máximo seis solicitudes y fallback seleccionable.

Historial muestra fecha, duración, ejercicios, series y volumen, más detalle completo y últimos valores por ejercicio. Ajustes gestiona repositorio, rama, token, prueba de escritura, estado, sincronización manual y desconexión conservando datos locales.

## Quality and Delivery

Funciona desde 360 px, con objetivos táctiles de 44 px, teclado, foco visible, texto alternativo, reducción de movimiento y contraste AA. Vitest cubre dominio, Markdown, persistencia y componentes; Playwright ejecuta el recorrido offline crítico en Chromium y WebKit. GitHub Actions valida formato, lint, tipos, pruebas y build antes de desplegar `dist/` con base `/fuerza-app/`.
