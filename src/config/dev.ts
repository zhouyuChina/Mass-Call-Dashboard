/**
 * 开发环境配置
 */

import type { Operator } from '../App';

/**
 * 是否启用开发模式免登录
 * 仅在开发环境下有效
 */
export const ENABLE_DEV_AUTO_LOGIN = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTO_LOGIN !== 'false';

/**
 * 开发环境默认用户
 * 用于开发环境免登录（不依赖 mock 数据）
 */
export const DEV_DEFAULT_USER: Operator = {
  id: 'dev-user-001',
  name: '開發者',
  username: 'dev@local',
  password: 'dev',
  role: '管理員',
  status: '啟用',
  createdTime: new Date(),
  lastLogin: new Date()
};

/**
 * 开发环境配置
 */
export interface DevConfig {
  /** 是否启用自动登录 */
  autoLogin: boolean;
  /** 默认用户 */
  defaultUser: Operator;
}

/**
 * 获取开发环境配置
 */
export function getDevConfig(): DevConfig {
  return {
    autoLogin: ENABLE_DEV_AUTO_LOGIN,
    defaultUser: DEV_DEFAULT_USER
  };
}

/**
 * 检查是否应该自动登录
 */
export function shouldAutoLogin(): boolean {
  // 只在开发环境且未禁用时自动登录
  if (!import.meta.env.DEV) return false;

  // 检查环境变量
  if (import.meta.env.VITE_DEV_AUTO_LOGIN === 'false') {
    console.log('🔒 开发环境自动登录已禁用');
    return false;
  }

  console.log('🚀 开发环境自动登录已启用');
  return true;
}

/**
 * 获取开发环境默认用户
 */
export function getDevDefaultUser(): Operator {
  return DEV_DEFAULT_USER;
}
