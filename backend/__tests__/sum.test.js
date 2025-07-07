// __tests__/sum.test.js
const sum = require('../src/sum');

describe('sum()', () => {
  it('adds two positive numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });

  test('adds negative numbers too', () => {
    expect(sum(-1, -1)).toBe(-2);
  });
});
