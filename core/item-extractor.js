// core/item-extractor.js
// Extrator Semântico e Tabular de Itens de Compra e Serviços (NFC-e, DANFE e Cupons)

/**
 * Converte representações de valor monetário (ex: "208,80", "1.250,50", "R$ 45.00") em float.
 * @param {string|number} raw
 * @returns {number}
 */
export function parseCurrencyFloat(raw) {
  if (typeof raw === 'number') return raw;
  if (!raw || typeof raw !== 'string') return 0;

  const sanitized = raw
    .replace(/[R$\s]/gi, '')
    .trim();

  // Caso brasileiro com vírgula decimal (ex: 1.250,50 ou 45,90)
  if (sanitized.includes(',')) {
    const clean = sanitized.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.round(val * 100) / 100;
  }

  // Caso decimal com ponto (ex: 45.90)
  const val = parseFloat(sanitized);
  return isNaN(val) ? 0 : Math.round(val * 100) / 100;
}

/**
 * Higieniza a descrição do item removendo prefixos de numeração e resíduos de layout.
 * @param {string} desc
 * @returns {string}
 */
export function normalizeItemDescription(desc) {
  if (!desc || typeof desc !== 'string') return '';
  return desc
    .replace(/^#?\s*\d{1,4}\s*[-–]?\s*/, '')
    .replace(/^\d{7,14}\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Valida a consistência matemática da soma dos itens contra o valor total informado no documento.
 * @param {Array<{totalPrice: number}>} items
 * @param {number} documentTotal
 * @param {number} [tolerance=0.10] Tolerância para compensar arredondamento de centavos
 * @returns {{valid: boolean, sum: number, diff: number}}
 */
export function validateItemTotals(items, documentTotal, tolerance = 0.10) {
  if (!Array.isArray(items) || items.length === 0 || typeof documentTotal !== 'number' || documentTotal <= 0) {
    return { valid: false, sum: 0, diff: documentTotal || 0 };
  }

  const rawSum = items.reduce((acc, it) => acc + (typeof it.totalPrice === 'number' ? it.totalPrice : 0), 0);
  const sum = Math.round(rawSum * 100) / 100;
  const diff = Math.round(Math.abs(sum - documentTotal) * 100) / 100;

  return {
    valid: diff <= tolerance,
    sum,
    diff
  };
}

/**
 * Extrai itens detalhados de produtos ou serviços a partir do texto do cupom/DANFE.
 * @param {string} text
 * @returns {Array<{itemIndex: number, code: string, description: string, quantity: number, unit: string, unitPrice: number, totalPrice: number}>}
 */
export function extractLineItemsFromText(text) {
  if (!text || typeof text !== 'string') return [];

  // Se o documento for um boleto bancário sem tabela de produtos, descarta preventivamente
  const isBoleto = /LINHA\s+DIGITAVEL|RECIBO\s+DO\s+PAGADOR|CEDENTE|BENEFICIARIO/i.test(text);
  const hasItemIndicators = /ITEM|QTD|CUPOM|NFC-e|DANFE|VL\s+UNIT|PRODUTO|SUBTOTAL/i.test(text);
  if (isBoleto && !hasItemIndicators) {
    return [];
  }

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const items = [];
  let itemCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Ignora cabeçalhos de tabela ou linhas de totalização
    if (/^(#\s*\|\s*COD|ITEM\s+COD|TOTAL\s+R\$|VALOR\s+TOTAL|QTD\s+TOTAL|FORMA\s+DE\s+PAGAMENTO)/i.test(line)) {
      continue;
    }

    // Padrão 1 (Tabular Linha Única NFC-e):
    // Ex: "001 7891000100100 GASOLINA COMUM C 35,45 LT X 5,89 208,80"
    // ou "003 7891000300300 ADITIVO RADIADOR 2 UN X 25,50 51,00"
    const patternSingle = /^(\d{1,4})\s+(?:(\d{7,14})\s+)?(.+?)\s+(\d+(?:[.,]\d+)?)\s*(UN|LT|KG|CX|PC|M|L)?\s*(?:X|\*|\@)?\s*(\d+[.,]\d{2})\s+(\d+[.,]\d{2})$/i;
    const matchSingle = line.match(patternSingle);

    if (matchSingle) {
      const idx = parseInt(matchSingle[1], 10);
      const code = matchSingle[2] || '';
      const rawDesc = matchSingle[3];
      const qty = parseFloat(matchSingle[4].replace(',', '.'));
      const unit = (matchSingle[5] || 'UN').toUpperCase();
      const unitPrice = parseCurrencyFloat(matchSingle[6]);
      const totalPrice = parseCurrencyFloat(matchSingle[7]);

      items.push({
        itemIndex: !isNaN(idx) ? idx : itemCounter++,
        code,
        description: normalizeItemDescription(rawDesc),
        quantity: !isNaN(qty) ? qty : 1,
        unit,
        unitPrice,
        totalPrice
      });
      continue;
    }

    // Padrão 2 (Duas Linhas - Supermercado / Farmácia):
    // Linha 1: "001 7896004701234 DIPIRONA MONOIDRATADA 500MG"
    // Linha 2: "2 UN X 7,50 15,00"
    const patternLine1 = /^(\d{1,4})\s+(\d{7,14})\s+(.+)$/;
    const matchLine1 = line.match(patternLine1);

    if (matchLine1 && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const patternLine2 = /^(\d+(?:[.,]\d+)?)\s*(UN|LT|KG|CX|PC|M|L)?\s*(?:X|\*|\@)?\s*(\d+[.,]\d{2})\s+(\d+[.,]\d{2})$/i;
      const matchLine2 = nextLine.match(patternLine2);

      if (matchLine2) {
        const idx = parseInt(matchLine1[1], 10);
        const code = matchLine1[2];
        const rawDesc = matchLine1[3];
        const qty = parseFloat(matchLine2[1].replace(',', '.'));
        const unit = (matchLine2[2] || 'UN').toUpperCase();
        const unitPrice = parseCurrencyFloat(matchLine2[3]);
        const totalPrice = parseCurrencyFloat(matchLine2[4]);

        items.push({
          itemIndex: !isNaN(idx) ? idx : itemCounter++,
          code,
          description: normalizeItemDescription(rawDesc),
          quantity: !isNaN(qty) ? qty : 1,
          unit,
          unitPrice,
          totalPrice
        });
        i++; // Pula a linha 2 já consumida
        continue;
      }
    }

    // Padrão 3 (Restaurante / Conta Simplificada com Quantidade e Total):
    // Ex: "1 ALMOCO EXECUTIVO BUFFET 38,50"
    // Ex: "2 SUCO NATURAL LARANJA 500ML 12,00"
    const patternSimple = /^(\d{1,3})\s+([A-ZÀ-Ú0-9\s/.-]{4,})\s+(\d+[.,]\d{2})$/i;
    const matchSimple = line.match(patternSimple);

    if (matchSimple && !/TOTAL|SUBTOTAL|PAGAMENTO|VALOR|DESCONTO|TROCO/i.test(matchSimple[2])) {
      const qty = parseInt(matchSimple[1], 10);
      const rawDesc = matchSimple[2];
      const totalPrice = parseCurrencyFloat(matchSimple[3]);
      const unitPrice = qty > 0 ? Math.round((totalPrice / qty) * 100) / 100 : totalPrice;

      items.push({
        itemIndex: itemCounter++,
        code: '',
        description: normalizeItemDescription(rawDesc),
        quantity: qty > 0 ? qty : 1,
        unit: 'UN',
        unitPrice,
        totalPrice
      });
      continue;
    }
  }

  return items;
}
