/**
 * simulation.js — simulation.html logic
 * Loads config from sessionStorage, runs simulation, handles step-by-step UI.
 */

let cfg, steps, currentStep = 0;

// ─── Theme ────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById('themeToggle');
  const isDark = body.classList.contains('dark');
  body.classList.replace(isDark ? 'dark' : 'light', isDark ? 'light' : 'dark');
  btn.textContent = isDark ? '☀️' : '🌙';
  sessionStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  // Apply saved theme
  const theme = sessionStorage.getItem('theme') || 'dark';
  document.body.className = theme;
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '🌙' : '☀️';

  // Load config
  const raw = sessionStorage.getItem('cacheCfg');
  if (!raw) { window.location.href = 'index.html'; return; }
  cfg = JSON.parse(raw);

  // For "compare all", show direct mapping in step view
  const technique = cfg.mapping === 'all' ? 'direct' : cfg.mapping;
  const result = simulate(technique, cfg);
  steps = result.steps;

  // Subtitle
  const names = { direct: 'Direct Mapping', fully: 'Fully Associative', set: 'Set Associative' };
  const label = cfg.mapping === 'all'
    ? 'Direct Mapping (step view) — go to Stats for full comparison'
    : names[cfg.mapping];
  document.getElementById('simSubtitle').textContent = label;

  updateCounter();
  renderEmptyGrid();
})();

// ─── Step Controls ────────────────────────────────────────────────────────────
function nextStep() {
  if (currentStep < steps.length) { currentStep++; render(); }
}
function prevStep() {
  if (currentStep > 0) { currentStep--; render(); }
}
function runAllSteps() {
  currentStep = steps.length;
  render();
}

function updateCounter() {
  document.getElementById('stepCounter').textContent =
    `${currentStep} / ${steps.length}`;
  const pct = steps.length ? (currentStep / steps.length) * 100 : 0;
  document.getElementById('progressBar').style.width = pct + '%';
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  updateCounter();

  // Rebuild table rows up to currentStep
  const tbody = document.getElementById('stepTableBody');
  tbody.innerHTML = '';
  for (let i = 0; i < currentStep; i++) {
    appendRow(steps[i], i === currentStep - 1);
  }

  // Update grid
  if (currentStep > 0) {
    renderGridFromStep(steps[currentStep - 1]);
  } else {
    renderEmptyGrid();
  }

  // Scroll latest row into view
  const rows = tbody.querySelectorAll('tr');
  if (rows.length) rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function appendRow(step, isLatest) {
  const tbody = document.getElementById('stepTableBody');
  const tr = document.createElement('tr');
  if (isLatest) tr.style.background = step.hit
    ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';

  // Cache state string
  let stateStr;
  if (step.isSetAssoc) {
    stateStr = step.cacheSnapshot.map((s, i) => `S${i}:[${s.length ? s.join(',') : '—'}]`).join(' ');
  } else {
    stateStr = step.cacheSnapshot.map((v, i) => `[${i}]:${v !== null ? v : '—'}`).join(' ');
  }

  const lineInfo = step.index !== null
    ? (step.isSetAssoc ? `Set ${step.index}` : `Line ${step.index}`)
    : '—';

  tr.innerHTML = `
    <td>${step.step}</td>
    <td>${step.address}</td>
    <td>${lineInfo}</td>
    <td class="cache-state-cell">${stateStr}</td>
    <td><span class="badge ${step.hit ? 'hit' : 'miss'}">${step.hit ? 'HIT' : 'MISS'}</span></td>
  `;
  tbody.appendChild(tr);
}

// ─── Cache Grid ───────────────────────────────────────────────────────────────
function renderEmptyGrid() {
  const container = document.getElementById('cacheGridContainer');
  container.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'cache-grid-label';
  label.textContent = 'Cache State (empty)';
  container.appendChild(label);

  const grid = document.createElement('div');
  grid.className = 'cache-grid';
  for (let i = 0; i < cfg.cacheSize; i++) {
    const b = document.createElement('div');
    b.className = 'cache-block empty';
    b.innerHTML = `<span class="block-index">${i}</span><span class="block-val">—</span>`;
    grid.appendChild(b);
  }
  container.appendChild(grid);
}

function renderGridFromStep(step) {
  const container = document.getElementById('cacheGridContainer');
  container.innerHTML = '';

  const label = document.createElement('div');
  label.className = 'cache-grid-label';
  label.textContent = `Cache State — after Step ${step.step}`;
  container.appendChild(label);

  if (step.isSetAssoc) {
    step.cacheSnapshot.forEach((setBlocks, si) => {
      const sl = document.createElement('div');
      sl.className = 'cache-grid-label';
      sl.textContent = `Set ${si}`;
      container.appendChild(sl);

      const grid = document.createElement('div');
      grid.className = 'cache-grid';
      for (let w = 0; w < step.ways; w++) {
        const val = setBlocks[w] !== undefined ? setBlocks[w] : null;
        const isActive = si === step.index && val === step.address;
        const b = document.createElement('div');
        b.className = 'cache-block' +
          (val === null ? ' empty' : '') +
          (isActive ? (step.hit ? ' hit' : ' miss') : '');
        b.innerHTML = `<span class="block-index">W${w}</span><span class="block-val">${val !== null ? val : '—'}</span>`;
        grid.appendChild(b);
      }
      container.appendChild(grid);
    });
  } else {
    const grid = document.createElement('div');
    grid.className = 'cache-grid';
    step.cacheSnapshot.forEach((val, i) => {
      const isActive = step.index !== null ? i === step.index : val === step.address;
      const b = document.createElement('div');
      b.className = 'cache-block' +
        (val === null ? ' empty' : '') +
        (isActive ? (step.hit ? ' hit' : ' miss') : (val !== null ? ' active' : ''));
      b.innerHTML = `<span class="block-index">${i}</span><span class="block-val">${val !== null ? val : '—'}</span>`;
      grid.appendChild(b);
    });
    container.appendChild(grid);
  }
}
