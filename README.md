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
7. **Ativação sob Demanda e Política de DOM Limpo (v0.2.0)**: O painel opera exclusivamente via Side Panel nativo ou atalho de teclado `Alt+Shift+D`. Ao fechar o painel, nenhum elemento ou miniatura residual permanece visível na tela ([ADR-004](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-004-user-initiated-clean-activation.md)).
8. **Content Script 100% Headless (v0.2.1)**: Eliminação total de canais de fallback in-page e injeções no DOM. Zero caixas ou botões flutuantes gerados em páginas web ([ADR-005](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-005-headless-content-script.md)).
9. **Motor Clínico Anti-Glosa & Injeção de Anexos (v0.3.0)**: Tradução ontológica heurística de procedimentos estéticos para códigos/descrições técnicas TUSS/ANS, seleção de titular/dependente, classificação automática de recibo/nota e injeção de arquivos via `DataTransfer` ([ADR-006](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-006-clinical-translator-and-file-injection.md)).
10. **Compatibilidade CCHAR & Sandbox MV3 (v0.3.1)**: Empacotamento isolado dos módulos core na extensão, suporte a Shadow DOM recursivo, eventos reativos do Angular e injeção em todos os frames para o portal CCHAR ([ADR-007](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-007-cchar-compatibility-and-mv3-sandbox-isolation.md)).
11. **Motor de Classificação e Sidebar Focada (8 Campos CCHA) (v0.4.0)**: Leitura e classificação de 8+ tipos de documentos (Nota Fiscal, Cupom, Recibo, Boleto, Fatura, Comprovante, Guia, Declaração, Outros) e interface lateral estritamente focada nos 8 campos essenciais para o CCHA, com preenchimento em 1 clique ([ADR-009](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/docs/adr/ADR-009-document-parser-and-focused-sidebar.md)).

## 📂 Estrutura do Monorepo
* `extension/` — Extensão do navegador (Chrome / Edge) com Side Panel e widgets minimalistas
* `mobile-pwa/` — Interface mobile para captura de fotos via câmera e preenchimento assistido 1-touch
* `demo-portal/` — Simulador de portal governamental e de reembolso de saúde (AGU/PGFN/Planos)
* `core/` — Lógica compartilhada de validação de CPF/CNPJ, matcher heurístico, classificador de documentos e motor ontológico anti-glosa
* `documentation/` — [Design System](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/documentation/DESIGN-SYSTEM.md), [Segurança & CSP](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/documentation/SECURITY-AND-CSP.md), [Motor Clínico Anti-Glosa](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/documentation/CLINICAL-ANTI-GLOSA-ENGINE.md) e [Classificação & Sidebar Focada CCHA](file:///Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill/documentation/DOCUMENT-PARSER-AND-FOCUSED-SIDEBAR.md)
* `docs/` — ADRs, especificações SDD e documentação viva de arquitetura


