#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { HookRClient } from './client.js';
import { EventLogger } from './event-logger.js';
import { WEBSITE_CONFIG, WebsiteMessages } from './constants.js';

const program = new Command();

program
  .name('hookr')
  .description(
    `Quick webhook listener via WebSocket - ${WEBSITE_CONFIG.FREE_FOR_DEVELOPERS_MESSAGE}`
  )
  .version('1.3.0');

program
  .command('listen')
  .description(
    `Listen for incoming webhooks via hookR WebSocket. Get your free client key at ${WEBSITE_CONFIG.URL}`
  )
  .option('-f, --format <format>', 'Output format (json|pretty)', 'pretty')
  .option('--save', 'Save requests to automatically named log file')
  .option('--url <url>', 'hookR service URL', 'wss://web.hookr.cloud/events')
  .argument(
    '<client-key>',
    `Your hookR client API key (get one free at ${WEBSITE_CONFIG.URL})`
  )
  .action(async (clientKey, options) => {
    // Validate client key is provided
    if (
      !clientKey ||
      typeof clientKey !== 'string' ||
      clientKey.trim().length === 0
    ) {
      console.log(chalk.red('❌ Error: ' + WebsiteMessages.missingClientKey()));
      process.exit(1);
    }

    await listenToHookrService(clientKey, options);
  });

// Add custom help text with website information
program.addHelpText(
  'after',
  `
Examples:
  $ hookr listen your-client-key
  $ hookr listen your-client-key --format json --save

${WEBSITE_CONFIG.FREE_FOR_DEVELOPERS_MESSAGE}
${WEBSITE_CONFIG.GENERAL_HELP_MESSAGE}
`
);

// Override version command to include website information
program.version(
  '1.3.0',
  '-v, --version',
  `output the current version

${WEBSITE_CONFIG.GENERAL_HELP_MESSAGE}`
);

async function listenToHookrService(clientKey: string, options: any) {
  console.log(chalk.blue('🎣 Connecting to hookR service...'));
  console.log(chalk.gray(`   Client Key: ${clientKey.substring(0, 8)}...`));
  console.log(chalk.gray(`   Service URL: ${options.url}`));
  console.log('');

  // Initialize EventLogger if --save flag is provided
  let eventLogger: EventLogger | null = null;
  if (options.save) {
    try {
      eventLogger = new EventLogger();
      const filename = await eventLogger.initialize();
      console.log(chalk.green(`📁 Logging events to: ${filename}`));
      console.log('');
    } catch (error) {
      console.log(
        chalk.red('❌ Failed to initialize event logger:'),
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.log(chalk.yellow('⚠️  Continuing without file logging...'));
      console.log('');
    }
  }

  try {
    const client = new HookRClient(clientKey, {
      apiUrl: options.url
        .replace('wss://', 'https://')
        .replace('ws://', 'http://')
        .replace('/events', '/api/v1'),
      wsUrl: options.url,
    });

    // Connect to WebSocket
    await client.connect();
    console.log(chalk.green('✅ Connected to hookR service'));
    console.log(chalk.gray('Waiting for webhook events...'));
    console.log(chalk.gray('Press Ctrl+C to stop'));
    console.log('');

    // Listen for hook events
    client.onHookCalled(async event => {
      const timestamp = new Date().toLocaleTimeString();

      if (options.format === 'json') {
        console.log(
          JSON.stringify(
            {
              timestamp,
              event,
            },
            null,
            2
          )
        );
      } else {
        console.log(chalk.green(`🪝 [${timestamp}] Hook Called`));
        console.log(chalk.gray('   Event ID:'), event.eventId);
        console.log(chalk.gray('   Hook ID:'), event.hookId);
        console.log(chalk.gray('   Received At:'), event.receivedAt);
        console.log(chalk.gray('   Payload:'), formatPayload(event.payload));
        console.log('');
      }

      // Log event to file if EventLogger is initialized
      if (eventLogger) {
        try {
          await eventLogger.logEvent(event);
        } catch (error) {
          console.log(
            chalk.red('❌ Failed to log event to file:'),
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }
    });

    // Handle connection events
    client.onConnected(() => {
      console.log(chalk.blue('🔗 WebSocket connected'));
    });

    client.onError(error => {
      // The error message already includes website references from the client library
      console.log(chalk.red('❌ Error:'), error.message);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n👋 Shutting down...'));
      client.close();

      if (eventLogger) {
        eventLogger
          .close()
          .then(() => {
            console.log(
              chalk.gray(
                `📊 Total events logged: ${eventLogger.getEventCount()}`
              )
            );
            process.exit(0);
          })
          .catch(error => {
            console.log(
              chalk.red('❌ Error closing event logger:'),
              error instanceof Error ? error.message : 'Unknown error'
            );
            process.exit(0);
          });
      } else {
        process.exit(0);
      }
    });

    // Keep process alive
    process.stdin.resume();
  } catch (error: any) {
    // Check if this is an authentication error
    if (
      error.message.toLowerCase().includes('auth') ||
      error.message.toLowerCase().includes('invalid') ||
      error.message.toLowerCase().includes('unauthorized')
    ) {
      console.log(
        chalk.red('❌ ' + WebsiteMessages.authenticationFailed(error.message))
      );
    } else {
      console.log(chalk.red('❌ Failed to connect:'), error.message);
      console.log(chalk.gray(WEBSITE_CONFIG.GENERAL_HELP_MESSAGE));
    }
    process.exit(1);
  }
}

function formatPayload(payload: any) {
  if (!payload) return 'N/A';

  try {
    if (typeof payload === 'string') {
      const parsed = JSON.parse(payload);
      return JSON.stringify(parsed, null, 2);
    }
    return JSON.stringify(payload, null, 2);
  } catch {
    return payload.toString();
  }
}

program.parse();
