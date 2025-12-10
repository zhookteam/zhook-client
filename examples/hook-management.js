/**
 * Hook Management Example
 * 
 * This example demonstrates how to use the hookR Client SDK to manage
 * webhook hooks through the REST API.
 */

const { HookRClient } = require('@hookr/client');

async function hookManagementExample() {
  // Initialize the client
  const client = new HookRClient('your-client-key-here', {
    apiUrl: 'https://hookr-production.up.railway.app/api/v1',
    logLevel: 'info'
  });

  try {
    console.log('🚀 Starting hook management example...\n');

    // 1. Create a new hook
    console.log('📝 Creating a new hook...');
    const newHook = await client.createHook({
      name: 'User Events Hook',
      url: 'https://your-app.com/webhooks/users',
      events: ['user.created', 'user.updated', 'user.deleted'],
      headers: {
        'X-Webhook-Source': 'hookr',
        'Authorization': 'Bearer your-webhook-secret'
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffMultiplier: 2
      }
    });
    console.log('✅ Hook created:', {
      id: newHook.id,
      name: newHook.name,
      status: newHook.status
    });

    // 2. Retrieve all hooks
    console.log('\n📋 Retrieving all hooks...');
    const allHooks = await client.getHooks();
    console.log(`✅ Found ${allHooks.length} hooks:`);
    allHooks.forEach(hook => {
      console.log(`  - ${hook.name} (${hook.id}) - ${hook.status}`);
    });

    // 3. Get specific hook details
    console.log(`\n📄 Getting details for hook ${newHook.id}...`);
    const hookDetails = await client.getHook(newHook.id);
    console.log('✅ Hook details:', {
      name: hookDetails.name,
      url: hookDetails.url,
      events: hookDetails.events,
      createdAt: hookDetails.createdAt
    });

    // 4. Update the hook
    console.log(`\n✏️ Updating hook ${newHook.id}...`);
    const updatedHook = await client.updateHook(newHook.id, {
      name: 'Updated User Events Hook',
      events: ['user.created', 'user.updated'] // Removed user.deleted
    });
    console.log('✅ Hook updated:', {
      name: updatedHook.name,
      events: updatedHook.events,
      updatedAt: updatedHook.updatedAt
    });

    // 5. Delete the hook (optional - uncomment to test)
    // console.log(`\n🗑️ Deleting hook ${newHook.id}...`);
    // await client.deleteHook(newHook.id);
    // console.log('✅ Hook deleted successfully');

    console.log('\n🎉 Hook management example completed successfully!');

  } catch (error) {
    console.error('❌ Error during hook management:', error.message);
    
    // Handle specific API errors
    if (error.status) {
      console.error(`   HTTP Status: ${error.status}`);
    }
  }
}

// Run the example
if (require.main === module) {
  hookManagementExample().catch(console.error);
}

module.exports = { hookManagementExample };