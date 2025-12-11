/**
 * Main HookRClient class
 *
 * Provides a robust interface for connecting to the hookR webhook service
 * with automatic reconnection, event handling, and hook management capabilities.
 */

import WebSocket from 'ws';
import { WEBSITE_CONFIG, WebsiteMessages } from './constants';
import type {
  HookRClientOptions,
  EventHandler,
  ConnectionHandler,
  ErrorHandler,
  HookConfig,
  Hook,
  LogLevel,
  WebhookEvent,
  ConnectionEvent,
} from './types';

// Use global fetch or import for Node.js environments
declare const fetch: any;

/**
 * Connection states for internal state management
 */
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  CLOSED: 'closed',
} as const;

type ConnectionStateType =
  (typeof ConnectionState)[keyof typeof ConnectionState];

/**
 * Internal handler storage with type information
 */
interface HandlerEntry {
  type: 'event' | 'connection' | 'error';
  handler: EventHandler | ConnectionHandler | ErrorHandler;
}

export class HookRClient {
  private readonly clientKey: string;
  private readonly options: Required<HookRClientOptions>;

  // Internal state management
  private connectionState: ConnectionStateType = ConnectionState.DISCONNECTED;
  private handlers: HandlerEntry[] = [];
  private clientId: string | null = null;
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isClosed: boolean = false;
  private ws: WebSocket | null = null;

  /**
   * Creates a new HookRClient instance
   *
   * @param clientKey - Authentication key for the hookR service
   * @param options - Optional configuration parameters
   * @throws {Error} If clientKey is invalid or options are malformed
   */
  constructor(clientKey: string, options: HookRClientOptions = {}) {
    // Validate required parameters
    this.validateClientKey(clientKey);
    this.validateOptions(options);

    this.clientKey = clientKey;
    this.options = this.mergeWithDefaults(options);

    this.log('debug', '🔧 HookRClient initialized', {
      wsUrl: this.options.wsUrl,
      apiUrl: this.options.apiUrl,
      maxReconnectAttempts: this.options.maxReconnectAttempts,
      reconnectDelay: this.options.reconnectDelay,
      logLevel: this.options.logLevel,
    });
  }

  /**
   * Validates the client key parameter
   */
  private validateClientKey(clientKey: string): void {
    if (!clientKey || typeof clientKey !== 'string') {
      throw new Error(`Client key is required and must be a non-empty string. ${WEBSITE_CONFIG.SIGNUP_MESSAGE}`);
    }

    if (clientKey.trim().length === 0) {
      throw new Error(`Client key cannot be empty or whitespace only. ${WEBSITE_CONFIG.SIGNUP_MESSAGE}`);
    }

    // Basic format validation - should be a reasonable length
    if (clientKey.length < 10) {
      throw new Error(
        `Client key appears to be too short (minimum 10 characters). ${WEBSITE_CONFIG.KEY_MANAGEMENT_MESSAGE}`
      );
    }
  }

  /**
   * Validates the options parameter
   */
  private validateOptions(options: HookRClientOptions): void {
    if (options.wsUrl !== undefined) {
      this.validateUrl(options.wsUrl, 'WebSocket URL');
    }

    if (options.apiUrl !== undefined) {
      this.validateUrl(options.apiUrl, 'API URL');
    }

    if (options.maxReconnectAttempts !== undefined) {
      if (
        !Number.isInteger(options.maxReconnectAttempts) ||
        options.maxReconnectAttempts < 0
      ) {
        throw new Error('maxReconnectAttempts must be a non-negative integer');
      }
    }

    if (options.reconnectDelay !== undefined) {
      if (
        !Number.isInteger(options.reconnectDelay) ||
        options.reconnectDelay < 100
      ) {
        throw new Error('reconnectDelay must be an integer >= 100ms');
      }
    }

    if (options.logLevel !== undefined) {
      const validLevels: LogLevel[] = [
        'silent',
        'error',
        'warn',
        'info',
        'debug',
      ];
      if (!validLevels.includes(options.logLevel)) {
        throw new Error(`logLevel must be one of: ${validLevels.join(', ')}`);
      }
    }
  }

  /**
   * Validates URL format
   */
  private validateUrl(url: string, name: string): void {
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new Error(`${name} must be a non-empty string`);
    }

    try {
      const parsed = new URL(url);
      if (
        name.includes('WebSocket') &&
        !['ws:', 'wss:'].includes(parsed.protocol)
      ) {
        throw new Error(`${name} must use ws:// or wss:// protocol`);
      }
      if (
        name.includes('API') &&
        !['http:', 'https:'].includes(parsed.protocol)
      ) {
        throw new Error(`${name} must use http:// or https:// protocol`);
      }
    } catch (error) {
      throw new Error(
        `${name} is not a valid URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Merges user options with defaults
   */
  private mergeWithDefaults(
    options: HookRClientOptions
  ): Required<HookRClientOptions> {
    return {
      wsUrl: options.wsUrl || 'wss://web.hookr.cloud/events',
      apiUrl: options.apiUrl || 'https://web.hookr.cloud/api/v1',
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      reconnectDelay: options.reconnectDelay ?? 1000,
      logLevel: options.logLevel || 'info',
    };
  }

  /**
   * Internal logging method with level filtering
   */
  private log(level: LogLevel, message: string, data?: any): void {
    const levels: Record<LogLevel, number> = {
      silent: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
    };

    if (levels[level] <= levels[this.options.logLevel]) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}] hookR-client:`;

      if (data) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
  }

  /**
   * Gets the current connection state
   */
  public getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Gets the assigned client ID (available after connection)
   */
  public getClientId(): string | null {
    return this.clientId;
  }

  /**
   * Gets the current configuration
   */
  public getConfig(): Readonly<Required<HookRClientOptions>> {
    return { ...this.options };
  }

  // Connection management methods

  /**
   * Establishes a WebSocket connection to the hookR service
   *
   * @returns Promise that resolves when connection is established
   * @throws {Error} If connection fails or client is already closed
   */
  async connect(): Promise<void> {
    if (this.isClosed) {
      throw new Error('Cannot connect: client has been closed');
    }

    if (this.connectionState === ConnectionState.CONNECTED) {
      this.log('warn', '⚠️ Already connected to hookR service');
      return;
    }

    this.log('info', '🔌 Connecting to hookR service...');
    this.connectionState = ConnectionState.CONNECTING;

    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL with client key authentication
        const wsUrl = new URL(this.options.wsUrl);
        wsUrl.searchParams.set('clientKey', this.clientKey);

        this.log('debug', '🔗 Creating WebSocket connection', {
          url: wsUrl.toString().replace(this.clientKey, '[REDACTED]'),
        });

        // Create WebSocket connection
        this.ws = new WebSocket(wsUrl.toString());

        // Set up event handlers
        this.ws.on('open', () => {
          this.log('info', '✅ WebSocket connection established');
          this.connectionState = ConnectionState.CONNECTED;
          this.resetReconnectionState();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          const reasonStr = reason.toString();
          this.log(
            'warn',
            `❌ WebSocket connection closed: ${code} - ${reasonStr}`
          );
          this.handleDisconnect(code, reasonStr);
        });

        this.ws.on('error', (error: Error) => {
          this.log('error', '❌ WebSocket error occurred', {
            error: error.message,
          });

          // If we're still connecting, reject the promise
          if (this.connectionState === ConnectionState.CONNECTING) {
            this.connectionState = ConnectionState.DISCONNECTED;
            reject(new Error(`WebSocket connection failed: ${error.message}`));
          } else {
            // Otherwise, emit error to handlers
            this.emitError(error);
          }
        });

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.connectionState === ConnectionState.CONNECTING) {
            this.log('error', '⏰ Connection timeout');
            this.ws?.close();
            this.connectionState = ConnectionState.DISCONNECTED;
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 second timeout

        // Clear timeout on successful connection
        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
        });
      } catch (error) {
        this.connectionState = ConnectionState.DISCONNECTED;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.log('error', '❌ Failed to create WebSocket connection', {
          error: errorMessage,
        });
        reject(
          new Error(`Failed to create WebSocket connection: ${errorMessage}`)
        );
      }
    });
  }

  /**
   * Closes the connection and cleans up resources
   *
   * Safe to call multiple times - subsequent calls are ignored
   */
  close(): void {
    if (this.isClosed) {
      this.log('debug', '🔄 Close called on already closed client');
      return;
    }

    this.log('info', '👋 Closing hookR client...');
    this.isClosed = true;
    this.connectionState = ConnectionState.CLOSED;

    // Stop any reconnection attempts
    this.resetReconnectionState();

    // Close WebSocket connection
    if (this.ws) {
      this.ws.removeAllListeners();
      // Always try to close, WebSocket will handle if already closed
      try {
        this.ws.close(1000, 'Client closed');
      } catch (error) {
        // Ignore errors when closing already closed WebSocket
        this.log('debug', '🔄 WebSocket already closed during cleanup');
      }
      this.ws = null;
    }

    // Reset state
    this.clientId = null;
    this.reconnectAttempts = 0;

    this.log('info', '✅ Client closed successfully');
  }

  /**
   * Checks if the client is currently connected
   *
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED && !this.isClosed;
  }

  // Event handling methods

  /**
   * Registers a handler for incoming webhook events
   *
   * @param handler - Function to call when webhook events are received
   * @throws {Error} If handler is not a function
   */
  onHookCalled(handler: EventHandler): void {
    this.validateHandler(handler, 'EventHandler');

    this.handlers.push({
      type: 'event',
      handler: handler as EventHandler,
    });

    this.log('debug', '📝 Event handler registered', {
      totalHandlers: this.handlers.filter(h => h.type === 'event').length,
    });
  }

  /**
   * Registers a handler for connection events
   *
   * @param handler - Function to call when connection is established
   * @throws {Error} If handler is not a function
   */
  onConnected(handler: ConnectionHandler): void {
    this.validateHandler(handler, 'ConnectionHandler');

    this.handlers.push({
      type: 'connection',
      handler: handler as ConnectionHandler,
    });

    this.log('debug', '📝 Connection handler registered', {
      totalHandlers: this.handlers.filter(h => h.type === 'connection').length,
    });
  }

  /**
   * Registers a handler for error events
   *
   * @param handler - Function to call when errors occur
   * @throws {Error} If handler is not a function
   */
  onError(handler: ErrorHandler): void {
    this.validateHandler(handler, 'ErrorHandler');

    this.handlers.push({
      type: 'error',
      handler: handler as ErrorHandler,
    });

    this.log('debug', '📝 Error handler registered', {
      totalHandlers: this.handlers.filter(h => h.type === 'error').length,
    });
  }

  /**
   * Removes a previously registered handler
   *
   * @param handler - The handler function to remove
   */
  removeHandler(
    handler: EventHandler | ConnectionHandler | ErrorHandler
  ): void {
    const initialLength = this.handlers.length;
    this.handlers = this.handlers.filter(entry => entry.handler !== handler);

    const removed = initialLength - this.handlers.length;
    if (removed > 0) {
      this.log('debug', '🗑️ Handler removed', { removedCount: removed });
    } else {
      this.log('warn', '⚠️ Handler not found for removal');
    }
  }

  /**
   * Validates that a handler is a function
   */
  private validateHandler(handler: any, type: string): void {
    if (typeof handler !== 'function') {
      throw new Error(`${type} must be a function, got ${typeof handler}`);
    }
  }

  /**
   * Handles incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      this.log('debug', '📨 Received message', { type: message.type });

      if (message.type === 'connected') {
        this.handleConnectionConfirmation(message as ConnectionEvent);
      } else if (message.type === 'event') {
        this.handleWebhookEvent(message as WebhookEvent);
      } else {
        this.log('warn', '⚠️ Unknown message type received', {
          type: message.type,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.log('error', '❌ Failed to parse incoming message', {
        error: errorMessage,
        rawData: data.toString().substring(0, 200), // Log first 200 chars for debugging
      });

      // Don't throw - continue processing other messages
      this.emitError(new Error(`Message parsing failed: ${errorMessage}`));
    }
  }

  /**
   * Handles connection confirmation messages
   */
  private handleConnectionConfirmation(event: ConnectionEvent): void {
    this.log('info', '📡 Connection confirmed', {
      message: event.message,
      clientId: event.clientId,
    });

    this.clientId = event.clientId;

    // Emit to connection handlers
    const connectionHandlers = this.handlers.filter(
      h => h.type === 'connection'
    );
    connectionHandlers.forEach(entry => {
      try {
        (entry.handler as ConnectionHandler)(event);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.log('error', '❌ Error in connection handler', {
          error: errorMessage,
        });
        this.emitError(new Error(`Connection handler error: ${errorMessage}`));
      }
    });
  }

  /**
   * Handles incoming webhook events
   */
  private handleWebhookEvent(event: WebhookEvent): void {
    this.log('info', '🎉 Webhook event received', {
      eventId: event.eventId,
      hookId: event.hookId,
      receivedAt: event.receivedAt,
    });

    // Emit to event handlers
    const eventHandlers = this.handlers.filter(h => h.type === 'event');
    eventHandlers.forEach(entry => {
      try {
        (entry.handler as EventHandler)(event);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.log('error', '❌ Error in event handler', {
          error: errorMessage,
          eventId: event.eventId,
        });
        // Don't stop processing other handlers
      }
    });
  }

  /**
   * Handles WebSocket disconnection
   */
  private handleDisconnect(code: number, reason: string): void {
    if (this.isClosed) {
      this.log('debug', '🔄 Disconnect handled for closed client');
      return;
    }

    this.connectionState = ConnectionState.DISCONNECTED;
    this.clientId = null;

    // Check if this is an authentication error
    if (code === 1008 || code === 4001 || reason.toLowerCase().includes('auth') || reason.toLowerCase().includes('invalid')) {
      const authError = new Error(WebsiteMessages.authenticationFailed(reason));
      this.log('error', '🔐 Authentication error - will not reconnect', {
        code,
        reason,
      });
      this.emitError(authError);
      return;
    }

    // For other disconnections, attempt reconnection
    this.log('warn', '🔄 Connection lost, attempting reconnection...', {
      code,
      reason,
    });
    this.attemptReconnection();
  }

  /**
   * Attempts to reconnect with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.isClosed) {
      this.log('debug', '🔄 Reconnection cancelled - client is closed');
      return;
    }

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.log('error', '❌ Maximum reconnection attempts reached');
      this.connectionState = ConnectionState.DISCONNECTED;

      const maxAttemptsError = new Error(
        `Maximum reconnection attempts (${this.options.maxReconnectAttempts}) reached`
      );
      this.emitError(maxAttemptsError);
      return;
    }

    this.reconnectAttempts++;
    this.connectionState = ConnectionState.RECONNECTING;

    // Calculate exponential backoff delay
    const baseDelay = this.options.reconnectDelay;
    const exponentialDelay =
      baseDelay * Math.pow(2, this.reconnectAttempts - 1);

    // Add jitter to prevent thundering herd (±25% random variation)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    const finalDelay = Math.max(100, exponentialDelay + jitter); // Minimum 100ms

    this.log('info', `🔄 Reconnecting in ${Math.round(finalDelay)}ms`, {
      attempt: this.reconnectAttempts,
      maxAttempts: this.options.maxReconnectAttempts,
      delay: Math.round(finalDelay),
    });

    // Clear any existing reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Schedule reconnection attempt
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      if (this.isClosed) {
        this.log('debug', '🔄 Reconnection cancelled - client was closed');
        return;
      }

      this.log(
        'info',
        `🔌 Reconnection attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}`
      );

      this.connect().catch(error => {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.log('warn', '❌ Reconnection attempt failed', {
          attempt: this.reconnectAttempts,
          error: errorMessage,
        });

        // Schedule next attempt if we haven't reached max attempts
        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.attemptReconnection();
        } else {
          this.log('error', '❌ All reconnection attempts exhausted');
          this.connectionState = ConnectionState.DISCONNECTED;

          const exhaustedError = new Error(
            `All reconnection attempts failed. Last error: ${errorMessage}`
          );
          this.emitError(exhaustedError);
        }
      });
    }, finalDelay);
  }

  /**
   * Resets the reconnection attempt counter (called on successful connection)
   */
  private resetReconnectionState(): void {
    this.reconnectAttempts = 0;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.log('debug', '✅ Reconnection state reset');
  }

  /**
   * Emits error to registered error handlers
   */
  private emitError(error: Error): void {
    const errorHandlers = this.handlers.filter(h => h.type === 'error');

    if (errorHandlers.length === 0) {
      this.log('warn', '⚠️ No error handlers registered for error', {
        error: error.message,
      });
      return;
    }

    errorHandlers.forEach(entry => {
      try {
        (entry.handler as ErrorHandler)(error);
      } catch (handlerError) {
        const errorMessage =
          handlerError instanceof Error
            ? handlerError.message
            : 'Unknown error';
        this.log('error', '❌ Error in error handler', { error: errorMessage });
        // Can't emit error from error handler - would cause infinite loop
      }
    });
  }

  // Hook management methods

  /**
   * Creates a new webhook hook
   *
   * @param config - Hook configuration
   * @returns Promise resolving to the created hook
   * @throws {Error} If hook creation fails
   */
  async createHook(config: HookConfig): Promise<Hook> {
    this.validateHookConfig(config);

    const url = `${this.options.apiUrl}/hooks`;
    const response = await this.makeApiRequest('POST', url, config);

    this.log('info', '✅ Hook created successfully', {
      hookId: response.id,
      name: config.name,
    });

    return response;
  }

  /**
   * Retrieves all hooks for this client
   *
   * @returns Promise resolving to array of hooks
   * @throws {Error} If retrieval fails
   */
  async getHooks(): Promise<Hook[]> {
    const url = `${this.options.apiUrl}/hooks`;
    const response = await this.makeApiRequest('GET', url);

    this.log('debug', '📋 Retrieved hooks list', {
      count: response.length,
    });

    return response;
  }

  /**
   * Retrieves a specific hook by ID
   *
   * @param hookId - The hook ID to retrieve
   * @returns Promise resolving to the hook
   * @throws {Error} If hook not found or retrieval fails
   */
  async getHook(hookId: string): Promise<Hook> {
    this.validateHookId(hookId);

    const url = `${this.options.apiUrl}/hooks/${hookId}`;
    const response = await this.makeApiRequest('GET', url);

    this.log('debug', '📄 Retrieved hook details', {
      hookId: response.id,
      name: response.name,
    });

    return response;
  }

  /**
   * Updates an existing hook
   *
   * @param hookId - The hook ID to update
   * @param config - Partial hook configuration with updates
   * @returns Promise resolving to the updated hook
   * @throws {Error} If hook not found or update fails
   */
  async updateHook(hookId: string, config: Partial<HookConfig>): Promise<Hook> {
    this.validateHookId(hookId);
    this.validatePartialHookConfig(config);

    const url = `${this.options.apiUrl}/hooks/${hookId}`;
    const response = await this.makeApiRequest('PUT', url, config);

    this.log('info', '✅ Hook updated successfully', {
      hookId: response.id,
      name: response.name,
    });

    return response;
  }

  /**
   * Deletes a hook
   *
   * @param hookId - The hook ID to delete
   * @returns Promise that resolves when deletion is complete
   * @throws {Error} If hook not found or deletion fails
   */
  async deleteHook(hookId: string): Promise<void> {
    this.validateHookId(hookId);

    const url = `${this.options.apiUrl}/hooks/${hookId}`;
    await this.makeApiRequest('DELETE', url);

    this.log('info', '🗑️ Hook deleted successfully', { hookId });
  }

  /**
   * Makes an authenticated HTTP request to the API
   */
  private async makeApiRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    body?: any
  ): Promise<any> {
    this.log('debug', `🌐 Making ${method} request`, { url });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.clientKey}`,
      'Content-Type': 'application/json',
      'User-Agent': '@hookr/client/1.0.0',
    };

    const requestOptions: any = {
      method,
      headers,
    };

    if (body && method !== 'GET' && method !== 'DELETE') {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestOptions);

      // Handle non-2xx responses
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage =
            errorData.message || errorData.error || 'API request failed';
        } catch {
          errorMessage =
            errorText || `HTTP ${response.status} ${response.statusText}`;
        }

        let enhancedErrorMessage = `API request failed (${response.status}): ${errorMessage}`;
        
        // Add website references for authentication/authorization errors
        if (response.status === 401) {
          enhancedErrorMessage += `. ${WEBSITE_CONFIG.AUTH_VERIFICATION_MESSAGE}`;
        } else if (response.status === 403) {
          enhancedErrorMessage += `. ${WEBSITE_CONFIG.ACCOUNT_MANAGEMENT_MESSAGE}`;
        }

        const error = new Error(enhancedErrorMessage);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;

        this.log('error', '❌ API request failed', {
          method,
          url,
          status: response.status,
          error: errorMessage,
        });

        throw error;
      }

      // Handle successful responses
      if (method === 'DELETE') {
        // DELETE requests typically don't return content
        return;
      }

      const responseText = await response.text();
      if (!responseText) {
        return {};
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        this.log('error', '❌ Failed to parse API response', {
          method,
          url,
          responseText: responseText.substring(0, 200),
        });
        throw new Error(
          `Invalid JSON response from API: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        );
      }
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        // Re-throw API errors as-is
        throw error;
      }

      // Handle network errors
      const networkError = new Error(
        `Network error during API request: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.log('error', '❌ Network error during API request', {
        method,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw networkError;
    }
  }

  /**
   * Validates hook configuration
   */
  private validateHookConfig(config: HookConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Hook config must be an object');
    }

    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Hook name is required and must be a string');
    }

    if (config.name.trim().length === 0) {
      throw new Error('Hook name cannot be empty');
    }

    if (!config.url || typeof config.url !== 'string') {
      throw new Error('Hook URL is required and must be a string');
    }

    try {
      const parsedUrl = new URL(config.url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Hook URL must use http:// or https:// protocol');
      }
    } catch (error) {
      throw new Error(
        `Invalid hook URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    if (config.events !== undefined) {
      if (!Array.isArray(config.events)) {
        throw new Error('Hook events must be an array');
      }
      config.events.forEach((event, index) => {
        if (typeof event !== 'string') {
          throw new Error(`Hook event at index ${index} must be a string`);
        }
      });
    }

    if (config.headers !== undefined) {
      if (typeof config.headers !== 'object' || config.headers === null) {
        throw new Error('Hook headers must be an object');
      }
      Object.entries(config.headers).forEach(([key, value]) => {
        if (typeof key !== 'string' || typeof value !== 'string') {
          throw new Error('Hook headers must be string key-value pairs');
        }
      });
    }

    if (config.retryPolicy !== undefined) {
      if (
        typeof config.retryPolicy !== 'object' ||
        config.retryPolicy === null
      ) {
        throw new Error('Hook retry policy must be an object');
      }
      if (
        !Number.isInteger(config.retryPolicy.maxAttempts) ||
        config.retryPolicy.maxAttempts < 0
      ) {
        throw new Error(
          'Retry policy maxAttempts must be a non-negative integer'
        );
      }
      if (
        typeof config.retryPolicy.backoffMultiplier !== 'number' ||
        config.retryPolicy.backoffMultiplier <= 0
      ) {
        throw new Error(
          'Retry policy backoffMultiplier must be a positive number'
        );
      }
    }
  }

  /**
   * Validates partial hook configuration for updates
   */
  private validatePartialHookConfig(config: Partial<HookConfig>): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Hook config must be an object');
    }

    if (Object.keys(config).length === 0) {
      throw new Error('At least one field must be provided for update');
    }

    // Validate individual fields if present
    if (config.name !== undefined) {
      if (typeof config.name !== 'string' || config.name.trim().length === 0) {
        throw new Error('Hook name must be a non-empty string');
      }
    }

    if (config.url !== undefined) {
      if (typeof config.url !== 'string') {
        throw new Error('Hook URL must be a string');
      }
      try {
        const parsedUrl = new URL(config.url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Hook URL must use http:// or https:// protocol');
        }
      } catch (error) {
        throw new Error(
          `Invalid hook URL: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    if (config.events !== undefined) {
      if (!Array.isArray(config.events)) {
        throw new Error('Hook events must be an array');
      }
      config.events.forEach((event, index) => {
        if (typeof event !== 'string') {
          throw new Error(`Hook event at index ${index} must be a string`);
        }
      });
    }

    if (config.headers !== undefined) {
      if (typeof config.headers !== 'object' || config.headers === null) {
        throw new Error('Hook headers must be an object');
      }
      Object.entries(config.headers).forEach(([key, value]) => {
        if (typeof key !== 'string' || typeof value !== 'string') {
          throw new Error('Hook headers must be string key-value pairs');
        }
      });
    }

    if (config.retryPolicy !== undefined) {
      if (
        typeof config.retryPolicy !== 'object' ||
        config.retryPolicy === null
      ) {
        throw new Error('Hook retry policy must be an object');
      }
      if (
        !Number.isInteger(config.retryPolicy.maxAttempts) ||
        config.retryPolicy.maxAttempts < 0
      ) {
        throw new Error(
          'Retry policy maxAttempts must be a non-negative integer'
        );
      }
      if (
        typeof config.retryPolicy.backoffMultiplier !== 'number' ||
        config.retryPolicy.backoffMultiplier <= 0
      ) {
        throw new Error(
          'Retry policy backoffMultiplier must be a positive number'
        );
      }
    }
  }

  /**
   * Validates hook ID
   */
  private validateHookId(hookId: string): void {
    if (!hookId || typeof hookId !== 'string') {
      throw new Error('Hook ID is required and must be a string');
    }

    if (hookId.trim().length === 0) {
      throw new Error('Hook ID cannot be empty');
    }
  }
}
