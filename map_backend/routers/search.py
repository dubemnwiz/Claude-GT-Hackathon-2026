import traceback
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models.schemas import SearchRequest, SearchResponse
from services.agent import run_agent

router = APIRouter()


@router.post("/search")
async def search(request: SearchRequest):
    try:
        result = await run_agent(
            query=request.query,
            lat=request.lat,
            lng=request.lng,
            radius_meters=request.radius_meters,
        )
        return SearchResponse(**result)
    except Exception as e:
        tb = traceback.format_exc()
        print("\n" + "="*60, flush=True)
        print("ERROR in /api/search:", flush=True)
        print(tb, flush=True)
        print("="*60 + "\n", flush=True)
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": tb})
