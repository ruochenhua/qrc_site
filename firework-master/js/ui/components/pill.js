/**
 * @param {object} options
 * @param {string} options.text
 * @param {string} [options.className='']
 * @param {Record<string, string>} [options.dataset={}]
 * @returns {HTMLSpanElement}
 */
export function createPill({ text, className = '', dataset = {} }) {
  const pill = document.createElement('span');
  pill.className = ['pill', className].filter(Boolean).join(' ');
  pill.textContent = text;
  for (const [key, value] of Object.entries(dataset)) {
    pill.dataset[key] = value;
  }
  return pill;
}
