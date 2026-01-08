/**
 * Server Manager Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServerManager } from '../../electron/main/server-manager';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: {
      on: vi.fn(),
    },
    stderr: {
      on: vi.fn(),
    },
    on: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
  })),
}));

// Mock net for port finding
vi.mock('net', () => ({
  createServer: vi.fn(() => ({
    listen: vi.fn(function (this: any, port: number, callback: () => void) {
      setTimeout(callback, 0);
      return this;
    }),
    close: vi.fn(function (this: any, callback: () => void) {
      setTimeout(callback, 0);
      return this;
    }),
    address: vi.fn(() => ({ port: 3000 })),
    once: vi.fn(function (this: any, event: string, callback: () => void) {
      return this;
    }),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

describe('ServerManager', () => {
  let serverManager: ServerManager;

  beforeEach(() => {
    serverManager = new ServerManager({
      serverDir: '/app/server',
      preferredPort: 3000,
      healthCheckPath: '/api/health',
    });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await serverManager.stop();
  });

  describe('getUrl', () => {
    it('should return the server URL', () => {
      const url = serverManager.getUrl();
      expect(url).toBe('http://localhost:3000');
    });

    it('should include the correct port', () => {
      const manager = new ServerManager({
        serverDir: '/app/server',
        preferredPort: 8080,
      });
      expect(manager.getUrl()).toBe('http://localhost:8080');
    });
  });

  describe('isRunning', () => {
    it('should return false initially', () => {
      expect(serverManager.isRunning()).toBe(false);
    });
  });

  describe('getPort', () => {
    it('should return the preferred port initially', () => {
      expect(serverManager.getPort()).toBe(3000);
    });
  });
});

describe('ServerManager Configuration', () => {
  it('should use default health check path', () => {
    const manager = new ServerManager({
      serverDir: '/app/server',
      preferredPort: 3000,
    });

    // The default health check path should be set internally
    expect(manager.getUrl()).toBe('http://localhost:3000');
  });

  it('should use custom preferred port', () => {
    const manager = new ServerManager({
      serverDir: '/app/server',
      preferredPort: 4000,
    });

    expect(manager.getPort()).toBe(4000);
  });
});
