// doc2fill - Background Service Worker (Manifest V3)

// 1. Configura o Side Panel para abrir automaticamente ao clicar no ícone da extensão
function configureSidePanelBehavior() {
  if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .then(() => console.log('[doc2fill] openPanelOnActionClick configurado com sucesso.'))
      .catch((err) => console.error('[doc2fill] Erro ao setar comportamento do side panel:', err));
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[doc2fill] Extensão instalada/atualizada.');
  configureSidePanelBehavior();
});

chrome.runtime.onStartup.addListener(() => {
  configureSidePanelBehavior();
});

// Executa na inicialização do service worker
configureSidePanelBehavior();

// 2. Listener de clique na ação da barra de ferramentas (Fallback Robusto)
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;

  // Tenta abrir o Side Panel oficial no contexto da aba ativa
  if (chrome.sidePanel && chrome.sidePanel.open) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
      return;
    } catch (err) {
      console.warn('[doc2fill] Tentativa de abrir sidePanel via API falhou ou restrita:', err);
    }
  }

  // Fallback 1: Envia mensagem para o content script abrir o widget/drawer flutuante na página
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { action: 'DOC2FILL_TOGGLE_DRAWER' });
    if (res && res.acknowledged) return;
  } catch (e) {
    // Página do sistema do navegador (chrome:// ou sem content script)
  }

  // Fallback 2: Abre a interface do doc2fill em uma nova aba dedicada
  chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
});

// 3. Comunicação bidirecional com Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DOC2FILL_OPEN_PANEL' && sender?.tab?.id) {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ tabId: sender.tab.id })
        .then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.warn('[doc2fill] Erro ao abrir side panel via mensagem:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
  }
});
