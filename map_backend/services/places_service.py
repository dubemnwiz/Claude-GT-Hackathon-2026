import httpx
import math
from config import GOOGLE_PLACES_API_KEY

LEGACY_BASE = "https://maps.googleapis.com/maps/api/place"


def _haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 3958.8
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return round(2 * R * math.asin(math.sqrt(a)), 2)


def _price_symbol(level: int | None) -> str | None:
    if level is None:
        return None
    symbols = {0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}
    return symbols.get(level)


async def search_restaurants(text_query: str, lat: float, lng: float, radius_meters: int = 1500) -> list[dict]:
    """
    Google Places Text Search (legacy) — returns a flat list of candidate restaurants.
    """
    params = {
        "query": f"{text_query} restaurant",
        "location": f"{lat},{lng}",
        "radius": radius_meters,
        "type": "restaurant",
        "key": GOOGLE_PLACES_API_KEY,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{LEGACY_BASE}/textsearch/json", params=params)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for place in data.get("results", []):
        loc = place.get("geometry", {}).get("location", {})
        place_lat = loc.get("lat")
        place_lng = loc.get("lng")
        distance = (
            _haversine_miles(lat, lng, place_lat, place_lng)
            if place_lat is not None and place_lng is not None
            else None
        )
        results.append({
            "place_id": place.get("place_id"),
            "name": place.get("name"),
            "rating": place.get("rating"),
            "price_level": _price_symbol(place.get("price_level")),
            "types": place.get("types", []),
            "open_now": place.get("opening_hours", {}).get("open_now"),
            "distance_miles": distance,
            "vicinity": place.get("vicinity"),
            "lat": place_lat,
            "lng": place_lng,
        })

    return results


async def get_place_details(place_id: str) -> dict:
    """
    Google Places Place Details (legacy) — returns rich info for a single place.
    """
    params = {
        "place_id": place_id,
        "fields": (
            "place_id,name,formatted_address,website,url,"
            "opening_hours,editorial_summary,photos,price_level,rating,types"
        ),
        "key": GOOGLE_PLACES_API_KEY,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{LEGACY_BASE}/details/json", params=params)
        resp.raise_for_status()
        place = resp.json().get("result", {})

    hours_summary = None
    weekday_text = place.get("opening_hours", {}).get("weekday_text", [])
    if weekday_text:
        hours_summary = weekday_text[0]

    photo_url = None
    photos = place.get("photos", [])
    if photos:
        ref = photos[0].get("photo_reference")
        if ref:
            photo_url = (
                f"{LEGACY_BASE}/photo?maxwidth=400"
                f"&photo_reference={ref}&key={GOOGLE_PLACES_API_KEY}"
            )

    return {
        "place_id": place.get("place_id"),
        "name": place.get("name"),
        "address": place.get("formatted_address"),
        "website": place.get("website"),
        "google_maps_url": place.get("url"),
        "is_open": place.get("opening_hours", {}).get("open_now"),
        "hours_summary": hours_summary,
        "editorial_summary": place.get("editorial_summary", {}).get("overview"),
        "types": place.get("types", []),
        "price_level": _price_symbol(place.get("price_level")),
        "rating": place.get("rating"),
        "photo_url": photo_url,
    }
