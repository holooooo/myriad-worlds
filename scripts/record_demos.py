#!/usr/bin/env python3
"""Record four real browser demos with Playwright CLI and encode with ffmpeg.

Run the local release server first. No generated scenery or synthetic frames.
"""
import argparse
import json
import logging
import os
import re
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile

logging.basicConfig(level=logging.INFO, format="%(levelname)s [record] %(message)s")
parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://127.0.0.1:8765/dist/")
parser.add_argument("--out", type=Path, default=Path("docs/media"))
parser.add_argument("--session", default="myriad-record")
parser.add_argument("--cli", default=os.environ.get("PLAYWRIGHT_CLI", "npx --yes --package @playwright/cli playwright-cli"))
parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
parser.add_argument("--themes", nargs="+", choices=["shanshui", "sakura"], default=["shanshui", "sakura"])
parser.add_argument("--formats", nargs="+", choices=["landscape", "portrait"], default=["landscape", "portrait"])
parser.add_argument("--reuse-session", action="store_true")
args = parser.parse_args()
cli = shlex.split(args.cli) + ["-s=" + args.session]
args.out.mkdir(parents=True, exist_ok=True)


def command(*items):
    result = subprocess.run(cli + list(items), capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    if "### Error" in result.stdout:
        raise RuntimeError(result.stdout)
    return result.stdout


# Each scene is rendered live. Parameter ramps drive the actual range controls,
# including normal persistence/logging and atmosphere/environment updates.
timeline = r"""async () => {
 const s=window.__sv, wait=ms=>new Promise(r=>setTimeout(r,ms));
 const caption=document.createElement('div');caption.id='recordCaption';
 Object.assign(caption.style,{position:'fixed',left:'50%',bottom:'18px',transform:'translateX(-50%)',background:'#111e20c9',color:'#f2efdf',font:'14px system-ui',padding:'8px 14px',zIndex:2000,pointerEvents:'none',whiteSpace:'nowrap'});
 document.body.appendChild(caption);
 const label=t=>caption.textContent=t;
 const set=(key,value)=>{const el=document.getElementById('sky-'+key);if(!el)throw Error('Missing sky control '+key);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));};
 const ramp=async (key,from,to,ms)=>{const start=performance.now();while(performance.now()-start<ms){const t=Math.min(1,(performance.now()-start)/ms),u=t*t*(3-2*t);set(key,from+(to-from)*u);await wait(100);}set(key,to);};
 const cleanMood=(name)=>{s.setMood(name,true);document.querySelector('[data-sky-reset]').click();};
 window.__demoPhases=[async()=>{
 s.I18N.setLanguage('zh');s.stopFollow(false);s.stopTour();
 for(const mood of ['golden','morning','rain','dusk','night'])cleanMood(mood);
 s.setMood('golden',true);s.startTour({mode:'orbit'});
 for(let i=0;i<180 && !s.cinematic.ready;i++)await wait(100);
 if(!s.cinematic.ready)throw Error('Cinematic camera did not become ready');
 },async()=>{label('巡游 · 遮挡检测与缓慢环绕');await wait(5500);
 label('晨雾 · 云量平滑变化');s.setMood('morning');await ramp('cloudAmount',.2,.75,5500);
 },async()=>{label('细雨 · 时间与天气渐变');s.setMood('rain');await wait(5500);
 label('薄暮 · 红移与日月同辉');s.setMood('dusk');set('sunMoon',true);await ramp('sunRedshift',0,.8,5500);
 },async()=>{label('月夜 · 星空与灯火');s.setMood('night');await ramp('starBrightness',.4,1.2,4500);
 s.stopTour();s.setMood('golden',true);const c=s.TRAIN.cars[0].g.position;s.goCam(c.x,c.y+4,c.z+8,c.x+30,c.y+3,c.z);await wait(1500);
 if(!s.startFollow('train-0'))throw Error('Missing real locomotive');
 label('火车 · 默认车头第一视角');await wait(3500);s.setFollowViewMode('side');label('火车 · 侧面第三视角');await wait(4500);s.stopFollow(false);
 },async()=>{label('月相 · 大小、光晕与亮度');s.setMood('night',true);const p=s.camera.position.clone();s.goCam(p.x,p.y+12,p.z,p.x+35,p.y+74,p.z-70);set('moonDiameter',4);set('moonHalo',.55);set('moonBrightness',.85);
 await ramp('moonPhase',.18,.5,2500);await ramp('moonPhase',.5,.75,2500);
 },async()=>{label('巨行星 · 星环与默认自转');s.setMood('dusk',true);const f=s.GEN.findBiome(s.state.theme==='shanshui'?'palace':'castle',0,0,12000);if(!f)throw Error('Missing themed landmark');
 const v=s.GEN.vantage(f,100,26);s.goCam(...v.pos,...v.target);await wait(1300);
 const d=s.camera.getWorldDirection(s.camera.position.clone());set('planetAzimuth',(Math.atan2(d.x,d.z)*180/Math.PI+360)%360);set('planetElevation',20);set('planetSize',44);set('planetType','ice-rings');await wait(3000);set('planetType','gas-giant');await wait(3000);set('planetType','near-rings');await wait(3000);
 label('天空 · 独立折叠控制');document.getElementById('skyPanel').open=true;document.querySelector('[data-sky-group=sun]').open=false;document.querySelector('[data-sky-group=moon]').open=true;document.querySelector('[data-sky-group=planet]').open=true;await wait(2300);
 document.getElementById('skyPanel').open=false;caption.remove();s.stopFollow(false);s.stopTour();
 },async()=>{const errors=s.LOG.entries.filter(e=>e.level==='error');if(errors.length)throw Error(JSON.stringify(errors));return {theme:s.state.theme,errors,viewport:[innerWidth,innerHeight],recordedLive:true};}];
 return {phases:window.__demoPhases.length};
}"""

try:
    if not args.reuse_session:
        command("open", args.url)
    with tempfile.TemporaryDirectory(prefix="myriad-record-") as tmp:
        for theme in args.themes:
            for shape in args.formats:
                width, height = (1280, 720) if shape == "landscape" else (720, 1280)
                name = ("china" if theme == "shanshui" else "japan") + ("-16x9" if shape == "landscape" else "-9x16")
                logging.info("access: recording requested %s (%sx%s)", name, width, height)
                command("resize", str(width), str(height))
                separator = "&" if "?" in args.url else "?"
                command("goto", args.url + separator + "theme=" + theme + "&seed=sakura&q=high&mood=golden&nointro=1")
                command("run-code", "async page => { await page.waitForFunction(() => window.__sv?.ready, null, {timeout:60000}); }")
                command("eval", timeline)
                command("eval", "async () => await window.__demoPhases[0]()")
                raw = Path(tmp) / (name + ".webm")
                command("video-start", str(raw), "--size=" + str(width) + "x" + str(height), "--fps=30")
                try:
                    for stage in range(1, 7):
                        result = command("eval", f"async () => await window.__demoPhases[{stage}]()")
                finally:
                    command("video-stop")
                match = re.search(r'### Result\n(\{.*?\})\n###', result, re.S)
                if not match:
                    raise RuntimeError('Recording diagnostics are missing: ' + result)
                metadata = json.loads(match.group(1))
                if metadata['viewport'] != [width, height]:
                    raise RuntimeError('Unexpected recording viewport: ' + str(metadata))
                (args.out / (name + ".json")).write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n')
                destination = args.out / (name + ".mp4")
                subprocess.run([args.ffmpeg,"-y","-i",str(raw),"-an","-vf","fps=30,setsar=1","-c:v","libx264","-preset","medium","-crf","25","-pix_fmt","yuv420p","-movflags","+faststart",str(destination)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                logging.info("business: encoded %s (%s bytes)", destination, destination.stat().st_size)
except Exception:
    logging.exception("error: demo recording failed")
    raise
finally:
    if not args.reuse_session:
        command("close")
