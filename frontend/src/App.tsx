// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RTLayout from './components/layout/RTLayout';
import FarsiDashboard from './components/dashboard/FarsiDashboard';
import LiveMonitoring from './components/monitoring/LiveMonitoring';
import AlertsPage from './components/alerts/AlertsPage';
import AnalyticsPage from './components/analytics/AnalyticsPage';
import BeltMap from './components/map/BeltMap';
import ReportsPage from './components/reports/ReportsPage';
import SettingsPage from './components/settings/SettingsPage';
import CameraManagement from './components/cameras/CameraManagement';


function App() {
  return (
    <Router>
      <RTLayout>
        <Routes>
          <Route path="/" element={<FarsiDashboard />} />
          <Route path="/monitoring" element={<LiveMonitoring />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/map" element={<BeltMap />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/cameras" element={<CameraManagement />} />
        </Routes>
      </RTLayout>
    </Router>
  );
}

export default App;