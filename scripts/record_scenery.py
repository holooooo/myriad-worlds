#!/usr/bin/env python3
"""Record live scenery at named places/weather, then join an MP4 and GIF preview.

Requires Playwright CLI, ffmpeg, ffprobe and a running release URL. Browser/GPU
rendering is recorded as it happens; frame rate is measured, never simulated.
"""
import argparse
import json
import logging
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

LOG = logging.getLogger('scenery')
ROOT = Path(__file__).resolve().parents[1]
MOODS = {'morning', 'golden', 'dusk', 'night', 'rain'}
SHOTS = [
    {'theme': 'shanshui', 'place': 'LAKE', 'mood': 'morning', 'title': '九寨彩湖 · 晨雾', 'distance': 210, 'height': 43},
    {'theme': 'shanshui', 'place': 'palace', 'mood': 'golden', 'title': '王宫御苑 · 暮光', 'distance': 100, 'height': 30},
    {'theme': 'shanshui', 'place': 'BAMBOO', 'mood': 'rain', 'title': '江南竹海 · 细雨', 'distance': 85, 'height': 24},
    {'theme': 'shanshui', 'place': 'waterPavilion', 'mood': 'dusk', 'title': '湖心亭榭 · 薄暮', 'distance': 75, 'height': 20},
    {'theme': 'shanshui', 'place': 'changan', 'mood': 'night', 'title': '长安灯市 · 月夜', 'distance': 125, 'height': 38},
    {'theme': 'sakura', 'place': 'temple', 'mood': 'morning', 'title': '山寺古院 · 晨雾', 'distance': 78, 'height': 24},
    {'theme': 'sakura', 'place': 'SAKURA', 'mood': 'golden', 'title': '樱花山林 · 暮光', 'distance': 85, 'height': 26},
    {'theme': 'sakura', 'place': 'LAKE', 'mood': 'rain', 'title': '湖畔雨景 · 细雨', 'distance': 105, 'height': 24},
    {'theme': 'sakura', 'place': 'shrine', 'mood': 'dusk', 'title': '朱红神社 · 薄暮', 'distance': 64, 'height': 22},
    {'theme': 'sakura', 'place': 'castle', 'mood': 'night', 'title': '大名城下町 · 月夜', 'distance': 95, 'height': 30},
]

PREPARE = r"""async shot => {
  const s = window.__sv;
  s.stopTour(); s.stopFollow(false); s.I18N.setLanguage('zh');
  s.setMood(shot.mood, true);
  document.querySelector('[data-sky-reset]')?.click();
  const key = s.GEN.B[shot.place] ?? shot.place;
  const f = s.GEN.findBiome(key, 0, 0, 12000);
  if (!f) throw Error('Missing destination: ' + shot.place);
  const v = s.GEN.vantage(f, shot.distance, shot.height);
  const minY = s.GEN.heightAt(v.pos[0], v.pos[2]) + 2;
  if (v.pos[1] > 250 || v.pos[1] < minY) throw Error('Unsafe camera height');
  s.goCam(...v.pos, ...v.target);
  document.body.classList.add('hidden-ui');
  document.querySelector('#recordCaption')?.remove();
  const caption = document.createElement('div'); caption.id = 'recordCaption';
  caption.textContent = (shot.theme === 'shanshui' ? '山水中国' : '花见日本') + '  /  ' + shot.title;
  Object.assign(caption.style, { position:'fixed', left:'28px', bottom:'28px',
    color:'#f5ead7', font:'500 18px system-ui', letterSpacing:'.12em',
    padding:'10px 16px', borderLeft:'2px solid #d5b77b', background:'#0b112080',
    textShadow:'0 1px 4px #000', zIndex:'100', pointerEvents:'none' });
  document.body.appendChild(caption);
  window.__recordShot = { shot, feature:f, vantage:v, frameCount:0, intervals:[] };
  const start = performance.now();
  while (performance.now() - start < 20000) {
    await new Promise(r => setTimeout(r, 200));
    const loaded = [v.pos, v.target].every(p => [...s.ST.chunks.values()].some(c =>
      c.state === 'ready' && c.shown && c.L <= 1 && c.data &&
      p[0] >= c.data.x0 && p[0] < c.data.x0 + c.data.size &&
      p[2] >= c.data.z0 && p[2] < c.data.z0 + c.data.size));
    if (performance.now() - start > 4000 && loaded) {
      await new Promise(r => setTimeout(r, 1500));
      return {place:shot.place, loaded:true, camera:v.pos, target:v.target};
    }
  }
  throw Error('Destination chunks did not become ready: ' + shot.place);
}"""

RECORD = r"""async seconds => {
  const s = window.__sv, record = window.__recordShot;
  const {pos, target} = record.vantage;
  const start = performance.now(); let previous = start;
  while (performance.now() - start < seconds * 1000) {
    await new Promise(requestAnimationFrame);
    const now = performance.now(), t = Math.min(1, (now - start) / (seconds * 1000));
    record.intervals.push(now - previous); previous = now; record.frameCount++;
    // A tiny lateral drift keeps terrain/building clearance from the inspected vantage.
    const yaw = Math.atan2(pos[0] - target[0], pos[2] - target[2]);
    const drift = Math.sin(t * Math.PI / 2) * 2.0;
    const x = pos[0] + Math.cos(yaw) * drift, z = pos[2] - Math.sin(yaw) * drift;
    const y = Math.max(pos[1], s.GEN.heightAt(x,z) + 2);
    if (y > 250) throw Error('Camera path exceeded world altitude limit');
    s.goCam(x, y, z, ...target);
  }
  const errors = s.LOG.entries.filter(e => e.level === 'error');
  if (errors.length) throw Error(JSON.stringify(errors));
  const elapsed = (performance.now() - start) / 1000;
  return {...record.shot, seed:s.state.seed, quality:s.state.quality,
    camera:pos, target, feature:{x:record.feature.x,z:record.feature.z,h:record.feature.h},
    viewport:[innerWidth,innerHeight], recordedLive:true, renderFrames:record.frameCount,
    elapsedSeconds:elapsed, meanRenderFPS:record.frameCount/elapsed, errors};
}"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='https://myriad-worlds.pages.dev/')
    parser.add_argument('--out', type=Path, default=ROOT / 'docs/media')
    parser.add_argument('--session', default='myriad-scenery')
    parser.add_argument('--cli', default=os.environ.get('PLAYWRIGHT_CLI', 'npx --yes --package @playwright/cli playwright-cli'))
    parser.add_argument('--reuse-session', action='store_true')
    parser.add_argument('--seed', default='sakura')
    parser.add_argument('--seconds', type=float, default=7)
    parser.add_argument('--format', choices=['landscape','portrait'], default='landscape')
    parser.add_argument('--quality', choices=['high','lite'], default='high')
    parser.add_argument('--themes', nargs='+', choices=['shanshui','sakura'], default=['shanshui','sakura'])
    parser.add_argument('--shots', type=Path, help='Custom JSON array using the preset shot schema')
    parser.add_argument('--dry-run', action='store_true', help='Print the validated shot plan without opening a browser')
    args = parser.parse_args()
    if not 1 <= args.seconds <= 20:
        parser.error('--seconds must be between 1 and 20 (each CLI operation stays bounded)')
    shots = json.loads(args.shots.read_text()) if args.shots else SHOTS
    if not isinstance(shots, list) or not shots:
        parser.error('--shots must contain a nonempty JSON array')
    for shot in shots:
        if not isinstance(shot, dict) or shot.get('theme') not in ('shanshui','sakura') or shot.get('mood') not in MOODS:
            parser.error('Each shot requires a supported theme and mood')
        if not isinstance(shot.get('place'), (str,int)) or not isinstance(shot.get('title'), str):
            parser.error('Each shot requires a place and a title')
        if any(not isinstance(shot.get(k),(int,float)) or not 0 < shot[k] <= 400 for k in ('distance','height')):
            parser.error('Each shot requires positive distance/height, at most 400')
    shots = [s for s in shots if s['theme'] in args.themes]
    if not shots:
        parser.error('The selected themes have no shots')
    if args.dry_run:
        print(json.dumps({'shots':shots,'secondsPerShot':args.seconds,'format':args.format},ensure_ascii=False,indent=2))
        return
    for tool in ('ffmpeg','ffprobe'):
        if not shutil.which(tool):
            parser.error(f'{tool} must be installed')
    cli = shlex.split(args.cli) + ['-s=' + args.session]
    def command(*items):
        result = subprocess.run(cli + list(items),capture_output=True,text=True,timeout=55)
        if result.returncode or '### Error' in result.stdout:
            raise RuntimeError(result.stdout + result.stderr)
        return result.stdout
    def evaluate(function, argument):
        output = command('eval', 'async () => (' + function + ')(' + json.dumps(argument,ensure_ascii=False) + ')')
        match = re.search(r'### Result\n(.*?)\n###',output,re.S)
        if not match:
            raise RuntimeError('Missing recording result: ' + output)
        return json.loads(match.group(1))
    def ffmpeg(*items):
        result = subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*items],capture_output=True,text=True)
        if result.returncode:
            raise RuntimeError(result.stderr)
    args.out.mkdir(parents=True,exist_ok=True)
    work = ROOT / 'output' / 'scenery' / args.session / args.format
    work.mkdir(parents=True,exist_ok=True)
    width,height = (1280,720) if args.format == 'landscape' else (720,1280)
    name = 'scenery-tour' + ('' if args.format == 'landscape' else '-portrait')
    manifest = {'sourceURL':args.url,'seed':args.seed,'encodedFPS':30,'recordedLive':True,'shots':[]}
    recording = opened = False
    clips = []
    try:
        if not args.reuse_session:
            command('open','about:blank','--browser=chrome'); opened = True
        command('resize',str(width),str(height))
        current_theme = None
        for i, shot in enumerate(shots):
            LOG.info('Preparing %s / %s (%s)',shot['theme'],shot['title'],shot['mood'])
            if current_theme != shot['theme']:
                parts = urlsplit(args.url)
                query = dict(parse_qsl(parts.query))
                query.update(theme=shot['theme'],seed=args.seed,q=args.quality,mood=shot['mood'],nointro='1')
                command('goto',urlunsplit((parts.scheme,parts.netloc,parts.path,urlencode(query),parts.fragment)))
                command('run-code','async page => { await page.waitForFunction(() => window.__sv?.ready && !document.getElementById("loader"), null, {timeout:45000}); }')
                current_theme = shot['theme']
            evaluate(PREPARE,shot)
            raw = work / f'{i:02d}.webm'; clip = work / f'{i:02d}.mp4'
            command('video-start',str(raw),f'--size={width}x{height}','--fps=30'); recording = True
            try:
                metadata = evaluate(RECORD,args.seconds)
            finally:
                command('video-stop'); recording = False
            if metadata['viewport'] != [width,height]:
                raise RuntimeError('Recording viewport changed')
            command('screenshot',f'--filename={work / (str(i).zfill(2) + ".png")}')
            ffmpeg('-i',str(raw),'-t',str(args.seconds),'-an','-vf',f'fps=30,setsar=1,fade=t=in:d=0.2,fade=t=out:st={args.seconds-0.25}:d=0.25',
                '-c:v','libx264','-preset','medium','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',str(clip))
            clips.append(clip); manifest['shots'].append(metadata)
            LOG.info('Recorded %s (%s bytes, live %.1f FPS)',shot['title'],clip.stat().st_size,metadata['meanRenderFPS'])
        concat = work / 'concat.txt'
        concat.write_text(''.join("file '" + str(p).replace("'","'\\''") + "'\n" for p in clips))
        destination = args.out / (name + '.mp4')
        ffmpeg('-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(destination))
        probe = subprocess.run(['ffprobe','-v','error','-show_entries','stream=width,height,avg_frame_rate:format=duration,size','-of','json',str(destination)],capture_output=True,text=True,check=True)
        manifest['video'] = json.loads(probe.stdout)
        manifest['requestedDurationSeconds'] = len(shots) * args.seconds
        (args.out / (name + '.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        ffmpeg('-ss','2','-i',str(destination),'-frames:v','1','-q:v','2',str(args.out / (name + '-poster.jpg')))
        ffmpeg('-ss','1','-t','5','-i',str(destination),'-filter_complex','[0:v]fps=10,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse',str(args.out / (name + '-preview.gif')))
        LOG.info('Complete: %s (%s bytes)',destination,destination.stat().st_size)
    finally:
        if recording:
            command('video-stop')
        if opened:
            command('close')


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO,format='%(levelname)s [scenery] %(message)s')
    try:
        main()
    except Exception:
        LOG.exception('Scenery recording failed')
        raise
