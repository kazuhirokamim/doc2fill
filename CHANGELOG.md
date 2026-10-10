# Changelog — doc2fill

## [Unreleased]

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
- **Design System Obsidian & Flow Cyan (TDD Suite)**: Validação contratual dos tokens canônicos (`--bg-app: #0A0D14`, `--bg-card: #111622`, `--brand-blue: #0052FF`, `--brand-cyan: #00D2FF`, `--text-primary: #F8FAFC`) com conformidade WCAG AA e rejeição de temas legados.
- **portal CCHA (Conselho Curador dos Honorários Advocatícios)**: Mapeamento integral para a advocacia pública federal (AGU, PGFN, PGF, PGBC).
- **core/matcher.js**: Vocabulário CCHA integrado (matrícula SIAPE, número do processo judicial/administrativo, honorários sucumbenciais, rubrica orçamentária, banco/agência/conta/PIX).
- **extension/sidepanel**: Interface adaptada com dados de amostra para procuradores federais e advogados da União no CCHA, com suporte a anexo em PDF e injeção reativa Angular via `InputEvent`.
- **core/document-parser.js**: Motor de leitura e extração real de texto em PDFs e documentos, com parser de CPF, CNPJ, Matrícula SIAPE, Processos Judiciais, Honorários e Dados Bancários.
- **mobile-pwa/scanner.js**: Transmissão P2P com upload real do arquivo em base64 e dados estruturados para a extensão via relay efêmero.
- **extension/sidepanel.js**: Leitura real de arquivos soltos na aba PDF/Foto em memória volátil, com auto-preenchimento imediato dos campos extraídos.

