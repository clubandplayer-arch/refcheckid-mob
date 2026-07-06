const memoryStore = new Map<string, string>();

export function getLocalStorageItem(key: string): string | null {
  if (typeof globalThis.localStorage !== "undefined") return globalThis.localStorage.getItem(key);
  return memoryStore.get(key) ?? null;
}

export function setLocalStorageItem(key: string, value: string): void {
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.setItem(key, value);
    return;
  }
  memoryStore.set(key, value);
}

export function removeLocalStorageItem(key: string): void {
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.removeItem(key);
    return;
  }
  memoryStore.delete(key);
}
