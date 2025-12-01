// src/pages/BeltDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  Box,
  Grid2 as Grid,
  Paper,
  Typography,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  PlayCircle as PlayIcon,
  Pause as PauseIcon,
  Speed as SpeedIcon,
  Scale as ScaleIcon,
  Warning as WarningIcon,
  Build as MaintenanceIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  CameraAlt as CameraIcon,
  Timeline as TimelineIcon,
  ErrorOutline as ErrorIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useConveyor } from '../contexts/ConveyorContext';


const BeltDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { belts, cameras, alerts, updateBeltSpeed, resolveAlert } = useConveyor();

  const [belt, setBelt] = useState(null);
  const [relatedCamera, setRelatedCamera] = useState(null);
  const [beltAlerts, setBeltAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [speedDialog, setSpeedDialog] = useState(false);
  const [newSpeed, setNewSpeed] = useState('');

  useEffect(() => {
    loadBeltData();
  }, [id, belts, cameras, alerts]);

  const loadBeltData = () => {
    const foundBelt = belts.find(b => b.id === parseInt(id));
    if (foundBelt) {
      setBelt(foundBelt);

      // Find related camera
      if (foundBelt.camera) {
        const camera = cameras.find(c => c.id === foundBelt.camera.id);
        setRelatedCamera(camera);
      }

      // Filter alerts for this belt
      const beltAlerts = alerts.filter(a => a.conveyor_belt === parseInt(id));
      setBeltAlerts(beltAlerts);
    }

    setLoading(false);
  };

  const handleSpeedUpdate = async () => {
    const speed = parseFloat(newSpeed);
    if (!isNaN(speed) && speed >= 0) {
      await updateBeltSpeed(parseInt(id), speed);
      setSpeedDialog(false);
      setNewSpeed('');
    }
  };

  const handleResolveAlert = async (alertId) => {
    await resolveAlert(alertId);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!belt) {
    return (
      <Alert severity="error" sx={{ mt: 2, fontFamily: 'Vazirmatn' }}>
        نوار نقاله مورد نظر یافت نشد
      </Alert>
    );
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'operational': return 'success';
      case 'maintenance': return 'warning';
      case 'stopped': return 'error';
      default: return 'info';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'operational': return 'در حال کار';
      case 'maintenance': return 'تعمیرات';
      case 'stopped': return 'متوقف';
      default: return status;
    }
  };

  const unresolvedAlerts = beltAlerts.filter(alert => !alert.resolved);

  return (
    <Box>
      {/* هدر */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ ml: 2 }}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontFamily: 'Vazirmatn', fontWeight: 700 }}>
            {belt.name}
          </Typography>
          <Chip
            label={getStatusText(belt.status)}
            color={getStatusColor(belt.status)}
            sx={{ ml: 2, fontFamily: 'Vazirmatn' }}
          />
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Vazirmatn' }}>
          جزئیات کامل نوار نقاله و نظارت بر عملکرد
        </Typography>
      </Box>

      {/* تیتر تپ‌ها */}
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="نظارت زنده" icon={<CameraIcon />} iconPosition="start" sx={{ fontFamily: 'Vazirmatn' }} />
        <Tab label="آلارم‌ها" icon={<WarningIcon />} iconPosition="start" sx={{ fontFamily: 'Vazirmatn' }} />
        <Tab label="آمار و نمودار" icon={<TimelineIcon />} iconPosition="start" sx={{ fontFamily: 'Vazirmatn' }} />
        <Tab label="تاریخچه" icon={<HistoryIcon />} iconPosition="start" sx={{ fontFamily: 'Vazirmatn' }} />
        <Tab label="تنظیمات" icon={<SettingsIcon />} iconPosition="start" sx={{ fontFamily: 'Vazirmatn' }} />
      </Tabs>

      {/* محتوای تیتر تپ‌ها */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* ویدیو زنده */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Vazirmatn' }}>
                {relatedCamera ? relatedCamera.name : 'دوربین نظارتی'}
              </Typography>
              <Box sx={{ position: 'relative', height: 400, bgcolor: '#000', borderRadius: 1, overflow: 'hidden' }}>

              </Box>
            </Paper>
          </Grid>

          {/* متریک‌ها */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Vazirmatn' }}>
                متریک‌های لحظه‌ای
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn' }}>
                    سرعت فعلی
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn', fontWeight: 600 }}>
                    {belt.current_speed?.toFixed(2) || '0.00'} m/s
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((belt.current_speed || 0) * 40, 100)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn' }}>
                    بازدهی
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn', fontWeight: 600 }}>
                    {belt.average_efficiency?.toFixed(1) || '0.0'}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={belt.average_efficiency || 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* کنترل‌ها */}
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={belt.status === 'operational' ? <PauseIcon /> : <PlayIcon />}
                  color={belt.status === 'operational' ? 'warning' : 'success'}
                  onClick={() => setSpeedDialog(true)}
                  sx={{ fontFamily: 'Vazirmatn' }}
                >
                  {belt.status === 'operational' ? 'توقف' : 'راه‌اندازی'}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={loadBeltData}
                  sx={{ fontFamily: 'Vazirmatn' }}
                >
                  بروزرسانی
                </Button>
              </Box>

              {/* اطلاعات */}
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CameraIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="دوربین"
                    secondary={relatedCamera?.name || 'متصل نیست'}
                    primaryTypographyProps={{ fontFamily: 'Vazirmatn' }}
                    secondaryTypographyProps={{ fontFamily: 'Vazirmatn' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>

                  </ListItemIcon>
                  <ListItemText
                    primary="آخرین تعمیر"
                    secondary={belt.last_maintenance || 'بدون سابقه'}
                    primaryTypographyProps={{ fontFamily: 'Vazirmatn' }}
                    secondaryTypographyProps={{ fontFamily: 'Vazirmatn' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="آلارم‌های فعال"
                    secondary={unresolvedAlerts.length}
                    primaryTypographyProps={{ fontFamily: 'Vazirmatn' }}
                    secondaryTypographyProps={{ fontFamily: 'Vazirmatn' }}
                  />
                </ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* تیتر آلارم‌ها */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Vazirmatn' }}>
              آلارم‌های نوار نقاله
            </Typography>
            <Chip
              label={`${unresolvedAlerts.length} آلارم فعال`}
              color={unresolvedAlerts.length > 0 ? 'error' : 'success'}
              sx={{ fontFamily: 'Vazirmatn' }}
            />
          </Box>

          {beltAlerts.length === 0 ? (
            <Alert severity="info" sx={{ fontFamily: 'Vazirmatn' }}>
              هیچ آلارمی برای این نوار نقاله ثبت نشده است
            </Alert>
          ) : (
            <List>
              {beltAlerts.map((alert) => (
                <Card key={alert.id} sx={{ mb: 2, borderLeft: alert.severity === 'critical' ? '4px solid #f44336' :
                                                               alert.severity === 'high' ? '4px solid #ff9800' :
                                                               alert.severity === 'medium' ? '4px solid #ffc107' :
                                                               '4px solid #2196f3' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontFamily: 'Vazirmatn', fontWeight: 600 }}>
                          {alert.alert_type_display}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Vazirmatn' }}>
                          {new Date(alert.timestamp).toLocaleString('fa-IR')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn', mt: 1 }}>
                          {alert.message}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={alert.severity_display}
                          size="small"
                          color={alert.severity === 'critical' ? 'error' :
                                 alert.severity === 'high' ? 'warning' : 'info'}
                          sx={{ fontFamily: 'Vazirmatn' }}
                        />
                        {!alert.resolved && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CheckIcon />}
                            onClick={() => handleResolveAlert(alert.id)}
                            sx={{ fontFamily: 'Vazirmatn' }}
                          >
                            حل شد
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </List>
          )}
        </Paper>
      )}

      {/* تیتر نمودار */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Vazirmatn' }}>
            نمودار عملکرد - ۲۴ ساعت گذشته
          </Typography>
          <Box sx={{ height: 400 }}>
            <LineChart
              xAxis={[{ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }]}
              series={[
                {
                  data: [2, 3, 2.5, 4, 3.5, 3, 4, 3.8, 3.2, 2.8, 3.5, 4.2],
                  label: 'سرعت (m/s)',
                  color: '#00bcd4',
                },
                {
                  data: [85, 90, 87, 92, 89, 88, 93, 91, 89, 87, 90, 92],
                  label: 'بازدهی (%)',
                  color: '#4caf50',
                },
              ]}
            />
          </Box>
        </Paper>
      )}

      {/* دیالوگ تنظیم سرعت */}
      <Dialog open={speedDialog} onClose={() => setSpeedDialog(false)}>
        <DialogTitle sx={{ fontFamily: 'Vazirmatn' }}>
          تنظیم سرعت نوار نقاله
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom sx={{ fontFamily: 'Vazirmatn' }}>
            سرعت فعلی: {belt.current_speed?.toFixed(2) || '0.00'} m/s
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="سرعت جدید (m/s)"
            type="number"
            fullWidth
            value={newSpeed}
            onChange={(e) => setNewSpeed(e.target.value)}
            inputProps={{ step: 0.1, min: 0, max: 5 }}
            sx={{ fontFamily: 'Vazirmatn' }}
            InputLabelProps={{ sx: { fontFamily: 'Vazirmatn' } }}
          />
          <Alert severity="warning" sx={{ mt: 2, fontFamily: 'Vazirmatn' }}>
            تغییر سرعت ممکن است بر عملکرد سیستم تأثیر بگذارد
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSpeedDialog(false)} sx={{ fontFamily: 'Vazirmatn' }}>
            لغو
          </Button>
          <Button onClick={handleSpeedUpdate} variant="contained" sx={{ fontFamily: 'Vazirmatn' }}>
            اعمال تغییر
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BeltDetail;