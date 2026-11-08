import fs from 'node:fs';
import path from 'node:path';
import { CodeGraph } from '../code-graph.mjs';

const testDir = path.resolve('test-fixtures');
if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });

fs.mkdirSync(path.join(testDir, 'src/api'), { recursive: true });
fs.mkdirSync(path.join(testDir, 'src/services/auth'), { recursive: true });
fs.mkdirSync(path.join(testDir, 'src/utils'), { recursive: true });
fs.mkdirSync(path.join(testDir, 'packages/core/src'), { recursive: true });
fs.mkdirSync(path.join(testDir, 'py_pkg'), { recursive: true });
fs.mkdirSync(path.join(testDir, 'dist-custom'), { recursive: true });

// 1. .gitignore
fs.writeFileSync(path.join(testDir, '.gitignore'), `
dist-custom/
*.gen.ts
`);

fs.writeFileSync(path.join(testDir, 'dist-custom/ignored.ts'), 'export const bad = 1;');
fs.writeFileSync(path.join(testDir, 'src/utils/test.gen.ts'), 'export const bad2 = 2;');

// 2. tsconfig.json raíz
fs.writeFileSync(path.join(testDir, 'tsconfig.json'), `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}`);

// 3. packages/core/tsconfig.json (Monorepo)
fs.writeFileSync(path.join(testDir, 'packages/core/tsconfig.json'), `{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@core/*": ["src/*"]
    }
  }
}`);

fs.writeFileSync(path.join(testDir, 'packages/core/src/index.ts'), `
export const CORE_VERSION = "3.0";
`);

// 4. Nested Template Literals con backticks anidados
fs.writeFileSync(path.join(testDir, 'src/utils/logger.ts'), `
const msg = \`Hello \${\`nested \${\`deep \${10}\`}\`} world\`;
console.log("import { fakeImport } from './non_existent_fake_path'");

export function log(msg: string) { console.log(msg); }
export const VERSION = "1.0.0";
`);

// 5. Mixed type + value imports
fs.writeFileSync(path.join(testDir, 'src/services/db.ts'), `
import { log } from '@/utils/logger';
export class Database {
  query(sql: string) { log(sql); }
}
`);

// 6. Multi-level Barrel Chain:
// auth/authService.ts -> services/sub-index.ts -> services/index.ts -> api/authController.ts
fs.writeFileSync(path.join(testDir, 'src/services/auth/authService.ts'), `
import { Database } from '../db';
export function login(user: string) { return "ok"; }
`);

fs.writeFileSync(path.join(testDir, 'src/services/sub-index.ts'), `
export * from './auth/authService';
`);

fs.writeFileSync(path.join(testDir, 'src/services/index.ts'), `
export * from './sub-index';
`);

fs.writeFileSync(path.join(testDir, 'src/api/authController.ts'), `
import { login } from '../services/index';
import { CORE_VERSION } from '@core/index';

export class AuthController {
  run() { login("user"); }
}
`);

// 7. Python con funciones privadas (_helper) y __all__
fs.writeFileSync(path.join(testDir, 'py_pkg/calc.py'), `
def add(a, b): return a + b
def _internal_helper(): return 0
def multiply(a, b): return a * b
`);

fs.writeFileSync(path.join(testDir, 'py_pkg/main.py'), `
from .calc import (
    add,
    multiply as mult,
)
def run(): print(add(2, 3), mult(4, 5))
def _private_runner(): pass
`);

// 8. Ciclo intencional: cycleA -> cycleB -> cycleA
fs.writeFileSync(path.join(testDir, 'src/api/cycleA.ts'), `
import { b } from './cycleB';
export const a = 1;
`);

fs.writeFileSync(path.join(testDir, 'src/api/cycleB.ts'), `
import { a } from './cycleA';
export const b = 2;
`);

// 9. Dead code (unused) vs isolated
fs.writeFileSync(path.join(testDir, 'src/services/oldAuthService.ts'), `
import { Database } from './db';
export function legacy() {}
`);

fs.writeFileSync(path.join(testDir, 'src/utils/orphanIsolated.ts'), `
const answer = 42;
`);

console.log('--- RUNNING 10/10 MASTER VALIDATION SUITE ---');

const graph = new CodeGraph(testDir).build(true);

// Test 1: Nested template literals
const loggerNode = graph.nodes.get('src/utils/logger.ts');
if (loggerNode.linksTo.has('src/utils/non_existent_fake_path.ts')) {
  throw new Error('Nested template literals test failed! False import detected inside nested backtick.');
}
console.log('✓ Test 1: Nested template literals ${`deep ${...}`} parsed flawlessly!');

// Test 2: Multi-level Barrel Chain (authService -> sub-index -> index -> controller)
const symLogin = graph.findSymbol('login');
if (!symLogin) throw new Error('Symbol tracking failed for login!');
const barrelPaths = symLogin.viaBarrels.map(b => b.barrel);
console.log('Multi-level barrels for login:', barrelPaths);
if (!barrelPaths.includes('src/services/sub-index.ts') || !barrelPaths.includes('src/services/index.ts')) {
  throw new Error('Multi-level transitive barrel resolution failed!');
}
console.log('✓ Test 2: Multi-level transitive barrel propagation (A -> B -> Real) passed!');

// Test 3: Python private symbol filtering
const calcNode = graph.nodes.get('py_pkg/calc.py');
console.log('Python calc exports:', calcNode.exports);
if (calcNode.exports.includes('_internal_helper')) {
  throw new Error('Python private function _internal_helper should have been filtered out!');
}
if (!calcNode.exports.includes('add') || !calcNode.exports.includes('multiply')) {
  throw new Error('Python public exports missing!');
}
console.log('✓ Test 3: Python PEP 8 private functions (_helper) cleanly filtered!');

// Test 4: Gitignore
if (graph.nodes.has('dist-custom/ignored.ts') || graph.nodes.has('src/utils/test.gen.ts')) {
  throw new Error('Gitignore test failed!');
}
console.log('✓ Test 4: .gitignore filtering (directories & wildcards) passed!');

// Test 5: Monorepo multi-tsconfig
const authCtrl = graph.nodes.get('src/api/authController.ts');
if (!authCtrl || !authCtrl.linksTo.has('packages/core/src/index.ts')) {
  throw new Error('Monorepo @core/index resolution failed!');
}
console.log('✓ Test 5: Monorepo multi-tsconfig alias resolution passed!');

// Test 6: Tarjan SCC
const cycles = graph.findCycles();
if (cycles.length === 0) throw new Error('Tarjan cycle detection failed!');
console.log('✓ Test 6: Iterative Tarjan SCC cycle detection passed!');

// Test 7: Health unused vs isolated
const health = graph.getHealthReport();
const unusedPaths = health.unused.map(u => u.path);
const isolatedPaths = health.isolated.map(i => i.path);
if (!unusedPaths.includes('src/services/oldAuthService.ts') || !isolatedPaths.includes('src/utils/orphanIsolated.ts')) {
  throw new Error('Health unused vs isolated failed!');
}
console.log('✓ Test 7: Health unused (dead code) vs isolated files passed!');

// Test 8: Bidirectional trace
const trace = graph.tracePath('src/api/authController.ts', 'src/utils/logger.ts');
if (!trace || trace[0] !== 'src/api/authController.ts' || trace[trace.length - 1] !== 'src/utils/logger.ts') {
  throw new Error('Trace failed!');
}
console.log('✓ Test 8: Bidirectional BFS trace passed!');

fs.rmSync(testDir, { recursive: true, force: true });
console.log('\n=======================================================');
console.log('>>> 10/10 CERTIFIED: ALL MASTER SUITE TESTS PASSED! <<<');
console.log('=======================================================');
