/**
 * Website and messaging constants for the zhook client
 *
 * Centralizes all website URLs and user-facing messages to ensure consistency
 * across the CLI tool, client library, and documentation.
 */

export const WEBSITE_CONFIG = {
  /** Official zhook website URL */
  URL: 'https://zhook.dev',

  /** Message for users who need to sign up for a client key */
  SIGNUP_MESSAGE: 'Sign up for free at https://zhook.dev to obtain one',

  /** Message for users who need to manage their API keys */
  KEY_MANAGEMENT_MESSAGE: 'Visit https://zhook.dev to manage your API keys',

  /** General help message with website reference */
  GENERAL_HELP_MESSAGE: 'For more information, visit https://zhook.dev',

  /** Professional messaging emphasizing free developer service */
  FREE_FOR_DEVELOPERS_MESSAGE:
    'zhook is free for developers - get your client key at https://zhook.dev',

  /** Professional signup message for documentation */
  PROFESSIONAL_SIGNUP_MESSAGE:
    'Get started for free at https://zhook.dev to obtain your client key',

  /** Message for authentication verification */
  AUTH_VERIFICATION_MESSAGE:
    'Visit https://zhook.dev to verify your client key',

  /** Message for account management */
  ACCOUNT_MANAGEMENT_MESSAGE: 'Visit https://zhook.dev for account management',
} as const;

/**
 * Helper functions for generating consistent error messages with website references
 */
export const WebsiteMessages = {
  /**
   * Creates an error message for missing client keys
   */
  missingClientKey(): string {
    return `No client key provided. ${WEBSITE_CONFIG.SIGNUP_MESSAGE}`;
  },

  /**
   * Creates an error message for invalid client keys
   */
  invalidClientKey(): string {
    return `Invalid client key. ${WEBSITE_CONFIG.KEY_MANAGEMENT_MESSAGE}`;
  },

  /**
   * Creates an error message for authentication failures
   */
  authenticationFailed(reason?: string): string {
    const baseMessage = reason
      ? `Authentication failed: ${reason}`
      : 'Authentication failed';
    return `${baseMessage}. ${WEBSITE_CONFIG.AUTH_VERIFICATION_MESSAGE}`;
  },

  /**
   * Creates an error message for API permission errors
   */
  permissionDenied(): string {
    return `Permission denied. ${WEBSITE_CONFIG.ACCOUNT_MANAGEMENT_MESSAGE}`;
  },

  /**
   * Creates a help message with website reference
   */
  getHelp(): string {
    return WEBSITE_CONFIG.GENERAL_HELP_MESSAGE;
  },
};
