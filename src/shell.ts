import childProcess from 'node:child_process';
import { promisify } from 'node:util';

import * as logger from './logger';
import { toHtmlPreArray } from './escape';

import type { Context } from 'telegraf';
import type { Message, Update } from 'telegraf/types';

const promisedExec = promisify(childProcess.exec);
async function exec(command: string) {
  logger.info('[shell] $', command);
  return promisedExec(command);;
}

async function execNoShell(command: string, args?: string[]) {
  logger.info('[shell] :', command, args?.length ? args : '');
  const chunks = new Array<string>;
  const cp = childProcess.spawn(command, args);
  const readChunk = (chunk: any) => {
    if (typeof chunk === 'string') chunks.push(chunk);
  };
  cp.stdout.setEncoding('utf8').on('data', readChunk);
  cp.stderr.setEncoding('utf8').on('data', readChunk);
  return new Promise<string>((resolve, reject) => {
    cp.on('close', () => resolve(chunks.join('')));
    cp.on('error', reject);
  });
}

async function execNoShellPlain(command: string, args?: string[]) {
  return ansiCSIFilter(await execNoShell(command, args));
}

export async function fromContext(ctx: Context<Update.MessageUpdate<Message.TextMessage>>) {
  const text = ctx.text.split(/\s+/).splice(1);
  if (!text[0]) {
    ctx.reply('你不給咱命令运行个啥嘛! 咱又不能給你交互 Shell 喵...');
  } else if (text[0] === 'neofetch' 
    || text[0] === 'fortune'
    || text[0] === 'uptime'
    || text[0] === 'dig'
    || text[0] === 'whois')
  {
    const v = await execNoShellPlain(text[0], text.splice(1));
    for (const c of toHtmlPreArray(v)) {
      await ctx.replyWithHTML(c);
    }
  } else {
    ctx.reply(text[0] + ': inaccessible or not found');
  }
}

const ANSI_CSI_REGEX = /\x1b\[[\x30-\x3f\x20-\x2f]*?[\x40-\x7e]/g;

function ansiCSIFilter(text: string) {
  return text.replace(ANSI_CSI_REGEX, '');
}
