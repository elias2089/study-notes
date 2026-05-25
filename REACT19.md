# Manual para REACT 19

### Nuevo Root API (cambio fundamental)

React 17
Usaba ReactDOM.render directamente en el elemento root.

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(<App />, document.getElementById('root'));
```
React 18 y 19
Introduce createRoot para habilitar todas las nuevas características.

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```
Explicación:
El nuevo root API permite a React gestionar mejor la concurrencia y preparar el terreno para futuras funcionalidades. Con createRoot se activa el modo concurrente por defecto.

Modo urgente: Son las actualizaciones que requieren una respuesta visual inmediata para que la aplicación se sienta interactiva

Modo concurrente: Es la capacidad que tiene React de priorizar tareas y realizar renderizado interrumpible. Permite que las actualizaciones no urgentes se preparen en segundo plano sin congelar la pantalla 

### Modo concurrente y Transitions

React 17
Todas las actualizaciones eran urgentes. Si tenías una búsqueda que renderizaba una lista grande, bloqueaba el input.

```javascript
// Sin diferenciación de urgencia
const handleChange = (e) => {
  const value = e.target.value;
  setSearchTerm(value);
  setResults(expensiveFilter(value, data)); // bloquea la UI
};
```
React 18 y 19
Puedes marcar actualizaciones como "transiciones" (no urgentes) con startTransition.

Ejemplo 1: Optimización de filtros y renderizados pesados
Cuando escribes en un buscador que filtra una lista larga, el Modo Concurrente te permite mantener el input responsivo mientras el filtrado se calcula en segundo plano.

```javascript
import { useState, useTransition } from 'react';

function BuscadorDeProductos({ productos }) {
  const [busqueda, setBusqueda] = useState('');
  const [listaFiltrada, setListaFiltrada] = useState(productos);
  const [isPending, startTransition] = useTransition();

  const manejarCambio = (e) => {
    const valor = e.target.value;
    setBusqueda(valor); // Actualización URGENTE (el input no se congela)

    // Actualización NO URGENTE (se ejecuta en segundo plano)
    startTransition(() => {
      const filtrado = productos.filter((p) =>
        p.nombre.toLowerCase().includes(valor.toLowerCase())
      );
      setListaFiltrada(filtrado);
    });
  };

  return (
    <div>
      <input type="text" value={busqueda} onChange={manejarCambio} />
      {isPending && <p>Cargando resultados...</p>}
      
      <ul>
        {listaFiltrada.map((producto) => (
          <li key={producto.id}>{producto.nombre}</li>
        ))}
      </ul>
    </div>
  );
}
```
Ejemplo 2: Transiciones asíncronas en Formularios (React 19)Una de las mejores adiciones en React 19 es el soporte nativo para usar funciones asíncronas dentro de las transiciones, simplificando el manejo de estados de carga y errores.

```javascript
import { useState, useTransition } from 'react';
import { actualizarPerfil } from './api';

function FormularioPerfil() {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // React maneja automáticamente isPending a true durante la petición
    startTransition(async () => {
      try {
        await actualizarPerfil(nombre);
      } catch (err) {
        setError('Error al actualizar el perfil');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        disabled={isPending}
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Actualizar'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}
```
### Nuevo hook useId para identificadores únicos

React 17
Si necesitabas un ID único (por ejemplo para aria-describedby), podías usar useRef o librerías externas, pero no había una API nativa estable.

```javascript
// truco manual con useRef y contador global (propenso a errores en SSR)
let nextId = 0;
function MyComponent() {
  const id = useRef(nextId++);
  return <div id={`my-id-${id.current}`}>...</div>;
}
```
React 18 y 19
useId genera IDs únicos y consistentes en cliente y servidor (SSR).

```javascript
import { useId } from 'react';

function MyComponent() {
  const id = useId();
  return (
    <div>
      <label htmlFor={`${id}-input`}>Nombre</label>
      <input id={`${id}-input`} type="text" />
    </div>
  );
}
```
Explicación:

El hook useId se utiliza en React para generar identificadores únicos estables que evitan colisiones de IDs en el DOM. Es fundamental para mejorar la accesibilidad (a11y) al vincular etiquetas `<label>` con sus respectivos `<input>`, y resulta indispensable al renderizar aplicaciones con Server-Side Rendering (SSR).
Si necesitas varios identificadores dentro de un mismo componente, puedes tomar el mismo ID base y añadirle sufijos.
Se recomienda no usarlo:

No lo uses para las propiedades key en listas: React requiere que las keys provengan directamente de la información de tus datos (ej. un ID de base de datos) para rastrear elementos dinámicos.

No lo uses para claves de caché en el hook use(): Las claves de caché también deben basarse en los datos, ya que el valor de useId puede cambiar durante el renderizado.

### Suspense en servidor (SSR con Streaming)

React 17
El SSR era todo o nada: esperabas a que toda la página estuviera lista antes de enviar HTML al cliente. Esto causaba un retraso inicial largo.

React 18 y 19
Con renderToPipeableStream puedes enviar HTML por partes (streaming) y usar `<Suspense>` para envolver partes lentas.

```javascript
import { renderToPipeableStream } from 'react-dom/server';

const stream = renderToPipeableStream(<App />, {
  onShellReady() {
    stream.pipe(res); // envía el esqueleto
  },
  onError(x) {
    // manejo de errores
  }
});
```
Explicación:

HTML progresivo: El servidor envía el HTML básico y los marcadores de carga (fallback) de `<Suspense>` inmediatamente.

Carga en segundo plano: Mientras el usuario ya ve la página, el servidor sigue procesando los componentes pesados o que requieren bases de datos.

Reemplazo en el cliente: Una vez que la información está lista, el servidor transmite el HTML de esa sección específica al navegador, y React reemplaza el marcador de carga con el contenido final.

Hidratación selectiva: React hidrata (vuelve interactivos) los componentes a medida que están disponibles, evitando que un componente lento con mucha carga de JavaScript congele el resto de la interfaz.

### Nuevo Strict Mode (comportamiento diferente)

React 17
El modo estricto ejecutaba efectos extra para detectar efectos secundarios no deseados, pero solo en desarrollo.

React 18 y 19
StrictMode monta y desmonta automáticamente cada componente dos veces en desarrollo (no solo efectos). Esto simula la futura capacidad de "reutilizar el DOM" y ayuda a detectar efectos mal escritos.

```javascript
// Strict Mode más agresivo
<React.StrictMode>
  <App />
</React.StrictMode>
```
Explicación:

Si en useEffect no limpias bien los eventos o timeouts, en React 18 se verán duplicados, obligándote a escribir código más robusto.

### Automatic Batching mejorado

React 17
Solo agrupaba actualizaciones dentro de manejadores de eventos de React, pero no dentro de promesas, timeouts o eventos nativos.

```javascript
// No batching aquí
const handleClick = () => {
  setCount(1);   // 1 render
  setTimeout(() => {
    setFlag(true); // 2º render (separado)
  }, 1000);
};
```

React 18 y 19
El batching es automático en cualquier lugar, incluso en setTimeout, promesas o callbacks nativos.

```javascript
// Aambos en el mismo render
const handleClick = () => {
  setCount(1);   
  setTimeout(() => {
    setFlag(true); // mismo lote de actualización
  }, 1000);
};
```
Explicación:

Mejora el rendimiento porque no renderiza dos veces entre medias.

### El Nuevo Compilador de React (React Compiler)

React 18
Dependías completamente de hooks como useMemo, useCallback y React.memo para evitar renders innecesarios. El desarrollador debía optimizar manualmente.

```javascript
// Optimización manual tediosa
import React, { useMemo, useCallback } from 'react';

function ProductList({ products, onSelect }) {
  const memoizedProducts = useMemo(() => {
    return products.filter(p => p.price > 10);
  }, [products]);

  const handleSelect = useCallback((product) => {
    onSelect(product);
  }, [onSelect]);

  return memoizedProducts.map(p => (
    <ProductItem key={p.id} product={p} onSelect={handleSelect} />
  ));
}
```

React 19
El compilador analiza tu código y automaticamente memoriza componentes, hooks y valores. Puedes eliminar casi todos los useMemo y useCallback.

```javascript
// El compilador optimiza por ti
function ProductList({ products, onSelect }) {
  // El compilador detecta que esto debe memorizarse
  const filteredProducts = products.filter(p => p.price > 10);

  // Incluso las funciones en línea se optimizan automáticamente
  return filteredProducts.map(p => (
    <ProductItem key={p.id} product={p} onSelect={onSelect} />
  ));
}
```
Explicación:

El compilador transforma tu código durante el build, añadiendo automáticamente las memorizaciones necesarias. Esto elimina errores comunes como dependencias faltantes en useEffect, optimiza sin sobrecarga mental y reduce el código boilerplate drásticamente.

### Actions (Nuevo patrón para manejo de formularios y mutaciones)

React 18
Manejar formularios requería estado manual, loading states y manejo de errores. Con React Query o similar, pero sin API nativa.

```javascript
// Formulario tradicional con muchas líneas
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginAPI(email, password);
      if (!res.ok) throw new Error('Login failed');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={loading}>Login</button>
      {error && <div>{error}</div>}
    </form>
  );
}
```

React 19
Introduce el hook useActionState y `<form action>` nativo para manejar mutations asíncronas automáticamente.

```javascript
// Con Actions (mucho más declarativo)
import { useActionState } from 'react';

async function loginAction(prevState, formData) {
  try {
    const email = formData.get('email');
    const password = formData.get('password');
    const res = await loginAPI(email, password);
    if (!res.ok) throw new Error('Login failed');
    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
}

function LoginForm() {
  const [state, submitAction, isPending] = useActionState(loginAction, null);

  return (
    <form action={submitAction}>
      <input type="email" name="email" required />
      <input type="password" name="password" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Logging in...' : 'Login'}
      </button>
      {state?.error && <div>{state.error}</div>}
    </form>
  );
}
```
Explicación:

Las Actions integran automáticamente:
* Manejo del estado pending
* Envío de formularios sin prevenir e.preventDefault()
* Compatibilidad con SSR y Progressive Enhancement

### useOptimistic (UI optimista simplificada)

React 18
Para UI optimista (mostrar el resultado antes de que el servidor responda), necesitabas estado manual, rollbacks y manejo de errores complejo.

```javascript
// UI optimista manual y propensa a errores
function TodoList() {
  const [todos, setTodos] = useState([]);
  const [optimisticTodos, setOptimisticTodos] = useState([]);
  
  const addTodo = async (text) => {
    const optimisticId = `temp-${Date.now()}`;
    const optimisticTodo = { id: optimisticId, text, status: 'optimistic' };
    
    setOptimisticTodos(prev => [...prev, optimisticTodo]);
    
    try {
      const realTodo = await saveToAPI(text);
      setTodos(prev => [...prev, realTodo]);
      setOptimisticTodos(prev => prev.filter(t => t.id !== optimisticId));
    } catch (error) {
      setOptimisticTodos(prev => prev.filter(t => t.id !== optimisticId));
    }
  };
  
  return <div>{optimisticTodos.map(...)} {todos.map(...)}</div>;
}
```

React 19
 Es un hook de React que permite actualizar la interfaz de usuario de forma inmediata tras una acción, asumiendo que esta tendrá éxito, sin esperar la respuesta del servidor. Si la operación falla, React revierte automáticamente la interfaz al estado real.

```javascript
// UI optimista con useOptimistic
import { useOptimistic } from 'react';

function TodoList() {
  const [todos, setTodos] = useState([]);
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (currentTodos, newTodo) => [...currentTodos, newTodo]
  );

  const addTodo = async (formData) => {
    const text = formData.get('text');
    addOptimisticTodo({ text, status: 'pending' });
    
    const realTodo = await saveToAPI(text);
    setTodos(prev => [...prev, realTodo]);
  };

  return (
    <form action={addTodo}>
      <input name="text" />
      <button type="submit">Add</button>
      <div>
        {optimisticTodos.map(todo => (
          <div key={todo.id || todo.text}>
            {todo.text} {todo.status === 'pending' && '⏳'}
          </div>
        ))}
      </div>
    </form>
  );
}
```
Explicación:

useOptimistic acepta el estado real y una función que define cómo se transforma el estado optimistamente. React automáticamente revierte al estado real cuando la acción asíncrona falla o se completa.

### useFormStatus (Acceso al estado del formulario padre)

React 18
No había forma de que un componente hijo supiera si su formulario padre estaba enviándose.

```javascript
// Need to pass loading state manually
function SubmitButton({ isPending }) {
  return <button disabled={isPending}>Submit</button>;
}

function Form() {
  const [isPending, startTransition] = useTransition();
  // ... pasar isPending al botón
}
```

React 19
 Cualquier componente dentro de un <form> puede conocer el estado del formulario con useFormStatus.

```javascript
// useFormStatus automático
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}

function ProfileForm() {
  return (
    <form action={updateProfile}>
      <input name="name" />
      <SubmitButton /> {/* Sabe automáticamente cuando el form está enviando */}
    </form>
  );
}
```
Explicación:

useFormStatus lee el contexto del formulario padre sin necesidad de pasar props manualmente. Es especialmente útil para componentes reutilizables como botones, indicadores de carga o mensajes de estado.

### use (Nuevo hook para consumir Promesas y Contextos)

React 18
Para leer una promesa en un componente, necesitabas useEffect o Suspense con librerías externas.

```javascript
// No podías leer promesas directamente
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  return user ? <div>{user.name}</div> : <div>Loading...</div>;
}
```

React 19
 Cualquier componente dentro de un <form> puede conocer el estado del formulario con useFormStatus.

```javascript
// Ejemplo 1:
// use con promesas
import { use } from 'react';
// Función que retorna una promesa (puede venir de un data fetching library)
const userPromise = fetchUser('123');

function UserProfile() {
  // Nota: use puede llamarse condicionalmente y dentro de loops
  const user = use(userPromise);
  return <div>{user.name}</div>;
}

// Context con use (más flexible que useContext)
const ThemeContext = React.createContext('light');

function Button() {
  // Puedes usarlo condicionalmente!
  let theme = 'light';
  if (someCondition) {
    theme = use(ThemeContext);
  }
  return <button className={theme}>Click</button>;
}

// Ejemplo 2:
import React, { use } from 'react';

// Función asíncrona con lógica interna de errores
function obtenerDatosSeguros() {
  return fetch('/api/datos-inestables')
    .then(res => {
      if (!res.ok) throw new Error("Error en la respuesta de red");
      return res.json().then(datos => ({ exito: true, datos }));
    })
    .catch(error => {
      // AQUÍ VA TU LÓGICA PERSONALIZADA
      console.warn("Ejecutando lógica de recuperación para:", error.message);
      
      // Devolvemos un estado de error controlado en lugar de romper la app
      return { exito: false, error: error.message };
    });
}

function ComponenteDatos({ promesa }) {
  // use resuelve el objeto seguro (sea éxito o error controlado)
  const resultado = use(promesa);

  // Manejas la lógica visual directamente con un condicional
  if (!resultado.exito) {
    return <p>No pudimos cargar la información: {resultado.error}</p>;
  }

  return <h1>Información cargada: {resultado.datos.nombre}</h1>;
}

export default function App() {
  const promesaDatos = obtenerDatosSeguros();

  return (
    <React.Suspense fallback={<p>Cargando...</p>}>
      <ComponenteDatos promesa={promesaDatos} />
    </React.Suspense>
  );
}

```
Explicación:

use es revolucionario porque:
* Puede llamarse dentro de if, loop o funciones normales
* Funciona con Suspense automáticamente
* No es un hook (aunque se llame hook), lo que lo hace más flexible
* Acepta cualquier promesa, no solo las de React

### ref como prop por defecto (eliminación de forwardRef)

React 18
Para pasar un ref a un componente, necesitabas usar obligatoriamente forwardRef.

```javascript
// boilerplate tedioso
const FancyButton = React.forwardRef((props, ref) => (
  <button ref={ref} className="fancy-button">
    {props.children}
  </button>
));
```

React 19
Ahora ref es una prop como cualquier otra. ¡Adiós forwardRef!

```javascript
// React 19 - mucho más simple
function FancyButton({ children, ref, ...props }) {
  return (
    <button ref={ref} className="fancy-button" {...props}>
      {children}
    </button>
  );
}

// Uso normal
function App() {
  const buttonRef = useRef();
  return <FancyButton ref={buttonRef}>Click me</FancyButton>;
}
```
Explicación:

Este cambio simplifica drásticamente la API de React. Los componentes ahora son más predecibles y consistentes, ya que ref se comporta como key o children.

### Mejoras en Suspense y Server Components (estables)

React 18
Suspense existía pero era limitado. Los Server Components eran experimentales.

React 19
Server Components y Suspense son estables y están completamente integrados con Actions.

```javascript
// Server Component (corre solo en servidor)
async function ProductList() {
  // Esto solo corre en servidor, nunca se envía al cliente
  const products = await db.products.findMany();
  
  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// Client Component con Suspense
import { Suspense } from 'react';

function App() {
  return (
    <div>
      <h1>Our Store</h1>
      <Suspense fallback={<div>Loading products...</div>}>
        <ProductList /> {/* Este es Server Component */}
      </Suspense>
    </div>
  );
}
```
Explicación:

Los Server Components eliminan el JS del cliente, reducen el bundle size, permiten acceso directo a la base de datos y mejoran el SEO. Con Suspense, el cliente ve un fallback mientras el servidor prepara la data.

### Tabla comparativa

| Característica | React 18 | React 19 |
| :--- | :---: | ---: |
| Optimización de renders | Manual con useMemo/useCallback | Automática con React Compiler |
| Formularios asíncronos | Estado manual + useTransition | useActionState + <form action> |
| UI optimista | Estado complejo manual | useOptimistic |
| Estado del formulario | Props manuales | useFormStatus (contexto automático) |
| Consumo de promesas | Solo en useEffect o librerías externas | Hook use (condicional y flexible) |
| forwardRef | Obligatorio para pasar refs	ref | como prop normal (eliminado forwardRef) |
| Server Components | Experimental | Estable y completamente integrado |
| Suspense | Parcial (solo lazy y data fetching limitado) | Full soporte con Server Components y Actions |
| Tamaño del bundle | Base normal | Reducción significativa (menos código boilerplate) |
