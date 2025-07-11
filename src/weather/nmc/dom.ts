import { parse } from 'node-html-parser';

import * as logger from '../../logger';

import type { IncomingHttpHeaders } from 'node:http';

export async function raderURLs(url: string, headers: IncomingHttpHeaders & NodeJS.Dict<string>): Promise<string[]> {
  logger.info('[weather] [NMC]', url);
  const htmltext = await fetch(url, { headers }).then(r => r.text());
  const rootelem = parse(htmltext);
  const timeWrap = rootelem.getElementById('timeWrap');
  return timeWrap?.children.map(e => e.getAttribute('data-img')).splice(0, 40).filter(Boolean).reverse() as string[] ?? [];
}
