/**
 * core/date-normalizer.js - Normalizador Resiliente de Datas (Numéricas e por Extenso em PT-BR)
 * Zero dependências, pura execução determinística em RAM.
 */

const MONTHS_MAP = {
  janeiro: '01', jan: '01',
  fevereiro: '02', fev: '02',
  marco: '03', março: '03', mar: '03',
  abril: '04', abr: '04',
  maio: '05', mai: '05',
  junho: '06', jun: '06',
  julho: '07', jul: '07',
  agosto: '08', ago: '08',
  setembro: '09', set: '09',
  outubro: '10', out: '10',
  novembro: '11', nov: '11',
  dezembro: '12', dez: '12'
};

function isValidDateParts(year, month, day) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (y < 1970 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}

function formatDate(year, month, day) {
  const yStr = String(year);
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

export function normalizeDateText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = rawText.trim();
  if (!text) return null;

  // 1. Data explicita precedida de rotulo de emissao / vencimento / data com separador (/, ., -)
  const explicitNumeric = text.match(/(?:Data(?:\s+de\s+Emiss[aã]o|\s+da\s+Transa[cç][aã]o|\s+e\s+Hora)?|\bVencimento|\bEmiss[aã]o|\bCompet[eê]ncia|\bData)[:\s]*(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/i);
  if (explicitNumeric) {
    const [, d, m, y] = explicitNumeric;
    if (isValidDateParts(y, m, d)) return formatDate(y, m, d);
  }

  // 2. Data por extenso em Portugues: "DD de [Mês] de YYYY" ou "DD de [Mes] YYYY"
  const textDateMatch = text.match(/\b(\d{1,2})\s+de\s+([a-zA-Zçãáéíóúâêôãõ\.]+)(?:\s+de|\s*,)?\s+(\d{4})\b/i);
  if (textDateMatch) {
    const [, d, monthNameRaw, y] = textDateMatch;
    const cleanMonth = monthNameRaw.toLowerCase().replace(/[\.]/g, '').trim();
    const monthNum = MONTHS_MAP[cleanMonth];
    if (monthNum && isValidDateParts(y, monthNum, d)) {
      return formatDate(y, monthNum, d);
    }
  }

  // 3. Data numerica avulsa com separador (/, ., -)
  const looseNumeric = text.match(/\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})\b/);
  if (looseNumeric) {
    const [, d, m, y] = looseNumeric;
    if (isValidDateParts(y, m, d)) return formatDate(y, m, d);
  }

  // 4. Data no padrao ISO YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    if (isValidDateParts(y, m, d)) return formatDate(y, m, d);
  }

  return null;
}
