import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CameraAnimator - Creates smooth camera flythrough animation
 */
export function CameraAnimator({ isRecording, onComplete }) {
  const { camera } = useThree();
  const timeRef = useRef(0);
  const durationRef = useRef(10); // 10 seconds
  
  useFrame((state, delta) => {
    if (!isRecording) return;
    
    timeRef.current += delta;
    const t = Math.min(timeRef.current / durationRef.current, 1);
    
    if (t >= 1) {
      onComplete?.();
      return;
    }
    
    // Circular camera path around the model
    const radius = 20;
    const height = 10 + Math.sin(t * Math.PI) * 5; // Vary height
    const angle = t * Math.PI * 2; // Full 360° rotation
    
    camera.position.x = Math.cos(angle) * radius;
    camera.position.y = height;
    camera.position.z = Math.sin(angle) * radius;
    
    // Always look at center
    camera.lookAt(0, 2, 0);
  });
  
  return null;
}

/**
 * VideoRecorder - Records canvas to MP4 video
 */
export class VideoRecorder {
  constructor(canvas, fps = 30, duration = 10) {
    this.canvas = canvas;
    this.fps = fps;
    this.duration = duration;
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
  }
  
  async start() {
    try {
      // Capture canvas stream
      this.stream = this.canvas.captureStream(this.fps);
      
      // Check supported MIME types
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];
      
      let mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
      
      if (!mimeType) {
        throw new Error('No supported video MIME type found');
      }
      
      console.log('Recording with MIME type:', mimeType);
      
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      this.chunks = [];
      
      // Collect data
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };
      
      // Start recording
      this.mediaRecorder.start();
      console.log('Recording started');
      
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }
  
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
        
        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
        }
        
        console.log('Recording stopped, blob size:', blob.size);
        resolve(blob);
      };
      
      this.mediaRecorder.onerror = (error) => {
        reject(error);
      };
      
      this.mediaRecorder.stop();
    });
  }
}

/**
 * Hook for recording walkthrough video
 */
export function useWalkthroughRecorder(canvasRef, jobId) {
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);
  
  const startRecording = async () => {
    if (!canvasRef.current) {
      setError('Canvas not available');
      return false;
    }
    
    try {
      setError(null);
      setProgress(0);
      
      // Create recorder
      recorderRef.current = new VideoRecorder(canvasRef.current, 30, 10);
      
      // Start recording
      const started = await recorderRef.current.start();
      if (!started) {
        setError('Failed to start recording');
        return false;
      }
      
      setIsRecording(true);
      
      // Progress timer
      const startTime = Date.now();
      const duration = 10000; // 10 seconds
      
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const percent = Math.min((elapsed / duration) * 100, 100);
        setProgress(percent);
        
        if (percent >= 100) {
          clearInterval(progressInterval);
        }
      }, 100);
      
      // Auto-stop after duration
      setTimeout(async () => {
        clearInterval(progressInterval);
        await stopRecording();
      }, duration);
      
      return true;
    } catch (err) {
      console.error('Recording error:', err);
      setError(err.message);
      setIsRecording(false);
      return false;
    }
  };
  
  const stopRecording = async () => {
    if (!recorderRef.current) return;
    
    try {
      const blob = await recorderRef.current.stop();
      setVideoBlob(blob);
      
      // Create URL for preview
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      
      setIsRecording(false);
      setProgress(100);
      
      // Upload to backend
      await uploadVideo(blob, jobId);
      
      return blob;
    } catch (err) {
      console.error('Stop recording error:', err);
      setError(err.message);
      setIsRecording(false);
    }
  };
  
  const uploadVideo = async (blob, jobId) => {
    const API_URL = process.env.REACT_APP_API_URL || '';
    
    try {
      const formData = new FormData();
      formData.append('video', blob, 'walkthrough.webm');
      formData.append('jobId', jobId);
      
      const response = await fetch(`${API_URL}/api/upload-video/${jobId}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        console.warn('Video upload failed, but local playback still works');
      } else {
        console.log('Video uploaded successfully');
      }
    } catch (err) {
      console.warn('Video upload error:', err);
      // Don't throw - local playback still works
    }
  };
  
  const downloadVideo = () => {
    if (!videoBlob) return;
    
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `walkthrough_${jobId}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);
  
  return {
    isRecording,
    startRecording,
    stopRecording,
    videoBlob,
    videoUrl,
    progress,
    error,
    downloadVideo
  };
}
