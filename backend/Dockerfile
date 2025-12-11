FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements (Railway builds from root, so specify backend/)
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Clone Plan2Scene repository
RUN git clone https://github.com/3dlg-hcvc/plan2scene.git /app/plan2scene

# Set Python path
ENV PYTHONPATH=/app/plan2scene/code/src:$PYTHONPATH

# Download texture-synthesis binary (optional - used for seam correction)
# Note: Repository is archived, binary may not be available
# The application will work without it, but seam correction will be skipped
RUN wget -q https://github.com/EmbarkStudios/texture-synthesis/releases/download/0.8.2/texture_synthesis-v0.8.2-x86_64-unknown-linux-gnu.tar.gz \
    && tar -xzf texture_synthesis-v0.8.2-x86_64-unknown-linux-gnu.tar.gz \
    && mv texture_synthesis /app/texture_synthesis \
    && chmod +x /app/texture_synthesis \
    && rm texture_synthesis-v0.8.2-x86_64-unknown-linux-gnu.tar.gz \
    || echo "Warning: texture-synthesis binary not available, skipping..."

# Create directories
RUN mkdir -p /app/uploads /app/outputs /app/pretrained_models /app/data

# Copy application code (from root context)
COPY backend/app/ /app/app/

# Note: No datasets included - will use procedural texture generation

# Environment variables
ENV PLAN2SCENE_ROOT=/app/plan2scene
ENV MODEL_PATH=/app/pretrained_models
ENV TEXTURE_SYNTHESIS_BIN=/app/texture_synthesis
ENV PORT=8000

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]