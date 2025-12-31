# @zhook/client

[![npm version](https://badge.fury.io/js/@zhook%2Fclient.svg)](https://badge.fury.io/js/@zhook%2Fclient)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)

Official JavaScript/TypeScript client for the zhook webhook service. The client handles WebSocket connections for real-time event delivery, REST API interactions for hook management, and includes comprehensive error handling with automatic reconnection capabilities.

**🎉 zhook is free for developers!** Get your client key at [https://zhook.dev](https://zhook.dev) and start receiving webhooks in seconds.

## Features

- 🔌 **Real-time WebSocket connections** with automatic reconnection
- 📡 **Event-driven architecture** for processing webhook payloads
- 🛠️ **Complete hook management** via REST API
- 🔄 **Exponential backoff reconnection** with configurable limits
- 🚨 **Comprehensive error handling** and logging
- 📦 **Dual module support** (CommonJS and ES modules)
- 🔷 **Full TypeScript support** with complete type definitions
- 🎯 **Node.js 16+** compatibility
- 📡 **HTTP to MQTT** - zhook can also trigger MQTT messages giving developers HTTP to MQTT capabilities, check out destinations on your zhook.dev dashboard

## Getting Started

zhook is **free for developers** - no credit card required! Simply:

1. **Start** Get your free client key at [https://zhook.dev](https://zhook.dev)
2. **Install** the client library
3. **Receive** receiving webhooks instantly

## Installation

```bash
npm install @zhook/client
```

## Quick Start

```javascript
import { ZhookClient } from '@zhook/client';

// Create a new client instance with your free client key from https://zhook.dev
const client = new ZhookClient('your-client-key');

// Register an event handler
client.onHookCalled((event) => {
  console.log('Received webhook:', event.payload);
});

// Connect to the service
await client.connect();
```

## CLI Tool - Quick Testing

The package also includes a CLI tool for quickly testing webhook connections from the terminal:

### Installation

```bash
# Install globally for CLI access
npm install -g @zhook/client
```

### Usage

Get your free client key at [https://zhook.dev](https://zhook.dev), then:

```bash
# Listen for webhooks in real-time
zhook listen your-client-key

# Use JSON output format
zhook listen your-client-key --format json

# Save webhooks to automatically named log file
zhook listen your-client-key --save

# Combine file logging with pretty console output
zhook listen your-client-key --save --format pretty

# Connect to custom zhook instance
zhook listen your-client-key --url wss://your-instance.com/events
```

### Example Output

```
🎣 Connecting to zhook service...
   Client Key: abc123...
   Service URL: wss://web.zhook.dev/events

📁 Logging events to: zhook-logs-2025-12-11T14-32-15-123Z.json

✅ Connected to zhook service
Waiting for webhook events...
Press Ctrl+C to stop

🪝 [14:32:15] Hook Called
   Event ID: evt_abc123
   Hook ID: hook_xyz789
   Received At: 2025-12-10T14:32:15Z
   Payload: {
     "event": "user.created",
     "data": {
       "id": "user_123",
       "email": "user@example.com"
     }
   }

👋 Shutting down...
📊 Total events logged: 5
```

### File Logging

The CLI can automatically save all incoming webhook events to timestamped log files:

```bash
# Enable automatic file logging
zhook listen your-client-key --save
```

When using `--save`, the CLI will:
- 📁 **Auto-generate filenames** like `zhook-logs-2025-12-11T14-32-15-123Z.json`
- 📝 **Save in JSONL format** (one JSON event per line)
- 🔄 **Work with any output format** (`--format pretty` or `--format json`)
- 📊 **Show total events logged** when you exit with Ctrl+C

**Example log file content:**
```json
{"timestamp":"2025-12-11T14:32:15.123Z","eventId":"evt_abc123","hookId":"hook_xyz789","receivedAt":"2025-12-11T14:32:15.000Z","payload":{"event":"user.created","data":{"id":"user_123"}}}
{"timestamp":"2025-12-11T14:32:20.456Z","eventId":"evt_def456","hookId":"hook_xyz789","receivedAt":"2025-12-11T14:32:20.000Z","payload":{"event":"order.completed","data":{"orderId":"order_789"}}}
```

The JSONL format makes it easy to process with tools like `jq`:
```bash
# Count total events
cat zhook-logs-*.json | wc -l

# Filter events by type
cat zhook-logs-*.json | jq 'select(.payload.event == "user.created")'

# Extract all payloads
cat zhook-logs-*.json | jq '.payload'
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--format <format>` | Output format (`json` or `pretty`) | `pretty` |
| `--save` | Save events to automatically named log file | `false` |
| `--url <url>` | zhook service WebSocket URL | `wss://web.zhook.dev/events` |

The CLI tool is perfect for:
- 🧪 **Testing webhook connections** during development
- 🔍 **Debugging webhook payloads** in real-time  
- 🚀 **Quick validation** of your zhook setup
- 📊 **Monitoring webhook traffic** from the terminal
- 💾 **Logging webhook events** for offline analysis

## Usage

### Basic Connection

First, get your free client key at [https://zhook.dev](https://zhook.dev):

```javascript
import { ZhookClient } from '@zhook/client';

// Use your free client key from https://zhook.dev
const client = new ZhookClient('your-client-key', {
  // Optional configuration
  wsUrl: 'wss://your-zhook-instance.com/events',
  apiUrl: 'https://your-zhook-instance.com/api/v1',
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  logLevel: 'info'
});

try {
  await client.connect();
  console.log('Connected to zhook!');
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
    console.error('Invalid client key - visit https://zhook.dev to manage your API keys');
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
| `wsUrl` | `string` | `wss://web.zhook.dev/events` | WebSocket server URL |
| `apiUrl` | `string` | `https://web.zhook.dev/api/v1` | REST API base URL |
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
import { ZhookClient } from '@zhook/client';

// CommonJS
const { ZhookClient } = require('@zhook/client');
```

## Examples

### Express.js Integration

```javascript
import express from 'express';
import { ZhookClient } from '@zhook/client';

const app = express();
// Get your free client key from https://zhook.dev
const client = new ZhookClient(process.env.ZHOOK_CLIENT_KEY);

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
import { ZhookClient } from '@zhook/client';

export default async function handler(req, res) {
  // Get your free client key from https://zhook.dev
  const client = new ZhookClient(process.env.ZHOOK_CLIENT_KEY);
  
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
git clone https://github.com/zhookteam/zhook-client.git
cd client
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
- A valid zhook client key (get yours free at [https://zhook.dev](https://zhook.dev))

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/zhookteam/zhook-client#readme)
- 🐛 [Issue Tracker](https://github.com/zhookteam/zhook-client/issues)
- 💬 [Discussions](https://github.com/zhookteam/zhook-client/discussions)

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

---

Made with ❤️ by the zhook Team
