/**
 * @file selector-tema.js
 * @description Componente compartido. Botón que alterna entre modo claro y oscuro: aplica el atributo
 *   `data-theme`, guarda la elección en el dispositivo y avisa para que gráficos y mapa se repinten.
 *   Sin elección guardada el tema es el claro.
 * @author Kevin Alexis Barrera Llerena 2026
 */
import { CLAVE_TEMA, resolverTema, alternarTema } from '../../../shared/tema.js';
import { TEXTOS } from '../../../shared/textos.es.js';

/**
 * @param {HTMLButtonElement} boton botón sol/luna de la barra de control
 * @param {(tema: 'light'|'dark') => void} alCambiar se llama tras cada cambio de tema
 */
export function crearSelectorTema(boton, alCambiar) {
  const raiz = document.documentElement;
  const leer = () => {
    try {
      return window.localStorage.getItem(CLAVE_TEMA);
    } catch (e) {
      return null;
    }
  };
  const guardar = (tema) => {
    try {
      window.localStorage.setItem(CLAVE_TEMA, tema);
    } catch (e) {
      // sin almacenamiento la elección vale solo para esta visita
    }
  };
  const aplicar = (tema) => {
    raiz.setAttribute('data-theme', tema);
    boton.setAttribute('aria-pressed', String(tema === 'dark'));
    boton.title = tema === 'dark' ? TEXTOS.temaAClaro : TEXTOS.temaAOscuro;
  };

  // Paso 1: al montar se respeta el atributo que puso el script inicial; si no cargó, se resuelve aquí
  aplicar(raiz.getAttribute('data-theme') || resolverTema(leer()));

  // Paso 2: el botón aplica primero el atributo y guarda después, para que un fallo del almacenamiento no lo frene
  boton.addEventListener('click', () => {
    const nuevo = alternarTema(raiz.getAttribute('data-theme'));
    aplicar(nuevo);
    guardar(nuevo);
    alCambiar(nuevo);
  });
}
