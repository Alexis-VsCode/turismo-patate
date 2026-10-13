/**
 * @file contacto.test.mjs
 * @description Pruebas de los enlaces del contacto del municipio: solo se muestran los que tienen una dirección
 *   válida y segura, en orden fijo.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararEnlacesContacto } from '../../src/application/components/presentational/contacto.presentational.js';
import { CONFIG } from '../../src/infrastructure/config.js';

test('sin direcciones no se muestra ningún enlace', () => {
  assert.deepEqual(prepararEnlacesContacto({ sitio: '', facebook: '', correo: '' }), []);
});

test('cada enlace válido sale en orden fijo: sitio web, Facebook y correo', () => {
  const enlaces = prepararEnlacesContacto({ correo: 'turismo@patate.gob.ec', facebook: 'https://www.facebook.com/gadpatate', sitio: 'https://www.patate.gob.ec/' });
  assert.deepEqual(enlaces.map((e) => e.tipo), ['sitio', 'facebook', 'correo']);
  assert.equal(enlaces[2].href, 'mailto:turismo@patate.gob.ec');
  assert.equal(enlaces[1].href, 'https://www.facebook.com/gadpatate');
});

test('se descartan direcciones inseguras o que no corresponden a su tipo', () => {
  const enlaces = prepararEnlacesContacto({
    sitio: 'javascript:alert(1)',
    facebook: 'https://facebook.com.evil.example/x',
    correo: 'no es un correo',
  });
  assert.deepEqual(enlaces, []);
  assert.deepEqual(prepararEnlacesContacto({ sitio: 'http://patate.gob.ec' }), []);
});

test('el contacto del municipio y la franja de prueba vienen de la configuración', () => {
  assert.equal(CONFIG.DATOS_DE_PRUEBA, false);
  assert.equal(CONFIG.CONTACTO_MUNICIPIO.nombre, 'Lic. Vanessa Lesano');
  assert.ok(Object.isFrozen(CONFIG.CONTACTO_MUNICIPIO.enlaces));
});
