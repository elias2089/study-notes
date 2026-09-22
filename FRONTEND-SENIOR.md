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

  - **Teoría**: el navegador no puede pintar nada hasta tener **DOM +
    CSSOM** combinados en un Render Tree. Un `<script>` sin `async`/`defer`
    en el `<head>` **bloquea** el parseo del HTML hasta que se descarga y
    ejecuta (por eso tradicionalmente se ponían al final del `<body>`, y
    hoy se usa `defer`). Un elemento con `display: none` no entra al Render
    Tree en absoluto (no ocupa espacio ni se pinta); uno con `visibility:
    hidden` sí entra (ocupa su espacio en el layout) pero no se pinta.
  - **Ejemplo**:
    ```html
    <head>
      <!-- Bloquea el parseo del HTML hasta descargar y ejecutar este script -->
      <script src="/analytics.js"></script>

      <!-- No bloquea: se descarga en paralelo, se ejecuta cuando el HTML
           termina de parsear, en el orden en que aparecen en el documento -->
      <script src="/analytics.js" defer></script>
    </head>
    ```
    ```css
    /* No entra al Render Tree: no ocupa espacio, no se pinta */
    .modal-cerrado { display: none; }

    /* Sí entra al Render Tree: ocupa su espacio en el layout,
       pero es invisible (útil para animaciones de fade) */
    .tooltip-oculto { visibility: hidden; }
    ```

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
  - **Ejemplo**:
    ```js
    const precios = [10, 20, 30];

    // Malo: muta el array original (problemático si "precios" es estado de React)
    precios.push(40);

    // Bueno: crea arrays nuevos, nunca toca el original
    const conDescuento = precios.map((p) => p * 0.9);
    const caros = precios.filter((p) => p > 15);
    const total = precios.reduce((acumulado, p) => acumulado + p, 0); // 60
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

  - **Teoría**: el *scope* (ámbito) determina qué variables son visibles
    desde un punto del código. JavaScript usa *lexical scoping*: el ámbito
    de una función se decide por **dónde se escribió** en el código, no por
    dónde se llama. Un **closure** es lo que ocurre cuando una función
    "recuerda" las variables de su ámbito exterior incluso después de que
    esa función exterior ya terminó de ejecutarse. No es magia: el motor de
    JS mantiene viva esa variable en memoria mientras exista una función
    que todavía pueda leerla. Esto es la base de patrones como contadores
    privados, memoización, y también la causa más común de *memory leaks*
    si no se tiene cuidado (ver el punto de memoria más abajo).
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
    sobre ese scope; (3) aunque `crearContador()` ya devolvió y su
    ejecución terminó, `cuenta` sigue viva en memoria porque `incrementar`
    todavía la referencia; (4) cada llamada a `crearContador()` crea un
    scope nuevo, por eso `contador1` y `contador2` no comparten `cuenta`.

- Prototypes y herencia prototípica

  - **Teoría**: a diferencia de lenguajes con clases "de verdad" (Java,
    C#), JavaScript resuelve la herencia mediante una **cadena de
    prototipos**: cada objeto tiene una referencia interna (`[[Prototype]]`,
    accesible con `Object.getPrototypeOf()`) a otro objeto, y cuando
    accedes a una propiedad que el objeto no tiene, el motor la busca en su
    prototipo, y en el prototipo de ese prototipo, hasta llegar a `null`.
    La sintaxis `class` que se usa hoy es **azúcar sintáctico**: por debajo
    sigue siendo prototipos — `class Foo {}` crea una función constructora
    y define sus métodos en `Foo.prototype`, ni más ni menos.
  - **Ejemplo paso a paso**:
    ```ts
    function Animal(nombre) {
      this.nombre = nombre;
    }
    Animal.prototype.saludar = function () {
      return `Hola, soy ${this.nombre}`;
    };

    const perro = new Animal('Rex');
    perro.saludar(); // "Hola, soy Rex"
    ```
    Paso a paso al llamar `perro.saludar()`: (1) el motor busca `saludar`
    directamente en `perro` — no está; (2) sube a `Object.getPrototypeOf(perro)`,
    que es `Animal.prototype` — ahí sí encuentra `saludar`; (3) lo ejecuta
    con `this` apuntando a `perro`. Esto es exactamente lo mismo que hace
    `class Animal { constructor(nombre) { this.nombre = nombre; } saludar() { ... } }`
    — la clase es una forma más legible de escribir lo mismo.

- Contexto de ejecución y `this`

  - **Teoría**: `this` no se determina por dónde se *escribió* una función
    (como el scope léxico), sino por **cómo se llama**. Las cuatro reglas,
    de menor a mayor prioridad: (1) llamada simple `fn()` → `this` es
    `undefined` en modo estricto (o el objeto global si no); (2) método de
    un objeto `obj.fn()` → `this` es `obj`; (3) `fn.call(ctx)` /
    `fn.apply(ctx)` → `this` es `ctx` explícito; (4) `new Fn()` → `this` es
    el objeto recién creado. Las **arrow functions** son la excepción: no
    tienen su propio `this`, heredan el del scope léxico donde se
    definieron — por eso son la solución habitual al típico bug de "perder
    el `this`" dentro de un callback.
  - **Ejemplo paso a paso**:
    ```ts
    class Boton {
      etiqueta = 'Guardar';

      // function normal: pierde el `this` al pasarla como callback
      onClickRoto = function () {
        console.log(this.etiqueta); // undefined — `this` ya no es la instancia
      };

      // arrow function: hereda el `this` léxico de la clase
      onClickCorrecto = () => {
        console.log(this.etiqueta); // "Guardar" — siempre
      };
    }

    const boton = new Boton();
    const handler = boton.onClickCorrecto;
    handler(); // sigue funcionando aunque se llame "suelta", sin boton.
    ```

- El Event Loop: call stack, microtasks y macrotasks

  - **Teoría**: JavaScript es de un solo hilo (*single-threaded*): solo
    puede ejecutar una cosa a la vez en el **call stack**. Para no
    bloquearse esperando cosas lentas (temporizadores, peticiones de red),
    el navegador delega ese trabajo fuera del motor de JS y, cuando
    termina, encola una función de vuelta para ejecutarse. El **event
    loop** es el mecanismo que decide el orden: primero vacía por completo
    el call stack, luego procesa **todas** las microtasks pendientes
    (promesas resueltas, `queueMicrotask`), y recién después toma **una**
    macrotask de la cola (`setTimeout`, eventos de I/O) antes de repetir el
    ciclo. Por eso una promesa siempre se resuelve antes que un
    `setTimeout(fn, 0)`, aunque ambos se hayan "programado" en el mismo
    instante.
  - **Ejemplo paso a paso**:
    ```ts
    console.log('1: síncrono');

    setTimeout(() => console.log('2: macrotask (setTimeout)'), 0);

    Promise.resolve().then(() => console.log('3: microtask (promise)'));

    console.log('4: síncrono');

    // Orden real de salida: 1, 4, 3, 2
    ```
    Paso a paso: (1) el código síncrono corre primero y por completo — se
    imprime `1` y `4`; (2) el call stack queda vacío; (3) el event loop
    procesa **todas** las microtasks pendientes antes de continuar — se
    imprime `3`; (4) recién ahí toma la macrotask del `setTimeout` — se
    imprime `2`. Esta prioridad de microtasks es también la razón por la
    que una cadena larga de `.then()` puede "hambrear" el renderizado del
    navegador si nunca le cede el turno a una macrotask.

- Memory management y memory leaks

  - **Teoría**: JavaScript tiene *garbage collection* automático — el
    motor libera memoria de objetos que ya no son alcanzables desde
    ninguna raíz activa (variables globales, el call stack, closures
    vivos), usando principalmente el algoritmo *mark-and-sweep* (marca
    todo lo alcanzable, libera lo que no lo es). Un **memory leak** en JS
    no es "olvidar liberar memoria" como en C — es mantener accidentalmente
    una referencia a algo que ya no necesitas, lo que impide que el
    garbage collector lo libere. Las tres causas más comunes en frontend:
    listeners de eventos nunca removidos, `setInterval`/`setTimeout` nunca
    limpiados, y closures que retienen referencias a nodos del DOM ya
    eliminados.
  - **Ejemplo**:
    ```tsx
    // Malo: el listener queda vivo para siempre, incluso si el componente
    // se desmonta — cada montaje/desmontaje añade uno más (leak acumulativo)
    useEffect(() => {
      window.addEventListener('resize', handleResize);
    }, []);

    // Bueno: se limpia al desmontar el componente
    useEffect(() => {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);
    ```
    Para detectar leaks reales: Chrome DevTools → pestaña **Memory** → tomar
    dos "heap snapshots" (antes y después de montar/desmontar el mismo
    componente varias veces) y comparar — si la memoria crece de forma
    sostenida sin bajar nunca, hay un leak.

- Promises, async/await y generators

  - **Teoría**: los callbacks anidados ("callback hell") se reemplazaron
    por **Promises** (un objeto que representa un valor que existirá en el
    futuro, con tres estados: *pending*, *fulfilled*, *rejected*).
    `async/await` es azúcar sintáctico sobre Promises: hace que código
    asíncrono se **lea** como si fuera síncrono, pero por debajo sigue
    siendo asíncrono y no bloqueante — cada `await` en realidad pausa la
    función y la reanuda como una microtask cuando la promesa se resuelve.
    Los **generators** (`function*`, `yield`) son el mecanismo de más bajo
    nivel que hace esto posible: una función que puede "pausarse" y
    "reanudarse" a voluntad; `async/await` es, conceptualmente, un
    generator que se auto-reanuda cada vez que la promesa que arrojó con
    `yield` se resuelve.
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
    ```
    Paso a paso en la versión `async/await`: (1) se llama `fetch(...)`, que
    devuelve una Promise inmediatamente; (2) `await` pausa *solo esta
    función* (no bloquea el hilo — otras tareas siguen corriendo) hasta que
    esa Promise se resuelve; (3) cuando se resuelve, la continuación de la
    función se reanuda como una **microtask** (por eso conecta
    directamente con el punto del event loop de arriba).

- Módulos: ESM vs CommonJS

  - **Teoría**: **CommonJS** (`require`/`module.exports`) es el sistema de
    módulos original de Node.js: la resolución es **síncrona** y dinámica
    (puedes hacer `require(variable)` en tiempo de ejecución). **ESM**
    (*ECMAScript Modules*, `import`/`export`) es el estándar oficial del
    lenguaje: la resolución es **estática** (los `import` se analizan antes
    de ejecutar el código, no se pueden condicionar con lógica), lo que
    permite algo que CommonJS no puede hacer bien: **tree-shaking** — el
    bundler sabe exactamente qué exports se usan y puede eliminar del
    bundle final el código que nunca se importa.
  - **Ejemplo**:
    ```js
    // CommonJS: dinámico, resuelto en runtime
    const { calcularDescuento } = require('./utils');
    module.exports = { procesarPedido };

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

  - **Teoría**: ambos describen la forma de un objeto y en la mayoría de
    casos son intercambiables. Las diferencias prácticas: una `interface`
    se puede **extender** con `extends` y admite *declaration merging*
    (declarar la misma interface dos veces combina sus propiedades — útil
    para tipar librerías de terceros); un `type` puede describir uniones,
    intersecciones, tuplas y tipos primitivos con alias, cosas que una
    `interface` no puede. Regla práctica: usa `interface` para formas de
    objetos/props que pueden necesitar extenderse; usa `type` para
    uniones, intersecciones o cuando necesitas alias de cualquier otra
    cosa.
  - **Ejemplo**:
    ```ts
    interface Usuario {
      nombre: string;
    }
    interface UsuarioAdmin extends Usuario {
      permisos: string[];
    }

    // type puede describir una unión: interface no puede hacer esto
    type Estado = 'cargando' | 'listo' | 'error';

    // type con intersección (equivalente a extends en este caso)
    type UsuarioAdmin2 = Usuario & { permisos: string[] };
    ```

- `any` vs `unknown` vs `never`

  - **Teoría**: son tres extremos distintos. `any` **desactiva** el chequeo
    de tipos por completo (puedes hacer cualquier cosa con esa variable
    sin que TypeScript se queje — es literalmente el escape hatch, úsalo
    lo menos posible). `unknown` es el opuesto seguro: acepta cualquier
    valor, pero **te obliga a verificar el tipo** antes de operar con él
    (no puedes llamar métodos ni acceder propiedades directamente). `never`
    representa un valor que **nunca ocurre** — una función que siempre
    lanza una excepción retorna `never`, y también aparece cuando
    TypeScript detecta que un `switch` cubrió todos los casos posibles
    (ver *exhaustiveness checking* más abajo).
  - **Ejemplo**:
    ```ts
    function procesar(valor: any) {
      valor.metodoQueNoExiste(); // compila sin error -- any lo permite todo, es peligroso
    }

    function procesarSeguro(valor: unknown) {
      valor.metodoQueNoExiste(); // Error de compilación: hay que verificar el tipo primero
      if (typeof valor === 'string') {
        valor.toUpperCase(); // válido: ya se verificó que es string
      }
    }

    function lanzarError(): never {
      throw new Error('esto siempre falla');
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

  - **Teoría**: TypeScript incluye `enum` como construcción propia del
    lenguaje, pero hoy muchos equipos prefieren **uniones de literales de
    string** para el mismo propósito: son más simples, no generan código
    JS extra en el bundle (un `enum` numérico sí compila a un objeto
    real), y funcionan mejor con serialización JSON (un enum numérico
    pierde legibilidad al serializarse como número).
  - **Ejemplo**:
    ```ts
    // Con enum: genera un objeto JS real en el output compilado
    enum Estado {
      Cargando,
      Listo,
      Error,
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

  - **Teoría**: un *conditional type* aplica lógica condicional a nivel de
    tipos: `T extends U ? X : Y` — "si T es asignable a U, el tipo
    resultante es X, si no, es Y". `infer` se usa **dentro** de un
    conditional type para "capturar" y nombrar una parte del tipo que
    estás inspeccionando, para poder reutilizarla en el resultado. Es la
    base de utility types como `ReturnType<T>` (extrae el tipo de retorno
    de una función).
  - **Ejemplo paso a paso**:
    ```ts
    // Conditional type simple
    type EsString<T> = T extends string ? true : false;
    type A = EsString<'hola'>; // true
    type B = EsString<42>; // false

    // Reimplementando ReturnType con infer
    type MiReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

    function obtenerUsuario() {
      return { nombre: 'Ana', edad: 30 };
    }
    type Usuario = MiReturnType<typeof obtenerUsuario>;
    // Usuario = { nombre: string; edad: number }
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

  - **Teoría**: JSX (la sintaxis parecida a HTML dentro de JS) no es algo
    que el navegador entienda de forma nativa — es **azúcar sintáctico**
    que un compilador (Babel, o el propio compilador de Vite/Next.js)
    transforma en llamadas normales a `React.createElement()`. Cada
    elemento JSX se convierte en un objeto plano (un "elemento de React")
    que describe qué renderizar, no en un nodo del DOM real todavía.
    Entender esto ayuda a explicar por qué JSX puede usar expresiones de
    JS entre llaves `{}`, pero no declaraciones (`if`, `for`) directamente
    — porque por debajo son argumentos de una llamada a función.
  - **Ejemplo**:
    ```tsx
    // Esto...
    const elemento = <h1 className="titulo">Hola {nombre}</h1>;

    // ...se compila aproximadamente a esto:
    const elemento = React.createElement(
      'h1',
      { className: 'titulo' },
      'Hola ',
      nombre,
    );
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

  - **Teoría**: un input **controlado** tiene su valor manejado por React
    (`value` + `onChange`) — React es la única fuente de verdad. Uno **no
    controlado** deja que el DOM maneje su propio valor internamente, y
    React solo lo lee cuando lo necesita (vía `ref`). Los controlados dan
    más control (validar en cada tecla, formatear el valor) a costa de un
    re-render por cada cambio; los no controlados son más simples y
    performantes para formularios grandes donde no necesitas reaccionar a
    cada tecla.
  - **Ejemplo**:
    ```tsx
    // Controlado: React es dueño del valor
    function InputControlado() {
      const [valor, setValor] = useState('');
      return <input value={valor} onChange={(e) => setValor(e.target.value)} />;
    }

    // No controlado: el DOM es dueño del valor, React solo lo consulta al enviar
    function InputNoControlado() {
      const ref = useRef<HTMLInputElement>(null);
      const enviar = () => console.log(ref.current?.value);
      return <input ref={ref} defaultValue="" />;
    }
    ```

- `key` en listas

  - **Teoría**: React usa la prop `key` para identificar de forma estable
    qué elemento de una lista es cuál entre un render y el siguiente, y
    así decidir si reutiliza el nodo del DOM existente o crea uno nuevo.
    Usar el índice del array como `key` es un antipatrón común: si la
    lista se reordena, se inserta o se elimina un elemento del medio, los
    índices "se corren" y React puede asociar el estado interno del
    componente equivocado con el elemento equivocado (bugs sutiles de UI
    que "recuerdan" el estado del elemento anterior).
  - **Ejemplo**:
    ```tsx
    // Malo: si se elimina el primer elemento, todos los índices cambian
    {tareas.map((tarea, i) => (
      <TareaItem key={i} tarea={tarea} />
    ))}

    // Bueno: un id estable identifica siempre al mismo elemento, sin importar el orden
    {tareas.map((tarea) => (
      <TareaItem key={tarea.id} tarea={tarea} />
    ))}
    ```

- `useEffect`: dependencias, cleanup y timing

  - **Teoría**: `useEffect` sincroniza un componente con un sistema
    externo (una suscripción, una petición, el DOM directamente). Se
    ejecuta **después** de que el navegador pintó la pantalla, no durante
    el render. El array de dependencias le dice a React "vuelve a
    ejecutar este efecto solo si alguno de estos valores cambió"; omitirlo
    ejecuta el efecto en cada render, y un array vacío `[]` lo ejecuta
    solo una vez (al montar). La función que retorna el efecto es el
    **cleanup**: corre antes de la siguiente ejecución del efecto y al
    desmontar el componente — es donde se cancelan suscripciones,
    listeners o timers (conecta directamente con los *memory leaks* vistos
    en la sección 2).
  - **Ejemplo**:
    ```tsx
    useEffect(() => {
      const id = setInterval(() => setSegundos((s) => s + 1), 1000);
      return () => clearInterval(id); // cleanup: evita timers acumulados
    }, []); // [] -- se ejecuta una sola vez, al montar
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

  - **Teoría**: React favorece **composición sobre herencia** — en vez de
    crear jerarquías de componentes que extienden a otros, se combinan
    componentes pequeños pasándolos como `children` o como props. Cuando
    dos componentes hermanos necesitan compartir o sincronizar un mismo
    dato, la solución no es que uno le pase el dato al otro directamente
    (no son padre-hijo) — se "levanta" el estado al ancestro común más
    cercano, que pasa el valor y el setter hacia abajo como props.
  - **Ejemplo**:
    ```tsx
    // Los hermanos "FiltroInput" y "ListaProductos" no se comunican entre sí:
    // el estado vive en el padre común, "PaginaProductos"
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

  - **Teoría**: cuando el estado cambia, React no vuelve a crear todo el
    DOM real desde cero — construye un nuevo árbol de elementos (el
    resultado de volver a llamar a la función del componente) y lo
    **compara** (*diffing*) contra el árbol anterior para calcular el
    mínimo conjunto de cambios necesarios en el DOM real. Este proceso se
    llama **reconciliación**, y **Fiber** es la arquitectura interna
    (desde React 16) que lo implementa de forma que se pueda pausar,
    priorizar y reanudar trabajo — es lo que hace posible el modo
    concurrente y las Transitions (ya vistas en `REACT19.md`): React puede
    "pausar" un render de baja prioridad si llega una interacción urgente
    del usuario.
  - **Ejemplo (regla práctica que se deriva de esto)**: React asume que
    componentes del mismo tipo en la misma posición del árbol son "el
    mismo" entre renders (por eso reutiliza su estado interno), y que
    componentes de distinto tipo son completamente diferentes (destruye el
    viejo y crea uno nuevo desde cero, perdiendo su estado interno):
    ```tsx
    // Si "mostrarEditor" cambia, React destruye el <InputSimple> anterior
    // y crea un <TextAreaAvanzado> nuevo -- son tipos distintos, sin relación
    {mostrarEditor ? <TextAreaAvanzado /> : <InputSimple />}
    ```

- Server Components vs Client Components

  - **Teoría**: los **Server Components** (RSC) se ejecutan **solo en el
    servidor**, nunca viajan al navegador como JS — pueden acceder
    directamente a una base de datos o al sistema de archivos, y su
    output es HTML/una descripción serializada, reduciendo el bundle de
    JS que el cliente debe descargar. Los **Client Components** (marcados
    con la directiva `'use client'` en frameworks como Next.js) son los
    componentes React "de siempre": corren en el navegador, pueden usar
    `useState`, `useEffect`, manejar eventos. La regla mental: por defecto
    todo es Server Component; solo marcas `'use client'` en el límite
    exacto donde empieza la interactividad.
  - **Ejemplo**:
    ```tsx
    // ProductPage.tsx -- Server Component (sin 'use client'): corre solo en servidor
    async function ProductPage({ id }: { id: string }) {
      const producto = await db.productos.findById(id); // acceso directo a datos, sin API intermedia
      return (
        <div>
          <h1>{producto.nombre}</h1>
          <BotonAgregarCarrito productoId={producto.id} /> {/* este sí es interactivo */}
        </div>
      );
    }

    // BotonAgregarCarrito.tsx -- Client Component: necesita estado y eventos
    'use client';
    function BotonAgregarCarrito({ productoId }: { productoId: string }) {
      const [agregado, setAgregado] = useState(false);
      return <button onClick={() => setAgregado(true)}>{agregado ? 'Agregado ✓' : 'Agregar'}</button>;
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

  - **Teoría**: los **compound components** son un grupo de componentes
    que comparten estado implícito entre sí a través de Context, dando una
    API declarativa donde el usuario del componente no necesita conocer el
    estado interno (`<Tabs><Tabs.List><Tabs.Tab /></Tabs.List></Tabs>`,
    similar a `<select><option>`). Los **custom hooks** son la forma
    moderna de extraer y reutilizar *lógica con estado* entre componentes
    (reemplazan en gran parte a los antiguos *Higher-Order Components* y
    *render props*, que resolvían el mismo problema con más código
    ceremonial).
  - **Ejemplo**:
    ```tsx
    // Custom hook: extrae lógica reutilizable (suscripción a resize) de la UI
    function useWindowWidth() {
      const [width, setWidth] = useState(window.innerWidth);
      useEffect(() => {
        const handler = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
      }, []);
      return width;
    }

    // Cualquier componente puede reutilizar la lógica sin repetirla:
    function Header() {
      const width = useWindowWidth();
      return <h1>{width < 768 ? 'Menú móvil' : 'Menú completo'}</h1>;
    }
    ```

- Performance: `React.memo`, `useMemo` y `useCallback`

  - **Teoría**: por defecto, cuando un componente padre re-renderiza,
    **todos** sus hijos vuelven a renderizar también, aunque sus props no
    hayan cambiado. `React.memo` evita eso: memoiza el componente y solo
    lo vuelve a renderizar si sus props cambiaron (comparación superficial).
    `useMemo` memoiza el **resultado** de un cálculo costoso entre renders;
    `useCallback` memoiza la **referencia** de una función (importante
    porque en JS dos funciones con el mismo código son objetos distintos
    en cada render, lo que rompería la comparación superficial de
    `React.memo` si se la pasas como prop). Esta optimización tiene costo
    propio (memoria, comparación) — no se aplica "por si acaso" en todos
    lados, solo donde un profiling real muestra un re-render costoso.
  - **Ejemplo**:
    ```tsx
    const ListaCara = React.memo(function ListaCara({ items, onSelect }) {
      // solo re-renderiza si "items" u "onSelect" cambian de referencia
      return items.map((i) => <Item key={i.id} item={i} onClick={onSelect} />);
    });

    function Padre() {
      const [contador, setContador] = useState(0);
      const items = useMemo(() => calcularItemsCostosos(), []); // no se recalcula en cada render
      const onSelect = useCallback((id) => console.log(id), []); // misma referencia siempre

      return (
        <>
          <button onClick={() => setContador(contador + 1)}>{contador}</button>
          <ListaCara items={items} onSelect={onSelect} />
        </>
      );
    }
    ```
    Sin `useCallback` en `onSelect`, cada vez que `Padre` re-renderiza (al
    hacer clic en el botón) se crearía una función nueva, `React.memo` la
    vería como "prop distinta" y `ListaCara` re-renderizaría igual,
    anulando la optimización.

- Testing de componentes: probar comportamiento, no implementación

  - **Teoría**: la filosofía de Testing Library (la librería estándar hoy
    para testear componentes React) es probar la app **como la usaría una
    persona real**: buscar elementos por texto visible o rol accesible, y
    simular clics/tecleo reales, en vez de acceder a detalles internos de
    implementación (estado interno, nombres de métodos). Esto hace que los
    tests sobrevivan a refactors internos (cambiar de `useState` a
    `useReducer` no debería romper un test que solo verifica lo que el
    usuario ve).
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

  - **Teoría**: REST (*REpresentational State Transfer* — ver Glosario) no
    es un estándar rígido, es un estilo: modela el dominio como
    **recursos** (sustantivos, `/products`, `/orders/42`) y usa los verbos
    HTTP (ya vistos en la sección 1) para las operaciones sobre ellos
    (**CRUD** — *Create, Read, Update, Delete* — ver Glosario), en vez de
    codificar la acción en la URL (`/getProduct?id=42`). Desde el lado del
    consumidor (el frontend) esto importa porque una API bien diseñada es
    predecible: si sabes que `GET /products/42` trae un producto, ya
    intuyes que `DELETE /products/42` lo elimina, sin tener que leer
    documentación para cada endpoint nuevo.
  - **Ejemplo**:
    ```
    GET    /products          -- lista de productos
    GET    /products/42       -- un producto específico
    POST   /products          -- crea un producto nuevo
    PUT    /products/42       -- reemplaza el producto 42 completo
    PATCH  /products/42       -- actualiza parcialmente el producto 42
    DELETE /products/42       -- elimina el producto 42
    ```
    Un anti-patrón común visto desde el consumidor: una API que expone
    `POST /products/42/delete` en vez de `DELETE /products/42` — funciona,
    pero rompe la convención que el resto del ecosistema (herramientas,
    librerías HTTP, caché) da por sentada.

- Fetch API vs XMLHttpRequest, y por qué `fetch` no rechaza en 4xx/5xx

  - **Teoría**: **XHR** (*XMLHttpRequest* — ver Glosario) es la API
    original del navegador para peticiones asíncronas, basada en eventos
    (`onload`, `onerror`) y con una sintaxis verbosa. `fetch` es la API
    moderna, basada en Promises. La trampa que sorprende a quien recién
    empieza: la Promise que devuelve `fetch` **solo se rechaza por errores
    de red** (sin conexión, DNS que falla, CORS bloqueado) — un `404` o un
    `500` son respuestas HTTP **válidas** desde la perspectiva del
    protocolo, así que `fetch` las resuelve normalmente. Hay que revisar
    `response.ok` (o `response.status`) explícitamente para saber si la
    petición "tuvo éxito" en términos de la aplicación.
  - **Ejemplo**:
    ```ts
    async function obtenerProducto(id: string) {
      const response = await fetch(`/api/products/${id}`);

      // BUG común: asumir que si no lanzó, todo salió bien
      // const data = await response.json(); // explotaría feo en un 404

      if (!response.ok) {
        // response.ok es false para cualquier status fuera del rango 200-299
        throw new Error(`Error ${response.status}: no se pudo obtener el producto`);
      }
      return response.json();
    }
    ```

- Serialización JSON y `Content-Type`

  - **Teoría**: HTTP transporta bytes, no objetos de JS — hay que
    serializar el cuerpo de la petición (normalmente a **JSON**, ya visto
    en la sección 3) y declarar explícitamente qué formato es con el header
    `Content-Type`. Si lo omites o lo pones mal, el servidor puede
    interpretar el body como texto plano en vez de JSON y fallar el
    parseo, incluso si el JSON en sí es válido.
  - **Ejemplo**:
    ```ts
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // sin esto, muchos backends ignoran el body
      body: JSON.stringify({ productId: 42, quantity: 2 }),
    });
    ```

- Query params vs path params vs body

  - **Teoría**: cada uno comunica una intención distinta. Los **path
    params** identifican un recurso específico dentro de la jerarquía de
    la URL (`/products/42` — el `42` no tiene sentido sin la ruta). Los
    **query params** filtran, ordenan o paginan una colección, son
    opcionales por naturaleza (`/products?category=zapatos&sort=price`).
    El **body** transporta datos estructurados que no caben legibles en
    una URL (un formulario completo, un array de items) y es obligatorio
    para `POST`/`PUT`/`PATCH` con payloads no triviales — los navegadores y
    proxies además imponen límites de longitud a las URLs, así que datos
    grandes nunca deberían ir en query params.
  - **Ejemplo**:
    ```
    GET /products/42?include=reviews&currency=USD
    -- "42"                -> path param: identifica el recurso
    -- "include", "currency" -> query params: modifican la respuesta, opcionales

    POST /orders
    { "items": [...], "shippingAddress": {...} }
    -- body: estructura completa, no cabría legible en una URL
    ```

- Paginación: offset-based vs cursor-based

  - **Teoría**: la paginación por **offset** (`?page=3&limit=20`) es simple
    de implementar y permite saltar a cualquier página directamente, pero
    tiene un problema real con datos que cambian: si se inserta un
    elemento nuevo mientras el usuario pagina, los resultados se
    "corren" y puede ver un elemento duplicado o saltarse uno. La
    paginación por **cursor** (`?after=eyJpZCI6NDJ9`) usa un puntero
    opaco al último elemento visto en vez de una posición numérica, es
    estable frente a inserciones/eliminaciones concurrentes, y escala
    mejor en bases de datos grandes (un `OFFSET` alto obliga a la base de
    datos a recorrer y descartar todas las filas anteriores). El costo:
    no puedes saltar directamente a "la página 8", solo avanzar
    secuencialmente.
  - **Ejemplo**:
    ```ts
    // Offset-based: simple, pero inestable si la lista cambia mientras se pagina
    fetch('/api/products?page=3&limit=20');

    // Cursor-based: estable, típico en feeds infinitos (redes sociales, timelines)
    fetch('/api/products?after=eyJpZCI6NDJ9&limit=20').then((res) => res.json());
    // La respuesta trae el siguiente cursor a usar:
    // { data: [...], nextCursor: "eyJpZCI6NjJ9" }
    ```

### En profundidad

- GraphQL: qué problema resuelve y su propio problema (N+1)

  - **Teoría**: en REST, cada endpoint devuelve una forma fija de datos —
    si necesitas menos campos de los que trae, hay **over-fetching**
    (descargas datos que no usas); si necesitas combinar varios endpoints
    para armar una pantalla, hay **under-fetching** (múltiples round-trips
    para una sola vista). GraphQL resuelve ambos con un único endpoint
    donde el **cliente declara exactamente qué campos necesita** en una
    **query**, y las escrituras se hacen con **mutations**. El costo que
    introduce: el problema **N+1** — si resolver una lista de N elementos
    dispara una consulta a la base de datos por cada uno (en vez de una
    sola consulta por lote), una query aparentemente simple puede generar
    cientos de queries a la base de datos en el backend. Mitigarlo
    (con *DataLoader* y batching) es responsabilidad del backend, pero un
    frontend senior debe reconocer el síntoma al ver latencias altas en
    queries anidadas.
  - **Ejemplo**:
    ```graphql
    # El cliente pide exactamente estos campos, ni uno más: sin over-fetching
    query ObtenerPedido($id: ID!) {
      order(id: $id) {
        id
        total
        customer {
          name # sin GraphQL, esto exigiría un segundo request a /customers/:id
        }
      }
    }

    mutation CrearPedido($input: OrderInput!) {
      createOrder(input: $input) {
        id
      }
    }
    ```
    Si `order` trae 50 líneas de pedido y cada una resuelve su producto
    con una consulta individual a la base de datos, son 51 consultas para
    una sola query — el clásico N+1 visible en el tiempo de respuesta.

- Diseño de contrato API desde el consumidor: tipos compartidos y generación de tipos

  - **Teoría**: cuando el frontend define manualmente los tipos de la
    respuesta de una API (`interface Product { ... }`) sin ninguna
    garantía de que coincidan con lo que el backend realmente envía, el
    contrato puede desincronizarse en silencio — TypeScript valida contra
    un tipo que ya no refleja la realidad, dando falsa seguridad. Dos
    soluciones consolidadas: generar los tipos del cliente automáticamente
    a partir de un **OpenAPI** (especificación estándar de una API REST)
    con herramientas como `openapi-typescript`; o usar **tRPC**, que
    comparte directamente los tipos de TypeScript del backend con el
    frontend en un monorepo, sin generación de código ni esquema
    intermedio — el tipo de retorno de un procedimiento del servidor es,
    literalmente, el mismo tipo que ve el cliente.
  - **Ejemplo**:
    ```bash
    # A partir de un openapi.yaml, genera tipos TS reales para el cliente
    npx openapi-typescript ./openapi.yaml -o ./src/api-types.ts
    ```
    ```ts
    // Con tRPC: el tipo de "getProduct" viaja del backend al frontend sin generación
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

  - **Teoría**: una petición de red puede fallar de formas que no son "el
    servidor rechazó la petición": puede quedarse colgada indefinidamente,
    fallar por una caída momentánea de red, o volverse innecesaria porque
    el usuario navegó a otra pantalla. Un frontend senior maneja los tres
    casos: **timeout** (aborta si tarda demasiado, en vez de dejar al
    usuario esperando para siempre), **retry con backoff exponencial**
    (reintenta solo errores transitorios — `5xx`, timeouts, nunca un `4xx`,
    que es un error del propio cliente que no se arregla repitiendo — con
    una espera creciente entre intentos para no saturar un servidor ya
    sobrecargado), y **cancelación** con `AbortController` (si el usuario
    cambia de búsqueda antes de que responda la anterior, cancelarla evita
    una condición de carrera donde la respuesta vieja "gana" y sobrescribe
    la más reciente).
  - **Ejemplo paso a paso**:
    ```ts
    async function fetchConTimeoutYRetry(url: string, intentos = 3): Promise<Response> {
      for (let intento = 0; intento < intentos; intento++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // timeout de 5s

        try {
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.status >= 500 && intento < intentos - 1) {
            // Error del servidor: reintentable. Backoff exponencial: 500ms, 1000ms, 2000ms...
            await new Promise((r) => setTimeout(r, 500 * 2 ** intento));
            continue;
          }
          return res; // éxito, o un 4xx que no tiene sentido reintentar
        } catch (err) {
          clearTimeout(timeoutId);
          if (intento === intentos - 1) throw err; // se acabaron los intentos
        }
      }
      throw new Error('No se pudo completar la petición');
    }

    // Cancelación al escribir en un buscador: cada tecleo cancela la búsqueda anterior
    let controladorActual: AbortController | null = null;
    async function buscar(texto: string) {
      controladorActual?.abort(); // cancela la petición en vuelo, si había una
      controladorActual = new AbortController();
      const res = await fetch(`/api/search?q=${texto}`, { signal: controladorActual.signal });
      return res.json();
    }
    ```

## 6. Gestión de estado y datos

### Básico

- Las tres categorías de estado, y por qué mezclarlas es un antipatrón

  - **Teoría**: no todo "estado" es del mismo tipo, y tratarlo como si lo
    fuera lleva a arquitecturas confusas. **Estado local de componente**
    (un input abierto/cerrado, el valor de un formulario) solo le importa
    a ese componente y sus hijos directos. **Estado global de UI**
    (usuario autenticado, tema claro/oscuro, idioma) es compartido pero no
    viene de una API, cambia poco. **Estado de servidor** (la lista de
    productos, el perfil del usuario) es una **copia cacheada** de datos
    que en realidad viven en el backend, pueden quedar desactualizados, y
    necesitan revalidarse. El antipatrón común es meter estado de servidor
    dentro de un store global de UI (Redux, Context) y reimplementar a
    mano problemas que una librería especializada ya resuelve: caché,
    invalidación, refetch, estados de carga por petición.
  - **Ejemplo**:
    ```tsx
    // Antipatrón: tratar datos del servidor igual que estado de UI puro
    const [usuarioActual, setUsuarioActual] = useState(null); // esto sí es UI global: OK
    const [productos, setProductos] = useState([]); // esto es estado de SERVIDOR
    useEffect(() => {
      fetch('/api/products').then((r) => r.json()).then(setProductos);
      // A mano tocaría reimplementar: caché, revalidación, deduplicación,
      // reintentos, estado de loading/error... todo lo que una librería
      // de estado de servidor (ver "en profundidad") ya resuelve.
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

  - **Teoría**: librerías como React Query y **SWR** (*stale-while-revalidate*
    — ver Glosario, también el nombre de la librería) tratan cada
    petición como una entrada de caché identificada por una "query key",
    y resuelven exactamente lo que un `useEffect` + `useState` manual no
    resuelve bien: **caché** (si dos componentes piden los mismos datos,
    solo se hace una petición real), **deduplicación** (varias llamadas
    simultáneas a la misma query key se combinan en una sola petición de
    red), **invalidación** (marcar datos como obsoletos tras una mutación,
    para que se vuelvan a pedir), y **refetch en background** (mostrar el
    dato cacheado — "stale", desactualizado — de inmediato, mientras en
    segundo plano se revalida contra el servidor y se actualiza la UI si
    cambió, sin bloquear al usuario con un spinner).
    Mientras que useEffect te obliga a orquestar manualmente cada paso del
    ciclo de vida de una petición (cuándo cargar, cómo manejar errores, cuándo    limpiar),
    React Query te permite declarar qué datos necesitas y él se encarga de la
    gestión del estado del servidor.
    Diferencias claves:
    - Gestión de Estado y Boilerplate: Con useEffect necesitas crear manualmente múltiples
      estados (data, isLoading, error) y actualizarlos tú mismo. React Query abstrae todo esto;
      solo usas el hook y obtienes esos estados listos para usar.
    - Caché y Deduplicación: useEffect no tiene caché. Si dos componentes piden los mismos datos
      al montarse, se harán dos peticiones. React Query guarda los datos en caché (basado en la queryKey)
      y si dos componentes piden lo mismo, solo se hace una petición y ambos comparten la respuesta.
    - Manejo de Errores y Reintentos: En useEffect debes escribir try/catch manualmente.
      React Query incluye lógica de reintento automático por defecto y te da el estado isError directamente
    - Refetching Inteligente: Con useEffect los datos pueden quedar obsoletos (stale) al volver a la pestaña.
      React Query actualiza los datos automáticamente en segundo plano cuando la ventana recupera el foco,
      sin que el usuario lo note.
    
  - **Ejemplo**:
    ```tsx
    import { useQuery, useQueryClient } from '@tanstack/react-query';

    function ListaProductos() {
      // "products" es la query key: si otro componente usa la misma key,
      // React Query reutiliza el caché en vez de pedir de nuevo
      const { data, isLoading } = useQuery({
        queryKey: ['products'],
        queryFn: () => fetch('/api/products').then((r) => r.json()),
        staleTime: 60_000, // considera los datos "frescos" por 1 minuto
      });

      if (isLoading) return <Spinner />;
      return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
    }

    function useCrearProducto() {
      const queryClient = useQueryClient();
      return async (producto) => {
        await fetch('/api/products', { method: 'POST', body: JSON.stringify(producto) });
        queryClient.invalidateQueries({ queryKey: ['products'] }); // fuerza refetch: la lista se actualiza sola
      };
    }
    ```
    Ninguna de estas cuatro garantías (caché, dedup, invalidación,
    refetch en background) existe en un `useState` + `useEffect` manual
    sin reimplementarlas a mano.

- Zustand vs Redux vs Jotai: qué problema resuelve cada uno

  - **Teoría**: los tres son librerías de estado global de **UI** (no de
    servidor), pero con filosofías distintas. **Redux** centraliza todo
    el estado en un único store inmutable, con actualizaciones explícitas
    vía *reducers* y *actions* — muy predecible y con buenas herramientas
    de debugging (time-travel), a costa de bastante código ceremonial
    (aunque Redux Toolkit lo redujo mucho). **Zustand** ofrece un store
    global minimalista sin *boilerplate*, con suscripción granular por
    selector (un componente solo re-renderiza si el pedazo de estado que
    lee cambió, sin el problema de Context visto arriba). **Jotai** usa un
    modelo **atómico**: en vez de un store único, defines "átomos" de
    estado pequeños e independientes que se combinan bottom-up, útil
    cuando el estado global es en realidad muchos pedazos no
    relacionados entre sí.
  - **Ejemplo**:
    ```tsx
    // Zustand: sin boilerplate, con selector para suscripción granular
    const useCarritoStore = create((set) => ({
      items: [],
      agregar: (item) => set((state) => ({ items: [...state.items, item] })),
    }));
    function ContadorCarrito() {
      // Solo re-renderiza si "items.length" cambia, no por cualquier otro cambio del store
      const cantidad = useCarritoStore((state) => state.items.length);
      return <span>{cantidad}</span>;
    }

    // Jotai: átomos independientes, se combinan según se necesiten
    const temaAtom = atom('claro');
    const usuarioAtom = atom(null);
    function BotonTema() {
      const [tema, setTema] = useAtom(temaAtom); // no le importa nada de "usuarioAtom"
      return <button onClick={() => setTema(tema === 'claro' ? 'oscuro' : 'claro')}>{tema}</button>;
    }
    ```

- Normalización de estado

  - **Teoría**: guardar datos anidados y duplicados en el estado (una
    lista de pedidos donde cada pedido incluye una copia completa del
    objeto cliente) genera un problema real: si el nombre del cliente
    cambia, hay que encontrar y actualizar **todas** las copias
    duplicadas, y es fácil olvidar una y dejar el estado inconsistente.
    **Normalizar** el estado significa guardarlo como una base de datos
    en memoria — entidades planas indexadas por id, y referencias por id
    en vez de objetos anidados completos — igual que se normalizan tablas
    relacionales en una base de datos.
  - **Ejemplo**:
    ```ts
    // Sin normalizar: el mismo cliente duplicado en cada pedido
    const pedidos = [
      { id: 1, cliente: { id: 9, nombre: 'Ana' }, total: 100 },
      { id: 2, cliente: { id: 9, nombre: 'Ana' }, total: 50 }, // copia duplicada
    ];

    // Normalizado: una sola fuente de verdad por entidad, referenciada por id
    const estado = {
      pedidos: {
        byId: { 1: { id: 1, clienteId: 9, total: 100 }, 2: { id: 2, clienteId: 9, total: 50 } },
        allIds: [1, 2],
      },
      clientes: { byId: { 9: { id: 9, nombre: 'Ana' } } },
    };
    // Actualizar el nombre de Ana ahora es un solo cambio, en un solo lugar
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

  - **Teoría**: son cuatro formas distintas de responder a la misma
    pregunta — "¿dónde y cuándo se genera el HTML?" — cada una con un
    trade-off distinto entre velocidad, SEO, costo de servidor y
    frescura de datos.
    - **CSR** (*Client-Side Rendering* — ver Glosario): el servidor manda
      un HTML casi vacío y todo el renderizado ocurre en el navegador con
      JS. Tiempo a interactivo más lento (hay que descargar y ejecutar
      todo el JS antes de ver algo), y SEO pobre si el crawler no ejecuta
      JS; a cambio, tras la carga inicial las navegaciones son muy
      rápidas (SPA — *Single Page Application* — ver Glosario) y el costo
      de servidor es mínimo (solo sirve archivos estáticos).
    - **SSR** (*Server-Side Rendering* — ver Glosario): el servidor genera
      el HTML completo en cada petición. Buen SEO y buen primer pintado
      con contenido real, pero cada visita cuesta cómputo de servidor y
      depende de la latencia del backend en ese momento.
    - **SSG** (*Static Site Generation* — ver Glosario): el HTML se genera
      **una vez, en build time**, y se sirve como archivo estático desde
      un CDN. El más rápido y barato posible, pero los datos quedan
      fijos hasta el próximo build — no sirve para contenido que cambia
      todo el tiempo.
    - **ISR** (*Incremental Static Regeneration* — ver Glosario): un
      híbrido — sirve la versión estática cacheada (rápida, como SSG),
      pero la regenera en segundo plano después de un tiempo configurado,
      sin necesitar un build completo del sitio para reflejar datos
      nuevos.
  - **Ejemplo**: una tienda online real suele combinar las cuatro
    estrategias según la página:
    ```
    /                     -> SSG (la home cambia poco, se puede pre-generar)
    /productos/[slug]     -> ISR (miles de productos, precios cambian, no todo el tiempo)
    /checkout             -> CSR (muy interactivo, no necesita SEO, ya autenticado)
    /buscar?q=zapatillas  -> SSR (resultado depende 100% de la query, cada vez distinto)
    ```

- Hidratación y por qué puede ser costosa

  - **Teoría**: cuando SSR/SSG entregan HTML ya generado, ese HTML es
    "inerte" — se ve completo, pero ningún `onClick` funciona todavía
    porque React aún no tomó control de él. La **hidratación** es el
    proceso donde React descarga su JS, vuelve a ejecutar el árbol de
    componentes en el navegador, y "adjunta" los event listeners sobre el
    HTML que ya existe, verificando que coincida con lo que el servidor
    generó. El costo real: React tiene que procesar **todo** el árbol de
    componentes de la página para hidratarlo, aunque el 90% del HTML sea
    estático y jamás vaya a cambiar (un footer, una barra de navegación) —
    es trabajo de CPU que compite directamente con la interactividad
    temprana, sobre todo notorio en dispositivos de gama baja.
  - **Ejemplo**: el síntoma clásico es una página que **se ve** lista
    (el HTML ya está pintado) pero no responde al primer clic durante un
    instante — el usuario hace clic en un botón y no pasa nada porque
    React todavía está hidratando ese árbol en segundo plano. Esto es
    justamente lo que las soluciones de "en profundidad" (streaming,
    islands, resumability) atacan desde ángulos distintos.

### En profundidad

- Streaming SSR y Suspense en el servidor

  - **Teoría**: el SSR tradicional espera a que **todo** el árbol de
    componentes esté listo (incluyendo datos lentos de una API o base de
    datos) antes de enviar el primer byte de HTML — si una sola sección
    de la página es lenta, retrasa a toda la página. El **streaming SSR**
    (ya visto en `REACT19.md`) envía el HTML por partes: el shell
    principal sale de inmediato, y cada `<Suspense>` que envuelve una
    parte lenta se resuelve y se "inyecta" en el HTML ya enviado en
    cuanto sus datos están listos, sin bloquear el resto de la página.
  - **Ejemplo**:
    ```tsx
    // El header y el layout salen de inmediato; los reviews (lentos de
    // consultar en la base de datos) se transmiten después, sin bloquear
    // el resto de la página
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
    El navegador recibe el fallback del spinner de inmediato dentro del
    HTML inicial, y cuando el servidor termina de resolver `ProductReviews`,
    envía un fragmento adicional que reemplaza ese spinner in-place, sin
    esperar a que termine toda la respuesta.

- Islands architecture y resumability como alternativas a hidratar todo

  - **Teoría**: dos frameworks atacan el costo de hidratación desde raíces
    distintas. **Astro** usa *islands architecture* (arquitectura de
    islas): por defecto todo se renderiza a HTML estático puro, sin JS, y
    solo los componentes explícitamente marcados como interactivos
    ("islas") se hidratan de forma **independiente y aislada** — el resto
    de la página nunca paga el costo de hidratación porque nunca tuvo
    JS que ejecutar. **Qwik** va un paso más allá con **resumability**:
    en vez de re-ejecutar todo el árbol de componentes en el cliente para
    "reconstruir" dónde estaban los event listeners (lo que hace la
    hidratación tradicional), serializa ese estado directamente en el
    HTML, de modo que el navegador puede "resumir" la ejecución exacta
    donde la dejó el servidor, sin repetir trabajo — el JS de un
    componente ni siquiera se descarga hasta el momento en que el
    usuario interactúa con él.
  - **Ejemplo**:
    ```astro
    ---
    // Astro: el carrusel es una isla, todo lo demás es HTML puro sin JS
    import Carousel from '../components/Carousel.jsx';
    ---
    <Layout>
      <h1>Bienvenida</h1> {/* HTML estático puro, cero JS enviado */}
      <Carousel client:visible /> {/* solo esta isla se hidrata, y solo cuando entra al viewport */}
    </Layout>
    ```

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

Esto amplía la sección 1 de `GOOD-FRONTEND-PRACTICES.md` con temas de nivel
senior que no se cubrieron ahí:

### En profundidad

- Costo relativo de reflow, repaint y composite-only en el rendering pipeline

  - **Teoría**: no todos los cambios visuales cuestan lo mismo, y saber
    cuál dispara qué es la base de animar sin destruir el rendimiento
    (conectando con el Critical Rendering Path visto en la sección 1).
    Cambiar una propiedad que afecta el **layout** (`width`, `top`,
    agregar/quitar contenido) fuerza un **reflow**: el navegador
    recalcula la posición y tamaño de ese elemento y potencialmente de
    todos sus hermanos y descendientes, y luego repinta. Cambiar solo el
    **color** (`background-color`, `color`) dispara un **repaint** sin
    reflow: no cambia el layout, pero sí hay que redibujar los píxeles.
    Cambiar `transform` u `opacity` es **composite-only**: el navegador ya
    tiene esa capa pintada en la GPU (ver sección 1) y solo tiene que
    recombinarla, sin recalcular layout ni repintar nada — es la única
    categoría que puede animarse a 60fps de forma confiable incluso en
    hardware modesto.
  - **Ejemplo**:
    ```css
    /* Costoso: cambia el layout en cada frame -> reflow + repaint + composite */
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
    }
    .modal-buena.abierto {
      transform: translateY(0);
      opacity: 1;
    }
    ```
    En Chrome DevTools → Performance, un reflow aparece como una barra
    morada "Layout"; si tu animación genera esas barras en cada frame,
    es candidata a reescribirse con `transform`/`opacity`.

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
    hilo principal que dura más de 50ms — durante ese tiempo el
    navegador no puede responder a ninguna interacción del usuario
    (clic, tecla), lo que degrada directamente el INP (ya visto en
    `GOOD-FRONTEND-PRACTICES.md`). `PerformanceObserver` permite
    detectar estas long tasks en producción real, en vez de solo en un
    entorno de laboratorio como Lighthouse, capturando exactamente qué
    interacción del usuario real se vio afectada y cuánto duró.
  - **Ejemplo**:
    ```ts
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Cualquier tarea de más de 50ms bloqueó el hilo principal
        console.warn(`Long task detectada: ${entry.duration}ms`, entry);
        // En producción, esto se enviaría a RUM (ver Glosario) para
        // correlacionar long tasks con caídas reales de INP.
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
    ```

- Virtualización de listas largas (*windowing*)

  - **Teoría**: renderizar 10,000 filas al DOM real es inviable — cada
    nodo del DOM tiene un costo de memoria y de cálculo de layout, y el
    navegador se vuelve inmanejable mucho antes de llegar a esa cantidad.
    La **virtualización** (o *windowing*) renderiza únicamente las filas
    que son visibles en el viewport en un momento dado (más un pequeño
    margen), y a medida que el usuario hace scroll, reemplaza y reposiciona
    ese pequeño conjunto de nodos del DOM en vez de crear nodos nuevos
    para cada fila — el usuario percibe una lista infinita, pero el DOM
    real nunca tiene más de unas pocas decenas de nodos a la vez.
  - **Ejemplo (`react-window`)**:
    ```tsx
    import { FixedSizeList } from 'react-window';

    function ListaVirtualizada({ productos }) {
      return (
        <FixedSizeList
          height={600}
          itemCount={productos.length} // puede ser 10,000+ items
          itemSize={50}
          width="100%"
        >
          {({ index, style }) => (
            // Solo se llama esta función para las filas realmente visibles
            <div style={style}>{productos[index].name}</div>
          )}
        </FixedSizeList>
      );
    }
    ```

## 9. Accesibilidad e i18n

Esto amplía la sección 2 de `GOOD-FRONTEND-PRACTICES.md` con temas de nivel
senior que no se cubrieron ahí:

### En profundidad

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

  - **Teoría**: la pluralización de dos formas (singular/plural) que
    alcanza para español o inglés no alcanza para todos los idiomas —
    ruso y polaco, por ejemplo, tienen hasta **cuatro formas plurales**
    distintas según reglas gramaticales sobre el número exacto (una
    forma para 1, otra para 2-4, otra para 5-20, etc.). **ICU**
    (*International Components for Unicode* — ver Glosario)
    **MessageFormat** es el estándar que las librerías de i18n
    (`react-intl`, `next-intl`) usan para declarar todas las formas
    plurales necesarias por idioma, delegando en la librería la regla de
    cuál aplica para cada número.
  - **Ejemplo**:
    ```json
    // en.json -- dos formas alcanzan para inglés
    { "unread": "{count, plural, one {# unread message} other {# unread messages}}" }

    // ru.json -- el ruso necesita más formas para ser gramaticalmente correcto
    {
      "unread": "{count, plural, one {# непрочитанное сообщение} few {# непрочитанных сообщения} many {# непрочитанных сообщений} other {# непрочитанных сообщений}}"
    }
    ```
    ```tsx
    <FormattedMessage id="unread" values={{ count: 3 }} />
    // La librería elige automáticamente la forma plural correcta
    // según el idioma activo y el valor de "count" -- el componente
    // nunca necesita saber cuántas formas tiene cada idioma.
    ```

## 10. Seguridad en frontend

Esto amplía la sección 4 de `GOOD-FRONTEND-PRACTICES.md` con temas de nivel
senior que no se cubrieron ahí:

### En profundidad

- Mapeo del OWASP Top 10 a riesgos específicos de frontend

  - **Teoría**: **OWASP** (*Open Web Application Security Project* — ver
    Glosario) publica el Top 10 de riesgos de seguridad web más comunes;
    no todos aplican igual al frontend, pero varios sí tienen una cara
    específica del lado del cliente que vale la pena reconocer por
    nombre en una entrevista: *Broken Access Control* (el frontend oculta
    un botón, pero si el backend no revalida el permiso, el usuario
    puede llamar el endpoint directamente); *Injection* (XSS, ya visto en
    `GOOD-FRONTEND-PRACTICES.md`, es la variante de inyección más
    relevante en frontend); *Identification and Authentication Failures*
    (tokens mal gestionados, sesiones que no expiran); *Security
    Misconfiguration* (CSP ausente o demasiado permisiva, CORS mal
    configurado); *Vulnerable and Outdated Components* (dependencias con
    CVEs conocidos, ya visto también en la sección de seguridad
    existente).
  - **Ejemplo**: el caso de *Broken Access Control* es el que más
    sorprende a quien viene de pensar la seguridad solo desde la UI:
    ```tsx
    // Ocultar el botón NO es seguridad, es solo UX -- el backend es quien
    // debe rechazar la petición si el usuario no tiene el rol correcto
    {usuario.rol === 'admin' && <button onClick={eliminarUsuario}>Eliminar</button>}
    ```
    Si el endpoint `DELETE /users/:id` no revalida el rol en el servidor,
    cualquier usuario autenticado puede llamarlo directamente desde la
    consola del navegador o Postman, sin pasar nunca por ese botón.

- Flujo OAuth 2.0 + OIDC con PKCE, paso a paso

  - **Teoría**: **OAuth 2.0** es un protocolo de **autorización**
    (delega acceso a un recurso sin compartir la contraseña); **OIDC**
    (*OpenID Connect* — ver Glosario) se construye encima para añadir
    **autenticación** (identificar quién es el usuario, no solo qué
    puede hacer). Un backend tradicional puede guardar un *client
    secret* de forma segura para completar el intercambio de código por
    token, pero una SPA no tiene dónde esconder un secreto (todo su
    código es visible en el navegador) — es un *cliente público*. **PKCE**
    (*Proof Key for Code Exchange* — ver Glosario) resuelve esto sin
    necesitar un secreto fijo: la propia app genera un secreto
    **temporal y de un solo uso** en cada login, así que aunque alguien
    intercepte el código de autorización a mitad de camino, no puede
    canjearlo por un token sin ese secreto efímero que solo la app
    original generó.
  - **Ejemplo paso a paso**:
    1. La SPA genera un `code_verifier` aleatorio y su hash SHA-256, el
       `code_challenge`.
    2. Redirige al usuario al proveedor de identidad con el
       `code_challenge` (no el verifier — ese nunca sale del navegador
       todavía):
       ```
       GET https://auth.miapp.com/authorize
         ?client_id=abc123&response_type=code
         &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
         &code_challenge_method=S256
       ```
    3. El usuario se autentica en el proveedor y es redirigido de vuelta
       con un `code` de un solo uso.
    4. La SPA canjea ese `code` **junto con el `code_verifier` original**
       (guardado localmente desde el paso 1) por un token:
       ```ts
       fetch('https://auth.miapp.com/token', {
         method: 'POST',
         body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier }),
       });
       ```
    5. El servidor de autorización recalcula el hash de `code_verifier` y
       lo compara contra el `code_challenge` del paso 2 — si alguien
       robó el `code` en el paso 3 pero no tiene el `code_verifier`
       original (que nunca viajó por la URL), el intercambio falla.

- Access token vs refresh token: dónde debe vivir cada uno

  - **Teoría**: el **access token** (normalmente un **JWT**, *JSON Web
    Token*) es de corta duración (minutos) y se envía en cada petición
    a la API — si se filtra, la ventana de daño es corta. El **refresh
    token** vive mucho más tiempo y sirve solo para pedir un access token
    nuevo sin obligar al usuario a volver a iniciar sesión — si este se
    filtra, el daño es mucho mayor (acceso indefinido). Por eso el
    refresh token debe protegerse con el máximo cuidado: una cookie
    `HttpOnly` (inaccesible desde JS, ya visto en la sección de
    seguridad existente) es preferible a guardarlo en memoria o
    `localStorage`, donde cualquier XSS podría robarlo directamente.
  - **Ejemplo**:
    ```
    # El backend setea el refresh token como cookie HttpOnly -- el JS del
    # frontend nunca lo toca ni lo ve
    Set-Cookie: refresh_token=eyJ...; HttpOnly; Secure; SameSite=Strict
    ```
    ```ts
    // El access token sí lo maneja el frontend, pero solo en memoria
    // (nunca en localStorage) y con vida corta
    let accessToken: string | null = null;

    async function renovarAccessToken() {
      // La cookie HttpOnly viaja sola, automáticamente, con credentials: 'include'
      const res = await fetch('/auth/refresh', { credentials: 'include' });
      const { accessToken: nuevo } = await res.json();
      accessToken = nuevo; // solo vive en memoria del proceso de JS
    }
    ```

- Content Security Policy avanzada con nonces y `strict-dynamic`

  - **Teoría**: la CSP básica ya vista en `GOOD-FRONTEND-PRACTICES.md`
    (`script-src 'self'`) es rígida y difícil de mantener con scripts
    inyectados dinámicamente (analytics, A/B testing) — cada nuevo
    dominio de terceros obliga a editar la política. Una **nonce**
    (número usado una sola vez) generada por el servidor en cada
    petición, y puesta tanto en el header CSP como en el atributo
    `nonce` del `<script>`, autoriza scripts específicos sin necesitar
    listar dominios. `'strict-dynamic'` extiende esa confianza:
    un script ya autorizado por nonce puede a su vez cargar otros
    scripts dinámicamente (`document.createElement('script')`), sin que
    cada uno necesite su propia nonce — resolviendo el caso común de
    librerías de analytics que cargan sub-scripts propios.
  - **Ejemplo**:
    ```
    Content-Security-Policy: script-src 'self' 'nonce-r4nd0mAB12' 'strict-dynamic'
    ```
    ```html
    <!-- Solo este script (con la nonce exacta del header) se ejecuta -->
    <script nonce="r4nd0mAB12" src="/analytics.js"></script>

    <!-- Un <script> inyectado sin esa nonce es bloqueado por el navegador,
         aunque un atacante lograra inyectarlo vía XSS -->
    <script src="https://evil.com/malware.js"></script>
    ```
    La nonce debe generarse **de nuevo en cada respuesta del servidor**
    (nunca reutilizarse): si fuera fija, un atacante que la descubra una
    vez podría reutilizarla para autorizar su propio script inyectado.

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

- Estructura de carpetas feature-based vs type-based

  - **Teoría**: una estructura **type-based** agrupa archivos por su tipo
    técnico (`components/`, `hooks/`, `services/`) sin importar a qué
    parte del negocio pertenecen. Una estructura **feature-based** agrupa
    todo lo relacionado con una funcionalidad de negocio en una misma
    carpeta (componentes, hooks, tipos, tests de esa feature juntos).
    Feature-based escala mejor en proyectos grandes porque el "radio de
    cambio" de una tarea típica (modificar el checkout) queda contenido
    en una sola carpeta, en vez de obligar a saltar entre `components/`,
    `hooks/` y `services/` buscando las piezas dispersas de esa misma
    feature — y facilita borrar una feature completa sin dejar archivos
    huérfanos regados por el proyecto.
  - **Ejemplo**:
    ```
    # Type-based: todo el checkout está disperso en 3 carpetas distintas
    src/
      components/CheckoutForm.tsx
      hooks/useCheckout.ts
      services/checkoutApi.ts

    # Feature-based: todo el checkout vive junto, es un módulo autocontenido
    src/
      features/checkout/
        CheckoutForm.tsx
        useCheckout.ts
        checkoutApi.ts
        checkout.test.ts
    ```

### En profundidad

- Monorepos con Turborepo/Nx: qué problemas resuelven

  - **Teoría**: un monorepo (varios paquetes/apps en un solo repositorio
    Git) sin herramienta especializada sufre dos problemas concretos a
    medida que crece: **builds lentos** (reconstruir todo el repositorio
    en cada cambio, aunque solo se haya tocado un paquete pequeño) y
    **grafo de dependencias implícito** (no está claro qué paquete
    interno depende de cuál, hasta que algo se rompe en cadena).
    Turborepo y Nx resuelven ambos: cachean el resultado de builds/tests
    por paquete (si un paquete no cambió, reutilizan el resultado
    anterior en vez de reconstruirlo) y modelan explícitamente el grafo
    de dependencias entre paquetes internos, permitiendo ejecutar tareas
    solo sobre lo que realmente cambió y sus dependientes.
  - **Ejemplo**:
    ```json
    // turbo.json -- declara que "build" depende del "build" de sus paquetes internos,
    // y que su resultado puede cachearse
    {
      "tasks": {
        "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] }
      }
    }
    ```
    ```bash
    turbo run build
    # Si "ui-kit" no cambió desde el último build, Turborepo reusa su
    # resultado cacheado en vez de reconstruirlo -- solo reconstruye
    # "checkout-app", que sí cambió, y lo que depende de él.
    ```

- Micro-frontends y module federation: cuándo (no) usarlos

  - **Teoría**: los micro-frontends dividen una aplicación grande en
    fragmentos desplegables **de forma independiente**, cada uno
    mantenido por un equipo distinto. **Module federation** (de
    Webpack/Rio) es una de las técnicas para lograrlo: permite que una
    app cargue en runtime código JS compilado y desplegado por otra app
    completamente distinta, como si fuera un import normal. El problema
    organizacional real que resuelven es de **escala de equipos**:
    cuando varios equipos grandes necesitan desplegar sus partes de la
    app de forma independiente, sin coordinar un único release conjunto
    que se vuelve un cuello de botella. La advertencia importante: si no
    tienes ese problema real (equipos grandes, despliegues
    independientes necesarios), adoptar micro-frontends solo añade
    complejidad de infraestructura, duplicación de dependencias entre
    fragmentos, y una experiencia de desarrollo más difícil de depurar —
    es sobreingeniería (ver YAGNI) resolver un problema de coordinación
    de equipos que en realidad no existe.
  - **Ejemplo**:
    ```js
    // webpack.config.js del "host" (la app contenedora)
    new ModuleFederationPlugin({
      remotes: {
        checkout: 'checkout@https://checkout.miapp.com/remoteEntry.js', // otro equipo, otro deploy
      },
    });

    // Uso dentro del host: se importa como si fuera código local,
    // pero en runtime viene de un despliegue completamente separado
    const CheckoutApp = React.lazy(() => import('checkout/CheckoutApp'));
    ```

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
  - **Ejemplo**:
    ```json
    // Antes: Button acepta `variant="primary" | "secondary"`
    // Después: se renombra a `type="primary" | "secondary"`
    // Esto ROMPE a cualquier consumidor que use `variant` -> requiere un MAJOR bump
    { "name": "@miorg/design-system", "version": "3.0.0" }
    ```
    ```tsx
    // Un CHANGELOG claro, ligado al bump de versión, evita que otros
    // equipos actualicen a ciegas y descubran el breaking change en producción
    // v3.0.0 -- BREAKING: Button.variant renombrado a Button.type
    ```

## 13. Build tools y tooling moderno

### Básico

- Qué hace un bundler, en tres pasos

  - **Teoría**: un bundler resuelve tres problemas distintos, aunque a
    menudo se piensen como uno solo. (1) **Bundling**: combina decenas o
    cientos de archivos JS/CSS separados (con sus `import`s entre sí) en
    un número pequeño de archivos finales, porque servir cientos de
    archivos sueltos por HTTP es ineficiente. (2) **Transpiling**:
    convierte sintaxis moderna de JS/TS/JSX que el navegador del usuario
    quizás no entiende todavía, a una versión compatible (esto lo hacen
    Babel o esbuild por debajo). (3) **Minification**: elimina espacios,
    acorta nombres de variables y quita código muerto, reduciendo el peso
    final del archivo sin cambiar su comportamiento.
  - **Ejemplo**: el mismo código pasa por las tres fases:
    ```ts
    // Entrada: TSX moderno, varios archivos con imports entre sí
    const saludar = (nombre: string): string => `Hola, ${nombre}`;
    ```
    ```js
    // Salida tras bundling + transpiling + minification: un archivo,
    // sintaxis compatible, nombres acortados, sin espacios innecesarios
    const a=e=>`Hola, ${e}`;
    ```

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
  publica el "Top 10" de riesgos de seguridad web más comunes, una
  referencia estándar de la industria para clasificar vulnerabilidades.
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
  fricción); se usa para distinguir un riesgo puramente de negocio o de
  percepción de un riesgo técnico o de seguridad real.
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
