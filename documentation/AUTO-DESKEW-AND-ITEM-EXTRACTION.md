# 📐 Documentação Técnica: Auto-Deskew de Imagens e Extração de Itens da Nota

## 1. Visão Geral
Este módulo integra duas inovações de robustez no **doc2fill** (Trilha B):
1. **Auto-Deskew e Orientação EXIF (`core/image-preprocessor.js`):** Garante que imagens capturadas por smartphones ou scanners em ângulos inclinados (-20° a +20°) ou rotacionadas (90°, 180°, 270°) sejam alinhadas antes da passagem pelo motor de OCR.
2. **Extração Semântica e Tabular de Itens (`core/item-extractor.js`):** Extrai a relação individualizada de produtos e serviços discriminados em cupons fiscais e notas fiscais eletrônicas (DANFE / NFC-e) com validação matemática de somatórios.

---

## 2. Auto-Deskew & Preprocessamento (`core/image-preprocessor.js`)

### Detecção de Orientação EXIF
- Função: `detectExifOrientation(buffer)`
- Analisa os marcadores JPEG `0xFFE1` (APP1) e o cabeçalho TIFF para localizar a tag de orientação `0x0112`.
- Suporta formatos Little-Endian (`II`) e Big-Endian (`MM`).
- Mapeamento de rotação:
  - `1`: 0° (orientação normal)
  - `3`: 180°
  - `6`: 90° (rotação horária)
  - `8`: 270° (rotação anti-horária)

### Estimativa de Inclinação por Projeção de Variância Horizontal (Radon-Lite)
- Função: `estimateSkewAngleFromProjection(pixels, width, height, minAngle, maxAngle, step)`
- Projeta os pixels pretos em linhas horizontais para cada ângulo hipotético \(\theta \in [-20°, +20°]\).
- O ângulo ótimo é aquele que **maximiza a variância** da densidade horizontal de pixels, alinhando as linhas de texto paralelamente ao eixo horizontal.
- Proteção contra imagens sólidas ou sem contraste: descarta automaticamente matrizes sem densidade diferencial evitando artefatos de borda.

---

## 3. Extrator de Itens (`core/item-extractor.js`)

### Estrutura Canônica do Item
```json
{
  "itemIndex": 1,
  "code": "7891000100100",
  "description": "GASOLINA COMUM C",
  "quantity": 35.45,
  "unit": "LT",
  "unitPrice": 5.89,
  "totalPrice": 208.80
}
```

### Validação Matemática de Consistência
- Função: `validateItemTotals(items, documentTotal, tolerance = 0.10)`
- Soma o campo `totalPrice` de todos os itens e compara com o valor total informado no documento.
- Admite tolerância padrão de R$ 0,10 para compensar arredondamentos de centavos em balanças ou taxas de abastecimento.

---

## 4. Conformidade e Segurança (Tear & LGPD)
- **100% Local-First:** Todo o cálculo de rotação e extração tabular é executado na memória RAM local (Zero Retenção).
- **Zero Dependências Pesadas:** Sem compilações de OpenCV C++ (> 10MB).
- **Cobertura de Testes TDD:** 24 testes específicos cobrindo Happy Path, Edge Cases e Error Paths.
