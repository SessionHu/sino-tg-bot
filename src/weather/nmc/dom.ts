import { parse } from 'node-html-parser';

import * as logger from '../../logger';
import { HEADERS } from '.';

export async function raderURLs(url: string): Promise<string[]> {
  logger.info('[weather] [NMCl', url);
  const htmltext = await fetch(url, {
    headers: HEADERS
  }).then(r => r.text());
  const rootelem = parse(htmltext);
  const timeWrap = rootelem.getElementById('timeWrap');
  return timeWrap?.children.map(e => e.getAttribute('data-img')).splice(0, 40).filter(Boolean).reverse() as string[] ?? [];
}
