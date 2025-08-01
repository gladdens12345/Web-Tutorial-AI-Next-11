/**
 * Chrome Extension API types for website integration
 * These types help the website safely interact with Chrome extensions
 */

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: any,
          callback?: (response: any) => void
        ) => void;
        lastError?: {
          message: string;
        };
      };
    };
  }
}

export {};