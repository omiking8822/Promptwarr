# -*- coding: utf-8 -*-
"""
Merges expanded Mumbai & Pune places into app/data_store.py
"""
import sys
import os
import pprint

# Add root directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from scratch.generate_mumbai import MUMBAI_PLACES
from scratch.generate_pune import PUNE_PLACES

EXTRA_HERITAGE = [
    {
        "id": "her_mum_2",
        "name": "Gateway of India & Apollo Bunder",
        "city": "Mumbai",
        "state": "Maharashtra",
        "era_or_year": "Completed 1924",
        "architectural_style": "Indo-Saracenic Basalt Arch with 16th-century Gujarati motifs",
        "lat": 18.9220,
        "lng": 72.8347,
        "address": "Apollo Bandar, Colaba, Mumbai",
        "neighborhood": "Colaba",
        "significance": "Symbolic royal gateway of Mumbai and departure point of the last British troops in 1948.",
        "historical_story": "Erected in yellow basalt to commemorate the 1911 visit of King George V and Queen Mary. Architect George Wittet combined Roman triumphal arch scale with 16th-century Gujarati jaali screens. It witnessed the historic final departure of the Somerset Light Infantry on February 28, 1948, marking the dawn of independent India.",
        "audio_guide_transcript": "You are standing before the Gateway of India, towering 26 meters above Mumbai Harbor. Notice the yellow basalt dome and perforated stone screens. In 1948, the very last British soldiers marched through this arch to their ships, closing the final chapter of colonial rule.",
        "cultural_tradition": "Sunset boat cruises depart continuously from the jetty to Elephanta Island.",
        "visiting_etiquette": "Security check at plaza entrance; open 24 hours.",
        "entry_fee": "Free",
        "best_photography_spot": "From the seaside plaza steps at sunrise looking east over the harbor.",
        "image_url": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80"
    },
    {
        "id": "her_pune_2",
        "name": "Shaniwar Wada Fort Palace",
        "city": "Pune",
        "state": "Maharashtra",
        "era_or_year": "Erected 1732",
        "architectural_style": "Maratha Military Architecture with Teakwood Arches",
        "lat": 18.5196,
        "lng": 73.8553,
        "address": "Shaniwar Peth, Pune",
        "neighborhood": "Shaniwar Peth",
        "significance": "Historical seat of the Peshwa prime ministers of the Maratha Empire until 1818.",
        "historical_story": "Built by Peshwa Baji Rao I in 1732 as the political nerve center of the Maratha Empire. Famed for its monumental Dilli Darwaza lined with 72 sharp steel spikes to deter war elephants, and the ruins of its exquisite 16-petal lotus fountain in the palace courtyard.",
        "audio_guide_transcript": "Step through the massive spiked Dilli Darwaza of Shaniwar Wada. Imagine the seven-story teakwood palaces that once rose above these stone foundations. Listen for the breeze rustling through the ruins of the Hazari Karanje, the thousand-jet lotus fountain.",
        "cultural_tradition": "Sound and Light show narrated in Marathi and English every evening.",
        "visiting_etiquette": "Remove shoes on raised marble plinths; audio guide available at ticket booth.",
        "entry_fee": "₹25 for Indians, ₹300 for Foreigners",
        "best_photography_spot": "From atop the Dilli Darwaza battlements overlooking the palace gardens.",
        "image_url": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80"
    },
    {
        "id": "her_pune_3",
        "name": "Sinhagad Fort (Kondhana Hill Fortress)",
        "city": "Pune",
        "state": "Maharashtra",
        "era_or_year": "14th Century / 1670 Battle",
        "architectural_style": "High-altitude Sahyadri Hill Bastion",
        "lat": 18.3663,
        "lng": 73.7558,
        "address": "Sinhagad Ghat Rd, Pune District",
        "neighborhood": "Sinhagad",
        "significance": "Site of Tanaji Malusare's 1670 battle, inspiring Shivaji Maharaj's words: 'Gad aala, pan sinh gela'.",
        "historical_story": "Perched at 4,300 feet, Sinhagad commanded trade routes across the Sahyadri mountains. In 1670, Maratha general Tanaji Malusare led a daring nocturnal scaling of its vertical sheer western cliff under mist cover to recapture the fort.",
        "audio_guide_transcript": "Stand upon the windy bastion of Sinhagad. Here in February 1670, under cover of darkness, Tanaji Malusare scaled this vertical cliff. When Tanaji fell victorious in combat, Chhatrapati Shivaji Maharaj wept and uttered the words engraved on these stones: 'The fort is won, but the lion is lost.'",
        "cultural_tradition": "Village women cook traditional Pithla Bhakri over wood fires inside the fortress walls.",
        "visiting_etiquette": "Stay within perimeter safety railings along steep cliff edges.",
        "entry_fee": "₹50 (Vehicle toll)",
        "best_photography_spot": "At Kalyan Darwaza stone gate overlooking the misty valleys below.",
        "image_url": "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80"
    }
]

def main():
    data_store_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "data_store.py")
    with open(data_store_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Import existing data to preserve other cities
    from app.data_store import PLACES_DB, HERITAGE_DB

    # Filter out existing Mumbai & Pune places from PLACES_DB
    other_places = [p for p in PLACES_DB if p.get("city") not in ["Mumbai", "Pune"]]
    
    # New combined places: Mumbai + Pune + other 13 cities
    new_places_db = MUMBAI_PLACES + PUNE_PLACES + other_places

    # New combined heritage: Add extra heritage without duplicates
    existing_heritage_ids = {h["id"] for h in HERITAGE_DB}
    new_heritage_db = list(HERITAGE_DB)
    for eh in EXTRA_HERITAGE:
        if eh["id"] not in existing_heritage_ids:
            new_heritage_db.append(eh)

    # Format Python representations
    places_str = pprint.pformat(new_places_db, indent=4, width=120, sort_dicts=False)
    heritage_str = pprint.pformat(new_heritage_db, indent=4, width=120, sort_dicts=False)

    # Replace PLACES_DB in content
    # Find start of PLACES_DB and start of HERITAGE_DB
    p_start = content.find("PLACES_DB: List[Dict[str, Any]] = [")
    h_start = content.find("HERITAGE_DB: List[Dict[str, Any]] = [")
    s_start = content.find("SAFETY_HAZARDS_DB: List[Dict[str, Any]] = [")

    if p_start == -1 or h_start == -1 or s_start == -1:
        print("ERROR: Markers not found in data_store.py!")
        return 1

    new_content = (
        content[:p_start] +
        f"PLACES_DB: List[Dict[str, Any]] = {places_str}\n\n" +
        f"# --- HERITAGE SITES DATABASE ---\nHERITAGE_DB: List[Dict[str, Any]] = {heritage_str}\n\n" +
        content[s_start:]
    )

    with open(data_store_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"Successfully updated app/data_store.py!")
    print(f"Total PLACES_DB: {len(new_places_db)}")
    print(f"Mumbai places: {len([p for p in new_places_db if p['city']=='Mumbai'])}")
    print(f"Pune places: {len([p for p in new_places_db if p['city']=='Pune'])}")
    print(f"HERITAGE_DB: {len(new_heritage_db)}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
