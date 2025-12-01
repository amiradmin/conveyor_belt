import React from 'react';
import {
  Box,
  Grid2 as Grid, // تغییر اینجا - استفاده از Grid2
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Button,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PlayCircle as PlayIcon,
  Pause as PauseIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { LineChart } from '@mui/x-charts/LineChart';
import BeltCard from '../components/belts/BeltCard';
import { conveyorBelts, systemMetrics, alarmHistory } from '../data/sampleData';

function MainDashboard() {
  const runningBelts = conveyorBelts.filter(b => b.status === 'running').length;
  const warningBelts = conveyorBelts.filter(b => b.status === 'warning').length;
  const alarmBelts = conveyorBelts.filter(b => b.status === 'alarm').length;

  return (
    <Box>
      {/* هدر */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontFamily: 'Vazirmatn', fontWeight: 700 }}>
          کنترل روم عملیات - فولاد شادگان
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Vazirmatn' }}>
          سیستم نظارت لحظه‌ای بر ۶ نوار نقاله اصلی
        </Typography>
      </Box>

      {/* متریک‌های کلی */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* تغییر اینجا */}
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <SpeedIcon sx={{ fontSize: 40, color: 'primary.main', ml: 1 }} />
              <Box>
                <Typography variant="h4" sx={{ fontFamily: 'Vazirmatn', fontWeight: 700 }}>
                  {systemMetrics.totalThroughput}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Vazirmatn' }}>
                  خروجی کل ({systemMetrics.throughputUnit})
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* تغییر اینجا */}
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <CheckIcon sx={{ fontSize: 40, color: 'success.main', ml: 1 }} />
              <Box>
                <Typography variant="h4" sx={{ fontFamily: 'Vazirmatn', fontWeight: 700, color: 'success.main' }}>
                  {runningBelts}/۶
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Vazirmatn' }}>
                  نوارهای فعال
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* تغییر اینجا */}
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <WarningIcon sx={{ fontSize: 40, color: 'warning.main', ml: 1 }} />
              <Box>
                <Typography variant="h4" sx={{ fontFamily: 'Vazirmatn', fontWeight: 700, color: 'warning.main' }}>
                  {systemMetrics.activeAlarms}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Vazirmatn' }}>
                  آلارم‌های فعال
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}> {/* تغییر اینجا */}
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main', ml: 1 }} />
              <Box>
                <Typography variant="h4" sx={{ fontFamily: 'Vazirmatn', fontWeight: 700 }}>
                  {systemMetrics.efficiency}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Vazirmatn' }}>
                  بازدهی سیستم
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* چارت */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}> {/* تغییر اینجا */}
          <Card>
            <CardHeader
              title="نمودار سرعت نوارها در ۲۴ ساعت گذشته"
              sx={{ fontFamily: 'Vazirmatn', textAlign: 'right' }}
              action={
                <IconButton>
                  <RefreshIcon />
                </IconButton>
              }
            />
            <CardContent sx={{ height: 300 }}>
              <LineChart
                xAxis={[{ data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }]}
                series={[
                  {
                    data: [2, 3, 2.5, 4, 3.5, 3, 4, 3.8, 3.2, 2.8, 3.5, 4.2],
                    label: 'نوار #۱',
                    color: '#00bcd4',
                  },
                  {
                    data: [1.5, 2, 1.8, 2.5, 2.2, 1.9, 2.8, 2.5, 2, 1.8, 2.2, 2.5],
                    label: 'نوار #۲',
                    color: '#ff9800',
                  },
                  {
                    data: [3, 3.2, 2.8, 3.5, 3.3, 3, 3.8, 3.5, 3.2, 3, 3.5, 3.8],
                    label: 'نوار #۳',
                    color: '#4caf50',
                  },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* آلارم‌ها */}
        <Grid size={{ xs: 12, md: 4 }}> {/* تغییر اینجا */}
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title="آلارم‌های اخیر"
              sx={{ fontFamily: 'Vazirmatn', textAlign: 'right' }}
              action={
                <Chip
                  label={alarmHistory.filter(a => !a.acknowledged).length + " جدید"}
                  color="error"
                  size="small"
                  sx={{ fontFamily: 'Vazirmatn' }}
                />
              }
            />
            <CardContent>
              <Stack spacing={2}>
                {alarmHistory.slice(0, 5).map((alarm) => (
                  <Paper
                    key={alarm.id}
                    sx={{
                      p: 2,
                      borderRight: alarm.type === 'critical' ? '4px solid #f44336' :
                                  alarm.type === 'warning' ? '4px solid #ff9800' :
                                  '4px solid #2196f3',
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn', fontWeight: 500 }}>
                        نوار #{alarm.beltId}
                      </Typography>
                      <Chip
                        label={alarm.type === 'critical' ? 'بحرانی' : alarm.type === 'warning' ? 'هشدار' : 'اطلاع'}
                        size="small"
                        color={alarm.type === 'critical' ? 'error' : alarm.type === 'warning' ? 'warning' : 'info'}
                        sx={{ fontFamily: 'Vazirmatn', fontSize: '0.7rem' }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ fontFamily: 'Vazirmatn', mb: 1 }}>
                      {alarm.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Vazirmatn' }}>
                      {alarm.time}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2, fontFamily: 'Vazirmatn' }}
              >
                مشاهده همه آلارم‌ها
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* نوارهای نقاله */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontFamily: 'Vazirmatn', fontWeight: 600 }}>
            نوارهای نقاله
          </Typography>
          <Box>
            <Chip
              icon={<CheckIcon />}
              label={`${runningBelts} فعال`}
              color="success"
              variant="outlined"
              sx={{ ml: 1, fontFamily: 'Vazirmatn' }}
            />
            <Chip
              icon={<WarningIcon />}
              label={`${warningBelts} هشدار`}
              color="warning"
              variant="outlined"
              sx={{ ml: 1, fontFamily: 'Vazirmatn' }}
            />
            <Chip
              icon={<ErrorIcon />}
              label={`${alarmBelts} خطا`}
              color="error"
              variant="outlined"
              sx={{ ml: 1, fontFamily: 'Vazirmatn' }}
            />
          </Box>
        </Box>

        <Grid container spacing={3}>
          {conveyorBelts.map((belt) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={belt.id}> {/* تغییر اینجا */}
              <BeltCard belt={belt} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* کنترل‌های سریع */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Vazirmatn', fontWeight: 600 }}>
          کنترل‌های سریع
        </Typography>
        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}> {/* تغییر اینجا */}
            <Button
              fullWidth
              variant="contained"
              startIcon={<PlayIcon />}
              color="success"
              sx={{ fontFamily: 'Vazirmatn' }}
            >
              راه‌اندازی همه
            </Button>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}> {/* تغییر اینجا */}
            <Button
              fullWidth
              variant="contained"
              startIcon={<PauseIcon />}
              color="warning"
              sx={{ fontFamily: 'Vazirmatn' }}
            >
              توقف اضطراری
            </Button>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}> {/* تغییر اینجا */}
            <Button
              fullWidth
              variant="outlined"
              sx={{ fontFamily: 'Vazirmatn' }}
            >
              گزارش روزانه
            </Button>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}> {/* تغییر اینجا */}
            <Button
              fullWidth
              variant="outlined"
              sx={{ fontFamily: 'Vazirmatn' }}
            >
              تنظیمات سیستم
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default MainDashboard;