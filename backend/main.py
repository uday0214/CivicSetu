"""CivicSetu FastAPI Application Main Entry Point."""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import settings
from backend.routes.health import router as health_router
from backend.routes.intake import router as intake_router
from backend.routes.incidents import router as incidents_router
from backend.routes.analytics import router as analytics_router

app = FastAPI(
    title="CivicSetu API",
    description="Civic issue reporting, multimodal triage, and management platform for Indian cities",
    version="1.0.0",
)

# CORS middleware for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(health_router)
app.include_router(intake_router)
app.include_router(incidents_router)
app.include_router(analytics_router)

# Mount local uploads directory if it exists
upload_dir = os.path.abspath("backend/uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Frontend static serving and SPA catch-all (strictly excluding /api/*, /uploads/*, /seed/*)
frontend_dist = os.path.abspath("frontend/dist")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Guard against intercepting missing API or upload endpoints
    if full_path.startswith(("api/", "uploads/", "seed/")):
        raise HTTPException(status_code=404, detail="Resource not found")

    if os.path.exists(frontend_dist):
        potential_file = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(potential_file):
            return FileResponse(potential_file)
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)

    return {
        "service": "CivicSetu API Server",
        "message": "Frontend build not yet generated. Visit /api/health for system status or /docs for API documentation.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
