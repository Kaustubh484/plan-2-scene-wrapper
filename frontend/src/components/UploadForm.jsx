import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function UploadForm({ onUploadSuccess }) {
  const [floorplan, setFloorplan] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const onFloorplanDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFloorplan(Object.assign(file, {
        preview: URL.createObjectURL(file)
      }));
      setError(null);
    }
  }, []);

  const onPhotosDrop = useCallback((acceptedFiles) => {
    const newPhotos = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));
    
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 20)); // Max 20 photos
    setError(null);
  }, []);

  const floorplanDropzone = useDropzone({
    onDrop: onFloorplanDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const photosDropzone = useDropzone({
    onDrop: onPhotosDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: true
  });

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!floorplan) {
      setError('Please upload a floorplan image');
      return;
    }

    if (photos.length < 1) {
      setError('Please upload at least 1 room photo');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('floorplan', floorplan);
      
      photos.forEach(photo => {
        formData.append('photos', photo);
      });

      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.job_id) {
        onUploadSuccess(response.data.job_id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="upload-form">
      <div className="upload-section">
        <h2>1. Upload Floorplan</h2>
        <div 
          {...floorplanDropzone.getRootProps()} 
          className={`dropzone ${floorplanDropzone.isDragActive ? 'active' : ''}`}
        >
          <input {...floorplanDropzone.getInputProps()} />
          {floorplan ? (
            <div className="preview-container">
              <img src={floorplan.preview} alt="Floorplan preview" className="preview-image" />
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setFloorplan(null); }}
                className="remove-btn"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="dropzone-content">
              <Image size={48} />
              <p>Drag & drop floorplan image here, or click to browse</p>
              <span className="hint">PNG, JPG up to 10MB</span>
            </div>
          )}
        </div>
      </div>

      <div className="upload-section">
        <h2>2. Upload Room Photos ({photos.length}/20)</h2>
        <div 
          {...photosDropzone.getRootProps()} 
          className={`dropzone ${photosDropzone.isDragActive ? 'active' : ''}`}
        >
          <input {...photosDropzone.getInputProps()} />
          <div className="dropzone-content">
            <Upload size={48} />
            <p>Drag & drop room photos here, or click to browse</p>
            <span className="hint">Add 3-10 photos for best results</span>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="photos-grid">
            {photos.map((photo, index) => (
              <div key={index} className="photo-thumbnail">
                <img src={photo.preview} alt={`Photo ${index + 1}`} />
                <button 
                  type="button" 
                  onClick={() => removePhoto(index)}
                  className="remove-btn"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <button 
        type="submit" 
        className="btn-primary btn-large"
        disabled={!floorplan || photos.length < 1 || uploading}
      >
        {uploading ? 'Uploading...' : 'Generate 3D Model'}
      </button>

      <div className="requirements">
        <h4>Requirements:</h4>
        <ul>
          <li>Clear floorplan with visible room boundaries</li>
          <li>Photos showing walls, floors, and ceilings</li>
          <li>Multiple angles of different rooms recommended</li>
          <li>Processing time: 8-12 minutes</li>
        </ul>
      </div>
    </form>
  );
}

export default UploadForm;
