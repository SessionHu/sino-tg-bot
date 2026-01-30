import childProcess from 'node:child_process';
import { promisify } from 'node:util';

import * as logger from './logger';
import { escapeHtmlText } from './escape';
import { SINO_FILE_CENTER_CHAT_ID } from '.';

import type { Context } from 'telegraf';
import type { Message, Update } from 'telegraf/types';

const promisedExec = promisify(childProcess.exec);
export async function exec(command: string) {
  logger.info('[shell] $', command);
  return promisedExec(command);;
}

export async function execNoShell(command: string, args?: string[], encoding?: BufferEncoding, aloneStderr?: false, stdin?: Buffer): Promise<string>;
export async function execNoShell(command: string, args: string[], encoding: null, aloneStderr?: false): Promise<Buffer>;
export async function execNoShell(command: string, args: string[], encoding: BufferEncoding, aloneStderr: true, stdin?: Buffer): Promise<{stdout: string, stderr: string}>;
export async function execNoShell(command: string, args: string[], encoding: null, aloneStderr: true, stdin?: Buffer): Promise<{stdout: Buffer, stderr: Buffer}>;
export async function execNoShell(command: string, args = new Array<string>, encoding: BufferEncoding | null = 'utf8', aloneStderr = false, stdin?: Buffer) {
  logger.info('[shell] :', [command, ...args]);
  const chunks = new Array<Buffer>;
  const stderc = aloneStderr ? new Array<Buffer> : null;
  const cp = childProcess.spawn(command, args, {
    env: {
      PAGER: 'cat',
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      SHELL: process.argv[0],
      LD_PRELOAD: process.env.LD_PRELOAD,
      LANG: process.env.LANG
    }
  });
  if (stdin) cp.stdin.write(stdin), cp.stdin.end();
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

async function execNoShellTimeoutPlain(cmdline: string[]) {
  return execNoShellPlain('timeout', ['-pk10', '-s2', '30', ...cmdline]);
}

const ALLOWED_SHELL_CMDS = [
  'neofetch',
  'fastfetch',
  'fortune',
  'uptime',
  'dig',
  'man',
  'date',
  'free',
  'whois',
  'traceroute',
  'nping',
  'ping'
];

const OUTPUT_LIMIT_LENGTH = 4095;

export async function fromContext(ctx: Context<Update.MessageUpdate<Message.TextMessage>>) {
  const text = ctx.text.split(/\s+/).slice(1);
  if (!text[0]) {
    ctx.reply('你不給咱命令运行个啥嘛! 咱这命令就已经是 Shell 了喵...');
  } else if (ALLOWED_SHELL_CMDS.includes(text[0])) {
    const v = await execNoShellTimeoutPlain(text);
    if (v.length > OUTPUT_LIMIT_LENGTH) {
      ctx.sendChatAction('upload_document');
      ctx.replyWithDocument({
        source: Buffer.from(v),
        filename: text.join('_') + '.txt'
      }, {
        caption: `Command output too long (${v.length} > ${OUTPUT_LIMIT_LENGTH})!\nHere is your output text document.`
      });
      logger.info('[shell]', text, 'output too long:', v.length);
    } else {
      ctx.replyWithHTML(`<pre>${escapeHtmlText(v)}</pre>`);
    }
  } else {
    ctx.reply(text[0] + ': inaccessible or not found');
  }
}

export async function fromContextInlineQuery(ctx: Context<Update.InlineQueryUpdate> & {match: RegExpExecArray}) {
  const cmdline = ctx.match[1].split(/\s+/);
  if (!ALLOWED_SHELL_CMDS.includes(cmdline[0])) {
    const description = cmdline[0] +': inaccessible or not found';
    return ctx.answerInlineQuery([{
      type: 'article',
      id: crypto.randomUUID(),
      title: 'command not found',
      description,
      input_message_content: {
        message_text: '<code>' + escapeHtmlText(description) + '</code>',
        parse_mode: 'HTML'
      }
    }]);
  }
  const id = Math.floor(Date.now() / 1e3).toString(36) + ':shell:' + cmdline.map(v => Buffer.from(v).toString('base64')).join('-');
  console.log(id);
  return ctx.answerInlineQuery([{
    type: 'article',
    id,
    title: 'shell command',
    description: cmdline.join(' '),
    input_message_content: {
      message_text: '<code>' + escapeHtmlText('$ ' + cmdline.join(' ')) + '</code>',
      parse_mode: 'HTML'
    },
    reply_markup: {
      inline_keyboard: [[{
        text: Math.random() > .3 ? '少女祈祷中...' : '少女折寿中...',
        url: `tg://user?id=${ctx.botInfo.id}`
      }]]
    }
  }]);
}

export async function fromContextInlineChosen(ctx: Context<Update.ChosenInlineResultUpdate>) {
  const resid = ctx.chosenInlineResult.result_id.split(':');
  resid.shift(); // a useless timestamp
  if (resid.length !== 2 || resid[0] !=='shell') return;
  const cmdline = resid[1].split('-').map(v => Buffer.from(v, 'base64').toString('utf8'));
  const v = await execNoShellTimeoutPlain(cmdline);
  if (v.length > OUTPUT_LIMIT_LENGTH) {
    const m = await ctx.telegram.sendDocument(SINO_FILE_CENTER_CHAT_ID, {
      source: Buffer.from(v),
      filename: cmdline.join('_') + '.txt'
    });
    setTimeout(() => ctx.telegram.deleteMessage(SINO_FILE_CENTER_CHAT_ID, m.message_id), 3e4);
    await ctx.editMessageMedia({
      type: 'document',
      media: m.document.file_id,
      caption: `Command output too long (${v.length} > ${OUTPUT_LIMIT_LENGTH})!\nHere is the output text document.`,
        parse_mode: 'HTML'
    });
    logger.info('[shell]', cmdline, 'output too long:', v.length);
  } else {
    ctx.editMessageText(`<code>$ ${cmdline.join(' ')}</code>\n<pre>${escapeHtmlText(v)}</pre>`, { parse_mode: 'HTML' });
  }
}

const ANSI_CSI_REGEX = /\x1b\[[\x30-\x3f\x20-\x2f]*?[\x40-\x7e]/g;
const ASCII_BS_REGEX = /.[\b]/g;

function ansiFilter(text: string) {
  return text.replace(ANSI_CSI_REGEX, '').replace(ASCII_BS_REGEX, '');
}
