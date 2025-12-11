import React, { Suspense, useEffect, useState, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import * as THREE from 'three';
import { Download, Loader, Video as VideoIcon } from 'lucide-react';
import axios from 'axios';
import { CameraAnimator, useWalkthroughRecorder } from './VideoRecorder';

const API_URL = process.env.REACT_APP_API_URL || '';

// Component to load and display the OBJ model with textures
function Model({ objUrl, mtlUrl }) {
  // Load MTL first, then OBJ
  const materials = useLoader(MTLLoader, mtlUrl);
  const obj = useLoader(OBJLoader, objUrl, (loader) => {
    // Apply materials to OBJ loader
    materials.preload();
    loader.setMaterials(materials);
  });
  
  useEffect(() => {
    // Center and scale the model
    if (obj) {
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      // Center the model
      obj.position.x = -center.x;
      obj.position.y = -center.y;
      obj.position.z = -center.z;
      
      // Scale to fit in view
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 10 / maxDim;
      obj.scale.set(scale, scale, scale);
    }
  }, [obj]);
  
  return <primitive object={obj} />;
}

function ModelViewer({ jobId }) {
  const [modelUrl, setModelUrl] = useState(null);
  const [mtlUrl, setMtlUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  
  // Video recording
  const {
    isRecording,
    startRecording,
    videoUrl,
    progress,
    error: recordError,
    downloadVideo
  } = useWalkthroughRecorder(canvasRef, jobId);

  useEffect(() => {
    const fetchModelUrl = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/status/${jobId}`);
        if (response.data.model_url) {
          // Add cache-busting timestamp to force reload
          const timestamp = Date.now();
          const objUrl = `${API_URL}${response.data.model_url}?t=${timestamp}`;
          const mtlUrlPath = response.data.model_url.replace('.obj', '.mtl');
          const mtlUrl = `${API_URL}${mtlUrlPath}?t=${timestamp}`;
          
          setModelUrl(objUrl);
          setMtlUrl(mtlUrl);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch model URL:', err);
        setError('Failed to load model');
        setLoading(false);
      }
    };

    fetchModelUrl();
  }, [jobId]);

  const handleDownload = async (format) => {
    if (!modelUrl) return;
    
    const link = document.createElement('a');
    link.href = modelUrl;
    link.download = `model_${jobId}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="model-viewer loading">
        <Loader className="spinner" size={48} />
        <p>Loading 3D model...</p>
      </div>
    );
  }

  if (error || !modelUrl || !mtlUrl) {
    return (
      <div className="model-viewer error">
        <p>{error || 'Model not available'}</p>
      </div>
    );
  }

  return (
    <div className="model-viewer">
      <div className="canvas-container">
        <Canvas ref={canvasRef}>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[15, 15, 15]} />
            <OrbitControls enableDamping enabled={!isRecording} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={0.8} />
            <directionalLight position={[-10, -10, -5]} intensity={0.3} />
            <gridHelper args={[20, 20]} />
            
            {/* Load actual OBJ model with MTL textures */}
            <Model objUrl={modelUrl} mtlUrl={mtlUrl} />
            
            {/* Camera animation for recording */}
            <CameraAnimator 
              isRecording={isRecording} 
              onComplete={() => console.log('Animation complete')}
            />
          </Suspense>
        </Canvas>
        
        {/* Recording overlay */}
        {isRecording && (
          <div className="recording-overlay">
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              Recording Walkthrough...
            </div>
            <div className="recording-progress">
              <div 
                className="recording-progress-bar" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div className="model-controls">
        <button onClick={() => handleDownload('obj')} className="btn-secondary">
          <Download size={16} />
          Download OBJ
        </button>
        <button onClick={() => handleDownload('blend')} className="btn-secondary">
          <Download size={16} />
          Download Blender
        </button>
        <button 
          onClick={startRecording} 
          className="btn-secondary"
          disabled={isRecording}
        >
          <VideoIcon size={16} />
          {isRecording ? 'Recording...' : 'Record Walkthrough'}
        </button>
        {videoUrl && (
          <button onClick={downloadVideo} className="btn-secondary">
            <Download size={16} />
            Download Video
          </button>
        )}
      </div>

      {recordError && (
        <div className="error-message">
          Video recording error: {recordError}
        </div>
      )}

      <div className="viewer-hint">
        <p>🖱️ Click and drag to rotate | Scroll to zoom | Record a 360° walkthrough video</p>
      </div>
    </div>
  );
}

export default ModelViewer;
