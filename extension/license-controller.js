// extension/license-controller.js
// Controlador Local-First da Licença Híbrida Offline (Zero Nuvem, Validação HMAC-SHA256)

import {
  validateLicenseKey,
  generateLicenseKey,
  formatLicenseDisplay,
  normalizeLicenseEmail
} from './core/license-validator.js';

const STORAGE_KEY_EMAIL = 'doc2fill_license_email';
const STORAGE_KEY_KEY = 'doc2fill_license_key';

/**
 * Lê do chrome.storage.local ou localStorage com fallback seguro.
 */
async function loadStoredLicense() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_EMAIL, STORAGE_KEY_KEY], (res) => {
        resolve({
          email: res?.[STORAGE_KEY_EMAIL] || '',
          key: res?.[STORAGE_KEY_KEY] || ''
        });
      });
    });
  }

  return {
    email: localStorage.getItem(STORAGE_KEY_EMAIL) || '',
    key: localStorage.getItem(STORAGE_KEY_KEY) || ''
  };
}

/**
 * Grava no chrome.storage.local ou localStorage com fallback seguro.
 */
async function saveStoredLicense(email, key) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          [STORAGE_KEY_EMAIL]: email,
          [STORAGE_KEY_KEY]: key
        },
        resolve
      );
    });
  }

  localStorage.setItem(STORAGE_KEY_EMAIL, email);
  localStorage.setItem(STORAGE_KEY_KEY, key);
}

/**
 * Formata data futura YYYYMMDD para geração do Beta (14 dias).
 */
function getFutureDateString(daysAhead = 14) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Inicializa o controlador de licença, badge do header e modal.
 */
export async function initLicenseController() {
  const badgeStatus = document.getElementById('badge-license-status');
  const modalBackdrop = document.getElementById('license-modal-backdrop');
  const btnClose = document.getElementById('btn-close-license-modal');
  const form = document.getElementById('license-form');
  const inputEmail = document.getElementById('license-email-input');
  const inputKey = document.getElementById('license-key-input');
  const statusBanner = document.getElementById('license-status-banner');
  const btnBeta = document.getElementById('btn-activate-beta');

  let currentLicense = await loadStoredLicense();

  function updateUi(validation) {
    if (!badgeStatus) return;

    if (validation.valid) {
      badgeStatus.style.background = 'rgba(16, 185, 129, 0.12)';
      badgeStatus.style.color = '#34D399';
      badgeStatus.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      badgeStatus.textContent = `● ${validation.plan} Ativo`;
      badgeStatus.title = formatLicenseDisplay(validation);

      if (statusBanner) {
        statusBanner.className = 'license-status-banner is-valid';
        statusBanner.innerHTML = `
          <strong>✓ Licença ${validation.plan} Válida</strong>
          <span>${formatLicenseDisplay(validation)}</span>
        `;
      }
    } else {
      badgeStatus.style.background = 'rgba(239, 68, 68, 0.12)';
      badgeStatus.style.color = '#F87171';
      badgeStatus.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      badgeStatus.textContent = '● Licença Inativa';
      badgeStatus.title = 'Clique para ativar ou renovar sua licença';

      if (statusBanner) {
        statusBanner.className = 'license-status-banner is-invalid';
        statusBanner.innerHTML = `
          <strong>⚠ Licença Inativa ou Expirada</strong>
          <span>Insira seu e-mail institucional e a chave fornecida na compra.</span>
        `;
      }
    }
  }

  // Validação inicial
  let validation = validateLicenseKey(currentLicense.email, currentLicense.key);
  
  // Se ainda não houver licença configurada, ativa automaticamente um Beta de 14 dias para o usuário inicial
  if (!validation.valid && !currentLicense.email) {
    const defaultEmail = 'procurador.demo@doc2fill.com';
    const autoBetaKey = generateLicenseKey(defaultEmail, 'BETA', getFutureDateString(14));
    await saveStoredLicense(defaultEmail, autoBetaKey);
    currentLicense = { email: defaultEmail, key: autoBetaKey };
    validation = validateLicenseKey(currentLicense.email, currentLicense.key);
  }

  updateUi(validation);

  // Preenche inputs caso abra o modal
  if (inputEmail) inputEmail.value = currentLicense.email;
  if (inputKey) inputKey.value = currentLicense.key;

  // Abrir modal ao clicar no badge
  if (badgeStatus && modalBackdrop) {
    badgeStatus.addEventListener('click', () => {
      modalBackdrop.classList.remove('hidden');
    });
  }

  // Fechar modal
  if (btnClose && modalBackdrop) {
    btnClose.addEventListener('click', () => {
      modalBackdrop.classList.add('hidden');
    });
  }

  // Fechar ao clicar fora do card
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        modalBackdrop.classList.add('hidden');
      }
    });
  }

  // Ação de Salvar / Validar
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = normalizeLicenseEmail(inputEmail?.value || '');
      const key = (inputKey?.value || '').trim();

      const res = validateLicenseKey(email, key);
      if (res.valid) {
        await saveStoredLicense(email, key);
        updateUi(res);
        setTimeout(() => {
          modalBackdrop?.classList.add('hidden');
        }, 800);
      } else {
        updateUi(res);
        if (statusBanner) {
          let msg = 'Chave inválida para o e-mail informado.';
          if (res.reason === 'LICENCA_EXPIRADA') msg = 'Esta licença expirou.';
          if (res.reason === 'EMAIL_INVALIDO') msg = 'Por favor, informe um e-mail válido.';
          statusBanner.innerHTML = `<strong>⚠ Erro na Validação</strong><span>${msg}</span>`;
        }
      }
    });
  }

  // Ação de Ativar Beta Rápido (14 dias)
  if (btnBeta) {
    btnBeta.addEventListener('click', async () => {
      let email = normalizeLicenseEmail(inputEmail?.value || '');
      if (!email || !email.includes('@')) {
        email = 'procurador.beta@doc2fill.com';
        if (inputEmail) inputEmail.value = email;
      }

      const betaKey = generateLicenseKey(email, 'BETA', getFutureDateString(14));
      if (inputKey) inputKey.value = betaKey;

      const res = validateLicenseKey(email, betaKey);
      await saveStoredLicense(email, betaKey);
      updateUi(res);
      setTimeout(() => {
        modalBackdrop?.classList.add('hidden');
      }, 900);
    });
  }
}
