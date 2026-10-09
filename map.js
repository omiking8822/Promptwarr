// CityPulse 360 Map Manager with Google Earth Satellite Imagery & 3D Viewer
let map = null;
let currentTileLayer = null;
let markersLayerGroup = null;
let hazardsLayerGroup = null;
let routePolylines = [];
let routeMarkers = [];
let currentMapMode = 'satellite'; // Default to Google Earth Satellite!

const GOOGLE_EARTH_PUNE_URL = "https://earth.google.com/web/search/Pune,+Maharashtra/@18.5035801,73.8746239,584.0166196a,35272.37101018d,35y,0h,0t,0r/data=CjsaDQoJL20vMDE1eTJxGAIiJgokCQbwPfsBNTdAEQbwPfsBNTfAGc50t0M4dEpAIct0t0M4dErAQgIIAToDCgEwQgIIAEoNCP___________wEQAA";

const TILE_PROVIDERS = {
  // Google Earth Hybrid Satellite Imagery (High-Res Photorealistic Earth)
  satellite: {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    options: {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Earth Imagery'
    }
  },
  // OpenStreetMap Standard Cartography
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; OpenStreetMap contributors'
    }
  }
};

const MAP_FALLBACK_SVG = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22700%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%231e293b%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%2394a3b8%22%20font-family%3D%22system-ui%22%20font-size%3D%2222%22%20font-weight%3D%22bold%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%3E%F0%9F%8F%99%EF%B8%8F%20CityPulse%20360%3C%2Ftext%3E%3C%2Fsvg%3E";

function initMap(center = [19.0760, 72.8777], zoom = 13) {
  const mapElement = document.getElementById('map');
  if (!mapElement) return null;

  if (map) {
    map.remove();
  }

  try {
    map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView(center, zoom);

    // Zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Apply default tile layer (Google Earth Satellite)
    setTileProvider(currentMapMode);

    markersLayerGroup = L.layerGroup().addTo(map);
    hazardsLayerGroup = L.layerGroup().addTo(map);

    updateGoogleEarthLinks(center);

  } catch (err) {
    console.error("Map initialization error:", err);
  }

  return map;
}

function setTileProvider(mode) {
  currentMapMode = mode;
  if (currentTileLayer && map) {
    map.removeLayer(currentTileLayer);
  }

  const provider = TILE_PROVIDERS[mode] || TILE_PROVIDERS.satellite;
  currentTileLayer = L.tileLayer(provider.url, provider.options).addTo(map);

  // Update button active state
  document.querySelectorAll('.map-layer-btn').forEach(btn => {
    if (btn.dataset.mode === mode) {
      btn.className = "map-layer-btn px-2.5 py-1 rounded-md text-xs font-bold bg-blue-600 text-white shadow";
    } else {
      btn.className = "map-layer-btn px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700";
    }
  });
}

function switchMapMode(mode) {
  const mapContainer = document.getElementById('map');
  const earth3DContainer = document.getElementById('google-earth-3d-container');

  if (mode === 'earth_3d') {
    // Show 3D Satellite Embed View
    if (mapContainer) mapContainer.classList.add('hidden');
    if (earth3DContainer) earth3DContainer.classList.remove('hidden');
    
    // Update active button
    document.querySelectorAll('.map-layer-btn').forEach(btn => {
      if (btn.dataset.mode === 'earth_3d') {
        btn.className = "map-layer-btn px-2.5 py-1 rounded-md text-xs font-bold bg-blue-600 text-white shadow";
      } else {
        btn.className = "map-layer-btn px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700";
      }
    });

    updateGoogleEarthIframe();
  } else {
    // Show Leaflet Map (Satellite or Streets)
    if (earth3DContainer) earth3DContainer.classList.add('hidden');
    if (mapContainer) {
      mapContainer.classList.remove('hidden');
      if (map) map.invalidateSize();
    }
    setTileProvider(mode);
  }
}

function updateGoogleEarthIframe() {
  const iframe = document.getElementById('google-earth-embed-frame');
  const cityName = window.currentCity || "Pune";
  
  if (iframe) {
    // High-resolution satellite embed for this city
    const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(cityName)}&t=k&z=13&ie=UTF8&iwloc=&output=embed`;
    iframe.src = embedUrl;
  }
}

function updateGoogleEarthLinks(center) {
  const cityName = window.currentCity || "Pune";
  const earthBtn = document.getElementById('btn-open-google-earth');
  
  if (earthBtn) {
    if (cityName.toLowerCase() === "pune") {
      earthBtn.href = GOOGLE_EARTH_PUNE_URL;
    } else {
      const lat = center ? center[0] : 18.5204;
      const lng = center ? center[1] : 73.8567;
      earthBtn.href = `https://earth.google.com/web/search/${encodeURIComponent(cityName)}/@${lat},${lng},500a,35000d,35y,0h,0t,0r`;
    }
  }
}

function getIconForCategory(category, isGem) {
  if (isGem) return { icon: '💎', className: 'pin-gem' };
  switch (category) {
    case 'food': return { icon: '🍔', className: 'pin-food' };
    case 'hidden_gem': return { icon: '💎', className: 'pin-gem' };
    case 'historical': return { icon: '🏛️', className: 'pin-heritage' };
    case 'hotel': return { icon: '🏨', className: 'pin-hotel' };
    case 'scenic': return { icon: '🌅', className: 'pin-attraction' };
    case 'park': return { icon: '🍃', className: 'pin-attraction' };
    default: return { icon: '📍', className: 'pin-attraction' };
  }
}

function renderPlaceMarkers(places) {
  if (!markersLayerGroup) return;
  markersLayerGroup.clearLayers();

  if (!places || places.length === 0) return;

  const latLngs = [];

  places.forEach(place => {
    if (!place.lat || !place.lng) return;

    const iconMeta = getIconForCategory(place.category, place.is_hidden_gem);
    
    const customIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `<div class="custom-pin ${iconMeta.className}" style="width: 34px; height: 34px; font-size: 15px; box-shadow: 0 4px 14px rgba(0,0,0,0.7);" title="${escapeHtml(place.name)}">${iconMeta.icon}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([place.lat, place.lng], { icon: customIcon });
    latLngs.push([place.lat, place.lng]);

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

    const popupHtml = `
      <div class="p-3 w-64 bg-slate-900 text-white rounded-lg">
        <div class="relative h-28 w-full rounded-md overflow-hidden mb-2 bg-slate-800">
          <img src="${place.image_url}" alt="${escapeHtml(place.name)}" 
               onerror="this.onerror=null; this.src='${MAP_FALLBACK_SVG}';"
               class="w-full h-full object-cover">
          <span class="absolute top-2 left-2 bg-blue-600/90 text-xs px-2 py-0.5 rounded-full font-medium">
            ${place.sub_category || place.category}
          </span>
          ${place.is_hidden_gem ? '<span class="absolute top-2 right-2 bg-purple-600/90 text-xs px-2 py-0.5 rounded-full font-medium">💎 Gem</span>' : ''}
        </div>
        <h4 class="font-bold text-sm text-white mb-1 leading-snug">${escapeHtml(place.name)}</h4>
        <div class="flex items-center text-xs text-slate-300 gap-2 mb-1.5">
          <span class="text-amber-400 font-semibold">★ ${place.rating}</span>
          <span class="text-[10px] text-slate-400">(${place.rating_label || 'Sample Rating'})</span>
          <span>•</span>
          <span class="text-emerald-400 font-medium">${place.avg_cost_for_two}</span>
        </div>
        <p class="text-xs text-slate-300 line-clamp-2 mb-2 leading-relaxed">${escapeHtml(place.description)}</p>
        <div class="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
          <button onclick="window.selectPlaceDetail('${place.id}')" class="text-blue-400 hover:text-blue-300 font-semibold underline">Details →</button>
          <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
            🧭 Directions
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    markersLayerGroup.addLayer(marker);
  });

  // Fit bounds to markers if multiple places exist
  if (latLngs.length > 1 && map) {
    try {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } catch (e) {
      console.warn("Bounds fitting error:", e);
    }
  }
}

function renderHazardMarkers(hazards) {
  if (!hazardsLayerGroup) return;
  hazardsLayerGroup.clearLayers();

  if (!hazards || hazards.length === 0) return;

  hazards.forEach(hazard => {
    if (!hazard.lat || !hazard.lng) return;

    const customIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `<div class="custom-pin pin-hazard animate-pulse" style="width: 30px; height: 30px; font-size: 14px; box-shadow: 0 4px 14px rgba(239,68,68,0.7);" title="Caution Zone">⚠️</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker([hazard.lat, hazard.lng], { icon: customIcon });

    const popupHtml = `
      <div class="p-3 w-64 bg-slate-900 text-white rounded-lg border-l-4 border-red-500">
        <div class="flex items-center justify-between mb-1">
          <span class="bg-red-950 text-red-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
            ${hazard.severity || 'Caution'} Severity
          </span>
          <span class="text-[10px] text-slate-400">Reports: ${hazard.reported_count || 12}</span>
        </div>
        <h4 class="font-bold text-xs text-red-300 mb-1 leading-snug">${escapeHtml(hazard.title)}</h4>
        <p class="text-xs text-slate-300 mb-2 leading-relaxed">${escapeHtml(hazard.description)}</p>
        <div class="bg-slate-800/80 p-2 rounded text-[11px] text-slate-300 mb-1.5">
          <strong class="text-amber-400">💡 Advice:</strong> ${escapeHtml(hazard.safe_alternative_advice)}
        </div>
        <div class="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
          <span>Station: ${escapeHtml(hazard.police_station_nearby)}</span>
          <span>(${hazard.distance_to_police})</span>
        </div>
        <div class="mt-1 text-[9px] text-slate-500 italic">
          Disclaimer: Community advisory. Never guarantees 100% safety.
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    hazardsLayerGroup.addLayer(marker);
  });
}

function clearRoutes() {
  routePolylines.forEach(line => { if (map) map.removeLayer(line); });
  routeMarkers.forEach(m => { if (map) map.removeLayer(m); });
  routePolylines = [];
  routeMarkers = [];
}

function renderDualRoute(routeData) {
  clearRoutes();

  const fastest = routeData.fastest || routeData.fastest_route;
  const safest = routeData.safest || routeData.safest_route;

  // 1. Draw Fastest Route (Orange dashed polyline)
  if (fastest && fastest.waypoints) {
    const fastPolyline = L.polyline(fastest.waypoints, {
      color: '#f97316',
      weight: 5,
      opacity: 0.9,
      dashArray: '8, 8'
    }).addTo(map);
    fastPolyline.bindTooltip(`⚡ Fastest: ${fastest.duration_mins} mins (Safety Index: ${fastest.safety_score}/100)`, { permanent: false });
    routePolylines.push(fastPolyline);
  }

  // 2. Draw Safest Route (Emerald Green solid glowing line)
  if (safest && safest.waypoints) {
    const safePolyline = L.polyline(safest.waypoints, {
      color: '#10b981',
      weight: 6,
      opacity: 0.95
    }).addTo(map);
    safePolyline.bindTooltip(`🛡️ SafeWay Verified: ${safest.duration_mins} mins (Safety Index: ${safest.safety_score}/100)`, { permanent: true, direction: 'top' });
    routePolylines.push(safePolyline);

    // Zoom map to fit route
    map.fitBounds(safePolyline.getBounds(), { padding: [50, 50] });
  }

  // Add Start and End Pins
  if (safest && safest.waypoints && safest.waypoints.length > 0) {
    const startPt = safest.waypoints[0];
    const endPt = safest.waypoints[safest.waypoints.length - 1];

    const startIcon = L.divIcon({
      html: '<div class="custom-pin" style="background:#3b82f6; width:28px; height:28px;">🟢</div>',
      iconSize: [28, 28]
    });
    const endIcon = L.divIcon({
      html: '<div class="custom-pin" style="background:#ef4444; width:28px; height:28px;">🏁</div>',
      iconSize: [28, 28]
    });

    const mStart = L.marker(startPt, { icon: startIcon }).bindPopup('<b>Route Origin</b>').addTo(map);
    const mEnd = L.marker(endPt, { icon: endIcon }).bindPopup('<b>Destination</b>').addTo(map);

    routeMarkers.push(mStart, mEnd);
  }
}

function flyToCoordinate(lat, lng, zoom = 16) {
  if (currentMapMode === 'earth_3d') {
    switchMapMode('satellite');
  }
  if (map) {
    map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

window.switchMapMode = switchMapMode;
window.updateGoogleEarthIframe = updateGoogleEarthIframe;
window.updateGoogleEarthLinks = updateGoogleEarthLinks;

