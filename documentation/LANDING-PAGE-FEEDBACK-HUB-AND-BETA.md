# 🌐 Landing Page Oficial, Hub de Feedback dos Beta Testers & Pacote Beta

> **Documento Oficial de Engenharia e Interface Web do Doc2Fill**  
> Alinhado ao **PLAN-019**, **ADR-026**, aos princípios de **Zero Retenção de Dados (LGPD)** e à identidade visual oficial **Obsidian & Flow Cyan**.

---

## 📌 1. Visão Geral da Arquitetura Web

Com a conclusão do núcleo de extração e aprimoramento de experiência do usuário, o Doc2Fill ganhou sua **Landing Page Oficial de Apresentação** e seu **Hub de Avaliações Interativo**, estruturados diretamente no servidor local (`server/demo-server.js`):

```
                                  MAPA DE ROTAS HTTP (DOC2FILL)
  ┌───────────────────────────────┬───────────────────────────────┬────────────────────────────────┐
  │ Rota HTTP                     │ Destino Físico                │ Função no Ecossistema          │
  ├───────────────────────────────┼───────────────────────────────┼────────────────────────────────┤
  │ GET /                         │ site/index.html               │ Landing Page Institucional     │
  │ GET /portal                   │ demo-portal/index.html        │ Simulador CCHA / AGU           │
  │ GET /mobile                   │ mobile-pwa/index.html         │ Scanner Mobile PWA             │
  │ GET /checkout                 │ demo-portal/checkout.html     │ Checkout Pix com SSE           │
  │ POST /api/feedback            │ server/demo-server.js         │ Submissão de Avaliação Beta    │
  │ GET /api/feedback             │ data/feedbacks.json           │ Mural de Avaliações em Tempo R.│
  │ GET /download/doc2fill-beta.zip│ dist/doc2fill-beta.zip       │ Download do Pacote Beta (.zip) │
  └───────────────────────────────┴───────────────────────────────┴────────────────────────────────┘
```

---

## 🎨 2. A Landing Page Oficial (`site/index.html`)

A página institucional foi concebida sob o padrão visual **Cyber-Tátil (Dark Luxury)**:
- **Cores Oficiais:** Obsidian (`#0A0D14` / `#111622`), Flow Cyan (`#00D2FF`) e Azul Elétrico (`#0052FF`).
- **Logotipo Oficial Integrado:** Símbolo vetorial minimalista com o documento azul e o checkmark ciano no canto inferior direito.
- **Seção Hero com Ancoragem:** *"Do Comprovante ao Portal CCHA em 6 Segundos"*.
- **Comparativo Dinâmico:** Quadro "Antes (15 min/nota com risco de glosa)" vs "Depois (6 seg com Doc2Fill Pro)".
- **Como Funciona em 3 Passos:** Demonstração visual do fluxo: Arraste/Foto -> Extração Canônica -> Preenchimento Reativo em 1 clique.
- **Transparência de Segurança e LGPD:** Selo de Zero Retenção na Nuvem (dados processados 100% na máquina local).

---

## 💬 3. O Hub de Avaliações e Feedback dos Beta Testers

Para capturar percepções e relatos de bugs dos primeiros 50 usuários pioneiros, o sistema conta com uma API dedicada e um componente visual interativo:

### 3.1. Contrato da API (`/api/feedback`)
- **Método `POST /api/feedback`:**
  - **Payload:**
    ```json
    {
      "rating": 5,
      "category": "elogio",
      "author": "Dr. Marcelo (Procurador)",
      "comment": "Preenchi um lote de 18 notas em 5 minutos no CCHA. Sensacional!"
    }
    ```
  - **Validações:** Rating obrigatório entre 1 e 5; comentário não-vazio; categorização (`elogio`, `sugestao`, `critica`, `erro`).
  - **Resposta:** `201 Created` com objeto contendo `id`, `timestamp` e dados normalizados.
- **Método `GET /api/feedback`:**
  - Retorna a lista dos últimos 50 feedbacks gravados em `data/feedbacks.json`.

---

## 💰 4. Matriz de Planos Harmonizada

A grade comercial apresentada na Landing Page e no Checkout Pix foi alinhada ao Master Plan do produto:

| Plano | Preço Mensal | Preço Anual | Quota Mensal | Destaque |
| :--- | :---: | :---: | :---: | :--- |
| **Starter** | R$ 89,00 / mês | R$ 790,00 à vista | 120 leituras | Autônomos e advogados individuais |
| **Pro (Fundador)** | R$ 197,00 / mês | R$ 1.890,00 à vista | 500 leituras | Escritórios, Procuradores CCHA e Suporte VIP |
| **Beta Teste VIP** | **R$ 0,00 (Grátis)** | 14 dias de teste | Ilimitado | Primeiros 50 usuários cadastrados |

---

## 📦 5. Script de Empacotamento Beta (`scripts/package-beta.js`)

Para disponibilizar a extensão de forma determinística e limpa:
- Comando de geração: `node scripts/package-beta.js`.
- O script sincroniza o núcleo (`core/ -> extension/core/`), expurga arquivos temporários (`.DS_Store`, `__pycache__`) e gera:
  - `dist/doc2fill-v0.3.0-beta.zip` (~71.8 KB).
  - Alias `dist/doc2fill-beta.zip` para download direto pela Landing Page.

---

## 🧪 6. Isolamento de Testes e Limpeza de Estado (TDD)
- A suíte `tests/server/feedback-api.test.js` realiza backup do arquivo `data/feedbacks.json` no hook `before()` e restauração estrita no hook `after()`.
- Isso garante que execuções de testes automatizados não alterem o working tree do git nem causem invalidação por staleness nos portões de release.

