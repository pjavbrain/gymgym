// Aviso sonoro (WebAudio, sin archivos) + vibracion.

let ctx = null;

// Debe llamarse desde un gesto del usuario (primer toque) para desbloquear audio en iOS.
export function desbloquearAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    // "silencio" corto para completar el desbloqueo
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.02);
  } catch (_) { /* sin audio: no pasa nada */ }
}

function bip(cuando, freq, dur) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, cuando);
  g.gain.exponentialRampToValueAtTime(0.5, cuando + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, cuando + dur);
  o.connect(g).connect(ctx.destination);
  o.start(cuando);
  o.stop(cuando + dur + 0.02);
}

export function avisoFinDescanso() {
  try {
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (ctx) {
      const t0 = ctx.currentTime + 0.01;
      bip(t0, 880, 0.16);
      bip(t0 + 0.22, 880, 0.16);
      bip(t0 + 0.44, 1175, 0.28);
    }
  } catch (_) { /* ignore */ }

  try {
    if (navigator.vibrate) navigator.vibrate([220, 120, 220, 120, 420]);
  } catch (_) { /* ignore */ }
}
