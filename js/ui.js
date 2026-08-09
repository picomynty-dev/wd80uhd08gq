import { esc } from './utils.js?v=46';

export function showToast(message, tone = 'neutral') {
  document.querySelectorAll('.toast').forEach((node) => node.remove());
  const toast = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 220);
  }, 2600);
}

export function openModal(content, { wide = false, onClose = null } = {}) {
  closeModal();
  const wrapper = document.createElement('div');
  wrapper.className = 'modal-backdrop';
  wrapper.innerHTML = `<section class="modal-card ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">${content}</section>`;
  const previousFocus = document.activeElement;
  document.body.appendChild(wrapper);
  document.body.classList.add('modal-open');

  const close = () => {
    wrapper.remove();
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', keyHandler);
    if (previousFocus instanceof HTMLElement && document.body.contains(previousFocus)) previousFocus.focus({ preventScroll: true });
    onClose?.();
  };
  const keyHandler = (event) => {
    if (event.key === 'Escape') return close();
    if (event.key !== 'Tab') return;
    const focusable = [...wrapper.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return event.preventDefault();
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', keyHandler);
  wrapper.addEventListener('click', (event) => {
    if (event.target === wrapper || event.target.closest('[data-close-modal]')) close();
  });
  wrapper.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')?.focus();
  wrapper._closeModal = close;
  return wrapper;
}

export function closeModal() {
  const existing = document.querySelector('.modal-backdrop');
  if (existing?._closeModal) existing._closeModal();
  else if (existing) existing.remove();
  document.body.classList.remove('modal-open');
}

export function confirmAction({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm }) {
  const wrapper = openModal(`
    <div class="modal-header">
      <div><p class="eyebrow">Confirmación</p><h2>${esc(title)}</h2></div>
      <button class="modal-close" type="button" data-close-modal aria-label="Cerrar">×</button>
    </div>
    <p class="muted">${esc(message)}</p>
    <div class="modal-actions">
      <button class="button button-secondary" type="button" data-close-modal>Cancelar</button>
      <button class="button ${danger ? 'button-danger' : 'button-primary'}" type="button" id="confirmActionButton">${esc(confirmLabel)}</button>
    </div>
  `);
  wrapper.querySelector('#confirmActionButton').addEventListener('click', () => {
    wrapper._closeModal?.();
    onConfirm?.();
  });
}

export function emptyState(title, text, actionHtml = '') {
  return `<section class="empty-state"><div class="empty-icon">＋</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${actionHtml}</section>`;
}
