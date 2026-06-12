Cursor — Guía de uso
Guía práctica para configurar y usar Cursor en un proyecto React 19 + TypeScript, con ejemplos basados en un ecommerce de zapatillas.

Nota: En este repositorio de estudio los ejemplos viven dentro de este archivo. Cuando trabajes en un proyecto real, copia los bloques correspondientes a .cursor/rules/, .cursor/skills/, .cursor/commands/ y AGENTS.md en la raíz del repo.

Índice
Introducción
Conceptos clave
Modos de Cursor
Proyecto de referencia
Ejemplos embebidos (copiar/pegar)
Escenarios prácticos
Buenas prácticas
Referencia rápida

1. Introducción
Cursor es un IDE basado en VS Code con asistencia de IA integrada: chat contextual, edición multiarchivo (Composer/Agent), autocompletado con Tab y reglas persistentes por proyecto.

Objetivos de esta guía
Entender rules, skills, commands y AGENTS.md.
Configurar un flujo de trabajo para React 19 + TypeScript.
Practicar con un dominio concreto: tienda de zapatillas (catálogo, carrito, checkout, admin).
Audiencia
Desarrolladores que ya usan VS Code y quieren sacar provecho de la IA sin perder control de arquitectura, tipos y pruebas.

Qué necesitas
Cursor instalado y actualizado.
Node.js LTS y el gestor de paquetes del proyecto (pnpm/npm/yarn).
Este repo (o uno similar) abierto como carpeta raíz.
2. Conceptos clave
2.1 Rules (.cursor/rules/)
Instrucciones persistentes que el modelo ve según patrones de archivo (globs) o siempre (alwaysApply). Sirven para convenciones de código, estructura de carpetas y restricciones (por ejemplo: no usar any, no tocar CI sin pedirlo).

Tipo	Uso típico
Always
Estilo global, idioma de commits, seguridad
Auto Attached
Reglas al abrir *.tsx, api/**, etc.
Manual
El usuario invoca la regla con @rule
2.2 Skills (.cursor/skills/ o skills de usuario)
Playbooks reutilizables: pasos detallados para tareas repetibles (crear hook, migrar componente, revisar PR). El agente debe leer el SKILL.md cuando la tarea encaja.

2.3 Commands (.cursor/commands/)
Plantillas invocables desde la paleta o el chat (según versión): prompts predefinidos como /review-pr o /add-feature.

2.4 AGENTS.md (raíz del repo)
Documento para agentes autónomos: cómo arrancar el proyecto, dónde están tests, ramas, convenciones y límites (qué no hacer sin confirmación).

2.5 Contexto en el chat
@Files / @Folders: archivos y carpetas concretos.
@Code: símbolos seleccionados.
@Docs: documentación indexada.
@Web: búsqueda (si está habilitada).
Cuanto más preciso el contexto, menos alucinaciones y menos diffs enormes.

2.6 MCP (Model Context Protocol)
Conectores a herramientas externas (navegador, APIs, tickets). Requieren configuración y a veces autenticación. Úsalos cuando la tarea dependa de datos fuera del repo.

3. Modos de Cursor
3.1 Chat
Conversación con el código como contexto. Ideal para preguntas, exploración y planes. Puedes pedir que no edite archivos (“solo explica”).

3.2 Inline Edit (Cmd/Ctrl + K)
Edición local en el archivo actual: renombrar, extraer componente, añadir tipos. Cambios acotados.

3.3 Tab (autocompletado)
Sugerencias en línea mientras escribes. Muy útil para JSX repetitivo, tests y tipos. No sustituye revisión humana.

3.4 Composer / Agent
Modo multiarchivo y ejecución de comandos (terminal, tests). Usar para features completas, refactors y fixes que tocan varios módulos.

Cuándo usar cada uno

Necesidad	Modo recomendado
“¿Cómo funciona X?”
Chat
Cambio de 5–30 líneas en un archivo
Inline
Nueva pantalla + hook + tests
Agent/Composer
Completar props y handlers
Tab
4. Proyecto de referencia
Ecommerce de zapatillas con React 19 y TypeScript.

4.1 Estructura sugerida
src/
  app/                 # rutas, layouts (React Router o framework)
  features/
    catalog/           # listado, filtros, ficha producto
    cart/              # líneas, cantidades, totales
    checkout/          # envío, pago (mock)
    auth/              # login/registro (opcional)
  shared/
    ui/                # Button, Input, Modal
    api/               # client HTTP, tipos DTO
    lib/               # formatMoney, validators
  entities/
    product/
    order/
tests/                 # Vitest + Testing Library
4.2 Dominio (lenguaje ubicuo)
Product: id, slug, brand, name, price, sizes[], imageUrl, stockBySize.
CartLine: productId, size, quantity.
Order: lines, shippingAddress, status.
4.3 Scripts típicos
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "lint": "eslint ."
  }
}
Menciona estos scripts en AGENTS.md para que el agente sepa cómo validar cambios.

5. Ejemplos embebidos (copiar/pegar)
5.1 Rule: TypeScript estricto
Archivo: .cursor/rules/typescript-strict.mdc

---
description: TypeScript estricto en frontend
globs: **/*.{ts,tsx}
alwaysApply: false
---
# TypeScript
- No usar `any`; preferir `unknown` + narrowing.
- Tipar props de componentes con interfaces o type aliases exportados cuando se reutilicen.
- Usar `satisfies` para objetos de configuración literales.
- Los fetchers devuelven tipos explícitos; validar respuestas en el borde (zod/io-ts si el proyecto ya lo usa).
5.2 Rule: React 19 y componentes
Archivo: .cursor/rules/react-ui.mdc

---
description: Convenciones React UI — ecommerce zapatillas
globs: src/**/*.{tsx}
alwaysApply: false
---
# React UI
- Componentes de presentación en `shared/ui`; lógica de negocio en hooks bajo `features/*/hooks`.
- Preferir function components; no class components.
- Estados de carga y error visibles en listados y ficha de producto.
- Accesibilidad: labels en inputs, `aria-live` en mensajes de carrito/checkout.
- Imágenes de producto: `alt` descriptivo con marca y modelo.
- No introducir librerías de UI nuevas sin acuerdo; reutilizar componentes existentes.
5.3 Rule: API y datos mock
Archivo: .cursor/rules/api-layer.mdc

---
description: Capa API y mocks del catálogo
globs: src/shared/api/**/*
alwaysApply: false
---
# API
- Un solo cliente HTTP (`apiClient`) con baseURL desde env.
- Funciones por recurso: `getProducts`, `getProductBySlug`, `postOrder`.
- Mocks en desarrollo vía MSW o JSON local solo si el proyecto ya lo define; no duplicar fuentes de verdad.
- Errores: mapear a un tipo `ApiError` con `code` y `message` user-safe.
5.4 Skill: Añadir feature de catálogo
Carpeta: .cursor/skills/add-catalog-feature/

Archivo: SKILL.md

# Skill: Añadir feature de catálogo
## Cuándo usar
Nueva capacidad en listado/filtros/ficha de producto del ecommerce de zapatillas.
## Pasos
1. Leer `src/features/catalog` y entidades `product`.
2. Definir tipos y contrato API (o mock) antes de UI.
3. Implementar hook (`useProductList`, `useProductFilters`) con estados loading/error/empty.
4. Componentes UI pequeños; página solo compone.
5. Añadir tests Vitest: hook (lógica) y componente crítico (render + interacción).
6. Ejecutar `pnpm test` y `pnpm lint`; corregir fallos.
## Checklist
- [ ] Tipos exportados
- [ ] Sin `any`
- [ ] Accesibilidad básica
- [ ] Tests añadidos o actualizados
5.5 Command: Revisión de PR
Archivo: .cursor/commands/review-pr.md

# review-pr
Revisa el diff de la rama actual frente a `main`:
1. Resumen en 3 bullets.
2. Riesgos (regresiones, tipos, rendimiento, a11y).
3. Sugerencias concretas por archivo.
4. Checklist de tests que deberían existir.
No hagas push ni merge. Responde en español si el repo es de estudio en español.
5.6 Command: Bugfix con reproducción
Archivo: .cursor/commands/bugfix.md

# bugfix
Para el bug descrito por el usuario:
1. Formular hipótesis y archivos sospechosos.
2. Buscar en el repo tests o usos relacionados.
3. Proponer fix mínimo; explicar causa raíz.
4. Añadir test de regresión si hay Vitest en el proyecto.
5. Indicar comando para verificar (`pnpm test`, pasos manuales).
5.7 AGENTS.md (raíz)
# AGENTS.md — Sneaker Shop (React 19 + TS)
## Resumen
Ecommerce de zapatillas. Frontend Vite + React 19 + TypeScript strict.
## Arranque
- Instalar: `pnpm install`
- Desarrollo: `pnpm dev`
- Tests: `pnpm test`
- Lint: `pnpm lint`
- Build: `pnpm build`
## Estructura
- `src/features/*` — módulos por dominio (catalog, cart, checkout).
- `src/shared/ui` — componentes reutilizables.
- `src/entities/*` — tipos y mappers de producto/pedido.
## Convenciones
- Commits: mensajes claros en español o inglés según equipo; no commitear `.env`.
- No modificar `pnpm-lock.yaml` sin necesidad.
- No añadir dependencias pesadas sin discutir.
## Límites para el agente
- No hacer `git push` salvo petición explícita.
- No desactivar ESLint ni hooks de pre-commit.
- Cambios pequeños y revisables; preguntar si el alcance es ambiguo.
## Validación obligatoria antes de terminar
Ejecutar `pnpm test` y `pnpm lint` cuando se toque lógica de negocio o UI crítica.
6. Escenarios prácticos
Escenario A — Nueva feature: filtro por talla en catálogo
Prompt ejemplo (Agent):

Añade filtro por talla (EU 38–46) en el listado de catálogo. Debe sincronizarse con la URL (?size=42), usar tipos existentes de Product, y mostrar estado vacío si no hay resultados. Tests para el hook de filtros.

Flujo recomendado

@Folder src/features/catalog
Pegar criterios de aceptación en viñetas.
Pedir plan corto antes del código (opcional).
Revisar diff; ejecutar tests localmente.
Escenario B — Bug: precio del carrito incorrecto con descuento
Prompt ejemplo:

En el carrito, al aplicar un cupón del 10%, el total no coincide con la suma de líneas. Encuentra la causa en features/cart y corrige con test de regresión.

Flujo

@Code del selector o función computeCartTotal.
Command /bugfix si está configurado.
Verificar casos: cupón inválido, carrito vacío, redondeo a 2 decimales.
Escenario C — Refactor: extraer formatMoney y unificar moneda
Prompt ejemplo:

Extrae formateo de moneda a shared/lib/formatMoney.ts y reemplaza usos duplicados en catalog y checkout sin cambiar comportamiento visible. Actualiza imports y tests.

Flujo

Regla @react-ui + archivos afectados.
Pedir diff mínimo; prohibir cambios de copy o diseño en el mismo PR.
Escenario D — Preparar PR con descripción y plan de prueba
Prompt ejemplo:

Resume mis cambios locales para un PR hacia main: título, 3 bullets, riesgos, y checklist manual (login, añadir al carrito, checkout mock).

Flujo

git status / diff (tú o el agente si tiene terminal).
Command /review-pr para segunda opinión.
Crear PR solo cuando tú lo pidas (gh pr create).
7. Buenas prácticas
7.1 Alcance
Un objetivo por conversación Agent cuando sea posible.
Pedir “cambio mínimo” y archivos fuera de alcance explícitos.
7.2 Contexto
Adjuntar solo carpetas relevantes; evitar @Codebase completo en tareas pequeñas.
Referenciar nombres reales: ProductCard, useCart.
7.3 Seguridad
No pegar secretos en el chat; usar .env local ignorado por git.
Revisar diffs que toquen auth, pagos o CORS.
7.4 Calidad
Exigir tipos y tests en features de dinero y stock.
Tras Agent, leer el diff como en una code review humana.
7.5 Rules y AGENTS.md
Mantener reglas cortas y comprobables; dividir por dominio (TS, React, API).
Actualizar AGENTS.md cuando cambien scripts o estructura.
7.6 Idioma
Puedes mezclar prompts en español con código e identificadores en inglés; sé consistente en mensajes de UI si el producto es ES.
8. Referencia rápida
Elemento	Ubicación	Propósito
Rules
.cursor/rules/*.mdc
Convenciones automáticas por glob
Skills
.cursor/skills/**/SKILL.md
Procedimientos largos repetibles
Commands
.cursor/commands/*.md
Prompts reutilizables
AGENTS.md
raíz
Guía para agentes y onboarding
User rules
Cursor Settings
Preferencias globales del usuario
Atajo / acción	Uso
Chat
Preguntas, diseño, documentación
Inline (Ctrl/Cmd+K)
Edición local
Agent/Composer
Multiarchivo + terminal
Tab
Autocompletado
@Files
Contexto preciso
Comando proyecto	Cuándo
pnpm dev
Ver UI
pnpm test
Tras lógica o hooks
pnpm lint
Antes de commit/PR
pnpm build
Antes de release
Apéndice: Prompts útiles (zapatillas)
Genera el tipo Product y un mock de 5 zapatillas running con tallas y stock.
Implementa CartDrawer accesible: foco atrapado, cerrar con Escape, anunciar total con aria-live.
Añade test Vitest: al incrementar cantidad de una línea, el subtotal sube correctamente.
Documenta en README cómo copiar rules/skills de CURSOR.md al proyecto real.
Fin de la guía.

