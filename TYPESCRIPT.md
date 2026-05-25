# Manual de typescript

### Everyday Types (Tipos Cotidianos)

¿Para qué se usa?
Representa los tipos de datos más comunes utilizados en el día a día en JavaScript y las extensiones primitivas de TypeScript. Permite modelar las estructuras básicas de datos como primitivas, arreglos, uniones y aliases.

```typescript
// 1. Primitivos básicos
let esActivo: boolean = true;
let total: number = 150.50;
let nombreCompleto: string = "Sofía";

// 2. Arrays (Arreglos)
let numeros: number[] = [1, 2, 3, 4];
let nombres: Array<string> = ["Luis", "Elena"]; // Sintaxis genérica alternativa

// 3. El tipo 'any' (Evitar su uso cuando sea posible)
// Desactiva la comprobación de tipos por completo para esta variable.
let cualquierCosa: any = 4;
cualquierCosa = "Ahora soy un string";
cualquierCosa.metodoInexistente(); // Compila, pero fallará en tiempo de ejecución.

// 4. Uniones de Tipos (Union Types)
// Permite que una variable tenga más de un tipo posible.
function imprimirId(id: number | string) {
    console.log("El ID es: " + id);
    
    // Para usar métodos específicos de tipo, debemos realizar un narrowing previo
    if (typeof id === "string") {
        console.log(id.toUpperCase()); // Seguro: id es string aquí
    }
}

// 5. Type Aliases (Alias de Tipos)
// Permite crear un nuevo nombre para una forma o unión de tipos.
type Punto = {
    x: number;
    y: number;
};

function centrar(p: Punto) {
    return { x: p.x / 2, y: p.y / 2 };
}

// 6. Interfaces
// Similar a un Type Alias, pero extensible y enfocado a la estructura de objetos.
interface Usuario {
    id: number;
    nombre: string;
}

// Las interfaces se pueden extender fácilmente (Declaration Merging)
interface Usuario {
    rol?: string; // Propiedad opcional
}
```

### Narrowing (Reducción de Tipos)

¿Para qué se usa?
TypeScript analiza el flujo de control de JavaScript utilizando condiciones lógicas para "refinar" o "reducir" un tipo general (como una unión) a un tipo mucho más específico. Esto garantiza operaciones seguras sin necesidad de hacer castings de tipos forzados.

```typescript
// 1. Operador typeof (Type guards)
function formatearPadding(value: string | number) {
    if (typeof value === "number") {
        // TypeScript sabe con certeza que aquí 'value' es un número
        return " ".repeat(value);
    }
    // TypeScript sabe que aquí 'value' solo puede ser un string
    return value.trim();
}

// 2. Operador 'in' para verificar propiedades en objetos
type Pez = { nadar: () => void };
type Ave = { volar: () => void };

function mover(animal: Pez | Ave) {
    if ("nadar" in animal) {
        // Reducido al tipo 'Pez'
        animal.nadar();
    } else {
        // Reducido al tipo 'Ave'
        animal.volar();
    }
}

// 3. Operador 'instanceof' para clases
function registrarFecha(x: Date | string) {
    if (x instanceof Date) {
        console.log(x.toUTCString()); // Reducido a objeto Date
    } else {
        console.log(x.toUpperCase()); // Reducido a string
    }
}

// 4. Predicados de tipo definidos por el usuario (Type Predicates)
// Una función cuyo tipo de retorno es un predicado 'argumento is Tipo'
function esPez(animal: Pez | Ave): animal is Pez {
    return (animal as Pez).nadar !== undefined;
}

function alimentar(animal: Pez | Ave) {
    if (esPez(animal)) {
        animal.nadar(); // TypeScript entiende que es un Pez dentro de este bloque
    }
}
```

### More on Functions (Más sobre Funciones)

¿Para qué se usa?
Las funciones son los bloques de construcción fundamentales de cualquier aplicación. TypeScript permite describir cómo se pueden llamar las funciones mediante expresiones de tipo de función, firmas de llamada, constructores, sobrecargas y parámetros genéricos.

```typescript
// 1. Expresión de Tipo de Función (Function Type Expression)
type EstrategiaDescuento = (total: number) => number;

// Las implementaciones reales (reutilizan el molde)
const descuentoBuenFin: EstrategiaDescuento = (total) => total * 0.85; // 15% menos
const descuentoVIP: EstrategiaDescuento = (total) => total - 100;     // $100 menos sin importar el total

// El uso en la vida real: Una función que recibe otra función como parámetro
function calcularTotalCarrito(subtotal: number, aplicarDescuento: EstrategiaDescuento): number {
    // TypeScript garantiza que aplicarDescuento recibe y devuelve un número
    return aplicarDescuento(subtotal);
}

// Ejecución
const carritoCliente1 = calcularTotalCarrito(1000, descuentoBuenFin); // Devuelve 850
const carritoCliente2 = calcularTotalCarrito(1000, descuentoVIP);     // Devuelve 900

// 2. Firmas de llamada (Call Signatures)
// Se usa si la función tiene propiedades estáticas adicionales adjuntas
interface ContadorConTexto {
    descripcion: string;
    (limite: number): boolean; // La firma de llamada propiamente dicha
}

// Creamos la función base
const miContadorFuncional = (limite: number) => {
    return limite > 10;
};

// Le pegamos la propiedad requerida
miContadorFuncional.descripcion = "Contador de clicks del usuario";

// Lo asignamos a una variable con el tipo de tu interfaz
const contador: ContadorConTexto = miContadorFuncional;

// Ahora puedes hacer ambas cosas:
console.log(contador.descripcion); // Accedes a la propiedad -> "Contador de clicks del usuario"
const resultado = contador(5);     // Lo invocas como función -> devuelve false

// 3. Funciones Genéricas (Generics en Funciones)
// Permiten establecer una relación de tipo entre los argumentos y el retorno
function obtenerPrimerElemento<T>(arr: T[]): T | undefined {
    return arr[0];
}

const primerNumero = obtenerPrimerElemento([10, 20, 30]); // T es 'number'
const primerTexto = obtenerPrimerElemento(["a", "b"]);    // T es 'string'

// 4. Parámetros opcionales y predeterminados
function inicializar(usuario: string, intentos = 0, admin?: boolean) {
    console.log(`Usuario: ${usuario}, Intentos: ${intentos}, Admin: ${admin ?? false}`);
}
// Si admin es null o undefined: El operador se "salta" esa variable y devuelve el lado derecho (false).
const variable = admin ?? false;

// 5. Sobrecarga de Funciones (Function Overloads)
// Permite especificar múltiples formas en las que una función puede ser invocada
function hacerFecha(timestamp: number): Date;
function hacerFecha(m: number, d: number, a: number): Date;
function hacerFecha(mOrTimestamp: number, d?: number, a?: number): Date {
    if (d !== undefined && a !== undefined) {
        return new Date(a, mOrTimestamp, d);
    } else {
        return new Date(mOrTimestamp);
    }
}
```

### Object Types (Tipos de Objetos)

¿Para qué se usa?
En JavaScript, la forma en que agrupamos y pasamos datos es a través de objetos. En TypeScript, representamos esto mediante tipos de objetos, que pueden ser anónimos, a través de interfaces o mediante type aliases, controlando la mutabilidad (lectura/escritura) y propiedades opcionales.

```typescript
// 1. Estructura básica, propiedades opcionales y de solo lectura
interface ConfigConexion {
    readonly host: string; // No se puede modificar una vez inicializado
    puerto: number;
    timeout?: number;      // Propiedad opcional
}

function conectar(config: ConfigConexion) {
    // config.host = "localhost"; // ERROR: Cannot assign to 'host' because it is a read-only property.
    let t = config.timeout ?? 5000; // Asignación por defecto segura
}

// 2. Firmas de índice (Index Signatures)
// Se usa cuando no conocemos de antemano todos los nombres de las propiedades
interface DiccionarioSuscripciones {
    [nombreUsuario: string]: boolean; // Las llaves son cadenas, los valores son booleanos
}

const estadoUsuarios: DiccionarioSuscripciones = {
    "juan123": true,
    "maria_p": false
};

// 3. Intersección de Tipos (Intersection Types)
// Combina múltiples tipos de objetos existentes en uno solo
interface ConPersonalidad {
    saludar: () => void;
}
interface ConIdentidad {
    id: string;
}

type Empleado = ConPersonalidad & ConIdentidad;

const programador: Empleado = {
    id: "EMP-902",
    saludar: () => console.log("Hola, código listo.")
};
```

### Type Manipulation (Manipulación de Tipos)

¿Para qué se usa?
TypeScript permite crear nuevos tipos a partir de tipos existentes de forma dinámica y programática. Es una de las características más potentes del lenguaje, operando como un lenguaje de programación funcional dentro de los propios tipos (meta-programación).

```typescript
// 1. Genéricos Avanzados (Generics)
interface Caja<T> {
    contenido: T;
}
let cajaDeTexto: Caja<string> = { contenido: "Documento Secreto" };

// 2. El operador keyof (Index Blanket)
// Produce una unión de cadenas o literales numéricos a partir de las llaves de un objeto
type Punto3D = { x: number; y: number; z: number };
type Coordenada = keyof Punto3D; // El tipo es equivalente a: "x" | "y" | "z"

// La función 'modificar' solo acepta llaves que existan en 'Producto'
function modificarCoordenada(propiedad: keyof Coordenada, nuevoValor: any) {
  Punto3D[propiedad] = nuevoValor;
}

modificarProducto("x", 1000);   // ✅ Correcto
modificarProducto("xx", 1000); // ❌ Error en el editor: Escribiste mal la propiedad

// 3. El operador typeof en Tipos
//Esto es un objeto real con datos (JavaScript)
const usuarioEjemplo = {
  nombre: "Carlos",
  edad: 30,
  esPremium: true
};
//Usas 'typeof' para copiar su estructura y crear un Tipo (TypeScript)
type TipoUsuario = typeof usuarioEjemplo;
// Al hacer typeof usuarioEjemplo, TypeScript lee el objeto y genera automáticamente esto detrás de escena:typescript// TypeScript infiere esto por ti:
type TipoUsuario = {
  nombre: string;
  edad: number;
  esPremium: boolean;
}
// Ahora puedes usar TipoUsuario para crear nuevos usuarios y asegurarte de que tengan exactamente las mismas propiedades, sin haber escrito la interfaz a mano.typescript// El editor te obligará a cumplir con la misma estructura
const nuevoUsuario: TipoUsuario = {
  nombre: "Ana",
  edad: 25,
  esPremium: false
};

// ❌ Esto dará un error porque escribiste mal la propiedad 'edad'
const usuarioInvalido: TipoUsuario = {
  nombre: "Luis",
  edaaad: 40, 
  esPremium: true
};

// 4. Tipos Indexados (Indexed Access Types)
// Permite buscar un tipo específico en una propiedad de otro tipo
type Persona = { edad: number; nombre: string; vivo: boolean };
type TipoEdad = Persona["edad"]; // El tipo es 'number'

// 5. Tipos Condicionales (Conditional Types)
// Permiten tomar decisiones de tipo basadas en una condición similar a un operador ternario
interface Animal { respirar(): void }
interface Perro extends Animal { ladrar(): void }

type EsUnAnimal<T> = T extends Animal ? true : false;
type PruebaPerro = EsUnAnimal<Perro>; // El tipo resultante es literal: true

// 6. Mapped Types (Tipos Mapeados)
// Tienes un tipo Empleado estricto donde todos los datos son obligatorios:
type Empleado = {
  id: number;
  nombre: string;
  puesto: string;
  salario: number;
};
// Cuando un empleado se registra por primera vez, necesitas todos los datos. Pero si el empleado quiere actualizar su perfil, probablemente solo quiera cambiar un dato (por ejemplo, solo su puesto, o solo su nombre).No quieres obligarlo a enviar todo el objeto otra vez.
type ConvertirEnOpcional<T> = {
  // 1. "keyof T" obtiene las llaves ("id" | "nombre" | "puesto" | "salario")
  // 2. "Propiedad in ..." recorre cada una de esas llaves
  // 3. "?" hace que esa llave sea opcional
  // 4. "T[Propiedad]" mantiene el tipo de dato original (string, number, etc.)
  [Propiedad in keyof T]?: T[Propiedad];
};

// Aplicamos la transformación a Empleado
type DatosParaActualizar = ConvertirEnOpcional<Empleado>;
// Detrás de escena, TypeScript generó esto automáticamente por ti:
type DatosParaActualizar = {
  id?: number;
  nombre?: string;
  puesto?: string;
  salario?: number;
};
// Ahora puedes usar ambos tipos en tus funciones según lo que necesites hacer:
// Objeto original completo (Todos los campos obligatorios)
const empleadoActual: Empleado = {
  id: 452,
  nombre: "Laura",
  puesto: "Desarrolladora",
  salario: 3000
};

// Función para actualizar datos (Usa el tipo mapeado opcional)
function actualizarEmpleado(id: number, cambios: DatosParaActualizar) {
  console.log(`Actualizando empleado ${id} con los siguientes cambios:`, cambios);
  // Aquí unirías los cambios con el empleado actual
}

// ✅ CORRECTO: Solo enviamos el puesto porque Laura fue promovida
actualizarEmpleado(452, { puesto: "Líder Técnica" });

// ✅ CORRECTO: Podemos enviar más de un cambio si es necesario
actualizarEmpleado(452, { nombre: "Laura Pérez", salario: 3500 });

// ❌ ERROR: TypeScript te protege de escribir propiedades que no existen
actualizarEmpleado(452, { direccion: "Calle 123" }); 
```

### El Tipo 'unknown' (Datos unknown)

¿Para qué se usa?
El tipo unknown es la contraparte segura de any. Representa cualquier valor, pero a diferencia de any, TypeScript no te permitirá realizar ninguna operación (llamar a métodos, leer propiedades o instanciar) sobre una variable unknown sin antes verificar rigurosamente su tipo real (Narrowing) o realizar una aserción formal.

```typescript
// 1. Asignación y restricción de operaciones
let valorIncierto: unknown = "Hola, soy secreto";

// valorIncierto.toUpperCase(); // ERROR: Object is of type 'unknown'.
// let valorNumero: number = valorIncierto; // ERROR: Type 'unknown' is not assignable to type 'number'.

// 2. Cómo consumirlo correctamente mediante Narrowing (Comprobación de tipos)
if (typeof valorIncierto === "string") {
    // Dentro de este bloque, TypeScript sabe que es un string seguro
    console.log(valorIncierto.toUpperCase()); // Correcto
}

// 3. Uso en parsing de APIs seguras
function procesarJsonSeguro(jsonString: string): unknown {
    return JSON.parse(jsonString); // JSON.parse devuelve 'any' de forma nativa, pero lo forzamos a 'unknown'
}

const resultadoApi = procesarJsonSeguro('{ "precio": 100 }');

// Para usarlo con seguridad estructural
interface RespuestaPrecio { precio: number }

function esRespuestaPrecio(objeto: any): objeto is RespuestaPrecio {
    return objeto && typeof objeto === "object" && "precio" in objeto;
}

if (esRespuestaPrecio(resultadoApi)) {
    console.log("El precio validado es:", resultadoApi.precio); // Seguro
}
```

### Classes (Clases)

¿Para qué se usa?
TypeScript ofrece soporte completo para la programación orientada a objetos basada en las clases introducidas en ECMAScript 2015, agregando anotaciones de tipo robustas, modificadores de visibilidad (encapsulamiento), clases abstractas e interfaces de implementación.

```typescript
// 1. Modificadores de Acceso y Estructura Base
class CuentaBancaria {
    public readonly numeroCuenta: string; // Accesible desde cualquier lugar, no modificable
    private _saldo: number;              // Solo accesible dentro de esta clase
    protected titular: string;           // Accesible en esta clase y clases hijas

    constructor(numero: string, titular: string, saldoInicial: number) {
        this.numeroCuenta = numero;
        this.titular = titular;
        this._saldo = saldoInicial;
    }

    // Getter para acceder al valor privado de forma controlada
    public get saldoActual(): number {
        return this._saldo;
    }

    // Método público
    public depositar(monto: number): void {
        if (monto > 0) this._saldo += monto;
    }
}

// 2. Herencia y Sobrescritura de Métodos
class CuentaPremium extends CuentaBancaria {
    private beneficioExtra: boolean = true;

    constructor(numero: string, titular: string, saldoInicial: number) {
        super(numero, titular, saldoInicial); // Llama al constructor de la clase base
    }

    // Sobrescritura de métodos (Override)
    public override depositar(monto: number): void {
        // Acceso a propiedad protegida (protected) 'titular' es posible desde la subclase
        console.log(`Aplicando depósito premium para ${this.titular}`);
        super.depositar(monto + 5); // Otorga 5 unidades extra por ser cuenta premium
    }
}

// 3. Clases Abstractas e Interfaces
interface Imprimible {
    imprimirReporte(): string;
}

abstract class ComponenteBase implements Imprimible {
    abstract renderizar(): void; // Método abstracto: debe ser implementado por herencia
    
    imprimirReporte(): string {
        return "Reporte del componente base generado.";
    }
}

// Abstracta
abstract class Animal {
  // Propiedad real con estado
  constructor(public nombre: string) {}

  // Método real: Todos los animales respiran igual, no hay que reescribirlo
  respirar() {
    console.log(`${this.nombre} está respirando.`);
  }

  // Método abstracto: Cada animal lo hace diferente, se define en la subclase
  abstract hacerSonido(): void;
}

class Perro extends Animal {
  hacerSonido() {
    console.log("¡Guau!");
  }
}

// Interfaz
interface Volador {
  velocidadMaxima: number;
  volar(): void; // Sin código, solo la firma
}

interface Nadador {
  nadar(): void;
}

// Un pato puede implementar ambas interfaces a la vez
class Pato implements Volador, Nadador {
  velocidadMaxima = 50;
  volar() { console.log("El pato vuela"); }
  nadar() { console.log("El pato nada"); }
}
```

### Modules (Módulos)

¿Para qué se usa?
Los módulos se ejecutan en su propio alcance, no en el alcance global. Las variables, funciones o clases declaradas en un módulo no son visibles fuera de él a menos que se exporten explícitamente utilizando directivas de exportación de ES. Permite estructurar de forma limpia el código fuente y desacoplar dependencias.

Ejemplos Detallados
Imagine que se tienen dos archivos separados en el proyecto:

Archivo: matematicas.ts (Módulo Exportador)

```typescript
// Exportación nombrada directa (Named Export)
export const PI = 3.14159;

export function calcularAreaCirculo(radio: number): number {
    return PI * radio * radio;
}

// Exportación de tipos o interfaces
export interface OperadorLogico {
    ejecutar(a: boolean, b: boolean): boolean;
}

// Exportación por defecto (Default Export) - Solo una por archivo
export default class CalculadoraEstandar {
    sumar(a: number, b: number): number {
        return a + b;
    }
}
```
Archivo: app.ts (Módulo Importador / Consumidor)

```typescript
// 1. Importación nombrada y renombrado mediante 'as'
import { PI, calcularAreaCirculo, OperadorLogico as IOperador } from "./matematicas";

// 2. Importación por defecto (puedes asignarle cualquier nombre local)
import MiCalculadora from "./matematicas";

// 3. Importación total de un módulo como un objeto (Namespace Import)
import * as TodoMatematicas from "./matematicas";

// Usando las importaciones
const miCalc = new MiCalculadora();
console.log("Suma estándar:", miCalc.sumar(10, 5));

const area = calcularAreaCirculo(5);
console.log(`El área del círculo es: ${area} con el pi: ${PI}`);
```