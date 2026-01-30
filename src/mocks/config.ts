/**
 * Mock 数据配置
 */

/**
 * 是否启用 mock 数据
 * 开发环境默认启用，生产环境默认禁用
 */
export const ENABLE_MOCK_DATA = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCK === 'true';

/**
 * Mock 数据配置选项
 */
export interface MockConfig {
  /** 是否启用操作员 mock 数据 */
  enableOperators: boolean;
  /** 是否启用座席 mock 数据 */
  enableAgents: boolean;
}

/**
 * 默认 mock 配置
 */
export const defaultMockConfig: MockConfig = {
  enableOperators: ENABLE_MOCK_DATA,
  enableAgents: ENABLE_MOCK_DATA
};

/**
 * 获取当前 mock 配置
 */
export function getMockConfig(): MockConfig {
  // 可以从 localStorage 读取用户自定义配置
  const savedConfig = localStorage.getItem('mockConfig');
  if (savedConfig) {
    try {
      return { ...defaultMockConfig, ...JSON.parse(savedConfig) };
    } catch {
      return defaultMockConfig;
    }
  }
  return defaultMockConfig;
}

/**
 * 保存 mock 配置
 */
export function saveMockConfig(config: Partial<MockConfig>): void {
  const currentConfig = getMockConfig();
  const newConfig = { ...currentConfig, ...config };
  localStorage.setItem('mockConfig', JSON.stringify(newConfig));
}
