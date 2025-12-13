import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './VideoProcessingSection.module.css';
import CameraFeedCard from './CameraFeedCard';
import AIProcessedFeedCard from './AIProcessedFeedCard';
import CameraControls from './CameraControls';
import StatusPanel from './StatusPanel';
import InfoBox from './InfoBox';

export default function VideoProcessingSection({
  cameraUrl,
  videoRef,
  showVideoModal,
  setShowVideoModal,
  availableVideos = [],
  selectedVideoPath,
  setSelectedVideoPath,
  processVideoFile,
  analysisResults,
  processedFrame,
  showProcessedFeed,
  toggleVideoProcessing,
  startRealTimeProcessing = null,
  lastProcessedTime,
  processingFPS = 2,
  frameCount = 0,
  currentFPS = 0,
  processingStatus = null,
  processedVideoUrl = null,
  processingProgress = 0,
  isProcessingProp = false
}) {
  const processedVideoRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFrames, setProcessedFrames] = useState([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [showProcessedVideo, setShowProcessedVideo] = useState(false);
  const [streamingMode, setStreamingMode] = useState('frames');

  // Track if we've already auto-started after processing completes
  const autoStartedRef = useRef(false);

  // Reset when processing starts
  useEffect(() => {
    // Check if processingStatus is an object with active_jobs property
    const activeJobs = typeof processingStatus === 'object' && processingStatus !== null
      ? processingStatus.active_jobs
      : (isProcessingProp ? 1 : 0);
    const completedJobs = typeof processingStatus === 'object' && processingStatus !== null
      ? processingStatus.completed_jobs
      : 0;

    if (activeJobs > 0 || isProcessingProp) {
      setIsProcessing(true);
      setProcessedFrames([]);
      setCurrentFrameIndex(0);
      setShowProcessedVideo(false);
      setStreamingMode('frames');
      autoStartedRef.current = false; // Reset flag when processing starts
      // Keep the processed feed card visible during processing
      // Don't hide it - just show loading state
    } else if (activeJobs === 0 && completedJobs > 0 && !autoStartedRef.current) {
      setIsProcessing(false);
      autoStartedRef.current = true; // Mark as auto-started

      console.log('Video processing completed, preparing to auto-start frame capture', {
        hasVideoRef: !!videoRef,
        hasVideoElement: !!(videoRef && videoRef.current),
        videoReadyState: videoRef?.current?.readyState,
        showProcessedFeed,
        hasToggleFunction: !!toggleVideoProcessing
      });

      // After processing completes, automatically start capturing frames if video is available
      if (videoRef && videoRef.current && toggleVideoProcessing) {
        // Ensure video is playing
        const ensureVideoPlaying = () => {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(err => {
              console.warn('Auto-play prevented, will try again:', err);
            });
          }
        };

        // Small delay to ensure video is ready, then start processing
        const timeoutId = setTimeout(() => {
          ensureVideoPlaying();

          // Check if showProcessedFeed is false - if so, toggle it on
          // If it's already true, we need to restart processing (toggle off then on)
          if (!showProcessedFeed) {
            // Check if video is ready
            if (videoRef.current && videoRef.current.readyState >= 2) {
              console.log('Video ready, auto-starting frame capture (showProcessedFeed was false)');
              toggleVideoProcessing();
            } else {
              // Wait for video to be ready
              console.log('Video not ready yet, waiting...');
              let attempts = 0;
              const maxAttempts = 25; // 5 seconds max (25 * 200ms)
              const checkReady = setInterval(() => {
                attempts++;
                if (videoRef.current && videoRef.current.readyState >= 2) {
                  console.log('Video ready after waiting, auto-starting frame capture');
                  ensureVideoPlaying();
                  toggleVideoProcessing();
                  clearInterval(checkReady);
                } else if (attempts >= maxAttempts) {
                  console.warn('Video did not become ready in time, starting anyway');
                  ensureVideoPlaying();
                  toggleVideoProcessing();
                  clearInterval(checkReady);
                }
              }, 200);
            }
          } else {
            // showProcessedFeed is already true, but processing might have been stopped
            // We can directly start processing without toggling
            console.log('showProcessedFeed is already true, restarting processing directly');
            ensureVideoPlaying();
            // Use startRealTimeProcessing directly if available, otherwise toggle
            if (startRealTimeProcessing) {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                console.log('Video ready, restarting frame capture directly');
                startRealTimeProcessing();
              } else {
                // Wait for video to be ready
                const waitForVideo = setInterval(() => {
                  if (videoRef.current && videoRef.current.readyState >= 2) {
                    clearInterval(waitForVideo);
                    console.log('Video ready, restarting frame capture directly');
                    startRealTimeProcessing();
                  }
                }, 100);
                // Clear after 3 seconds
                setTimeout(() => clearInterval(waitForVideo), 3000);
              }
            } else {
              // Fallback to toggle method if startRealTimeProcessing not available
              console.log('startRealTimeProcessing not available, using toggle method');
              toggleVideoProcessing(); // Turn off
              setTimeout(() => {
                toggleVideoProcessing(); // Turn back on
              }, 200);
            }
          }
        }, 1500); // Increased delay to 1.5 seconds
        return () => clearTimeout(timeoutId);
      } else {
        console.warn('Cannot auto-start: missing videoRef or toggleVideoProcessing', {
          hasVideoRef: !!videoRef,
          hasVideoElement: !!(videoRef && videoRef.current),
          hasToggleFunction: !!toggleVideoProcessing
        });
      }

      if (processedVideoUrl) {
        setStreamingMode('video');
        setShowProcessedVideo(true);
      }
    }
  }, [processingStatus, processedVideoUrl, videoRef, showProcessedFeed, toggleVideoProcessing, isProcessingProp, startRealTimeProcessing]);

  // Handle incoming processed frames
  useEffect(() => {
    if (processedFrame && showProcessedFeed) {
      console.log('New processed frame received:', processedFrame.substring(0, 50) + '...');
      setProcessedFrames(prev => {
        const newFrames = [...prev, processedFrame];
        // Keep only last 100 frames
        return newFrames.length > 100 ? newFrames.slice(-100) : newFrames;
      });
    }
  }, [processedFrame, showProcessedFeed]);

  // Auto-play processed video
  useEffect(() => {
    if (processedVideoRef.current && showProcessedVideo && processedVideoUrl) {
      console.log('Loading processed video:', processedVideoUrl);
      processedVideoRef.current.load();
      const playVideo = () => {
        processedVideoRef.current.play().catch(e => {
          console.log('Auto-play prevented, waiting for user interaction');
        });
      };

      // Try to play after a short delay
      const timer = setTimeout(playVideo, 100);
      return () => clearTimeout(timer);
    }
  }, [showProcessedVideo, processedVideoUrl]);

  // Animate through frames - optimized for smooth video-like streaming
  useEffect(() => {
    if (!showProcessedFeed || streamingMode !== 'frames' || processedFrames.length < 1) {
      return;
    }

    // Use requestAnimationFrame for smoother animation
    let animationFrameId;
    let lastFrameTime = performance.now();

    const animate = (currentTime) => {
      const targetFPS = Math.max(1, currentFPS || processingFPS);
      const targetInterval = 1000 / targetFPS;
      const elapsed = currentTime - lastFrameTime;

      if (elapsed >= targetInterval && processedFrames.length > 0) {
        setCurrentFrameIndex(prev => {
          // Cycle through frames smoothly
          const nextIndex = (prev + 1) % processedFrames.length;
          return nextIndex;
        });
        lastFrameTime = currentTime - (elapsed % targetInterval);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [showProcessedFeed, streamingMode, processedFrames.length, currentFPS, processingFPS]);

  // Get current frame for display
  const getCurrentFrame = useCallback(() => {
    if (streamingMode === 'video' && showProcessedVideo) {
      return null;
    }
    if (processedFrames.length > 0 && streamingMode === 'frames') {
      return processedFrames[currentFrameIndex] || processedFrame;
    }
    return processedFrame;
  }, [streamingMode, showProcessedVideo, processedFrames, currentFrameIndex, processedFrame]);

  const currentDisplayFrame = getCurrentFrame();

  const takeSnapshot = () => {
    try {
      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not found');
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Add timestamp
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, canvas.height - 40, 200, 30);
      ctx.fillStyle = '#4CAF50';
      ctx.font = '14px Arial';
      ctx.fillText(`Snapshot: ${new Date().toLocaleTimeString()}`, 20, canvas.height - 20);

      // Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `conveyor_snapshot_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.warn('Video snapshot failed, using fallback:', error);
      // Fallback to simple snapshot
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#37474F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.fillText('Conveyor Snapshot', 200, 240);
      ctx.font = '16px Arial';
      ctx.fillText(new Date().toLocaleTimeString(), 250, 280);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `fallback_snapshot_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const takeProcessedSnapshot = () => {
    try {
      if (streamingMode === 'video' && showProcessedVideo && processedVideoRef.current) {
        const canvas = document.createElement('canvas');
        const video = processedVideoRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Add overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, canvas.height - 40, 220, 30);
        ctx.fillStyle = '#4CAF50';
        ctx.font = '14px Arial';
        ctx.fillText(`AI Processed: ${new Date().toLocaleTimeString()}`, 20, canvas.height - 20);

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `ai_video_snapshot_${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (currentDisplayFrame) {
        // Capture from current frame
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Add overlay
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(10, canvas.height - 40, 220, 30);
          ctx.fillStyle = '#4CAF50';
          ctx.font = '14px Arial';
          ctx.fillText(`AI Frame: ${new Date().toLocaleTimeString()}`, 20, canvas.height - 20);

          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `ai_frame_snapshot_${Date.now()}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
        img.onerror = () => {
          alert('Failed to load processed frame for snapshot');
        };
        img.src = currentDisplayFrame;
      } else {
        alert('No processed content available for snapshot');
      }
    } catch (error) {
      console.error('Processed snapshot error:', error);
      alert('Unable to capture processed snapshot');
    }
  };

  const handleProcessedVideoLoaded = () => {
    console.log('Processed video loaded successfully');
  };

  const handleProcessedVideoError = (e) => {
    console.error('Processed video error:', e);
    setShowProcessedVideo(false);
    setStreamingMode('frames');
  };

  const switchToFrameMode = () => {
    setStreamingMode('frames');
    setShowProcessedVideo(false);
  };

  const switchToVideoMode = () => {
    if (processedVideoUrl) {
      setStreamingMode('video');
      setShowProcessedVideo(true);
    }
  };

  // Debug info
  useEffect(() => {
    console.log('VideoProcessingSection state:', {
      isProcessing,
      streamingMode,
      showProcessedVideo,
      processedFramesCount: processedFrames.length,
      currentFrameIndex,
      hasCurrentFrame: !!currentDisplayFrame,
      processingProgress,
      frameCount,
      currentFPS,
      processedVideoUrl
    });
  }, [isProcessing, streamingMode, showProcessedVideo, processedFrames.length, currentFrameIndex, currentDisplayFrame, processingProgress, frameCount, currentFPS, processedVideoUrl]);

  // Calculate if we should show the status panel
  const shouldShowStatusPanel = showProcessedFeed || isProcessing ||
    (processingStatus && typeof processingStatus === 'object' &&
     (processingStatus.active_jobs > 0 || processingStatus.completed_jobs > 0));

  return (
    <div className={styles.videoProcessingSection}>
      <div className={styles.videoCards}>
        <CameraFeedCard
          cameraUrl={cameraUrl}
          videoRef={videoRef}
          setShowVideoModal={setShowVideoModal}
          toggleVideoProcessing={toggleVideoProcessing}
          showProcessedFeed={showProcessedFeed}
          takeSnapshot={takeSnapshot}
        />

        {(showProcessedFeed || isProcessing || (processingStatus && typeof processingStatus === 'object' && (processingStatus.active_jobs > 0 || processingStatus.completed_jobs > 0))) && (
          <AIProcessedFeedCard
            isProcessing={isProcessing}
            streamingMode={streamingMode}
            processedVideoUrl={processedVideoUrl}
            processedVideoRef={processedVideoRef}
            currentDisplayFrame={currentDisplayFrame}
            processedFrames={processedFrames}
            currentFrameIndex={currentFrameIndex}
            processedFrame={processedFrame}
            analysisResults={analysisResults}
            frameCount={frameCount}
            currentFPS={currentFPS}
            processingFPS={processingFPS}
            processingProgress={processingProgress}
            switchToFrameMode={switchToFrameMode}
            switchToVideoMode={switchToVideoMode}
            takeProcessedSnapshot={takeProcessedSnapshot}
            handleProcessedVideoLoaded={handleProcessedVideoLoaded}
            handleProcessedVideoError={handleProcessedVideoError}
          />
        )}
      </div>



      {shouldShowStatusPanel && processedFrames !== undefined && (
        <StatusPanel
          isProcessing={isProcessing}
          streamingMode={streamingMode}
          processingProgress={processingProgress}
          frameCount={frameCount}
          processedFrames={processedFrames || []}
          currentFPS={currentFPS}
          processingFPS={processingFPS}
          lastProcessedTime={lastProcessedTime}
          processedVideoUrl={processedVideoUrl}
          switchToFrameMode={switchToFrameMode}
          switchToVideoMode={switchToVideoMode}
          toggleVideoProcessing={toggleVideoProcessing}
          showProcessedFeed={showProcessedFeed}
        />
      )}

      <InfoBox />
    </div>
  );
}