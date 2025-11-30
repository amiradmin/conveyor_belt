import { useState, useEffect } from 'react';

export const useSystemStatus = () => {
  const [systemStatus, setSystemStatus] = useState({
    active_cameras: 3,
    critical_alerts: 1,
    uptime_percentage: 98.5,
    average_efficiency: 87.2,
    overall_health: 'good',
    cameras: [
      {
        id: 1,
        name: 'نوار نقاله اصلی',
        location: 'خط تولید A',
        status: 'active',
        efficiency: '94',
        belt_speed: '2.1',
        object_count: 8
      },
      {
        id: 2,
        name: 'نوار نقاله جانبی',
        location: 'خط تولید B',
        status: 'warning',
        efficiency: '72',
        belt_speed: '1.8',
        object_count: 12
      },
      {
        id: 3,
        name: 'نوار نقاله ذخیره',
        location: 'انبار',
        status: 'active',
        efficiency: '96',
        belt_speed: '1.5',
        object_count: 5
      }
    ],
    total_alerts: 2,
    total_throughput: 1250
  });

  const [loading, setLoading] = useState(true);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      // Simulate API call with demo data
      setTimeout(() => {
        setSystemStatus(prev => ({
          ...prev,
          active_cameras: 2 + Math.floor(Math.random() * 2),
          critical_alerts: Math.floor(Math.random() * 3),
          uptime_percentage: 95 + Math.random() * 5,
          average_efficiency: 85 + Math.random() * 15
        }));
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return { systemStatus, loading, fetchSystemStatus };
};