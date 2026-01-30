import type { Operator } from '../App';

/**
 * 默认操作员数据
 */
export const defaultOperators: Operator[] = [
  {
    id: 'op-admin-001',
    name: '東南',
    username: 'manage@gmail.com',
    password: '1234',
    role: '管理員',
    status: '啟用',
    createdTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
];
