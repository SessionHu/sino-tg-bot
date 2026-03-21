import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import type { InlineQueryResult } from 'telegraf/types';

import dotenv from 'dotenv';

import DBHelper from './dbhelper';
import UserStatus from './userstatus';
import * as logger from './logger';
import * as shell from './shell';
import * as escape from './escape';
import * as inet from './inet';
import * as weather from './weather';
import * as stickers from './stickers';

import { findPackageJSON } from 'node:module';

dotenv.config();

export const bot = new Telegraf(process.env.BOT_TOKEN!);
delete process.env.BOT_TOKEN;

if (!process.env.SINO_FILE_CENTER_CHAT_ID)
  logger.warn('未设置 SINO_FILE_CENTER_CHAT_ID 环境变量, 部分文件功能可能异常!');
export const SINO_FILE_CENTER_CHAT_ID = process.env.SINO_FILE_CENTER_CHAT_ID!;
delete process.env.SINO_FILE_CENTER_CHAT_ID;

const dbhelper = new DBHelper('./db.jsonl');

export const userstatus = new UserStatus;

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
    '/about \\- 显示关于信息\n' +
    '/echo \\[文本\\] \\- 回复相同文本\n' +
    '/weather \\<关键词\\> \\- 从 NMC 获取实时的天气及动态雷达图📡\n' +
    '/ip \\[域名 \\| IPv4\\] \\- 查询 IP 地址信息\n' +
    '/sticker2file \\- 开启/关闭 贴纸转文件功能\n' +
    '/img \\- 获取随机猫猫图片\n' +
    '*🚫特权命令:*\n' +
    '/shell \\- 无可奉告'
  ).catch(logger.error);
});

// 处理 /about 命令
bot.command('about', async (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  const pkgjson = require(findPackageJSON('file://' + module.path) || '{}');
  let res = '';
  for (const [k, v] of Object.entries(pkgjson)) {
    if (k === 'scripts' || k === 'devDependencies' || k === 'dependencies' || k === 'main') continue;
    res += `<strong>${k.replace(/^(.)/, c => c.toUpperCase())}</strong>: ${escape.escapeHtmlText(typeof v !== 'string' ? JSON.stringify(v) : v)}\n`
  }
  await ctx.replyWithHTML(res || 'Please star: https://github.com/SessionHu/sino-tg-bot');
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

bot.inlineQuery(/^(?:s|\$)(?:hell\s*|\s+)(.*)$/, async (ctx) => {
  logger.info('[inline_query]', ctx.inlineQuery.from.username, ctx.inlineQuery.query);
  try {
    await shell.fromContextInlineQuery(ctx);
  } catch (e) {
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

bot.on('chosen_inline_result', async (ctx) => {
  const resid = ctx.chosenInlineResult.result_id.split(':');
  resid.shift(); // a useless random uuid
  logger.info('[inline_chosen]', ctx.chosenInlineResult.from.username, resid);
  // weather:city:xxx
  if (resid.length === 3 && resid[0] === 'weather' && resid[1] === 'city') {
    const w = await weather.fromStationId(resid[2]);
    if (w.image) {
      const m = await ctx.telegram['source' in w.image ? 'sendDocument' : 'sendPhoto'](SINO_FILE_CENTER_CHAT_ID, w.image);
      setTimeout(() => ctx.telegram.deleteMessage(SINO_FILE_CENTER_CHAT_ID, m.message_id), 3e4);
			await ctx.editMessageMedia({
        type: 'source' in w.image ? 'animation' : 'photo',
        media: 'document' in m ? m.document.file_id : m.photo[0].file_id,
        caption: w.caption,
        parse_mode: 'HTML',
      });
    } else
      await ctx.editMessageText(w.caption, {
        parse_mode: 'HTML'
      });
  }
  // shell
  else if (resid.length === 1 && resid[0] ==='shell') {
    return shell.fromContextInlineChosen(ctx);
  }
});

bot.inlineQuery(/^w(?:eather\s*|\s+)(.*)$/, async (ctx) => {
  logger.info('[inline_query]', ctx.inlineQuery.from.username, ctx.inlineQuery.query);
  try {
    const stations = await weather.nmc.autocomplete(ctx.match[1] || '北京');
    if (!stations.data || stations.data.length === 0) {
      const description = stations.msg || '未找到城市: ' + ctx.match[1];
      await ctx.answerInlineQuery([{
        type: 'article',
        id: crypto.randomUUID(),
        title: '不好意思喵',
        description,
        input_message_content: {
          message_text: '不好意思喵, ' + description
        }
      }]);
      return;
    }
    const res = new Array<InlineQueryResult>;
    for (const s of stations.data) {
      const ps = s.split('|');
      const title = `${ps[2]} ${ps[1]}`;
      res.push({
        type: 'article',
        id: `${crypto.randomUUID()}:weather:city:${ps[0]}`,
        title,
        description: ps.join(' '),
        input_message_content: {
          message_text: `正在查询 ${title} (${ps[0]})...`,
        },
        reply_markup: {
          inline_keyboard: [[{
            text: Math.random() > .3 ? '少女祈祷中...' : '少女折寿中...',
            url: `tg://user?id=${ctx.botInfo.id}`
          }]]
        }
      });
    }
    await ctx.answerInlineQuery(res);
  } catch (e) {
    logger.error(e);
  }
});

bot.inlineQuery(/^p(?:eer)?$/, async (ctx) => {
  logger.info('[inline_query]', ctx.inlineQuery.from.username, ctx.inlineQuery.query);
  await ctx.answerInlineQuery([{
    type: 'article',
    id: crypto.randomUUID(),
    title: '你好 peer 咱 SessNetwork 谢谢喵~',
    input_message_content: {
      message_text: '你好 peer 咱 SessNetwork 谢谢喵~\nhttps://dn42.xhustudio.eu.org/peering.html\nhttps://sess.dn42/peering.html',
    }
  }]);
})

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
      const m = await ctx.telegram['source' in w.image ? 'sendDocument' : 'sendPhoto'](SINO_FILE_CENTER_CHAT_ID, w.image);
      setTimeout(() => ctx.telegram.deleteMessage(SINO_FILE_CENTER_CHAT_ID, m.message_id), 3e4);
			await ctx.editMessageMedia({
        type: 'source' in w.image ? 'animation' : 'photo',
        media: 'document' in m ? m.document.file_id : m.photo[0].file_id,
        caption: w.caption,
        parse_mode: 'HTML',
      });
    } else
      await ctx.editMessageText(w.caption, {
        parse_mode: 'HTML'
      });
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

// 处理贴纸
bot.on(message('sticker'), async (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  const stk = ctx.message.sticker;
  if (userstatus.get(ctx.message.from.id, 'STICKER_TO_FILE'))
    ctx.sendChatAction('upload_document').catch(logger.warn),
    await ctx.replyWithDocument(await stickers.sticker2file(stk));
  else if (ctx.chat.type === 'private')
    await ctx.replyWithSticker(stk.file_id);
});

bot.command('sticker2file', async (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  if (!userstatus.get(ctx.message.from.id, 'STICKER_TO_FILE'))
    userstatus.set(ctx.message.from.id, 'STICKER_TO_FILE', 'true'),
    await ctx.sendMessage('贴纸转文件已开启喵~');
  else
    userstatus.drop(ctx.message.from.id, 'STICKER_TO_FILE'),
    await ctx.sendMessage('贴纸转文件已关闭喵~');
});

// 处理普通文本
bot.on(message('text'), (ctx) => {
  dbhelper.write(JSON.stringify(ctx.message));
  logger.logMessage(ctx);
  if (ctx.chat.type === 'private')
    ctx.replyWithHTML(`你说了: "<code>${escape.escapeHtmlText(ctx.message.text)}</code>"`).catch(logger.error);
});

// 错误处理
bot.catch((err, ctx) => {
  logger.error(`[${ctx.updateType}] 错误:`, err);
  ctx[ctx.inlineMessageId ? 'editMessageText' : 'reply']('机器人遇到错误，请稍后再试');
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
