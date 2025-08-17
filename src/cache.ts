import { zstdCompress, zstdDecompress } from 'node:zlib';
import { promisify } from 'node:util';

const zstd = promisify(zstdCompress);
const unzstd = promisify(zstdDecompress);

export default class Cache<K, V> {
  readonly #map = new Map<K, V>;
  readonly maxSize: number;
  async set(key: K, value: V): Promise<void> {
    if (this.#map.has(key)) this.#map.delete(key);
    const v = value instanceof Buffer ? await zstd(value) : value;
    this.#map.set(key,  v as V);
    if (this.#map.size > this.maxSize)
      this.#map.delete(this.#map.keys().next().value!);
  }
  async get(key: K): Promise<V | undefined> {
    if (!this.#map.has(key)) return;
    const v = this.#map.get(key)!;
    const d = v instanceof Buffer ? await unzstd(v) : v;
    this.#map.delete(key);
    this.#map.set(key, v);
    return d as V;
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
    if (maxSize <= 0)
      throw new Error('maxSize must be a positive number');
    this.maxSize = maxSize;
  }
}
