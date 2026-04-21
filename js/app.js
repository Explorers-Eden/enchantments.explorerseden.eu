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

function normalizeAssetPaths(html) {
  return String(html || '').replaceAll('./items/', './assets/items/');
}

function listify(value) {
  const parts = String(value || '')
    .split(/\s*,\s*/)
    .map((v) => v.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return document.createTextNode(parts[0] || '—');
  }

  const ul = document.createElement('ul');
  ul.className = 'inline-list';
  parts.forEach((part) => {
    const li = document.createElement('li');
    li.textContent = part;
    ul.appendChild(li);
  });
  return ul;
}

function renderApplicableCell(html) {
  const wrapper = document.createElement('div');
  wrapper.className = 'applicable-cell';
  wrapper.innerHTML = normalizeAssetPaths(html);

  const nodes = Array.from(wrapper.childNodes);
  wrapper.innerHTML = '';

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') {
      const pill = document.createElement('span');
      pill.className = 'applicable-item';

      node.loading = 'lazy';
      node.decoding = 'async';

      let label = '';
      const next = nodes[i + 1];
      if (next && next.nodeType === Node.TEXT_NODE) {
        label = next.textContent.trim();
        if (label) i += 1;
      }

      if (!node.alt) node.alt = label || 'Applicable item';
      pill.appendChild(node);

      if (label) {
        const text = document.createElement('span');
        text.textContent = label;
        pill.appendChild(text);
      }

      wrapper.appendChild(pill);
      continue;
    }

    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const pill = document.createElement('span');
      pill.className = 'applicable-item';
      const text = document.createElement('span');
      text.textContent = node.textContent.trim();
      pill.appendChild(text);
      wrapper.appendChild(pill);
    }
  }

  return wrapper.childNodes.length ? wrapper : document.createTextNode('—');
}

function createCell(content, className = '') {
  const td = document.createElement('td');
  if (className) td.className = className;

  if (content instanceof Node) {
    td.appendChild(content);
  } else {
    td.textContent = content || '—';
  }
  return td;
}

function renderTable(rows) {
  tbody.innerHTML = '';
  const fragment = document.createDocumentFragment();

  rows.forEach((entry) => {
    const tr = document.createElement('tr');

    tr.appendChild(createCell(entry.name, 'name-cell'));
    tr.appendChild(createCell(entry.description));
    tr.appendChild(createCell(entry.maxLevel, 'level-cell'));
    tr.appendChild(createCell(renderApplicableCell(entry.applicableHtml)));
    tr.appendChild(createCell(listify(entry.incompatibilities)));
    tr.appendChild(createCell(listify(entry.lootSources)));

    const packCell = document.createElement('td');
    if (entry.dataPack?.url) {
      const a = document.createElement('a');
      a.className = 'data-pack-link';
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.href = entry.dataPack.url;
      a.textContent = entry.dataPack.name;
      packCell.appendChild(a);
    } else {
      packCell.textContent = entry.dataPack?.name || '—';
    }
    tr.appendChild(packCell);

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
      entry.dataPack?.name,
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
  if (!response.ok) throw new Error('Failed to fetch enchantments.json');
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
