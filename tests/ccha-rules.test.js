// @tear-proof issue-1-ccha-refinement
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDateText } from '../core/date-normalizer.js';
import { parseDocumentFields } from '../core/document-parser.js';

describe('Refinamento de Extração Semântica e Resiliência CCHA (PLAN-029 / ADR-037)', () => {

  describe('1. Normalizador de Datas Numéricas e por Extenso (core/date-normalizer.js)', () => {
    it('Cenário 1 (Happy Path): normaliza datas com hífens, barras e datas por extenso em português', () => {
      // Data com hífen em comprovante NFC-e
      assert.equal(normalizeDateText('Emissao 11-09-2026 20:47:02'), '2026-09-11');
      // Data com barras padrão
      assert.equal(normalizeDateText('DATA DA EMISSÃO: 21/10/2026'), '2026-10-21');
      // Data com pontos
      assert.equal(normalizeDateText('Emissão: 15.08.2026'), '2026-08-15');
      // Data por extenso formal
      assert.equal(normalizeDateText('Campo Grande - MS, 09 de novembro de 2026'), '2026-11-09');
      // Data por extenso com mês abreviado
      assert.equal(normalizeDateText('Emitido em 23 de out de 2026'), '2026-10-23');
    });

    it('Cenário 2 (Edge Case): suporta meses em maiúsculas, variações de espaçamento e dias sem zero à esquerda', () => {
      assert.equal(normalizeDateText('05 DE JANEIRO DE 2026'), '2026-01-05');
      assert.equal(normalizeDateText('1   de   março   de   2026'), '2026-03-01');
      assert.equal(normalizeDateText('9 de Novembro de 2026'), '2026-11-09');
      assert.equal(normalizeDateText('31 de Dez. de 2025'), '2025-12-31');
      assert.equal(normalizeDateText('São Paulo, 12 de Fevereiro de 2026.'), '2026-02-12');
    });

    it('Cenário 3 (Error Path): lida com strings vazias, textos sem datas ou entradas inválidas sem disparar exceção', () => {
      assert.equal(normalizeDateText(''), null);
      assert.equal(normalizeDateText(null), null);
      assert.equal(normalizeDateText(undefined), null);
      assert.equal(normalizeDateText('Documento sem data alguma apenas texto'), null);
      assert.equal(normalizeDateText('Data: 99/99/9999 invalida'), null);
    });
  });

  describe('2. Caso Drogasil NFC-e: Prioridade de Data e Descritivo Anti-Glosa CCHA', () => {
    const rawOcrDrogasil = `
 CG BANDEIRANTES 2 
 RAIADROGASIL SA 
RUA BRILHANTE, 2725 - VL BANDEIRANTE - CAMPO GRANDE - MS
 CNPJ: 61.585.865/3066-68 - I.E: 284763977 
--------------------------------------------------------
 DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletronica 
01 00765469 J&J BAB SAB DERMA 200M 1 UN X 53,99 53,99
 De 53,99 por 44,59 desconto de-9,40
 Valor Liquido 44,59
QTD. TOTAL DE ITENS 1
VALOR TOTAL DESCONTO R$ 9,40
VALOR TOTAL R$ 44,59
FORMA DE PAGAMENTO VALOR PAGO
CARTAO DE CREDITO 44,59
 NFC-e No. 000057127 Serie 098 
 Emissao 11-09-2026 20:47:02 
 CHAVE DE ACESSO 
 5026 0961 5858 6530 6668 6509 8000 0571 2710 1858 3992 
 CONSUMIDOR CPF: 001.687.471-46
    `;

    it('Cenário 1 (Happy Path): recupera a data exata 11/09/2026 sobrescrevendo o primeiro dia da chave SEFAZ', () => {
      const parsed = parseDocumentFields(rawOcrDrogasil, 'drogasil_cupom.pdf');
      assert.equal(parsed.data, '2026-09-11', 'Data deve ser 2026-09-11 e não 2026-09-01');
      assert.equal(parsed.valor, 'R$ 44,59');
      assert.equal(parsed.fornecedor, 'RAIADROGASIL SA');
    });

    it('Cenário 2 (Anti-Glosa CCHA): gera descritivo e motivo concisos e remove número de doc do texto', () => {
      const parsed = parseDocumentFields(rawOcrDrogasil, 'drogasil_cupom.pdf');
      assert.equal(parsed.descritivo, 'Aquisição de medicamentos/insumos farmacêuticos recomendado por médico');
      assert.equal(parsed.motivo, 'Recomendação médica.');
      assert.ok(!parsed.descritivo.includes('000057127'), 'Descritivo não deve conter número do documento');
      assert.ok(!parsed.descritivo.includes('J&J BAB SAB DERMA'), 'Descritivo não deve conter código cru de OCR');
      assert.ok(!parsed.motivo.includes('CCHA'), 'Motivo não deve ser redundante citando CCHA');
    });

    it('Cenário 3 (Error Path): lida com cupom térmico severamente degradado sem quebrar campos canônicos', () => {
      const parsed = parseDocumentFields('Drogaria Pacheco - Cupom 1234', 'cupom.pdf');
      assert.equal(parsed.descritivo, 'Aquisição de medicamentos/insumos farmacêuticos recomendado por médico');
      assert.equal(parsed.motivo, 'Recomendação médica.');
      assert.ok(typeof parsed.tipo_documento === 'string');
    });
  });

  describe('3. Caso DANFE Ragassistore: Higienização de Canhoto e Valor Multilinhas', () => {
    const rawOcrDanfeRagassistore = `
NF-e Nº 000.098.919 SÉRIE 006
DATA DE RECEBIMENTO IDENTIFICACAO E ASSINATURA DO RECEBEDOR
RECEBEMOS DE RAGASSISTORE VARIEDADES LTDA OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO
RAGASSISTORE VARIEDADES LTDA
DANFE Documento Auxiliar da Nota Fiscal Eletrônica
0: Entrada 1: Saída 1
Nº 000.098.919 SÉRIE: 006
CHAVE DE ACESSO
3526 1037 2977 1100 0180 5500 6000 0989 1911 7836 4757
INSCRIÇÃO ESTADUAL: 137706487116 CNPJ: 37.297.711/0001-80
DESTINATÁRIO / REMETENTE
Patricia Akemi Kamimura CNPJ/CPF: 001.687.471-46
DATA DA EMISSÃO: 21/10/2026
CÁLCULO DO IMPOSTO
BASE DE CÁLCULO DO ICMS VALOR DO ICMS BASE DE CÁLCULO DO ICMS SUBSTITUIÇÃO VALOR DO ICMS SUBSTITUIÇÃO VALOR TOTAL DOS PRODUTOS
VALOR DO FRETE VALOR DO SEGURO DESCONTO OUTRAS DESPESAS ACESSÓRIAS VALOR DO IPI VALOR TOTAL DA NOTA
0,00 0,00 0,00 0,00 39,87
0,00 0,00 0,00 0,00 0,00 39,87
DADOS DO PRODUTO / SERVIÇOS
MLB6624117486 150u Toalha Desidratada P/ Tratamentos Esteticos Descartavel Todo Tipo De Pele 63079090 0102 6108 UNID 1 39,87 39,87
    `;

    it('Cenário 1 (Happy Path): higieniza o canhoto e extrai apenas a Razão Social real do emitente', () => {
      const parsed = parseDocumentFields(rawOcrDanfeRagassistore, 'ragassistore.pdf');
      assert.equal(parsed.fornecedor, 'RAGASSISTORE VARIEDADES LTDA');
      assert.ok(!parsed.fornecedor.startsWith('RECEBEMOS DE'), 'Não deve conter prefixo do canhoto');
      assert.ok(!parsed.fornecedor.includes('OS PRODUTOS CONSTANTES'), 'Não deve conter sufixo do canhoto');
    });

    it('Cenário 1.2 (Edge Case - Canhoto Destacado e Nome em Múltiplas Linhas no DANFE): extrai fornecedor pré-DANFE', () => {
      // Simula canhoto destacado no picote e nome em 2 linhas na coluna do emitente
      const danfeSemCanhoto = `
NF-e Nº 000.098.919 SÉRIE 006
Rua dos Crepis, 73, Nao consta - Vila Bela, Sao Paulo, SP - CEP: 03201053 Fone: 0000000000
RAGASSISTORE
VARIEDADES LTDA
DANFE Documento Auxiliar da Nota Fiscal Eletrônica
0: Entrada 1: Saída 1
Nº 000.098.919 SÉRIE: 006
CHAVE DE ACESSO
3526 1037 2977 1100 0180 5500 6000 0989 1911 7836 4757
INSCRIÇÃO ESTADUAL: 137706487116 CNPJ: 37.297.711/0001-80
DESTINATÁRIO / REMETENTE
Patricia Akemi Kamimura CNPJ/CPF: 001.687.471-46
DATA DA EMISSÃO: 21/10/2026
TRANSPORTADOR/VOLUME
RAZÃO SOCIAL: Ebazar.com.br LTDA. CNPJ/CPF: 03.007.331/0001-41
MLB6624117486 150u Toalha Desidratada 1 UN 39,87 39,87
      `;
      const parsed = parseDocumentFields(danfeSemCanhoto, 'danfe_sem_canhoto.pdf');
      assert.equal(parsed.fornecedor, 'RAGASSISTORE VARIEDADES LTDA', 'Deve unificar RAGASSISTORE e VARIEDADES LTDA ignorando endereço e transportadora');
      assert.notEqual(parsed.fornecedor, 'VARIEDADES LTDA', 'Não deve perder a primeira linha do nome');
      assert.notEqual(parsed.fornecedor, 'Ebazar.com.br LTDA.', 'Não deve capturar a transportadora');
      assert.equal(parsed.cpf_cnpj, '37.297.711/0001-80', 'CNPJ deve ser o do emitente, amarrado pela chave SEFAZ');
    });

    it('Cenário 2 (Happy Path): extrai o valor total R$ 39,87 da tabela de impostos multilinhas', () => {
      const parsed = parseDocumentFields(rawOcrDanfeRagassistore, 'ragassistore.pdf');
      assert.equal(parsed.valor, 'R$ 39,87', 'Deve capturar o valor total da nota de R$ 39,87');
      assert.equal(parsed.data, '2026-10-21');
    });

    it('Cenário 3 (Error Path): quando tabela de cálculo do imposto estiver corrompida, extrai valor dos itens', () => {
      const textoSemImposto = `
        RECEBEMOS DE RAGASSISTORE VARIEDADES LTDA OS PRODUTOS
        CNPJ: 37.297.711/0001-80
        MLB6624117486 Toalha Desidratada 1 UN 39,87 39,87
      `;
      const parsed = parseDocumentFields(textoSemImposto, 'teste.pdf');
      assert.equal(parsed.fornecedor, 'RAGASSISTORE VARIEDADES LTDA');
      assert.equal(parsed.valor, 'R$ 39,87');
    });
  });

  describe('4. Caso DANFSe Campo Grande: Discriminação Prestador vs Tomador e Consulta Médica', () => {
    const rawOcrNfsePediatra = `
DANFSe v2.0 - Documento Auxiliar da NFS-e
NÚMERO DA NFS-E: 1.554
COMPETÊNCIA DA NFS-E: 23/10/2026
DATA E HORA DA EMISSÃO DA NFS-E: 23/10/2026 14:32:46
PRESTADOR / FORNECEDOR
Nome / Nome Empresarial: SOARES E SILVA SERVICOS MEDICOS S/S
CNPJ/CPF/NIF: 28.204.359/0001-08
TOMADOR / ADQUIRENTE
Nome / Nome Empresarial: LUCAS BOCCARO POFFO
CNPJ/CPF/NIF: 050.483.651-00
SERVIÇO PRESTADO: ATIVIDADE MEDICA AMBULATORIAL RESTRITA A CONSULTAS
Descrição Do Serviço: REFERENTE A CONSULTA COM PEDIATRA DR GIOVANA DANTAS DA SILVA CRM 11069 CONSULTA 19/10/2026 PACIENTE: Nolan kiyoshi kamimura Poffo
VALOR TOTAL DA NFS-E: R$ 450,00
Valor Da Operação / Serviço: R$ 450,00
    `;

    it('Cenário 1 (Happy Path): isola o Prestador como fornecedor e seu CNPJ, ignorando o Tomador', () => {
      const parsed = parseDocumentFields(rawOcrNfsePediatra, 'nfse_pediatra.pdf');
      assert.equal(parsed.fornecedor, 'SOARES E SILVA SERVICOS MEDICOS S/S');
      assert.equal(parsed.cpf_cnpj, '28.204.359/0001-08');
      assert.notEqual(parsed.fornecedor, 'LUCAS BOCCARO POFFO');
    });

    it('Cenário 2 (Anti-Glosa CCHA): gera descritivo e motivo de consulta médica sem número de doc', () => {
      const parsed = parseDocumentFields(rawOcrNfsePediatra, 'nfse_pediatra.pdf');
      assert.equal(parsed.descritivo, 'Consulta médica ambulatorial');
      assert.equal(parsed.motivo, 'Recomendação médica.');
      assert.equal(parsed.valor, 'R$ 450,00');
      assert.equal(parsed.data, '2026-10-23');
    });

    it('Cenário 3 (Error Path): NFS-e sem discriminação de prestador não explode exceção', () => {
      const parsed = parseDocumentFields('NFS-e Valor Total R$ 100,00', 'nfse.pdf');
      assert.ok(typeof parsed.descritivo === 'string');
      assert.equal(parsed.valor, 'R$ 100,00');
    });
  });

});
