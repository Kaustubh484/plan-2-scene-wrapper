#!/bin/bash
set -e

echo "Checking for pretrained models..."

MODEL_DIR="/app/pretrained_models"
TEXTURE_SYNTH_MODEL="$MODEL_DIR/texture_synth_v2.ckpt"
TEXTURE_PROP_MODEL="$MODEL_DIR/texture_prop_v2.ckpt"

# Create directory
mkdir -p "$MODEL_DIR"

# Download texture synthesis model if missing
if [ ! -f "$TEXTURE_SYNTH_MODEL" ]; then
    echo "Downloading texture synthesis model (129MB)..."
    wget -q --show-progress \
        -O "$TEXTURE_SYNTH_MODEL" \
        "https://huggingface.co/datasets/3dlg-hcvc/plan2scene/resolve/main/checkpoints/texture_synth_v2.ckpt" \
        || echo "Warning: Could not download texture_synth_v2.ckpt"
fi

# Download texture propagation model if missing  
if [ ! -f "$TEXTURE_PROP_MODEL" ]; then
    echo "Downloading texture propagation model (1.3MB)..."
    wget -q --show-progress \
        -O "$TEXTURE_PROP_MODEL" \
        "https://huggingface.co/datasets/3dlg-hcvc/plan2scene/resolve/main/checkpoints/texture_prop_v2.ckpt" \
        || echo "Warning: Could not download texture_prop_v2.ckpt"
fi

echo "✓ Models ready!"

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
