/**
 * Tests for REST API client functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HookRClient } from '../../src/client';
import type { HookConfig, Hook } from '../../src/types';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HookRClient - REST API', () => {
  let client: HookRClient;
  const mockClientKey = 'test-client-key-12345';

  beforeEach(() => {
    client = new HookRClient(mockClientKey, {
      apiUrl: 'https://api.test.com/v1',
      logLevel: 'silent',
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createHook', () => {
    const validHookConfig: HookConfig = {
      name: 'Test Hook',
      url: 'https://example.com/webhook',
      events: ['user.created', 'user.updated'],
      headers: {
        'X-Custom-Header': 'value',
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffMultiplier: 2,
      },
    };

    const mockCreatedHook: Hook = {
      ...validHookConfig,
      id: 'hook-123',
      clientId: 'client-456',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      status: 'active',
    };

    it('should create a hook successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockCreatedHook)),
      });

      const result = await client.createHook(validHookConfig);

      expect(result).toEqual(mockCreatedHook);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/hooks',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockClientKey}`,
            'Content-Type': 'application/json',
            'User-Agent': '@hookr/client/1.0.0',
          },
          body: JSON.stringify(validHookConfig),
        }
      );
    });

    it('should validate hook configuration', async () => {
      const invalidConfigs = [
        { name: '', url: 'https://example.com' },
        { name: 'Test', url: 'invalid-url' },
        { name: 'Test', url: 'ftp://example.com' },
        { name: 'Test', url: 'https://example.com', events: 'not-array' },
        { name: 'Test', url: 'https://example.com', events: [123] },
        { name: 'Test', url: 'https://example.com', headers: 'not-object' },
        { name: 'Test', url: 'https://example.com', headers: { key: 123 } },
        { name: 'Test', url: 'https://example.com', retryPolicy: { maxAttempts: -1 } },
        { name: 'Test', url: 'https://example.com', retryPolicy: { maxAttempts: 3, backoffMultiplier: 0 } },
      ];

      for (const config of invalidConfigs) {
        await expect(client.createHook(config as any)).rejects.toThrow();
      }
    });

    it('should handle API errors', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(JSON.stringify({ message: 'Invalid hook configuration' })),
      };

      mockFetch.mockResolvedValueOnce(errorResponse);

      await expect(client.createHook(validHookConfig)).rejects.toThrow(
        'API request failed (400): Invalid hook configuration'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.createHook(validHookConfig)).rejects.toThrow(
        'Network error during API request: Network error'
      );
    });
  });

  describe('getHooks', () => {
    const mockHooks: Hook[] = [
      {
        id: 'hook-1',
        name: 'Hook 1',
        url: 'https://example.com/hook1',
        clientId: 'client-456',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        status: 'active',
      },
      {
        id: 'hook-2',
        name: 'Hook 2',
        url: 'https://example.com/hook2',
        clientId: 'client-456',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        status: 'paused',
      },
    ];

    it('should retrieve all hooks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockHooks)),
      });

      const result = await client.getHooks();

      expect(result).toEqual(mockHooks);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/hooks',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockClientKey}`,
            'Content-Type': 'application/json',
            'User-Agent': '@hookr/client/1.0.0',
          },
        }
      );
    });

    it('should handle empty hooks list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([])),
      });

      const result = await client.getHooks();

      expect(result).toEqual([]);
    });
  });

  describe('getHook', () => {
    const mockHook: Hook = {
      id: 'hook-123',
      name: 'Test Hook',
      url: 'https://example.com/webhook',
      clientId: 'client-456',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      status: 'active',
    };

    it('should retrieve a specific hook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockHook)),
      });

      const result = await client.getHook('hook-123');

      expect(result).toEqual(mockHook);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/hooks/hook-123',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockClientKey}`,
            'Content-Type': 'application/json',
            'User-Agent': '@hookr/client/1.0.0',
          },
        }
      );
    });

    it('should validate hook ID', async () => {
      const invalidIds = ['', '   ', null, undefined];

      for (const id of invalidIds) {
        await expect(client.getHook(id as any)).rejects.toThrow();
      }
    });

    it('should handle hook not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(JSON.stringify({ message: 'Hook not found' })),
      });

      await expect(client.getHook('nonexistent')).rejects.toThrow(
        'API request failed (404): Hook not found'
      );
    });
  });

  describe('updateHook', () => {
    const updateConfig = {
      name: 'Updated Hook Name',
      url: 'https://updated.example.com/webhook',
    };

    const mockUpdatedHook: Hook = {
      id: 'hook-123',
      name: 'Updated Hook Name',
      url: 'https://updated.example.com/webhook',
      clientId: 'client-456',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      status: 'active',
    };

    it('should update a hook successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockUpdatedHook)),
      });

      const result = await client.updateHook('hook-123', updateConfig);

      expect(result).toEqual(mockUpdatedHook);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/hooks/hook-123',
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${mockClientKey}`,
            'Content-Type': 'application/json',
            'User-Agent': '@hookr/client/1.0.0',
          },
          body: JSON.stringify(updateConfig),
        }
      );
    });

    it('should validate partial hook configuration', async () => {
      const invalidConfigs = [
        {},
        { name: '' },
        { url: 'invalid-url' },
        { events: 'not-array' },
        { headers: 'not-object' },
        { retryPolicy: { maxAttempts: -1 } },
      ];

      for (const config of invalidConfigs) {
        await expect(client.updateHook('hook-123', config as any)).rejects.toThrow();
      }
    });

    it('should validate hook ID for updates', async () => {
      await expect(client.updateHook('', updateConfig)).rejects.toThrow();
    });
  });

  describe('deleteHook', () => {
    it('should delete a hook successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      await expect(client.deleteHook('hook-123')).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/hooks/hook-123',
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${mockClientKey}`,
            'Content-Type': 'application/json',
            'User-Agent': '@hookr/client/1.0.0',
          },
        }
      );
    });

    it('should validate hook ID for deletion', async () => {
      await expect(client.deleteHook('')).rejects.toThrow();
    });

    it('should handle deletion errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(JSON.stringify({ message: 'Hook not found' })),
      });

      await expect(client.deleteHook('nonexistent')).rejects.toThrow(
        'API request failed (404): Hook not found'
      );
    });
  });

  describe('API request handling', () => {
    it('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('invalid json'),
      });

      await expect(client.getHooks()).rejects.toThrow(
        'Invalid JSON response from API'
      );
    });

    it('should handle empty responses for non-DELETE requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      const result = await client.getHooks();
      expect(result).toEqual({});
    });

    it('should include proper authentication headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([])),
      });

      await client.getHooks();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockClientKey}`,
            'Content-Type': 'application/json',
            'User-Agent': '@hookr/client/1.0.0',
          }),
        })
      );
    });

    it('should handle error responses without JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server Error'),
      });

      await expect(client.getHooks()).rejects.toThrow(
        'API request failed (500): Server Error'
      );
    });
  });
});
