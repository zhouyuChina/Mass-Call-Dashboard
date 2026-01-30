import { describe, it, expect } from 'vitest';

/**
 * 将座位号数组按行分组
 * @param numbers 座位号数组
 * @param perRow 每行座位数
 * @returns 分组后的二维数组
 */
export function chunkSeatNumbers(numbers: number[], perRow: number = 10): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < numbers.length; i += perRow) {
    rows.push(numbers.slice(i, i + perRow));
  }
  return rows;
}

describe('chunkSeatNumbers', () => {
  it('should split array into chunks of specified size', () => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const result = chunkSeatNumbers(numbers, 5);

    expect(result).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12]
    ]);
  });

  it('should use default perRow of 10', () => {
    const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
    const result = chunkSeatNumbers(numbers);

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(10);
    expect(result[1]).toHaveLength(10);
    expect(result[2]).toHaveLength(5);
  });

  it('should handle empty array', () => {
    const result = chunkSeatNumbers([]);
    expect(result).toEqual([]);
  });

  it('should handle array smaller than perRow', () => {
    const numbers = [1, 2, 3];
    const result = chunkSeatNumbers(numbers, 10);

    expect(result).toEqual([[1, 2, 3]]);
  });
});
