/**
 * stats.js — stats.html logic
 * Loads config from sessionStorage, runs all simulations, renders stats & chart.
 */

let chartInstance = null;

// ─── Theme ────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById('themeToggle');
  const isDark = body.classList.contains('dark');
  body.classList.replace(isDark ? 'dark' : 'light', isDark ? 'light' : 'dark');
  btn.textContent = isDark ? '☀️' : '🌙';
  sessionStorage.setItem('theme', isDark ? 'light' : 'dark');
  // Re-render chart with new theme colors
  if (chartInstance) renderChart(window._chartRows);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  const theme = sessionStorage.getItem('theme') || 'dark';
  document.body.className = theme;
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '🌙' : '☀️';

  const raw = sessionStorage.getItem('cacheCfg');
  if (!raw) { window.location.href = 'index.html'; return; }
  const cfg = JSON.parse(raw);

  const names = { direct: 'Direct Mapping', fully: 'Fully Associative', set: 'Set Associative' };

  if (cfg.mapping === 'all') {
    // Run all three and show comparison
    document.getElementById('statsSubtitle').textContent = 'Comparing all three mapping techniques';
    document.getElementById('compSection').style.display = '';

    const techniques = ['direct', 'fully', 'set'];
    const results = {};
    techniques.forEach(t => { results[t] = simulate(t, cfg); });

    // Stats cards show direct mapping as primary
    renderStats(results['direct'], 'Direct Mapping (primary)');
    renderComparison(results);
  } else {
    document.getElementById('statsSubtitle').textContent = names[cfg.mapping];
    const result = simulate(cfg.mapping, cfg);
    renderStats(result, names[cfg.mapping]);
  }
})();

// ─── Stats Cards ──────────────────────────────────────────────────────────────
function renderStats(result, label) {
  const container = document.getElementById('statsCards');
  container.innerHTML = '';

  const stats = [
    { label: 'Technique',      value: label,                                    sub: '' },
    { label: 'Total Accesses', value: result.steps.length,                      sub: '' },
    { label: 'Hits',           value: result.hits,                              sub: '' },
    { label: 'Misses',         value: result.misses,                            sub: '' },
    { label: 'Hit Ratio',      value: (result.hitRatio * 100).toFixed(1) + '%', sub: '' },
    { label: 'Miss Rate',      value: (result.missRate * 100).toFixed(1) + '%', sub: '' },
    { label: 'AMAT',           value: result.amat.toFixed(2),                   sub: 'cycles' },
  ];

  stats.forEach(s => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
      ${s.sub ? `<div class="stat-sub">${s.sub}</div>` : ''}
    `;
    container.appendChild(card);
  });
}

// ─── Comparison Table ─────────────────────────────────────────────────────────
function renderComparison(results) {
  const tbody = document.getElementById('compTableBody');
  tbody.innerHTML = '';
  const labels = { direct: 'Direct Mapping', fully: 'Fully Associative', set: 'Set Associative' };
  const chartRows = [];

  Object.entries(results).forEach(([key, r]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${labels[key]}</td>
      <td>${r.hits}</td>
      <td>${r.misses}</td>
      <td>${(r.hitRatio * 100).toFixed(1)}%</td>
      <td>${(r.missRate * 100).toFixed(1)}%</td>
      <td>${r.amat.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
    chartRows.push({ label: labels[key], hitRatio: r.hitRatio, amat: r.amat });
  });

  window._chartRows = chartRows;
  renderChart(chartRows);
}

// ─── Chart ────────────────────────────────────────────────────────────────────
function renderChart(rows) {
  const ctx = document.getElementById('hitRatioChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const isDark = document.body.classList.contains('dark');
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#8892b0' : '#5a6480';

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.label),
      datasets: [
        {
          label: 'Hit Ratio (%)',
          data: rows.map(r => +(r.hitRatio * 100).toFixed(1)),
          backgroundColor: ['rgba(108,99,255,0.7)', 'rgba(0,212,170,0.7)', 'rgba(251,191,36,0.7)'],
          borderColor: ['#6c63ff', '#00d4aa', '#fbbf24'],
          borderWidth: 2, borderRadius: 6,
        },
        {
          label: 'AMAT (cycles)',
          data: rows.map(r => +r.amat.toFixed(2)),
          backgroundColor: ['rgba(108,99,255,0.3)', 'rgba(0,212,170,0.3)', 'rgba(251,191,36,0.3)'],
          borderColor: ['#6c63ff', '#00d4aa', '#fbbf24'],
          borderWidth: 2, borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: textColor } },
        title: {
          display: true,
          text: 'Hit Ratio (%) & AMAT Comparison',
          color: textColor,
          font: { size: 14 }
        }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });
}
