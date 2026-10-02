# Capturas

Vistas del tablero que usa el `README`. Se regeneran cuando cambia el diseño.

| Archivo | Contenido |
|---|---|
| `escritorio.jpg` · `escritorio-oscuro.jpg` | Página completa a 1440 px de ancho, en modo claro y oscuro |
| `celular.jpg` · `celular-oscuro.jpg` | Primera pantalla a 390 px de ancho |
| `celular-mapa.jpg` | Panel «Origen de visitantes» en celular |
| `arquitectura.png` · `indicador-servicio.png` | Diagramas de cómo funciona y del indicador de frescura (ilustraciones; no se regeneran con esta receta) |

## Receta

1. Generar datos recién publicados, para que el chip salga «al día»: `npm run datos`.
2. Servir sin caché: `npm run servir` y abrir `http://127.0.0.1:8765/`.
3. En Edge o Chrome, abrir las herramientas de desarrollo y emular el ancho (1440 px o 390 px). Para el modo oscuro,
   emular `prefers-color-scheme: dark` en *Rendering*.
4. Esperar a que carguen las teselas del mapa y ejecutar **Capture full size screenshot** (escritorio) o
   **Capture screenshot** (celular).
5. Guardar como JPEG y revisar que el chip diga «Publicación al día» y que la franja «DATOS DE PRUEBA» se vea.
