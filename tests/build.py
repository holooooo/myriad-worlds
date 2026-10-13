#!/usr/bin/env python3
"""Release artifact checks and import-graph/failure fixtures, without a browser."""
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

root = pathlib.Path(__file__).resolve().parents[1]


def build(project, destination, success=True):
    result = subprocess.run([sys.executable, str(project / 'build.py'), '--out', str(destination)], capture_output=True, text=True)
    assert (result.returncode == 0) == success, result.stderr
    assert ('business: assembled' if success else 'error: build failed') in result.stderr
    return result


with tempfile.TemporaryDirectory(prefix='myriad-build-') as temporary:
    work = pathlib.Path(temporary)
    release = work / 'release'
    stale = release / 'vendor' / 'addons' / 'libs' / 'obsolete.wasm'
    stale.parent.mkdir(parents=True); stale.write_bytes(b'unused old dependency')
    marker = release / 'KEEP.txt'; marker.write_text('outside managed vendor/addons')
    result = build(root, release)
    assert not stale.exists(), 'A rebuild must remove obsolete addons and their third-party libraries'
    assert marker.read_text() == 'outside managed vendor/addons'
    html = (release / 'index.html').read_text()
    imports = json.loads(re.search(r'<script type="importmap">(.*?)</script>', html).group(1))['imports']
    assert imports == {'three': './vendor/three.module.js', 'three/addons/': './vendor/addons/'}
    assert 'https://unpkg.com/' not in html, 'The release must resolve its runtime locally'
    assert 'GEN_SOURCE_PLACEHOLDER' not in html and 'ENGINE_STREAMING_ATMO_FX_CONTROLS_UI_BOOT_PLACEHOLDER' not in html
    runtime = root / 'node_modules' / 'three'
    assert (release / 'vendor' / 'THREE-LICENSE.txt').read_bytes() == (runtime / 'LICENSE').read_bytes()
    for source in (runtime / 'build').glob('three*.js'):
        assert (release / 'vendor' / source.name).read_bytes() == source.read_bytes(), 'Pinned runtime changed'
    addons = sorted((release / 'vendor' / 'addons').rglob('*.js'))
    assert addons and len(addons) < 25, 'Release must contain only the small used postprocessing graph'
    assert not (release / 'vendor' / 'addons' / 'libs').exists(), 'Unused third-party libraries must not be distributed'
    for addon in addons:
        original = runtime / 'examples' / 'jsm' / addon.relative_to(release / 'vendor' / 'addons')
        assert addon.read_bytes() == original.read_bytes(), 'An addon lost its source/license header'
        # Independently audit every static relative dependency in the real
        # postprocessing graph, including modules imported only by another addon.
        for dependency in re.findall(r'\bfrom\s+[\'"](\.[^\'"]+)[\'"]', addon.read_text()):
            assert (addon.parent / dependency).is_file(), f'Broken local dependency: {addon.name} -> {dependency}'
    assert 'addons' in result.stderr and 'bytes' in result.stderr
    actual_count = len(addons)

    # Build a separate minimal project so failure/cycle cases never modify the
    # real dependency installation or production release.
    fixture = work / 'fixture'; (fixture / 'src').mkdir(parents=True); (fixture / 'public').mkdir()
    shutil.copy2(root / 'build.py', fixture / 'build.py')
    (fixture / 'world.manifest.json').write_text(json.dumps({'generator': [], 'engine': ['engine.js']}))
    (fixture / 'src' / '00_shell.html').write_text('GEN_SOURCE_PLACEHOLDER\nENGINE_STREAMING_ATMO_FX_CONTROLS_UI_BOOT_PLACEHOLDER')
    (fixture / 'src' / 'engine.js').write_text("import('three/addons/postprocessing/Main.js');")
    (fixture / 'public' / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n')
    fixture_release = work / 'fixture-release'
    assert 'npm ci' in build(fixture, fixture_release, success=False).stderr
    fake_runtime = fixture / 'node_modules' / 'three'; (fake_runtime / 'build').mkdir(parents=True)
    (fake_runtime / 'build' / 'three.module.js').write_text('export const REVISION="fixture";')
    (fake_runtime / 'LICENSE').write_text('Fixture license must remain verbatim')
    graph = fake_runtime / 'examples' / 'jsm'; (graph / 'postprocessing').mkdir(parents=True); (graph / 'shaders').mkdir()
    main = graph / 'postprocessing' / 'Main.js'
    main.write_text("export { value } from '../shaders/Secondary.js';")
    (graph / 'shaders' / 'Secondary.js').write_text("import '../postprocessing/Main.js'; export const value=1; import('./Dynamic.js');")
    (graph / 'shaders' / 'Dynamic.js').write_text("import('three/addons/shaders/Aux.js');")
    (graph / 'shaders' / 'Aux.js').write_text("const quoted=\"from './missing.js'\"; const shader=`import('./missing.js')`; /* import './missing.js'; */\n// import('./missing.js');\nexport const aux=2;")
    (graph / 'shaders' / 'Unused.js').write_text('export const unused=3;')
    build(fixture, fixture_release)
    copied = {p.relative_to(fixture_release / 'vendor' / 'addons').as_posix() for p in (fixture_release / 'vendor' / 'addons').rglob('*.js')}
    assert copied == {'postprocessing/Main.js', 'shaders/Secondary.js', 'shaders/Dynamic.js', 'shaders/Aux.js'}, copied
    before = (fixture_release / 'index.html').read_bytes()
    main.write_text("import './Missing.js';")
    assert 'Required Three.js addon is missing' in build(fixture, fixture_release, success=False).stderr
    assert (fixture_release / 'index.html').read_bytes() == before, 'An invalid graph must not replace the last valid entry point'
    main.write_text("import { thing } from 'missing-external-package';")
    assert 'Unresolved addon dependency' in build(fixture, fixture_release, success=False).stderr
    main.write_text("import '../../../../outside.js';")
    assert 'escapes the pinned package' in build(fixture, fixture_release, success=False).stderr

print(f'Release build checks passed: {actual_count} real addons, local importmap/core dependencies, exact license/source bytes, stale cleanup, cyclic/dynamic/export graph and explicit failure preservation.')
