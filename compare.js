// CityPulse Neighborhood Comparison & Urban Matrix (Chart.js)
let radarChartInstance = null;
let currentBenchmarks = [];

function initCompareView(benchmarks) {
  currentBenchmarks = benchmarks;
  populateSelects(benchmarks);
  updateComparison();
}

function populateSelects(benchmarks) {
  const selA = document.getElementById('compare-select-a');
  const selB = document.getElementById('compare-select-b');

  if (!selA || !selB) return;

  selA.innerHTML = '';
  selB.innerHTML = '';

  benchmarks.forEach((b, index) => {
    const optA = new Option(b.name, b.id, index === 0, index === 0);
    const optB = new Option(b.name, b.id, index === 1, index === 1);
    selA.add(optA);
    selB.add(optB);
  });
}

function updateComparison() {
  const selA = document.getElementById('compare-select-a');
  const selB = document.getElementById('compare-select-b');

  if (!selA || !selB || currentBenchmarks.length === 0) return;

  const idA = selA.value;
  const idB = selB.value;

  const itemA = currentBenchmarks.find(b => b.id === idA) || currentBenchmarks[0];
  const itemB = currentBenchmarks.find(b => b.id === idB) || currentBenchmarks[1] || currentBenchmarks[0];

  renderRadarChart(itemA, itemB);
  renderComparisonCards(itemA, itemB);
}

function renderRadarChart(itemA, itemB) {
  const ctx = document.getElementById('compareRadarChart');
  if (!ctx) return;

  if (radarChartInstance) {
    radarChartInstance.destroy();
  }

  const labels = ['Safety', 'Cleanliness', 'Air Quality (AQI)', 'Affordability', 'Transit Access', 'Nightlife & Vibe'];

  // Convert raw values to normalized 0-100 scales
  const dataA = [
    itemA.safety_score,
    itemA.cleanliness_score,
    Math.max(10, 100 - (itemA.aqi_level / 2.5)), // Lower AQI is cleaner
    itemA.affordability_score,
    itemA.transit_accessibility,
    itemA.nightlife_vibe
  ];

  const dataB = [
    itemB.safety_score,
    itemB.cleanliness_score,
    Math.max(10, 100 - (itemB.aqi_level / 2.5)),
    itemB.affordability_score,
    itemB.transit_accessibility,
    itemB.nightlife_vibe
  ];

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: itemA.name,
          data: dataA,
          backgroundColor: 'rgba(59, 130, 246, 0.25)',
          borderColor: '#3b82f6',
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#3b82f6',
          borderWidth: 2
        },
        {
          label: itemB.name,
          data: dataB,
          backgroundColor: 'rgba(236, 72, 153, 0.25)',
          borderColor: '#ec4899',
          pointBackgroundColor: '#ec4899',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#ec4899',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.08)' },
          pointLabels: {
            color: '#94a3b8',
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }
          },
          ticks: {
            display: false,
            backdropColor: 'transparent',
            min: 0,
            max: 100
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#f3f4f6',
            font: { family: 'Plus Jakarta Sans', size: 13, weight: 'bold' }
          }
        }
      }
    }
  });
}

function renderComparisonCards(itemA, itemB) {
  const container = document.getElementById('compare-details-grid');
  if (!container) return;

  const renderCard = (item, colorClass, borderColor) => `
    <div class="glass-card p-5 rounded-xl border ${borderColor}">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xl font-bold ${colorClass}">${item.name}</h3>
        <span class="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-medium">
          Overall: ${(item.rating_score).toFixed(1)} / 5.0
        </span>
      </div>
      <p class="text-xs text-slate-300 mb-4 italic leading-relaxed">${item.summary}</p>
      
      <div class="grid grid-cols-2 gap-2 text-xs mb-4">
        <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
          <span class="text-slate-400 block text-[11px]">🛡️ Safety Index</span>
          <span class="text-emerald-400 font-bold text-base">${item.safety_score}/100</span>
        </div>
        <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
          <span class="text-slate-400 block text-[11px]">✨ Cleanliness</span>
          <span class="text-blue-400 font-bold text-base">${item.cleanliness_score}/100</span>
        </div>
        <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
          <span class="text-slate-400 block text-[11px]">💰 Affordability</span>
          <span class="text-amber-400 font-bold text-base">${item.affordability_score}/100</span>
        </div>
        <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
          <span class="text-slate-400 block text-[11px]">🚆 Transit Access</span>
          <span class="text-purple-400 font-bold text-base">${item.transit_accessibility}/100</span>
        </div>
      </div>

      <div class="mb-3">
        <h5 class="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1">
          <span>✓</span> Key Strengths (Pros):
        </h5>
        <ul class="text-xs text-slate-300 space-y-1 pl-2">
          ${item.pros.map(p => `<li>• ${p}</li>`).join('')}
        </ul>
      </div>

      <div class="mb-4">
        <h5 class="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1">
          <span>✕</span> Drawbacks (Cons):
        </h5>
        <ul class="text-xs text-slate-300 space-y-1 pl-2">
          ${item.cons.map(c => `<li>• ${c}</li>`).join('')}
        </ul>
      </div>

      <div class="pt-3 border-t border-slate-800/80">
        <span class="text-[11px] text-slate-400 block mb-1 font-medium">Recommended For:</span>
        <div class="flex flex-wrap gap-1.5">
          ${item.recommended_for.map(r => `
            <span class="text-[10px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full border border-slate-700">
              ${r}
            </span>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `
    ${renderCard(itemA, 'text-blue-400', 'border-blue-500/30')}
    ${renderCard(itemB, 'text-pink-400', 'border-pink-500/30')}
  `;
}
