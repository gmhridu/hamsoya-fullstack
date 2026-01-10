// secure-storage.ts
export class SecureStorage<T> {
  private key = "my-static-client-key"; // obfuscation only

  /**
   * Encrypt a string using XOR + base64
   */
  private encrypt(text: string): string {
    return btoa(
      [...text]
        .map((c, i) =>
          String.fromCharCode(c.charCodeAt(0) ^ this.key.charCodeAt(i % this.key.length))
        )
        .join("")
    );
  }

  /**
   * Decrypt a string using XOR + base64
   */
  private decrypt(text: string): string {
    return atob(text)
      .split("")
      .map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ this.key.charCodeAt(i % this.key.length))
      )
      .join("");
  }

  /**
   * Persist storage interface for Zustand
   */
  getItem(name: string): string | null {
    const raw = localStorage.getItem(name);
    if (!raw) return null;

    try {
      const decrypted = this.decrypt(raw);
      return decrypted;
    } catch (error) {
      console.warn("Failed to decrypt localStorage item:", error);
      return null;
    }
  }

  setItem(name: string, value: string): void {
    try {
      const encrypted = this.encrypt(value);
      localStorage.setItem(name, encrypted);
    } catch (error) {
      console.warn("Failed to encrypt localStorage item:", error);
    }
  }

  removeItem(name: string): void {
    localStorage.removeItem(name);
  }
}

// Singleton instance
export const secureStorage = new SecureStorage<any>();
