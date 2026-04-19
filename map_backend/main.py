from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from routers.search import router as search_router
from config import MAPBOX_TOKEN

app = FastAPI(title="Health Food Discovery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router, prefix="/api")

# Serve the frontend from the same origin — eliminates all fetch/CORS issues
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/")
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_dir, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"status": "ok", "message": "Health Food Discovery API."}

@app.get("/api/config")
async def get_config():
    """Public client-side config (only safe-to-expose values)."""
    return {"mapbox_token": MAPBOX_TOKEN}
