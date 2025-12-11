/**
 * Type definitions for the hookR Client SDK
 */

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export interface HookRClientOptions {
  wsUrl?: string;
  apiUrl?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  logLevel?: LogLevel;
}

export interface WebhookEvent {
  type: 'event';
  eventId: string;
  hookId: string;
  receivedAt: string;
  payload: any;
}

export interface ConnectionEvent {
  type: 'connected';
  message: string;
  clientId: string;
}

export type EventHandler = (_event: WebhookEvent) => void;
export type ConnectionHandler = (_event: ConnectionEvent) => void;
export type ErrorHandler = (_error: Error) => void;

export interface HookConfig {
  name: string;
  url: string;
  events?: string[];
  headers?: Record<string, string>;
  retryPolicy?: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
}

export interface Hook extends HookConfig {
  id: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'paused' | 'disabled';
}
// EventLogger types
export interface EventLoggerOptions {
  baseDir?: string;
}

export interface LoggedEvent {
  timestamp: string;
  eventId: string;
  hookId: string;
  receivedAt: string;
  payload: any;
}
