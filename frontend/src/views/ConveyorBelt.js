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
      alerts: 2,
      cameraUrl: 'https://example.com/stream/camera1',
      location: 'سالن تولید A',
      operator: 'علی محمدی',
      uptime: '۹۵%',
      energyConsumption: '۴۵ کیلووات',
      lastUpdate: '۲ دقیقه پیش'
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
      alerts: 1,
      cameraUrl: 'https://example.com/stream/camera2',
      location: 'سالن تولید B',
      operator: 'رضا حسینی',
      uptime: '۸۸%',
      energyConsumption: '۰ کیلووات',
      lastUpdate: '۵ دقیقه پیش'
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
      alerts: 3,
      cameraUrl: 'https://example.com/stream/camera3',
      location: 'سالن تولید C',
      operator: 'محمد کریمی',
      uptime: '۹۲%',
      energyConsumption: '۵۲ کیلووات',
      lastUpdate: '۱ دقیقه پیش'
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
      alerts: 0,
      cameraUrl: 'https://example.com/stream/camera4',
      location: 'سالن تولید D',
      operator: 'حسین احمدی',
      uptime: '۷۸%',
      energyConsumption: '۰ کیلووات',
      lastUpdate: '۱۰ دقیقه پیش'
    }
  ]);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    stopped: 0,
    underMaintenance: 0,
    averageEfficiency: 0,
    totalAlerts: 0,
    totalEnergy: '۰ کیلووات'
  });

  const [selectedConveyor, setSelectedConveyor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  // Real-time data simulation
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      setConveyors(prev => prev.map(conveyor => {
        if (conveyor.status === 'active') {
          const randomChange = (Math.random() - 0.5) * 0.4;
          const newSpeed = Math.max(0, conveyor.speed + randomChange);
          const newLoad = Math.max(0, Math.min(100, conveyor.load + (Math.random() - 0.5) * 5));
          const newTemp = Math.max(20, conveyor.temperature + (Math.random() - 0.5) * 2);
          const newEfficiency = Math.max(0, Math.min(100, conveyor.efficiency + (Math.random() - 0.5) * 2));

          return {
            ...conveyor,
            speed: parseFloat(newSpeed.toFixed(1)),
            load: Math.round(newLoad),
            temperature: Math.round(newTemp),
            efficiency: Math.round(newEfficiency),
            lastUpdate: 'هم اکنون'
          };
        }
        return conveyor;
      }));
      setLastUpdateTime(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  useEffect(() => {
    const total = conveyors.length;
    const active = conveyors.filter(c => c.status === 'active').length;
    const stopped = conveyors.filter(c => c.status === 'stopped').length;
    const underMaintenance = conveyors.filter(c => c.status === 'maintenance').length;
    const averageEfficiency = conveyors.reduce((acc, curr) => acc + curr.efficiency, 0) / total;
    const totalAlerts = conveyors.reduce((acc, curr) => acc + curr.alerts, 0);
    const totalEnergy = conveyors.reduce((acc, curr) => {
      const energy = parseInt(curr.energyConsumption) || 0;
      return acc + energy;
    }, 0);

    setStats({
      total,
      active,
      stopped,
      underMaintenance,
      averageEfficiency: Math.round(averageEfficiency),
      totalAlerts,
      totalEnergy: `${totalEnergy} کیلووات`
    });
  }, [conveyors]);

  // Filter and sort conveyors
  const filteredConveyors = conveyors
    .filter(conveyor => {
      const matchesSearch = conveyor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          conveyor.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          conveyor.operator.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || conveyor.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: {
        class: 'status-active',
        text: 'در حال کار',
        icon: 'nc-icon nc-play-40',
        color: '#10b981'
      },
      stopped: {
        class: 'status-stopped',
        text: 'متوقف',
        icon: 'nc-icon nc-simple-remove',
        color: '#ef4444'
      },
      maintenance: {
        class: 'status-maintenance',
        text: 'در حال تعمیر',
        icon: 'nc-icon nc-settings',
        color: '#f59e0b'
      }
    };

    const config = statusConfig[status] || statusConfig.stopped;
    return (
      <span className={`status-badge ${config.class}`}>
        <i className={`${config.icon} ml-1`}></i>
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

  const getTemperatureColor = (temperature) => {
    if (temperature > 70) return 'text-red-600';
    if (temperature > 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleStartConveyor = (id) => {
    setConveyors(prev => prev.map(c =>
      c.id === id ? {
        ...c,
        status: 'active',
        speed: 2.5,
        load: 75,
        temperature: 45,
        efficiency: 85,
        lastUpdate: 'هم اکنون'
      } : c
    ));
  };

  const handleStopConveyor = (id) => {
    setConveyors(prev => prev.map(c =>
      c.id === id ? {
        ...c,
        status: 'stopped',
        speed: 0,
        load: 0,
        temperature: 32,
        efficiency: 0,
        lastUpdate: 'هم اکنون'
      } : c
    ));
  };

  const handleEmergencyStop = (id) => {
    setConveyors(prev => prev.map(c =>
      c.id === id ? {
        ...c,
        status: 'stopped',
        speed: 0,
        load: 0,
        alerts: c.alerts + 1,
        temperature: 35,
        efficiency: 0,
        lastUpdate: 'هم اکنون'
      } : c
    ));
  };

  const handleMaintenance = (id) => {
    setConveyors(prev => prev.map(c =>
      c.id === id ? {
        ...c,
        status: 'maintenance',
        speed: 0,
        load: 0,
        alerts: 0,
        lastUpdate: 'هم اکنون'
      } : c
    ));
  };

  const handleViewConveyor = (conveyor) => {
    setSelectedConveyor(conveyor);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedConveyor(null);
  };

  const handleStartAll = () => {
    setConveyors(prev => prev.map(c =>
      c.status === 'stopped' ? {
        ...c,
        status: 'active',
        speed: 2.0,
        load: 70,
        temperature: 45,
        efficiency: 80,
        lastUpdate: 'هم اکنون'
      } : c
    ));
  };

  const handleStopAll = () => {
    setConveyors(prev => prev.map(c =>
      c.status === 'active' ? {
        ...c,
        status: 'stopped',
        speed: 0,
        load: 0,
        temperature: 32,
        efficiency: 0,
        lastUpdate: 'هم اکنون'
      } : c
    ));
  };

  const handleGenerateReport = () => {
    const reportData = {
      timestamp: new Date().toLocaleString('fa-IR'),
      totalConveyors: stats.total,
      activeConveyors: stats.active,
      averageEfficiency: stats.averageEfficiency,
      totalAlerts: stats.totalAlerts,
      conveyors: conveyors.map(c => ({
        name: c.name,
        status: c.status,
        efficiency: c.efficiency,
        alerts: c.alerts
      }))
    };

    console.log('گزارش تولید شد:', reportData);
    alert(`گزارش عملکرد با موفقیت تولید شد!\n\nتاریخ: ${reportData.timestamp}\nتعداد دستگاه‌ها: ${reportData.totalConveyors}\nدستگاه‌های فعال: ${reportData.activeConveyors}\nمیانگین بازدهی: ${reportData.averageEfficiency}%`);
  };

  const handleClearAlerts = (id) => {
    setConveyors(prev => prev.map(c =>
      c.id === id ? { ...c, alerts: 0, lastUpdate: 'هم اکنون' } : c
    ));
  };

  const SortIcon = ({ column }) => (
    <span className="sort-icon">
      {sortConfig.key === column && (
        sortConfig.direction === 'asc' ? '↑' : '↓'
      )}
    </span>
  );

  const formatTime = (date) => {
    return date.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="conveyor-dashboard p-6" dir="rtl">
      {/* Header with Controls */}
      <div className="dashboard-header">
        <div className="header-main">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">مدیریت نوار نقاله‌ها</h1>
          <p className="text-gray-600">مدیریت و مانیتورینگ سیستم نوار نقاله‌های کارخانه</p>
        </div>
        <div className="header-controls">
          <div className="control-group">
            <label className="control-label">
              <input
                type="checkbox"
                checked={realTimeUpdates}
                onChange={(e) => setRealTimeUpdates(e.target.checked)}
                className="ml-2"
              />
              بروزرسانی زنده
            </label>
            {realTimeUpdates && (
              <span className="realtime-indicator">
                <i className="nc-icon nc-refresh-02"></i>
                فعال
              </span>
            )}
            <div className="update-time">
              <span className="text-xs text-gray-500">
                آخرین بروزرسانی: {formatTime(lastUpdateTime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">تعداد کل</p>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-xs opacity-75 mt-1">دستگاه</p>
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
              <p className="text-xs opacity-75 mt-1">{Math.round((stats.active / stats.total) * 100)}% ظرفیت</p>
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
              <p className="text-xs opacity-75 mt-1">هشدار: {stats.totalAlerts}</p>
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
              <p className="text-xs opacity-75 mt-1">نیاز به توجه</p>
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
              <p className="text-xs opacity-75 mt-1">عملکرد کلی</p>
            </div>
            <div className="stat-icon">
              <i className="nc-icon nc-chart-bar-32 text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-box">
          <i className="nc-icon nc-zoom-split search-icon"></i>
          <input
            type="text"
            placeholder="جستجو بر اساس نام، محل یا اپراتور..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            همه
          </button>
          <button
            className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            در حال کار
          </button>
          <button
            className={`filter-btn ${filterStatus === 'stopped' ? 'active' : ''}`}
            onClick={() => setFilterStatus('stopped')}
          >
            متوقف شده
          </button>
          <button
            className={`filter-btn ${filterStatus === 'maintenance' ? 'active' : ''}`}
            onClick={() => setFilterStatus('maintenance')}
          >
            در حال تعمیر
          </button>
        </div>
      </div>

      {/* Conveyors Table */}
      <div className="conveyor-table-container">
        <div className="conveyor-table-header">
          <h2 className="text-xl font-semibold text-gray-800">
            لیست نوار نقاله‌ها ({filteredConveyors.length} دستگاه)
          </h2>
          <div className="table-info">
            <span className="text-sm text-gray-500">
              نمایش {filteredConveyors.length} از {conveyors.length} دستگاه
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="conveyor-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable">
                  نام نوار نقاله <SortIcon column="name" />
                </th>
                <th onClick={() => handleSort('status')} className="sortable">
                  وضعیت <SortIcon column="status" />
                </th>
                <th onClick={() => handleSort('speed')} className="sortable">
                  سرعت (m/s) <SortIcon column="speed" />
                </th>
                <th onClick={() => handleSort('temperature')} className="sortable">
                  دما (°C) <SortIcon column="temperature" />
                </th>
                <th onClick={() => handleSort('load')} className="sortable">
                  بارگیری <SortIcon column="load" />
                </th>
                <th onClick={() => handleSort('efficiency')} className="sortable">
                  بازدهی <SortIcon column="efficiency" />
                </th>
                <th>هشدارها</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredConveyors.map((conveyor) => (
                <tr key={conveyor.id} className={`conveyor-row ${conveyor.status}`}>
                  <td>
                    <div className="flex items-center">
                      <div className={`status-indicator ${conveyor.status}`}></div>
                      <div>
                        <span className="font-medium text-gray-900 block">{conveyor.name}</span>
                        <span className="text-xs text-gray-500">{conveyor.location}</span>
                        <span className="text-xs text-gray-400 block">{conveyor.operator}</span>
                      </div>
                    </div>
                  </td>
                  <td>{getStatusBadge(conveyor.status)}</td>
                  <td>
                    <div className="speed-indicator">
                      <span className="font-mono text-gray-700">{conveyor.speed.toFixed(1)}</span>
                      {conveyor.status === 'active' && (
                        <div className="pulse-dot"></div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="temperature-display">
                      <span className={`font-mono ${getTemperatureColor(conveyor.temperature)}`}>
                        {conveyor.temperature}
                      </span>
                      <i className={`nc-icon nc-thermometer-2 mr-2 ${getTemperatureColor(conveyor.temperature)}`}></i>
                    </div>
                  </td>
                  <td>
                    <div className="load-display">
                      <div className="w-24">
                        <div className="load-bar">
                          <div
                            className={`load-fill ${getLoadBarClass(conveyor.load)}`}
                            style={{ width: `${conveyor.load}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 mt-1 block">{conveyor.load}%</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="efficiency-display">
                      <span className={`font-mono font-bold ${getEfficiencyColor(conveyor.efficiency)}`}>
                        {conveyor.efficiency}%
                      </span>
                      <div className="efficiency-bar">
                        <div
                          className={`efficiency-fill ${getEfficiencyColor(conveyor.efficiency).replace('text-', 'bg-')}`}
                          style={{ width: `${conveyor.efficiency}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {conveyor.alerts > 0 ? (
                      <div className="alert-display">
                        <span className="alert-badge">
                          <i className="nc-icon nc-bell-55 ml-1"></i>
                          {conveyor.alerts} هشدار
                        </span>
                        <button
                          className="btn btn-warning btn-xs"
                          onClick={() => handleClearAlerts(conveyor.id)}
                        >
                          پاک کردن
                        </button>
                      </div>
                    ) : (
                      <span className="text-green-600 flex items-center">
                        <i className="nc-icon nc-check-2 ml-1"></i>
                        سالم
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleViewConveyor(conveyor)}
                      >
                        <i className="nc-icon nc-tv-2 ml-1"></i>
                        مشاهده
                      </button>
                      <div className="action-group">
                        {conveyor.status === 'active' ? (
                          <>
                            <button
                              onClick={() => handleStopConveyor(conveyor.id)}
                              className="btn btn-danger btn-sm"
                            >
                              توقف
                            </button>
                            <button
                              onClick={() => handleEmergencyStop(conveyor.id)}
                              className="btn btn-emergency btn-sm"
                              title="توقف اضطراری"
                            >
                              <i className="nc-icon nc-alert-circle-i"></i>
                            </button>
                          </>
                        ) : conveyor.status === 'stopped' ? (
                          <>
                            <button
                              onClick={() => handleStartConveyor(conveyor.id)}
                              className="btn btn-success btn-sm"
                            >
                              راه‌اندازی
                            </button>
                            <button
                              onClick={() => handleMaintenance(conveyor.id)}
                              className="btn btn-warning btn-sm"
                            >
                              تعمیر
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartConveyor(conveyor.id)}
                            className="btn btn-success btn-sm"
                          >
                            اتمام تعمیر
                          </button>
                        )}
                      </div>
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
          <button className="btn btn-success" onClick={handleStartAll}>
            <i className="nc-icon nc-play-40 ml-2"></i>
            راه‌اندازی همه
          </button>
          <button className="btn btn-danger" onClick={handleStopAll}>
            <i className="nc-icon nc-simple-remove ml-2"></i>
            توقف همه
          </button>
          <button className="btn btn-primary" onClick={() => setLastUpdateTime(new Date())}>
            <i className="nc-icon nc-refresh-02 ml-2"></i>
            بروزرسانی داده‌ها
          </button>
          <button className="btn btn-secondary" onClick={handleGenerateReport}>
            <i className="nc-icon nc-paper ml-2"></i>
            گزارش عملکرد
          </button>
          <button className="btn btn-info">
            <i className="nc-icon nc-chart-bar-32 ml-2"></i>
            آمار دقیق
          </button>
        </div>
      </div>

      {/* Live Stream Modal */}
      {showModal && selectedConveyor && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="nc-icon nc-camera-compact ml-2"></i>
                مشاهده زنده - {selectedConveyor.name}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <i className="nc-icon nc-simple-remove"></i>
              </button>
            </div>
            <div className="modal-content">
              {/* Live Stream Video */}
              <div className="video-container">
                <div className="video-placeholder">
                  <i className="nc-icon nc-tv-2 text-6xl text-gray-400"></i>
                  <p className="text-gray-500 mt-4">پخش زنده دوربین - {selectedConveyor.location}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {selectedConveyor.cameraUrl}
                  </p>
                  <div className="video-stats mt-4">
                    <span className="video-stat">
                      <i className="nc-icon nc-time-alarm mr-1"></i>
                      آخرین بروزرسانی: {selectedConveyor.lastUpdate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conveyor Details */}
              <div className="conveyor-details-grid">
                <div className="detail-item">
                  <span className="detail-label">وضعیت:</span>
                  <span className="detail-value">{getStatusBadge(selectedConveyor.status)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">سرعت:</span>
                  <span className="detail-value">{selectedConveyor.speed.toFixed(1)} m/s</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">دما:</span>
                  <span className={`detail-value ${getTemperatureColor(selectedConveyor.temperature)}`}>
                    {selectedConveyor.temperature} °C
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">بارگیری:</span>
                  <span className="detail-value">{selectedConveyor.load}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">بازدهی:</span>
                  <span className={`detail-value ${getEfficiencyColor(selectedConveyor.efficiency)}`}>
                    {selectedConveyor.efficiency}%
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">اپراتور:</span>
                  <span className="detail-value">{selectedConveyor.operator}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">محل:</span>
                  <span className="detail-value">{selectedConveyor.location}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">مصرف انرژی:</span>
                  <span className="detail-value">{selectedConveyor.energyConsumption}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">هشدارها:</span>
                  <span className="detail-value">
                    {selectedConveyor.alerts > 0 ? (
                      <span className="text-red-500">{selectedConveyor.alerts} هشدار فعال</span>
                    ) : (
                      <span className="text-green-500">بدون هشدار</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="modal-actions">
                <button className="btn btn-primary">
                  <i className="nc-icon nc-zoom-split ml-2"></i>
                  بزرگنمایی
                </button>
                <button className="btn btn-secondary">
                  <i className="nc-icon nc-settings ml-2"></i>
                  تنظیمات دوربین
                </button>
                <button className="btn btn-success">
                  <i className="nc-icon nc-image ml-2"></i>
                  عکس‌برداری
                </button>
                <button className="btn btn-warning">
                  <i className="nc-icon nc-sound-wave ml-2"></i>
                  ضبط ویدیو
                </button>
                <button className="btn btn-danger" onClick={closeModal}>
                  <i className="nc-icon nc-simple-remove ml-2"></i>
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}