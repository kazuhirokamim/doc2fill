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

export function extractTextFromOperators(rawPdfText) {
  if (!rawPdfText || typeof rawPdfText !== 'string') return [];
  const chunks = [];
  const seen = new Set();

  const literalMatches = rawPdfText.match(/\(([^()]{2,})\)\s*(?:Tj|'|")/g) || [];
  for (const m of literalMatches) {
    const val = m.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, '').trim();
    if (val && !seen.has(val)) { seen.add(val); chunks.push(val); }
  }

  const arrayMatches = rawPdfText.match(/\[([^\]]+)\]\s*TJ/gi) || [];
  for (const m of arrayMatches) {
    const innerStrings = m.match(/\(([^()]+)\)/g) || [];
    const joined = innerStrings.map(s => s.slice(1, -1)).join('').trim();
    if (joined && !seen.has(joined)) { seen.add(joined); chunks.push(joined); }
  }

  const btBlocks = rawPdfText.match(/BT[\s\S]*?ET/gi) || [rawPdfText];
  for (const block of btBlocks) {
    const rawStrings = block.match(/\(([^()]{3,})\)/g) || [];
    for (const s of rawStrings) {
      const clean = s.slice(1, -1).trim();
      if (/^[a-zA-Z0-9\s\.,;:/\-–—ºª§R$\(\)]+$/.test(clean) && clean.length >= 3) {
        if (!seen.has(clean)) { seen.add(clean); chunks.push(clean); }
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
