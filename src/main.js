/**
 * @file main.js
 * @description Raíz de composición: el único lugar que une la infraestructura (configuración y
 *   repositorio de datos) con la fachada y monta el container sobre la página.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { CONFIG } from './infrastructure/config.js';
import { obtenerDatos } from './infrastructure/repositorio-datos.js';
import { crearTableroFacade } from './application/tablero.facade.js';
import { montarTablero } from './application/components/tablero.container.js';

const facade = crearTableroFacade({
  obtener: () => obtenerDatos({ url: CONFIG.URL_DATOS, timeoutMs: CONFIG.TIMEOUT_MS, maxBytes: CONFIG.MAX_BYTES }),
  config: CONFIG,
  esVisible: () => document.visibilityState === 'visible',
});

montarTablero(facade, CONFIG);
