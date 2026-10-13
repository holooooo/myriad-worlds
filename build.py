#!/usr/bin/env python3
"""Assemble the single-file deliverable from src/ parts."""
import pathlib
root = pathlib.Path(__file__).parent
parts = ['10_gen_core.js','11_gen_kit.js','12_gen_chunk.js']
gen = '\n'.join((root/'src'/p).read_text() for p in parts)
shell = (root/'src'/'00_shell.html').read_text()
shell = shell.replace('GEN_SOURCE_PLACEHOLDER', gen.replace('</script>', '<\\/script>'))
engine = '\n'.join((root/'src'/p).read_text() for p in ['20_engine.js','21_stream.js','22_atmo.js','23_fx.js','24_app.js'])
shell = shell.replace('ENGINE_STREAMING_ATMO_FX_CONTROLS_UI_BOOT_PLACEHOLDER', engine.replace('</script>', '<\\/script>'))
out = root/'index.html'
out.write_text(shell)
print(f'built {out} ({len(shell):,} bytes)')
