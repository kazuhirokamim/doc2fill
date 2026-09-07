# doc2fill ⚡

> Captura inteligente de documentos (PDF / Câmera) e preenchimento automático para portais governamentais com Zero Retenção de Dados.

## 🎯 Proposta de Valor
Eliminar o preenchimento manual, repetitivo e sujeito a erros de dados fiscais e contábeis em sistemas da administração pública (AGU, SEI, SIAFI, etc.).

## 🏛️ Arquitetura
1. **Desktop / Extensão Chrome (Manifest V3)**: Detecta campos do formulário no portal de destino e executa o autofill.
2. **Mobile Scanner (PWA)**: Permite escanear notas físicas com a câmera do celular através de pareamento instantâneo via QR Code.
3. **Engine de Extração & Parsing**: Extração de entidades (CPF, CNPJ, Razão Social, Valores, Datas, Códigos) via modelo multimodal de alta velocidade.
4. **Política Zero-Retention**: Nenhum documento, imagem ou dado pessoal é persistido em banco de dados na nuvem. A transmissão é efêmera e em memória.

## 📂 Estrutura do Monorepo
* `extension/` — Extensão do navegador (Chrome / Edge)
* `mobile-pwa/` — Interface mobile para captura de fotos via câmera
* `core/` — Lógica compartilhada de validação de CPF/CNPJ e parsing
* `docs/` — ADRs e documentação viva de arquitetura
