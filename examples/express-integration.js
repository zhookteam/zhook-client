/**
 * Express.js Integration Example
 * 
 * This example shows how to integrate the hookR Client SDK with an Express.js application.
 * It demonstrates webhook processing alongside HTTP endpoints.
 */

import express from 'express';
import { HookRClient } from '@hookr/client';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// In-memory store for demo purposes (use a real database in production)
const webhookEvents = [];
const users = new Map();

// Initialize hookR client
const hookrClient = new HookRClient(process.env.HOOKR_CLIENT_KEY || 'your-client-key', {
  logLevel: 'info',
  maxReconnectAttempts: 10,
  reconnectDelay: 1000
});

// Webhook event handlers
hookrClient.onHookCalled((event) => {
  console.log(`📨 Webhook received: ${event.eventId}`);
  
  // Store the event
  webhookEvents.push({
    id: event.eventId,
    hookId: event.hookId,
    receivedAt: event.receivedAt,
    payload: event.payload,
    processedAt: new Date().toISOString()
  });

  // Process based on event type
  handleWebhookEvent(event.payload);
});

hookrClient.onConnected((event) => {
  console.log(`✅ Connected to hookR with client ID: ${event.clientId}`);
});

hookrClient.onError((error) => {
  console.error('❌ hookR error:', error.message);
});

function handleWebhookEvent(payload) {
  switch (payload.type) {
    case 'user.created':
      handleUserCreated(payload.data);
      break;
    case 'user.updated':
      handleUserUpdated(payload.data);
      break;
    case 'payment.completed':
      handlePaymentCompleted(payload.data);
      break;
    default:
      console.log(`Unknown event type: ${payload.type}`);
  }
}

function handleUserCreated(userData) {
  console.log(`👤 New user created: ${userData.email}`);
  users.set(userData.id, {
    ...userData,
    createdViaWebhook: true,
    createdAt: new Date().toISOString()
  });
}

function handleUserUpdated(userData) {
  console.log(`👤 User updated: ${userData.email}`);
  if (users.has(userData.id)) {
    users.set(userData.id, {
      ...users.get(userData.id),
      ...userData,
      updatedAt: new Date().toISOString()
    });
  }
}

function handlePaymentCompleted(paymentData) {
  console.log(`💳 Payment completed: ${paymentData.amount} ${paymentData.currency}`);
  // Process payment completion logic here
}

// REST API endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'hookR Express Integration Example',
    status: 'running',
    hookrConnected: hookrClient.isConnected(),
    stats: {
      webhooksReceived: webhookEvents.length,
      usersTracked: users.size
    }
  });
});

app.get('/webhooks', (req, res) => {
  res.json({
    events: webhookEvents.slice(-50), // Last 50 events
    total: webhookEvents.length
  });
});

app.get('/users', (req, res) => {
  res.json({
    users: Array.from(users.values()),
    total: users.size
  });
});

app.get('/users/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    hookr: {
      connected: hookrClient.isConnected(),
      state: hookrClient.getConnectionState(),
      clientId: hookrClient.getClientId()
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start the server and connect to hookR
async function startServer() {
  try {
    // Connect to hookR first
    await hookrClient.connect();
    console.log('🔌 Connected to hookR service');

    // Start Express server
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📊 Dashboard: http://localhost:${port}`);
      console.log(`🔍 Health check: http://localhost:${port}/health`);
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  hookrClient.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down...');
  hookrClient.close();
  process.exit(0);
});

// Start the application
startServer().catch(console.error);