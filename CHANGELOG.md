# Changelog — doc2fill

## [Unreleased]

### Fixed
- **Porta Padrão & Isolamento (3333)**: Alterada a porta padrão do servidor de demonstração de 8080 para 3333 (`server/demo-server.js`) para evitar interferência com portas ocupadas (como 3000/3001 do Next.js Pulsense e 8080).
- **Auto-recuperação de Porta (EADDRINUSE)**: Adicionada função `tryListen` no servidor para tentar portas consecutivas automaticamente se a porta configurada estiver em uso.
- **Autodescoberta Dinâmica no Sidepanel**: `extension/sidepanel.js` agora descobre automaticamente a porta ativa do servidor local através de sondagem ordenada (`3333`, `8080`, `3334`, `3030`, `4040`).
- **package.json**: Adicionado script `"dev": "node server/demo-server.js"` para permitir execução via `npm run dev`.
- **tests/extension/content.test.js**: Adicionados mocks `focus()` e `closest()` nos objetos de input simulados para compatibilidade com `fillInputElement`, que chama esses métodos nativos do DOM internamente. Corrige 3 testes que falhavam com `TypeError: input.focus is not a function`.

### Added
- **portal CCHA (Conselho Curador dos Honorários Advocatícios)**: Mapeamento integral para a advocacia pública federal (AGU, PGFN, PGF, PGBC).
- **core/matcher.js**: Vocabulário CCHA integrado (matrícula SIAPE, número do processo judicial/administrativo, honorários sucumbenciais, rubrica orçamentária, banco/agência/conta/PIX).
- **extension/sidepanel**: Interface adaptada com dados de amostra para procuradores federais e advogados da União no CCHA, com suporte a anexo em PDF e injeção reativa Angular via `InputEvent`.
- **core/document-parser.js**: Motor de leitura e extração real de texto em PDFs e documentos, com parser de CPF, CNPJ, Matrícula SIAPE, Processos Judiciais, Honorários e Dados Bancários.
- **mobile-pwa/scanner.js**: Transmissão P2P com upload real do arquivo em base64 e dados estruturados para a extensão via relay efêmero.
- **extension/sidepanel.js**: Leitura real de arquivos soltos na aba PDF/Foto em memória volátil, com auto-preenchimento imediato dos campos extraídos.

