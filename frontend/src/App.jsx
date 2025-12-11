import React, { useState } from 'react';
import UploadForm from './components/UploadForm';
import StatusTracker from './components/StatusTracker';
import ModelViewer from './components/ModelViewer';
import { Upload, Home, Info } from 'lucide-react';
import './App.css';

function App() {
  const [currentJob, setCurrentJob] = useState(null);
  const [view, setView] = useState('upload'); // 'upload', 'processing', 'results'

  const handleUploadSuccess = (jobId) => {
    setCurrentJob(jobId);
    setView('processing');
  };

  const handleProcessingComplete = (results) => {
    setView('results');
  };

  const handleReset = () => {
    setCurrentJob(null);
    setView('upload');
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>
            <Home size={32} />
            Plan2Scene
          </h1>
          <p>Convert 2D Floorplans to 3D Scenes</p>
        </div>
      </header>

      <main className="App-main">
        <div className="container">
          {view === 'upload' && (
            <div className="upload-section">
              <div className="info-box">
                <Info size={20} />
                <div>
                  <h3>How it works</h3>
                  <ol>
                    <li>Upload your floorplan image (PNG/JPG)</li>
                    <li>Add 3-10 photos of room interiors</li>
                    <li>Wait 8-12 minutes for processing</li>
                    <li>Download your 3D model and walkthrough video</li>
                  </ol>
                  <p className="note">
                    <strong>Note:</strong> Plan2Scene requires both floorplan and room photos 
                    to generate textured 3D models.
                  </p>
                </div>
              </div>
              
              <UploadForm onUploadSuccess={handleUploadSuccess} />
            </div>
          )}

          {view === 'processing' && currentJob && (
            <div className="processing-section">
              <StatusTracker 
                jobId={currentJob}
                onComplete={handleProcessingComplete}
                onReset={handleReset}
              />
            </div>
          )}

          {view === 'results' && currentJob && (
            <div className="results-section">
              <h2>Results Ready!</h2>
              
              <div className="results-single">
                <div className="result-card-full">
                  <h3>3D Model Viewer</h3>
                  <ModelViewer jobId={currentJob} />
                </div>
              </div>

              <button onClick={handleReset} className="btn-primary">
                <Upload size={20} />
                Process Another Floorplan
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="App-footer">
        <p>
          Powered by <a href="https://github.com/3dlg-hcvc/plan2scene" target="_blank" rel="noopener noreferrer">
            Plan2Scene
          </a> | <a href="https://arxiv.org/abs/2106.05375" target="_blank" rel="noopener noreferrer">
            Research Paper
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
