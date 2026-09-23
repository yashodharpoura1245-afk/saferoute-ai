import httpx
from fastapi import HTTPException
from typing import List, Optional

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "http://router.project-osrm.org/route/v1/driving"

HEADERS = {"User-Agent": "SafeRouteAI/1.0"}

BENGALURU_VIEWBOX = "77.40,13.15,77.85,12.75"


async def geocode_location(query: str) -> dict:
    search_query = query
    lower = query.lower()

    if "bengaluru" not in lower and "bangalore" not in lower:
        search_query = f"{query}, Bengaluru, Karnataka, India"

    params = {
        "q": search_query,
        "format": "jsonv2",
        "limit": 1,
        "countrycodes": "in",
        "viewbox": BENGALURU_VIEWBOX,
        "bounded": 1,
        "addressdetails": 1,
    }

    async with httpx.AsyncClient(timeout=15.0, headers=HEADERS) as client:
        response = await client.get(NOMINATIM_URL, params=params)
        response.raise_for_status()
        results = response.json()

    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"Location not found in Bengaluru: {query}",
        )

    place = results[0]
    return {
        "name": place.get("display_name", query),
        "latitude": float(place["lat"]),
        "longitude": float(place["lon"]),
    }


async def get_routes(
    origin: str,
    destination: str,
    stops: Optional[List[str]] = None,
) -> dict:
    stops = [stop.strip() for stop in (stops or []) if stop.strip()]

    location_queries = [origin, *stops, destination]
    locations = []

    for query in location_queries:
        locations.append(await geocode_location(query))

    coordinates = ";".join(
        f"{location['longitude']},{location['latitude']}"
        for location in locations
    )

    params = {
        "alternatives": "true",
        "overview": "full",
        "geometries": "geojson",
    }

    async with httpx.AsyncClient(timeout=25.0) as client:
        response = await client.get(
            f"{OSRM_URL}/{coordinates}",
            params=params,
        )
        response.raise_for_status()
        data = response.json()

    if data.get("code") != "Ok" or not data.get("routes"):
        raise HTTPException(status_code=404, detail="No road route found.")

    routes = []

    for index, route in enumerate(data["routes"]):
        routes.append(
            {
                "id": f"route-{index + 1}",
                "distance_km": round(route["distance"] / 1000, 2),
                "duration_min": round(route["duration"] / 60),
                "geometry": route["geometry"],
            }
        )

    return {
        "origin": locations[0],
        "stops": locations[1:-1],
        "destination": locations[-1],
        "routes": routes,
        "source": "OpenStreetMap + OSRM",
    }
