/**
 * TypeScript Usage Example
 * 
 * This example demonstrates how to use the hookR Client SDK with TypeScript,
 * including proper typing, interfaces, and error handling.
 */

import { 
  HookRClient, 
  WebhookEvent, 
  ConnectionEvent, 
  HookConfig, 
  Hook,
  HookRClientOptions 
} from '@hookr/client';

// Define custom interfaces for your application
interface UserCreatedPayload {
  type: 'user.created';
  data: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
}

interface OrderCompletedPayload {
  type: 'order.completed';
  data: {
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      price: number;
    }>;
  };
}

type CustomWebhookPayload = UserCreatedPayload | OrderCompletedPayload;

class WebhookProcessor {
  private client: HookRClient;
  private processedEvents: Map<string, Date> = new Map();

  constructor(clientKey: string, options?: HookRClientOptions) {
    this.client = new HookRClient(clientKey, {
      logLevel: 'info',
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
      ...options
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Type-safe event handler
    this.client.onHookCalled((event: WebhookEvent) => {
      this.handleWebhookEvent(event);
    });

    // Connection handler with proper typing
    this.client.onConnected((event: ConnectionEvent) => {
      console.log(`✅ Connected with client ID: ${event.clientId}`);
    });

    // Error handler
    this.client.onError((error: Error) => {
      console.error(`❌ Error: ${error.message}`);
      this.handleError(error);
    });
  }

  private handleWebhookEvent(event: WebhookEvent): void {
    // Prevent duplicate processing
    if (this.processedEvents.has(event.eventId)) {
      console.log(`⚠️ Duplicate event ignored: ${event.eventId}`);
      return;
    }

    this.processedEvents.set(event.eventId, new Date());
    
    console.log(`📨 Processing webhook: ${event.eventId}`);
    
    try {
      const payload = event.payload as CustomWebhookPayload;
      
      switch (payload.type) {
        case 'user.created':
          this.handleUserCreated(payload.data, event);
          break;
        case 'order.completed':
          this.handleOrderCompleted(payload.data, event);
          break;
        default:
          console.log(`Unknown event type: ${(payload as any).type}`);
      }
    } catch (error) {
      console.error(`Failed to process event ${event.eventId}:`, error);
    }
  }

  private handleUserCreated(userData: UserCreatedPayload['data'], event: WebhookEvent): void {
    console.log(`👤 New user created: ${userData.email}`);
    
    // Type-safe data access
    const user = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      createdAt: new Date(userData.createdAt),
      webhookEventId: event.eventId,
      processedAt: new Date()
    };

    // Your business logic here
    this.sendWelcomeEmail(user);
    this.updateUserDatabase(user);
  }

  private handleOrderCompleted(orderData: OrderCompletedPayload['data'], event: WebhookEvent): void {
    console.log(`🛒 Order completed: ${orderData.orderId} for $${orderData.amount}`);
    
    // Calculate total with type safety
    const calculatedTotal = orderData.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    console.log(`💰 Order total: $${calculatedTotal} ${orderData.currency}`);
    
    // Your business logic here
    this.fulfillOrder(orderData);
    this.sendOrderConfirmation(orderData);
  }

  private sendWelcomeEmail(user: { email: string; name: string }): void {
    console.log(`📧 Sending welcome email to ${user.email}`);
    // Email sending logic here
  }

  private updateUserDatabase(user: any): void {
    console.log(`💾 Updating user database for ${user.id}`);
    // Database update logic here
  }

  private fulfillOrder(order: OrderCompletedPayload['data']): void {
    console.log(`📦 Fulfilling order ${order.orderId}`);
    // Order fulfillment logic here
  }

  private sendOrderConfirmation(order: OrderCompletedPayload['data']): void {
    console.log(`📧 Sending order confirmation for ${order.orderId}`);
    // Confirmation email logic here
  }

  private handleError(error: Error): void {
    // Log error to monitoring service
    console.error('Webhook processing error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('🔌 Connected to hookR service');
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  public disconnect(): void {
    this.client.close();
    console.log('👋 Disconnected from hookR service');
  }

  public isConnected(): boolean {
    return this.client.isConnected();
  }

  public getStats(): { processedEvents: number; connectionState: string } {
    return {
      processedEvents: this.processedEvents.size,
      connectionState: this.client.getConnectionState()
    };
  }

  // Hook management with proper typing
  public async createUserHook(webhookUrl: string): Promise<Hook> {
    const config: HookConfig = {
      name: 'User Events Hook',
      url: webhookUrl,
      events: ['user.created', 'user.updated', 'user.deleted'],
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': '@hookr/client'
      }
    };

    return await this.client.createHook(config);
  }

  public async createOrderHook(webhookUrl: string): Promise<Hook> {
    const config: HookConfig = {
      name: 'Order Events Hook',
      url: webhookUrl,
      events: ['order.created', 'order.completed', 'order.cancelled'],
      retryPolicy: {
        maxAttempts: 3,
        backoffMultiplier: 2
      }
    };

    return await this.client.createHook(config);
  }

  public async listHooks(): Promise<Hook[]> {
    return await this.client.getHooks();
  }
}

// Usage example
async function main(): Promise<void> {
  const clientKey = process.env.HOOKR_CLIENT_KEY;
  
  if (!clientKey) {
    console.error('❌ HOOKR_CLIENT_KEY environment variable is required');
    process.exit(1);
  }

  const processor = new WebhookProcessor(clientKey, {
    logLevel: 'debug',
    maxReconnectAttempts: 10
  });

  try {
    // Connect to the service
    await processor.connect();

    // Create hooks if needed
    if (process.argv.includes('--setup-hooks')) {
      console.log('🔧 Setting up hooks...');
      
      const userHook = await processor.createUserHook('https://myapp.com/webhooks/users');
      console.log(`✅ User hook created: ${userHook.id}`);
      
      const orderHook = await processor.createOrderHook('https://myapp.com/webhooks/orders');
      console.log(`✅ Order hook created: ${orderHook.id}`);
    }

    // List existing hooks
    const hooks = await processor.listHooks();
    console.log(`📋 Found ${hooks.length} existing hooks`);

    // Keep the process running
    console.log('👂 Listening for webhooks... Press Ctrl+C to exit');
    
    // Log stats periodically
    setInterval(() => {
      const stats = processor.getStats();
      console.log(`📊 Stats: ${stats.processedEvents} events processed, state: ${stats.connectionState}`);
    }, 30000);

  } catch (error) {
    console.error('❌ Application error:', error);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    processor.disconnect();
    process.exit(0);
  });
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { WebhookProcessor };