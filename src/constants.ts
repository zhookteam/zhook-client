/**
 * Website and messaging constants for the hookR client
 * 
 * Centralizes all website URLs and user-facing messages to ensure consistency
 * across the CLI tool, client library, and documentation.
 */

export const WEBSITE_CONFIG = {
  /** Official hookR website URL */
  URL: 'https://hookr.cloud',
  
  /** Message for users who need to sign up for a client key */
  SIGNUP_MESSAGE: 'Sign up for free at https://hookr.cloud to obtain one',
  
  /** Message for users who need to manage their API keys */
  KEY_MANAGEMENT_MESSAGE: 'Visit https://hookr.cloud to manage your API keys',
  
  /** General help message with website reference */
  GENERAL_HELP_MESSAGE: 'For more information, visit https://hookr.cloud',
  
  /** Professional messaging emphasizing free developer service */
  FREE_FOR_DEVELOPERS_MESSAGE: 'hookR is free for developers - get your client key at https://hookr.cloud',
  
  /** Professional signup message for documentation */
  PROFESSIONAL_SIGNUP_MESSAGE: 'Get started for free at https://hookr.cloud to obtain your client key',
  
  /** Message for authentication verification */
  AUTH_VERIFICATION_MESSAGE: 'Visit https://hookr.cloud to verify your client key',
  
  /** Message for account management */
  ACCOUNT_MANAGEMENT_MESSAGE: 'Visit https://hookr.cloud for account management'
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
    const baseMessage = reason ? `Authentication failed: ${reason}` : 'Authentication failed';
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
  }
};