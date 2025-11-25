import React, { useState, useEffect } from 'react';
import '../assets/css/conveyor.css';

export default function ConveyorBelt() {
  const [conveyors, setConveyors] = useState([
    {
      id: 1,
      name: 'نوار نقاله A',
      status: 'active',
      speed: 2.4,
      temperature: 65,
      load: 85,
      lastMaintenance: '۱۴۰۲/۱۰/۱۵',
      nextMaintenance: '۱۴۰۲/۱۱/۱۵',
      efficiency: 92,
      alerts: 2
    },
    {
      id: 2,
      name: 'نوار نقاله B',
      status: 'stopped',
      speed: 0,
      temperature: 32,
      load: 0,
      lastMaintenance: '۱۴۰۲/۱۰/۲۰',
      nextMaintenance: '۱۴۰۲/۱۱/۲۰',
      efficiency: 0,
      alerts: 1
    },
    {
      id: 3,
      name: 'نوار نقاله C',
      status: 'active',
      speed: 3.1,
      temperature: 72,
      load: 92,
      lastMaintenance: '۱۴۰۲/۱۰/۱۰',
      nextMaintenance: '۱۴۰۲/۱۱/۱۰',
      efficiency: 88,
      alerts: 3
    },
    {
      id: 4,
      name: 'نوار نقاله D',
      status: 'maintenance',
      speed: 0,
      temperature: 28,
      load: 0,
      lastMaintenance: '۱۴۰۲/۱۰/۲۵',
      nextMaintenance: '۱۴۰۲/۱۰/۲۸',
      efficiency: 0,
      alerts: 0
    }
  ]);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    stopped: 0,
    underMaintenance: 0,
    averageEfficiency: 0
  });

  useEffect(() => {
    // Calculate statistics
    const total = conveyors.length;
    const active = conveyors.filter(c => c.status === 'active').length;
    const stopped = conveyors.filter(c => c.status === 'stopped').length;
    const underMaintenance = conveyors.filter(c => c.status === 'maintenance').length;
    const averageEfficiency = conveyors.reduce((acc, curr) => acc + curr.efficiency, 0) / total;

    setStats({
      total,
      active,
      stopped,
      underMaintenance,
      averageEfficiency: Math.round(averageEfficiency)
    });
  }, [conveyors]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'status-active', text: 'در حال کار' },
      stopped: { class: 'status-stopped', text: 'متوقف' },
      maintenance: { class: 'status-maintenance', text: 'در حال تعمیر' }
    };

    const config = statusConfig[status] || statusConfig.stopped;
    return (
      <span className={`status-badge ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const getLoadBarClass = (load) => {
    if (load >= 90) return 'load-high';
    if (load >= 70) return 'load-medium';
    return 'load-low';
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleStartConveyor = (id) => {
    setConveyors(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'active', speed: 2.5 } : c
    ));
  };

  const handleStopConveyor = (id) => {
    setConveyors(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'stopped', speed: 0, load: 0 } : c
    ));
  };

  return (
    <div className="conveyor-dashboard p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">مدیریت نوار نقاله‌ها</h1>
        <p className="text-gray-600">مدیریت و مانیتورینگ سیستم نوار نقاله‌های کارخانه</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">تعداد کل</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="stat-icon">
              <i className="nc-icon nc-chart-pie-35 text-xl"></i>
            </div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">در حال کار</p>
              <p className="text-3xl font-bold">{stats.active}</p>
            </div>
            <div className="stat-icon">
              <i className="nc-icon nc-check-2 text-xl"></i>
            </div>
          </div>
        </div>

        <div className="stat-card red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">متوقف شده</p>
              <p className="text-3xl font-bold">{stats.stopped}</p>
            </div>
            <div className="stat-icon">
              <i className="nc-icon nc-simple-remove text-xl"></i>
            </div>
          </div>
        </div>

        <div className="stat-card yellow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">در حال تعمیر</p>
              <p className="text-3xl font-bold">{stats.underMaintenance}</p>
            </div>
            <div className="stat-icon">
              <i className="nc-icon nc-settings text-xl"></i>
            </div>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">میانگین بازدهی</p>
              <p className="text-3xl font-bold">{stats.averageEfficiency}%</p>
            </div>
            <div className="stat-icon">
              <i className="nc-icon nc-chart-bar-32 text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Conveyors Table */}
      <div className="conveyor-table-container">
        <div className="conveyor-table-header">
          <h2 className="text-xl font-semibold text-gray-800">لیست نوار نقاله‌ها</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="conveyor-table">
            <thead>
              <tr>
                <th>نام نوار نقاله</th>
                <th>وضعیت</th>
                <th>سرعت (m/s)</th>
                <th>دما (°C)</th>
                <th>بارگیری</th>
                <th>بازدهی</th>
                <th>هشدارها</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {conveyors.map((conveyor) => (
                <tr key={conveyor.id}>
                  <td>
                    <div className="flex items-center">
                      <div className={`status-indicator ${conveyor.status}`}></div>
                      <span className="font-medium text-gray-900">{conveyor.name}</span>
                    </div>
                  </td>
                  <td>{getStatusBadge(conveyor.status)}</td>
                  <td>
                    <span className="font-mono text-gray-700">{conveyor.speed.toFixed(1)}</span>
                  </td>
                  <td>
                    <div className="flex items-center">
                      <span className="font-mono text-gray-700">{conveyor.temperature}</span>
                    </div>
                  </td>
                  <td>
                    <div className="w-24">
                      <div className="load-bar">
                        <div
                          className={`load-fill ${getLoadBarClass(conveyor.load)}`}
                          style={{ width: `${conveyor.load}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 mt-1 block">{conveyor.load}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`font-mono font-bold ${getEfficiencyColor(conveyor.efficiency)}`}>
                      {conveyor.efficiency}%
                    </span>
                  </td>
                  <td>
                    {conveyor.alerts > 0 ? (
                      <span className="alert-badge">
                        <i className="nc-icon nc-bell-55 ml-1"></i>
                        {conveyor.alerts} هشدار
                      </span>
                    ) : (
                      <span className="text-green-600">✓ سالم</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-primary">
                        مشاهده
                      </button>
                      {conveyor.status === 'active' ? (
                        <button
                          onClick={() => handleStopConveyor(conveyor.id)}
                          className="btn btn-danger"
                        >
                          توقف
                        </button>
                      ) : conveyor.status === 'stopped' ? (
                        <button
                          onClick={() => handleStartConveyor(conveyor.id)}
                          className="btn btn-success"
                        >
                          راه‌اندازی
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">عملیات سریع</h3>
        <div className="actions-grid">
          <button className="btn btn-success">
            <i className="nc-icon nc-play-40 ml-2"></i>
            راه‌اندازی همه
          </button>
          <button className="btn btn-danger">
            <i className="nc-icon nc-simple-remove ml-2"></i>
            توقف همه
          </button>
          <button className="btn btn-primary">
            <i className="nc-icon nc-refresh-02 ml-2"></i>
            بروزرسانی داده‌ها
          </button>
          <button className="btn btn-secondary">
            <i className="nc-icon nc-paper ml-2"></i>
            گزارش عملکرد
          </button>
        </div>
      </div>
    </div>
  );
}