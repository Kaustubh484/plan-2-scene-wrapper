# Plan2Scene Web Application

A full-stack web application that converts 2D floorplans into textured 3D models and generates walkthrough videos using the official Plan2Scene implementation.

🔗 **Based on**: [Plan2Scene - Converting Floorplans to 3D Scenes](https://github.com/3dlg-hcvc/plan2scene)

📄 **Research Paper**: [Plan2Scene: Converting floorplans to 3D scenes (CVPR 2021)](https://arxiv.org/abs/2106.05375)

## Overview

Plan2Scene converts a floorplan and a set of associated photos of a residence into a textured 3D mesh model. The system:
1. Lifts a floorplan image to a 3D mesh model
2. Synthesizes surface textures based on input photos
3. Infers textures for unobserved surfaces using a graph neural network

## Important Notes

Plan2Scene is a research project with significant computational requirements:
- **Dataset**: Requires Rent3D++ dataset (multi-GB download)
- **Models**: Needs pretrained models for texture synthesis and propagation
- **Dependencies**: Complex setup with texture-synthesis CLI, SmartScenesToolkit, etc.
- **Compute**: GPU recommended for reasonable inference time
- **Input**: Requires BOTH floorplan + multiple room photos

**This implementation provides**:
- Simplified web interface for Plan2Scene
- API wrapper around Plan2Scene inference pipeline
- Queue-based processing for multiple requests
- Cloud storage integration for models and outputs



```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.10+ (for local backend development)
- Git with LFS support
- At least 16GB RAM and 50GB disk space
- GPU with 8GB+ VRAM (recommended)

### 1. Clone the Repository

```bash
git clone --recursive https://github.com/Kaustubh484/plan-2-scene-wrapper.git
cd plan2scene-web-app
```


### 2. Run this command
```bash
# Build and start all services
# Make sure you have docker configured on your device (Refer to https://docs.docker.com/get-started/get-docker/)
docker-compose up --build

# Access at http://localhost:3000
# Backend API: http://localhost:8000

```


## API Endpoints

### POST `/api/upload`
Upload floorplan and room photos for processing.

**Request:**
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "floorplan=@floorplan.png" \
  -F "photos=@room1.jpg" \
  -F "photos=@room2.jpg" \
  -F "photos=@room3.jpg"
```

**Response:**
```json
{
  "job_id": "abc123",
  "status": "queued",
  "message": "Processing started"
}
```

### GET `/api/status/{job_id}`
Check processing status.

**Response:**
```json
{
  "job_id": "abc123",
  "status": "completed",
  "progress": 100,
  "model_url": "/api/download/abc123/model.obj",
  "video_url": "/api/download/abc123/walkthrough.mp4",
  "scene_json": "/api/download/abc123/scene.json"
}
```

### GET `/api/download/{job_id}/{filename}`
Download generated files.

### GET `/api/jobs`
List all processing jobs.

## Usage Guide

### Step 1: Prepare Your Input

You need:
1. **Floorplan image** (PNG/JPG) - line drawing or architectural plan
2. **Room photos** (3-10 images) - photos of interior surfaces (walls, floors, ceilings)

**Tips:**
- Floorplan should be clear with visible room boundaries
- Photos should show different surfaces and textures
- Include photos from multiple rooms if possible

### Step 2: Upload Files

1. Open the web application
2. Drag and drop your floorplan image
3. Add multiple room photos
4. Click "Generate 3D Model"

### Step 3: Monitor Progress

The processing pipeline includes:
1. **Preprocessing** - Floorplan analysis and photo processing (30s)
2. **Texture Generation** - VGG crop selection (2-3 min)
3. **Texture Propagation** - GNN inference (2-3 min)
4. **Post-processing** - Seam correction and tiling (1 min)
5. **3D Generation** - Scene.json creation (30s)
6. **Video Rendering** - Walkthrough generation (2-3 min)

**Total time: 8-12 minutes** (with GPU)

### Step 4: View and Download

Once complete:
- View the 3D model in the interactive viewer
- Watch the walkthrough video
- Download `.obj`, `.blend`, or `.scene.json` files


**Note**: This is a complex research project adapted for web deployment. For production use, consider dedicated GPU infrastructure or cloud ML platforms.
