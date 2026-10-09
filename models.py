from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class CitySummary(BaseModel):
    id: str
    name: str
    display_name: str
    state: str
    country: str = "India"
    center: List[float]
    default_zoom: int = 13
    tagline: str

class Location(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None
    neighborhood: Optional[str] = None

class PlaceItem(BaseModel):
    id: str
    name: str
    category: str # "food", "hidden_gem", "historical", "hotel", "scenic", "park"
    sub_category: Optional[str] = None
    lat: float
    lng: float
    address: str
    neighborhood: str
    city: str
    state: Optional[str] = None
    rating: float
    rating_label: str = "Sample Rating"
    reviews_count: int
    price_level: str # "$", "$$", "$$$", "$$$$"
    avg_cost_for_two: str
    safety_score: int # 0-100 (Reported score)
    crowd_level: str # "Low", "Moderate", "High", "Peak"
    best_time_to_visit: str
    opening_hours: str
    tags: List[str]
    amenities: List[str] = []
    description: str
    must_try: Optional[str] = None
    image_url: str
    is_hidden_gem: bool = False
    is_budget_friendly: bool = False
    etiquette_tip: Optional[str] = None
    data_source: str = "Curated Indian Tourism & Heritage Directory"

class HeritageSite(BaseModel):
    id: str
    name: str
    city: str
    state: Optional[str] = None
    era_or_year: str
    architectural_style: str
    lat: float
    lng: float
    address: str
    neighborhood: str
    significance: str
    historical_story: str
    audio_guide_transcript: str
    cultural_tradition: str
    visiting_etiquette: str
    entry_fee: str
    best_photography_spot: str
    image_url: str

class SafetyHazard(BaseModel):
    id: str
    title: str
    city: str
    hazard_type: str # "accident_prone", "poor_lighting", "high_theft", "waterlogging", "isolated_zone", "traffic_bottleneck"
    severity: str # "low", "medium", "high", "critical"
    lat: float
    lng: float
    location_name: str
    description: str
    reported_count: int
    safe_alternative_advice: str
    police_station_nearby: str
    distance_to_police: str
    status_label: str = "Reported Caution Zone (Community Advisory)"

class NeighborhoodBenchmark(BaseModel):
    id: str
    name: str
    city: str
    safety_score: int # 0-100
    cleanliness_score: int # 0-100
    aqi_level: int
    affordability_score: int # 0-100
    rating_score: float # 0-5
    transit_accessibility: int # 0-100
    nightlife_vibe: int # 0-100
    pros: List[str]
    cons: List[str]
    summary: str
    recommended_for: List[str]
    basis_of_comparison: str = "Aggregated civic accessibility, transit links, crowd reports & local indices"

class CitizenReportCreate(BaseModel):
    city: str
    category: str # "Safety Hazard", "Traffic Jam", "Streetlight Outage", "Pothole/Road Issue", "Hidden Gem", "Cleanliness Alert"
    title: str
    description: str
    lat: float
    lng: float
    location_name: str
    image_url: Optional[str] = None
    voice_note_transcript: Optional[str] = None
    user_name: Optional[str] = "Anonymous Citizen"

class CitizenReport(CitizenReportCreate):
    id: str
    timestamp: str
    status: str # "Under Review", "Verified by Community", "Dispatched to Authority"
    upvotes: int
    ai_urgency: str # "Critical", "Moderate", "Informational"
    sentiment: str # "Urgent", "Concerned", "Positive", "Frustrated"
    verification_type: str = "Unverified Citizen Submission (Demo)"

class RouteRequest(BaseModel):
    city: str
    start_lat: float
    start_lng: float
    start_name: Optional[str] = "Start"
    end_lat: float
    end_lng: float
    end_name: Optional[str] = "Destination"
    travel_mode: Optional[str] = "walking"

class AIChatRequest(BaseModel):
    query: str
    city: Optional[str] = "Mumbai"
    conversation_history: Optional[List[Dict[str, str]]] = []
