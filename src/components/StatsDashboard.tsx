import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { RealtimePanel } from './RealtimePanel';
import { DataSourceSettings, DataState } from '../App';

// SegmentData interface removed - feature deprecated

interface StatsDashboardProps {
  isRealtimePanelConnected?: boolean;
  onRealtimePanelConnect?: (connected: boolean) => void;
  dataSourceSettings: DataSourceSettings;
  dataState?: DataState;
}

export function StatsDashboard({ 
  isRealtimePanelConnected = false, 
  onRealtimePanelConnect, 
  dataSourceSettings, 
  dataState = 'normal'
}: StatsDashboardProps) {
  // 置頂按鈕顯示狀態
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  
  // 監聽滾動事件，控制置頂按鈕顯示
  useEffect(() => {
    const scrollContainer = document.querySelector('.stats-dashboard-scroll');
    if (!scrollContainer) return;

    const handleScroll = () => {
      // 當滾動超過300px時顯示置頂按鈕
      if (scrollContainer.scrollTop > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // 置頂按鈕點擊處理
  const handleScrollToTop = () => {
    const scrollContainer = document.querySelector('.stats-dashboard-scroll');
    if (scrollContainer) {
      const startPosition = scrollContainer.scrollTop;
      const distance = startPosition;
      const duration = 500; // 持續時間（毫秒）
      let startTime: number | null = null;

      // 使用 easeInOutCubic 緩動函數
      const easeInOutCubic = (t: number): number => {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      };

      const animateScroll = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        const easeProgress = easeInOutCubic(progress);
        const currentPosition = startPosition - (distance * easeProgress);
        
        scrollContainer.scrollTop = currentPosition;
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        }
      };

      requestAnimationFrame(animateScroll);
      console.log('📤 置頂按鈕點擊 - 快速滾動動畫啟動');
    } else {
      console.warn('⚠️ 置頂按鈕點擊 - 未找到滾動容器');
    }
  };

  const renderContent = () => {
    // 只渲染群呼即時面板
    return (
      <RealtimePanel 
        isConnected={isRealtimePanelConnected}
        onConnect={onRealtimePanelConnect}
        dataSourceSettings={dataSourceSettings}
        dataState={dataState}
      />
    );
  };

  return (
    <div className="flex-1 bg-white overflow-hidden relative">
      <div className="h-full overflow-y-auto stats-dashboard-scroll">
        {renderContent()}
      </div>
      
      {/* 置頂按鈕 - 使用動態顯示 */}
      {showScrollToTop && (
        <button
          onClick={handleScrollToTop}
          className="fixed bottom-24 right-8 z-50 bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-all transform hover:scale-110"
          title="回到頂部"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}


