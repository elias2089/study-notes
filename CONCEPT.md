# Conceptos

## npm vs Yarn vs pnpm

### El veredicto del senior: ¿Cuál elegir?

pnpm: Es el ganador indiscutible en rendimiento y gestión de disco. Su enfoque de "hard links" y contenido direccionable lo hace ridículamente rápido, especialmente en monorepos o proyectos con muchas dependencias. Además, resuelve el problema de las "phantom dependencies" (dependencias fantasma) que tanto dolor de cabeza dan en npm y Yarn Classic. Es el futuro

npm: Sigue siendo el estándar de facto porque viene con Node.js. No es malo, pero es notablemente más lento y propenso a tener un node_modules gigante lleno de archivos duplicados. Si trabajas en un equipo que no quiere complicarse o en un proyecto legacy, npm cumple su función

Yarn (Berry o v2+): Fue una revolución cuando salió, pero hoy está en un punto raro. La funcionalidad Plug'n'Play (PnP) es teóricamente genial, pero rompe constantemente con herramientas que no esperan una estructura de node_modules. Si no usas PnP, Yarn es más lento que pnpm. Su único punto fuerte real hoy es yarn dlx y ciertos plugins, pero pnpm ya tiene características similares o mejores

### Instalación y primeros pasos

Vamos a lo concreto. Olvida las formas "globales" tradicionales si usas Node.js moderno (v16.13 o superior), tenemos Corepack. Es la herramienta oficial para gestionar package managers sin tenerlos instalados globalmente en el sistema.

#### Configurando Corepack (Recomendado para equipos)

Primero, activamos Corepack y lo preparamos con las versiones exactas. Esto asegura que todo el equipo use la misma versión del package manager.

```bash
# Habilita Corepack (viene con Node.js)
corepack enable

# Prepara pnpm para el proyecto actual
corepack prepare pnpm@latest --activate
```
#### Instalación a la antigua (para tu máquina local o CI)

```bash
# NPM
npm install -g npm@latest

# YARN (Classic v1)
npm install -g yarn

# PNPM (Standalone)
npm install -g pnpm
# O el script universal en Linux/Mac:
curl -fsSL https://get.pnpm.io/install.sh | sh -
# En Windows (PowerShell):
iwr https://get.pnpm.io/install.ps1 -useb | iex
```
### Como funciona

#### npm y Yarn Classic (Hoisting - Alzado)

Usan un algoritmo que "aplana" las dependencias en la raíz de node_modules. Si instalas Express, lo ponen en node_modules/express. Si Express depende de accepts, intentan ponerlo en node_modules/accepts. Esto causa:

* Falta de aislamiento: Puedes importar accepts en tu código aunque no lo hayas instalado (phantom dependency).
* Duplicación: Si dos paquetes requieren versiones diferentes de lodash, suben la versión más alta y la otra se anida, creando estructuras monstruosas

#### pnpm (Content-addressable store + Symlinks)

Funciona como un sistema de archivos duro.

* Store (Almacén): Todos los paquetes que instalas en tu máquina se guardan en una sola ubicación (ej. ~/.pnpm-store). Si instalas lodash en 50 proyectos, ocupa espacio en disco solo una vez .
* node_modules: pnpm crea una estructura node_modules completamente plana y estricta, pero llena de symlinks (enlaces simbólicos) que apuntan al store global.

Ventaja brutal: Las instalaciones son casi instantáneas porque los archivos ya existen en el store. Solo crea los enlaces.

### Comandos

La API es casi idéntica entre los tres, solo cambia el prefijo. Si sabes npm, sabes pnpm.

#### Escenario 1: Inicializar un proyecto

```bash
# NPM
npm init -y

# YARN
yarn init -y

# PNPM
pnpm init
```
#### Escenario 2: Instalar dependencias de producción

```bash
# NPM
npm install express --save-prod

# YARN
yarn add express

# PNPM
pnpm add express
```

#### Escenario 3: Instalar dependencia de desarrollo (TypeScript)

```bash
# NPM
npm install typescript --save-dev

# YARN
yarn add typescript --dev

# PNPM
pnpm add typescript --save-dev  # o -D
```

#### Escenario 4: Instalar todo lo que hay en package.json

```bash
# NPM
npm install

# YARN
yarn
# o
yarn install

# PNPM
pnpm install
# Nota: pnpm es estricto. Si intentas usar un paquete que no está en package.json, fallará.
```

### Migrar

Migrar de npm o Yarn a pnpm es quirúrgico si sigues esta receta. El comando mágico es pnpm import. No borres el lockfile viejo hasta que pnpm lo lea.

#### Caso A: Migrar desde npm

* Instala pnpm (como viste arriba).
* Prepara el terreno (opcional pero recomendado para evitar que la gente use npm por error):
Añade esto a tu package.json:

```bash
{
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  }
}
```

* El paso clave: No borres package-lock.json aún.

```bash
# Esto lee tu package-lock.json existente y crea pnpm-lock.yaml
pnpm import
```
* Limpieza y fresh install:

```bash
rm -rf node_modules package-lock.json
pnpm install
```
Esto último creará la nueva estructura de node_modules basada en el pnpm-lock.yaml generado

#### Migrar desde Yarn Classic (v1)

El proceso es idéntico, pero pnpm leerá el yarn.lock.

```bash
# 1. Asegúrate de tener el yarn.lock presente
# 2. Importa
pnpm import
# 3. Borra node_modules y yarn.lock
rm -rf node_modules yarn.lock
# 4. Instala
pnpm install
```
#### Configurando el Monorepo (Avanzado)

Si tienes un monorepo con Lerna o Yarn Workspaces, pnpm los supera.
Crea un archivo pnpm-workspace.yaml en la raíz:

```bash
packages:
  - 'packages/*'
  - 'apps/*'
```
Luego ejecutas pnpm install en la raíz y gestiona todas las dependencias cruzadas de forma ultrarrápida y estricta

#### Pro Tip post-migración:
pnpm es más estricto. Si tu código funcionaba en npm pero falla en pnpm porque no encuentra un módulo, es que tenías una phantom dependency. Deberás añadir explícitamente ese paquete que estabas usando de forma accidental:

```bash
pnpm add nombre-del-paquete-faltante
```
