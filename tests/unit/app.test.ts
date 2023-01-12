import {
  describe, expect, it, vi, afterEach,
} from 'vitest';
import { getMockReq, getMockRes } from 'vitest-mock-express';
import * as app from '../../src/app.js';

// Catch all console output during tests.
console.error = vi.fn();
console.info = vi.fn();
console.log = vi.fn();
console.warn = vi.fn();

describe('logRequest', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockReq = {
    ip: '127.0.0.9',
    method: 'get',
    path: '/path',
  };

  it('logs request data to stdout', () => {
    const req = getMockReq(mockReq);

    app.logRequest(req);

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(mockReq.ip));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(mockReq.method));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(mockReq.path));
  });

  it('logs an error to stdout', () => {
    const err = new Error('errorString');

    app.logResponseError(err);

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(err.message));
  });
});

describe('validateToken', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a status code and error message for invalid tokens', () => {
    const validateSpy = vi.spyOn(app, 'validateToken');
    app.validateToken('something', '');

    expect(validateSpy).toHaveReturnedWith({ error: expect.any(Number), message: expect.any(String) });
  });

  it('logs an error to stdout for invalid tokens', () => {
    app.validateToken('something', '');
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('logs an error to stdout for non-matching tokens', () => {
    // console.error = vi.fn();
    app.validateToken('something', 'something-else');
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('returns a 500 status code for a blank token on the server side', () => {
    const result = app.validateToken('something', '');
    if (typeof result !== 'boolean') {
      expect(result.error).toEqual(500);
    }
  });

  it('returns a 500 status code for a token on the server side made up of spaces', () => {
    const result = app.validateToken('something', '  ');
    if (typeof result !== 'boolean') {
      expect(result.error).toEqual(500);
    }
  });

  it('returns a 500 status code for a token on the server side left as default', () => {
    const result = app.validateToken('something', 'xxxxxxxxxxxxxxxxxxxxxxxx');
    if (typeof result !== 'boolean') {
      expect(result.error).toEqual(500);
    }
  });

  it('returns a 403 status code for a token that does NOT match', () => {
    const result = app.validateToken('something', 'something-else');
    if (typeof result !== 'boolean') {
      expect(result.error).toEqual(403);
    }
  });

  it('returns true for a token that DOES match', () => {
    const result = app.validateToken('something', 'something');

    expect(result).toBeTruthy();
  });
});

describe('handleGet', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs requests to stdout', async () => {
    const req = getMockReq({ ip: '127.0.0.9' });
    const { res, next, clearMockRes } = getMockRes();

    try {
      await app.handleGet(req, res, next);
    } catch (error) {} // eslint-disable-line no-empty

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('127.0.0.9'));
    clearMockRes();
  });

  it('sends a simple response for incoming requests', async () => {
    const req = getMockReq();
    const { res, next, clearMockRes } = getMockRes();

    await app.handleGet(req, res, next);

    expect(res.send).toHaveBeenCalled();

    clearMockRes();
  });
});

describe('handlePost', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs requests to stdout', () => {
    const req = getMockReq({ ip: '127.0.0.9' });
    const { res, next, clearMockRes } = getMockRes();

    try {
      app.handlePost(req, res, next);
    } catch (error) {} // eslint-disable-line no-empty

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('127.0.0.9'));

    clearMockRes();
  });

  it('responds with a challenge value when received', () => {
    const challenge = 'thisIsAChallenge!';
    const req = getMockReq({ ip: '127.0.0.9', body: { challenge } });
    const { res, next, clearMockRes } = getMockRes();

    app.handlePost(req, res, next);

    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ challenge }));

    clearMockRes();
  });

  it('responds with an error message on bad token', () => {
    const token = '123456';
    const req = getMockReq({ ip: '127.0.0.9', body: { token } });
    const { res, next, clearMockRes } = getMockRes();

    app.handlePost(req, res, next);

    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Access denied.'));

    clearMockRes();
  });
});
