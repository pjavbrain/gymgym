// Vista 2: lista de ejercicios del dia con su estado.

import { el, limpiar, toast } from '../ui.js';
import { getDia, esPorTiempo, numSeries, partesDia, rangoCorto } from '../rutina.js';
import { asegurarSesion, cerrarSesion, getEstadosDeSesion } from '../db.js';
import { irA, setSesionActiva } from '../app.js';

const ETIQUETA_ESTADO = {
  pendiente: 'pendiente',
  'en-curso': 'en curso',
  completo: 'completo',
};

export async function montar(cont, { id }) {
  limpiar(cont);
  const dia = getDia(id);
  if (!dia) { irA('#/'); return; }
  const { nombre, foco } = partesDia(dia);
  const nombreMin = nombre.toLowerCase();

  cont.appendChild(el('div', { class: 'cabeza' }, [
    el('button', { class: 'volver', text: '‹', 'aria-label': 'Volver a los días', onclick: () => irA('#/') }),
    el('div', {}, [
      el('h1', { class: 'titulo titulo-pantalla', text: nombre }),
      foco && el('p', { class: 'subtitulo', text: foco }),
    ]),
  ]));

  if (dia.ejercicios.length === 0) {
    setSesionActiva(false);
    cont.appendChild(el('div', { class: 'vacio' }, [
      el('p', { text: `El ${nombreMin} no tiene ejercicios en tu rutina.` }),
      el('button', { class: 'btn', text: 'Elegir otro día', onclick: () => irA('#/') }),
    ]));
    return;
  }

  const res = await asegurarSesion(dia);

  if (res && res.conflicto) {
    setSesionActiva(false);
    const otra = res.conflicto;
    const otroNombre = partesDia(getDia(otra.diaId) || { nombre: otra.diaNombre }).nombre.toLowerCase();
    cont.appendChild(el('div', { class: 'aviso' }, [
      el('p', { text: `Tienes el ${otroNombre} sin cerrar. Ciérralo para empezar el ${nombreMin}.` }),
      el('button', {
        class: 'btn btn-principal', text: `Continuar el ${otroNombre}`,
        onclick: () => irA(`#/dia/${otra.diaId}`),
      }),
      el('button', {
        class: 'btn', text: `Cerrar el ${otroNombre} y empezar`,
        onclick: async () => { await cerrarSesion(otra.id); montar(cont, { id }); },
      }),
    ]));
    return;
  }

  const sesion = res;
  setSesionActiva(true);

  const estados = await getEstadosDeSesion(sesion.id);
  const estadoDe = (ej) => estados.get(ej.id) || 'pendiente';
  const completos = dia.ejercicios.filter((e) => estadoDe(e) === 'completo').length;

  cont.appendChild(el('div', { class: 'progreso' }, [
    el('p', { class: 'progreso-texto', text: `${completos} de ${dia.ejercicios.length} completos` }),
    el('div', { class: 'tramos', 'aria-hidden': 'true' },
      dia.ejercicios.map((e) => el('span', { class: `tramo tramo--${estadoDe(e)}` }))),
  ]));

  const lista = el('ul', { class: 'lista' });
  for (const ej of dia.ejercicios) {
    const estado = estadoDe(ej);
    const objetivo = esPorTiempo(ej)
      ? rangoCorto(ej.repeticiones)
      : `${numSeries(ej)} × ${rangoCorto(ej.repeticiones)}`;

    lista.appendChild(el('li', {}, [
      el('button', {
        class: `fila fila-ej fila-ej--${estado}`,
        onclick: () => irA(`#/dia/${dia.id}/ej/${ej.id}`),
      }, [
        el('span', {
          class: `marca-estado marca-estado--${estado}`, 'aria-hidden': 'true',
          text: estado === 'completo' ? '✓' : '',
        }),
        el('span', { class: 'fila-ej-nombre', text: ej.nombre }),
        el('span', { class: 'fila-ej-grupo' }, [
          ej.grupoMuscular,
          el('span', { class: 'solo-lector', text: `, ${ETIQUETA_ESTADO[estado]}` }),
        ]),
        el('span', { class: 'fila-ej-objetivo', text: objetivo }),
      ]),
    ]));
  }
  cont.appendChild(lista);

  cont.appendChild(el('button', {
    class: 'btn btn-cerrar',
    text: `Cerrar el ${nombreMin}`,
    onclick: async () => {
      if (!confirm(`¿Cerrar el ${nombreMin}? Lo registrado queda guardado.`)) return;
      await cerrarSesion(sesion.id);
      setSesionActiva(false);
      toast(`${nombre} cerrado`);
      irA('#/');
    },
  }));
}
