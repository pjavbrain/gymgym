// Carga y acceso a rutina.json (fuente de la rutina, solo lectura).

let _rutina = null;

export async function cargarRutina() {
  if (_rutina) return _rutina;
  const res = await fetch('rutina.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar rutina.json');
  _rutina = await res.json();
  return _rutina;
}

export function getDias() {
  return _rutina ? _rutina.dias : [];
}

export function getDia(id) {
  return getDias().find((d) => d.id === id) || null;
}

export function getEjercicio(diaId, ejId) {
  const dia = getDia(diaId);
  if (!dia) return null;
  return dia.ejercicios.find((e) => e.id === ejId) || null;
}

export function indiceEjercicio(diaId, ejId) {
  const dia = getDia(diaId);
  if (!dia) return -1;
  return dia.ejercicios.findIndex((e) => e.id === ejId);
}

// ----- helpers de interpretacion -----

// series === null  -> ejercicio por tiempo/duracion, no se registran series
export function esPorTiempo(ej) {
  return ej.series === null || ej.series === undefined;
}

export function numSeries(ej) {
  return esPorTiempo(ej) ? 1 : ej.series;
}

// descanso: valor del ejercicio o 90 s por defecto
export function descansoSegundos(ej) {
  return Number.isFinite(ej.descansoSegundos) ? ej.descansoSegundos : 90;
}

// primer numero que aparece en un texto libre ("6-8", "8 por pierna", "30-45 s")
export function primerNumero(texto) {
  if (typeof texto !== 'string') return null;
  const m = texto.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  return parseFloat(m[0].replace(',', '.'));
}

// "Martes — Pierna Fuerza" -> { nombre: "Martes", foco: "Pierna Fuerza" }
export function partesDia(dia) {
  const [nombre, foco = ''] = String(dia.nombre).split('—').map((s) => s.trim());
  return { nombre, foco };
}

// "5-8" -> "5–8" (guion de rango tipografico)
export function textoRango(texto) {
  return String(texto || '').replace(/(\d)\s*-\s*(\d)/g, '$1–$2');
}

// Version corta para listas: "8-10 por pierna" -> "8–10", "30-45 s" -> "30–45 s"
export function rangoCorto(texto) {
  const m = String(texto || '').match(/^\s*(\d+(?:\s*[-–]\s*\d+)?)\s*(s|seg|min)?\b/i);
  if (!m) return textoRango(texto);
  return textoRango(m[1]) + (m[2] ? ' ' + m[2] : '');
}

// Unidad de lo que se registra en "repeticiones"
export function unidadReps(ej) {
  const t = String(ej.repeticiones || '');
  if (/min/i.test(t)) return 'min';
  if (/\d\s*s\b/i.test(t)) return 's';
  return 'reps';
}

// true si el texto es solo un numero o rango ("5", "6-8")
export function esRangoPuro(texto) {
  return /^\s*\d+(\s*[-–]\s*\d+)?\s*$/.test(String(texto || ''));
}

// Pasos de "Como se hace": lista de textos, vacia si el ejercicio no trae
export function pasosEjecucion(ej) {
  if (!Array.isArray(ej.ejecucion)) return [];
  return ej.ejecucion.filter((p) => typeof p === 'string' && p.trim());
}
