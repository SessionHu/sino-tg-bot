import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

import dotenv from 'dotenv';

import DBHelper from './dbhelper';
import * as logger from './logger';
import * as shell from './shell';
import * as weatherNMC from './weather/nmc';
import * as escape from './escape';

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
  ctx.sendChatAction('typing').catch(logger.warn);
  try {
    const w = await weatherNMC.fromKeyword(ctx.text.split(/\s+/).splice(1).join(' '));
    if (w.image) {
      ctx.sendChatAction('upload_photo').catch(logger.warn);
      await ctx.replyWithPhoto({
        url: w.image
      }, {
        caption: w.caption,
        parse_mode: 'HTML'
      });
    } else ctx.replyWithHTML(w.caption);
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
  logger.warn('Receiced Signal:', signal);
  dbhelper.close();
  bot.stop(signal);
}
process.once('SIGTERM', onexit);
process.once('SIGINT', onexit);
