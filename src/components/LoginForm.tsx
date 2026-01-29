import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader } from './ui/card';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Operator {
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

interface LoginFormProps {
  operators: Operator[];
  onLogin: (operator: Operator) => void;
}

export function LoginForm({ operators, onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('請填寫完整資訊', '帳號和密碼都是必填項目');
      return;
    }

    setIsLoading(true);

    // 模擬登入處理時間
    await new Promise(resolve => setTimeout(resolve, 800));

    // 標準化帳號輸入（處理特殊字符）
    const normalizedUsername = username.trim().toLowerCase()
      .replace(/ｍ/g, 'm')  // 替換全角m為半角m
      .replace(/ｃ/g, 'c')  // 替換全角c為半角c
      .replace(/ｏ/g, 'o')  // 替換全角o為半角o
      .replace(/＠/g, '@')  // 替換全角@為半角@
      .replace(/．/g, '.');  // 替換全角.為半角.

    // 尋找匹配的操作員
    const operator = operators.find(op => 
      op.username.toLowerCase() === normalizedUsername && 
      op.password === password
    );

    if (!operator) {
      // 檢查是否只是帳號格式問題
      const usernameExists = operators.find(op => 
        op.username.toLowerCase() === normalizedUsername
      );
      
      if (usernameExists) {
        toast.error('密碼錯誤', '請檢查您的密碼是否正確');
      } else {
        toast.error('帳號或密碼錯誤', '請檢查您的登入資訊。如使用複製貼上，請手動重新輸入帳號');
      }
      setIsLoading(false);
      return;
    }

    if (operator.status === '停用') {
      toast.error('帳號已停用', '請聯繫系統管理員啟用您的帳號');
      setIsLoading(false);
      return;
    }

    // 登入成功
    toast.success('登入成功', `歡迎回來，${operator.name}`);
    onLogin(operator);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-600 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">系統登入</h1>
            <p className="text-gray-600 mt-2">群呼即時面板</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 帳號輸入 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                帳號
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="請輸入帳號"
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* 密碼輸入 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                密碼
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入密碼"
                  className="pl-10 pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* 登入按鈕 */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '登入中...' : '登入'}
            </Button>
          </form>

          {/* 測試帳號提示 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">測試帳號：</p>
            <div className="space-y-1 text-xs text-gray-500">
              <div>管理員 - 帳號: manage@gmail.com / 密碼: 1234</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}