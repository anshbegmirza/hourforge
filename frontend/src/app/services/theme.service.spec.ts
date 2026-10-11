import { resolveDark } from './theme.service';

describe('resolveDark', () => {
  it('forces dark / light and follows system for auto', () => {
    expect(resolveDark('dark', false)).toBe(true);
    expect(resolveDark('light', true)).toBe(false);
    expect(resolveDark('auto', true)).toBe(true);
    expect(resolveDark('auto', false)).toBe(false);
  });
});
