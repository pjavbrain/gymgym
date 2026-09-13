# GymGym

PWA para registrar entrenamientos en el gimnasio desde un iPhone 12 Pro Max: elegir día, anotar peso y repeticiones por serie, descanso automático, exportar historial. Uso real: un usuario, solo, a las 5 AM, con una mano y las manos sudadas.

- Producción: https://pjavbrain.github.io/gymgym/ (GitHub Pages desde `main`, raíz `/`)
- Repo: https://github.com/pjavbrain/gymgym (público)
- Mapa detallado y recorridos: `ARQUITECTURA.md`

## Stack

- HTML + CSS + JavaScript con módulos ES nativos. **Sin framework, sin build, sin bundler.**
- **Cero dependencias:** sin CDN, sin npm en runtime, sin fuentes descargadas. Es un requisito del usuario, no una preferencia.
- Datos: IndexedDB (`js/db.js`), base `gymgym`, versión 1.
- Offline: service worker `sw.js` con precache total y cache-first.
- Pantalla encendida: Screen Wake Lock mientras hay una sesión abierta.
- Tooling en Windows/PowerShell (`tools/`). Node 24 está instalado, pero la app no lo usa.

## Organización

```
index.html            shell; carga css/styles.css y js/app.js
sw.js                 precache (lista ASSETS) + versión de caché
manifest.json         PWA
rutina.json           rutina publicada (fuente de contenido, solo lectura)
css/styles.css        tokens de diseño y todos los estilos
js/app.js             arranque, router por hash, Wake Lock, exportar, registro del SW
js/db.js              IndexedDB: sesiones, series, estadoEjercicios, export/import
js/rutina.js          carga rutina.json + helpers de interpretación
js/ui.js              el(), limpiar(), toast(), plural(), fmtNum(), aNumero()
js/timer.js           cuenta atrás contra Date.now()
js/sonido.js          beeps con WebAudio + vibrate
js/exportar.js        descarga del historial
js/vistas/            una vista por pantalla; cada una exporta montar(cont, params) y opcionalmente desmontar()
  dias.js             #/
  ejercicios.js       #/dia/:id
  ejercicio.js        #/dia/:id/ej/:ejId
tools/                servir.ps1, generar-iconos.ps1 (en uso), generar-iconos.mjs (alternativa)
icons/                PNG generados; no editar a mano
img/                  imagenInicial/imagenFinal de rutina.json
```

## Comandos

```bash
powershell -ExecutionPolicy Bypass -File tools/servir.ps1 -Port 4173
```

```bash
powershell -ExecutionPolicy Bypass -File tools/generar-iconos.ps1
```

- En `localhost` el SW está **desactivado a propósito**. Para probar offline: `http://localhost:4173/?sw=1`.
- Verificar en viewport de 428×926. Lo esencial de la pantalla de serie debe caber sin scroll.
- No hay tests automáticos: verificar en el navegador (flujo guardar serie → descanso → completo → siguiente).

## Reglas de privacidad (no negociables)

- `rutina.json` publicado **no lleva** `consideraciones` ni `progresion`: son datos médicos. La versión completa es `rutina-completa.json`, solo local y en `.gitignore`. **Nunca volver a subir esos campos sin preguntar.**
- Nunca commitear `gymgym-historial-*.json` (exportaciones con datos personales).
- El repo es público: revisar que ningún cambio agregue datos de salud, nombres de terceros o datos personales.

## Convenciones al modificar

### Código
- Nombres de variables, funciones y archivos **en español**, igual que el código existente.
- Comentarios en español **sin tildes** (así está todo el código); los textos visibles al usuario **sí llevan tildes**.
- Construir DOM con `el(tag, props, hijos)` de `ui.js`. Acepta `false`/`null` en hijos para condicionales y también `el(tag, hijos)`.
- Toda vista nueva: `export async function montar(cont, params)` que empieza con `limpiar(cont)`; si deja timers o listeners, exportar `desmontar()`.
- Agregar rutas en `parseHash()` de `app.js`. Los render están serializados (`cadenaRender`): no llamar `montar` en paralelo.
- Números que escribe el usuario: siempre con `aNumero()` (acepta coma decimal del teclado iOS). Para mostrar, `fmtNum()`.
- Interpretación de `rutina.json`, siempre vía helpers de `rutina.js`:
  - `series: null` → ejercicio por tiempo (`esPorTiempo`): sin registro de series.
  - `descansoSegundos: null` → 90 s (`descansoSegundos`).
  - `repeticiones` es texto libre ("6-8", "8 por pierna", "30-45 s"): usar `textoRango`, `rangoCorto`, `unidadReps`, `esRangoPuro`.
  - `imagenInicial`/`imagenFinal` vacíos → no renderizar nada; si existen, `img/<archivo>` con `onerror` que quita la imagen.
  - `videoUrl` solo como enlace secundario discreto.

### Datos (IndexedDB)
- No cambiar `keyPath` ni índices sin subir `DB_VERSION` y escribir la migración en `onupgradeneeded`.
- El id de `series` es `${sesionId}::${ejercicioId}::${numeroSerie}` para que `put()` corrija en vez de duplicar. Mantenerlo.
- Una sola sesión abierta a la vez (`asegurarSesion` devuelve `{ conflicto }` si hay otra).
- Si cambia la forma de los datos, mantener compatible el formato de exportación (`formato: 'gymgym-historial'`, `version`).

### Service worker (fácil de olvidar)
- **Cualquier cambio en archivos de la app → subir `CACHE` en `sw.js`** (`gymgym-v2` → `gymgym-v3`). Sin esto, el iPhone sigue con la versión vieja.
- **Archivo nuevo de la app → agregarlo a `ASSETS`** en `sw.js`, o no funcionará offline.

### Diseño (skill `frontend-design` aplicada)
- Tokens en `:root` de `styles.css`: caucho `#1c1b19`, goma `#2a2926`, línea `#3b3935`, tiza `#eeece7`, polvo `#a39f97`, azul disco 20 kg `#5a93f2` (descanso, en curso, hoy), verde disco 10 kg `#63b86a` (completo). No agregar colores fuera de los tokens.
- Tipos: `--f-display` (DIN Condensed → Bahnschrift) para cifras y nombres; `--f-texto` (Avenir Next → Segoe UI) para texto. Solo fuentes del sistema.
- Botones ≥ 60px de alto (principal 72px). Discos −/+ redondos de 64px.
- Listas con reglas, no tarjetas. Etiquetas en minúscula normal: **sin MAYÚSCULAS espaciadas, sin "·" como separador, sin "›" o "→" al final de botones**.
- Descanso en la zona del pulgar; avisos (`toast`) arriba.
- Respetar `prefers-reduced-motion` y `:focus-visible`.
- Si `.descanso` u otro bloque usa `display`, recordar que `[hidden]` se fuerza con `!important`.

### Textos de interfaz
- Español con **tú** (no voseo), frases cortas, sentence case.
- El botón y su confirmación usan la misma palabra: "Guardar serie 2" → "Serie 2 guardada"; "Corregir" → "corregida".
- Plurales con `plural()`. Errores concretos y sin disculpas; pantallas vacías que ofrecen una acción.

### Limitaciones conocidas de iOS
- `navigator.vibrate` no funciona en Safari iOS: no prometer vibración en iPhone.
- El audio solo se habilita tras el primer toque (`desbloquearAudio`).
- Con la app en segundo plano no suena el fin del descanso.

## Git

- Rama `main`; push a `main` = deploy a Pages.
- Identidad configurada solo en este repo (no global).
- Commit solo cuando el usuario lo pida.
- En PowerShell 5.1, los mensajes con comillas se rompen: escribir el mensaje en un archivo y usar `git commit -F`.
- Los avisos `LF will be replaced by CRLF` son inofensivos.

## Pendiente (fase 2)

Resumen de sesión al cerrar el día · botón importar (`importarTodo` ya existe en `db.js`) · pantalla de consideraciones/progresión (sin publicar datos médicos) · imágenes en `img/` · cuenta atrás para ejercicios por tiempo.
