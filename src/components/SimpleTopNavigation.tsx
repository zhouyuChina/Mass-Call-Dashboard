import React from 'react';
import { Minus, Square, X, Phone } from 'lucide-react';

interface SimpleTopNavigationProps {
  currentUser?: { name: string };
  onLogout?: () => void;
}

export function SimpleTopNavigation({ currentUser, onLogout }: SimpleTopNavigationProps) {
  const handleMinimize = () => {
    console.log('最小化視窗');
  };

  const handleMaximize = () => {
    console.log('最大化視窗');
  };

  const handleClose = () => {
    if (confirm('確定要關閉應用程式嗎？')) {
      console.log('關閉視窗');
    }
  };

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* 左側：Logo和標題 */}
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
          <Phone className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm">群呼即時面板</span>
      </div>

      {/* 右側：狀態和視窗控制按鈕 */}
      <div className="flex items-center space-x-4">
        {/* Online 狀態 */}
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-700">Online</span>
        </div>

        {/* 視窗控制按鈕 */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleMinimize}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
            title="最小化"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
            title="最大化"
          >
            <Square className="w-3 h-3 text-gray-600" />
          </button>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-red-500 hover:text-white rounded transition-colors"
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}