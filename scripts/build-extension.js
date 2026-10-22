// scripts/build-extension.js - Pipeline de Compilação e Minificação da Extensão via esbuild
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

async function buildExtension() {
  console.log('⚡ Iniciando compilação otimizada da extensão Chrome via esbuild...');
  const outDir = path.resolve('dist/extension');
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Bundle do Sidepanel (Controller + Core em arquivo único)
  console.log('📦 Empacotando sidepanel.js...');
  await esbuild.build({
    entryPoints: ['extension/sidepanel.js'],
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['chrome110'],
    outfile: path.join(outDir, 'sidepanel.js'),
    sourcemap: false
  });

  // 2. Bundle do Content Script (Injetor DOM)
  console.log('📦 Empacotando content.js...');
  await esbuild.build({
    entryPoints: ['extension/content.js'],
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['chrome110'],
    outfile: path.join(outDir, 'content.js'),
    sourcemap: false
  });

  // 3. Bundle do Service Worker (Background)
  console.log('📦 Empacotando background.js...');
  await esbuild.build({
    entryPoints: ['extension/background.js'],
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['chrome110'],
    outfile: path.join(outDir, 'background.js'),
    sourcemap: false
  });

  // 4. Bundle do Worker Offscreen (WASM & OCR)
  console.log('📦 Empacotando offscreen.js...');
  await esbuild.build({
    entryPoints: ['extension/offscreen.js'],
    bundle: true,
    minify: true,
    format: 'esm',
    target: ['chrome110'],
    outfile: path.join(outDir, 'offscreen.js'),
    sourcemap: false
  });

  // 5. Copia arquivos estáticos
  console.log('📋 Copiando manifest, HTML, CSS e ativos visuais...');
  const staticFiles = [
    'manifest.json',
    'sidepanel.html',
    'sidepanel.css',
    'offscreen.html',
    'offscreen-client.js',
    'toasts.css',
    'license-modal.css',
    'toast-manager.js',
    'batch-ui.js'
  ];

  for (const f of staticFiles) {
    const src = path.join('extension', f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(outDir, f));
    }
  }

  // Copia pasta icons/
  const iconSrc = path.join('extension', 'icons');
  const iconDest = path.join(outDir, 'icons');
  if (fs.existsSync(iconSrc)) {
    fs.cpSync(iconSrc, iconDest, { recursive: true });
  }

  // Popula pasta vendor/ com binários WASM e dicionários locais (autonomia 100% offline)
  const vendorDest = path.join(outDir, 'vendor');
  fs.mkdirSync(vendorDest, { recursive: true });
  const tesseractMin = path.resolve('node_modules/tesseract.js/dist/tesseract.min.js');
  const workerMin = path.resolve('node_modules/tesseract.js/dist/worker.min.js');
  const wasmFile = path.resolve('node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm');
  const wasmJsFile = path.resolve('node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js');
  const langFile = path.resolve('por.traineddata');

  if (fs.existsSync(tesseractMin)) fs.copyFileSync(tesseractMin, path.join(vendorDest, 'tesseract.min.js'));
  if (fs.existsSync(workerMin)) fs.copyFileSync(workerMin, path.join(vendorDest, 'worker.min.js'));
  if (fs.existsSync(wasmFile)) fs.copyFileSync(wasmFile, path.join(vendorDest, 'tesseract-core-simd-lstm.wasm'));
  if (fs.existsSync(wasmJsFile)) fs.copyFileSync(wasmJsFile, path.join(vendorDest, 'tesseract-core-simd-lstm.wasm.js'));
  if (fs.existsSync(langFile)) fs.copyFileSync(langFile, path.join(vendorDest, 'por.traineddata'));

  // Copia também para extension/vendor para desenvolvimento local unpack
  const extVendorDir = path.resolve('extension/vendor');
  fs.mkdirSync(extVendorDir, { recursive: true });
  if (fs.existsSync(tesseractMin)) fs.copyFileSync(tesseractMin, path.join(extVendorDir, 'tesseract.min.js'));
  if (fs.existsSync(workerMin)) fs.copyFileSync(workerMin, path.join(extVendorDir, 'worker.min.js'));
  if (fs.existsSync(wasmFile)) fs.copyFileSync(wasmFile, path.join(extVendorDir, 'tesseract-core-simd-lstm.wasm'));
  if (fs.existsSync(wasmJsFile)) fs.copyFileSync(wasmJsFile, path.join(extVendorDir, 'tesseract-core-simd-lstm.wasm.js'));
  if (fs.existsSync(langFile)) fs.copyFileSync(langFile, path.join(extVendorDir, 'por.traineddata'));

  // Copia core/ para retrocompatibilidade
  const coreSrc = path.join('extension', 'core');
  const coreDest = path.join(outDir, 'core');
  if (fs.existsSync(coreSrc)) {
    fs.cpSync(coreSrc, coreDest, { recursive: true });
  }

  console.log(`✅ Build concluído com sucesso em: ${outDir}`);
}

buildExtension().catch((err) => {
  console.error('❌ Falha na compilação:', err);
  process.exit(1);
});
