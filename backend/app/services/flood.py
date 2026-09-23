from pathlib import Path
import math
import xml.etree.ElementTree as ET


DATA_DIR = Path(__file__).resolve().parents[3] / "data"


def local_name(tag: str) -> str:
    return tag.split("}")[-1]


def extract_coordinates(value: str):
    points = []

    for chunk in value.strip().split():
        parts = chunk.split(",")

        if len(parts) < 2:
            continue

        try:
            lon = float(parts[0])
            lat = float(parts[1])

            if not (math.isfinite(lat) and math.isfinite(lon)):
                continue

            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue

            points.append({
                "latitude": lat,
                "longitude": lon,
            })

        except (ValueError, TypeError):
            continue

    return points


def load_flood_data():
    results = []

    for file_path in DATA_DIR.glob("*.kml"):
        try:
            root = ET.parse(file_path).getroot()
        except Exception:
            continue

        for element in root.iter():
            if local_name(element.tag) != "Placemark":
                continue

            name = "Unnamed location"
            coordinates = []

            for child in element.iter():
                tag = local_name(child.tag)

                if tag == "name" and child.text:
                    name = child.text.strip()

                elif tag == "coordinates" and child.text:
                    coordinates.extend(
                        extract_coordinates(child.text)
                    )

            for point in coordinates:
                results.append({
                    "name": name,
                    "latitude": point["latitude"],
                    "longitude": point["longitude"],
                    "source_file": file_path.name,
                })

    return results