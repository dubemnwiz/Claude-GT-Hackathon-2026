from pydantic import BaseModel
from typing import Optional


class SearchRequest(BaseModel):
    query: str
    lat: float
    lng: float
    radius_meters: int = 1500


class Restaurant(BaseModel):
    name: str
    cuisine: list[str] = []
    price_level: Optional[str] = None
    rating: Optional[float] = None
    distance_miles: Optional[float] = None
    address: Optional[str] = None
    website: Optional[str] = None
    google_maps_url: Optional[str] = None
    is_open: Optional[bool] = None
    hours_summary: Optional[str] = None
    health_score: int
    reason: Optional[str] = None
    health_highlights: list[str] = []
    key_menu_items: list[str] = []
    lat: Optional[float] = None
    lng: Optional[float] = None


class SearchResponse(BaseModel):
    restaurants: list[Restaurant]
    query_intent: str
