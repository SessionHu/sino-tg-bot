import { execNoShell } from '../shell';
import * as logger from '../logger';

import { HEADERS } from '../weather/nmc';

import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

import pLimit from 'p-limit';

const limit = pLimit(16);

export async function fromURLs(urls: string[]): Promise<Buffer> {
  // get timestamp for temp file names
  const tshex = Date.now().toString(16);
  // download pngs
  let extn: string = '.PNG';
  const frameFiles = urls.map(async (e, i) => {
    const filepath = join(tmpdir(), tshex + '-' + i.toString().padStart(2, '0') + (extn = extname(new URL(e).pathname)));
    return limit(async () => {
      await execNoShell('wget', [
        e,
        '--random-wait',
        '--timeout=4',
        '-U', HEADERS['User-Agent'],
        '-O', filepath
      ]);
      return filepath;
    });
  });
  // build args
  const mp4path = join(tmpdir(), tshex + '.mp4');
  const ffmpegArgs = [
    '-hide_banner',
    '-y', // 覆盖警告
    '-loglevel', 'error', // 减少日志输出
    '-hwaccel', 'auto',
    '-r', '5',
    '-i', join(tmpdir(), tshex + '-%02d' + extn),
    '-filter_complex', 'scale=w=trunc(iw/2)*2:h=trunc(ih/2)*2:flags=lanczos',
    '-r:v', '5',
    '-codec:v', 'libx264',
    '-preset', 'slower',
    '-pix_fmt', 'yuv420p', // 兼容性最好的像素格式
    '-movflags', '+faststart', // 优化网络流式播放
    '-tune', 'stillimage', // 针对静态图像优化
    '-f', 'mp4',
    mp4path
  ];
  // wait for pngs downloaded
  await Promise.all(frameFiles);
  // execute
  const por = await execNoShell('ffmpeg', ffmpegArgs);
  //logger.debug(por);
  // rm pngs
  for await (const f of frameFiles) rm(f).catch(logger.warn);
  // read video file
  const mp4buf = await readFile(mp4path).catch(logger.warn);
  // rm video file
  rm(mp4path).catch(logger.warn);
  // test file
  if (!mp4buf || mp4buf.length < 64) throw new Error(por);
  // return
  logger.info('[ffmpeg] [frames2mp4] OK:', tshex);
  return mp4buf;
}
