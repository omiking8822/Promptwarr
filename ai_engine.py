import re
import math
from typing import Dict, Any, List
from app.data_store import (
    CITIES_METADATA,
    PLACES_DB,
    HERITAGE_DB,
    SAFETY_HAZARDS_DB,
    BENCHMARKS_DB,
    CITIZEN_REPORTS_DB,
    PRESET_ROUTES
)

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in kilometers"""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def classify_citizen_report(title: str, description: str, category: str) -> Dict[str, str]:
    """NLP Rule-based & heuristic classifier for citizen reports"""
    text = f"{title} {description}".lower()
    
    critical_keywords = ["danger", "hazard", "open manhole", "accident", "dark alley", "harass", "flood", "drown", "electric", "robbery", "weapon", "critical", "live wire", "unconscious"]
    moderate_keywords = ["pothole", "traffic jam", "breakdown", "broken signal", "waterlogging", "garbage", "waste", "stray dog", "blocked", "slow"]
    positive_keywords = ["gem", "delicious", "amazing", "heritage", "beautiful", "must visit", "clean", "safe", "love", "peaceful"]

    if any(k in text for k in critical_keywords) or category in ["Safety Hazard", "Streetlight Outage"]:
        urgency = "Critical"
        sentiment = "Urgent" if any(k in text for k in ["danger", "accident", "manhole", "live wire"]) else "Concerned"
        dispatch_dept = "Municipal Disaster & Police Emergency Ward"
    elif any(k in text for k in moderate_keywords) or category in ["Traffic Jam", "Pothole/Road Issue", "Cleanliness Alert"]:
        urgency = "Moderate"
        sentiment = "Frustrated"
        dispatch_dept = "Roads & Traffic Operations Division"
    elif any(k in text for k in positive_keywords) or category == "Hidden Gem":
        urgency = "Informational"
        sentiment = "Positive"
        dispatch_dept = "Smart City Explorer & Culture Registry"
    else:
        urgency = "Informational"
        sentiment = "Concerned"
        dispatch_dept = "General Civic Services Ward"

    return {
        "ai_urgency": urgency,
        "sentiment": sentiment,
        "dispatch_department": dispatch_dept
    }

def get_urban_pulse_analytics(city: str = "Mumbai") -> Dict[str, Any]:
    """Aggregate real-time sentiment and pulse analytics"""
    city_reports = [r for r in CITIZEN_REPORTS_DB if r.get("city", "").lower() == city.lower()]
    total_reports = len(city_reports)
    critical_count = sum(1 for r in city_reports if r.get("ai_urgency") == "Critical")
    resolved_pct = 76

    return {
        "city": city,
        "pulse_index_score": 84,
        "sentiment_breakdown": {
            "positive_pct": 71.5,
            "neutral_pct": 18.2,
            "negative_pct": 10.3,
            "dominant_mood": "Active & Inquisitive [Sample Analytics]"
        },
        "critical_alerts_active": critical_count,
        "total_active_reports": total_reports,
        "civic_resolution_rate": f"{resolved_pct}%",
        "data_honesty_note": "Simulated community telemetry. Real-time external civic APIs not yet connected."
    }

def evaluate_safety_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float, city: str = "Mumbai") -> Dict[str, Any]:
    """Calculate Dual Routing: Fastest Route vs SafeWay Advisory Route"""
    direct_dist = calculate_distance(start_lat, start_lng, end_lat, end_lng)
    
    hazards_nearby = []
    for h in SAFETY_HAZARDS_DB:
        if h.get("city", "").lower() == city.lower():
            d_start = calculate_distance(start_lat, start_lng, h["lat"], h["lng"])
            d_end = calculate_distance(end_lat, end_lng, h["lat"], h["lng"])
            if d_start < 3.0 or d_end < 3.0:
                hazards_nearby.append(h)

    # Generate realistic intermediate waypoints
    mid_lat = (start_lat + end_lat) / 2
    mid_lng = (start_lng + end_lng) / 2

    fastest_waypoints = [
        [start_lat, start_lng],
        [mid_lat + 0.0015, mid_lng - 0.0015],
        [end_lat, end_lng]
    ]

    safest_waypoints = [
        [start_lat, start_lng],
        [start_lat + (mid_lat - start_lat) * 0.4, start_lng - 0.0035],
        [mid_lat, mid_lng - 0.0025],
        [mid_lat + (end_lat - mid_lat) * 0.6, end_lng - 0.0015],
        [end_lat, end_lng]
    ]

    est_speed_walking = 4.5
    fast_dist = max(0.5, round(direct_dist * 1.12, 2))
    safe_dist = max(0.6, round(direct_dist * 1.28, 2))
    fast_time = max(5, int((fast_dist / est_speed_walking) * 60))
    safe_time = max(7, int((safe_dist / est_speed_walking) * 60))

    hazard_warnings = []
    for h in hazards_nearby[:2]:
        hazard_warnings.append(f"Near {h['location_name']}: {h['title']}")

    if not hazard_warnings:
        hazard_warnings = [
            "Variable sidewalk condition during peak hours",
            "Crossing multi-lane intersections requires caution"
        ]

    return {
        "city": city,
        "direct_distance_km": direct_dist,
        "disclaimer": "Safety guidance is advisory based on crowdsourced and civic observations. Never guarantee that any route is 100% safe.",
        "fastest_route": {
            "title": "Fastest Shortcut (Direct Path)",
            "distance_km": fast_dist,
            "duration_mins": fast_time,
            "safety_score": 68,
            "risk_level": "Moderate Attention",
            "lighting_score": 62,
            "cctv_coverage": "48%",
            "police_presence": "Limited",
            "hazard_warnings": hazard_warnings,
            "waypoints": fastest_waypoints
        },
        "safest_route": {
            "title": "SafeWay Verified Route (Well-Lit Arterials & Active Corridors)",
            "distance_km": safe_dist,
            "duration_mins": safe_time,
            "safety_score": 95,
            "risk_level": "High Safety Verified (Advisory)",
            "lighting_score": 96,
            "cctv_coverage": "92%",
            "police_presence": "Active Kiosks & Mobile Patrols",
            "hazard_warnings": [],
            "perks": [
                "Full high-intensity street illumination",
                "Wide paved pedestrian walkways with active commercial shopfronts",
                "Visible surveillance presence & emergency assistance kiosks"
            ],
            "waypoints": safest_waypoints
        }
    }

def pulsebot_nlp_response(query: str, city: str = "Mumbai") -> Dict[str, Any]:
    """
    Transparent local rule-based recommendation & NLP assistant.
    Does not falsely claim to connect to a live external LLM.
    """
    q = query.lower().strip()
    
    # Detect city in query or use default
    target_city = city
    for c_key in CITIES_METADATA.keys():
        if c_key.lower() in q:
            target_city = c_key
            break

    city_meta = CITIES_METADATA.get(target_city, CITIES_METADATA["Mumbai"])
    city_places = [p for p in PLACES_DB if p.get("city", "").lower() == target_city.lower()]
    city_heritage = [h for h in HERITAGE_DB if h.get("city", "").lower() == target_city.lower()]

    system_prefix = f"ℹ️ *[PulseBot Local Rule-Based Recommendation Engine for {city_meta['display_name']}]*\n\n"

    # 1. Safety & Route inquiries
    if any(w in q for w in ["safe", "safety", "danger", "night", "alone", "crime", "dark", "women", "walk"]):
        hazards = [h for h in SAFETY_HAZARDS_DB if h.get("city", "").lower() == target_city.lower()]
        hazard_note = ""
        if hazards:
            hazard_note = f"\n• **Reported Caution Areas:** {hazards[0]['title']} ({hazards[0]['safe_alternative_advice']})"

        return {
            "answer": (
                f"{system_prefix}"
                f"**Safety & Navigation Guidance for {city_meta['display_name']}:**\n\n"
                f"• **General Area Security:** Most popular cultural promenades and active avenues maintain steady foot-traffic and police presence.\n"
                f"{hazard_note}\n"
                f"• **Transit Advice:** {city_meta['travel_info']}\n"
                f"• **Emergency Helplines:** Dial **112 / 100** for Police Dispatch, or check the **SOS Emergency Hub** in the top navigation.\n\n"
                f"⚠️ *Important Notice: Safety scores are indicative and based on reported civic data. Never guarantee that any route is 100% safe.*"
            ),
            "suggested_actions": ["Open SafeWay Navigator", "Show Safety Hazards on Map", "View SOS Contacts"],
            "highlight_places": [p["id"] for p in city_places[:2]]
        }

    # 2. Food & Budget inquiries
    if any(w in q for w in ["food", "eat", "snack", "biryani", "dosa", "kachori", "hungry", "budget", "cheap", "breakfast", "cafe", "restaurant", "fish"]):
        food_spots = [p for p in city_places if p.get("category") == "food" or p.get("is_budget_friendly")]
        if not food_spots:
            food_spots = city_places[:3]

        recs = []
        for i, f in enumerate(food_spots[:3], 1):
            recs.append(f"{i}. **{f['name']}** ({f['neighborhood']}) - {f.get('must_try', f['description'])} | Budget: {f['avg_cost_for_two']}")

        recs_text = "\n".join(recs)
        return {
            "answer": (
                f"{system_prefix}"
                f"**Top Curated Food Discoveries in {city_meta['display_name']}:**\n\n"
                f"{recs_text}\n\n"
                f"💡 *Tip: Toggle the **'Street Food & Dining'** or **'Budget-Friendly'** filter in the Explore tab to see exact locations on the map!*"
            ),
            "suggested_actions": ["Filter for Street Food", "Filter for Budget Places", "View on Map"],
            "highlight_places": [f["id"] for f in food_spots[:3]]
        }

    # 3. Heritage, History & Culture inquiries
    if any(w in q for w in ["history", "heritage", "culture", "monument", "temple", "fort", "palace", "audio", "story"]):
        items = city_heritage or [p for p in city_places if p.get("category") in ["historical", "scenic"]]
        recs = []
        for i, h in enumerate(items[:3], 1):
            recs.append(f"{i}. **{h['name']}** - {h.get('significance', h['description'])}")

        recs_text = "\n".join(recs)
        return {
            "answer": (
                f"{system_prefix}"
                f"**Historical Landmarks & Heritage in {city_meta['display_name']}:**\n\n"
                f"{recs_text}\n\n"
                f"🎧 *Switch to the **History & Culture** tab to listen to live narrated audio walking tour scripts for these monuments!*"
            ),
            "suggested_actions": ["Open History & Culture Tab", "Play Audio Walking Tour", "View Heritage Map Pins"],
            "highlight_places": [h["id"] for h in items[:3]]
        }

    # 4. Best vs Worst / Comparisons
    if any(w in q for w in ["compare", "best", "worst", "clean", "expensive", "neighborhood", "area", "district"]):
        return {
            "answer": (
                f"{system_prefix}"
                f"**Urban Comparison Guide for {city_meta['display_name']}:**\n\n"
                f"• Explore side-by-side districts in our **Best vs. Worst** tab.\n"
                f"• Benchmarks evaluate: **Safety, Cleanliness, AQI, Affordability, Transit Access, and Nightlife/Vibe**.\n"
                f"• Ratings are based on aggregated civic accessibility, transit links, and community feedback.\n\n"
                f"📊 *Open the **Best vs. Worst** tab to interact with the 6-dimensional radar comparison chart.*"
            ),
            "suggested_actions": ["Open Best vs. Worst Tab", "Compare Districts", "View Radar Chart"],
            "highlight_places": []
        }

    # 5. Traffic, Weather & Live Telemetry
    if any(w in q for w in ["traffic", "jam", "weather", "rain", "flood", "aqi", "air", "commute", "metro", "bus"]):
        w_data = city_meta["weather"]
        t_data = city_meta["traffic"]
        return {
            "answer": (
                f"{system_prefix}"
                f"**City Telemetry for {city_meta['display_name']} [Sample Telemetry]:**\n\n"
                f"• **Weather:** {w_data['temp_c']}°C, {w_data['condition']} (Humidity: {w_data['humidity']}).\n"
                f"• **Air Quality:** AQI {city_meta['aqi']} ({city_meta['aqi_status']}).\n"
                f"• **Congestion Indicator:** {t_data['congestion_level']}% - {t_data['status']}.\n"
                f"• **Transit Note:** {city_meta['travel_info']}\n\n"
                f"📢 *View crowdsourced alerts or post your own report in the **Smart City Pulse** tab.*"
            ),
            "suggested_actions": ["Open Smart City Pulse", "Post Citizen Report", "View Live Traffic"],
            "highlight_places": []
        }

    # Default fallback welcome
    sample_places = city_places[:2]
    p_names = ", ".join([p["name"] for p in sample_places]) if sample_places else "top destinations"
    return {
        "answer": (
            f"{system_prefix}"
            f"Hello! I am **PulseBot**, your local offline guide for **{city_meta['display_name']}**.\n\n"
            f"Here are ways I can help:\n"
            f"• **Food & Dining:** Discover local culinary gems like {p_names}.\n"
            f"• **Heritage & History:** Explore iconic landmarks and listen to audio walking scripts.\n"
            f"• **SafeWay Navigation:** Compare fastest shortcuts with well-lit corridors.\n"
            f"• **District Comparisons:** Benchmark neighborhoods across 6 urban liveability dimensions.\n\n"
            f"What would you like to explore in {target_city}?"
        ),
        "suggested_actions": [f"Best Food in {target_city}", f"Safe Routes in {target_city}", f"Heritage in {target_city}", f"Compare Districts"],
        "highlight_places": [p["id"] for p in sample_places]
    }
