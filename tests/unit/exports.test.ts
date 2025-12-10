/**
 * Module export validation tests
 * Validates Requirements 1.2, 1.3
 */

import { describe, it, expect } from 'vitest';

describe('Module Exports', () => {
  it('should export HookRClient class via ES modules', async () => {
    const { HookRClient } = await import('../../src/index');
    expect(HookRClient).toBeDefined();
    expect(typeof HookRClient).toBe('function');
    expect(HookRClient.name).toBe('HookRClient');
  });

  it('should export all required types', async () => {
    const exports = await import('../../src/index');
    expect(exports.HookRClient).toBeDefined();
    // Types are compile-time only, so we just verify the main class export
  });

  it('should allow instantiation of HookRClient', async () => {
    const { HookRClient } = await import('../../src/index');
    const client = new HookRClient('valid-test-key-123');
    expect(client).toBeInstanceOf(HookRClient);
  });

  it('should have all expected methods on HookRClient', async () => {
    const { HookRClient } = await import('../../src/index');
    const client = new HookRClient('valid-test-key-123');
    
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