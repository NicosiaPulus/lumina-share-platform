export interface GenericStringStorage {
  getItem(key: string): string | Promise<string | null> | null;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export class GenericStringInMemoryStorage implements GenericStringStorage {
  #store = new Map<string, string>();

  getItem(key: string): string | Promise<string | null> | null {
    return this.#store.has(key) ? this.#store.get(key)! : null;
  }
  setItem(key: string, value: string): void | Promise<void> {
    this.#store.set(key, value);
  }
  removeItem(key: string): void | Promise<void> {
    this.#store.delete(key);
  }
}

export class GenericStringLocalStorage implements GenericStringStorage {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(key);
  }
  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, value);
  }
  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  }
}

