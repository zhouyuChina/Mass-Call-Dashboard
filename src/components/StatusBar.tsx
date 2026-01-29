import React, { useState, useEffect } from 'react';
import { Circle } from 'lucide-react';
import { SystemStatus } from './SystemStatus';
import { Operator } from '../App';

interface StatusBarProps {
  isRealtimePanelConnected?: boolean;
  currentUser?: Operator;
}

export function StatusBar({ 
  isRealtimePanelConnected = false,
  currentUser
}: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '/').replace(',', '');
  };

  return (
    <div className="h-8 bg-gray-100 text-gray-800 text-xs flex items-center px-4 justify-between border-t border-gray-300">
      <div className="flex items-center space-x-4">
        <span>版本號v.1.0.0</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <span>使用者：</span>
          <span>{currentUser ? `${currentUser.name}-${currentUser.role}` : '管理員'}</span>
        </div>
        <span className="text-gray-800">|</span>
        <span>{formatDateTime(currentTime)}</span>
        <span className="text-gray-800">|</span>
        <div className="flex items-center space-x-1">
          <span>狀態：</span>
          <Circle className="w-2 h-2 fill-green-500 text-green-500" />
          <span>運行</span>
        </div>
      </div>
    </div>
  );
}