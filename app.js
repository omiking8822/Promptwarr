// CityPulse 360 Multi-City Application Controller
window.currentCity = "Mumbai";
const FALLBACK_IMAGE_DATA_URI = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22700%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%231e293b%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22system-ui%22%20font-size%3D%2222%22%20font-weight%3D%22bold%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%3E%F0%9F%8F%99%EF%B8%8F%20CityPulse%20360%20Destination%3C%2Ftext%3E%3C%2Fsvg%3E";
let citiesList = [];
let placesData = [];
let heritageData = [];
let safetyData = null;
let benchmarksData = [];
let citizenReportsData = [];
let smartCityData = null;
let currentPlayingSpeech = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Restore persisted city from localStorage if present
  const savedCity = localStorage.getItem('citypulse_selected_city');
  if (savedCity) {
    window.currentCity = savedCity;
  }

  // 2. Initialize Map with Mumbai center coordinates
  initMap([19.0760, 72.8777], 13);
  initPulseBot();
  initReportingModule();

  // 3. Load Cities Directory & populate selector
  await loadCitiesDirectory();

  // 4. Load initial city data
  await loadCityData(window.currentCity);

  // 5. Setup event listeners
  setupEventListeners();
});

async function loadCitiesDirectory() {
  try {
    const res = await fetch('/api/cities-detail');
    if (res.ok) {
      citiesList = await res.json();
      populateCitySelector(citiesList);
    }
  } catch (err) {
    console.error("Failed to load cities directory:", err);
  }
}

function populateCitySelector(cities) {
  const select = document.getElementById('city-select');
  if (!select) return;

  select.innerHTML = '';
  cities.forEach(city => {
    const opt = document.createElement('option');
    opt.value = city.id;
    opt.innerText = city.display_name || city.name;
    opt.className = "bg-slate-900 text-white py-1";
    if (city.id.toLowerCase() === window.currentCity.toLowerCase()) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function setupEventListeners() {
  // City dropdown change with persistence
  const citySelect = document.getElementById('city-select');
  if (citySelect) {
    citySelect.addEventListener('change', async (e) => {
      const selected = e.target.value;
      window.currentCity = selected;
      localStorage.setItem('citypulse_selected_city', selected);
      await loadCityData(selected);
    });
  }

  // Category filter buttons (8 functional filters)
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active-filter', 'bg-blue-600', 'text-white');
        b.classList.add('bg-slate-800', 'text-slate-300');
      });
      btn.classList.add('active-filter', 'bg-blue-600', 'text-white');
      btn.classList.remove('bg-slate-800', 'text-slate-300');
      applyFilters();
    });
  });

  // Search input with debounce
  const searchInput = document.getElementById('search-explore');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      applyFilters();
    }, 250));
  }
}

async function loadCityData(cityName) {
  showTransitionLoading(true, cityName);

  try {
    await Promise.all([
      loadCityOverview(cityName),
      loadExplorePlaces(cityName),
      loadCultureData(cityName),
      loadSafetyData(cityName),
      loadBenchmarks(cityName),
      loadSmartCityInsights(cityName),
      loadCitizenReports(cityName)
    ]);
  } catch (err) {
    console.error("Error loading city data:", err);
  } finally {
    showTransitionLoading(false, cityName);
  }
}

function showTransitionLoading(isLoading, cityName) {
  let overlay = document.getElementById('city-loading-overlay');
  if (!overlay && isLoading) {
    overlay = document.createElement('div');
    overlay.id = 'city-loading-overlay';
    overlay.className = 'fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200';
    overlay.innerHTML = `
      <div class="glass-card px-6 py-4 rounded-2xl flex items-center gap-3 border border-blue-500/30 shadow-2xl">
        <div class="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        <div class="text-xs font-semibold text-white">
          Updating city telemetry for <span class="text-blue-400 font-bold" id="overlay-city-name">${cityName}</span>...
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  if (overlay) {
    if (isLoading) {
      const nameEl = document.getElementById('overlay-city-name');
      if (nameEl) nameEl.innerText = cityName;
      overlay.classList.remove('hidden');
      overlay.style.opacity = '1';
    } else {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.classList.add('hidden'), 200);
    }
  }
}

async function loadCityOverview(city) {
  try {
    const res = await fetch(`/api/city/${city}`);
    const data = await res.json();
    
    // Update Header Elements
    const headerCity = document.getElementById('header-city-name');
    const headerTagline = document.getElementById('header-city-tagline');
    const headerState = document.getElementById('header-city-state');
    
    if (headerCity) headerCity.innerText = data.display_name || data.name;
    if (headerTagline) headerTagline.innerText = data.tagline || data.travel_info;
    if (headerState && data.state) headerState.innerText = data.state;

    // Recenter and zoom map to city
    if (data.center && map) {
      map.setView(data.center, data.default_zoom || 13);
      if (window.updateGoogleEarthLinks) {
        window.updateGoogleEarthLinks(data.center);
      }
      if (window.updateGoogleEarthIframe) {
        window.updateGoogleEarthIframe();
      }
    }

    // Update Weather Widget
    const weatherTemp = document.getElementById('header-weather-temp');
    const weatherCond = document.getElementById('header-weather-cond');
    const weatherAlert = document.getElementById('header-weather-alert');
    if (weatherTemp) weatherTemp.innerText = `${data.weather.temp_c}°C`;
    if (weatherCond) weatherCond.innerText = data.weather.condition;
    if (weatherAlert && data.weather.alert) {
      weatherAlert.innerText = data.weather.alert;
    }

    // Update AQI Badge with sample indicator
    const aqiVal = document.getElementById('header-aqi-val');
    const aqiPill = document.getElementById('header-aqi-pill');
    if (aqiVal) aqiVal.innerText = `AQI ${data.aqi}`;
    if (aqiPill) {
      if (data.aqi < 75) aqiPill.className = 'text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-950 text-emerald-400 border border-emerald-800';
      else if (data.aqi < 150) aqiPill.className = 'text-xs px-2.5 py-1 rounded-full font-bold bg-amber-950 text-amber-400 border border-amber-800';
      else aqiPill.className = 'text-xs px-2.5 py-1 rounded-full font-bold bg-red-950 text-red-400 border border-red-800';
    }

    // Update Traffic Pill
    const trafficPill = document.getElementById('header-traffic-pill');
    if (trafficPill && data.traffic) {
      trafficPill.innerText = `Traffic: ${data.traffic.congestion_level}% (${data.traffic.status})`;
      trafficPill.className = data.traffic.congestion_level > 70 
        ? 'text-xs px-3 py-1 rounded-full font-semibold bg-red-950/80 text-red-400 border border-red-800 flex items-center gap-1.5'
        : 'text-xs px-3 py-1 rounded-full font-semibold bg-amber-950/80 text-amber-400 border border-amber-800 flex items-center gap-1.5';
    }

    // Populate SOS Contacts
    const sosContainer = document.getElementById('sos-contacts-list');
    if (sosContainer && data.sos_contacts) {
      sosContainer.innerHTML = data.sos_contacts.map(c => `
        <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-red-500/50 transition">
          <div>
            <h5 class="text-sm font-bold text-white">${escapeHtml(c.service)}</h5>
            <p class="text-xs text-slate-400">${escapeHtml(c.description)}</p>
          </div>
          <a href="tel:${c.number}" class="bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1 shadow-lg">
            📞 ${c.number}
          </a>
        </div>
      `).join('');
    }

    // Update PulseBot greeting for new city
    if (window.updatePulseBotCity) {
      window.updatePulseBotCity(data.name);
    }

  } catch (err) {
    console.error("Error loading city overview:", err);
  }
}

async function loadExplorePlaces(city) {
  try {
    const res = await fetch(`/api/explore?city=${city}`);
    placesData = await res.json();
    applyFilters();
  } catch (e) {
    console.error("Error loading places:", e);
  }
}

function renderPlaceCards(places) {
  const container = document.getElementById('explore-cards-container');
  if (!container) return;

  if (!places || places.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400 glass-card rounded-2xl">
        <div class="text-3xl mb-2">🔍</div>
        <h4 class="font-bold text-white text-base mb-1">No destinations found in ${escapeHtml(window.currentCity)}</h4>
        <p class="text-xs text-slate-400">Try clearing your search query or selecting a different category filter.</p>
        <button onclick="window.clearFilters()" class="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
          Reset All Filters
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = places.map(p => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
    const amenitiesHtml = (p.amenities || []).slice(0, 3).map(a => `
      <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
        ${escapeHtml(a)}
      </span>
    `).join('');

    return `
      <div class="glass-card rounded-xl overflow-hidden flex flex-col group border border-slate-800/80 hover:border-blue-500/40 transition">
        <div class="relative h-44 w-full overflow-hidden bg-slate-900">
          <img src="${p.image_url}" alt="${escapeHtml(p.name)}" 
               onerror="this.onerror=null; this.src='${FALLBACK_IMAGE_DATA_URI}';"
               class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
          
          <div class="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-600/90 text-white backdrop-blur">
              ${p.sub_category || p.category}
            </span>
            ${p.is_hidden_gem ? '<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-600/90 text-white backdrop-blur">💎 Hidden Gem</span>' : ''}
          </div>

          <div class="absolute top-2.5 right-2.5">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-emerald-400 border border-emerald-800/60 backdrop-blur">
              🛡️ Safety: ${p.safety_score}/100
            </span>
          </div>

          <div class="absolute bottom-2.5 left-3 right-3 flex justify-between items-end">
            <div>
              <h4 class="font-bold text-white text-base group-hover:text-blue-300 transition leading-snug">${escapeHtml(p.name)}</h4>
              <span class="text-xs text-slate-300 flex items-center gap-1">📍 ${escapeHtml(p.neighborhood ? p.neighborhood + ', ' + p.city : p.city)}</span>
            </div>
            <div class="text-right">
              <span class="text-xs text-amber-400 font-bold block">★ ${p.rating}</span>
              <span class="text-[10px] text-slate-400">${p.rating_label || 'Sample Rating'}</span>
            </div>
          </div>
        </div>

        <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
          <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed">${escapeHtml(p.description)}</p>
          
          <!-- Amenities -->
          <div class="flex flex-wrap gap-1">
            ${amenitiesHtml}
            ${(p.amenities && p.amenities.length > 3) ? `<span class="text-[10px] text-slate-400 self-center">+${p.amenities.length - 3}</span>` : ''}
          </div>

          <div class="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span class="text-slate-400 text-[11px] font-medium">💰 ${p.avg_cost_for_two}</span>
            <div class="flex items-center gap-2">
              <button onclick="window.selectPlaceDetail('${p.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded text-xs font-semibold border border-slate-700">
                View Details
              </button>
              <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded text-xs font-semibold border border-emerald-700/60 flex items-center gap-1">
                🧭 Directions
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.selectPlaceDetail = function(placeId) {
  const place = placesData.find(p => p.id === placeId);
  if (!place) return;

  const modal = document.getElementById('modal-place-detail');
  const body = document.getElementById('place-modal-body');
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

  const amenitiesList = (place.amenities || []).map(a => `
    <span class="text-xs bg-slate-800 text-slate-200 px-2.5 py-1 rounded-full border border-slate-700">
      ✓ ${escapeHtml(a)}
    </span>
  `).join('');

  body.innerHTML = `
    <div class="relative h-64 w-full rounded-xl overflow-hidden mb-4 bg-slate-900">
      <img src="${place.image_url}" alt="${escapeHtml(place.name)}" 
           onerror="this.onerror=null; this.src='${FALLBACK_IMAGE_DATA_URI}';"
           class="w-full h-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
      
      <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        <div>
          <span class="text-xs bg-blue-600 px-2.5 py-0.5 rounded-full text-white font-medium mb-1.5 inline-block">
            ${place.sub_category || place.category}
          </span>
          <h2 class="text-2xl font-bold text-white">${escapeHtml(place.name)}</h2>
          <p class="text-xs text-slate-300">${escapeHtml(place.address || place.neighborhood)}</p>
        </div>
        <div class="text-right">
          <span class="text-xl font-bold text-amber-400">★ ${place.rating}</span>
          <span class="block text-[11px] text-slate-400">(${place.rating_label || 'Sample Rating'})</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
      <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block uppercase font-semibold">Indicative Budget</span>
        <span class="text-amber-400 font-bold text-sm">${place.avg_cost_for_two}</span>
      </div>
      <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block uppercase font-semibold">Safety Index</span>
        <span class="text-emerald-400 font-bold text-sm">${place.safety_score} / 100</span>
      </div>
      <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block uppercase font-semibold">Crowd Profile</span>
        <span class="text-blue-400 font-bold text-sm">${place.crowd_level}</span>
      </div>
      <div class="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-center">
        <span class="text-[10px] text-slate-400 block uppercase font-semibold">Hours</span>
        <span class="text-slate-200 font-medium text-xs truncate block">${place.opening_hours}</span>
      </div>
    </div>

    <div class="space-y-3 mb-5 text-sm text-slate-200">
      <div>
        <h4 class="font-bold text-white text-xs mb-1 uppercase tracking-wider text-slate-400">About this Destination</h4>
        <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(place.description)}</p>
      </div>

      ${place.must_try ? `
        <div class="bg-amber-950/40 border border-amber-800/60 p-3 rounded-lg">
          <h5 class="text-xs font-bold text-amber-400 mb-0.5">⭐ Signature Highlight / Must-Try:</h5>
          <p class="text-xs text-slate-200 font-medium">${escapeHtml(place.must_try)}</p>
        </div>
      ` : ''}

      ${place.etiquette_tip ? `
        <div class="bg-blue-950/40 border border-blue-800/60 p-3 rounded-lg">
          <h5 class="text-xs font-bold text-blue-400 mb-0.5">💡 Local Etiquette & Visiting Tip:</h5>
          <p class="text-xs text-slate-200">${escapeHtml(place.etiquette_tip)}</p>
        </div>
      ` : ''}

      <!-- Amenities -->
      ${place.amenities && place.amenities.length > 0 ? `
        <div>
          <h5 class="text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Available Amenities:</h5>
          <div class="flex flex-wrap gap-1.5">
            ${amenitiesList}
          </div>
        </div>
      ` : ''}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <button onclick="window.panMapTo(${place.lat}, ${place.lng}); closeModal('modal-place-detail');" class="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5">
        🗺️ Show on Map
      </button>
      <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5">
        🧭 Google Directions
      </a>
      <button onclick="window.planSafeRouteTo(${place.lat}, ${place.lng}, '${escapeHtml(place.name)}'); closeModal('modal-place-detail');" class="bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-600/50 font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5">
        🛡️ SafeWay Navigator
      </button>
    </div>
  `;

  modal.classList.remove('hidden');
};

window.panMapTo = function(lat, lng) {
  window.switchTab('explore');
  flyToCoordinate(lat, lng, 16);
};

window.planSafeRouteTo = function(lat, lng, name) {
  window.switchTab('safety');
  const cityMeta = citiesList.find(c => c.id.toLowerCase() === window.currentCity.toLowerCase()) || { center: [18.9388, 72.8353] };
  calculateCustomRoute(cityMeta.center[0], cityMeta.center[1], lat, lng, name);
};

async function loadCultureData(city) {
  try {
    const res = await fetch(`/api/culture?city=${city}`);
    heritageData = await res.json();
    renderCultureCards(heritageData);
  } catch (e) {
    console.error("Error loading culture data:", e);
  }
}

function renderCultureCards(items) {
  const container = document.getElementById('culture-cards-container');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400 glass-card rounded-2xl">
        <p class="text-sm">Historical landmarks for ${escapeHtml(window.currentCity)} are being curated.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="glass-card rounded-xl overflow-hidden flex flex-col border border-amber-900/30">
      <div class="relative h-48 w-full overflow-hidden bg-slate-900">
        <img src="${item.image_url}" alt="${escapeHtml(item.name)}" 
             onerror="this.onerror=null; this.src='${FALLBACK_IMAGE_DATA_URI}';"
             class="w-full h-full object-cover">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>
        <div class="absolute top-3 left-3 bg-amber-600/90 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur">
          🏛️ ${item.era_or_year || 'Historic Monument'}
        </div>
        <div class="absolute bottom-3 left-3 right-3">
          <h3 class="text-lg font-bold text-white">${escapeHtml(item.name)}</h3>
          <span class="text-xs text-amber-300/90">${escapeHtml(item.architectural_style || '')}</span>
        </div>
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h5 class="text-xs font-bold text-amber-400 mb-1">Significance & Heritage:</h5>
          <p class="text-xs text-slate-300 leading-relaxed mb-3">${escapeHtml(item.significance)}</p>

          <h5 class="text-xs font-bold text-slate-300 mb-1">Historical Backstory:</h5>
          <p class="text-xs text-slate-400 leading-relaxed">${escapeHtml(item.historical_story)}</p>
        </div>

        <div class="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              🎧 Audio Walking Tour Script
            </span>
            <div id="wave-${item.id}" class="hidden flex items-center gap-1">
              <span class="audio-wave-bar"></span>
              <span class="audio-wave-bar" style="animation-delay: 0.2s"></span>
              <span class="audio-wave-bar" style="animation-delay: 0.4s"></span>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 italic mb-2 line-clamp-2">"${escapeHtml(item.audio_guide_transcript)}"</p>
          <div class="flex gap-2">
            <button onclick="toggleAudioGuide('${item.id}', '${escapeAttr(item.audio_guide_transcript)}')" id="btn-audio-${item.id}" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1.5 px-3 rounded-md transition flex items-center justify-center gap-1.5">
              ▶ Play Audio Tour
            </button>
            <button onclick="window.panMapTo(${item.lat}, ${item.lng})" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-md border border-slate-700">
              📍 Map
            </button>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>📸 Vantage: <strong>${escapeHtml(item.best_photography_spot || 'Entrance')}</strong></span>
          <span class="text-amber-400 font-medium">${item.entry_fee}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleAudioGuide(id, transcript) {
  const btn = document.getElementById(`btn-audio-${id}`);
  const wave = document.getElementById(`wave-${id}`);

  if (currentPlayingSpeech && window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (wave) wave.classList.add('hidden');
    if (btn) btn.innerHTML = '▶ Play Audio Tour';
    currentPlayingSpeech = null;
    return;
  }

  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      currentPlayingSpeech = id;
      if (wave) wave.classList.remove('hidden');
      if (btn) btn.innerHTML = '⏹ Stop Audio';
    };

    utterance.onend = () => {
      currentPlayingSpeech = null;
      if (wave) wave.classList.add('hidden');
      if (btn) btn.innerHTML = '▶ Play Audio Tour';
    };

    utterance.onerror = () => {
      currentPlayingSpeech = null;
      if (wave) wave.classList.add('hidden');
      if (btn) btn.innerHTML = '▶ Play Audio Tour';
    };

    window.speechSynthesis.speak(utterance);
  } else {
    alert("Audio speech synthesis is not supported on your current browser.");
  }
}

async function loadSafetyData(city) {
  try {
    const res = await fetch(`/api/safety?city=${city}`);
    safetyData = await res.json();
    renderHazardMarkers(safetyData.hazards);
    renderSafetySummary(safetyData);
  } catch (e) {
    console.error("Error loading safety data:", e);
  }
}

function renderSafetySummary(data) {
  const summaryEl = document.getElementById('safety-metrics-grid');
  if (!summaryEl) return;

  const totalHazards = (data.hazards || []).length;
  const criticals = (data.hazards || []).filter(h => h.severity === 'critical' || h.severity === 'high').length;

  summaryEl.innerHTML = `
    <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
      <span class="text-xs text-slate-400 block mb-1">Reported Caution Areas</span>
      <h3 class="text-2xl font-bold text-white">${totalHazards} <span class="text-xs text-slate-500 font-normal">Active Alerts</span></h3>
    </div>
    <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
      <span class="text-xs text-slate-400 block mb-1">High-Attention Choke Points</span>
      <h3 class="text-2xl font-bold text-red-400">${criticals} <span class="text-xs text-red-500 font-normal">Requires Care</span></h3>
    </div>
    <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
      <span class="text-xs text-slate-400 block mb-1">SafeWay Monitored Corridors</span>
      <h3 class="text-2xl font-bold text-emerald-400">92% <span class="text-xs text-emerald-500 font-normal">Illuminated</span></h3>
    </div>
  `;
}

window.loadPresetRoute = async function(routeKey) {
  try {
    const res = await fetch('/api/preset-routes');
    const presets = await res.json();
    const routeData = presets[routeKey];
    if (routeData) {
      renderDualRoute(routeData);
      renderRouteComparisonCard(routeData);
      showNotification(`Loaded Route: ${routeData.title}`, 'success');
    }
  } catch (e) {
    console.error(e);
  }
};

async function calculateCustomRoute(startLat, startLng, endLat, endLng, destName) {
  try {
    const res = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: window.currentCity,
        start_lat: startLat,
        start_lng: startLng,
        end_lat: endLat,
        end_lng: endLng,
        end_name: destName
      })
    });
    if (res.ok) {
      const data = await res.json();
      renderDualRoute(data);
      renderRouteComparisonCard(data);
      showNotification(`SafeWay route planned for ${destName}!`, 'success');
    }
  } catch (e) {
    console.error(e);
  }
}

function renderRouteComparisonCard(routeData) {
  const container = document.getElementById('route-comparison-details');
  if (!container) return;

  const fastest = routeData.fastest || routeData.fastest_route;
  const safest = routeData.safest || routeData.safest_route;

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- FASTEST ROUTE CARD -->
      <div class="glass-card p-4 rounded-xl border border-orange-500/40 relative">
        <div class="flex items-center justify-between mb-2">
          <span class="bg-orange-950 text-orange-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-orange-800">
            ⚡ Fastest Path (${fastest.duration_mins} mins)
          </span>
          <span class="text-xs font-bold text-orange-400">Safety: ${fastest.safety_score}/100</span>
        </div>
        <h4 class="font-bold text-white text-sm mb-1">${fastest.name || fastest.title}</h4>
        <div class="grid grid-cols-2 gap-2 text-[11px] mb-3 text-slate-300">
          <div>💡 Lighting: <strong>${fastest.lighting_score}%</strong></div>
          <div>📹 CCTV: <strong>${fastest.cctv_coverage}</strong></div>
          <div>👮 Police Presence: <strong>${fastest.police_presence}</strong></div>
          <div>📏 Distance: <strong>${fastest.distance_km || routeData.distance_km} km</strong></div>
        </div>
        <div class="bg-orange-950/30 p-2.5 rounded-lg border border-orange-900/50">
          <h5 class="text-[11px] font-bold text-orange-400 mb-1">⚠️ Hazard Observations:</h5>
          <ul class="text-[11px] text-slate-300 space-y-1 pl-1">
            ${(fastest.hazard_warnings || []).map(w => `<li>• ${escapeHtml(w)}</li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- SAFEST ROUTE CARD -->
      <div class="glass-card p-4 rounded-xl border border-emerald-500/50 bg-emerald-950/10 relative">
        <div class="flex items-center justify-between mb-2">
          <span class="bg-emerald-950 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-800">
            🛡️ SafeWay Verified (${safest.duration_mins} mins)
          </span>
          <span class="text-xs font-bold text-emerald-400">Safety: ${safest.safety_score}/100</span>
        </div>
        <h4 class="font-bold text-white text-sm mb-1">${safest.name || safest.title}</h4>
        <div class="grid grid-cols-2 gap-2 text-[11px] mb-3 text-slate-300">
          <div>💡 Lighting: <strong>${safest.lighting_score}%</strong></div>
          <div>📹 CCTV: <strong>${safest.cctv_coverage}</strong></div>
          <div>👮 Police Presence: <strong>${safest.police_presence}</strong></div>
          <div>📏 Distance: <strong>${safest.distance_km || routeData.distance_km} km</strong></div>
        </div>
        <div class="bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-900/50">
          <h5 class="text-[11px] font-bold text-emerald-400 mb-1">✓ Verified Safety Perks:</h5>
          <ul class="text-[11px] text-slate-300 space-y-1 pl-1">
            ${(safest.perks || []).map(p => `<li>• ${escapeHtml(p)}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
    <div class="mt-2 text-[10px] text-slate-400 italic text-center">
      Disclaimer: Routes and safety scores are indicative community advisories. Never guarantee 100% safety.
    </div>
  `;
}

async function loadBenchmarks(city) {
  try {
    const res = await fetch(`/api/benchmarks?city=${city}`);
    benchmarksData = await res.json();
    initCompareView(benchmarksData);
  } catch (e) {
    console.error("Error loading benchmarks:", e);
  }
}

async function loadSmartCityInsights(city) {
  try {
    const res = await fetch(`/api/smart-city?city=${city}`);
    smartCityData = await res.json();
    renderSmartCityFeed(smartCityData);
  } catch (e) {
    console.error("Error loading smart city insights:", e);
  }
}

function renderSmartCityFeed(data) {
  // Traffic Bottlenecks
  const trafficList = document.getElementById('traffic-bottlenecks-list');
  if (trafficList && data.traffic) {
    const list = data.traffic.active_bottlenecks || [];
    trafficList.innerHTML = list.map(b => `
      <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800">
        <div>
          <h5 class="text-xs font-bold text-white">${escapeHtml(b.location)}</h5>
          <span class="text-[11px] text-red-400 font-semibold">+${b.delay_mins} mins delay</span>
        </div>
        <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
          ${b.severity || 'Medium'}
        </span>
      </div>
    `).join('') || '<p class="text-xs text-slate-400 p-2">No active traffic bottlenecks reported.</p>';
  }

  // Social Sentiment Progress Bar
  const sentimentMeter = document.getElementById('sentiment-progress-bar');
  const sentimentStats = document.getElementById('sentiment-stats');
  if (data.analytics && data.analytics.sentiment_breakdown) {
    const s = data.analytics.sentiment_breakdown;
    if (sentimentMeter) {
      sentimentMeter.innerHTML = `
        <div class="bg-emerald-500 h-full" style="width: ${s.positive_pct}%" title="Positive ${s.positive_pct}%"></div>
        <div class="bg-amber-500 h-full" style="width: ${s.neutral_pct}%" title="Neutral ${s.neutral_pct}%"></div>
        <div class="bg-red-500 h-full" style="width: ${s.negative_pct}%" title="Alerted ${s.negative_pct}%"></div>
      `;
    }
    if (sentimentStats) {
      sentimentStats.innerText = `City Sentiment: ${s.dominant_mood} (${s.positive_pct}% Optimistic / ${s.negative_pct}% Alerted)`;
    }
  }

  // Social Feed
  const socialContainer = document.getElementById('social-feed-container');
  if (socialContainer && data.social_feed) {
    socialContainer.innerHTML = data.social_feed.map(post => `
      <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition">
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-blue-400">${escapeHtml(post.user)}</span>
            <span class="text-[10px] text-slate-500">• ${escapeHtml(post.platform)}</span>
          </div>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${post.sentiment_score > 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}">
            ${post.sentiment}
          </span>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed mb-1.5">${escapeHtml(post.text)}</p>
        <div class="flex items-center justify-between text-[10px] text-slate-500">
          <span>${post.timestamp}</span>
          <span>❤️ ${post.likes} &nbsp; 🔁 ${post.retweets}</span>
        </div>
      </div>
    `).join('');
  }
}

async function loadCitizenReports(city) {
  try {
    const res = await fetch(`/api/reports?city=${city}`);
    citizenReportsData = await res.json();
    renderCitizenReportsList(citizenReportsData);
  } catch (e) {
    console.error("Error loading citizen reports:", e);
  }
}

function renderCitizenReportsList(reports) {
  const container = document.getElementById('citizen-reports-list');
  if (!container) return;

  if (!reports || reports.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-400 glass-card rounded-xl">
        <p class="text-xs">No citizen reports filed for ${escapeHtml(window.currentCity)} yet. Be the first to submit a report!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = reports.map(r => `
    <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-4 justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded ${r.ai_urgency === 'Critical' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-blue-950 text-blue-400 border border-blue-800'}">
            ${r.category}
          </span>
          <span class="text-xs font-medium text-slate-400">• ${escapeHtml(r.location_name)}</span>
          <span class="text-[11px] text-slate-500">(${r.timestamp})</span>
        </div>
        <h4 class="font-bold text-white text-sm mb-1">${escapeHtml(r.title)}</h4>
        <p class="text-xs text-slate-300 mb-2 leading-relaxed">${escapeHtml(r.description)}</p>
        
        ${r.voice_note_transcript ? `
          <div class="bg-slate-950/70 p-2 rounded text-[11px] text-slate-300 border border-slate-800 flex items-center gap-2 mb-2">
            <span>🎙️ <em>"${escapeHtml(r.voice_note_transcript)}"</em></span>
          </div>
        ` : ''}

        <div class="flex items-center gap-3 text-[11px] text-slate-400">
          <span>Status: <strong class="text-emerald-400">${r.status}</strong></span>
          <span>By: ${escapeHtml(r.user_name)}</span>
          <span class="text-[10px] text-slate-500 italic">(${r.verification_type || 'Community Demo'})</span>
        </div>
      </div>

      <div class="flex flex-row md:flex-col items-center justify-between gap-2 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4 min-w-[120px]">
        <button onclick="upvoteReport('${r.id}')" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 w-full justify-center">
          👍 Verify (<span id="upvote-count-${r.id}">${r.upvotes}</span>)
        </button>
        <button onclick="window.panMapTo(${r.lat}, ${r.lng})" class="text-blue-400 hover:underline text-xs">
          View on Map
        </button>
      </div>
    </div>
  `).join('');
}

// Tab Switching
window.switchTab = function(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active-nav-tab'));

  const activeContent = document.getElementById(`tab-${tabName}`);
  const activeBtn = document.getElementById(`btn-tab-${tabName}`);

  if (activeContent) activeContent.classList.remove('hidden');
  if (activeBtn) activeBtn.classList.add('active-nav-tab');

  if (tabName === 'explore' || tabName === 'safety') {
    setTimeout(() => { if (map) map.invalidateSize(); }, 200);
  }
};

window.applyFilters = function() {
  const activeFilterBtn = document.querySelector('.filter-btn.active-filter');
  const cat = activeFilterBtn ? activeFilterBtn.dataset.category : 'all';
  const query = (document.getElementById('search-explore')?.value || '').toLowerCase().trim();

  let filtered = placesData;

  if (cat !== 'all') {
    if (cat === 'budget') {
      filtered = filtered.filter(p => p.is_budget_friendly || p.price_level === '$');
    } else if (cat === 'hidden_gem') {
      filtered = filtered.filter(p => p.is_hidden_gem || p.category === 'hidden_gem');
    } else if (cat === 'attraction' || cat === 'attractions') {
      filtered = filtered.filter(p => p.category === 'attraction' || p.category === 'historical' || p.category === 'scenic' || p.category === 'park');
    } else {
      filtered = filtered.filter(p => p.category === cat);
    }
  }

  if (query) {
    filtered = filtered.filter(p => 
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      (p.city && p.city.toLowerCase().includes(query)) ||
      (p.neighborhood && p.neighborhood.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query)) ||
      (p.sub_category && p.sub_category.toLowerCase().includes(query)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(query))) ||
      (p.amenities && p.amenities.some(a => a.toLowerCase().includes(query)))
    );
  }

  renderPlaceCards(filtered);
  renderPlaceMarkers(filtered);
};

window.clearFilters = function() {
  const searchInput = document.getElementById('search-explore');
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.remove('active-filter', 'bg-blue-600', 'text-white');
    b.classList.add('bg-slate-800', 'text-slate-300');
  });
  const allBtn = document.querySelector('.filter-btn[data-category="all"]');
  if (allBtn) {
    allBtn.classList.add('active-filter', 'bg-blue-600', 'text-white');
    allBtn.classList.remove('bg-slate-800', 'text-slate-300');
  }
  applyFilters();
};

window.openEmergencyModal = function() {
  document.getElementById('modal-sos').classList.remove('hidden');
};

window.triggerLiveSOS = async function() {
  const statusEl = document.getElementById('sos-dispatch-status');
  statusEl.classList.remove('hidden');
  statusEl.innerHTML = `
    <div class="p-3 bg-red-950/80 border border-red-700 rounded-lg text-xs text-red-200 animate-pulse">
      🚨 <strong>TRANSMITTING SIMULATED EMERGENCY BEACON...</strong><br>
      GPS coordinates flagged for ${escapeHtml(window.currentCity)} Police Dispatch.
    </div>
  `;

  try {
    const res = await fetch('/api/simulate-sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: window.currentCity })
    });
    const data = await res.json();
    setTimeout(() => {
      statusEl.innerHTML = `
        <div class="p-4 bg-emerald-950/90 border border-emerald-600 rounded-lg text-xs text-emerald-200">
          ✅ <strong>DISPATCH SIMULATED [${data.emergency_code}]</strong><br>
          ${escapeHtml(data.message)}<br>
          <strong>Nearest Hub:</strong> ${escapeHtml(data.nearest_police_station)}<br>
          <strong>Estimated Arrival:</strong> ${data.estimated_patrol_arrival}<br>
          <span class="text-[10px] text-slate-400 italic mt-1 block">(${data.disclaimer})</span>
        </div>
      `;
    }, 1200);
  } catch (e) {
    console.error(e);
  }
};

window.closeModal = function(id) {
  document.getElementById(id).classList.add('hidden');
};

function showNotification(msg, type = 'info') {
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  toast.className = `fixed bottom-6 right-6 ${bg} text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold z-[99999] transition transform duration-300 flex items-center gap-2`;
  toast.innerHTML = `<span>⚡</span> <span>${escapeHtml(msg)}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
