// @tear-proof issue-1
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { extractTextFromPdfContentAsync, parseDocumentFields } from '../../core/document-parser.js';
import { performBrowserClientOcr } from '../../core/browser-ocr.js';

describe('doc2fill Browser Autonomy, Clinical Anti-Glosa Integration & Crypto Checkout (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): extractTextFromPdfContentAsync descompacta FlateDecode e parseDocumentFields aplica tradução clínica Anti-Glosa TUSS', async () => {
    const medicalPdfStream = `
      BT
      /F1 12 Tf
      (CLINICA ODONTOLOGICA INTEGRADA LTDA) Tj
      (CNPJ: 12.345.678/0001-90) Tj
      (Recibo: 000991) Tj
      (Data: 18/10/2026) Tj
      (Valor Total: R$ 3.500,00) Tj
      (Procedimento realizado: Aplicacao de lente de contato dental e clareamento) Tj
      ET
    `;
    const compressed = zlib.deflateSync(Buffer.from(medicalPdfStream, 'utf-8'));
    const pdfBuf = Buffer.concat([
      Buffer.from('%PDF-1.4\n1 0 obj\n<< /Length ' + compressed.length + ' /Filter /FlateDecode >>\nstream\n'),
      compressed,
      Buffer.from('\nendstream\nendobj\n%%EOF')
    ]);

    const extractedText = await extractTextFromPdfContentAsync(pdfBuf);
    assert.ok(extractedText.includes('12.345.678/0001-90'));

    const parsed = parseDocumentFields(extractedText, 'recibo_odonto.pdf');
    assert.equal(parsed.cnpj, '12.345.678/0001-90');
    assert.equal(parsed.valor, 'R$ 3.500,00');
    assert.ok(parsed.descritivo.includes('Reabilitação funcional'), 'Deve traduzir lente dental para Reabilitação funcional');
    assert.ok(parsed.motivo.includes('desgaste oclusal'), 'Deve incluir motivo funcional contra glosa');
  });

  it('Cenário 2 (Edge Case): performBrowserClientOcr extrai chave SEFAZ via BarcodeDetector simulado quando offline', async () => {
    const origBarcode = globalThis.BarcodeDetector;
    const origImage = globalThis.Image;

    try {
      globalThis.Image = class {
        set src(val) { setTimeout(() => this.onload && this.onload(), 5); }
      };
      globalThis.BarcodeDetector = class {
        async detect() {
          return [{ rawValue: 'https://www.sefaz.rs.gov.br/NFCE?p=35261061412110054088650010000458211839201924|2|1' }];
        }
      };

      const res = await performBrowserClientOcr('data:image/png;base64,iVBORw0KGgo=', 'cupom_qr.png');
      assert.equal(res.success, true);
      assert.equal(res.source, 'chrome_barcode_detector');
      assert.equal(res.data.cnpj, '61.412.110/0540-88');
      assert.equal(res.data.numero_documento, '000045821');
    } finally {
      globalThis.BarcodeDetector = origBarcode;
      globalThis.Image = origImage;
    }
  });

  it('Cenário 3 (Error Path): performBrowserClientOcr lida com entradas vazias ou inválidas com segurança', async () => {
    const resNull = await performBrowserClientOcr(null);
    assert.equal(resNull.success, false);
    assert.equal(resNull.source, 'invalid_input');
  });

  it('Cenário 4 (Static Integrity): scripts da extensão e sidepanel compilam com sintaxe válida', () => {
    assert.doesNotThrow(() => {
      execSync('node -c extension/sidepanel.js extension/content.js', { encoding: 'utf-8' });
    });
  });

  it('Cenário 5 (Design System Integrity): sidepanel e tokens Warm Light Craft estão preservados', () => {
    const sidepanelCss = fs.readFileSync('extension/sidepanel.css', 'utf-8');
    const sidepanelHtml = fs.readFileSync('extension/sidepanel.html', 'utf-8');
    const sidepanelJs = fs.readFileSync('extension/sidepanel.js', 'utf-8');

    // Valida tokens oficiais da paleta Warm Light Craft
    assert.ok(sidepanelCss.includes('--brand-amber-primary: #F59E0B;'), 'Deve declarar o âmbar primário oficial');
    assert.ok(sidepanelCss.includes('--brand-amber-hover: #D97706;'), 'Deve declarar o âmbar hover oficial');
    assert.ok(sidepanelCss.includes('--text-heading: #111827;'), 'Deve declarar carvão mineral para headings');

    // Valida elementos do card Documento Detectado
    assert.ok(sidepanelHtml.includes('id="summary-doc-title"'), 'Deve conter summary-doc-title');
    assert.ok(sidepanelHtml.includes('id="summary-cnpj-val"'), 'Deve conter summary-cnpj-val');
    assert.ok(sidepanelHtml.includes('id="summary-valor-val"'), 'Deve conter summary-valor-val');

    // Valida header limpo (Wordmark isolado, sem CCHA/AGU, badge Beta simples)
    assert.ok(sidepanelHtml.includes('icons/logo-wordmark.svg'), 'Header deve usar apenas a wordmark doc2fill');
    assert.ok(!sidepanelHtml.includes('CCHA · AGU'), 'Header não deve conter CCHA · AGU');
    assert.ok(sidepanelHtml.includes('>Beta</span>'), 'Badge deve exibir apenas Beta');

    // Valida orçamento de linhas per Regra #24
    const jsLines = sidepanelJs.split('\n').length;
    assert.ok(jsLines <= 700, `sidepanel.js deve ter no máximo 700 linhas (atual: ${jsLines})`);
  });
});
