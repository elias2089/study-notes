Checklist técnico de buenas prácticas de implementación, portable a cualquier
proyecto frontend (React, Angular, Vue, Svelte, etc.). Complementa el
comportamiento de agente de `@front-end-base`; las convenciones específicas de
stack de cada proyecto viven en sus propias reglas (`.claude/rules/`).

## 1. Rendimiento

- Aplica carga diferida (lazy loading) en imágenes (`loading="lazy"`) y en
  recursos pesados (code splitting, `import()` dinámico, `React.lazy` o
  equivalente del framework).

  - **Teoría**: el navegador intenta descargar y ejecutar todo lo que
    encuentra lo antes posible. Si cargas de forma "eager" (inmediata) cosas
    que el usuario no está viendo todavía (imágenes fuera del viewport,
    modales cerrados, rutas no visitadas), esos recursos compiten por ancho
    de banda y CPU (*Central Processing Unit*, el procesador que ejecuta el
    JS — ver Glosario) con el contenido crítico del primer render,
    retrasando el LCP (*Largest Contentful Paint* — ver Glosario) y
    bloqueando el hilo principal con JS (*JavaScript* — ver Glosario) que
    quizá nunca se llegue a usar. Lazy loading pospone ese trabajo hasta que
    realmente hace falta.
  - **Ejemplo — imágenes**:
    ```html
    <!-- Hero visible de inmediato al cargar la página: NO lleva lazy -->
    <img src="/hero.jpg" alt="Bienvenida" width="1200" height="600" />

    <!-- Imagen al final de un artículo largo, fuera del viewport inicial -->
    <img
      src="/diagrama-arquitectura.png"
      alt="Diagrama de arquitectura"
      loading="lazy"
      width="800"
      height="450"
    />
    ```
  - **Ejemplo — code splitting (React)**:
    ```tsx
    // Sin code splitting: el modal de configuración (con su librería de
    // gráficos pesada) viaja en el bundle principal aunque el 90% de los
    // usuarios nunca lo abra.
    import SettingsModal from './SettingsModal';

    // Con code splitting: solo se descarga cuando el usuario pulsa el botón.
    const SettingsModal = React.lazy(() => import('./SettingsModal'));

    function App() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Configuración</button>
          {open && (
            <Suspense fallback={<Spinner />}>
              <SettingsModal />
            </Suspense>
          )}
        </>
      );
    }
    ```

- Vigila el peso del bundle inicial, prioriza mantenerlo bajo y aplica code
  splitting cuando se acerque a límites razonables para el proyecto.

  - **Teoría**: el "bundle inicial" es el JS que el navegador debe descargar,
    parsear y ejecutar antes de que la app sea interactiva. Cuanto más pesa,
    más tarda en volverse interactiva y peor responde a la primera
    interacción del usuario, sobre todo en redes móviles o gama baja.
    Dividir por rutas asegura que quien visita `/login` no descargue el
    código de `/dashboard/reportes-avanzados`.
  - **Ejemplo (React Router)**:
    ```tsx
    const Dashboard = React.lazy(() => import('./pages/Dashboard'));
    const Reports = React.lazy(() => import('./pages/Reports'));

    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/reports" element={<Reports />} />
    </Routes>;
    ```
    Esto genera chunks separados (`dashboard.[hash].js`, `reports.[hash].js`)
    en lugar de un único `bundle.js` gigante. Para detectar qué está
    engordando el bundle, usa `vite-bundle-visualizer` o
    `webpack-bundle-analyzer`.

- Usa formatos modernos de imagen (WebP/AVIF) y `srcset`/`sizes` para
  imágenes responsive.

  - **Teoría**: WebP y AVIF (formatos de imagen — ver Glosario) comprimen
    mejor que JPEG/PNG (AVIF puede pesar ~50% menos que un JPEG de calidad
    similar). `srcset`/`sizes` permiten servir la resolución adecuada según
    el dispositivo: un móvil de 400px de ancho no necesita descargar una
    imagen pensada para una pantalla de 2000px.
  - **Ejemplo**:
    ```html
    <picture>
      <source srcset="/foto.avif" type="image/avif" />
      <source srcset="/foto.webp" type="image/webp" />
      <img
        src="/foto.jpg"
        srcset="/foto-400.jpg 400w, /foto-800.jpg 800w, /foto-1200.jpg 1200w"
        sizes="(max-width: 600px) 400px, (max-width: 1024px) 800px, 1200px"
        alt="Producto"
        width="1200"
        height="800"
      />
    </picture>
    ```
    El navegador elige el mejor formato que soporte y la resolución más
    adecuada según el ancho real del viewport.

- Evita layout shift: define dimensiones explícitas en imágenes y vídeos
  (`width`/`height` o `aspect-ratio`).

  - **Teoría**: si no reservas el espacio, cuando la imagen o el vídeo
    terminan de cargar el navegador "empuja" el contenido de alrededor,
    provocando un salto visual (CLS alto, *Cumulative Layout Shift* — ver
    Glosario). Esto es molesto y peligroso: el usuario puede hacer clic
    justo cuando el contenido se mueve y acabar pulsando el elemento
    equivocado. `width`/`height` (o `aspect-ratio` en CSS, *Cascading Style
    Sheets* — ver Glosario) reservan el espacio desde el primer render,
    antes de que el recurso haya cargado.
  - **Ejemplo**:
    ```html
    <!-- Malo: sin dimensiones, el layout salta cuando la imagen carga -->
    <img src="/banner.jpg" alt="Banner" />

    <!-- Bueno: el navegador reserva el hueco (1200x400) de inmediato -->
    <img src="/banner.jpg" alt="Banner" width="1200" height="400" />
    ```
    ```css
    .video-wrapper {
      /* Reserva el espacio del <video> aunque todavía no tenga fuente */
      aspect-ratio: 16 / 9;
    }
    ```

- Usa `preconnect`/`preload`/`prefetch` para recursos críticos.

  - **Teoría**:
    - `preconnect`: adelanta el handshake (saludo inicial de conexión) DNS +
      TCP + TLS (protocolos de red — ver Glosario) a un dominio que sabes
      que vas a necesitar (una fuente en un CDN, un API en otro dominio —
      ver Glosario), ahorrando ~100-300ms cuando llegue la petición real.
    - `preload`: le dice al navegador "descarga esto ya, con prioridad
      alta" — útil para recursos críticos que el navegador descubriría
      tarde (una fuente referenciada solo desde el CSS, la imagen del LCP
      puesta como `background-image`).
    - `prefetch`: descarga con prioridad baja algo que probablemente se
      necesitará pronto (la siguiente página que el usuario visitará),
      aprovechando tiempos muertos del navegador.
  - **Ejemplo**:
    ```html
    <!-- Vamos a pedir datos a este dominio: adelantamos la conexión -->
    <link rel="preconnect" href="https://api.miapp.com" />

    <!-- La fuente se usa en el hero; sin preload el navegador la
         descubre tarde, después de parsear el CSS -->
    <link
      rel="preload"
      href="/fonts/inter-var.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />

    <!-- El usuario probablemente irá al checkout después del carrito -->
    <link rel="prefetch" href="/checkout.js" />
    ```

- Vigila los Core Web Vitals (LCP, CLS, INP) al introducir contenido pesado.

  - **Teoría**: son las métricas con las que Google mide la experiencia
    real de carga (**LCP** — cuándo aparece el elemento más grande visible,
    normalmente el hero o el título principal), la estabilidad visual
    (**CLS** — cuánto "salta" el contenido) y la interactividad (**INP**,
    *Interaction to Next Paint* — ver Glosario; reemplazó a **FID**, *First
    Input Delay* — ver Glosario, en 2024; mide qué tan rápido responde la
    página a *cualquier* interacción del usuario durante toda la visita, no
    solo a la primera). Umbrales considerados "buenos": LCP ≤ 2.5s,
    CLS ≤ 0.1, INP ≤ 200ms.
  - **Ejemplo**: si añades un carrusel de imágenes pesado en el hero sin
    optimizar, el LCP se dispara porque el elemento más grande de la
    pantalla (la imagen del carrusel) tarda en descargarse. La solución es
    priorizar esa imagen concreta y asegurarte de que nunca lleve
    `loading="lazy"` (sería contradictorio: es contenido above-the-fold):
    ```html
    <img src="/hero.jpg" alt="Hero" fetchpriority="high" width="1600" height="900" />
    ```
    Para medir estas métricas en desarrollo: Chrome DevTools (panel
    Performance/Lighthouse), PageSpeed Insights, o la librería `web-vitals`
    para capturarlas en producción real (RUM, *Real User Monitoring* — ver
    Glosario).

## 2. Accesibilidad e internacionalización

- El atributo `<html lang="...">` debe estar siempre presente y ser correcto.

  - **Teoría**: `lang` le dice al navegador y a las tecnologías de asistencia
    (lectores de pantalla) en qué idioma está el contenido, para elegir la
    pronunciación correcta y activar traductores automáticos con el idioma
    de origen adecuado. Sin él, un lector de pantalla en inglés puede leer
    texto en español con pronunciación inglesa, haciéndolo ininteligible.
  - **Ejemplo**:
    ```html
    <html lang="es">
      ...
    </html>
    ```
    Si un fragmento puntual está en otro idioma:
    ```html
    <blockquote lang="en">"Move fast and break things"</blockquote>
    ```

- Respeta una jerarquía semántica de encabezados (`h1`→`h6`, sin saltos).

  - **Teoría**: los lectores de pantalla permiten "saltar" de encabezado en
    encabezado como si fuera un índice. Si saltas niveles (de `h1` a `h4`
    directamente) o eliges el encabezado solo por su tamaño visual, rompes
    esa navegación para usuarios de lectores de pantalla y confundes el
    índice semántico que también usa el SEO (*Search Engine Optimization* —
    ver Glosario).
  - **Ejemplo**:
    ```html
    <!-- Malo: salta de h1 a h4 solo porque "se ve más pequeño" -->
    <h1>Catálogo de productos</h1>
    <h4>Zapatillas</h4>

    <!-- Bueno: jerarquía consistente; el tamaño visual se ajusta con CSS -->
    <h1>Catálogo de productos</h1>
    <h2 class="text-sm">Zapatillas</h2>
    ```

- Cumple contraste de color WCAG AA, foco visible y navegación por teclado.

  - **Teoría**: WCAG (*Web Content Accessibility Guidelines* — ver
    Glosario) AA exige un ratio de contraste mínimo (4.5:1 para texto
    normal) para que personas con baja visión o daltonismo puedan leer el
    contenido. El foco visible (el "outline" al tabular) permite a usuarios
    de teclado saber en qué elemento están parados; quitarlo sin alternativa
    los deja navegando a ciegas.
  - **Ejemplo**:
    ```css
    /* Malo: elimina el foco sin alternativa, el usuario de teclado se pierde */
    button:focus {
      outline: none;
    }

    /* Bueno: estilo de foco visible y con buen contraste */
    button:focus-visible {
      outline: 2px solid #1a73e8;
      outline-offset: 2px;
    }
    ```
    Un texto gris claro (`#999`) sobre fondo blanco falla WCAG AA; un gris
    más oscuro (`#595959`) sí pasa.

- Incluye textos alternativos en imágenes e iconos; usa ARIA solo cuando el
  HTML semántico no sea suficiente.

  - **Teoría**: el `alt` describe la imagen a quien no puede verla (lector
    de pantalla, imagen rota, buscador). ARIA (*Accessible Rich Internet
    Applications* — ver Glosario) son atributos que agregan semántica
    cuando el HTML nativo no alcanza (por ejemplo, un componente de
    dropdown hecho a mano); pero ponerle `role="button"` a un `<button>`
    que ya es semántico es redundante y puede introducir bugs. Regla de
    oro: "ningún ARIA es mejor que un mal ARIA".
  - **Ejemplo**:
    ```html
    <!-- Imagen informativa: el alt describe el contenido -->
    <img src="/grafico-ventas.png" alt="Ventas subieron 20% en el Q2" />

    <!-- Imagen decorativa: alt vacío para que el lector de pantalla la ignore -->
    <img src="/patron-decorativo.svg" alt="" />

    <!-- ARIA sí es necesario: un div que actúa como botón custom -->
    <div role="button" tabindex="0" onClick={...} onKeyDown={...}>Cerrar</div>
    <!-- Mejor aún: usar <button> nativo y evitar el ARIA por completo -->
    <button onClick={...}>Cerrar</button>
    ```

- No hardcodees textos traducibles si el proyecto tiene i18n.

  - **Teoría**: si el proyecto usa i18n (*internationalization* — ver
    Glosario), cada texto visible debe pasar por el sistema de traducción
    (`react-i18next`, `next-intl`, etc.) en vez de escribirse literal en el
    JSX. Un texto hardcodeado nunca se traduce al cambiar de idioma,
    generando una mezcla de idiomas en la UI.
  - **Ejemplo**:
    ```tsx
    // Malo: el texto queda fijo en español sin importar el idioma del usuario
    <button>Guardar cambios</button>

    // Bueno: pasa por el sistema de traducción
    <button>{t('settings.saveChanges')}</button>
    ```

- Gestiona el foco explícitamente: al abrir/cerrar un modal o diálogo,
  devuelve el foco al elemento que lo disparó; usa skip links en layouts
  con navegación extensa.

  - **Teoría**: al abrir un modal, el foco del teclado debe moverse dentro
    de él; si no, el usuario sigue tabulando por el fondo, invisible tras
    el overlay. Al cerrarlo, el foco debe volver al elemento que lo abrió
    para no perder el contexto. Los skip links ("saltar al contenido
    principal") evitan que un usuario de teclado tenga que tabular por todo
    un menú largo en cada página.
  - **Ejemplo**:
    ```tsx
    function Modal({ onClose, triggerRef }) {
      const modalRef = useRef(null);
      useEffect(() => {
        modalRef.current?.focus();
        return () => triggerRef.current?.focus(); // devuelve el foco al cerrar
      }, []);
      return (
        <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true">
          ...
        </div>
      );
    }
    ```
    ```html
    <!-- Primer elemento enfocable de la página -->
    <a href="#main-content" class="skip-link">Saltar al contenido principal</a>
    ```

- Respeta `prefers-reduced-motion` en animaciones y transiciones.

  - **Teoría**: algunas personas (por motivos vestibulares, mareo,
    migrañas) configuran su sistema operativo pidiendo "menos movimiento".
    Ignorar esa preferencia y forzar animaciones grandes puede causarles
    malestar físico real, no solo una molestia estética.
  - **Ejemplo**:
    ```css
    .card {
      transition: transform 0.3s ease;
    }

    @media (prefers-reduced-motion: reduce) {
      .card {
        transition: none;
      }
    }
    ```

- Usa `aria-live` para anunciar validaciones de formulario y notificaciones
  asíncronas (errores, confirmaciones) a lectores de pantalla.

  - **Teoría**: cuando algo cambia en la página sin que el usuario navegue
    (aparece un error de validación, se muestra un toast), un lector de
    pantalla no lo detecta automáticamente porque no hubo cambio de foco.
    `aria-live` le indica "anuncia este contenido cuando cambie", sin mover
    el foco.
  - **Ejemplo**:
    ```html
    <div aria-live="polite" role="status">
      {errorMessage && <p>{errorMessage}</p>}
    </div>
    ```
    `polite` espera a que el lector de pantalla termine lo que está
    diciendo; `assertive` interrumpe (resérvalo para errores críticos).

- Apóyate en herramientas de auditoría automatizada (axe, Lighthouse) como
  primer filtro; no sustituyen la prueba manual con teclado y lector de
  pantalla.

  - **Teoría**: axe y Lighthouse detectan automáticamente una fracción de
    los problemas de accesibilidad (contraste, atributos faltantes, orden
    de encabezados), pero no pueden evaluar si la navegación por teclado
    "tiene sentido" ni si un lector de pantalla comunica bien la intención
    de un componente — eso requiere prueba manual.
  - **Ejemplo**:
    ```bash
    npx axe http://localhost:3000 --exit
    ```
    Esto falla el build en CI (*Continuous Integration* — ver Glosario) si
    hay violaciones críticas, pero se complementa probando el flujo
    completo con VoiceOver/NVDA y navegando solo con teclado (Tab,
    Shift+Tab, Enter, Escape).

- I18n: formatea fechas, números y moneda según el locale activo; evita
  concatenar strings traducidos (rompe pluralización y orden gramatical
  en otros idiomas).

  - **Teoría**: cada idioma tiene reglas distintas de formato de fecha
    (DD/MM/YYYY vs. MM/DD/YYYY), separador decimal (`,` vs. `.`) y orden
    gramatical. Concatenar strings traducidos rompe la pluralización (en
    otros idiomas puede haber más de dos formas de plural) y el orden de
    las palabras (el verbo puede ir en otra posición).
  - **Ejemplo**:
    ```tsx
    // Malo: la concatenación rompe pluralización y orden en otros idiomas
    const msg = `Tienes ${count} ` + (count === 1 ? 'mensaje' : 'mensajes');

    // Bueno: usa las utilidades de formato/pluralización del framework i18n
    const msg = t('messages.count', { count }); // la librería decide la forma plural
    const price = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(45000);
    const date = new Intl.DateTimeFormat('es-CO').format(new Date());
    ```

## 3. SEO y metadatos

Aplica cuando el proyecto tiene SSR o páginas públicas indexables.

- Incluye `meta viewport`, `meta description` y títulos únicos por página.

  - **Teoría**: `meta viewport` controla el escalado en móviles; sin él, el
    navegador móvil renderiza como si fuera de escritorio y luego hace
    zoom-out, dando una experiencia ilegible. `meta description` afecta el
    resumen mostrado en resultados de búsqueda (no es factor directo de
    ranking, pero sí influye en cuánta gente hace clic). Títulos únicos por
    página ayudan al SEO y también a orientar al usuario entre pestañas y
    favoritos del navegador.
  - **Ejemplo**:
    ```html
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta
        name="description"
        content="Compra zapatillas deportivas con envío gratis en 24h."
      />
      <title>Zapatillas deportivas | Mi Tienda</title>
    </head>
    ```

- Añade Open Graph básico si hay contenido compartible.

  - **Teoría**: Open Graph son metaetiquetas (creadas originalmente por
    Facebook, hoy usadas por casi toda red social y app de mensajería) que
    controlan cómo se ve un link al compartirlo — imagen, título y
    descripción del preview. Sin ellas, el preview puede salir vacío o con
    contenido genérico, reduciendo las probabilidades de que alguien haga
    clic en el link compartido.
  - **Ejemplo**:
    ```html
    <meta property="og:title" content="Zapatillas deportivas Nike Air" />
    <meta
      property="og:description"
      content="Envío gratis en 24h. Stock limitado."
    />
    <meta property="og:image" content="https://mitienda.com/og/zapatillas.jpg" />
    <meta
      property="og:url"
      content="https://mitienda.com/productos/zapatillas-nike-air"
    />
    ```

## 4. Seguridad

- Sanitiza cualquier HTML/markdown de usuario antes de insertarlo en el DOM.
- Evita `dangerouslySetInnerHTML`/`innerHTML` sin sanitizar.

  - **Teoría**: si insertas HTML que viene de un usuario (un comentario, una
    biografía, contenido de un editor rich text) directamente en el DOM
    (*Document Object Model* — ver Glosario) sin sanitizar, un atacante
    puede inyectar un `<script>` o un atributo `onerror` malicioso que se
    ejecute en el navegador de otros usuarios: esto es un ataque XSS
    (*Cross-Site Scripting* — ver Glosario). React escapa el texto normal
    automáticamente, pero `dangerouslySetInnerHTML` (o `innerHTML` en JS
    plano) se salta esa protección.
  - **Ejemplo**:
    ```tsx
    import DOMPurify from 'dompurify';

    // Malo: XSS si userBio contiene <img src=x onerror="robarCookies()">
    <div dangerouslySetInnerHTML={{ __html: userBio }} />;

    // Bueno: se sanitiza antes de insertarlo
    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userBio) }} />;
    ```

- No expongas secretos en código cliente; variables sensibles solo vía el
  mecanismo de entorno del build tool (`.env`, etc.).

  - **Teoría**: todo lo que se compila en el bundle de JS del cliente es
    visible para cualquiera (basta con abrir las herramientas de
    desarrollador del navegador). Una key con permisos privilegiados puesta
    en el frontend puede ser extraída y usada para atacar el backend
    directamente. Al cliente solo debe llegar lo estrictamente necesario:
    keys "públicas" diseñadas para eso (por ejemplo, una key de Google Maps
    restringida por dominio).
  - **Ejemplo**:
    ```bash
    # .env
    DATABASE_PASSWORD=supersecreto123      # NUNCA con prefijo público del build tool
    VITE_PUBLIC_MAPS_KEY=AIza...           # OK: pensada para ser pública, restringida por dominio
    ```
    ```ts
    // Malo: si esta variable llega al bundle del cliente, cualquiera la puede leer
    const dbPassword = import.meta.env.DATABASE_PASSWORD;

    // Bueno: los secretos reales solo viven en el servidor/backend
    ```

- Mantén las dependencias auditadas, sin vulnerabilidades conocidas de
  severidad alta.

  - **Teoría**: cada paquete de npm instalado es código de terceros que se
    ejecuta con los mismos permisos que tu app. Una vulnerabilidad conocida
    (CVE, *Common Vulnerabilities and Exposures* — ver Glosario) en una
    dependencia puede ser explotada aunque tu propio código sea perfecto.
  - **Ejemplo**:
    ```bash
    npm audit
    # found 3 vulnerabilities (1 moderate, 2 high)
    npm audit fix
    ```

- Configura CSP (Content Security Policy) y usa Subresource Integrity (SRI)
  en scripts de terceros cargados desde CDN.

  - **Teoría**: CSP (ver Glosario) es una cabecera HTTP que le dice al
    navegador de qué orígenes puede cargar scripts, estilos o imágenes; si
    un atacante logra inyectar `<script src="evil.com/x.js">`, el navegador
    lo bloquea porque `evil.com` no está en la lista permitida. SRI (ver
    Glosario) añade un hash criptográfico al `<script>` de un CDN externo:
    si ese CDN es comprometido y el archivo cambia, el hash ya no coincide
    y el navegador rechaza ejecutarlo.
  - **Ejemplo**:
    ```html
    <!-- Cabecera CSP (normalmente se configura en el servidor) -->
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net"
    />

    <!-- SRI: si jsdelivr sirviera un archivo distinto al esperado, el hash
         no coincide y el navegador bloquea la ejecución -->
    <script
      src="https://cdn.jsdelivr.net/npm/lib@1.2.3/dist/lib.min.js"
      integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
      crossorigin="anonymous"
    ></script>
    ```

- Tokens de sesión en cookies con flags `HttpOnly`, `Secure` y `SameSite`;
  nunca en `localStorage` si el proyecto maneja datos sensibles.

  - **Teoría**: `localStorage` es accesible desde cualquier JS que corra en
    la página; si existe una vulnerabilidad XSS, el atacante puede leer el
    token directamente. Una cookie con `HttpOnly` no es accesible desde JS,
    mitigando el robo por XSS; `Secure` obliga a enviarla solo por HTTPS;
    `SameSite=Strict`/`Lax` evita que se envíe en peticiones de otros
    sitios, mitigando CSRF (*Cross-Site Request Forgery* — ver Glosario).
  - **Ejemplo** (configuración hecha por el backend, que es quien pone la
    cookie):
    ```
    Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
    ```
    ```ts
    // Malo: vulnerable a robo vía XSS
    localStorage.setItem('token', jwt);

    // Bueno: el backend setea la cookie HttpOnly; el frontend nunca la toca directamente
    ```

- Desactiva autocompletado (`autocomplete="off"` / `new-password`) en campos
  de credenciales y datos sensibles.

  - **Teoría**: los gestores de contraseñas del navegador guardan y
    autocompletan campos; en dispositivos compartidos o públicos esto puede
    exponer credenciales a la siguiente persona que use el equipo.
    `autocomplete="new-password"` en un campo de "crear contraseña" además
    evita que el navegador sugiera una contraseña ya guardada de otro
    sitio.
  - **Ejemplo**:
    ```html
    <input type="password" name="password" autocomplete="new-password" />
    <input type="text" name="cardNumber" autocomplete="off" />
    ```

- Automatiza el escaneo de vulnerabilidades de dependencias en CI (p. ej.
  Dependabot, `npm audit`, Snyk) en lugar de auditorías manuales puntuales.

  - **Teoría**: una auditoría manual puntual deja una ventana grande donde
    una vulnerabilidad recién descubierta en una dependencia pasa
    desapercibida. Automatizarlo en CI (ver Glosario) genera alertas o PRs
    automáticos apenas se publica un CVE que afecta al proyecto.
  - **Ejemplo**:
    ```yaml
    # .github/dependabot.yml
    version: 2
    updates:
      - package-ecosystem: "npm"
        directory: "/"
        schedule:
          interval: "weekly"
    ```

## 5. Estados de UI

- Maneja explícitamente los estados de loading / error / vacío en vistas con
  datos asíncronos.

  - **Teoría**: toda petición de red tiene al menos tres estados posibles:
    cargando, error o éxito (que a su vez puede ser vacío o con datos). Si
    solo manejas el "camino feliz", el usuario ve una pantalla en blanco o
    rota mientras carga, o no sabe qué pasó si la petición falla.
  - **Ejemplo**:
    ```tsx
    function ProductList() {
      const { data, error, isLoading } = useProducts();

      if (isLoading) return <Spinner />;
      if (error) return <ErrorMessage retry={refetch} />;
      if (data.length === 0) return <EmptyState message="Aún no hay productos" />;

      return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
    }
    ```

- En formularios, usa validación accesible (`aria-invalid`, texto de ayuda
  del error) y atributos `autocomplete` correctos.

  - **Teoría**: `aria-invalid` le informa a los lectores de pantalla que un
    campo tiene un error, y el texto de ayuda asociado (con
    `aria-describedby`) explica cuál. Un `autocomplete` correcto (`email`,
    `name`, `tel`) acelera el llenado del formulario, reduce errores de
    tipeo y es lo que activa el autofill del navegador.
  - **Ejemplo**:
    ```html
    <label for="email">Correo</label>
    <input
      id="email"
      type="email"
      autocomplete="email"
      aria-invalid={hasError}
      aria-describedby="email-error"
    />
    {hasError && <p id="email-error">Ingresa un correo válido</p>}
    ```

- Maneja el estado de conexión (offline/online) en vistas que dependen de
  red constante, si el proyecto lo requiere.

  - **Teoría**: en apps que dependen de red constante (dashboards en tiempo
    real, apps colaborativas), perder la conexión sin avisar hace que el
    usuario piense que la app está "congelada" o que sus acciones se
    guardaron cuando en realidad nunca llegaron al servidor.
  - **Ejemplo**:
    ```tsx
    function ConnectionBanner() {
      const isOnline = useOnlineStatus(); // escucha eventos 'online'/'offline' del navegador
      if (isOnline) return null;
      return (
        <Banner variant="warning">
          Sin conexión — los cambios se guardarán al reconectar
        </Banner>
      );
    }
    ```

- Actualizaciones optimistas con rollback en error, solo cuando la UX lo
  justifique (listas/formularios de alta frecuencia de uso).

  - **Teoría**: una actualización optimista muestra el resultado esperado
    de inmediato, antes de que el servidor confirme, dando sensación de app
    instantánea. Si la petición falla, hay que revertir visualmente ese
    cambio (rollback) para no dejar al usuario viendo un estado que en
    realidad no se guardó. Solo se justifica en interacciones frecuentes
    donde la latencia percibida importa mucho (dar "like", marcar una tarea
    como completada); en acciones poco frecuentes o críticas (pagar,
    enviar un pedido) es mejor esperar la confirmación real.
  - **Ejemplo**:
    ```tsx
    async function toggleLike(id) {
      setLiked(true); // optimista: el cambio se ve de inmediato
      try {
        await api.like(id);
      } catch {
        setLiked(false); // rollback si falla
        toast.error('No se pudo dar like, intenta de nuevo');
      }
    }
    ```

## 6. Testing unitario

- Al implementar o modificar un componente/hook con lógica condicional,
  cálculos, validaciones o manejo de estado observable, escribe un test
  unitario co-localizado si el proyecto tiene test runner configurado.
  Hazlo con las herramientas de testing que ya tenga el proyecto (p. ej.
  Vitest, Jest, React testing library u otra equivalente).

  - **Teoría**: los tests unitarios documentan y protegen el comportamiento
    de la lógica de negocio (cálculos, condicionales, transformaciones de
    estado) frente a regresiones futuras. Sin ellos, un refactor
    aparentemente inocuo puede romper un caso límite que nadie nota hasta
    que llega a producción. "Co-localizado" significa que el test vive
    junto al componente (`Button.tsx` + `Button.test.tsx`), lo que facilita
    encontrarlo y mantenerlo sincronizado con el código que prueba.
  - **Ejemplo**:
    ```tsx
    // useDiscount.ts
    export function calculateDiscount(price: number, isPremium: boolean) {
      if (price <= 0) return 0;
      return isPremium ? price * 0.2 : price * 0.1;
    }

    // useDiscount.test.ts
    import { calculateDiscount } from './useDiscount';

    test('aplica 20% de descuento a usuarios premium', () => {
      expect(calculateDiscount(100, true)).toBe(20);
    });

    test('retorna 0 si el precio es inválido', () => {
      expect(calculateDiscount(-5, false)).toBe(0);
    });
    ```

- Si no es evidente si algo necesita test, pregunta antes de decidir por
  defecto en vez de asumir.
- No fuerces tests en código puramente presentacional sin lógica.

  - **Teoría**: un componente puramente presentacional (recibe props y solo
    renderiza JSX, sin condicionales de negocio ni cálculos) no tiene
    comportamiento que "pueda romperse" más allá de lo visual. Forzar un
    test unitario ahí agrega mantenimiento sin agregar confianza real
    (viola YAGNI — *You Aren't Gonna Need It*).
  - **Ejemplo**:
    ```tsx
    // Puramente presentacional: no necesita test unitario dedicado
    function Avatar({ src, alt }: { src: string; alt: string }) {
      return <img src={src} alt={alt} className="avatar" />;
    }
    ```

## 7. Documentación

- Al crear un componente, evalúa si es necesario documentarlo y, si lo es,
  hazlo con las herramientas de documentación que ya tenga el proyecto (p. ej.
  Storybook, JSDoc, Mintlify u otra equivalente).

  - **Teoría**: documentar tiene valor cuando un componente tiene una API
    pública no trivial (props con combinaciones complejas, efectos
    secundarios, casos de uso poco obvios) que otras personas necesitarán
    consultar sin leer todo el código fuente.
  - **Ejemplo**:
    ```tsx
    /**
     * Muestra un rango de fechas y normaliza el orden si `end` es anterior a `start`.
     * @param start - Fecha de inicio (se intercambia con `end` si es posterior)
     * @param end - Fecha de fin
     */
    export function DateRange({ start, end }: { start: Date; end: Date }) {
      /* ... */
    }
    ```

- Si no es evidente si un componente necesita documentación, pregunta antes de
  decidir por defecto en vez de asumir.
- No documentes por documentar código trivial o autoexplicativo sin API
  pública relevante.

  - **Teoría**: documentar código autoexplicativo agrega ruido y
    mantenimiento — hay que actualizar el comentario cada vez que cambia el
    código, y con frecuencia se desincroniza y termina mintiendo sobre lo
    que el código realmente hace.
  - **Ejemplo**:
    ```tsx
    // No necesita JSDoc: el nombre y la firma ya lo dicen todo
    function Spacer({ size }: { size: number }) {
      return <div style={{ height: size }} />;
    }
    ```

## 8. Monitoreo de errores en producción

- Captura errores de runtime del cliente con la herramienta de monitoreo que
  tenga el proyecto (p. ej. Sentry); no implementes una nueva si no existe
  sin antes preguntar.

  - **Teoría**: sin monitoreo, el equipo se entera de un bug en producción
    solo cuando un usuario lo reporta manualmente (si es que lo hace) — para
    entonces puede llevar horas afectando a muchas personas. Una
    herramienta como Sentry captura el stack trace, el navegador y la
    acción que disparó el error, y agrupa errores repetidos
    automáticamente.
  - **Ejemplo**:
    ```tsx
    // main.tsx
    import * as Sentry from '@sentry/react';

    Sentry.init({ dsn: 'https://...', environment: 'production' });
    ```
    ```tsx
    <ErrorBoundary fallback={<ErrorPage />}>
      <App />
    </ErrorBoundary>
    ```

- No incluyas información sensible (PII, tokens, datos de sesión) en los
  reportes de error enviados al servicio de monitoreo.

  - **Teoría**: la PII (*Personally Identifiable Information* — ver
    Glosario) enviada por accidente a un servicio de monitoreo de terceros
    puede violar regulaciones de privacidad y expone datos sensibles a un
    tercero con menos control que tu propia base de datos.
  - **Ejemplo**:
    ```tsx
    // Malo: el email y el token viajan al dashboard de Sentry
    Sentry.captureException(err, { extra: { userEmail, authToken } });

    // Bueno: solo contexto no sensible
    Sentry.captureException(err, { extra: { userId: hashedUserId, route: '/checkout' } });
    ```

- Distingue errores esperados —ya cubiertos por los estados de loading/error
  de la sección 5— de errores inesperados, que sí deben reportarse.

  - **Teoría**: un error "esperado" (una validación de formulario que
    falla, un 404 al buscar un recurso que no existe) ya tiene su propio
    manejo de UI (ver sección 5) y reportarlo a Sentry como si fuera un bug
    real genera ruido, ocultando entre miles de eventos irrelevantes los
    errores inesperados que sí son bugs reales.
  - **Ejemplo**:
    ```tsx
    try {
      await api.getUser(id);
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true); // esperado: se maneja con estado de UI, no se reporta
        return;
      }
      Sentry.captureException(err); // inesperado: sí se reporta
      setError(true);
    }
    ```

## Glosario

Definiciones de las siglas usadas en la sección 1 (Rendimiento): qué son, para
qué se usan y por qué importan.

- **JS (JavaScript)**: el lenguaje de programación que se ejecuta en el
  navegador para dar interactividad a la página (manejar clics, actualizar
  el DOM, hacer peticiones de red). Importa porque es el recurso más costoso
  de "parsear y ejecutar": cuanto más JS innecesario cargues, más tarda la
  página en volverse interactiva.
- **CSS (Cascading Style Sheets / hojas de estilo en cascada)**: el lenguaje
  que define la apariencia visual (colores, tamaños, layout) de una página
  HTML. Importa en rendimiento porque el navegador debe descargarlo y
  procesarlo antes de poder pintar el contenido (bloquea el render).
- **CPU (Central Processing Unit / unidad central de procesamiento)**: el
  procesador del dispositivo que ejecuta el JS y calcula el layout. Importa
  porque en móviles de gama baja la CPU es limitada; JS excesivo la satura y
  la página se siente lenta aunque la red vaya rápido.
- **LCP (Largest Contentful Paint)**: mide cuánto tarda en aparecer en
  pantalla el elemento visible más grande (normalmente una imagen hero o un
  bloque de texto principal). Es la métrica de Core Web Vitals que aproxima
  "cuándo el usuario siente que la página ya cargó". Bueno: ≤ 2.5s.
- **CLS (Cumulative Layout Shift)**: mide cuánto se mueve el contenido de la
  página después del primer render (por ejemplo, cuando una imagen sin
  dimensiones termina de cargar y empuja el texto de abajo). Importa porque
  un CLS alto genera clics accidentales y sensación de inestabilidad. Bueno:
  ≤ 0.1.
- **INP (Interaction to Next Paint)**: mide cuánto tarda la página en
  responder visualmente a una interacción del usuario (clic, tap, tecla),
  tomando en cuenta todas las interacciones de la visita, no solo la
  primera. Reemplazó a FID en marzo de 2024 por ser una medida más completa
  de la interactividad real. Bueno: ≤ 200ms.
- **FID (First Input Delay)**: predecesora de INP; solo medía el retraso de
  la *primera* interacción del usuario. Se menciona aquí porque sigue
  apareciendo en documentación y herramientas antiguas, aunque ya no es la
  métrica oficial de Core Web Vitals.
- **DNS (Domain Name System)**: el sistema que traduce un dominio
  (`api.miapp.com`) a una dirección IP. Es el primer paso de cualquier
  conexión de red; `preconnect` lo adelanta para ahorrar tiempo en la
  primera petición real.
- **TCP (Transmission Control Protocol)**: el protocolo que establece una
  conexión fiable entre el navegador y el servidor antes de poder enviar
  datos. Es el segundo paso de una conexión de red (después del DNS).
- **TLS (Transport Layer Security)**: el protocolo que cifra la conexión
  (el "candado" de HTTPS). Es el tercer paso de una conexión de red;
  completar DNS + TCP + TLS por adelantado (con `preconnect`) es lo que
  ahorra los ~100-300ms mencionados en la sección de rendimiento.
- **CDN (Content Delivery Network / red de distribución de contenido)**: una
  red de servidores distribuidos geográficamente que sirven archivos
  estáticos (imágenes, fuentes, JS) desde el servidor más cercano al
  usuario, reduciendo la latencia de descarga.
- **API (Application Programming Interface)**: la interfaz mediante la cual
  el frontend pide o envía datos a un servidor (por ejemplo, una API REST).
  Se menciona en rendimiento porque las conexiones a APIs externas también
  se benefician de `preconnect`.
- **RUM (Real User Monitoring / monitoreo de usuarios reales)**: la práctica
  de medir las métricas de rendimiento (LCP, CLS, INP) directamente desde
  los navegadores de los usuarios reales en producción, en vez de solo en
  un entorno de laboratorio (como Lighthouse). Importa porque el rendimiento
  real varía mucho según el dispositivo y la red de cada usuario.
- **WebP / AVIF**: formatos de imagen modernos, alternativos a JPEG/PNG, que
  logran un tamaño de archivo menor con la misma calidad visual percibida.
  AVIF es más reciente y suele comprimir aún mejor que WebP, pero tiene
  algo menos de soporte en navegadores antiguos.

Definiciones de las siglas usadas en el resto de secciones (2 a 8):

- **DOM (Document Object Model)**: la representación en memoria de la
  página HTML como un árbol de objetos que JS puede leer y modificar. Es lo
  que manipulas cuando insertas contenido dinámico, y por eso es el punto
  donde se filtran ataques como XSS si insertas HTML sin sanitizar.
- **WCAG (Web Content Accessibility Guidelines)**: el estándar internacional
  de accesibilidad web, con niveles A, AA y AAA. "AA" es el nivel que
  suelen exigir las leyes y auditorías corporativas; cubre cosas como
  contraste mínimo y navegación por teclado.
- **ARIA (Accessible Rich Internet Applications)**: un conjunto de
  atributos HTML (`role`, `aria-*`) que añaden información semántica para
  tecnologías de asistencia cuando el HTML nativo no la provee por sí solo.
  Debe usarse como último recurso, nunca como reemplazo del HTML semántico.
- **i18n (internationalization / internacionalización)**: la práctica y el
  conjunto de herramientas para que una app soporte múltiples idiomas y
  formatos regionales (fechas, números, moneda) sin cambiar el código.
  "i18n" es un numerónimo: "i" + 18 letras + "n".
- **SEO (Search Engine Optimization)**: el conjunto de prácticas para que
  los motores de búsqueda (Google, Bing) entiendan e indexen mejor una
  página, mejorando su visibilidad en los resultados de búsqueda.
- **XSS (Cross-Site Scripting)**: una vulnerabilidad donde un atacante logra
  ejecutar JS arbitrario en el navegador de otro usuario, normalmente
  inyectando HTML/JS no sanitizado en una página que otros visitan. Puede
  usarse para robar cookies, tokens o suplantar acciones del usuario.
- **CSP (Content Security Policy)**: una cabecera HTTP que restringe desde
  qué orígenes puede una página cargar scripts, estilos o imágenes,
  reduciendo el impacto de un ataque XSS aunque el atacante logre inyectar
  código.
- **SRI (Subresource Integrity)**: un mecanismo que verifica, mediante un
  hash criptográfico, que un archivo cargado desde un CDN externo no ha
  sido alterado respecto al que se esperaba.
- **CSRF (Cross-Site Request Forgery)**: un ataque donde un sitio malicioso
  induce al navegador de un usuario autenticado a enviar una petición no
  deseada a otro sitio (por ejemplo, transferir dinero) aprovechando que
  las cookies de sesión se envían automáticamente. El atributo `SameSite`
  en las cookies mitiga este ataque.
- **CVE (Common Vulnerabilities and Exposures)**: un identificador público
  y estandarizado para una vulnerabilidad de seguridad conocida en un
  software o librería, usado por herramientas como `npm audit` para
  reportar qué dependencias son inseguras.
- **CI (Continuous Integration / integración continua)**: la práctica de
  ejecutar automáticamente builds, tests y otras validaciones (como
  auditorías de accesibilidad o de dependencias) cada vez que se sube
  código, para detectar problemas antes de que lleguen a producción.
- **PII (Personally Identifiable Information / información de identificación
  personal)**: cualquier dato que pueda identificar a una persona (nombre,
  email, teléfono, dirección). Enviarla a servicios de terceros sin
  cuidado puede violar regulaciones de privacidad y exponer a los usuarios.