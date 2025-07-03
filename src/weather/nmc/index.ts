import * as logger from '../../logger';

type StationId = string;
type NMCDateTime = `${string}-${string}-${string} ${string}:${string}`;

interface Station {
  city: string,
  code: StationId,
  province: string,
  url: string
}

export const IMAGE_BASE = 'https://image.nmc.cn';

/**
 * 舒适度
 * @see https://www.nmc.cn/
 */
export const ICOMFORT = {
  "i9999": {
    "label": "",
    "color": "#e74936"
  },
  "i4": {
    "label": "很热，极不适应",
    "color": "#e74936"
  },
  "i3": {
    "label": "热，很不舒适",
    "color": "#f57f1f"
  },
  "i2": {
    "label": "暖，不舒适",
    "color": "#FF9900"
  },
  "i1": {
    "label": "温暖，较舒适",
    "color": "#00a44f"
  },
  "i0": {
    "label": "舒适，最可接受",
    "color": "#53aaae"
  },
  "i-1": {
    "label": "凉爽，较舒适",
    "color": "#0079c3"
  },
  "i-2": {
    "label": "凉，不舒适",
    "color": "#2c459c"
  },
  "i-3": {
    "label": "冷，很不舒适",
    "color": "#754783"
  },
  "i-4": {
    "label": "很冷，极不适应",
    "color": "#9b479b"
  }
}

interface WeatherReal {
  publish_time: NMCDateTime,
  station: Station,
  sunriseSunset: {
    sunrise: NMCDateTime,
    sunset: NMCDateTime
  },
  weather: {
    /**
     * 温度
     *
     * 单位: °C
     * 当值为 9999 时无效
     */
    temperature: number,
    /**
     * 降水量
     *
     * 单位: mm
     * 当值为 9999 时无效
     */
    rain: number,
    /**
     * 相对湿度
     *
     * 单位: %
     * 当值为 9999 时无效
     */
    humidity: number,
    /**
     * 舒适度
     *
     * 与 ICOMFORT 配合使用
     * 当值为 9999 时无效
     */
    icomfort: number,
    /**
     * 体感温度
     *
     * 单位: %
     * 当值为 9999 时无效
     */
    feelst: number,
    info: string
  },
  wind: {
    /**
     * 直接风向
     *
     * 当值为 9999 时无效
     */
    direct: string,
    /**
     * 风力
     * 当值为 9999 时无效
     */
    power: string,
    degree: number,
    speed: number
  },
  warn?: {
    /**
     * 预警文本
     *
     * 用于判断是否有预警信息
     * 当值为 9999 时无效
     */
    alert: string,
    /**
     * 预警等级
     *
     * 当值为 9999 时无效
     */
    signallevel: string,
    url: string,
    /**
     * 图片地址
     */
    pic: string
    /**
     * 图片地址基名
     */
    pic2: string
  }
}

/**
 * 空气质量
 * @see https://www.nmc.cn/
 */
export const AQIDICT = [
  null,
  {
    "level": "优",
    "ccolor": "#d9fed7",
    "color": "#32f43e",
    "tcolor": "#000",
    "health": "空气质量令人满意,基本无空气污染。",
    "suggestion": "各类人群可正常活动。",
    "background": "background-position:0 -22px",
    "border": "#6ec129"
  },
  {
    "level": "良 ",
    "ccolor": "#f7f9cd",
    "color": "#e4f33e",
    "tcolor": "#000",
    "health": "空气质量可接受,但某些污染物可能<br/>对极少数异常,敏感人群健康有较弱影响。",
    "suggestion": "极少数异常敏感人群应减少户外活动。",
    "background": "background-position:-41px -22px",
    "border": "#e0cf22"
  },
  {
    "level": "轻度污染 ",
    "ccolor": "#fcebd7",
    "color": "#e19535",
    "tcolor": "#000",
    "health": "易感人群症状有轻度加剧,健康人群<br/>出现刺激症状。",
    "suggestion": "儿童、老年人及心脏病、呼吸系统疾<br/>病患者应减少长时间、高强度的户<br/>外锻炼。",
    "background": "background-position:-82px -22px",
    "border": "#fd5b30"
  },
  {
    "level": "中度污染",
    "ccolor": "#f8d7d9",
    "color": "#ec0800",
    "tcolor": "#fff",
    "health": "进一步加剧易感人群症状,可能对健<br/>康人群心脏、呼吸系统有影响。",
    "suggestion": "儿童、老年人及心脏病、呼吸系统疾<br/>病患者避免长时间、高强度的户外<br/>锻炼,一般人群适量减少户外运动。",
    "background": "background-position:0 -48px",
    "border": "#e10724"
  },
  {
    "level": "重度污染",
    "ccolor": "#ebd7e3",
    "color": "#950449",
    "tcolor": "#fff",
    "health": "心脏病和肺病患者症状显著加剧,运<br/>动耐受力减低,健康人群普遍出现症状。",
    "suggestion": "老年人和心脏病、肺病患者应停留在<br/>室内，停止户外活动，一般人群减<br/>少户外活动。",
    "background": "background-position:-41px -48px",
    "border": "#8f0c50"
  },
  {
    "level": "严重污染",
    "ccolor": "#e7d7dd",
    "color": "#7b001f",
    "tcolor": "#fff",
    "health": "健康人运动耐力减低,有显著强烈症<br/>状,提前出现某些疾病。",
    "suggestion": "老年人和病人应当留在室内，避免体<br/>力消耗，一般人群应避免户外活动。",
    "background": "background-position:-82px -48px",
    "border": "#410468"
  }
];

interface WeatherData {
  real: WeatherReal,
  air: {
    /**
     * 空气质量
     *
     * 与 AQIDICT 对应
     * 当值为 9999 时无效
     */
    aq: number,
    /**
     * 空气质量指数 (AQI)
     */
    aqi: number,
    forecasttime: NMCDateTime,
    text: string
  },
  tempchart: {
    time: `${string}/${string}/${string}`,
    max_temp: number,
    min_temp: number,
    /**
     * 当值为 9999 时无效
     */
    day_img: number,
    /**
     * 当值为 9999 时无效
     */
    day_text: string,
    /**
     * 当值为 9999 时无效
     */
    night_img: string,
    /**
     * 当值为 9999 时无效
     */
    night_text: string
  }[],
  climate: '' | {
    time: string,
    month: {
      month: number,
      maxTemp: number,
      minTemp: number,
      precipitation: number
    }[]
  },
  radar: {
    /**
     * 与 IMAGE_BASE 组合使用
     */
    image: string,
    title: string,
    url: string
  },
  predict: {
    publish_time: NMCDateTime,
    station: Station,
    detail: {
      date: `${string}-${string}-${string}`,
      precipitation: number,
      pt: NMCDateTime,
      day: WeatherPredictWeatherWind,
      night: WeatherPredictWeatherWind
    }[]
  }
}

interface WeatherPredictWeatherWind {
  weather: {
    img: string,
    info: string,
    temperature: string
  },
  wind: {
    direct: string,
    power: string
  }
}

const NMC_API_URLS = {
  position: 'https://www.nmc.cn/rest/position',
  weather: 'https://www.nmc.cn/rest/weather',
  autocomplete: 'https://www.nmc.cn/essearch/api/autocomplete'
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'Referer': 'https://www.nmc.cn/'
};

export async function position(stationid?: StationId) : Promise<Station> {
  const url = NMC_API_URLS.position + (stationid ? `?stationid=${stationid}&` : '?') + '_=' + Date.now();
  logger.info('[weather] [NMCl', url);
  const resp = await fetch(url, {
    headers: {
      ...HEADERS,
      'Accept': 'application/json, */*'
    }
  });
  return await resp.json() as Station;
}

export async function weather(stationid: StationId) : Promise<{
  msg: string,
  code: number,
  data?: WeatherData
}> {
  const url = NMC_API_URLS.weather + (stationid ? `?stationid=${stationid}&` : '?') + '_=' + Date.now();
  logger.info('[weather] [NMCl', url);
  const resp = await fetch(url, {
    headers: {
      ...HEADERS,
      'Accept': 'application/json, */*'
    }
  });
  return await resp.json() as any;
}

export async function autocomplete(q: string, limit = 10): Promise<{
  msg: string,
  code: number,
  data?: string[]
}> {
  const url = NMC_API_URLS.autocomplete + '?' + new URLSearchParams([
    ['q', q],
    ['limit', Math.floor(limit).toString()],
    ['timestamp', Date.now().toString()],
    ['_', Date.now().toString()]
  ]).toString();
  logger.info('[weather] [NMCl', url);
  const resp = await fetch(url, {
    headers: HEADERS
  });
  return await resp.json() as any;
}

function getWeatherEmojiFromInfo(i: string) {
  if (i === '晴') return '☀️';
  else if (i.includes('多云') || i.includes('转阴') || i.includes('转晴')) return '⛅';
  else if (i === '阴') return '☁';
  else if (i === '中雨' || i === '小雨' || i === '大雨') return '🌧';
  else if (i === '雷阵雨') return '⛈️';
  else return '☁️';
}

function getTimeEmojiFromTime(dt: NMCDateTime) {
  // h, m
  let [h, m] = dt.split(' ')[1].split(':').map(Number);
  if (h >= 12) h -= 12;
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

export async function fromKeyword(keyword: string) {
  if (!keyword) return { caption: '查询城市名称不能少于 1 个字符!'};
  // search station id
  const atcplt = (await autocomplete(keyword));
  if (!atcplt.data) throw new Error(atcplt.msg);
  const station = atcplt.data[atcplt.data.findIndex(v => {
    if (v.includes(keyword)) return true;
  }) || 0];
  if (!station) return { caption: `未找到城市: ${keyword}!` };
  const stationid = station.split('|')[0];
  // get weather
  const w = (await weather(stationid)).data;
  if (!w) return { caption: `查询城市 ${keyword} 失败!` };
  const res =
    `城市🏙: ${w.real.station.province} ${w.real.station.city}\n` +
    `天气${getWeatherEmojiFromInfo(w.real.weather.info)}: ${w.real.weather.info}\n` +
    `气温🌡: ${w.real.weather.temperature}°C\n` +
    `风力💨: ${w.real.wind.direct === '9999' ? '无直接风向' : w.real.wind.direct} (${w.real.wind.degree === 9999 ? '-' : w.real.wind.degree}) ${w.real.wind.power} (${w.real.wind.speed})\n` +
    `降水💧: ${w.real.weather.rain === 9999 ? '无' : w.real.weather.rain + 'mm'}\n` +
    `发布${getTimeEmojiFromTime(w.real.publish_time)}: ${w.real.publish_time}\n` +
    `来源🌐: <a href="https://www.nmc.cn${w.real.station.url}">中央气象台</a>`;
  return {
    caption: res,
    image: IMAGE_BASE + w.radar.image
  };
}
