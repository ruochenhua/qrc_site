/**
 * @param {object} options
 * @param {string} options.text
 * @param {string} [options.className='']
 * @param {string} [options.icon='']
 * @returns {HTMLSpanElement}
 */
export function createBadge({ text, className = '', icon = '' }) {
  const badge = document.createElement('span');
  badge.className = className;
  badge.textContent = icon ? `${icon} ${text}` : text;
  return badge;
}
