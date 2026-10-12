# 🛡️ Guia Oficial de Submissão, Justificativas & Privacidade — Chrome Web Store

> **Documento Oficial de Submissão e Conformidade Regulatória do Doc2Fill**  
> Elaborado sob as diretrizes de conformidade do **Google Chrome Web Store Review Guidelines**, **Manifest V3**, **Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)** e o princípio arquitetural inegociável de **Zero Retenção de Dados**.

---

## 📌 1. Visão Geral da Submissão

Ao cadastrar a extensão no [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole), o Google exige o preenchimento de campos textuais e declarações de privacidade detalhadas para qualquer extensão que utilize permissões sensíveis como `<all_urls>` e `scripting`.

Este guia fornece os textos exatos em **Inglês** (idioma padrão dos revisores globais do Google em Mountain View) e **Português**, formatados para cópia e colagem direta nos formulários oficiais.

---

## 🎯 2. Aba "Listing" / "Detalhes da Ficha da Loja"

### Nome do Item (Extension Name)
```text
doc2fill — Autofill Inteligente
```

### Resumo Curto (Short Description — Max 132 caracteres)
```text
Preenchimento automático e inteligente de notas fiscais e certidões em portais governamentais com Zero Retenção de Dados.
```

### Descrição Detalhada (Detailed Description)
```text
Doc2Fill é uma ferramenta profissional de automação e produtividade desenvolvida para advogados, contadores, peritos e servidores públicos que precisam preencher dados repetitivos em sistemas judiciais e fiscais (como CCHA, AGU, SEFAZ, Prefeituras e Tribunais).

🚀 PRINCIPAIS BENEFÍCIOS:
• Extração Inteligente: Reconhecimento instantâneo de dados de notas fiscais (DANFE, NFC-e, cupons) e certidões via PDF nativo ou foto escaneada.
• Captura Mobile via QR Code: Pareamento efêmero direto com o celular para fotos de comprovantes sem fio e sem login.
• Autofill com 1 Clique ou Atalho: Preenchimento automático dos formulários governamentais com realce visual inteligente.
• Histórico Local Seguro: Acesso rápido aos últimos comprovantes processados diretamente na memória do seu navegador.

🔒 PRIVACIDADE POR DESIGN & ZERO RETENÇÃO (LGPD):
• Zero Armazenamento em Nuvem: Nenhum dado de documento, chave de acesso, valor, CPF ou CNPJ é transmitido ou salvo em servidores remotos.
• Processamento Local-First: Todo o reconhecimento e preenchimento operam estritamente no dispositivo do usuário.
• Canal Efêmero P2P: O pareamento via QR Code utiliza memória volátil que se autodestrói após 5 minutos.
```

---

## ⚖️ 3. Aba "Privacy" / "Práticas de Privacidade" (O Ponto Crítico)

Nesta seção, o Google exige declarar o **Propósito Único (Single Purpose)** e a justificativa para cada permissão. A falta de clareza aqui é o motivo nº 1 de rejeição de extensões.

---

### A. Propósito Único (Single Purpose Description)

#### 🇺🇸 Versão em Inglês (Recomendada para o campo do Developer Dashboard)
> **Field:** *Explain the single purpose of your extension.*
```text
Doc2Fill provides smart, instant autofill for invoice, receipt, and tax certification data into legal, accounting, and government web forms with zero cloud data retention.
```

#### 🇧🇷 Versão em Português
```text
O Doc2Fill fornece preenchimento automático inteligente e instantâneo de dados de notas fiscais, recibos e certidões tributárias em formulários de portais jurídicos, contábeis e governamentais, com política estrita de zero retenção de dados em nuvem.
```

---

### B. Justificativa das Permissões (Permissions Justification)

#### 1. Permissão: `host_permissions: ["<all_urls>"]`

* **Pergunta do Google:** *Why does your extension require access to all websites/URLs?*

##### 🇺🇸 Resposta Oficial (Inglês):
```text
In Brazil, official tax, judicial, and government administrative procedures (such as CCHA/AGU, SEFAZ state tax authorities, municipal revenue portals, and federal judicial portals) are distributed across hundreds of distinct official and semi-official domain names (including .gov.br, .jus.br, and various municipal third-party ERP platforms).

Restricting host permissions to a static list of domains would break the core workflow for legal and accounting professionals who must fill invoices across disparate state and municipal portals. 

The content script operates strictly in passive listening mode and only interacts with form input elements upon explicit user trigger (clicking "Preencher Formulário" or pressing Command+Shift+F / Ctrl+Shift+F). In strict compliance with our Zero-Retention architecture, zero URL, browsing history, cookie, session token, or page DOM data is ever logged, retained, or transmitted outside the client browser.
```

##### 🇧🇷 Resposta Oficial (Português):
```text
No Brasil, os procedimentos tributários, judiciais e administrativos públicos (como CCHA/AGU, SEFAZ estaduais, prefeituras municipais e tribunais) estão distribuídos em centenas de domínios distintos (.gov.br, .jus.br e ERPs municipais terceirizados).

Restringir a permissão a uma lista estática inviabilizaria o fluxo de trabalho de advogados e contadores que precisam preencher certidões e comprovantes em portais municipais e estaduais diversos.

O script de conteúdo opera em modo estritamente passivo e só interage com os campos de formulário mediante acionamento explícito do usuário (clique no botão ou atalho de teclado). Sob nossa arquitetura de Zero Retenção, nenhum histórico de navegação, cookie ou dado da página é salvo ou transmitido.
```

---

#### 2. Permissão: `scripting`

* **Pergunta do Google:** *Why does your extension need the scripting permission?*

##### 🇺🇸 Resposta Oficial (Inglês):
```text
The "scripting" API is required solely to inspect input fields on the active tab and programmatically inject the user-extracted document data (e.g. CPF/CNPJ, access key, invoice amounts, issuance dates) into corresponding form inputs when the user explicitly triggers autofill via the side panel or keyboard shortcut. No scripts are executed without user initiation, and no external code is injected.
```

##### 🇧🇷 Resposta Oficial (Português):
```text
A API "scripting" é necessária unicamente para inspecionar os campos de entrada na aba ativa e preencher programaticamente os dados extraídos do documento (como CPF/CNPJ, chave de acesso, valor e datas) nos campos correspondentes quando o usuário aciona o preenchimento pelo painel lateral ou atalho. Nenhum código externo é baixado ou executado.
```

---

#### 3. Permissão: `activeTab`

* **Pergunta do Google:** *Why does your extension need the activeTab permission?*

##### 🇺🇸 Resposta Oficial (Inglês):
```text
The "activeTab" permission is used to grant temporary, scoped access to the currently focused tab only at the exact moment the user interacts with the extension action or side panel. This follows Google's principle of least privilege, ensuring the extension does not access background tabs or unselected pages.
```

##### 🇧🇷 Resposta Oficial (Português):
```text
A permissão "activeTab" é utilizada para garantir acesso temporário e com escopo limitado à aba em foco exclusivamente no momento em que o usuário interage com o painel lateral ou ícone da extensão, seguindo o princípio de menor privilégio.
```

---

#### 4. Permissão: `sidePanel`

* **Pergunta do Google:** *Why does your extension need the sidePanel permission?*

##### 🇺🇸 Resposta Oficial (Inglês):
```text
The "sidePanel" API provides the primary split-screen user interface where users view extracted invoice details side-by-side with the target web form, allowing seamless visual verification and editing without obscuring the form fields being filled.
```

##### 🇧🇷 Resposta Oficial (Português):
```text
A API "sidePanel" fornece a interface primária em tela dividida, permitindo que o usuário visualize os dados extraídos lado a lado com o formulário web de destino, facilitando a conferência visual sem cobrir a página do portal.
```

---

#### 5. Permissão: `storage`

* **Pergunta do Google:** *Why does your extension need the storage permission?*

##### 🇺🇸 Resposta Oficial (Inglês):
```text
The "storage" API is used locally on the device (chrome.storage.local) to store user preferences (such as keyboard shortcut toggles) and the rotating local cache of the last 10 processed receipts. This storage resides 100% on the user's machine and is never synchronized to cloud servers.
```

##### 🇧🇷 Resposta Oficial (Português):
```text
A API "storage" é usada exclusivamente de forma local no dispositivo (chrome.storage.local) para armazenar preferências do usuário e o histórico rotativo dos últimos 10 comprovantes na máquina do usuário, sem qualquer sincronização em nuvem.
```

---

## 📋 4. Questionário de Coleta de Dados do Usuário (Data Usage Tab)

Na aba **Data Usage**, você deve marcar as opções da seguinte forma:

| Categoria de Dado | Coletado? | Justificativa / Uso |
| :--- | :---: | :--- |
| **Personally Identifiable Information (PII)** | ❌ NÃO | O processamento de CPF/CNPJ ocorre exclusivamente em memória RAM local e no armazenamento do próprio navegador. Nenhum dado é enviado para servidores externos. |
| **Health Info / Financial Info** | ❌ NÃO | Valores de notas fiscais são processados localmente pelo parser do usuário para preenchimento de formulário. Zero transmissão externa. |
| **Authentication Info (Passwords/Credentials)** | ❌ NÃO | O Doc2Fill não captura senhas ou credenciais de acesso aos portais. |
| **Personal Communications** | ❌ NÃO | Nenhum conteúdo de e-mail ou mensagem é lido. |
| **Location / Web History / User Activity** | ❌ NÃO | Nenhuma telemetria de navegação é coletada. |

### Certificações Obrigatórias (Marcar todas como "SIM / CONCORDO"):
- [x] **"I confirm that I will not sell user data to third parties."**
- [x] **"I confirm that I will not use or transfer user data for purposes unrelated to the item's core single purpose."**
- [x] **"I confirm that I will not use or transfer user data to determine creditworthiness or for lending purposes."**

---

## 🌐 5. URL da Política de Privacidade (Obrigatória pela Google)

A Chrome Web Store exige um link HTTP(S) público para a Política de Privacidade.
Podemos utilizar a URL da documentação pública ou da página do produto (ex: `https://seu-usuario.github.io/doc2fill/privacy` ou na landing page comercial).

O texto resumido da política que deve constar no link público é:

> **Política de Privacidade do Doc2Fill:**  
> O Doc2Fill foi concebido sob o princípio de Privacidade por Padrão (Privacy by Design) e Conformidade Estrita com a LGPD (Lei 13.709/2018).  
> 1. Nenhum dado documental, fiscal ou pessoal é transmitido para servidores de terceiros ou nuvem proprietária.  
> 2. O processamento de OCR e extração estruturada ocorre 100% localmente no navegador e dispositivo do usuário.  
> 3. O pareamento por QR Code para captura mobile opera em canal efêmero volátil, com tempo de expiração automático (TTL) de 300 segundos, sem gravação em disco.  
> 4. O usuário possui total autonomia para limpar o histórico local a qualquer momento com 1 clique.
