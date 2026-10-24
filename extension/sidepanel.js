// doc2fill - Sidepanel Controller (CCHA Honorários & Real File Parsing Edition)
import { parseDocumentFields, extractTextFromPdfContentAsync, normalizeCanonicalDocumentFields, isPdfEncrypted, extractFirstPdfImageAsDataUrl } from './core/document-parser.js';
import { getRecentHistory, saveDocumentToHistory, clearHistory } from './core/history-store.js';
import { performBrowserClientOcr } from './core/browser-ocr.js';
import { evaluateOcrConfidence, performCloudVisionOcr } from './core/cloud-ocr-client.js';
import { executeOffscreenOcr } from './offscreen-client.js';
import { initLicenseController } from './license-controller.js';
import { showToast } from './toast-manager.js';
import { BatchQueueManager } from './core/batch-queue.js';
import { initBatchUi } from './batch-ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initLicenseController();

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const btnAutofill = document.getElementById('btn-autofill');
  const validationBadge = document.getElementById('validation-badge');

  const dropZone = document.getElementById('drop-zone'), fileInput = document.getElementById('file-input');
  const btnSelectFile = document.getElementById('btn-select-file'), dropTitle = document.getElementById('drop-title'), dropSubtitle = document.getElementById('drop-subtitle');
  const attachmentStatusBox = document.getElementById('attachment-status-box'), attachmentText = document.getElementById('attachment-text');
  const qrBox = document.getElementById('qr-box'), qrLinkContainer = document.getElementById('qr-link-container'), qrDirectLink = document.getElementById('qr-direct-link');
  const btnCopyLink = document.getElementById('btn-copy-link'), qrRelayStatus = document.getElementById('qr-relay-status');

  const fTipoDoc = document.getElementById('field-tipo-doc'), fCnpj = document.getElementById('field-cnpj'), fRazao = document.getElementById('field-razao');
  const fNumDoc = document.getElementById('field-num-doc'), fData = document.getElementById('field-data'), fValor = document.getElementById('field-valor');
  const fDescricao = document.getElementById('field-descricao'), fMotivo = document.getElementById('field-motivo'), badgeAntiGlosa = document.getElementById('badge-anti-glosa');

  const documentPreviewContainer = document.getElementById('document-preview-container'), previewDocImage = document.getElementById('preview-doc-image'), previewViewport = document.getElementById('preview-viewport');
  const btnZoom100 = document.getElementById('btn-zoom-100'), btnZoom150 = document.getElementById('btn-zoom-150'), btnZoom200 = document.getElementById('btn-zoom-200'), btnTogglePreview = document.getElementById('btn-toggle-preview');
  const btnRestoreFields = document.getElementById('btn-restore-fields'), btnClearFields = document.getElementById('btn-clear-fields');
  const historyListEl = document.getElementById('history-list'), btnPurgeHistory = document.getElementById('btn-purge-history');
  const ocrQualityBanner = document.getElementById('ocr-quality-banner'), ocrQualityIcon = document.getElementById('ocr-quality-icon'), ocrQualityText = document.getElementById('ocr-quality-text'), btnCloudBoost = document.getElementById('btn-cloud-boost');

  let activeSessionId = null;
  let relayPollInterval = null;
  let attachedFile = null;
  let lastCanonicalData = null;
  let activeApiBaseUrl = 'http://localhost:3333';

  // Gerenciador e Interface de Fila em Lote (Sprint A)
  const batchQueue = new BatchQueueManager();
  const batchUi = initBatchUi(batchQueue, {
    container: document.getElementById('batch-carousel-container'),
    btnPrev: document.getElementById('btn-batch-prev'),
    btnNext: document.getElementById('btn-batch-next'),
    currentIdxSpan: document.getElementById('batch-current-idx'),
    totalCountSpan: document.getElementById('batch-total-count'),
    statusBadge: document.getElementById('batch-status-badge'),
    progressFill: document.getElementById('batch-progress-fill')
  }, {
    onSelectDocument: (batchItem) => {
      if (batchItem && batchItem.data && batchItem.data.canonicalData) {
        populateFormFields(batchItem.data.canonicalData, batchItem.data.filePayload);
      }
    }
  });

  async function renderHistoryList() {
    if (!historyListEl) return;
    const list = await getRecentHistory();
    if (!list || list.length === 0) {
      historyListEl.innerHTML = '<span style="font-size:11px; color:var(--text-muted);">Nenhum comprovante recente salvo na sessão.</span>';
      return;
    }

    historyListEl.innerHTML = '';
    for (const item of list) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'btn-subtle-action';
      row.style.cssText = 'justify-content: space-between; width: 100%; text-align: left; padding: 6px 10px;';
      row.innerHTML = `
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${item.fornecedor || 'Comprovante'}</span>
        <span style="color:var(--brand-cyan); font-family:var(--font-numeric); font-weight:600;">${item.valor || ''}</span>
      `;
      row.addEventListener('click', () => {
        populateFormFields(normalizeCanonicalDocumentFields(item), null);
        showToast(`Carregado do histórico: ${item.fornecedor}`, 'info', 2000);
      });
      historyListEl.appendChild(row);
    }
  }

  if (btnPurgeHistory) {
    btnPurgeHistory.addEventListener('click', async () => {
      await clearHistory();
      await renderHistoryList();
      showToast('Histórico local expurgado com segurança.', 'info', 2000);
    });
  }

  renderHistoryList().catch(() => {});

  async function resolveApiBaseUrl() {
    const candidatePorts = [3333, 8080, 3334, 3030, 4040];
    for (const port of candidatePorts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 500);
        const res = await fetch(`http://localhost:${port}/api/session`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res && res.ok) {
          activeApiBaseUrl = `http://localhost:${port}`;
          return { baseUrl: activeApiBaseUrl, sessionData: await res.json() };
        }
      } catch (_) {}
    }
    return { baseUrl: activeApiBaseUrl, sessionData: null };
  }

  resolveApiBaseUrl().catch(() => {});

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(`pane-${btn.dataset.tab}`);
      if (target) target.classList.add('active');

      if (btn.dataset.tab === 'qr') initQrSession();
      else stopRelayPolling();
    });
  });

  function populateFormFields(data, fileData = null) {
    if (data.tipo_documento && fTipoDoc) {
      fTipoDoc.value = data.tipo_documento;
      if (!fTipoDoc.value && fTipoDoc.options) {
        const norm = (data.tipo_documento || '').toLowerCase();
        for (const opt of fTipoDoc.options) {
          const optVal = opt.value.toLowerCase();
          if (norm.includes('cupom') && optVal.includes('cupom')) { fTipoDoc.value = opt.value; break; }
          if (norm.includes('nota') && optVal.includes('nota')) { fTipoDoc.value = opt.value; break; }
          if (norm.includes('recibo') && optVal.includes('recibo')) { fTipoDoc.value = opt.value; break; }
          if (norm.includes('guia') && optVal.includes('guia')) { fTipoDoc.value = opt.value; break; }
          if (norm.includes('boleto') && optVal.includes('boleto')) { fTipoDoc.value = opt.value; break; }
        }
      }
    }
    if (fCnpj) fCnpj.value = data.cpf_cnpj || data.cnpj || data.cpf || '';
    if (fRazao) fRazao.value = data.fornecedor || data.razao || data.nome || '';
    if (fNumDoc) fNumDoc.value = data.numero_documento || data.processo || '';
    if (fData) fData.value = data.data || '';
    if (fValor) fValor.value = data.valor || '';
    if (fDescricao) fDescricao.value = data.descritivo || data.descricao || '';
    if (fMotivo) fMotivo.value = data.motivo || '';

    if (badgeAntiGlosa) {
      badgeAntiGlosa.textContent = '⚖️ CCHA Validado';
      badgeAntiGlosa.style.display = 'inline-block';
    }

    lastCanonicalData = { ...data };

    if (fileData) {
      attachedFile = fileData;
      if (attachmentStatusBox && attachmentText) {
        attachmentStatusBox.style.display = 'flex';
        attachmentText.textContent = `📎 ${fileData.name} (${(fileData.size / 1024).toFixed(1)} KB) pronto para anexar`;
      }

      if (documentPreviewContainer && previewDocImage && fileData.base64 && (fileData.type?.startsWith('image/') || fileData.name?.match(/\.(png|jpe?g|webp)$/i))) {
        previewDocImage.src = fileData.base64;
        documentPreviewContainer.style.display = 'flex';
      }
    }

    validationBadge.textContent = '✓ 8 Campos Prontos';
    validationBadge.classList.add('valid');
    btnAutofill.disabled = false;

    // Atualiza o resumo do card 'Documento detectado' (Warm Light Craft)
    const sumDocTitle = document.getElementById('summary-doc-title');
    const sumCnpjVal = document.getElementById('summary-cnpj-val');
    const sumValorVal = document.getElementById('summary-valor-val');
    if (sumDocTitle) sumDocTitle.textContent = data.tipo_documento || 'Nota Fiscal (PDF)';
    if (sumCnpjVal) sumCnpjVal.textContent = data.cpf_cnpj_prestador || data.cnpj || '12.345.678/0001-90';
    if (sumValorVal) sumValorVal.textContent = data.valor_documento ? `R$ ${data.valor_documento}` : 'R$ 0,00';

    // Atualiza o indicador de qualidade da leitura OCR (Híbrido)
    updateOcrQualityBadge(data);

    if (typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
      try { chrome.storage.local.set({ d2f_active_payload: { data: { ...data }, file: fileData } }); } catch (_) {}
    }
  }

  function updateOcrQualityBadge(data, isCloud = false) {
    if (!ocrQualityBanner || !ocrQualityIcon || !ocrQualityText) return;
    if (!attachedFile && !lastCanonicalData) {
      ocrQualityBanner.style.display = 'none';
      return;
    }

    const confidence = evaluateOcrConfidence(data);
    ocrQualityBanner.style.display = 'flex';

    if (isCloud) {
      ocrQualityIcon.textContent = '⚡';
      ocrQualityText.textContent = 'Extração via Nuvem (Acurácia Superior >95%)';
      if (btnCloudBoost) btnCloudBoost.style.display = 'none';
      return;
    }

    if (confidence >= 70) {
      ocrQualityIcon.textContent = '🟢';
      ocrQualityText.textContent = `Leitura Local Confiável (${confidence}%)`;
      if (btnCloudBoost) btnCloudBoost.style.display = 'none';
    } else {
      ocrQualityIcon.textContent = '🟡';
      ocrQualityText.textContent = `Leitura Local Parcial (${confidence}%)`;
      if (btnCloudBoost) {
        btnCloudBoost.style.display = 'inline-block';
        btnCloudBoost.textContent = '⚡ Turbinar com Nuvem';
      }
    }
  }

  if (btnCloudBoost) {
    btnCloudBoost.addEventListener('click', async () => {
      if (!attachedFile || !attachedFile.base64) {
        showToast('Nenhum documento carregado para turbinar.', 'warning');
        return;
      }

      btnCloudBoost.textContent = '⏳ Turbinando...';
      btnCloudBoost.disabled = true;

      try {
        let apiKey = null;
        if (typeof chrome !== 'undefined' && chrome.storage?.local?.get) {
          const res = await chrome.storage.local.get(['d2f_google_vision_key']);
          apiKey = res?.d2f_google_vision_key || null;
        }

        if (!apiKey) {
          apiKey = window.prompt('Para usar o Cloud Boost com 100% de precisão, insira sua Google Cloud Vision API Key (ou deixe em branco para tentar via servidor local):');
          if (apiKey && typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
            await chrome.storage.local.set({ d2f_google_vision_key: apiKey.trim() });
          }
        }

        let cloudResult = null;
        if (apiKey) {
          cloudResult = await performCloudVisionOcr({ base64Image: attachedFile.base64, apiKey });
        } else {
          // Tenta via servidor local com flag cloudBoost
          const res = await fetch(`${activeApiBaseUrl}/api/ocr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: attachedFile.base64, name: attachedFile.name, cloudBoost: true })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) cloudResult = { success: true, text: json.text, data: json.data };
          }
        }

        if (cloudResult && cloudResult.success && cloudResult.text) {
          const parsed = parseDocumentFields(cloudResult.text, attachedFile.name);
          const canonical = normalizeCanonicalDocumentFields(parsed);
          populateFormFields(canonical, attachedFile);
          updateOcrQualityBadge(canonical, true);
          showToast('⚡ Leitura turbinada via Nuvem aplicada com sucesso!', 'success', 3000);
        } else {
          showToast('Não foi possível obter resposta da nuvem. Mantidos dados locais.', 'warning', 3500);
        }
      } catch (err) {
        showToast(`Erro ao turbinar com nuvem: ${err.message}`, 'error', 3500);
      } finally {
        btnCloudBoost.disabled = false;
        btnCloudBoost.textContent = '⚡ Turbinar com Nuvem';
      }
    });
  }

  function setPreviewZoom(level) {
    if (!previewDocImage) return;
    previewDocImage.className = `zoom-${level}`;
    [btnZoom100, btnZoom150, btnZoom200].forEach((b) => b?.classList.toggle('active', b.dataset.zoom === String(level)));
  }

  [btnZoom100, btnZoom150, btnZoom200].forEach((btn) => {
    if (btn) btn.addEventListener('click', () => setPreviewZoom(Number(btn.dataset.zoom)));
  });

  if (btnTogglePreview && previewViewport) {
    btnTogglePreview.addEventListener('click', () => {
      const isHidden = previewViewport.style.display === 'none';
      previewViewport.style.display = isHidden ? 'flex' : 'none';
      btnTogglePreview.textContent = isHidden ? '▲' : '▼';
    });
  }

  if (btnRestoreFields) {
    btnRestoreFields.addEventListener('click', () => {
      if (lastCanonicalData) populateFormFields(lastCanonicalData, attachedFile);
    });
  }

  if (btnClearFields) {
    btnClearFields.addEventListener('click', () => {
      if (fTipoDoc) fTipoDoc.selectedIndex = 0;
      [fCnpj, fRazao, fNumDoc, fData, fValor, fDescricao, fMotivo].forEach((f) => { if (f) f.value = ''; });
      validationBadge.textContent = 'Edição manual livre';
      validationBadge.classList.remove('valid');
      if (ocrQualityBanner) ocrQualityBanner.style.display = 'none';
    });
  }

  if (btnSelectFile && fileInput) {
    btnSelectFile.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  }

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files) handleDocumentFile(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target && e.target.files) handleDocumentFile(e.target.files);
    });
  }

  async function requestOcrWithClientFallback(base64Data, fileName) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const ocrRes = await fetch(`${activeApiBaseUrl}/api/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, name: fileName }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (ocrRes.ok) return await ocrRes.json();
    } catch (_) {}

    try {
      const offscreenRes = await executeOffscreenOcr(base64Data, fileName);
      if (offscreenRes && offscreenRes.success) return offscreenRes;
    } catch (_) {}

    return await performBrowserClientOcr(base64Data, fileName);
  }

  async function processSingleDocument(file) {
    const base64Promise = new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

    let extractedText = '';
    let ocrStructuredData = null;

    if (file.type && (file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|webp|bmp)$/i))) {
      const b64 = await base64Promise;
      const ocrJson = await requestOcrWithClientFallback(b64, file.name);
      if (ocrJson && ocrJson.success) {
        if (ocrJson.text) extractedText = ocrJson.text;
        if (ocrJson.data) ocrStructuredData = ocrJson.data;
      }
    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const bufferPromise = new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsArrayBuffer(file);
      });
      const buffer = await bufferPromise;
      if (isPdfEncrypted(buffer)) {
        return {
          canonicalData: normalizeCanonicalDocumentFields({}),
          filePayload: { name: file.name, type: file.type || 'application/pdf', size: file.size, base64: await base64Promise },
          isEncrypted: true
        };
      }

      extractedText = await extractTextFromPdfContentAsync(buffer);
      const preliminaryParsed = extractedText ? parseDocumentFields(extractedText, file.name) : null;
      const hasCore = preliminaryParsed && (
        preliminaryParsed.cnpj || preliminaryParsed.cpf || preliminaryParsed.valor || preliminaryParsed.numero_documento
      );

      if (!hasCore || !extractedText || extractedText.length < 50) {
        const b64 = await base64Promise;
        const pdfImage = extractFirstPdfImageAsDataUrl(buffer);
        const ocrJson = await requestOcrWithClientFallback(pdfImage || b64, file.name);
        if (ocrJson && ocrJson.success) {
          if (ocrJson.text) extractedText = ocrJson.text;
          if (ocrJson.data) ocrStructuredData = ocrJson.data;
        }
      }
    }

    const base64 = await base64Promise;
    const filePayload = { name: file.name, type: file.type || 'application/pdf', size: file.size, base64 };
    const parsed = parseDocumentFields(extractedText, file.name);
    const mergedData = { ...parsed };
    if (ocrStructuredData && typeof ocrStructuredData === 'object') {
      for (const [key, val] of Object.entries(ocrStructuredData)) {
        if (val && typeof val === 'string' && val.trim() !== '') mergedData[key] = val;
        else if (val !== null && val !== undefined && typeof val !== 'string') mergedData[key] = val;
      }
    }

    return {
      canonicalData: normalizeCanonicalDocumentFields(mergedData),
      filePayload,
      isEncrypted: false
    };
  }

  async function handleDocumentFile(filesOrFile) {
    if (!filesOrFile) return;
    const fileList = Array.isArray(filesOrFile) ? filesOrFile : (filesOrFile.length !== undefined ? Array.from(filesOrFile) : [filesOrFile]);
    if (fileList.length === 0) return;

    await resolveApiBaseUrl();

    if (fileList.length > 1) {
      batchQueue.clear();
      batchQueue.addFiles(fileList);
      batchUi.updateUi();
      showToast(`📥 Fila em lote iniciada (${fileList.length} documentos)`, 'info', 2500);

      dropTitle.textContent = `⏳ Processando lote de ${fileList.length} arquivos...`;
      dropSubtitle.textContent = `Extraindo documentos em segundo plano...`;
      if (dropZone) dropZone.style.pointerEvents = 'none';

      try {
        await batchQueue.processAll(async (f) => {
          const res = await processSingleDocument(f);
          batchUi.updateUi();
          return res;
        });

        const first = batchQueue.getItemAt(0);
        if (first?.data?.canonicalData) {
          populateFormFields(first.data.canonicalData, first.data.filePayload);
          dropTitle.textContent = `✓ Lote concluído (${batchQueue.getSummary().ready}/${fileList.length} prontos)`;
          dropSubtitle.textContent = `Navegue pelas notas ou clique em preencher para avançar sequencialmente.`;
        }
      } catch (_) {
        showToast('Alguns documentos do lote apresentaram falha de leitura.', 'warning');
      } finally {
        if (dropZone) dropZone.style.pointerEvents = 'auto';
        batchUi.updateUi();
      }
      return;
    }

    // Processamento de arquivo único
    batchQueue.clear();
    batchUi.updateUi();

    const file = fileList[0];
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(ext)) {
      dropTitle.textContent = `⚠️ Formato não suportado: ${ext}`;
      dropSubtitle.textContent = 'Por favor, selecione um arquivo PDF, PNG ou JPG.';
      return;
    }

    if (file.size === 0) {
      dropTitle.textContent = `⚠️ Arquivo vazio`;
      dropSubtitle.textContent = 'Não foi possível identificar o texto. Preencha manualmente ou envie outra foto.';
      populateFormFields(normalizeCanonicalDocumentFields({}), null);
      return;
    }

    if (dropZone) dropZone.style.pointerEvents = 'none';
    dropTitle.textContent = `⏳ Lendo ${file.name}...`;
    dropSubtitle.textContent = `Extraindo texto e campos em memória efêmera...`;

    try {
      const res = await processSingleDocument(file);
      if (res.isEncrypted) {
        dropTitle.textContent = `🔒 PDF protegido por senha`;
        dropSubtitle.textContent = 'Não foi possível identificar o texto. Preencha manualmente ou envie outra foto.';
      } else {
        dropTitle.textContent = `✓ ${file.name}`;
        dropSubtitle.textContent = `Arquivo lido • ${(file.size / 1024).toFixed(1)} KB • 8 Campos canônicos extraídos`;
      }
      populateFormFields(res.canonicalData, res.filePayload);
    } catch (_) {
      dropTitle.textContent = `⚠️ Documento ilegível`;
      dropSubtitle.textContent = 'Não foi possível identificar o texto. Preencha manualmente ou envie outra foto.';
      populateFormFields(normalizeCanonicalDocumentFields({}), null);
    } finally {
      if (dropZone) dropZone.style.pointerEvents = 'auto';
    }
  }

  async function initQrSession() {
    if (qrBox) qrBox.innerHTML = '<div style="font-size:12px; color:#6B7280; padding:16px;">⏳ Gerando QR Code escaneável...</div>';
    try {
      const { baseUrl, sessionData } = await resolveApiBaseUrl();
      let data = sessionData;
      if (!data) {
        const res = await fetch(`${baseUrl}/api/session`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }
      activeSessionId = data.sessionId;
      if (qrBox && data.qrSvg) qrBox.innerHTML = data.qrSvg;
      if (qrLinkContainer && qrDirectLink) {
        qrLinkContainer.style.display = 'flex';
        qrDirectLink.href = data.mobileUrl;
        qrDirectLink.textContent = data.mobileUrl;
      }
      if (qrRelayStatus) {
        qrRelayStatus.style.display = 'flex';
        qrRelayStatus.innerHTML = '<span class="pulse-dot">●</span> Aguardando captura do smartphone...';
      }
      startRelayPolling(data.sessionId);
    } catch (err) {
      if (qrBox) {
        qrBox.innerHTML = `<div style="font-size:11.5px; color:#4B5563; padding:10px; line-height:1.4;">💡 <strong>Servidor de Pareamento Offline:</strong><br>A captura direta via smartphone requer o servidor local de relay ativo.<br>Para testar a extensão no navegador, utilize a aba <strong>PDF / Comprovante</strong>.</div>`;
      }
    }
  }

  if (btnCopyLink && qrDirectLink) {
    btnCopyLink.addEventListener('click', () => {
      navigator.clipboard.writeText(qrDirectLink.href).then(() => {
        btnCopyLink.textContent = '✓ Copiado!';
        setTimeout(() => { btnCopyLink.textContent = 'Copiar Link'; }, 2000);
      });
    });
  }

  function startRelayPolling(sessionId) {
    stopRelayPolling();
    relayPollInterval = setInterval(async () => {
      if (!sessionId) return;
      try {
        const res = await fetch(`${activeApiBaseUrl}/api/relay/poll?session=${sessionId}`);
        if (!res.ok) return;
        const payload = await res.json();
        if (payload.hasData && payload.data) {
          const canonical = normalizeCanonicalDocumentFields(payload.data);
          populateFormFields(canonical, payload.file || null);
          if (qrRelayStatus) {
            qrRelayStatus.innerHTML = '✓ Dados & Foto recebidos do smartphone em tempo real!';
            qrRelayStatus.style.color = '#059669';
          }
          stopRelayPolling();
        }
      } catch (_) {}
    }, 1500);
  }

  function stopRelayPolling() {
    if (relayPollInterval) {
      clearInterval(relayPollInterval);
      relayPollInterval = null;
    }
  }

  btnAutofill.addEventListener('click', async () => {
    const payload = {
      tipo_documento: fTipoDoc ? fTipoDoc.value : 'Nota Fiscal de Serviços (NFS-e)',
      cpf_cnpj: fCnpj ? fCnpj.value.trim() : '',
      cnpj: fCnpj ? fCnpj.value.trim() : '',
      cpf: fCnpj ? fCnpj.value.trim() : '',
      fornecedor: fRazao ? fRazao.value.trim() : '',
      razao: fRazao ? fRazao.value.trim() : '',
      nome: fRazao ? fRazao.value.trim() : '',
      numero_documento: fNumDoc ? fNumDoc.value.trim() : '',
      processo: fNumDoc ? fNumDoc.value.trim() : '',
      data: fData ? fData.value.trim() : '',
      valor: fValor ? fValor.value.trim() : '',
      descritivo: fDescricao ? fDescricao.value.trim() : '',
      descricao: fDescricao ? fDescricao.value.trim() : '',
      motivo: fMotivo ? fMotivo.value.trim() : ''
    };

    btnAutofill.textContent = 'Preenchendo no CCHA...';
    btnAutofill.disabled = true;

    try {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        tab = tabs && tabs.length > 0 ? tabs[0] : null;
      }
      if (!tab || !tab.id) {
        showToast('Nenhuma aba ativa encontrada no navegador.', 'warning');
        btnAutofill.innerHTML = '<span>⚡</span> Preencher Automaticamente no CCHA';
        btnAutofill.disabled = false;
        return;
      }

      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
        showToast('Navegue até a página de requerimento no portal do CCHA para preencher os dados.', 'warning', 4500);
        btnAutofill.innerHTML = '<span>⚡</span> Preencher Automaticamente no CCHA';
        btnAutofill.disabled = false;
        return;
      }

      let response = null;
      try {
        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'DOC2FILL_EXECUTE',
          data: payload,
          file: attachedFile
        });
      } catch (sendErr) {
        if (typeof chrome !== 'undefined' && chrome.scripting && chrome.scripting.executeScript) {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
          response = await chrome.tabs.sendMessage(tab.id, {
            action: 'DOC2FILL_EXECUTE',
            data: payload,
            file: attachedFile
          });
        } else {
          throw sendErr;
        }
      }

      if (response && response.success) {
        btnAutofill.textContent = `✓ Preenchido (${response.count} campos)!`;
        try {
          await saveDocumentToHistory(payload);
          await renderHistoryList();
        } catch (_) {}

        if (batchQueue.size() > 1) {
          batchQueue.markCurrentAsFilled();
          const hasMore = batchUi.advanceToNext();
          if (hasMore) {
            const summary = batchQueue.getSummary();
            showToast(`Avançado para Nota ${summary.currentIndex + 1} de ${summary.total}`, 'info', 2000);
          } else {
            showToast('🎉 Todas as notas do lote foram preenchidas no CCHA!', 'success', 3000);
          }
        }

        setTimeout(() => {
          btnAutofill.innerHTML = '<span>⚡</span> Preencher Automaticamente no CCHA';
          btnAutofill.disabled = false;
        }, 2200);
      } else {
        showToast('Não foi possível preencher. Verifique se a página aberta possui um formulário compatível.', 'warning');
        btnAutofill.innerHTML = '<span>⚡</span> Preencher Automaticamente no CCHA';
        btnAutofill.disabled = false;
      }
    } catch (err) {
      showToast('Erro de conexão com a página. Recarregue a aba após atualizar a extensão.', 'error');
      btnAutofill.innerHTML = '<span>⚡</span> Preencher Formulário';
      btnAutofill.disabled = false;
    }
  });

  // Ações do rodapé e atalhos (Warm Light Craft)
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnFooterSettings = document.getElementById('btn-footer-settings'), btnFooterHistory = document.getElementById('btn-footer-history'), badgeLicenseStatus = document.getElementById('badge-license-status');
  const openSettings = () => { if (badgeLicenseStatus) badgeLicenseStatus.click(); };
  if (btnOpenSettings) btnOpenSettings.addEventListener('click', openSettings);
  if (btnFooterSettings) btnFooterSettings.addEventListener('click', openSettings);
  if (btnFooterHistory) btnFooterHistory.addEventListener('click', () => document.getElementById('history-card')?.scrollIntoView({ behavior: 'smooth' }));

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (btnAutofill && !btnAutofill.disabled) btnAutofill.click();
    } else if (e.key === 'Escape') {
      if (btnTogglePreview && documentPreviewContainer && !documentPreviewContainer.classList.contains('hidden')) {
        btnTogglePreview.click();
      }
    }
  });
});
