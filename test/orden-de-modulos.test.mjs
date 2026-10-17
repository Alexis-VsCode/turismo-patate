/**
 * @file orden-de-modulos.test.mjs
 * @description Estilo del código. Cada módulo de src/ sigue el mismo orden: cabecera JSDoc (@file, @description y
 *   @author), import (node:*, dominio, contrato y después las capas propias), constantes, API PUBLICA y HELPERS
 *   PRIVADOS. Ningún import aparece después del primer código, y los rótulos `// ===== RÓTULO =====` salen de una
 *   lista cerrada. Los comentarios internos son solo `// Paso N: ...` (con sus líneas de continuación justo debajo);
 *   lo que explica una constante o un ayudante va en un JSDoc `/** ... *\/`. Tampoco se apilan dos pasos sin código
 *   entre ellos, y dentro de cada función los pasos van en orden ascendente y sin repetirse, porque si no la
 *   numeración deja de guiar la lectura.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { RAIZ } from './helpers.mjs';

const PASO = /^\/\/ Paso \d+: \S/;
/** Forma de un rótulo de sección; el texto tiene que estar en ROTULOS. */
const BANNER = /^\/\/ ={3,}/;
const BANNER_EXACTO = /^\/\/ ===== (.+) =====$/;
const ROTULOS = Object.freeze(['ESTADO', 'CICLO DE VIDA / CARGA', 'ACCIONES DE UI', 'EVENTOS Y SUSCRIPCIONES', 'API PUBLICA', 'HELPERS PRIVADOS']);
const AUTOR = ' * @author Kevin Alexis Barrera Llerena 2026';
/** Palabras que abren un bloque con paréntesis que no es el cuerpo de una función. */
const NO_FUNCION = new Set(['if', 'for', 'while', 'switch', 'catch', 'with', 'await']);
/** Caracteres tras los que una barra abre una expresión regular y no una división. */
const ANTES_DE_REGEX = '(,=:[!&|?{};+-*%<>~^';

/** Módulos de src/: ruta con barras normales y contenido. */
const MODULOS = readdirSync(join(RAIZ, 'src'), { recursive: true })
  .filter((a) => a.endsWith('.js'))
  .map((a) => ({ ruta: a.split('\\').join('/'), codigo: readFileSync(join(RAIZ, 'src', a), 'utf8').replace(/\r\n/g, '\n') }));

/**
 * Comentarios que no siguen la regla en un texto de código.
 * @param {string} codigo contenido de un archivo
 * @returns {string[]} cada falta como «línea: comentario»
 */
function faltas(codigo) {
  const mal = [];
  let anterior = '';
  codigo.split('\n').forEach((cruda, i) => {
    const linea = cruda.trim();
    const esLinea = linea.startsWith('//');
    // Paso 1: un rótulo es válido por su forma; su texto lo revisa rotulosFueraDeLista, y no admite continuación
    if (esLinea && BANNER.test(linea)) {
      if (!BANNER_EXACTO.test(linea)) mal.push(`${i + 1}: rótulo mal formado`);
      anterior = '';
      return;
    }
    if (esLinea && !PASO.test(linea) && !anterior.startsWith('//')) mal.push(`${i + 1}: ${linea.slice(0, 60)}`);
    if (esLinea && PASO.test(linea) && PASO.test(anterior)) mal.push(`${i + 1}: paso apilado sobre otro sin código entre ellos`);
    if (linea.startsWith('/*') && !linea.startsWith('/**')) mal.push(`${i + 1}: comentario de bloque que no es JSDoc`);
    anterior = linea;
  });
  return mal;
}

/**
 * Faltas de la cabecera: el archivo empieza con un JSDoc que nombra el archivo y trae descripción y autor.
 * @param {string} ruta ruta del módulo
 * @param {string} codigo contenido del módulo
 * @returns {string[]} qué falta
 */
function faltasDeCabecera(ruta, codigo) {
  const fin = codigo.indexOf('*/');
  const cabecera = codigo.startsWith('/**\n') && fin > 0 ? codigo.slice(0, fin) : '';
  const lineas = cabecera.split('\n');
  const mal = [];
  if (lineas[1] !== ` * @file ${basename(ruta)}`) mal.push('@file con el nombre del archivo en la segunda línea');
  if (!lineas.some((l) => l.startsWith(' * @description '))) mal.push('@description');
  if (!lineas.includes(AUTOR)) mal.push('@author');
  return mal;
}

/**
 * Líneas de código sin comentarios, para leer los import: cada comentario se cambia por espacios y se conservan los
 * saltos de línea, así el número de línea no cambia.
 */
function sinComentarios(codigo) {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Sentencias import del nivel superior y primer código que no es un import.
 * @param {string} codigo contenido del módulo
 * @returns {{ imports: Array<{ linea: number, especificador: string }>, primerCodigo: number }} `primerCodigo` es la
 *   línea (desde 1) de la primera sentencia que no es import; Infinity si no hay ninguna
 */
function leerImports(codigo) {
  const imports = [];
  let primerCodigo = Infinity;
  let abierto = null;
  sinComentarios(codigo).split('\n').forEach((cruda, i) => {
    const linea = cruda.trim();
    if (!linea) return;
    // Paso 1: un import de varias líneas termina en la que trae el especificador
    if (abierto) {
      const fin = linea.match(/from\s+['"]([^'"]+)['"]/);
      if (fin) {
        imports.push({ linea: abierto, especificador: fin[1] });
        abierto = null;
      }
      return;
    }
    // Paso 2: un import estático abre la sentencia; un import() es código
    if (/^import[\s{*'"]/.test(linea)) {
      const especificador = linea.match(/['"]([^'"]+)['"]\s*;?$/);
      if (especificador) imports.push({ linea: i + 1, especificador: especificador[1] });
      else abierto = i + 1;
      return;
    }
    if (primerCodigo === Infinity) primerCodigo = i + 1;
  });
  return { imports, primerCodigo };
}

/** Grupo de un import en el orden fijo: node:*, dominio, contrato y después las capas propias. */
function grupoDeImport(especificador) {
  if (especificador.startsWith('node:')) return 0;
  if (/(^|\/)domain\//.test(especificador)) return 1;
  if (/(^|\/)contrato\//.test(especificador)) return 2;
  return 3;
}

/** Rótulos del archivo que no están en la lista cerrada, como «línea: rótulo». */
function rotulosFueraDeLista(codigo) {
  const mal = [];
  codigo.split('\n').forEach((cruda, i) => {
    const m = cruda.trim().match(BANNER_EXACTO);
    if (m && !ROTULOS.includes(m[1])) mal.push(`${i + 1}: ${m[1]}`);
  });
  return mal;
}

/**
 * Indica si la llave que se abre al final de `previo` es el cuerpo de una función: tras `=>` o tras los paréntesis de
 * una declaración, un método o un getter, pero no tras los de un if, for, while, switch o catch.
 */
function abreFuncion(previo) {
  const t = previo.trimEnd();
  if (t.endsWith('=>')) return true;
  if (!t.endsWith(')')) return false;
  let profundidad = 0;
  let k = t.length - 1;
  for (; k >= 0; k -= 1) {
    if (t[k] === ')') profundidad += 1;
    else if (t[k] === '(') {
      profundidad -= 1;
      if (profundidad === 0) break;
    }
  }
  const palabra = (t.slice(0, k).trimEnd().match(/[\w$]+$/) || [''])[0];
  return !NO_FUNCION.has(palabra);
}

/**
 * Pasos de cada función del código, en el orden en que aparecen. Recorre el texto saltando cadenas, plantillas,
 * expresiones regulares y comentarios, y asigna cada `// Paso N:` a la función más interna que lo contiene (0 es el
 * nivel del módulo).
 * @param {string} codigo contenido del módulo
 * @returns {Map<number, Array<{ numero: number, linea: number }>>} pasos por función
 */
function pasosPorFuncion(codigo) {
  const grupos = new Map();
  const pila = [];
  const modos = ['codigo'];
  let previo = '';
  let siguienteId = 1;
  let i = 0;
  const funcionActual = () => {
    for (let k = pila.length - 1; k >= 0; k -= 1) if (pila[k].tipo === 'funcion') return pila[k].id;
    return 0;
  };
  const saltarCadena = (cierre) => {
    for (i += 1; i < codigo.length && codigo[i] !== cierre; i += 1) if (codigo[i] === '\\') i += 1;
    i += 1;
  };
  while (i < codigo.length) {
    const c = codigo[i];
    const d = codigo[i + 1];
    // Paso 1: dentro de una plantilla solo importan su cierre y sus ${...}
    if (modos.at(-1) === 'plantilla') {
      if (c === '\\') i += 2;
      else if (c === '`') {
        modos.pop();
        previo += '""';
        i += 1;
      } else if (c === '$' && d === '{') {
        pila.push({ tipo: 'plantilla' });
        modos.push('codigo');
        i += 2;
      } else i += 1;
      continue;
    }
    // Paso 2: comentarios; los pasos se anotan en la función que los contiene
    if (c === '/' && d === '/') {
      const fin = codigo.indexOf('\n', i) < 0 ? codigo.length : codigo.indexOf('\n', i);
      const paso = codigo.slice(i, fin).match(/^\/\/ Paso (\d+):/);
      if (paso) {
        const id = funcionActual();
        if (!grupos.has(id)) grupos.set(id, []);
        grupos.get(id).push({ numero: Number(paso[1]), linea: codigo.slice(0, i).split('\n').length });
      }
      i = fin;
      continue;
    }
    if (c === '/' && d === '*') {
      i = codigo.indexOf('*/', i + 2) + 2;
      previo += ' ';
      continue;
    }
    // Paso 3: cadenas, plantillas y expresiones regulares no abren ni cierran llaves
    if (c === '"' || c === "'") {
      saltarCadena(c);
      previo += '""';
      continue;
    }
    if (c === '`') {
      modos.push('plantilla');
      i += 1;
      continue;
    }
    if (c === '/') {
      const t = previo.trimEnd();
      if (!t || ANTES_DE_REGEX.includes(t.at(-1)) || /\b(?:return|typeof|case|in|of|delete|void|throw|new)$/.test(t)) {
        let enClase = false;
        for (i += 1; i < codigo.length; i += 1) {
          if (codigo[i] === '\\') i += 1;
          else if (codigo[i] === '[') enClase = true;
          else if (codigo[i] === ']') enClase = false;
          else if (codigo[i] === '/' && !enClase) break;
        }
        i += 1;
        while (/\w/.test(codigo[i] || '')) i += 1;
        previo += '/r/';
        continue;
      }
    }
    // Paso 4: las llaves abren funciones o bloques; la que cierra un ${...} vuelve a la plantilla
    if (c === '{') pila.push({ tipo: abreFuncion(previo) ? 'funcion' : 'bloque', id: siguienteId++ });
    if (c === '}' && pila.at(-1)?.tipo === 'plantilla') {
      pila.pop();
      modos.pop();
      i += 1;
      continue;
    }
    if (c === '}') pila.pop();
    previo += c;
    i += 1;
  }
  return grupos;
}

/** Pasos fuera de orden o repetidos dentro de una misma función, como «línea: Paso N tras Paso M». */
function pasosDesordenados(codigo) {
  const mal = [];
  for (const pasos of pasosPorFuncion(codigo).values()) {
    pasos.forEach((p, k) => {
      if (k > 0 && p.numero <= pasos[k - 1].numero) mal.push(`${p.linea}: Paso ${p.numero} tras Paso ${pasos[k - 1].numero}`);
    });
  }
  return mal;
}

test('la regla reconoce pasos, continuaciones y JSDoc, y rechaza lo demás', () => {
  assert.deepEqual(faltas('// Paso 1: algo\n// que sigue\nconst a = 1;\n/** Ayudante. */'), []);
  assert.deepEqual(faltas('const a = 1;\n// suelto'), ['2: // suelto']);
  assert.deepEqual(faltas('/* bloque */'), ['1: comentario de bloque que no es JSDoc']);
  assert.deepEqual(faltas('// Paso 2: uno\n// Paso 3: otro'), ['2: paso apilado sobre otro sin código entre ellos']);
});

test('los comentarios internos de src/ son pasos numerados, rótulos o JSDoc', () => {
  const mal = [];
  for (const { ruta, codigo } of MODULOS) for (const falta of faltas(codigo)) mal.push(`${ruta}:${falta}`);
  assert.deepEqual(mal, []);
});

test('la regla de rótulos acepta los de la lista, rechaza los demás y no admite un comentario suelto debajo', () => {
  assert.deepEqual(faltas('// ===== API PUBLICA =====\n// Paso 1: algo\nconst a = 1;'), []);
  assert.deepEqual(faltas('// ===== API PUBLICA =====\n// suelto'), ['2: // suelto']);
  assert.deepEqual(faltas('// ==== API PUBLICA ===='), ['1: rótulo mal formado']);
  assert.deepEqual(rotulosFueraDeLista('// ===== API PUBLICA =====\n  // ===== UTILIDADES ====='), ['2: UTILIDADES']);
});

test('cada módulo de src/ empieza con su cabecera: @file con su nombre, @description y @author', () => {
  const mal = MODULOS.flatMap(({ ruta, codigo }) => faltasDeCabecera(ruta, codigo).map((f) => `${ruta}: ${f}`));
  assert.deepEqual(mal, []);
});

test('ningún import de src/ aparece después del primer código', () => {
  const mal = [];
  for (const { ruta, codigo } of MODULOS) {
    const { imports, primerCodigo } = leerImports(codigo);
    for (const { linea } of imports) if (linea > primerCodigo) mal.push(`${ruta}:${linea}`);
  }
  assert.deepEqual(mal, []);
});

test('los import de src/ van en orden: node:*, dominio, contrato y después las capas propias', () => {
  const mal = [];
  for (const { ruta, codigo } of MODULOS) {
    const grupos = leerImports(codigo).imports.map((x) => ({ ...x, grupo: grupoDeImport(x.especificador) }));
    grupos.forEach((x, k) => {
      if (k > 0 && x.grupo < grupos[k - 1].grupo) mal.push(`${ruta}:${x.linea} ${x.especificador}`);
    });
  }
  assert.deepEqual(mal, []);
});

test('la lectura de imports ve los de varias líneas, ignora los comentarios y marca el que llega tarde', () => {
  const codigo = "/** @file x.js */\nimport {\n  a,\n} from './a.js';\nimport './b.js';\n// Paso 1: algo\nconst c = await import('./c.js');\nimport { d } from './d.js';";
  assert.deepEqual(leerImports(codigo), {
    imports: [{ linea: 2, especificador: './a.js' }, { linea: 5, especificador: './b.js' }, { linea: 8, especificador: './d.js' }],
    primerCodigo: 7,
  });
  assert.deepEqual(['node:fs', '../../domain/x.js', '../contrato/y.js', './z.js'].map(grupoDeImport), [0, 1, 2, 3]);
});

test('los rótulos de src/ salen de la lista cerrada', () => {
  const mal = MODULOS.flatMap(({ ruta, codigo }) => rotulosFueraDeLista(codigo).map((r) => `${ruta}:${r}`));
  assert.deepEqual(mal, []);
});

test('en el nivel del módulo, la API PUBLICA va antes que los HELPERS PRIVADOS', () => {
  const mal = [];
  for (const { ruta, codigo } of MODULOS) {
    const api = codigo.indexOf('\n// ===== API PUBLICA =====');
    const helpers = codigo.indexOf('\n// ===== HELPERS PRIVADOS =====');
    if (api >= 0 && helpers >= 0 && helpers < api) mal.push(ruta);
  }
  assert.deepEqual(mal, []);
});

test('dentro de cada función de src/ los pasos van en orden ascendente y sin repetirse', () => {
  const mal = MODULOS.flatMap(({ ruta, codigo }) => pasosDesordenados(codigo).map((p) => `${ruta}:${p}`));
  assert.deepEqual(mal, []);
});

test('la lectura de pasos separa cada función y no se confunde con cadenas, plantillas ni expresiones regulares', () => {
  const codigo = [
    'function a(x) {',
    '  // Paso 1: uno',
    "  const s = '{ // Paso 9: no es un paso';",
    '  const r = /[{}]/g;',
    '  const t = `${x ? `{` : "}"}`;',
    '  if (x) {',
    '    // Paso 2: dos, dentro de un if de la misma función',
    '  }',
    '  const b = () => {',
    '    // Paso 1: la función interna empieza su propia cuenta',
    '  };',
    '  // Paso 3: tres',
    '}',
    '// Paso 1: el módulo',
  ].join('\n');
  const grupos = [...pasosPorFuncion(codigo).values()].map((p) => p.map((x) => x.numero));
  assert.deepEqual(grupos, [[1, 2, 3], [1], [1]]);
  assert.deepEqual(pasosDesordenados('function f() {\n  // Paso 2: a\n  x();\n  // Paso 2: b\n}'), ['4: Paso 2 tras Paso 2']);
  assert.deepEqual(pasosDesordenados('function f() {\n  // Paso 2: a\n  x();\n  // Paso 1: b\n}'), ['4: Paso 1 tras Paso 2']);
});
