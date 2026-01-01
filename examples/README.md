# @zhook/client Examples

This directory contains practical examples demonstrating how to use the @zhook/client package in various scenarios. Each example is self-contained and includes detailed comments explaining the implementation.

## Examples Overview

### 1. Basic Usage (`basic-usage.js`)
**Perfect for beginners** - Shows the fundamental usage pattern of the @zhook/client.

**Features:**
- Simple client setup and connection
- Event handler registration
- Basic webhook processing
- Graceful shutdown handling

**Run:**
```bash
node examples/basic-usage.js
```

### 2. Express.js Integration (`express-integration.js`)
**Web application integration** - Demonstrates how to integrate the SDK with an Express.js web server.

**Features:**
- Express.js server with webhook processing
- REST API endpoints for monitoring
- Health check endpoints
- In-memory event storage
- User and webhook management

**Run:**
```bash
npm install express
node examples/express-integration.js
```

**Endpoints:**
- `GET /` - Dashboard with stats
- `GET /webhooks` - Recent webhook events
- `GET /users` - Tracked users
- `GET /health` - Health check

### 3. Hook Management (`hook-management.js`)
**API management** - Shows how to programmatically manage webhooks using the REST API.

**Features:**
- Creating, updating, and deleting hooks
- Listing and retrieving hook details
- Bulk operations
- Error handling for API calls
- Hook configuration examples

**Run:**
```bash
# Basic hook management
node examples/hook-management.js basic

# Bulk operations
node examples/hook-management.js bulk
```

### 4. TypeScript Example (`typescript-example.ts`)
**Type-safe development** - Comprehensive TypeScript implementation with proper typing.

**Features:**
- Full TypeScript integration
- Custom payload interfaces
- Type-safe event handling
- Class-based architecture
- Advanced error handling

**Run:**
```bash
npm install -g typescript ts-node
ts-node examples/typescript-example.ts

# Or compile and run
tsc examples/typescript-example.ts
node examples/typescript-example.js
```

### 5. Error Handling & Resilience (`error-handling.js`)
**Production-ready patterns** - Advanced error handling, retry logic, and resilience patterns.

**Features:**
- Comprehensive error handling
- Automatic retry with exponential backoff
- Event queuing for failed processing
- Health monitoring
- Graceful shutdown
- Connection resilience

**Run:**
```bash
node examples/error-handling.js
```

### 6. Complete Workflow (`complete-workflow.js`)
**End-to-end example** - Demonstrates a complete workflow combining WebSocket events with REST API hook management.

**Features:**
- Hook creation and management via REST API
- Real-time event processing via WebSocket
- Dynamic hook configuration updates
- Comprehensive error handling
- Graceful shutdown and cleanup

**Run:**
```bash
node examples/complete-workflow.js
```

## Prerequisites

### Environment Variables
Set your zhook client key as an environment variable:

```bash
export ZHOOK_CLIENT_KEY="your-actual-client-key-here"
```

Or create a `.env` file:
```
ZHOOK_CLIENT_KEY=your-actual-client-key-here
```

### Dependencies
Most examples use only the @zhook/client, but some require additional packages:

```bash
# For Express.js integration
npm install express

# For TypeScript example
npm install -g typescript ts-node
npm install @types/node

# For environment variables (optional)
npm install dotenv
```

## Common Patterns

### Basic Connection Pattern
```javascript
import { ZhookClient } from '@zhook/client';

const client = new ZhookClient('your-client-key', {
  logLevel: 'info',
  maxReconnectAttempts: 10,
  reconnectDelay: 2000
});

client.onHookCalled((event) => {
  console.log('Webhook received:', event.eventId);
  // Process your webhook here
});

await client.connect();
```

### Error Handling Pattern
```javascript
client.onError((error) => {
  console.error('Error:', error.message);
  
  if (error.message.includes('Authentication')) {
    // Handle auth errors
  } else if (error.message.includes('Network')) {
    // Handle network errors
  }
});
```

### Graceful Shutdown Pattern
```javascript
process.on('SIGINT', () => {
  console.log('Shutting down...');
  client.close();
  process.exit(0);
});
```

### Hook Management Pattern
```javascript
// Create a hook
const hook = await client.createHook({
  name: 'My Webhook',
  url: 'https://myapp.com/webhook',
  events: ['user.created', 'order.completed']
});

// List all hooks
const hooks = await client.getHooks();

// Update a hook
await client.updateHook(hook.id, {
  events: ['user.created', 'user.updated', 'user.deleted']
});
```

## Testing Your Integration

### 1. Start with Basic Usage
Begin with the `basic-usage.js` example to ensure your client key works and you can connect to the service.

### 2. Test Webhook Processing
Use the webhook testing tools in your zhook dashboard to send test events and verify your handlers are working correctly.

### 3. Test Error Scenarios
The `error-handling.js` example includes simulation of various error conditions. Use it to test your error handling logic.

### 4. Load Testing
For production deployments, test with higher webhook volumes to ensure your processing can handle the expected load.

## Production Considerations

### Security
- Never commit client keys to version control
- Use environment variables or secure secret management
- Validate webhook payloads in production
- Implement proper authentication for your webhook endpoints

### Monitoring
- Implement health checks (see Express.js example)
- Monitor connection state and reconnection events
- Track webhook processing metrics
- Set up alerting for connection failures

### Error Handling
- Implement retry logic for transient failures
- Use dead letter queues for permanently failed events
- Log errors with sufficient context for debugging
- Handle authentication errors gracefully

### Performance
- Process webhooks asynchronously when possible
- Implement backpressure handling for high-volume scenarios
- Consider using worker processes for CPU-intensive processing
- Monitor memory usage and implement proper cleanup

## Getting Help

If you encounter issues with these examples:

1. Check that your client key is valid and properly set
2. Verify network connectivity to the zhook service
3. Review the console output for error messages
4. Check the zhook dashboard for connection status
5. Refer to the main SDK documentation

For additional support, please refer to the main README or contact support through the zhook dashboard.
