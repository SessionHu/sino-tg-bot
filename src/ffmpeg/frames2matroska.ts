import { execNoShell } from '../shell';
import * as logger from '../logger';

import type { IncomingHttpHeaders } from 'node:http';

import pLimit from 'p-limit';

const limit = pLimit(8);

async function fetchAllFrames(urls: string[], headers?: IncomingHttpHeaders & NodeJS.Dict<string>): Promise<Buffer> {
  const res: Promise<Buffer>[] = urls.map(async (url) => {
    return limit(async () => {
      const resp = await fetch(url, { headers });
      const buf = await resp.arrayBuffer();
      return Buffer.from(buf);
    });
  });
  return Buffer.concat(await Promise.all(res));
}

export async function fromURLs(urls: string[], headers?: IncomingHttpHeaders & NodeJS.Dict<string>): Promise<Buffer> {
  // timestamp
  const tshex = Date.now().toString(16);
  logger.info('[ffmpeg] [frames2matroska] Start:', tshex);
  // download pngs
  const frameFiles = await fetchAllFrames(urls, headers);
  // build args
  const ffmpegArgs = [
    '-hide_banner',
    '-y', // 覆盖警告
    '-loglevel', 'error', // 减少日志输出
    '-f', 'image2pipe',
    '-hwaccel', 'auto',
    '-r', '5',
    '-i', 'pipe:0',
    '-filter_complex', 'scale=w=trunc(iw/2)*2:h=trunc(ih/2)*2:flags=lanczos',
    '-r:v', '5',
    '-codec:v', 'libx264',
    '-preset', 'slow',
    '-crf', '26',
    '-pix_fmt', 'yuv420p', // 兼容性最好的像素格式
    '-tune', 'stillimage', // 针对静态图像优化
    '-f', 'matroska',
    'pipe:1'
  ];
  // execute
  const { stderr, stdout } = await execNoShell('ffmpeg', ffmpegArgs, null, true, frameFiles);
  //logger.debug(por);
  // test file
  if (!stdout || stdout.length < 64) throw new Error(stderr.toString('utf8'));
  // return
  logger.info('[ffmpeg] [frames2matroska] Done:', tshex);
  return stdout;
}
