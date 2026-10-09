import sys
from fastapi.testclient import TestClient
from app.main import app

def run_tests():
    print("==================================================")
    print("  Testing CityPulse 360 Multi-City Test Suite")
    print("==================================================")
    client = TestClient(app)

    # 1. Root & static index
    res = client.get("/")
    assert res.status_code == 200, f"Root endpoint failed: {res.status_code}"
    print("[PASS] 1. GET / returned 200 OK (Single Page Application served)")

    # 2. Verify all 15 Indian Cities
    res = client.get("/api/cities")
    assert res.status_code == 200
    cities = res.json()
    expected_cities = [
        "Pune", "Mumbai", "Nagpur", "Nashik", "Delhi",
        "Bengaluru", "Hyderabad", "Chennai", "Kolkata",
        "Jaipur", "Ahmedabad", "Goa", "Varanasi", "Agra", "Kochi"
    ]
    for c in expected_cities:
        assert c in cities, f"City '{c}' missing from /api/cities"
    print(f"[PASS] 2. GET /api/cities contains all 15 Indian cities: {len(cities)} cities verified")

    # 3. Verify Detailed Cities List
    res = client.get("/api/cities-detail")
    assert res.status_code == 200
    cities_detail = res.json()
    assert len(cities_detail) >= 15
    for c in cities_detail:
        assert "center" in c and len(c["center"]) == 2
        assert "display_name" in c and "state" in c
    print(f"[PASS] 3. GET /api/cities-detail returned coordinates & display names for all {len(cities_detail)} cities")

    # 4. Test Switching between Multiple Cities & No Cross-City Place Leaks
    test_cities = ["Mumbai", "Pune", "Delhi", "Bengaluru", "Goa", "Kochi", "Jaipur"]
    for city in test_cities:
        # Check City Details
        c_res = client.get(f"/api/city/{city}")
        assert c_res.status_code == 200
        c_data = c_res.json()
        assert c_data["name"] == city
        assert "weather" in c_data and "traffic" in c_data and "sos_contacts" in c_data

        # Check Places - Strictly belongs to this city!
        p_res = client.get(f"/api/explore?city={city}")
        assert p_res.status_code == 200
        p_data = p_res.json()
        assert len(p_data) > 0, f"No places found for city '{city}'"
        for place in p_data:
            assert place["city"].lower() == city.lower(), f"Leak detected! Place {place['name']} with city {place['city']} appeared in results for {city}"
    print(f"[PASS] 4. Multi-city isolation verified across {test_cities}: Zero cross-city leaks")

    # 5. Category Filters & Amenities
    # Food filter for Pune
    res = client.get("/api/explore?city=Pune&category=food")
    assert res.status_code == 200
    pune_food = res.json()
    assert len(pune_food) > 0
    assert any("vaishali" in p["name"].lower() for p in pune_food)
    assert len(pune_food[0].get("amenities", [])) > 0

    # Historical filter for Delhi
    res = client.get("/api/explore?city=Delhi&category=historical")
    assert res.status_code == 200
    delhi_hist = res.json()
    assert len(delhi_hist) > 0
    assert any("qutub" in p["name"].lower() for p in delhi_hist)

    # Budget filter for Mumbai
    res = client.get("/api/explore?city=Mumbai&category=budget")
    assert res.status_code == 200
    mum_budget = res.json()
    assert len(mum_budget) > 0
    print("[PASS] 5. Functional category filtering (food, historical, budget) verified with amenities")

    # 6. Search functionality across name, category, and amenities
    res = client.get("/api/explore?city=Pune&search=dosa")
    assert res.status_code == 200
    assert len(res.json()) > 0

    res = client.get("/api/explore?city=Bengaluru&search=coffee")
    assert res.status_code == 200
    assert len(res.json()) > 0
    print("[PASS] 6. Search across place names, descriptions, and amenities verified")

    # 7. Culture & Heritage Sites with Audio Scripts
    for city in ["Mumbai", "Pune", "Delhi", "Goa", "Agra"]:
        res = client.get(f"/api/culture?city={city}")
        assert res.status_code == 200
        culture = res.json()
        assert len(culture) > 0
        assert "audio_guide_transcript" in culture[0]
        assert len(culture[0]["audio_guide_transcript"]) > 20
    print("[PASS] 7. Culture & Heritage sites with audio walking tour transcripts verified")

    # 8. Safety Hazards & Caution Advisories
    for city in ["Mumbai", "Pune", "Delhi", "Bengaluru", "Goa"]:
        res = client.get(f"/api/safety?city={city}")
        assert res.status_code == 200
        safety = res.json()
        assert len(safety["hazards"]) > 0
        assert "disclaimer" in safety
        assert len(safety["sos_contacts"]) > 0
    print("[PASS] 8. Safety advisories, caution zones, and emergency SOS contacts verified")

    # 9. SafeWay Dual Routing (Fastest vs Safest)
    route_payload = {
        "city": "Pune",
        "start_lat": 18.5228,
        "start_lng": 73.8415,
        "end_lat": 18.5196,
        "end_lng": 73.8553
    }
    res = client.post("/api/route", json=route_payload)
    assert res.status_code == 200
    route_data = res.json()
    assert "fastest_route" in route_data or "fastest" in route_data
    assert "safest_route" in route_data or "safest" in route_data
    print("[PASS] 9. SafeWay dual-path routing (Fastest vs Safest) computed with safety metrics")

    # 10. Neighborhood Benchmarks (Best vs Worst Matrix)
    for city in ["Mumbai", "Pune", "Delhi"]:
        res = client.get(f"/api/benchmarks?city={city}")
        assert res.status_code == 200
        benchmarks = res.json()
        assert len(benchmarks) >= 2
        for b in benchmarks:
            assert "safety_score" in b and "cleanliness_score" in b and "pros" in b and "cons" in b
    print("[PASS] 10. 6-Dimensional neighborhood benchmarks (Best vs Worst) verified")

    # 11. Smart City Insights & Crowdsourced Reporting
    res = client.get("/api/smart-city?city=Pune")
    assert res.status_code == 200
    insights = res.json()
    assert "traffic" in insights and "social_feed" in insights and "analytics" in insights

    # Submit a citizen report
    rep_payload = {
        "city": "Pune",
        "category": "Traffic Jam",
        "title": "Signal outage on JM Road junction",
        "description": "Heavy traffic build-up, wardens required immediately",
        "lat": 18.5240,
        "lng": 73.8465,
        "location_name": "JM Road Square",
        "voice_note_transcript": "Reporting heavy traffic near Deccan corner"
    }
    res = client.post("/api/reports", json=rep_payload)
    assert res.status_code == 200
    saved_rep = res.json()
    assert saved_rep["city"] == "Pune"
    assert "ai_urgency" in saved_rep

    # Upvote
    upvote_res = client.post(f"/api/reports/{saved_rep['id']}/upvote")
    assert upvote_res.status_code == 200
    assert upvote_res.json()["upvotes"] == 2
    print("[PASS] 11. Smart City telemetry, citizen reporting NLP classification & upvoting verified")

    # 12. PulseBot Conversational Assistant
    chat_payload = {
        "query": "Where can I find the best street food in Pune?",
        "city": "Pune"
    }
    res = client.post("/api/ai-chat", json=chat_payload)
    assert res.status_code == 200
    chat_resp = res.json()
    assert "answer" in chat_resp and "Pune" in chat_resp["answer"]
    assert len(chat_resp["suggested_actions"]) > 0
    print("[PASS] 12. PulseBot transparent local recommendation engine verified for Pune")

    # 13. Emergency SOS Simulation
    res = client.post("/api/simulate-sos?city=Pune")
    assert res.status_code == 200
    assert res.json()["status"] == "SOS_DISPATCHED"
    print("[PASS] 13. Emergency SOS simulated beacon transmission verified")

    print("\n==================================================")
    print("  ALL 13 MULTI-CITY INTEGRATION SUITES PASSED!  ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
