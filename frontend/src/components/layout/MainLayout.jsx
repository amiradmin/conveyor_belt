import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton, // اضافه کردن ListItemButton
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Badge,
  Avatar,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  PlayCircle as PlayCircleIcon,
  Speed as SpeedIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { Outlet, useNavigate } from 'react-router-dom'; // اضافه کردن useNavigate
import { conveyorBelts, systemMetrics } from '../../data/sampleData';

const drawerWidth = 260;

function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'ناهنجاری در نوار شماره ۲ شناسایی شد', time: '۲ دقیقه پیش', read: false },
    { id: 2, message: 'سرعت نوار شماره ۴ کاهش یافت', time: '۱۵ دقیقه پیش', read: false },
    { id: 3, message: 'نگهداری پیشگیرانه فردا انجام شود', time: '۱ ساعت پیش', read: true },
  ]);

  const navigate = useNavigate(); // استفاده از useNavigate
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'داشبورد اصلی', icon: <DashboardIcon />, path: '/' },
    { text: 'نوارهای نقاله', icon: <PlayCircleIcon />, path: '/simulator' },
    { text: 'آلارم‌ها', icon: <WarningIcon />, path: '/alarms', badge: unreadNotifications },
    { text: 'متریک‌ها', icon: <SpeedIcon />, path: '/metrics' },
    { text: 'تاریخچه', icon: <HistoryIcon />, path: '/history' },
    { text: 'تنظیمات', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ 
        justifyContent: 'center', 
        py: 2,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
        borderBottom: '1px solid rgba(255, 204, 0, 0.2)'
      }}>
        <Avatar
          sx={{
            width: 60,
            height: 60,
            bgcolor: '#ffcc00',
            color: '#000',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            boxShadow: '0 0 12px rgba(255, 204, 0, 0.4)',
          }}
        >
          فولاد
        </Avatar>
      </Toolbar>
      <Divider />
      <List sx={{ px: 2 }}>
        {menuItems.map((item) => (
          <ListItem
            key={item.text}
            disablePadding
            sx={{
              borderRadius: 2,
              mb: 1,
            }}
          >
            <ListItemButton
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: 'rgba(255, 204, 0, 0.1)',
                  borderLeft: '3px solid #ffcc00',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255, 204, 0, 0.15)',
                  borderLeft: '3px solid #ffcc00',
                },
              }}
            >
              <ListItemIcon sx={{ color: '#ffcc00', minWidth: 40 }}>
                {item.badge ? (
                  <Badge 
                    badgeContent={item.badge} 
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#ffcc00',
                        color: '#000',
                        fontWeight: 'bold',
                      }
                    }}
                    size="small"
                  >
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontFamily: 'Vazirmatn',
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ mt: 'auto' }} />
      <List sx={{ px: 2 }}>
        <ListItem disablePadding>
          <ListItemButton
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 204, 0, 0.1)',
                borderLeft: '3px solid #ffcc00',
              },
            }}
          >
            <ListItemIcon sx={{ color: '#ffcc00', minWidth: 40 }}>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText
              primary="پروفایل اپراتور"
              primaryTypographyProps={{
                fontFamily: 'Vazirmatn',
                fontSize: '0.9rem',
                color: '#e8e8e8',
              }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 204, 0, 0.1)',
                borderLeft: '3px solid #ffcc00',
              },
            }}
          >
            <ListItemIcon sx={{ color: '#ffcc00', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="خروج از سیستم"
              primaryTypographyProps={{
                fontFamily: 'Vazirmatn',
                fontSize: '0.9rem',
                color: '#e8e8e8',
              }}
            />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
          color: '#e8e8e8',
          borderBottom: '1px solid rgba(255, 204, 0, 0.3)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent 0%, #ffcc00 50%, transparent 100%)',
          },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ fontFamily: 'Vazirmatn', fontWeight: 700 }}
            >
              سیستم نظارت بر نوار نقاله - فولاد شادگان
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontFamily: 'Vazirmatn' }}
            >
              اتاق کنترل عملیات
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'center', px: 2 }}>
              <Typography variant="caption" sx={{ fontFamily: 'Vazirmatn', display: 'block' }}>
                نوارهای فعال
              </Typography>
              <Typography variant="h6" sx={{ color: '#ffcc00', fontWeight: 700 }}>
                {conveyorBelts.filter(b => b.status === 'running').length}/۶
              </Typography>
            </Box>

            <Tooltip title="آلارم‌ها">
              <IconButton 
                sx={{ 
                  position: 'relative',
                  color: '#ffcc00',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 204, 0, 0.1)',
                  },
                }}
              >
                <Badge 
                  badgeContent={unreadNotifications} 
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: '#ffcc00',
                      color: '#000',
                      fontWeight: 'bold',
                    }
                  }}
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="اپراتور: احمد رضایی">
              <Avatar sx={{ 
                width: 40, 
                height: 40, 
                bgcolor: '#ffcc00',
                color: '#000',
                fontWeight: 'bold',
                boxShadow: '0 0 8px rgba(255, 204, 0, 0.4)',
              }}>
                ا.ر
              </Avatar>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
              borderLeft: '1px solid rgba(255, 204, 0, 0.3)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'background.paper',
              borderLeft: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: '#0a0a0a',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

export default MainLayout;