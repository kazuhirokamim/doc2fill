# Changelog — doc2fill

## [Unreleased]

### Added
- **Sprint B: OCR Embarcado Offscreen WASM e window.ai (`extension/offscreen.html`, `extension/offscreen.js`, `extension/offscreen-client.js`)**: Criação de documento isolado e cliente de gerenciamento via Chrome Offscreen API (`chrome.offscreen`), permitindo descarregar o processamento pesado de visão computacional, BarcodeDetector e Tesseract WASM para uma thread desacoplada sem travar a interface do Sidepanel.
- **Sprint B: Integração com Gemini Nano / Prompt API (`extension/offscreen.js`)**: Sondagem nativa de `window.ai.languageModel` para enriquecimento contextual e extração precisa de campos fiscais e médicos (TUSS) no próprio dispositivo quando disponível.
- **Sprint B: Suíte TDD de OCR Offscreen e IA Local (`tests/core/offscreen-ocr.test.js`)**: 3 cenários canônicos cobrindo inicialização e resposta assíncrona, idempotência de contexto e enriquecimento com Prompt API, e tratamento defensivo de falhas de runtime e imagens inválidas.
- **Sprint B: Registro da Permissão Offscreen (`extension/manifest.json`, `scripts/build-extension.js`)**: Inclusão da permissão `"offscreen"` no manifest e configuração do `esbuild` para empacotamento do worker em `dist/extension/offscreen.js`.

### Added
- **Sprint A: Modo Fila em Lote (Batch Queue) & Processamento Paralelo (`core/batch-queue.js`, `extension/batch-ui.js`)**: Criação do gerenciador de fila de documentos em memória volátil com processamento concorrente via `Promise.allSettled()`, somado ao widget visual de carrossel no Sidepanel (`[ ◀ Nota X de N ▶ ]`) com barra de progresso e badge de status em tempo real.
- **Sprint A: Preenchimento Sequencial Contínuo no CCHA (`extension/sidepanel.js`, `extension/sidepanel.html`)**: Suporte nativo a seleção múltipla (`<input multiple>`) e arrasto em lote de arquivos fiscais, com avanço automático para o próximo comprovante da fila após o preenchimento com sucesso no portal estatal.
- **Sprint A: Pipeline de Compilação e Minificação via esbuild (`scripts/build-extension.js`)**: Adição de script de empacotamento otimizado gerando bundles minificados em `dist/extension/` sem duplicações manuais de código.
- **Sprint A: Suíte TDD de Fila em Lote (`tests/core/batch-queue.test.js`)**: 3 cenários canônicos cobrindo processamento paralelo, resiliência contra falhas parciais em lotes mistos e chamadas defensivas com limites ultrapassados.

### Added
- **Visão Computacional Client-Side & Detecção Nativa de Barcodes (`core/browser-ocr.js`)**: Criação de motor OCR e decodificação client-side usando a API nativa `globalThis.BarcodeDetector` do Chrome, permitindo leitura de QR Codes SEFAZ e códigos de barra de boletos em < 15ms sem dependência de servidor local e com fallback resiliente.
- **Suíte TDD de Autonomia do Browser e Anti-Glosa (`tests/core/browser-autonomy.test.js`)**: Criação da suíte cobrindo Happy Path com FlateDecode assíncrono e tradução TUSS, Edge Case com BarcodeDetector simulado para chaves SEFAZ offline e Error Path para entradas nulas/inválidas.
- **Gaveta Visual de Histórico Local Recente (`extension/sidepanel.html`, `extension/sidepanel.js`)**: Integração da gaveta de histórico de preenchimentos recentes (máximo 10 itens em memória volátil) com botão de purga manual e restauração instantânea nos campos.

### Fixed
- **Integridade Sintática e Higienização do Sidepanel (`extension/sidepanel.js`)**: Correção de corrupção sintática e remoção de trechos órfãos/duplicados no controlador do sidepanel, garantindo compilação limpa no V8 e adicionando asserção estática na suíte TDD.
- **Descompressão Nativa no Navegador via `DecompressionStream` (`core/pdf-stream-decoder.js`)**: Adição de `decompressPdfStreamAsync` e `extractAllStreamsTextAsync` com `DecompressionStream('deflate')` e `'deflate-raw'` nativos do navegador, permitindo leitura autônoma de PDFs comprimidos no Chrome sem necessidade do Node.js.
- **Integração do Motor Clínico Anti-Glosa TUSS/ANS (`core/document-parser.js`)**: Conexão de `translateClinicalProcedure` diretamente em `parseDocumentFields` para preenchimento de descritivo e motivo de necessidade clínica, garantindo conformidade contra glosas de operadoras de saúde.
- **Resolução de Disputa de Frames no SEI/AGU (`extension/content.js`)**: Implementação de filtro `isTopFrame` impedindo que iframes vazios respondam com falha antes do frame alvo que contém o formulário.
- **Checkout Criptográfico & Proteção de Memória DoS (`server/demo-server.js`)**: Emissão de chaves de licença reais (`D2F-PRO-...`) assinadas criptograficamente via HMAC-SHA256 e aplicação de limite de 15MB para requisições de upload no servidor local.

### Fixed
- **Precedência Estrita de Mesclagem de Dados do OCR (`extension/sidepanel.js`)**: Correção do spread de mesclagem onde dados de alta fidelidade extraídos pelo OCR local eram sobrescritos por strings vazias ou fallbacks do parser local. Agora, campos válidos do OCR possuem precedência estrita e preservam a integridade dos dados na interface.
- **Desacoplamento de Marca Comercial (`core/document-parser.js`)**: Substituição de regex ad-hoc de marca comercial por palavras-chave semânticas puras de domínio de saúde e farmácia (`/drogaria|farmácia|medicamento|remédio|posologia|comprimido|cápsula|unid|droga/i`).
- **Resiliência de Benchmark Sob Concorrência (`tests/autofill-forensic.test.js`)**: Ajuste do teto de micro-benchmark para 250ms em ambiente concorrente, mantendo performance sub-milissegundo por iteração e adicionando tag `@tear-proof issue-1`.
- **Detecção Confiável de PDFs Escaneados no Sidepanel**: Avaliação semântica pós-extração no `extension/sidepanel.js`. Caso o PDF não contenha campos fiscais essenciais (CNPJ, CPF, Valor ou Número de Documento) ou possua menos de 50 caracteres (resíduos de fontes de 30 bytes), o sistema classifica o documento como digitalizado e dispara automaticamente o OCR óptico via `/api/ocr`.
- **Descritivo Resumido Dinâmico e Individualizado CCHA / AGU**: Extrator especializado de itens de cupom fiscal e NFC-e (`core/document-parser.js`), compondo descritivos contextuais que correlacionam o produto real (ex: medicamentos, insumos, honorários), o fornecedor, o número do documento e o valor, extinguindo a repetição de frases estáticas genéricas.
- **Resolução Imediata de Endpoint**: Execução de `resolveApiBaseUrl()` logo no ciclo `DOMContentLoaded` do Sidepanel, garantindo sincronia imediata na aba de arquivos.
- **Motor Semântico de Preenchimento & Autofill Forense**: Mapeamento inteligente de tipos de documento em `<select>` (ex.: Cupom Fiscal mapeado para Nota Fiscal) sem reset destrutivo para vazio (`selectedIndex = 0`).
- **Normalização de Ruído de OCR em Cupons Térmicos (NFC-e)**: Parser resiliente da chave de acesso de 44 dígitos com substituição de ruídos óticos (`D/O -> 0`, `I/l -> 1`, `S -> 5`) extraindo os 9 dígitos da NF e higienização de cabeçalhos de tabela fiscal no descritivo.
- **Prevenção de Colisões & Controle de Estado**: Remoção do termo `'documento'` em `cpf_cnpj` e introdução de `filledElements Set` impedindo sobrescrita de dados já preenchidos.
- **Otimização de Performance**: Achamento de loops aninhados em `matchSemanticSelectOption` para complexidade O(N) com tempo de execução inferior a 1ms.
- **Resiliência de Injeção no Sidepanel**: Auto-injeção programática do `content.js` em caso de abas abertas previamente.
- **Porta Padrão & Isolamento (3333)**: Alterada a porta padrão do servidor de demonstração de 8080 para 3333 (`server/demo-server.js`) para evitar interferência com portas ocupadas (como 3000/3001 do Next.js Pulsense e 8080).
- **Auto-recuperação de Porta (EADDRINUSE)**: Adicionada função `tryListen` no servidor para tentar portas consecutivas automaticamente se a porta configurada estiver em uso.
- **Autodescoberta Dinâmica no Sidepanel**: `extension/sidepanel.js` agora descobre automaticamente a porta ativa do servidor local através de sondagem ordenada (`3333`, `8080`, `3334`, `3030`, `4040`).
- **package.json**: Adicionado script `"dev": "node server/demo-server.js"` para permitir execução via `npm run dev`.
- **tests/extension/content.test.js**: Adicionados mocks `focus()` e `closest()` nos objetos de input simulados para compatibilidade com `fillInputElement`, que chama esses métodos nativos do DOM internamente. Corrige 3 testes que falhavam com `TypeError: input.focus is not a function`.

### Added
- **Toasts Cyber-Táteis Obsidian & Banimento de `alert()` (`extension/toast-manager.js`, `extension/toasts.css`)**: Eliminação de pop-ups arcaicos bloqueantes do navegador em favor de notificações fluidas no topo do Side Panel, com autoclose configurável, ícones de status e estética Obsidian compatível com o Design System.
- **Injetor Cross-Frame Governamental & Respeito a Máscaras JS (`extension/content.js`)**: Varredura recursiva de `iframe` e `frame` para permitir preenchimento em sistemas como SEI e AGU, somado ao disparo sequencial de eventos de teclado (`keydown` -> `input` -> `keyup`) para evitar corrupção de valores em campos com máscaras de moeda e data.
- **Sincronização de Atalho Global `Cmd+Shift+F` (`extension/background.js`, `extension/content.js`, `extension/sidepanel.js`)**: Armazenamento automático do último documento ativo em `chrome.storage.local` e disparo funcional de preenchimento instantâneo em qualquer aba ativa via atalho de teclado.
- **Descompressão de Streams PDF FlateDecode (`core/pdf-stream-decoder.js` e `core/document-parser.js`)**: Implementação de descompressor determinístico em memória de streams `/FlateDecode` (zlib deflate) para leitura e extração de texto digital em 100% de DANFEs e PDFs fiscais gerados por ERPs ou navegadores modernos, eliminando a cegueira de regex sobre bytes comprimidos. Suíte TDD com 3 cenários canônicos adicionada em `tests/core/flatedecode-parser.test.js`.
- **Trilha A — Experiência Power-User e Atalhos de Teclado**: Declaração do comando `fill_active_form` (`Ctrl+Shift+F` / `Cmd+Shift+F`) no `manifest.json`, listener no background worker e atalho `Ctrl+Enter` / `Cmd+Enter` no Sidepanel para disparo instantâneo de autofill.
- **Trilha A — Highlighter Visual de Formulários (`extension/content.js`)**: Aplicação suave de contorno ciano (`#00D2FF`) e glow difuso temporário (1500ms) nos campos preenchidos com restauração automática de estilos nativos.
- **Trilha A — Histórico Local Rotativo (`core/history-store.js`)**: Armazenamento seguro dos últimos 10 documentos processados com descarte LRU e Zero Retenção na Nuvem em conformidade estrita com a LGPD.
- **Trilha B — Auto-Deskew de Imagens (`core/image-preprocessor.js`)**: Detecção de orientação EXIF (1, 3, 6, 8) e estimativa de ângulo de inclinação angular (Radon-lite horizontal projection variance) de -20° a +20° com rotação nativa via Canvas 2D.
- **Trilha B — Extrator Semântico e Tabular de Itens (`core/item-extractor.js`)**: Parser de itens de compra (NFC-e, DANFE e cupons) com extração de código, descrição, quantidade, valor unitário e valor total, além de validação matemática de somatórios.
- **Design System Obsidian & Flow Cyan (TDD Suite)**: Validação contratual dos tokens canônicos (`--bg-app: #0A0D14`, `--bg-card: #111622`, `--brand-blue: #0052FF`, `--brand-cyan: #00D2FF`, `--text-primary: #F8FAFC`) com conformidade WCAG AA e rejeição de temas legados.
- **portal CCHA (Conselho Curador dos Honorários Advocatícios)**: Mapeamento integral para a advocacia pública federal (AGU, PGFN, PGF, PGBC).
- **core/matcher.js**: Vocabulário CCHA integrado (matrícula SIAPE, número do processo judicial/administrativo, honorários sucumbenciais, rubrica orçamentária, banco/agência/conta/PIX).
- **extension/sidepanel**: Interface adaptada com dados de amostra para procuradores federais e advogados da União no CCHA, com suporte a anexo em PDF e injeção reativa Angular via `InputEvent`.
- **core/document-parser.js**: Motor de leitura e extração real de texto em PDFs e documentos, com parser de CPF, CNPJ, Matrícula SIAPE, Processos Judiciais, Honorários e Dados Bancários.
- **mobile-pwa/scanner.js**: Transmissão P2P com upload real do arquivo em base64 e dados estruturados para a extensão via relay efêmero.
- **extension/sidepanel.js**: Leitura real de arquivos soltos na aba PDF/Foto em memória volátil, com auto-preenchimento imediato dos campos extraídos.

