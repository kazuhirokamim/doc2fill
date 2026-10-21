// @tear-proof issue-1
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { extractTextFromPdfContent, parseDocumentFields } from '../../core/document-parser.js';

describe('doc2fill FlateDecode PDF Decompressor Engine (TDD Suite)', () => {
  it('Cenário 1 (Happy Path): descompacta stream FlateDecode e extrai entidades fiscais (CNPJ, Valor, Data, NF)', async () => {
    // Conteúdo textual típico de uma DANFE dentro de stream PDF
    const innerTextStream = `
      BT
      /F1 12 Tf
      (PREFEITURA MUNICIPAL DE SAO PAULO) Tj
      (NOTA FISCAL DE SERVICOS ELETRONICA - NFS-e) Tj
      (Numero da Nota: 202604812) Tj
      (Data de Emissao: 15/09/2026) Tj
      (Prestador: HOSPITAL ALBERT EINSTEIN S/A) Tj
      (CNPJ: 60.765.823/0001-30) Tj
      (Valor Total da Nota: R$ 4.850,00) Tj
      (Descricao: CONSULTA MEDICA ESPECIALIZADA) Tj
      ET
    `;

    const compressedStream = zlib.deflateSync(Buffer.from(innerTextStream, 'utf-8'));

    // Monta a estrutura binária de um PDF real com objeto de stream comprimido
    const pdfContent = Buffer.concat([
      Buffer.from('%PDF-1.4\n1 0 obj\n<< /Length ' + compressedStream.length + ' /Filter /FlateDecode >>\nstream\n'),
      compressedStream,
      Buffer.from('\nendstream\nendobj\nxref\n0 2\ntrailer\n<< /Root 1 0 R >>\n%%EOF')
    ]);

    const extracted = extractTextFromPdfContent(pdfContent);
    assert.ok(extracted.length > 50, 'Texto extraído deve ter mais de 50 caracteres');
    assert.match(extracted, /60\.765\.823\/0001-30/);
    assert.match(extracted, /4\.850,00/);
    assert.match(extracted, /202604812/);

    const parsed = parseDocumentFields(extracted, 'danfe_hospital_einstein.pdf');
    assert.equal(parsed.cnpj, '60.765.823/0001-30');
    assert.equal(parsed.valor, 'R$ 4.850,00');
    assert.equal(parsed.numero_documento, '202604812');
  });

  it('Cenário 2 (Edge Case): suporta PDF híbrido com múltiplos streams comprimidos e não-comprimidos', () => {
    const stream1 = zlib.deflateSync(Buffer.from('BT (Fornecedor: FARMACIA DROGASIL S/A) Tj (CNPJ: 61.585.865/0240-31) ET', 'utf-8'));
    const stream2 = 'BT (Valor Total: R$ 189,90) Tj (Cupom: 098451) ET';

    const pdfHybrid = Buffer.concat([
      Buffer.from('%PDF-1.4\n1 0 obj\n<< /Length ' + stream1.length + ' /Filter [/FlateDecode] >>\nstream\r\n'),
      stream1,
      Buffer.from('\r\nendstream\nendobj\n2 0 obj\n<< /Length ' + stream2.length + ' >>\nstream\n'),
      Buffer.from(stream2, 'utf-8'),
      Buffer.from('\nendstream\nendobj\n%%EOF')
    ]);

    const extracted = extractTextFromPdfContent(pdfHybrid);
    assert.match(extracted, /61\.585\.865\/0240-31/);
    assert.match(extracted, /189,90/);

    const parsed = parseDocumentFields(extracted, 'cupom_drogasil.pdf');
    assert.equal(parsed.cnpj, '61.585.865/0240-31');
    assert.equal(parsed.valor, 'R$ 189,90');
  });

  it('Cenário 3 (Error Path): lida defensivamente com stream FlateDecode corrompido sem quebrar a execução', () => {
    // Stream alegando FlateDecode mas contendo lixo binário corrompido
    const corruptBytes = Buffer.from([0xFF, 0xFE, 0x00, 0x12, 0x34, 0x56, 0x78]);
    const corruptPdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n1 0 obj\n<< /Length ' + corruptBytes.length + ' /Filter /FlateDecode >>\nstream\n'),
      corruptBytes,
      Buffer.from('\nendstream\nendobj\n%%EOF')
    ]);

    let extracted = '';
    assert.doesNotThrow(() => {
      extracted = extractTextFromPdfContent(corruptPdf);
    });
    assert.equal(typeof extracted, 'string');
  });
});
