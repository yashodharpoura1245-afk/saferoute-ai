import math


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )

    return R * 2 * math.asin(math.sqrt(a))


def analyze_route(route, flood_zones):
    coordinates = route["geometry"]["coordinates"]

    # Sample route points to keep analysis fast
    step = max(1, len(coordinates) // 40)
    sampled_points = coordinates[::step]

    nearby_zones = []

    for lng, lat in sampled_points:
        for zone in flood_zones:
            distance_km = haversine_km(
                lat,
                lng,
                zone["latitude"],
                zone["longitude"],
            )

            # Flood-prone location within 300 metres
            if distance_km <= 0.30:
                nearby_zones.append({
                    "name": zone["name"],
                    "latitude": zone["latitude"],
                    "longitude": zone["longitude"],
                    "distance_km": round(distance_km, 3),
                    "source_file": zone["source_file"],
                })

    # Remove duplicate locations
    unique = {}

    for zone in nearby_zones:
        key = (
            round(zone["latitude"], 5),
            round(zone["longitude"], 5),
        )

        if key not in unique:
            unique[key] = zone

    nearby_zones = list(unique.values())

    # Prototype route-risk score
    risk_score = min(100, len(nearby_zones) * 8)

    if risk_score >= 70:
        risk_level = "High"
    elif risk_score >= 35:
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    return {
        "route_id": route["id"],
        "risk_score": risk_score,
        "risk_level": risk_level,
        "flood_zone_count": len(nearby_zones),
        "nearby_flood_zones": nearby_zones,
    }

