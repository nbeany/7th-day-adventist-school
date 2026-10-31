import { describe, it, expect } from 'vitest';
import { unwrapPaginatedResponse } from './axios';

describe('unwrapPaginatedResponse', () => {
  it('unwraps a DRF paginated envelope into a bare array', () => {
    const paginated = { count: 2, next: null, previous: null, results: [{ id: 1 }, { id: 2 }] };
    expect(unwrapPaginatedResponse(paginated)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('leaves a bare array untouched', () => {
    const arr = [{ id: 1 }];
    expect(unwrapPaginatedResponse(arr)).toBe(arr);
  });

  it('leaves a single-object response (e.g. a detail view) untouched', () => {
    const obj = { id: 1, name: 'Term 1' };
    expect(unwrapPaginatedResponse(obj)).toBe(obj);
  });

  it('leaves an object that merely happens to have a "results" key without "count" untouched', () => {
    const obj = { results: 'not a list' };
    expect(unwrapPaginatedResponse(obj)).toBe(obj);
  });

  it('passes through null/undefined', () => {
    expect(unwrapPaginatedResponse(null)).toBeNull();
    expect(unwrapPaginatedResponse(undefined)).toBeUndefined();
  });
});
