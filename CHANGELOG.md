# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico.

## [2.0.0] - 2026-09-29

### Cambiado
- **Rediseño visual institucional moderno:**
  - tarjetas limpias, con títulos acompañados de ícono y subtítulo;
  - indicador «En vivo»;
  - cabecera más compacta.
- **Celular y tableta:** los filtros pasan a un panel que sube desde abajo, abierto por un botón flotante
  «Filtros (n)». El botón «Actualizar» queda como ícono.
- **Selector de establecimiento único:** se elimina el duplicado de la barra de filtros.

### Añadido
- Variación del total contra el mismo período del año anterior (`variacionInteranual`), conciliada con el
  oráculo.
- Chips de filtros activos, que se quitan con un toque.
- Cifras animadas. Respetan «reducir movimiento» y llegan exactas aunque la pestaña esté en segundo plano.
- Modo oscuro automático, que sigue el tema del dispositivo.
- La guía `CONTRIBUTING.md` reemplaza a `AGENTS.md`.
- Capturas de escritorio (claro y oscuro) y de celular. En total hay 64 pruebas.

## [1.2.0] - 2026-09-29

### Cambiado
- Código organizado en **capas semihexagonales**:
  - `src/domain`, `src/infrastructure` y `src/application` (fachada, container y presentacionales), más
    `shared`.
  - `src/main.js` como raíz de composición.
- `app.js` dividido en fachada, container y presentacionales. La fachada guarda el estado y la política de
  actualización, sin DOM.
- SheetJS pasa a `tools/vendor/`, porque solo lo usa el constructor de datos.
- Cabeceras JSDoc unificadas (`@file`, `@description`, `@author`).

### Añadido
- Guardián de arquitectura (`test/arquitectura.test.mjs`) y 8 pruebas de la fachada. En total, 61 pruebas.
- Documentación de portafolio:
  - README en español e inglés;
  - `LICENSE`, `SECURITY.md`, `THIRD_PARTY_NOTICES.md` y `CONTRIBUTING.md`;
  - guías de arquitectura, configuración, operación y seguridad;
  - decisiones de diseño (ADR) y capturas.
- `.gitattributes` y `.editorconfig`.

## [1.1.0] - 2026-09-29

### Añadido
- Pie de página con información en columnas (GAD, seguridad, fuentes) y tarjeta de autor con LinkedIn y
  Facebook.

## [1.0.0] - 2026-09-29

### Añadido
- **Tablero:**
  - datos de la Google Sheet compartida, con una pestaña por establecimiento;
  - indicadores, cuatro gráficos y mapa OpenStreetMap con provincias, burbujas y zoom por procedencia;
  - filtros con combo buscable y filtrado cruzado;
  - actualización al entrar, con botón y automática cada 5 minutos.
- **Publicación:** con GitHub Actions y GitHub Pages. La URL de la hoja va en el secreto `SHEET_URL`.
- **Seguridad:** CSP, SRI, anti-XSS, descarga acotada y validación del contrato de datos.
- **Pruebas:** conciliación con un oráculo independiente, normalización, contrato de datos y seguridad.
