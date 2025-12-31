/**
 * Module export validation tests
 * Validates Requirements 1.2, 1.3
 */

import { describe, it, expect } from 'vitest';

describe('Module Exports', () => {
  it('should export ZhookClient class via ES modules', async () => {
    const { ZhookClient } = await import('../../src/index');
    expect(ZhookClient).toBeDefined();
    expect(typeof ZhookClient).toBe('function');
    expect(ZhookClient.name).toBe('ZhookClient');
  });

  it('should export all required types', async () => {
    const exports = await import('../../src/index');
    expect(exports.ZhookClient).toBeDefined();
    // Types are compile-time only, so we just verify the main class export
  });

  it('should allow instantiation of ZhookClient', async () => {
    const { ZhookClient } = await import('../../src/index');
    const client = new ZhookClient('valid-test-key-123');
    expect(client).toBeInstanceOf(ZhookClient);
  });

  it('should have all expected methods on ZhookClient', async () => {
    const { ZhookClient } = await import('../../src/index');
    const client = new ZhookClient('valid-test-key-123');

    // Connection management methods
    expect(typeof client.connect).toBe('function');
    expect(typeof client.close).toBe('function');
    expect(typeof client.isConnected).toBe('function');

    // Event handling methods
    expect(typeof client.onHookCalled).toBe('function');
    expect(typeof client.onConnected).toBe('function');
    expect(typeof client.onError).toBe('function');
    expect(typeof client.removeHandler).toBe('function');

    // Hook management methods
    expect(typeof client.createHook).toBe('function');
    expect(typeof client.getHooks).toBe('function');
    expect(typeof client.getHook).toBe('function');
    expect(typeof client.updateHook).toBe('function');
    expect(typeof client.deleteHook).toBe('function');
  });
});