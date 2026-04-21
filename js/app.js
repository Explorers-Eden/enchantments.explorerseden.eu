const state = {
  enchantments: [],
  filtered: [],
  sortDirection: 'asc',
};

const tbody = document.querySelector('#data-table tbody');
const searchInput = document.getElementById('search-input');
const clearButton = document.getElementById('clear-search');
const resultsCount = document.getElementById('results-count');
const sortButton = document.querySelector('[data-sort="name"]');

function renderApplicableCell(html) {
  const wrapper = document.createElement('div');
  wrapper.className = 'applicable-cell';
  wrapper.innerHTML = html;
  wrapper.querySelectorAll('img').forEach((img) => {
    const nextText = img.nextSibling && img.nextSibling.textContent ? img.nextSibling.textContent.trim() : '';
    if (!img.alt) img.alt = nextText || 'Applicable item';
    img.loading = 'lazy';
  });
  wrapper.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const span = document.createElement('span');
      span.textContent = node.textContent.trim();
      wrapper.replaceChild(span, node);
    }
  });
  return wrapper;
}

function renderTable(rows) {
  tbody.innerHTML = '';
  const fragment = document.createDocumentFragment();

  rows.forEach((entry) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${entry.name}</td>
      <td>${entry.description}</td>
      <td>${entry.maxLevel}</td>
      <td></td>
      <td>${entry.incompatibilities}</td>
      <td>${entry.lootSources}</td>
      <td>${entry.dataPack.url ? `<a class="data-pack-link" target="_blank" rel="noreferrer" href="${entry.dataPack.url}">${entry.dataPack.name}</a>` : entry.dataPack.name}</td>
    `;
    tr.children[3].appendChild(renderApplicableCell(entry.applicableHtml));
    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);
  resultsCount.textContent = `${rows.length} enchantment${rows.length === 1 ? '' : 's'}`;
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  clearButton.style.display = query ? 'block' : 'none';

  state.filtered = state.enchantments.filter((entry) => {
    const haystack = [
      entry.name,
      entry.description,
      entry.maxLevel,
      entry.applicableText,
      entry.incompatibilities,
      entry.lootSources,
      entry.dataPack.name,
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });

  sortRows(false);
}

function sortRows(toggleDirection = true) {
  if (toggleDirection) {
    state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
  }

  const sorted = [...state.filtered].sort((a, b) => {
    const av = a.name.toLowerCase();
    const bv = b.name.toLowerCase();
    if (av < bv) return state.sortDirection === 'asc' ? -1 : 1;
    if (av > bv) return state.sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  renderTable(sorted);
}

async function init() {
  const response = await fetch('./data/enchantments.json');
  state.enchantments = await response.json();
  state.filtered = [...state.enchantments];
  renderTable(state.filtered);
}

const debounce = (fn, delay = 150) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

searchInput.addEventListener('input', debounce(applyFilters));
clearButton.addEventListener('click', () => {
  searchInput.value = '';
  applyFilters();
  searchInput.focus();
});
sortButton.addEventListener('click', () => sortRows(true));

init().catch((error) => {
  console.error(error);
  resultsCount.textContent = 'Failed to load enchantments.';
});
