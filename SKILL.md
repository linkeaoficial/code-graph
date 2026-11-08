---
name: code-graph
description: Genera y consulta el grafo relacional y de símbolos en memoria para ahorrar hasta un 90% de tokens, mapear dependencias y calcular el blast radius antes de abrir o editar código.
---

# 🧠 Skill: Grafo de Código y Protocolo de Contexto Mínimo (Hardened V2)

Esta skill implementa un motor de análisis estático en memoria ultra-rápido (`code-graph.mjs`) diseñado bajo el **Protocolo de Contexto Mínimo Viable (Zero-Waste Context)**.

> [!IMPORTANT]
> **REGLA DE ORO:** Está estrictamente prohibido usar búsquedas ciegas (`grep`, `find_by_name`) o abrir múltiples archivos con `read_file` para "entender cómo se conecta el proyecto". Toda exploración estructural debe hacerse a través de la CLI de `code-graph`.

---

## 🛠️ Herramienta Disponible: `code-graph.mjs`

El motor se ejecuta con Node.js en milisegundos, almacena caché incremental por `mtime` en `.code-graph/cache.json`, y responde en formato ultra-denso token-comprimido.

```bash
node code-graph.mjs <comando> [opciones]
```

### Comandos Clave

| Comando | Cuándo usarlo | Salida esperada |
|---|---|---|
| `node code-graph.mjs map` | Al inicio de una tarea o para ver el panorama general del repositorio. | Directorios con conteo de archivos, edges y top hubs (`★`). |
| `node code-graph.mjs map <directorio>` | Para explorar los archivos y exports de un módulo específico. | IDs numéricos estables, archivos, exports y conexiones. |
| `node code-graph.mjs inspect <archivo\|símbolo>` | **Antes de editar cualquier archivo.** | Exports, dependencias directas y `#B` (Blast Radius recursivo). |
| `node code-graph.mjs check <archivo>` | **Atajo todo-en-uno pre-edición.** | Combina `inspect` + exports de dependencias directas + `#B` en una sola llamada. |
| `node code-graph.mjs find <símbolo>` | **Antes de renombrar o refactorizar una función/clase.** | Dónde se define y **todos** los archivos que la importan (con sus alias). |
| `node code-graph.mjs trace <origen> <destino>` | Para depurar flujos o entender cómo se comunican dos módulos. | Secuencia exacta de imports entre ambos módulos (`A > B > C`). |
| `node code-graph.mjs health` | Para auditorías arquitectónicas, refactorizaciones y antes de hacer commit. | Ciclos (`CYCLES`), God Files (`GOD_FILES`), no usados (`UNUSED`) y huérfanos (`ISOLATED`). |
| `node code-graph.mjs export-html` | **SOLO si el usuario solicita ver el mapa visual interactivo.** | Genera `code-graph.html` con dashboard visual para inspección humana. |

### Banderas y Opciones

* `--depth=N`: Profundidad del cálculo de Blast Radius o profundidad de carpetas en `map` (por defecto: 2).
* `--limit=N`: Límite de resultados antes de truncar con `+N more` (por defecto: 30).
* `--brief`: Devuelve únicamente la cabecera métrica (`#B`, `#G`, etc.).
* `--exclude-type`: Excluye imports de solo tipos (`import type` en TS) del blast radius runtime.
* `--refresh`: Fuerza re-escaneo ignorando el caché en disco.
* `--json`: Devuelve la estructura en JSON puro si se requiere parseo programático.

---

## 📖 Regla de Lectura Estricta

- `read_file` **SOLO** está permitido sobre:
  1. El archivo target de la edición.
  2. Archivos con severidad `sev >= 2.0` en `#B` (máximo los 3 primeros).
  3. El archivo que **define** un símbolo que vas a usar (vía `find <símbolo>`).
- **NUNCA** abras un archivo solo para "ver qué exporta" — eso es `node code-graph.mjs check <archivo>`.
- **NUNCA** abras más de 5 archivos por tarea sin antes volver a consultar `map`.
- Si después de `inspect` + `trace` no puedes decidir, haz **UNA** pregunta al usuario en vez de leer archivos de más.

---

## 🚨 Protocolo de Fallback (cuándo SÍ usar grep/read_file)

La CLI tiene limitaciones en casos específicos. Cuando ocurra una de estas, se permite `grep` o `read_file` acotado (nunca en bucle):

1. **`health` reporta `DYNAMIC_IMPORTS > 0`**: El grafo es un *lower bound*. Para el archivo consultado, valida llamadas en runtime con:
   `grep -rn "import(" <dir> --include="*.ts" | head -20`
2. **`inspect <x>` devuelve `NO_MATCH`**: El símbolo puede estar re-exportado por un barrel file o ser dinámico. Prueba `inspect <barrel_cercano>` primero, luego grep.
3. **`trace` devuelve `NO_PATH` pero sabes que hay conexión**: Probablemente sea un import dinámico o un framework con ruteo mágico (Next.js `app/`, Django `urls.py`). No inventes la ruta: reporta que el grafo estático no la contiene.

---

## 📊 Interpretación de Métricas

- `#B d2: 0 files (safe)`: Puedes editar el archivo con blast radius cero.
- `#B d2: N files, sev:X`: $\text{sev} = 1 + \log(1 + \text{in\_degree})$. `sev >= 2.5` significa que el archivo es un hub central; edita con extrema cautela y ejecuta tests.
- `#H CYCLES: N` con $N > 0$: **NO** refactorices el módulo completo sin resolver el ciclo primero. Es la causa #1 de bugs post-refactor.
- `#H GOD_FILES`: Ese archivo tiene acoplamiento excesivo y necesita división modular.
- `#H UNUSED: N`: Archivos que nadie importa pero que importan a otros (candidatos a código muerto).
- `#H ISOLATED: N`: Archivos 100% desconectados (sin imports ni exportadores).

---

## ✅ Validación Post-Cambio

Después de mover, renombrar o borrar archivos:

1. `node code-graph.mjs health --refresh` → si `CYCLES` aumentó, revierte el cambio.
2. `node code-graph.mjs inspect <archivo_afectado>` → si `#B` cambió drásticamente de tamaño, verifica que sea intencional.
3. Si borraste un archivo: `health --refresh` debe confirmar que ya no existe o que no dejó imports rotos.

---

## 🚫 Excepciones (Overhead > Beneficio)

Si el repositorio tiene **menos de 20 archivos de código**:
- Corre `health` una sola vez al inicio para detectar ciclos.
- Si `#G` reporta `< 20f`, puedes proceder con lecturas directas normales sin necesidad de consultar el grafo en cada micro-paso.

---

## 🔢 IDs Numéricos

Los IDs (`[5] src/lib/db.ts`) son deterministas dentro del estado actual del repositorio, ordenados alfabéticamente.
- Si creas o eliminas archivos, los IDs se reasignan. Por ello, ante cambios estructurales ejecuta `map` (toma `<10ms` con caché).
- **NUNCA** cites un ID numérico al usuario o en un commit; cita siempre el path relativo completo.
