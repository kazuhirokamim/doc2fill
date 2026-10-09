// core/layout-parser.js
// Módulo de Extração com Consciência Espacial (Layout-Aware) e Chunking Hierárquico Parent-Child
// Arquitetura Noesis & Tear: 100% Local-First e Zero Retenção (RAM efêmera)

/**
 * Agrupa palavras extraídas com coordenadas espaciais (Bounding Boxes) em linhas alinhadas horizontalmente.
 * @param {Array<{text: string, bbox?: {x0: number, y0: number, x1: number, y1: number}, confidence?: number}>} words
 * @param {number} [yTolerance=8] Tolerância em pixels para agrupamento vertical
 * @returns {Array<{lineText: string, y: number, words: Array}>}
 */
export function clusterWordsIntoLayoutLines(words, yTolerance = 8) {
  if (!Array.isArray(words) || words.length === 0) {
    return [];
  }

  // Filtra itens válidos e calcula o centroide vertical de cada palavra
  const validWords = words
    .filter(w => w && typeof w.text === 'string' && w.text.trim())
    .map(w => {
      const bbox = w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
      const y0 = typeof bbox.y0 === 'number' ? bbox.y0 : 0;
      const y1 = typeof bbox.y1 === 'number' ? bbox.y1 : y0;
      const x0 = typeof bbox.x0 === 'number' ? bbox.x0 : 0;
      const x1 = typeof bbox.x1 === 'number' ? bbox.x1 : x0;
      return {
        text: w.text.trim(),
        bbox: { x0, y0, x1, y1 },
        yCenter: (y0 + y1) / 2,
        confidence: w.confidence || 0
      };
    });

  if (validWords.length === 0) return [];

  // Ordena preliminarmente pelo eixo vertical (Y)
  validWords.sort((a, b) => a.yCenter - b.yCenter || a.bbox.x0 - b.bbox.x0);

  const lines = [];

  for (const word of validWords) {
    let matchedLine = null;
    for (const line of lines) {
      if (Math.abs(line.yCenter - word.yCenter) <= yTolerance) {
        matchedLine = line;
        break;
      }
    }

    if (matchedLine) {
      matchedLine.words.push(word);
      // Recalcula o centro vertical ponderado da linha
      const totalY = matchedLine.words.reduce((acc, w) => acc + w.yCenter, 0);
      matchedLine.yCenter = totalY / matchedLine.words.length;
    } else {
      lines.push({
        yCenter: word.yCenter,
        words: [word]
      });
    }
  }

  // Ordena cada linha da esquerda para a direita (X) e constrói a string
  return lines.map(line => {
    line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const lineText = line.words.map(w => w.text).join(' ');
    return {
      lineText,
      y: Math.round(line.yCenter),
      words: line.words
    };
  });
}

/**
 * Detecta blocos tabulares de compras ou despesas em linhas de texto e converte para Markdown Table.
 * @param {Array<string>} lines Array de linhas textuais
 * @returns {string} Tabela formatada em Markdown ou string vazia se não for tabular
 */
export function detectAndFormatMarkdownTable(lines) {
  if (!Array.isArray(lines) || lines.length < 2) {
    return '';
  }

  const tableHeaderPattern = /\b(c[oó]d(?:igo)?|descri[cç][aã]o|item|qtd|quant(?:idade)?|vl[._\s]*unit|vl[._\s]*total|unit[aá]rio|total)\b/i;

  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const tokens = lines[i].split(/\s+/).filter(Boolean);
    const matchCount = tokens.filter(t => tableHeaderPattern.test(t)).length;
    if (matchCount >= 2) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return '';
  }

  const headerTokens = lines[headerIndex].split(/\s+/).filter(Boolean);
  const rows = [headerTokens];

  // Coleta linhas subsequentes que contenham valores numéricos ou colunas
  for (let j = headerIndex + 1; j < lines.length; j++) {
    const rawLine = lines[j].trim();
    if (!rawLine || /^(?:total|subtotal|desconto|impostos|valor líquido|forma de pagamento)/i.test(rawLine)) {
      break;
    }
    const rowTokens = rawLine.split(/\s+/).filter(Boolean);
    if (rowTokens.length >= Math.max(2, headerTokens.length - 1)) {
      // Ajusta número de colunas para casar com o cabeçalho se houver divergência
      if (rowTokens.length > headerTokens.length) {
        const mergedText = rowTokens.slice(1, rowTokens.length - (headerTokens.length - 2)).join(' ');
        const normalizedRow = [rowTokens[0], mergedText, ...rowTokens.slice(rowTokens.length - (headerTokens.length - 2))];
        rows.push(normalizedRow);
      } else {
        rows.push(rowTokens);
      }
    }
  }

  if (rows.length < 2) {
    return '';
  }

  const colCount = headerTokens.length;
  const headerMd = '| ' + headerTokens.join(' | ') + ' |';
  const separatorMd = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
  const bodyMd = rows.slice(1).map(r => {
    while (r.length < colCount) r.push('-');
    return '| ' + r.slice(0, colCount).join(' | ') + ' |';
  }).join('\n');

  return `${headerMd}\n${separatorMd}\n${bodyMd}`;
}

/**
 * Cria chunks semânticos com arquitetura Parent-Child (Small-to-Large Retrieval) a partir de um documento.
 * @param {string} documentText Texto completo do documento
 * @param {Object} [options] Opções de segmentação
 * @returns {Array<{id: string, section: string, parentText: string, children: Array<{key: string, value: string}>}>}
 */
export function createLayoutAwareChunks(documentText, options = {}) {
  if (!documentText || typeof documentText !== 'string' || !documentText.trim()) {
    return [];
  }

  const rawLines = documentText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return [];

  const chunks = [];

  // Classifica linhas em seções lógicas: HEADER_FISCAL, ITEMS_TABLE, TOTALS_PAYMENT, FOOTER_CCHA
  let currentSection = 'HEADER_FISCAL';
  let buffer = [];

  const sectionMap = {
    HEADER_FISCAL: [],
    ITEMS_TABLE: [],
    TOTALS_PAYMENT: [],
    FOOTER_CCHA: []
  };

  for (const line of rawLines) {
    if (/(?:itens\s+da\s+nota|descri[cç][aã]o\s+dos\s+servi[cç]os|c[oó]digo\s+descri)/i.test(line)) {
      currentSection = 'ITEMS_TABLE';
    } else if (/(?:totais|valor\s+total|total\s+r\$|forma\s+de\s+pagamento|valor\s+l[íi]quido)/i.test(line)) {
      currentSection = 'TOTALS_PAYMENT';
    } else if (/(?:dados\s+banc[aá]rios|requerimento\s+ccha|honor[aá]rios|processo\s+judicial)/i.test(line)) {
      currentSection = 'FOOTER_CCHA';
    }
    sectionMap[currentSection].push(line);
  }

  // Constrói chunks com filhos atômicos
  for (const [secName, secLines] of Object.entries(sectionMap)) {
    if (secLines.length === 0) continue;
    const parentText = secLines.join('\n');
    const children = [];

    // Extrai filhos atômicos da seção para busca e casamento exato
    if (secName === 'HEADER_FISCAL') {
      const cnpjMatch = parentText.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
      if (cnpjMatch) children.push({ key: 'CNPJ', value: cnpjMatch[0] });

      const nfeMatch = parentText.match(/(?:NF-e|NFC-e|Nota|Recibo)[^\d]*(\d{3,20})/i);
      if (nfeMatch) children.push({ key: 'NUMERO_DOCUMENTO', value: nfeMatch[1] });

      const keyMatch = parentText.match(/\b\d{44}\b/);
      if (keyMatch) children.push({ key: 'CHAVE_ACESSO', value: keyMatch[0] });
    } else if (secName === 'ITEMS_TABLE') {
      const tableMd = detectAndFormatMarkdownTable(secLines);
      if (tableMd) {
        children.push({ key: 'TABELA_MARKDOWN', value: tableMd });
      }
      for (const l of secLines) {
        if (/^\d{3,6}\s+/.test(l)) {
          children.push({ key: 'ITEM_LINHA', value: l });
        }
      }
    } else if (secName === 'TOTALS_PAYMENT') {
      const valMatch = parentText.match(/(?:R\$|Total)[:\s]*([\d.,]+)/i);
      if (valMatch) children.push({ key: 'VALOR_TOTAL', value: valMatch[1] });
    } else if (secName === 'FOOTER_CCHA') {
      const procMatch = parentText.match(/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/);
      if (procMatch) children.push({ key: 'PROCESSO', value: procMatch[0] });
    }

    chunks.push({
      id: `chunk_${secName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      section: secName,
      parentText,
      children
    });
  }

  // Fallback se o documento for compacto (apenas 1 seção detectada e não for CCHA explícito)
  if (chunks.length === 1 && !/(?:requerimento\s+ccha|conselho\s+curador|processo\s+judicial)/i.test(documentText)) {
    const single = chunks[0];
    single.section = 'GENERAL_RECEIPT';
    const valMatch = single.parentText.match(/(?:R\$|Valor)[:\s]*([\d.,]+)/i);
    if (valMatch && !single.children.some(c => c.key === 'VALOR')) {
      single.children.push({ key: 'VALOR', value: valMatch[1] });
    }
  }

  return chunks;
}
