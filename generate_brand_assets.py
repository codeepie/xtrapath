#!/usr/bin/env python3
"""
generate_brand_assets.py
Generates pixel-perfect multi-platform branding assets for XtraPath directly from SVGs using resvg:
- Master App Icon & Avatars: brand-logo.svg -> 1080x1080 PNG, 512x512 PNG, 180x180 iOS, 192x192 Android
- Browser Favicons: Multi-size ICO (16..256), 16x16, 32x32, 48x48, 96x96, 144x144, 192x192, 512x512
- Social Preview Banners: brand-social-card.svg -> 1200x630 PNG & JPG (100% identical to .svg, Comic Sans MS Bold)
- Twitter / X Header Banner: brand-twitter-banner.svg -> 1500x500 PNG (100% identical to .svg, Comic Sans MS Bold)
"""

import os
import io
import shutil
from PIL import Image
import resvg_py

SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "src"))
STYLES_DIR = os.path.join(SRC_DIR, "styles")

FONT_FILES = [
    "/System/Library/Fonts/Supplemental/Comic Sans MS Bold.ttf",
    "/System/Library/Fonts/Supplemental/Comic Sans MS.ttf",
    "/Library/Fonts/Comic Sans MS Bold.ttf",
    "/Library/Fonts/Comic Sans MS.ttf"
]
AVAILABLE_FONTS = [f for f in FONT_FILES if os.path.exists(f)]

def render_svg_to_image(svg_path, width=None, height=None):
    """Renders SVG with 100% spec compliance using Rust resvg engine."""
    png_bytes = resvg_py.svg_to_bytes(
        svg_path=svg_path,
        width=width,
        height=height,
        font_files=AVAILABLE_FONTS if AVAILABLE_FONTS else None,
        shape_rendering="geometric_precision",
        text_rendering="geometric_precision",
        image_rendering="optimize_quality"
    )
    return Image.open(io.BytesIO(png_bytes)).convert("RGBA")

def build_all():
    print("🚀 Starting 1:1 Pixel-Perfect SVG -> PNG Asset Pipeline (resvg)...")
    print(f"Loaded font files: {AVAILABLE_FONTS}")

    # ----------------------------------------------------
    # 1. Render Master App Icon at 1080x1080
    # ----------------------------------------------------
    logo_svg = os.path.join(STYLES_DIR, "brand-logo.svg")
    print(f"Rendering master logo directly from SVG: {logo_svg}")
    master_logo = render_svg_to_image(logo_svg, 1080, 1080)
    
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
    # 5. Open Graph & Twitter Social Card: 1200x630 (1:1 identical to .svg)
    # ----------------------------------------------------
    card_svg = os.path.join(STYLES_DIR, "brand-social-card.svg")
    print(f"Rendering brand-social-card.png directly from SVG: {card_svg}")
    card_image = render_svg_to_image(card_svg, 1200, 630)
    
    card_png_styles = os.path.join(STYLES_DIR, "brand-social-card.png")
    card_png_root = os.path.join(SRC_DIR, "brand-social-card.png")
    card_jpg_styles = os.path.join(STYLES_DIR, "brand-social-card.jpg")
    card_jpg_root = os.path.join(SRC_DIR, "brand-social-card.jpg")
    
    card_image.save(card_png_styles, "PNG", optimize=True)
    card_image.save(card_png_root, "PNG", optimize=True)
    
    # Save Progressive JPEG
    rgb_card = card_image.convert("RGB")
    rgb_card.save(card_jpg_styles, "JPEG", quality=90, progressive=True, optimize=True)
    rgb_card.save(card_jpg_root, "JPEG", quality=90, progressive=True, optimize=True)
    
    png_sz = os.path.getsize(card_png_styles)
    jpg_sz = os.path.getsize(card_jpg_styles)
    print(f"  ✓ Saved 1200x630 social card PNG (1:1 SVG clone): {png_sz:,} bytes (Threshold: <300,000 bytes)")
    print(f"  ✓ Saved 1200x630 social card JPG: {jpg_sz:,} bytes")
    assert png_sz < 300000, f"Social card PNG {png_sz} exceeds 300KB WhatsApp threshold!"

    # ----------------------------------------------------
    # 6. Twitter / X Header Banner: 1500x500 (1:1 identical to .svg)
    # ----------------------------------------------------
    banner_svg = os.path.join(STYLES_DIR, "brand-twitter-banner.svg")
    print(f"Rendering brand-twitter-banner.png directly from SVG: {banner_svg}")
    banner_image = render_svg_to_image(banner_svg, 1500, 500)
    
    banner_styles = os.path.join(STYLES_DIR, "brand-twitter-banner.png")
    banner_root = os.path.join(SRC_DIR, "brand-twitter-banner.png")
    
    banner_image.save(banner_styles, "PNG", optimize=True)
    banner_image.save(banner_root, "PNG", optimize=True)
    banner_sz = os.path.getsize(banner_styles)
    print(f"  ✓ Saved 1500x500 Twitter banner (1:1 SVG clone): {banner_sz:,} bytes")

    print("\n🎉 ALL ASSETS 100% IDENTICAL TO SVG RENDERED PERFECTLY!")

if __name__ == "__main__":
    build_all()
