import { parse } from 'node-html-parser';

import * as logger from '../../logger';

import type { IncomingHttpHeaders } from 'node:http';

export async function raderURLs(url: string, headers: IncomingHttpHeaders & NodeJS.Dict<string>): Promise<string[]> {
  logger.info('[weather] [NMC]', url);
  const htmltext = await fetch(url, { headers }).then(r => r.text());
  const rootelem = parse(htmltext);
  const timeWrap = rootelem.getElementById('timeWrap');
  return timeWrap?.children.map(e => {
    const s = e.getAttribute('data-img');
    if (!s) return '';
    const u = new URL(s);
    u.search = '';
    return u.toString();
  }).splice(0, 40).filter(Boolean).reverse() as string[] ?? [];
}
