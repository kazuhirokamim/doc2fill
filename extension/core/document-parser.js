// doc2fill - Document Text & Field Extractor Engine
// Extração inteligente de campos de honorários, procuradores, processos e dados fiscais/bancários a partir de texto bruto ou buffers

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

  return extractedChunks.length > 0 ? extractedChunks.join('\n') : text;
}

/**
 * Extrai campos estruturados (CCHA / Honorários / Fiscal) a partir do texto de um documento
 * @param {string} rawText Texto bruto extraído do arquivo
 * @param {string} [fileName=''] Nome do arquivo para inferência complementar
 * @returns {Object} Dados extraídos ({ cpf, cnpj, processo, matricula, valor, data, razao, beneficiario, banco, descricao, etc. })
 */
export function parseDocumentFields(rawText = '', fileName = '') {
  const text = (rawText || '') + ' ' + (fileName || '');
  const data = {};

  // 1. Processo Judicial / Administrativo (CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO ou variações)
  const procMatch = text.match(/\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/) ||
                    text.match(/processo[^\d]*(\d{5,7}[-\.\s]\d{2}[-\.\s]\d{4}[-\.\s]\d[-\.\s]\d{2}[-\.\s]\d{4})/i) ||
                    text.match(/protocolo[^\d]*([0-9A-Z\.\-\/]{10,25})/i);
  if (procMatch) {
    data.processo = procMatch[1].trim();
  }

  // 2. CPF (Procurador / Beneficiário) - suporta pontuado ou 11 dígitos sequenciais
  const cpfMatch = text.match(/\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b/) ||
                   text.match(/(?:cpf[:_\s]*)(\d{11})(?:[^\d]|$)/i) ||
                   text.match(/\b(\d{11})\b/);
  if (cpfMatch) {
    const rawCpf = cpfMatch[1].trim();
    data.cpf = rawCpf.length === 11 && !rawCpf.includes('.') 
      ? rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      : rawCpf;
    data.cnpj = data.cpf;
  }

  // 3. CNPJ (Órgão, Seccional ou Prestador)
  const cnpjMatch = text.match(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/);
  if (cnpjMatch) {
    data.cnpj = cnpjMatch[1].trim();
  }

  // 4. Matrícula SIAPE ou OAB
  const siapeMatch = text.match(/(?:siape|matricula)[^\d]*(\d{6,8})\b/i) ||
                     text.match(/oab[^\d]*([0-9]{3,7}(?:\/[A-Z]{2})?)/i);
  if (siapeMatch) {
    data.matricula = siapeMatch[1].trim();
  }

  // 5. Valor Monetário (R$)
  const valorMatch = text.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
                     text.match(/valor[:_\s]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i);
  if (valorMatch) {
    data.valor = `R$ ${valorMatch[1].trim()}`;
  }

  // 6. Data (DD/MM/AAAA ou AAAA-MM-DD)
  const dataMatch = text.match(/\b(\d{2})[\/\.](\d{2})[\/\.](\d{4})\b/);
  if (dataMatch) {
    data.data = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
  } else {
    const isoDateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDateMatch) {
      data.data = isoDateMatch[1];
    }
  }

  // 7. Nome / Razão Social / Procurador (apenas na mesma linha)
  const nomeMatch = text.match(/(?:Requerente|Benefici[aá]rio|Nome|Procurador[a]?|Advogad[oa])[: \t]*(?:Dr\.|Dra\.)?[ \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+(?:[ \t]+[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+)+)/i) ||
                    text.match(/(?:Dr\.|Dra\.)[ \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+(?:[ \t]+[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+)+)/);
  if (nomeMatch) {
    data.razao = nomeMatch[1].trim();
  }

  // 8. Carreira / Beneficiário (AGU, PGFN, PGF, PGBC)
  if (/pgfn|fazenda nacional/i.test(text)) {
    data.beneficiario = 'Procurador da Fazenda Nacional (PGFN)';
  } else if (/pgf\b|procurador federal/i.test(text)) {
    data.beneficiario = 'Procurador Federal (PGF)';
  } else if (/pgbc|banco central/i.test(text)) {
    data.beneficiario = 'Procurador do Banco Central (PGBC)';
  } else if (/agu|advocacia-geral da uniao|advogado da uniao/i.test(text)) {
    data.beneficiario = 'Advogado da União (AGU)';
  }

  // 9. Dados Bancários (Banco, Agência, Conta, PIX)
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

  // 10. Tipo de Documento
  if (/honorarios|sucumbencia/i.test(text)) {
    data.tipo_documento = 'Requerimento de Honorários';
  } else if (/ressarcimento|despesa|diaria/i.test(text)) {
    data.tipo_documento = 'Ressarcimento de Despesas';
  } else if (/prestacao de contas/i.test(text)) {
    data.tipo_documento = 'Prestação de Contas';
  } else if (/nota fiscal|nfse/i.test(text)) {
    data.tipo_documento = 'Nota Fiscal de Serviços';
  }

  // 11. Descrição padrão se não identificada
  if (!data.descricao) {
    if (/honorarios/i.test(text)) {
      data.descricao = 'Honorários advocatícios sucumbenciais devidos perante o CCHA.';
    } else if (fileName) {
      data.descricao = `Documento comprobatório: ${fileName}`;
    }
  }

  return data;
}
