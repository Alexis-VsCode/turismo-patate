/**
 * @file contacto.test.mjs
 * @description Pruebas de los enlaces del contacto del municipio: Facebook, TikTok y LinkedIn en orden fijo; un enlace
 *   con dirección válida y segura se abre, uno vacío queda como «próximamente» y uno inválido no se muestra.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararEnlacesContacto } from '../../src/application/components/presentational/contacto.presentational.js';
import { CONFIG } from '../../src/infrastructure/config.js';

test('sin direcciones los tres enlaces quedan como «próximamente»', () => {
  assert.deepEqual(prepararEnlacesContacto({}), [
    { tipo: 'facebook', href: null }, { tipo: 'tiktok', href: null }, { tipo: 'linkedin', href: null },
  ]);
});

test('cada enlace válido sale en orden fijo con su dirección', () => {
  const enlaces = prepararEnlacesContacto({
    linkedin: 'https://www.linkedin.com/in/alguien/',
    tiktok: 'https://www.tiktok.com/@vanelesano',
    facebook: 'https://www.facebook.com/share/1EyaxheyoJ/',
  });
  assert.deepEqual(enlaces.map((e) => e.tipo), ['facebook', 'tiktok', 'linkedin']);
  assert.ok(enlaces.every((e) => e.href && e.href.startsWith('https://')));
});

test('LinkedIn admite subdominio de país y nombres con tildes codificadas', () => {
  const [, , linkedin] = prepararEnlacesContacto({ facebook: '', tiktok: '', linkedin: 'https://ec.linkedin.com/in/vanessa-lesano-mart%C3%ADnez' });
  assert.equal(linkedin.href, 'https://ec.linkedin.com/in/vanessa-lesano-mart%C3%ADnez');
});

test('una dirección insegura o de otro sitio no se muestra', () => {
  const enlaces = prepararEnlacesContacto({
    facebook: 'https://facebook.com.evil.example/x',
    tiktok: 'javascript:alert(1)',
    linkedin: 'http://www.linkedin.com/in/x',
  });
  assert.deepEqual(enlaces, []);
});

test('la configuración trae a la Lic. Vanessa Lesano con Facebook y TikTok, y LinkedIn por llegar', () => {
  const { nombre, enlaces } = CONFIG.CONTACTO_MUNICIPIO;
  assert.equal(nombre, 'Lic. Vanessa Lesano');
  assert.ok(Object.isFrozen(enlaces));
  const preparados = prepararEnlacesContacto(enlaces);
  assert.deepEqual(preparados.map((e) => [e.tipo, Boolean(e.href)]), [['facebook', true], ['tiktok', true], ['linkedin', false]]);
  assert.doesNotMatch(enlaces.facebook + enlaces.tiktok, /[?&](mibextid|_r|_t)=/, 'sin parámetros de rastreo');
});

test('la franja de prueba sigue apagada', () => {
  assert.equal(CONFIG.DATOS_DE_PRUEBA, false);
});

test('los textos nombran a cada persona con su artículo: «de la Lic.» y «del Ing.»', async () => {
  const { TEXTOS } = await import('../../src/shared/textos.es.js');
  const { referencia } = CONFIG.CONTACTO_MUNICIPIO;
  assert.equal(referencia, 'la Lic. Vanessa Lesano');
  assert.equal(TEXTOS.avisoPronto.titulo('LinkedIn', referencia), 'LinkedIn de la Lic. Vanessa Lesano: próximamente');
  assert.equal(TEXTOS.avisoPronto.enlaceAutor('Facebook'), 'Facebook del Ing. Kevin Alexis Barrera Llerena');
  // El nombre accesible del botón contiene su texto visible («LinkedIn» y «Pronto»), para el control por voz
  const nombre = TEXTOS.contactoPronto('LinkedIn', referencia);
  assert.match(nombre, /^LinkedIn/);
  assert.match(nombre, new RegExp(TEXTOS.pronto, 'i'));
  assert.doesNotMatch(TEXTOS.contactoAria('TikTok', referencia), / de Lic\./);
});
