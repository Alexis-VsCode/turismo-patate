/**
 * @file mapa.test.mjs
 * @description Compartido. Reglas del mapa que no necesitan Leaflet: radio de las burbujas, provincia que se resalta
 *   según la procedencia elegida, valores con que se colorea cada provincia y encuadre que corresponde a cada pestaña.
 *   Además, la atribución y las teselas salen de textos.es.js y de config.js, no del código del mapa.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, CATALOGO } from '../../helpers.mjs';
import {
  radioDeBurbuja, provinciaElegidaDe, estadoProvincias, elegirEncuadre,
} from '../../../src/tablero/application/components/compartidos/mapa.js';
import { construirCatalogo } from '../../../src/domain/catalogo.js';
import { TEXTOS } from '../../../src/tablero/shared/textos.es.js';

const catalogo = construirCatalogo(CATALOGO);

test('el radio de la burbuja va de 6 a 24 y crece con la raíz cuadrada del valor', () => {
  assert.equal(radioDeBurbuja(0, 10), 6);
  assert.equal(radioDeBurbuja(10, 10), 24);
  assert.equal(radioDeBurbuja(2.5, 10), 15, 'un cuarto del máximo es la mitad del recorrido');
  assert.equal(radioDeBurbuja(5, 0), 6, 'sin máximo no divide entre cero');
  assert.equal(radioDeBurbuja(-3, 10), 6);
  const radios = [1, 2, 3, 5, 8, 10].map((v) => radioDeBurbuja(v, 10));
  assert.ok(radios.every((r, i) => i === 0 || r > radios[i - 1]), 'a más visitantes, burbuja más grande');
});

test('la provincia resaltada es la elegida o la de la ciudad elegida; un país o un atajo no resaltan ninguna', () => {
  assert.equal(provinciaElegidaDe('C:Ambato', catalogo), 'tungurahua');
  assert.equal(provinciaElegidaDe('C:Riobamba', catalogo), 'chimborazo');
  assert.equal(provinciaElegidaDe('PR:Pichincha', catalogo), 'pichincha');
  assert.equal(provinciaElegidaDe('PR:Santo Domingo', catalogo), 'santo domingo', 'la provincia se resalta aunque el catálogo no la liste');
  assert.equal(provinciaElegidaDe('C:Ciudad sin catálogo', catalogo), '');
  assert.equal(provinciaElegidaDe('P:Colombia', catalogo), '');
  assert.equal(provinciaElegidaDe('NAC', catalogo), '');
  assert.equal(provinciaElegidaDe('', catalogo), '');
});

test('las provincias se colorean con los nacionales y en la pestaña de países quedan como contorno', () => {
  const provincias = [{ nombre: 'Tungurahua', valor: 10 }, { nombre: 'Pichincha', valor: 4 }];
  const enProvincias = estadoProvincias({ vista: 'provincias', procedencia: 'C:Riobamba', provincias, catalogo });
  assert.deepEqual([...enProvincias.valores], [['tungurahua', 10], ['pichincha', 4]]);
  assert.equal(enProvincias.maximo, 10);
  assert.equal(enProvincias.elegida, 'chimborazo');
  assert.deepEqual([...enProvincias.nombresCatalogo], [['tungurahua', 'Tungurahua'], ['chimborazo', 'Chimborazo'], ['pichincha', 'Pichincha']]);
  const enPaises = estadoProvincias({ vista: 'paises', procedencia: '', provincias, catalogo });
  assert.equal(enPaises.valores.size, 0);
  assert.equal(enPaises.maximo, 10, 'el máximo no depende de la pestaña');
  assert.equal(enPaises.elegida, '');
});

test('el encuadre sigue a la pestaña y solo se acerca a la procedencia del mismo nivel', () => {
  const encuadre = (vista, procedencia, { hayProvincia = true, hayPuntos = false } = {}) => elegirEncuadre(
    { vista, procedencia, catalogo }, () => hayProvincia, hayPuntos,
  );
  assert.deepEqual(encuadre('ciudades', 'C:Ambato'), { destino: 'ciudad', lat: -1.2491, lon: -78.6168 });
  assert.deepEqual(encuadre('ciudades', 'C:Ciudad sin catálogo'), { destino: 'ecuador' });
  assert.deepEqual(encuadre('ciudades', 'P:Colombia'), { destino: 'ecuador' });
  assert.deepEqual(encuadre('provincias', 'PR:Tungurahua'), { destino: 'provincia', clave: 'tungurahua' });
  assert.deepEqual(encuadre('provincias', 'PR:Tungurahua', { hayProvincia: false }), { destino: 'ecuador' });
  assert.deepEqual(encuadre('provincias', 'C:Ambato'), { destino: 'ecuador' });
  assert.deepEqual(encuadre('paises', 'P:Colombia'), { destino: 'pais', lat: 4.57, lon: -74.29 });
  assert.deepEqual(encuadre('paises', 'P:Narnia', { hayPuntos: true }), { destino: 'puntos' });
  assert.deepEqual(encuadre('paises', 'EXT', { hayPuntos: true }), { destino: 'puntos' });
  assert.deepEqual(encuadre('paises', ''), { destino: 'mundo' });
  assert.deepEqual(encuadre('provincias', ''), { destino: 'ecuador' });
});

test('la atribución, el prefijo de Leaflet y las teselas no se escriben en el código del mapa', () => {
  const codigo = readFileSync(join(RAIZ, 'src/tablero/application/components/compartidos/mapa.js'), 'utf8');
  for (const suelto of ['openstreetmap.org', 'geoBoundaries', 'leafletjs.com', 'Librería de mapas']) {
    assert.ok(!codigo.includes(suelto), `«${suelto}» debe salir de textos.es.js o de config.js`);
  }
  assert.deepEqual(TEXTOS.mapaAtribucion, {
    osm: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    limites: 'Límites: geoBoundaries (CC0)',
    prefijo: '<a href="https://leafletjs.com" title="Librería de mapas interactivos">Leaflet</a>',
  });
});
