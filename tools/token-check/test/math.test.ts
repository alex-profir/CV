import { describe, expect, test } from 'vitest';
import { evaluateMath } from '../src/math.ts';

const LENGTH = ['px', '%'];
const DURATION = ['ms', 's'];

describe('003-design-tokens-FR-015: arithmetic is evaluated as Penpot evaluates it', () => {
  test.each([
    ['16 * 2', LENGTH, '32'],
    ['8px + 8', LENGTH, '16px'],
    ['50% / 2', LENGTH, '25%'],
    ['10 % 3', LENGTH, '1'],
    ['roundTo(16 / 3, 1)', LENGTH, '5.3'],
    ['1 / 3', LENGTH, '0.3333'],
    ['250ms * 2', DURATION, '500ms'],
    ['-(4) + 2', LENGTH, '-2'],
  ])('%s evaluates to its value', (text, units, value) => {
    expect(evaluateMath(text, units)).toEqual({ value });
  });

  test('a spaced % is the remainder and a % after a number is a unit', () => {
    expect(evaluateMath('10 % 4', LENGTH)).toEqual({ value: '2' });
    expect(evaluateMath('10% * 4', LENGTH)).toEqual({ value: '40%' });
  });

  test('different units in one expression are mixed units', () => {
    expect(evaluateMath('8px + 2%', LENGTH)).toEqual({ error: 'mixed-units' });
    expect(evaluateMath('0.3s + 100ms', DURATION)).toEqual({ error: 'mixed-units' });
  });

  test('a unit the type does not allow is unknown', () => {
    expect(evaluateMath('1rem * 2', LENGTH)).toEqual({ error: 'unknown-unit' });
    expect(evaluateMath('1px * 2', DURATION)).toEqual({ error: 'unknown-unit' });
  });

  test('a result that is not a finite number is not a number', () => {
    expect(evaluateMath('1 / 0', LENGTH)).toEqual({ error: 'not-a-number' });
    expect(evaluateMath('16 * x', LENGTH)).toEqual({ error: 'not-a-number' });
  });

  test('a plain value with no operator is returned unchanged', () => {
    for (const text of ['16px', '16', '-4', '1.5rem', 'Bold', '#1f1d1a']) expect(evaluateMath(text, LENGTH)).toEqual({ value: text });
  });
});
