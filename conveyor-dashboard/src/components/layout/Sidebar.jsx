import React from 'react';
import {
  HomeIcon,
  VideoCameraIcon,
  ChartBarIcon,
  CogIcon,
  ExclamationTriangleIcon,
  MapIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Live Monitoring', href: '/monitoring', icon: VideoCameraIcon },
  { name: 'Alerts', href: '/alerts', icon: ExclamationTriangleIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Belt Map', href: '/map', icon: MapIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 bg-gray-800">
        <h1 className="text-xl font-bold text-white">SteelConveyor Monitor</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors group"
          >
            <item.icon className="h-5 w-5 mr-3 group-hover:text-blue-400" />
            {item.name}
          </a>
        ))}
      </nav>

      {/* Status Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
          <span className="text-sm text-gray-300">System Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;