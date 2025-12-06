import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid2 as Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  PlayCircle as PlayIcon,
  Pause as PauseIcon,
} from '@mui/icons-material';
import { conveyorBelts, systemMetrics } from '../data/sampleData';
import './MainDashboard.css';

function MainDashboard() {
  const navigate = useNavigate();
  const runningBelts = conveyorBelts.filter(b => b.status === 'running').length;
  const warningBelts = conveyorBelts.filter(b => b.status === 'warning').length;
  const alarmBelts = conveyorBelts.filter(b => b.status === 'alarm').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return '#ffcc00';
      case 'warning':
        return '#ffaa00';
      case 'alarm':
        return '#ff0000';
      case 'stopped':
        return '#666';
      default:
        return '#999';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <PlayIcon sx={{ fontSize: 20 }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: 20 }} />;
      case 'alarm':
        return <ErrorIcon sx={{ fontSize: 20 }} />;
      case 'stopped':
        return <PauseIcon sx={{ fontSize: 20 }} />;
      default:
        return <PauseIcon sx={{ fontSize: 20 }} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'running':
        return 'فعال';
      case 'warning':
        return 'هشدار';
      case 'alarm':
        return 'خطا';
      case 'stopped':
        return 'متوقف';
      default:
        return 'نامشخص';
    }
  };

  return (
    <Box className="main-dashboard">
      {/* Header */}
      <Box className="dashboard-header">
    <Box>
          <Typography variant="h4" className="dashboard-title">
          کنترل روم عملیات - فولاد شادگان
        </Typography>
          <Typography variant="body1" className="dashboard-subtitle">
          سیستم نظارت لحظه‌ای بر ۶ نوار نقاله اصلی
        </Typography>
        </Box>
      </Box>

      {/* Summary Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper className="metric-card">
            <Box className="metric-content">
              <SpeedIcon className="metric-icon" />
              <Box>
                <Typography variant="h4" className="metric-value">
                  {systemMetrics.totalThroughput}
                </Typography>
                <Typography variant="body2" className="metric-label">
                  خروجی کل ({systemMetrics.throughputUnit})
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper className="metric-card">
            <Box className="metric-content">
              <CheckIcon className="metric-icon active" />
              <Box>
                <Typography variant="h4" className="metric-value active">
                  {runningBelts}/۶
                </Typography>
                <Typography variant="body2" className="metric-label">
                  نوارهای فعال
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper className="metric-card">
            <Box className="metric-content">
              <WarningIcon className="metric-icon warning" />
              <Box>
                <Typography variant="h4" className="metric-value warning">
                  {systemMetrics.activeAlarms}
                </Typography>
                <Typography variant="body2" className="metric-label">
                  آلارم‌های فعال
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper className="metric-card">
            <Box className="metric-content">
              <SpeedIcon className="metric-icon" />
              <Box>
                <Typography variant="h4" className="metric-value">
                  {systemMetrics.efficiency}%
                </Typography>
                <Typography variant="body2" className="metric-label">
                  بازدهی سیستم
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Belts Grid */}
      <Box className="belts-section">
        <Box className="belts-header">
          <Typography variant="h5" className="belts-title">
            نوارهای نقاله
          </Typography>
          <Box className="status-chips">
            <Chip
              icon={<CheckIcon />}
              label={`${runningBelts} فعال`}
              className="status-chip active-chip"
            />
            <Chip
              icon={<WarningIcon />}
              label={`${warningBelts} هشدار`}
              className="status-chip warning-chip"
            />
            <Chip
              icon={<ErrorIcon />}
              label={`${alarmBelts} خطا`}
              className="status-chip error-chip"
            />
          </Box>
        </Box>

        <Grid container spacing={3}>
          {conveyorBelts.map((belt) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={belt.id}>
              <Card 
                className="belt-card"
                onClick={() => navigate('/simulator')}
                sx={{ cursor: 'pointer' }}
              >
                <CardContent>
                  <Box className="belt-card-header">
                    <Box className="belt-info">
                      <Typography variant="h6" className="belt-name">
                        نوار #{belt.id}
                      </Typography>
                      <Typography variant="body2" className="belt-description">
                        {belt.name}
                      </Typography>
                    </Box>
                    <Box 
                      className="belt-status-badge"
                      sx={{ 
                        backgroundColor: getStatusColor(belt.status),
                        color: belt.status === 'running' ? '#000' : '#fff'
                      }}
                    >
                      {getStatusIcon(belt.status)}
                      <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 700 }}>
                        {getStatusText(belt.status)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box className="belt-metrics">
                    <Box className="belt-metric-item">
                      <SpeedIcon className="metric-small-icon" />
                      <Box>
                        <Typography variant="caption" className="metric-small-label">
                          سرعت
                        </Typography>
                        <Typography variant="body2" className="metric-small-value">
                          {belt.speed} {belt.speedUnit}
                        </Typography>
                      </Box>
                    </Box>
                    <Box className="belt-metric-item">
                      <Box>
                        <Typography variant="caption" className="metric-small-label">
                          بار
                        </Typography>
                        <Typography variant="body2" className="metric-small-value">
                          {belt.load}{belt.loadUnit}
                        </Typography>
                      </Box>
                    </Box>
                    <Box className="belt-metric-item">
                      <Box>
                        <Typography variant="caption" className="metric-small-label">
                          دما
                        </Typography>
                        <Typography variant="body2" className="metric-small-value">
                          {belt.temperature}{belt.temperatureUnit}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {belt.alarms && belt.alarms.length > 0 && (
                    <Box className="belt-alarms">
                      <WarningIcon sx={{ fontSize: 16, color: '#ffcc00' }} />
                      <Typography variant="caption" className="alarm-count">
                        {belt.alarms.length} آلارم
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}

export default MainDashboard;
