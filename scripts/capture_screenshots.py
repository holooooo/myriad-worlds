#!/usr/bin/env python3
"""Export current high-mode rendered canvases; Chinese cloud sea stays disabled."""
import argparse
import json
import logging
import os
from pathlib import Path
import re
import shlex
import subprocess
import shutil
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from record_scenery import PREPARE

ROOT = Path(__file__).resolve().parents[1]
SHOTS = [
    {'file':'shanshui-palace.jpg','theme':'shanshui','place':'palace','mood':'golden','title':'王宫御苑','distance':100,'height':30},
    {'file':'shanshui-lakes.jpg','theme':'shanshui','place':'LAKE','mood':'morning','title':'九寨彩湖','distance':210,'height':43},
    {'file':'teahouse.jpg','theme':'shanshui','place':'chineseTeahouse','mood':'golden','title':'临风茶楼','distance':65,'height':20},
    {'file':'boats.jpg','theme':'shanshui','place':'LAKE','mood':'golden','title':'渔舟与湖岸','distance':35,'height':12,'boats':True},
    {'file':'giant-planet.jpg','theme':'shanshui','place':'palace','mood':'dusk','title':'星环与山水','distance':110,'height':30,'planet':True},
    {'file':'hanami-castle.jpg','theme':'sakura','place':'castle','mood':'golden','title':'大名城下町','distance':95,'height':30},
]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',default='https://myriad-worlds.pages.dev/')
    p.add_argument('--out',type=Path,default=ROOT/'docs/screenshots')
    p.add_argument('--session',default='myriad-screens')
    p.add_argument('--cli',default=os.environ.get('PLAYWRIGHT_CLI','npx --yes --package @playwright/cli playwright-cli'))
    p.add_argument('--reuse-session',action='store_true')
    args = p.parse_args();cli = shlex.split(args.cli)+['-s='+args.session]
    def command(*items):
        result = subprocess.run(cli+list(items),capture_output=True,text=True,timeout=55)
        if result.returncode or '### Error' in result.stdout:raise RuntimeError(result.stdout+result.stderr)
        return result.stdout
    def evaluate(function,argument):
        output = command('eval','async () => ('+function+')('+json.dumps(argument,ensure_ascii=False)+')')
        match = re.search(r'### Result\n(.*?)\n###',output,re.S)
        if not match:raise RuntimeError('Missing capture result: '+output)
        return json.loads(match.group(1))
    work = ROOT/'output/screenshots';work.mkdir(parents=True,exist_ok=True)
    args.out.mkdir(parents=True,exist_ok=True)
    manifest={'sourceURL':args.url,'quality':'high','chineseCloudSea':False,'screenshots':[]}
    opened=False
    try:
        if not args.reuse_session:command('open','about:blank','--browser=chrome');opened=True
        command('resize','1920','1080');current=None
        for shot in SHOTS:
            logging.info('Capture %s',shot['file'])
            if current != shot['theme']:
                parts=urlsplit(args.url);query=dict(parse_qsl(parts.query))
                query.update(theme=shot['theme'],seed='sakura',q='high',mood=shot['mood'],nointro='1')
                command('goto',urlunsplit((parts.scheme,parts.netloc,parts.path,urlencode(query),parts.fragment)))
                command('run-code','async page => { await page.waitForFunction(() => window.__sv?.ready && !document.getElementById("loader"), null, {timeout:45000}); }')
                current=shot['theme']
            evaluate(PREPARE,shot)
            setup=r"""async shot => {
              const s=window.__sv;document.querySelector('#recordCaption')?.remove();
              let boatId=null;
              if(shot.boats){
                let boat=null;const start=performance.now();
                while(performance.now()-start<18000){
                  boat=s.nearbyUnits().find(u=>u.kind==='fishingBoat'||u.kind==='merchantBoat');
                  if(boat)break;await new Promise(r=>setTimeout(r,200));
                }
                if(!boat)throw Error('No real visible boat available for screenshot');
                boatId=boat.id;const p=boat.g.position;
                const x=p.x+18,z=p.z+24,y=Math.max(p.y+8,s.GEN.heightAt(x,z)+3);
                s.goCam(x,y,z,p.x,p.y+1.5,p.z);
                await new Promise(r=>setTimeout(r,3500));
              }
              if(shot.planet){
                const set=(key,value)=>{const el=document.getElementById('sky-'+key);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));};
                const d=s.camera.getWorldDirection(s.camera.position.clone());
                set('planetAzimuth',(Math.atan2(d.x,d.z)*180/Math.PI+360)%360);
                set('planetElevation',22);set('planetSize',44);set('planetType','ice-rings');
                await new Promise(r=>setTimeout(r,1200));
              }
              const errors=s.LOG.entries.filter(e=>e.level==='error');
              if(errors.length)throw Error(JSON.stringify(errors));
              const cloudSea=s.volPass.mat.uniforms.uCloudSea.value.x;
              if(shot.theme==='shanshui' && cloudSea!==0)throw Error('Chinese cloud sea must be disabled');
              if(s.state.quality!=='high')throw Error('Capture must stay in high mode');
              return {...shot,quality:s.state.quality,canvas:[s.renderer.domElement.width,s.renderer.domElement.height],
                viewport:[innerWidth,innerHeight],pixelRatio:s.renderer.getPixelRatio(),cloudSeaStrength:cloudSea,
                camera:s.camera.position.toArray(),boatId,errors};
            }"""
            metadata=evaluate(setup,shot)
            raw=work/(Path(shot['file']).stem+'.png')
            code='async page => { const pending=page.waitForEvent("download",{timeout:15000}); await page.evaluate(() => window.__sv.saveImage()); const download=await pending; await download.saveAs('+json.dumps(str(raw))+'); }'
            command('run-code',code)
            probe=subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=width,height','-of','json',str(raw)],text=True)
            dimensions=json.loads(probe)['streams'][0]
            if [dimensions['width'],dimensions['height']]!=metadata['canvas']:raise RuntimeError('Canvas export dimensions changed')
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(raw),'-frames:v','1','-q:v','2',str(args.out/shot['file'])],check=True)
            if shot['file']=='shanshui-palace.jpg':shutil.copyfile(raw,ROOT/'screenshot.png')
            manifest['screenshots'].append(metadata)
        (args.out/'capture.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        logging.info('Exported all six full-HD high-mode screenshots')
    finally:
        if opened:command('close')


if __name__=='__main__':
    logging.basicConfig(level=logging.INFO,format='%(levelname)s [screenshots] %(message)s')
    main()
