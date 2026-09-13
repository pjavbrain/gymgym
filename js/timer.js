// Temporizador de descanso. Cuenta atras robusta frente a throttling:
// el tiempo restante se calcula contra Date.now(), no acumulando ticks.

export function crearTemporizador({ onTick, onFin }) {
  let intervalo = null;
  let finEn = 0; // timestamp objetivo
  let terminado = false;

  function restante() {
    return Math.max(0, Math.ceil((finEn - Date.now()) / 1000));
  }

  function tick() {
    const r = restante();
    if (onTick) onTick(r);
    if (r <= 0 && !terminado) {
      terminado = true;
      detener();
      if (onFin) onFin();
    }
  }

  function iniciar(segundos) {
    detener();
    terminado = false;
    finEn = Date.now() + segundos * 1000;
    tick();
    intervalo = setInterval(tick, 250);
  }

  function sumar(segundos) {
    if (!intervalo && !terminado) return;
    terminado = false;
    finEn = (finEn > Date.now() ? finEn : Date.now()) + segundos * 1000;
    if (!intervalo) intervalo = setInterval(tick, 250);
    tick();
  }

  function detener() {
    if (intervalo) { clearInterval(intervalo); intervalo = null; }
  }

  function saltar() {
    detener();
    terminado = true;
  }

  return {
    iniciar,
    sumar,
    saltar,
    detener,
    get activo() { return intervalo != null; },
    get restante() { return restante(); },
  };
}

export function fmtTiempo(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m + ':' + String(s).padStart(2, '0');
}
