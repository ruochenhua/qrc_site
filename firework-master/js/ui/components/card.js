/**
 * @param {object} options
 * @param {string} options.className
 * @param {Array<Node|string>} [options.children=[]]
 * @param {Record<string, string>} [options.dataset={}]
 * @returns {HTMLDivElement}
 */
export function createCard({ className, children = [], dataset = {} }) {
  const card = document.createElement('div');
  card.className = className;
  for (const [key, value] of Object.entries(dataset)) {
    card.dataset[key] = value;
  }
  for (const child of children) {
    if (typeof child === 'string') {
      card.appendChild(document.createTextNode(child));
    } else if (child && typeof child.nodeType === 'number') {
      card.appendChild(child);
    }
  }
  return card;
}
