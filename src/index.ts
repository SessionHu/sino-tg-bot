import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

import dotenv from 'dotenv';

import DBHelper from './dbhelper';
import * as logger from './logger';
import * as shell from './shell';
import * as escape from './escape';
import * as inet from './inet';
import * as weather from './weather';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN!);
delete process.env.BOT_TOKEN;

const dbhelper = new DBHelper('./db.jsonl');

// 处理 /start 命令
bot.start((ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  ctx.reply(`欢迎使用 ${ctx.botInfo.first_name}! 🚀\n发送 /help 查看帮助`);
});

// 处理 /help 命令
bot.help((ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  ctx.replyWithMarkdownV2(
    '*✅可用命令:*\n' +
    '/start \\- 启动机器人\n' +
    '/help \\- 显示帮助\n' +
    '/echo \\[文本\\] \\- 回复相同文本\n' +
    '/weather \\[关键词\\] \\- 从 NMC 获取实时的天气及动态雷达图📡\n' +
    '/img \\- 获取随机猫猫图片\n' +
    '*🚫特权命令:*\n' +
    '/shell \\- 无可奉告'
  ).catch(logger.error);
});

// 回显消息
bot.command('echo', (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  const text = ctx.message.text.split(' ').slice(1).join(' ');
  ctx.reply(text || '请输入要回显的文本');
});

// 发送图片
bot.command('img', async (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  try {
    await ctx.replyWithPhoto({
      url: 'https://cataas.com/cat?type=square&ts=' + Date.now()
    });
  } catch (e) {
    ctx.reply('获取图片失败，请重试 🐱');
  }
});

bot.command('shell', async (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  ctx.sendChatAction('typing').catch(logger.warn);
  // handle command args
  try {
    await shell.fromContext(ctx);
  } catch (e) {
    ctx.reply(e instanceof Error && e.stack ? e.stack : String(e));
    logger.error(e);
  }
});

bot.command('weather', async (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  try {
    const kw = ctx.text.split(/\s+/).splice(1).join(' ');
    if (!kw) {
      const { caption, inline_keyboard } = await weather.withInlineKeyboard();
      return ctx.reply(caption, { reply_markup: { inline_keyboard } });
    }
    ctx.sendChatAction('typing').catch(logger.warn);
    const w = await weather.fromKeyword(kw);
    if (w.image) {
      ctx.sendChatAction('upload_photo').catch(logger.warn);
      await ctx['source' in w.image ? 'replyWithAnimation' : 'replyWithPhoto'](w.image, {
        caption: w.caption,
        parse_mode: 'HTML'
      });
    } else ctx.replyWithHTML(w.caption);
  } catch (e) {
    ctx.reply(e instanceof Error && e.stack ? e.stack : String(e));
    logger.error(e);
  }
});

bot.on('callback_query', async (ctx) => {
  if (!('data' in ctx.callbackQuery)) return;
  const data = ctx.callbackQuery.data.split(':');
  logger.info('[callback_query]', data);
  if (data[0] === 'weather' && data[1] === 'province') {
    // weather:province:xxx
    const { caption, inline_keyboard } = await weather.withInlineKeyboard(data[2]);
    ctx.editMessageText(caption, {
      reply_markup: { inline_keyboard }
    });
  } else if (data[0] === 'weather' && data[1] === 'city') {
    // weather:city:xxx
    ctx.sendChatAction('typing').catch(logger.warn);
    ctx.editMessageText('正在查询 ' + data[2] + '...');
    const w = await weather.fromStationId(data[2]);
    if (w.image) {
      ctx.sendChatAction('upload_photo').catch(logger.warn);
      await ctx['source' in w.image ? 'replyWithAnimation' : 'replyWithPhoto'](w.image, {
        caption: w.caption,
        parse_mode: 'HTML'
      });
    } else {
      ctx.replyWithHTML(w.caption);
    }
    ctx.deleteMessage();
  }
});

bot.command('ip', async (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  ctx.sendChatAction('typing').catch(logger.warn);
  try {
    const r = await inet.ip('shakaianee', ctx.text.split(/\s+/)[1]);
    if (typeof r === 'string') {
      ctx.replyWithHTML(r.replace(/\<br(.*\/)?\>/g, '\n'));
    } else if (typeof r === 'object') {
      ctx.replyWithMarkdownV2('```json\n' + JSON.stringify(r, null, 2) + '\n```');
    } else {
      ctx.reply('结果异常: ' + r);
    }
  } catch (e) {
    ctx.reply(e instanceof Error && e.stack ? e.stack : String(e));
    logger.error(e);
  }
});

// 处理普通文本
bot.on(message('text'), (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  if (ctx.chat.type === 'private')
    ctx.replyWithHTML(`你说了: "<code>${escape.escapeHtmlText(ctx.message.text)}</code>"`).catch(logger.error);
});

// 处理贴纸
bot.on(message('sticker'), (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  if (ctx.chat.type === 'private')
    ctx.replyWithSticker(ctx.message.sticker.file_id);
});

// 错误处理
bot.catch((err, ctx) => {
  logger.error(`[${ctx.updateType}] 错误:`, err);
  ctx.reply('机器人遇到错误，请稍后再试');
});

// 启动机器人
bot.launch(() => {
  logger.info('Bot launched');
});

// 优雅关闭
const onexit = async (signal: NodeJS.Signals) => {
  logger.warn('Received Signal:', signal);
  dbhelper.close();
  bot.stop(signal);
}
process.once('SIGTERM', onexit);
process.once('SIGINT', onexit);
