#!/usr/bin/env python3
"""Build the browser entry point; release builds include the pinned Three runtime."""
import argparse
import json
import logging
import pathlib
import re
import shutil

logging.basicConfig(level=logging.INFO, format='%(levelname)s [build] %(message)s')
root = pathlib.Path(__file__).resolve().parent
JS_TOKENS = re.compile(r'''//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|[^\s]''')


def module_imports(source):
    """Read literal ESM specifiers, leaving comments and shader strings opaque."""
    tokens = [t for t in JS_TOKENS.findall(source) if not t.startswith(('//', '/*'))]
    for i, token in enumerate(tokens):
        if token == 'from':
            j = i + 1
        elif token == 'import' and (i == 0 or tokens[i - 1] != '.'):
            j = i + 1
            if j < len(tokens) and tokens[j] == '(':
                j += 1
        else:
            continue
        if j >= len(tokens) or tokens[j][0] not in ('"', "'", '`'):
            continue
        value = tokens[j][1:-1]
        if tokens[j][0] == '`' and '${' in value:
            continue
        if '\\' in value:
            raise ValueError(f'Escaped module specifier needs explicit resolution: {tokens[j]}')
        yield value


def addon_closure(engine, runtime):
    """Resolve exactly the used addon graph before changing any release files."""
    base = (runtime / 'examples' / 'jsm').resolve()
    pending = [base / spec.removeprefix('three/addons/') for spec in module_imports(engine) if spec.startswith('three/addons/')]
    required = set()
    while pending:
        path = pending.pop().resolve()
        if not path.is_relative_to(base):
            raise ValueError(f'Addon import escapes the pinned package: {path}')
        if path in required:
            continue
        if not path.is_file():
            raise FileNotFoundError(f'Required Three.js addon is missing: {path}')
        required.add(path)
        for spec in module_imports(path.read_text()):
            if spec.startswith('.'):
                pending.append(path.parent / spec)
            elif spec.startswith('three/addons/'):
                pending.append(base / spec.removeprefix('three/addons/'))
            elif spec != 'three':
                raise ValueError(f'Unresolved addon dependency {spec!r} in {path.name}')
    return base, sorted(required)


parser = argparse.ArgumentParser()
parser.add_argument('--out', type=pathlib.Path, help='Release output directory (includes vendored Three.js)')
args = parser.parse_args()
try:
    manifest = json.loads((root / 'world.manifest.json').read_text())
    gen = '\n'.join((root / 'src' / part).read_text() for part in manifest['generator'])
    engine = '\n'.join((root / 'src' / part).read_text() for part in manifest['engine'])
    shell = (root / 'src' / '00_shell.html').read_text()
    shell = shell.replace('GEN_SOURCE_PLACEHOLDER', gen.replace('</script>', '<\\/script>'))
    shell = shell.replace('ENGINE_STREAMING_ATMO_FX_CONTROLS_UI_BOOT_PLACEHOLDER', engine.replace('</script>', '<\\/script>'))
    destination = root
    if args.out:
        destination = args.out if args.out.is_absolute() else root / args.out
        runtime = root / 'node_modules' / 'three'
        if not (runtime / 'build' / 'three.module.js').exists():
            raise FileNotFoundError('Pinned Three.js runtime missing. Run npm ci before a release build.')
        addon_base, required_addons = addon_closure(engine, runtime)
        logging.info('access: release build requested at %s', destination)
        destination.mkdir(parents=True, exist_ok=True)
        vendor = destination / 'vendor'
        vendor.mkdir(exist_ok=True)
        shutil.copy2(runtime / 'LICENSE', vendor / 'THREE-LICENSE.txt')
        core_files = sorted((runtime / 'build').glob('three*.js'))
        for runtime_file in core_files:
            shutil.copy2(runtime_file, vendor / runtime_file.name)
        addons = vendor / 'addons'
        if addons.exists():
            shutil.rmtree(addons)
        for addon in required_addons:
            target = addons / addon.relative_to(addon_base)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(addon, target)
        files = [runtime / 'LICENSE', *core_files, *required_addons]
        logging.info('business: vendored %s files (%s addons, %s bytes)', len(files), len(required_addons), f'{sum(p.stat().st_size for p in files):,}')
        shell = shell.replace('https://unpkg.com/three@0.171.0/build/three.module.js', './vendor/three.module.js')
        shell = shell.replace('https://unpkg.com/three@0.171.0/examples/jsm/', './vendor/addons/')
        shutil.copy2(root / 'public' / '_headers', destination / '_headers')
        for static_file in (root / 'public').iterdir():
            if static_file.is_file() and static_file.name != '_headers':
                (destination / 'public').mkdir(exist_ok=True)
                shutil.copy2(static_file, destination / 'public' / static_file.name)
        if (root / 'LICENSE').is_file():
            shutil.copy2(root / 'LICENSE', destination / 'PROJECT-LICENSE.txt')
    out = destination / 'index.html'
    out.write_text(shell)
    logging.info('business: assembled %s (%s bytes)', out.name, f'{len(shell):,}')
except Exception:
    logging.exception('error: build failed')
    raise
