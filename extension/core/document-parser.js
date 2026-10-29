// doc2fill - Document Text & Field Extractor Engine
import { classifyDocumentType } from './classifier.js';
import { extractLineItemsFromText } from './item-extractor.js';
import { extractAllStreamsText, extractAllStreamsTextAsync, extractTextFromOperators, extractFirstPdfImageAsDataUrl } from './pdf-stream-decoder.js';
export { extractFirstPdfImageAsDataUrl };
import { translateClinicalProcedure } from './clinical-translator.js';
import { normalizeDateText } from './date-normalizer.js';

export function isPdfEncrypted(input) {
  if (!input) return false;
  let bytes;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) bytes = input;
  else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else if (ArrayBuffer.isView(input)) bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  else return false;

  if (bytes.length < 10) return false;
  const decoder = new TextDecoder('latin1');
  const maxSearch = Math.min(bytes.length, 16384);
  const headStr = decoder.decode(bytes.subarray(0, maxSearch));
  const tailStr = bytes.length > maxSearch ? decoder.decode(bytes.subarray(bytes.length - maxSearch)) : '';

  if (!headStr.includes('%PDF-') && !tailStr.includes('%%EOF')) return false;
  return /\/Encrypt\s+\d+\s+\d+\s+R|\/Encrypt\b/i.test(headStr) || /\/Encrypt\s+\d+\s+\d+\s+R|\/Encrypt\b/i.test(tailStr);
}

export function extractTextFromPdfContent(input) {
  if (isPdfEncrypted(input)) return '';
  if (typeof input === 'string') {
    const chunks = extractTextFromOperators(input);
    return chunks.length > 0 ? chunks.join('\n') : '';
  }
  if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    const chunks = extractAllStreamsText(bytes);
    return chunks.length > 0 ? chunks.join('\n') : '';
  }
  return '';
}

export async function extractTextFromPdfContentAsync(input) {
  if (isPdfEncrypted(input)) return '';
  if (typeof input === 'string') {
    const chunks = extractTextFromOperators(input);
    return chunks.length > 0 ? chunks.join('\n') : '';
  }
  if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    const chunks = await extractAllStreamsTextAsync(bytes);
    return chunks.length > 0 ? chunks.join('\n') : '';
  }
  return '';
}

export function extractSefazAccessKey(text) {
  if (!text || typeof text !== 'string') return null;
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

  return { chave: rawDigits, uf, anoMes, cnpj: formattedCnpj, modelo: mod, serie, numero_documento: nro, tipo_documento: tipoDoc };
}

export function parseDocumentFields(rawText = '', fileName = '') {
  if (!rawText && !fileName) return {};
  const text = ((rawText || '') + ' ' + (fileName || '')).trim();
  if (!text) return {};

  const data = {};

  const sefazData = extractSefazAccessKey(rawText);
  if (sefazData) {
    data.chave_acesso = sefazData.chave;
    data.cpf_cnpj = sefazData.cnpj;
    data.cnpj = sefazData.cnpj;
    data.numero_documento = sefazData.numero_documento;
    data.tipo_documento = sefazData.tipo_documento;
    data.data = `${sefazData.anoMes}-01`;
  }

  if (!data.tipo_documento) {
    const classified = classifyDocumentType(rawText || '', fileName || '');
    data.tipo_documento = classified.label || 'Outro Comprovante';
  }

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

  const STOPWORDS_NUM_DOC = new Set([
    'TEM', 'ITEM', 'DE', 'DO', 'DA', 'PARA', 'COM', 'EM', 'POR', 'TA', 'NOTA',
    'RECIBO', 'FATURA', 'EXTRATO', 'SERIE', 'VIA', 'PAGINA', 'ENTRADA', 'SAIDA',
    'VALOR', 'TOTAL', 'FISCAL', 'CONSUMIDOR', 'MODELO', 'DOCUMENTO', 'PROTOCOLO',
    'CODIGO', 'DESCRICAO', 'DADOS', 'SERVICO', 'SERVICOS', 'COMPETENCIA'
  ]);

  function isValidNumDoc(val) {
    if (!val || typeof val !== 'string') return false;
    const clean = val.replace(/^[Nn][º°o\.\:\s]+/, '').trim();
    if (clean.length < 2 || clean.length > 35) return false;
    if (!/\d/.test(clean)) return false;
    if (STOPWORDS_NUM_DOC.has(clean.toUpperCase())) return false;
    return true;
  }

  // 1. Prioriza Razão Social e Nomes Empresariais canônicos
  const razaoMatch = text.match(/(?:Raz[aã]o\s+Social|Nome\s+Empresarial|Nome\s+Fantasia)[: \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ0-9][^\n\r,;]{2,60})/i);
  let explicitRazao = null;

  if (razaoMatch) {
    const rawMatch = razaoMatch[1].trim();
    if (/(?:CNPJ|INSCRI[CÇ][AÃ]O|ESTADUAL|DATA|ENDERE[CÇ]O|BAIRRO)/i.test(rawMatch)) {
      const lines = text.split(/[\r\n]+/);
      for (let i = 0; i < lines.length; i++) {
        if (/Raz[aã]o\s+Social/i.test(lines[i]) && i + 1 < lines.length) {
          const next = lines[i + 1].trim();
          const cleanNext = next.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*$/, '').trim();
          if (cleanNext.length >= 3 && !/^(?:Endere[cç]o|Destinat[aá]rio)/i.test(cleanNext)) {
            explicitRazao = cleanNext;
            break;
          }
        }
      }
    } else if (!/^(?:prestador|servicos|cliente|dados|tomador|consumidor|n[uú]mero\s+da\s+nota|compet[eê]ncia)/i.test(rawMatch)) {
      explicitRazao = rawMatch;
    }
  }

  if (explicitRazao) {
    data.fornecedor = explicitRazao;
  } else {
    let corporateSuffixMatch = null;
    const lines = text.split(/[\r\n]+/);
    for (const rawLine of lines) {
      let line = rawLine.trim();
      if (!line) continue;
      if (/^(?:CNPJ|INSCRI[CÇ][AÃ]O|ESTADUAL|ENDERE[CÇ]O|BAIRRO|MUNIC[IÍ]PIO|VALOR|TOTAL|C[AÁ]LCULO|DOCUMENTO|PROTOCOLO|N[UÚ]MERO|DATA|—|\d\s*[-:]\s*SA[IÍ]DA|\d\s*[-:]\s*ENTRADA|ENTRADA|SA[IÍ]DA)/i.test(line)) continue;
      if (/^RECEBEMOS\s+DE\s+/i.test(line)) {
        line = line.replace(/^RECEBEMOS\s+DE\s+/i, '').replace(/\s+(?:OS\s+PRODUTOS|CONSTANTES|DA\s+NOTA).*$/i, '').trim();
      }
      const corpMatch = line.match(/\b([A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s,\.\-]{3,60}\s+(?:LTDA|S\/A|S\.A\.|S\.A|\bSA\b(?![IÍa-z])|EIRELI|EPP|ME))\b/i);
      if (corpMatch) {
        let cleanCorp = corpMatch[1].trim();
        if (/^RECEBEMOS\s+DE\s+/i.test(cleanCorp)) {
          cleanCorp = cleanCorp.replace(/^RECEBEMOS\s+DE\s+/i, '').replace(/\s+(?:OS\s+PRODUTOS|CONSTANTES|DA\s+NOTA).*$/i, '').trim();
        }
        if (!/^(?:\d\s*[-:]\s*SA|SA[IÍ]DA|ENTRADA)/i.test(cleanCorp)) {
          corporateSuffixMatch = cleanCorp;
          break;
        }
      }
    }

    let cnpjAdjacentMatch = null;
    const cnpjLine = text.match(/cnpj[^\n\r\d]*[\d\.\s\/-]{14,24}[ \t]+([A-ZÁÉÍÓÚÂÊÔÃÕ][A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s]{2,50}\b(?:LTDA|S\/A|ME|EPP)?)/i);
    if (cnpjLine) {
      const candidate = cnpjLine[1].split(/[\n\r]/)[0].trim();
      if (!/^(?:extrato|chave|consumidor|valor|data|itens|via|cupom|nota|destinatario|prestador)/i.test(candidate) || candidate.includes('LTDA')) {
        cnpjAdjacentMatch = candidate;
      }
    }

    const pharmacyHeaderMatch = text.match(/\b((?:DROGARIA|FARM[AÁ]CIA|REDE\s+POPULAR\s+DROGA)\s+[A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s]{2,40}(?:LTDA|S\/A|ME)?)\b/i);

    let tomadorLine = null;
    for (let i = 0; i < lines.length; i++) {
      if (/(?:DADOS DO TOMADOR|FOME RAD[AÃ]O SOC|TOMADOR)/i.test(lines[i])) {
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const l = lines[j].trim();
          if (l.length >= 3 && !/^(?:FOME|RAD[AÃ]O|ENDERE|CPF|CNPJ|ISENTO)/i.test(l)) {
            tomadorLine = l.replace(/^CUENTE\s+/i, 'CLIENTE ');
            break;
          }
        }
      }
    }

    const utilityBrandMatch = text.match(/\b((?:ENEL|SABESP|CPFL|CEMIG|COPEL|LIGHT|CELESC|NEOENERGIA|EQUATORIAL|EDP|SANEPAR|COPASA|COMPESA|EMBASA|CORSAN|VIVO|CLARO|TIM|OI|EMBRATEL)\b[^\n\r]{0,40})/i);
    const pixReceiverMatch = text.match(/(?:RECEBEDOR|FAVORECIDO)[: \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ0-9][^\n\r,;]{2,60})/i);
    const boletoCedenteMatch = text.match(/(?:BENEFICI[AÁ]RIO|CEDENTE|SACADOR)[: \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ0-9][^\n\r,;]{2,60})/i);
    const servicePrestadorMatch = text.match(/(?:DADOS\s+DO\s+(?:PRESTADOR|TOMADOR)|NOME\s*\/?\s*RAZ[AÃ]O\s+SOCIAL)[: \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ0-9][^\n\r,;]{2,60})/i);
    const retailBrandMatch = text.match(/^(?:LOJAS\s+[A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s]{2,30}|SUPERMERCADO\s+[A-ZÁÉÍÓÚÂÊÔÃÕ0-9\s]{2,30})/im);

    const labeledSupplierMatch =
      text.match(/(?:Prestador(?:\s+de\s+Servi[cç]os)?|Emitente|Estabelecimento|Fornecedor|Benefici[aá]rio(?:\s*\/\s*Destinat[aá]rio)?|Destinat[aá]rio|Requerente|Nome)[: \t]*(?:Dr\.|Dra\.)?[ \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ0-9][^\n\r,;]{2,60})/i)?.[1]?.trim() ||
      text.match(/(?:Dr\.|Dra\.)[ \t]*([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+(?:[ \t]+[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+)+)/)?.[1]?.trim();

    const isBank = corporateSuffixMatch && /^(?:BANCO\b|BANCO\s+|CAIXA\s+ECONOMICA)/i.test(corporateSuffixMatch);

    const candidateSupplier =
      (pixReceiverMatch && !/^(?:cpf|cnpj|chave|valor|data)/i.test(pixReceiverMatch[1].trim()) ? pixReceiverMatch[1].trim() : null) ||
      (boletoCedenteMatch && !/^(?:cpf|cnpj|chave|valor|data)/i.test(boletoCedenteMatch[1].trim()) ? boletoCedenteMatch[1].trim() : null) ||
      (isBank && labeledSupplierMatch ? labeledSupplierMatch : null) ||
      (!isBank ? corporateSuffixMatch : null) ||
      labeledSupplierMatch ||
      tomadorLine ||
      cnpjAdjacentMatch ||
      (pharmacyHeaderMatch ? pharmacyHeaderMatch[1].split(/[\n\r]/)[0].trim() : null) ||
      (utilityBrandMatch ? utilityBrandMatch[1].trim() : null) ||
      (servicePrestadorMatch && !/^(?:n[uú]mero\s+da\s+nota|compet[eê]ncia)/i.test(servicePrestadorMatch[1].trim()) ? servicePrestadorMatch[1].trim() : null) ||
      (retailBrandMatch ? retailBrandMatch[0].trim() : null) ||
      corporateSuffixMatch;

    if (candidateSupplier) {
      let val = candidateSupplier.split(/[\n\r]/)[0].trim();
      val = val.replace(/^RECEBEMOS\s+DE\s+/i, '').replace(/\s+(?:OS\s+PRODUTOS|CONSTANTES|DA\s+NOTA).*$/i, '').trim();
      val = val.replace(/^de\s+servi[cç]os\s*/i, '').replace(/^—\s*=\s*/, '').trim();
      val = val.replace(/^(?:Dr\.|Dra\.|Dr|Dra)\s+/i, '').trim();
      if (val && val.length >= 2 && !/^(?:era|cnpj|inscricao|dados)/i.test(val)) {
        data.fornecedor = val;
      }
    }
  }

  if (data.fornecedor) {
    data.razao = data.fornecedor;
    data.nome = data.fornecedor;
  }

  // 2. Extração Resiliente de Número do Documento com Validação Obrigatória de Dígitos
  const numDanfeDirect = text.match(/\bN[º°o][\.\s]*([0-9]{3,9})\b/i);
  const numDocCandidates = [
    numDanfeDirect ? numDanfeDirect[1] : null,
    text.match(/(?:NFC-e|NFCe)\s*(?:n[º°o]|n\.|n|num)?[:\s]*([0-9]{3,20})/i)?.[1],
    text.match(/(?:N[uú]mero\s+(?:da\s+)?Nota(?:\s+Fiscal)?|N[uú]mero\s+do\s+Documento|N[uú]mero\s+do\s+Extrato|N[uú]mero)[:\s]*([0-9A-Za-z\.\-\/]{2,25})/i)?.[1],
    text.match(/(?:Nota\s+Fiscal|NFS-e|NF-e|DANFE)\s*(?:[A-Za-z\s]+)?(?:N[º°o]|N\.|N[:\s]|N[uú]mero)[:\s]*([0-9A-Za-z\.\-\/]{2,25})/i)?.[1],
    text.match(/(?:Extrato\s*(?:N[º°o]|N\.)?\s*([0-9A-Za-z\.\-\/]{3,20})\s+do\s+Cupom)/i)?.[1],
    text.match(/(?:Cupom\s+(?:Fiscal|Eletr[oô]nico)?)\s*(?:N[º°o]|N\.|N[uú]mero)[:\s]*([0-9A-Za-z\.\-\/]{3,20})/i)?.[1],
    text.match(/(?:COO|CCF)[:\s]*([0-9]{3,10})/i)?.[1],
    text.match(/(?:Recibo)\s*(?:N[º°o]|N\.|N[uú]mero)[:\s]*([0-9A-Za-z\.\-\/]{2,20})/i)?.[1],
    text.match(/(?:Fatura)\s*(?:N[º°o]|N\.|N[uú]mero)[:\s]*([0-9A-Za-z\.\-\/]{3,25})/i)?.[1],
    text.match(/(?:Identificador\s*\/?\s*Protocolo|Protocolo(?:\s+CCHA)?|Autentica[cç][aã]o(?:\s+Banc[aá]ria)?|ID\s+(?:da\s+)?Transa[cç][aã]o)[:\s]*([0-9A-Za-z\.\-\/]{6,35})/i)?.[1]
  ];

  for (const cand of numDocCandidates) {
    if (cand && isValidNumDoc(cand)) {
      data.numero_documento = cand.trim();
      break;
    }
  }

  if (!data.numero_documento) {
    const lines = text.split(/[\r\n]+/);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/chave\s+de\s+acesso|consulte|sefaz|nfe\/consulta|danfe/i.test(l)) {
        let combined = '';
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const nextLine = lines[j].trim();
          const digitLike = (nextLine.match(/[\dDOoIlSBZb\|]/g) || []).length;
          if (digitLike >= 6) combined += ' ' + nextLine;
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
            const chosen = (nNf && !/^0+$/.test(nNf)) ? nNf : clean.substring(0, 10);
            if (isValidNumDoc(chosen)) {
              data.numero_documento = chosen;
              break;
            }
          }
        }
      }
    }
    if (!data.numero_documento) {
      const opMatch = text.match(/(?:OP|VD|CX|C[oó]d)[:\s]*([0-9]{3,10})/i);
      if (opMatch && isValidNumDoc(opMatch[1])) data.numero_documento = opMatch[1].trim();
    }
  }

  const normalizedDate = normalizeDateText(text);
  if (normalizedDate) {
    data.data = normalizedDate;
  } else if (!data.data) {
    const isoDateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoDateMatch) data.data = isoDateMatch[1];
  }

  let valorMatch = null;

  // 1. Prioridade no DANFE: Tabela multilinhas de cálculo do imposto (VALOR TOTAL DA NOTA -> linha de valores)
  if (/VALOR\s+TOTAL\s+DA\s+NOTA/i.test(text)) {
    const lines = text.split(/[\r\n]+/);
    for (let i = 0; i < lines.length; i++) {
      if (/VALOR\s+TOTAL\s+DA\s+NOTA/i.test(lines[i])) {
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nums = lines[j].match(/\b([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\b/g);
          if (nums && nums.length > 0) {
            const lastVal = nums[nums.length - 1];
            if (lastVal && lastVal !== '0,00') {
              valorMatch = [null, lastVal];
              break;
            }
          }
        }
      }
      if (valorMatch) break;
    }
  }

  // 2. Extração Padrão com rótulos monetários explícitos
  if (!valorMatch) {
    const candidateMatch =
      text.match(/(?:VALOR\s+TOTAL(?:\s+DA\s+NOTA|\s+DOS\s+SERVI[CÇ]OS|\s+R\$)?|TOTAL\s+A\s+PAGAR|VALOR\s+A\s+PAGAR|VALOR\s+COBRADO|VALOR\s+DO\s+DOCUMENTO|VALOR\s+L[IÍ]QUIDO|TOTAL\s+L[IÍ]QUIDO|VALOR\s+PAGO|VALOR\s+BRUTO|DINHEIRO|CART[AÃ]O(?:\s+DE\s+CR[EÉ]DITO|\s+DE\s+D[EÉ]BITO)?|TOTAL(?:\s+R\$)?|SUBTOTAL)[^\d\n\r]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i) ||
      text.match(/(?:VALOR\s+TOTAL(?:\s+DA\s+NOTA|\s+DOS\s+SERVI[CÇ]OS)?|TOTAL|A\s+PAGAR)[^\d]*?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
      text.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})/i) ||
      text.match(/valor[:_\s]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})/i);

    if (candidateMatch && candidateMatch[1] !== '0,00') {
      valorMatch = candidateMatch;
    }
  }

  // 3. Fallback: Tabela de produtos do DANFE (ex: MLB6624117486 ... 39,87 39,87)
  if (!valorMatch) {
    const itemMatch = text.match(/\b([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\s+([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})\b/);
    if (itemMatch && itemMatch[2]) {
      valorMatch = [null, itemMatch[2]];
    }
  }

  if (valorMatch) data.valor = `R$ ${valorMatch[1].trim()}`;

  // 7. Descritivo & Motor Clínico Anti-Glosa TUSS/ANS Conectado
  const clinicalMatch = translateClinicalProcedure(rawText || '');
  let extractedItem = null;

  const itemMatch = text.match(/(?:[O0]01|\d{1,3})\s+\d{4,8}\s+(.+?)(?:\s+x\s+[\d,\.]+|\s+TOTAL|\n|$)/i);
  if (itemMatch && itemMatch[1].trim().length >= 3) {
    let cleanItem = itemMatch[1].trim()
      .replace(/^(?:Gtd|Qtd|Un|Vl|Unit|Total|C[oó]d|Descri[cç][aã]o)[,\.\s\:\-\|]*/gi, '')
      .trim();
    if (cleanItem.length >= 3) extractedItem = cleanItem;
  }

  const descMatch =
    text.match(/(?:Discrimina[cç][aã]o\s+dos\s+Servi[cç]os|Descri[cç][aã]o\s+dos\s+Servi[cç]os|Objeto|Hist[oó]rico)[:\s\n]*([^\n\r]+(?:\n[^\n\r]+)?)/i);

  if (descMatch && descMatch[1].trim().length > 6) {
    let cleanDesc = descMatch[1].trim().replace(/\s+/g, ' ');
    cleanDesc = cleanDesc
      .replace(/^(?:Gtd|Qtd|Un|Vl|Unit|Total|C[oó]d|Descri[cç][aã]o|Itens|Pre[cç]o)[,\.\s\:\-\|]*/gi, '')
      .replace(/^(?:O01|001|\d{1,3})\s+\d{4,8}\s+/i, '')
      .replace(/\s*x\s+[0-9,\.]+\s*.*$/i, '')
      .trim();

    if (cleanDesc.length >= 3) extractedItem = extractedItem || cleanDesc;
  }

  if (clinicalMatch && clinicalMatch.matched) {
    data.descritivo = clinicalMatch.descricaoTecnica;
    data.descricao = clinicalMatch.descricaoTecnica;
    data.motivo = clinicalMatch.motivoNecessidade;
    data.natureza = clinicalMatch.natureza;
  } else {
    if (/drogaria|farm[aá]cia|medicamento|rem[eé]dio|posologia|comprimido|c[aá]psula|unid|droga/i.test(text) || (data.fornecedor && /drogaria|farm[aá]cia/i.test(data.fornecedor))) {
      data.descritivo = 'Aquisição de medicamentos/insumos farmacêuticos recomendado por médico';
      data.motivo = 'Recomendação médica.';
    } else if (/consulta|pediatr|m[eé]dic|ambulatori|tiss|tuss|sadt|cl[ií]nica/i.test(text)) {
      data.descritivo = 'Consulta médica ambulatorial';
      data.motivo = 'Recomendação médica.';
    } else if (extractedItem) {
      if (data.tipo_documento.includes('Nota Fiscal')) {
        data.descritivo = `Prestação de serviços / produtos (${extractedItem}) - ${data.fornecedor || 'Fornecedor'}.`;
      } else {
        data.descritivo = `Aquisição de insumo operacional (${extractedItem}) junto a ${data.fornecedor || 'fornecedor'}.`;
      }
      data.motivo = 'Prestação de contas e comprovação de despesa operacional necessária ao exercício funcional.';
    } else {
      if (/honorarios|sucumbencia/i.test(text)) {
        data.descritivo = `Honorários advocatícios sucumbenciais devidos perante o CCHA em decorrência de atuação judicial${data.processo ? ' no Processo ' + data.processo : ''}.`;
        data.motivo = 'Art. 29 a 36 da Lei nº 13.327/2016 e deliberações do CCHA. Preenchimento de requisitos de elegibilidade e rateio de honorários sucumbenciais.';
      } else if (data.tipo_documento.includes('Nota Fiscal')) {
        data.descritivo = `Prestação de serviços técnicos/operacionais discriminados em Nota Fiscal emitida por ${data.fornecedor || 'prestador'}.`;
        data.motivo = 'Prestação de contas e comprovação de despesa operacional necessária ao exercício funcional.';
      } else if (data.tipo_documento.includes('Cupom Fiscal')) {
        data.descritivo = `Aquisição de insumos operacionais e materiais de consumo junto a ${data.fornecedor || 'fornecedor'}.`;
        data.motivo = 'Comprovação de despesa miúda e aquisição de insumos de pronto pagamento vinculados à atividade funcional.';
      } else if (data.tipo_documento.includes('Recibo')) {
        data.descritivo = `Recibo comprobatório de serviços prestados emitido por ${data.fornecedor || 'prestador'}.`;
        data.motivo = 'Comprovação de despesa de pronto pagamento e prestação de contas funcional.';
      } else if (data.tipo_documento.includes('Boleto')) {
        data.descritivo = `Quitação de obrigação bancária e títulos devidos em favor de ${data.fornecedor || 'beneficiário'}${data.valor ? ' no valor de ' + data.valor : ''}.`;
        data.motivo = 'Comprovação de quitação tempestiva de obrigação legal e despesa autorizada vinculada ao CCHA.';
      } else if (data.tipo_documento.includes('Fatura')) {
        data.descritivo = `Despesas de consumo e faturas de serviços continuados essenciais junto a ${data.fornecedor || 'concessionária'}.`;
        data.motivo = 'Prestação de contas e comprovação de despesa operacional necessária ao exercício funcional.';
      } else if (data.tipo_documento.includes('Declaração')) {
        data.descritivo = `Declaração comprobatória de regularidade documental e ateste de serviços emitida por ${data.fornecedor || 'declarante'}.`;
        data.motivo = 'Atesto formal e declaração comprobatória de regularidade documental para instrução do requerimento.';
      } else if (fileName) {
        data.descritivo = `Comprovação documental de despesa operacional: ${fileName}${data.fornecedor ? ' (' + data.fornecedor + ')' : ''}.`;
        data.motivo = 'Prestação de contas e comprovação de despesa operacional necessária ao exercício funcional.';
      } else {
        data.descritivo = 'Comprovação documental de serviços e atos administrativos perante o CCHA.';
        data.motivo = 'Prestação de contas e comprovação de despesa operacional necessária ao exercício funcional.';
      }
    }
    data.descricao = data.descritivo;
  }

  const procMatch = text.match(/\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/) ||
                    text.match(/processo[^\d]*(\d{5,7}[-\.\s]\d{2}[-\.\s]\d{4}[-\.\s]\d[-\.\s]\d{2}[-\.\s]\d{4})/i) ||
                    text.match(/protocolo[^\d]*([0-9A-Z\.\-\/]{10,25})/i);
  if (procMatch) data.processo = procMatch[1].trim();

  const siapeMatch = text.match(/(?:siape|matricula)[^\d]*(\d{6,8})\b/i) ||
                     text.match(/oab[^\d]*([0-9]{3,7}(?:\/[A-Z]{2})?)/i);
  if (siapeMatch) data.matricula = siapeMatch[1].trim();

  if (/pgfn|fazenda nacional/i.test(text)) data.beneficiario = 'Procurador da Fazenda Nacional (PGFN)';
  else if (/pgf\b|procurador federal/i.test(text)) data.beneficiario = 'Procurador Federal (PGF)';
  else if (/pgbc|banco central/i.test(text)) data.beneficiario = 'Procurador do Banco Central (PGBC)';
  else if (/agu|advocacia-geral da uniao|advogado da uniao/i.test(text)) data.beneficiario = 'Advogado da União (AGU)';

  const bancoMatch = text.match(/(banco do brasil|caixa economica|santander|itau|bradesco)/i);
  if (bancoMatch) data.banco = bancoMatch[1].toUpperCase();

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
  if (pixMatch) data.pix = pixMatch[1].trim();

  data.items = extractLineItemsFromText(rawText);
  return data;
}

export function normalizeCanonicalDocumentFields(raw = {}) {
  const source = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};

  let tipoDoc = (source.tipo_documento || source.tipo || '').toString().trim();
  if (!tipoDoc) tipoDoc = 'Outro Comprovante';

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

  const fornecedor = (source.fornecedor || source.razao || source.nome || source.prestador || '').toString().trim();

  let numDoc = (source.numero_documento || source.numero || source.num_doc || '').toString().trim();
  numDoc = numDoc.replace(/^N[ºo°\.]*\s*/i, '').trim();

  let dataVal = (source.data || source.data_emissao || '').toString().trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataVal)) {
    const parts = dataVal.split('/');
    dataVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

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
      } else valorFormatted = cleanVal;
    } else {
      const parsed = parseFloat(cleanVal);
      if (!isNaN(parsed)) {
        valorNum = parsed;
        valorFormatted = valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else valorFormatted = cleanVal;
    }
  }

  const descritivo = (source.descritivo || source.descricao || '').toString().trim();
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
    ...(source.natureza ? { natureza: source.natureza.toString().trim() } : {}),
    ...(source.processo ? { processo: source.processo.toString().trim() } : {}),
    ...(source.matricula || source.siape ? { matricula: (source.matricula || source.siape).toString().trim() } : {}),
    ...(source.beneficiario ? { beneficiario: source.beneficiario.toString().trim() } : {}),
    ...(source.banco ? { banco: source.banco.toString().trim() } : {}),
    ...(source.agencia ? { agencia: source.agencia.toString().trim() } : {}),
    ...(source.conta ? { conta: source.conta.toString().trim() } : {}),
    ...(source.pix ? { pix: source.pix.toString().trim() } : {})
  };
}