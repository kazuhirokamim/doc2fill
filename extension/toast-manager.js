// extension/toast-manager.js - Gerenciador de Toasts Cyber-Táteis Obsidian (Zero window.alert)

/**
 * Exibe notificação suave do tipo Toast no topo do Side Panel
 * @param {string} message Mensagem a ser exibida
 * @param {'info'|'success'|'warning'|'error'} [type='info'] Categoria visual
 * @param {number} [durationMs=3200] Tempo de exibição em milissegundos
 */
export function showToast(message, type = 'info', durationMs = 3200) {
  if (typeof document === 'undefined') return;

  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `obsidian-toast toast-${type}`;

  const iconMap = {
    info: 'ℹ️',
    success: '✓',
    warning: '⚠️',
    error: '❌'
  };

  const iconSpan = document.createElement('span');
  iconSpan.textContent = iconMap[type] || '•';

  const msgSpan = document.createElement('span');
  msgSpan.className = 'toast-message';
  msgSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Fechar';

  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Animação de entrada
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const dismiss = () => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  };

  closeBtn.addEventListener('click', dismiss);

  if (durationMs > 0) {
    setTimeout(dismiss, durationMs);
  }
}
