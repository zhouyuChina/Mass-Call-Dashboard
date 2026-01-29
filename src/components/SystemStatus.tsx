import React from 'react';
import { Circle } from 'lucide-react';

interface SystemStatusProps {
  isInSidebar?: boolean;
  isRealtimePanelConnected?: boolean;
}

export function SystemStatus({ isInSidebar = false, isRealtimePanelConnected = false }: SystemStatusProps) {
  if (isInSidebar) {
    return (
      <div className="w-full bg-white border border-gray-400 rounded-lg p-3">
        <div className="text-sm font-medium text-gray-800 mb-2 border-b border-gray-200 pb-1">
          系統狀態
        </div>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">號段資料庫</span>
            <div className="flex items-center space-x-1">
              <Circle className="w-2 h-2 fill-green-500 text-green-500" />
              <span className="font-medium text-gray-800">已連接</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-600">群呼面板資料</span>
            <div className="flex items-center space-x-1">
              <Circle className={`w-2 h-2 ${isRealtimePanelConnected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />
              <span className="font-medium text-gray-800">{isRealtimePanelConnected ? '已連接' : '未連接'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-48 bg-white border border-gray-400 rounded-lg p-3 ml-2">
      <div className="text-sm font-medium text-gray-800 mb-2 border-b border-gray-200 pb-1">
        系統狀態
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">號段資料庫</span>
          <div className="flex items-center space-x-1">
            <Circle className="w-2 h-2 fill-green-500 text-green-500" />
            <span className="font-medium text-gray-800">已連接</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">群呼面板資料</span>
          <div className="flex items-center space-x-1">
            <Circle className={`w-2 h-2 ${isRealtimePanelConnected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />
            <span className="font-medium text-gray-800">{isRealtimePanelConnected ? '已連接' : '未連接'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

