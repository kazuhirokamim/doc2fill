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

  // 4. Copia arquivos estáticos
  console.log('📋 Copiando manifest, HTML, CSS e ativos visuais...');
  const staticFiles = [
    'manifest.json',
    'sidepanel.html',
    'sidepanel.css',
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
