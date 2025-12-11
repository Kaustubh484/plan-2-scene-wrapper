#!/bin/bash

# Plan2Scene Setup Script
# This script sets up the Plan2Scene environment with all required dependencies

set -e

echo "====================================="
echo "Plan2Scene Web App Setup"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running in backend directory
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}Error: Please run this script from the backend directory${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Cloning Plan2Scene repository...${NC}"
if [ ! -d "plan2scene" ]; then
    git clone https://github.com/3dlg-hcvc/plan2scene.git plan2scene
    echo -e "${GREEN}✓ Plan2Scene cloned successfully${NC}"
else
    echo -e "${YELLOW}Plan2Scene already exists, skipping...${NC}"
fi

echo ""
echo -e "${GREEN}Step 2: Downloading texture-synthesis binary...${NC}"
if [ ! -f "texture_synthesis" ]; then
    wget https://github.com/EmbarkStudios/texture-synthesis/releases/download/0.8.2/texture_synthesis-v0.8.2-x86_64-unknown-linux-gnu.tar.gz
    tar -xzf texture_synthesis-v0.8.2-x86_64-unknown-linux-gnu.tar.gz
    chmod +x texture_synthesis
    rm texture_synthesis-v0.8.2-x86_64-unknown-linux-gnu.tar.gz
    echo -e "${GREEN}✓ Texture synthesis binary downloaded${NC}"
else
    echo -e "${YELLOW}Texture synthesis already exists, skipping...${NC}"
fi

echo ""
echo -e "${GREEN}Step 3: Creating directories...${NC}"
mkdir -p pretrained_models
mkdir -p data
mkdir -p uploads
mkdir -p outputs
echo -e "${GREEN}✓ Directories created${NC}"

echo ""
echo -e "${GREEN}Step 4: Downloading pretrained models...${NC}"
echo -e "${YELLOW}Note: This is a large download (~2GB). It may take several minutes.${NC}"
echo ""

# Download texture generation model
if [ ! -d "pretrained_models/texture_gen" ]; then
    echo "Downloading texture generation model..."
    wget -O texture_gen.zip https://aspis.cmpt.sfu.ca/projects/plan2scene/pretrained_models/texture_gen.zip
    unzip -q texture_gen.zip -d pretrained_models/
    rm texture_gen.zip
    echo -e "${GREEN}✓ Texture generation model downloaded${NC}"
else
    echo -e "${YELLOW}Texture generation model already exists, skipping...${NC}"
fi

# Download GNN propagation model
if [ ! -d "pretrained_models/gnn_prop" ]; then
    echo "Downloading GNN propagation model..."
    wget -O gnn_prop.zip https://aspis.cmpt.sfu.ca/projects/plan2scene/pretrained_models/gnn_prop.zip
    unzip -q gnn_prop.zip -d pretrained_models/
    rm gnn_prop.zip
    echo -e "${GREEN}✓ GNN propagation model downloaded${NC}"
else
    echo -e "${YELLOW}GNN propagation model already exists, skipping...${NC}"
fi

echo ""
echo -e "${GREEN}Step 5: Setting up configuration files...${NC}"

# Copy configuration files
cd plan2scene
if [ -f "conf/plan2scene/seam_correct-example.json" ]; then
    if [ ! -f "conf/plan2scene/seam_correct.json" ]; then
        cp conf/plan2scene/seam_correct-example.json conf/plan2scene/seam_correct.json
        # Update paths in config
        sed -i "s|TEXTURE_SYNTHESIS_PATH|$(pwd)/../texture_synthesis|g" conf/plan2scene/seam_correct.json
        echo -e "${GREEN}✓ Seam correction config created${NC}"
    fi
fi

if [ -f "conf/render-example.json" ]; then
    if [ ! -f "conf/render.json" ]; then
        cp conf/render-example.json conf/render.json
        echo -e "${GREEN}✓ Render config created${NC}"
    fi
fi

cd ..

echo ""
echo -e "${GREEN}Step 6: Installing Python dependencies...${NC}"
pip install -r requirements.txt
echo -e "${GREEN}✓ Python dependencies installed${NC}"

echo ""
echo "====================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "====================================="
echo ""
echo "Next steps:"
echo "1. Download Rent3D++ dataset (optional, for training):"
echo "   Visit: https://forms.gle/mKAmnrzAm3LCK9ua6"
echo ""
echo "2. Start the backend server:"
echo "   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "3. In another terminal, start the frontend:"
echo "   cd ../frontend"
echo "   npm install"
echo "   npm start"
echo ""
echo -e "${YELLOW}Note: First run may take longer as models are loaded${NC}"
echo ""
