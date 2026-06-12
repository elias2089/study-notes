# Manual para Tailwind css 4.3

### Instalación

#### Crear proyecto

```bash
npm create vite@latest mi-proyecto-tailwind -- --template vanilla
cd mi-proyecto-tailwind
```
#### Instala Tailwind v4.3 y su plugin para Vite

```bash
npm install tailwindcss @tailwindcss/vite
```
* tailwindcss: Es el núcleo del framework.
* @tailwindcss/vite: Es el plugin oficial que permite a Vite procesar Tailwind de forma nativa sin necesidad de PostCSS extra. En v3 necesitabas instalar postcss y autoprefixer aparte. Aquí ya no

#### Configura Vite (vite.config.js)

```javascript
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite' // Importa el plugin

export default defineConfig({
  plugins: [
    tailwindcss(), // Actívalo aquí
  ],
})
```

#### Importa Tailwind en tu CSS (src/style.css)

```css
@import "tailwindcss";
```
¡Eso es todo! No hay archivos de configuración JS, no hay comandos init. Con solo esa línea, ya tienes Tailwind funcionando

### La Nueva Forma de Configurar: @theme (Adiós config.js)

En v3, querer añadir un color personalizado implicaba ir al tailwind.config.js, aprender sintaxis de objeto, hacer extend... Era verboso.

En v4.3, la configuración es semántica y vive en CSS usando la directiva @theme.

```css
/* style.css */
@import "tailwindcss";

@theme {
  /* 1. Definir un color primario */
  --color-primary: #8b5cf6;
  /* Variante más clara para hovers */
  --color-primary-light: #a78bfa;
  
  /* 2. Definir una fuente personalizada */
  --font-display: "Poppins", sans-serif;
  
  /* 3. Definir un tamaño de texto específico con línea y peso */
  --text-hero: 4rem;
  --text-hero--line-height: 1.2;
  --text-hero--font-weight: 700;
}
```
¿Cómo se usa en el HTML?

```html
<h1 class="font-display text-hero text-primary">
  Hola Tailwind v4.3
</h1>
<button class="bg-primary hover:bg-primary-light px-4 py-2 rounded">
  Botón
</button>
```
* --color-primary: En v3, las variables CSS no generaban utilities automáticas. Ahora, al definir --color-primary, Tailwind genera automáticamente bg-primary, text-primary, border-primary .
* --text-hero--line-height: Fíjate en el doble guión medio. Es la sintaxis para añadir propiedades asociadas a una utility. --text-hero define el font-size, y --text-hero--line-height define su line-height.

### ¡Lo Nuevo en v4.3 (Abril/Mayo 2026)!

Acabamos de recibir funcionalidades que antes forzaban a instalar plugins de terceros o escribir CSS custom.

#### Scrollbars Nativas (Sin plugins)

Ya no necesitas tailwind-scrollbar. Ahora es nativo:

```html
<div class="h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-200">
  <!-- Contenido largo -->
</div>
```
* scrollbar-thin: Hace la barra delgada.
* scrollbar-thumb-blue-500: Colorea la parte móvil de la barra.
* scrollbar-track-gray-200: Colorea el carril (track)

#### Container Queries por Altura (@container-size)

Antes solo se podía reaccionar al ancho del contenedor padre. Ahora también a la altura.

```html
<!-- El padre define que es un contenedor de tamaño -->
<div class="@container-size h-96 border p-4">
  <!-- El hijo reacciona si la altura del padre es mayor a 200px -->
  <div class="@[block-size>200px]:bg-green-100 p-2">
    Si este recuadro tiene más de 200px de alto, se pone verde.
  </div>
</div>
```

#### Zoom (Sí, el zoom de CSS)

Un utility para escalar elementos sin usar transform: scale() (que afecta el layout circundante).

```html
<div class="zoom-150 p-8 bg-yellow-100">
  Este div se ve un 50% más grande, pero ocupa el mismo espacio en el flujo del documento.
</div>
```

### Buenas Prácticas

#### Usa @utility para componentes complejos
Si repites mucho una combinación, crea tu propia utility.

```css
/* style.css */
@utility card-container {
  background-color: var(--color-gray-100);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-lg);
  @variant dark {
    background-color: var(--color-gray-800);
  }
}
```

### Hover, Focus y otros estados

#### Sintaxis básica (igual que antes)

```html
<button class="bg-blue-500 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300">
  Click me
</button>
```
* hover: → Cuando el mouse está encima.
* focus: → Cuando el elemento tiene foco (tab, clic).
* active: → Cuando se está presionando.
* disabled: → Cuando está deshabilitado.

#### Estados más comunes con ejemplos prácticos

##### hover - interacción al pasar el mouse

```html
<a href="#" class="text-gray-700 hover:text-blue-600 hover:underline">
  Enlace con hover
</a>
```
* hover:text-blue-600 → cambia el color del texto al pasar el mouse.
* hover:underline → agrega subrayado.

##### focus - accesibilidad para teclado

```html
<input type="text" class="border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
```
* focus:outline-none → quita el borde por defecto (útil solo si pones un ring).
* focus:ring-2 → agrega un anillo de 2px.
* focus:ring-indigo-500 → color del anillo.

##### active - mientras haces clic

```html
<button class="bg-green-500 active:bg-green-700 transform active:scale-95 transition">
  Presióname
</button>
```
* active:scale-95 → reduce ligeramente el tamaño al hacer clic.

##### disabled - estado deshabilitado

```html
<button disabled class="bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed">
  No disponible
</button>
```
* disabled:opacity-50 → hace el botón semi-transparente.
* disabled:cursor-not-allowed → cambia el cursor a "no permitido".

#### Estados combinados
Puedes encadenar múltiples estados:

```html
<button class="bg-blue-500 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 active:bg-blue-800 disabled:opacity-50">
  Enviar
</button>
```
Orden sugerido (no obligatorio, pero sí lógico):
disabled: → hover: → focus: → active:

#### Estados en elementos padres (group)
Sigue funcionando igual, pero con CSS nativo sin config.js:

```html
<div class="group p-4 border rounded-lg hover:bg-gray-50">
  <h3 class="text-gray-800 group-hover:text-blue-600">Título</h3>
  <p class="text-gray-500 group-hover:text-gray-700">Descripción</p>
</div>
```
* group → marca el contenedor padre.
* group-hover: → aplica estilos a los hijos cuando el padre está en hover.

Ejemplo con focus en el padre

```html
<div class="group focus-within:ring-2 focus-within:ring-blue-400">
  <input type="text" class="border p-2">
  <p class="text-gray-400 group-focus-within:text-gray-800">Ayuda contextual</p>
</div>
```
#### Estados basados en datos (como aria-*)
Tailwind v4.3 soporta aria-* y data-* sin configuración:

```html
<button aria-disabled="true" class="aria-disabled:opacity-50 aria-disabled:cursor-not-allowed">
  Botón por ARIA
</button>

<div data-active="true" class="data-active:bg-yellow-100 data-active:border-yellow-400">
  Panel dinámico
</div>
```
* aria-disabled: → útil para componentes accesibles.
* data-active: → ideal para estados manejados por JS.

#### Transiciones suaves
Siempre agrega transition para suavizar el cambio de estado:

```html
<button class="bg-blue-500 hover:bg-blue-700 transition duration-200 ease-in-out">
  Smooth hover
</button>
```
* transition → habilita transiciones en propiedades como color, bg, border, etc.
* duration-200 → 200ms de duración.
* ease-in-out → aceleración suave.

#### Personalizar estados con @theme (sin config.js)
Si necesitas un estado personalizado, lo defines en tu CSS global:

```css
@theme {
  /* Nuevo estado personalizado */
  @utility custom-hover {
    &:hover {
      background-color: var(--color-custom);
    }
  }
}
```
Pero para prefijos de estado (como loading:), usas @variant:

```css
@variant loading {
  &:where([data-loading="true"]) {
    @apply opacity-50 cursor-wait;
  }
}
```
Luego en HTML:

```html
<button data-loading="true" class="loading:opacity-50 loading:cursor-wait">
  Cargando...
</button>
```
Esto no es necesario para hover/focus/active/disabled que ya vienen nativos.

### Sistema Responsivo

#### Breakpoints predeterminados (¡sin config file!)

```css
/* Estos son los breakpoints que Tailwind 4.3 usa por defecto */
/* No necesitas definirlos, vienen integrados */

@custom-variant sm   (@min-width: 40rem);      /* 640px  */
@custom-variant md   (@min-width: 48rem);      /* 768px  */
@custom-variant lg   (@min-width: 64rem);      /* 1024px */
@custom-variant xl   (@min-width: 80rem);      /* 1280px */
@custom-variant 2xl  (@min-width: 96rem);      /* 1536px */
```

#### Sintaxis básica: {breakpoint}:{utility}

```html
<!-- Ejemplo práctico -->
<div class="
  text-sm           <!-- Por defecto (móvil): texto pequeño -->
  md:text-base      <!-- md (768px+): texto normal -->
  lg:text-lg        <!-- lg (1024px+): texto grande -->
  xl:text-xl        <!-- xl (1280px+): texto extra grande -->
">
  Texto responsivo
</div>
```
Significado de cada parte:
* text-sm: se aplica desde 0px hasta el próximo breakpoint
* md:text-base: se aplica desde 768px en adelante (sobrescribe text-sm)
* lg:text-lg: desde 1024px sobrescribe a md:text-base
* Cada breakpoint incluye su valor mínimo hacia arriba (mobile-first)

#### Patrón Mobile-First (Obligatorio en Tailwind)

```html
<div class="
  w-full           <!-- Móvil: ancho completo -->
  sm:w-3/4         <!-- 640px+: 75% ancho -->
  md:w-1/2         <!-- 768px+: 50% ancho -->
  lg:w-1/3         <!-- 1024px+: 33.33% ancho -->
">
  Contenido responsivo
</div>
```
#### Grid responsivo

##### Estructura Básica

```html
<!-- Contenedor Grid -->
<div class="grid grid-cols-3 gap-4">
  <div>1</div>
  <div>2</div>
  <div>3</div>
</div>
```
Desglose:
* grid - Activa CSS Grid en el contenedor
* grid-cols-3 - Crea 3 columnas iguales (1fr cada una)
* gap-4 - Espacio de 1rem (16px) entre celdas

##### Grid Responsivo (Mobile First)

```html
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  <div class="bg-blue-100 p-4">Card 1</div>
  <div class="bg-blue-100 p-4">Card 2</div>
  <div class="bg-blue-100 p-4">Card 3</div>
  <div class="bg-blue-100 p-4">Card 4</div>
</div>
```
Breakpoints en Tailwind v4.3:
* grid-cols-1 - Mobile: 1 columna (predeterminado)
* sm:grid-cols-2 - ≥640px: 2 columnas
* md:grid-cols-3 - ≥768px: 3 columnas
* lg:grid-cols-4 - ≥1024px: 4 columnas
* xl:grid-cols-5 - ≥1280px: 5 columnas
* 2xl:grid-cols-6 - ≥1536px: 6 columnas

##### Grid con tamaños de columna específicos

```html
<!-- Columnas con proporciones diferentes -->
<div class="grid grid-cols-[200px_1fr_250px] gap-4">
  <div class="bg-gray-200">Sidebar (200px fijo)</div>
  <div class="bg-gray-300">Content (1fr flexible)</div>
  <div class="bg-gray-200">Widgets (250px fijo)</div>
</div>
```
* [200px] - Valor fijo en píxeles
* [1fr] - Fracción del espacio restante
* [250px] - Valor fijo

##### Grid Responsivo con Auto-fill

```html
<div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
  <div class="bg-purple-100 p-6">Item 1</div>
  <div class="bg-purple-100 p-6">Item 2</div>
  <div class="bg-purple-100 p-6">Item 3</div>
   <aside class="hidden lg:block lg:col-span-3 bg-gray-200 p-4">
    Widgets
  </aside>
</div>
```
* repeat(auto-fill,...) - Crea tantas columnas como quepan
* minmax(250px,1fr) - Mínimo 250px, máximo flexible
* col-span-{n} - Cuántas columnas ocupa un elemento
* hidden lg:block - Oculto en mobile, visible en desktop

#### Navegación responsive (móvil: vertical, escritorio: horizontal)

```html
<nav class="
  flex 
  flex-col        <!-- Móvil: columna vertical -->
  gap-2 
  p-4 
  sm:flex-row     <!-- 640px+: fila horizontal -->
  sm:gap-6 
  md:gap-8        <!-- 768px+: más separación -->
  lg:justify-center <!-- 1024px+: centrado horizontal -->
">
  <a href="#" class="hover:text-blue-600">Inicio</a>
  <a href="#" class="hover:text-blue-600">Productos</a>
  <a href="#" class="hover:text-blue-600">Servicios</a>
  <a href="#" class="hover:text-blue-600">Contacto</a>
</nav>
```

#### Tipografía fluida con múltiples breakpoints

```html
<article class="
  text-sm         <!-- Móvil: 14px -->
  leading-relaxed <!-- Interlineado 1.625 -->
  
  md:text-base    <!-- 768px+: 16px -->
  md:leading-normal <!-- md: 1.5 -->
  
  lg:text-lg      <!-- 1024px+: 18px -->
  lg:leading-snug <!-- lg: 1.375 -->
  
  xl:text-xl      <!-- 1280px+: 20px -->
  xl:font-light   <!-- xl: fuente más delgada -->
">
  <h1 class="
    text-xl 
    font-bold 
    md:text-2xl 
    lg:text-3xl 
    xl:text-4xl
  ">
    Título del artículo
  </h1>
  <p>Contenido con tipografía que mejora en pantallas más grandes...</p>
</article>
```

#### Buenas Prácticas

##### Usa el sufijo max- para breakpoints "hasta"
```html
<!-- Tailwind 4.3 introduce variantes max-* -->
<div class="
  max-sm:hidden    <!-- Oculto solo en móvil (hasta 639px) -->
  md:block         <!-- Visible desde 768px -->
">
  Contenido condicional
</div>
```

##### Aprovecha max-md: para diseños híbridos

```html
<div class="
  grid 
  grid-cols-2      <!-- Tablet y escritorio -->
  max-md:grid-cols-1 <!-- Móvil: 1 columna (menor a 768px) -->
  gap-4
">
  <!-- 2 columnas en tablet/escritorio, 1 en móvil -->
</div>
```

##### Uso de container con padding responsivo

```html
<!-- container aplica max-width según breakpoint -->
<div class="
  container 
  mx-auto         <!-- Centrado horizontal -->
  px-4            <!-- Padding móvil -->
  sm:px-6         <!-- 640px+: más padding -->
  lg:px-8         <!-- 1024px+: aún más padding -->
">
  Contenido centrado con márgenes automáticos
</div>
```

##### Tabla de equivalencias

ninguno)	0px	Móvil por defecto	Teléfonos (≤640px)
sm:	640px	Teléfonos grandes	Fold, Galaxy, iPhone Plus
md:	768px	Tablets vertical	iPad, Surface Duo
lg:	1024px	Tablets horizontal / laptop pequeña	iPad horizontal, Chromebook
xl:	1280px	Escritorio estándar	MacBook Air, Dell XPS
2xl:	1536px	Pantallas grandes	iMac 27", monitores 4K

| Breakpoint | Mínimo | Se aplica desde | Caso típico |
| :--- | :---: | ---: | ---: |
| ninguno | 0px | Móvil por defecto | Teléfonos (≤640px) |
| sm | 640px | Teléfonos grandes | Teléfonos (≤640px) |
| md | 768px | Tablets vertical | Teléfonos (≤640px) |
| lg | 1024px | Tablets horizontal / laptop pequeña | Teléfonos (≤640px) |
| xl | 1280px | Escritorio estándar | Teléfonos (≤640px) |
| 2xl | 1536px | Pantallas grandes | Teléfonos (≤640px) |

