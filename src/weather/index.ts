import type { InlineKeyboardButton, InputFile } from 'telegraf/types';

import * as nmc from './nmc';
import { escapeHtmlText } from '../escape';

function getWeatherEmojiFromInfo(i: string) {
  if (i === '晴') return '☀️';
  else if (i.includes('多云') || i.includes('转阴') || i.includes('转晴')) return '⛅';
  else if (i === '阴') return '☁';
  else if (i === '中雨' || i === '小雨' || i === '大雨') return '🌧';
  else if (i === '雷阵雨') return '⛈️';
  else if (i.includes('雪')) return '❄️';
  else return '☁️';
}

function getClockEmojiFromTime(dt: nmc.NMCDateTime) {
  // h, m
  let [h, m] = dt.split(' ')[1].split(':').map(Number);
  if (h > 12) h -= 12;
  else if (h === 0) h = 12;
  if (m >= 40) [h++, m = 0];
  else if (m < 40 && m > 20) m = 30;
  else m = 0;
  // return
  if (m === 30)
    return String.fromCodePoint(0x1f55b + h); // 🕧 ~ 🕦
  else if (m === 0)
    return String.fromCodePoint(0x1f54f + h); // 🕛 ~ 🕚
  else
    return '⏱️';
}

export async function fromKeyword(kw: string): Promise<{
  caption: string,
  image?: InputFile,
}> {
  if (!kw) return { caption: '查询城市名称不能少于 1 个字符!' };
  // search station id
  const atcplt = await nmc.autocomplete(kw);
  if (!atcplt.data) throw new Error(atcplt.msg);
  const stationfield = atcplt.data[atcplt.data.findIndex(v => {
    if (v.includes(kw)) return true;
  }) || 0];
  if (!stationfield) return { caption: `不好意思喵, 未找到城市: ${kw}!` };
  const stationid = stationfield.split('|')[0];
  // get weather
  return fromStationId(stationid);
}

export async function fromStationId(s: nmc.StationId) {
  const wrs = await nmc.weather(s);
  if (!wrs.data) return {
    caption: `糟了! 查询 ${s} 失败!\n<pre>${escapeHtmlText(JSON.stringify(wrs, null, 2))}</pre>`
  };
  const w = wrs.data;
  // caption
  const station = (w.real ? w.real : w.predict).station;
  let caption = '';
  caption += `城市🏙: ${station.province} ${station.city}\n`;
  if (w.real) caption +=
    `天气${getWeatherEmojiFromInfo(w.real.weather.info)}: ${w.real.weather.info}\n` +
    `气温🌡: ${w.real.weather.temperature}°C\n` +
    `风力💨: ${w.real.wind.direct === '9999' ? '无直接风向' : w.real.wind.direct} (${w.real.wind.degree === 9999 ? '-' : w.real.wind.degree}) ${w.real.wind.power} (${w.real.wind.speed})\n` +
    `降水💧: ${w.real.weather.rain === 9999 ? '无' : w.real.weather.rain + 'mm'}\n`;
  if (w.air) caption += `空气🌫️: ${w.air.text} ${w.air.aqi === 9999 ? '' : `(${w.air.aqi})`}\n`;
  if (w.real) {
    caption += `日间🌅: ${w.real.sunriseSunset.sunrise.split(' ')[1]} ~ ${w.real.sunriseSunset.sunset.split(' ')[1]}\n`;
    if (w.real.warn && w.real.warn.alert !== '9999')
      caption += `预警🚨: <a href="${nmc.NMC_BASE}${w.real.warn.url}">${w.real.warn.signaltype}${w.real.warn.signallevel}预警</a>\n`;
    caption += `发布${getClockEmojiFromTime(w.real.publish_time)}: ${w.real.publish_time}\n`;
  }
  caption += `来源🌐: <a href="${nmc.NMC_BASE}${station.url}">中央气象台</a>`;
  // image
  const image = await nmc.rader(w.radar);
  // return
  return {
    caption,
    image
  };
}

export async function withInlineKeyboard(data?: string): Promise<{
  caption: string,
  inline_keyboard: InlineKeyboardButton[][]
}> {
  if (!data) {
    // show all provinces
    const inline_keyboard: InlineKeyboardButton[][] = [];
    const pvcal = await nmc.provinceAll();
    let cur: InlineKeyboardButton[] = [];
    for (const e of pvcal.sort((a, b) => a.name.length - b.name.length)) {
      cur.push({ text: e.name, callback_data: 'weather:province:' + e.code });
      if (cur.length >= 4 || e.name.length === 4 || (e.name.length > 4 && cur.length >= 2)) {
        inline_keyboard.push(cur);
        cur = [];
      };
    }
    inline_keyboard.push(cur);
    return { caption: '请选择你要查询的城市所在的省级行政区~', inline_keyboard};
  } else {
    // show all cities in this province
    const cts = await nmc.provinceCity(data);
    const arr = new Array<InlineKeyboardButton[]>;
    let currt = new Array<InlineKeyboardButton>;
    for (const c of cts) {
      currt.push({ text: c.city, callback_data: 'weather:city:' + c.code });
      if (currt.length >= 4) {
        arr.push(currt);
        currt = [];
      }
    }
    arr.push(currt);
    return {
      caption: '请选择你要查询的城市~',
      inline_keyboard: arr
    }
  }
}
