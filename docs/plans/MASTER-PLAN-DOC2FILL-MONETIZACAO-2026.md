# 🚀 MASTER PLAN DOC2FILL — ROADMAP DE PRODUTO, MONETIZAÇÃO & LUCRO Q4/2026

**Documento Estratégico Executivo para Alinhamento e Validação (Kazuhiro & Lucas)**  
**Data de Emissão:** 29 de Setembro de 2026  
**Horizonte de Execução:** 13 Semanas (Outubro, Novembro e Dezembro de 2026)  
**Meta Suprema:** MVP comercialmente consolidado, estável e com **lucro líquido comprovado** até 31 de Dezembro de 2026.

---

## 1. Sumário Executivo & Diagnóstico do Negócio

O **doc2fill** nasceu para resolver uma das dores operacionais mais caras, repetitivas e propensas a erro do mercado jurídico e de saúde brasileiro: **a digitação manual de notas fiscais, cupons térmicos e recibos em portais governamentais e de classe, especificamente o CCHA (Conselho Curador dos Honorários Advocatícios - AGU/Procuradores) e sistemas de reembolso.**

### O Diagnóstico Atual
- **A Dor Real:** Um profissional autônomo, secretária ou escritório perde entre 10 e 15 minutos por documento fiscal para conferir, abrir, digitar dados cadastrais (CNPJ, Razão Social, Número da NF, Datas, Valores, Itens e Motivos da Necessidade) e anexar o PDF no portal. Lotes de 50 a 200 notas por mês consomem de **30 a 50 horas de trabalho manual**, com alto índice de glosa (rejeição) por inconsistências cadastrais ou erros de digitação.
- **A Solução doc2fill:** Preenchimento automático em **menos de 6 segundos**, diretamente no portal CCHA aberto no navegador, via extensão Chrome conectada ao smartphone por QR Code ou por arrasto direto de PDFs e fotos.
- **O Desafio Superado Hoje (29/Set):** O sistema agora processa PDFs escaneados e bobinas térmicas reais (ex: cupom fiscal da farmácia DROGA 10 / DROGARIA RIBEIRO LTDA, R$ 68,68) sem falhas, expurgando dados mockados sintéticos ("Dr. Lucas Silva") e garantindo a extração dos 8 campos vitais para o CCHA.

---

## 2. Proposta de Valor, Posicionamento & Ancoragem Matemática

Para garantir que o produto gere lucro rápido em dezembro, a estratégia comercial não pode depender de "preço baixo", mas sim de **ROI incontestável** (Retorno sobre o Investimento).

### Ancoragem Matemática de Venda
| Parâmetro | Processo Manual Tradicional | Com doc2fill Pro |
| :--- | :--- | :--- |
| **Tempo por Documento** | 12 minutos | 6 segundos (99% mais rápido) |
| **Tempo para 150 Notas/mês** | 30 horas/mês de estagiário/analista | ~15 minutos no total |
| **Custo Estimado** | R$ 1.800 a R$ 2.400/mês (salário + encargos) | **R$ 197,00/mês** (Plano Pro) |
| **Índice de Glosa / Erro** | 8% a 15% (digitação incorreta) | < 0.5% (OCR com validação matemática) |
| **Economia Líquida Mensal** | — | **+ R$ 1.600,00 a R$ 2.200,00/mês** |
| **Retorno do Investimento (ROI)** | — | **812% no primeiro mês** |

> **Slogan Comercial:** *"Da nota fiscal ao requerimento CCHA em 6 segundos. Sem glosa, sem redigitação, sem armazenar seus dados."*

---

## 3. Matriz de Planos, Quotas e Estrutura de Preços

O modelo de monetização é baseado em **Assinatura Recorrente Mensal (SaaS) com opção de Anuidade com Desconto no Pix** para gerar caixa inicial imediato.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      MATRIZ DE PLANOS DOC2FILL                            │
├───────────────┬───────────────────┬───────────────────┬───────────────────┤
│    PLANOS     │   INDIVIDUAL      │     PRO (FOCO)    │    ENTERPRISE     │
│               │    (Starter)      │   (Escritórios)   │   (Clínicas/BPO)  │
├───────────────┼───────────────────┼───────────────────┼───────────────────┤
│ Preço Mensal  │ R$ 89,00 / mês    │ R$ 197,00 / mês   │ R$ 497,00 / mês   │
│ Preço Anual   │ R$ 790,00 à vista │ R$ 1.890,00 à vista│ R$ 4.790,00 à vista│
│ (Desconto)    │ (~R$ 65,80/mês)   │ (~R$ 157,50/mês)  │ (~R$ 399,00/mês)  │
├───────────────┼───────────────────┼───────────────────┼───────────────────┤
│ Quota Mensal  │ 120 leituras/mês  │ 500 leituras/mês  │ 2.000 leituras/mês│
│ Usuários      │ 1 usuário         │ Até 3 acessos     │ Até 10 acessos    │
│ Sincronização │ Extensão Chrome   │ Extensão + PWA    │ Extensão + PWA    │
│ Mobile (QR)   │                   │ Mobile Prioritário│ Dedicado          │
│ Anti-Glosa    │ Básico            │ Avançado (CCHA)   │ Customizado       │
│ Suporte       │ E-mail (48h)      │ WhatsApp VIP (15m)│ Gerente Dedicado  │
└───────────────┴───────────────────┴───────────────────┴───────────────────┘
```

### O "Cavalo de Troia": Plano Degustação (Free Tier)
- **15 digitalizações gratuitas por mês** para qualquer usuário que instalar a extensão.
- Não exige cartão de crédito.
- O usuário experimenta a velocidade real no CCHA; ao atingir a 16ª nota, o sistema bloqueia e exibe modal de conversão instantânea com QR Code Pix para desbloqueio imediato do Plano Starter ou Pro.

---

## 4. Arquitetura de Acesso e Estratégia de Distribuição

Como levar o produto às mãos do cliente e cobrar até dezembro sem travas operacionais?

### 4.1. Desktop (Extensão do Google Chrome)
- **Fase 1 (Outubro - Closed Beta & Vendas Diretas):**
  - Empacotamento direto em arquivo `.zip` instalável em 2 cliques via Modo de Desenvolvedor ou instalador executável simples.
  - Permite comercializar para os primeiros 20 escritórios parceiros e contatos diretos **imediatamente**, sem esperar o tempo de revisão da Google.
- **Fase 2 (Novembro - Publicação na Chrome Web Store):**
  - Submissão da extensão oficial homologada sob Manifest V3.
  - Instalação oficial em 1 clique pela loja do Google, eliminando qualquer fricção de segurança.

### 4.2. Mobile: Por que PWA (Progressive Web App) até Dezembro?
- **Decisão Estratégica:** Em vez de construir um app nativo complexo (Swift/Kotlin) que demoraria semanas e ficaria preso na burocracia de análise da Apple App Store (além de perder **30% de taxa sobre as assinaturas** para a Apple), adotamos o **PWA Mobile de Alta Performance**.
- **Como funciona:**
  1. O usuário abre o sidepanel no computador.
  2. Aponta a câmera do celular para o QR Code gerado na hora.
  3. O navegador do smartphone abre o PWA com acesso direto à câmera em alta definição.
  4. Ao tirar a foto da nota, o processamento ocorre em memória efêmera e o preenchimento dispara no computador via WebSocket/Relay em menos de 1 segundo.
- **Vantagem Comercial:** 100% da receita de vendas via Pix e Cartão fica com a empresa, sem intermediários.

### 4.3. Sistema de Licenciamento & Quotas (Zero Retenção)
- Integração direta com **Asaas** (para liquidação instantânea via Pix) e **Stripe** (cartão de crédito recorrente).
- Após o pagamento, o cliente recebe sua Chave de Licença (ex: `D2F-PRO-8742-9910`) via WhatsApp e E-mail.
- O sidepanel exibe um indicador sutil e elegante: `Digitalizações: 42 / 500`.

---

## 5. Estrutura Visual & Identidade do Aplicativo (Doc2Fill Cyber-Tátil)

O produto atende advogados, procuradores, gestores hospitalares e contadores — um público que exige sobriedade, sofisticação e máxima sensação de segurança.

- **Estilo:** *Obsidian Cyber-Tátil* (Dark mode refinado, inspirado em Linear e Raycast).
- **Paleta de Cores:**
  - Base: Preto Ônix Profundo (`#090D14`) e Grafite Espacial (`#0F172A`).
  - Bordas e Divisões: Cinza Ardósia suave (`#1E293B`).
  - Destaque Ação / Velocidade: Âmbar Elétrico (`#F59E0B`).
  - Confiança Fiscal & Sucesso: Verde Esmeralda (`#10B981`).
- **Elementos de Confiança:**
  - Selo visual de conformidade: `Zero-Retention · LGPD Compliant`.
  - Badge no formulário: `⚖️ CCHA Validado` em verde esmeralda ao reconhecer o padrão da Lei 13.327/2016.
  - Microinterações: Feedback tátil suave no smartphone ao capturar a foto; pulso luminoso no desktop ao receber os dados.

---

## 6. Cronograma de Entregáveis Semanais (Outubro a Dezembro/2026)

Cronograma estruturado em **13 semanas** de trabalho objetivo e sincronizado entre os founders:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    CRONOGRAMA DE 13 SEMANAS - Q4/2026                     │
├─────────────┬─────────────────────────────────────────────────────────────┤
│ SEMANA      │ FOCO PRINCIPAL E ENTREGÁVEL OBJETIVO                        │
├─────────────┼─────────────────────────────────────────────────────────────┤
│ Semana 01   │ Estabilização Completa do OCR & Pipeline Real (Zero Mocks)  │
│ Semana 02   │ Licenciamento, Quotas e Checkout com Pix Automático         │
│ Semana 03   │ PWA Mobile com Câmera Nativa e Transmissão em < 500ms       │
│ Semana 04   │ Landing Page Comercial + Onboarding dos 5 Primeiros Clientes│
│ Semana 05   │ Submissão Chrome Web Store + Refinamento de Cupons Difíceis │
│ Semana 06   │ Campanha de Prospecção Ativa (Outreach Escritórios CCHA)    │
│ Semana 07   │ Módulo Anti-Glosa CCHA & Motor de Sugestão de Motivo Legal  │
│ Semana 08   │ Campanha de Lançamento Anual Black Friday (Injeção de Caixa)│
│ Semana 09   │ Tráfego Pago Hiper-Segmentado (Google Ads Alta Intenção)     │
│ Semana 10   │ Atendimento VIP, Redução de Churn & Lançamento Enterprise   │
│ Semana 11   │ Programa de Indicação Viral entre Advogados & Clínicas      │
│ Semana 12   │ Fechamento Contábil de 2026 & Consolidação do Lucro Líquido │
│ Semana 13   │ Auditoria de Escala, Segurança e Roadmap Estratégico 2027   │
└─────────────┴─────────────────────────────────────────────────────────────┘
```

### Detalhamento Semana a Semana

#### 📅 MÊS 1: OUTUBRO — ENGENHARIA, VALIDAÇÃO & PRIMEIRAS VENDAS

* **Semana 01 (30/Set a 05/Out): Estabilização Completa do OCR & Pipeline Real**
  - *Técnico:* Finalização do extrator de bobinas térmicas de farmácia/postos com papel amassado e ruído óptico. Suporte transparente a PDFs escaneados via conversor local.
  - *Entregável:* Teste cego com 25 comprovantes reais de fornecedores distintos passando com > 95% de precisão sem intervenção manual.
  - *Negócio:* Definição dos termos de uso, política de privacidade (Zero Retenção) e contrato de assinatura.

* **Semana 02 (06/Out a 12/Out): Sistema de Licenciamento, Quotas e Checkout Pix**
  - *Técnico:* Implementação do módulo de autenticação leve no backend (SQLite WAL local), validação de chave de licença e decrementador de quotas de digitalização.
  - *Entregável:* Gateway de pagamento (Asaas/Stripe) conectado. O usuário compra pelo site, recebe a chave por WhatsApp e ativa o sidepanel imediatamente.
  - *Negócio:* Abertura de conta jurídica para recebimento de Pix com emissão de nota fiscal de serviço automática.

* **Semana 03 (13/Out a 19/Out): PWA Mobile Aperfeiçoado (Câmera Nativa & P2P)**
  - *Técnico:* Otimização do scanner mobile no navegador do smartphone: auto-foco, recorte de margens, compressão inteligente no Canvas para envio leve (< 300KB) e conexão instantânea via WebSocket efêmero.
  - *Entregável:* Apontar a câmera do celular para a nota física e vê-la preenchida no CCHA no computador em menos de 500 milissegundos.
  - *Negócio:* Gravação de vídeo de demonstração sem cortes (30 segundos) mostrando a tela do celular e do computador lado a lado.

* **Semana 04 (20/Out a 26/Out): Landing Page Comercial & Primeiros 5 Clientes Pagantes**
  - *Técnico:* Publicação da Landing Page oficial do Doc2Fill com estética Obsidian Cyber-Tátil, calculadora de tempo economizado e botão de compra direta.
  - *Entregável:* 5 primeiros clientes pagantes conquistados (escritórios e conhecidos do nicho CCHA) gerando os primeiros **R$ 985,00 em MRR**.
  - *Meta Financeira:* Validação da taxa de conversão da página (> 3%).

---

#### 📅 MÊS 2: NOVEMBRO — TRAÇÃO, CHROME STORE & BLACK FRIDAY

* **Semana 05 (27/Out a 02/Nov): Submissão à Chrome Web Store & Distribuição Aberta**
  - *Técnico:* Empacotamento final e submissão da extensão à Chrome Web Store com ícones profissionais, screenshots da interface e vídeo explicativo.
  - *Entregável:* Aprovação da extensão na Google Store para permitir instalação com 1 clique diretamente da loja oficial.
  - *Negócio:* Kit de materiais de divulgação para WhatsApp e LinkedIn.

* **Semana 06 (03/Nov a 09/Nov): Campanha de Prospecção Ativa (Outreach Direcionado)**
  - *Comercial:* Abordagem direta (Cold Mail e mensagem no LinkedIn) de advogados públicos, procuradores e secretárias de clínicas que atuam com requerimentos CCHA.
  - *Entregável:* 15 novas assinaturas do Plano Pro fechadas.
  - *Meta Financeira:* Bater **R$ 3.940,00 em MRR recorrente**.

* **Semana 07 (10/Nov a 16/Nov): Módulo Anti-Glosa CCHA & Motor Legal**
  - *Técnico:* Motor de recomendação inteligente do "Descritivo Resumido" e "Motivo da Necessidade" perfeitamente alinhados aos artigos 29 a 36 da Lei Federal 13.327/2016 e deliberações do CCHA, garantindo 0% de glosas.
  - *Entregável:* Liberação do recurso exclusivo para assinantes Pro e Enterprise.

* **Semana 08 (17/Nov a 23/Nov): Oferta de Anuidade Black Friday (Geração de Caixa Imediato)**
  - *Comercial:* Lançamento da campanha "Black Friday Doc2Fill — Plano Pro Anual com 30% de Desconto à Vista no Pix (de R$ 2.364 por R$ 1.650/ano)".
  - *Entregável:* Fechamento de pelo menos 12 planos anuais pagos à vista.
  - *Meta Financeira:* **Entrada de R$ 19.800,00 de caixa líquido imediato** na conta da empresa.

* **Semana 09 (24/Nov a 30/Nov): Anúncios Segmentados de Alta Intenção**
  - *Marketing:* Campanhas no Google Ads para buscas como "sistema CCHA", "restituição honorários AGU", "lançamento de notas CCHA", "software para recibos médicos".
  - *Entregável:* Custo por Aquisição (CPA) inferior a R$ 60,00 por assinante pago.

---

#### 📅 MÊS 3: DEZEMBRO — CONSOLIDAÇÃO, EXPANSÃO & LUCRO LÍQUIDO

* **Semana 10 (01/Dez a 07/Dez): Lançamento do Plano Enterprise (Clínicas & BPO)**
  - *Comercial:* Venda do plano corporativo (R$ 497/mês) para clínicas e escritórios maiores com múltiplos usuários e volume massivo de notas.
  - *Entregável:* 3 contratos Enterprise assinados (**+ R$ 1.491,00/mês de MRR**).

* **Semana 11 (08/Dez a 14/Dez): Programa de Indicação Viral**
  - *Produto/Crescimento:* Ativação do programa de afiliados interno ("Indique um colega advogado/gestor: ele ganha 20% de desconto e você ganha 1 mês grátis").
  - *Entregável:* Atração de 15 novos clientes com custo de marketing zero.

* **Semana 12 (15/Dez a 21/Dez): Fechamento Contábil de 2026 & Apuração do Lucro Líquido**
  - *Financeiro:* Apuração de receitas recorrentes (MRR), receitas de planos anuais e custos de servidores.
  - *Meta Financeira Final de 2026:*
    - **MRR Recorrente Ativo:** Superior a **R$ 11.500,00/mês**.
    - **Caixa Líquido Acumulado em Dezembro:** Superior a **R$ 25.000,00**.
    - **Lucro Operacional Líquido:** **Positivo (> 85% de margem)**.

* **Semana 13 (22/Dez a 31/Dez): Estabilização, Férias de Fim de Ano & Roadmap 2027**
  - *Operacional:* Suporte sob regime de plantão estável (zero incidentes críticos).
  - *Estratégia 2027:* Planejamento de expansão para portais estaduais (PJe, SEI, e-CAC, TISS hospitalar).

---

## 7. Projeção Financeira e Metas de Caixa (Q4/2026)

| Indicador Financeiro | Outubro/2026 | Novembro/2026 | Dezembro/2026 | Total Consolidado Q4 |
| :--- | :--- | :--- | :--- | :--- |
| **Novos Assinantes Mensais** | 8 clientes | 22 clientes | 25 clientes | **55 clientes ativos** |
| **Assinantes Anuais (Black Friday)** | 0 | 12 clientes | 3 clientes | **15 planos anuais** |
| **Receita Mensal Recorrente (MRR)**| R$ 1.480,00 | R$ 5.814,00 | **R$ 11.725,00** | — |
| **Receita de Planos Anuais (Pix)**  | R$ 0,00 | R$ 19.800,00 | R$ 4.950,00 | **R$ 24.750,00** |
| **Faturamento Bruto do Mês**       | R$ 1.480,00 | R$ 25.614,00 | R$ 16.675,00 | **R$ 43.769,00** |
| **Custos Operacionais (Infra/Ads)**| R$ 380,00 | R$ 2.450,00 | R$ 2.100,00 | R$ 4.930,00 |
| **LUCRO LÍQUIDO DO MÊS**           | **+ R$ 1.100,00**| **+ R$ 23.164,00**| **+ R$ 14.575,00**| **+ R$ 38.839,00** |

---

## 8. Conclusão & Próximos Passos Imediatos com o Lucas

1. **Validação Executiva:** Revisar os valores dos planos e aprovar os entregáveis da Semana 1 e 2.
2. **Setup do Gateway de Pagamento:** Ativar conta Asaas para geração imediata de Pix com webhook automático.
3. **Distribuição do Closed Beta:** Disponibilizar o arquivo `.zip` da extensão sem aba demo para os primeiros 5 advogados parceiros testarem nesta semana.

*Plano formulado sob as diretrizes de engenharia de software e rigor de governança Tear / Noesis.*
