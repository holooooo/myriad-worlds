#!/usr/bin/env python3
"""Assemble the single-file deliverable from src/ parts."""
import json
import pathlib
root = pathlib.Path(__file__).parent
manifest = json.loads((root/'world.manifest.json').read_text())
parts = manifest['generator']
gen = '\n'.join((root/'src'/p).read_text() for p in parts)
shell = (root/'src'/'00_shell.html').read_text()
shell = shell.replace('GEN_SOURCE_PLACEHOLDER', gen.replace('</script>', '<\\/script>'))
engine = '\n'.join((root/'src'/p).read_text() for p in manifest['engine'])
shell = shell.replace('ENGINE_STREAMING_ATMO_FX_CONTROLS_UI_BOOT_PLACEHOLDER', engine.replace('</script>', '<\\/script>'))
out = root/'index.html'
out.write_text(shell)
print(f'built {out} ({len(shell):,} bytes)')
