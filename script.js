/**
 * script.js — index.html logic only
 * Validates inputs, stores config in sessionStorage, navigates to simulation.html
 */

// ─── Theme ────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById('themeToggle');
  const isDark = body.classList.contains('dark');
  body.classList.replace(isDark ? 'dark' : 'light', isDark ? 'light' : 'dark');
  btn.textContent = isDark ? '☀️' : '🌙';
  sessionStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Apply saved theme on load
(function () {
  const saved = sessionStorage.getItem('theme');
  if (saved) {
    document.body.classList.replace('dark', saved);
    document.body.classList.replace('light', saved);
    document.getElementById('themeToggle').textContent = saved === 'dark' ? '🌙' : '☀️';
  }
})();

// ─── Visual Technique Selector ───────────────────────────────────────────────
function selectTechnique(el) {
  document.querySelectorAll('.tech-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('mappingType').value = el.dataset.value;
  toggleSetInput();
}
function toggleSetInput() {
  const type = document.getElementById('mappingType').value;
  document.getElementById('setInputGroup').style.display =
    (type === 'set' || type === 'all') ? '' : 'none';
}

// ─── Validate & Navigate ──────────────────────────────────────────────────────
function goSimulation() {
  const err = document.getElementById('errorMsg');
  const cacheSize   = parseInt(document.getElementById('cacheSize').value);
  const blockSize   = parseInt(document.getElementById('blockSize').value);
  const numSets     = parseInt(document.getElementById('numSets').value);
  const hitTime     = 1;   // fixed default
  const missPenalty = 10;  // fixed default
  const mapping     = document.getElementById('mappingType').value;
  const seqRaw      = document.getElementById('accessSeq').value.trim();
  const sequence    = seqRaw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

  if (!cacheSize || cacheSize < 1)   { err.textContent = 'Cache size must be ≥ 1.'; return; }
  if (!blockSize || blockSize < 1)   { err.textContent = 'Block size must be ≥ 1.'; return; }
  if (sequence.length === 0)         { err.textContent = 'Enter a valid access sequence.'; return; }
  if ((mapping === 'set' || mapping === 'all') && (!numSets || numSets < 1)) {
    err.textContent = 'Number of sets must be ≥ 1.'; return;
  }
  if ((mapping === 'set' || mapping === 'all') && numSets > cacheSize) {
    err.textContent = 'Number of sets cannot exceed cache size.'; return;
  }

  err.textContent = '';

  // Store config for other pages
  sessionStorage.setItem('cacheCfg', JSON.stringify({
    cacheSize, blockSize, numSets, hitTime, missPenalty, mapping, sequence
  }));

  window.location.href = 'simulation.html';
}

function resetForm() {
  document.getElementById('cacheSize').value   = '4';
  document.getElementById('blockSize').value   = '1';
  document.getElementById('numSets').value     = '2';
  document.getElementById('accessSeq').value   = '4,7,6,1,7,6,1,2,7,2,3';
  document.getElementById('mappingType').value = 'all';
  document.getElementById('errorMsg').textContent = '';
  toggleSetInput();
}

// Init
toggleSetInput();
