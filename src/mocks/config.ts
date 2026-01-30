/**
 * Mock 数据配置
 */

/**
 * 是否启用 mock 数据
 * 优先级：环境变量 VITE_ENABLE_MOCK > 开发/生产环境判断
 * - 如果设置了 VITE_ENABLE_MOCK，使用该值
 * - 否则：开发环境默认启用，生产环境默认禁用
 */
export const ENABLE_MOCK_DATA = (() => {
  const envMock = import.meta.env.VITE_ENABLE_MOCK;
  const isDev = import.meta.env.DEV;

  // 如果明确设置了环境变量，使用环境变量的值
  if (envMock === 'true') {
    console.log('🔧 Mock 配置: 环境变量强制启用 (VITE_ENABLE_MOCK=true)');
    return true;
  }
  if (envMock === 'false') {
    console.log('🔧 Mock 配置: 环境变量强制禁用 (VITE_ENABLE_MOCK=false)');
    return false;
  }

  // 否则根据开发/生产环境自动判断
  const autoEnabled = isDev;
  console.log(`🔧 Mock 配置: 自动判断 (${isDev ? '开发环境' : '生产环境'}) - ${autoEnabled ? '启用' : '禁用'}`);
  return autoEnabled;
})();

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
