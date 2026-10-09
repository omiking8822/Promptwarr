import os
import datetime
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional, List

from app.models import (
    CitizenReportCreate,
    CitizenReport,
    RouteRequest,
    AIChatRequest
)
from app.data_store import (
    CITIES_METADATA,
    PLACES_DB,
    HERITAGE_DB,
    SAFETY_HAZARDS_DB,
    BENCHMARKS_DB,
    CITIZEN_REPORTS_DB,
    SOCIAL_FEED_DB,
    PRESET_ROUTES
)
from app.ai_engine import (
    classify_citizen_report,
    get_urban_pulse_analytics,
    evaluate_safety_route,
    pulsebot_nlp_response
)

app = FastAPI(
    title="CityPulse 360 Multi-City API",
    description="Intelligent Multi-City Exploration, Safety Navigator & Smart City Platform",
    version="2.0.0"
)

# Enable CORS for easy development & testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files directory
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

def normalize_city_name(city_name: str) -> str:
    """Normalize input city string to match CITIES_METADATA keys"""
    if not city_name:
        return "Mumbai"
    cleaned = city_name.strip().lower()
    for key, data in CITIES_METADATA.items():
        if key.lower() == cleaned:
            return key
        if cleaned in data.get("display_name", "").lower():
            return key
        if cleaned.startswith(key.lower()) or key.lower() in cleaned:
            return key
    return "Mumbai"

# --- API ENDPOINTS ---

@app.get("/api/cities")
def get_cities(detailed: bool = False):
    """List all supported cities (supports both string list and detailed objects)"""
    if detailed:
        return [
            {
                "id": c["id"],
                "name": c["name"],
                "display_name": c["display_name"],
                "state": c["state"],
                "center": c["center"],
                "default_zoom": c["default_zoom"],
                "tagline": c["tagline"]
            }
            for c in CITIES_METADATA.values()
        ]
    return list(CITIES_METADATA.keys())

@app.get("/api/cities-detail")
def get_cities_detailed():
    """List all supported cities with complete metadata and coordinates"""
    return [
        {
            "id": c["id"],
            "name": c["name"],
            "display_name": c["display_name"],
            "state": c["state"],
            "center": c["center"],
            "default_zoom": c["default_zoom"],
            "tagline": c["tagline"],
            "travel_info": c["travel_info"]
        }
        for c in CITIES_METADATA.values()
    ]

@app.get("/api/city/{city_name}")
def get_city_details(city_name: str):
    """Get metadata, weather, traffic, and SOS contacts for a city"""
    norm_city = normalize_city_name(city_name)
    return CITIES_METADATA[norm_city]

@app.get("/api/explore")
def get_places(
    city: str = "Mumbai",
    category: Optional[str] = None,
    budget_friendly: Optional[bool] = None,
    hidden_gem: Optional[bool] = None,
    search: Optional[str] = None
):
    """Filter and explore food, cafes, stays, and attractions strictly for the selected city"""
    norm_city = normalize_city_name(city)
    results = [p for p in PLACES_DB if p.get("city", "").lower() == norm_city.lower()]
    
    if category and category != "all":
        cat_lower = category.lower().strip()
        if cat_lower in ["food", "dining", "street_food"]:
            results = [p for p in results if p.get("category") == "food"]
        elif cat_lower in ["hidden_gem", "hidden_gems", "gem", "gems"]:
            results = [p for p in results if p.get("category") == "hidden_gem" or p.get("is_hidden_gem")]
        elif cat_lower in ["historical", "historical_places", "heritage"]:
            results = [p for p in results if p.get("category") == "historical"]
        elif cat_lower in ["hotel", "hotels", "stays", "stay", "hostel", "hostels"]:
            results = [p for p in results if p.get("category") == "hotel"]
        elif cat_lower in ["scenic", "scenic_promenades", "promenade", "promenades"]:
            results = [p for p in results if p.get("category") == "scenic"]
        elif cat_lower in ["park", "parks", "parks_gardens", "gardens"]:
            results = [p for p in results if p.get("category") == "park"]
        elif cat_lower in ["budget", "budget_friendly"]:
            results = [p for p in results if p.get("is_budget_friendly") or p.get("price_level") == "$"]
        elif cat_lower in ["attraction", "attractions", "tourist_attraction", "tourist_attractions"]:
            results = [p for p in results if p.get("category") in ["historical", "scenic", "park"]]
        else:
            results = [p for p in results if p.get("category") == category]
            
    if budget_friendly is not None and budget_friendly:
        results = [p for p in results if p.get("is_budget_friendly") is True or p.get("price_level") == "$"]
    if hidden_gem is not None and hidden_gem:
        results = [p for p in results if p.get("is_hidden_gem") is True or p.get("category") == "hidden_gem"]
        
    if search:
        s = search.lower().strip()
        results = [
            p for p in results
            if s in p.get("name", "").lower()
            or s in p.get("description", "").lower()
            or s in p.get("category", "").lower()
            or s in p.get("sub_category", "").lower()
            or s in p.get("city", "").lower()
            or s in p.get("neighborhood", "").lower()
            or any(s in t.lower() for t in p.get("tags", []))
            or any(s in a.lower() for a in p.get("amenities", []))
        ]
    return results

@app.get("/api/places/{place_id}")
def get_place_detail(place_id: str):
    for p in PLACES_DB:
        if p["id"] == place_id:
            return p
    raise HTTPException(status_code=404, detail="Place not found")

@app.get("/api/culture")
def get_culture_sites(city: str = "Mumbai", search: Optional[str] = None):
    """Retrieve historical landmarks, cultural traditions, and audio scripts"""
    norm_city = normalize_city_name(city)
    results = [h for h in HERITAGE_DB if h.get("city", "").lower() == norm_city.lower()]

    # Fallback to historical places in PLACES_DB if dedicated heritage DB has none for this city
    if not results:
        for p in PLACES_DB:
            if p.get("city", "").lower() == norm_city.lower() and p.get("category") in ["historical", "scenic"]:
                results.append({
                    "id": f"her_{p['id']}",
                    "name": p["name"],
                    "city": p["city"],
                    "state": p.get("state", ""),
                    "era_or_year": "Historic Landmark",
                    "architectural_style": p.get("sub_category", "Traditional Cultural Heritage"),
                    "lat": p["lat"],
                    "lng": p["lng"],
                    "address": p["address"],
                    "neighborhood": p["neighborhood"],
                    "significance": p["description"],
                    "historical_story": p["description"],
                    "audio_guide_transcript": f"Welcome to {p['name']}, a celebrated cultural treasure in {p['city']}. Notice the architectural balance and cultural legacy of this historic site.",
                    "cultural_tradition": "Heritage preservation & local cultural gatherings",
                    "visiting_etiquette": p.get("etiquette_tip", "Respect historic site guidelines; modest attire recommended."),
                    "entry_fee": p.get("avg_cost_for_two", "Free / Nominal Entry"),
                    "best_photography_spot": "From the front promenade at golden hour",
                    "image_url": p["image_url"]
                })

    if search:
        s = search.lower()
        results = [
            h for h in results
            if s in h.get("name", "").lower()
            or s in h.get("historical_story", "").lower()
            or s in h.get("architectural_style", "").lower()
        ]
    return results

@app.get("/api/safety")
def get_safety_data(city: str = "Mumbai"):
    """Get reported unsafe areas, accident blackspots, and police booths"""
    norm_city = normalize_city_name(city)
    hazards = [h for h in SAFETY_HAZARDS_DB if h.get("city", "").lower() == norm_city.lower()]
    city_meta = CITIES_METADATA.get(norm_city, CITIES_METADATA["Mumbai"])
    
    # Generate realistic caution zones if none are explicitly listed
    if not hazards:
        bottlenecks = city_meta.get("traffic", {}).get("active_bottlenecks", [])
        for idx, b in enumerate(bottlenecks):
            hazards.append({
                "id": f"haz_{norm_city.lower()}_{idx+1}",
                "title": f"{b['location']} - Traffic Choke-Point",
                "city": norm_city,
                "hazard_type": "traffic_bottleneck",
                "severity": b.get("severity", "medium").lower(),
                "lat": city_meta["center"][0] + (idx * 0.007),
                "lng": city_meta["center"][1] + (idx * 0.007),
                "location_name": b["location"],
                "description": f"Reported delay of +{b['delay_mins']} mins. Commuters advised to exercise crossing caution.",
                "reported_count": 35 + (idx * 8),
                "safe_alternative_advice": "Divert through arterial bypasses or allow extra travel buffer.",
                "police_station_nearby": f"{norm_city} Traffic Police Station",
                "distance_to_police": "400 meters",
                "status_label": "Reported Caution Zone (Community Advisory)"
            })

    return {
        "city": norm_city,
        "disclaimer": "Reported safety hazard advisory based on citizen observations. Never guarantee that any route is 100% safe.",
        "hazards": hazards,
        "sos_contacts": city_meta.get("sos_contacts", []),
        "safety_summary": {
            "total_hazards_mapped": len(hazards),
            "critical_waterlogging_zones": sum(1 for h in hazards if h["hazard_type"] == "waterlogging"),
            "high_accident_intersections": sum(1 for h in hazards if h["hazard_type"] in ["accident_prone", "traffic_bottleneck"]),
            "night_patrol_active": True
        }
    }

@app.get("/api/preset-routes")
def get_preset_routes(city: Optional[str] = None):
    """Retrieve pre-calculated routes for demo"""
    if city:
        norm_city = normalize_city_name(city)
        filtered = {k: v for k, v in PRESET_ROUTES.items() if v.get("city", "").lower() == norm_city.lower()}
        if filtered:
            return filtered
    return PRESET_ROUTES

@app.post("/api/route")
def calculate_route(request: RouteRequest):
    """Calculate Dual Routing: Fastest Route vs SafeWay Advisory Route"""
    norm_city = normalize_city_name(request.city)
    # Check if request matches a preset route
    if norm_city == "Mumbai" and request.start_lat == 18.9400 and request.end_lat == 18.9220:
        return PRESET_ROUTES["mum_cst_to_gateway"]
    elif norm_city == "Pune" and request.start_lat == 18.5228 and request.end_lat == 18.5196:
        return PRESET_ROUTES["pune_fc_to_shaniwar"]

    return evaluate_safety_route(
        request.start_lat,
        request.start_lng,
        request.end_lat,
        request.end_lng,
        norm_city
    )

@app.get("/api/benchmarks")
def get_neighborhood_benchmarks(city: str = "Mumbai"):
    """Compare locations based on safety, cleanliness, affordability, ratings, and transit"""
    norm_city = normalize_city_name(city)
    results = [b for b in BENCHMARKS_DB if b.get("city", "").lower() == norm_city.lower()]
    
    # If no custom benchmarks, synthesize two representative districts for side-by-side comparison
    if len(results) < 2:
        city_meta = CITIES_METADATA.get(norm_city, CITIES_METADATA["Mumbai"])
        results = [
            {
                "id": f"{norm_city.lower()}_bench_core",
                "name": f"{norm_city} Historic Core & Bazaars",
                "city": norm_city,
                "safety_score": 88,
                "cleanliness_score": 78,
                "aqi_level": city_meta.get("aqi", 100),
                "affordability_score": 85,
                "rating_score": 4.6,
                "transit_accessibility": 94,
                "nightlife_vibe": 80,
                "pros": ["High density of iconic food stalls and heritage markets", "Dense public transit and auto availability", "Bustling community energy"],
                "cons": ["Narrow lanes get congested during peak shopping hours", "Limited dedicated parking spaces"],
                "summary": f"The traditional cultural and commercial heart of {norm_city}. Highly affordable and vibrant.",
                "recommended_for": ["Street Food Seekers", "Heritage Explorers", "Budget Travelers"],
                "basis_of_comparison": "Aggregated civic accessibility, transit links, crowd reports & local indices"
            },
            {
                "id": f"{norm_city.lower()}_bench_suburb",
                "name": f"{norm_city} Modern Suburbs & Tech Corridor",
                "city": norm_city,
                "safety_score": 93,
                "cleanliness_score": 89,
                "aqi_level": max(50, city_meta.get("aqi", 100) - 20),
                "affordability_score": 55,
                "rating_score": 4.7,
                "transit_accessibility": 82,
                "nightlife_vibe": 90,
                "pros": ["Wider tree-lined avenues with modern lighting", "Contemporary cafes, lounges, and shopping complexes", "High security surveillance across residential colonies"],
                "cons": ["Higher dining and lodging cost tier", "Peak rush delays along highway approach flyovers"],
                "summary": f"The contemporary lifestyle and business hub of {norm_city}. Modern, clean, and secure.",
                "recommended_for": ["Families", "Business Travelers", "Cafe Hoppers"],
                "basis_of_comparison": "Aggregated civic accessibility, transit links, crowd reports & local indices"
            }
        ]
    return results

@app.get("/api/smart-city")
def get_smart_city_insights(city: str = "Mumbai"):
    """Traffic updates, weather alerts, social media sentiment, and urban analytics"""
    norm_city = normalize_city_name(city)
    city_meta = CITIES_METADATA.get(norm_city, CITIES_METADATA["Mumbai"])
    social_posts = [s for s in SOCIAL_FEED_DB if s.get("city", "").lower() == norm_city.lower()]
    
    # Generic sample post if none for this city
    if not social_posts:
        social_posts = [
            {
                "id": f"soc_{norm_city.lower()}_1",
                "city": norm_city,
                "platform": "Community Social Stream",
                "user": f"@{norm_city.lower()}_wanderer",
                "text": f"Enjoying a lovely afternoon exploring {norm_city}! The heritage landmarks and street flavors are unmatched. 🌟 #Explore{norm_city}",
                "sentiment": "Delighted / Inspired",
                "sentiment_score": 0.92,
                "timestamp": "20 mins ago",
                "likes": 210,
                "retweets": 24
            }
        ]

    analytics = get_urban_pulse_analytics(norm_city)
    
    return {
        "city": norm_city,
        "data_notice": "Telemetry and weather values represent sample / demo values. External live sensors not connected.",
        "weather": city_meta.get("weather"),
        "aqi": city_meta.get("aqi"),
        "aqi_status": city_meta.get("aqi_status"),
        "traffic": city_meta.get("traffic"),
        "social_feed": social_posts,
        "analytics": analytics
    }

@app.get("/api/reports")
def get_citizen_reports(city: str = "Mumbai"):
    """Get crowdsourced citizen reports with photo/voice info"""
    norm_city = normalize_city_name(city)
    reports = [r for r in CITIZEN_REPORTS_DB if r.get("city", "").lower() == norm_city.lower()]
    return reports

@app.post("/api/reports")
def create_citizen_report(report_data: CitizenReportCreate):
    """Submit a citizen report with AI NLP classification & urgency tagging"""
    norm_city = normalize_city_name(report_data.city)
    ai_classification = classify_citizen_report(
        report_data.title,
        report_data.description,
        report_data.category
    )
    
    new_report_id = f"rep_{len(CITIZEN_REPORTS_DB) + 101}"
    now_str = "Just now"

    new_report = {
        "id": new_report_id,
        "city": norm_city,
        "category": report_data.category,
        "title": report_data.title,
        "description": report_data.description,
        "lat": report_data.lat,
        "lng": report_data.lng,
        "location_name": report_data.location_name,
        "image_url": report_data.image_url or "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80",
        "voice_note_transcript": report_data.voice_note_transcript,
        "user_name": report_data.user_name or "Anonymous Citizen",
        "timestamp": now_str,
        "status": "Verified by Community" if ai_classification["ai_urgency"] != "Critical" else "Dispatched to Authority",
        "upvotes": 1,
        "ai_urgency": ai_classification["ai_urgency"],
        "sentiment": ai_classification["sentiment"],
        "dispatch_department": ai_classification["dispatch_department"],
        "verification_type": "Unverified Citizen Submission (Demo)"
    }
    
    CITIZEN_REPORTS_DB.insert(0, new_report)
    return new_report

@app.post("/api/reports/{report_id}/upvote")
def upvote_report(report_id: str):
    for r in CITIZEN_REPORTS_DB:
        if r["id"] == report_id:
            r["upvotes"] += 1
            if r["upvotes"] >= 5 and r["status"] == "Under Review":
                r["status"] = "Verified by Community"
            return {"success": True, "upvotes": r["upvotes"], "status": r["status"]}
    raise HTTPException(status_code=404, detail="Report not found")

@app.post("/api/ai-chat")
def ai_chat_assistant(request: AIChatRequest):
    """PulseBot Local NLP Recommendation Assistant"""
    norm_city = normalize_city_name(request.city or "Mumbai")
    response = pulsebot_nlp_response(request.query, norm_city)
    return response

@app.post("/api/simulate-sos")
def simulate_sos_alert(lat: float = 18.9400, lng: float = 72.8353, city: str = "Mumbai"):
    """Emergency SOS Beacon Simulation"""
    norm_city = normalize_city_name(city)
    city_meta = CITIES_METADATA.get(norm_city, CITIES_METADATA["Mumbai"])
    return {
        "status": "SOS_DISPATCHED",
        "emergency_code": f"EMG-{int(datetime.datetime.now().timestamp())}",
        "message": f"Emergency beacon simulated for {norm_city} at coordinates ({lat:.4f}, {lng:.4f}). GPS coordinates flagged for local police control.",
        "nearest_police_station": f"{norm_city} Central Police Station",
        "estimated_patrol_arrival": "4 to 7 minutes (Simulated)",
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "disclaimer": "This is a simulated emergency beacon for demonstration purposes."
    }

# Serve static frontend
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "CityPulse API is running. Build frontend static files."}
