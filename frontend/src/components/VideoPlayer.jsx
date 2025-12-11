import React, { useEffect, useState } from 'react';
import ReactPlayer from 'react-player';
import { Download, Loader } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

function VideoPlayer({ jobId }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideoUrl = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/status/${jobId}`);
        if (response.data.video_url) {
          setVideoUrl(`${API_URL}${response.data.video_url}`);
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch video URL:', err);
        setLoading(false);
      }
    };

    fetchVideoUrl();
  }, [jobId]);

  const handleDownload = () => {
    if (!videoUrl) return;
    
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `walkthrough_${jobId}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="video-player loading">
        <Loader className="spinner" size={48} />
        <p>Loading video...</p>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="video-player error">
        <p>Video not available</p>
      </div>
    );
  }

  return (
    <div className="video-player">
      <div className="player-container">
        <ReactPlayer
          url={videoUrl}
          controls
          width="100%"
          height="100%"
          playing={false}
        />
      </div>

      <button onClick={handleDownload} className="btn-secondary">
        <Download size={16} />
        Download Video
      </button>
    </div>
  );
}

export default VideoPlayer;
