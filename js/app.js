const backgrounds = [
  'assets/images/backgrounds/1.png',
  'assets/images/backgrounds/2.png',
  'assets/images/backgrounds/3.jpg',
  'assets/images/backgrounds/4.jpg'
];

const lockedPalette = {
  bg: '#0b1018',
  accent: '#b6c8ff',
  accent2: '#ffd18b',
  cardA: 'rgba(10, 12, 22, .62)',
  cardB: 'rgba(3, 5, 10, .70)',
  glass: 'rgba(5, 7, 13, .48)'
};

function applyPalette(palette) {
  const root = document.documentElement;
  root.style.setProperty('--bg', palette.bg);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent-2', palette.accent2);
  root.style.setProperty('--card-a', palette.cardA);
  root.style.setProperty('--card-b', palette.cardB);
  root.style.setProperty('--glass', palette.glass);
}

const siteBg = document.querySelector('.site-bg');
if (siteBg) {
  siteBg.style.backgroundImage = `url('${backgrounds[Math.floor(Math.random() * backgrounds.length)]}')`;
  applyPalette(lockedPalette);
}


const state = {
  enchantments: [],
  filtered: [],
  sortDirection: 'asc',
  activePack: 'All',
};

const tbody = document.querySelector('#data-table tbody');
const searchInput = document.getElementById('search-input');
const clearButton = document.getElementById('clear-search');
const resultsCount = document.getElementById('results-count');
const sortButton = document.querySelector('[data-sort="name"]');
const quickFilters = document.getElementById('quick-filters');

function normalizeAssetPaths(html) {
  return String(html || '').replaceAll('./items/', './assets/items/');
}

function titleCaseWords(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function extractApplicableItems(entry) {
  const raw = String(entry.applicableText || '').trim();
  if (!raw) return [];

  if (raw.toLowerCase() === 'any') {
    return ['Any'];
  }

  const html = normalizeAssetPaths(entry.applicableHtml || '');
  const labelMatches = [...html.matchAll(/>\s*([^<]+?)\s*(?=<|$)/g)]
    .map((m) => m[1].trim())
    .filter(Boolean)
    .map((s) => titleCaseWords(s.replace(/\s+/g, ' ')));

  if (labelMatches.length) {
    return [...new Set(labelMatches)];
  }

  return raw
    .split(/\s*,\s*/)
    .map((v) => titleCaseWords(v.trim()))
    .filter(Boolean);
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

function createAnyPill() {
  const pill = document.createElement('span');
  pill.className = 'applicable-item applicable-item--any';
  const text = document.createElement('span');
  text.textContent = 'Any';
  pill.appendChild(text);
  return pill;
}

function renderApplicableCell(html) {
  const normalized = normalizeAssetPaths(html);
  if (normalized.trim() === '<b>Any</b>' || normalized.trim().toLowerCase() === 'any') {
    const wrapper = document.createElement('div');
    wrapper.className = 'applicable-cell';
    wrapper.appendChild(createAnyPill());
    return wrapper;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'applicable-cell';
  wrapper.innerHTML = normalized;

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

    if (node.nodeType === Node.ELEMENT_NODE && /^b$/i.test(node.tagName) && node.textContent.trim().toLowerCase() === 'any') {
      wrapper.appendChild(createAnyPill());
      continue;
    }

    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const textValue = node.textContent.trim();
      const pill = document.createElement('span');
      pill.className = 'applicable-item' + (textValue.toLowerCase() === 'any' ? ' applicable-item--any' : '');
      const text = document.createElement('span');
      text.textContent = textValue;
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
    tr.appendChild(createCell(entry.description, 'description-cell'));
    tr.appendChild(createCell(entry.maxLevel, 'level-cell'));
    tr.appendChild(createCell(renderApplicableCell(entry.applicableHtml, entry.applicableText)));
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
  resultsCount.textContent = `${rows.length} ${rows.length === 1 ? 'Enchantment' : 'Enchantments'}`;
}

function renderQuickFilters() {
  const packNames = ['All', ...new Set(state.enchantments.map((entry) => entry.dataPack?.name).filter(Boolean))];
  quickFilters.innerHTML = '';

  packNames.forEach((packName) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-chip' + (packName === state.activePack ? ' is-active' : '');
    button.textContent = packName;
    button.addEventListener('click', () => {
      state.activePack = packName;
      renderQuickFilters();
      applyFilters();
    });
    quickFilters.appendChild(button);
  });
}


function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  clearButton.style.display = query ? 'block' : 'block';

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

    const matchesQuery = haystack.includes(query);
    const matchesPack = state.activePack === 'All' || entry.dataPack?.name === state.activePack;
    return matchesQuery && matchesPack;
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
  renderQuickFilters();
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
  if (searchInput.value) {
    searchInput.value = '';
  } else if (state.activePack !== 'All') {
    state.activePack = 'All';
    renderQuickFilters();
    }
  applyFilters();
  searchInput.focus();
});
sortButton.addEventListener('click', () => sortRows(true));

init().catch((error) => {
  console.error(error);
  resultsCount.textContent = 'Failed to load enchantments.';
});
