// extension/batch-ui.js
// Controlador da Interface do Modo Fila em Lote (Carrossel de Navegação de Múltiplos Documentos)

export function initBatchUi(queue, elements, callbacks = {}) {
  const {
    container,
    btnPrev,
    btnNext,
    currentIdxSpan,
    totalCountSpan,
    statusBadge,
    progressFill
  } = elements;

  function updateUi() {
    if (!container) return;
    const summary = queue.getSummary();

    if (summary.total <= 1) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');

    if (currentIdxSpan) currentIdxSpan.textContent = String(summary.currentIndex + 1);
    if (totalCountSpan) totalCountSpan.textContent = String(summary.total);

    const currentItem = queue.getCurrentItem();
    if (statusBadge && currentItem) {
      statusBadge.className = 'badge-status';
      switch (currentItem.status) {
        case 'ready':
          statusBadge.textContent = '🟢 Pronto';
          statusBadge.style.color = '#00D2FF';
          break;
        case 'filled':
          statusBadge.textContent = '✓ Preenchido';
          statusBadge.style.color = '#10B981';
          break;
        case 'processing':
          statusBadge.textContent = '⏳ Processando';
          statusBadge.style.color = '#F59E0B';
          break;
        case 'error':
          statusBadge.textContent = '🔴 Erro';
          statusBadge.style.color = '#EF4444';
          break;
        default:
          statusBadge.textContent = '⚪ Pendente';
          statusBadge.style.color = 'var(--text-secondary)';
      }
    }

    if (progressFill) {
      const pct = Math.round(((summary.currentIndex + 1) / summary.total) * 100);
      progressFill.style.width = `${pct}%`;
    }

    if (btnPrev) btnPrev.disabled = summary.currentIndex <= 0;
    if (btnNext) btnNext.disabled = summary.currentIndex >= summary.total - 1;
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      const prevItem = queue.prev();
      if (prevItem && callbacks.onSelectDocument) {
        callbacks.onSelectDocument(prevItem);
      }
      updateUi();
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const nextItem = queue.next();
      if (nextItem && callbacks.onSelectDocument) {
        callbacks.onSelectDocument(nextItem);
      }
      updateUi();
    });
  }

  return {
    updateUi,
    advanceToNext: () => {
      const nextItem = queue.next();
      if (nextItem && callbacks.onSelectDocument) {
        callbacks.onSelectDocument(nextItem);
      }
      updateUi();
      return Boolean(nextItem);
    }
  };
}
