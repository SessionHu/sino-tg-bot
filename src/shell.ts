import childProcess from 'node:child_process';
import { promisify } from 'node:util';

import * as logger from './logger';
import { toHtmlPreArray } from './escape';

import type { Context } from 'telegraf';
import type { Message, Update } from 'telegraf/types';

const promisedExec = promisify(childProcess.exec);
export async function exec(command: string) {
  logger.info('[shell] $', command);
  return promisedExec(command);;
}

export async function execNoShell(command: string, args?: string[], encoding?: BufferEncoding, aloneStderr?: false): Promise<string>;
export async function execNoShell(command: string, args: string[], encoding: null, aloneStderr?: false): Promise<Buffer>;
export async function execNoShell(command: string, args: string[], encoding: BufferEncoding, aloneStderr: true): Promise<{stdout: string, stderr: string}>;
export async function execNoShell(command: string, args: string[], encoding: null, aloneStderr: true): Promise<{stdout: Buffer, stderr: Buffer}>;
export async function execNoShell(command: string, args = new Array<string>, encoding: BufferEncoding | null = 'utf8', aloneStderr = false) {
  logger.info('[shell] :', [command, ...args]);
  const chunks = new Array<Buffer>;
  const stderc = aloneStderr ? new Array<Buffer> : null;
  const cp = childProcess.spawn(command, args, {
    env: {
      PAGER: 'cat',
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      SHELL: process.argv[0],
      LD_PRELOAD: process.env.LD_PRELOAD
    }
  });
  cp.stdout.on('data', (chunk) => {
    if (chunk instanceof Buffer) chunks.push(chunk);
  });
  cp.stderr.on('data', (chunk) => {
    if (chunk instanceof Buffer) (stderc ? stderc : chunks).push(chunk);
  });
  return new Promise<string | Buffer | {
    stdout: Buffer | string,
    stderr: Buffer | string
  }>((resolve, reject) => {
    cp.on('close', () => {
      const bfo = encoding ? Buffer.concat(chunks).toString(encoding) : Buffer.concat(chunks);
      const bfe = stderc ? (encoding ? Buffer.concat(stderc).toString(encoding) : Buffer.concat(stderc)) : null;
      resolve(bfe ? {
        stdout: bfo,
        stderr: bfe
      } : bfo)
    });
    cp.on('error', reject);
  });
}

async function execNoShellPlain(command: string, args?: string[]) {
  return ansiFilter(await execNoShell(command, args));
}

export async function fromContext(ctx: Context<Update.MessageUpdate<Message.TextMessage>>) {
  const text = ctx.text.split(/\s+/).slice(1);
  if (!text[0]) {
    ctx.reply('你不給咱命令运行个啥嘛! 咱这命令就已经是 Shell 了喵...');
  } else if (text[0] === 'neofetch' 
    || text[0] === 'fortune'
    || text[0] === 'uptime'
    || text[0] === 'dig'
    || text[0] === 'man'
    || text[0] === 'date'
    || text[0] === 'free'
    || text[0] === 'whois')
  {
    const v = await execNoShellPlain(text[0], text.slice(1));
    if (v.length > 32767) {
      ctx.sendChatAction('upload_document');
      ctx.replyWithDocument({
        source: Buffer.from(v),
        filename: text.join('_') + '.txt'
      }, {
        caption: `Command output too long (${v.length} >32767)!\nHere is your output text document.`
      });
      logger.info('[shell]', text, 'output too long:', v.length);
    }
    else for (const c of toHtmlPreArray(v)) {
      await ctx.replyWithHTML(c);
    }
  } else {
    ctx.reply(text[0] + ': inaccessible or not found');
  }
}

const ANSI_CSI_REGEX = /\x1b\[[\x30-\x3f\x20-\x2f]*?[\x40-\x7e]/g;
const ASCII_BS_REGEX = /.[\b]/g;

function ansiFilter(text: string) {
  return text.replace(ANSI_CSI_REGEX, '').replace(ASCII_BS_REGEX, '');
}
