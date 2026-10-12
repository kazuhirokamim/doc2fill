import os
import subprocess
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
ICONS_DIR = os.path.join(PROJECT_ROOT, "extension", "icons")

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# 1. HTML templates for icon-symbol (transparent background) and icon-squircle (obsidian background)
symbol_svg_path = os.path.join(ICONS_DIR, "icon-symbol.svg")
with open(symbol_svg_path, "r", encoding="utf-8") as f:
    symbol_svg = f.read()

squircle_svg_path = os.path.join(ICONS_DIR, "icon-squircle.svg")
with open(squircle_svg_path, "r", encoding="utf-8") as f:
    squircle_svg = f.read()

def render_svg_to_png(svg_content, out_png, width=1024, height=1024):
    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{ width: 100%; height: 100%; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }}
  svg {{ width: 92%; height: 92%; }}
</style>
</head>
<body>
{svg_content}
</body>
</html>"""
    temp_html = f"/tmp/render_{os.path.basename(out_png)}.html"
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    cmd = [
        CHROME_BIN,
        "--headless",
        "--disable-gpu",
        "--default-background-color=00000000",
        f"--screenshot={out_png}",
        f"--window-size={width},{height}",
        temp_html
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    if os.path.exists(temp_html):
        os.remove(temp_html)

# Render base high-res PNGs
base_symbol_png = "/tmp/base_symbol_1024.png"
render_svg_to_png(symbol_svg, base_symbol_png, 1024, 1024)

base_squircle_png = "/tmp/base_squircle_1024.png"
render_svg_to_png(squircle_svg, base_squircle_png, 1024, 1024)

# Generate extension icons (symbol transparent)
im_sym = Image.open(base_symbol_png)
for sz in [16, 32, 48, 128]:
    target_path = os.path.join(ICONS_DIR, f"icon-{sz}.png")
    resized = im_sym.resize((sz, sz), Image.Resampling.LANCZOS)
    resized.save(target_path, "PNG")
    print(f"Generated {target_path} ({sz}x{sz})")

# Generate squircle icons (for store and branding)
im_sq = Image.open(base_squircle_png)
for sz in [16, 32, 48, 128]:
    target_path = os.path.join(ICONS_DIR, f"icon-squircle-{sz}.png")
    resized = im_sq.resize((sz, sz), Image.Resampling.LANCZOS)
    resized.save(target_path, "PNG")
    print(f"Generated {target_path} ({sz}x{sz})")

print("All PNG icons successfully generated!")
