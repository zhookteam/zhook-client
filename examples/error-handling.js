/**
 * Error Handling and Resilience Example
 * 
 * This example demonstrates comprehensive error handling, retry logic,
 * This example demonstrates comprehensive error handling, retry logic,
 * and resilience patterns when using the zhook Client SDK.
 */

import { ZhookClient } from '@zhook/client';

class ResilientWebhookClient {
  constructor(clientKey, options = {}) {
    this.clientKey = clientKey;
    this.client = null;
    this.isShuttingDown = false;
    this.eventQueue = [];
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.retryAttempts = new Map();
    this.maxRetries = options.maxRetries || 3;

    this.options = {
      logLevel: 'info',
      maxReconnectAttempts: 15,
      reconnectDelay: 1000,
      ...options
    };

    this.stats = {
      eventsProcessed: 0,
      eventsQueued: 0,
      errorsHandled: 0,
      reconnections: 0
    };
  }

  async initialize() {
    console.log('🚀 Initializing resilient webhook client...');

    this.client = new ZhookClient(this.clientKey, this.options);
    this.setupEventHandlers();

    try {
      await this.connectWithRetry();
      console.log('✅ Client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize client:', error.message);
      throw error;
    }
  }

  setupEventHandlers() {
    // Webhook event handler with error recovery
    this.client.onHookCalled((event) => {
      this.handleWebhookWithRetry(event);
    });

    // Connection handler
    this.client.onConnected((event) => {
      console.log(`✅ Connected to zhook (Client ID: ${event.clientId})`);
      this.stats.reconnections++;

      // Process any queued events
      this.processQueuedEvents();
    });

    // Comprehensive error handler
    this.client.onError((error) => {
      this.handleError(error);
    });
  }

  async connectWithRetry(maxAttempts = 5) {
    let attempt = 1;

    while (attempt <= maxAttempts) {
      try {
        console.log(`🔌 Connection attempt ${attempt}/${maxAttempts}...`);
        await this.client.connect();
        return; // Success
      } catch (error) {
        console.error(`❌ Connection attempt ${attempt} failed:`, error.message);

        if (attempt === maxAttempts) {
          throw new Error(`Failed to connect after ${maxAttempts} attempts`);
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
        attempt++;
      }
    }
  }

  handleWebhookWithRetry(event) {
    const eventId = event.eventId;

    try {
      console.log(`📨 Processing webhook: ${eventId}`);
      this.processWebhookEvent(event);
      this.stats.eventsProcessed++;

      // Remove from retry tracking if successful
      this.retryAttempts.delete(eventId);

    } catch (error) {
      console.error(`❌ Error processing webhook ${eventId}:`, error.message);
      this.handleWebhookError(event, error);
    }
  }

  processWebhookEvent(event) {
    const { payload } = event;

    // Simulate processing that might fail
    if (payload.simulateError) {
      throw new Error('Simulated processing error');
    }

    // Process different event types
    switch (payload.type) {
      case 'user.created':
        this.handleUserCreated(payload.data);
        break;
      case 'order.completed':
        this.handleOrderCompleted(payload.data);
        break;
      case 'payment.failed':
        this.handlePaymentFailed(payload.data);
        break;
      default:
        console.log(`📝 Processed unknown event type: ${payload.type}`);
    }
  }

  handleUserCreated(userData) {
    console.log(`👤 User created: ${userData.email}`);

    // Simulate potential failure points
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error('Database connection failed');
    }

    // Your user creation logic here
  }

  handleOrderCompleted(orderData) {
    console.log(`🛒 Order completed: ${orderData.orderId}`);

    // Simulate inventory update that might fail
    if (orderData.items.some(item => item.outOfStock)) {
      throw new Error('Inventory update failed - item out of stock');
    }

    // Your order completion logic here
  }

  handlePaymentFailed(paymentData) {
    console.log(`💳 Payment failed: ${paymentData.paymentId}`);

    // Critical: Always handle payment failures
    try {
      // Your payment failure logic here
      console.log(`📧 Sending payment failure notification`);
    } catch (error) {
      // Log but don't throw - payment failures must be handled
      console.error('Failed to handle payment failure:', error.message);
    }
  }

  handleWebhookError(event, error) {
    const eventId = event.eventId;
    const currentAttempts = this.retryAttempts.get(eventId) || 0;

    this.stats.errorsHandled++;

    if (currentAttempts < this.maxRetries) {
      // Retry the event
      this.retryAttempts.set(eventId, currentAttempts + 1);

      const delay = Math.min(1000 * Math.pow(2, currentAttempts), 10000);
      console.log(`🔄 Retrying event ${eventId} in ${delay}ms (attempt ${currentAttempts + 1}/${this.maxRetries})`);

      setTimeout(() => {
        if (!this.isShuttingDown) {
          this.handleWebhookWithRetry(event);
        }
      }, delay);

    } else {
      // Max retries reached - queue for later or send to dead letter queue
      console.error(`💀 Max retries reached for event ${eventId}, adding to queue`);
      this.queueEvent(event, error);
    }
  }

  queueEvent(event, error) {
    if (this.eventQueue.length >= this.maxQueueSize) {
      console.error('⚠️ Event queue full, dropping oldest event');
      this.eventQueue.shift();
    }

    this.eventQueue.push({
      event,
      error: error.message,
      queuedAt: new Date().toISOString(),
      attempts: this.retryAttempts.get(event.eventId) || 0
    });

    this.stats.eventsQueued++;
    console.log(`📥 Event queued: ${event.eventId} (queue size: ${this.eventQueue.length})`);
  }

  async processQueuedEvents() {
    if (this.eventQueue.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${this.eventQueue.length} queued events...`);

    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    for (const queuedItem of eventsToProcess) {
      try {
        // Reset retry count for queued events
        this.retryAttempts.delete(queuedItem.event.eventId);

        await this.sleep(100); // Small delay between events
        this.handleWebhookWithRetry(queuedItem.event);

      } catch (error) {
        console.error(`Failed to process queued event ${queuedItem.event.eventId}:`, error.message);
        // Re-queue if still failing
        this.queueEvent(queuedItem.event, error);
      }
    }
  }

  handleError(error) {
    console.error('🚨 Client error:', error.message);

    // Categorize errors
    if (error.message.includes('Authentication')) {
      console.error('🔐 Authentication error - check your client key');
      // Don't retry authentication errors
      this.shutdown();
    } else if (error.message.includes('Network')) {
      console.error('🌐 Network error - connection will be retried automatically');
    } else if (error.message.includes('Maximum reconnection attempts')) {
      console.error('🔄 Max reconnection attempts reached - manual intervention required');
      this.shutdown();
    } else {
      console.error('❓ Unknown error type');
    }

    this.stats.errorsHandled++;
  }

  // Health monitoring
  getHealthStatus() {
    return {
      connected: this.client?.isConnected() || false,
      connectionState: this.client?.getConnectionState() || 'unknown',
      queuedEvents: this.eventQueue.length,
      stats: { ...this.stats },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  // Graceful shutdown
  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    console.log('👋 Shutting down webhook client...');
    this.isShuttingDown = true;

    // Process remaining queued events with timeout
    if (this.eventQueue.length > 0) {
      console.log(`🔄 Processing ${this.eventQueue.length} remaining events...`);

      const timeout = setTimeout(() => {
        console.log('⏰ Shutdown timeout reached, forcing exit');
        process.exit(1);
      }, 30000); // 30 second timeout

      try {
        await this.processQueuedEvents();
        clearTimeout(timeout);
      } catch (error) {
        console.error('Error during shutdown processing:', error.message);
      }
    }

    if (this.client) {
      this.client.close();
    }

    console.log('✅ Shutdown complete');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage example
async function main() {
  const clientKey = process.env.ZHOOK_CLIENT_KEY || 'your-client-key-here';

  const client = new ResilientWebhookClient(clientKey, {
    logLevel: 'info',
    maxReconnectAttempts: 20,
    reconnectDelay: 2000,
    maxQueueSize: 500,
    maxRetries: 5
  });

  try {
    await client.initialize();

    // Health monitoring
    setInterval(() => {
      const health = client.getHealthStatus();
      console.log('📊 Health Status:', JSON.stringify(health, null, 2));
    }, 60000); // Every minute

    console.log('👂 Listening for webhooks with error resilience...');
    console.log('💡 Send a webhook with "simulateError": true to test error handling');

  } catch (error) {
    console.error('❌ Failed to start client:', error.message);
    process.exit(1);
  }

  // Graceful shutdown handlers
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await client.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await client.shutdown();
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught exception:', error);
    await client.shutdown();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
    await client.shutdown();
    process.exit(1);
  });
}

// Run the example
main().catch(console.error);