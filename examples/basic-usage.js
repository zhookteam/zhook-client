/**
 * Basic Usage Example
 * 
 * This example shows the most common usage pattern for the zhook Client SDK.
 * It demonstrates connecting to the service, handling events, and basic error handling.
 */

import { ZhookClient } from '@zhook/client';

async function basicExample() {
  // Create a new client instance
  const client = new ZhookClient('your-client-key-here', {
    // Optional configuration
    logLevel: 'info',
    maxReconnectAttempts: 5,
    reconnectDelay: 2000
  });

  // Register event handlers
  client.onHookCalled((event) => {
    console.log('🎉 Webhook received!');
    console.log('Event ID:', event.eventId);
    console.log('Hook ID:', event.hookId);
    console.log('Payload:', JSON.stringify(event.payload, null, 2));

    // Process your webhook data here
    processWebhookData(event.payload);
  });

  client.onConnected((event) => {
    console.log('✅ Connected to zhook!');
    console.log('Client ID:', event.clientId);
  });

  client.onError((error) => {
    console.error('❌ Error occurred:', error.message);
  });

  try {
    // Connect to the zhook service
    await client.connect();
    console.log('🔌 Successfully connected to zhook service');

    // Keep the process running
    console.log('👂 Listening for webhooks... Press Ctrl+C to exit');

  } catch (error) {
    console.error('Failed to connect:', error.message);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    client.close();
    process.exit(0);
  });
}

function processWebhookData(payload) {
  // Example webhook processing logic
  if (payload.type === 'user.created') {
    console.log('New user created:', payload.user.email);
    // Send welcome email, update database, etc.
  } else if (payload.type === 'order.completed') {
    console.log('Order completed:', payload.order.id);
    // Send confirmation, update inventory, etc.
  } else {
    console.log('Unknown event type:', payload.type);
  }
}

// Run the example
basicExample().catch(console.error);