from app.services.routing import get_routes
from app.services.agent import recommend_route_with_agent
from fastapi import FastAPI, Query
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.services.flood import load_flood_data
from app.services.risk import analyze_route
from app.services.weather import get_weather
from app.services.routing import get_routes


app = FastAPI(title="SafeRoute AI API", version="0.4.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://saferoute-bengaluru.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RouteRequest(BaseModel):
    origin: str
    destination: str
    stops: List[str] = Field(default_factory=list)


@app.get("/")
def root():
    return {"message": "SafeRoute AI backend is running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "saferoute-backend"}


@app.get("/api/weather")
async def weather(latitude: float = Query(...), longitude: float = Query(...)):
    return await get_weather(latitude, longitude)


@app.post("/api/routes")
async def routes(request: RouteRequest):
    return await get_routes(
        request.origin,
        request.destination,
        request.stops,
    )


@app.get("/api/flood-zones")
def flood_zones():
    zones = load_flood_data()
    return {
        "count": len(zones),
        "zones": zones,
        "source": "Bengaluru KML flood datasets",
    }


@app.post("/api/analyze-route")
async def analyze_route_endpoint(request: RouteRequest):
    route_data = await get_routes(
        request.origin,
        request.destination,
        request.stops,
    )

    flood_zones = load_flood_data()

    analyzed_routes = []

    for route in route_data["routes"]:
        risk = analyze_route(route, flood_zones)
        analyzed_routes.append({**route, "risk": risk})

    analyzed_routes.sort(key=lambda route: route["risk"]["risk_score"])

    return {
        "origin": route_data["origin"],
        "stops": route_data["stops"],
        "destination": route_data["destination"],
        "routes": analyzed_routes,
        "flood_zone_count": len(flood_zones),
    }

@app.post("/api/agent/recommend")
async def agent_recommend_endpoint(request: RouteRequest):
    route_data = await get_routes(
        request.origin,
        request.destination,
        request.stops,
    )

    flood_zones = load_flood_data()
    analyzed_routes = []

    for route in route_data["routes"]:
        risk = analyze_route(route, flood_zones)
        analyzed_routes.append({**route, "risk": risk})

    analyzed_routes.sort(key=lambda route: route["risk"]["risk_score"])

    agent_result = await recommend_route_with_agent(
        origin=route_data["origin"],
        destination=route_data["destination"],
        stops=route_data["stops"],
        routes=analyzed_routes,
    )

    return {
        "origin": route_data["origin"],
        "stops": route_data["stops"],
        "destination": route_data["destination"],
        "routes": analyzed_routes,
        "flood_zone_count": len(flood_zones),
        "agent": agent_result,
    }
