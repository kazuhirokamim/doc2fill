# ⚡ doc2fill — Captura Inteligente & Autofill Governamental com Zero Retenção

[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-blue.svg?logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Security](https://img.shields.io/badge/Security-Zero_Retention_LGPD-green.svg)]()
[![Cryptography](https://img.shields.io/badge/Licensing-HMAC--SHA256_Offline-orange.svg)]()
[![Tests](https://img.shields.io/badge/Tests-210_Passed-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Status: Showcase](https://img.shields.io/badge/Status-Audited_&_Certified-orange.svg)]()

> **Elimine o trabalho braçal de digitação fiscal em portais públicos com privacidade absoluta.**  
> O `doc2fill` automatiza a captura, parsing inteligente (PDF, fotos térmicas, Chave SEFAZ 44 dígitos) e injeção em formulários complexos (AGU, SEI, SIAFI, CCHAR) sem salvar nenhum dado em banco de dados na nuvem.

---

## ⚡ Quickstart

```bash
# 1. Clonar o repositório
git clone https://github.com/kazuhirokamim/doc2fill.git
cd doc2fill

# 2. Instalar dependências
npm install

# 3. Rodar suíte completa de testes (210 testes verdes)
npm test

# 4. Iniciar servidor de demonstração local
npm start
```

Acesse o simulador CCHA e portal de testes em `http://localhost:3333/portal`.

---

## 🏛️ Arquitetura do Sistema

```mermaid
graph LR
    Doc["Documento Fiscal<br/>(PDF / Foto / SEFAZ)"] --> MobilePWA["Mobile Scanner PWA<br/>(Canvas Downscaling)"]
    Doc --> Upload["Upload Desktop Direto"]
    MobilePWA --> Relay["P2P Ephemeral Relay<br/>(Zero-Retention RAM)"]
    Upload --> Core["Motor de Parsing Multimodal<br/>(Layout-Aware + Anti-Glosa)"]
    Relay --> Core
    Core --> Extension["Extensão Side Panel MV3<br/>(HMAC Offline License)"]
    Extension --> PortalGov["Portais Governamentais<br/>(AGU, CCHAR, SEI)"]
```

---

## 🚀 Diferenciais de Engenharia

- **Zero Retenção de Dados (100% LGPD):** Nenhuma imagem, documento ou dado de contribuinte é salvo em banco de dados ou enviado para servidores terceiros. Ciclo de vida efêmero na RAM com expurgo automático em 5 minutos.
- **Side Panel Nativo Manifest V3:** Operação sob demanda sem injeção residual no DOM da página web governamental.
- **Motor Anti-Glosa & Decodificador SEFAZ:** Mapeamento automático de procedimentos médicos/fiscais e decodificação determinística de chaves de 44 dígitos.
- **Licenciamento Offline HMAC-SHA256:** Funciona perfeitamente em ambientes governamentais fechados (*air-gapped*) sem necessidade de conexão com nuvem para validar assinaturas.
- **Pipeline Óptico & Upscaling Adaptativo:** Ampliação automática em Canvas e estiramento de contraste para leitura de cupons de baixa resolução e PDFs escaneados com Zero Retenção.
- **Qualidade Rigorosa (Tear / Noesis):** 237 testes unitários e de integração verdes e 100% de precisão em documentos heterogêneos reais.

---

## 📁 Estrutura do Monorepo

```
doc2fill/
├── core/                           # Parsing multimodal, validações e motor anti-glosa
├── extension/                      # Extensão Manifest V3 com Side Panel nativo
├── mobile-pwa/                     # Scanner mobile com relay P2P e canvas downscaling
├── demo-portal/                    # Simulador de portal CCHA / AGU
├── documentation/                  # Laudo pericial, artigo IEEE/SBC e vitrine
├── docs/                           # ADRs (ADR-001 a ADR-027) e planos SDD
└── tests/                          # 210 testes automatizados
```

---

## 📜 Licença

Distribuído sob a licença **MIT**.
