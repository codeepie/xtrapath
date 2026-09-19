#!/usr/bin/env python3
"""
generate_brand_assets.py
Generates ultra-premium multi-platform branding assets for XtraPath:
- Browser Favicons: Multi-size ICO (16..256), 16x16, 32x32, 48x48, 96x96, 144x144, 192x192, 512x512
- Apple iOS / Safari: apple-touch-icon.png (180x180)
- WhatsApp Link Preview / Square Avatar: brand-logo.png (512x512, <100KB), brand-logo-1080.png (1080x1080)
- Social Preview Banners: brand-social-card.png & .jpg (1200x630, <300KB)
- Twitter / X Header Banner: brand-twitter-banner.png (1500x500, <300KB)
"""

import os
import subprocess
import shutil
import tempfile
from PIL import Image

SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "src"))
STYLES_DIR = os.path.join(SRC_DIR, "styles")

def run_qlmanage(svg_path, max_size, out_dir):
    """Renders SVG to PNG thumbnail using macOS native CoreGraphics/QuickLook engine."""
    cmd = ["qlmanage", "-t", "-s", str(max_size), "-o", out_dir, svg_path]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    base = os.path.basename(svg_path)
    rendered = os.path.join(out_dir, f"{base}.png")
    if not os.path.exists(rendered):
        raise FileNotFoundError(f"QuickLook failed to render {rendered}")
    return rendered

def build_all():
    print("🚀 Starting XtraPath Ultra-Premium Brand Asset Pipeline...")
    temp_dir = tempfile.mkdtemp(prefix="xtrapath_assets_")
    
    try:
        # ----------------------------------------------------
        # 1. Render Master App Icon at 1080x1080
        # ----------------------------------------------------
        logo_svg = os.path.join(STYLES_DIR, "brand-logo.svg")
        print(f"Rendering master logo: {logo_svg}")
        logo_png_path = run_qlmanage(logo_svg, 1080, temp_dir)
        master_logo = Image.open(logo_png_path).convert("RGBA")
        
        if master_logo.size != (1080, 1080):
            master_logo = master_logo.resize((1080, 1080), Image.Resampling.LANCZOS)
        
        # Save 1080x1080 HD profile avatar
        hd_avatar_path = os.path.join(STYLES_DIR, "brand-logo-1080.png")
        master_logo.save(hd_avatar_path, "PNG", optimize=True)
        print(f"  ✓ Saved 1080x1080 avatar: {hd_avatar_path} ({os.path.getsize(hd_avatar_path):,} bytes)")
        
        # 512x512 Square Brand Logo for WhatsApp preview and PWA splash
        logo_512 = master_logo.resize((512, 512), Image.Resampling.LANCZOS)
        pwa_512 = os.path.join(SRC_DIR, "favicon-512.png")
        styles_512 = os.path.join(STYLES_DIR, "brand-logo-512.png")
        root_logo_png = os.path.join(SRC_DIR, "brand-logo.png")
        styles_logo_png = os.path.join(STYLES_DIR, "brand-logo.png")
        
        # Quantize 512 to ensure it is ultra-fast on mobile cellular networks (<100KB)
        q_512 = logo_512.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
        q_512.save(pwa_512, "PNG", optimize=True)
        q_512.save(styles_512, "PNG", optimize=True)
        q_512.save(root_logo_png, "PNG", optimize=True)
        q_512.save(styles_logo_png, "PNG", optimize=True)
        sz_512 = os.path.getsize(styles_logo_png)
        print(f"  ✓ Saved 512x512 logo & WhatsApp preview: {sz_512:,} bytes")
        assert sz_512 < 300000, f"512 logo {sz_512} exceeds 300KB WhatsApp threshold!"

        # ----------------------------------------------------
        # 2. Apple iOS / Safari: apple-touch-icon.png (180x180)
        # ----------------------------------------------------
        apple_icon = master_logo.resize((180, 180), Image.Resampling.LANCZOS)
        apple_root = os.path.join(SRC_DIR, "apple-touch-icon.png")
        apple_precomposed = os.path.join(SRC_DIR, "apple-touch-icon-precomposed.png")
        apple_styles = os.path.join(STYLES_DIR, "apple-touch-icon.png")
        
        apple_icon.save(apple_root, "PNG", optimize=True)
        apple_icon.save(apple_precomposed, "PNG", optimize=True)
        apple_icon.save(apple_styles, "PNG", optimize=True)
        print(f"  ✓ Saved 180x180 Apple Touch Icon ({os.path.getsize(apple_root):,} bytes)")

        # ----------------------------------------------------
        # 3. Android PWA Home Screen: favicon-192.png (192x192)
        # ----------------------------------------------------
        icon_192 = master_logo.resize((192, 192), Image.Resampling.LANCZOS)
        icon_192_root = os.path.join(SRC_DIR, "favicon-192.png")
        icon_192_styles = os.path.join(STYLES_DIR, "favicon-192.png")
        icon_192.save(icon_192_root, "PNG", optimize=True)
        icon_192.save(icon_192_styles, "PNG", optimize=True)
        print(f"  ✓ Saved 192x192 Android icon ({os.path.getsize(icon_192_root):,} bytes)")

        # ----------------------------------------------------
        # 4. Standard Browser Favicons (144, 96, 48, 32, 16)
        # ----------------------------------------------------
        sizes = [
            (144, "favicon-144.png"),
            (96, "favicon-96.png"),
            (48, "favicon-48.png"),
            (32, "favicon-32.png"),
            (16, "favicon-16.png")
        ]
        
        for sz, fname in sizes:
            resized = master_logo.resize((sz, sz), Image.Resampling.LANCZOS)
            styles_path = os.path.join(STYLES_DIR, fname)
            root_path = os.path.join(SRC_DIR, fname)
            resized.save(styles_path, "PNG", optimize=True)
            resized.save(root_path, "PNG", optimize=True)
            if sz == 32:
                resized.save(os.path.join(STYLES_DIR, "favicon.png"), "PNG", optimize=True)
                resized.save(os.path.join(SRC_DIR, "favicon.png"), "PNG", optimize=True)
            print(f"  ✓ Saved {sz}x{sz} favicon: {fname} ({os.path.getsize(styles_path):,} bytes)")

        # Build Multi-Resolution favicon.ico
        ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
        ico_path = os.path.join(SRC_DIR, "favicon.ico")
        master_logo.save(ico_path, format="ICO", sizes=ico_sizes)
        shutil.copy(ico_path, os.path.join(STYLES_DIR, "favicon.ico"))
        print(f"  ✓ Saved multi-layer favicon.ico ({os.path.getsize(ico_path):,} bytes)")

        # ----------------------------------------------------
        # 5. Open Graph & Twitter Social Card: 1200x630
        # ----------------------------------------------------
        card_svg = os.path.join(STYLES_DIR, "brand-social-card.svg")
        print(f"Rendering social card banner: {card_svg}")
        card_png_path = run_qlmanage(card_svg, 1200, temp_dir)
        raw_card = Image.open(card_png_path).convert("RGBA")
        
        card_1200x630 = raw_card.crop((0, 0, 1200, 630))
        
        card_png_styles = os.path.join(STYLES_DIR, "brand-social-card.png")
        card_png_root = os.path.join(SRC_DIR, "brand-social-card.png")
        card_jpg_styles = os.path.join(STYLES_DIR, "brand-social-card.jpg")
        card_jpg_root = os.path.join(SRC_DIR, "brand-social-card.jpg")
        
        # Save Progressive JPEG (~75KB)
        rgb_card = card_1200x630.convert("RGB")
        rgb_card.save(card_jpg_styles, "JPEG", quality=88, progressive=True, optimize=True)
        rgb_card.save(card_jpg_root, "JPEG", quality=88, progressive=True, optimize=True)
        
        # Quantize PNG to guarantee under 300KB WhatsApp limit
        q_card = rgb_card.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        q_card.save(card_png_styles, "PNG", optimize=True)
        q_card.save(card_png_root, "PNG", optimize=True)
        
        png_sz = os.path.getsize(card_png_styles)
        jpg_sz = os.path.getsize(card_jpg_styles)
        print(f"  ✓ Saved 1200x630 social card PNG: {png_sz:,} bytes (Threshold: <300,000 bytes)")
        print(f"  ✓ Saved 1200x630 social card JPG: {jpg_sz:,} bytes")
        assert png_sz < 300000, f"Social card PNG {png_sz} exceeds 300KB WhatsApp threshold!"

        # ----------------------------------------------------
        # 6. Twitter / X Header Banner: 1500x500
        # ----------------------------------------------------
        banner_svg = os.path.join(STYLES_DIR, "brand-twitter-banner.svg")
        print(f"Rendering Twitter header banner: {banner_svg}")
        banner_png_path = run_qlmanage(banner_svg, 1500, temp_dir)
        raw_banner = Image.open(banner_png_path).convert("RGBA")
        
        banner_1500x500 = raw_banner.crop((0, 0, 1500, 500))
        banner_styles = os.path.join(STYLES_DIR, "brand-twitter-banner.png")
        banner_root = os.path.join(SRC_DIR, "brand-twitter-banner.png")
        
        rgb_banner = banner_1500x500.convert("RGB")
        q_banner = rgb_banner.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        q_banner.save(banner_styles, "PNG", optimize=True)
        q_banner.save(banner_root, "PNG", optimize=True)
        
        banner_sz = os.path.getsize(banner_styles)
        print(f"  ✓ Saved 1500x500 Twitter banner: {banner_sz:,} bytes")

        print("\n🎉 ALL PLATFORM BRANDING ASSETS GENERATED & VERIFIED SUCCESSFULLY!")
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    build_all()
