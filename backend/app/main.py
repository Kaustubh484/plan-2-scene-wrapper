"""
FastAPI Backend for Plan2Scene Web Application
Main application file with API endpoints
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
import os
import uuid
import shutil
from pathlib import Path
import logging

from app.models import (
    JobResponse,
    StatusResponse,
    JobStatus,
    ErrorResponse
)
from app.plan2scene_wrapper import Plan2SceneProcessor
from app.tasks import process_floorplan_task
from app.utils import (
    validate_image,
    cleanup_old_jobs,
    get_job_info
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Plan2Scene API",
    description="API for converting 2D floorplans to 3D scenes",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
UPLOAD_DIR = Path("/app/uploads")
OUTPUT_DIR = Path("/app/outputs")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")

# Initialize Plan2Scene processor
processor = Plan2SceneProcessor()

# In-memory job storage (use Redis in production)
jobs_db = {}


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Plan2Scene API server...")
    
    # Clean up old jobs (older than 24 hours)
    cleanup_old_jobs(UPLOAD_DIR, OUTPUT_DIR, hours=24)
    
    logger.info("Server ready!")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Plan2Scene API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "plan2scene_initialized": processor.is_initialized(),
        "active_jobs": len([j for j in jobs_db.values() if j["status"] == "processing"]),
        "total_jobs": len(jobs_db)
    }


@app.post("/api/upload", response_model=JobResponse)
async def upload_floorplan(
    background_tasks: BackgroundTasks,
    floorplan: UploadFile = File(...),
    photos: List[UploadFile] = File(...)
):
    """
    Upload floorplan and room photos for 3D generation
    
    Args:
        floorplan: Floorplan image file (PNG, JPG)
        photos: List of room photos (3-10 images recommended)
    
    Returns:
        JobResponse with job_id and status
    """
    try:
        # Validate inputs
        if not photos or len(photos) < 1:
            raise HTTPException(
                status_code=400,
                detail="At least 1 room photo is required"
            )
        
        if len(photos) > 20:
            raise HTTPException(
                status_code=400,
                detail="Maximum 20 photos allowed"
            )
        
        # Validate floorplan
        floorplan_content = await floorplan.read()
        if not validate_image(floorplan_content):
            raise HTTPException(
                status_code=400,
                detail="Invalid floorplan image format"
            )
        
        # Create job
        job_id = str(uuid.uuid4())
        job_dir = UPLOAD_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        
        # Save floorplan
        floorplan_path = job_dir / f"floorplan{Path(floorplan.filename).suffix}"
        with open(floorplan_path, "wb") as f:
            f.write(floorplan_content)
        
        # Save photos
        photos_dir = job_dir / "photos"
        photos_dir.mkdir(exist_ok=True)
        photo_paths = []
        
        for idx, photo in enumerate(photos):
            photo_content = await photo.read()
            if not validate_image(photo_content):
                logger.warning(f"Skipping invalid photo: {photo.filename}")
                continue
            
            photo_path = photos_dir / f"photo_{idx}{Path(photo.filename).suffix}"
            with open(photo_path, "wb") as f:
                f.write(photo_content)
            photo_paths.append(str(photo_path))
        
        if len(photo_paths) < 1:
            raise HTTPException(
                status_code=400,
                detail="No valid photos provided"
            )
        
        # Store job info
        jobs_db[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "progress": 0,
            "message": "Job queued for processing",
            "floorplan_path": str(floorplan_path),
            "photo_paths": photo_paths,
            "output_dir": str(OUTPUT_DIR / job_id),
            "created_at": None,
            "completed_at": None,
            "error": None
        }
        
        # Add background task
        background_tasks.add_task(
            process_floorplan_task,
            job_id=job_id,
            floorplan_path=str(floorplan_path),
            photo_paths=photo_paths,
            output_dir=str(OUTPUT_DIR / job_id),
            jobs_db=jobs_db,
            processor=processor
        )
        
        logger.info(f"Created job {job_id} with {len(photo_paths)} photos")
        
        return JobResponse(
            job_id=job_id,
            status=JobStatus.QUEUED,
            message="Processing started"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str):
    """
    Get processing status for a job
    
    Args:
        job_id: Unique job identifier
    
    Returns:
        StatusResponse with current status and file URLs
    """
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_db[job_id]
    
    response = StatusResponse(
        job_id=job_id,
        status=JobStatus(job["status"]),
        progress=job["progress"],
        message=job["message"]
    )
    
    # Add file URLs if completed
    if job["status"] == "completed":
        output_dir = Path(job["output_dir"])
        
        if (output_dir / "model.obj").exists():
            response.model_url = f"/outputs/{job_id}/model.obj"
        
        if (output_dir / "walkthrough.mp4").exists():
            response.video_url = f"/outputs/{job_id}/walkthrough.mp4"
        
        if (output_dir / "scene.json").exists():
            response.scene_json = f"/outputs/{job_id}/scene.json"
        
        if (output_dir / "model.blend").exists():
            response.blend_file = f"/outputs/{job_id}/model.blend"
    
    if job["status"] == "failed":
        response.error = job.get("error", "Unknown error occurred")
    
    return response


@app.get("/api/jobs")
async def list_jobs(limit: int = 50, status: Optional[str] = None):
    """
    List all processing jobs
    
    Args:
        limit: Maximum number of jobs to return
        status: Filter by status (queued, processing, completed, failed)
    
    Returns:
        List of jobs
    """
    jobs = list(jobs_db.values())
    
    if status:
        jobs = [j for j in jobs if j["status"] == status]
    
    # Sort by creation time (most recent first)
    jobs.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    return jobs[:limit]


@app.get("/api/download/{job_id}/{filename}")
async def download_file(job_id: str, filename: str):
    """
    Download generated files
    
    Args:
        job_id: Job identifier
        filename: Name of file to download
    
    Returns:
        File download response
    """
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_db[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed")
    
    file_path = Path(job["output_dir"]) / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream"
    )


@app.delete("/api/job/{job_id}")
async def delete_job(job_id: str):
    """
    Delete a job and its associated files
    
    Args:
        job_id: Job identifier
    
    Returns:
        Success message
    """
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_db[job_id]
    
    # Don't allow deletion of processing jobs
    if job["status"] == "processing":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete job while processing"
        )
    
    # Delete files
    try:
        job_upload_dir = UPLOAD_DIR / job_id
        if job_upload_dir.exists():
            shutil.rmtree(job_upload_dir)
        
        job_output_dir = Path(job["output_dir"])
        if job_output_dir.exists():
            shutil.rmtree(job_output_dir)
        
        # Remove from database
        del jobs_db[job_id]
        
        logger.info(f"Deleted job {job_id}")
        
        return {"message": "Job deleted successfully"}
    
    except Exception as e:
        logger.error(f"Error deleting job {job_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
