import React from 'react';
import { toPersianNumber } from '../utils/persianUtils';

const StatisticsGrid = ({ systemStatus }) => {
  const stats = [
    {
      title: 'نوارهای فعال',
      value: toPersianNumber(systemStatus?.active_cameras?.toString() || '0'),
      change: '+۲',
      changeType: 'positive',
      icon: '✅',
      description: 'از هفته گذشته',
      color: 'green'
    },
    {
      title: 'هشدارهای بحرانی',
      value: toPersianNumber(systemStatus?.critical_alerts?.toString() || '0'),
      change: '-۱',
      changeType: 'negative',
      icon: '🚨',
      description: 'کاهش نسبت به دیروز',
      color: 'red'
    },
    {
      title: 'زمان فعالیت',
      value: `${toPersianNumber(systemStatus?.uptime_percentage?.toString() || '0')}٪`,
      change: '+۰.۳٪',
      changeType: 'positive',
      icon: '⏱️',
      description: 'بهبود عملکرد',
      color: 'blue'
    },
    {
      title: 'میانگین بازدهی',
      value: `${toPersianNumber(systemStatus?.average_efficiency?.toString() || '0')}٪`,
      change: '+۱.۲٪',
      changeType: 'positive',
      icon: '📊',
      description: 'افزایش کارایی',
      color: 'purple'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-300"
        >
          <div className="flex items-center justify-between space-x-reverse">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
              <p className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change} {stat.description}
              </p>
            </div>
            <div className={`text-3xl p-3 rounded-full ${
              stat.color === 'green' ? 'bg-green-100' :
              stat.color === 'red' ? 'bg-red-100' :
              stat.color === 'blue' ? 'bg-blue-100' : 'bg-purple-100'
            }`}>
              <span className={
                stat.color === 'green' ? 'text-green-600' :
                stat.color === 'red' ? 'text-red-600' :
                stat.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
              }>{stat.icon}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatisticsGrid;