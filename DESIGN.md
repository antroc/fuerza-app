# Fuerza Design System

## Direction

Interfaz de producto minimalista y utilitaria. La referencia aprobada es la dirección B: registro compacto, secciones de ejercicio de ancho completo, filas de series alineadas y una zona inferior de acciones persistente.

## Color

Todos los colores se expresan en OKLCH.

```css
--color-bg: oklch(1 0 0);
--color-surface: oklch(0.965 0.004 250);
--color-ink: oklch(0.205 0.018 255);
--color-primary: oklch(0.57 0.19 255);
--color-energy: oklch(0.634 0.22 17.6);
--color-muted: oklch(0.49 0.025 255);
```

El azul se reserva para acciones principales, selección y foco. El coral indica finalización o energía y nunca sustituye una etiqueta textual. Fondo blanco puro, superficies frías casi blancas y tinta grafito; sin gradientes, resplandores ni glassmorphism.

## Typography

Una única pila sans del sistema: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Escala fija de producto en `rem`; cuerpo mínimo de `1rem`. Los valores de peso, repeticiones, duración y volumen usan números tabulares.

## Spacing and Shape

Escala base de 4 px: 4, 8, 12, 16, 24, 32 y 48 px. Agrupación estrecha dentro de una serie y separación clara entre ejercicios. Bordes de 8–12 px en controles y paneles; botones de acción pueden ser píldoras solo cuando su semántica lo justifique. No se anidan tarjetas.

## Layout

En móvil, encabezado compacto, contenido desplazable y navegación inferior persistente respetando `safe-area-inset-bottom`. La sesión activa usa columnas estables para número, peso, repeticiones y estado. En escritorio, el contenido se centra con ancho legible y aprovecha espacio adicional sin aumentar de forma fluida la tipografía.

## Interaction

Controles de al menos 44 × 44 px, estados `hover`, `focus-visible`, `active`, `disabled`, carga, error y éxito. Transiciones de estado entre 150 y 200 ms; se eliminan con movimiento reducido. Los campos muestran etiquetas y unidades, usan teclado numérico móvil y no dependen de placeholders.

## Approved Mock Inventory

- Mantener: registro compacto, secciones completas por ejercicio, números tabulares, filas completadas sutilmente diferenciadas y barra inferior con `Finalizar` y `Añadir ejercicio`.
- Interpretar semánticamente: iconos, menús y controles se implementan con componentes accesibles, no como píxeles calcados.
- Omitir: brillos, sombras amplias, iconos redundantes y cualquier texto o alineación defectuosa propia de la imagen generada.
