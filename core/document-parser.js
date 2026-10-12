// doc2fill - Document Text & Field Extractor Engine
// Extração inteligente de campos essenciais (8 campos), honorários, procuradores, processos e dados fiscais/bancários

import { classifyDocumentType } from './classifier.js';
import { extractLineItemsFromText } from './item-extractor.js';

/**
 * Detecta preventivamente se um buffer de PDF possui operador de criptografia / senha (/Encrypt)
 * @param {ArrayBuffer|Buffer|Uint8Array} input
 * @returns {boolean}
 */
export function isPdfEncrypted(input) {
  if (!input) return false;
  let bytes;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    bytes = input;
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else if (ArrayBuffer.isView(input)) {
    bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  } else {
    return false;
  }

  if (bytes.length < 10) return false;

  const decoder = new TextDecoder('latin1');
  const maxSearch = Math.min(bytes.length, 16384);
  const headStr = decoder.decode(bytes.subarray(0, maxSearch));
  const tailStr = bytes.length > maxSearch ? decoder.decode(bytes.subarray(bytes.length - maxSearch)) : '';

  if (!headStr.includes('%PDF-') && !tailStr.includes('%%EOF')) {
    return false;
  }

  return /\/Encrypt\s+\d+\s+\d+\s+R|\/Encrypt\b/i.test(headStr) || /\/Encrypt\s+\d+\s+\d+\s+R|\/Encrypt\b/i.test(tailStr);
}

/**
 * Extrai texto legível de um ArrayBuffer ou string de PDF (streams de texto descompactadas/ASCII)
 * @param {ArrayBuffer|string} input 
 * @returns {string}
 */
export function extractTextFromPdfContent(input) {
  if (isPdfEncrypted(input)) {
    return '';
  }

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
 * Decodifica deterministicamente a Chave de Acesso SEFAZ de 44 dígitos (NF-e / NFC-e)
 * Formato padrão: UF(2) + AAMM(4) + CNPJ(14) + MOD(2) + SERIE(3) + NRO(9) + TPEMIS(1) + COD(8) + DV(1)
 * @param {string} text Texto bruto do documento
 * @returns {Object|null}
 */
export function extractSefazAccessKey(text) {
  if (!text || typeof text !== 'string') return null;

  // Busca 44 dígitos contínuos ou em blocos com espaços/pontos/hífens
  const regex = /(?:chave\s*(?:de\s*acesso)?[:\s]*)?([0-9]{4}[.\s-]?[0-9]{4}[.\s-]?[0-9]{4}[.\s-]?[0-9]{4}[.\s-]?[0-9]{4}[.\s-]?[0-9]{4}[.\s-]?[0-9]{4}[.\s-]?[0-9]{4}[.\s-]?[0-9]{4}[.\s-]?[0-9]{4}[.\s-]?[0-9]{4})/i;

  const match = text.match(regex);
  if (!match) return null;

  const rawDigits = match[1].replace(/\D/g, '');
  if (rawDigits.length !== 44) return null;

  const uf = rawDigits.substring(0, 2);
  const aa = rawDigits.substring(2, 4);
  const mm = rawDigits.substring(4, 6);
  const cnpjRaw = rawDigits.substring(6, 20);
  const mod = rawDigits.substring(20, 22);
  const serie = rawDigits.substring(22, 25);
  const nro = rawDigits.substring(25, 34);

  const formattedCnpj = `${cnpjRaw.slice(0, 2)}.${cnpjRaw.slice(2, 5)}.${cnpjRaw.slice(5, 8)}/${cnpjRaw.slice(8, 12)}-${cnpjRaw.slice(12, 14)}`;
  const anoMes = `20${aa}-${mm}`;
  const tipoDoc = (mod === '65') ? 'Cupom Fiscal (NFC-e / SAT)' : 'Nota Fiscal de Serviços (NFS-e)';

  return {
    chave: rawDigits,
    uf,
    anoMes,
    cnpj: formattedCnpj,
    modelo: mod,
    serie,
    numero_documento: nro,
    tipo_documento: tipoDoc
  };
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

  // 0. Decodificação determinística de Chave de Acesso SEFAZ (se houver)
  const sefazData = extractSefazAccessKey(rawText);
  if (sefazData) {
    data.cpf_cnpj = sefazData.cnpj;
    data.cnpj = sefazData.cnpj;
    data.numero_documento = sefazData.numero_documento;
    data.tipo_documento = sefazData.tipo_documento;
    data.data = `${sefazData.anoMes}-01`;
  }

  // 1. Classificação do Tipo de Documento (se não inferido pela chave SEFAZ)
  if (!data.tipo_documento) {
    const classified = classifyDocumentType(rawText || '', fileName || '');
    data.tipo_documento = classified.label || 'Outro Comprovante';
  }

  // 2. CPF e CNPJ (do Fornecedor, Prestador ou Procurador)
  const cnpjMatch = text.match(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/) ||
                    text.match(/cnpj[^\d]*(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2})/i) ||
                    text.match(/cnpj[^\d]*(\d{14})\b/i);
  if (cnpjMatch) {
    const rawDigits = cnpjMatch[1].replace(/[^\d]/g, '');
    if (rawDigits.length === 14) {
      data.cnpj = rawDigits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      data.cpf_cnpj = data.cnpj;
    } else if (cnpjMatch[1].includes('/') && cnpjMatch[1].includes('-')) {
      data.cnpj = cnpjMatch[1].trim();
      data.cpf_cnpj = data.cnpj;
    }
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
    // 3.1 Busca nome empresarial logo após o CNPJ na mesma linha (padrão de cupons fiscais térmicos)
    let cnpjAdjacentMatch = null;
    const cnpjLine = text.match(/cnpj[^\n\r\d]*[\d\.\s\/-]{14,24}[ \t]+([A-ZÁÉÍÓÚÂÊÔÃÕ][A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s]{2,50}\b(?:LTDA|S\/A|ME|EPP)?)/i);
    if (cnpjLine) {
      const candidate = cnpjLine[1].split(/[\n\r]/)[0].trim();
      if (!/^(?:extrato|chave|consumidor|valor|data|itens|via|cupom|nota|destinatario|prestador)/i.test(candidate) || candidate.includes('LTDA')) {
        cnpjAdjacentMatch = candidate;
      }
    }

    // 3.2 Busca redes farmacêuticas e estabelecimentos comerciais no cabeçalho
    const pharmacyHeaderMatch = text.match(/\b((?:DROGARIA|FARM[AÁ]CIA|REDE\s+POPULAR\s+DROGA)\s+[A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s]{2,40}(?:LTDA|S\/A|ME)?)\b/i);

    const fornecedorPrefixMatch =
      cnpjAdjacentMatch ||
      (pharmacyHeaderMatch ? pharmacyHeaderMatch[1].split(/[\n\r]/)[0].trim() : null) ||
      text.match(/(?:Prestador(?:\s+de\s+Servi[cç]os)?|Emitente|Estabelecimento|Fornecedor|Benefici[aá]rio(?:\s*\/\s*Destinat[aá]rio)?|Destinat[aá]rio|Requerente|Nome)[: \t]*(?:Dr\.|Dra\.)?[ \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ0-9][^\n\r,;]{2,60})/i) ||
      text.match(/(?:Dr\.|Dra\.)[ \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+(?:[ \t]+[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+)+)/) ||
      text.match(/\b([A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s]{3,40}\s+(?:LTDA|S\/A|S\.A\.|EIRELI|EPP|ME))\b/i);

    if (fornecedorPrefixMatch) {
      let rawVal = typeof fornecedorPrefixMatch === 'string'
        ? fornecedorPrefixMatch
        : (Array.isArray(fornecedorPrefixMatch) ? fornecedorPrefixMatch[1] : null);
      let val = (rawVal || '').split(/[\n\r]/)[0].trim();
      val = val.replace(/^de\s+servi[cç]os\s*/i, '').trim();
      if (val && val.length >= 2) {
        data.fornecedor = val;
      }
    }
  }

  if (data.fornecedor) {
    data.razao = data.fornecedor;
    data.nome = data.fornecedor;
  }

  // 4. Número do Documento (NFS-e, Cupom NFC-e, Recibo, Fatura, Protocolo, Boleto)
  const numDocMatch =
    text.match(/(?:NFC-e|NFCe)\s*(?:n[º°o]|n\.|n|num)?[:\s]*([0-9]{3,20})/i) ||
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
  } else {
    // 4.1 Extrai número a partir da Chave de Acesso da NFC-e com normalização de ruídos térmicos
    const lines = text.split(/[\r\n]+/);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/chave\s+de\s+acesso|consulte|sefaz|nfe\/consulta|danfe/i.test(l)) {
        let combined = '';
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const nextLine = lines[j].trim();
          const digitLike = (nextLine.match(/[\dDOoIlSBZb\|]/g) || []).length;
          if (digitLike >= 6) {
            combined += ' ' + nextLine;
          }
        }
        if (combined) {
          const clean = combined
            .replace(/[DOo]/g, '0')
            .replace(/[Il\|]/g, '1')
            .replace(/[Ss]/g, '5')
            .replace(/[Bb]/g, '8')
            .replace(/[Zz]/g, '2')
            .replace(/[^\d]/g, '');

          if (clean.length >= 35) {
            const nNf = clean.substring(25, 34);
            if (nNf && !/^0+$/.test(nNf)) {
              data.numero_documento = nNf;
            } else {
              data.numero_documento = clean.substring(0, 10);
            }
            break;
          }
        }
      }
    }

    // 4.2 Fallback para códigos operacionais ou de caixa em cupons fiscais
    if (!data.numero_documento) {
      const opMatch = text.match(/(?:OP|VD|CX|C[oó]d)[:\s]*([0-9]{3,10})/i);
      if (opMatch) {
        data.numero_documento = opMatch[1].trim();
      }
    }
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
    text.match(/(?:VALOR\s+TOTAL(?:\s+DA\s+NOTA|\s+R\$)?|VALOR\s+L[IÍ]QUIDO|VALOR\s+PAGO|VALOR\s+BRUTO|TOTAL|VALOR)[^\d\n\r]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i) ||
    text.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
    text.match(/valor[:_\s]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i);

  if (valorMatch) {
    data.valor = `R$ ${valorMatch[1].trim()}`;
  }

  // 7. Descritivo Resumido (Síntese concisa, individualizada e contextual do serviço / objeto)
  let extractedItem = null;

  // 7.1 Detecção de item específico em cupons fiscais / NFC-e: ex "O01 237004 PANT SEC 5 1 UNID x 78,05"
  const itemMatch = text.match(/(?:[O0]01|\d{1,3})\s+\d{4,8}\s+(.+?)(?:\s+x\s+[\d,\.]+|\s+TOTAL|\n|$)/i);
  if (itemMatch && itemMatch[1].trim().length >= 3) {
    let cleanItem = itemMatch[1].trim()
      .replace(/^(?:Gtd|Qtd|Un|Vl|Unit|Total|C[oó]d|Descri[cç][aã]o)[,\.\s\:\-\|]*/gi, '')
      .trim();
    if (cleanItem.length >= 3) {
      extractedItem = cleanItem;
    }
  }

  // 7.2 Detecção de bloco textual de descrição / discriminação de serviços
  const descMatch =
    text.match(/(?:Discrimina[cç][aã]o\s+dos\s+Servi[cç]os|Descri[cç][aã]o\s+dos\s+Servi[cç]os|Objeto|Hist[oó]rico)[:\s\n]*([^\n\r]+(?:\n[^\n\r]+)?)/i);

  if (descMatch && descMatch[1].trim().length > 6) {
    let cleanDesc = descMatch[1].trim().replace(/\s+/g, ' ');
    cleanDesc = cleanDesc
      .replace(/^(?:Gtd|Qtd|Un|Vl|Unit|Total|C[oó]d|Descri[cç][aã]o|Itens|Pre[cç]o)[,\.\s\:\-\|]*/gi, '')
      .replace(/^(?:O01|001|\d{1,3})\s+\d{4,8}\s+/i, '')
      .replace(/\s*x\s+[0-9,\.]+\s*.*$/i, '')
      .trim();

    if (cleanDesc.length >= 3) {
      extractedItem = extractedItem || cleanDesc;
    }
  }

  // 7.3 Composição Dinâmica e Personalizada do Descritivo CCHA
  if (extractedItem) {
    if (/drogaria|farm[aá]cia|medicamento|rem[eé]dio|posologia|comprimido|c[aá]psula|unid|droga/i.test(text) || (data.fornecedor && /drogaria|farm[aá]cia/i.test(data.fornecedor))) {
      data.descritivo = `Aquisição de medicamentos/insumos farmacêuticos (${extractedItem}) - ${data.fornecedor || 'Drogaria'}${data.numero_documento ? ' (Doc nº ' + data.numero_documento + ')' : ''}.`;
    } else if (data.tipo_documento.includes('Nota Fiscal')) {
      data.descritivo = `Prestação de serviços / produtos (${extractedItem}) - ${data.fornecedor || 'Fornecedor'}${data.numero_documento ? ' (NF nº ' + data.numero_documento + ')' : ''}.`;
    } else {
      data.descritivo = `Aquisição de insumo operacional (${extractedItem}) junto a ${data.fornecedor || 'fornecedor'}${data.numero_documento ? ' (Doc nº ' + data.numero_documento + ')' : ''}.`;
    }
  } else {
    // Composição contextual individualizada quando não há linha explícita de item
    if (/honorarios|sucumbencia/i.test(text)) {
      data.descritivo = `Honorários advocatícios sucumbenciais devidos perante o CCHA em decorrência de atuação judicial${data.processo ? ' no Processo ' + data.processo : ''}.`;
    } else if (/drogaria|farm[aá]cia|medicamento|rem[eé]dio|posologia|comprimido|c[aá]psula|unid|droga/i.test(text) || (data.fornecedor && /drogaria|farm[aá]cia/i.test(data.fornecedor))) {
      data.descritivo = `Aquisição de medicamentos e insumos farmacêuticos de pronto pagamento junto a ${data.fornecedor || 'fornecedor'}${data.numero_documento ? ' (Doc nº ' + data.numero_documento + ')' : ''}.`;
    } else if (/tiss|tuss|sadt|medica/i.test(text)) {
      data.descritivo = `Assistência médica e procedimentos de saúde com comprovação diagnóstica junto a ${data.fornecedor || 'prestador'}${data.numero_documento ? ' (Doc nº ' + data.numero_documento + ')' : ''}.`;
    } else if (data.tipo_documento.includes('Nota Fiscal')) {
      data.descritivo = `Prestação de serviços técnicos/operacionais discriminados em Nota Fiscal emitida por ${data.fornecedor || 'prestador'}${data.numero_documento ? ' (NF nº ' + data.numero_documento + ')' : ''}.`;
    } else if (data.tipo_documento.includes('Cupom Fiscal')) {
      data.descritivo = `Aquisição de insumos operacionais e materiais de consumo junto a ${data.fornecedor || 'fornecedor'}${data.numero_documento ? ' (Cupom nº ' + data.numero_documento + ')' : ''}.`;
    } else if (data.tipo_documento.includes('Recibo')) {
      data.descritivo = `Recibo comprobatório de serviços prestados emitido por ${data.fornecedor || 'prestador'}${data.numero_documento ? ' (Recibo nº ' + data.numero_documento + ')' : ''}.`;
    } else if (data.tipo_documento.includes('Boleto')) {
      data.descritivo = `Quitação de obrigação bancária e títulos devidos em favor de ${data.fornecedor || 'beneficiário'}${data.valor ? ' no valor de ' + data.valor : ''}.`;
    } else if (data.tipo_documento.includes('Fatura')) {
      data.descritivo = `Despesas de consumo e faturas de serviços continuados essenciais junto a ${data.fornecedor || 'concessionária'}${data.numero_documento ? ' (Fatura nº ' + data.numero_documento + ')' : ''}.`;
    } else if (data.tipo_documento.includes('Declaração')) {
      data.descritivo = `Declaração comprobatória de regularidade documental e ateste de serviços emitida por ${data.fornecedor || 'declarante'}.`;
    } else if (fileName) {
      data.descritivo = `Comprovação documental de despesa operacional: ${fileName}${data.fornecedor ? ' (' + data.fornecedor + ')' : ''}.`;
    } else {
      data.descritivo = 'Comprovação documental de serviços e atos administrativos perante o CCHA.';
    }
  }
  data.descricao = data.descritivo;

  // 8. Motivo da Necessidade (Justificativa fundamentada para o CCHA)
  if (/honorarios|sucumbencia|rateio/i.test(text)) {
    data.motivo = 'Art. 29 a 36 da Lei nº 13.327/2016 e deliberações do CCHA. Preenchimento de requisitos de elegibilidade e rateio de honorários sucumbenciais.';
  } else if (/drogaria|farm[aá]cia|medicamento/i.test(text) || (data.fornecedor && /drogaria|farm[aá]cia/i.test(data.fornecedor))) {
    data.motivo = 'Comprovação de despesa miúda e aquisição de insumos farmacêuticos de pronto pagamento vinculados à atividade funcional perante o CCHA.';
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

  // 9. Extração estruturada de itens de compra (NFC-e, DANFE e cupons)
  data.items = extractLineItemsFromText(rawText);

  return data;
}

/**
 * Normaliza campos brutos extraídos para o esquema canônico estrito dos 8 campos do CCHA
 * @param {Object} raw Objeto com campos brutos ou parciais
 * @returns {Object} Objeto canônico garantindo os 8 campos essenciais livres de undefined/null
 */
export function normalizeCanonicalDocumentFields(raw = {}) {
  const source = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};

  // 1. Tipo de Documento
  let tipoDoc = (source.tipo_documento || source.tipo || '').toString().trim();
  if (!tipoDoc) {
    tipoDoc = 'Outro Comprovante';
  }

  // 2. CPF / CNPJ (com preservação de zeros à esquerda)
  let rawCpfCnpj = (source.cpf_cnpj || source.cnpj || source.cpf || '').toString().trim();
  let cleanDigits = rawCpfCnpj.replace(/\D/g, '');
  let formattedCpfCnpj = '';

  if (cleanDigits.length === 14) {
    cleanDigits = cleanDigits.padStart(14, '0');
    formattedCpfCnpj = `${cleanDigits.slice(0, 2)}.${cleanDigits.slice(2, 5)}.${cleanDigits.slice(5, 8)}/${cleanDigits.slice(8, 12)}-${cleanDigits.slice(12, 14)}`;
  } else if (cleanDigits.length === 11) {
    cleanDigits = cleanDigits.padStart(11, '0');
    formattedCpfCnpj = `${cleanDigits.slice(0, 3)}.${cleanDigits.slice(3, 6)}.${cleanDigits.slice(6, 9)}-${cleanDigits.slice(9, 11)}`;
  } else if (rawCpfCnpj) {
    formattedCpfCnpj = rawCpfCnpj;
  }

  // 3. Fornecedor / Razão Social
  const fornecedor = (source.fornecedor || source.razao || source.nome || source.prestador || '').toString().trim();

  // 4. Número do Documento
  let numDoc = (source.numero_documento || source.numero || source.num_doc || '').toString().trim();
  numDoc = numDoc.replace(/^N[ºo°\.]*\s*/i, '').trim();

  // 5. Data (DD/MM/AAAA ou YYYY-MM-DD)
  let dataVal = (source.data || source.data_emissao || '').toString().trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataVal)) {
    const parts = dataVal.split('/');
    dataVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // 6. Valor Monetário
  let rawValor = source.valor !== undefined && source.valor !== null ? source.valor.toString().trim() : '';
  let valorFormatted = '';
  let valorNum = 0;

  if (typeof source.valor === 'number' && !isNaN(source.valor)) {
    valorNum = source.valor;
    valorFormatted = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (rawValor) {
    const cleanVal = rawValor.replace(/^R\$\s*/i, '').trim();
    if (cleanVal.includes(',')) {
      const normalizedNumStr = cleanVal.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(normalizedNumStr);
      if (!isNaN(parsed)) {
        valorNum = parsed;
        valorFormatted = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        valorFormatted = cleanVal;
      }
    } else {
      const parsed = parseFloat(cleanVal);
      if (!isNaN(parsed)) {
        valorNum = parsed;
        valorFormatted = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        valorFormatted = cleanVal;
      }
    }
  }

  // 7. Descritivo dos Itens / Serviços
  const descritivo = (source.descritivo || source.descricao || '').toString().trim();

  // 8. Motivo da Necessidade
  const motivo = (source.motivo || '').toString().trim();

  return {
    tipo_documento: tipoDoc,
    cpf_cnpj: formattedCpfCnpj,
    fornecedor,
    numero_documento: numDoc,
    data: dataVal,
    valor: valorFormatted,
    valorNumerico: valorNum,
    descritivo,
    motivo,
    cnpj: formattedCpfCnpj,
    cpf: formattedCpfCnpj,
    razao: fornecedor,
    descricao: descritivo,
    items: Array.isArray(source.items) ? source.items : [],
    ...(source.processo ? { processo: source.processo.toString().trim() } : {}),
    ...(source.matricula || source.siape ? { matricula: (source.matricula || source.siape).toString().trim() } : {}),
    ...(source.beneficiario ? { beneficiario: source.beneficiario.toString().trim() } : {}),
    ...(source.banco ? { banco: source.banco.toString().trim() } : {}),
    ...(source.agencia ? { agencia: source.agencia.toString().trim() } : {}),
    ...(source.conta ? { conta: source.conta.toString().trim() } : {}),
    ...(source.pix ? { pix: source.pix.toString().trim() } : {})
  };
}
