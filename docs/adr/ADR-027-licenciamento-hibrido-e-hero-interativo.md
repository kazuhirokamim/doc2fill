---
numero: 27
titulo: Licenciamento Hibrido Vinculado a Email e Showcase Interativo no Hero da Landing Page
data: 2026-10-12
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Frontend Maestro
  - Noesis Security Maestro
aplica_a:
  - core
  - site
  - extension
  - tests
tags:
  - licensing
  - cryptography
  - offline-validation
  - hero-showcase
  - interactive-demo
---

# ADR-027: Licenciamento Híbrido Vinculado a E-mail e Showcase Interativo no Hero

## Contexto
Após a consolidação da Landing Page e do Hub de Feedback (207 testes verdes), o Doc2Fill precisa definir seu mecanismo final de ativação e licenciamento, além de maximizar a conversão de novos usuários. Surgiu o questionamento sobre a conveniência de ativar a extensão apenas informando um e-mail versus o uso de chaves criptográficas. A análise técnica revelou que um sistema baseado apenas em e-mail sem verificação permitiria que um único e-mail fosse compartilhado com dezenas de usuários, destruindo a receita do produto; por outro lado, uma verificação online constante violaria a filosofia Local-First e tornaria a extensão inoperante em ambientes sem internet ou com instabilidade de rede. Além disso, a Landing Page necessita de um componente interativo no Hero para demonstrar visualmente o valor da economia de tempo antes do download.

## Decisão
No contexto de proteção de receita e facilitação da experiência de ativação para advogados e procuradores, enfrentando o dilema entre a fragilidade de pirataria de um modelo baseado apenas em e-mail e a fricção de chaves criptográficas genéricas, decidimos por implementar um modelo de Licenciamento Híbrido onde a chave de licença é gerada matematicamente amarrada ao e-mail do comprador via HMAC-SHA256 e validada 100% offline no client-side em `core/license-validator.js`, acompanhado por um modal de ativação no Sidepanel e um Showcase Interativo em tempo real no Hero da Landing Page demonstrando o preenchimento de 6 segundos em split-view, para alcançar máxima proteção contra compartilhamento indevido, autonomia operacional offline sem dependência de servidores externos e alta conversão visual de visitantes, aceitando que o usuário precisa informar tanto seu e-mail quanto o token gerado para validar a licença.

### Detalhes da Decisão
1. **Validador Criptográfico Local (`core/license-validator.js`):**
   - Formato da chave: `D2F-<PLANO>-<VALIDADE>-<SIGNATURE>` (onde a assinatura é derivada de `HMAC-SHA256(email + plano + validade)` com segredo mestre).
   - Suporte aos planos: `STARTER`, `PRO` e `BETA_VIP`.
   - Verificação 100% determinística no navegador sem requisições HTTP externas.
2. **Interface de Ativação no Sidepanel (`extension/sidepanel.html` e `extension/sidepanel.js`):**
   - Modal minimalista acessível pelo badge de licença permitindo inserir E-mail e Chave.
   - Armazenamento seguro no `chrome.storage.local`.
   - Atualização dinâmica do selo para `⭐ Pro Ativo` ou `● Beta Ativo (14 dias)`.
3. **Showcase Interativo no Hero da Landing Page (`site/index.html`):**
   - Demonstração com simulação em tempo real (varredura laser, extração dos 8 campos canônicos e realce Flow Cyan nos inputs em 6 segundos).
   - Seletor de comprovantes: Cupom de Farmácia vs Consulta Médica (DANFE).

## Consequências

### Positivas
- Impossibilidade de compartilhamento pirata de chave genérica entre usuários com e-mails diferentes.
- Funcionamento garantido mesmo sem acesso à internet (tribunais, aeroportos, viagens).
- Zero dependência de banco de dados de autenticação em nuvem para validar o uso diário da extensão.
- Alta taxa de conversão na Landing Page com demonstração ao vivo em 6 segundos.

### Negativas
- O usuário precisa guardar e digitar a chave alfanumérica junto com o e-mail no primeiro acesso.

### Neutras/Riscos Mitigados
- Na tela de checkout e na mensagem de onboarding, a chave é entregue com botão de cópia de 1 clique e instrução visual clara, mitigando qualquer fricção de digitação.
