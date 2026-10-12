// site/showcase.js
// Controlador do Showcase Interativo no Hero da Landing Page (Doc2Fill)
// Simula visualmente o fluxo de captura, extração e injeção no portal CCHA em 6 segundos.

(function () {
  const SAMPLES = {
    cupom: {
      type: 'Cupom Fiscal Eletrônico (NFC-e)',
      cnpj: '61.585.865/0001-51',
      razao: 'RAIA DROGASIL S/A',
      num: '042918',
      data: '10/10/2026',
      valor: 'R$ 84,50',
      desc: 'Amoxicilina 500mg (2 cx) + Dipirona 1g',
      motivo: 'Tratamento com antibióticos conforme receita médica anexa.',
      rawText: `DROGA RAIA - RAIA DROGASIL S.A.
CNPJ: 61.585.865/0001-51  IE: 110.245.890.112
AV. PAULISTA, 1200 - BELA VISTA - SP
--------------------------------------------
EXTRATO Nº 042918 · CUPOM FISCAL ELETRONICO
EMISSAO: 10/10/2026 14:32:10
ITEM CODIGO DESCRICAO     QTD UN VL.UN VL.TOT
001  381920 AMOXICILINA   2   CX 29.90  59.80
002  091102 DIPIRONA 1G   1   CX 24.70  24.70
--------------------------------------------
SUBTOTAL:                            R$ 84,50
TOTAL A PAGAR:                       R$ 84,50
FORMA PAGTO: PIX                     R$ 84,50
--------------------------------------------
ZERO RETENCAO: DADOS PROCESSADOS LOCALMENTE`
    },
    danfe: {
      type: 'Nota Fiscal Eletrônica (DANFE)',
      cnpj: '43.202.472/0001-30',
      razao: 'HOSPITAL E MATERNIDADE SAO LUIZ S.A.',
      num: '129845',
      data: '08/10/2026',
      valor: 'R$ 450,00',
      desc: 'Consulta médica ambulatorial em cardiologia',
      motivo: 'Acompanhamento preventivo com especialista credenciado.',
      rawText: `HOSPITAL E MATERNIDADE SAO LUIZ S.A.
CNPJ: 43.202.472/0001-30  IE: 104.992.331.000
RUA DAS PEROBAS, 344 - JABAQUARA - SP
--------------------------------------------
DANFE SIMPLIFICADA - NOTA FISCAL ELETRONICA
Nº 000.129.845 - SERIE 1 · EMISSAO: 08/10/2026
CHAVE: 35261043202472000130550010001298451098765432
--------------------------------------------
SERVICO: CONSULTA MEDICA ESPECIALIZADA
MEDICO RESPONSAVEL: DR. EDUARDO SILVA (CRM 149200)
VALOR DOS SERVICOS:                 R$ 450,00
BASE CALCULO ISS:                   R$ 450,00
VALOR TOTAL DA NOTA:                R$ 450,00
--------------------------------------------
AUTENTICACAO MECANICA HOMOLOGADA NO CCHA`
    }
  };

  let activeDocKey = 'cupom';
  let isRunning = false;
  let timerInterval = null;

  function initShowcase() {
    const btnCupom = document.getElementById('btn-sample-cupom');
    const btnDanfe = document.getElementById('btn-sample-danfe');
    const btnPlay = document.getElementById('btn-play-showcase');
    const receiptPre = document.getElementById('showcase-receipt-content');

    if (!btnPlay || !receiptPre) return;

    function renderDoc(docKey) {
      activeDocKey = docKey;
      const data = SAMPLES[docKey];
      receiptPre.textContent = data.rawText;
      resetFields();

      if (btnCupom && btnDanfe) {
        btnCupom.classList.toggle('active', docKey === 'cupom');
        btnDanfe.classList.toggle('active', docKey === 'danfe');
      }
    }

    if (btnCupom) btnCupom.addEventListener('click', () => !isRunning && renderDoc('cupom'));
    if (btnDanfe) btnDanfe.addEventListener('click', () => !isRunning && renderDoc('danfe'));
    if (btnPlay) btnPlay.addEventListener('click', () => runSimulation());

    // Render inicial
    renderDoc('cupom');
  }

  function resetFields() {
    const fields = [
      'showcase-f-tipo',
      'showcase-f-cnpj',
      'showcase-f-razao',
      'showcase-f-num',
      'showcase-f-data',
      'showcase-f-valor',
      'showcase-f-desc',
      'showcase-f-motivo'
    ];

    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '—';
        el.classList.remove('injected');
      }
    });

    const laser = document.getElementById('showcase-laser');
    if (laser) laser.classList.remove('scanning');

    const badge = document.getElementById('showcase-badge-antiglosa');
    if (badge) badge.classList.remove('visible');

    const timer = document.getElementById('showcase-timer');
    if (timer) timer.textContent = '0.0s / 6.0s';

    const statusEl = document.getElementById('showcase-status-indicator');
    if (statusEl) {
      statusEl.className = 'showcase-status-indicator ready';
      statusEl.innerHTML = '<span>⚡ Pronto para simular</span>';
    }
  }

  function injectField(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.add('injected');
  }

  function runSimulation() {
    if (isRunning) return;
    isRunning = true;
    resetFields();

    const data = SAMPLES[activeDocKey];
    const btnPlay = document.getElementById('btn-play-showcase');
    const laser = document.getElementById('showcase-laser');
    const timer = document.getElementById('showcase-timer');
    const statusEl = document.getElementById('showcase-status-indicator');
    const badge = document.getElementById('showcase-badge-antiglosa');

    if (btnPlay) {
      btnPlay.disabled = true;
      btnPlay.textContent = '⏳ Executando...';
    }

    if (laser) laser.classList.add('scanning');

    if (statusEl) {
      statusEl.className = 'showcase-status-indicator ready';
      statusEl.innerHTML = '<span>🔍 Escaneando e extraindo dados locais...</span>';
    }

    const startTime = Date.now();
    const duration = 5800; // 5.8 segundos

    timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const sec = Math.min(5.8, (elapsed / 1000)).toFixed(1);
      if (timer) timer.textContent = `${sec}s / 6.0s`;

      if (elapsed >= 1800 && elapsed < 2500) {
        if (statusEl && !statusEl.textContent.includes('Preenchendo')) {
          statusEl.innerHTML = '<span>⚡ Injetando no formulário CCHA...</span>';
        }
      }

      if (elapsed >= 2000 && !document.getElementById('showcase-f-tipo').classList.contains('injected')) {
        injectField('showcase-f-tipo', data.type);
        injectField('showcase-f-cnpj', data.cnpj);
      }

      if (elapsed >= 2700 && !document.getElementById('showcase-f-razao').classList.contains('injected')) {
        injectField('showcase-f-razao', data.razao);
        injectField('showcase-f-num', data.num);
      }

      if (elapsed >= 3400 && !document.getElementById('showcase-f-data').classList.contains('injected')) {
        injectField('showcase-f-data', data.data);
        injectField('showcase-f-valor', data.valor);
      }

      if (elapsed >= 4200 && !document.getElementById('showcase-f-desc').classList.contains('injected')) {
        injectField('showcase-f-desc', data.desc);
        injectField('showcase-f-motivo', data.motivo);
      }

      if (elapsed >= 5000 && laser && laser.classList.contains('scanning')) {
        laser.classList.remove('scanning');
        if (statusEl) {
          statusEl.innerHTML = '<span>🛡️ Validando regras anti-glosa...</span>';
        }
      }

      if (elapsed >= duration) {
        clearInterval(timerInterval);
        if (timer) timer.textContent = '5.8s / 6.0s';
        if (badge) badge.classList.add('visible');
        if (statusEl) {
          statusEl.className = 'showcase-status-indicator done';
          statusEl.innerHTML = '<span>✓ 100% Preenchido sem erros em 5.8s</span>';
        }
        if (btnPlay) {
          btnPlay.disabled = false;
          btnPlay.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 4v6h6"></path><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            Repetir Simulação (6s)
          `;
        }
        isRunning = false;
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShowcase);
  } else {
    initShowcase();
  }
})();
