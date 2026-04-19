import json
import sys
import time
import anthropic
from config import ANTHROPIC_API_KEY
from services.places_service import search_restaurants, get_place_details

# Force stdout to UTF-8 so emoji/box-drawing characters don't crash on Windows cp1252
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ── Terminal colours (no dependencies) ──────────────────────────────────────
_R  = "\033[0m"       # reset
_GR = "\033[32m"      # green
_CY = "\033[36m"      # cyan
_YL = "\033[33m"      # yellow
_BL = "\033[34m"      # blue
_DM = "\033[2m"       # dim
_BD = "\033[1m"       # bold
_MG = "\033[35m"      # magenta


def _log(label: str, color: str, *lines: str) -> None:
    prefix = f"{color}{_BD}{label}{_R}"
    for i, line in enumerate(lines):
        if i == 0:
            print(f"  {prefix}  {line}", flush=True)
        else:
            indent = " " * (len(label) + 4)
            print(f"{indent}{_DM}{line}{_R}", flush=True)


def _separator(title: str = "") -> None:
    bar = "-" * 60
    if title:
        pad = (60 - len(title) - 2) // 2
        print(f"\n{_DM}{'-'*pad} {_BD}{title}{_R}{_DM} {'-'*(60-pad-len(title)-2)}{_R}", flush=True)
    else:
        print(f"{_DM}{bar}{_R}", flush=True)

SYSTEM_PROMPT = """You are a health-focused food discovery agent. Your job is to help users find nearby restaurants that match their query, with a strong emphasis on health and nutrition.

You have access to the following tools:
- `search_restaurants`: Search for restaurants near the user using Google Places. You can call this multiple times with different queries to broaden or refine results.
- `get_place_details`: Get detailed information (address, website, hours, summary) for a specific restaurant by place_id. Use this on your most promising candidates.
- `web_search`: Search the web for information about a restaurant — use this to look up actual menus, nutritional info, or recent reviews when you want richer data before scoring.
- `final_answer`: Call this when you have gathered enough information. Provide a ranked list of restaurants with health scores and highlights.

Guidelines for health scoring (0–100):
- Score based on how well the cuisine and restaurant align with the user's specific health goals
- Consider: whole foods, minimal processing, macro balance (protein, fiber, healthy fats)
- Align with any stated goals (e.g. high-protein → prioritize grills/bowls; low-carb → avoid heavy noodle/rice dishes; vegan → plant-based menus)
- Fast food chains with processed food score low (20–40); whole-food focused restaurants score high (75–95)
- Provide 2–3 concrete health_highlights explaining the score
- Write a `reason` field: 1-2 sentences explaining specifically why this restaurant fits the user's query. Be concrete — e.g. "Known for its high-protein larb and grilled meats, making it a strong match for your protein goal." Not generic praise.
- Infer key_menu_items from your knowledge of the restaurant or cuisine, or from web search results

Always call `final_answer` when done. Results must be ranked from highest to lowest health_score.
Important: include the `lat` and `lng` coordinates for each restaurant from the search_restaurants results — these are required to place pins on the map.
"""

TOOL_DEFINITIONS = [
    {
        "name": "search_restaurants",
        "description": "Search for restaurants near a location using Google Places Text Search. Returns a list of candidates with basic info. You can call this multiple times with different queries.",
        "input_schema": {
            "type": "object",
            "properties": {
                "text_query": {
                    "type": "string",
                    "description": "The search query, e.g. 'healthy Thai food' or 'vegan bowls salads'"
                },
                "radius_meters": {
                    "type": "integer",
                    "description": "Search radius in meters (default 1500)",
                    "default": 1500
                }
            },
            "required": ["text_query"]
        }
    },
    {
        "name": "get_place_details",
        "description": "Get detailed information about a restaurant by its place_id, including address, website, hours, and editorial summary.",
        "input_schema": {
            "type": "object",
            "properties": {
                "place_id": {
                    "type": "string",
                    "description": "The Google Places place_id of the restaurant"
                }
            },
            "required": ["place_id"]
        }
    },
    {
        "name": "final_answer",
        "description": "Call this when you have gathered enough information and are ready to return results. Provide a ranked list of restaurants.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query_intent": {
                    "type": "string",
                    "description": "A brief description of what the user is looking for and what health goals were identified"
                },
                "restaurants": {
                    "type": "array",
                    "description": "Ranked list of restaurants (highest health_score first)",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "cuisine": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Cuisine types or tags"
                            },
                            "price_level": {"type": "string", "description": "e.g. '$', '$$', '$$$'"},
                            "rating": {"type": "number"},
                            "distance_miles": {"type": "number"},
                            "address": {"type": "string"},
                            "website": {"type": "string"},
                            "google_maps_url": {"type": "string"},
                            "is_open": {"type": "boolean"},
                            "hours_summary": {"type": "string"},
                            "health_score": {"type": "integer", "description": "0–100 health fit score"},
                            "reason": {
                                "type": "string",
                                "description": "1-2 sentence explanation of why this restaurant matches the user's query. Be specific — mention the dish type, health benefit, or trait that makes it a good fit."
                            },
                            "health_highlights": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "2–3 reasons for the health score"
                            },
                            "key_menu_items": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Notable healthy menu items"
                            },
                            "lat": {
                                "type": "number",
                                "description": "Latitude of the restaurant from search_restaurants results"
                            },
                            "lng": {
                                "type": "number",
                                "description": "Longitude of the restaurant from search_restaurants results"
                            }
                        },
                        "required": ["name", "health_score", "health_highlights"]
                    }
                }
            },
            "required": ["query_intent", "restaurants"]
        }
    }
]

WEB_SEARCH_TOOL = {"type": "web_search_20250305", "name": "web_search"}


async def _dispatch_tool(tool_name: str, tool_input: dict, lat: float, lng: float, radius_meters: int) -> str:
    """Execute a tool call, log it, and return the result as a JSON string."""
    t0 = time.time()

    if tool_name == "search_restaurants":
        query = tool_input["text_query"]
        radius = tool_input.get("radius_meters", radius_meters)
        _log("[SEARCH]", _GR, f'"{query}"  (radius {radius}m)')
        result = await search_restaurants(text_query=query, lat=lat, lng=lng, radius_meters=radius)
        elapsed = time.time() - t0
        names = [r["name"] for r in result]
        _log("   -> returned", _DM, f"{len(result)} results in {elapsed:.1f}s: {', '.join(names[:5])}{'...' if len(names)>5 else ''}")
        return json.dumps(result)

    elif tool_name == "get_place_details":
        place_id = tool_input["place_id"]
        _log("[DETAILS]", _CY, f"place_id={place_id}")
        result = await get_place_details(place_id=place_id)
        elapsed = time.time() - t0
        _log("   -> fetched", _DM, f"{result.get('name', '?')} in {elapsed:.1f}s - {result.get('address','')}")
        return json.dumps(result)

    elif tool_name == "web_search":
        # Anthropic handles this internally; we just log the query from tool_input
        query = tool_input.get("query", tool_input.get("q", str(tool_input)))
        _log("[WEB SEARCH]", _YL, f'"{query}"')
        return "__HANDLED_BY_ANTHROPIC__"

    elif tool_name == "final_answer":
        return "__FINAL_ANSWER__"

    else:
        _log("[UNKNOWN TOOL]", _MG, tool_name)
        return json.dumps({"error": f"Unknown tool: {tool_name}"})


async def run_agent(query: str, lat: float, lng: float, radius_meters: int = 1500) -> dict:
    """
    Run the Claude agentic loop. Claude autonomously decides which tools to call
    and when to return a final answer.
    """
    _separator(f"NEW QUERY")
    _log("[QUERY]", _BD, f'"{query}"')
    _log("[LOCATION]", _DM, f"lat={lat}, lng={lng}, radius={radius_meters}m")
    _separator()

    initial_message = (
        f"User query: {query}\n"
        f"User location: latitude={lat}, longitude={lng}\n"
        f"Search radius: {radius_meters} meters\n\n"
        "Please find restaurants near the user that match their query, evaluate them for health, "
        "and return a ranked list using the final_answer tool."
    )

    messages = [{"role": "user", "content": initial_message}]
    all_tools = TOOL_DEFINITIONS + [WEB_SEARCH_TOOL]
    final_answer_input = None
    iteration = 0
    agent_start = time.time()

    for _ in range(10):  # max 10 iterations to prevent runaway loops
        iteration += 1
        print(f"\n{_BL}{_BD}-- Iteration {iteration}: calling Claude...{_R}", flush=True)
        t0 = time.time()

        response = client.beta.messages.create(
            model="claude-opus-4-5",
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            tools=all_tools,
            messages=messages,
            thinking={"type": "enabled", "budget_tokens": 8000},
            betas=["interleaved-thinking-2025-05-14"],
        )

        claude_elapsed = time.time() - t0
        print(f"  {_DM}Claude responded in {claude_elapsed:.1f}s  (stop_reason={response.stop_reason}){_R}", flush=True)

        # Print thinking blocks and any text Claude emitted
        for block in response.content:
            if hasattr(block, "type") and block.type == "thinking" and block.thinking.strip():
                print(f"\n  {_CY}{_BD}[THINKING]{_R}", flush=True)
                for line in block.thinking.strip().splitlines():
                    print(f"  {_CY}{_DM}  {line}{_R}", flush=True)
                print(flush=True)
            elif hasattr(block, "type") and block.type == "text" and block.text.strip():
                for line in block.text.strip().splitlines():
                    print(f"  {_MG}>> {line}{_R}", flush=True)

        # Add Claude's response to message history
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            break

        if response.stop_reason != "tool_use":
            break

        # Process all tool calls in this response
        tool_results = []
        done = False

        for block in response.content:
            if not hasattr(block, "type") or block.type != "tool_use":
                continue

            tool_name = block.name
            tool_input = block.input

            if tool_name == "final_answer":
                final_answer_input = tool_input
                done = True
                n = len(tool_input.get("restaurants", []))
                _separator()
                _log("[DONE]", _GR,
                     f'{n} restaurants ranked',
                     f'Intent: {tool_input.get("query_intent","")[:120]}')
                total = time.time() - agent_start
                print(f"\n  {_DM}Total agent time: {total:.1f}s across {iteration} iteration(s){_R}\n", flush=True)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": "Answer recorded.",
                })
                break

            result_str = await _dispatch_tool(tool_name, tool_input, lat, lng, radius_meters)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result_str,
            })

        if tool_results:
            messages.append({"role": "user", "content": tool_results})

        if done:
            break

    if final_answer_input is None:
        print(f"\n  {_MG}[WARN] Agent finished without calling final_answer{_R}\n", flush=True)
        return {"restaurants": [], "query_intent": "No results found."}

    return final_answer_input
