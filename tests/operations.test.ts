import { describe, expect, it } from 'vitest';
import { operations, getOperationName } from '../src/operations.js';

describe('operations', () => {
  it('exports constants for operations', () => {
    expect(operations).toHaveProperty('PLUS');
    expect(operations).toHaveProperty('MINUS');
    expect(operations).toHaveProperty('SELF');
  });
});

describe('getOperationName', () => {
  it('returns \'plus\' when given +', () => {
    expect(getOperationName('+')).toBe('plus');
  });

  it('returns \'minus\' when given -', () => {
    expect(getOperationName('-')).toBe('minus');
  });

  it('returns false when given an invalid operation', () => {
    expect(getOperationName('some invalid operation')).toBeFalsy();
  });
});
