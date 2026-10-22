import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const COMPILED_EXTENSION_DIR = path.join(DIST_DIR, 'extension');
const ZIP_NAME = 'doc2fill-v0.3.0-beta.zip';
const ZIP_PATH = path.join(DIST_DIR, ZIP_NAME);
const ALIAS_ZIP_PATH = path.join(DIST_DIR, 'doc2fill-beta.zip');

console.log('📦 Iniciando empacotamento determinístico do doc2fill Beta...');

// 1. Compila e empacota a extensão via esbuild (garante IIFE limpo e cópia de vendor)
console.log('🔨 Executando build otimizado da extensão...');
execFileSync('npm', ['run', 'build'], { cwd: ROOT_DIR, stdio: 'inherit' });

// 2. Garante pasta dist
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// 3. Remove zips antigos
if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
if (fs.existsSync(ALIAS_ZIP_PATH)) fs.unlinkSync(ALIAS_ZIP_PATH);

// 4. Executa zip recursivo de dentro da pasta compilada dist/extension de forma segura sem injeção de shell
console.log(`🗜️ Compactando arquivos da extensão compilada para ${ZIP_NAME}...`);
execFileSync('zip', ['-r', ZIP_PATH, '.', '-x', '*.DS_Store', '*__pycache__*'], {
  cwd: COMPILED_EXTENSION_DIR,
  stdio: 'inherit'
});

// 5. Cria alias padronizado para download web
fs.copyFileSync(ZIP_PATH, ALIAS_ZIP_PATH);

const stats = fs.statSync(ZIP_PATH);
const sizeKb = (stats.size / 1024).toFixed(1);
console.log(`✅ Pacote Beta gerado com sucesso!`);
console.log(`📁 Arquivo: ${ZIP_PATH} (${sizeKb} KB)`);
console.log(`🔗 Link de download web: /download/doc2fill-beta.zip`);
