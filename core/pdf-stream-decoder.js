// core/pdf-stream-decoder.js - Descompressor e Extrator de Streams FlateDecode de PDF (Zero Retenção)

let nodeZlib = null;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    nodeZlib = req('node:zlib');
  } catch (_) {}
}

export function decompressPdfStream(streamBytes) {
  if (!streamBytes || streamBytes.length === 0) return '';
  if (nodeZlib) {
    try {
      const decompressed = nodeZlib.inflateSync(streamBytes);
      return new TextDecoder('latin1').decode(decompressed);
    } catch (_) {
      try {
        const raw = nodeZlib.inflateRawSync(streamBytes);
        return new TextDecoder('latin1').decode(raw);
      } catch (_) {
        return '';
      }
    }
  }
  return '';
}

export async function decompressPdfStreamAsync(streamBytes) {
  if (!streamBytes || streamBytes.length === 0) return '';
  if (nodeZlib) return decompressPdfStream(streamBytes);

  if (typeof DecompressionStream !== 'undefined') {
    for (const format of ['deflate', 'deflate-raw']) {
      try {
        const ds = new DecompressionStream(format);
        const writer = ds.writable.getWriter();
        writer.write(streamBytes).catch(() => {});
        writer.close().catch(() => {});

        const reader = ds.readable.getReader();
        const chunks = [];
        let totalLen = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            totalLen += value.byteLength;
          }
        }

        if (totalLen > 0) {
          const merged = new Uint8Array(totalLen);
          let offset = 0;
          for (const c of chunks) {
            merged.set(c, offset);
            offset += c.byteLength;
          }
          return new TextDecoder('latin1').decode(merged);
        }
      } catch (_) {}
    }
  }
  return '';
}

export function isCleanTextStream(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  let nonPrintable = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13) continue;
    if (code >= 32 && code <= 126) continue;
    if (code >= 160 && code <= 255) continue;
    nonPrintable++;
  }
  if (nonPrintable / trimmed.length > 0.08) return false;
  return /[a-zA-Z0-9]{2,}/.test(trimmed);
}

export function extractTextFromOperators(rawPdfText) {
  if (!rawPdfText || typeof rawPdfText !== 'string') return [];
  const chunks = [];
  const seen = new Set();

  const literalMatches = rawPdfText.match(/\(([^()]{2,})\)\s*(?:Tj|'|")/g) || [];
  for (const m of literalMatches) {
    const val = m.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, '').trim();
    if (val && isCleanTextStream(val) && !seen.has(val)) { seen.add(val); chunks.push(val); }
  }

  const arrayMatches = rawPdfText.match(/\[([^\]]+)\]\s*TJ/gi) || [];
  for (const m of arrayMatches) {
    const innerStrings = m.match(/\(([^()]+)\)/g) || [];
    const joined = innerStrings.map(s => s.slice(1, -1)).join('').trim();
    if (joined && isCleanTextStream(joined) && !seen.has(joined)) { seen.add(joined); chunks.push(joined); }
  }

  const btBlocks = rawPdfText.match(/BT[\s\S]*?ET/gi) || [rawPdfText];
  for (const block of btBlocks) {
    const rawStrings = block.match(/\(([^()]{3,})\)/g) || [];
    for (const s of rawStrings) {
      const clean = s.slice(1, -1).trim();
      if (/^[a-zA-Z0-9\s\.,;:/\-–—ºª§R$\(\)]+$/.test(clean) && clean.length >= 3) {
        if (!seen.has(clean) && isCleanTextStream(clean)) { seen.add(clean); chunks.push(clean); }
      }
    }
  }
  return chunks;
}

export function extractAllStreamsText(bytes) {
  if (!bytes || bytes.length === 0) return [];
  const decoder = new TextDecoder('latin1');
  const latin1Text = decoder.decode(bytes);
  const allExtractedChunks = [...extractTextFromOperators(latin1Text)];

  const streamDictRegex = /<<([\s\S]*?\/Filter\s*(?:\/FlateDecode|\[[\s/a-zA-Z0-9]*FlateDecode[\s/a-zA-Z0-9]*\])[\s\S]*?)>>\s*stream(?:\r\n|\n|\r)/gi;
  let match;
  while ((match = streamDictRegex.exec(latin1Text)) !== null) {
    const dictText = match[1];
    if (/\/Subtype\s*\/Image\b/i.test(dictText)) continue;
    const streamStart = match.index + match[0].length;
    const endstreamIndex = latin1Text.indexOf('endstream', streamStart);
    if (endstreamIndex !== -1) {
      let streamEnd = endstreamIndex;
      while (streamEnd > streamStart && (bytes[streamEnd - 1] === 10 || bytes[streamEnd - 1] === 13)) streamEnd--;
      if (streamEnd > streamStart) {
        const decompressedText = decompressPdfStream(bytes.subarray(streamStart, streamEnd));
        if (decompressedText) allExtractedChunks.push(...extractTextFromOperators(decompressedText));
      }
    }
  }
  return allExtractedChunks;
}

export async function extractAllStreamsTextAsync(bytes) {
  if (!bytes || bytes.length === 0) return [];
  const decoder = new TextDecoder('latin1');
  const latin1Text = decoder.decode(bytes);
  const allExtractedChunks = [...extractTextFromOperators(latin1Text)];

  const streamDictRegex = /<<([\s\S]*?\/Filter\s*(?:\/FlateDecode|\[[\s/a-zA-Z0-9]*FlateDecode[\s/a-zA-Z0-9]*\])[\s\S]*?)>>\s*stream(?:\r\n|\n|\r)/gi;
  let match;
  while ((match = streamDictRegex.exec(latin1Text)) !== null) {
    const dictText = match[1];
    if (/\/Subtype\s*\/Image\b/i.test(dictText)) continue;
    const streamStart = match.index + match[0].length;
    const endstreamIndex = latin1Text.indexOf('endstream', streamStart);
    if (endstreamIndex !== -1) {
      let streamEnd = endstreamIndex;
      while (streamEnd > streamStart && (bytes[streamEnd - 1] === 10 || bytes[streamEnd - 1] === 13)) streamEnd--;
      if (streamEnd > streamStart) {
        const decompressedText = await decompressPdfStreamAsync(bytes.subarray(streamStart, streamEnd));
        if (decompressedText) allExtractedChunks.push(...extractTextFromOperators(decompressedText));
      }
    }
  }
  return allExtractedChunks;
}

/**
 * Converte um Uint8Array para string Base64 em ambientes Node.js ou Browser.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToBase64(bytes) {
  if (!bytes || bytes.length === 0) return '';
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  if (typeof btoa === 'function') {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return '';
}

/**
 * Inspeciona os objetos de um PDF em busca de streams de imagem rasterizada (/Subtype /Image).
 * Extrai diretamente a primeira imagem (ex: DCTDecode / JPEG) como Data URL para processamento de OCR no client.
 * Opera exclusivamente em memória (Zero Retenção).
 * @param {Uint8Array|ArrayBuffer|string} input Buffer binário ou data URL do PDF
 * @returns {string|null} Data URL (ex: data:image/jpeg;base64,...) ou null se não houver imagem
 */
export function extractFirstPdfImageAsDataUrl(input) {
  if (!input) return null;
  let bytes = null;
  if (input instanceof Uint8Array) {
    bytes = input;
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else if (ArrayBuffer.isView(input)) {
    bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  } else if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      const b64 = input.includes(',') ? input.split(',')[1] : input;
      if (typeof Buffer !== 'undefined') {
        bytes = Buffer.from(b64, 'base64');
      } else if (typeof atob === 'function') {
        const bin = atob(b64);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      }
    }
  }

  if (!bytes || bytes.length === 0) return null;

  const decoder = new TextDecoder('latin1');
  const latin1Text = decoder.decode(bytes);

  const imageStreamRegex = /<<([\s\S]*?\/Subtype\s*\/Image[\s\S]*?)>>\s*stream(?:\r\n|\n|\r)/gi;
  let match;
  while ((match = imageStreamRegex.exec(latin1Text)) !== null) {
    const dictText = match[1];
    const streamStart = match.index + match[0].length;
    const endstreamIndex = latin1Text.indexOf('endstream', streamStart);
    if (endstreamIndex === -1) continue;

    let streamEnd = endstreamIndex;
    while (streamEnd > streamStart && (bytes[streamEnd - 1] === 10 || bytes[streamEnd - 1] === 13)) {
      streamEnd--;
    }

    if (streamEnd <= streamStart) continue;

    const rawStreamBytes = bytes.subarray(streamStart, streamEnd);

    // Se o filtro for DCTDecode (JPEG nativo)
    if (/\/Filter\s*(?:\/DCTDecode|\[[\s/a-zA-Z0-9]*DCTDecode[\s/a-zA-Z0-9]*\])/i.test(dictText)) {
      const b64 = bytesToBase64(rawStreamBytes);
      if (b64) {
        return `data:image/jpeg;base64,${b64}`;
      }
    }
  }

  return null;
}

