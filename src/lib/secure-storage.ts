/**
 * Secure Storage System
 * Provides encrypted localStorage for production with fallback to regular storage in development
 * Prevents data flashing and secures sensitive information
 */

interface StorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
}

interface StorageItem {
  data: any;
  timestamp: number;
  ttl?: number;
  encrypted?: boolean;
}

class SecureStorage {
  private isProduction = process.env.NODE_ENV === 'production';
  private encryptionKey: string | null = null;

  constructor() {
    this.initializeEncryption();
  }

  /**
   * Initialize encryption for production
   */
  private initializeEncryption(): void {
    if (!this.isProduction || typeof window === 'undefined') return;

    // Generate or retrieve encryption key
    let key = sessionStorage.getItem('__sk');
    if (!key) {
      key = this.generateEncryptionKey();
      sessionStorage.setItem('__sk', key);
    }
    this.encryptionKey = key;
  }

  /**
   * Generate a simple encryption key
   */
  private generateEncryptionKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Simple XOR encryption for client-side data protection
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey || !this.isProduction) return data;

    let result = '';
    for (let i = 0; i < data.length; i++) {
      const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
      const dataChar = data.charCodeAt(i);
      result += String.fromCharCode(dataChar ^ keyChar);
    }
    return btoa(result);
  }

  /**
   * Simple XOR decryption
   */
  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey || !this.isProduction) return encryptedData;

    try {
      const data = atob(encryptedData);
      let result = '';
      for (let i = 0; i < data.length; i++) {
        const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
        const dataChar = data.charCodeAt(i);
        result += String.fromCharCode(dataChar ^ keyChar);
      }
      return result;
    } catch {
      return encryptedData;
    }
  }

  /**
   * Set item in secure storage
   */
  setItem(key: string, value: any, options: StorageOptions = {}): void {
    if (typeof window === 'undefined') return;

    try {
      const item: StorageItem = {
        data: value,
        timestamp: Date.now(),
        ttl: options.ttl,
        encrypted: this.isProduction && options.encrypt !== false,
      };

      let serialized = JSON.stringify(item);

      if (item.encrypted) {
        serialized = this.encrypt(serialized);
      }

      // Use a prefixed key to identify secure storage items
      const storageKey = this.isProduction ? `__s_${key}` : key;
      localStorage.setItem(storageKey, serialized);
    } catch (error) {
      console.warn('Failed to set secure storage item:', error);
    }
  }

  /**
   * Get item from secure storage
   */
  getItem(key: string): any {
    if (typeof window === 'undefined') return null;

    try {
      const storageKey = this.isProduction ? `__s_${key}` : key;
      const stored = localStorage.getItem(storageKey);

      if (!stored) return null;

      let item: StorageItem;

      // Try to decrypt if it looks encrypted
      if (this.isProduction && stored.startsWith('__s_')) {
        const decrypted = this.decrypt(stored);
        item = JSON.parse(decrypted);
      } else {
        item = JSON.parse(stored);
      }

      // Check TTL
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to get secure storage item:', error);
      return null;
    }
  }

  /**
   * Remove item from secure storage
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.isProduction ? `__s_${key}` : key;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to remove secure storage item:', error);
    }
  }

  /**
   * Clear all secure storage items
   */
  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('__s_') || !this.isProduction)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear secure storage:', error);
    }
  }

  /**
   * Check if running in production mode
   */
  isProductionMode(): boolean {
    return this.isProduction;
  }

  /**
   * Migrate existing localStorage items to secure storage
   */
  migrateExistingData(keys: string[]): void {
    if (typeof window === 'undefined' || !this.isProduction) return;

    keys.forEach(key => {
      const existingData = localStorage.getItem(key);
      if (existingData) {
        try {
          const parsed = JSON.parse(existingData);
          this.setItem(key, parsed, { encrypt: true });
          localStorage.removeItem(key); // Remove old unencrypted data
        } catch (error) {
          console.warn(`Failed to migrate ${key}:`, error);
        }
      }
    });
  }
}

// Create singleton instance
export const secureStorage = new SecureStorage();

// Export class for testing
export { SecureStorage };
