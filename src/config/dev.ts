/**
 * 开发环境配置
 */

/**
 * 是否启用开发模式免登录
 * 仅在开发环境下有效
 */
export const ENABLE_DEV_AUTO_LOGIN = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTO_LOGIN !== 'false';

/**
 * 开发环境默认用户 token
 * 用于开发环境免登录
 */
export const DEV_USER_TOKEN = 'dev-token-' + Date.now();

/**
 * 开发环境配置
 */
export interface DevConfig {
  /** 是否启用自动登录 */
  autoLogin: boolean;
  /** 默认用户 token */
  userToken: string;
}

/**
 * 获取开发环境配置
 */
export function getDevConfig(): DevConfig {
  return {
    autoLogin: ENABLE_DEV_AUTO_LOGIN,
    userToken: DEV_USER_TOKEN
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
