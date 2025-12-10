/**
 * Error logging and diagnostic utilities for mobile debugging
 */

export interface ErrorLog {
  timestamp: string;
  type: string;
  message: string;
  context?: any;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 50;

  log(type: string, message: string, context?: any) {
    const log: ErrorLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      context
    };

    this.logs.push(log);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Always console log for debugging
    console.log(`[${type}] ${message}`, context || '');

    // Store in localStorage for debugging on mobile
    try {
      localStorage.setItem('app_error_logs', JSON.stringify(this.logs.slice(-20)));
    } catch (e) {
      // Ignore storage errors
    }
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    try {
      localStorage.removeItem('app_error_logs');
    } catch (e) {
      // Ignore
    }
  }

  // Get diagnostic info for troubleshooting
  getDiagnostics() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      localStorage: this.testStorage('localStorage'),
      sessionStorage: this.testStorage('sessionStorage'),
      timestamp: new Date().toISOString()
    };
  }

  private testStorage(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Check if device is online and can reach backend
  async checkConnectivity(supabaseUrl: string): Promise<boolean> {
    if (!navigator.onLine) {
      this.log('connectivity', 'Device is offline');
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(supabaseUrl + '/rest/v1/', {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const isConnected = response.ok || response.status === 401; // 401 is fine, means server is reachable
      this.log('connectivity', `Backend reachable: ${isConnected}`);
      return isConnected;
    } catch (e) {
      this.log('connectivity', 'Cannot reach backend', e);
      return false;
    }
  }
}

export const errorLogger = new ErrorLogger();

// Add global error handler for uncaught errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorLogger.log('uncaught_error', event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.log('unhandled_rejection', String(event.reason));
  });
}

