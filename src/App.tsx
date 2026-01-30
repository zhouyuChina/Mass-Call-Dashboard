import React, { useState, useEffect, useCallback } from 'react';
import { SimpleTopNavigation } from './components/SimpleTopNavigation';
import { StatsDashboard } from './components/StatsDashboard';
import { StatusBar } from './components/StatusBar';
import { LoginForm } from './components/LoginForm';
import { Toaster } from './components/ui/sonner';
import { installToastInterceptor } from './utils/safeToast';
import ErrorBoundary from './components/ErrorBoundary';
import { defaultOperators, getMockConfig } from './mocks';
import { shouldAutoLogin } from './config';

// 操作員接口
export interface Operator {
  id: string;
  name: string;
  username: string;
  password: string;
  role: '管理員';
  status: '啟用' | '停用';
  createdTime: Date;
  updatedTime?: Date;
  lastLogin?: Date;
}

// 預設資料來源設定類型
export interface DataSourceSettings {
  usDataSource: 'allareacode' | 'nanpa';
  canadaDataSource: 'allareacode' | 'cnac.ca';
}

// 數據狀態類型
export type DataState = 'normal' | 'empty';

export default function App() {
  // 登入狀態管理 - 從 localStorage 恢復登錄狀態
  const [currentUser, setCurrentUser] = useState<Operator | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [operators, setOperators] = useState<Operator[]>([]);
  
  const [isRealtimePanelConnected, setIsRealtimePanelConnected] = useState(true);
  
  // 預設資料來源設定
  const [dataSourceSettings, setDataSourceSettings] = useState<DataSourceSettings>({
    usDataSource: 'allareacode',
    canadaDataSource: 'allareacode'
  });

  // 數據狀態管理
  const [dataState, setDataState] = useState<DataState>('normal');

  // 登入處理函數
  const handleLogin = useCallback((operator: Operator) => {
    const updatedOperator = {
      ...operator,
      lastLogin: new Date()
    };

    setCurrentUser(updatedOperator);
    // 持久化登錄狀態到 localStorage
    localStorage.setItem('currentUser', JSON.stringify(updatedOperator));

    setOperators(prev =>
      prev.map(op =>
        op.id === operator.id ? updatedOperator : op
      )
    );
  }, []);

  // 登出處理函數
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    // 清除 localStorage 中的登錄狀態
    localStorage.removeItem('currentUser');
    console.log('👋 用戶已登出');
  }, []);

  // 權限檢查函數
  const checkPermission = useCallback((requiredRole: '管理員') => {
    if (!currentUser) return false;
    return currentUser.role === '管理員';
  }, [currentUser]);

  // 安裝toast安全攔截器
  useEffect(() => {
    installToastInterceptor();
  }, []);

  // 初始化操作員數據
  useEffect(() => {
    if (operators.length === 0) {
      const mockConfig = getMockConfig();
      if (mockConfig.enableOperators) {
        console.log('🔧 使用 Mock 操作員數據');
        setOperators(defaultOperators);
      }
    }
  }, []);

  // 开发环境自动登录
  useEffect(() => {
    // 如果已经登录，不需要自动登录
    if (currentUser) return;

    // 检查是否应该自动登录
    if (shouldAutoLogin()) {
      if (operators.length > 0) {
        // 使用第一个操作员自动登录
        const devUser = operators[0];
        if (devUser) {
          console.log('🚀 开发环境自动登录:', devUser.name);
          handleLogin(devUser);
        }
      } else {
        console.warn('⚠️ 自动登录失败: 没有可用的操作员数据');
        console.warn('💡 提示: 请设置 VITE_ENABLE_MOCK=true 启用 mock 数据');
      }
    }
  }, [currentUser, operators, handleLogin]);

  // 關閉程式前的警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentUser) {
        e.preventDefault();
        e.returnValue = '';
        return '您有未儲存的資料，確定要關閉程式嗎？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // 如果用戶未登入，顯示登入表單
  if (!currentUser) {
    return (
      <ErrorBoundary>
        <LoginForm
          operators={operators}
          onLogin={handleLogin}
        />
        <Toaster
          position="bottom-left"
          richColors={false}
          closeButton={true}
          gap={8}
          offset={24}
          toastOptions={{
            duration: 4000,
            style: {
              border: '1px solid',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              maxWidth: '400px',
              minHeight: '60px'
            }
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen bg-slate-600 p-6 flex items-center justify-center">
        <div className="w-full max-w-6xl h-5/6 bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col relative">
          {/* Top Navigation */}
          <SimpleTopNavigation currentUser={currentUser} onLogout={handleLogout} />

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            <StatsDashboard
              isRealtimePanelConnected={isRealtimePanelConnected}
              onRealtimePanelConnect={setIsRealtimePanelConnected}
              dataSourceSettings={dataSourceSettings}
              dataState={dataState}
            />
          </div>

          {/* Status Bar at bottom */}
          <StatusBar
            isRealtimePanelConnected={isRealtimePanelConnected}
            currentUser={currentUser}
          />
        </div>

        {/* Toast notifications */}
        <Toaster
          position="bottom-left"
          richColors={false}
          closeButton={true}
          gap={8}
          offset={24}
          toastOptions={{
            duration: 4000,
            style: {
              border: '1px solid',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              maxWidth: '400px',
              minHeight: '60px'
            }
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
