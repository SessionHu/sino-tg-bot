export default class UserStatus {

  readonly #map = new Map<number, Map<string, string>>;

  get(userid: number): ReadonlyMap<string, string> | undefined;
  get(userid: number, key: string): string | undefined;
  get(userid: number, key?: string): ReadonlyMap<string, string> | string | undefined {
    const userMap = this.#map.get(userid);
    return key ? userMap?.get(key) : userMap;
  }

  set(userid: number, map: Map<string, string> | [string, string][]): void;
  set(userid: number, key: string, value: string): void;
  set(userid: number, map: string | Map<string, string> | [string, string][], value?: string) {
    if (typeof map === 'string') map = [[map, value!]];
    const um = this.#map.get(userid);
    if (!um) return this.#map.set(userid, Array.isArray(map) ? new Map(map) : map);
    for (const [k, v] of map) um.set(k, v);
  }

  drop(userid: number): void;
  drop(userid: number, key: string): void;
  drop(userid: number, key?: string) {
    const um = this.#map.get(userid);
    if (!um) return;
    else if (key) um.delete(key);
    else this.#map.delete(userid);
    if (!um.size) this.#map.delete(userid);
  }

}
