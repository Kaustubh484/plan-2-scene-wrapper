"""
Background tasks for asynchronous processing
"""

import logging
import traceback
from datetime import datetime
from typing import Dict, List
from pathlib import Path

logger = logging.getLogger(__name__)


def process_floorplan_task(
    job_id: str,
    floorplan_path: str,
    photo_paths: List[str],
    output_dir: str,
    jobs_db: Dict,
    processor
):
    """
    Background task to process floorplan
    
    Args:
        job_id: Unique job identifier
        floorplan_path: Path to floorplan image
        photo_paths: List of photo paths
        output_dir: Output directory
        jobs_db: Job database dictionary
        processor: Plan2SceneProcessor instance
    """
    try:
        # Update status to processing
        jobs_db[job_id]["status"] = "processing"
        jobs_db[job_id]["progress"] = 0
        jobs_db[job_id]["message"] = "Starting processing..."
        jobs_db[job_id]["created_at"] = datetime.now()
        
        logger.info(f"Starting processing for job {job_id}")
        
        def update_progress(progress: int, message: str):
            """Callback to update job progress"""
            jobs_db[job_id]["progress"] = progress
            jobs_db[job_id]["message"] = message
            logger.info(f"Job {job_id}: {progress}% - {message}")
        
        # Process with Plan2Scene
        result = processor.process(
            job_id=job_id,
            floorplan_path=floorplan_path,
            photo_paths=photo_paths,
            output_dir=output_dir,
            progress_callback=update_progress
        )
        
        # Update status to completed
        jobs_db[job_id]["status"] = "completed"
        jobs_db[job_id]["progress"] = 100
        jobs_db[job_id]["message"] = "Processing complete!"
        jobs_db[job_id]["completed_at"] = datetime.now()
        jobs_db[job_id]["result"] = result
        
        logger.info(f"Job {job_id} completed successfully")
        
    except Exception as e:
        # Update status to failed
        error_msg = str(e)
        trace = traceback.format_exc()
        
        jobs_db[job_id]["status"] = "failed"
        jobs_db[job_id]["progress"] = 0
        jobs_db[job_id]["message"] = "Processing failed"
        jobs_db[job_id]["error"] = error_msg
        jobs_db[job_id]["completed_at"] = datetime.now()
        
        logger.error(f"Job {job_id} failed: {error_msg}\n{trace}")
