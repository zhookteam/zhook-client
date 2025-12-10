/**
 * hookR Client SDK
 *
 * A lightweight, robust npm package that provides developers with a simple
 * interface to connect to the hookR webhook service.
 */

export { HookRClient } from './client';
export type {
  HookRClientOptions,
  WebhookEvent,
  ConnectionEvent,
  EventHandler,
  ConnectionHandler,
  ErrorHandler,
  HookConfig,
  Hook,
  LogLevel,
} from './types';
