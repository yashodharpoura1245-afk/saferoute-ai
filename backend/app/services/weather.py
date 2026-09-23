import httpx

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def get_weather(latitude: float, longitude: float) -> dict:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,rain,precipitation,weather_code",
        "hourly": "precipitation_probability,precipitation,rain",
        "forecast_hours": 6,
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()

        data = response.json()

    current = data.get("current", {})

    return {
        "latitude": latitude,
        "longitude": longitude,
        "temperature": current.get("temperature_2m"),
        "rain": current.get("rain"),
        "precipitation": current.get("precipitation"),
        "weather_code": current.get("weather_code"),
        "source": "Open-Meteo",
    }