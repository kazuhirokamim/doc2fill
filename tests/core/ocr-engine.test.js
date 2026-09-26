// tests/core/ocr-engine.test.js
// Suíte TDD para o Motor de OCR e Extração de Documentos CCHA (3 Cenários Obrigatórios Tear)
import test from 'node:test';
import assert from 'node:assert/strict';
import { processOcrText, cleanOcrText } from '../../core/ocr-engine.js';

test('Motor OCR — 1. Caminho Feliz (Happy Path): higieniza texto OCR e extrai campos do CCHA', () => {
  const rawOcrOutput = `
    CONSELHO CURADOR DOS HONORÁRIOS ADVOCATÍCIOS - CCHA
    REQUERIMENTO DE RATEIO DE HONORÁRIOS
    
    Beneficiário: DR. LUCAS SILVA
    CPF: 123.456.789-00
    OAB: 458921/DF
    Processo Judicial nº: 0045821-44.2026.4.01.3400
    Dados Bancários: Banco do Brasil (001)
    Agência: 3380-4  Conta Corrente: 45210-9
    Valor Total dos Honorários: R$ 14.850,00
    Data: 25/09/2026
    Objeto: Atuação judicial perante o TRF1 em defesa da União Federal.
  `;

  const cleaned = cleanOcrText(rawOcrOutput);
  assert.ok(cleaned.length > 50, 'Texto higienizado deve conter caracteres úteis');

  const result = processOcrText(rawOcrOutput, 'comprovante_honorarios.jpg');
  assert.equal(result.cpf, '123.456.789-00');
  assert.equal(result.nome, 'LUCAS SILVA');
  assert.equal(result.processo, '0045821-44.2026.4.01.3400');
  assert.equal(result.agencia, '3380-4');
  assert.equal(result.conta, '45210-9');
  assert.equal(result.valor, 'R$ 14.850,00');
  assert.ok(result.rawText.includes('CONSELHO CURADOR'));
});

test('Motor OCR — 2. Casos de Borda (Edge Cases): caracteres ruidosos, quebras múltiplas e texto vazio', () => {
  // Borda A: texto vazio ou apenas espaços
  const emptyResult = processOcrText('', 'foto.png');
  assert.equal(emptyResult.rawText, '');
  assert.equal(emptyResult.cpf, null);

  // Borda B: OCR com ruído de scanner (^, ~, pipes e espaços redundantes)
  const noisyOcr = `
    | C.P.F : 987.654.321-11 |
    | V a l o r : R$  2 . 5 0 0 , 0 0 |
    N° Processo: 0012345-67.2025.5.02.0000
  `;
  const noisyResult = processOcrText(noisyOcr, 'scan.jpg');
  assert.equal(noisyResult.cpf, '987.654.321-11');
  assert.equal(noisyResult.processo, '0012345-67.2025.5.02.0000');

  // Borda C: Data em formato misto com traços
  const textWithIsoDate = 'Data da Sessão: 2026-09-25';
  const dateResult = processOcrText(textWithIsoDate, 'doc.png');
  assert.equal(dateResult.data, '2026-09-25');
});

test('Motor OCR — 3. Tratamento de Erro (Error Path): entradas nulas, tipos inválidos e exceções controladas', () => {
  // Erro A: entrada nula
  const nullResult = processOcrText(null);
  assert.equal(nullResult.rawText, '');
  assert.equal(nullResult.cpf, null);

  // Erro B: entrada não string
  const objectResult = processOcrText({ invalid: true });
  assert.equal(objectResult.rawText, '');

  // Erro C: cleanOcrText com entrada indefinida
  assert.equal(cleanOcrText(undefined), '');
});
