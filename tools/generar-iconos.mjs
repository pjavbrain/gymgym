// Genera los iconos PNG de la PWA sin dependencias externas.
// Uso:  node tools/generar-iconos.mjs
//
// Encoder PNG minimo (RGBA, 8 bits, sin filtro) usando solo zlib de Node.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_ICONS = join(RAIZ, 'icons');

// -------- CRC32 --------
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const t = Buffer.from(tipo, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, datos])), 0);
  return Buffer.concat([largo, t, datos, crc]);
}

function png(ancho, alto, rgba) {
  const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compresion
  ihdr[11] = 0;  // filtro
  ihdr[12] = 0;  // interlace

  // scanlines con byte de filtro 0
  const filas = Buffer.alloc(alto * (1 + ancho * 4));
  for (let y = 0; y < alto; y++) {
    filas[y * (1 + ancho * 4)] = 0;
    rgba.copy(filas, y * (1 + ancho * 4) + 1, y * ancho * 4, (y + 1) * ancho * 4);
  }
  const idat = deflateSync(filas, { level: 9 });

  return Buffer.concat([
    firma,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// -------- dibujo del icono --------
// Fondo oscuro + mancuerna verde. `padFrac` reserva margen (para maskable).
function dibujar(tam, padFrac) {
  const rgba = Buffer.alloc(tam * tam * 4);
  const FONDO = [0x12, 0x18, 0x1f, 0xff];
  const ACENTO = [0x37, 0xd9, 0xa0, 0xff];

  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= tam || y >= tam) return;
    const i = (y * tam + x) * 4;
    rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = c[3];
  };
  const rect = (x0, y0, x1, y1, c) => {
    for (let y = Math.round(y0); y < Math.round(y1); y++)
      for (let x = Math.round(x0); x < Math.round(x1); x++) set(x, y, c);
  };

  rect(0, 0, tam, tam, FONDO);

  const pad = tam * padFrac;
  const izq = pad;
  const der = tam - pad;
  const medioY = tam / 2;
  const alto = (der - izq);
  const g = alto * 0.11;           // grosor base
  const cy0 = medioY - g * 1.9;
  const cy1 = medioY + g * 1.9;

  // barra central
  rect(izq + alto * 0.28, medioY - g * 0.55, der - alto * 0.28, medioY + g * 0.55, ACENTO);
  // discos internos
  rect(izq + alto * 0.16, medioY - g * 1.5, izq + alto * 0.28, medioY + g * 1.5, ACENTO);
  rect(der - alto * 0.28, medioY - g * 1.5, der - alto * 0.16, medioY + g * 1.5, ACENTO);
  // discos externos
  rect(izq + alto * 0.03, cy0, izq + alto * 0.16, cy1, ACENTO);
  rect(der - alto * 0.16, cy0, der - alto * 0.03, cy1, ACENTO);

  return rgba;
}

// -------- salida --------
mkdirSync(DIR_ICONS, { recursive: true });

const salidas = [
  ['icon-192.png', 192, 0.14],
  ['icon-512.png', 512, 0.14],
  ['icon-maskable-512.png', 512, 0.26],
  ['apple-touch-icon.png', 180, 0.14],
];

for (const [nombre, tam, pad] of salidas) {
  const buf = png(tam, tam, dibujar(tam, pad));
  writeFileSync(join(DIR_ICONS, nombre), buf);
  console.log('  escrito', nombre, `(${tam}x${tam}, ${buf.length} bytes)`);
}
console.log('Listo.');
