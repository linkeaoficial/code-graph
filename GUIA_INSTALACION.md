# 🚀 Guía Maestra de Instalación: Code-Graph Skill
### Compatible con Google Antigravity, Claude Code, Cursor, OpenCode, Codex, Kilo Code, Cline, Roo Code y DeepSeek Harness

Esta guía explica paso a paso cómo instalar y activar la skill en **cualquier agente o editor de IA** para ahorrar entre un 70% y un 90% de tokens.

---

## 📦 Regla Universal de Instalación

Para cualquier entorno, solo necesitas copiar **2 archivos**:
1. `SKILL.md` (el protocolo de instrucciones para el modelo)
2. `code-graph.mjs` (el motor ejecutable en Node.js, zero-dependencies)

---

## 🛠️ 1. Dónde colocar los 2 archivos según tu Agente / Editor

### A. Google Antigravity (AGY)
Copia los 2 archivos en la carpeta de skills local de tu proyecto:
```text
tu-proyecto/
└── .agents/skills/code-graph/
    ├── SKILL.md
    └── code-graph.mjs
```
*(También es compatible en `.agent/skills/code-graph/`)*.  
Antigravity detecta la skill automáticamente al abrir el workspace.

---

### B. Claude Code (Anthropic CLI)
Copia los 2 archivos en el directorio estándar de skills de Claude Code:
```text
tu-proyecto/
└── .claude/skills/code-graph/
    ├── SKILL.md
    └── code-graph.mjs
```
Claude Code cargará las directivas de `SKILL.md` en cada sesión.

---

### C. OpenCode (SST / Terminal Agent)
Copia los 2 archivos en:
```text
tu-proyecto/
└── .opencode/skills/code-graph/
    ├── SKILL.md
    └── code-graph.mjs
```
*(O en `.claude/skills/code-graph/` si usas el motor de compatibilidad)*.

---

### D. Cursor / Windsurf
1. Guarda `code-graph.mjs` en la raíz o en una carpeta de herramientas:
   ```text
   tu-proyecto/
   └── .cursor/scripts/code-graph.mjs
   ```
2. Crea una regla en `.cursor/rules/code-graph.mdc` y pega el contenido de `SKILL.md` asegurándote de que la ruta apunte a `node .cursor/scripts/code-graph.mjs`.

---

### E. Codex (OpenAI) / Cline / Roo Code / Kilo Code
Para extensiones de VS Code basadas en agentes (Cline, Roo Code, Kilo Code):
1. Coloca los 2 archivos en:
   ```text
   tu-proyecto/
   └── .agent/skills/code-graph/
       ├── SKILL.md
       └── code-graph.mjs
   ```
2. En tus instrucciones personalizadas (`Custom Instructions` o `.clinerules` / `.roorules`), agrega esta línea:
   > *"Antes de leer archivos o refactorizar código, consulta siempre la herramienta local ejecutando: `node .agent/skills/code-graph/code-graph.mjs` siguiendo el protocolo de `SKILL.md`"*.

---

### F. DeepSeek (CLI / Harness / Local Agent)
Si ejecutas DeepSeek a través de un arnés local (CLI de terminal, Ollama, LangChain o scripts de automatización):
1. Coloca `code-graph.mjs` en la raíz de tu proyecto.
2. Inyecta el texto de `SKILL.md` en el System Prompt de tu sesión.
3. El modelo utilizará la herramienta mediante ejecución de terminal (`bash` o `powershell`) llamando a:
   ```bash
   node code-graph.mjs map
   node code-graph.mjs inspect <modulo>
   node code-graph.mjs health
   ```

---

## ⚡ 2. ¿Cómo se activa?

**¡Es 100% automático!**
* Cero compilación.
* Cero `npm install` (funciona con la API nativa de Node.js v14+).
* En cuanto abres tu proyecto, el agente lee `SKILL.md` y ya sabe que tiene prohibido abrir archivos a ciegas con `grep`.

---

## 💬 3. Prompts que le puedes decir a cualquier IA

* **Para programar normal:**
  Tú solo pídele tus requerimientos habituales:
  > *"Crea una barra de navegación con menú responsivo"*  
  > *"Arregla el bug en la conexión con la base de datos"*  
  La IA usará el grafo en milisegundos por debajo, sabrá qué archivos tocar y no quemará tokens.

* **Para ver la arquitectura en tu navegador:**
  Dile a la IA:
  > *"Muéstrame el mapa visual del proyecto"*  
  O ejecuta tú mismo en la consola:
  ```bash
  node .agents/skills/code-graph/code-graph.mjs export-html
  ```
  Se creará `code-graph.html` con el visor interactivo (modo oscuro/claro, buscador en tiempo real con tecla `/`, zoom y panel lateral).

* **Para auditar la salud del código:**
  Dile a la IA:
  > *"Haz una auditoría de salud de la arquitectura"*  
  O ejecuta tú en la consola:
  ```bash
  node .agents/skills/code-graph/code-graph.mjs health
  ```
  Te dirá si hay dependencias circulares, código muerto o archivos aislados.

* **Antes de una refactorización:**
  Dile a la IA:
  > *"Antes de modificar este archivo, calcula su Blast Radius"*  
  La IA te dirá exactamente qué módulos dependen de él antes de tocar código.

---

## 🔒 4. Seguridad y Garantías
* **Solo lectura:** La CLI solo lee dependencias (`fs.readFileSync`), jamás altera ni borra tu código fuente por sí sola.
* **Caché invisible:** Se almacena en `.code-graph/cache.json` y se actualiza sola al instante si editas cualquier archivo.
* **Sin huella:** Al estar en `.gitignore`, la caché y el reporte visual no ensucian tu repositorio Git.
