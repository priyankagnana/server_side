// Video compression utility using browser APIs
export const compressVideo = async (file, maxDuration = 30, maxWidth = 720, maxHeight = 1280, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      
      // Calculate dimensions
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // For video compression, we'll use MediaRecorder API
      video.onloadeddata = () => {
        const stream = canvas.captureStream(30); // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 2500000 // 2.5 Mbps
        });
        
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        };
        
        // Draw video frames to canvas
        const drawFrame = () => {
          if (video.paused || video.ended) {
            mediaRecorder.stop();
            return;
          }
          
          ctx.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(drawFrame);
        };
        
        video.currentTime = 0;
        mediaRecorder.start();
        video.play();
        drawFrame();
        
        // Limit duration
        setTimeout(() => {
          video.pause();
          mediaRecorder.stop();
        }, maxDuration * 1000);
      };
      
      video.src = URL.createObjectURL(file);
      video.load();
    };
    
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
};

// Simpler compression using FileReader and basic validation
// Also crops video to first 60 seconds if longer
// If video is under size limit and duration limit, skips compression
export const compressVideoSimple = async (file, maxSizeMB = 10, maxDuration = 60) => {
  return new Promise((resolve, reject) => {
    // Check file size first
    if (file.size > maxSizeMB * 1024 * 1024) {
      reject(new Error(`Video size must be less than ${maxSizeMB}MB`));
      return;
    }
    
    // Check duration and crop if needed
    getVideoDuration(file).then((duration) => {
      // If video is within both size and duration limits, skip compression
      // Just convert to base64 directly (no compression needed)
      if (duration <= maxDuration) {
        // Video is within limits, just convert to base64 without compression
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        // Video is longer than maxDuration, crop to first maxDuration seconds
        cropVideoToDuration(file, maxDuration).then((croppedBlob) => {
          // Convert cropped video to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(croppedBlob);
        }).catch(reject);
      }
    }).catch(reject);
  });
};

// Crop video to first N seconds
export const cropVideoToDuration = (file, maxDuration = 60) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    let videoUrl = null;
    
    const cleanup = () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        videoUrl = null;
      }
    };
    
    video.onloadedmetadata = () => {
      videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
      video.currentTime = 0;
      
      // Create canvas to capture video frames
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Create MediaRecorder to record the cropped video
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      mediaRecorder.onerror = (e) => {
        cleanup();
        reject(new Error('Failed to crop video'));
      };
      
      // Draw video frames to canvas
      const drawFrame = () => {
        if (video.currentTime >= maxDuration || video.ended) {
          mediaRecorder.stop();
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };
      
      video.oncanplay = () => {
        video.currentTime = 0;
        mediaRecorder.start();
        video.play();
        drawFrame();
        
        // Stop after maxDuration seconds
        setTimeout(() => {
          if (!video.ended) {
            video.pause();
          }
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, maxDuration * 1000);
      };
      
      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video'));
      };
      
      video.load();
    };
    
    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };
    
    const tempUrl = URL.createObjectURL(file);
    video.src = tempUrl;
  });
};

// Get video duration
export const getVideoDuration = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    let videoUrl = null;
    
    const cleanup = () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        videoUrl = null;
      }
    };
    
    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      resolve(duration);
    };
    
    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };
    
    videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
  });
};

