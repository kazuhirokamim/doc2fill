// core/pdf-stream-decoder.js - Descompressor e Extrator de Streams FlateDecode de PDF (Zero Retenção)

let nodeZlib = null;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    nodeZlib = req('node:zlib');
  } catch (_) {}
}

/**
 * Descompacta bytes de stream PDF comprimidos com FlateDecode (zlib deflate)
 * Opera exclusivamente em memória efêmera (RAM) respeitando o princípio de Zero Retenção.
 * @param {Uint8Array} streamBytes
 * @returns {string} Texto descompactado em latin1/utf-8 ou string vazia em caso de falha
 */
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

/**
 * Extrai texto contido em operadores canônicos de PDF: (Texto) Tj, [(T)(e)(x)(t)(o)] TJ e literais legíveis
 * @param {string} rawPdfText Texto bruto ou descompactado de stream PDF
 * @returns {string[]} Chunks de texto extraídos
 */
export function extractTextFromOperators(rawPdfText) {
  if (!rawPdfText || typeof rawPdfText !== 'string') return [];

  const chunks = [];
  const seen = new Set();

  // 1. Strings literais com operadores (Texto) Tj ou ' ou "
  const literalMatches = rawPdfText.match(/\(([^()]{2,})\)\s*(?:Tj|'|")/g) || [];
  for (const m of literalMatches) {
    const val = m.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, '').trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      chunks.push(val);
    }
  }

  // 2. Arrays de strings [(T) -10 (exto)] TJ
  const arrayMatches = rawPdfText.match(/\[([^\]]+)\]\s*TJ/gi) || [];
  for (const m of arrayMatches) {
    const innerStrings = m.match(/\(([^()]+)\)/g) || [];
    const joined = innerStrings.map(s => s.slice(1, -1)).join('').trim();
    if (joined && !seen.has(joined)) {
      seen.add(joined);
      chunks.push(joined);
    }
  }

  // 3. Extrai quaisquer strings literais entre parênteses dentro de blocos de texto BT ... ET
  const btBlocks = rawPdfText.match(/BT[\s\S]*?ET/gi) || [rawPdfText];
  for (const block of btBlocks) {
    const rawStrings = block.match(/\(([^()]{3,})\)/g) || [];
    for (const s of rawStrings) {
      const clean = s.slice(1, -1).trim();
      if (/^[a-zA-Z0-9\s\.,;:/\-–—ºª§R$\(\)]+$/.test(clean) && clean.length >= 3) {
        if (!seen.has(clean)) {
          seen.add(clean);
          chunks.push(clean);
        }
      }
    }
  }

  return chunks;
}

/**
 * Realiza varredura profunda de um documento PDF, localizando e descompactando streams FlateDecode
 * @param {Uint8Array} bytes Buffer binário do PDF
 * @returns {string[]} Lista de chunks de texto extraídos de streams comprimidos e não-comprimidos
 */
export function extractAllStreamsText(bytes) {
  if (!bytes || bytes.length === 0) return [];

  const decoder = new TextDecoder('latin1');
  const latin1Text = decoder.decode(bytes);
  const allExtractedChunks = [];

  // 1. Extração preliminar de texto não-comprimido do corpo do PDF
  const uncompressedChunks = extractTextFromOperators(latin1Text);
  allExtractedChunks.push(...uncompressedChunks);

  // 2. Varredura e descompressão de streams com FlateDecode
  const streamDictRegex = /<<([\s\S]*?\/Filter\s*(?:\/FlateDecode|\[[\s/a-zA-Z0-9]*FlateDecode[\s/a-zA-Z0-9]*\])[\s\S]*?)>>\s*stream(?:\r\n|\n|\r)/gi;
  let match;

  while ((match = streamDictRegex.exec(latin1Text)) !== null) {
    const streamStart = match.index + match[0].length;
    const endstreamIndex = latin1Text.indexOf('endstream', streamStart);

    if (endstreamIndex !== -1) {
      let streamEnd = endstreamIndex;
      // Trunca quebras de linha terminadoras (\r, \n) antes de 'endstream'
      while (streamEnd > streamStart && (bytes[streamEnd - 1] === 10 || bytes[streamEnd - 1] === 13)) {
        streamEnd--;
      }

      if (streamEnd > streamStart) {
        const compressedBytes = bytes.subarray(streamStart, streamEnd);
        const decompressedText = decompressPdfStream(compressedBytes);

        if (decompressedText) {
          const streamTextChunks = extractTextFromOperators(decompressedText);
          allExtractedChunks.push(...streamTextChunks);
        }
      }
    }
  }

  return allExtractedChunks;
}
