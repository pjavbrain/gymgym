# Arquitectura de Pedro Acosta Training

El mapa del proyecto: qué hace cada archivo, cómo viaja una acción de punta a punta y dónde quedan tus datos.
Escrito el 13 de septiembre de 2026. Si algo no coincide con el código, manda el código.

---

## 1. La idea en una frase

Pedro Acosta Training (internamente `gymgym`) es una página web que se instala en el iPhone como si fuera una app, funciona sin internet y guarda tus entrenamientos **dentro del propio teléfono**. No hay servidor, cuenta ni nube: todo pasa en el celular.

- **App publicada:** https://pjavbrain.github.io/gymgym/
- **Código:** https://github.com/pjavbrain/gymgym

---

## 2. Palabras que vas a encontrar

| Palabra | Qué significa aquí |
|---|---|
| **Navegador** | Safari en el iPhone, o Chrome/Edge en la PC. Es el programa que abre la app. |
| **PWA** | "Aplicación web progresiva": una página web que se puede instalar en la pantalla de inicio y funcionar sin internet. |
| **Service worker** | Un vigilante que queda instalado en el teléfono con una copia de la app y la entrega cuando no hay señal. Es el archivo `sw.js`. |
| **Caché** | Esa copia guardada de los archivos de la app. |
| **IndexedDB** | La memoria interna del navegador donde la app guarda tus series. Funciona como un archivador con cajones. |
| **Sesión** | Un entrenamiento: empieza cuando abres un día y termina cuando tocas "Cerrar el martes". |
| **Script** | Un programa corto que automatiza una tarea, como dibujar los íconos. |
| **Servidor** | Un programa que entrega los archivos al navegador. En producción es GitHub Pages; en tu PC es `tools/servir.ps1`. |
| **Commit / push** | Guardar una versión en git / subirla a GitHub. |

---

## 3. Mapa de archivos

Hay cuatro tipos de archivo. El proyecto **no tiene dependencias**: no usa programas de terceros ni descarga nada de internet, por decisión.

### Código (lo que hace funcionar la app)

Ordenado de más a menos importante. Líneas contadas el 13/09/2026, incluidas las que están en blanco.

| # | Archivo | Qué hace | Líneas |
|---|---|---|---|
| 1 | `index.html` | La puerta de entrada: la página que abre el navegador y que carga todo lo demás. | 30 |
| 2 | `js/app.js` | Arranca la app, decide qué pantalla mostrar y mantiene la pantalla encendida durante el entrenamiento. | 132 |
| 3 | `js/vistas/ejercicio.js` | La pantalla donde anotas peso y repeticiones, con la cuenta atrás del descanso. | 305 |
| 4 | `js/db.js` | Guarda y recupera tus entrenamientos en la memoria interna del teléfono. | 232 |
| 5 | `js/rutina.js` | Lee `rutina.json` y responde preguntas como "¿qué ejercicios tiene el martes?". | 86 |
| 6 | `css/styles.css` | Cómo se ve todo: colores, letras, tamaños de botones y distribución. | 426 |
| 7 | `js/vistas/ejercicios.js` | La lista de ejercicios del día, con su estado. | 109 |
| 8 | `js/vistas/dias.js` | La primera pantalla, donde eliges el día. | 46 |
| 9 | `js/timer.js` | La cuenta regresiva del descanso, sin atrasarse aunque el teléfono vaya lento. | 62 |
| 10 | `sw.js` | Guarda una copia de la app en el teléfono para que funcione sin internet. | 64 |
| 11 | `js/exportar.js` | Descarga todo tu historial en un archivo de respaldo. | 27 |
| 12 | `js/sonido.js` | Los pitidos al terminar el descanso (y la vibración, que el iPhone ignora). | 51 |
| 13 | `js/ui.js` | Ayudas pequeñas que usan todas las pantallas: crear botones, avisos, números con coma. | 60 |
| 14 | `tools/servir.ps1` | Enciende en tu PC un servidor de prueba para ver la app antes de publicarla. | 59 |
| 15 | `tools/generar-iconos.ps1` | Dibuja los íconos de la app (el que se usa). | 48 |
| 16 | `tools/generar-iconos.mjs` | Lo mismo con Node; alternativa sin usar. | 123 |

Los 13 primeros son la app. Los tres de `tools/` son ayudas para trabajar en la PC; la app nunca los usa.

### Configuración y contenido

| Archivo | Para qué sirve |
|---|---|
| `rutina.json` | **Tu rutina** (versión publicada, sin datos médicos). La app la lee para saber qué mostrar. |
| `rutina-completa.json` | Tu rutina con `consideraciones` y `progresion` (datos médicos). **Solo en tu PC, nunca se sube.** |
| `manifest.json` | La ficha para instalar la app: nombre, colores, íconos, pantalla completa, vertical. |
| `.gitignore` | Lista de archivos que no se suben a GitHub. |
| `.claude/launch.json` | Le dice a Claude Code cómo encender el servidor de prueba. No se sube. |
| `README.md` | Instrucciones rápidas: correr, instalar, diseño. |
| `ARQUITECTURA.md` | Este documento. |
| `CLAUDE.md` | Reglas del proyecto para Claude. |

### Archivos generados (no se editan a mano)

| Archivo | Quién lo crea |
|---|---|
| `icons/*.png` (4 íconos) | `tools/generar-iconos.ps1` |
| `gymgym-historial-*.json` | El botón "Exportar" de la app. No se sube. |
| `.git/` (carpeta oculta) | git, con el historial de versiones. |

### Cómo se conectan

```
index.html
   ├── css/styles.css                  (aspecto)
   └── js/app.js                       (arranque y navegación)
         ├── js/rutina.js  ← rutina.json
         ├── js/db.js      ↔ memoria interna del teléfono (IndexedDB)
         ├── js/exportar.js → js/db.js
         ├── js/sonido.js
         ├── js/ui.js
         └── pantallas:
               js/vistas/dias.js         #/
               js/vistas/ejercicios.js   #/dia/mar
               js/vistas/ejercicio.js    #/dia/mar/ej/mar-hip-thrust
                     └── js/timer.js

sw.js  → guarda copia de todo lo anterior para funcionar sin internet
```

La parte después de `#` en la dirección decide la pantalla. `app.js` la lee y llama a la vista que corresponde.

---

## 4. Recorrido A: abro la app y veo mi rutina

1. **Tocas el ícono.** El iPhone lee `manifest.json` y abre la app a pantalla completa, en vertical y con fondo oscuro.
2. **El teléfono pide la página.** La primera vez viene de internet (GitHub Pages). Desde la segunda, `sw.js` la entrega desde la copia guardada, sin internet.
3. **Se abre `index.html`.** Carga `css/styles.css`, dibuja la barra de arriba ("Pedro Acosta Training" y "Exportar") y ejecuta `js/app.js`.
4. **Arranca `js/app.js`.** Trae las demás piezas (`rutina.js`, `db.js`, `ui.js`, `sonido.js`, `exportar.js` y las tres vistas) y deja listos el botón Exportar, la pantalla encendida y el desbloqueo del sonido con tu primer toque (el iPhone no deja sonar nada antes).
5. **Se lee la rutina.** `app.js` le pide a `js/rutina.js` que cargue `rutina.json`.
6. **Se elige pantalla.** Sin nada después de `#`, `app.js` muestra `js/vistas/dias.js`.
7. **Se arma la lista de días.** `dias.js` marca "Hoy" según la fecha, pregunta a `js/db.js` si quedó un entrenamiento sin cerrar (y muestra "Tienes el martes sin cerrar") y dibuja una fila por día.
8. **Tocas un día.** `app.js` muestra `js/vistas/ejercicios.js`, que:
   - pide a `db.js` el entrenamiento de ese día: lo retoma si existía o crea uno nuevo; si hay otro día abierto, pregunta qué hacer;
   - avisa a `app.js`, que pide al iPhone no apagar la pantalla;
   - pregunta a `db.js` el estado de cada ejercicio;
   - dibuja la barra de progreso y la lista.

---

## 5. Recorrido B: registro una serie

1. **Entras a un ejercicio.** `js/vistas/ejercicio.js` pregunta a `js/db.js` por el entrenamiento abierto, las series ya guardadas hoy (para saber si vas en la 1, 2 o 3) y lo que hiciste la última vez. Dibuja la pantalla y sugiere peso y repeticiones. Debajo de los botones deja dos desplegables cerrados: "Cómo se hace" (los pasos del campo `ejecucion` de `rutina.json`) y "Notas".
2. **Ajustas con − y +.** El peso cambia de 5 en 5 kg y las repeticiones de 1 en 1. Lo maneja `ejercicio.js`. **Todavía no se guarda nada.**
3. **Tocas "Guardar serie 1".** Lo recibe `ejercicio.js`: bloquea el botón un instante (contra el doble toque) y le pide a `js/ui.js` que convierta "82,5" en 82.5.
4. **Se guarda.** `js/db.js` escribe en el cajón `series`: entrenamiento, ejercicio, número de serie, peso, repeticiones y hora. Si corriges la misma serie, la reemplaza en vez de duplicarla.
5. **Cambia el estado.** `db.js` marca el ejercicio como "en curso".
6. **Confirmación.** `js/ui.js` muestra "Serie 1 guardada" (solo cuando la serie ya quedó escrita) y `ejercicio.js` pasa a "Serie 2 de 3".
7. **Descanso automático.** `ejercicio.js` cambia los botones por la cuenta atrás. El tiempo sale de `js/rutina.js` (90 s si el ejercicio no dice nada) y lo cuenta `js/timer.js`.
8. **Fin del descanso.** `js/sonido.js` hace sonar tres pitidos, el recuadro se pone verde y a los 5 s vuelve el botón "Guardar serie 2".

> ⚠️ **Vibración:** el código la pide, pero Safari en iPhone no deja vibrar a las páginas web. En iPhone solo hay sonido.

---

## 6. Dónde quedan los datos

### En el teléfono (tus entrenamientos)

Todo lo que registras vive en la **memoria interna del navegador del iPhone**, en un archivador llamado `gymgym` con tres cajones:

| Cajón | Qué guarda | Ejemplo |
|---|---|---|
| `sesiones` | Cada entrenamiento: día, hora de inicio y fin, abierto o cerrado. | Martes 13/09, abierto |
| `series` | Cada serie: ejercicio, número, peso, repeticiones, hora. | Hip thrust, serie 1, 82.5 kg × 6 |
| `estadoEjercicios` | Estado de cada ejercicio dentro de un entrenamiento. | Hip thrust: en curso |

No va a GitHub, ni a `rutina.json`, ni a ninguna nube.

### En GitHub (la app, no tus datos)

El código, `rutina.json` sin datos médicos y los íconos.

### Solo en tu PC

`rutina-completa.json` (con datos médicos) y los historiales exportados.

---

## 7. ¿Qué pasa si cierro la app?

| Situación | Resultado |
|---|---|
| Series con el aviso "guardada" | ✅ A salvo. Sobreviven al cierre, al apagado y al paso de los días. |
| Entrenamiento abierto | ✅ Sigue abierto hasta que lo cierres tú. |
| Números ajustados sin tocar "Guardar" | ❌ Se pierden. |
| Cuenta regresiva del descanso | ❌ Se pierde; solo existe con la pantalla abierta. |
| Descanso que termina con la app en segundo plano | ⚠️ No suena. Al volver, el tiempo ya avanzó correctamente. |

**Al volver a abrir:** si el iPhone cerró la app, arrancas en "Elige el día" con el aviso "Tienes el martes sin cerrar". Al continuar, `ejercicios.js` retoma el entrenamiento y `ejercicio.js` te deja en la serie que sigue.

**Lo único que borra tus datos:** eliminar la app de la pantalla de inicio, o borrar los datos de sitios web en los ajustes de Safari. Por eso conviene tocar **Exportar** cada tanto y guardar el archivo en otro lado.

> Hoy existe exportar, pero **no importar**: la función está escrita en `db.js` (`importarTodo`), pero todavía no tiene botón.

---

## 8. Cómo se publica un cambio

1. Cambias el código y lo pruebas en la PC con `tools/servir.ps1` (http://localhost:4173).
2. Si cambiaste cualquier archivo de la app, **subes el número de versión** en `sw.js` (`gymgym-v2` → `gymgym-v3`). Si no, el iPhone sigue usando su copia vieja.
3. Si agregaste un archivo nuevo, lo sumas a la lista `ASSETS` de `sw.js`. Si no, no funcionará sin internet.
4. Commit y push a la rama `main`. GitHub Pages publica solo en menos de un minuto.
5. En el iPhone, abre la app con conexión una vez para que tome la versión nueva.

---

## 9. Lo que falta (fase 2)

- Resumen de la sesión al cerrar el día.
- Botón para importar un historial exportado.
- Pantalla con consideraciones y progresión (hoy solo en `rutina-completa.json`).
- Cuenta regresiva para ejercicios por tiempo (bici, caminata).
