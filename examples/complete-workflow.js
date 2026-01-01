/**
 * Complete Workflow Example
 * 
 * This example demonstrates a complete workflow using the zhook Client SDK:
 * 1. Create hooks via REST API
 * 2. Connect via WebSocket to receive events
 * 3. Handle incoming webhook events
 * 4. Manage hooks dynamically
 */

const { ZhookClient } = require('@zhook/client');

async function completeWorkflowExample() {
  // Initialize the client
  const client = new ZhookClient('your-client-key-here', {
    wsUrl: 'wss://web.zhook.dev/events',
    apiUrl: 'https://zhook.dev/api/v1',
    logLevel: 'info',
    maxReconnectAttempts: 5,
    reconnectDelay: 2000
  });

  // Track created hooks for cleanup
  const createdHooks = [];

  try {
    console.log('🚀 Starting complete workflow example...\n');

    // Step 1: Set up event handlers
    console.log('📡 Setting up event handlers...');

    client.onConnected((event) => {
      console.log('✅ Connected to zhook service!');
      console.log(`   Client ID: ${event.clientId}`);
      console.log(`   Message: ${event.message}`);
    });

    client.onHookCalled((event) => {
      console.log('🎉 Webhook event received!');
      console.log(`   Event ID: ${event.eventId}`);
      console.log(`   Hook ID: ${event.hookId}`);
      console.log(`   Received at: ${event.receivedAt}`);
      console.log(`   Payload:`, JSON.stringify(event.payload, null, 2));
    });

    client.onError((error) => {
      console.error('❌ Client error:', error.message);
    });

    // Step 2: Connect to WebSocket
    console.log('🔌 Connecting to WebSocket...');
    await client.connect();

    // Step 3: Create hooks via REST API
    console.log('\n📝 Creating webhook hooks...');

    const userHook = await client.createHook({
      name: 'User Management Hook',
      url: 'https://your-app.com/webhooks/users',
      events: ['user.created', 'user.updated'],
      headers: {
        'X-Webhook-Source': 'zhook',
        'Content-Type': 'application/json'
      }
    });
    createdHooks.push(userHook);
    console.log(`✅ Created user hook: ${userHook.id}`);

    const orderHook = await client.createHook({
      name: 'Order Processing Hook',
      url: 'https://your-app.com/webhooks/orders',
      events: ['order.created', 'order.completed', 'order.cancelled'],
      retryPolicy: {
        maxAttempts: 5,
        backoffMultiplier: 1.5
      }
    });
    createdHooks.push(orderHook);
    console.log(`✅ Created order hook: ${orderHook.id}`);

    // Step 4: List all hooks
    console.log('\n📋 Current hooks:');
    const allHooks = await client.getHooks();
    allHooks.forEach(hook => {
      console.log(`   - ${hook.name} (${hook.id})`);
      console.log(`     URL: ${hook.url}`);
      console.log(`     Events: ${hook.events?.join(', ') || 'all'}`);
      console.log(`     Status: ${hook.status}`);
    });

    // Step 5: Wait for webhook events
    console.log('\n⏳ Waiting for webhook events...');
    console.log('   (Send test webhooks to your hooks to see them here)');
    console.log('   Press Ctrl+C to stop\n');

    // Keep the process running to receive events
    await new Promise((resolve) => {
      // Set up graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n\n🛑 Shutting down gracefully...');
        resolve();
      });

      // Simulate some activity after 10 seconds
      setTimeout(async () => {
        try {
          console.log('\n🔄 Updating user hook configuration...');
          const updatedHook = await client.updateHook(userHook.id, {
            events: ['user.created', 'user.updated', 'user.deleted']
          });
          console.log(`✅ Updated hook events: ${updatedHook.events.join(', ')}`);
        } catch (error) {
          console.error('❌ Error updating hook:', error.message);
        }
      }, 10000);
    });

  } catch (error) {
    console.error('❌ Error in workflow:', error.message);
    if (error.status) {
      console.error(`   HTTP Status: ${error.status}`);
    }
  } finally {
    // Cleanup: Close connection and optionally delete test hooks
    console.log('\n🧹 Cleaning up...');

    client.close();
    console.log('✅ WebSocket connection closed');

    // Uncomment to delete created hooks during cleanup
    /*
    for (const hook of createdHooks) {
      try {
        await client.deleteHook(hook.id);
        console.log(`✅ Deleted hook: ${hook.id}`);
      } catch (error) {
        console.error(`❌ Error deleting hook ${hook.id}:`, error.message);
      }
    }
    */

    console.log('🎉 Workflow completed!');
  }
}

// Run the example
if (require.main === module) {
  completeWorkflowExample().catch(console.error);
}

module.exports = { completeWorkflowExample };