"""
Utility functions
"""

import os
import shutil
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
from PIL import Image
import io

logger = logging.getLogger(__name__)


def validate_image(content: bytes) -> bool:
    """
    Validate that content is a valid image
    
    Args:
        content: Image file bytes
    
    Returns:
        True if valid image, False otherwise
    """
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        return True
    except Exception as e:
        logger.warning(f"Invalid image: {str(e)}")
        return False


def cleanup_old_jobs(
    upload_dir: Path,
    output_dir: Path,
    hours: int = 24
):
    """
    Clean up old job files
    
    Args:
        upload_dir: Upload directory path
        output_dir: Output directory path
        hours: Remove jobs older than this many hours
    """
    try:
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Clean uploads
        for job_dir in upload_dir.iterdir():
            if not job_dir.is_dir():
                continue
            
            mtime = datetime.fromtimestamp(job_dir.stat().st_mtime)
            if mtime < cutoff_time:
                logger.info(f"Cleaning up old upload: {job_dir.name}")
                shutil.rmtree(job_dir)
        
        # Clean outputs
        for job_dir in output_dir.iterdir():
            if not job_dir.is_dir():
                continue
            
            mtime = datetime.fromtimestamp(job_dir.stat().st_mtime)
            if mtime < cutoff_time:
                logger.info(f"Cleaning up old output: {job_dir.name}")
                shutil.rmtree(job_dir)
        
        logger.info(f"Cleanup complete (older than {hours} hours)")
        
    except Exception as e:
        logger.error(f"Cleanup error: {str(e)}")


def get_job_info(job_dir: Path) -> Optional[dict]:
    """
    Get information about a job directory
    
    Args:
        job_dir: Job directory path
    
    Returns:
        Dictionary with job info or None
    """
    try:
        if not job_dir.is_dir():
            return None
        
        stats = job_dir.stat()
        
        return {
            "job_id": job_dir.name,
            "created": datetime.fromtimestamp(stats.st_ctime),
            "modified": datetime.fromtimestamp(stats.st_mtime),
            "size_mb": sum(f.stat().st_size for f in job_dir.rglob('*') if f.is_file()) / (1024 * 1024)
        }
    except Exception as e:
        logger.error(f"Error getting job info: {str(e)}")
        return None


def format_duration(seconds: float) -> str:
    """
    Format duration in seconds to human-readable string
    
    Args:
        seconds: Duration in seconds
    
    Returns:
        Formatted string (e.g., "2m 30s")
    """
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours}h {minutes}m"


def get_file_size_mb(file_path: Path) -> float:
    """Get file size in MB"""
    try:
        return file_path.stat().st_size / (1024 * 1024)
    except:
        return 0.0
