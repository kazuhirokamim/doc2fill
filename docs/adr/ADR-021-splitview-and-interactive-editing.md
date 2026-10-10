---
numero: 21
titulo: Split-View de Conferência Visual e Edição Manual Reativa no Sidepanel
data: 2026-10-09
status: Aceito
autores:
  - Kazuhiro
  - Tear Maestro
  - Noesis Bento Tactile Designer
aplica_a:
  - extension
  - tests
tags:
  - split-view
  - sidepanel-ui
  - manual-editing
  - zoom-pan
  - ergonomic-review
---

# ADR-021: Split-View de Conferência Visual e Edição Manual Reativa no Sidepanel

## Contexto
O processo de preenchimento fiscal automatizado pelo **doc2fill** exige que o operador valide visualmente a integridade dos dados extraídos antes do disparo da injeção no portal de destino (CCHA / AGU). Anteriormente, a interface exibia apenas um resumo textual simples do arquivo, obrigando o operador a alternar entre abas ou confiar cegamente no OCR para detectar números truncados ou CNPJs incorretos.

## Decisão
No contexto de aprimoramento da ergonomia do Sidepanel da Extensão Chrome, enfrentando a necessidade de proporcionar conferência visual sem quebrar o foco ou requerer abas externas, decidimos por incorporar um componente retrátil de Split-View com pré-visualização de imagem em memória efêmera, controles táteis de zoom (100%, 150%, 200%) e botões de ação rápida de restauração e limpeza de campos no formulário, para alcançar 100% de precisão antes do preenchimento no portal e conferir total soberania e agilidade ao operador, aceitando a complexidade de layout adaptativo na largura restrita do Sidepanel.

### Detalhes da Decisão
1. **Componente Visual de Split-View:**
   - Adição do container `#document-preview-container` no topo do formulário com visualizador de imagem `#preview-doc-image` e controles de escala.
2. **Controles Táteis de Zoom:**
   - Botões compactos de zoom com visual Obsidian (`1x`, `1.5x`, `2x`) e toggle para ocultar/expandir o visor do documento.
3. **Ações Rápidas de Edição (S2-T2):**
   - Botão **Restaurar**: Restaura os valores da última extração canônica automática.
   - Botão **Limpar**: Esvazia os 8 campos canônicos instantaneamente para digitação do zero.
4. **Leitura Reativa em Tempo Real:**
   - Ao clicar em "Preencher no CCHA", o Sidepanel extrai os valores atualizados diretamente dos inputs do DOM no instante do clique.

## Consequências

### Positivas
- Redução substancial de erros de digitação e glosas em formulários fiscais.
- Aumento da velocidade operacional de conferência sem mudança de contexto.
- Conformidade estrita com o limite de 700 linhas em `sidepanel.js` e `sidepanel.css`.

### Negativas
- Aumento sutil no consumo transitório de memória para renderizar a miniatura na DOM do Sidepanel.

### Neutras/Riscos Mitigados
- A miniatura opera exclusivamente com DataURL/Blob efêmero gerado via `FileReader` local, sem qualquer persistência ou telemetria em nuvem (Zero Retenção).
