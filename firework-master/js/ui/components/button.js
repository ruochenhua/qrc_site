/**
 * @param {object} options
 * @param {string} options.text
 * @param {'primary'|'secondary'|string} [options.variant='primary']
 * @param {boolean} [options.disabled=false]
 * @param {string} [options.className='']
 * @param {(e: MouseEvent) => void} [options.onClick]
 * @returns {HTMLButtonElement}
 */
export function createButton({
  text,
  variant = 'primary',
  disabled = false,
  className = '',
  onClick,
}) {
  const btn = document.createElement('button');
  btn.className = ['btn', variant, className].filter(Boolean).join(' ');
  btn.textContent = text;
  btn.disabled = disabled;
  if (onClick) {
    btn.addEventListener('click', onClick);
  }
  return btn;
}
