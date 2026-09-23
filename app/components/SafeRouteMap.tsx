"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type FloodZone = {
  name: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  source_file?: string;
};

type RouteRisk = {
  risk_level?: string;
  risk_score?: number;
  flood_zone_count?: number;
  nearby_flood_zones?: FloodZone[];
};

type Route = {
  id: string;
  distance_km: number;
  duration_min: number;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  risk?: RouteRisk;
};

type Props = {
  routes: Route[];
  selectedRouteId: string | null;
  routeColors?: Record<string, string>;
  onRouteSelect: (routeId: string) => void;
};

const DEFAULT_COLORS: Record<string, string> = {
  "route-1": "#22c55e",
  "route-2": "#f59e0b",
  "route-3": "#ef4444",
  "route-4": "#8b5cf6",
};

export default function SafeRouteMap({
  routes,
  selectedRouteId,
  routeColors = DEFAULT_COLORS,
  onRouteSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const routesRef = useRef(routes);
  const selectedRouteRef = useRef(selectedRouteId);
  const onRouteSelectRef = useRef(onRouteSelect);
  const routeColorsRef = useRef(routeColors);

  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  useEffect(() => {
    selectedRouteRef.current = selectedRouteId;
  }, [selectedRouteId]);

  useEffect(() => {
    onRouteSelectRef.current = onRouteSelect;
  }, [onRouteSelect]);

  useEffect(() => {
    routeColorsRef.current = routeColors;
  }, [routeColors]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || mapRef.current) return;

    const staleLeafletId = (
      container as HTMLDivElement & {
        _leaflet_id?: number;
      }
    )._leaflet_id;

    if (staleLeafletId !== undefined) {
      delete (
        container as HTMLDivElement & {
          _leaflet_id?: number;
        }
      )._leaflet_id;
    }

    const map = L.map(container, {
      zoomControl: false,
      scrollWheelZoom: true,
      attributionControl: true,
      preferCanvas: true,
    });

    mapRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    layersRef.current = L.layerGroup().addTo(map);

    map.setView([12.9716, 77.5946], 12);

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(resizeTimer);

      if (layersRef.current) {
        layersRef.current.clearLayers();
        layersRef.current.remove();
        layersRef.current = null;
      }

      map.off();
      map.remove();
      mapRef.current = null;

      delete (
        container as HTMLDivElement & {
          _leaflet_id?: number;
        }
      )._leaflet_id;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;

    if (!map || !layers) return;

    layers.clearLayers();

    const currentRoutes = routesRef.current;
    const currentSelected = selectedRouteRef.current;
    const colors = routeColorsRef.current;

    if (!currentRoutes.length) {
      map.setView([12.9716, 77.5946], 12);

      window.setTimeout(() => {
        map.invalidateSize();
      }, 50);

      return;
    }

    const boundsPoints: L.LatLngTuple[] = [];
    let firstRoutePoints: L.LatLngTuple[] = [];

    currentRoutes.forEach((route) => {
      const positions: L.LatLngTuple[] = route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng]
      );

      if (!firstRoutePoints.length) {
        firstRoutePoints = positions;
      }

      boundsPoints.push(...positions);

      const selected = currentSelected === route.id;
      const color = colors[route.id] ?? "#64748b";

      const line = L.polyline(positions, {
        color,
        weight: selected ? 7 : 5,
        opacity: currentSelected ? (selected ? 1 : 0.22) : 0.82,
        lineCap: "round",
        lineJoin: "round",
      });

      line.on("click", () => {
        onRouteSelectRef.current(route.id);
      });

      line.addTo(layers);
    });

    if (firstRoutePoints.length) {
      const origin = firstRoutePoints[0];
      const destination =
        firstRoutePoints[firstRoutePoints.length - 1];

      L.circleMarker(origin, {
        radius: 7,
        color: "#0f172a",
        weight: 3,
        fillColor: "#22c55e",
        fillOpacity: 1,
      })
        .bindTooltip("Origin", {
          direction: "top",
          offset: [0, -6],
        })
        .addTo(layers);

      L.circleMarker(destination, {
        radius: 7,
        color: "#0f172a",
        weight: 3,
        fillColor: "#ef4444",
        fillOpacity: 1,
      })
        .bindTooltip("Church Street", {
          direction: "top",
          offset: [0, -6],
        })
        .addTo(layers);
    }

    const selectedRoute = currentRoutes.find(
      (route) => route.id === currentSelected
    );

    const zones =
      selectedRoute?.risk?.nearby_flood_zones ?? [];

    zones.forEach((zone) => {
      const marker = L.circleMarker(
        [zone.latitude, zone.longitude],
        {
          radius: 6,
          color: "#7f1d1d",
          weight: 2,
          fillColor: "#ef4444",
          fillOpacity: 0.8,
        }
      );

      marker
        .bindTooltip(
          zone.name || "Flood-prone location",
          {
            direction: "top",
            offset: [0, -6],
          }
        )
        .addTo(layers);
    });

    map.fitBounds(boundsPoints, {
      paddingTopLeft: [24, 24],
      paddingBottomRight: [24, 24],
      maxZoom: 14,
    });

    window.setTimeout(() => {
      map.invalidateSize();
    }, 50);
  }, [routes, selectedRouteId, routeColors]);

  return <div ref={containerRef} className="h-full w-full" />;
}
