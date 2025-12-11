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


## Project Structure

```
plan2scene-web-app/
├── frontend/                 # React application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadForm.jsx
│   │   │   ├── ModelViewer.jsx
│   │   │   ├── VideoPlayer.jsx
│   │   │   └── StatusTracker.jsx
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── api.js
│   ├── package.json
│   └── Dockerfile
│
├── backend/                  # Python FastAPI service
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── plan2scene_wrapper.py  # Plan2Scene integration
│   │   ├── models.py        # Pydantic models
│   │   ├── tasks.py         # Background task processing
│   │   └── utils.py         # Utility functions
│   ├── plan2scene/          # Cloned Plan2Scene repo (git submodule)
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── deploy.yml
└── README.md
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
git clone --recursive https://github.com/yourusername/plan2scene-web-app.git
cd plan2scene-web-app
```

### 2. Download Required Data

**Note**: This is a significant download (~20GB+)

```bash
# Download Rent3D++ dataset
cd backend/plan2scene
# Follow instructions at: https://forms.gle/mKAmnrzAm3LCK9ua6

# Download pretrained models
wget https://aspis.cmpt.sfu.ca/projects/plan2scene/pretrained_models/texture_gen.zip
wget https://aspis.cmpt.sfu.ca/projects/plan2scene/pretrained_models/gnn_prop.zip
unzip texture_gen.zip -d pretrained_models/
unzip gnn_prop.zip -d pretrained_models/
```

### 3. Setup Configuration

```bash
# Copy example configs
cp backend/plan2scene/conf/plan2scene/seam_correct-example.json backend/plan2scene/conf/plan2scene/seam_correct.json
cp backend/plan2scene/conf/render-example.json backend/plan2scene/conf/render.json

# Edit configs with your paths
nano backend/plan2scene/conf/plan2scene/seam_correct.json
nano backend/plan2scene/conf/render.json
```

### 4. Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Local Development

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Clone Plan2Scene as submodule
git submodule add https://github.com/3dlg-hcvc/plan2scene.git plan2scene
cd plan2scene
export PYTHONPATH=./code/src

# Setup texture-synthesis
wget https://github.com/EmbarkStudios/texture-synthesis/releases/download/0.8.2/texture_synthesis-v0.8.2-x86_64-unknown-linux-gnu.tar.gz
tar -xzf texture_synthesis-v0.8.2-x86_64-unknown-linux-gnu.tar.gz

# Run backend
cd ..
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure API endpoint
echo "REACT_APP_API_URL=http://localhost:8000" > .env.local

# Start development server
npm start
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

## Deployment

### Option 1: Railway (Recommended for Backend)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy backend
cd backend
railway up

# Set environment variables
railway variables set PLAN2SCENE_MODEL_PATH=/app/pretrained_models
```

**Note**: Railway's free tier (512MB RAM) is insufficient. You'll need the Developer plan ($5/month) with at least 2GB RAM.

### Option 2: Hugging Face Spaces (GPU Access)

```bash
# Create space with Docker
huggingface-cli login
huggingface-cli repo create plan2scene-app --type space --space_sdk docker

# Push to Hugging Face
git remote add hf https://huggingface.co/spaces/username/plan2scene-app
git push hf main
```

### Option 3: Google Cloud Run

```bash
# Build and push container
gcloud builds submit --tag gcr.io/PROJECT_ID/plan2scene-backend backend/

# Deploy
gcloud run deploy plan2scene-backend \
  --image gcr.io/PROJECT_ID/plan2scene-backend \
  --platform managed \
  --memory 4Gi \
  --timeout 900s
```

### Frontend Deployment (Vercel)

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Configuration

### Environment Variables

**Backend (.env):**
```bash
PLAN2SCENE_ROOT=/app/plan2scene
MODEL_PATH=/app/pretrained_models
DATA_PATH=/app/data
TEXTURE_SYNTHESIS_BIN=/app/texture_synthesis
REDIS_URL=redis://localhost:6379
MAX_QUEUE_SIZE=10
PROCESSING_TIMEOUT=900
```

**Frontend (.env):**
```bash
REACT_APP_API_URL=https://your-backend-url.railway.app
REACT_APP_MAX_FILE_SIZE=10485760
REACT_APP_MAX_PHOTOS=10
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm test

# Integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Performance Optimization

### GPU Acceleration

Edit `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Caching

The application caches:
- Pretrained models (loaded once at startup)
- Processed crops (reused for similar textures)
- Intermediate results (for resume capability)

### Queue Management

Configure Redis for job queue:
```python
# backend/app/config.py
QUEUE_CONFIG = {
    "max_concurrent_jobs": 2,
    "job_timeout": 900,  # 15 minutes
    "result_ttl": 3600,  # 1 hour
}
```

## Troubleshooting

### Common Issues

**1. Out of Memory Errors**
```bash
# Reduce batch size in config
docker-compose up -d --scale backend=1 --no-recreate
```

**2. Texture Synthesis Not Found**
```bash
# Verify binary path
ls -la /app/texture_synthesis
chmod +x /app/texture_synthesis
```

**3. Model Loading Fails**
```bash
# Check model files
ls -la backend/pretrained_models/
# Re-download if corrupted
```

**4. Long Processing Times**
- Ensure GPU is enabled
- Check CUDA drivers: `nvidia-smi`
- Monitor resources: `docker stats`

## Additional Resources

- [Plan2Scene Paper](https://arxiv.org/abs/2106.05375)
- [Project Page](https://3dlg-hcvc.github.io/plan2scene/)
- [Google Colab Demo](https://colab.research.google.com/drive/1lDkbfIV0drR1o9D0WYzoWeRskB91nXHq)
- [Rent3D++ Dataset](https://forms.gle/mKAmnrzAm3LCK9ua6)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file.

The Plan2Scene implementation is subject to its original license (see plan2scene/LICENSE).



## Acknowledgments

- Plan2Scene team at Simon Fraser University
- Original authors: Madhawa Vidanapathirana, Qirui Wu, Yasutaka Furukawa, Angel X. Chang, Manolis Savva
- Texture synthesis by Embark Studios

## Limitations

1. **Requires both floorplan AND photos** - Cannot work with floorplan alone
2. **Computational requirements** - Needs GPU for reasonable performance
3. **Dataset dependency** - Pretrained models trained on specific dataset
4. **Photo quality** - Results depend heavily on input photo quality


## Future Improvements

- [ ] Add support for floorplan-only mode (simplified 3D generation)
- [ ] Optimize for CPU-only inference
- [ ] Progressive result streaming
- [ ] Multi-floor support
- [ ] Custom texture upload
- [ ] VR/AR export formats

---

**Note**: This is a complex research project adapted for web deployment. For production use, consider dedicated GPU infrastructure or cloud ML platforms.