// Vista 1: elegir el dia de entrenamiento.

import { el, limpiar, plural } from '../ui.js';
import { getDias, getDia, partesDia } from '../rutina.js';
import { getSesionAbierta } from '../db.js';
import { irA } from '../app.js';

const IDS_SEMANA = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

export async function montar(cont) {
  limpiar(cont);
  const hoyId = IDS_SEMANA[new Date().getDay()];

  cont.appendChild(el('h1', { class: 'titulo titulo-pantalla titulo-inicio', text: 'Elige el día' }));

  const abierta = await getSesionAbierta();
  if (abierta) {
    const nombre = partesDia(getDia(abierta.diaId) || { nombre: abierta.diaNombre }).nombre.toLowerCase();
    cont.appendChild(el('div', { class: 'aviso' }, [
      el('p', { text: `Tienes el ${nombre} sin cerrar.` }),
      el('button', {
        class: 'btn btn-principal',
        text: `Continuar el ${nombre}`,
        onclick: () => irA(`#/dia/${abierta.diaId}`),
      }),
    ]));
  }

  const lista = el('ul', { class: 'lista' });
  for (const d of getDias()) {
    const { nombre, foco } = partesDia(d);
    const n = d.ejercicios.length;
    const esHoy = d.id === hoyId;
    lista.appendChild(el('li', {}, [
      el('button', {
        class: 'fila' + (esHoy ? ' fila--hoy' : '') + (n === 0 ? ' fila--apagada' : ''),
        onclick: () => irA(`#/dia/${d.id}`),
      }, [
        el('span', { class: 'fila-dia-nombre' }, [nombre, esHoy && el('span', { class: 'hoy', text: 'Hoy' })]),
        el('span', { class: 'fila-dia-foco', text: foco }),
        n > 0 && el('span', { class: 'fila-dia-cuenta', text: plural(n, 'ejercicio', 'ejercicios') }),
      ]),
    ]));
  }
  cont.appendChild(lista);
}
