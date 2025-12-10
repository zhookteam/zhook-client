# @hookr/client

[![npm version](https://badge.fury.io/js/@hookr%2Fclient.svg)](https://badge.fury.io/js/@hookr%2Fclient)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

Official JavaScript/TypeScript client for the hookR webhook service. The client handles WebSocket connections for real-time event delivery, REST API interactions for hook management, and includes comprehensive error handling with automatic reconnection capabilities.

## Features

- 🔌 **Real-time WebSocket connections** with automatic reconnection
- 📡 **Event-driven architecture** for processing webhook payloads
- 🛠️ **Complete hook management** via REST API
- 🔄 **Exponential backoff reconnection** with configurable limits
- 🚨 **Comprehensive error handling** and logging
- 📦 **Dual module support** (CommonJS and ES modules)
- 🔷 **Full TypeScript support** with complete type definitions
- 🎯 **Node.js 16+** compatibility

## Installation

```bash
npm install @hookr/client
```

## Quick Start

```javascript
import { HookRClient } from '@hookr/client';

// Create a new client instance
const client = new HookRClient('your-client-key');

// Register an event handler
client.onHookCalled((event) => {
  console.log('Received webhook:', event.payload);
});

// Connect to the service
await client.connect();
```

## Usage

### Basic Connection

```javascript
import { HookRClient } from '@hookr/client';

const client = new HookRClient('your-client-key', {
  // Optional configuration
  wsUrl: 'wss://your-hookr-instance.com/events',
  apiUrl: 'https://your-hookr-instance.com/api/v1',
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  logLevel: 'info'
});

try {
  await client.connect();
  console.log('Connected to hookR!');
} catch (error) {
  console.error('Connection failed:', error);
}
```

### Event Handling

```javascript
// Handle incoming webhook events
client.onHookCalled((event) => {
  console.log('Event ID:', event.eventId);
  console.log('Hook ID:', event.hookId);
  console.log('Payload:', event.payload);
  console.log('Received at:', event.receivedAt);
});

// Handle connection events
client.onConnected((event) => {
  console.log('Connected with client ID:', event.clientId);
});

// Handle errors
client.onError((error) => {
  console.error('SDK Error:', error.message);
});
```

### Hook Management

```javascript
// Create a new hook
const hook = await client.createHook({
  name: 'My Webhook',
  url: 'https://myapp.com/webhook',
  events: ['user.created', 'order.completed'],
  headers: {
    'Authorization': 'Bearer my-token'
  }
});

// Get all hooks
const hooks = await client.getHooks();

// Get a specific hook
const hook = await client.getHook('hook-id');

// Update a hook
const updatedHook = await client.updateHook('hook-id', {
  name: 'Updated Webhook Name'
});

// Delete a hook
await client.deleteHook('hook-id');
```

### Error Handling

```javascript
try {
  await client.connect();
} catch (error) {
  if (error.message.includes('authentication')) {
    console.error('Invalid client key');
  } else {
    console.error('Connection error:', error.message);
  }
}

// The client automatically handles reconnection
// You can listen for reconnection events
client.onError((error) => {
  console.log('Reconnection attempt failed:', error.message);
});
```

### Resource Cleanup

```javascript
// Always close the connection when done
process.on('SIGINT', () => {
  client.close();
  process.exit(0);
});

// Or manually close
client.close();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `wsUrl` | `string` | `wss://hookr-production.up.railway.app/events` | WebSocket server URL |
| `apiUrl` | `string` | `https://hookr-production.up.railway.app/api/v1` | REST API base URL |
| `maxReconnectAttempts` | `number` | `10` | Maximum reconnection attempts |
| `reconnectDelay` | `number` | `1000` | Initial reconnection delay (ms) |
| `logLevel` | `'silent' \| 'error' \| 'warn' \| 'info' \| 'debug'` | `'info'` | Logging verbosity |

## TypeScript Support

The SDK is written in TypeScript and provides complete type definitions:

```typescript
import { HookRClient, HookConfig, WebhookEvent } from '@hookr/client';

const client: HookRClient = new HookRClient('key');

const hookConfig: HookConfig = {
  name: 'My Hook',
  url: 'https://example.com/webhook',
  events: ['user.created']
};

client.onHookCalled((event: WebhookEvent) => {
  // event is fully typed
  console.log(event.eventId, event.payload);
});
```

## CommonJS Support

The SDK supports both ES modules and CommonJS:

```javascript
// ES modules
import { HookRClient } from '@hookr/client';

// CommonJS
const { HookRClient } = require('@hookr/client');
```

## Examples

### Express.js Integration

```javascript
import express from 'express';
import { HookRClient } from '@hookr/client';

const app = express();
const client = new HookRClient(process.env.HOOKR_CLIENT_KEY);

client.onHookCalled((event) => {
  // Process webhook event
  console.log('Processing webhook:', event.eventId);
  
  // Your business logic here
  if (event.payload.type === 'user.created') {
    // Handle user creation
  }
});

await client.connect();
app.listen(3000);
```

### Next.js API Route

```javascript
// pages/api/webhooks/setup.js
import { HookRClient } from '@hookr/client';

export default async function handler(req, res) {
  const client = new HookRClient(process.env.HOOKR_CLIENT_KEY);
  
  try {
    const hook = await client.createHook({
      name: 'Next.js App Hook',
      url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/receive`,
      events: ['*'] // Listen to all events
    });
    
    res.json({ success: true, hookId: hook.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

## Error Codes

The SDK provides descriptive error messages for common scenarios:

- **Authentication Error**: Invalid client key
- **Connection Error**: Network connectivity issues
- **API Error**: HTTP request failures with status codes
- **Validation Error**: Invalid configuration or parameters

## Development

### Building from Source

```bash
git clone https://github.com/hookr/@hookr/client.git
cd @hookr/client
npm install
npm run build
```

### Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

### Linting and Formatting

```bash
npm run lint            # Check code style
npm run lint:fix        # Fix linting issues
npm run format          # Format code with Prettier
```

## Requirements

- Node.js 16.0.0 or higher
- A valid hookR client key

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/hookr/@hookr/client#readme)
- 🐛 [Issue Tracker](https://github.com/hookr/@hookr/client/issues)
- 💬 [Discussions](https://github.com/hookr/@hookr/client/discussions)

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

---

Made with ❤️ by the hookR Team
