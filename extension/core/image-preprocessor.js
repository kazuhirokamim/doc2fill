// core/image-preprocessor.js
// Preprocessamento Local-First, Correção de Orientação EXIF e Auto-Deskew Angular

/**
 * Lê tags EXIF de um buffer binário JPEG para detectar a orientação do sensor da câmera.
 * @param {Uint8Array|ArrayBuffer|Buffer} input
 * @returns {number} Valor da tag de orientação (1 a 8). Default 1 (sem rotação).
 */
export function detectExifOrientation(input) {
  if (!input) return 1;

  let bytes;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    bytes = input;
  } else if (input instanceof Uint8Array) {
    bytes = input;
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else if (ArrayBuffer.isView(input)) {
    bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  } else {
    return 1;
  }

  // Verifica se é imagem JPEG válida (0xFFD8)
  if (bytes.length < 14 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    return 1;
  }

  let offset = 2;
  const length = bytes.length;

  while (offset + 4 < length) {
    if (bytes[offset] !== 0xFF) {
      break;
    }

    const marker = bytes[offset + 1];
    // Se for SOS (Start of Scan) ou EOI, interrompe busca
    if (marker === 0xDA || marker === 0xD9) {
      break;
    }

    const blockLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (blockLength < 2 || offset + 2 + blockLength > length) {
      break;
    }

    // Marcador APP1 (0xFFE1) - Metadados EXIF
    if (marker === 0xE1) {
      const exifHeaderOffset = offset + 4;
      if (
        bytes[exifHeaderOffset] === 0x45 && // E
        bytes[exifHeaderOffset + 1] === 0x78 && // x
        bytes[exifHeaderOffset + 2] === 0x69 && // i
        bytes[exifHeaderOffset + 3] === 0x66 && // f
        bytes[exifHeaderOffset + 4] === 0x00 &&
        bytes[exifHeaderOffset + 5] === 0x00
      ) {
        const tiffOffset = exifHeaderOffset + 6;
        if (tiffOffset + 8 > length) return 1;

        // Endianness: 'II' (Little-Endian) ou 'MM' (Big-Endian)
        const isLittle = bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49;
        const isBig = bytes[tiffOffset] === 0x4D && bytes[tiffOffset + 1] === 0x4D;
        if (!isLittle && !isBig) return 1;

        const readUint16 = (pos) => {
          if (pos + 2 > length) return 0;
          return isLittle
            ? bytes[pos] | (bytes[pos + 1] << 8)
            : (bytes[pos] << 8) | bytes[pos + 1];
        };

        const readUint32 = (pos) => {
          if (pos + 4 > length) return 0;
          return isLittle
            ? (bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)) >>> 0
            : ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
        };

        const firstIfdOffset = readUint32(tiffOffset + 4);
        if (firstIfdOffset < 8) return 1;

        const ifd0Start = tiffOffset + firstIfdOffset;
        const tagCount = readUint16(ifd0Start);

        for (let i = 0; i < tagCount; i++) {
          const tagOffset = ifd0Start + 2 + i * 12;
          if (tagOffset + 12 > length) break;

          const tag = readUint16(tagOffset);
          // 0x0112 = Orientation tag
          if (tag === 0x0112) {
            const val = readUint16(tagOffset + 8);
            if (val >= 1 && val <= 8) {
              return val;
            }
          }
        }
      }
      return 1;
    }

    offset += 2 + blockLength;
  }

  return 1;
}

/**
 * Converte a orientação numérica EXIF em graus de rotação horária no sentido padrão.
 * @param {number} orientation
 * @returns {number} Graus (0, 90, 180, 270)
 */
export function getRotationDegreesFromOrientation(orientation) {
  if (typeof orientation !== 'number') return 0;
  switch (orientation) {
    case 3:
      return 180;
    case 6:
      return 90;
    case 8:
      return 270;
    case 1:
    default:
      return 0;
  }
}

/**
 * Calcula a variância do perfil de projeção para um ângulo específico.
 * @param {Uint8Array|Array<number>} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} angle
 * @param {number} centerX
 * @returns {number}
 */
function calculateProjectionVarianceForAngle(pixels, width, height, angle, centerX) {
  const rad = angle * (Math.PI / 180);
  const tan = Math.tan(rad);
  const profile = new Float32Array(height);
  let activePixels = 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const val = pixels[rowOffset + x];
      if (val > 0) {
        const projectedY = Math.round(y - (x - centerX) * tan);
        if (projectedY >= 0 && projectedY < height) {
          profile[projectedY] += val;
          activePixels++;
        }
      }
    }
  }

  if (activePixels === 0) return 0;

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < height; i++) {
    const count = profile[i];
    sum += count;
    sumSq += count * count;
  }

  const mean = sum / height;
  return sumSq / height - mean * mean;
}

/**
 * Estima o ângulo de inclinação (skew) de uma matriz de pixels usando perfil de projeção horizontal.
 * Busca o ângulo que maximiza a variância das linhas de texto (Radon-lite).
 * @param {Uint8Array|Array<number>} pixels Matriz de pixels (1 = primeiro plano/tinta, 0 = fundo)
 * @param {number} width Largura da imagem
 * @param {number} height Altura da imagem
 * @param {number} [minAngle=-20] Ângulo mínimo de varredura
 * @param {number} [maxAngle=20] Ângulo máximo de varredura
 * @param {number} [step=1] Passo angular em graus
 * @returns {number} Ângulo estimado em graus com maior variância
 */
export function estimateSkewAngleFromProjection(
  pixels,
  width,
  height,
  minAngle = -20,
  maxAngle = 20,
  step = 1
) {
  if (!pixels || width <= 0 || height <= 0 || pixels.length < width * height) {
    return 0;
  }

  const totalPixels = width * height;
  let totalActive = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (pixels[i] > 0) totalActive++;
  }

  // Se a imagem for totalmente vazia ou sólida sem contraste de texto, retorna 0
  if (totalActive === 0 || totalActive >= totalPixels * 0.95) {
    return 0;
  }

  let bestAngle = 0;
  let maxVariance = 0;
  const centerX = width / 2;

  // Itera sobre o espectro de ângulos avaliando a variância modularmente
  for (let angle = minAngle; angle <= maxAngle; angle += step) {
    const variance = calculateProjectionVarianceForAngle(pixels, width, height, angle, centerX);
    const isCloserToZero = Math.abs(variance - maxVariance) < 1e-4 && Math.abs(angle) < Math.abs(bestAngle);
    if (variance > maxVariance || isCloserToZero) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

/**
 * Calcula as dimensões resultantes de um retângulo após rotação planar arbitrária.
 * @param {number} width Largura original
 * @param {number} height Altura original
 * @param {number} angleDegrees Ângulo em graus
 * @returns {{width: number, height: number}}
 */
export function calculateRotatedDimensions(width, height, angleDegrees) {
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }

  const rad = Math.abs(angleDegrees || 0) * (Math.PI / 180);
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  return {
    width: Math.round(width * cos + height * sin),
    height: Math.round(width * sin + height * cos)
  };
}
