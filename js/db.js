// IndexedDB: sesiones, registros de serie y estado por ejercicio.
// Sin dependencias. Todo local.

const DB_NOMBRE = 'gymgym';
const DB_VERSION = 1;

let _db = null;

export function abrirDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = req.result;

      if (!db.objectStoreNames.contains('sesiones')) {
        const s = db.createObjectStore('sesiones', { keyPath: 'id' });
        s.createIndex('porDia', 'diaId', { unique: false });
        s.createIndex('porEstado', 'estado', { unique: false });
      }

      if (!db.objectStoreNames.contains('series')) {
        // id explicito: `${sesionId}::${ejercicioId}::${numeroSerie}` -> put() hace upsert
        const s = db.createObjectStore('series', { keyPath: 'id' });
        s.createIndex('porSesion', 'sesionId', { unique: false });
        s.createIndex('porEjercicio', 'ejercicioId', { unique: false });
        s.createIndex('porSesionEjercicio', ['sesionId', 'ejercicioId'], { unique: false });
      }

      if (!db.objectStoreNames.contains('estadoEjercicios')) {
        const s = db.createObjectStore('estadoEjercicios', { keyPath: ['sesionId', 'ejercicioId'] });
        s.createIndex('porSesion', 'sesionId', { unique: false });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(stores, modo) {
  return abrirDB().then((db) => db.transaction(stores, modo));
}

function pedir(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function todosPorIndice(store, indice, valor) {
  return new Promise((resolve, reject) => {
    const out = [];
    const idx = store.index(indice);
    const req = idx.openCursor(IDBKeyRange.only(valor));
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { out.push(cur.value); cur.continue(); }
      else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// ---------------- Sesiones ----------------

export async function getSesionAbierta() {
  const t = await tx(['sesiones'], 'readonly');
  const lista = await todosPorIndice(t.objectStore('sesiones'), 'porEstado', 'abierta');
  lista.sort((a, b) => b.iniciada.localeCompare(a.iniciada));
  return lista[0] || null;
}

export async function getSesion(id) {
  const t = await tx(['sesiones'], 'readonly');
  return pedir(t.objectStore('sesiones').get(id));
}

export async function crearSesion(dia) {
  const sesion = {
    id: uid(),
    diaId: dia.id,
    diaNombre: dia.nombre,
    iniciada: new Date().toISOString(),
    cerrada: null,
    estado: 'abierta',
  };
  const t = await tx(['sesiones'], 'readwrite');
  await pedir(t.objectStore('sesiones').add(sesion));
  return sesion;
}

export async function cerrarSesion(sesionId) {
  const t = await tx(['sesiones'], 'readwrite');
  const store = t.objectStore('sesiones');
  const sesion = await pedir(store.get(sesionId));
  if (!sesion) return null;
  sesion.estado = 'cerrada';
  sesion.cerrada = new Date().toISOString();
  await pedir(store.put(sesion));
  return sesion;
}

// Devuelve la sesion abierta del dia, o crea una nueva.
// Si hay una sesion abierta de OTRO dia devuelve { conflicto: sesion }.
export async function asegurarSesion(dia) {
  const abierta = await getSesionAbierta();
  if (abierta && abierta.diaId === dia.id) return abierta;
  if (abierta && abierta.diaId !== dia.id) return { conflicto: abierta };
  return crearSesion(dia);
}

// ---------------- Series ----------------

export async function getSeriesDeSesion(sesionId) {
  const t = await tx(['series'], 'readonly');
  return todosPorIndice(t.objectStore('series'), 'porSesion', sesionId);
}

export async function getSeriesDeEjercicioEnSesion(sesionId, ejercicioId) {
  const t = await tx(['series'], 'readonly');
  const todas = await todosPorIndice(t.objectStore('series'), 'porSesionEjercicio', [sesionId, ejercicioId]);
  return todas.sort((a, b) => a.numeroSerie - b.numeroSerie);
}

export async function guardarSerie({ sesionId, ejercicioId, ejercicioNombre, numeroSerie, pesoReal, repsReal }) {
  const registro = {
    id: `${sesionId}::${ejercicioId}::${numeroSerie}`,
    sesionId,
    ejercicioId,
    ejercicioNombre,
    numeroSerie,
    pesoReal: pesoReal === '' || pesoReal == null ? null : Number(pesoReal),
    repsReal: repsReal === '' || repsReal == null ? null : Number(repsReal),
    registrada: new Date().toISOString(),
  };
  const t = await tx(['series'], 'readwrite');
  await pedir(t.objectStore('series').put(registro));
  return registro;
}

// Registro mas reciente de ese ejercicio en una sesion anterior.
export async function getUltimaVez(ejercicioId, excluirSesionId) {
  const t = await tx(['series'], 'readonly');
  const todas = await todosPorIndice(t.objectStore('series'), 'porEjercicio', ejercicioId);
  const otras = todas.filter(
    (s) => s.sesionId !== excluirSesionId && (s.pesoReal != null || s.repsReal != null)
  );
  if (!otras.length) return null;

  const grupos = new Map();
  for (const s of otras) {
    if (!grupos.has(s.sesionId)) grupos.set(s.sesionId, []);
    grupos.get(s.sesionId).push(s);
  }

  let mejor = null;
  let mejorT = -1;
  for (const arr of grupos.values()) {
    const t2 = Math.max(...arr.map((s) => Date.parse(s.registrada)));
    if (t2 > mejorT) { mejorT = t2; mejor = arr; }
  }
  mejor.sort((a, b) => a.numeroSerie - b.numeroSerie);
  return { fecha: new Date(mejorT), series: mejor };
}

// ---------------- Estado por ejercicio ----------------

export async function getEstadosDeSesion(sesionId) {
  const t = await tx(['estadoEjercicios'], 'readonly');
  const lista = await todosPorIndice(t.objectStore('estadoEjercicios'), 'porSesion', sesionId);
  const mapa = new Map();
  for (const e of lista) mapa.set(e.ejercicioId, e.estado);
  return mapa;
}

export async function getEstado(sesionId, ejercicioId) {
  const t = await tx(['estadoEjercicios'], 'readonly');
  const e = await pedir(t.objectStore('estadoEjercicios').get([sesionId, ejercicioId]));
  return e ? e.estado : 'pendiente';
}

export async function setEstado(sesionId, ejercicioId, estado) {
  const t = await tx(['estadoEjercicios'], 'readwrite');
  await pedir(t.objectStore('estadoEjercicios').put({
    sesionId, ejercicioId, estado, actualizado: new Date().toISOString(),
  }));
}

// ---------------- Export / Import ----------------

export async function exportarTodo() {
  const t = await tx(['sesiones', 'series', 'estadoEjercicios'], 'readonly');
  const [sesiones, series, estadoEjercicios] = await Promise.all([
    pedir(t.objectStore('sesiones').getAll()),
    pedir(t.objectStore('series').getAll()),
    pedir(t.objectStore('estadoEjercicios').getAll()),
  ]);
  return {
    formato: 'gymgym-historial',
    version: 1,
    exportado: new Date().toISOString(),
    datos: { sesiones, series, estadoEjercicios },
  };
}

// Reservado para la fase 2 (boton importar).
export async function importarTodo(obj, { modo = 'reemplazar' } = {}) {
  if (!obj || obj.formato !== 'gymgym-historial' || !obj.datos) {
    throw new Error('Archivo no reconocido');
  }
  const { sesiones = [], series = [], estadoEjercicios = [] } = obj.datos;
  const t = await tx(['sesiones', 'series', 'estadoEjercicios'], 'readwrite');
  if (modo === 'reemplazar') {
    await Promise.all([
      pedir(t.objectStore('sesiones').clear()),
      pedir(t.objectStore('series').clear()),
      pedir(t.objectStore('estadoEjercicios').clear()),
    ]);
  }
  for (const s of sesiones) t.objectStore('sesiones').put(s);
  for (const s of series) t.objectStore('series').put(s);
  for (const e of estadoEjercicios) t.objectStore('estadoEjercicios').put(e);
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}
