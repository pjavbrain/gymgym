// Vistas 3-7: registro de series de un ejercicio + temporizador de descanso.

import { el, limpiar, toast, fmtFechaCorta, fmtNum, aNumero } from '../ui.js';
import {
  getDia, getEjercicio, indiceEjercicio, numSeries, esPorTiempo,
  descansoSegundos, primerNumero, partesDia, textoRango, unidadReps, esRangoPuro,
  pasosEjecucion,
} from '../rutina.js';
import {
  getSesionAbierta, getSeriesDeEjercicioEnSesion, getUltimaVez,
  guardarSerie, getEstado, setEstado,
} from '../db.js';
import { crearTemporizador, fmtTiempo } from '../timer.js';
import { avisoFinDescanso } from '../sonido.js';
import { irA, setSesionActiva } from '../app.js';

let temporizador = null;
let retornoFin = null;

export function desmontar() {
  if (temporizador) { temporizador.detener(); temporizador = null; }
  clearTimeout(retornoFin);
}

export async function montar(cont, { id, ejId }) {
  desmontar();
  limpiar(cont);

  const dia = getDia(id);
  const ej = getEjercicio(id, ejId);
  if (!dia || !ej) { irA('#/'); return; }

  const sesion = await getSesionAbierta();
  if (!sesion || sesion.diaId !== id) { irA(`#/dia/${id}`); return; }
  setSesionActiva(true);

  const total = numSeries(ej);
  const porTiempo = esPorTiempo(ej);
  const unidad = unidadReps(ej);
  const guardadas = await getSeriesDeEjercicioEnSesion(sesion.id, ej.id);
  const ultima = await getUltimaVez(ej.id, sesion.id);
  const mapa = new Map(guardadas.map((s) => [s.numeroSerie, s]));

  let serieActual = 1;
  while (serieActual <= total && mapa.has(serieActual)) serieActual++;
  if (serieActual > total) serieActual = total;

  const nombreDia = partesDia(dia).nombre;

  // ---------- esencial: nombre, cue, serie, objetivo, vez pasada ----------
  cont.appendChild(el('div', { class: 'serie-cabeza' }, [
    el('button', {
      class: 'volver', text: '‹', 'aria-label': `Volver al ${nombreDia.toLowerCase()}`,
      onclick: () => irA(`#/dia/${id}`),
    }),
    el('span', { class: 'serie-dia', text: nombreDia }),
  ]));
  const nombreEl = el('h1', { class: 'serie-nombre', text: ej.nombre });
  cont.appendChild(nombreEl);
  if (ej.cue) cont.appendChild(el('p', { class: 'serie-cue', text: ej.cue }));

  const numEl = el('span', { class: 'serie-num' });
  const pipsEl = el('span', { class: 'pips', 'aria-hidden': 'true' });
  if (!porTiempo) cont.appendChild(el('div', { class: 'serie-progreso' }, [numEl, pipsEl]));

  let objetivo = porTiempo
    ? textoRango(ej.repeticiones)
    : `${total} × ${textoRango(ej.repeticiones)}${esRangoPuro(ej.repeticiones) ? ' reps' : ''}`;
  if (ej.pesoObjetivo) objetivo += ` con ${ej.pesoObjetivo} kg`;

  cont.appendChild(el('dl', { class: 'datos' }, [
    el('dt', { text: 'Objetivo' }),
    el('dd', { text: objetivo }),
    el('dt', { text: 'Vez pasada' }),
    ddVezPasada(ultima),
  ]));

  // ---------- carga ----------
  let pesoInput = null;
  let repsInput = null;
  if (!porTiempo) {
    const pasoReps = unidad === 's' ? 5 : 1;
    const nombreUnidad = { reps: 'repeticiones', s: 'segundos', min: 'minutos' }[unidad];
    pesoInput = inputCarga('peso-real', 'Peso en kilos');
    repsInput = inputCarga('reps-real', nombreUnidad[0].toUpperCase() + nombreUnidad.slice(1));
    cont.appendChild(el('div', { class: 'carga' }, [
      filaCarga(pesoInput, 'kg', 5, '5 kg'),
      filaCarga(repsInput, unidad, pasoReps, `${pasoReps} ${unidad === 'reps' ? 'repetición' : nombreUnidad}`),
    ]));
    prefill();
  }

  // ---------- acciones (zona del pulgar) ----------
  const btnGuardar = porTiempo ? null : el('button', { class: 'btn', onclick: onGuardar });
  const btnDescansar = el('button', {
    class: 'btn' + (porTiempo ? ' btn-ancho' : ''), text: 'Descansar',
    onclick: () => iniciarDescanso(descansoSegundos(ej)),
  });
  const btnCompleto = el('button', { class: 'btn', text: 'Ejercicio completo', onclick: onCompleto });
  const acciones = el('div', { class: 'acciones' }, [btnGuardar, btnDescansar, btnCompleto]);
  cont.appendChild(acciones);

  // ---------- descanso: reemplaza a las acciones mientras corre ----------
  const cifra = el('div', { class: 'descanso-cifra', role: 'timer' });
  const descTexto = el('p', { class: 'descanso-texto' });
  const btnSaltar = el('button', { class: 'btn', text: 'Saltar', onclick: terminarDescanso });
  const descanso = el('div', { class: 'descanso', hidden: true }, [
    cifra,
    descTexto,
    el('button', {
      class: 'btn', text: '−30 s', 'aria-label': 'Restar 30 segundos',
      onclick: () => temporizador && temporizador.sumar(-30),
    }),
    el('button', {
      class: 'btn', text: '+30 s', 'aria-label': 'Sumar 30 segundos',
      onclick: () => temporizador && temporizador.sumar(30),
    }),
    btnSaltar,
  ]);
  cont.appendChild(descanso);

  // ---------- extras plegables: como se hace, notas, video ----------
  const extras = el('div', { class: 'extras' });
  const pasos = pasosEjecucion(ej);
  if (pasos.length) {
    extras.appendChild(el('details', {}, [
      el('summary', { text: 'Cómo se hace' }),
      el('ol', { class: 'pasos' }, pasos.map((p) => el('li', { text: p }))),
    ]));
  }
  if (ej.notas) {
    extras.appendChild(el('details', {}, [
      el('summary', { text: 'Notas' }),
      el('p', { class: 'notas-texto', text: ej.notas }),
    ]));
  }
  if (ej.videoUrl) {
    extras.appendChild(el('a', {
      class: 'link-video', href: ej.videoUrl, target: '_blank', rel: 'noopener noreferrer',
      text: 'Ver video del ejercicio',
    }));
  }
  if (extras.childNodes.length) cont.appendChild(extras);

  actualizar();

  // ================= funciones internas =================

  function todasGuardadas() {
    for (let i = 1; i <= total; i++) if (!mapa.has(i)) return false;
    return true;
  }

  function actualizar() {
    const listo = porTiempo || todasGuardadas();

    if (!porTiempo) {
      numEl.replaceChildren(`Serie ${serieActual} `, el('span', { class: 'serie-total', text: `de ${total}` }));
      pipsEl.replaceChildren(...Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const cls = mapa.has(n) ? 'pip pip--hecha' : n === serieActual ? 'pip pip--actual' : 'pip';
        return el('span', { class: cls });
      }));

      btnGuardar.className = 'btn' + (listo ? '' : ' btn-principal');
      btnGuardar.textContent = mapa.has(serieActual)
        ? `Corregir serie ${serieActual}`
        : `Guardar serie ${serieActual}`;
      btnGuardar.disabled = false;
    }

    // azul mientras quedan series; verde cuando estan todas guardadas
    nombreEl.classList.toggle('serie-nombre--completo', !porTiempo && listo);
    btnCompleto.className = 'btn' + (listo ? ' btn-principal' : '');
  }

  function prefill() {
    const ya = mapa.get(serieActual);
    const previa = mapa.get(serieActual - 1);
    const ultimaMisma = ultima && ultima.series.find((s) => s.numeroSerie === serieActual);
    const ultimaAlgo = ultima && ultima.series[ultima.series.length - 1];

    const peso = ya?.pesoReal ?? previa?.pesoReal ?? ultimaMisma?.pesoReal
      ?? ultimaAlgo?.pesoReal ?? primerNumero(ej.pesoObjetivo);
    const reps = ya?.repsReal ?? ultimaMisma?.repsReal ?? previa?.repsReal
      ?? primerNumero(ej.repeticiones);

    pesoInput.value = fmtNum(peso);
    repsInput.value = fmtNum(reps);
  }

  async function onGuardar() {
    btnGuardar.disabled = true; // evita doble toque
    const n = serieActual;
    const corrigiendo = mapa.has(n);

    const reg = await guardarSerie({
      sesionId: sesion.id,
      ejercicioId: ej.id,
      ejercicioNombre: ej.nombre,
      numeroSerie: n,
      pesoReal: aNumero(pesoInput.value),
      repsReal: aNumero(repsInput.value),
    });
    mapa.set(n, reg);
    if ((await getEstado(sesion.id, ej.id)) === 'pendiente') {
      await setEstado(sesion.id, ej.id, 'en-curso');
    }
    toast(corrigiendo ? `Serie ${n} corregida` : `Serie ${n} guardada`);

    if (serieActual < total) {
      serieActual++;
      prefill();
    }
    actualizar();

    if (!corrigiendo) iniciarDescanso(descansoSegundos(ej));
  }

  async function onCompleto() {
    await setEstado(sesion.id, ej.id, 'completo');
    desmontar();
    const sig = dia.ejercicios[indiceEjercicio(id, ejId) + 1];
    irA(sig ? `#/dia/${id}/ej/${sig.id}` : `#/dia/${id}`);
  }

  function iniciarDescanso(seg) {
    clearTimeout(retornoFin);
    acciones.hidden = true;
    descanso.hidden = false;
    descanso.classList.remove('descanso--fin');
    btnSaltar.textContent = 'Saltar';
    descTexto.textContent = porTiempo || todasGuardadas()
      ? 'Descanso'
      : `Descanso antes de la serie ${serieActual}`;

    if (!temporizador) {
      temporizador = crearTemporizador({
        onTick: (r) => { cifra.textContent = fmtTiempo(r); },
        onFin: finDescanso,
      });
    }
    temporizador.iniciar(seg);
  }

  function finDescanso() {
    descanso.classList.add('descanso--fin');
    btnSaltar.textContent = 'Seguir';
    descTexto.textContent = porTiempo || todasGuardadas()
      ? 'Descanso terminado'
      : `Descanso terminado. Sigue la serie ${serieActual}`;
    avisoFinDescanso();
    retornoFin = setTimeout(terminarDescanso, 5000);
  }

  function terminarDescanso() {
    clearTimeout(retornoFin);
    if (temporizador) { temporizador.detener(); temporizador = null; }
    descanso.hidden = true;
    descanso.classList.remove('descanso--fin');
    acciones.hidden = false;
  }
}

// ---------- helpers de construccion ----------

function ddVezPasada(ultima) {
  if (!ultima) return el('dd', { class: 'vacio-dato', text: 'Sin registros anteriores' });
  const dd = el('dd', {});
  for (const s of ultima.series) dd.appendChild(el('span', { class: 'vp-serie', text: formatoSerie(s) }));
  dd.appendChild(el('span', { class: 'vp-fecha', text: fmtFechaCorta(ultima.fecha) }));
  return dd;
}

function formatoSerie(s) {
  const p = s.pesoReal;
  const r = s.repsReal;
  if (p != null && r != null) return `${fmtNum(p)}×${fmtNum(r)}`;
  if (p != null) return `${fmtNum(p)} kg`;
  if (r != null) return fmtNum(r);
  return '–';
}

function inputCarga(id, etiqueta) {
  return el('input', {
    id, type: 'text', inputmode: 'decimal', autocomplete: 'off',
    enterkeyhint: 'done', 'aria-label': etiqueta,
  });
}

function filaCarga(input, unidad, paso, textoPaso) {
  return el('div', { class: 'carga-fila' }, [
    el('button', {
      type: 'button', class: 'disco', text: '−', 'aria-label': `Quitar ${textoPaso}`,
      onclick: () => ajustar(input, -paso),
    }),
    el('label', { class: 'carga-valor' }, [input, el('span', { class: 'carga-unidad', text: unidad })]),
    el('button', {
      type: 'button', class: 'disco', text: '+', 'aria-label': `Sumar ${textoPaso}`,
      onclick: () => ajustar(input, paso),
    }),
  ]);
}

function ajustar(input, delta) {
  let v = (aNumero(input.value) ?? 0) + delta;
  if (v < 0) v = 0;
  input.value = fmtNum(Math.round(v * 100) / 100);
}
