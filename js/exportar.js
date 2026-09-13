// Exportar todo el historial a un JSON descargable.

import { exportarTodo } from './db.js';

function fechaArchivo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function descargarHistorial() {
  const data = await exportarTodo();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `gymgym-historial-${fechaArchivo()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  const n = data.datos.sesiones.length;
  return { sesiones: n, series: data.datos.series.length };
}
