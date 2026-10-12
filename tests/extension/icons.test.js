import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const manifestPath = path.join(projectRoot, 'extension', 'manifest.json');
const iconsDir = path.join(projectRoot, 'extension', 'icons');

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('Chrome Extension Icon Manifest & Raster Validation Suite (TDD)', () => {
  // Cenário 1: Caminho feliz (Happy Path)
  it('Cenário 1 (Happy Path): todos os ícones PNG obrigatórios (16, 32, 48, 128) existem com cabeçalho PNG válido e estão no manifest', () => {
    assert.ok(fs.existsSync(manifestPath), 'manifest.json deve existir');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.ok(manifest.icons, 'manifest deve conter chave "icons"');
    const expectedSizes = ['16', '32', '48', '128'];

    for (const size of expectedSizes) {
      assert.ok(manifest.icons[size], `manifest.icons deve definir ícone para tamanho ${size}`);
      const iconRelativePath = manifest.icons[size];
      const iconFullPath = path.join(projectRoot, 'extension', iconRelativePath);

      assert.ok(fs.existsSync(iconFullPath), `Arquivo de ícone ${iconFullPath} deve existir no disco`);
      assert.ok(iconRelativePath.endsWith('.png'), `Ícone para tamanho ${size} deve ser .png`);

      const fileBuffer = fs.readFileSync(iconFullPath);
      assert.ok(fileBuffer.length > 0, `Ícone ${size} não pode estar vazio`);
      assert.deepEqual(
        fileBuffer.subarray(0, 8),
        PNG_MAGIC,
        `Ícone ${size} deve conter magic bytes válidos de PNG`
      );
    }
  });

  // Cenário 2: Caso de borda (Edge Case)
  it('Cenário 2 (Edge Case): ícones de action.default_icon espelham a chave icons e ícone de squircle existe para a Chrome Store', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.ok(manifest.action?.default_icon, 'manifest.action.default_icon deve estar definido');
    assert.deepEqual(
      manifest.action.default_icon,
      manifest.icons,
      'action.default_icon deve usar os mesmos caminhos rasterizados que manifest.icons'
    );

    const squircle128Path = path.join(iconsDir, 'icon-squircle-128.png');
    assert.ok(fs.existsSync(squircle128Path), 'icon-squircle-128.png deve existir para promo da loja');
    const sqBuffer = fs.readFileSync(squircle128Path);
    assert.deepEqual(sqBuffer.subarray(0, 8), PNG_MAGIC, 'Squircle deve ser um PNG válido');
  });

  // Cenário 3: Tratamento de erro (Error Path)
  it('Cenário 3 (Error Path): rejeita manifest que referencie arquivos SVG nos ícones de instalação da extensão', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const allIconPaths = [
      ...Object.values(manifest.icons || {}),
      ...Object.values(manifest.action?.default_icon || {})
    ];

    for (const iconPath of allIconPaths) {
      assert.strictEqual(
        iconPath.toLowerCase().endsWith('.svg'),
        false,
        `Chrome Web Store rejeita SVGs em pacotes: ${iconPath} não pode ser SVG`
      );
    }
  });
});
