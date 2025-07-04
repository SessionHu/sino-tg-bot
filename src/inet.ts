import { resolve4 } from 'node:dns/promises';

import * as logger from './logger';

const parseIntDig = (e: string) => parseInt(e);

const IPV4_DIG_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function isIPv4(s: string) {
  return (!IPV4_DIG_REGEX.exec(s)) ? ''
  : s.split('.').map(parseIntDig).join('.');
}

function notLANIPv4(s: string) {
  if (!(s = isIPv4(s))) return s;
  const p = s.split('.').map(parseIntDig);
  return ((p[0] === 10) // A
    || (p[0] === 192 && p[1] === 168) // B
    || (p[0] === 172 && p[1] > 15 && p[1] < 32) // C
  ) ? '' : s;
}

export async function ip(source: 'shakaianee', s: string) {
  if (!s) return '你的... IP 地址在哪里喵?';
  // try to resolve
  const a = isIPv4(s);
  if (!a) s = (await resolve4(s))[0];
  else s = a;
  if (!s) return `你給的东西好像变不成一个有效的 IPv4 地址捏~ 咱目前仅支持 IPv4 喵~`;
  // get data
  if (source === 'shakaianee') return shakaianee(s);
}

async function shakaianee(ip: string) {
  const url = `https://ip.shakaianee.top/${ip}?f=json`;
  logger.info('[inet] [ip]', url);
  const resp = await fetch(url);
  return resp.headers.get('content-type')?.startsWith('application/json') ?
    resp.json()
  :
    resp.text();
}
