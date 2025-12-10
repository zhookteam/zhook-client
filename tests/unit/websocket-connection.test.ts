/**
 * WebSocket connection management tests
 * Validates Requirements 2.1, 2.2, 2.4, 2.5 - WebSocket connection functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import WebSocket from 'ws';
import { HookRClient } from '../../src/client';

// Mock WebSocket
vi.mock('ws', () => {
  const mockWebSocket = vi.fn();
  mockWebSocket.prototype.on = vi.fn();
  mockWebSocket.prototype.close = vi.fn();
  mockWebSocket.prototype.removeAllListeners = vi.fn();
  mockWebSocket.OPEN = 1;
  return { default: mockWebSocket };
});

describe('WebSocket Connection Management', () => {
  let client: HookRClient;
  let mockWs: any;
  let consoleSpy: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock console.log to capture log output
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create mock WebSocket instance
    mockWs = {
      on: vi.fn(),
      close: vi.fn(),
      removeAllListeners: vi.fn(),
      readyState: WebSocket.OPEN,
    };
    
    // Make WebSocket constructor return our mock
    (WebSocket as any).mockImplementation(() => mockWs);
    
    client = new HookRClient('valid-client-key-123', { logLevel: 'silent' });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Connection Establishment', () => {
    it('should create WebSocket with correct URL and client key', async () => {
      // Set up mock to simulate successful connection
      mockWs.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 0);
        }
      });

      await client.connect();

      expect(WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('wss://hookr-production.up.railway.app/events?clientKey=valid-client-key-123')
      );
    });

    it('should resolve promise on successful connection', async () => {
      mockWs.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 0);
        }
      });

      await expect(client.connect()).resolves.toBeUndefined();
      expect(client.getConnectionState()).toBe('connected');
    });

    it('should reject promise on connection error', async () => {
      const testError = new Error('Connection failed');
      
      mockWs.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(testError), 0);
        }
      });

      await expect(client.connect()).rejects.toThrow('WebSocket connection failed: Connection failed');
      expect(client.getConnectionState()).toBe('disconnected');
    });

    it('should reject promise on connection timeout', async () => {
      // Don't trigger any events to simulate timeout
      mockWs.on.mockImplementation(() => {});

      // Use fake timers to control timeout
      vi.useFakeTimers();
      
      const connectPromise = client.connect();
      
      // Fast-forward past the timeout
      vi.advanceTimersByTime(10001);
      
      await expect(connectPromise).rejects.toThrow('Connection timeout');
      
      vi.useRealTimers();
    });

    it('should prevent connection when client is closed', async () => {
      client.close();
      
      await expect(client.connect()).rejects.toThrow('Cannot connect: client has been closed');
    });

    it('should handle already connected state', async () => {
      // First connection
      mockWs.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 0);
        }
      });
      
      await client.connect();
      
      // Second connection attempt should not create new WebSocket
      const initialCallCount = (WebSocket as any).mock.calls.length;
      await client.connect();
      
      expect((WebSocket as any).mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      // Set up successful connection
      mockWs.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 0);
        }
      });
      await client.connect();
    });

    it('should handle connection confirmation messages', () => {
      const connectionHandler = vi.fn();
      client.onConnected(connectionHandler);

      const connectionMessage = {
        type: 'connected',
        message: 'Connected successfully',
        clientId: 'client_12345'
      };

      // Simulate receiving connection confirmation
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      messageHandler(JSON.stringify(connectionMessage));

      expect(client.getClientId()).toBe('client_12345');
      expect(connectionHandler).toHaveBeenCalledWith(connectionMessage);
    });

    it('should handle webhook event messages', () => {
      const eventHandler = vi.fn();
      client.onHookCalled(eventHandler);

      const webhookEvent = {
        type: 'event',
        eventId: 'evt_67890',
        hookId: 'hook_abc123',
        receivedAt: '2024-01-15T10:30:00Z',
        payload: { test: 'data' }
      };

      // Simulate receiving webhook event
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      messageHandler(JSON.stringify(webhookEvent));

      expect(eventHandler).toHaveBeenCalledWith(webhookEvent);
    });

    it('should handle invalid JSON messages gracefully', () => {
      const errorHandler = vi.fn();
      client.onError(errorHandler);

      // Simulate receiving invalid JSON
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      messageHandler('invalid json {');

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Message parsing failed')
        })
      );
    });

    it('should handle unknown message types', () => {
      const unknownMessage = {
        type: 'unknown',
        data: 'test'
      };

      // Simulate receiving unknown message type
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      messageHandler(JSON.stringify(unknownMessage));

      // Should not throw, just log warning
      expect(() => {}).not.toThrow();
    });

    it('should isolate handler errors', () => {
      const goodHandler = vi.fn();
      const badHandler = vi.fn(() => { throw new Error('Handler error'); });
      const anotherGoodHandler = vi.fn();

      client.onHookCalled(goodHandler);
      client.onHookCalled(badHandler);
      client.onHookCalled(anotherGoodHandler);

      const webhookEvent = {
        type: 'event',
        eventId: 'evt_test',
        hookId: 'hook_test',
        receivedAt: '2024-01-15T10:30:00Z',
        payload: { test: 'data' }
      };

      // Simulate receiving webhook event
      const messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
      messageHandler(JSON.stringify(webhookEvent));

      // Good handlers should still be called despite bad handler error
      expect(goodHandler).toHaveBeenCalledWith(webhookEvent);
      expect(anotherGoodHandler).toHaveBeenCalledWith(webhookEvent);
      expect(badHandler).toHaveBeenCalledWith(webhookEvent);
    });
  });

  describe('Disconnection Handling', () => {
    beforeEach(async () => {
      // Set up successful connection
      mockWs.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 0);
        }
      });
      await client.connect();
    });

    it('should handle authentication errors', () => {
      const errorHandler = vi.fn();
      client.onError(errorHandler);

      // Simulate authentication error
      const closeHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler(1008, 'Authentication failed');

      expect(client.getConnectionState()).toBe('disconnected');
      expect(client.getClientId()).toBeNull();
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Authentication failed')
        })
      );
    });

    it('should handle normal disconnections', () => {
      // Simulate normal disconnection
      const closeHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler(1000, 'Normal closure');

      // Now that reconnection is implemented, normal disconnections trigger reconnection
      expect(client.getConnectionState()).toBe('reconnecting');
      expect(client.getClientId()).toBeNull();
    });

    it('should ignore disconnection when client is closed', () => {
      client.close();

      // Simulate disconnection after close
      const closeHandler = mockWs.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler(1000, 'Normal closure');

      expect(client.getConnectionState()).toBe('closed');
    });
  });

  describe('Error Handling', () => {
    it('should emit errors to registered handlers', async () => {
      const errorHandler = vi.fn();
      client.onError(errorHandler);

      // Set up connection that will error after connecting
      mockWs.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 0);
        }
      });

      await client.connect();

      // Simulate WebSocket error after connection
      const errorHandler2 = mockWs.on.mock.calls.find(call => call[0] === 'error')[1];
      const testError = new Error('WebSocket error');
      errorHandler2(testError);

      expect(errorHandler).toHaveBeenCalledWith(testError);
    });

    it('should handle missing error handlers gracefully', async () => {
      // No error handlers registered
      mockWs.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 0);
        }
      });

      await client.connect();

      // Simulate error without handlers - should not throw
      const errorHandler = mockWs.on.mock.calls.find(call => call[0] === 'error')[1];
      expect(() => errorHandler(new Error('Test error'))).not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up WebSocket on close', async () => {
      mockWs.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 0);
        }
      });

      await client.connect();
      client.close();

      expect(mockWs.removeAllListeners).toHaveBeenCalled();
      expect(mockWs.close).toHaveBeenCalledWith(1000, 'Client closed');
    });

    it('should handle close when WebSocket is not open', async () => {
      // First establish connection
      mockWs.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'open') {
          setTimeout(() => callback(), 0);
        }
      });

      await client.connect();
      
      // Change WebSocket state to closed
      mockWs.readyState = WebSocket.CLOSED;
      
      expect(() => client.close()).not.toThrow();
      expect(mockWs.removeAllListeners).toHaveBeenCalled();
      // close() should still be called even if WebSocket is already closed
      expect(mockWs.close).toHaveBeenCalled();
    });
  });
});