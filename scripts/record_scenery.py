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
  if (shot.theme === 'shanshui') {
    s.GEN.profile.mist.cloudSea = Boolean(shot.cloudSea);
    if (!shot.cloudSea) s.volPass.mat.uniforms.uCloudSea.value.x = 0;
  }
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
  const start = performance.now(); let stableSince=0;
  while (performance.now() - start < 40000) {
    await new Promise(r => setTimeout(r, 200));
    const loaded = [v.pos, v.target].every(p => [...s.ST.chunks.values()].some(c =>
      c.state === 'ready' && c.shown && c.L <= 1 && c.data &&
      p[0] >= c.data.x0 && p[0] < c.data.x0 + c.data.size &&
      p[2] >= c.data.z0 && p[2] < c.data.z0 + c.data.size));
    const idle=loaded && s.ST.inflight===0 && s.ST.ready.length===0 && s.ST.queue.length===0;
    if(idle){if(!stableSince)stableSince=performance.now();}else stableSince=0;
    if (performance.now() - start > 4000 && stableSince && performance.now()-stableSince>1500) {
      return {place:shot.place, loaded:true, camera:v.pos, target:v.target};
    }
  }
  throw Error('Destination chunks did not become ready: ' + shot.place);
}"""

RECORD = r"""async options => {
  const {seconds,width,height,fps=30} = options;
  const s = window.__sv, record = window.__recordShot;
  const source = s.renderer.domElement, {pos,target} = record.vantage;
  if (source.width !== width || source.height !== height) throw Error('Native render canvas must match recording resolution');
  if (!s.state.stableCapture) throw Error('Stable capture mode must be enabled');
  if (s.state.quality !== 'high' && options.quality === 'high') throw Error('High quality must remain enabled');
  const stage = document.createElement('canvas');stage.width=width;stage.height=height;
  const ctx=stage.getContext('2d',{alpha:false}), sample=document.createElement('canvas');
  sample.width=64;sample.height=36;const read=sample.getContext('2d',{willReadFrequently:true});
  const stream=stage.captureStream(0),track=stream.getVideoTracks()[0];
  if (typeof track.requestFrame !== 'function') throw Error('Manual canvas frame capture is required');
  const mime=['video/mp4;codecs=avc1.640033','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw Error('No supported native video encoder');
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:50000000}),chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const finished=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(Error(e.error?.message||'Native recording failed'));});
  const previousHook=window.__frameHook,brightness=[];
  let start=0,lastCapture=-Infinity,captured=0,maxCloudSeaStrength=0,hookError=null,previous=0;
  const title=(record.shot.theme==='shanshui'?'山水中国':'花见日本')+'  /  '+record.shot.title;
  const scale=width/1920;
  try {
    window.__frameHook=()=>{
      try {
        previousHook?.();const now=performance.now();
        if(!start){start=now;previous=now;}
        record.intervals.push(now-previous);previous=now;record.frameCount++;
        maxCloudSeaStrength=Math.max(maxCloudSeaStrength,s.volPass.mat.uniforms.uCloudSea.value.x);
        if(record.shot.theme==='shanshui'&&!record.shot.cloudSea&&maxCloudSeaStrength>0)throw Error('Chinese cloud sea must stay disabled');
        if(now-lastCapture>=1000/fps-1){
          // Copy only after the complete composer render, before WebGL buffer disposal.
          ctx.drawImage(source,0,0);
          ctx.font=`500 ${28*scale}px system-ui`;const box=ctx.measureText(title).width+40*scale;
          ctx.fillStyle='rgba(11,17,32,0.5)';ctx.fillRect(32*scale,height-82*scale,box,50*scale);
          ctx.fillStyle='#d5b77b';ctx.fillRect(32*scale,height-82*scale,2*scale,50*scale);
          ctx.fillStyle='#f5ead7';ctx.fillText(title,52*scale,height-48*scale);
          read.drawImage(stage,0,0,64,36);const pixels=read.getImageData(0,0,64,36).data;
          let total=0;for(let i=0;i<pixels.length;i+=4)total+=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
          const mean=total/(64*36);brightness.push(mean);
          if(mean<2)throw Error('Unexpected black render frame');
          if(recorder.state==='inactive')recorder.start(1000);
          track.requestFrame();captured++;
          lastCapture = lastCapture === -Infinity ? now : lastCapture + 1000/fps;
          if (lastCapture < now - 1000/fps) lastCapture = now;
        }
        const t=Math.min(1,(now-start)/(seconds*1000)),yaw=Math.atan2(pos[0]-target[0],pos[2]-target[2]);
        const drift=0,x=pos[0]+Math.cos(yaw)*drift,z=pos[2]-Math.sin(yaw)*drift;
        const y=Math.max(pos[1],s.GEN.heightAt(x,z)+2);
        if(y>250)throw Error('Camera path exceeded altitude limit');
        s.goCam(x,y,z,...target);
      }catch(e){hookError=e;}
    };
    const waiting=performance.now();
    while(!start || performance.now()-start<seconds*1000){
      await new Promise(r=>setTimeout(r,25));
      if(hookError)throw hookError;
      if(start && performance.now()-previous>1500)throw Error('Rendering stalled during capture');
      if(!start&&performance.now()-waiting>15000)throw Error('Rendered frame hook did not start');
    }
    window.__frameHook=previousHook;
    const renderElapsed=(performance.now()-start)/1000;
    recorder.stop();await finished;
    if(captured/seconds<12)throw Error('Insufficient native capture cadence');
    window.__recordBlob=new Blob(chunks,{type:recorder.mimeType});
    const errors=s.LOG.entries.filter(e=>e.level==='error');if(errors.length)throw Error(JSON.stringify(errors));
    const elapsed=(performance.now()-start)/1000;
    return {...record.shot,seed:s.state.seed,quality:s.state.quality,camera:pos,target,
      feature:{x:record.feature.x,z:record.feature.z,h:record.feature.h},viewport:[innerWidth,innerHeight],
      canvas:[source.width,source.height],pixelRatio:s.renderer.getPixelRatio(),cloudSeaEnabled:Boolean(s.GEN.profile.mist.cloudSea),
      maxCloudSeaStrength,recordedLive:true,renderFrames:record.frameCount,elapsedSeconds:elapsed,
      meanRenderFPS:record.frameCount/renderElapsed,capturedFrames:captured,captureFPS:captured/renderElapsed,
      stableCapture:s.state.stableCapture,captureMethod:'completed-render-canvas',
      nativeMimeType:recorder.mimeType,nativeBytes:window.__recordBlob.size,
      brightness:{min:Math.min(...brightness),max:Math.max(...brightness),maxDelta:Math.max(0,...brightness.slice(1).map((v,i)=>Math.abs(v-brightness[i])))},errors};
  }finally{
    window.__frameHook=previousHook;
    if(recorder.state!=='inactive'){recorder.stop();await finished;}
    track.stop();
  }
}"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='https://myriad-worlds.pages.dev/')
    parser.add_argument('--out', type=Path, default=ROOT / 'output' / 'media')
    parser.add_argument('--session', default='myriad-scenery')
    parser.add_argument('--cli', default=os.environ.get('PLAYWRIGHT_CLI', 'npx --yes --package @playwright/cli playwright-cli'))
    parser.add_argument('--reuse-session', action='store_true')
    parser.add_argument('--seed', default='sakura')
    parser.add_argument('--seconds', type=float, default=7)
    parser.add_argument('--format', choices=['landscape','portrait'], default='landscape')
    parser.add_argument('--quality', choices=['high','lite'], default='high')
    parser.add_argument('--resolution', choices=['720p','1080p','4k'], default='4k')
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
    width,height = {'720p':(1280,720),'1080p':(1920,1080),'4k':(3840,2160)}[args.resolution]
    if args.format == 'portrait': width,height = height,width
    name = 'scenery-tour' + ('-4k' if args.resolution == '4k' else '') + ('' if args.format == 'landscape' else '-portrait')
    manifest = {'sourceURL':args.url,'seed':args.seed,'encodedFPS':30,'recordedLive':True,
        'captureMethod':'completed-render-canvas','resolution':[width,height],'perShotBlackFades':False,'encodingCRF':18,'shots':[]}
    opened = False
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
                query.update(theme=shot['theme'],seed=args.seed,q=args.quality,mood=shot['mood'],nointro='1',capture='stable')
                command('goto',urlunsplit((parts.scheme,parts.netloc,parts.path,urlencode(query),parts.fragment)))
                command('run-code','async page => { await page.waitForFunction(() => window.__sv?.ready && !document.getElementById("loader"), null, {timeout:45000}); }')
                current_theme = shot['theme']
            evaluate(PREPARE,shot)
            metadata = evaluate(RECORD,{'seconds':args.seconds,'width':width,'height':height,'fps':30,'quality':args.quality})
            raw = work / (f'{i:02d}-native.mp4' if metadata['nativeMimeType'].startswith('video/mp4') else f'{i:02d}-native.webm')
            clip = work / f'{i:02d}.mp4'
            download_code='async page => { const pending=page.waitForEvent("download",{timeout:15000}); await page.evaluate(() => { const a=document.createElement("a");a.href=window.__recordDownloadURL=URL.createObjectURL(window.__recordBlob);a.download="native-capture";document.body.appendChild(a);a.click();a.remove(); }); const download=await pending;await download.saveAs('+json.dumps(str(raw))+'); await page.evaluate(() => { URL.revokeObjectURL(window.__recordDownloadURL);window.__recordBlob=null; }); }'
            command('run-code',download_code)
            native_probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','stream=width,height,nb_read_frames:format=duration','-of','json',str(raw)],text=True))
            native_video=native_probe['streams'][0]
            native_frames=int(native_video['nb_read_frames']);native_duration=float(native_probe['format']['duration'])
            if native_frames<max(args.seconds*12,metadata['capturedFrames']*.8) or native_duration<args.seconds-.5:
                raise RuntimeError('Native encoder delivered deficient frames or duration')
            metadata['nativeDecodedFrames']=native_frames;metadata['nativeDurationSeconds']=native_duration
            if metadata['viewport'] != [width,height] or metadata['canvas'] != [width,height]:
                raise RuntimeError('Native recording dimensions changed')
            command('screenshot',f'--filename={work / (str(i).zfill(2) + ".png")}')
            ffmpeg('-i',str(raw),'-t',str(args.seconds),'-an','-vf',f'fps=30,tpad=stop_mode=clone:stop_duration=1,trim=duration={args.seconds},setsar=1',
                '-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(clip))
            clips.append(clip); manifest['shots'].append(metadata)
            LOG.info('Recorded %s (%s bytes, live %.1f FPS)',shot['title'],clip.stat().st_size,metadata['meanRenderFPS'])
        concat = work / 'concat.txt'
        concat.write_text(''.join("file '" + str(p).replace("'","'\\''") + "'\n" for p in clips))
        destination = args.out / (name + '.mp4')
        ffmpeg('-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(destination))
        probe = subprocess.run(['ffprobe','-v','error','-show_entries','stream=width,height,avg_frame_rate:format=duration,size','-of','json',str(destination)],capture_output=True,text=True,check=True)
        manifest['video'] = json.loads(probe.stdout)
        manifest['requestedDurationSeconds'] = len(shots) * args.seconds
        video=manifest['video']['streams'][0]
        if [video['width'],video['height']] != [width,height] or video['avg_frame_rate'] != '30/1':
            raise RuntimeError('Encoded movie changed resolution or frame rate')
        if abs(float(manifest['video']['format']['duration'])-manifest['requestedDurationSeconds'])>1/30:
            raise RuntimeError('Encoded movie duration differs from requested shot plan')
        (args.out / (name + '.json')).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        ffmpeg('-ss','2','-i',str(destination),'-frames:v','1','-q:v','2',str(args.out / (name + '-poster.jpg')))
        ffmpeg('-ss','1','-t','5','-i',str(destination),'-filter_complex','[0:v]fps=10,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse',str(args.out / (name + '-preview.gif')))
        LOG.info('Complete: %s (%s bytes)',destination,destination.stat().st_size)
    finally:
        if opened:
            command('close')


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO,format='%(levelname)s [scenery] %(message)s')
    try:
        main()
    except Exception:
        LOG.exception('Scenery recording failed')
        raise
