import uvicorn
import os
import sys

if __name__ == "__main__":
    print("=" * 60)
    print("  🚀 CityPulse 360: Urban Exploration & Safety Navigator")
    print("=" * 60)
    print("  Server launching on: http://127.0.0.1:8000")
    print("  API Docs available at: http://127.0.0.1:8000/docs")
    print("=" * 60)
    
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
