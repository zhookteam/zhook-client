import { promises as fs } from 'fs';
import { join } from 'path';
import { WebhookEvent } from './types.js';

/**
 * Configuration options for EventLogger
 */
export interface EventLoggerOptions {
  /** Directory for log files (default: current directory) */
  baseDir?: string;
}

/**
 * Structure of a logged event in the JSONL file
 */
export interface LoggedEvent {
  /** Local processing timestamp (ISO 8601) */
  timestamp: string;
  /** Original event ID */
  eventId: string;
  /** Hook ID that received the event */
  hookId: string;
  /** Original event timestamp */
  receivedAt: string;
  /** Original webhook payload */
  payload: any;
}

/**
 * EventLogger handles automatic timestamped logging of webhook events to JSONL files
 */
export class EventLogger {
  private logFilePath: string = '';
  private eventCount: number = 0;
  private isInitialized: boolean = false;
  private baseDir: string;

  constructor(options: EventLoggerOptions = {}) {
    this.baseDir = options.baseDir || process.cwd();
  }

  /**
   * Generates a timestamped filename for log files
   * Format: zhook-logs-{datetime}.json
   * Example: zhook-logs-2024-01-15T10-30-00-123Z.json
   */
  static generateLogFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    return `zhook-logs-${timestamp}.json`;
  }

  /**
   * Initialize the logger and create the log file
   * @returns The generated filename
   */
  async initialize(): Promise<string> {
    if (this.isInitialized) {
      // Return just the filename, not the full path
      return this.logFilePath.split(/[/\\]/).pop() || '';
    }

    const filename = EventLogger.generateLogFilename();
    this.logFilePath = join(this.baseDir, filename);

    try {
      // Create the file (empty initially)
      await fs.writeFile(this.logFilePath, '', 'utf8');
      this.isInitialized = true;
      return filename;
    } catch (error) {
      throw new Error(
        `Failed to create log file ${this.logFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Log a webhook event to the JSONL file
   * @param event The webhook event to log
   */
  async logEvent(event: WebhookEvent): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('EventLogger not initialized. Call initialize() first.');
    }

    const loggedEvent: LoggedEvent = {
      timestamp: new Date().toISOString(),
      eventId: event.eventId,
      hookId: event.hookId,
      receivedAt: event.receivedAt,
      payload: event.payload,
    };

    try {
      // Convert to single-line JSON and append with newline
      const jsonLine = JSON.stringify(loggedEvent) + '\n';
      await fs.appendFile(this.logFilePath, jsonLine, 'utf8');
      this.eventCount++;
    } catch (error) {
      throw new Error(
        `Failed to log event to ${this.logFilePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Close the logger and perform cleanup
   */
  async close(): Promise<void> {
    // For JSONL format, no special cleanup is needed
    // The file is already in a valid state after each append
    this.isInitialized = false;
  }

  /**
   * Get the full path to the log file
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Get the number of events logged so far
   */
  getEventCount(): number {
    return this.eventCount;
  }

  /**
   * Check if the logger is initialized
   */
  isLoggerInitialized(): boolean {
    return this.isInitialized;
  }
}
