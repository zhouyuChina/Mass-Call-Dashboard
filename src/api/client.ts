/**
 * API 客户端基础类
 * 提供统一的请求封装、错误处理和拦截器
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || `API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 构建完整的 URL（包含查询参数）
   */
  private buildURL(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(endpoint, this.baseURL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * 统一的请求方法
   */
  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { params, ...fetchConfig } = config;
    const url = this.buildURL(endpoint, params);

    const response = await fetch(url, {
      ...fetchConfig,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...fetchConfig.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.statusText,
        await response.text()
      );
    }

    return response.json();
  }

  /**
   * GET 请求
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  /**
   * POST 请求
   */
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT 请求
   */
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE 请求
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// 创建默认的 API 客户端实例
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://47.237.31.83:7000/api';
export const apiClient = new ApiClient(API_BASE_URL);

// 导出 API_BASE_URL 供其他地方使用
export { API_BASE_URL };
