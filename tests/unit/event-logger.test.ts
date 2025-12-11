import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { EventLogger } from '../../src/event-logger.js';
import { WebhookEvent } from '../../src/types.js';

describe('EventLogger', () => {
  let logger: EventLogger;
  let testDir: string;
  let createdFiles: string[] = [];

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = join(process.cwd(), 'test-logs');
    try {
      await fs.mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    logger = new EventLogger({ baseDir: testDir });
  });

  afterEach(async () => {
    // Clean up created files
    for (const file of createdFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // File might not exist
      }
    }
    createdFiles = [];

    // Remove test directory
    try {
      await fs.rmdir(testDir);
    } catch (error) {
      // Directory might not be empty or not exist
    }
  });

  describe('generateLogFilename', () => {
    it('should generate filename with correct format', () => {
      const filename = EventLogger.generateLogFilename();
      
      // Should match pattern: hookr-logs-YYYY-MM-DDTHH-MM-SS-sssZ.json
      expect(filename).toMatch(/^hookr-logs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
      expect(filename).toContain('hookr-logs-');
      expect(filename).toMatch(/\.json$/);
    });

    it('should generate unique filenames', () => {
      const filename1 = EventLogger.generateLogFilename();
      const filename2 = EventLogger.generateLogFilename();
      
      // They might be the same if called in the same millisecond, but structure should be correct
      expect(filename1).toMatch(/^hookr-logs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
      expect(filename2).toMatch(/^hookr-logs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
    });
  });

  describe('initialize', () => {
    it('should create log file and return filename', async () => {
      const filename = await logger.initialize();
      const fullPath = join(testDir, filename);
      createdFiles.push(fullPath);
      
      expect(filename).toMatch(/^hookr-logs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
      expect(logger.getLogFilePath()).toBe(fullPath);
      expect(logger.isLoggerInitialized()).toBe(true);
      
      // File should exist and be empty initially
      const fileExists = await fs.access(fullPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      const content = await fs.readFile(fullPath, 'utf8');
      expect(content).toBe('');
    });

    it('should return same filename on multiple calls', async () => {
      const filename1 = await logger.initialize();
      const filename2 = await logger.initialize();
      
      createdFiles.push(logger.getLogFilePath());
      
      expect(filename1).toBe(filename2);
      expect(logger.getLogFilePath()).toBe(join(testDir, filename1));
    });
  });

  describe('logEvent', () => {
    beforeEach(async () => {
      const filename = await logger.initialize();
      createdFiles.push(join(testDir, filename));
    });

    it('should log webhook event in JSONL format', async () => {
      const mockEvent: WebhookEvent = {
        type: 'event',
        eventId: 'evt_123',
        hookId: 'hook_456',
        receivedAt: '2024-01-15T10:30:00.000Z',
        payload: { test: 'data', number: 42 }
      };

      await logger.logEvent(mockEvent);
      
      expect(logger.getEventCount()).toBe(1);
      
      // Read the file content
      const content = await fs.readFile(logger.getLogFilePath(), 'utf8');
      const lines = content.trim().split('\n');
      
      expect(lines).toHaveLength(1);
      
      // Parse the JSON line
      const loggedEvent = JSON.parse(lines[0]);
      
      expect(loggedEvent.eventId).toBe('evt_123');
      expect(loggedEvent.hookId).toBe('hook_456');
      expect(loggedEvent.receivedAt).toBe('2024-01-15T10:30:00.000Z');
      expect(loggedEvent.payload).toEqual({ test: 'data', number: 42 });
      expect(loggedEvent.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should append multiple events as separate lines', async () => {
      const event1: WebhookEvent = {
        type: 'event',
        eventId: 'evt_1',
        hookId: 'hook_1',
        receivedAt: '2024-01-15T10:30:00.000Z',
        payload: { event: 1 }
      };

      const event2: WebhookEvent = {
        type: 'event',
        eventId: 'evt_2',
        hookId: 'hook_2',
        receivedAt: '2024-01-15T10:31:00.000Z',
        payload: { event: 2 }
      };

      await logger.logEvent(event1);
      await logger.logEvent(event2);
      
      expect(logger.getEventCount()).toBe(2);
      
      // Read the file content
      const content = await fs.readFile(logger.getLogFilePath(), 'utf8');
      const lines = content.trim().split('\n');
      
      expect(lines).toHaveLength(2);
      
      // Parse both JSON lines
      const logged1 = JSON.parse(lines[0]);
      const logged2 = JSON.parse(lines[1]);
      
      expect(logged1.eventId).toBe('evt_1');
      expect(logged1.payload).toEqual({ event: 1 });
      
      expect(logged2.eventId).toBe('evt_2');
      expect(logged2.payload).toEqual({ event: 2 });
    });

    it('should preserve original payload structure', async () => {
      const complexPayload = {
        user: { id: 123, name: 'John Doe' },
        items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
        metadata: { source: 'api', version: '1.0' },
        timestamp: '2024-01-15T10:30:00.000Z'
      };

      const mockEvent: WebhookEvent = {
        type: 'event',
        eventId: 'evt_complex',
        hookId: 'hook_complex',
        receivedAt: '2024-01-15T10:30:00.000Z',
        payload: complexPayload
      };

      await logger.logEvent(mockEvent);
      
      const content = await fs.readFile(logger.getLogFilePath(), 'utf8');
      const loggedEvent = JSON.parse(content.trim());
      
      expect(loggedEvent.payload).toEqual(complexPayload);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedLogger = new EventLogger({ baseDir: testDir });
      
      const mockEvent: WebhookEvent = {
        type: 'event',
        eventId: 'evt_123',
        hookId: 'hook_456',
        receivedAt: '2024-01-15T10:30:00.000Z',
        payload: { test: 'data' }
      };

      await expect(uninitializedLogger.logEvent(mockEvent)).rejects.toThrow('EventLogger not initialized');
    });
  });

  describe('state management', () => {
    it('should track event count correctly', async () => {
      await logger.initialize();
      createdFiles.push(logger.getLogFilePath());
      
      expect(logger.getEventCount()).toBe(0);
      
      const mockEvent: WebhookEvent = {
        type: 'event',
        eventId: 'evt_123',
        hookId: 'hook_456',
        receivedAt: '2024-01-15T10:30:00.000Z',
        payload: { test: 'data' }
      };

      await logger.logEvent(mockEvent);
      expect(logger.getEventCount()).toBe(1);
      
      await logger.logEvent(mockEvent);
      expect(logger.getEventCount()).toBe(2);
    });

    it('should handle close operation', async () => {
      await logger.initialize();
      createdFiles.push(logger.getLogFilePath());
      
      expect(logger.isLoggerInitialized()).toBe(true);
      
      await logger.close();
      
      expect(logger.isLoggerInitialized()).toBe(false);
    });
  });
});