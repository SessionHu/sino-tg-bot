import { bot } from '.';
//import * as logger from './logger';

import type { Sticker, InputFile } from 'telegraf/types';

export async function sticker2file(stk: Sticker): Promise<InputFile> {
  return {
    url: (await bot.telegram.getFileLink(stk)).toString(),
    filename: (stk.set_name ? stk.set_name + '+' : '') + stk.file_id + '.webp.png'
  };
}
