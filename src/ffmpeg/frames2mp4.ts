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
      '--timeout=2',
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
  const filterComplex = `${concatInputs}concat=n=${frames.length}:v=1:a=0`;

  const mp4path = join(tmpdir(), Date.now().toString(16) + '.mp4');
  ffmpegArgs.push(
    '-filter_complex', filterComplex,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-f', 'mp4',
    mp4path
  );

  // 4. 执行 FFmpeg
  await execNoShell('ffmpeg', ffmpegArgs);
  for await (const f of frameFiles) rm(f.url).catch(logger.warn);
  const mp4buf = await readFile(mp4path);
  rm(mp4path).catch(logger.warn);
  return mp4buf;
}
