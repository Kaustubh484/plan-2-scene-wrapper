"""
Pydantic models for API request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class JobStatus(str, Enum):
    """Job processing status"""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobResponse(BaseModel):
    """Response model for job creation"""
    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current job status")
    message: str = Field(..., description="Status message")


class StatusResponse(BaseModel):
    """Response model for status check"""
    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current job status")
    progress: int = Field(0, ge=0, le=100, description="Progress percentage")
    message: str = Field("", description="Current processing step or message")
    model_url: Optional[str] = Field(None, description="URL to download 3D model")
    video_url: Optional[str] = Field(None, description="URL to walkthrough video")
    scene_json: Optional[str] = Field(None, description="URL to scene JSON file")
    blend_file: Optional[str] = Field(None, description="URL to Blender file")
    error: Optional[str] = Field(None, description="Error message if failed")
    created_at: Optional[datetime] = Field(None, description="Job creation time")
    completed_at: Optional[datetime] = Field(None, description="Job completion time")


class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str = Field(..., description="Error details")
    job_id: Optional[str] = Field(None, description="Related job ID if applicable")


class JobListItem(BaseModel):
    """Model for job list items"""
    job_id: str
    status: JobStatus
    progress: int
    created_at: Optional[datetime]
    completed_at: Optional[datetime]
    

class Config(BaseModel):
    """Configuration model"""
    max_file_size: int = Field(10 * 1024 * 1024, description="Max file size in bytes")
    max_photos: int = Field(20, description="Maximum number of photos")
    processing_timeout: int = Field(900, description="Processing timeout in seconds")
    cleanup_hours: int = Field(24, description="Hours to keep completed jobs")
