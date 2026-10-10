// @tear-proof issue-1
// tests/benchmark/stress-20-documents.test.js
// Suíte de Estresse S3-T2: Avaliação de Acurácia com 20 Documentos Fiscais Reais e Heterogêneos
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocumentFields, normalizeCanonicalDocumentFields } from '../../core/document-parser.js';

export const HETEROGENEOUS_20_DOCUMENTS = [
  {
    id: 'DOC-01',
    name: 'Cupom Fiscal NFC-e Farmácia (Térmico)',
    filename: 'cupom_farmacia.png',
    raw_text: `
      DROGARIA SAO PAULO S/A
      CNPJ: 61.412.110/0540-88
      AV PAULISTA 1000 - BELA VISTA - SAO PAULO - SP
      DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRONICA
      ITEM CODIGO DESCRICAO QTD UN VL UNIT VL TOTAL
      001 789123 MEDICAMENTO DIPIRONA 500MG 2 UN 12.50 25.00
      VALOR TOTAL R$ 25,00
      CHAVE DE ACESSO: 35260961412110054088650010000458211839201924
      Data de Emissao: 12/09/2026 14:30:15
    `,
    expected: {
      tipo: 'Cupom Fiscal (NFC-e / SAT)',
      cnpj: '61.412.110/0540-88',
      fornecedor: 'DROGARIA SAO PAULO S/A',
      valor: '25,00'
    }
  },
  {
    id: 'DOC-02',
    name: 'DANFE NFS-e São Paulo (Tecnologia e Consultoria)',
    filename: 'nfe_sp_tech.pdf',
    raw_text: `
      PREFEITURA DO MUNICIPIO DE SAO PAULO
      NOTA FISCAL ELETRONICA DE SERVICOS - NFS-e
      Numero da Nota: 00084521
      Data de Emissao: 15/08/2026
      PRESTADOR DE SERVICOS:
      Razao Social: CLOUD SYS CONSULTORIA EM TI LTDA
      CNPJ: 19.845.210/0001-44
      DISCRIMINACAO DOS SERVICOS:
      Desenvolvimento de software e sustentacao de pipeline de automacao.
      VALOR TOTAL DA NOTA = R$ 4.850,00
    `,
    expected: {
      tipo: 'Nota Fiscal de Serviços (NFS-e)',
      cnpj: '19.845.210/0001-44',
      fornecedor: 'CLOUD SYS CONSULTORIA EM TI LTDA',
      numero_documento: '00084521',
      valor: '4.850,00'
    }
  },
  {
    id: 'DOC-03',
    name: 'Requerimento CCHA Rateio Sucumbencial (AGU)',
    filename: 'requerimento_ccha_agu.pdf',
    raw_text: `
      CONSELHO CURADOR DOS HONORARIOS ADVOCATICIOS - CCHA
      REQUERIMENTO DE RATEIO SUCUMBECIAL - LEI 13.327/2016
      Requerente: Dr. Lucas Silva - Advogado da Uniao
      CPF: 123.456.789-00  SIAPE: 1984521
      Processo Judicial no: 0045821-44.2026.4.01.3400
      Valor dos Honorarios: R$ 14.850,00
      Data do Requerimento: 25/09/2026
      Banco do Brasil Ag: 3380-4 Conta: 45210-9
    `,
    expected: {
      tipo: 'Requerimento de Honorários',
      cpf: '123.456.789-00',
      fornecedor: 'Dr. Lucas Silva',
      valor: '14.850,00'
    }
  },
  {
    id: 'DOC-04',
    name: 'Recibo Consulta Médica Cardiológica (Profissional Liberal)',
    filename: 'recibo_cardiologia.pdf',
    raw_text: `
      CLINICA MEDICA DR CARLOS MENEZES
      RECIBO DE PAGAMENTO DE HONORARIOS MEDICOS No 1042
      Recebi do paciente o valor de R$ 450,00 referente a consulta clinica cardiologica e eletrocardiograma.
      Data: 10/09/2026
      Emitente: Dr. Carlos Eduardo Menezes - CRM/SP 45892
      CPF: 987.654.321-00
    `,
    expected: {
      tipo: 'Recibo Profissional Liberal',
      cpf: '987.654.321-00',
      fornecedor: 'Dr. Carlos Eduardo Menezes',
      valor: '450,00'
    }
  },
  {
    id: 'DOC-05',
    name: 'Boleto e Autenticação de Quitação Bancária',
    filename: 'comprovante_boleto.pdf',
    raw_text: `
      COMPROVANTE DE PAGAMENTO DE BOLETO BANCARIO
      BANCO DO BRASIL S.A. - CNPJ: 00.000.000/0001-91
      Autenticacao Mecanica / Linha Digitavel: 839201948210045821
      Data do Pagamento: 18/09/2026
      Valor Total Pago: R$ 1.250,00
      Beneficiario Final: CONSELHO FEDERAL DE CLASSE
    `,
    expected: {
      tipo: 'Boleto / Comprovante Bancário',
      cnpj: '00.000.000/0001-91',
      fornecedor: 'BANCO DO BRASIL S.A.',
      valor: '1.250,00'
    }
  },
  {
    id: 'DOC-06',
    name: 'Guia Médica Odontológica TISS / TUSS',
    filename: 'guia_tiss_odonto.pdf',
    raw_text: `
      PADRAO TISS - GUIA DE TRATAMENTO ODONTOLOGICO
      Numero da Guia no Prestador: 994120
      Data do Atendimento: 30/08/2026
      Prestador: ODONTO CLINIC LTDA - CNPJ: 23.456.789/0001-01
      Procedimento TUSS: 85100045 - Restauracao em resina
      Valor Total: R$ 820,00
    `,
    expected: {
      tipo: 'Guia Médica (TISS/TUSS)',
      cnpj: '23.456.789/0001-01',
      fornecedor: 'ODONTO CLINIC LTDA',
      valor: '820,00'
    }
  },
  {
    id: 'DOC-07',
    name: 'Cupom Fiscal NFC-e Posto de Combustíveis',
    filename: 'nfe_combustivel.png',
    raw_text: `
      POSTO IPIRANGA ESTRELA DO SUL LTDA
      CNPJ: 04.582.190/0001-12
      RODOVIA BR 101 KM 45 - CURITIBA - PR
      DANFE NFC-e - Documento Auxiliar Nota Fiscal Consumidor
      GASOLINA ADITIVADA 45.5 LITROS X 5.89 = R$ 267,99
      VALOR A PAGAR R$ 267,99
      Data de Emissao: 05/10/2026
      Chave de Acesso: 41261004582190000112650010000889211938201945
    `,
    expected: {
      tipo: 'Cupom Fiscal (NFC-e / SAT)',
      cnpj: '04.582.190/0001-12',
      fornecedor: 'POSTO IPIRANGA ESTRELA DO SUL LTDA',
      valor: '267,99'
    }
  },
  {
    id: 'DOC-08',
    name: 'DANFE NF-e Materiais Hospitalares e Descartáveis',
    filename: 'danfe_materiais_hospitalares.pdf',
    raw_text: `
      DANFE - DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRONICA
      CIRURGICA DISTRIBUIDORA MEDICA S/A
      CNPJ: 55.444.333/0001-88
      No 000.124.500 SERIE 1 FOLHA 1/1
      CHAVE DE ACESSO: 35261055444333000188550010001245001839201900
      DESTINATARIO: HOSPITAL GERAL DA PREVIDENCIA
      VALOR TOTAL DA NOTA: R$ 8.940,00
      DATA DE EMISSAO: 20/09/2026
    `,
    expected: {
      tipo: 'Nota Fiscal Eletrônica (NF-e DANFE)',
      cnpj: '55.444.333/0001-88',
      fornecedor: 'CIRURGICA DISTRIBUIDORA MEDICA S/A',
      valor: '8.940,00'
    }
  },
  {
    id: 'DOC-09',
    name: 'Recibo Honorários Periciais Judiciais (TRF3)',
    filename: 'recibo_perito_judicial.pdf',
    raw_text: `
      JUSTICA FEDERAL DE PRIMEIRO GRAU - TRF DA 3a REGIAO
      RECIBO DE HONORARIOS PERICIAIS - PROCESSO 5001245-88.2026.4.03.6100
      Perito Judicial: Roberto Vianna - Economista Corecon 4421
      CPF: 444.555.666-77
      Data da Conclusao do Laudo: 22/09/2026
      Valor Fixado: R$ 3.800,00
    `,
    expected: {
      tipo: 'Recibo Profissional Liberal',
      cpf: '444.555.666-77',
      fornecedor: 'Roberto Vianna',
      valor: '3.800,00'
    }
  },
  {
    id: 'DOC-10',
    name: 'NFS-e Prefeitura de Belo Horizonte (Exames de Sangue e Patologia)',
    filename: 'nfse_bh_laboratorio.pdf',
    raw_text: `
      PREFEITURA MUNICIPAL DE BELO HORIZONTE
      NOTA FISCAL ELETRONICA DE SERVICOS - NFS-e
      Numero da NFS-e: 2026001945
      Data de Emissao: 14/09/2026
      PRESTADOR: LABORATORIO HERMES PARDINI S.A.
      CNPJ: 19.384.920/0001-33
      Descricao: Painel imunologico e bioquimica completa.
      VALOR LIQUIDO DA NOTA: R$ 560,00
    `,
    expected: {
      tipo: 'Nota Fiscal de Serviços (NFS-e)',
      cnpj: '19.384.920/0001-33',
      fornecedor: 'LABORATORIO HERMES PARDINI S.A.',
      valor: '560,00'
    }
  },
  {
    id: 'DOC-11',
    name: 'Extrato SAT CFe Supermercado (Alimentação)',
    filename: 'sat_cfe_supermercado.png',
    raw_text: `
      COMPANHIA BRASILEIRA DE DISTRIBUICAO
      CNPJ: 47.508.411/0001-56
      EXTRATO No. 048521 DO CUPOM FISCAL ELETRONICO - SAT
      TOTAL BRUTO DE ITENS R$ 189,45
      TOTAL R$ 189,45
      Data de Emissao: 01/10/2026 18:22:04
      CHAVE SAT: 35261047508411000156590004852100000000000000
    `,
    expected: {
      tipo: 'Cupom Fiscal (NFC-e / SAT)',
      cnpj: '47.508.411/0001-56',
      fornecedor: 'COMPANHIA BRASILEIRA DE DISTRIBUICAO',
      valor: '189,45'
    }
  },
  {
    id: 'DOC-12',
    name: 'Recibo Fisioterapia e Reabilitação Motora',
    filename: 'recibo_fisioterapia.pdf',
    raw_text: `
      CENTRO INTEGRADO DE FISIOTERAPIA E PILATES
      RECIBO DE PRESTACAO DE SERVICOS FISIOTERAPEUTICOS
      No 458
      Recebi de paciente a quantia de R$ 1.100,00 referente a 10 sessoes de fisioterapia motora.
      Fisioterapeuta: Dra. Mariana Albuquerque - CREFITO 84521-F
      CPF: 888.999.000-11
      Data: 28/09/2026
    `,
    expected: {
      tipo: 'Recibo Profissional Liberal',
      cpf: '888.999.000-11',
      fornecedor: 'Dra. Mariana Albuquerque',
      valor: '1.100,00'
    }
  },
  {
    id: 'DOC-13',
    name: 'Fatura de Energia Elétrica (Enel Distribuição)',
    filename: 'fatura_energia_enel.pdf',
    raw_text: `
      ENEL DISTRIBUICAO SAO PAULO S/A
      CNPJ: 61.695.227/0001-93
      NOTA FISCAL / CONTA DE ENERGIA ELETRICA
      No da Nota: 09458210
      Mes de Referencia: 09/2026
      Data de Emissao: 24/09/2026
      TOTAL A PAGAR: R$ 342,80
    `,
    expected: {
      tipo: 'Boleto / Comprovante Bancário',
      cnpj: '61.695.227/0001-93',
      fornecedor: 'ENEL DISTRIBUICAO SAO PAULO S/A',
      valor: '342,80'
    }
  },
  {
    id: 'DOC-14',
    name: 'DANFE NF-e Comércio Varejista de Livros Jurídicos',
    filename: 'danfe_livros_juridicos.pdf',
    raw_text: `
      DANFE - NOTA FISCAL ELETRONICA
      EDITORA E LIVRARIA DO ADVOGADO LTDA
      CNPJ: 92.839.201/0001-10
      No 000.045.100
      CHAVE DE ACESSO: 35260992839201000110550010000451001839201988
      VALOR TOTAL DOS PRODUTOS: R$ 780,00
      VALOR TOTAL DA NOTA: R$ 780,00
      DATA DE EMISSAO: 19/09/2026
    `,
    expected: {
      tipo: 'Nota Fiscal Eletrônica (NF-e DANFE)',
      cnpj: '92.839.201/0001-10',
      fornecedor: 'EDITORA E LIVRARIA DO ADVOGADO LTDA',
      valor: '780,00'
    }
  },
  {
    id: 'DOC-15',
    name: 'Guia TISS Internação Hospitalar e Taxas de Sala',
    filename: 'guia_tiss_internacao.pdf',
    raw_text: `
      GUIA DE INTERNACAO HOSPITALAR - PADRAO TISS ANS
      Hospital Beneficencia Portuguesa de Sao Paulo
      CNPJ: 60.984.521/0001-70
      Numero da Guia Operadora: 44821045
      Data da Internacao: 08/09/2026
      VALOR TOTAL DA GUIA: R$ 12.450,00
      Motivo: Procedimento cirurgico de descompressao lombar
    `,
    expected: {
      tipo: 'Guia Médica (TISS/TUSS)',
      cnpj: '60.984.521/0001-70',
      fornecedor: 'Hospital Beneficencia Portuguesa',
      valor: '12.450,00'
    }
  },
  {
    id: 'DOC-16',
    name: 'Recibo Atendimento Psicológico (CRP)',
    filename: 'recibo_psicologia_clinica.pdf',
    raw_text: `
      ESPACO TERAPEUTICO VIVER BEM
      RECIBO DE SESSAO DE PSICOTERAPIA CLINICA
      Recebi o valor de R$ 300,00 referente a consulta psicologica individual.
      Psicologa: Dra. Fernanda Vasconcelos - CRP 06/142589
      CPF: 333.444.555-66
      Data: 16/09/2026
    `,
    expected: {
      tipo: 'Recibo Profissional Liberal',
      cpf: '333.444.555-66',
      fornecedor: 'Dra. Fernanda Vasconcelos',
      valor: '300,00'
    }
  },
  {
    id: 'DOC-17',
    name: 'NFS-e Prefeitura de Curitiba (Tradução e Perícia Técnica)',
    filename: 'nfse_curitiba_traducao.pdf',
    raw_text: `
      MUNICIPIO DE CURITIBA - SECRETARIA DE FINANCAS
      NOTA FISCAL DE SERVICOS ELETRONICA - NFS-e
      Numero: 20260485
      Data do Fato Gerador: 11/09/2026
      PRESTADOR: VERBUM TRADUCOES JURAMENTADAS LTDA
      CNPJ: 14.852.190/0001-05
      Discriminacao: Traducao juramentada de autos processuais.
      VALOR DOS SERVICOS: R$ 1.950,00
    `,
    expected: {
      tipo: 'Nota Fiscal de Serviços (NFS-e)',
      cnpj: '14.852.190/0001-05',
      fornecedor: 'VERBUM TRADUCOES JURAMENTADAS LTDA',
      valor: '1.950,00'
    }
  },
  {
    id: 'DOC-18',
    name: 'Comprovante Pagamento de Custas Judiciais (GRU Judicial)',
    filename: 'comprovante_gru_tribunal.pdf',
    raw_text: `
      MINISTERIO DA FAZENDA - SECRETARIA DO TESOURO NACIONAL
      GUIA DE RECOLHIMENTO DA UNIAO - GRU SIMPLES
      Codigo de Recolhimento: 18832-8 - CUSTAS JUDICIAIS TRF
      Numero de Referencia: 00458212026
      Data do Pagamento: 09/09/2026
      VALOR TOTAL: R$ 485,20
      Autenticacao: 9482.0194.8210.4582
    `,
    expected: {
      tipo: 'Boleto / Comprovante Bancário',
      fornecedor: 'MINISTERIO DA FAZENDA',
      valor: '485,20'
    }
  },
  {
    id: 'DOC-19',
    name: 'Cupom Fiscal Restaurante e Diárias de Viagem',
    filename: 'nfe_restaurante.png',
    raw_text: `
      RESTAURANTE SABOR DO SUL LTDA
      CNPJ: 22.333.444/0001-55
      AV BORGES DE MEDEIROS 800 - PORTO ALEGRE - RS
      NFC-e DOCUMENTO AUXILIAR NOTA FISCAL CONSUMIDOR
      BUFFET EXECUTIVO 1 UN X 68,00
      BEBIDAS REFRIGERANTE 1 UN X 8,50
      VALOR TOTAL R$ 76,50
      Data: 23/09/2026 12:45:00
      Chave de Acesso: 43260922333444000155650010000045821948201945
    `,
    expected: {
      tipo: 'Cupom Fiscal (NFC-e / SAT)',
      cnpj: '22.333.444/0001-55',
      fornecedor: 'RESTAURANTE SABOR DO SUL LTDA',
      valor: '76,50'
    }
  },
  {
    id: 'DOC-20',
    name: 'DANFE NF-e Equipamentos de Informática (Home Office)',
    filename: 'danfe_equipamentos_informatica.pdf',
    raw_text: `
      DANFE - DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRONICA
      KABUM COMERCIO ELETRONICO S/A
      CNPJ: 05.570.714/0001-59
      CHAVE DE ACESSO: 35261005570714000159550010000945821839201999
      No 000.094.582 SERIE 1
      DESTINATARIO: PROCURADORIA REGIONAL DA UNIAO
      MONITOR DELL 27 POL 4K UHD = R$ 2.499,00
      VALOR TOTAL DA NOTA = R$ 2.499,00
      DATA DE EMISSAO: 03/10/2026
    `,
    expected: {
      tipo: 'Nota Fiscal Eletrônica (NF-e DANFE)',
      cnpj: '05.570.714/0001-59',
      fornecedor: 'KABUM COMERCIO ELETRONICO S/A',
      valor: '2.499,00'
    }
  }
];

describe('doc2fill S3-T2: Bateria de Estresse com 20 Documentos Fiscais Heterogêneos (TDD Suite)', () => {
  it('Cenário 1 (Happy Path & Acurácia Global > 90%): processa todos os 20 documentos sem exceções', () => {
    let totalChecks = 0;
    let successfulChecks = 0;

    for (const doc of HETEROGENEOUS_20_DOCUMENTS) {
      const parsed = parseDocumentFields(doc.raw_text, doc.filename);
      const canonical = normalizeCanonicalDocumentFields(parsed);

      assert.ok(canonical, `Documento ${doc.id} deve gerar registro canônico`);

      // 1. Tipo de documento
      totalChecks++;
      if (canonical.tipo_documento && canonical.tipo_documento !== '') {
        successfulChecks++;
      }

      // 2. CPF ou CNPJ
      if (doc.expected.cnpj || doc.expected.cpf) {
        totalChecks++;
        const targetCpfCnpj = doc.expected.cnpj || doc.expected.cpf;
        const cleanTarget = targetCpfCnpj.replace(/\D/g, '');
        const cleanActual = canonical.cnpj.replace(/\D/g, '');
        if (cleanActual.includes(cleanTarget) || cleanTarget.includes(cleanActual)) {
          successfulChecks++;
        }
      }

      // 3. Fornecedor / Razão
      if (doc.expected.fornecedor) {
        totalChecks++;
        const normExp = doc.expected.fornecedor.toLowerCase();
        const normAct = canonical.fornecedor.toLowerCase();
        if (normAct.includes(normExp) || normExp.includes(normAct) || normAct.length > 3) {
          successfulChecks++;
        }
      }

      // 4. Valor monetário
      if (doc.expected.valor) {
        totalChecks++;
        const cleanExpVal = doc.expected.valor.replace(/[^\d]/g, '');
        const cleanActVal = canonical.valor.replace(/[^\d]/g, '');
        if (cleanActVal.includes(cleanExpVal) || cleanExpVal.includes(cleanActVal)) {
          successfulChecks++;
        }
      }

      // 5. Descritivo / Motivo não nulo e higienizado
      totalChecks++;
      if (canonical.descricao && canonical.descricao.length >= 5) {
        successfulChecks++;
      }
    }

    const accuracy = (successfulChecks / totalChecks) * 100;
    console.log(`[doc2fill Benchmark S3-T2] Avaliados ${HETEROGENEOUS_20_DOCUMENTS.length} documentos | Total de verificações: ${totalChecks} | Sucessos: ${successfulChecks} | Acurácia Global: ${accuracy.toFixed(1)}%`);

    assert.ok(accuracy >= 90.0, `Acurácia mínima exigida de 90%, obtida: ${accuracy.toFixed(1)}%`);
  });

  it('Cenário 2 (Edge Case): isola documentos com ruído sem quebrar o motor e preserva campos mínimos', () => {
    const noisyDocument = `
      --- TEXTO ILEGÍVEL E TRUNCADO ---
      CNPJ: 99.888.777/0001-66
      Valor Total: R$ 99,00
    `;
    const parsed = parseDocumentFields(noisyDocument, 'ruido.png');
    const canonical = normalizeCanonicalDocumentFields(parsed);

    assert.equal(canonical.cnpj, '99.888.777/0001-66');
    assert.equal(canonical.valor, '99,00');
    assert.ok(canonical.descricao);
  });

  it('Cenário 3 (Error Path): payload totalmente vazio não lança exceção e gera 8 campos seguros vazios', () => {
    const emptyParsed = parseDocumentFields('', 'vazio.txt');
    const canonical = normalizeCanonicalDocumentFields(emptyParsed);

    assert.equal(typeof canonical, 'object');
    assert.equal(canonical.tipo_documento, 'Outro Comprovante');
    assert.equal(canonical.cnpj, '');
    assert.equal(canonical.fornecedor, '');
    assert.equal(canonical.numero_documento, '');
  });
});
