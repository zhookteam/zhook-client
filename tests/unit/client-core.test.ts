/**
 * Core ZhookClient class structure tests
 * Validates Requirements 2.1, 2.3 - Configuration handling and validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZhookClient } from '../../src/client';

describe('ZhookClient Core Structure', () => {
  let consoleSpy: any;

  beforeEach(() => {
    // Mock console.log to capture log output
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  describe('Constructor and Configuration', () => {
    it('should create client with valid client key', () => {
      const client = new ZhookClient('valid-client-key-123');
      expect(client).toBeInstanceOf(ZhookClient);
      expect(client.getConnectionState()).toBe('disconnected');
      expect(client.getClientId()).toBeNull();
    });

    it('should use default configuration when no options provided', () => {
      const client = new ZhookClient('valid-client-key-123');
      const config = client.getConfig();

      expect(config.wsUrl).toBe('wss://web.zhook.dev/events');
      expect(config.apiUrl).toBe('https://web.zhook.dev/api/v1');
      expect(config.maxReconnectAttempts).toBe(10);
      expect(config.reconnectDelay).toBe(1000);
      expect(config.logLevel).toBe('info');
    });

    it('should merge custom options with defaults', () => {
      const client = new ZhookClient('valid-client-key-123', {
        wsUrl: 'wss://custom.example.com/events',
        maxReconnectAttempts: 5,
        logLevel: 'debug'
      });

      const config = client.getConfig();
      expect(config.wsUrl).toBe('wss://custom.example.com/events');
      expect(config.maxReconnectAttempts).toBe(5);
      expect(config.logLevel).toBe('debug');
      // Defaults should still be used for unspecified options
      expect(config.apiUrl).toBe('https://web.zhook.dev/api/v1');
      expect(config.reconnectDelay).toBe(1000);
    });

    it('should validate client key is required', () => {
      expect(() => new ZhookClient('')).toThrow('Client key is required and must be a non-empty string');
      expect(() => new ZhookClient('   ')).toThrow('Client key cannot be empty or whitespace only');
      expect(() => new ZhookClient(null as any)).toThrow('Client key is required and must be a non-empty string');
      expect(() => new ZhookClient(undefined as any)).toThrow('Client key is required and must be a non-empty string');
    });

    it('should validate client key minimum length', () => {
      expect(() => new ZhookClient('short')).toThrow('Client key appears to be too short');
      expect(() => new ZhookClient('1234567890')).not.toThrow(); // Exactly 10 chars should work
    });

    it('should validate WebSocket URL format', () => {
      expect(() => new ZhookClient('valid-key-123', {
        wsUrl: 'invalid-url'
      })).toThrow('WebSocket URL is not a valid URL');

      expect(() => new ZhookClient('valid-key-123', {
        wsUrl: 'http://example.com'
      })).toThrow('WebSocket URL must use ws:// or wss:// protocol');

      expect(() => new ZhookClient('valid-key-123', {
        wsUrl: 'wss://valid.example.com/events'
      })).not.toThrow();
    });

    it('should validate API URL format', () => {
      expect(() => new ZhookClient('valid-key-123', {
        apiUrl: 'invalid-url'
      })).toThrow('API URL is not a valid URL');

      expect(() => new ZhookClient('valid-key-123', {
        apiUrl: 'ws://example.com'
      })).toThrow('API URL must use http:// or https:// protocol');

      expect(() => new ZhookClient('valid-key-123', {
        apiUrl: 'https://valid.example.com/api'
      })).not.toThrow();
    });

    it('should validate maxReconnectAttempts', () => {
      expect(() => new ZhookClient('valid-key-123', {
        maxReconnectAttempts: -1
      })).toThrow('maxReconnectAttempts must be a non-negative integer');

      expect(() => new ZhookClient('valid-key-123', {
        maxReconnectAttempts: 1.5
      })).toThrow('maxReconnectAttempts must be a non-negative integer');

      expect(() => new ZhookClient('valid-key-123', {
        maxReconnectAttempts: 0
      })).not.toThrow();
    });

    it('should validate reconnectDelay', () => {
      expect(() => new ZhookClient('valid-key-123', {
        reconnectDelay: 50
      })).toThrow('reconnectDelay must be an integer >= 100ms');

      expect(() => new ZhookClient('valid-key-123', {
        reconnectDelay: 1.5
      })).toThrow('reconnectDelay must be an integer >= 100ms');

      expect(() => new ZhookClient('valid-key-123', {
        reconnectDelay: 100
      })).not.toThrow();
    });

    it('should validate logLevel', () => {
      expect(() => new ZhookClient('valid-key-123', {
        logLevel: 'invalid' as any
      })).toThrow('logLevel must be one of: silent, error, warn, info, debug');

      expect(() => new ZhookClient('valid-key-123', {
        logLevel: 'debug'
      })).not.toThrow();
    });
  });

  describe('State Management', () => {
    let client: ZhookClient;

    beforeEach(() => {
      client = new ZhookClient('valid-client-key-123');
    });

    it('should start in disconnected state', () => {
      expect(client.getConnectionState()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
      expect(client.getClientId()).toBeNull();
    });

    it('should handle close() gracefully', () => {
      client.close();
      expect(client.getConnectionState()).toBe('closed');
      expect(client.isConnected()).toBe(false);
    });

    it('should handle multiple close() calls safely', () => {
      client.close();
      client.close();
      client.close();
      expect(client.getConnectionState()).toBe('closed');
    });

    it('should prevent connection after close', async () => {
      client.close();
      await expect(client.connect()).rejects.toThrow('Cannot connect: client has been closed');
    });
  });

  describe('Event Handler Management', () => {
    let client: ZhookClient;

    beforeEach(() => {
      client = new ZhookClient('valid-client-key-123', { logLevel: 'silent' });
    });

    it('should register event handlers', () => {
      const handler = vi.fn();
      expect(() => client.onHookCalled(handler)).not.toThrow();
    });

    it('should register connection handlers', () => {
      const handler = vi.fn();
      expect(() => client.onConnected(handler)).not.toThrow();
    });

    it('should register error handlers', () => {
      const handler = vi.fn();
      expect(() => client.onError(handler)).not.toThrow();
    });

    it('should validate handlers are functions', () => {
      expect(() => client.onHookCalled('not-a-function' as any)).toThrow('EventHandler must be a function');
      expect(() => client.onConnected(123 as any)).toThrow('ConnectionHandler must be a function');
      expect(() => client.onError(null as any)).toThrow('ErrorHandler must be a function');
    });

    it('should remove handlers', () => {
      const handler = vi.fn();
      client.onHookCalled(handler);
      expect(() => client.removeHandler(handler)).not.toThrow();
    });

    it('should handle removing non-existent handlers', () => {
      const handler = vi.fn();
      expect(() => client.removeHandler(handler)).not.toThrow();
    });
  });

  describe('Logging System', () => {
    it('should respect log levels', () => {
      // Test silent mode
      consoleSpy.mockClear();
      const silentClient = new ZhookClient('valid-key-123', { logLevel: 'silent' });
      expect(consoleSpy).not.toHaveBeenCalled();

      // Test debug mode (should log initialization)
      consoleSpy.mockClear();
      const debugClient = new ZhookClient('valid-key-123', { logLevel: 'debug' });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should include configuration in debug logs', () => {
      const debugClient = new ZhookClient('valid-key-123', { logLevel: 'debug' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] zhook-client:'),
        expect.stringContaining('ZhookClient initialized'),
        expect.objectContaining({
          wsUrl: expect.any(String),
          apiUrl: expect.any(String),
        })
      );
    });
  });

  describe('Configuration Immutability', () => {
    it('should return readonly configuration', () => {
      const client = new ZhookClient('valid-key-123');
      const config = client.getConfig();

      // Should not be able to modify the returned config
      expect(() => {
        (config as any).wsUrl = 'modified';
      }).not.toThrow(); // TypeScript prevents this, but runtime doesn't

      // But original config should be unchanged
      const newConfig = client.getConfig();
      expect(newConfig.wsUrl).toBe('wss://web.zhook.dev/events');
    });
  });
});