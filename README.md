# doc2fill ⚡

> Captura inteligente de documentos (PDF / Câmera) e preenchimento automático para portais governamentais com Zero Retenção de Dados.

## 🎯 Proposta de Valor
Eliminar o preenchimento manual, repetitivo e sujeito a erros de dados fiscais e contábeis em sistemas da administração pública (AGU, SEI, SIAFI, etc.).

## 🏛️ Arquitetura & Design System
1. **Desktop / Extensão Chrome (Manifest V3)**: Detecta campos do formulário no portal de destino e executa o autofill via Side Panel ou widget in-page.
2. **Mobile Scanner (PWA)**: Permite escanear notas físicas com a câmera do celular através de pareamento instantâneo via QR Code.
3. **Engine de Extração & Parsing**: Extração de entidades (CPF, CNPJ, Razão Social, Valores, Datas, Códigos) via modelo multimodal em memória.
4. **Política Zero-Retention**: Nenhum documento, imagem ou dado pessoal é persistido em banco de dados na nuvem ([ADR-001](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-001-hybrid-p2p-zero-retention.md)).
5. **Estética Minimalista e Sofisticada**: Interface limpa e leve com cantos arredondados suaves, sombras etéreas de baixíssima opacidade (soft shadows), paleta de baixo contraste e CTAs em preto elegante ([ADR-002](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-002-minimal-refined-design-system.md)).
6. **Conformidade Estrita com CSP e Manifest V3**: Código 100% livre de manipuladores inline, prevenindo violações de segurança e ataques XSS ([ADR-003](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-003-csp-strict-manifest-v3-compliance.md)).

## 📂 Estrutura do Monorepo
* `extension/` — Extensão do navegador (Chrome / Edge) com Side Panel e widgets minimalistas
* `mobile-pwa/` — Interface mobile para captura de fotos via câmera
* `demo-portal/` — Simulador de portal governamental (AGU/PGFN) para validação
* `core/` — Lógica compartilhada de validação de CPF/CNPJ e matcher heurístico com testes TDD
* `documentation/` — [Guia do Design System](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/documentation/DESIGN-SYSTEM.md) e [Diretrizes de Segurança & CSP](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/documentation/SECURITY-AND-CSP.md)
* `docs/` — ADRs e documentação viva de arquitetura


