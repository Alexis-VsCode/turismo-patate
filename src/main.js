/**
 * @file main.js
 * @description Raíz de composición: el único lugar que une la infraestructura (configuración y
 *   repositorio de datos) con la fachada y monta el container sobre la página.
 *
 *   Mapa del flujo, de la hoja a la pantalla:
 *   1. GitHub Actions ejecuta `tools/construir-datos.mjs`: descarga la hoja (secreto SHEET_URL), la valida y
 *      publica `datos/datos.json` junto al sitio.
 *   2. Este archivo compone las piezas: repositorio de datos, fachada y container.
 *   3. El container (`tablero.container.js`) escucha la página y le pide a la fachada cargar y filtrar.
 *   4. La fachada (`tablero.facade.js`) pide los datos al repositorio, que los descarga con límites y los
 *      reconstruye validados con el contrato de datos.
 *   5. La fachada calcula la vista con las funciones puras de `domain/` y avisa por eventos.
 *   6. El container pinta esa vista con los presentacionales: KPI, gráficos, mapa y chip de frescura.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { CONFIG } from './infrastructure/config.js';
import { obtenerDatos } from './infrastructure/repositorio-datos.js';
import { crearTableroFacade } from './application/tablero.facade.js';
import { montarTablero } from './application/components/tablero.container.js';

// Paso 1: la fachada recibe sus puentes al exterior (descarga, configuración y visibilidad) y no conoce el DOM
const facade = crearTableroFacade({
  obtener: () => obtenerDatos({ url: CONFIG.URL_DATOS, timeoutMs: CONFIG.TIMEOUT_MS, maxBytes: CONFIG.MAX_BYTES }),
  config: CONFIG,
  esVisible: () => document.visibilityState === 'visible',
});

// Paso 2: el container es el único que toca el DOM; recibe la fachada ya armada
montarTablero(facade, CONFIG);
