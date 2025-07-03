import { execNoShell } from '../shell';
import * as logger from '../logger';

import { HEADERS } from '../weather/nmc';

import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

export async function fromURLs(frames: Array<{
  url: string;
  /** 单帧时长 (秒) */
  duration: number;
}>): Promise<Buffer> {

  const frameFiles = frames.map(async e => {
    const filepath = join(tmpdir(), basename(e.url));
    await execNoShell('wget', [
      e.url,
      '--random-wait',
      '--timeout=4',
      '-U', HEADERS['User-Agent'],
      '-O', filepath
    ]);
    return { url: filepath, duration: e.duration };
  });


  // 1. 构建 FFmpeg 参数
  const ffmpegArgs = [
    '-hide_banner',
    '-y' // 覆盖警告
  ];

  // 2. 添加每个帧的输入参数
  for await (const f of frameFiles) {
    ffmpegArgs.push(
      '-loop', '1',
      '-t', f.duration.toString(),
      '-i', f.url
    );
  }

  // 3. 构建滤镜链
  const concatInputs = frames.map((_, i) => `[${i}]`).join('');
  const filterComplex =
    // concat images
    `${concatInputs}concat=n=${frames.length}:v=1:a=0,` +
    // scale to can be divided to 2
    'scale=w=trunc(iw/2)*2:h=trunc(ih/2)*2:flags=lanczos';

  const mp4path = join(tmpdir(), Date.now().toString(16) + '.mp4');
  ffmpegArgs.push(
    '-filter_complex', filterComplex,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-pix_fmt', 'yuv420p', // 兼容性最好的像素格式
    '-movflags', '+faststart', // 优化网络流式播放
    '-f', 'mp4',
    mp4path
  );

  // 4. 执行 FFmpeg
  const por = await execNoShell('ffmpeg', ffmpegArgs);
  for await (const f of frameFiles) rm(f.url).catch(logger.warn);
  const mp4buf = await readFile(mp4path);
  rm(mp4path).catch(logger.warn);
  if (mp4buf.length <= 8) throw new Error(por);
  return mp4buf;
}
