# PLAN-001: Blueprint Técnico e Estratégia de Monetização do doc2fill

## 1. Visão Geral
* **Nome**: doc2fill
* **Missão**: Eliminar o preenchimento manual em formulários da AGU e órgãos públicos através de escaneamento mobile por QR Code e upload de PDFs no desktop.
* **Repositório**: `/Users/user/.gemini/antigravity/scratch/kazuhiro/doc2fill`
* **Atalho**: `~/Projetos/doc2fill`

## 2. Componentes da Solução
1. `extension/`: Chrome Extension Manifest V3 com Side Panel para prévia/edição e Content Script de injeção DOM.
2. `mobile-pwa/`: Web App responsivo com acesso à câmera (`getUserMedia`), cropping e envio P2P/relay.
3. `core/`: Utilitários de validação (dígitos verificadores de CPF/CNPJ, normalização de moeda BRL, regex de datas e códigos de barras/DARF).

## 3. Estratégia de Monetização (De 0 a 1)
* **Público**: Procuradores da Fazenda Nacional (AGU), Advogados Públicos e Contadores.
* **Modelo**: Assinatura SaaS Individual (B2C) ou Licença Anual (R$ 49/mês a R$ 99/mês).
* **Pitch de Vendas**: "Recupere 3 horas do seu mês com segurança Zero-Trust: preenchimento automático em 1 clique sem salvar nenhum dado sigiloso na nuvem."
