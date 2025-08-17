export default class Cache<K, V> {
  readonly #map = new Map<K, V>;
  readonly maxSize: number;
  set(key: K, value: V): void {
    this.#map.set(key, value);
    this.clean();
  }
  get(key: K): V | undefined {
    return this.#map.get(key);
  }
  has(key: K): boolean {
    return this.#map.has(key);
  }
  delete(key: K): boolean {
    return this.#map.delete(key);
  }
  clear(): void {
    this.#map.clear();
  }
  constructor(maxSize = 128) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be a positive number');
    }
    this.maxSize = maxSize;
    setInterval(() => this.clean(), 3.6e6);
  }
  clean(): void {
    while (this.#map.size > this.maxSize) {
      const k = this.#map.keys().next().value;
      k && this.#map.delete(k);
    }
  }
}
