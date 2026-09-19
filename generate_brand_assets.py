#!/usr/bin/env python3
"""
generate_brand_assets.py
Generates ultra-premium multi-platform branding assets for XtraPath:
- Browser Favicons: Multi-size ICO (16..256), 16x16, 32x32, 48x48, 96x96, 144x144, 192x192, 512x512
- Apple iOS / Safari: apple-touch-icon.png (180x180)
- WhatsApp Link Preview / Square Avatar: brand-logo.png (512x512, <100KB), brand-logo-1080.png (1080x1080)
- Social Preview Banners: brand-social-card.png & .jpg (1200x630, <300KB, Comic Sans MS Bold)
- Twitter / X Header Banner: brand-twitter-banner.png (1500x500, <300KB, Comic Sans MS Bold)
"""

import os
import subprocess
import shutil
import tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "src"))
STYLES_DIR = os.path.join(SRC_DIR, "styles")

def get_comic_sans_font_path():
    candidates = [
        "/System/Library/Fonts/Supplemental/Comic Sans MS Bold.ttf",
        "/System/Library/Fonts/Supplemental/Comic Sans MS.ttf",
        "/Library/Fonts/Comic Sans MS Bold.ttf",
        "/Library/Fonts/Comic Sans MS.ttf"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def run_qlmanage(svg_path, max_size, out_dir):
    """Renders SVG to PNG thumbnail using macOS native CoreGraphics/QuickLook engine."""
    cmd = ["qlmanage", "-t", "-s", str(max_size), "-o", out_dir, svg_path]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    base = os.path.basename(svg_path)
    rendered = os.path.join(out_dir, f"{base}.png")
    if not os.path.exists(rendered):
        raise FileNotFoundError(f"QuickLook failed to render {rendered}")
    return rendered

def compose_social_card(master_logo, font_path):
    """Generates a pixel-perfect 1200x630 social preview card with Comic Sans MS Bold typography."""
    w, h = 1200, 630
    card = Image.new("RGBA", (w, h), (4, 6, 14, 255))
    draw = ImageDraw.Draw(card)

    # 1. Subtle cosmic grid
    for x in range(0, w, 40):
        draw.line([(x, 0), (x, h)], fill=(56, 189, 248, 12), width=1)
    for y in range(0, h, 40):
        draw.line([(0, y), (w, y)], fill=(56, 189, 248, 12), width=1)

    # 2. Add radial glows
    glow_c = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow_c).ellipse([(30, 90), (470, 530)], fill=(0, 245, 255, 36))
    card = Image.alpha_composite(card, glow_c.filter(ImageFilter.GaussianBlur(80)))

    glow_p = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow_p).ellipse([(800, 70), (1260, 470)], fill=(236, 72, 153, 24))
    card = Image.alpha_composite(card, glow_p.filter(ImageFilter.GaussianBlur(90)))

    # 3. Squircle App Icon (260x260) on the left
    logo_260 = master_logo.resize((260, 260), Image.Resampling.LANCZOS)
    card.paste(logo_260, (80, (h - 260) // 2), logo_260)

    # 4. Typography with Comic Sans MS Bold
    f_badge = ImageFont.truetype(font_path, 12)
    f_title = ImageFont.truetype(font_path, 56)
    f_tagline = ImageFont.truetype(font_path, 22)
    f_sub = ImageFont.truetype(font_path, 14)
    f_pills = ImageFont.truetype(font_path, 12)
    f_domain = ImageFont.truetype(font_path, 14)

    draw = ImageDraw.Draw(card)
    tx, ty = 390, 145

    # Category Badge
    badge_txt = "● PHYSICS & MATH SIMULATION ENGINE"
    bw = draw.textbbox((0, 0), badge_txt, font=f_badge)[2]
    draw.rounded_rectangle([(tx, ty), (tx + bw + 32, ty + 28)], radius=14, fill=(56, 189, 248, 28), outline=(56, 189, 248, 90), width=1)
    draw.text((tx + 16, ty + 5), badge_txt, font=f_badge, fill=(56, 189, 248, 255))

    # Title: XTRA (white) + PATH (cyan)
    ty += 44
    draw.text((tx, ty), "XTRA", font=f_title, fill=(255, 255, 255, 255))
    xtra_w = draw.textbbox((0, 0), "XTRA", font=f_title)[2]
    draw.text((tx + xtra_w + 2, ty), "PATH", font=f_title, fill=(56, 189, 248, 255))

    # Tagline
    ty += 68
    draw.text((tx, ty), "The Visual Physics & Simulation Engine", font=f_tagline, fill=(241, 245, 249, 255))

    # Subtitle
    ty += 34
    draw.text((tx, ty), "Interactive Kinematics • Math Animations • Auto-LaTeX Textbooks", font=f_sub, fill=(148, 163, 184, 255))

    # Feature pills
    ty += 34
    pills = ["⚡ Kinematics", "📐 3D Calculus", "✨ Auto-LaTeX", "🧪 Research Lab"]
    px = tx
    for p in pills:
        pw = draw.textbbox((0, 0), p, font=f_pills)[2] + 28
        draw.rounded_rectangle([(px, ty), (px + pw, ty + 30)], radius=8, fill=(255, 255, 255, 12), outline=(255, 255, 255, 30), width=1)
        draw.text((px + 14, ty + 6), p, font=f_pills, fill=(226, 232, 240, 255))
        px += pw + 12

    # Domain badge
    ty += 44
    dom = "https://www.xtrapath.com"
    dw = draw.textbbox((0, 0), dom, font=f_domain)[2] + 46
    draw.rounded_rectangle([(tx, ty), (tx + dw, ty + 34)], radius=10, fill=(56, 189, 248, 22), outline=(56, 189, 248, 75), width=1)
    draw.ellipse([(tx + 13, ty + 13), (tx + 21, ty + 21)], fill=(56, 189, 248, 255))
    draw.text((tx + 28, ty + 6), dom, font=f_domain, fill=(56, 189, 248, 255))

    return card

def compose_twitter_banner(master_logo, font_path):
    """Generates a pixel-perfect 1500x500 Twitter header with Comic Sans MS Bold typography."""
    bw, bh = 1500, 500
    banner = Image.new("RGBA", (bw, bh), (4, 6, 14, 255))
    draw = ImageDraw.Draw(banner)

    # Grid
    for x in range(0, bw, 40):
        draw.line([(x, 0), (x, bh)], fill=(56, 189, 248, 12), width=1)
    for y in range(0, bh, 40):
        draw.line([(0, y), (bw, y)], fill=(56, 189, 248, 12), width=1)

    # Squircle logo (240x240) placed safe from bottom-left avatar
    logo_240 = master_logo.resize((240, 240), Image.Resampling.LANCZOS)
    banner.paste(logo_240, (440, (bh - 240) // 2), logo_240)

    f_badge = ImageFont.truetype(font_path, 12)
    f_title = ImageFont.truetype(font_path, 56)
    f_tagline = ImageFont.truetype(font_path, 22)
    f_sub = ImageFont.truetype(font_path, 14)
    f_domain = ImageFont.truetype(font_path, 14)

    bx, by = 730, 115
    draw.rounded_rectangle([(bx, by), (bx + 280, by + 28)], radius=14, fill=(56, 189, 248, 28), outline=(56, 189, 248, 90), width=1)
    draw.text((bx + 14, by + 5), "● PHYSICS & SIMULATION ENGINE", font=f_badge, fill=(56, 189, 248, 255))

    by += 40
    draw.text((bx, by), "XTRA", font=f_title, fill=(255, 255, 255, 255))
    xtra_w = draw.textbbox((0, 0), "XTRA", font=f_title)[2]
    draw.text((bx + xtra_w + 2, by), "PATH", font=f_title, fill=(56, 189, 248, 255))

    by += 66
    draw.text((bx, by), "The Visual Physics & Simulation Engine", font=f_tagline, fill=(241, 245, 249, 255))

    by += 32
    draw.text((bx, by), "Interactive Kinematics • Math Animations • Auto-LaTeX Textbooks", font=f_sub, fill=(148, 163, 184, 255))

    by += 34
    dom = "https://www.xtrapath.com"
    dw = draw.textbbox((0, 0), dom, font=f_domain)[2] + 46
    draw.rounded_rectangle([(bx, by), (bx + dw, by + 34)], radius=10, fill=(56, 189, 248, 22), outline=(56, 189, 248, 75), width=1)
    draw.ellipse([(bx + 13, by + 13), (bx + 21, by + 21)], fill=(56, 189, 248, 255))
    draw.text((bx + 28, by + 6), dom, font=f_domain, fill=(56, 189, 248, 255))

    return banner

def build_all():
    print("🚀 Starting XtraPath Ultra-Premium Brand Asset Pipeline...")
    temp_dir = tempfile.mkdtemp(prefix="xtrapath_assets_")
    font_path = get_comic_sans_font_path()
    print(f"Using Comic Sans font: {font_path}")
    
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
        # 5. Open Graph & Twitter Social Card: 1200x630 (Comic Sans MS Bold)
        # ----------------------------------------------------
        print("Composing 1200x630 Social Card with Comic Sans MS Bold...")
        card_rgba = compose_social_card(master_logo, font_path)
        card_rgb = card_rgba.convert("RGB")
        
        card_png_styles = os.path.join(STYLES_DIR, "brand-social-card.png")
        card_png_root = os.path.join(SRC_DIR, "brand-social-card.png")
        card_jpg_styles = os.path.join(STYLES_DIR, "brand-social-card.jpg")
        card_jpg_root = os.path.join(SRC_DIR, "brand-social-card.jpg")
        
        # Save Progressive JPEG
        card_rgb.save(card_jpg_styles, "JPEG", quality=90, progressive=True, optimize=True)
        card_rgb.save(card_jpg_root, "JPEG", quality=90, progressive=True, optimize=True)
        
        # Save Palette-Optimized PNG (<300KB guaranteed)
        q_card = card_rgb.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        q_card.save(card_png_styles, "PNG", optimize=True)
        q_card.save(card_png_root, "PNG", optimize=True)
        
        png_sz = os.path.getsize(card_png_styles)
        jpg_sz = os.path.getsize(card_jpg_styles)
        print(f"  ✓ Saved 1200x630 social card PNG: {png_sz:,} bytes (Threshold: <300,000 bytes)")
        print(f"  ✓ Saved 1200x630 social card JPG: {jpg_sz:,} bytes")
        assert png_sz < 300000, f"Social card PNG {png_sz} exceeds 300KB WhatsApp threshold!"

        # ----------------------------------------------------
        # 6. Twitter / X Header Banner: 1500x500 (Comic Sans MS Bold)
        # ----------------------------------------------------
        print("Composing 1500x500 Twitter Banner with Comic Sans MS Bold...")
        banner_rgba = compose_twitter_banner(master_logo, font_path)
        banner_rgb = banner_rgba.convert("RGB")
        
        banner_styles = os.path.join(STYLES_DIR, "brand-twitter-banner.png")
        banner_root = os.path.join(SRC_DIR, "brand-twitter-banner.png")
        
        q_banner = banner_rgb.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        q_banner.save(banner_styles, "PNG", optimize=True)
        q_banner.save(banner_root, "PNG", optimize=True)
        banner_sz = os.path.getsize(banner_styles)
        print(f"  ✓ Saved 1500x500 Twitter banner: {banner_sz:,} bytes")

        print("\n🎉 ALL PLATFORM BRANDING ASSETS GENERATED & VERIFIED SUCCESSFULLY WITH COMIC SANS MS BOLD!")
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    build_all()
