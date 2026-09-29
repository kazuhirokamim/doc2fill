// doc2fill — Controlador Mobile PWA (Scanner da Câmera & Transmissão P2P para Extensão)
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('camera-input');
  const container = document.getElementById('preview-container');
  const img = document.getElementById('preview-img');
  const statusBadge = document.getElementById('status-badge');
  const btnTransmit = document.getElementById('btn-transmit');

  const sessionId = new URLSearchParams(window.location.search).get('session');

  const quickCopySection = document.getElementById('quick-copy-section');
  const quickCopyButtons = document.getElementById('quick-copy-buttons');

  let currentFilePayload = null;

  const defaultCchaData = {
    tipo_documento: 'Requerimento de Honorários',
    beneficiario: 'Advogado da União (AGU)',
    cnpj: '123.456.789-00',
    matricula: '1984521',
    processo: '0045821-44.2026.4.01.3400',
    razao: 'Dr. Lucas Silva — Advogado da União',
    valor: 'R$ 14.850,00',
    data: new Date().toISOString().split('T')[0],
    banco: 'Banco do Brasil (001)',
    agencia: '3380-4',
    conta: '45210-9',
    pix: 'lucas.silva@agu.gov.br',
    descricao: 'Honorários advocatícios sucumbenciais devidos perante o CCHA.',
    motivo: 'Art. 29 a 36 da Lei nº 13.327/2016 e Resoluções CCHA.'
  };

  function renderQuickCopyButtons(data) {
    if (!quickCopySection || !quickCopyButtons) return;
    quickCopyButtons.innerHTML = '';

    const fields = [
      { key: 'cnpj', label: 'Copiar CPF' },
      { key: 'processo', label: 'Copiar Processo' },
      { key: 'razao', label: 'Copiar Nome do Procurador' },
      { key: 'valor', label: 'Copiar Valor dos Honorários' },
      { key: 'descricao', label: 'Copiar Objeto / Histórico' }
    ];

    fields.forEach(f => {
      const val = data[f.key];
      if (!val) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = 'display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 14px; background:#F1F5F9; border:1px solid #CBD5E1; border-radius:10px; font-size:12.5px; color:#1E293B; cursor:pointer; font-weight:500; transition:all 0.15s;';
      btn.innerHTML = `<span>${f.label}</span><span style="font-size:11px; color:#64748B; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${val}</span>`;

      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(val);
          btn.style.background = '#DCFCE7';
          btn.style.borderColor = '#86EFAC';
          const original = btn.innerHTML;
          btn.innerHTML = `<span>✓ Copiado!</span><span style="font-size:11px; color:#166534;">Pronto para colar</span>`;
          setTimeout(() => {
            btn.innerHTML = original;
            btn.style.background = '#F1F5F9';
            btn.style.borderColor = '#CBD5E1';
          }, 1500);
        } catch (e) {
          console.warn('Falha ao copiar:', e);
        }
      });

      quickCopyButtons.appendChild(btn);
    });

    quickCopySection.style.display = 'block';
  }

  // Renderiza botões assistidos na inicialização com os dados padrão CCHA
  renderQuickCopyButtons(defaultCchaData);

  async function sendToExtension(customData, fileObj) {
    if (!sessionId) {
      if (statusBadge) {
        statusBadge.textContent = '⚠️ Abra este link pelo QR Code da extensão';
        statusBadge.style.background = '#FEF3C7';
        statusBadge.style.color = '#92400E';
      }
      return;
    }

    if (statusBadge) {
      statusBadge.textContent = '⏳ Transmitindo dados e arquivo para o computador...';
      statusBadge.style.background = '#E0F2FE';
      statusBadge.style.color = '#0369A1';
    }

    try {
      const dataPayload = customData || defaultCchaData;
      const payload = {
        session: sessionId,
        data: dataPayload,
        file: fileObj || currentFilePayload || null
      };

      const res = await fetch('/api/relay/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resJson = await res.json();
      if (resJson.success && statusBadge) {
        statusBadge.textContent = '✓ Transmitido para a extensão no computador com sucesso!';
        statusBadge.style.background = '#ECFDF5';
        statusBadge.style.color = '#065F46';
      }
    } catch (err) {
      console.error('Erro na transmissão:', err);
      if (statusBadge) {
        statusBadge.textContent = '❌ Erro ao conectar com o computador';
        statusBadge.style.background = '#FEE2E2';
        statusBadge.style.color = '#991B1B';
      }
    }
  }

  // Redimensionamento de imagens de alta resolução no HTML5 Canvas para preservar banda e acelerar OCR
  function calculateTargetDimensions(origWidth, origHeight, maxDimension = 1600) {
    if (!origWidth || !origHeight || (origWidth <= maxDimension && origHeight <= maxDimension)) {
      return { width: origWidth, height: origHeight };
    }
    if (origWidth > origHeight) {
      return {
        width: maxDimension,
        height: Math.round((origHeight * maxDimension) / origWidth)
      };
    } else {
      return {
        width: Math.round((origWidth * maxDimension) / origHeight),
        height: maxDimension
      };
    }
  }

  function resizeImageIfNeeded(file, maxDimension = 1600, quality = 0.85) {
    return new Promise((resolve) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ base64: e.target.result, size: file ? file.size : 0 });
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { width, height } = calculateTargetDimensions(img.width, img.height, maxDimension);
        if (width === img.width && height === img.height) {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ base64: e.target.result, size: file.size });
          reader.readAsDataURL(file);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', quality);
        const approxSize = Math.round((base64.length - 22) * 3 / 4);
        resolve({ base64, size: approxSize });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        const reader = new FileReader();
        reader.onload = (e) => resolve({ base64: e.target.result, size: file.size });
        reader.readAsDataURL(file);
      };
      img.src = url;
    });
  }

  if (input) {
    input.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        if (statusBadge) {
          statusBadge.textContent = '⏳ Otimizando foto e preparando análise...';
          statusBadge.style.background = '#FEF3C7';
          statusBadge.style.color = '#92400E';
        }

        const { base64, size } = await resizeImageIfNeeded(file);

        if (img) img.src = base64;
        if (container) container.style.display = 'block';

        currentFilePayload = {
          name: file.name,
          type: 'image/jpeg',
          size: size,
          base64: base64
        };

        if (statusBadge) {
          statusBadge.textContent = '⏳ Analisando foto com OCR e extraindo dados...';
          statusBadge.style.background = '#FEF3C7';
          statusBadge.style.color = '#92400E';
        }

        try {
          // Invoca o motor de OCR no servidor relay com a imagem otimizada
          const ocrRes = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: base64,
              name: file.name,
              session: sessionId
            })
          });

          const ocrJson = await ocrRes.json();
          if (ocrJson.success && ocrJson.data) {
            const extracted = { ...defaultCchaData, ...ocrJson.data };
            renderQuickCopyButtons(extracted);

            // TRANSMISSÃO P2P OBRIGATÓRIA PARA A EXTENSÃO NO COMPUTADOR
            await sendToExtension(extracted, currentFilePayload);

            if (statusBadge) {
              statusBadge.textContent = '✓ OCR concluído! Dados e foto transmitidos para o CCHA.';
              statusBadge.style.background = '#ECFDF5';
              statusBadge.style.color = '#065F46';
            }
            return;
          }
        } catch (ocrErr) {
          console.warn('[doc2fill mobile] Fallback de OCR:', ocrErr);
        }

        // Fallback se o OCR falhar
        const fallbackData = { ...defaultCchaData };
        if (file.name) {
          fallbackData.descricao = `Documento digitalizado: ${file.name}`;
        }
        await sendToExtension(fallbackData, currentFilePayload);
      }
    });
  }

  if (btnTransmit) {
    btnTransmit.addEventListener('click', () => {
      sendToExtension(defaultCchaData, currentFilePayload);
    });
  }
});
