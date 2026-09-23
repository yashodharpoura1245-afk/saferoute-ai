import json
import os
from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph

try:
    from google import genai
except Exception:
    genai = None


class AgentState(TypedDict, total=False):
    origin: str
    destination: str
    stops: List[str]
    routes: List[Dict[str, Any]]
    selected_route_id: str
    decision_reason: str
    explanation: str
    used_llm: bool
    model: str


def _route_score(route: Dict[str, Any]) -> float:
    risk = route.get("risk") or {}
    return float(risk.get("risk_score", 1000))


def select_route_node(state: AgentState) -> Dict[str, Any]:
    routes = state.get("routes", [])
    if not routes:
        return {
            "selected_route_id": "",
            "decision_reason": "No candidate routes were returned.",
        }

    # Deterministic safety-first decision:
    # lowest prototype risk score, then shorter ETA as tie-breaker.
    ranked = sorted(
        routes,
        key=lambda r: (
            _route_score(r),
            float(r.get("duration_min", 10**9)),
            float(r.get("distance_km", 10**9)),
        ),
    )
    selected = ranked[0]
    risk = selected.get("risk") or {}

    reason = (
        "Selected the route with the lowest prototype risk score "
        f"({risk.get('risk_score', 'n/a')}/100), using ETA and distance only "
        "as tie-breakers."
    )

    return {
        "selected_route_id": selected.get("id", ""),
        "decision_reason": reason,
    }


def _build_factual_summary(state: AgentState) -> str:
    routes = state.get("routes", [])
    selected_id = state.get("selected_route_id", "")

    rows = []
    for route in routes:
        risk = route.get("risk") or {}
        rows.append(
            {
                "id": route.get("id"),
                "eta_min": route.get("duration_min"),
                "distance_km": route.get("distance_km"),
                "risk_score": risk.get("risk_score"),
                "risk_level": risk.get("risk_level"),
                "flood_zone_count": risk.get("flood_zone_count"),
            }
        )

    return json.dumps(
        {
            "origin": state.get("origin"),
            "stops": state.get("stops", []),
            "destination": state.get("destination"),
            "selected_route_id": selected_id,
            "routes": rows,
        },
        ensure_ascii=False,
    )


def explain_route_node(state: AgentState) -> Dict[str, Any]:
    selected_id = state.get("selected_route_id", "")
    routes = state.get("routes", [])

    selected = next(
        (route for route in routes if route.get("id") == selected_id),
        None,
    )

    if selected is None:
        return {
            "explanation": "No route could be selected from the available route data.",
            "used_llm": False,
        }

    risk = selected.get("risk") or {}
    selected_score = risk.get("risk_score", "n/a")
    selected_level = risk.get("risk_level", "Unknown")
    selected_floods = risk.get("flood_zone_count", 0)
    selected_eta = selected.get("duration_min", "n/a")
    selected_distance = selected.get("distance_km", "n/a")

    other_routes = [
        r for r in routes if r.get("id") != selected_id
    ]

    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if api_key and genai is not None:
        factual_summary = _build_factual_summary(state)
        prompt = (
            "You are the explanation node of SafeRoute AI. "
            "Use ONLY the supplied route data. Do not invent traffic, weather, "
            "construction, flooding, or road conditions. "
            "Do not claim a road will definitely flood. "
            "Write 2-4 concise sentences explaining why the selected route "
            "was chosen. Mention the selected route ID, ETA, risk score/level, "
            "and flood-zone count when available. Mention an alternative only "
            "when the supplied data supports it. "
            f"\n\nROUTE DATA:\n{factual_summary}"
        )
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            text = getattr(response, "text", None)
            if text:
                return {
                    "explanation": text.strip(),
                    "used_llm": True,
                    "model": model_name,
                }
        except Exception:
            pass

    alternatives = []
    for route in other_routes:
        rr = route.get("risk") or {}
        alternatives.append(
            f"{route.get('id')} has risk {rr.get('risk_score', 'n/a')}/100 "
            f"and ETA {route.get('duration_min', 'n/a')} min"
        )

    fallback = (
        f"SafeRoute selected {selected_id} because it has the lowest prototype "
        f"risk score ({selected_score}/100) among the available routes. "
        f"It is {selected_eta} min and {selected_distance} km, with "
        f"{selected_floods} nearby mapped flood-risk locations and a "
        f"{selected_level.lower()} estimated risk level."
    )
    if alternatives:
        fallback += " Alternatives: " + "; ".join(alternatives[:2]) + "."

    return {
        "explanation": fallback,
        "used_llm": False,
        "model": "",
    }


def build_graph():
    builder = StateGraph(AgentState)
    builder.add_node("select_route", select_route_node)
    builder.add_node("explain_route", explain_route_node)

    builder.add_edge(START, "select_route")
    builder.add_edge("select_route", "explain_route")
    builder.add_edge("explain_route", END)

    return builder.compile()


GRAPH = build_graph()


async def recommend_route_with_agent(
    origin: str,
    destination: str,
    stops: Optional[List[str]],
    routes: List[Dict[str, Any]],
) -> Dict[str, Any]:
    state: AgentState = {
        "origin": origin,
        "destination": destination,
        "stops": stops or [],
        "routes": routes,
    }

    result = GRAPH.invoke(state)

    return {
        "selected_route_id": result.get("selected_route_id", ""),
        "decision_reason": result.get("decision_reason", ""),
        "explanation": result.get("explanation", ""),
        "used_llm": bool(result.get("used_llm", False)),
        "model": result.get("model", ""),
        "graph": [
            "select_route",
            "explain_route",
        ],
    }
