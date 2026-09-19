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
