// Helpers minimos de DOM compartidos por las vistas.

export function el(tag, props = {}, hijos = []) {
  const n = document.createElement(tag);
  // Permitir el(tag, hijos) sin props.
  if (Array.isArray(props) || typeof props === 'string' || props instanceof Node) {
    hijos = props;
    props = {};
  }
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const h of [].concat(hijos)) {
    if (h == null || h === false) continue;
    n.appendChild(typeof h === 'string' ? document.createTextNode(h) : h);
  }
  return n;
}

export function limpiar(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
}

let toastT = null;
export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = el('div', { class: 'toast' });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  clearTimeout(toastT);
  toastT = setTimeout(() => t.remove(), 2200);
}

export function fmtFechaCorta(d) {
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`;
}

// Numero con coma decimal (teclado iOS en espanol)
export function fmtNum(n) {
  return n == null ? '' : String(n).replace('.', ',');
}

// Texto del usuario -> numero o null. Acepta coma o punto.
export function aNumero(v) {
  const s = String(v ?? '').trim().replace(',', '.');
  if (s === '') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
