// Arranque: service worker, Wake Lock, router de vistas, boton exportar.

import { cargarRutina } from './rutina.js';
import { desbloquearAudio } from './sonido.js';
import { descargarHistorial } from './exportar.js';
import { toast, plural } from './ui.js';

import * as vistaDias from './vistas/dias.js';
import * as vistaEjercicios from './vistas/ejercicios.js';
import * as vistaEjercicio from './vistas/ejercicio.js';

const app = document.getElementById('app');

// -------- navegacion --------
export function irA(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

let vistaActual = null;
let cadenaRender = Promise.resolve();

function parseHash() {
  const h = location.hash || '#/';
  const partes = h.replace(/^#\//, '').split('/').filter(Boolean);
  // ''            -> dias
  // dia/:id       -> ejercicios
  // dia/:id/ej/:e -> ejercicio
  if (partes[0] === 'dia' && partes[2] === 'ej' && partes[3]) {
    return { vista: vistaEjercicio, params: { id: partes[1], ejId: partes[3] } };
  }
  if (partes[0] === 'dia' && partes[1]) {
    return { vista: vistaEjercicios, params: { id: partes[1] } };
  }
  return { vista: vistaDias, params: {} };
}

// Serializa los render para que dos navegaciones no se pisen (evita listas duplicadas).
function render() {
  cadenaRender = cadenaRender.then(renderReal, renderReal);
  return cadenaRender;
}

async function renderReal() {
  const { vista, params } = parseHash();
  if (vistaActual && vistaActual !== vista && typeof vistaActual.desmontar === 'function') {
    vistaActual.desmontar();
  }
  vistaActual = vista;
  try {
    await vista.montar(app, params);
  } catch (err) {
    console.error(err);
    app.textContent = 'Error: ' + err.message;
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);

// -------- Wake Lock mientras haya sesion abierta --------
let wakeLock = null;
let sesionActiva = false;

export function setSesionActiva(activa) {
  sesionActiva = activa;
  if (activa) pedirWakeLock();
  else soltarWakeLock();
}

async function pedirWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (_) { /* ignora: no critico */ }
}

function soltarWakeLock() {
  try { if (wakeLock) wakeLock.release(); } catch (_) { /* ignore */ }
  wakeLock = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && sesionActiva) pedirWakeLock();
});

// -------- header --------
document.getElementById('btn-inicio').addEventListener('click', () => irA('#/'));
document.getElementById('btn-exportar').addEventListener('click', async () => {
  try {
    const r = await descargarHistorial();
    toast(`Historial exportado: ${plural(r.sesiones, 'sesión', 'sesiones')}`);
  } catch (e) {
    toast('No se pudo exportar. Vuelve a intentarlo.');
    console.error(e);
  }
});

// -------- desbloqueo de audio en el primer toque --------
window.addEventListener('pointerdown', function once() {
  desbloquearAudio();
  window.removeEventListener('pointerdown', once);
}, { once: true });

// -------- service worker --------
// En localhost queda desactivado para poder iterar sin cache;
// forzar con ?sw=1. En cualquier otro host se registra siempre.
(() => {
  if (!('serviceWorker' in navigator)) return;
  const esLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  const forzar = new URLSearchParams(location.search).has('sw');
  if (esLocal && !forzar) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW no registrado', e));
  });
})();

// -------- init --------
(async function init() {
  try {
    await cargarRutina();
    if (!location.hash || location.hash === '#') {
      location.hash = '#/'; // dispara hashchange -> render (una sola vez)
    } else {
      render();
    }
  } catch (e) {
    app.textContent = 'No se pudo cargar la rutina: ' + e.message;
  }
})();
