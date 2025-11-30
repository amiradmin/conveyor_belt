// src/components/dashboard/FarsiDashboard.jsx
import React from 'react';
import HeaderSection from './components/HeaderSection';
import StatisticsGrid from './components/StatisticsGrid';
import LiveMonitoringSection from './components/LiveMonitoringSection';
import VideoProcessingSection from './components/VideoProcessingSection';
import AlertsSidebar from './components/AlertsSidebar';
import { useSystemStatus } from './hooks/useSystemStatus';
import { useVideoProcessing } from './hooks/useVideoProcessing';

const FarsiDashboard = () => {
  const { systemStatus, loading, fetchSystemStatus } = useSystemStatus();
  const {
    videoData,
    videoLoading,
    videoProgress,
    processedFrames,
    objectCount,
    beltSpeed,
    error,
    wsConnected,
    processVideo,
    testBackendConnection,
    reconnectWebSocket
  } = useVideoProcessing();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">در حال بارگذاری اطلاعات سیستم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <HeaderSection
          systemStatus={systemStatus}
          wsConnected={wsConnected}
          error={error}
          onTestConnection={testBackendConnection}
        />

        {/* Statistics */}
        <StatisticsGrid systemStatus={systemStatus} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* Left Column - Live Monitoring & Video Processing */}
          <div className="xl:col-span-3 space-y-6">

            {/* Live Monitoring - 4 Camera Feeds */}
            <LiveMonitoringSection />

            {/* Video Processing & Analysis */}
            <VideoProcessingSection
              videoData={videoData}
              videoLoading={videoLoading}
              videoProgress={videoProgress}
              processedFrames={processedFrames}
              objectCount={objectCount}
              beltSpeed={beltSpeed}
              error={error}
              wsConnected={wsConnected}
              onProcessVideo={processVideo}
              onTestConnection={testBackendConnection}
              onReconnect={reconnectWebSocket}
            />
          </div>

          {/* Right Column - Alerts Sidebar */}
          <div className="xl:col-span-1">
            <AlertsSidebar systemStatus={systemStatus} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarsiDashboard;