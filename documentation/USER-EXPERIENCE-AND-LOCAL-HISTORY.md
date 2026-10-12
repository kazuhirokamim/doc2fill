# ⚡ Documentação Técnica: Experiência Power-User, Atalhos de Teclado, Highlighter Visual e Histórico Local

## 1. Visão Geral
A **Trilha A** introduz otimizações ergonômicas profundas para o dia a dia operacional do usuário no **doc2fill**:
1. **Atalhos Globais e Navegação por Teclado:** Operação fluida sem necessidade de alternância constante para o mouse.
2. **Highlighter Visual Reativo:** Efeito de iluminação temporária nos campos preenchidos na página alvo (`#00D2FF`).
3. **Histórico Local Rotativo (IndexedDB / Local Storage):** Armazenamento seguro e volátil dos últimos 10 comprovantes processados com rotação LRU e Zero Retenção na Nuvem.

---

## 2. Atalhos de Teclado Suportados

| Atalho (Padrão) | Atalho (macOS) | Escopo | Ação Realizada |
| :--- | :--- | :--- | :--- |
| `Alt + Shift + D` | `Alt + Shift + D` | Global no Navegador | Abre e foca o Sidepanel oficial do doc2fill. |
| `Ctrl + Shift + F` | `Cmd + Shift + F` | Aba Ativa | Dispara o preenchimento automático diretamente na página hospedeira. |
| `Ctrl + Enter` | `Cmd + Enter` | Sidepanel | Aciona o botão de injeção automática no formulário. |
| `Escape` | `Escape` | Sidepanel | Fecha visualizações de zoom retrátil da imagem. |

---

## 3. Highlighter Visual (`extension/content.js`)
- Função: `highlightFilledElement(el, durationMs = 1500)`
- Aplica dinamicamente contorno ciano (`2px solid #00D2FF`) e brilho difuso (`box-shadow: 0 0 10px rgba(0, 210, 255, 0.45)`).
- Não polui o DOM com nós adicionais e restaura os estilos inline pré-existentes após exatamente 1500ms.
- Fornece certeza perceptual imediata sobre quais campos exatos foram populados.

---

## 4. Histórico Local Rotativo (`core/history-store.js`)
- Armazena metadados essenciais de até 10 documentos processados (`fornecedor`, `valor`, `data`, `tipo_documento`, `numero_documento`).
- **Política LRU Estrita:** Ao inserir o 11º documento, o registro mais antigo é expurgado automaticamente.
- **Privacidade e LGPD:** 100% dos dados permanecem confinados na máquina local do usuário via `chrome.storage.local` / `IndexedDB`, sem nenhum envio para servidores externos.
- **Controle do Usuário:** Função `clearHistory()` para limpeza instantânea de todos os registros.
