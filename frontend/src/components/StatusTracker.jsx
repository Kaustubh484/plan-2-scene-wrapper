import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Loader, AlertCircle, RotateCw } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const PROCESSING_STEPS = [
  { key: 'preprocess', label: 'Preprocessing images', progress: 10 },
  { key: 'embeddings', label: 'Extracting room features', progress: 25 },
  { key: 'textures', label: 'Selecting textures', progress: 40 },
  { key: 'propagation', label: 'Propagating textures', progress: 60 },
  { key: 'postprocess', label: 'Post-processing', progress: 75 },
  { key: 'model', label: 'Generating 3D model', progress: 85 },
  { key: 'video', label: 'Rendering video', progress: 95 },
  { key: 'complete', label: 'Complete', progress: 100 }
];

function StatusTracker({ jobId, onComplete, onReset }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    const pollStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/status/${jobId}`);
        const data = response.data;
        
        setStatus(data);

        if (data.status === 'completed') {
          onComplete(data);
        } else if (data.status === 'failed') {
          setError(data.error || 'Processing failed');
        }
      } catch (err) {
        console.error('Status check error:', err);
        setError('Failed to check status');
      }
    };

    // Poll every 2 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  if (!status) {
    return (
      <div className="status-tracker loading">
        <Loader className="spinner" size={48} />
        <p>Connecting...</p>
      </div>
    );
  }

  if (error || status.status === 'failed') {
    return (
      <div className="status-tracker error">
        <AlertCircle size={64} color="#ef4444" />
        <h2>Processing Failed</h2>
        <p>{error || status.error}</p>
        <button onClick={onReset} className="btn-secondary">
          <RotateCw size={20} />
          Try Again
        </button>
      </div>
    );
  }

  const currentProgress = status.progress || 0;
  const currentStep = PROCESSING_STEPS.findIndex(step => step.progress > currentProgress) - 1;

  return (
    <div className="status-tracker">
      <div className="status-header">
        <Loader className="spinner" size={32} />
        <div>
          <h2>Processing Your Floorplan</h2>
          <p className="job-id">Job ID: {jobId}</p>
        </div>
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${currentProgress}%` }}
          />
        </div>
        <span className="progress-text">{currentProgress}%</span>
      </div>

      <div className="steps-list">
        {PROCESSING_STEPS.map((step, index) => {
          const isComplete = currentProgress >= step.progress;
          const isCurrent = index === currentStep || index === currentStep + 1;

          return (
            <div 
              key={step.key} 
              className={`step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="step-icon">
                {isComplete ? (
                  <CheckCircle size={24} color="#10b981" />
                ) : isCurrent ? (
                  <Loader className="spinner" size={24} />
                ) : (
                  <Circle size={24} color="#9ca3af" />
                )}
              </div>
              <div className="step-content">
                <div className="step-label">{step.label}</div>
                {isCurrent && status.message && (
                  <div className="step-message">{status.message}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="estimated-time">
        <p>Estimated time remaining: {Math.max(0, Math.ceil((100 - currentProgress) / 10))} minutes</p>
        <p className="hint">You can close this page and return later</p>
      </div>
    </div>
  );
}

export default StatusTracker;
