// src/components/belts/BeltCard.jsx (به‌روزرسانی شده)
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  PlayCircle as PlayIcon,
  Pause as PauseIcon,
  Speed as SpeedIcon,
  Scale as ScaleIcon,
  Whatshot as TemperatureIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  MoreVert as MoreIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  ErrorOutline as ErrorIcon,
  CameraAlt as CameraIcon,
  Timeline as TimelineIcon,
  Build as MaintenanceIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useConveyor } from '../../contexts/ConveyorContext';

const BeltCard = ({ belt }) => {
  const navigate = useNavigate();
  const { updateBeltSpeed, resolveAlert } = useConveyor();
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState('');

  // استخراج داده‌های real-time از context اگر موجود باشد
  const realTimeData = null; // می‌توانید از context بیاورید

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

  const handleViewDetails = () => {
    navigate(`/belt/${belt.id}`);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    handleMenuClose();
    setDialogAction(action);
    setOpenDialog(true);
  };

  const confirmAction = async () => {
    setOpenDialog(false);

    switch(dialogAction) {
      case 'start':
        await updateBeltSpeed(belt.id, 2.5); // سرعت پیش‌فرض
        break;
      case 'stop':
        await updateBeltSpeed(belt.id, 0);
        break;
      case 'reset':
        // ریست آلارم‌ها
        if (belt.alerts && belt.alerts.length > 0) {
          belt.alerts.forEach(alert => {
            if (!alert.resolved) resolveAlert(alert.id);
          });
        }
        break;
      default:
        break;
    }
  };

  const getActionText = (action) => {
    switch(action) {
      case 'start': return 'راه‌اندازی';
      case 'stop': return 'توقف';
      case 'reset': return 'بازنشانی آلارم‌ها';
      default: return action;
    }
  };

  const getSpeedColor = (speed) => {
    if (speed === 0) return '#9e9e9e';
    if (speed > 2.5) return '#f44336';
    if (speed > 2) return '#ff9800';
    return '#4caf50';
  };

  // محاسبه بار بر اساس real-time data یا داده‌های ثابت
  const calculateLoad = () => {
    if (realTimeData?.object_count) {
      return Math.min((realTimeData.object_count / 10) * 100, 100);
    }
    return belt.average_efficiency || 50;
  };

  // محاسبه تعداد آلارم‌های حل نشده
  const unresolvedAlertsCount = belt.alerts ?
    belt.alerts.filter(alert => !alert.resolved).length : 0;

  return (
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: belt.status === 'stopped' ? '2px solid #f44336' :
                  belt.status === 'maintenance' ? '2px solid #ff9800' :
                  '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
          },
          cursor: 'pointer',
        }}
        onClick={handleViewDetails}
        tabIndex={0}
        role="button"
        aria-label={`جزئیات نوار نقاله ${belt.name}`}
      >
        {/* هدر */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            pb: 1,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'Vazirmatn' }}>
                {belt.name}
              </Typography>
              {belt.camera && (
                <Badge
                  badgeContent={belt.camera.status === 'active' ? '✓' : '✗'}
                  color={belt.camera.status === 'active' ? 'success' : 'error'}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem' } }}
                >
                  <CameraIcon fontSize="small" />
                </Badge>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Vazirmatn' }}>
              {belt.camera?.location || 'بدون دوربین'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={getStatusText(belt.status)}
              color={getStatusColor(belt.status)}
              size="small"
              sx={{ fontFamily: 'Vazirmatn', fontWeight: 500 }}
              icon={belt.status === 'stopped' ? <ErrorIcon /> :
                    belt.status === 'maintenance' ? <MaintenanceIcon /> : null}
            />
            {unresolvedAlertsCount > 0 && (
              <Badge badgeContent={unresolvedAlertsCount} color="error">
                <WarningIcon color="error" />
              </Badge>
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleMenuOpen(e);
              }}
              aria-label="منو"
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Box>

        {/* محتوا */}
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          {/* اطلاعات دوربین */}
          {belt.camera && (
            <Box
              sx={{
                position: 'relative',
                bgcolor: '#000',
                height: 180,
                borderRadius: 1,
                mb: 2,
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  background: belt.camera.status === 'active'
                    ? 'linear-gradient(45deg, #1a237e, #311b92)'
                    : 'linear-gradient(45deg, #424242, #616161)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  position: 'relative',
                }}
              >
                {belt.camera.status === 'active' ? (
                  <PlayIcon sx={{ fontSize: 60, opacity: 0.5 }} />
                ) : (
                  <MaintenanceIcon sx={{ fontSize: 60, opacity: 0.5 }} />
                )}

                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    padding: '2px 8px',
                    borderRadius: 1,
                    fontFamily: 'Vazirmatn',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <CameraIcon fontSize="small" />
                  {belt.camera.name}
                </Typography>

                {belt.camera.status !== 'active' && (
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      bgcolor: 'rgba(244, 67, 54, 0.7)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: 1,
                      fontFamily: 'Vazirmatn',
                    }}
                  >
                    غیرفعال
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* متریک‌ها */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SpeedIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn' }}>
                  سرعت:
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Vazirmatn',
                  fontWeight: 600,
                  color: getSpeedColor(belt.current_speed || 0)
                }}
              >
                {belt.current_speed?.toFixed(2) || '0.00'} m/s
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min((belt.current_speed || 0) * 40, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: getSpeedColor(belt.current_speed || 0),
                },
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ScaleIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn' }}>
                  بازدهی:
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'Vazirmatn',
                  fontWeight: 600,
                  color: belt.average_efficiency > 90 ? '#4caf50' :
                         belt.average_efficiency > 75 ? '#ff9800' : '#f44336'
                }}
              >
                {belt.average_efficiency?.toFixed(1) || '0.0'}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={belt.average_efficiency || 0}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: belt.average_efficiency > 90 ? '#4caf50' :
                           belt.average_efficiency > 75 ? '#ff9800' : '#f44336',
                },
              }}
            />
          </Box>

          {/* اطلاعات اضافی */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
              mt: 2,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <WarningIcon
                sx={{
                  color: unresolvedAlertsCount > 0 ? '#f44336' : '#4caf50',
                  mb: 0.5,
                  fontSize: '2rem'
                }}
              />
              <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn', mb: 0.5 }}>
                آلارم‌ها
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Vazirmatn',
                  color: unresolvedAlertsCount > 0 ? '#f44336' : '#4caf50'
                }}
              >
                {unresolvedAlertsCount}
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <MaintenanceIcon
                sx={{
                  color: belt.last_maintenance ? '#4caf50' : '#ff9800',
                  mb: 0.5,
                  fontSize: '2rem'
                }}
              />
              <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn', mb: 0.5 }}>
                آخرین تعمیر
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'Vazirmatn',
                  color: belt.last_maintenance ? '#4caf50' : '#ff9800'
                }}
              >
                {belt.last_maintenance || 'بدون سابقه'}
              </Typography>
            </Box>
          </Box>
        </CardContent>

        {/* اقدامات */}
        <CardActions sx={{ p: 2, pt: 0, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Tooltip title="مشاهده جزئیات">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails();
              }}
              aria-label="مشاهده جزئیات"
            >
              <ViewIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={belt.status === 'operational' ? 'توقف' : 'راه‌اندازی'}>
            <IconButton
              size="small"
              color={belt.status === 'operational' ? 'warning' : 'success'}
              onClick={(e) => {
                e.stopPropagation();
                handleAction(belt.status === 'operational' ? 'stop' : 'start');
              }}
              aria-label={belt.status === 'operational' ? 'توقف' : 'راه‌اندازی'}
            >
              {belt.status === 'operational' ? <StopIcon /> : <PlayIcon />}
            </IconButton>
          </Tooltip>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="تنظیمات">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/belt/${belt.id}/settings`);
              }}
              aria-label="تنظیمات"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>

      {/* منو */}
      <Menu
        id={`belt-menu-${belt.id}`}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={() => handleAction('start')}>
          <ListItemIcon>
            <PlayIcon fontSize="small" />
          </ListItemIcon>
          <Typography sx={{ fontFamily: 'Vazirmatn' }}>راه‌اندازی</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleAction('stop')}>
          <ListItemIcon>
            <StopIcon fontSize="small" />
          </ListItemIcon>
          <Typography sx={{ fontFamily: 'Vazirmatn' }}>توقف</Typography>
        </MenuItem>
        {unresolvedAlertsCount > 0 && (
          <MenuItem onClick={() => handleAction('reset')}>
            <ListItemIcon>
              <RefreshIcon fontSize="small" />
            </ListItemIcon>
            <Typography sx={{ fontFamily: 'Vazirmatn' }}>بازنشانی آلارم‌ها</Typography>
          </MenuItem>
        )}
        <MenuItem onClick={() => {
          handleMenuClose();
          handleViewDetails();
        }}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <Typography sx={{ fontFamily: 'Vazirmatn' }}>مشاهده کامل</Typography>
        </MenuItem>
      </Menu>

      {/* دیالوگ تایید */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle sx={{ fontFamily: 'Vazirmatn' }}>
          تایید عملیات
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: 'Vazirmatn' }}>
            آیا مطمئن هستید که می‌خواهید عمل "{getActionText(dialogAction)}" را بر روی نوار نقاله "{belt.name}" انجام دهید؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            sx={{ fontFamily: 'Vazirmatn' }}
          >
            لغو
          </Button>
          <Button
            onClick={confirmAction}
            variant="contained"
            color={dialogAction === 'stop' ? 'error' : 'primary'}
            sx={{ fontFamily: 'Vazirmatn' }}
          >
            تایید
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BeltCard;