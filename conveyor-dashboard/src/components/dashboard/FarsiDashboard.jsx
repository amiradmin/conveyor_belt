import React from 'react';
import HeaderSection from './components/HeaderSection';
import VideoProcessingSection from './components/VideoProcessingSection';
import StatisticsGrid from './components/StatisticsGrid';
import LiveMonitoringSection from './components/LiveMonitoringSection';
import AlertsSidebar from './components/AlertsSidebar';
import { useSystemStatus } from './hooks/useSystemStatus';
import { useVideoProcessing } from './hooks/useVideoProcessing';
import { useWebSocket } from './hooks/useWebSocket';

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
    processVideo,
    testBackendConnection
  } = useVideoProcessing();

  const { wsConnected } = useWebSocket(videoData, objectCount, beltSpeed);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری اطلاعات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <HeaderSection
        systemStatus={systemStatus}
        wsConnected={wsConnected}
        error={error}
        onTestConnection={testBackendConnection}
      />

      <VideoProcessingSection
        videoData={videoData}
        videoLoading={videoLoading}
        videoProgress={videoProgress}
        processedFrames={processedFrames}
        objectCount={objectCount}
        beltSpeed={beltSpeed}
        error={error}
        onProcessVideo={processVideo}
        onTestConnection={testBackendConnection}
      />

      <StatisticsGrid systemStatus={systemStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LiveMonitoringSection
          systemStatus={systemStatus}
          onRefresh={fetchSystemStatus}
        />
        <AlertsSidebar systemStatus={systemStatus} />
      </div>
    </div>
  );
};

export default FarsiDashboard;