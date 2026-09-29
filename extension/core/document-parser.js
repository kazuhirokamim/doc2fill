// doc2fill - Document Text & Field Extractor Engine
// Extração inteligente de campos essenciais (8 campos), honorários, procuradores, processos e dados fiscais/bancários

import { classifyDocumentType } from './classifier.js';

/**
 * Extrai texto legível de um ArrayBuffer ou string de PDF (streams de texto descompactadas/ASCII)
 * @param {ArrayBuffer|string} input 
 * @returns {string}
 */
export function extractTextFromPdfContent(input) {
  let text = '';
  if (typeof input === 'string') {
    text = input;
  } else if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
    const bytes = new Uint8Array(input instanceof ArrayBuffer ? input : input.buffer);
    const decoder = new TextDecoder('latin1');
    text = decoder.decode(bytes);
  } else {
    return '';
  }

  // Coleta texto contido em operadores de texto do PDF: (Texto) Tj ou [(T)(e)(x)(t)(o)] TJ
  const extractedChunks = [];
  
  // 1. Strings literais (Texto) Tj
  const literalMatches = text.match(/\(([^()]{2,})\)\s*Tj/g) || [];
  for (const m of literalMatches) {
    const val = m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim();
    if (val) extractedChunks.push(val);
  }

  // 2. Arrays de strings [(T) -10 (exto)] TJ
  const arrayMatches = text.match(/\[([^\]]+)\]\s*TJ/g) || [];
  for (const m of arrayMatches) {
    const innerStrings = m.match(/\(([^()]+)\)/g) || [];
    const joined = innerStrings.map(s => s.slice(1, -1)).join('').trim();
    if (joined) extractedChunks.push(joined);
  }

  // 3. Fallback: Se não encontrou operadores específicos, busca todas as strings legíveis do PDF
  if (extractedChunks.length === 0) {
    const rawStrings = text.match(/\(([^()]{3,})\)/g) || [];
    for (const s of rawStrings) {
      const clean = s.slice(1, -1).trim();
      // Ignora metadados binários ou fontes
      if (/^[a-zA-Z0-9\s\.,;:/\-–—ºª§R$\(\)]+$/.test(clean) && clean.length >= 3) {
        extractedChunks.push(clean);
      }
    }
  }

  return extractedChunks.length > 0 ? extractedChunks.join('\n') : '';
}

/**
 * Extrai campos estruturados focados nos 8 campos essenciais a partir do texto de um documento
 * @param {string} rawText Texto bruto extraído do arquivo
 * @param {string} [fileName=''] Nome do arquivo para inferência complementar
 * @returns {Object} Dados extraídos ({ tipo_documento, cpf_cnpj, fornecedor, numero_documento, data, valor, descritivo, motivo, ... })
 */
export function parseDocumentFields(rawText = '', fileName = '') {
  if (!rawText && !fileName) {
    return {};
  }

  const text = ((rawText || '') + ' ' + (fileName || '')).trim();
  if (!text) {
    return {};
  }

  const data = {};

  // 1. Classificação do Tipo de Documento
  const classified = classifyDocumentType(rawText || '', fileName || '');
  data.tipo_documento = classified.label || 'Outro Comprovante';

  // 2. CPF e CNPJ (do Fornecedor, Prestador ou Procurador)
  const cnpjMatch = text.match(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/) ||
                    text.match(/cnpj[^\d]*(\d{14})\b/i);
  if (cnpjMatch) {
    const rawCnpj = cnpjMatch[1].trim();
    data.cnpj = rawCnpj.length === 14 && !rawCnpj.includes('/')
      ? rawCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      : rawCnpj;
    data.cpf_cnpj = data.cnpj;
  }

  const cpfMatch = text.match(/\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/) ||
                   text.match(/(?:cpf[:_\s]*)(\d{11})(?:[^\d]|$)/i) ||
                   text.match(/\bcpf[^\d]*(\d{3}\.\d{3}\.\d{3}-\d{2})\b/i);
  if (cpfMatch) {
    const rawCpf = cpfMatch[1].trim();
    data.cpf = rawCpf.length === 11 && !rawCpf.includes('.') 
      ? rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      : rawCpf;
    if (!data.cpf_cnpj) {
      data.cpf_cnpj = data.cpf;
      data.cnpj = data.cpf;
    }
  }

  // 3. Fornecedor / Razão Social / Nome do Prestador / Emissor
  // Prioriza Razão Social e Nome Fantasia explícitos
  const razaoMatch = text.match(/(?:Raz[aã]o\s+Social|Nome\s+Empresarial|Nome\s+Fantasia)[: \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ0-9][^\n\r,;]{2,60})/i);
  if (razaoMatch && !/^(?:prestador|servicos|cliente)/i.test(razaoMatch[1].trim())) {
    data.fornecedor = razaoMatch[1].trim();
  } else {
    const fornecedorPrefixMatch =
      text.match(/(?:Prestador(?:\s+de\s+Servi[cç]os)?|Emitente|Estabelecimento|Fornecedor|Benefici[aá]rio(?:\s*\/\s*Destinat[aá]rio)?|Destinat[aá]rio|Requerente|Nome)[: \t]*(?:Dr\.|Dra\.)?[ \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ0-9][^\n\r,;]{2,60})/i) ||
      text.match(/(?:Dr\.|Dra\.)[ \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+(?:[ \t]+[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+)+)/) ||
      text.match(/\b([A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s]{3,40}\s+(?:LTDA|S\/A|S\.A\.|EIRELI|EPP|ME))\b/i);

    if (fornecedorPrefixMatch) {
      let val = fornecedorPrefixMatch[1].trim();
      // Remove resíduos caso o prefixo tenha capturado 'de servicos'
      val = val.replace(/^de\s+servi[cç]os\s*/i, '').trim();
      if (val) {
        data.fornecedor = val;
      }
    }
  }

  if (data.fornecedor) {
    data.razao = data.fornecedor;
    data.nome = data.fornecedor;
  }

  // 4. Número do Documento (NFS-e, Cupom, Recibo, Fatura, Protocolo, Boleto)
  const numDocMatch =
    text.match(/(?:N[uú]mero\s+(?:da\s+)?Nota(?:\s+Fiscal)?|N[uú]mero\s+do\s+Documento|N[uú]mero\s+do\s+Extrato|N[uú]mero)[:\s]*([0-9A-Za-z\.\-\/]{2,25})/i) ||
    text.match(/(?:Nota\s+Fiscal|NFS-e|NF-e|DANFE)\s*(?:[A-Za-z\s]+)?(?:N[º°o]|N\.|N[:\s]|N[uú]mero)[:\s]*([0-9A-Za-z\.\-\/]{2,25})/i) ||
    text.match(/(?:Extrato\s*(?:N[º°o]|N\.)?\s*([0-9A-Za-z\.\-\/]{3,20})\s+do\s+Cupom)/i) ||
    text.match(/(?:Cupom\s+(?:Fiscal|Eletr[oô]nico)?)\s*(?:N[º°o]|N\.|N[uú]mero)?[:\s]*([0-9A-Za-z\.\-\/]{3,20})/i) ||
    text.match(/(?:Recibo)\s*(?:N[º°o]|N\.|N[uú]mero)?[:\s]*([0-9A-Za-z\.\-\/]{2,20})/i) ||
    text.match(/(?:Fatura)\s*(?:N[º°o]|N\.|N[uú]mero)?[:\s]*([0-9A-Za-z\.\-\/]{3,25})/i) ||
    text.match(/(?:Identificador\s*\/?\s*Protocolo|Protocolo(?:\s+CCHA)?|Autentica[cç][aã]o(?:\s+Banc[aá]ria)?|ID\s+(?:da\s+)?Transa[cç][aã]o)[:\s]*([0-9A-Za-z\.\-\/]{6,35})/i) ||
    text.match(/\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/);

  if (numDocMatch) {
    data.numero_documento = numDocMatch[1].trim();
  }

  // 5. Data do Documento (Emissão / Vencimento / Transação)
  const dataMatch =
    text.match(/(?:Data(?:\s+de\s+Emiss[aã]o|\s+da\s+Transa[cç][aã]o)?|\bEmiss[aã]o|\bCompet[eê]ncia)[:\s]*(\d{2})[\/\.](\d{2})[\/\.](\d{4})/i) ||
    text.match(/\b(\d{2})[\/\.](\d{2})[\/\.](\d{4})\b/);
  if (dataMatch) {
    data.data = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
  } else {
    const isoDateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
      data.data = isoDateMatch[1];
    }
  }

  // 6. Valor Monetário (R$)
  const valorMatch =
    text.match(/(?:VALOR\s+TOTAL(?:\s+DA\s+NOTA|\s+R\$)?|VALOR\s+PAGO|VALOR\s+BRUTO|TOTAL|VALOR)[^\d\n\r]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i) ||
    text.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
    text.match(/valor[:_\s]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i);

  if (valorMatch) {
    data.valor = `R$ ${valorMatch[1].trim()}`;
  }

  // 7. Descritivo Resumido (Síntese concisa do serviço / objeto)
  const descMatch =
    text.match(/(?:Discrimina[cç][aã]o\s+dos\s+Servi[cç]os|Descri[cç][aã]o|Objeto|Hist[oó]rico)[:\s\n]*([^\n\r]+(?:\n[^\n\r]+)?)/i);

  if (descMatch && descMatch[1].trim().length > 8) {
    data.descritivo = descMatch[1].trim().replace(/\s+/g, ' ');
  } else if (/honorarios|sucumbencia/i.test(text)) {
    data.descritivo = 'Honorários advocatícios sucumbenciais devidos perante o CCHA em decorrência de atuação judicial.';
  } else if (/tiss|tuss|sadt|medica/i.test(text)) {
    data.descritivo = 'Assistência médica e procedimentos de saúde com comprovação diagnóstica e terapêutica.';
  } else if (data.tipo_documento.includes('Nota Fiscal')) {
    data.descritivo = `Prestação de serviços técnicos/operacionais discriminados em Nota Fiscal emitida por ${data.fornecedor || 'prestador'}.`;
  } else if (data.tipo_documento.includes('Cupom Fiscal')) {
    data.descritivo = 'Aquisição de insumos operacionais e materiais de consumo para expediente funcional.';
  } else if (data.tipo_documento.includes('Comprovante')) {
    data.descritivo = `Comprovante de pagamento e quitação financeira emitido em favor de ${data.fornecedor || 'beneficiário'}.`;
  } else if (data.tipo_documento.includes('Boleto')) {
    data.descritivo = 'Quitação de obrigação bancária e títulos devidos para prestação de contas.';
  } else if (data.tipo_documento.includes('Fatura')) {
    data.descritivo = 'Despesas de consumo e faturas de serviços continuados essenciais ao exercício profissional.';
  } else if (data.tipo_documento.includes('Declaração')) {
    data.descritivo = 'Declaração comprobatória de regularidade documental e ateste de serviços.';
  } else if (fileName) {
    data.descritivo = `Documento comprobatório: ${fileName}`;
  } else {
    data.descritivo = 'Comprovação documental de serviços e atos administrativos.';
  }
  data.descricao = data.descritivo;

  // 8. Motivo da Necessidade (Justificativa fundamentada para o CCHA)
  if (/honorarios|sucumbencia|rateio/i.test(text)) {
    data.motivo = 'Art. 29 a 36 da Lei nº 13.327/2016 e deliberações do CCHA. Preenchimento de requisitos de elegibilidade e rateio de honorários sucumbenciais.';
  } else if (/tiss|tuss|sadt|medica|saude/i.test(text)) {
    data.motivo = 'Comprovação de despesa de assistência à saúde e atendimento médico/hospitalar para fins de ressarcimento funcional perante o CCHA.';
  } else if (/cupom|suprimentos|miuda/i.test(text)) {
    data.motivo = 'Comprovação de despesa miúda e aquisição de insumos de pronto pagamento vinculados à atividade funcional perante o CCHA.';
  } else if (/comprovante|pix|ted|transferencia/i.test(text)) {
    data.motivo = 'Comprovação de quitação tempestiva de obrigação legal e despesa autorizada vinculada ao CCHA.';
  } else if (/declaracao/i.test(text)) {
    data.motivo = 'Atesto formal e declaração comprobatória de regularidade documental para instrução do requerimento CCHA.';
  } else {
    data.motivo = 'Prestação de contas e comprovação de despesa operacional necessária ao exercício funcional perante o CCHA / AGU.';
  }

  // Campos complementares de retrocompatibilidade
  const procMatch = text.match(/\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/) ||
                    text.match(/processo[^\d]*(\d{5,7}[-\.\s]\d{2}[-\.\s]\d{4}[-\.\s]\d[-\.\s]\d{2}[-\.\s]\d{4})/i) ||
                    text.match(/protocolo[^\d]*([0-9A-Z\.\-\/]{10,25})/i);
  if (procMatch) {
    data.processo = procMatch[1].trim();
  }

  const siapeMatch = text.match(/(?:siape|matricula)[^\d]*(\d{6,8})\b/i) ||
                     text.match(/oab[^\d]*([0-9]{3,7}(?:\/[A-Z]{2})?)/i);
  if (siapeMatch) {
    data.matricula = siapeMatch[1].trim();
  }

  if (/pgfn|fazenda nacional/i.test(text)) {
    data.beneficiario = 'Procurador da Fazenda Nacional (PGFN)';
  } else if (/pgf\b|procurador federal/i.test(text)) {
    data.beneficiario = 'Procurador Federal (PGF)';
  } else if (/pgbc|banco central/i.test(text)) {
    data.beneficiario = 'Procurador do Banco Central (PGBC)';
  } else if (/agu|advocacia-geral da uniao|advogado da uniao/i.test(text)) {
    data.beneficiario = 'Advogado da União (AGU)';
  }

  const bancoMatch = text.match(/(banco do brasil|caixa economica|santander|itau|bradesco)/i);
  if (bancoMatch) {
    data.banco = bancoMatch[1].toUpperCase();
  }

  const agCcMatch = text.match(/ag[eê]ncia[:\s]*([0-9A-Za-z\-]+)[^\d]*conta(?:\s+corrente|\s+poupan[cç]a)?[:\s]*([0-9A-Za-z\-]+)/i) ||
                    text.match(/ag[:\s]*([0-9A-Za-z\-]+)[^\d]*c\/?c[:\s]*([0-9A-Za-z\-]+)/i);
  if (agCcMatch) {
    data.agencia = agCcMatch[1].trim();
    let rawConta = agCcMatch[2].trim();
    if (/^corrente$/i.test(rawConta)) {
      const nextNum = text.match(/conta\s+corrente[:\s]*([0-9A-Za-z\-]+)/i);
      if (nextNum) rawConta = nextNum[1].trim();
    }
    data.conta = rawConta;
  }

  const pixMatch = text.match(/pix[:\s]*([a-zA-Z0-9_\.\-@]+)/i);
  if (pixMatch) {
    data.pix = pixMatch[1].trim();
  }

  return data;
}
