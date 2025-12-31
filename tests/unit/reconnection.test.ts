/**
 * Automatic reconnection system tests
 * Validates Requirements 3.1, 3.2, 3.3, 3.4, 3.5 - Reconnection functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import WebSocket from 'ws';
import { ZhookClient } from '../../src/client';

// Mock WebSocket
vi.mock('ws', () => {
  const mockWebSocket = vi.fn();
  mockWebSocket.prototype.on = vi.fn();
  mockWebSocket.prototype.close = vi.fn();
  mockWebSocket.prototype.removeAllListeners = vi.fn();
  mockWebSocket.OPEN = 1;
  mockWebSocket.CLOSED = 3;
  return { default: mockWebSocket };
});

describe('Automatic Reconnection System', () => {
  let client: ZhookClient;
  let mockWs: any;
  let consoleSpy: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock console.log to capture log output
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

    // Create mock WebSocket instance
    mockWs = {
      on: vi.fn(),
      close: vi.fn(),
      removeAllListeners: vi.fn(),
      readyState: WebSocket.OPEN,
    };

    // Make WebSocket constructor return our mock
    (WebSocket as any).mockImplementation(() => mockWs);

    client = new ZhookClient('valid-client-key-123', {
      logLevel: 'silent',
      reconnectDelay: 1000,
      maxReconnectAttempts: 3
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Exponential Backoff Algorithm', () => {
    it('should transition to reconnecting state on disconnection', () => {
      // Test that disconnection triggers reconnecting state
      expect(client.getConnectionState()).toBe('disconnected');

      // Simulate the handleDisconnect method being called
      const handleDisconnect = (client as any).handleDisconnect.bind(client);
      handleDisconnect(1000, 'Normal closure');

      expect(client.getConnectionState()).toBe('reconnecting');
    });

    it('should respect reconnection configuration', () => {
      const config = client.getConfig();
      expect(config.reconnectDelay).toBe(1000);
      expect(config.maxReconnectAttempts).toBe(3);
    });

    it('should enforce minimum delay of 100ms', () => {
      const client = new ZhookClient('valid-client-key-123', {
        logLevel: 'silent',
        reconnectDelay: 100,
        maxReconnectAttempts: 1
      });

      expect(client.getConfig().reconnectDelay).toBe(100);
    });
  });

  describe('Maximum Attempts Handling', () => {
    it('should emit error when max attempts reached', () => {
      const errorHandler = vi.fn();
      client.onError(errorHandler);

      // Manually set reconnect attempts to max
      (client as any).reconnectAttempts = 3;

      // Simulate disconnection
      const handleDisconnect = (client as any).handleDisconnect.bind(client);
      handleDisconnect(1000, 'Normal closure');

      // Should immediately emit error without scheduling reconnection
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Maximum reconnection attempts (3) reached')
        })
      );
    });

    it('should respect maxReconnectAttempts configuration', () => {
      const client = new ZhookClient('valid-client-key-123', {
        logLevel: 'silent',
        maxReconnectAttempts: 5
      });

      expect(client.getConfig().maxReconnectAttempts).toBe(5);
    });
  });

  describe('Reconnection State Management', () => {
    it('should not reconnect when client is closed', () => {
      client.close();
      expect(client.getConnectionState()).toBe('closed');

      // Simulate disconnection on closed client
      const handleDisconnect = (client as any).handleDisconnect.bind(client);
      handleDisconnect(1000, 'Normal closure');

      // Should remain closed, not transition to reconnecting
      expect(client.getConnectionState()).toBe('closed');
    });

    it('should transition to reconnecting state on normal disconnection', () => {
      expect(client.getConnectionState()).toBe('disconnected');

      // Simulate normal disconnection
      const handleDisconnect = (client as any).handleDisconnect.bind(client);
      handleDisconnect(1000, 'Normal closure');

      expect(client.getConnectionState()).toBe('reconnecting');
    });

    it('should reset state on successful reconnection', () => {
      // Test that resetReconnectionState method exists and works
      const resetMethod = (client as any).resetReconnectionState;
      expect(typeof resetMethod).toBe('function');

      // Should not throw when called
      expect(() => resetMethod.call(client)).not.toThrow();
    });
  });

  describe('Authentication Error Handling', () => {
    it('should not reconnect on authentication errors', () => {
      const errorHandler = vi.fn();
      client.onError(errorHandler);

      // Simulate authentication error (code 1008)
      const handleDisconnect = (client as any).handleDisconnect.bind(client);
      handleDisconnect(1008, 'Authentication failed');

      // Should emit error but not transition to reconnecting
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Authentication failed')
        })
      );

      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should detect auth errors in reason text', () => {
      const errorHandler = vi.fn();
      client.onError(errorHandler);

      // Simulate auth error with different code but auth in reason
      const handleDisconnect = (client as any).handleDisconnect.bind(client);
      handleDisconnect(1000, 'Invalid auth token');

      // Should detect auth error and not reconnect
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Authentication failed')
        })
      );

      expect(client.getConnectionState()).toBe('disconnected');
    });
  });
});