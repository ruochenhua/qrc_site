document.addEventListener('DOMContentLoaded', () => {
  const filter = document.querySelector('#tag-filter');
  if (!filter) return;

  const buttons = [...filter.querySelectorAll('.tag-filter-btn')];
  const cards = [...document.querySelectorAll('.note-card')];
  if (buttons.length === 0 || cards.length === 0) return;

  filter.addEventListener('click', (event) => {
    const button = event.target.closest('.tag-filter-btn');
    if (!button || !filter.contains(button)) return;

    const tag = button.dataset.tag;
    for (const option of buttons) {
      const selected = option === button;
      option.classList.toggle('active', selected);
      option.setAttribute('aria-pressed', String(selected));
    }
    for (const card of cards) {
      const cardTags = (card.dataset.tags || '').split(/\s+/);
      card.classList.toggle('note-card-hidden', tag !== 'all' && !cardTags.includes(tag));
    }
  });
});
