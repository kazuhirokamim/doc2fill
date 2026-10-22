import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { performBrowserClientOcr } from '../../core/browser-ocr.js';

describe('doc2fill Beta Hardening & Autonomy Suite (TDD)', () => {
  it('Cenário 1 (Happy Path): performBrowserClientOcr processa imagens defensivamente no cliente offline', async () => {
    const fakeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await performBrowserClientOcr(fakeBase64, 'recibo_teste.png');
    assert.ok(result);
    assert.strictEqual(typeof result.success, 'boolean');
    assert.strictEqual(typeof result.text, 'string');
    assert.strictEqual(typeof result.data, 'object');
  });

  it('Cenário 2 (Edge Case): pacote dist/doc2fill-beta.zip contém vendor WASM para autonomia sem servidor', () => {
    const zipPath = path.resolve('dist/doc2fill-beta.zip');
    assert.ok(fs.existsSync(zipPath), 'O arquivo dist/doc2fill-beta.zip deve existir');
    const stats = fs.statSync(zipPath);
    // Deve ter mais de 3MB porque inclui vendor/tesseract-core e por.traineddata
    assert.ok(stats.size > 2 * 1024 * 1024, `O pacote deve conter o runtime WASM completo (>2MB), atual: ${stats.size} bytes`);
  });

  it('Cenário 3 (Error Path): performBrowserClientOcr trata entradas nulas ou vazias sem lançar exceção', async () => {
    const resEmpty = await performBrowserClientOcr('', 'documento.jpg');
    assert.strictEqual(resEmpty.success, false);
    assert.strictEqual(resEmpty.source, 'invalid_input');

    const resNull = await performBrowserClientOcr(null, 'documento.jpg');
    assert.strictEqual(resNull.success, false);
  });
});
