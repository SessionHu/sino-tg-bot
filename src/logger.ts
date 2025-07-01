import type { Context } from 'telegraf';
import type { Message, Update } from 'telegraf/types';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' |'FATAL';

function consoleHelper(level: LogLevel, ...data: any[]) {
  const ts = new Date().toISOString();
  let fnkey: keyof Console & string = 'log';
  let richlv: string = '[UNKNOWN]';
  if (level === 'DEBUG') {
    fnkey = 'debug';
    richlv = `[\x1b[36m${level}\x1b[m]`; // cyan
  } else if (level === 'INFO') {
    fnkey = 'info';
    richlv = `[${level}]`; // normal`
  } else if (level === 'WARN') {
    fnkey = 'warn';
    richlv = `[\x1b[93m${level}\x1b[m]`; // bright yellow
  } else if (level === 'ERROR') {
    fnkey = 'error';
    richlv = `[\x1b[91m${level}\x1b[m]`; // right red
  } else if (level === 'FATAL') {
    fnkey = 'error';
    richlv = `[\x1b[91;1m${level}\x1b[m]`; // right red + bold
  } else {
    const _: never = level; 
    _; // never! just for ts type check
  }
  console[fnkey](`[${ts}]`, richlv, ...data);
}

/**
 * @deprecated
 */
export function log(...data: any[]) {
  info(...data);
}

export function debug(...data: any[]) {
  consoleHelper('DEBUG', ...data);
}

export function info(...data: any[]) {
  consoleHelper("INFO", ...data);
}

export function error(...data: any[]) {
  consoleHelper('ERROR', ...data);
}

export function warn(...data: any[]) {
  consoleHelper('WARN', ...data);
}

export function logMessageUniversal(o: {
  date: number,
  username?: string,
  /**
   * Type of chat, can be either “private”, “group”, “supergroup” or “channel”.
   */
  source: 'private' | 'group' | 'supergroup' | 'channel',
  title?: string,
  /**
   * Text, Sticker, Media, etc.
   */
  type: string,
  text: string
}) {
  const p = [`[message] [${o.source}]`, o.date, o.type];
  if (o.title) p.push(o.title);
  if (o.username) p.push(o.username);
  p.push(':');
  p.push(o.text);
  info(...p);
}

export function logMessage(ctx: Context<Update.MessageUpdate<Message>>) {
  let typ: string, text: string;
  if ('sticker' in ctx.message) {
    typ = 'sticker';
    text = ctx.message.sticker.emoji || ctx.message.sticker.file_id
  } else {
    typ = 'text';
    text = ctx.text ?? ''
  }
  logMessageUniversal({
    date: ctx.message.date,
    username: ctx.message.from.username || (ctx.message.sender_chat && 'username' in ctx.message.sender_chat ? ctx.message.sender_chat.username : void 0),
    title: 'title' in ctx.message.chat ? ctx.message.chat.title : void 0,
    source: ctx.chat.type,
    type: typ,
    text
  });
}
