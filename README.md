# Pedro Acosta Training

(Repo e identificadores internos: `gymgym`.)

PWA de registro de entrenamiento. Sin backend, sin CDN, sin dependencias. Datos en IndexedDB.

## Fase 1 (esta version) — flujo de punta a punta

- Elegir dia de entrenamiento.
- Lista de ejercicios del dia con estado (pendiente / en curso / completo).
- Pantalla de serie: nombre, cue, serie actual, objetivo, **registro de la vez pasada**.
- Registro de peso y reps reales por serie (botones grandes con +/-).
- Al guardar una serie **arranca solo** el temporizador de descanso (valor del ejercicio o 90 s).
- Aviso al terminar el descanso: beep (WebAudio) + vibracion.
- Marcar ejercicio completo -> pasa al siguiente.
- Cerrar dia.
- Boton **Exportar** (siempre en la cabecera): descarga todo el historial en JSON.
- Wake Lock activo mientras hay una sesion abierta.
- Funciona 100% sin conexion (service worker con precache total).

## Pendiente para fase 2

- Resumen de sesion al cerrar el dia.
- Boton **Importar** JSON (la logica `importarTodo` ya esta en `js/db.js`).
- Pantalla de consideraciones / progresion de `rutina.json`.
- Temporizador de cuenta atras para los ejercicios por tiempo (wall sits, plancha).

## Diseño

Aplicada la skill `frontend-design` (anthropics/skills). Sujeto: gimnasio a las 5 AM, suelo de caucho, tiza, discos de competición.

| Token | Hex | Uso |
|---|---|---|
| caucho | `#1c1b19` | fondo |
| goma | `#2a2926` | superficies elevadas |
| tiza | `#eeece7` | texto y botón principal |
| polvo | `#a39f97` | texto secundario |
| azul (disco 20 kg) | `#5a93f2` | descanso, serie en curso, hoy |
| verde (disco 10 kg) | `#63b86a` | completo |

- Tipografía: DIN Condensed para cifras y nombres (Bahnschrift en Windows), Avenir Next para texto. Ambas vienen en iOS: sin descargas.
- Lo memorable: la cuenta atrás gigante, que reemplaza a los botones en la zona del pulgar mientras dura el descanso.
- Botones −/+ redondos como discos. Listas con reglas en vez de tarjetas. Etiquetas en minúscula normal, sin "·" ni "›".
- Peso con coma decimal (`82,5`), compatible con el teclado iOS en español.

## Como correrlo

Un service worker necesita `http://`, no `file://`. Servir la carpeta con cualquier
servidor estatico. Sin Node ni Python, incluido en Windows:

```bash
powershell -ExecutionPolicy Bypass -File tools/servir.ps1 -Port 4173
```

Luego abrir `http://localhost:4173`.

> En `localhost` el service worker queda **desactivado** para poder iterar sin cache.
> Para probar el modo offline: `http://localhost:4173/?sw=1`.
> En cualquier otro host (deploy real) el service worker se registra siempre.

## Instalar en el iPhone

1. Servir la carpeta desde un host con HTTPS (GitHub Pages, Netlify, etc.) o por IP local.
2. Abrir la URL en Safari.
3. Compartir -> "Anadir a pantalla de inicio".

## Iconos

Ya generados en `icons/`. Para regenerarlos:

```bash
powershell -ExecutionPolicy Bypass -File tools/generar-iconos.ps1
```

(Alternativa con Node: `node tools/generar-iconos.mjs`.)

## Estructura

```
index.html            shell + carga de modulos
manifest.json         PWA
sw.js                 service worker (precache total -> offline)
css/styles.css        modo oscuro, alto contraste, targets >= 60px
js/
  app.js              arranque: SW, Wake Lock, router de vistas (#/...)
  db.js               IndexedDB: sesiones, series, estado, export/import
  rutina.js           carga rutina.json + helpers
  timer.js            temporizador de descanso
  sonido.js           beep WebAudio + vibracion
  exportar.js         descarga del historial en JSON
  ui.js               helpers de DOM
  vistas/
    dias.js           elegir dia
    ejercicios.js     lista de ejercicios del dia + estado
    ejercicio.js      registro de series + temporizador
icons/                iconos PNG generados
tools/
  servir.ps1          servidor estatico de desarrollo
  generar-iconos.ps1  generador de iconos (System.Drawing)
  generar-iconos.mjs  generador de iconos (Node, alternativa)
```
