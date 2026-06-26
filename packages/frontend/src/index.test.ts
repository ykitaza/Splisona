import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve(__dirname, 'index.css'), 'utf-8');

describe('index.css @theme tokens', () => {
  const requiredColorTokens = [
    '--color-base',
    '--color-surface',
    '--color-raised',
    '--color-hairline',
    '--color-text-hi',
    '--color-text-mid',
    '--color-text-lo',
    '--color-accent',
    '--color-accent-dim',
    '--color-win-a',
    '--color-win-b',
    '--color-win-b-dim',
    '--color-danger',
    '--color-danger-dim',
    '--color-success',
    '--color-success-dim',
    '--color-draw',
  ];

  const requiredFontTokens = ['--font-sans', '--font-mono'];

  const requiredSpacingTokens = Array.from({ length: 7 }, (_, i) => `--spacing-${i + 1}`);

  const requiredRadiusTokens = ['--radius-sm', '--radius-md', '--radius-lg'];

  const requiredTextTokens = [
    '--text-xs',
    '--text-sm',
    '--text-base',
    '--text-lg',
    '--text-xl',
    '--text-display',
  ];

  it.each(requiredColorTokens)('カラートークン %s が定義されている', (token) => {
    expect(css).toContain(token);
  });

  it.each(requiredFontTokens)('フォントトークン %s が定義されている', (token) => {
    expect(css).toContain(token);
  });

  it.each(requiredSpacingTokens)('spacing トークン %s が定義されている', (token) => {
    expect(css).toContain(token);
  });

  it.each(requiredRadiusTokens)('角丸トークン %s が定義されている', (token) => {
    expect(css).toContain(token);
  });

  it.each(requiredTextTokens)('タイポグラフィトークン %s が定義されている', (token) => {
    expect(css).toContain(token);
  });

  it('@theme ブロックが存在する', () => {
    expect(css).toMatch(/@theme\s*\{/);
  });
});
