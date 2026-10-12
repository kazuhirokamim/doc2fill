// core/license-validator.js
// Sistema de Licenciamento Criptográfico Local-First (Zero Retenção & Offline HMAC-SHA256)
// Garante validação instantânea sem dependência de nuvem e sem risco de vazamento de credenciais.

const LICENSE_SIGNATURE_SALT = 'doc2fill-sovereign-lic-seed-2026-sec';

/**
 * Funções primitivas de hashing SHA-256 universal (FIPS 180-4) em JS puro.
 * Compatível nativamente com Node.js, navegadores modernos e extensões Chrome MV3 sem bundler.
 */
function sha256Bytes(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const words = [];
  const asciiBitLength = ascii.length * 8;
  const hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = candidate * 2; i < 313; i += candidate) isComposite[i] = true;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';

  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  const bytes = [];
  for (let i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      bytes.push((hash[i] >> (b * 8)) & 255);
    }
  }
  return bytes;
}

/**
 * Gera HMAC-SHA256 em hexadecimal.
 * @param {string} keyStr
 * @param {string} msgStr
 * @returns {string}
 */
function hmacSha256(keyStr, msgStr) {
  let keyBytes = [];
  for (let i = 0; i < keyStr.length; i++) keyBytes.push(keyStr.charCodeAt(i) & 255);

  if (keyBytes.length > 64) {
    let keyAscii = '';
    for (const b of keyBytes) keyAscii += String.fromCharCode(b);
    keyBytes = sha256Bytes(keyAscii);
  }

  while (keyBytes.length < 64) keyBytes.push(0);

  let ipad = '';
  let opad = '';
  for (let i = 0; i < 64; i++) {
    ipad += String.fromCharCode(keyBytes[i] ^ 0x36);
    opad += String.fromCharCode(keyBytes[i] ^ 0x5c);
  }

  const innerBytes = sha256Bytes(ipad + msgStr);
  let innerAscii = '';
  for (const b of innerBytes) innerAscii += String.fromCharCode(b);

  const outerBytes = sha256Bytes(opad + innerAscii);
  return outerBytes.map((b) => (b < 16 ? '0' : '') + b.toString(16)).join('');
}

/**
 * Normaliza e-mail removendo espaços e convertendo para minúsculas.
 * @param {string} email
 * @returns {string}
 */
export function normalizeLicenseEmail(email) {
  return email ? String(email).trim().toLowerCase() : '';
}

/**
 * Gera uma chave de licença criptografada amarrada ao e-mail.
 * Formato: D2F-<PLANO>-<VALIDADE>-<HMAC_16HEX>
 * Ex: D2F-PRO-20261231-497FBBF95F094FF7
 * @param {string} email
 * @param {string} plan 'STARTER' | 'PRO' | 'BETA'
 * @param {string} expiresAt 'YYYYMMDD' ou 'LIFETIME'
 * @returns {string}
 */
export function generateLicenseKey(email, plan, expiresAt) {
  const normEmail = normalizeLicenseEmail(email);
  const normPlan = String(plan).trim().toUpperCase();
  const normExp = String(expiresAt).trim().toUpperCase();

  const payload = `${normEmail}:${normPlan}:${normExp}`;
  const signature = hmacSha256(LICENSE_SIGNATURE_SALT, payload).substring(0, 16).toUpperCase();

  return `D2F-${normPlan}-${normExp}-${signature}`;
}

/**
 * Valida uma chave de licença contra o e-mail do portador de forma offline e instantânea.
 * @param {string} email
 * @param {string} licenseKey
 * @returns {Object}
 */
export function validateLicenseKey(email, licenseKey) {
  if (!email || !licenseKey || typeof email !== 'string' || typeof licenseKey !== 'string') {
    return { valid: false, reason: 'PARAMETROS_INVALIDOS' };
  }

  const normEmail = normalizeLicenseEmail(email);
  if (!normEmail || !normEmail.includes('@')) {
    return { valid: false, reason: 'EMAIL_INVALIDO' };
  }

  const cleanKey = licenseKey.trim();
  const match = cleanKey.match(/^D2F-([A-Z0-9]+)-([A-Z0-9]+)-([A-F0-9]{16})$/i);
  if (!match) {
    return { valid: false, reason: 'FORMATO_INVALIDO' };
  }

  const [, rawPlan, rawExpiresAt, signature] = match;
  const plan = rawPlan.toUpperCase();
  const expiresAtStr = rawExpiresAt.toUpperCase();

  // Recalcula o HMAC canônico esperado
  const expectedPayload = `${normEmail}:${plan}:${expiresAtStr}`;
  const expectedSig = hmacSha256(LICENSE_SIGNATURE_SALT, expectedPayload).substring(0, 16).toUpperCase();

  if (signature.toUpperCase() !== expectedSig) {
    return { valid: false, reason: 'ASSINATURA_INVALIDA' };
  }

  // Licença Vitalícia
  if (expiresAtStr === 'LIFETIME') {
    return {
      valid: true,
      plan,
      expiresAt: 'Vitalícia',
      daysRemaining: Infinity,
      isLifetime: true
    };
  }

  // Licença com Prazo Definido (YYYYMMDD)
  if (/^\d{8}$/.test(expiresAtStr)) {
    const year = parseInt(expiresAtStr.substring(0, 4), 10);
    const month = parseInt(expiresAtStr.substring(4, 6), 10);
    const day = parseInt(expiresAtStr.substring(6, 8), 10);

    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const expDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    const now = new Date();

    if (now.getTime() > expDate.getTime()) {
      return {
        valid: false,
        reason: 'LICENCA_EXPIRADA',
        plan,
        expiresAt: formattedDate,
        daysRemaining: 0
      };
    }

    const diffMs = expDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return {
      valid: true,
      plan,
      expiresAt: formattedDate,
      daysRemaining,
      isLifetime: false
    };
  }

  return { valid: false, reason: 'DATA_INVALIDA' };
}

/**
 * Retorna uma descrição amigável do status da licença para exibição no Sidepanel ou UI.
 * @param {Object} res Resultado de validateLicenseKey
 * @returns {string}
 */
export function formatLicenseDisplay(res) {
  if (!res || !res.valid) {
    return 'Licença Inativa ou Não Validada';
  }

  if (res.isLifetime) {
    return `Doc2Fill ${res.plan} (Vitalícia)`;
  }

  return `Doc2Fill ${res.plan} (Válido até ${res.expiresAt} · ${res.daysRemaining} dias)`;
}
