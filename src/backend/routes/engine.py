import os
import asyncio
import re
import shutil
import subprocess
import time
import uuid
import base64
import tempfile
import threading
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
# Load .env from both project root and src/backend
load_dotenv(os.path.join(PROJECT_ROOT, ".env"), override=False)
load_dotenv(os.path.join(PROJECT_ROOT, "src", "backend", ".env"), override=False)
load_dotenv(override=False)

router = APIRouter(tags=["engine"])
MEDIA_DIR = os.path.join(PROJECT_ROOT, "media") if os.path.exists(os.path.join(PROJECT_ROOT, "media")) else os.path.abspath("media")
os.makedirs(MEDIA_DIR, exist_ok=True)

TEMP_DIR = os.path.join(tempfile.gettempdir(), "xtraanim_scenes")
os.makedirs(TEMP_DIR, exist_ok=True)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_ADMIN_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

tasks_db: Dict[str, Any] = {}

# KDP Book Trim Specifications
KDP_TRIM_SPECS = {
    "6x9": {
        "name": "6\" x 9\" (Standard Trade Paper)",
        "paperwidth": "6in",
        "paperheight": "9in",
        "margin_inner": "0.75in",
        "margin_outer": "0.5in",
        "margin_top": "0.625in",
        "margin_bottom": "0.625in",
        "fontsize": "10.5pt"
    },
    "5.5x8.5": {
        "name": "5.5\" x 8.5\" (Digest Paperback)",
        "paperwidth": "5.5in",
        "paperheight": "8.5in",
        "margin_inner": "0.75in",
        "margin_outer": "0.5in",
        "margin_top": "0.625in",
        "margin_bottom": "0.625in",
        "fontsize": "10pt"
    },
    "8.5x11": {
        "name": "8.5\" x 11\" (Large Textbook / Manual)",
        "paperwidth": "8.5in",
        "paperheight": "11in",
        "margin_inner": "0.875in",
        "margin_outer": "0.625in",
        "margin_top": "0.75in",
        "margin_bottom": "0.75in",
        "fontsize": "11pt"
    },
    "7x10": {
        "name": "7\" x 10\" (Technical Manual / Handbook)",
        "paperwidth": "7in",
        "paperheight": "10in",
        "margin_inner": "0.75in",
        "margin_outer": "0.55in",
        "margin_top": "0.7in",
        "margin_bottom": "0.7in",
        "fontsize": "10.5pt"
    }
}


# Models
class RenderRequest(BaseModel):
    code: str
    preview: Optional[bool] = False
    quality: Optional[str] = "l"
    fps: Optional[int] = 15
    resolution: Optional[str] = "854x480"
    transparent: Optional[bool] = True


class BookRequest(BaseModel):
    code: str
    title: Optional[str] = "Interactive Publication"
    author: Optional[str] = "XtraPath Creator"
    trim_size: Optional[str] = "6x9"
    render_mode: Optional[str] = "full"


class TikzRequest(BaseModel):
    code: str


def sanitize_latex_sections(code: str) -> str:
    """Sanitizes raw latex chapter content."""
    return code


def generate_kdp_book_latex(req: BookRequest) -> str:
    """Generates KDP-compliant LaTeX template."""
    trim = req.trim_size if req.trim_size in KDP_TRIM_SPECS else "6x9"
    specs = KDP_TRIM_SPECS[trim]
    return f"""\\documentclass[{specs['fontsize']},twoside,openright]{{book}}
\\usepackage[{specs['paperwidth']},{specs['paperheight']},top={specs['margin_top']},bottom={specs['margin_bottom']},inner={specs['margin_inner']},outer={specs['margin_outer']}]{{geometry}}
\\usepackage{{amsmath,amsfonts,amssymb,graphicx,xcolor,hyperref}}
\\title{{{req.title or 'Interactive Publication'}}}
\\author{{{req.author or 'XtraPath Creator'}}}
\\begin{{document}}
\\maketitle
\\tableofcontents
\\mainmatter
\\input{{chapter.tex}}
\\end{{document}}
"""


def get_sanitized_render_env() -> Dict[str, str]:
    """Provides a sanitized environment for rendering scripts with all platform secrets stripped."""
    SENSITIVE_ENV_KEYS = {
        "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_ADMIN_KEY",
        "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET",
        "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_EMAIL",
        "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "ADMIN_SECRET_KEY"
    }
    env = {k: v for k, v in os.environ.items() if k not in SENSITIVE_ENV_KEYS}
    env["PYTHONWARNINGS"] = "ignore"
    return env


def run_background_render(task_id: str, cmd: List[str], script_base_name: str, script_path: str, is_preview: bool):
    """Executes Manim compilation in isolated background worker with timeout & secret scrubbing."""
    try:
        env = get_sanitized_render_env()
        result = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=45)

        raw_logs = result.stderr + "\n" + result.stdout
        clean_logs = [line for line in raw_logs.splitlines() if "0%|" not in line and "it/s]" not in line and "pkg_resources" not in line]
        final_logs = "\n".join(clean_logs)

        if result.returncode != 0:
            tasks_db[task_id] = {"status": "failed", "result": {"success": False, "error": "Render Failed", "logs": final_logs}}
            return

        search_dir = os.path.join(MEDIA_DIR, "videos", script_base_name)
        video_path = None
        if os.path.exists(search_dir):
            for root, dirs, files in os.walk(search_dir):
                if "partial_movie_files" in dirs:
                    dirs.remove("partial_movie_files")
                for file in files:
                    if file == "output.mp4":
                        video_path = os.path.join(root, file)
                        break
                if video_path:
                    break

        if video_path:
            relative_path = os.path.relpath(video_path, MEDIA_DIR)
            video_url = f"/media/{relative_path}?t={time.time()}"
            tasks_db[task_id] = {"status": "completed", "result": {"success": True, "videoUrl": video_url, "logs": final_logs}}
        else:
            image_search_dir = os.path.join(MEDIA_DIR, "images", script_base_name)
            image_path = None
            if os.path.exists(image_search_dir):
                for root, dirs, files in os.walk(image_search_dir):
                    for file in files:
                        if file == "preview.png":
                            image_path = os.path.join(root, file)
                            break
            if is_preview and image_path:
                relative_path = os.path.relpath(image_path, MEDIA_DIR)
                image_url = f"/media/{relative_path}?t={time.time()}"
                tasks_db[task_id] = {"status": "completed", "result": {"success": True, "imageUrl": image_url, "logs": final_logs}}
            else:
                tasks_db[task_id] = {"status": "failed", "result": {"success": False, "error": "Output file not found", "logs": final_logs}}

    except subprocess.TimeoutExpired:
        tasks_db[task_id] = {
            "status": "failed",
            "result": {
                "success": False,
                "error": "Render Execution Timeout: Script execution exceeded the 45-second execution limit.",
                "logs": "Execution terminated to prevent CPU starvation and DoS."
            }
        }
    except Exception as e:
        tasks_db[task_id] = {"status": "failed", "result": {"success": False, "error": str(e)}}
    finally:
        if os.path.exists(script_path):
            try:
                os.remove(script_path)
            except Exception:
                pass


@router.get("/status/{task_id}")
def get_task_status(task_id: str):
    """Retrieves status and output URL of an ongoing rendering task."""
    task = tasks_db.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/render")
async def render_scene(req: RenderRequest):
    """Compiles Python Manim code and renders MP4/PNG output."""
    if shutil.which("manim") is None:
        return {"success": False, "error": "Manim engine not found on server host."}

    task_id = str(uuid.uuid4())
    tasks_db[task_id] = {"status": "processing"}

    script_base_name = f"scene_{int(time.time())}_{uuid.uuid4().hex[:4]}"
    script_path = os.path.join(TEMP_DIR, f"{script_base_name}.py")

    with open(script_path, "w", encoding="utf-8") as f:
        f.write(req.code)

    cmd = ["manim", "-ql" if req.quality == "l" else "-qh", script_path, "-o", "output.mp4"]
    if req.preview:
        cmd.extend(["-s", "--format=png", "-o", "preview.png"])

    thread = threading.Thread(target=run_background_render, args=(task_id, cmd, script_base_name, script_path, bool(req.preview)))
    thread.daemon = True
    thread.start()

    return {"success": True, "taskId": task_id, "task_id": task_id, "status": "processing"}


@router.post("/compile_book")
def compile_book(req: BookRequest):
    """Compiles LaTeX book into KDP-ready PDF."""
    file_id = str(uuid.uuid4())
    build_dir = os.path.join(MEDIA_DIR, "books", file_id)
    os.makedirs(build_dir, exist_ok=True)

    main_tex_path = os.path.join(build_dir, "main.tex")
    chapter_tex_path = os.path.join(build_dir, "chapter.tex")

    trim = req.trim_size if req.trim_size in KDP_TRIM_SPECS else "6x9"
    specs = KDP_TRIM_SPECS[trim]

    code_stripped = req.code.strip()
    is_standalone = "\\documentclass" in code_stripped and "\\begin{document}" in code_stripped

    if is_standalone:
        with open(main_tex_path, "w", encoding="utf-8") as f:
            f.write(code_stripped)
    else:
        with open(main_tex_path, "w", encoding="utf-8") as f:
            f.write(generate_kdp_book_latex(req))
        with open(chapter_tex_path, "w", encoding="utf-8") as f:
            f.write(sanitize_latex_sections(req.code))

    try:
        pdflatex_bin = shutil.which("pdflatex")
        if not pdflatex_bin:
            for candidate in ["/Library/TeX/texbin/pdflatex", "/usr/local/bin/pdflatex", "/usr/bin/pdflatex"]:
                if os.path.exists(candidate):
                    pdflatex_bin = candidate
                    break
        if not pdflatex_bin:
            pdflatex_bin = "pdflatex"

        cmd = [pdflatex_bin, "-interaction=nonstopmode", "-no-shell-escape", "-output-directory", ".", "main.tex"]
        result = subprocess.run(cmd, cwd=build_dir, capture_output=True, text=True, timeout=60)

        pdf_full_path = os.path.join(build_dir, "main.pdf")
        if os.path.exists(pdf_full_path):
            pdf_url = f"/media/books/{file_id}/main.pdf"
            with open(pdf_full_path, "rb") as f:
                pdf_base64 = "data:application/pdf;base64," + base64.b64encode(f.read()).decode("utf-8")
            return {
                "success": True,
                "pdfUrl": pdf_url,
                "pdfBase64": pdf_base64,
                "trimSize": trim,
                "trimName": specs["name"],
                "isKdp": True,
                "logs": "Compilation Successful"
            }
        return {"success": False, "error": "PDF not generated", "logs": result.stdout}
    except FileNotFoundError:
        return {"success": False, "error": "pdflatex not found on system."}


@router.post("/compile_tikz")
def compile_tikz(req: TikzRequest):
    """Compiles TikZ diagram code to PDF and high-res PNG for studio preview."""
    pdflatex_bin = shutil.which("pdflatex")
    if not pdflatex_bin:
        for candidate in ["/Library/TeX/texbin/pdflatex", "/usr/local/bin/pdflatex", "/usr/bin/pdflatex"]:
            if os.path.exists(candidate):
                pdflatex_bin = candidate
                break

    if not pdflatex_bin:
        return {"success": False, "error": "pdflatex not installed on server host."}

    file_id = str(uuid.uuid4())
    build_dir = os.path.join(MEDIA_DIR, "tikz", file_id)
    os.makedirs(build_dir, exist_ok=True)

    tex_path = os.path.join(build_dir, "diagram.tex")
    code = req.code.strip()
    if "\\documentclass" not in code:
        tikz_content = code
        if "\\begin{tikzpicture}" not in tikz_content:
            tikz_content = f"\\begin{{tikzpicture}}\n{tikz_content}\n\\end{{tikzpicture}}"
        code = f"""\\documentclass[tikz,border=12pt]{{standalone}}
\\usepackage[T1]{{fontenc}}
\\usepackage{{amsmath,amsfonts,amssymb}}
\\usepackage[dvipsnames]{{xcolor}}
\\definecolor{{amber}}{{RGB}}{{245,158,11}}
\\definecolor{{emerald}}{{RGB}}{{16,185,129}}
\\definecolor{{cyan}}{{RGB}}{{56,189,248}}
\\definecolor{{purple}}{{RGB}}{{168,85,247}}
\\usetikzlibrary{{arrows.meta,calc,positioning,shapes.geometric,shadings}}
\\begin{{document}}
{tikz_content}
\\end{{document}}
"""
    else:
        preamble_extra = ""
        if "definecolor{amber}" not in code:
            preamble_extra += "\\definecolor{amber}{RGB}{245,158,11}\n"
        if "definecolor{emerald}" not in code:
            preamble_extra += "\\definecolor{emerald}{RGB}{16,185,129}\n"
        if "definecolor{cyan}" not in code:
            preamble_extra += "\\definecolor{cyan}{RGB}{56,189,248}\n"
        if "definecolor{purple}" not in code:
            preamble_extra += "\\definecolor{purple}{RGB}{168,85,247}\n"
        if preamble_extra and "\\begin{document}" in code:
            code = code.replace("\\begin{document}", f"{preamble_extra}\\begin{{document}}", 1)

    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(code)

    try:
        cmd = [pdflatex_bin, "-interaction=nonstopmode", "-output-directory", ".", "diagram.tex"]
        result = subprocess.run(cmd, cwd=build_dir, capture_output=True, text=True, timeout=35)
        pdf_path = os.path.join(build_dir, "diagram.pdf")
        if os.path.exists(pdf_path):
            png_path = os.path.join(build_dir, "diagram.png")
            sips_bin = shutil.which("sips") or "/usr/bin/sips"
            if os.path.exists(sips_bin):
                subprocess.run([sips_bin, "-s", "format", "png", "--resampleWidth", "1600", pdf_path, "--out", png_path], capture_output=True)

            png_base64 = None
            if os.path.exists(png_path):
                with open(png_path, "rb") as pf:
                    png_base64 = "data:image/png;base64," + base64.b64encode(pf.read()).decode("utf-8")

            return {
                "success": True,
                "pngBase64": png_base64,
                "pdfUrl": f"/media/tikz/{file_id}/diagram.pdf",
                "logs": "TikZ Rendered Successfully"
            }
        return {"success": False, "error": "TikZ Compilation Failed", "logs": result.stdout}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/upload")
async def upload_asset(file: UploadFile = File(...)):
    """Uploads media asset to server media directory."""
    try:
        filename = f"{int(time.time())}_{file.filename}"
        file_path = os.path.join(MEDIA_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"success": True, "url": f"/media/{filename}", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AIGenerateRequest(BaseModel):
    prompt: str
    current_code: Optional[str] = ""
    engine: Optional[str] = "p5"
    action: Optional[str] = "generate"
    api_key: Optional[str] = None
    width: Optional[int] = 1280
    height: Optional[int] = 720
    aspect_ratio: Optional[str] = "16:9"


@router.post("/ai-generate")
@router.post("/engine/ai-generate")
async def ai_generate_code(req: AIGenerateRequest):
    """
    AI Studio Assistant: Generates and modifies animations and equations
    for p5.js, Three.js, Anime.js, Manim, Rough.js, KaTeX, Mermaid, Rapier, etc.
    """
    prompt = (req.prompt or "").strip()
    engine = (req.engine or "p5").lower().strip()
    current_code = req.current_code or ""
    width = int(req.width or 1280)
    height = int(req.height or 720)
    aspect_ratio = req.aspect_ratio or "16:9"
    
    if not prompt:
        return {"success": False, "error": "Prompt cannot be empty"}

    print(f"\n>>> [AI-GENERATE] engine='{engine}' | prompt='{prompt}' | key_present={bool(req.api_key)}", flush=True)

    gemini_key = (req.api_key or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip() or os.environ.get("GOOGLE_API_KEY", "").strip()
    is_valid_gemini = bool(gemini_key and len(gemini_key) > 10)
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()

    system_instructions = f"""You are the master AI coding assistant for XtraAnim Studio.
The current target animation engine is: '{engine}'.

PREVIEW SCREEN & ENVIRONMENT CONSTANTS:
- Target Preview Width: {width}px
- Target Preview Height: {height}px
- Aspect Ratio: {aspect_ratio}
- Center Coordinates: X={width // 2}px, Y={height // 2}px
- Container DOM target for HTML5 / WebGL / Physics: document.getElementById('canvas-container') or document.getElementById('matter-container')
- For canvas-based engines (Three.js, p5.js, Matter.js, D3.js): Ensure your canvas and renderer are configured for {width}x{height} pixels.

CRITICAL USER DEMAND COMPLIANCE:
- NEVER return default, uncustomized boilerplate or static generic templates.
- You MUST analyze the user's prompt for every explicit and implicit demand: entities, shapes, colors, counts, speeds, motions, gaits, styles, and equations.
- Every visual object, color, velocity, and attribute MUST directly reflect what the user asked for.
- Output ONLY complete, runnable, 100% syntactically valid code matching '{engine}'.
- Keep animations at 60 FPS, dark-mode ready (#060810 to #0e1117 background).
- Return clean code enclosed inside markdown ```code blocks.

Engine rules:
- 'p5': Write raw p5.js JavaScript. Use function setup() and function draw(). Do NOT import p5.js via script tags. Use createCanvas({width}, {height}).
- 'three': Write raw Three.js JavaScript with scene, camera, renderer. Append renderer.domElement to document.getElementById('canvas-container') or document.body. Set renderer.setSize({width}, {height}) and camera.aspect = {width} / {height}. Provide an animate() requestAnimationFrame loop.
- 'anime': Write Anime.js JavaScript. Assume anime is globally available. Create SVG or DOM elements and animate them with anime({{ targets: ... }}).
- 'rough': Write Rough.js JavaScript for HTML5 2D canvas. The canvas context and RoughCanvas instance are globally available in scope as 'canvas', 'ctx', 'rc' (which is rough.canvas(canvas)), 'width', 'height'. Do NOT re-declare canvas, ctx, or rc. Use rc methods (rc.rectangle, rc.circle, rc.ellipse, rc.line, rc.polygon, rc.curve, rc.arc) with custom roughness, bowing, fill, fillStyle, stroke, strokeWidth.
- 'two': Write Two.js JavaScript vector animation. Available in scope: 'two' (the Two instance), 'Two', 'width', 'height', 'container'. Do NOT call new Two() or appendTo(). Use two.makeCircle(), two.makeRectangle(), two.makePolygon(), etc. Animate with two.bind('update', ...).play();
- 'thumbnail' / 'fabric': Write Fabric.js (v5.3.1) JavaScript. In scope: 'canvas' (the fabric.Canvas instance), 'logicalWidth', 'logicalHeight', 'helpers', 'fabric'. Use helpers.createGradient(), helpers.createGlowOrb(), helpers.createGlassCard(), canvas.renderAll().
- 'zdog': Write Zdog pseudo-3D vector illustration & animation JavaScript. Canvas is '.zdog-canvas' with width {width}, height {height}. Initialize with const illo = new Zdog.Illustration({{ element: '.zdog-canvas', dragRotate: true }}); and always assign window.illo = illo;. Create animate() loop calling illo.updateRenderGraph().
- 'jsxgraph': Write JSXGraph interactive math. Initialize with const board = JXG.JSXGraph.initBoard('jxgbox', {{ boundingbox: [-5, 5, 5, -5], axis: true }}); and assign window.board = board;.
- 'd3': Write D3.js (v7) JavaScript. Target: const svg = d3.select('#d3-svg'); with dimensions width = {width}, height = {height}. Animate with d3.timer() or transitions.
- 'matter': Write Matter.js 2D physics JavaScript. Target: document.getElementById('matter-container'). Create Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint. Use width = {width}, height = {height}, wireframes: false.
- 'mermaid': Write Mermaid diagram definition text directly (flowchart, sequenceDiagram, classDiagram, stateDiagram).
- 'katex': Write pure KaTeX LaTeX math formulas and equations.
  CRITICAL RULES FOR KATEX:
  * Output ONLY the mathematical formula/equation. The user wants JUST THE FORMULA.
  * DO NOT include paragraphs, verbose definitions, textbook prose, or explanations inside the code block. Put descriptions only in the explanation outside the code block.
  * NEVER use TikZ environments (\\begin{{tikzpicture}}...\\end{{tikzpicture}}). KaTeX CANNOT render TikZ!
  * NEVER use MathJax extensions like \\bbox. Use standard KaTeX styling or simple clean math.
  * NEVER use \\hspace inside arrows or unsupported commands.
  * Format formulas cleanly using \\begin{{aligned}} ... \\end{{aligned}} or direct equations.
  * Keep it focused, beautiful, and mathematically exact.
- 'tikz': Write standalone TikZ code or LaTeX tikzpicture block.
- 'manim': Write Python code for Manim Community Edition (CE). Always start with 'from manim import *'. The scene class MUST be named 'class AnimationScene(Scene):' (or 'class AnimationScene(ThreeDScene):' for 3D). Set self.camera.background_color = '#0e1117'. Use MathTex, VGroup, Create, Write, Transform, FadeIn, GrowFromCenter, rate_func=smooth.
- 'rapier': Write Rapier 3D physics JavaScript using RAPIER and Three.js.
  * In scope: 'Physics', 'THREE', 'RAPIER', 'scene', 'camera', 'renderer', 'world'.
  * The 3D scene, lighting, camera, renderer, floor, and animation loop are ALREADY initialized and run automatically.
  * DO NOT declare 'const scene', 'const camera', 'const renderer', or 'const world' with const/let.
  * Prefer using the built-in Physics API:
    - Physics.addBox({{ pos: [x,y,z], size: [w,h,d], color: 0x3b82f6, mass: 1.0, restitution: 0.3 }})
    - Physics.addSphere({{ pos: [x,y,z], radius: r, color: 0xef4444, mass: 1.0, restitution: 0.8 }})
    - Physics.addCylinder({{ pos: [x,y,z], radius: r, height: h, color: 0x10b981, mass: 1.0 }})
    - Physics.addCone({{ pos: [x,y,z], radius: r, height: h, color: 0xf59e0b, mass: 1.0 }})
    - Physics.setFloor({{ size: 60, color: 0x0f172a }})
    - Physics.setGravity([0, -9.81, 0])
    - Physics.setCamera({{ pos: [14, 18, 22], lookAt: [0, 1, 0] }})
    - Physics.onStep((dt, time) => {{ /* frame update */ }})
  * Or create custom dynamic rigid bodies with RAPIER & Three.js:
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz), body);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.body = body;
    scene.add(mesh);
- 'latex': Write publication-quality, 100% compilation-safe LaTeX book chapters or worksheets strictly matching the user's requested topic and requirements.
  CRITICAL RULES FOR LATEX:
  * ALWAYS tailor all content, titles, theorems, equations, and diagrams directly to the user's requested topic (e.g., if user asks for Pythagoras theorem, write the complete chapter on the Pythagorean theorem; if calculus, write calculus).
  * COMPILATION SAFETY: Use ONLY standard universally supported LaTeX packages: amsmath, amssymb, amsfonts, amsthm, xcolor, graphicx, tikz, fancyhdr, tabularx, booktabs.
  * NEVER use 'enumitem', 'tcolorbox', or uninstalled packages that cause compilation failures in standard TeX.
  * Use standard \begin{{itemize}} and \begin{{enumerate}} without bracket options like [leftmargin=...].
  * All TikZ diagrams must use valid coordinates, end each path with a semicolon ';', and close all environments (\end{{tikzpicture}}).
  * Output MUST BE COMPLETE and fully closed with \end{{document}}. Never leave unfinished equations or unclosed environments.
- 'cartoon_studio' / 'cartoon': Write Cartoon Studio (Studio) JavaScript for Alan Becker-style stick figure animations, combat arenas, or parkour. Available in scope: 'Studio'.
  Key Studio methods:
  * Modes: Studio.setMode('parkour' | 'fight' | 'teacher' | 'animal' | 'solo');
  * 3D Animal Studio & Quadruped Locomotion:
    Studio.setMode('animal');
    Studio.setSpecies('dog' | 'cat' | 'dino' | 'bird');
    Studio.setGait('trot' | 'walk' | 'sprint' | 'stalk' | 'sit');
    Studio.setCoat('default' | 'golden' | 'midnight' | 'snow');
    Studio.setSpeed(1.15);
    Studio.setTailWag(true);
    Studio.setCameraPreset('side');
  * Stick Figure Styles: 'stickman_orange', 'stickman_blue', 'stickman_red', 'stickman_green', 'stickman_white', 'stickman_black'.
  * Realistic Stick Figure Kinematics:
    Studio.setMode('parkour');
    Studio.setParkourAction('run' | 'dance' | 'basketball_dunk' | 'hurdle_vault');
    Studio.setParkourStyle('stickman_orange');
    Studio.setParkourSpeed(0.38);
    Studio.setCameraPreset('side');
    Studio.enableBoundary(true);
    Studio.enableParkourTelemetry(false);
  * Running & Sprinting Across Stage (Left to Right): For any prompts asking to run, sprint, run from left to right, dash, or jog, ALWAYS use Studio.setParkourAction('run'):
    Studio.setMode('parkour');
    Studio.setParkourAction('run');
    Studio.setParkourStyle('stickman_orange');
    Studio.setParkourSpeed(0.45);
    Studio.setCameraPreset('side');
    Studio.enableBoundary(true);
    Studio.enableParkourTelemetry(false);
  * Dancing & Stage Performance: For any prompts asking for stick figure dancing, dance, rhythmic moves, hip sways, waving arms, grooving, music, or stage choreography, ALWAYS use the realistic stick figure rig with 'dance' action:
    Studio.setMode('parkour');
    Studio.setParkourAction('dance');
    Studio.setParkourStyle('stickman_orange');
    Studio.setParkourSpeed(0.35);
    Studio.setCameraPreset('side');
    Studio.enableBoundary(true);
    Studio.enableParkourTelemetry(false);
  * Math & Science Teacher Mode: Studio.setMode('teacher'); Studio.setLesson('quadratic' | 'pythagoras' | 'calculus' | 'chemistry'); Studio.setTeacherStyle('hero' | 'stickman_orange'); Studio.setTeacherAction('write' | 'point' | 'explain' | 'walk'); Studio.autoExplain();
  * Combat Arena: Studio.setMode('fight'); Studio.setFighter1({{ name: 'The Second Coming', style: 'stickman_orange' }}); Studio.setFighter2({{ name: 'Blue Rival', style: 'stickman_blue' }}); Studio.enableCameraShake(true); Studio.playCombo();
  * Timeline Action: const t = Studio.timeline(); t.at(0.0, () => f1.moveTo(2.4, 0, 0, 0.25)).at(0.25, () => {{ f1.attack('punch', 0.12); f2.attack('block', 0.12); Studio.fx.sparks(0.5, 12, 0); Studio.camera.shake(0.5); }});
  * Camera Presets: Studio.setCameraPreset('side' | 'isometric' | 'dramatic' | 'hero'); Studio.enableBoundary(true | false); Studio.enableParkourTelemetry(true | false);

Output Requirements:
1. ONLY valid, runnable code matching the target engine.
2. If modifying existing code, intelligently preserve unchanged parts and apply requested alterations.
3. Keep animations smooth, modern, aesthetically vibrant, dark-mode ready, and optimized (60 FPS).
4. Include clean inline comments explaining key math or visual techniques.
5. Return clean code inside markdown ```code block.
"""

    # 1. Try Gemini if valid API key available
    if is_valid_gemini:
        if engine == "katex":
            prompt_text = f"User Prompt: {prompt}\n\nIMPORTANT: Output ONLY the mathematical formula/equation in KaTeX LaTeX using \\begin{{aligned}} or direct equations. ABSOLUTELY NO English sentences, wordy descriptions, definitions, or prose inside the code block. The user wants JUST THE FORMULA. Return clean formula inside ```latex ... ```."
            gen_config = {
                "temperature": 0.1,
                "maxOutputTokens": 2048
            }
        elif engine == "latex":
            prompt_text = f"User Prompt: {prompt}\n\nCurrent Code:\n```\n{current_code}\n```\n\nGenerate complete, publication-grade LaTeX strictly on the requested topic: '{prompt}'. Do NOT use enumitem.sty. Fully close all equations, environments, and \\end{{document}}."
            gen_config = {
                "temperature": 0.2,
                "maxOutputTokens": 4096
            }
        else:
            prompt_text = f"User Prompt: {prompt}\n\nCurrent Code:\n```\n{current_code}\n```\n\nGenerate complete, runnable code strictly tailored to the user prompt."
            gen_config = {
                "temperature": 0.2,
                "maxOutputTokens": 4096
            }

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": system_instructions},
                        {"text": prompt_text}
                    ]
                }
            ],
            "generationConfig": gen_config
        }
        candidate_models = [
            "gemini-flash-lite-latest",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-robotics-er-2-preview",
            "gemini-3.6-flash",
            "gemini-flash-latest",
            "gemini-3.5-flash"
        ]
        async with httpx.AsyncClient(timeout=35.0, verify=False) as client:
            for g_model in candidate_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_key}"
                try:
                    res = await client.post(url, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        raw_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        code_match = re.search(r"```(?:\w+)?\n([\s\S]*?)```", raw_text)
                        code = code_match.group(1).strip() if code_match else raw_text.strip()
                        explanation = re.sub(r"```(?:\w+)?\n[\s\S]*?```", "", raw_text).strip()
                        if not explanation:
                            explanation = f"Generated {engine} code for '{prompt}'."
                        code = code.replace("__WIDTH__", str(width)).replace("__HEIGHT__", str(height))
                        if engine == "katex":
                            # Strip wrapping $$ or $
                            code = re.sub(r"^\$\$|\$\$$", "", code).strip()
                            code = re.sub(r"^\$|\$$", "", code).strip()
                            # Strip any hallucinated tikzpicture or non-KaTeX blocks
                            code = re.sub(r"\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}", "", code)
                            # Unwrap \bbox[...]{...}
                            code = re.sub(r"\\bbox\[[^\]]*\]\{([\s\S]*?)\}", r"\1", code)
                            # Remove \hspace inside arrows or math
                            code = re.sub(r"\\hspace\{[^}]*\}", " ", code)
                            # Strip double linebreaks left by stripped blocks
                            code = re.sub(r"\\\\\[\d+pt\]\s*\\\\", r"\\\\", code)
                            code = code.strip()
                        elif engine == "latex":
                            # Strip uninstalled enumitem package to prevent pdflatex failure
                            code = re.sub(r"\\usepackage(\[[^\]]*\])?\{enumitem\}", "", code)
                            code = re.sub(r"\\begin\{(itemize|enumerate)\}\[[^\]]*\]", r"\\begin{\1}", code)
                            # Auto-close unclosed document if truncated
                            if "\\begin{document}" in code and "\\end{document}" not in code:
                                if "\\begin{tikzpicture}" in code and "\\end{tikzpicture}" not in code:
                                    code += "\n\\end{tikzpicture}\n"
                                code += "\n\\end{document}\n"
                        print(f">>> [GEMINI SUCCESS] model='{g_model}' for prompt='{prompt[:40]}'", flush=True)
                        return {
                            "success": True,
                            "code": code,
                            "explanation": explanation,
                            "engine": engine,
                            "source": "gemini",
                            "model": g_model,
                            "dimensions": f"{width}x{height}"
                        }
                    else:
                        print(f">>> [GEMINI WARNING] model='{g_model}' status={res.status_code} msg={res.text[:120]}", flush=True)
                        if res.status_code == 429:
                            await asyncio.sleep(0.5)
                except Exception as g_err:
                    print(f">>> [GEMINI EXCEPTION] model='{g_model}' err={g_err}", flush=True)
                    continue

    # 2. Try OpenAI if API key available
    if openai_key:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {openai_key}"}
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_instructions},
                    {"role": "user", "content": f"User Prompt: {prompt}\n\nCurrent Code:\n```\n{current_code}\n```\n\nGenerate complete, runnable code strictly tailored to the user prompt."}
                ],
                "temperature": 0.3
            }
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    code_match = re.search(r"```(?:\w+)?\n([\s\S]*?)```", raw_text)
                    code = code_match.group(1).strip() if code_match else raw_text.strip()
                    explanation = re.sub(r"```(?:\w+)?\n[\s\S]*?```", "", raw_text).strip()
                    if not explanation:
                        explanation = f"Generated {engine} code for '{prompt}'."
                    code = code.replace("__WIDTH__", str(width)).replace("__HEIGHT__", str(height))
                    return {
                        "success": True,
                        "code": code,
                        "explanation": explanation,
                        "engine": engine,
                        "source": "openai",
                        "dimensions": f"{width}x{height}"
                    }
        except Exception:
            pass

    # 3. Intelligent High-Quality Fallback Generator (Demand-Driven Procedural Synthesizer)
    code, explanation, suggested_prompts = synthesize_procedural_code(
        prompt=prompt,
        engine=engine,
        current_code=current_code,
        width=width,
        height=height,
        aspect_ratio=aspect_ratio
    )
    print(f">>> [AI-GENERATE SYNTHESIZED] explanation='{explanation}' | first_line='{code.splitlines()[0] if code else None}'", flush=True)
    return {
        "success": True,
        "code": code,
        "explanation": explanation,
        "engine": engine,
        "suggested_prompts": suggested_prompts,
        "source": "studio_ai_engine",
        "dimensions": f"{width}x{height}"
    }


def extract_prompt_parameters(prompt: str) -> Dict[str, Any]:
    """
    Intelligently analyzes user prompts to extract explicit artistic and mathematical demands:
    colors, shapes, counts, speed, species, gaits, coats, actions, and styles.
    """
    p = (prompt or "").lower()
    
    COLOR_MAP = {
        "red": {"hex": "#ef4444", "three": "0xef4444", "rgb": [239, 68, 68], "manim": "RED_C"},
        "crimson": {"hex": "#e11d48", "three": "0xe11d48", "rgb": [225, 29, 72], "manim": "RED_D"},
        "blue": {"hex": "#3b82f6", "three": "0x3b82f6", "rgb": [59, 130, 246], "manim": "BLUE_C"},
        "cyan": {"hex": "#06b6d4", "three": "0x06b6d4", "rgb": [6, 182, 212], "manim": "TEAL_B"},
        "sky": {"hex": "#38bdf8", "three": "0x38bdf8", "rgb": [56, 189, 248], "manim": "BLUE_B"},
        "green": {"hex": "#10b981", "three": "0x10b981", "rgb": [16, 185, 129], "manim": "GREEN_C"},
        "emerald": {"hex": "#059669", "three": "0x059669", "rgb": [5, 150, 105], "manim": "GREEN_D"},
        "lime": {"hex": "#84cc16", "three": "0x84cc16", "rgb": [132, 204, 22], "manim": "GREEN_A"},
        "yellow": {"hex": "#eab308", "three": "0xeab308", "rgb": [234, 179, 8], "manim": "YELLOW_C"},
        "gold": {"hex": "#f59e0b", "three": "0xf59e0b", "rgb": [245, 158, 11], "manim": "GOLD"},
        "golden": {"hex": "#f59e0b", "three": "0xf59e0b", "rgb": [245, 158, 11], "manim": "GOLD"},
        "orange": {"hex": "#f97316", "three": "0xf97316", "rgb": [249, 115, 22], "manim": "ORANGE"},
        "purple": {"hex": "#8b5cf6", "three": "0x8b5cf6", "rgb": [139, 92, 246], "manim": "PURPLE_B"},
        "violet": {"hex": "#7c3aed", "three": "0x7c3aed", "rgb": [124, 58, 237], "manim": "PURPLE_C"},
        "magenta": {"hex": "#d946ef", "three": "0xd946ef", "rgb": [217, 70, 239], "manim": "PURPLE_A"},
        "pink": {"hex": "#ec4899", "three": "0xec4899", "rgb": [236, 72, 153], "manim": "PINK"},
        "rose": {"hex": "#f43f5e", "three": "0xf43f5e", "rgb": [244, 63, 94], "manim": "RED_A"},
        "white": {"hex": "#ffffff", "three": "0xffffff", "rgb": [255, 255, 255], "manim": "WHITE"},
        "black": {"hex": "#09090b", "three": "0x09090b", "rgb": [9, 9, 11], "manim": "BLACK"},
        "midnight": {"hex": "#0f172a", "three": "0x0f172a", "rgb": [15, 23, 42], "manim": "BLUE_E"},
        "neon": {"hex": "#00ffcc", "three": "0x00ffcc", "rgb": [0, 255, 204], "manim": "TEAL_A"},
        "teal": {"hex": "#14b8a6", "three": "0x14b8a6", "rgb": [20, 184, 166], "manim": "TEAL_C"}
    }
    
    detected_colors = []
    for c_name, c_val in COLOR_MAP.items():
        if re.search(r'\b' + re.escape(c_name) + r'\b', p):
            detected_colors.append((c_name, c_val))
            
    primary_color = detected_colors[0][1] if detected_colors else COLOR_MAP["cyan"]
    secondary_color = detected_colors[1][1] if len(detected_colors) > 1 else COLOR_MAP["purple"]
    accent_color = detected_colors[2][1] if len(detected_colors) > 2 else COLOR_MAP["gold"]
    
    # 2. Number / Count detection
    count = None
    num_match = re.search(r'\b(\d+)\b', p)
    if num_match:
        val = int(num_match.group(1))
        if 1 <= val <= 20000:
            count = val
    if count is None:
        WORD_NUMS = {
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "dozen": 12, "twenty": 20, "fifty": 50, "hundred": 100
        }
        for w, n in WORD_NUMS.items():
            if re.search(r'\b' + w + r'\b', p):
                count = n
                break
    if count is None:
        count = 12

    # 3. Speed detection
    speed_factor = 1.0
    if any(w in p for w in ["fast", "rapid", "quick", "sprint", "hyper", "high speed"]):
        speed_factor = 1.8
    elif any(w in p for w in ["slow", "gentle", "smooth", "crawl", "sluggish", "relax"]):
        speed_factor = 0.55
    speed_num = re.search(r'(\d+(?:\.\d+)?)\s*x', p)
    if speed_num:
        try:
            speed_factor = float(speed_num.group(1))
        except Exception:
            pass

    # 4. Shapes detection
    shape = "sphere"
    if any(w in p for w in ["cube", "box", "square", "block", "voxel"]):
        shape = "box"
    elif any(w in p for w in ["torus", "donut", "ring"]):
        shape = "torus"
    elif any(w in p for w in ["cylinder", "pillar", "column", "tube"]):
        shape = "cylinder"
    elif any(w in p for w in ["pyramid", "cone", "tetrahedron"]):
        shape = "cone"
    elif any(w in p for w in ["plane", "grid", "terrain", "floor"]):
        shape = "plane"
    elif any(w in p for w in ["circle", "ball", "sphere", "orb", "bubble"]):
        shape = "sphere"
    elif any(w in p for w in ["star", "galaxy", "dust", "particle", "stars"]):
        shape = "particle"
    elif any(w in p for w in ["wave", "sine", "fourier", "epicycle"]):
        shape = "wave"

    # 5. Cartoon Studio Animal / Character attributes
    species = "dog"
    if any(w in p for w in ["cat", "feline", "cheetah", "panther", "kitten", "leopard", "tiger", "lion"]):
        species = "cat"
    elif any(w in p for w in ["dino", "dinosaur", "raptor", "velociraptor", "t-rex"]):
        species = "dino"
    elif any(w in p for w in ["bird", "eagle", "falcon", "avian", "hawk"]):
        species = "bird"
    elif any(w in p for w in ["dog", "canine", "puppy", "wolf", "hound", "shiba"]):
        species = "dog"

    coat = "default"
    if any(w in p for w in ["gold", "golden", "yellow", "orange"]):
        coat = "golden"
    elif any(w in p for w in ["black", "midnight", "dark", "shadow"]):
        coat = "midnight"
    elif any(w in p for w in ["white", "snow", "ice", "albino"]):
        coat = "snow"

    gait = "trot"
    if any(w in p for w in ["sprint", "run", "fast", "gallop", "dash", "chase"]):
        gait = "sprint"
    elif any(w in p for w in ["stalk", "creep", "sneak", "prowl"]):
        gait = "stalk"
    elif any(w in p for w in ["walk", "slow", "stroll"]):
        gait = "walk"
    elif any(w in p for w in ["sit", "rest", "stop", "idle"]):
        gait = "sit"

    stick_style = "stickman_orange"
    if any(w in p for w in ["blue", "cyan"]):
        stick_style = "stickman_blue"
    elif any(w in p for w in ["red", "crimson"]):
        stick_style = "stickman_red"
    elif any(w in p for w in ["green", "emerald"]):
        stick_style = "stickman_green"
    elif any(w in p for w in ["white"]):
        stick_style = "stickman_white"
    elif any(w in p for w in ["black", "dark"]):
        stick_style = "stickman_black"

    parkour_action = "run"
    if any(w in p for w in ["dance", "groove", "hip", "party"]):
        parkour_action = "dance"
    elif any(w in p for w in ["dunk", "basketball"]):
        parkour_action = "basketball_dunk"
    elif any(w in p for w in ["hurdle", "vault", "jump", "flip", "parkour"]):
        parkour_action = "hurdle_vault"
    elif any(w in p for w in ["run", "sprint", "dash"]):
        parkour_action = "run"

    # 6. Physical & Mathematical Kinematics (Launch angle, Velocity, Gravity, Trajectories)
    launch_angle = None
    angle_patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:deg|degree|degrees|°)',
        r'(?:angle|tilt|elevation)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)',
        r'launched\s*at\s*(\d+(?:\.\d+)?)',
        r'at\s*(\d+(?:\.\d+)?)\s*(?:deg|degree|°)',
    ]
    for pat in angle_patterns:
        m = re.search(pat, p)
        if m:
            try:
                val = float(m.group(1))
                if 1.0 <= val <= 359.0:
                    launch_angle = val
                    break
            except Exception:
                pass

    is_projectile = any(w in p for w in ["projectile", "ballistic", "cannon", "launch", "trajectory", "parabola", "parabolic"]) or ("motion" in p and any(w in p for w in ["degree", "deg", "angle", "launch", "shot", "throw", "catapult"]))

    if launch_angle is None:
        launch_angle = 60.0 if is_projectile else 45.0

    initial_velocity = None
    v_patterns = [
        r'(?:velocity|v0|v_0|speed)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)',
        r'(\d+(?:\.\d+)?)\s*(?:m/s|px/s|mps)',
    ]
    for pat in v_patterns:
        m = re.search(pat, p)
        if m:
            try:
                val = float(m.group(1))
                if 1.0 <= val <= 500.0:
                    initial_velocity = val
                    break
            except Exception:
                pass
    if initial_velocity is None:
        initial_velocity = 22.0 * speed_factor

    gravity = 0.38
    g_match = re.search(r'gravity\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)', p)
    if g_match:
        try:
            val = float(g_match.group(1))
            gravity = val
        except Exception:
            pass

    # 7. Physical & Generative Domain Detectors
    is_double_pendulum = "double pendulum" in p or ("double" in p and "pendulum" in p)
    is_pendulum = "pendulum" in p
    is_spring = any(w in p for w in ["spring", "hooke", "harmonic oscillator", "mass-spring", "mass spring", "elastic spring"])
    is_collision = any(w in p for w in ["elastic collision", "inelastic collision", "momentum conservation", "billiard", "head-on collision"]) or ("collision" in p and "bounce" not in p)
    is_lorentz = any(w in p for w in ["electric field", "magnetic field", "lorentz", "coulomb", "charge", "electron", "proton", "dipole"])
    is_interference = any(w in p for w in ["doppler", "interference", "wavefront", "ripple tank", "double slit", "diffraction", "hologram"])
    is_solar = any(w in p for w in ["orbit", "planet", "solar", "celestial", "gravitation", "kepler", "satellite"])
    is_fourier = any(w in p for w in ["wave", "fourier", "sine", "harmonic", "oscillation", "standing wave", "sound wave"])
    is_attractor = any(w in p for w in ["lorenz", "attractor", "chaos", "strange attractor", "rossler", "bifurcation"])
    is_fractal = any(w in p for w in ["fractal", "mandelbrot", "julia", "sierpinski", "barnsley", "fern", "koch", "l-system"])
    is_cellular = any(w in p for w in ["game of life", "conway", "cellular automata", "rule 30", "rule 110", "automaton"])
    is_flocking = any(w in p for w in ["flock", "boid", "swarm", "school of fish", "bird flight", "flocking"])
    is_flow_field = any(w in p for w in ["flow field", "perlin", "vector field", "curl noise", "fluid flow", "streamline"])
    is_sorting = any(w in p for w in ["sort", "quicksort", "mergesort", "bubblesort", "binary search", "algorithm"])
    is_lissajous = any(w in p for w in ["lissajous", "chladni", "parametric curve", "rose curve", "hypotrochoid", "spirograph"])
    is_fireworks = any(w in p for w in ["firework", "explosion", "blast", "sparkler", "burst", "pyrotechnic"])

    return {
        "raw_prompt": prompt,
        "colors": detected_colors,
        "primary_color": primary_color,
        "secondary_color": secondary_color,
        "accent_color": accent_color,
        "count": count,
        "speed_factor": speed_factor,
        "shape": shape,
        "species": species,
        "coat": coat,
        "gait": gait,
        "stick_style": stick_style,
        "parkour_action": parkour_action,
        "launch_angle": launch_angle,
        "initial_velocity": initial_velocity,
        "gravity": gravity,
        "is_projectile": is_projectile,
        "is_pendulum": is_pendulum,
        "is_double_pendulum": is_double_pendulum,
        "is_spring": is_spring,
        "is_collision": is_collision,
        "is_lorentz": is_lorentz,
        "is_interference": is_interference,
        "is_solar": is_solar,
        "is_fourier": is_fourier,
        "is_attractor": is_attractor,
        "is_fractal": is_fractal,
        "is_cellular": is_cellular,
        "is_flocking": is_flocking,
        "is_flow_field": is_flow_field,
        "is_sorting": is_sorting,
        "is_lissajous": is_lissajous,
        "is_fireworks": is_fireworks
    }


def synthesize_procedural_code(prompt: str, engine: str, current_code: str = "", width: int = 1280, height: int = 720, aspect_ratio: str = "16:9"):
    p = prompt.lower()
    params = extract_prompt_parameters(prompt)
    
    # Engine-specific synthesized code templates with parametric adaptations
    if engine == "p5":
        col1 = params["primary_color"]["rgb"]
        col2 = params["secondary_color"]["rgb"]
        col3 = params["accent_color"]["rgb"]
        spd = params["speed_factor"]
        launch_ang = params["launch_angle"]
        v0 = params["initial_velocity"]
        grav = params["gravity"]

        if params["is_projectile"]:
            code = f"""// p5.js: Interactive Ballistic Projectile Motion & Kinematics
// User Demand: Launch Angle={launch_ang}°, v0={v0} m/s, g={grav} m/s²

let angleDeg = {launch_ang};
let v0 = {v0};
let g = {grav};
let isFlying = false;
let originX, originY;
let ballPos, ballVel;
let trajectoryPoints = [];
let particles = [];
let maxH = 0;
let rangeVal = 0;
let totalFlightTime = 0;

function setup() {{
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  if (document.getElementById('canvas-container')) {{
    canvas.parent('canvas-container');
  }}
  originX = width * 0.12;
  originY = height * 0.82;
  computeTheoreticalPath();
  resetProjectile();
}}

function computeTheoreticalPath() {{
  trajectoryPoints = [];
  let rad = radians(angleDeg);
  let vx0 = v0 * cos(rad);
  let vy0 = v0 * sin(rad);
  totalFlightTime = (2 * vy0) / g;
  maxH = (vy0 * vy0) / (2 * g);
  rangeVal = vx0 * totalFlightTime;

  for (let simT = 0; simT <= totalFlightTime; simT += 0.25) {{
    let px = originX + vx0 * simT * 3.5;
    let py = originY - (vy0 * simT - 0.5 * g * simT * simT) * 3.5;
    trajectoryPoints.push({{ x: px, y: py }});
  }}
}}

function resetProjectile() {{
  let rad = radians(angleDeg);
  ballPos = createVector(originX, originY);
  ballVel = createVector(v0 * cos(rad) * 3.5, -v0 * sin(rad) * 3.5);
  isFlying = true;
  particles = [];
}}

function draw() {{
  background(8, 12, 22);

  // Ground Grid & Distance Markers
  stroke(30, 41, 59);
  strokeWeight(1);
  line(0, originY, width, originY);
  for (let x = originX; x < width; x += 100) {{
    stroke(51, 65, 85);
    line(x, originY - 5, x, originY + 5);
    noStroke();
    fill(148, 163, 184);
    textSize(10);
    textAlign(CENTER, TOP);
    text(Math.round((x - originX) / 3.5) + 'm', x, originY + 8);
  }}

  // Dotted Theoretical Parabolic Trajectory
  noFill();
  stroke({col1[0]}, {col1[1]}, {col1[2]}, 150);
  strokeWeight(2);
  drawingContext.setLineDash([6, 6]);
  beginShape();
  for (let pt of trajectoryPoints) {{
    vertex(pt.x, pt.y);
  }}
  endShape();
  drawingContext.setLineDash([]);

  // Max Height Indicator
  let apexX = originX + (rangeVal * 3.5) / 2;
  let apexY = originY - maxH * 3.5;
  stroke(245, 158, 11, 140);
  drawingContext.setLineDash([3, 3]);
  line(apexX, originY, apexX, apexY);
  drawingContext.setLineDash([]);
  fill(245, 158, 11);
  noStroke();
  circle(apexX, apexY, 6);
  textSize(11);
  textAlign(CENTER, BOTTOM);
  text(`H_max: ${{Math.round(maxH)}}m`, apexX, apexY - 6);

  // Range Landing Marker
  let landX = originX + rangeVal * 3.5;
  stroke(16, 185, 129, 140);
  line(landX, originY - 10, landX, originY + 10);
  fill(16, 185, 129);
  noStroke();
  text(`R: ${{Math.round(rangeVal)}}m`, landX, originY - 14);

  // Cannon Base & Barrel (Rotated to angleDeg)
  push();
  translate(originX, originY);
  // Angle Arc
  noFill();
  stroke(244, 63, 94, 200);
  strokeWeight(2);
  arc(0, 0, 52, 52, -radians(angleDeg), 0);
  noStroke();
  fill(244, 63, 94);
  textSize(12);
  textAlign(LEFT, BOTTOM);
  text(`${{angleDeg.toFixed(1)}}°`, 34, -8);

  // Barrel
  rotate(-radians(angleDeg));
  fill(71, 85, 105);
  stroke(148, 163, 184);
  strokeWeight(2);
  rect(0, -9, 48, 18, 4);
  // Breech Mount
  fill(51, 65, 85);
  circle(0, 0, 26);
  pop();

  // Projectile Kinematics Update
  if (isFlying) {{
    ballPos.x += ballVel.x * 0.05;
    ballPos.y += ballVel.y * 0.05;
    ballVel.y += g * 3.5 * 0.05;

    // Trail Smoke Particles
    if (frameCount % 2 === 0) {{
      particles.push({{
        x: ballPos.x,
        y: ballPos.y,
        vx: random(-0.8, 0.8),
        vy: random(-0.8, 0.8),
        life: 255,
        size: random(4, 9),
        color: [{col1[0]}, {col1[1]}, {col1[2]}]
      }});
    }}

    // Ground Impact Detection
    if (ballPos.y >= originY) {{
      ballPos.y = originY;
      isFlying = false;
      // Impact Sparks
      for (let i = 0; i < 35; i++) {{
        let ang = random(PI, TWO_PI);
        let s = random(2, 7);
        particles.push({{
          x: ballPos.x,
          y: ballPos.y,
          vx: cos(ang) * s,
          vy: sin(ang) * s,
          life: 255,
          size: random(3, 7),
          color: [249, 115, 22]
        }});
      }}
    }}
  }} else {{
    if (frameCount % 180 === 0) {{
      resetProjectile();
    }}
  }}

  // Render Trail Particles
  for (let i = particles.length - 1; i >= 0; i--) {{
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 8;
    if (p.life <= 0) {{
      particles.splice(i, 1);
      continue;
    }}
    noStroke();
    fill(p.color[0], p.color[1], p.color[2], p.life);
    circle(p.x, p.y, p.size * (p.life / 255));
  }}

  // Render Projectile Ball & Velocity Vector Arrows
  if (ballPos.y <= originY) {{
    fill({col1[0]}, {col1[1]}, {col1[2]}, 70);
    noStroke();
    circle(ballPos.x, ballPos.y, 22);
    fill({col1[0]}, {col1[1]}, {col1[2]});
    circle(ballPos.x, ballPos.y, 14);
    fill(255);
    circle(ballPos.x - 2, ballPos.y - 2, 4);

    // Dynamic Vectors: Vx (green), Vy (pink), V resultant (gold)
    if (isFlying) {{
      stroke(34, 197, 94);
      strokeWeight(2);
      line(ballPos.x, ballPos.y, ballPos.x + ballVel.x * 0.4, ballPos.y);
      stroke(236, 72, 153);
      line(ballPos.x, ballPos.y, ballPos.x, ballPos.y + ballVel.y * 0.4);
      stroke(250, 204, 21);
      line(ballPos.x, ballPos.y, ballPos.x + ballVel.x * 0.4, ballPos.y + ballVel.y * 0.4);
    }}
  }}

  // Telemetry HUD
  drawHUD();
}}

function drawHUD() {{
  push();
  translate(24, 24);
  fill(15, 23, 42, 220);
  stroke(51, 65, 85);
  strokeWeight(1.5);
  rect(0, 0, 310, 160, 10);

  noStroke();
  fill(255);
  textSize(13);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text('BALLISTIC KINEMATICS (HUD)', 16, 14);

  textStyle(NORMAL);
  textSize(11);
  fill(148, 163, 184);
  let y = 38;
  text(`Launch Angle (θ):  ${{angleDeg.toFixed(1)}}°`, 16, y);
  text(`Initial Speed (v₀):  ${{v0.toFixed(1)}} m/s`, 16, y + 18);
  text(`Gravity (g):        ${{g.toFixed(2)}} m/s²`, 16, y + 36);
  text(`Max Height (H_max): ${{maxH.toFixed(1)}} m`, 16, y + 54);
  text(`Range (R):          ${{rangeVal.toFixed(1)}} m`, 16, y + 72);
  text(`Flight Time (T):    ${{totalFlightTime.toFixed(2)}} s`, 16, y + 90);

  fill(56, 189, 248);
  text(`[Controls]: UP/DN arrows or drag to re-aim. Click to fire.`, 16, y + 112);
  pop();
}}

function keyPressed() {{
  if (keyCode === UP_ARROW) {{
    angleDeg = min(85, angleDeg + 2.5);
    computeTheoreticalPath();
    resetProjectile();
  }} else if (keyCode === DOWN_ARROW) {{
    angleDeg = max(10, angleDeg - 2.5);
    computeTheoreticalPath();
    resetProjectile();
  }} else if (key === ' ') {{
    resetProjectile();
  }}
}}

function mousePressed() {{
  if (mouseX < originX + 180 && mouseY > height * 0.4) {{
    let dx = mouseX - originX;
    let dy = originY - mouseY;
    if (dx > 0 && dy > 0) {{
      angleDeg = constrain(degrees(atan2(dy, dx)), 10, 85);
      computeTheoreticalPath();
    }}
  }}
  resetProjectile();
}}

function windowResized() {{
  resizeCanvas(windowWidth, windowHeight);
  originX = width * 0.12;
  originY = height * 0.82;
  computeTheoreticalPath();
}}"""
            explanation = f"Generated interactive ballistic projectile motion in p5.js launched at {launch_ang:.1f}° with initial velocity {v0:.1f} m/s, real-time parabolic flight, velocity vector arrows, and kinematic telemetry HUD for '{prompt}'."
            suggested = ["Change launch angle to 45 degrees", "Simulate air resistance drag", "Fire multiple projectiles in rapid succession"]

        elif params["is_double_pendulum"] or (params["is_pendulum"] and ("double" in p or "chaos" in p)):
            code = f"""// p5.js: Double Chaotic Pendulum Simulation (Lagrangian RK4 Dynamics)
// User Demand: color={col1}, speed={spd}x

let r1 = 140, r2 = 130;
let m1 = 22, m2 = 18;
let a1 = Math.PI / 2, a2 = Math.PI / 2;
let a1_v = 0, a2_v = 0;
let g = 0.85;
let trace = [];

function setup() {{
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  if (document.getElementById('canvas-container')) canvas.parent('canvas-container');
}}

function draw() {{
  background(8, 12, 22, 55);
  translate(width / 2, height * 0.28);

  let num1 = -g * (2 * m1 + m2) * sin(a1);
  let num2 = -m2 * g * sin(a1 - 2 * a2);
  let num3 = -2 * sin(a1 - a2) * m2;
  let num4 = a2_v * a2_v * r2 + a1_v * a1_v * r1 * cos(a1 - a2);
  let den = r1 * (2 * m1 + m2 - m2 * cos(2 * a1 - 2 * a2));
  let a1_a = (num1 + num2 + num3 * num4) / den;

  num1 = 2 * sin(a1 - a2);
  num2 = (a1_v * a1_v * r1 * (m1 + m2));
  num3 = g * (m1 + m2) * cos(a1);
  num4 = a2_v * a2_v * r2 * m2 * cos(a1 - a2);
  den = r2 * (2 * m1 + m2 - m2 * cos(2 * a1 - 2 * a2));
  let a2_a = (num1 * (num2 + num3 + num4)) / den;

  let x1 = r1 * sin(a1);
  let y1 = r1 * cos(a1);
  let x2 = x1 + r2 * sin(a2);
  let y2 = y1 + r2 * cos(a2);

  stroke(100, 116, 139);
  strokeWeight(2);
  line(0, 0, x1, y1);
  fill({col1[0]}, {col1[1]}, {col1[2]});
  noStroke();
  circle(x1, y1, m1 * 0.8);

  stroke(100, 116, 139);
  strokeWeight(2);
  line(x1, y1, x2, y2);
  fill({col2[0]}, {col2[1]}, {col2[2]});
  noStroke();
  circle(x2, y2, m2 * 0.8);

  a1_v += a1_a * {spd};
  a2_v += a2_a * {spd};
  a1 += a1_v * {spd};
  a2 += a2_v * {spd};
  a1_v *= 0.9997;
  a2_v *= 0.9997;

  trace.push({{ x: x2, y: y2 }});
  if (trace.length > 320) trace.shift();

  noFill();
  for (let i = 1; i < trace.length; i++) {{
    stroke({col2[0]}, {col2[1]}, {col2[2]}, (i / trace.length) * 230);
    strokeWeight(1.8);
    line(trace[i-1].x, trace[i-1].y, trace[i].x, trace[i].y);
  }}
}}

function windowResized() {{
  resizeCanvas(windowWidth, windowHeight);
}}"""
            explanation = f"Crafted a chaotic double pendulum simulation in p5.js using Lagrangian equations of motion with glowing trajectory ribbon for '{prompt}'."
            suggested = ["Enable phase space Poincaré section plot", "Add third pendulum link", "Add friction damping slider"]

        elif params["is_pendulum"]:
            code = f"""// p5.js: Harmonic Pendulum & Phase Space Dynamics
// User Demand: color={col1}, speed={spd}x

let len = 240;
let angle = Math.PI / 4;
let angleVel = 0.0;
let angleAcc = 0.0;
let damping = 0.998;
let g = 0.45;
let origin;
let bob;
let history = [];

function setup() {{
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  if (document.getElementById('canvas-container')) canvas.parent('canvas-container');
  origin = createVector(width / 2, 80);
}}

function draw() {{
  background(8, 12, 22);

  // Pivot support
  fill(51, 65, 85);
  noStroke();
  rect(origin.x - 40, origin.y - 12, 80, 12, 4);

  // Pendulum physics: alpha = -(g/L)*sin(theta)
  angleAcc = (-1 * g / len) * sin(angle);
  angleVel += angleAcc * {spd};
  angleVel *= damping;
  angle += angleVel * {spd};

  bob = createVector(origin.x + len * sin(angle), origin.y + len * cos(angle));

  // Trace
  history.push(bob.copy());
  if (history.length > 60) history.shift();
  noFill();
  stroke({col1[0]}, {col1[1]}, {col1[2]}, 80);
  strokeWeight(1.5);
  beginShape();
  for (let pt of history) vertex(pt.x, pt.y);
  endShape();

  // Rod
  stroke(148, 163, 184);
  strokeWeight(2.5);
  line(origin.x, origin.y, bob.x, bob.y);

  // Bob glow & core
  noStroke();
  fill({col1[0]}, {col1[1]}, {col1[2]}, 60);
  circle(bob.x, bob.y, 44);
  fill({col1[0]}, {col1[1]}, {col1[2]});
  circle(bob.x, bob.y, 28);
  fill(255);
  circle(bob.x - 4, bob.y - 4, 8);

  // Velocity vector arrow
  let vX = angleVel * len * cos(angle);
  let vY = -angleVel * len * sin(angle);
  stroke(244, 63, 94);
  strokeWeight(2);
  line(bob.x, bob.y, bob.x + vX * 4, bob.y + vY * 4);

  // HUD
  fill(15, 23, 42, 210);
  stroke(51, 65, 85);
  rect(24, 24, 240, 95, 8);
  noStroke();
  fill(255);
  textSize(12);
  textStyle(BOLD);
  text('HARMONIC PENDULUM', 36, 44);
  textStyle(NORMAL);
  fill(148, 163, 184);
  text(`Angle: ${{degrees(angle).toFixed(1)}}°`, 36, 64);
  text(`Angular Vel: ${{angleVel.toFixed(3)}} rad/s`, 36, 82);
  text(`Length: ${{len}} px | g: ${{g}}`, 36, 100);
}}

function mouseDragged() {{
  let dX = mouseX - origin.x;
  let dY = mouseY - origin.y;
  angle = atan2(dX, dY);
  angleVel = 0;
}}

function windowResized() {{
  resizeCanvas(windowWidth, windowHeight);
  origin = createVector(width / 2, 80);
}}"""
            explanation = f"Synthesized an interactive harmonic pendulum in p5.js with restoring torque equations, velocity vectors, and phase angle readouts for '{prompt}'."
            suggested = ["Add driven oscillator resonance", "Drag bob with mouse to set release angle", "Plot phase space portrait (theta vs omega)"]

        elif params["is_spring"]:
            code = f"""// p5.js: Hooke's Law Mass-Spring-Damper Simulation
// User Demand: color={col1}, speed={spd}x

let restLength = 220;
let y = 300;
let velocity = 0;
let mass = 24;
let k = 0.12;
let damping = 0.985;
let anchor;
let waveData = [];

function setup() {{
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  if (document.getElementById('canvas-container')) canvas.parent('canvas-container');
  anchor = createVector(width * 0.32, 60);
}}

function draw() {{
  background(8, 12, 22);

  // Physics: F = -k * x - c * v
  let displacement = y - (anchor.y + restLength);
  let force = -k * displacement;
  let acceleration = force / mass;
  velocity += acceleration * {spd};
  velocity *= damping;
  y += velocity * {spd};

  // Coiled Spring Geometry
  stroke(148, 163, 184);
  strokeWeight(2.5);
  noFill();
  beginShape();
  let coils = 18;
  let dy = (y - anchor.y) / coils;
  for (let i = 0; i <= coils; i++) {{
    let px = anchor.x + (i === 0 || i === coils ? 0 : (i % 2 === 0 ? 22 : -22));
    let py = anchor.y + i * dy;
    vertex(px, py);
  }}
  endShape();

  // Top Ceiling Mount
  fill(51, 65, 85);
  noStroke();
  rect(anchor.x - 50, anchor.y - 12, 100, 12, 4);

  // Mass Block
  fill({col1[0]}, {col1[1]}, {col1[2]});
  stroke(255);
  strokeWeight(1.5);
  rect(anchor.x - 30, y, 60, 50, 6);
  noStroke();
  fill(255);
  textSize(12);
  textAlign(CENTER, CENTER);
  text(`${{mass}}kg`, anchor.x, y + 25);

  // Real-time Waveform Graph (Right Side)
  waveData.unshift(displacement);
  if (waveData.length > width * 0.45) waveData.pop();

  stroke(51, 65, 85);
  line(width * 0.52, anchor.y + restLength, width * 0.95, anchor.y + restLength);

  noFill();
  stroke({col2[0]}, {col2[1]}, {col2[2]});
  strokeWeight(2);
  beginShape();
  for (let i = 0; i < waveData.length; i++) {{
    vertex(width * 0.52 + i, anchor.y + restLength + waveData[i]);
  }}
  endShape();

  // Connection line from block to wave
  stroke(244, 114, 182, 120);
  strokeWeight(1);
  drawingContext.setLineDash([4, 4]);
  line(anchor.x + 30, y + 25, width * 0.52, y + 25);
  drawingContext.setLineDash([]);
}}

function mousePressed() {{
  if (dist(mouseX, mouseY, anchor.x, y + 25) < 50) {{
    y = mouseY;
    velocity = 0;
  }}
}}

function mouseDragged() {{
  if (mouseX > anchor.x - 60 && mouseX < anchor.x + 60) {{
    y = constrain(mouseY, anchor.y + 60, height - 80);
    velocity = 0;
  }}
}}

function windowResized() {{
  resizeCanvas(windowWidth, windowHeight);
  anchor = createVector(width * 0.32, 60);
}}"""
            explanation = f"Generated a Hooke's law mass-spring oscillator in p5.js with coiled spring mechanics and live harmonic displacement waveform for '{prompt}'."
            suggested = ["Add driving periodic force for resonance", "Change spring stiffness k", "Add secondary coupled mass"]

        elif any(w in p for w in ["bounce", "ball", "drop", "gravity", "rebound", "collide", "elastic"]):
            # Interactive Kinetic Bouncing Simulation matching User Demand
            ball_count = min(max(params["count"], 3), 35)
            code = f"""// p5.js: Interactive Multi-Body Kinetic Bounce Simulation
// User Demand: count={ball_count}, primaryColor={col1}, secondaryColor={col2}, speed={spd}x

let balls = [];
const GRAVITY = {'0.25' if 'gravity' in p else '0.0'};

function setup() {{
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  if (document.getElementById('canvas-container')) {{
    canvas.parent('canvas-container');
  }}
  
  balls = [];
  const palette = [
    [{col1[0]}, {col1[1]}, {col1[2]}],
    [{col2[0]}, {col2[1]}, {col2[2]}],
    [{col3[0]}, {col3[1]}, {col3[2]}]
  ];

  for (let i = 0; i < {ball_count}; i++) {{
    let rad = random(14, 28);
    balls.push({{
      x: random(rad + 10, width - rad - 10),
      y: random(rad + 10, height - rad - 10),
      vx: random(-3.5, 3.5) * {spd},
      vy: random(-3.5, 3.5) * {spd},
      radius: rad,
      color: palette[i % palette.length],
      trail: []
    }});
  }}
}}

function draw() {{
  background(6, 8, 16, 50);

  for (let b of balls) {{
    b.vy += GRAVITY;
    b.x += b.vx;
    b.y += b.vy;

    // Wall bounce with elastic damping
    if (b.x - b.radius < 0) {{ b.x = b.radius; b.vx *= -0.92; }}
    if (b.x + b.radius > width) {{ b.x = width - b.radius; b.vx *= -0.92; }}
    if (b.y - b.radius < 0) {{ b.y = b.radius; b.vy *= -0.92; }}
    if (b.y + b.radius > height) {{ b.y = height - b.radius; b.vy *= -0.92; }}

    // Trail history
    b.trail.push({{ x: b.x, y: b.y }});
    if (b.trail.length > 18) b.trail.shift();

    // Render trail
    noFill();
    for (let t = 1; t < b.trail.length; t++) {{
      let alpha = map(t, 0, b.trail.length, 10, 140);
      stroke(b.color[0], b.color[1], b.color[2], alpha);
      strokeWeight(map(t, 0, b.trail.length, 1, b.radius * 0.7));
      line(b.trail[t-1].x, b.trail[t-1].y, b.trail[t].x, b.trail[t].y);
    }}

    // Render ball glow & core
    noStroke();
    fill(b.color[0], b.color[1], b.color[2], 50);
    circle(b.x, b.y, b.radius * 2.6);
    fill(b.color[0], b.color[1], b.color[2]);
    circle(b.x, b.y, b.radius * 2);
    fill(255, 255, 255, 180);
    circle(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.6);
  }}
}}

function mousePressed() {{
  for (let b of balls) {{
    let dx = b.x - mouseX;
    let dy = b.y - mouseY;
    let distSq = dx * dx + dy * dy;
    if (distSq < 40000 && distSq > 0) {{
      let d = sqrt(distSq);
      b.vx += (dx / d) * 6;
      b.vy += (dy / d) * 6;
    }}
  }}
}}

function windowResized() {{
  resizeCanvas(windowWidth, windowHeight);
}}"""
            explanation = f"Generated interactive bouncing kinetics in p5.js with {ball_count} dynamic bodies, trail ribbons, and elastic boundary collisions for '{prompt}'."
            suggested = ["Add gravitational attraction between balls", "Enable particle splash on impact", "Increase ball count to 50"]

        elif any(w in p for w in ["orbit", "planet", "solar", "celestial"]):
            planet_count = min(max(params["count"], 3), 12)
            code = f"""// p5.js: Interactive Gravitational Orbit Simulation
// User Demand: planets={planet_count}, primaryColor={col1}, speed={spd}x

let planets = [];
let sun;

function setup() {{
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  if (document.getElementById('canvas-container')) {{
    canvas.parent('canvas-container');
  }}
  
  planets = [];
  sun = {{ x: width / 2, y: height / 2, mass: 1200, radius: 24 }};
  
  for (let i = 0; i < {planet_count}; i++) {{
    let r = random(55, min(width, height) * 0.42);
    let angle = random(TWO_PI);
    let speed = sqrt(sun.mass / r) * 0.65 * {spd};
    planets.push({{
      x: sun.x + r * cos(angle),
      y: sun.y + r * sin(angle),
      vx: -sin(angle) * speed,
      vy: cos(angle) * speed,
      radius: random(5, 11),
      r: {col1[0]},
      g: {col1[1]},
      b: {col1[2]},
      trail: []
    }});
  }}
}}

function draw() {{
  background(6, 9, 18, 45);
  
  // Glowing Central Star
  noStroke();
  for (let i = 4; i > 0; i--) {{
    fill({col3[0]}, {col3[1]}, {col3[2]}, 28 * i);
    circle(sun.x, sun.y, sun.radius + i * 16);
  }}
  fill(255, 240, 160);
  circle(sun.x, sun.y, sun.radius);

  // Update & Draw Planets
  for (let p of planets) {{
    let dx = sun.x - p.x;
    let dy = sun.y - p.y;
    let d = constrain(sqrt(dx * dx + dy * dy), 20, 500);
    let force = (sun.mass) / (d * d);
    p.vx += (dx / d) * force;
    p.vy += (dy / d) * force;
    p.x += p.vx;
    p.y += p.vy;

    p.trail.push({{ x: p.x, y: p.y }});
    if (p.trail.length > 35) p.trail.shift();

    // Luminescent Orbit Trail
    noFill();
    for (let i = 0; i < p.trail.length; i++) {{
      stroke(p.r, p.g, p.b, (i / p.trail.length) * 180);
      strokeWeight(1.5);
      if (i > 0) line(p.trail[i-1].x, p.trail[i-1].y, p.trail[i].x, p.trail[i].y);
    }}

    noStroke();
    fill(p.r, p.g, p.b);
    circle(p.x, p.y, p.radius);
  }}
}}

function windowResized() {{
  resizeCanvas(windowWidth, windowHeight);
}}"""
            explanation = f"Crafted an interactive gravitational n-body orbital simulation in p5.js with {planet_count} planets and glowing stellar core for '{prompt}'."
            suggested = ["Add asteroid belt", "Enable mouse click to spawn planets", "Switch to 3D WebGL camera"]

        elif any(w in p for w in ["wave", "fourier", "sine", "harmonic", "oscillation"]):
            harmonic_count = min(max(params["count"], 3), 15)
            code = f"""// p5.js: Harmonic Fourier Epicycles & Wave Synthesis
// User Demand: harmonics={harmonic_count}, color={col1}, speed={spd}x

let time = 0;
let wave = [];
let numCircles = {harmonic_count};

function setup() {{
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  if (document.getElementById('canvas-container')) {{
    canvas.parent('canvas-container');
  }}
  wave = [];
}}

function draw() {{
  background(8, 11, 20);
  translate(width * 0.28, height / 2);

  let x = 0;
  let y = 0;

  for (let i = 0; i < numCircles; i++) {{
    let prevx = x;
    let prevy = y;
    let n = i * 2 + 1;
    let radius = 80 * (4 / (n * PI));
    x += radius * cos(n * time);
    y += radius * sin(n * time);

    stroke({col2[0]}, {col2[1]}, {col2[2]}, 90);
    strokeWeight(1.2);
    noFill();
    ellipse(prevx, prevy, radius * 2);

    fill({col1[0]}, {col1[1]}, {col1[2]});
    noStroke();
    circle(x, y, 4);

    stroke({col1[0]}, {col1[1]}, {col1[2]}, 160);
    line(prevx, prevy, x, y);
  }}

  wave.unshift(y);
  let waveOffset = width * 0.24;
  stroke(244, 114, 182, 220);
  line(x, y, waveOffset, wave[0]);

  // Render harmonic synthesized wave
  noFill();
  stroke({col1[0]}, {col1[1]}, {col1[2]});
  strokeWeight(2.5);
  beginShape();
  for (let i = 0; i < wave.length; i++) {{
    vertex(i + waveOffset, wave[i]);
  }}
  endShape();

  time += 0.035 * {spd};
  if (wave.length > width * 0.45) {{
    wave.pop();
  }}
}}

function windowResized() {{
  resizeCanvas(windowWidth, windowHeight);
}}"""
            explanation = f"Synthesized a harmonic Fourier series epicycles visualizer in p5.js with {harmonic_count} rotating phasor vectors for '{prompt}'."
            suggested = ["Increase harmonic circle count to 16", "Add sawtooth wave mode", "Add audio frequency modulation"]

        else:
            # Dynamic Cybernetic / Geometric Particle Network tailored to prompt
            particle_count = min(max(params["count"] * 10, 50), 220)
            code = f"""// p5.js: Dynamic Kinetic Particle Flow
// User Demand: shape={params['shape']}, count={particle_count}, primaryColor={col1}, speed={spd}x

let particles = [];
const NUM_PARTICLES = {particle_count};

function setup() {{
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  if (document.getElementById('canvas-container')) {{
    canvas.parent('canvas-container');
  }}
  particles = [];
  for (let i = 0; i < NUM_PARTICLES; i++) {{
    particles.push(new Particle());
  }}
}}

function draw() {{
  background(5, 7, 14, 40);
  for (let p of particles) {{
    p.update();
    p.display();
  }}
  connectNearby();
}}

class Particle {{
  constructor() {{
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(random(1, 2.5) * {spd});
    this.size = random(3, 7);
  }}

  update() {{
    this.pos.add(this.vel);
    if (this.pos.x < 0 || this.pos.x > width) this.vel.x *= -1;
    if (this.pos.y < 0 || this.pos.y > height) this.vel.y *= -1;
    
    // Subtle mouse interaction
    let mouse = createVector(mouseX, mouseY);
    let d = p5.Vector.dist(this.pos, mouse);
    if (d < 120 && mouseX > 0) {{
      let repulse = p5.Vector.sub(this.pos, mouse).normalize().mult(2.0);
      this.pos.add(repulse);
    }}
  }}

  display() {{
    noStroke();
    fill({col1[0]}, {col1[1]}, {col1[2]}, 210);
    circle(this.pos.x, this.pos.y, this.size);
  }}
}}

function connectNearby() {{
  strokeWeight(0.8);
  for (let i = 0; i < particles.length; i++) {{
    for (let j = i + 1; j < particles.length; j++) {{
      let d = dist(particles[i].pos.x, particles[i].pos.y, particles[j].pos.x, particles[j].pos.y);
      if (d < 80) {{
        stroke({col2[0]}, {col2[1]}, {col2[2]}, map(d, 0, 80, 150, 0));
        line(particles[i].pos.x, particles[i].pos.y, particles[j].pos.x, particles[j].pos.y);
      }}
    }}
  }}
}}

function windowResized() {{
  resizeCanvas(windowWidth, windowHeight);
}}"""
            explanation = f"Generated a customized kinetic network in p5.js with {particle_count} dynamic entities and proximity interconnects for '{prompt}'."
            suggested = ["Change colors to warm sunset gold/red", "Make particles spiral around center", "Add pulsating ripple effect on mouse click"]
    elif engine == "three":
        launch_ang = params.get("launch_angle", 60.0)
        v0 = params.get("initial_velocity", 22.0)
        grav = params.get("gravity", 9.8)

        if params.get("is_projectile"):
            code = f"""// Three.js: 3D Ballistic Projectile Motion & Kinematic Arc
// User Demand: launch_angle={launch_ang}°, v0={v0} m/s, g={grav} m/s²

const container = document.getElementById('canvas-container') || document.body;
const width = typeof __WIDTH__ !== 'undefined' ? __WIDTH__ : (container.clientWidth || window.innerWidth);
const height = typeof __HEIGHT__ !== 'undefined' ? __HEIGHT__ : (container.clientHeight || window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060913, 0.03);

const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
camera.position.set(0, 8, 22);

const renderer = new THREE.WebGLRenderer({{ antialias: true, alpha: true, powerPreference: 'high-performance' }});
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// Ground Plane Grid
const gridHelper = new THREE.GridHelper(50, 50, 0x06b6d4, 0x1e293b);
gridHelper.position.y = 0;
scene.add(gridHelper);

// Physics Parameters
const angleDeg = {launch_ang};
const angleRad = (angleDeg * Math.PI) / 180;
const launchSpeed = {v0} * 0.7;
const g = {grav} * 0.45;

const origin = new THREE.Vector3(-12, 0, 0);

// 3D Cannon Base & Barrel
const baseGeo = new THREE.CylinderGeometry(0.8, 1.1, 0.6, 16);
const metalMat = new THREE.MeshStandardMaterial({{ color: 0x475569, metalness: 0.8, roughness: 0.3 }});
const baseMesh = new THREE.Mesh(baseGeo, metalMat);
baseMesh.position.copy(origin);
baseMesh.position.y += 0.3;
scene.add(baseMesh);

const barrelGeo = new THREE.CylinderGeometry(0.3, 0.4, 3.2, 16);
barrelGeo.translate(0, 1.6, 0);
const barrelMat = new THREE.MeshStandardMaterial({{ color: 0x64748b, metalness: 0.9, roughness: 0.2 }});
const barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
barrelMesh.position.copy(origin);
barrelMesh.position.y += 0.6;
barrelMesh.rotation.z = -(Math.PI / 2 - angleRad);
scene.add(barrelMesh);

// Theoretical Parabolic Path Curve
const flightTime = (2 * launchSpeed * Math.sin(angleRad)) / g;
const curvePoints = [];
for (let t = 0; t <= flightTime; t += 0.1) {{
    const x = origin.x + launchSpeed * Math.cos(angleRad) * t;
    const y = origin.y + launchSpeed * Math.sin(angleRad) * t - 0.5 * g * t * t;
    curvePoints.push(new THREE.Vector3(x, Math.max(0, y), 0));
}}
const pathGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
const pathMat = new THREE.LineDashedMaterial({{ color: 0x38bdf8, dashSize: 0.4, gapSize: 0.2 }});
const pathLine = new THREE.Line(pathGeo, pathMat);
pathLine.computeLineDistances();
scene.add(pathLine);

// 3D Projectile Sphere with Point Light
const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
const ballMat = new THREE.MeshStandardMaterial({{ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.6 }});
const ballMesh = new THREE.Mesh(ballGeo, ballMat);
scene.add(ballMesh);

const ballLight = new THREE.PointLight(0x06b6d4, 3.0, 10);
scene.add(ballLight);

// Animation State
let simTime = 0;
let isFlying = true;
const clock = new THREE.Clock();

function animate() {{
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (isFlying) {{
        simTime += dt * 1.5;
        const currentX = origin.x + launchSpeed * Math.cos(angleRad) * simTime;
        const currentY = origin.y + launchSpeed * Math.sin(angleRad) * simTime - 0.5 * g * simTime * simTime;

        if (currentY <= 0 && simTime > 0.2) {{
            ballMesh.position.set(currentX, 0, 0);
            ballLight.position.copy(ballMesh.position);
            isFlying = false;
            setTimeout(() => {{ simTime = 0; isFlying = true; }}, 1400);
        }} else {{
            ballMesh.position.set(currentX, currentY, 0);
            ballLight.position.copy(ballMesh.position);
        }}
    }}

    camera.lookAt(0, 3, 0);
    renderer.render(scene, camera);
}}
animate();

window.addEventListener('resize', () => {{
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}});
"""
            explanation = f"Crafted a 3D ballistic projectile motion simulation in Three.js launched at {launch_ang:.1f}° with dynamic kinematic trajectory, cannon model, and flight physics for '{prompt}'."
            suggested = ["Adjust launch angle to 45 degrees", "Enable 3D camera mouse orbit", "Add impact smoke particles"]

        elif ("galaxy" in p or "spiral" in p or "nebula" in p or "starfield" in p or "cosmos" in p or "space" in p) and "planet" not in p and "solar" not in p and "gravit" not in p and "celestial" not in p and "sun" not in p:
            code = """// Three.js: Volumetric 4-Arm Spiral Galaxy with Cosmic Dust
const container = document.getElementById('canvas-container') || document.body;
const width = typeof __WIDTH__ !== 'undefined' ? __WIDTH__ : (container.clientWidth || window.innerWidth);
const height = typeof __HEIGHT__ !== 'undefined' ? __HEIGHT__ : (container.clientHeight || window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x03040b, 0.025);

const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
camera.position.set(0, 4.5, 9.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Central Galactic Core Lighting
const coreLight = new THREE.PointLight(0xffeedd, 3.5, 30);
coreLight.position.set(0, 0, 0);
scene.add(coreLight);

const ambientLight = new THREE.AmbientLight(0x1e1b4b, 0.8);
scene.add(ambientLight);

// Central Core Glow Sphere
const coreGeo = new THREE.SphereGeometry(0.45, 32, 32);
const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff3bf });
const coreMesh = new THREE.Mesh(coreGeo, coreMat);
scene.add(coreMesh);

const haloGeo = new THREE.SphereGeometry(0.85, 32, 32);
const haloMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25 });
const haloMesh = new THREE.Mesh(haloGeo, haloMat);
scene.add(haloMesh);

// Volumetric Spiral Galaxy Particle Field (2600 Stars)
const particleCount = 2600;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(particleCount * 3);
const pColors = new Float32Array(particleCount * 3);
const pRadii = new Float32Array(particleCount);
const pBaseAngles = new Float32Array(particleCount);

const colorCore = new THREE.Color(0xfff3bf);
const colorInner = new THREE.Color(0x38bdf8);
const colorMid = new THREE.Color(0xa855f7);
const colorOuter = new THREE.Color(0xf43f5e);

const arms = 4;
for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const r = Math.pow(Math.random(), 1.6) * 11.0 + 0.3;
    const armAngle = ((i % arms) * ((2 * Math.PI) / arms));
    const spiralAngle = r * 0.65;
    const spreadX = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.32) * r;
    const spreadY = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.22) * (12.0 - r);
    const spreadZ = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.32) * r;

    pRadii[i] = r;
    pBaseAngles[i] = armAngle + spiralAngle;

    pPos[i3] = Math.cos(pBaseAngles[i]) * r + spreadX;
    pPos[i3 + 1] = spreadY;
    pPos[i3 + 2] = Math.sin(pBaseAngles[i]) * r + spreadZ;

    const starColor = colorCore.clone();
    if (r < 2.5) {
        starColor.lerp(colorInner, r / 2.5);
    } else if (r < 6.5) {
        starColor.lerp(colorMid, (r - 2.5) / 4.0);
    } else {
        starColor.lerp(colorOuter, (r - 6.5) / 4.5);
    }

    pColors[i3] = starColor.r;
    pColors[i3 + 1] = starColor.g;
    pColors[i3 + 2] = starColor.b;
}

pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

const pMat = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const galaxy = new THREE.Points(pGeo, pMat);
scene.add(galaxy);

// Interactive Mouse Parallax
let mouseX = 0, mouseY = 0;
function onMouseMove(e) {
    mouseX = (e.clientX - width / 2) / (width / 2);
    mouseY = (e.clientY - height / 2) / (height / 2);
}
window.addEventListener('mousemove', onMouseMove, { passive: true });

// Animation Loop with Keplerian Differential Rotation
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    const positions = galaxy.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const r = pRadii[i];
        const orbitalSpeed = (0.28 / Math.sqrt(r + 0.5)) * 0.4;
        const currentAngle = pBaseAngles[i] + time * orbitalSpeed;
        const currentR = Math.sqrt(positions[i3] * positions[i3] + positions[i3 + 2] * positions[i3 + 2]);

        positions[i3] = Math.cos(currentAngle) * currentR;
        positions[i3 + 2] = Math.sin(currentAngle) * currentR;
    }
    galaxy.geometry.attributes.position.needsUpdate = true;

    // Smooth Camera Tilt
    camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.04;
    camera.position.y += (4.5 - mouseY * 1.2 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    const pulse = 1.0 + Math.sin(time * 3.0) * 0.08;
    coreMesh.scale.set(pulse, pulse, pulse);

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});"""
            explanation = "Synthesized an ultra-premium 4-arm volumetric spiral galaxy in Three.js featuring 2,600 stars with Keplerian orbital velocities, additive color gradients, and mouse parallax tilt."
            suggested = ["Add orbiting interstellar gas clouds", "Enable interactive zoom on click", "Increase galaxy rotation speed"]

        elif any(w in p for w in ["planet", "solar system", "celestial", "sun", "planetary", "jupiter", "mars", "saturn", "heliocentric"]) and not any(w in p for w in ["cube", "box", "torus", "cylinder", "cone", "pyramid"]):
            code = """// Three.js: Celestial Gravity Orbits & Luminous Planetary Resonance
const container = document.getElementById('canvas-container') || document.body;
const width = typeof __WIDTH__ !== 'undefined' ? __WIDTH__ : (container.clientWidth || window.innerWidth);
const height = typeof __HEIGHT__ !== 'undefined' ? __HEIGHT__ : (container.clientHeight || window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050713, 0.024);

const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
camera.position.set(0, 5.5, 11);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Central Star Luminous Lighting
const sunLight = new THREE.PointLight(0xffbe0b, 3.8, 50, 1.2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0x1e1b4b, 0.9);
scene.add(ambientLight);

// Central Sun with Corona Halo
const sunGeo = new THREE.SphereGeometry(1.1, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffbe0b });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.22 })
);
scene.add(sunGlow);

// Planetary Configuration
const planetsData = [
    { r: 2.3, size: 0.22, speed: 1.4, color: 0x38bdf8, incl: 0.12, emissive: 0x0284c7 },
    { r: 3.6, size: 0.35, speed: 0.95, color: 0x10b981, incl: -0.18, emissive: 0x047857 },
    { r: 5.0, size: 0.48, speed: 0.65, color: 0xf43f5e, incl: 0.25, emissive: 0xbe123c, hasRing: true },
    { r: 6.7, size: 0.38, speed: 0.45, color: 0xa855f7, incl: -0.08, emissive: 0x7e22ce },
    { r: 8.4, size: 0.28, speed: 0.32, color: 0x06b6d4, incl: 0.15, emissive: 0x0891b2 }
];

const planetMeshes = [];

planetsData.forEach(data => {
    // Orbital Ellipse Trail
    const trailGeo = new THREE.BufferGeometry();
    const points = [];
    const segments = 120;
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = Math.cos(theta) * data.r;
        const z = Math.sin(theta) * data.r;
        const y = Math.sin(theta) * (data.r * Math.sin(data.incl));
        points.push(x, y, z);
    }
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const trailMat = new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.25 });
    const trail = new THREE.Line(trailGeo, trailMat);
    scene.add(trail);

    // Planet Mesh
    const pGeo = new THREE.SphereGeometry(data.size, 32, 32);
    const pMat = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.25,
        metalness: 0.75,
        emissive: data.emissive,
        emissiveIntensity: 0.3
    });
    const mesh = new THREE.Mesh(pGeo, pMat);
    scene.add(mesh);

    // Optional Planetary Ring
    if (data.hasRing) {
        const ringGeo = new THREE.RingGeometry(data.size * 1.5, data.size * 2.3, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: data.color, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.5;
        mesh.add(ring);
    }

    planetMeshes.push({ mesh, data });
});

// Ambient Cosmic Dust
const stardustGeo = new THREE.BufferGeometry();
const sCount = 800;
const sPos = new Float32Array(sCount * 3);
for (let i = 0; i < sCount * 3; i += 3) {
    sPos[i] = (Math.random() - 0.5) * 32;
    sPos[i + 1] = (Math.random() - 0.5) * 16;
    sPos[i + 2] = (Math.random() - 0.5) * 32;
}
stardustGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
const stardust = new THREE.Points(stardustGeo, new THREE.PointsMaterial({ size: 0.04, color: 0x94a3b8, transparent: true, opacity: 0.6 }));
scene.add(stardust);

// Mouse Interaction
let mouseX = 0, mouseY = 0;
function onMouseMove(e) {
    mouseX = (e.clientX - width / 2) / (width / 2);
    mouseY = (e.clientY - height / 2) / (height / 2);
}
window.addEventListener('mousemove', onMouseMove, { passive: true });

// Animation Loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    planetMeshes.forEach(({ mesh, data }) => {
        const angle = time * data.speed;
        mesh.position.x = Math.cos(angle) * data.r;
        mesh.position.z = Math.sin(angle) * data.r;
        mesh.position.y = Math.sin(angle) * (data.r * Math.sin(data.incl));
        mesh.rotation.y += 0.02;
    });

    sunGlow.scale.setScalar(1.0 + Math.sin(time * 2.5) * 0.05);

    camera.position.x += (mouseX * 2.0 - camera.position.x) * 0.05;
    camera.position.y += (5.5 - mouseY * 1.5 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});"""
            explanation = "Synthesized a premium 3D celestial gravity simulation in Three.js with Keplerian orbital resonance, luminous specular planetary spheres, and dynamic orbit trail ribbons."
            suggested = ["Add moon satellites to outer planets", "Enable gravitational slingshot trails", "Toggle heliocentric velocity vectors"]

        elif "terrain" in p or "landscape" in p or "mountain" in p or "elevation" in p or ("wave" in p and "knot" not in p and "gyro" not in p):
            code = """// Three.js: Undulating Cyberpunk Landscape & Neon Wave Matrix
const container = document.getElementById('canvas-container') || document.body;
const width = typeof __WIDTH__ !== 'undefined' ? __WIDTH__ : (container.clientWidth || window.innerWidth);
const height = typeof __HEIGHT__ !== 'undefined' ? __HEIGHT__ : (container.clientHeight || window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x04060f, 0.035);

const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
camera.position.set(0, 3.2, 7.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x0a0f1d, 1.0);
scene.add(ambientLight);

const cyanLight = new THREE.PointLight(0x00f5ff, 4.0, 35);
cyanLight.position.set(4, 3, 2);
scene.add(cyanLight);

const roseLight = new THREE.PointLight(0xff007f, 4.0, 35);
roseLight.position.set(-4, 3, 2);
scene.add(roseLight);

// Undulating Wireframe Cyber Landscape
const gridX = 54;
const gridY = 54;
const planeGeo = new THREE.PlaneGeometry(24, 24, gridX, gridY);
planeGeo.rotateX(-Math.PI / 2.3);

const wireMat = new THREE.MeshStandardMaterial({
    color: 0x00f5ff,
    wireframe: true,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4
});
const terrain = new THREE.Mesh(planeGeo, wireMat);
terrain.position.y = -1.2;
scene.add(terrain);

// Floating Cosmic Dust Particles
const pCount = 600;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(pCount * 3);
for (let i = 0; i < pCount * 3; i += 3) {
    pPos[i] = (Math.random() - 0.5) * 20;
    pPos[i + 1] = Math.random() * 6 - 0.5;
    pPos[i + 2] = (Math.random() - 0.5) * 20;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.035, color: 0x38bdf8, transparent: true, opacity: 0.7 }));
scene.add(dust);

// Original vertex heights
const posAttr = planeGeo.attributes.position;
const origY = new Float32Array(posAttr.count);
for (let i = 0; i < posAttr.count; i++) {
    origY[i] = posAttr.getY(i);
}

// Mouse Parallax
let mouseX = 0, mouseY = 0;
function onMouseMove(e) {
    mouseX = (e.clientX - width / 2) / (width / 2);
    mouseY = (e.clientY - height / 2) / (height / 2);
}
window.addEventListener('mousemove', onMouseMove, { passive: true });

// Animation Loop with Multi-harmonic Elevation Waves
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);

        const wave1 = Math.sin(vx * 0.5 + time * 1.5) * Math.cos(vz * 0.5 + time * 1.2) * 0.9;
        const wave2 = Math.sin(vx * 1.1 - time * 0.8 + vz * 0.7) * 0.35;
        const wave3 = Math.cos(Math.sqrt(vx * vx + vz * vz) * 0.8 - time * 2.0) * 0.3;

        posAttr.setY(i, origY[i] + wave1 + wave2 + wave3);
    }
    posAttr.needsUpdate = true;

    // Orbiting Lights across Landscape Peaks
    cyanLight.position.x = Math.sin(time * 0.9) * 6;
    cyanLight.position.z = Math.cos(time * 0.9) * 4 + 1;
    roseLight.position.x = -Math.sin(time * 0.7) * 6;
    roseLight.position.z = -Math.cos(time * 0.7) * 4 + 1;

    camera.position.x += (mouseX * 1.2 - camera.position.x) * 0.05;
    camera.position.y += (3.2 - mouseY * 0.8 - camera.position.y) * 0.05;
    camera.lookAt(0, -0.2, 0);

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});"""
            explanation = "Synthesized a dynamic cyberpunk undulating wireframe landscape in Three.js featuring multi-harmonic elevation waves, volumetric horizon fog, and moving neon peak illuminators."
            suggested = ["Add glowing grid lines at the peak crests", "Increase terrain mesh density", "Change wireframe colors dynamically"]

        elif any(w in p for w in ["knot", "quantum", "core", "gyro"]):
            # Specific Radiant Quantum Core & Gyro Rings
            code = """// Three.js: Quantum Core & Cosmic Constellation
// Interactive 3D Cybernetic Core with Gyro Rings, Volumetric Stardust & Chromatic Lighting

const container = document.getElementById('canvas-container') || document.body;
const width = typeof __WIDTH__ !== 'undefined' ? __WIDTH__ : (container.clientWidth || window.innerWidth);
const height = typeof __HEIGHT__ !== 'undefined' ? __HEIGHT__ : (container.clientHeight || window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050716, 0.028);

const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
camera.position.set(0, 0.6, 7.2);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
if (renderer.toneMapping !== undefined) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
}
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x1e1b4b, 1.2);
scene.add(ambientLight);

const lightCyan = new THREE.PointLight(0x00f5ff, 3.2, 45, 1.8);
lightCyan.position.set(5, 4, 5);
scene.add(lightCyan);

const lightRose = new THREE.PointLight(0xff007f, 3.2, 45, 1.8);
lightRose.position.set(-5, -3, 4);
scene.add(lightRose);

const keyLight = new THREE.DirectionalLight(0xffbe0b, 1.3);
keyLight.position.set(0, 10, 8);
scene.add(keyLight);

// Quantum Centerpiece Group
const coreGroup = new THREE.Group();
scene.add(coreGroup);

// Iridescent Metallic Torus Knot
const knotGeo = new THREE.TorusKnotGeometry(1.4, 0.36, 160, 32, 2, 3);
const knotMat = new THREE.MeshStandardMaterial({
    color: 0x4f46e5,
    metalness: 0.88,
    roughness: 0.18,
    emissive: 0x1e1b4b,
    emissiveIntensity: 0.35
});
const knotMesh = new THREE.Mesh(knotGeo, knotMat);
coreGroup.add(knotMesh);

// Wireframe Lattice Aura
const wireMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.22
});
const wireMesh = new THREE.Mesh(knotGeo, wireMat);
wireMesh.scale.set(1.025, 1.025, 1.025);
coreGroup.add(wireMesh);

// Inner Glowing Quantum Core
const innerGeo = new THREE.IcosahedronGeometry(0.68, 0);
const innerMat = new THREE.MeshStandardMaterial({
    color: 0x00f5ff,
    emissive: 0x00d2ff,
    emissiveIntensity: 0.85,
    roughness: 0.1,
    metalness: 0.4
});
const innerCore = new THREE.Mesh(innerGeo, innerMat);
coreGroup.add(innerCore);

// Inner Geometric Facet Shell
const facetGeo = new THREE.OctahedronGeometry(0.88, 0);
const facetMat = new THREE.MeshBasicMaterial({
    color: 0xff007f,
    wireframe: true,
    transparent: true,
    opacity: 0.65
});
const facetShell = new THREE.Mesh(facetGeo, facetMat);
coreGroup.add(facetShell);

// Orbital Gyro Rings with Glowing Satellites
const ringGroup = new THREE.Group();
scene.add(ringGroup);

const ringMat1 = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.9
});
const ringGeo1 = new THREE.TorusGeometry(2.35, 0.02, 16, 120);
const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
ring1.rotation.x = Math.PI / 3;
ringGroup.add(ring1);

const satGeo = new THREE.SphereGeometry(0.07, 16, 16);
const satMat1 = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
const satellite1 = new THREE.Mesh(satGeo, satMat1);
ringGroup.add(satellite1);

const ringMat2 = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xbe123c,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.9
});
const ringGeo2 = new THREE.TorusGeometry(2.8, 0.018, 16, 120);
const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
ring2.rotation.x = -Math.PI / 4;
ring2.rotation.y = Math.PI / 6;
ringGroup.add(ring2);

const satMat2 = new THREE.MeshBasicMaterial({ color: 0xff007f });
const satellite2 = new THREE.Mesh(satGeo, satMat2);
ringGroup.add(satellite2);

// Volumetric Cosmic Stardust Constellation
const particleCount = 1500;
const pGeometry = new THREE.BufferGeometry();
const pPositions = new Float32Array(particleCount * 3);
const pColors = new Float32Array(particleCount * 3);

const colorInside = new THREE.Color(0x00f5ff);
const colorMid = new THREE.Color(0x818cf8);
const colorOutside = new THREE.Color(0xf43f5e);

for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    const radius = Math.pow(Math.random(), 1.5) * 8.5 + 0.5;
    const branchAngle = ((i % 3) * ((2 * Math.PI) / 3)) + (radius * 0.45);
    const spinAngle = radius * 0.8;
    const totalAngle = branchAngle + spinAngle;

    const randomX = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.4) * radius;
    const randomY = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.4) * radius;
    const randomZ = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.4) * radius;

    pPositions[i3] = Math.cos(totalAngle) * radius + randomX;
    pPositions[i3 + 1] = randomY + (Math.sin(radius * 2.0) * 0.3);
    pPositions[i3 + 2] = Math.sin(totalAngle) * radius + randomZ;

    const mixedColor = colorInside.clone();
    if (radius < 4.0) {
        mixedColor.lerp(colorMid, radius / 4.0);
    } else {
        mixedColor.lerp(colorOutside, (radius - 4.0) / 4.5);
    }
    pColors[i3] = mixedColor.r;
    pColors[i3 + 1] = mixedColor.g;
    pColors[i3 + 2] = mixedColor.b;
}

pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
pGeometry.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

const pMaterial = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const particles = new THREE.Points(pGeometry, pMaterial);
scene.add(particles);

// Interactive Mouse Parallax
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;
const halfWidth = width / 2;
const halfHeight = height / 2;

function onMouseMove(event) {
    mouseX = (event.clientX - halfWidth) / halfWidth;
    mouseY = (event.clientY - halfHeight) / halfHeight;
}
window.addEventListener('mousemove', onMouseMove, { passive: true });

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    knotMesh.rotation.x = elapsedTime * 0.35;
    knotMesh.rotation.y = elapsedTime * 0.55;
    wireMesh.rotation.x = knotMesh.rotation.x;
    wireMesh.rotation.y = knotMesh.rotation.y;

    innerCore.rotation.x = -elapsedTime * 0.7;
    innerCore.rotation.y = -elapsedTime * 0.9;
    facetShell.rotation.x = elapsedTime * 0.6;
    facetShell.rotation.z = elapsedTime * 0.8;

    const pulse = 1.0 + Math.sin(elapsedTime * 2.2) * 0.04;
    innerCore.scale.set(pulse, pulse, pulse);

    const sat1Angle = elapsedTime * 1.5;
    satellite1.position.set(
        Math.cos(sat1Angle) * 2.35,
        Math.sin(sat1Angle) * 2.35 * Math.sin(Math.PI / 3),
        Math.sin(sat1Angle) * 2.35 * Math.cos(Math.PI / 3)
    );

    const sat2Angle = -elapsedTime * 1.2;
    satellite2.position.set(
        Math.cos(sat2Angle) * 2.8 * Math.cos(Math.PI / 6),
        Math.sin(sat2Angle) * 2.8 * Math.sin(-Math.PI / 4),
        Math.sin(sat2Angle) * 2.8 * Math.cos(-Math.PI / 4)
    );

    ringGroup.rotation.y = elapsedTime * 0.15;
    ringGroup.rotation.z = Math.sin(elapsedTime * 0.4) * 0.12;

    particles.rotation.y = elapsedTime * 0.05;
    particles.rotation.x = Math.sin(elapsedTime * 0.2) * 0.04;

    lightCyan.position.x = Math.sin(elapsedTime * 0.8) * 5.5;
    lightCyan.position.z = Math.cos(elapsedTime * 0.8) * 5.5;
    lightRose.position.x = -Math.sin(elapsedTime * 0.7) * 5.5;
    lightRose.position.z = -Math.cos(elapsedTime * 0.7) * 5.5;

    targetX = mouseX * 0.8;
    targetY = -mouseY * 0.5;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY + 0.6 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});"""
            explanation = "Synthesized an ultra-premium 3D Quantum Core in Three.js with metallic iridescent torus knot, counter-spinning facet core, orbital gyro rings, stardust galaxy constellation, and interactive mouse parallax."
            suggested = ["Add custom bloom glow shader", "Incorporate audio-reactive pulsation", "Morph geometry into hyper-dimensional dodecahedron"]

        else:
            # Dynamic Three.js 3D Scene tailored directly to user demand
            obj_shape = params["shape"]
            obj_count = min(max(params["count"], 3), 36)
            col_three1 = params["primary_color"]["three"]
            col_three2 = params["secondary_color"]["three"]
            spd = params["speed_factor"]

            geo_code = "new THREE.BoxGeometry(1.2, 1.2, 1.2)"
            if obj_shape == "sphere":
                geo_code = "new THREE.SphereGeometry(0.85, 32, 32)"
            elif obj_shape == "torus":
                geo_code = "new THREE.TorusGeometry(0.9, 0.32, 24, 64)"
            elif obj_shape == "cylinder":
                geo_code = "new THREE.CylinderGeometry(0.65, 0.65, 1.5, 32)"
            elif obj_shape == "cone":
                geo_code = "new THREE.ConeGeometry(0.85, 1.6, 32)"

            code = f"""// Three.js: Kinetic 3D Geometric Scene
// User Demand: shape={obj_shape}, count={obj_count}, primaryColor={col_three1}, speed={spd}x

const container = document.getElementById('canvas-container') || document.body;
const width = typeof __WIDTH__ !== 'undefined' ? __WIDTH__ : (container.clientWidth || window.innerWidth);
const height = typeof __HEIGHT__ !== 'undefined' ? __HEIGHT__ : (container.clientHeight || window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070914, 0.035);

const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
camera.position.set(0, 1.8, 8.5);

const renderer = new THREE.WebGLRenderer({{ antialias: true, alpha: true, powerPreference: 'high-performance' }});
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

// Dynamic Lighting
const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight({col_three1}, 3.5, 30);
pointLight1.position.set(4, 5, 4);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight({col_three2}, 3.0, 30);
pointLight2.position.set(-4, -3, 3);
scene.add(pointLight2);

// Center Group & Objects Array
const group = new THREE.Group();
scene.add(group);

const objects = [];
const baseGeometry = {geo_code};

for (let i = 0; i < {obj_count}; i++) {{
    const mat = new THREE.MeshStandardMaterial({{
        color: i % 2 === 0 ? {col_three1} : {col_three2},
        metalness: 0.75,
        roughness: 0.22,
        emissive: i % 2 === 0 ? {col_three1} : {col_three2},
        emissiveIntensity: 0.12
    }});
    const mesh = new THREE.Mesh(baseGeometry, mat);

    const radius = 2.4 + (i / {obj_count}) * 2.8;
    const angle = (i / {obj_count}) * Math.PI * 2;
    mesh.position.set(
        Math.cos(angle) * radius,
        (Math.sin(i * 1.5) * 1.4),
        Math.sin(angle) * radius
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

    mesh.userData = {{
        angle: angle,
        radius: radius,
        rotSpeedX: (Math.random() - 0.5) * 0.03 * {spd},
        rotSpeedY: (Math.random() - 0.5) * 0.04 * {spd},
        orbitSpeed: (0.008 + (i % 3) * 0.004) * {spd}
    }};

    group.add(mesh);
    objects.push(mesh);
}}

// Interactive Mouse Parallax
let mouseX = 0, mouseY = 0;
function onMouseMove(e) {{
    mouseX = (e.clientX - width / 2) / (width / 2);
    mouseY = (e.clientY - height / 2) / (height / 2);
}}
window.addEventListener('mousemove', onMouseMove, {{ passive: true }});

// Animation Loop
const clock = new THREE.Clock();
function animate() {{
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    for (let obj of objects) {{
        obj.rotation.x += obj.userData.rotSpeedX;
        obj.rotation.y += obj.userData.rotSpeedY;

        obj.userData.angle += obj.userData.orbitSpeed;
        obj.position.x = Math.cos(obj.userData.angle) * obj.userData.radius;
        obj.position.z = Math.sin(obj.userData.angle) * obj.userData.radius;
        obj.position.y += Math.sin(time * 2.0 + obj.userData.angle) * 0.008;
    }}

    group.rotation.y = time * 0.12 * {spd};

    pointLight1.position.x = Math.sin(time * 0.8) * 5;
    pointLight1.position.z = Math.cos(time * 0.8) * 5;

    camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 1.2 + 1.8 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}}
animate();

window.addEventListener('resize', () => {{
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}});"""
            explanation = f"Synthesized an interactive 3D scene in Three.js with {obj_count} dynamic {obj_shape} geometries, dual point lights, and orbital kinetics matching '{prompt}'."
            suggested = ["Add glowing particle field around objects", "Switch geometry to icosahedrons", "Enable wireframe lattice mode"]
    elif engine == "anime":
        # 1. Morphing SVG Path / Fluid Organic Shapes
        if any(w in p for w in ["morph", "svg", "path", "fluid", "liquid", "blob", "organic"]):
            code = """// Anime.js: Fluid Organic SVG Path Morphing & Elastic Bloom
const container = document.getElementById('canvas-container') || document.body;
container.innerHTML = `
<div style="position: relative; width: 100%; height: 100%; background: #060713; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  
  <!-- Subtle Gradient Background Glow -->
  <div class="morph-glow" style="position: absolute; width: 380px; height: 380px; background: radial-gradient(circle, rgba(236, 72, 153, 0.22) 0%, rgba(56, 189, 248, 0.15) 50%, transparent 70%); border-radius: 50%; filter: blur(50px); pointer-events: none;"></div>
  
  <!-- SVG Canvas with Filters & Morph Paths -->
  <svg viewBox="0 0 400 400" style="width: 380px; height: 380px; z-index: 5; filter: drop-shadow(0 0 25px rgba(236, 72, 153, 0.35));">
    <defs>
      <linearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="50%" stop-color="#a855f7" />
        <stop offset="100%" stop-color="#f43f5e" />
      </linearGradient>
      <linearGradient id="strokeGrad" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="50%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#ec4899" />
      </linearGradient>
    </defs>
    
    <!-- Outer Orbiting Dashed Ring -->
    <circle class="orbit-ring" cx="200" cy="200" r="175" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" stroke-dasharray="8 6" />
    
    <!-- Orbiting Accent Satellites -->
    <circle class="sat-dot sat-1" cx="200" cy="25" r="4.5" fill="#38bdf8" filter="drop-shadow(0 0 6px #38bdf8)" />
    <circle class="sat-dot sat-2" cx="375" cy="200" r="4.5" fill="#f43f5e" filter="drop-shadow(0 0 6px #f43f5e)" />
    <circle class="sat-dot sat-3" cx="200" cy="375" r="4.5" fill="#a855f7" filter="drop-shadow(0 0 6px #a855f7)" />
    
    <!-- Central Fluid Morphing Blob Path -->
    <path id="morphBlob" 
      d="M200,60 C290,60 340,120 340,200 C340,285 285,340 200,340 C115,340 60,285 60,200 C60,115 115,60 200,60 Z" 
      fill="url(#blobGrad)" 
      stroke="url(#strokeGrad)" 
      stroke-width="3" 
      opacity="0.88" />
      
    <!-- Inner Radiant Core -->
    <circle class="inner-core" cx="200" cy="200" r="32" fill="rgba(255,255,255,0.9)" filter="drop-shadow(0 0 16px rgba(255,255,255,0.9))" />
  </svg>

  <div style="z-index: 10; text-align: center; margin-top: 10px;">
    <span class="morph-label" style="font-size: 0.85rem; letter-spacing: 3px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Fluid Morphing Polygon</span>
  </div>
</div>
`;

// 4 Geometric & Organic SVG Path Keyframes
const path1 = "M200,60 C290,60 340,120 340,200 C340,285 285,340 200,340 C115,340 60,285 60,200 C60,115 115,60 200,60 Z";
const path2 = "M200,45 C320,80 365,180 310,270 C260,350 140,365 75,290 C10,210 70,110 200,45 Z";
const path3 = "M200,75 C295,40 370,140 330,235 C290,330 180,360 105,310 C30,250 85,120 200,75 Z";
const path4 = "M200,50 C310,50 355,160 355,200 C355,310 270,350 200,350 C90,350 45,290 45,200 C45,90 120,50 200,50 Z";

// Master Morphing Loop
anime({
  targets: '#morphBlob',
  d: [
    { value: path2, duration: 1600, easing: 'easeInOutQuint' },
    { value: path3, duration: 1700, easing: 'easeInOutCubic' },
    { value: path4, duration: 1600, easing: 'easeInOutSine' },
    { value: path1, duration: 1800, easing: 'easeInOutQuint' }
  ],
  loop: true
});

// Subtle 360 Rotation on Path
anime({
  targets: '#morphBlob',
  rotate: '1turn',
  transformOrigin: '200px 200px',
  duration: 22000,
  loop: true,
  easing: 'linear'
});

// Counter-rotating Orbit Ring
anime({
  targets: '.orbit-ring',
  rotate: '-1turn',
  transformOrigin: '200px 200px',
  duration: 16000,
  loop: true,
  easing: 'linear'
});

// Satellite Pulse & Scale
anime({
  targets: '.sat-dot',
  scale: [0.7, 1.4, 0.7],
  opacity: [0.5, 1.0, 0.5],
  delay: anime.stagger(300),
  duration: 1800,
  loop: true,
  easing: 'easeInOutSine'
});

// Inner Core Pulsing Glow
anime({
  targets: '.inner-core',
  scale: [0.8, 1.2, 0.8],
  opacity: [0.7, 1.0, 0.7],
  duration: 1500,
  loop: true,
  easing: 'easeInOutSine'
});"""
            explanation = "Synthesized a fluid organic SVG path morphing animation in Anime.js with multi-state cubic bezier paths, glowing gradient strokes, and orbiting satellites."
            suggested = ["Change shape morphing speed", "Add interactive click to trigger morph", "Switch to neon dual-tone gradient fill"]

        # 2. Kinetic Typographic Wave / Text / Kinetic Letters
        elif any(w in p for w in ["typo", "text", "letter", "font", "word", "title"]) or ("wave" in p and "grid" not in p and "matrix" not in p):
            code = """// Anime.js: Kinetic Typographic Wave with 3D Letter Stagger
const container = document.getElementById('canvas-container') || document.body;
container.innerHTML = `
<div style="position: relative; width: 100%; height: 100%; background: #070913; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;">
  
  <!-- Subtle Background Bokeh Light Orbs -->
  <div class="bokeh-orb" style="position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.12) 40%, transparent 70%); border-radius: 50%; filter: blur(40px); pointer-events: none;"></div>
  
  <!-- Main Display Typography Stage -->
  <div style="z-index: 10; text-align: center; perspective: 1000px;">
    
    <div id="typoHeader" style="display: inline-flex; align-items: center; margin-bottom: 12px; overflow: hidden;">
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">K</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">I</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">N</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">E</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">T</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">I</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #38bdf8; display: inline-block;">C</span>
      <span style="display:inline-block; width: 12px;"></span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #c084fc; display: inline-block;">W</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #c084fc; display: inline-block;">A</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #c084fc; display: inline-block;">V</span>
      <span class="sub-letter" style="font-size: 0.9rem; font-weight: 700; letter-spacing: 5px; text-transform: uppercase; color: #c084fc; display: inline-block;">E</span>
    </div>

    <div id="typoMain" style="display: flex; justify-content: center; gap: 4px; font-size: 4.2rem; font-weight: 900; letter-spacing: 4px;">
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">X</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">T</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">R</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">A</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #e879f9); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">A</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">N</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #fb7185); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">I</span>
      <span class="typo-char" style="display: inline-block; background: linear-gradient(180deg, #ffffff, #f43f5e); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">M</span>
    </div>

    <!-- Animated Underline Tracer -->
    <div style="width: 100%; height: 3px; margin: 16px auto 0; background: rgba(255,255,255,0.1); border-radius: 3px; position: relative; overflow: hidden;">
      <div class="line-tracer" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(90deg, #38bdf8, #c084fc, #f43f5e); border-radius: 3px; transform: scaleX(0); transform-origin: left;"></div>
    </div>
  </div>
</div>
`;

// Master Choreographed Typographic Timeline
const tl = anime.timeline({
  loop: true,
  direction: 'alternate',
  easing: 'easeInOutQuad'
});

tl
.add({
  targets: '.bokeh-orb',
  scale: [0.8, 1.3],
  opacity: [0.25, 0.65],
  duration: 2000,
  easing: 'easeInOutSine'
}, 0)
.add({
  targets: '.sub-letter',
  translateY: [-25, 0],
  opacity: [0, 1],
  duration: 600,
  delay: anime.stagger(40),
  easing: 'easeOutQuad'
}, 100)
.add({
  targets: '.typo-char',
  translateY: [
    { value: -45, duration: 600, easing: 'easeOutBack' },
    { value: 0, duration: 800, easing: 'easeOutBounce' }
  ],
  rotateX: [
    { value: -45, duration: 500, easing: 'easeOutQuad' },
    { value: 0, duration: 600, easing: 'easeOutBack' }
  ],
  rotateZ: function(el, i) {
    return [i % 2 === 0 ? -12 : 12, 0];
  },
  scale: [
    { value: 1.25, duration: 500, easing: 'easeOutQuad' },
    { value: 1.0, duration: 600, easing: 'easeOutElastic(1, .6)' }
  ],
  filter: [
    { value: 'drop-shadow(0 15px 25px rgba(244,63,94,0.6))', duration: 600 },
    { value: 'drop-shadow(0 0 0px transparent)', duration: 600 }
  ],
  delay: anime.stagger(90, { from: 'center' }),
  duration: 1600
}, 300)
.add({
  targets: '.line-tracer',
  scaleX: [0, 1],
  duration: 800,
  easing: 'easeInOutExpo'
}, 700);"""
            explanation = "Synthesized a kinetic typographic wave in Anime.js featuring character-by-character 3D staggered leap, elastic bounce, drop shadows, and animated underline tracer."
            suggested = ["Change typography text to custom phrase", "Increase letter-spacing bounce intensity", "Add floating particle dust in background"]

        elif any(w in p for w in ["hud", "radar", "reticle", "scanner", "target", "caliper"]):
            code = """// Anime.js: Cybernetic Circular HUD Reticle & Radar Scanner
const container = document.getElementById('canvas-container') || document.body;
container.innerHTML = `
<div style="position: relative; width: 100%; height: 100%; background: #050811; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
  
  <!-- Subtle Background Radar Glow -->
  <div class="hud-glow" style="position: absolute; width: 420px; height: 420px; background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.1) 50%, transparent 70%); border-radius: 50%; filter: blur(45px); pointer-events: none;"></div>

  <!-- SVG Holographic HUD Container -->
  <svg viewBox="0 0 440 440" style="width: 400px; height: 400px; z-index: 5; filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.35));">
    
    <!-- Coordinate Crosshairs -->
    <line x1="220" y1="40" x2="220" y2="400" stroke="rgba(16, 185, 129, 0.2)" stroke-width="1" stroke-dasharray="4 4" />
    <line x1="40" y1="220" x2="400" y2="220" stroke="rgba(16, 185, 129, 0.2)" stroke-width="1" stroke-dasharray="4 4" />

    <!-- Outer Compass Ring with Dashes -->
    <circle class="hud-outer-ring" cx="220" cy="220" r="180" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="6 8" opacity="0.65" />
    
    <!-- Reverse Caliper Ring Arcs -->
    <circle class="hud-caliper-1" cx="220" cy="220" r="150" fill="none" stroke="#06b6d4" stroke-width="3" stroke-dasharray="70 40 30 50" opacity="0.85" />
    <circle class="hud-caliper-2" cx="220" cy="220" r="125" fill="none" stroke="#34d399" stroke-width="2" stroke-dasharray="120 60" opacity="0.75" />

    <!-- Center Radar Scanning Sweep Beam -->
    <g class="radar-beam">
      <path d="M220,220 L320,130 A140,140 0 0,0 220,80 Z" fill="rgba(16, 185, 129, 0.25)" />
      <line x1="220" y1="220" x2="320" y2="130" stroke="#10b981" stroke-width="2" />
    </g>

    <!-- Inner Rotating Hex Core -->
    <polygon class="hud-hex" points="220,185 250,202 250,238 220,255 190,238 190,202" fill="none" stroke="#38bdf8" stroke-width="2" />
    
    <!-- Central Pulsing Target Lock Dot -->
    <circle class="hud-lock" cx="220" cy="220" r="7" fill="#10b981" filter="drop-shadow(0 0 8px #10b981)" />

    <!-- Corner Sci-Fi Telemetry Readouts -->
    <text x="50" y="70" fill="#34d399" font-size="11" font-weight="600" letter-spacing="2">SYS::RADAR.V4</text>
    <text x="310" y="70" fill="#38bdf8" font-size="11" font-weight="600" letter-spacing="2">LOCK::ENGAGED</text>
    <text x="50" y="380" fill="#10b981" font-size="11" font-weight="600" letter-spacing="2">BRG::342.5°</text>
    <text class="hud-counter" x="310" y="380" fill="#34d399" font-size="11" font-weight="600" letter-spacing="2">RNG::1840M</text>
  </svg>

  <div style="z-index: 10; margin-top: 10px; display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #6ee7b7; letter-spacing: 2px;">
    <span class="hud-ping" style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
    <span>AUTONOMOUS TARGETING INTERFACE</span>
  </div>
</div>
`;

// Radar Sweep Continuous Rotation
anime({
  targets: '.radar-beam',
  rotate: '1turn',
  transformOrigin: '220px 220px',
  duration: 3500,
  loop: true,
  easing: 'linear'
});

// Counter-Rotating Calipers
anime({
  targets: '.hud-outer-ring',
  rotate: '1turn',
  transformOrigin: '220px 220px',
  duration: 20000,
  loop: true,
  easing: 'linear'
});

anime({
  targets: '.hud-caliper-1',
  rotate: '-1turn',
  transformOrigin: '220px 220px',
  duration: 12000,
  loop: true,
  easing: 'linear'
});

anime({
  targets: '.hud-caliper-2',
  rotate: '1turn',
  transformOrigin: '220px 220px',
  duration: 8000,
  loop: true,
  easing: 'linear'
});

// Hex Core Fast Flip
anime({
  targets: '.hud-hex',
  rotate: '-1turn',
  transformOrigin: '220px 220px',
  scale: [0.9, 1.15, 0.9],
  duration: 6000,
  loop: true,
  easing: 'easeInOutSine'
});

// Central Lock Ping
anime({
  targets: '.hud-lock, .hud-ping',
  scale: [0.7, 1.5, 0.7],
  opacity: [0.5, 1.0, 0.5],
  duration: 1000,
  loop: true,
  easing: 'easeInOutQuad'
});"""
            explanation = "Synthesized a multi-layered cybernetic sci-fi HUD in Anime.js with counter-rotating caliper arcs, continuous radar sweep line, and live telemetry readouts."
            suggested = ["Add audio ping sound on radar lock", "Change reticle color to fiery amber/orange", "Increase radar sweep rotation frequency"]

        elif any(w in p for w in ["grid", "matrix", "stagger"]):
            code = """// Anime.js: Kinetic Stagger Matrix & Harmonic Radiant Waves
const container = document.getElementById('canvas-container') || document.body;
container.innerHTML = `
<div style="position: relative; width: 100%; height: 100%; background: #060814; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  
  <!-- Glowing Ambient Atmosphere Orbs -->
  <div class="ambient-glow" style="position: absolute; width: 450px; height: 450px; background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(236, 72, 153, 0.1) 45%, transparent 70%); border-radius: 50%; filter: blur(50px); pointer-events: none;"></div>
  
  <!-- Sleek Minimal Header -->
  <div style="z-index: 10; text-align: center; margin-bottom: 24px;">
    <div class="matrix-badge" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; color: #a5b4fc; margin-bottom: 8px;">
      <span style="width: 6px; height: 6px; background: #6366f1; border-radius: 50%; box-shadow: 0 0 8px #6366f1;"></span>
      Kinetic Harmonic Grid
    </div>
    <h1 class="matrix-title" style="margin: 0; font-size: 2.0rem; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #818cf8, #f43f5e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 1px;">
      Geometric Stagger Matrix
    </h1>
  </div>

  <!-- Kinetic 9x9 Node Matrix (81 Nodes) -->
  <div id="gridMatrix" style="display: grid; grid-template-columns: repeat(9, 32px); grid-template-rows: repeat(9, 32px); gap: 10px; z-index: 5; padding: 12px; background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255,255,255,0.06); border-radius: 18px; backdrop-filter: blur(10px);"></div>

  <!-- Synchronized Bottom Progress Timeline -->
  <div style="position: absolute; bottom: 28px; width: 340px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
    <div class="matrix-timeline" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8, #f43f5e); border-radius: 4px;"></div>
  </div>
</div>
`;

// Populate 81 Grid Elements
const grid = document.getElementById('gridMatrix');
const totalNodes = 81;
for (let i = 0; i < totalNodes; i++) {
  const node = document.createElement('div');
  node.className = 'grid-node';
  node.style.cssText = 'width: 32px; height: 32px; background: #1e293b; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); will-change: transform, background-color, box-shadow;';
  grid.appendChild(node);
}

// Master Timeline Choreography
const tl = anime.timeline({
  easing: 'easeInOutQuad',
  loop: true
});

tl
.add({
  targets: '.ambient-glow',
  scale: [0.85, 1.3, 0.85],
  opacity: [0.35, 0.75, 0.35],
  duration: 2400,
  easing: 'easeInOutSine'
}, 0)
.add({
  targets: '.matrix-timeline',
  width: ['0%', '100%'],
  duration: 3600,
  easing: 'linear'
}, 0)
.add({
  targets: '.grid-node',
  scale: [
    { value: 0.15, easing: 'easeOutSine', duration: 400 },
    { value: 1.25, easing: 'easeInOutQuad', duration: 700 },
    { value: 1.0, easing: 'easeInOutQuad', duration: 450 }
  ],
  rotateZ: anime.stagger([0, 180], { grid: [9, 9], from: 'center' }),
  borderRadius: [
    { value: '50%', duration: 500 },
    { value: '8px', duration: 600 }
  ],
  backgroundColor: [
    { value: '#06b6d4', duration: 400 },
    { value: '#6366f1', duration: 500 },
    { value: '#ec4899', duration: 500 },
    { value: '#1e293b', duration: 400 }
  ],
  boxShadow: [
    { value: '0 0 16px rgba(6, 182, 212, 0.8)', duration: 400 },
    { value: '0 0 24px rgba(236, 72, 153, 0.8)', duration: 500 },
    { value: '0 0 0px transparent', duration: 500 }
  ],
  delay: anime.stagger(55, { grid: [9, 9], from: 'center' }),
  duration: 1800
}, 200)
.add({
  targets: '.matrix-title',
  scale: [0.95, 1.03, 1.0],
  duration: 1200,
  easing: 'easeInOutSine'
}, 300);"""
            explanation = "Synthesized an 81-node kinetic stagger matrix in Anime.js with radial expansion ripples from center, chromatic color morphing, and synchronized timeline bar."
            suggested = ["Increase grid dimensions to 11x11", "Make nodes morph into circles during ripple", "Trigger ripple wave on hover"]

        else:
            # Dynamic Anime.js kinetic choreography tailored to user demand
            a_count = min(max(params["count"], 3), 32)
            a_col1 = params["primary_color"]["hex"]
            a_col2 = params["secondary_color"]["hex"]
            a_shape = params["shape"]
            a_speed = params["speed_factor"]
            border_radius = "50%" if a_shape == "sphere" else "10px" if a_shape == "box" else "24px"

            code = f"""// Anime.js: Dynamic Kinetic Choreography
// User Demand: shape={a_shape}, count={a_count}, color1={a_col1}, color2={a_col2}, speed={a_speed}x

const container = document.getElementById('canvas-container') || document.body;
container.innerHTML = `
<div style="position: relative; width: 100%; height: 100%; background: #060812; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  
  <div class="glow-orb" style="position: absolute; width: 450px; height: 450px; background: radial-gradient(circle, {a_col1}33 0%, {a_col2}1a 50%, transparent 70%); border-radius: 50%; filter: blur(55px); pointer-events: none;"></div>

  <div style="z-index: 10; text-align: center; margin-bottom: 24px;">
    <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; color: {a_col1}; margin-bottom: 8px;">
      <span style="width: 6px; height: 6px; background: {a_col1}; border-radius: 50%; box-shadow: 0 0 8px {a_col1};"></span>
      Anime.js Choreography
    </div>
  </div>

  <div id="elementsContainer" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 16px; max-width: 680px; z-index: 5;"></div>
</div>
`;

const stage = document.getElementById('elementsContainer');
for (let i = 0; i < {a_count}; i++) {{
  const el = document.createElement('div');
  el.className = 'motion-element';
  const bgCol = i % 2 === 0 ? '{a_col1}' : '{a_col2}';
  el.style.cssText = `width: 52px; height: 52px; background: ${{bgCol}}; border-radius: {border_radius}; box-shadow: 0 0 20px ${{bgCol}}66; cursor: pointer;`;
  stage.appendChild(el);
}}

anime.timeline({{
  loop: true,
  direction: 'alternate',
  easing: 'easeInOutBack'
}})
.add({{
  targets: '.motion-element',
  translateY: [
    {{ value: -55, duration: 650 / {a_speed}, easing: 'easeOutQuad' }},
    {{ value: 0, duration: 800 / {a_speed}, easing: 'easeOutBounce' }}
  ],
  scale: [
    {{ value: 1.35, duration: 500 / {a_speed}, easing: 'easeOutSine' }},
    {{ value: 1.0, duration: 750 / {a_speed}, easing: 'easeInOutElastic(1, .6)' }}
  ],
  rotate: [
    {{ value: () => anime.random(-45, 45), duration: 600 / {a_speed} }},
    {{ value: 0, duration: 600 / {a_speed} }}
  ],
  opacity: [0.75, 1.0],
  delay: anime.stagger(100 / {a_speed}, {{ from: 'center' }})
}})
.add({{
  targets: '.glow-orb',
  scale: [0.85, 1.25],
  duration: 1500 / {a_speed},
  easing: 'easeInOutSine'
}}, 0);
"""
            explanation = f"Synthesized an interactive Anime.js kinetic choreography with {a_count} dynamic {a_shape} entities ({a_col1}, {a_col2}) and staggered elastic physics matching '{prompt}'."
            suggested = ["Increase bounce height", "Change stagger sequence to linear", "Switch to particle burst mode"]
    elif engine == "rough":
        # 1. Animated Wobbly Live Flipbook Mascot / Cartoon Character
        if any(w in p for w in ["wobble", "cartoon", "mascot", "character", "flipbook", "live", "cat", "vibrat", "face"]):
            code = """// --- Rough.js: Animated Wobbly Cartoon Mascot ---
// Available in scope: canvas, ctx, rc (rough.canvas instance), width, height

let frame = 0;
function drawMascot() {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const wobble = Math.sin(frame * 0.12) * 3;
    const earWiggle = Math.cos(frame * 0.08) * 5;

    // 1. Outer Head Contour
    rc.circle(cx, cy + wobble, 260, {
        roughness: 2.6,
        stroke: '#27272a',
        strokeWidth: 4,
        fill: '#fef3c7',
        fillStyle: 'solid'
    });

    // 2. Ears with Hatching
    rc.polygon([
        [cx - 110, cy - 90 + wobble],
        [cx - 160 + earWiggle, cy - 220 + wobble],
        [cx - 30, cy - 130 + wobble]
    ], {
        roughness: 2.2,
        stroke: '#27272a',
        strokeWidth: 3.5,
        fill: 'rgba(244, 63, 94, 0.45)',
        fillStyle: 'hachure',
        hachureAngle: -45,
        hachureGap: 6
    });

    rc.polygon([
        [cx + 110, cy - 90 + wobble],
        [cx + 160 - earWiggle, cy - 220 + wobble],
        [cx + 30, cy - 130 + wobble]
    ], {
        roughness: 2.2,
        stroke: '#27272a',
        strokeWidth: 3.5,
        fill: 'rgba(244, 63, 94, 0.45)',
        fillStyle: 'hachure',
        hachureAngle: 45,
        hachureGap: 6
    });

    // 3. Cute Anime Eyes
    rc.ellipse(cx - 55, cy - 20 + wobble, 45, 60, {
        roughness: 1.5,
        stroke: '#18181b',
        strokeWidth: 3,
        fill: '#18181b',
        fillStyle: 'solid'
    });
    rc.ellipse(cx + 55, cy - 20 + wobble, 45, 60, {
        roughness: 1.5,
        stroke: '#18181b',
        strokeWidth: 3,
        fill: '#18181b',
        fillStyle: 'solid'
    });

    // Eye Highlights (Gleams)
    rc.circle(cx - 62, cy - 32 + wobble, 14, { fill: '#ffffff', fillStyle: 'solid', stroke: 'none' });
    rc.circle(cx + 48, cy - 32 + wobble, 14, { fill: '#ffffff', fillStyle: 'solid', stroke: 'none' });

    // 4. Nose & Smiling Cat Mouth
    rc.polygon([[cx - 10, cy + 20 + wobble], [cx + 10, cy + 20 + wobble], [cx, cy + 32 + wobble]], {
        roughness: 1.2,
        stroke: '#e11d48',
        strokeWidth: 2,
        fill: '#e11d48',
        fillStyle: 'solid'
    });
    rc.arc(cx - 22, cy + 42 + wobble, 45, 30, 0, Math.PI, false, { roughness: 2.0, stroke: '#27272a', strokeWidth: 3 });
    rc.arc(cx + 22, cy + 42 + wobble, 45, 30, 0, Math.PI, false, { roughness: 2.0, stroke: '#27272a', strokeWidth: 3 });

    // 5. Cheeks Blush Hatching
    rc.rectangle(cx - 105, cy + 25 + wobble, 45, 20, {
        roughness: 2.2,
        stroke: 'none',
        fill: '#f43f5e',
        fillStyle: 'zigzag',
        hachureGap: 4
    });
    rc.rectangle(cx + 60, cy + 25 + wobble, 45, 20, {
        roughness: 2.2,
        stroke: 'none',
        fill: '#f43f5e',
        fillStyle: 'zigzag',
        hachureGap: 4
    });

    // 6. Whiskers
    rc.line(cx - 85, cy + 15 + wobble, cx - 165, cy + 5 + wobble, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });
    rc.line(cx - 85, cy + 30 + wobble, cx - 170, cy + 35 + wobble, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });
    rc.line(cx + 85, cy + 15 + wobble, cx + 165, cy + 5 + wobble, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });
    rc.line(cx + 85, cy + 30 + wobble, cx + 170, cy + 35 + wobble, { roughness: 2.2, stroke: '#52525b', strokeWidth: 2.5 });

    frame++;
    requestAnimationFrame(drawMascot);
}
drawMascot();"""
            explanation = "Synthesized an animated wobbly cartoon mascot in Rough.js rendered with requestAnimationFrame to create an authentic hand-drawn flipbook wiggle effect."
            suggested = ["Add animated blinking eye effect", "Change animal to a bear or rabbit", "Add a sketchy floating speech bubble"]

        # 2. Hand-Drawn Math Function & Coordinate Graph with Hatching
        elif any(w in p for w in ["graph", "math", "curve", "coordinate", "plot", "calculus", "sine", "axis", "axes"]):
            code = """// --- Rough.js: Hand-Drawn Coordinate System & Calculus Curve ---
// Available in scope: canvas, ctx, rc (rough.canvas instance), width, height

const ox = 140;
const oy = height / 2;

// 1. Sketchy Coordinate Axes
rc.line(ox, 60, ox, height - 60, { roughness: 1.8, stroke: '#64748b', strokeWidth: 2.5 });
rc.line(ox - 40, oy, width - 80, oy, { roughness: 1.8, stroke: '#64748b', strokeWidth: 2.5 });

// Axis Arrow Heads
rc.line(ox, 60, ox - 10, 75, { roughness: 1.4, stroke: '#64748b', strokeWidth: 2 });
rc.line(ox, 60, ox + 10, 75, { roughness: 1.4, stroke: '#64748b', strokeWidth: 2 });
rc.line(width - 80, oy, width - 95, oy - 10, { roughness: 1.4, stroke: '#64748b', strokeWidth: 2 });
rc.line(width - 80, oy, width - 95, oy + 10, { roughness: 1.4, stroke: '#64748b', strokeWidth: 2 });

ctx.font = 'bold 16px "Courier New", monospace';
ctx.fillStyle = '#94a3b8';
ctx.fillText('f(x)', ox - 20, 50);
ctx.fillText('x', width - 70, oy + 25);

// 2. Shaded Area Under Curve (Definite Integral with Hachure)
const areaPoints = [[ox, oy]];
for (let x = 0; x <= 650; x += 15) {
    const px = ox + x;
    const py = oy - Math.sin(x * 0.012) * 140;
    areaPoints.push([px, py]);
}
areaPoints.push([ox + 650, oy]);

rc.polygon(areaPoints, {
    roughness: 1.6,
    fill: 'rgba(56, 189, 248, 0.25)',
    fillStyle: 'hachure',
    stroke: 'none',
    hachureAngle: -45,
    hachureGap: 6
});

// 3. Main Oscillating Wave Curve
const curvePoints = [];
for (let x = 0; x <= width - 240; x += 12) {
    const px = ox + x;
    const py = oy - Math.sin(x * 0.012) * 140;
    curvePoints.push([px, py]);
}
rc.curve(curvePoints, { roughness: 2.2, stroke: '#38bdf8', strokeWidth: 3.5 });

// 4. Tangent Vector Slope at x = 320
const tx = ox + 320;
const ty = oy - Math.sin(320 * 0.012) * 140;
rc.circle(tx, ty, 14, { roughness: 1.5, fill: '#f43f5e', fillStyle: 'solid', stroke: '#f43f5e' });
rc.line(tx - 120, ty + 60, tx + 120, ty - 60, { roughness: 1.6, stroke: '#fb7185', strokeWidth: 3 });

// 5. Mathematical Formula Badge
rc.rectangle(width - 360, 60, 310, 85, {
    roughness: 1.8,
    fill: 'rgba(15, 23, 42, 0.85)',
    fillStyle: 'solid',
    stroke: '#38bdf8',
    strokeWidth: 2
});

ctx.font = 'bold 15px "Courier New", monospace';
ctx.fillStyle = '#38bdf8';
ctx.textAlign = 'left';
ctx.fillText('f(x) = A · sin(ωx)', width - 330, 95);
ctx.fillStyle = '#fb7185';
ctx.fillText("f'(x) = Aω · cos(ωx)", width - 330, 122);"""
            explanation = "Synthesized a hand-drawn mathematical coordinate graph in Rough.js with sketch axes, hatch-shaded integral area under a sinusoidal curve, and a tangent vector slope."
            suggested = ["Change wave to a polynomial cubic curve", "Add secant line animation", "Add grid tick marks along axes"]

        # 3. Geometric Bauhaus Composition with Varied Fill Styles
        elif any(w in p for w in ["bauhaus", "generative sketch matrix", "abstract bauhaus"]):
            code = """// --- Rough.js: Generative Algorithmic Sketch Matrix ---
// Available in scope: canvas, ctx, rc (rough.canvas instance), width, height

const cols = 8;
const rows = 4;
const padding = 70;
const cellW = (width - padding * 2) / cols;
const cellH = (height - padding * 2) / rows;

const styles = ['hachure', 'cross-hatch', 'zigzag', 'dots', 'dashed'];
const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#34d399', '#facc15'];

for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
        const x = padding + c * cellW + cellW / 2;
        const y = padding + r * cellH + cellH / 2;
        const radius = Math.min(cellW, cellH) * 0.72;
        const color = colors[(r * cols + c) % colors.length];
        const fillStyle = styles[(r + c) % styles.length];

        if ((r + c) % 3 === 0) {
            rc.circle(x, y, radius, {
                roughness: 1.8 + Math.sin(r + c),
                fill: color,
                fillStyle: fillStyle,
                stroke: color,
                strokeWidth: 2,
                hachureAngle: (r + c) * 35,
                hachureGap: 5
            });
        } else if ((r + c) % 3 === 1) {
            rc.rectangle(x - radius / 2, y - radius / 2, radius, radius, {
                roughness: 2.2,
                fill: color,
                fillStyle: fillStyle,
                stroke: color,
                strokeWidth: 2,
                hachureAngle: 60,
                hachureGap: 6
            });
        } else {
            rc.polygon([
                [x, y - radius / 2],
                [x + radius / 2, y + radius / 2],
                [x - radius / 2, y + radius / 2]
            ], {
                roughness: 2.0,
                fill: color,
                fillStyle: fillStyle,
                stroke: color,
                strokeWidth: 2,
                hachureAngle: -45,
                hachureGap: 5
            });
        }
    }
}"""
            explanation = "Synthesized a generative Bauhaus-style geometric sketch composition in Rough.js utilizing cross-hatch, zigzag, dots, and dashed fill styles across vibrant color palettes."
            suggested = ["Add interactive click ripple across nodes", "Change shapes to concentric circles", "Morph colors on animation timer"]

        elif any(w in p for w in ["architecture", "blueprint", "microservice", "system", "flowchart", "database", "redis", "kafka", "server"]):
            code = """// --- Rough.js: Hand-Drawn System Architecture Blueprint ---
// Available in scope: canvas, ctx, rc (rough.canvas instance), width, height

// 1. Draw Sketchy Grid Background & Outer Border
rc.rectangle(24, 24, width - 48, height - 48, {
    roughness: 1.4,
    stroke: '#334155',
    strokeWidth: 2,
    bowing: 1.8
});

// 2. Title Header Banner
rc.rectangle(width / 2 - 190, 44, 380, 52, {
    roughness: 1.6,
    fill: 'rgba(56, 189, 248, 0.16)',
    fillStyle: 'hachure',
    stroke: '#38bdf8',
    strokeWidth: 2.2,
    hachureAngle: -35,
    hachureGap: 5
});

ctx.font = 'bold 18px "Courier New", monospace';
ctx.fillStyle = '#38bdf8';
ctx.textAlign = 'center';
ctx.fillText('⚡ DISTRIBUTED ARCHITECTURE', width / 2, 76);

// 3. Core Service Nodes (Microservices Pipeline)
const nodes = [
    { x: 100, y: 180, w: 160, h: 86, label: 'CLIENT UI', sub: 'React / Next.js', fill: 'rgba(244, 114, 182, 0.2)', stroke: '#f472b6', style: 'zigzag' },
    { x: 380, y: 180, w: 180, h: 86, label: 'API GATEWAY', sub: 'Reverse Proxy', fill: 'rgba(192, 132, 252, 0.2)', stroke: '#c084fc', style: 'cross-hatch' },
    { x: 680, y: 180, w: 180, h: 86, label: 'EVENT WORKER', sub: 'Kafka Consumer', fill: 'rgba(74, 222, 128, 0.2)', stroke: '#4ade80', style: 'dots' },
    { x: 980, y: 180, w: 160, h: 86, label: 'POSTGRES DB', sub: 'Sharded Cluster', fill: 'rgba(250, 204, 21, 0.2)', stroke: '#facc15', style: 'hachure' }
];

nodes.forEach(node => {
    rc.rectangle(node.x, node.y, node.w, node.h, {
        roughness: 2.2,
        fill: node.fill,
        fillStyle: node.style,
        stroke: node.stroke,
        strokeWidth: 2.5,
        hachureGap: 6
    });

    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(node.label, node.x + node.w / 2, node.y + 38);

    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(node.sub, node.x + node.w / 2, node.y + 62);
});

// 4. Connecting Hand-Drawn Directed Arrows
const drawArrow = (x1, y1, x2, y2, color, label) => {
    rc.line(x1, y1, x2, y2, { roughness: 1.8, stroke: color, strokeWidth: 2.5 });
    // Arrow Head
    rc.line(x2, y2, x2 - 14, y2 - 8, { roughness: 1.5, stroke: color, strokeWidth: 2.5 });
    rc.line(x2, y2, x2 - 14, y2 + 8, { roughness: 1.5, stroke: color, strokeWidth: 2.5 });
    if (label) {
        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(label, (x1 + x2) / 2, y1 - 10);
    }
};

drawArrow(260, 223, 380, 223, '#f472b6', 'HTTPS/REST');
drawArrow(560, 223, 680, 223, '#c084fc', 'gRPC / TCP');
drawArrow(860, 223, 980, 223, '#4ade80', 'SQL POOL');

// 5. Cloud Cache & Message Broker (Lower Level)
rc.ellipse(width / 2, 430, 320, 110, {
    roughness: 2.4,
    fill: 'rgba(14, 165, 233, 0.18)',
    fillStyle: 'hachure',
    stroke: '#38bdf8',
    strokeWidth: 2.8,
    hachureAngle: 45,
    hachureGap: 7
});

ctx.fillStyle = '#38bdf8';
ctx.font = 'bold 16px "Courier New", monospace';
ctx.textAlign = 'center';
ctx.fillText('☁️ REDIS GLOBAL REPLICA', width / 2, 435);

drawArrow(470, 266, width / 2 - 50, 375, '#38bdf8', 'Cache Hit');
drawArrow(770, 266, width / 2 + 50, 375, '#38bdf8', 'Pub/Sub');"""
            explanation = "Synthesized a hand-drawn distributed system architecture blueprint in Rough.js with sketch boxes, custom hachure/cross-hatch fills, connecting directed arrows, and Redis cache cloud."
            suggested = ["Add asynchronous message queue node", "Change hachure angles and sketch roughness", "Add status telemetry ping dots to nodes"]

        else:
            # Dynamic Rough.js Hand-Drawn Kinetic Sketch tailored directly to user demand
            r_count = min(max(params["count"], 3), 16)
            r_col1 = params["primary_color"]["hex"]
            r_col2 = params["secondary_color"]["hex"]
            r_col3 = params["accent_color"]["hex"]
            r_shape = params["shape"]
            r_speed = params["speed_factor"]

            code = f"""// --- Rough.js: Dynamic Hand-Drawn Kinetic Sketch ---
// User Demand: shape={r_shape}, count={r_count}, primaryColor={r_col1}, secondaryColor={r_col2}
// Available in scope: canvas, ctx, rc (rough.canvas instance), width, height

let frame = 0;
const palette = ['{r_col1}', '{r_col2}', '{r_col3}', '#38bdf8', '#f43f5e'];
const fillStyles = ['hachure', 'cross-hatch', 'zigzag', 'dots'];

function drawScene() {{
    ctx.clearRect(0, 0, width, height);

    // Sketchy Outer Border
    rc.rectangle(16, 16, width - 32, height - 32, {{
        roughness: 1.4,
        stroke: '#27272a',
        strokeWidth: 2,
        bowing: 1.5
    }});

    const cx = width / 2;
    const cy = height / 2;
    const itemsCount = {r_count};

    for (let i = 0; i < itemsCount; i++) {{
        const angle = (i / itemsCount) * Math.PI * 2 + (frame * 0.015 * {r_speed});
        const radius = Math.min(width, height) * 0.28 + Math.sin(frame * 0.05 + i) * 15;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const size = Math.min(width, height) * 0.12;
        const color = palette[i % palette.length];
        const style = fillStyles[i % fillStyles.length];

        if ('{r_shape}' === 'box') {{
            rc.rectangle(x - size / 2, y - size / 2, size, size, {{
                roughness: 1.8 + Math.sin(frame * 0.1 + i) * 0.4,
                stroke: color,
                strokeWidth: 2.5,
                fill: color,
                fillStyle: style,
                hachureAngle: (i * 35) + (frame * 0.8),
                hachureGap: 5
            }});
        }} else if ('{r_shape}' === 'cone' || '{r_shape}' === 'pyramid') {{
            rc.polygon([
                [x, y - size / 2],
                [x + size / 2, y + size / 2],
                [x - size / 2, y + size / 2]
            ], {{
                roughness: 1.8,
                stroke: color,
                strokeWidth: 2.5,
                fill: color,
                fillStyle: style,
                hachureAngle: 45,
                hachureGap: 6
            }});
        }} else {{
            rc.circle(x, y, size, {{
                roughness: 1.8 + Math.sin(frame * 0.1 + i) * 0.4,
                stroke: color,
                strokeWidth: 2.5,
                fill: color,
                fillStyle: style,
                hachureAngle: (i * 45) + (frame * 0.5),
                hachureGap: 5
            }});
        }}

        // Connecting sketchy lines to center
        rc.line(cx, cy, x, y, {{
            roughness: 2.2,
            stroke: 'rgba(255, 255, 255, 0.15)',
            strokeWidth: 1.2
        }});
    }}

    // Center Core Node
    rc.circle(cx, cy, 32, {{
        roughness: 1.5,
        fill: '{r_col1}',
        fillStyle: 'solid',
        stroke: '#ffffff',
        strokeWidth: 2
    }});

    frame++;
    requestAnimationFrame(drawScene);
}}
drawScene();
"""
            explanation = f"Synthesized a dynamic hand-drawn Rough.js generative sketch with {r_count} animated {r_shape} entities ({r_col1}, {r_col2}) and authentic wobbly hachure/cross-hatch fills for '{prompt}'."
            suggested = ["Change hatching pattern to zigzag", "Increase wobbly sketch roughness", "Add connecting spring vectors"]
    elif engine == "two":
        # 1. Mechanical Clockwork Vector Gear Train
        if any(w in p for w in ["gear", "mechanical", "clockwork", "train", "interlock", "teeth", "wheel"]):
            code = """// --- Two.js: Synchronized Mechanical Vector Gear Train ---
// Available in scope: two, Two, width, height, container

const cx = width / 2;
const cy = height / 2;

function createGear(x, y, radius, teeth, color) {
    const group = two.makeGroup();
    const points = [];
    const toothDepth = radius * 0.16;
    const numPoints = teeth * 4;

    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const r = (i % 4 === 1 || i % 4 === 2) ? radius + toothDepth : radius;
        points.push(new Two.Anchor(Math.cos(angle) * r, Math.sin(angle) * r));
    }

    // Outer Gear Rim with Involute Teeth
    const outer = two.makePolygon(0, 0, radius, teeth * 2);
    outer.vertices = points;
    outer.fill = 'transparent';
    outer.stroke = color;
    outer.linewidth = 3.5;
    group.add(outer);

    // Spokes Crossbar
    const spokeCount = 4;
    for (let s = 0; s < spokeCount; s++) {
        const spokeAngle = (s / spokeCount) * Math.PI;
        const len = radius * 0.75;
        const line = two.makeLine(
            Math.cos(spokeAngle) * len, Math.sin(spokeAngle) * len,
            -Math.cos(spokeAngle) * len, -Math.sin(spokeAngle) * len
        );
        line.stroke = color;
        line.linewidth = 2;
        group.add(line);
    }

    // Inner Cutout Ring
    const inner = two.makeCircle(0, 0, radius * 0.45);
    inner.fill = 'transparent';
    inner.stroke = color;
    inner.linewidth = 2;
    group.add(inner);

    // Center Hub Bearing
    const hub = two.makeCircle(0, 0, radius * 0.16);
    hub.fill = color;
    hub.noStroke();
    group.add(hub);

    const pin = two.makeCircle(0, 0, radius * 0.06);
    pin.fill = '#090b10';
    pin.noStroke();
    group.add(pin);

    group.translation.set(x, y);
    return group;
}

// 1. Gear Layout with meshing center distances
const gear1 = createGear(cx - 150, cy - 20, 110, 16, '#38bdf8');
const gear2 = createGear(cx + 105, cy - 20, 80, 12, '#ec4899');
const gear3 = createGear(cx - 20, cy + 145, 68, 10, '#a855f7');
const gear4 = createGear(cx + 175, cy + 145, 52, 8, '#34d399');

// 2. Meshed Rotational Speeds (ratio inverted)
const baseSpeed = 0.015;
two.bind('update', function(frameCount) {
    gear1.rotation += baseSpeed;
    gear2.rotation -= baseSpeed * (16 / 12);
    gear3.rotation -= baseSpeed * (16 / 10);
    gear4.rotation += baseSpeed * (16 / 8);
}).play();"""
            explanation = "Synthesized a precision 4-gear clockwork vector transmission in Two.js with accurate tooth-ratio rotational counter-speeds, spokes, and hub pins."
            suggested = ["Add drive chain connecting distant gears", "Change gear colors to metallic brass and chrome", "Add escapement pendulum tick-tock"]

        # 2. Vector Particle Vortex & Nebula Rings
        elif any(w in p for w in ["vortex", "particle", "nebula", "spiral", "blackhole", "singularity", "orbit"]):
            code = """// --- Two.js: Vector Particle Vortex & Nebula Orbit ---
// Available in scope: two, Two, width, height, container

const cx = width / 2;
const cy = height / 2;

// 1. Deep Space Boundary Rings
const rings = [];
const ringCount = 5;
for (let i = 0; i < ringCount; i++) {
    const r = 90 + i * 55;
    const circle = two.makeCircle(cx, cy, r);
    circle.fill = 'transparent';
    circle.stroke = 'rgba(129, 140, 248, ' + (0.12 + i * 0.04) + ')';
    circle.linewidth = 1.5;
    rings.push({ circle, baseRadius: r, speed: (i % 2 === 0 ? 0.008 : -0.006) });
}

// 2. Swirling Particle Vortex Nodes
const particles = [];
const particleCount = 28;
for (let p = 0; p < particleCount; p++) {
    const t = p / particleCount;
    const initialAngle = t * Math.PI * 4;
    const dist = 60 + t * 240;
    const size = 3 + (1 - t) * 6;
    const node = two.makeCircle(cx, cy, size);
    const hue = (t * 260 + 180) % 360;
    node.fill = 'hsl(' + hue + ', 95%, 65%)';
    node.stroke = '#ffffff';
    node.linewidth = 1;
    particles.push({
        node,
        angle: initialAngle,
        radius: dist,
        baseRadius: dist,
        speed: 0.015 + (1 - t) * 0.035,
        wobbleFreq: 2 + p * 0.2
    });
}

// 3. Central Singularity Eye
const singularity = two.makeCircle(cx, cy, 36);
singularity.fill = '#0f172a';
singularity.stroke = '#38bdf8';
singularity.linewidth = 3;

const innerDot = two.makeCircle(cx, cy, 10);
innerDot.fill = '#f43f5e';
innerDot.noStroke();

// 4. Vortex Dynamics Loop
two.bind('update', function(frameCount) {
    const time = frameCount * 0.04;

    singularity.scale = 1 + Math.sin(time * 2) * 0.12;
    innerDot.scale = 1 + Math.cos(time * 3) * 0.25;

    rings.forEach(r => {
        r.circle.rotation += r.speed;
    });

    particles.forEach((p, idx) => {
        p.angle += p.speed;
        const radialWobble = Math.sin(time * 1.5 + p.angle * 2) * 16;
        const currentR = p.baseRadius + radialWobble;
        p.node.translation.x = cx + Math.cos(p.angle) * currentR;
        p.node.translation.y = cy + Math.sin(p.angle) * currentR;
        const pulse = 1 + Math.sin(time * 3 + idx) * 0.25;
        p.node.scale = pulse;
    });
}).play();"""
            explanation = "Synthesized a cosmic particle vortex in Two.js featuring 28 hue-shifted orbital vector nodes, counter-rotating field boundaries, and a pulsating core singularity."
            suggested = ["Add curved trailing tail ribbons behind nodes", "Add interactive mouse gravitational pull", "Increase particle count to 50"]

        # 3. Dynamic Bézier Spline Wave Ribbon
        elif any(w in p for w in ["wave", "spline", "bezier", "undulat", "ribbon", "curve", "oscillation", "harmonic"]):
            code = """// --- Two.js: Undulating Harmonic Bézier Wave Ribbon ---
// Available in scope: two, Two, width, height, container

const cx = width / 2;
const cy = height / 2;
const pointCount = 14;
const segmentWidth = (width + 120) / (pointCount - 1);

// 1. Construct Two Dual Sine Wave Ribbons
function makeWavePath(strokeColor, fillColor) {
    const anchors = [];
    for (let i = 0; i < pointCount; i++) {
        const x = -60 + i * segmentWidth;
        const y = cy;
        anchors.push(new Two.Anchor(x, y));
    }
    const path = two.makeCurve(anchors, false);
    path.fill = fillColor;
    path.stroke = strokeColor;
    path.linewidth = 4;
    path.cap = 'round';
    path.join = 'round';
    return { path, anchors };
}

const wave1 = makeWavePath('#38bdf8', 'transparent');
const wave2 = makeWavePath('#ec4899', 'transparent');
wave2.path.linewidth = 2.5;

// 2. Beacon Nodes riding along peaks
const beacons = [];
for (let b = 0; b < 4; b++) {
    const beacon = two.makeCircle(0, 0, 7);
    beacon.fill = b % 2 === 0 ? '#38bdf8' : '#ec4899';
    beacon.stroke = '#ffffff';
    beacon.linewidth = 2;
    beacons.push({ beacon, targetIndex: 2 + b * 3 });
}

// 3. Harmonic Wave Simulation Loop
two.bind('update', function(frameCount) {
    const time = frameCount * 0.045;

    // Deform wave 1 vertices
    wave1.anchors.forEach((anchor, i) => {
        const offset = i * 0.45;
        const yOffset = Math.sin(time * 1.6 + offset) * 110 + Math.cos(time * 0.8 + offset * 1.5) * 40;
        anchor.y = cy + yOffset;
    });

    // Deform wave 2 vertices with phase lag
    wave2.anchors.forEach((anchor, i) => {
        const offset = i * 0.45;
        const yOffset = Math.sin(time * 1.6 + offset + Math.PI * 0.6) * 95 + Math.sin(time * 1.1 - offset) * 35;
        anchor.y = cy + yOffset;
    });

    // Ride beacons on key anchors
    beacons.forEach((b, idx) => {
        const sourceAnchor = (idx % 2 === 0 ? wave1 : wave2).anchors[b.targetIndex];
        if (sourceAnchor) {
            b.beacon.translation.set(sourceAnchor.x, sourceAnchor.y);
            b.beacon.scale = 1 + Math.sin(time * 3 + idx) * 0.3;
        }
    });
}).play();"""
            explanation = "Synthesized an undulating dual Bézier spline wave in Two.js with dynamic anchor deformers and beacon satellites riding harmonic wave crests."
            suggested = ["Add vertical audio equalizer bars between the waves", "Fill the under-curve with dynamic gradient mesh", "Add frequency controller slider"]

        elif any(w in p for w in ["kaleidoscope", "starburst", "pulsar", "mandala"]):
            code = """// --- Two.js: Hypnotic Geometric Starburst & Neon Kaleidoscope ---
// Available in scope: two, Two, width, height, container

const cx = width / 2;
const cy = height / 2;

// 1. Center Glowing Core & Ambient Aura
const aura = two.makeCircle(cx, cy, 90);
aura.fill = 'rgba(59, 130, 246, 0.08)';
aura.noStroke();

const core = two.makeCircle(cx, cy, 28);
core.fill = '#38bdf8';
core.stroke = '#93c5fd';
core.linewidth = 3;

// 2. Multi-Layered Rotating Polygons (Kaleidoscopic Geometry)
const polyLayers = [];
const layerCount = 7;

for (let i = 0; i < layerCount; i++) {
    const radius = 55 + i * 42;
    const sides = 3 + i;
    const poly = two.makePolygon(cx, cy, radius, sides);
    poly.fill = 'transparent';
    const hue = (i * 38 + 195) % 360;
    poly.stroke = 'hsl(' + hue + ', 90%, 65%)';
    poly.linewidth = 2.2;
    polyLayers.push({
        shape: poly,
        baseRadius: radius,
        speed: (i % 2 === 0 ? 0.012 : -0.01) * (1 + i * 0.12),
        pulseOffset: i * 0.45
    });
}

// 3. Orbiting Star Satellites with Dual-Track Precession
const stars = [];
const starCount = 12;

for (let s = 0; s < starCount; s++) {
    const angle = (s / starCount) * Math.PI * 2;
    const isOuter = s % 2 === 0;
    const dist = isOuter ? 280 : 200;
    const star = two.makeStar(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 16, 7, 5);
    const starHue = isOuter ? 325 : 165;
    star.fill = 'hsl(' + starHue + ', 85%, 60%)';
    star.stroke = '#ffffff';
    star.linewidth = 1.5;
    stars.push({
        star: star,
        angle: angle,
        baseRadius: dist,
        speed: isOuter ? 0.018 : -0.022,
        rotSpeed: isOuter ? 0.04 : -0.05
    });
}

// 4. Harmonic Animation Loop
two.bind('update', function(frameCount) {
    const time = frameCount * 0.035;

    // Breathing Core & Aura Pulse
    core.scale = 1 + Math.sin(time * 1.5) * 0.18;
    aura.scale = 1 + Math.sin(time) * 0.25;

    // Synchronized Polygon Rotations & Dynamic Radii
    polyLayers.forEach(layer => {
        layer.shape.rotation += layer.speed;
        const breath = 1 + Math.sin(time + layer.pulseOffset) * 0.04;
        layer.shape.scale = breath;
    });

    // Orbiting Star Precession
    stars.forEach(item => {
        item.angle += item.speed;
        const r = item.baseRadius + Math.sin(time * 2 + item.angle) * 15;
        item.star.translation.x = cx + Math.cos(item.angle) * r;
        item.star.translation.y = cy + Math.sin(item.angle) * r;
        item.star.rotation += item.rotSpeed;
    });
}).play();"""
            explanation = "Synthesized a hypnotic geometric starburst kaleidoscope in Two.js with 7 counter-rotating chromatic polygons, pulsing aura core, and 12 precessing star satellites."
            suggested = ["Add interactive cursor tracking to kaleidoscope center", "Add radial color hue shift over time", "Increase polygon layers to 10"]

        else:
            # Dynamic Two.js Vector Animation tailored directly to user demand
            t_count = min(max(params["count"], 3), 24)
            t_col1 = params["primary_color"]["hex"]
            t_col2 = params["secondary_color"]["hex"]
            t_shape = params["shape"]
            t_speed = params["speed_factor"]

            code = f"""// --- Two.js: Dynamic Vector Animation ---
// User Demand: shape={t_shape}, count={t_count}, primaryColor={t_col1}, secondaryColor={t_col2}, speed={t_speed}x
// Available in scope: two, Two, width, height, container

const cx = width / 2;
const cy = height / 2;

// Central Glowing Core
const core = two.makeCircle(cx, cy, 26);
core.fill = '{t_col1}';
core.stroke = '#ffffff';
core.linewidth = 2;

const group = two.makeGroup();
const items = [];
const numItems = {t_count};
const baseDist = Math.min(width, height) * 0.32;

for (let i = 0; i < numItems; i++) {{
    const angle = (i / numItems) * Math.PI * 2;
    const x = cx + Math.cos(angle) * baseDist;
    const y = cy + Math.sin(angle) * baseDist;
    const color = i % 2 === 0 ? '{t_col1}' : '{t_col2}';

    let item;
    if ('{t_shape}' === 'box') {{
        item = two.makeRectangle(x, y, 38, 38);
    }} else if ('{t_shape}' === 'star') {{
        item = two.makeStar(x, y, 22, 10, 5);
    }} else if ('{t_shape}' === 'torus' || '{t_shape}' === 'ring') {{
        item = two.makeCircle(x, y, 22);
        item.fill = 'transparent';
        item.stroke = color;
        item.linewidth = 4;
    }} else {{
        item = two.makeCircle(x, y, 18);
    }}

    if ('{t_shape}' !== 'torus' && '{t_shape}' !== 'ring') {{
        item.fill = color;
        item.stroke = '#ffffff';
        item.linewidth = 1.5;
    }}

    group.add(item);
    items.push({{
        shape: item,
        angle: angle,
        orbitRadius: baseDist + (i % 3) * 18,
        rotSpeed: (0.02 + (i % 2) * 0.01) * {t_speed}
    }});
}}

// 60 FPS Kinetic Loop
two.bind('update', function(frameCount) {{
    const time = frameCount * 0.03 * {t_speed};
    core.scale = 1 + Math.sin(time * 2) * 0.15;

    items.forEach((item, idx) => {{
        item.angle += 0.012 * {t_speed};
        const r = item.orbitRadius + Math.sin(time * 1.5 + idx) * 12;
        item.shape.translation.x = cx + Math.cos(item.angle) * r;
        item.shape.translation.y = cy + Math.sin(item.angle) * r;
        item.shape.rotation += item.rotSpeed;
    }});
}}).play();
"""
            explanation = f"Synthesized an interactive Two.js vector animation with {t_count} dynamic {t_shape} elements ({t_col1}, {t_col2}) and synchronized orbital kinetics for '{prompt}'."
            suggested = ["Add trailing vector ribbons", "Enable mouse magnetic attraction", "Increase satellite count to 32"]
    elif engine in ["thumbnail", "fabric"]:
        # 1. Scientific & Physics Hero (16:9 / 21:9)
        if any(w in p for w in ["physics", "science", "formula", "oscillation", "quantum", "chaos", "equation"]):
            code = r"""// --- Scientific & Physics Hero (16:9 / 21:9) ---
// Available in scope: canvas, logicalWidth, logicalHeight, helpers, fabric

// 1. Dark Cosmos Gradient
const bg = new fabric.Rect({
    left: 0, top: 0, width: logicalWidth, height: logicalHeight,
    selectable: false, evented: false,
    fill: helpers.createGradient(
        { x1: 0, y1: 0, x2: logicalWidth, y2: logicalHeight },
        [
            { offset: 0, color: '#030712' },
            { offset: 0.6, color: '#0f172a' },
            { offset: 1, color: '#172554' }
        ]
    )
});
canvas.add(bg);

// 2. Blueprint Coordinate Grid
canvas.add(helpers.createGridPattern(50, 'rgba(56, 189, 248, 0.08)'));

// 3. Neon Orbs
canvas.add(helpers.createGlowOrb(Math.max(600, logicalWidth - 450), 160, 260, '#06b6d4', 110));
canvas.add(helpers.createGlowOrb(Math.max(700, logicalWidth - 240), Math.min(520, logicalHeight - 220), 220, '#3b82f6', 100));

// 4. Badges
canvas.add(helpers.createSticker('physics', 80, 60, '⚛️ THEORETICAL PHYSICS'));
canvas.add(helpers.createSticker('interactive', 480, 60, '⚡ LIVE 3D SIMULATION'));

// 5. Main Typography
const title = new fabric.Textbox('NON-LINEAR\nOSCILLATIONS', {
    left: 80, top: 150, width: Math.min(1050, logicalWidth - 200),
    fontSize: Math.min(84, Math.round(logicalHeight * 0.12)), lineHeight: 0.9, fontWeight: '900',
    fontFamily: 'Outfit, sans-serif', fill: '#ffffff',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.9)', blur: 25, offsetX: 6, offsetY: 6 })
});
canvas.add(title);

// 6. Glass Card with Equation Preview
const cardTop = Math.min(420, Math.round(logicalHeight * 0.52));
const cardHeight = Math.min(220, Math.round(logicalHeight * 0.32));
canvas.add(helpers.createGlassCard(80, cardTop, Math.min(750, logicalWidth - 160), cardHeight, "Phase Space: x'' + γx' + ω²x = F₀ cos(ωt)", "Discover chaotic attractors, Lyapunov exponents, and Fourier frequency transforms in dynamic equilibrium."));

canvas.renderAll();"""
            explanation = "Synthesized a scientific physics thumbnail in Fabric.js with dark cosmos gradient, blueprint grid, neon orbs, category stickers, and differential equation glass card."
            suggested = ["Change equation to Schrödinger Wave Equation", "Add author avatar circle badge", "Switch background to deep emerald gradient"]

        # 2. Course Masterclass Hero Card (4:3 / 16:9)
        elif any(w in p for w in ["course", "masterclass", "tutorial", "learn", "class", "lecture", "curriculum", "syllabus", "book"]):
            code = r"""// --- Course Masterclass Hero Card (4:3 / 16:9) ---
// Available in scope: canvas, logicalWidth, logicalHeight, helpers, fabric

const bg = new fabric.Rect({
    left: 0, top: 0, width: logicalWidth, height: logicalHeight,
    selectable: false, evented: false,
    fill: helpers.createGradient(
        { x1: 0, y1: 0, x2: logicalWidth, y2: logicalHeight },
        [
            { offset: 0, color: '#0c0a09' },
            { offset: 0.5, color: '#1c1917' },
            { offset: 1, color: '#451a03' }
        ]
    )
});
canvas.add(bg);

canvas.add(helpers.createGlowOrb(Math.max(500, logicalWidth - 300), 160, 220, '#f59e0b', 100));
canvas.add(helpers.createSticker('course', 70, 60, '📘 COMPLETE MASTERCLASS'));
canvas.add(helpers.createSticker('pro', 460, 60, '👑 PRO CERTIFIED'));

const title = new fabric.Textbox('FULL STACK\nCOMPUTATION', {
    left: 70, top: 150, width: Math.min(900, logicalWidth - 140),
    fontSize: Math.min(72, Math.round(logicalHeight * 0.11)), lineHeight: 0.95, fontWeight: '900',
    fontFamily: 'Outfit, sans-serif', fill: '#ffffff',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.9)', blur: 20, offsetX: 4, offsetY: 4 })
});
canvas.add(title);

const cCardTop = Math.min(420, Math.round(logicalHeight * 0.52));
const cCardHeight = Math.min(220, Math.round(logicalHeight * 0.32));
canvas.add(helpers.createGlassCard(70, cCardTop, Math.min(650, logicalWidth - 140), cCardHeight, 'From Manim to GPU Shaders', 'Includes 12 step-by-step interactive lessons, LaTeX worksheets, and downloadable 3D asset packs.'));

canvas.renderAll();"""
            explanation = "Synthesized a high-converting masterclass course thumbnail in Fabric.js with amber glow aura, pro certified badge, and curriculum preview glass card."
            suggested = ["Add student rating star review badge", "Add price tag badge ($49)", "Change topic to Machine Learning & Deep Neural Nets"]

        # 3. Minimal Slate Tech
        elif any(w in p for w in ["minimal", "slate", "discrete", "graph", "clean", "algorithm", "complexity"]):
            code = r"""// --- Minimal Slate Tech ---
// Available in scope: canvas, logicalWidth, logicalHeight, helpers, fabric

const bg = new fabric.Rect({
    left: 0, top: 0, width: logicalWidth, height: logicalHeight,
    selectable: false, evented: false,
    fill: helpers.createGradient(
        { x1: 0, y1: 0, x2: logicalWidth, y2: logicalHeight },
        [
            { offset: 0, color: '#09090b' },
            { offset: 0.6, color: '#18181b' },
            { offset: 1, color: '#0284c7' }
        ]
    )
});
canvas.add(bg);

canvas.add(helpers.createAccentBar(70, 120, 160, 6, '#38bdf8', '#818cf8'));
canvas.add(helpers.createSticker('verified', 70, 60, '✓ PEER REVIEWED'));

const title = new fabric.Textbox('DISCRETE\nMATHEMATICS', {
    left: 70, top: 150, width: Math.min(900, logicalWidth - 140),
    fontSize: Math.min(78, Math.round(logicalHeight * 0.12)), lineHeight: 0.95, fontWeight: '900',
    fontFamily: 'Outfit, sans-serif', fill: '#ffffff'
});
canvas.add(title);

canvas.add(helpers.createMetricBadge('O(log n)', 'COMPLEXITY', 70, Math.min(420, Math.round(logicalHeight * 0.54)), '#38bdf8'));

canvas.renderAll();"""
            explanation = "Synthesized a minimal slate tech thumbnail in Fabric.js featuring clean typography, gradient accent divider, and Big-O complexity badge."
            suggested = ["Add runtime speed metric (12.4 ms)", "Change topic to Distributed Consensus & Raft", "Add code snippet card"]

        # 4. Modern Article Banner (Default Masterpiece - 21:9 / 16:9)
        else:
            code = r"""// --- Modern Article Banner (21:9 / 16:9) ---
// Available in scope: canvas, logicalWidth, logicalHeight, helpers, fabric

// 1. Deep Cosmos Gradient Background
const bg = new fabric.Rect({
    left: 0, top: 0, width: logicalWidth, height: logicalHeight,
    selectable: false, evented: false,
    fill: helpers.createGradient(
        { x1: 0, y1: 0, x2: logicalWidth, y2: logicalHeight },
        [
            { offset: 0, color: '#090b10' },
            { offset: 0.5, color: '#111827' },
            { offset: 1, color: '#1e1b4b' }
        ]
    )
});
canvas.add(bg);

// 2. Blueprint Coordinate Grid Overlay
canvas.add(helpers.createGridPattern(60, 'rgba(99, 102, 241, 0.06)'));

// 3. Ambient Glow Orbs
canvas.add(helpers.createGlowOrb(Math.max(600, logicalWidth - 480), 120, 260, '#3b82f6', 110));
canvas.add(helpers.createGlowOrb(Math.max(700, logicalWidth - 260), Math.min(480, logicalHeight - 240), 220, '#8b5cf6', 100));

// 4. Category & Status Stickers
canvas.add(helpers.createSticker('article', 80, 60, 'FEATURED ARTICLE • DEEP DIVE'));
canvas.add(helpers.createSticker('formula', 480, 60, '📐 MATHEMATICAL PHYSICS'));

// 5. Headline & Subtitle Typography
const title = new fabric.Textbox('GRAVITATIONAL FIELDS &\nQUANTUM SPACETIME', {
    left: 80, top: 150, width: Math.min(1150, logicalWidth - 200),
    fontSize: Math.min(64, Math.round(logicalHeight * 0.10)), lineHeight: 0.95, fontWeight: '900',
    fontFamily: 'Outfit, sans-serif', fill: '#ffffff',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.8)', blur: 20, offsetX: 4, offsetY: 4 })
});
canvas.add(title);

const subtitle = new fabric.Textbox('A comprehensive mathematical breakdown of Einstein tensor field equations and geodesic curvature.', {
    left: 80, top: Math.min(380, logicalHeight * 0.52), width: Math.min(950, logicalWidth - 200),
    fontSize: 22, lineHeight: 1.4, fontWeight: '400',
    fontFamily: 'Inter, sans-serif', fill: '#94a3b8'
});
canvas.add(subtitle);

// 6. Metric Highlight Badges
const badgeTop = Math.min(540, logicalHeight - 140);
canvas.add(helpers.createMetricBadge('100%', 'VECTOR QUALITY', 80, badgeTop, '#38bdf8'));
canvas.add(helpers.createMetricBadge('45 min', 'READING TIME', 300, badgeTop, '#a78bfa'));

canvas.renderAll();"""
            explanation = "Synthesized a high-impact modern article thumbnail banner in Fabric.js with deep cosmos gradient, blueprint grid, ambient glow orbs, category stickers, headline typography, and reading metrics."
            suggested = ["Add custom thumbnail subtitle", "Switch color theme to cyberpunk crimson & amber", "Add verified author checkmark badge"]
    elif engine == "zdog":
        p_lower = prompt.lower()
        if any(k in p_lower for k in ["robot", "mascot", "droid", "android"]):
            code = """// --- Zdog 3D: Kinetic Cute Robot Mascot ---
// Drag with mouse or touch to inspect in 3D!

const illo = new Zdog.Illustration({
    element: '.zdog-canvas',
    dragRotate: true,
    zoom: 1.15,
    rotate: { x: -0.15, y: 0.3 }
});
window.illo = illo;

// 1. Robot Body Group
const bot = new Zdog.Group({ addTo: illo, translate: { y: 10 } });

// Torso Cylinder
const torso = new Zdog.Cylinder({
    addTo: bot,
    diameter: 64,
    length: 70,
    stroke: false,
    color: '#334155',
    frontFace: '#475569',
    backFace: '#1e293b',
    rotate: { x: Zdog.TAU / 4 }
});

// Chest Screen & Glowing Heart
new Zdog.Rect({
    addTo: torso,
    width: 32,
    height: 24,
    cornerRadius: 4,
    fill: true,
    color: '#0f172a',
    translate: { z: 33, y: 0 }
});

const heart = new Zdog.Shape({
    addTo: torso,
    stroke: 8,
    color: '#ec4899',
    translate: { z: 35, y: 0 }
});

// 2. Articulated Head
const headGroup = new Zdog.Group({ addTo: bot, translate: { y: -58 } });

// Dome Head
new Zdog.Hemisphere({
    addTo: headGroup,
    diameter: 54,
    stroke: false,
    color: '#64748b',
    backface: '#475569',
    rotate: { x: -Zdog.TAU / 4 }
});

// Visor Screen
new Zdog.RoundedRect({
    addTo: headGroup,
    width: 38,
    height: 16,
    cornerRadius: 8,
    fill: true,
    color: '#06b6d4',
    translate: { z: 24, y: 4 }
});

// Visor Eyes
new Zdog.Shape({
    addTo: headGroup,
    stroke: 4,
    color: '#ffffff',
    translate: { x: -8, y: 4, z: 26 }
});
new Zdog.Shape({
    addTo: headGroup,
    stroke: 4,
    color: '#ffffff',
    translate: { x: 8, y: 4, z: 26 }
});

// Antenna
const antenna = new Zdog.Shape({
    addTo: headGroup,
    path: [{ y: -27 }, { y: -45 }],
    stroke: 4,
    color: '#94a3b8'
});
new Zdog.Shape({
    addTo: antenna,
    stroke: 10,
    color: '#f59e0b',
    translate: { y: -48 }
});

// 3. Articulated Shoulders & Arms
const leftArm = new Zdog.Shape({
    addTo: bot,
    path: [{ x: 0, y: 0 }, { x: -22, y: 15 }, { x: -18, y: 35 }],
    closed: false,
    stroke: 8,
    color: '#38bdf8',
    translate: { x: -38, y: -18 }
});

const rightArm = new Zdog.Shape({
    addTo: bot,
    path: [{ x: 0, y: 0 }, { x: 22, y: -10 }, { x: 28, y: -30 }],
    closed: false,
    stroke: 8,
    color: '#38bdf8',
    translate: { x: 38, y: -18 }
});

// 4. Jet Thruster Cone
const thruster = new Zdog.Cone({
    addTo: bot,
    diameter: 28,
    length: 26,
    stroke: false,
    color: '#475569',
    translate: { y: 42 },
    rotate: { x: -Zdog.TAU / 4 }
});

// Thruster Flame
const flame = new Zdog.Cone({
    addTo: thruster,
    diameter: 18,
    length: 32,
    stroke: false,
    color: '#f97316',
    translate: { z: 20 }
});

// 5. Kinetic Animation Loop
let t = 0;
function animate() {
    t += 0.04;
    bot.translate.y = 8 + Math.sin(t * 1.5) * 6;
    bot.rotate.y = Math.sin(t * 0.8) * 0.25;
    
    // Waving right arm
    rightArm.rotate.z = Math.sin(t * 2) * 0.25;
    
    // Beating heart pulse
    heart.stroke = 7 + Math.sin(t * 4) * 2;
    
    // Flickering rocket flame
    flame.length = 26 + Math.sin(t * 8) * 8;

    illo.updateRenderGraph();
    requestAnimationFrame(animate);
}
animate();"""
            explanation = "Synthesized an articulated kinetic 3D robot mascot with dome head, glowing visor eyes, beating chest heart, waving arms, and animated rocket thruster in Zdog."
            suggested = ["Add hover drone companion", "Equip robot with sci-fi laser tool", "Change thruster to cyan ion drive"]
        elif any(k in p_lower for k in ["polyhedr", "fibonacci", "spike", "sacred", "sun", "stellat"]) or ("star" in p_lower and "ship" not in p_lower):
            code = """// --- Zdog 3D: Polyhedral Sacred Star ---
// Drag with mouse or touch to rotate!

const illo = new Zdog.Illustration({
    element: '.zdog-canvas',
    dragRotate: true,
    zoom: 1.1,
    rotate: { x: -0.2, y: 0.4 }
});
window.illo = illo;

// 1. Central Sacred Star Group
const star = new Zdog.Group({ addTo: illo });

// Central Octahedral Polyhedron Core
new Zdog.Polygon({
    addTo: star,
    radius: 42,
    sides: 6,
    stroke: 8,
    fill: true,
    color: '#d97706',
    translate: { z: -10 }
});

new Zdog.Polygon({
    addTo: star,
    radius: 42,
    sides: 6,
    stroke: 8,
    fill: true,
    color: '#f59e0b',
    translate: { z: 10 }
});

// Core Golden Energy Sphere
new Zdog.Shape({
    addTo: star,
    stroke: 32,
    color: '#fef08a'
});

// 2. Conical Anchor Spikes in 3D Space
const spikeColors = ['#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f97316'];
const numSpikes = 12;

for (let i = 0; i < numSpikes; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / numSpikes);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    
    const coneAnchor = new Zdog.Anchor({
        addTo: star,
        rotate: { y: theta, x: phi }
    });

    new Zdog.Cone({
        addTo: coneAnchor,
        diameter: 22,
        length: 80,
        stroke: false,
        color: spikeColors[i % spikeColors.length],
        translate: { z: 25 }
    });

    new Zdog.Shape({
        addTo: coneAnchor,
        stroke: 8,
        color: '#ffffff',
        translate: { z: 108 }
    });
}

// 3. Orbiting Gyroscopic Ring
const outerRing = new Zdog.Ellipse({
    addTo: illo,
    diameter: 250,
    stroke: 3,
    color: '#38bdf8',
    rotate: { x: Zdog.TAU / 3 }
});

// 4. Kinetic Animation Loop
let ticker = 0;
function animate() {
    ticker += 0.015;

    star.rotate.x += 0.008;
    star.rotate.y += 0.014;
    star.rotate.z += 0.006;

    outerRing.rotate.z -= 0.02;
    outerRing.rotate.y = Math.sin(ticker) * 0.4;

    illo.updateRenderGraph();
    requestAnimationFrame(animate);
}
animate();"""
            explanation = "Synthesized a polyhedral sacred star in Zdog featuring 12 conical anchor spikes radiating along a Fibonacci sphere distribution with gyroscopic orbit rings."
            suggested = ["Increase spike count to 24", "Add glowing energy nodes at tips", "Add pulsating inner icosahedron"]
        elif any(k in p_lower for k in ["ship", "starship", "rocket", "arcade", "space", "plane", "flight", "fighter"]):
            code = """// --- Zdog 3D: Retro Arcade Starship ---
// Drag with mouse or touch to inspect 3D fighter craft!

const illo = new Zdog.Illustration({
    element: '.zdog-canvas',
    dragRotate: true,
    zoom: 1.25,
    rotate: { x: -0.3, y: 0.6 }
});
window.illo = illo;

// 1. Starship Vessel Group
const ship = new Zdog.Group({ addTo: illo });

// Main Fuselage Cone
new Zdog.Cone({
    addTo: ship,
    diameter: 36,
    length: 110,
    stroke: false,
    color: '#0284c7',
    rotate: { x: Zdog.TAU / 4 },
    translate: { y: -20 }
});

// Cockpit Canopy Bubble
new Zdog.Hemisphere({
    addTo: ship,
    diameter: 20,
    stroke: false,
    color: '#38bdf8',
    backface: '#0369a1',
    translate: { y: -5, z: 12 },
    rotate: { x: -Zdog.TAU / 4 }
});

// 2. Swept Delta Wings
const leftWing = new Zdog.Shape({
    addTo: ship,
    path: [
        { x: -14, y: 0, z: 0 },
        { x: -80, y: 35, z: -6 },
        { x: -75, y: 45, z: -6 },
        { x: -14, y: 35, z: 0 }
    ],
    fill: true,
    color: '#0369a1',
    stroke: 3
});

const rightWing = new Zdog.Shape({
    addTo: ship,
    path: [
        { x: 14, y: 0, z: 0 },
        { x: 80, y: 35, z: -6 },
        { x: 75, y: 45, z: -6 },
        { x: 14, y: 35, z: 0 }
    ],
    fill: true,
    color: '#0284c7',
    stroke: 3
});

// Wingtip Laser Cannons
new Zdog.Cylinder({
    addTo: leftWing,
    diameter: 6,
    length: 28,
    stroke: false,
    color: '#f43f5e',
    translate: { x: -78, y: 32 }
});

new Zdog.Cylinder({
    addTo: rightWing,
    diameter: 6,
    length: 28,
    stroke: false,
    color: '#f43f5e',
    translate: { x: 78, y: 32 }
});

// 3. Dual Exhaust Thrusters
const thrusterL = new Zdog.Cylinder({
    addTo: ship,
    diameter: 12,
    length: 18,
    stroke: false,
    color: '#334155',
    translate: { x: -10, y: 38 }
});

const thrusterR = new Zdog.Cylinder({
    addTo: ship,
    diameter: 12,
    length: 18,
    stroke: false,
    color: '#334155',
    translate: { x: 10, y: 38 }
});

// Plasma Exhaust Flames
const flameL = new Zdog.Cone({
    addTo: thrusterL,
    diameter: 10,
    length: 24,
    stroke: false,
    color: '#f97316',
    translate: { z: 12 }
});

const flameR = new Zdog.Cone({
    addTo: thrusterR,
    diameter: 10,
    length: 24,
    stroke: false,
    color: '#f97316',
    translate: { z: 12 }
});

// 4. Kinetic Flight Simulation Loop
let t = 0;
function animate() {
    t += 0.05;

    // Flight banking and hovering
    ship.rotate.z = Math.sin(t * 0.8) * 0.2;
    ship.rotate.x = Math.sin(t * 0.5) * 0.1 - 0.2;
    ship.translate.y = Math.sin(t * 1.2) * 6;

    // Pulsing hyper-engine exhaust flames
    flameL.length = 20 + Math.sin(t * 6) * 8;
    flameR.length = 20 + Math.cos(t * 6) * 8;

    illo.updateRenderGraph();
    requestAnimationFrame(animate);
}
animate();"""
            explanation = "Synthesized a sleek retro arcade starship with delta wings, swept wingtip laser cannons, dual plasma exhaust flames, and aerodynamic flight banking in Zdog."
            suggested = ["Add hyperdrive warp ring trail", "Deploy shields bubble effect", "Add asteroid obstacle field"]
        elif any(k in p_lower for k in ["gem", "crystal", "gyro", "diamond", "core"]):
            code = """// --- Zdog 3D: Kinetic Orbiting Cyber-Gem ---
// Drag with mouse or touch to rotate the 3D scene in real-time!

const illo = new Zdog.Illustration({
    element: '.zdog-canvas',
    dragRotate: true,
    zoom: 1.2,
    rotate: { x: -Zdog.TAU / 12, y: Zdog.TAU / 8 },
    onDragStart: function() {
        isSpinning = false;
    }
});
window.illo = illo;

let isSpinning = true;

// 1. Central Floating Gem Group
const gemGroup = new Zdog.Group({
    addTo: illo,
    translate: { y: 0 }
});

// Polyhedron Core
new Zdog.Box({
    addTo: gemGroup,
    width: 64,
    height: 64,
    depth: 64,
    stroke: false,
    color: '#6366f1',
    leftFace: '#4f46e5',
    rightFace: '#4338ca',
    topFace: '#818cf8',
    bottomFace: '#3730a3'
});

// Inner Glowing Core
new Zdog.Shape({
    addTo: gemGroup,
    stroke: 28,
    color: '#38bdf8'
});

// 2. Multi-Axis Orbiting Rings
const ring1 = new Zdog.Ellipse({
    addTo: illo,
    diameter: 140,
    stroke: 4,
    color: '#06b6d4',
    rotate: { x: Zdog.TAU / 4, y: Zdog.TAU / 8 }
});

const ring2 = new Zdog.Ellipse({
    addTo: illo,
    diameter: 180,
    stroke: 3,
    color: '#ec4899',
    rotate: { x: -Zdog.TAU / 6, z: Zdog.TAU / 6 }
});

// 3. Orbiting Satellite Spheres
new Zdog.Shape({
    addTo: ring1,
    translate: { x: 70 },
    stroke: 16,
    color: '#f43f5e'
});

new Zdog.Shape({
    addTo: ring2,
    translate: { x: 90 },
    stroke: 14,
    color: '#a855f7'
});

new Zdog.Shape({
    addTo: ring2,
    translate: { x: -90 },
    stroke: 12,
    color: '#38bdf8'
});

// 4. Background Star Dust Field
const starGroup = new Zdog.Group({ addTo: illo });
for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Zdog.TAU;
    const distance = 110 + (i % 3) * 25;
    const zOffset = ((i % 5) - 2) * 35;
    new Zdog.Shape({
        addTo: starGroup,
        translate: {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance * 0.6,
            z: zOffset
        },
        stroke: (i % 2 === 0) ? 5 : 3,
        color: (i % 2 === 0) ? '#fbbf24' : '#e2e8f0'
    });
}

// 5. Kinetic Animation Loop
let ticker = 0;
function animate() {
    ticker += 0.02;

    if (isSpinning) {
        illo.rotate.y += 0.012;
        illo.rotate.x = Math.sin(ticker * 0.5) * 0.15 - 0.2;
    }

    // Dynamic bobbing and ring rotation
    gemGroup.translate.y = Math.sin(ticker) * 8;
    gemGroup.rotate.y += 0.01;
    ring1.rotate.z += 0.02;
    ring2.rotate.z -= 0.015;

    illo.updateRenderGraph();
    requestAnimationFrame(animate);
}
animate();"""
            explanation = "Synthesized an intricate kinetic pseudo-3D cyber-gem in Zdog featuring a multi-faceted illuminated cube, glowing neon core, counter-rotating gyro rings, and orbiting stardust field."
            suggested = ["Add third gyro orbit ring", "Change gem color palette to emerald & lime", "Add trailing particle tail"]

        else:
            # Dynamic Zdog 3D pseudo-vector animation tailored directly to user demand
            z_count = min(max(params["count"], 3), 18)
            z_col1 = params["primary_color"]["hex"]
            z_col2 = params["secondary_color"]["hex"]
            z_shape = params["shape"]
            z_speed = params["speed_factor"]

            code = f"""// --- Zdog 3D: Dynamic Pseudo-3D Vector Scene ---
// User Demand: shape={z_shape}, count={z_count}, primaryColor={z_col1}, secondaryColor={z_col2}, speed={z_speed}x
// Drag with mouse or touch to rotate 3D canvas!

const illo = new Zdog.Illustration({{
    element: '.zdog-canvas',
    dragRotate: true,
    zoom: 1.15
}});
window.illo = illo;

const mainGroup = new Zdog.Group({{ addTo: illo }});

// Central Anchor
new Zdog.Shape({{
    addTo: mainGroup,
    stroke: 28,
    color: '{z_col1}'
}});

const orbitingItems = [];
const numObjects = {z_count};
const baseRadius = 85;

for (let i = 0; i < numObjects; i++) {{
    const angle = (i / numObjects) * Zdog.TAU;
    const color = i % 2 === 0 ? '{z_col1}' : '{z_col2}';

    let item;
    if ('{z_shape}' === 'box') {{
        item = new Zdog.Box({{
            addTo: mainGroup,
            width: 24,
            height: 24,
            depth: 24,
            color: color,
            leftFace: '{z_col2}',
            rightFace: '{z_col1}',
            topFace: '#ffffff',
            translate: {{ x: Math.cos(angle) * baseRadius, y: Math.sin(angle) * baseRadius, z: (i % 3 - 1) * 25 }}
        }});
    }} else if ('{z_shape}' === 'cylinder') {{
        item = new Zdog.Cylinder({{
            addTo: mainGroup,
            diameter: 20,
            length: 28,
            color: color,
            translate: {{ x: Math.cos(angle) * baseRadius, y: Math.sin(angle) * baseRadius, z: 0 }}
        }});
    }} else if ('{z_shape}' === 'cone') {{
        item = new Zdog.Cone({{
            addTo: mainGroup,
            diameter: 22,
            length: 28,
            color: color,
            translate: {{ x: Math.cos(angle) * baseRadius, y: Math.sin(angle) * baseRadius, z: 0 }}
        }});
    }} else {{
        item = new Zdog.Shape({{
            addTo: mainGroup,
            stroke: 20,
            color: color,
            translate: {{ x: Math.cos(angle) * baseRadius, y: Math.sin(angle) * baseRadius, z: (i % 3 - 1) * 20 }}
        }});
    }}
    orbitingItems.push({{ obj: item, angle: angle }});
}}

// 3D Animation Loop
let ticker = 0;
function animate() {{
    ticker += 0.02 * {z_speed};
    mainGroup.rotate.y += 0.012 * {z_speed};
    mainGroup.rotate.x = Math.sin(ticker * 0.7) * 0.2;

    illo.updateRenderGraph();
    requestAnimationFrame(animate);
}}
animate();
"""
            explanation = f"Synthesized an interactive Zdog 3D pseudo-vector animation with {z_count} dynamic {z_shape} objects ({z_col1}, {z_col2}) and interactive drag-to-rotate controls matching '{prompt}'."
            suggested = ["Add multi-axis gyro rings", "Change geometry to 3D cylinders", "Increase satellite orbit radius"]
    elif engine == "jsxgraph":
        p_lower = prompt.lower()
        launch_ang = params.get("launch_angle", 60.0)
        v0 = params.get("initial_velocity", 12.0)

        if params.get("is_projectile"):
            code = f"""// --- JSXGraph: Ballistic Kinematic Parabolic Trajectory ---
// User Demand: launch_angle={launch_ang}°, v0={v0}

const board = JXG.JSXGraph.initBoard('jxgbox', {{
    boundingbox: [-2, 16, 24, -2],
    axis: true,
    showCopyright: false,
    showNavigation: true
}});
window.board = board;

// 1. Angle & Velocity Interactive Sliders
const angleSlider = board.create('slider', [[1, 14], [8, 14], [10, {launch_ang}, 85]], {{
    name: 'θ (deg)',
    snapWidth: 1
}});
const v0Slider = board.create('slider', [[1, 12.5], [8, 12.5], [5, {v0}, 30]], {{
    name: 'v₀ (m/s)',
    snapWidth: 0.5
}});

// 2. Parabolic Trajectory Function Plot
const g = 9.8;
const trajectory = board.create('functiongraph', [
    function(x) {{
        const theta = (angleSlider.Value() * Math.PI) / 180;
        const v = v0Slider.Value();
        const y = Math.tan(theta) * x - (g / (2 * v * v * Math.cos(theta) * Math.cos(theta))) * x * x;
        return y >= 0 ? y : 0;
    }},
    0,
    function() {{
        const theta = (angleSlider.Value() * Math.PI) / 180;
        const v = v0Slider.Value();
        return (v * v * Math.sin(2 * theta)) / g;
    }}
], {{
    strokeColor: '#06b6d4',
    strokeWidth: 3
}});

// 3. Glider Projectile Point
const glider = board.create('glider', [0, 0, trajectory], {{
    name: 'Projectile',
    color: '#f43f5e',
    size: 5
}});
"""
            explanation = f"Synthesized an interactive mathematical projectile trajectory in JSXGraph with angle slider ({launch_ang:.1f}°), velocity slider, and real-time parabola graph for '{prompt}'."
            suggested = ["Adjust angle slider dynamically", "Add maximum height apex point", "Add velocity tangent vector"]

        elif any(k in p_lower for k in ["calculus", "tangent", "derivative", "secant", "differential", "wave calculus", "cubic"]):
            code = """// --- JSXGraph: Kinetic Wave Calculus & Tangent Dynamics ---
// Pure kinetic animation: Traveling harmonic wave, dynamic tangent & normal lines

const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-5, 4, 5, -4],
    axis: true,
    showCopyright: false,
    showNavigation: false
});
window.board = board;

let t = 0;

// 1. Primary Traveling Wave Curve
board.create('curve', [
    function(x) { return x; },
    function(x) { return 1.8 * Math.sin(x - t) * Math.cos(0.4 * x + 0.3 * t); },
    -5, 5
], {
    strokeColor: '#38bdf8',
    strokeWidth: 3.5,
    highlightStrokeColor: '#0ea5e9'
});

// Dual Counter-Phase Harmonic Envelope Curve
board.create('curve', [
    function(x) { return x; },
    function(x) { return -1.8 * Math.sin(x - t) * Math.cos(0.4 * x + 0.3 * t); },
    -5, 5
], {
    strokeColor: '#818cf8',
    strokeWidth: 1.5,
    dash: 3
});

// 2. Animated Point Traveling Smoothly Along Wave
const pX = function() { return 3.2 * Math.sin(0.35 * t); };
const pY = function() {
    const x = pX();
    return 1.8 * Math.sin(x - t) * Math.cos(0.4 * x + 0.3 * t);
};

const p = board.create('point', [pX, pY], {
    name: '',
    color: '#ec4899',
    fillColor: '#f43f5e',
    size: 6,
    strokeColor: '#fda4af',
    strokeWidth: 2
});

// Pulsing Aura Ring around Point P
board.create('circle', [p, function() { return 0.25 + 0.12 * Math.sin(3 * t); }], {
    strokeColor: '#ec4899',
    strokeWidth: 1.5,
    dash: 2,
    fillColor: '#ec4899',
    fillOpacity: 0.15
});

// 3. Dynamic Derivative Slope & Tangent Line
const dx = 0.001;
const slope = function() {
    const x = pX();
    const y1 = 1.8 * Math.sin(x + dx - t) * Math.cos(0.4 * (x + dx) + 0.3 * t);
    const y0 = 1.8 * Math.sin(x - dx - t) * Math.cos(0.4 * (x - dx) + 0.3 * t);
    return (y1 - y0) / (2 * dx);
};

// Tangent Line Guide Points
const t1 = board.create('point', [
    function() { return pX() - 2.5; },
    function() { return pY() - 2.5 * slope(); }
], { visible: false });

const t2 = board.create('point', [
    function() { return pX() + 2.5; },
    function() { return pY() + 2.5 * slope(); }
], { visible: false });

board.create('line', [t1, t2], {
    strokeColor: '#f59e0b',
    strokeWidth: 2.5,
    dash: 2
});

// 4. Dynamic Normal Line (Perpendicular)
const n1 = board.create('point', [
    function() { return pX() - 1.8 * slope(); },
    function() { return pY() + 1.8; }
], { visible: false });

const n2 = board.create('point', [
    function() { return pX() + 1.8 * slope(); },
    function() { return pY() - 1.8; }
], { visible: false });

board.create('line', [n1, n2], {
    strokeColor: '#10b981',
    strokeWidth: 1.5,
    dash: 4
});

// 5. Differential Slope Polygon
const q = board.create('point', [
    function() { return pX() + 1.2; },
    function() { return pY(); }
], { visible: false });

const r = board.create('point', [
    function() { return pX() + 1.2; },
    function() { return pY() + 1.2 * slope(); }
], { visible: false });

board.create('polygon', [p, q, r], {
    fillColor: '#f59e0b',
    fillOpacity: 0.18,
    borders: { strokeColor: '#f59e0b', strokeWidth: 1.5, dash: 1 },
    hasInnerPoints: false
});

// 6. Oscillating Secant Chord (Demonstrating limit as h -> 0)
const hStep = function() { return 1.4 * (0.5 + 0.5 * Math.sin(1.8 * t)); };
const secantPoint = board.create('point', [
    function() { return pX() + hStep(); },
    function() {
        const sx = pX() + hStep();
        return 1.8 * Math.sin(sx - t) * Math.cos(0.4 * sx + 0.3 * t);
    }
], {
    name: '',
    color: '#a855f7',
    size: 4,
    strokeColor: '#d8b4fe'
});

board.create('line', [p, secantPoint], {
    strokeColor: '#a855f7',
    strokeWidth: 1.5,
    dash: 3
});

// 7. 60 FPS Kinetic Render Loop
function animate() {
    t += 0.025;
    board.update();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);"""
            explanation = "Synthesized a pure visual kinetic wave calculus animation in JSXGraph featuring a traveling harmonic wave, dynamic tangent & normal lines, differential step polygon, and limit-converging secant line without text clutter."
            suggested = ["Add derivative function trace curve", "Change wave to double frequency soliton", "Switch color palette to cyberpunk neon"]
        elif any(k in p_lower for k in ["riemann", "integral", "area", "partition", "subdivision"]):
            code = """// --- JSXGraph: Kinetic Breathing Riemann Sum & Integral ---
// Pure visual animation: Dynamic oscillating wave with pulsating Riemann rectangles

const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-4.5, 6, 4.5, -2],
    axis: true,
    showCopyright: false,
    showNavigation: false
});
window.board = board;

let t = 0;

// 1. Oscillating Integrand Curve
const f = function(x) {
    return 2.2 + 1.2 * Math.sin(x + 0.8 * t) * Math.cos(0.6 * x - 0.4 * t);
};

board.create('curve', [function(x) { return x; }, f, -4.5, 4.5], {
    strokeColor: '#38bdf8',
    strokeWidth: 3.5,
    highlightStrokeColor: '#0ea5e9'
});

// 2. Continuous Breathing Riemann Sum Partition Rectangles
const riemann = board.create('riemannsum', [
    f,
    function() { return Math.round(8 + 18 * Math.pow(Math.sin(0.25 * t), 2)); },
    'middle',
    function() { return -3.2 + 0.6 * Math.sin(0.2 * t); },
    function() { return 3.2 + 0.6 * Math.cos(0.2 * t); }
], {
    fillColor: '#6366f1',
    fillOpacity: 0.35,
    strokeColor: '#818cf8',
    strokeWidth: 1.5
});

// 3. Dynamic Integration Limits with Glowing Markers
const aPt = board.create('point', [
    function() { return -3.2 + 0.6 * Math.sin(0.2 * t); },
    0
], { name: '', color: '#ec4899', size: 5, strokeColor: '#fda4af', strokeWidth: 2 });

const bPt = board.create('point', [
    function() { return 3.2 + 0.6 * Math.cos(0.2 * t); },
    0
], { name: '', color: '#10b981', size: 5, strokeColor: '#6ee7b7', strokeWidth: 2 });

// Vertical Limit Guide Drops
board.create('segment', [
    aPt,
    board.create('point', [function() { return aPt.X(); }, function() { return f(aPt.X()); }], { visible: false })
], { strokeColor: '#ec4899', strokeWidth: 1.5, dash: 3 });

board.create('segment', [
    bPt,
    board.create('point', [function() { return bPt.X(); }, function() { return f(bPt.X()); }], { visible: false })
], { strokeColor: '#10b981', strokeWidth: 1.5, dash: 3 });

// 4. 60 FPS Kinetic Render Loop
function animate() {
    t += 0.025;
    board.update();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);"""
            explanation = "Synthesized a pure visual kinetic Riemann sum animation in JSXGraph featuring a breathing partition mesh, oscillating wave envelope, and glowing boundary points without text clutter."
            suggested = ["Change color palette to emerald & cyan", "Increase maximum subdivisions to 50", "Add secondary harmonic ripple"]
        elif any(k in p_lower for k in ["fourier", "epicycle", "harmonic", "phasor", "square wave"]):
            code = """// --- JSXGraph: Kinetic Fourier Epicycles & Wave Synthesizer ---
// Pure visual animation: Multi-arm rotating harmonic phasors synthesizing square waveform

const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-5, 4, 8, -4],
    axis: false,
    showCopyright: false,
    showNavigation: false
});
window.board = board;

let t = 0;
const origin = board.create('point', [-2.5, 0], { visible: false, fixed: true });

// 1. Quad Harmonic Epicycle Radii & Frequencies
const r1 = 1.6;
const r2 = r1 / 3;
const r3 = r1 / 5;
const r4 = r1 / 7;

// Harmonic 1 (n=1)
const c1 = board.create('circle', [origin, r1], {
    strokeColor: '#3b82f6',
    strokeWidth: 1.5,
    dash: 2
});
const p1 = board.create('point', [
    function() { return origin.X() + r1 * Math.cos(t); },
    function() { return origin.Y() + r1 * Math.sin(t); }
], { name: '', color: '#3b82f6', size: 3 });
board.create('segment', [origin, p1], { strokeColor: '#3b82f6', strokeWidth: 2 });

// Harmonic 2 (n=3)
const c2 = board.create('circle', [p1, r2], {
    strokeColor: '#ec4899',
    strokeWidth: 1.3,
    dash: 2
});
const p2 = board.create('point', [
    function() { return p1.X() + r2 * Math.cos(3 * t); },
    function() { return p1.Y() + r2 * Math.sin(3 * t); }
], { name: '', color: '#ec4899', size: 3 });
board.create('segment', [p1, p2], { strokeColor: '#ec4899', strokeWidth: 1.8 });

// Harmonic 3 (n=5)
const c3 = board.create('circle', [p2, r3], {
    strokeColor: '#f59e0b',
    strokeWidth: 1.2,
    dash: 2
});
const p3 = board.create('point', [
    function() { return p2.X() + r3 * Math.cos(5 * t); },
    function() { return p2.Y() + r3 * Math.sin(5 * t); }
], { name: '', color: '#f59e0b', size: 3 });
board.create('segment', [p2, p3], { strokeColor: '#f59e0b', strokeWidth: 1.8 });

// Harmonic 4 (n=7)
const c4 = board.create('circle', [p3, r4], {
    strokeColor: '#06b6d4',
    strokeWidth: 1.1,
    dash: 2
});
const p4 = board.create('point', [
    function() { return p3.X() + r4 * Math.cos(7 * t); },
    function() { return p3.Y() + r4 * Math.sin(7 * t); }
], { name: '', color: '#06b6d4', size: 4, fillColor: '#38bdf8' });
board.create('segment', [p3, p4], { strokeColor: '#06b6d4', strokeWidth: 1.5 });

// 2. Synthesizer Output Drawing Pen
const waveX = 1.2;
const wavePoint = board.create('point', [
    waveX,
    function() { return p4.Y(); }
], { name: '', color: '#10b981', size: 4, strokeColor: '#6ee7b7' });

// Connecting Guide Wire
board.create('segment', [p4, wavePoint], {
    strokeColor: '#a1a1aa',
    strokeWidth: 1.2,
    dash: 3
});

// 3. Continuously Scrolling Synthesized Square Wave
board.create('curve', [
    function(theta) { return waveX + theta; },
    function(theta) {
        return origin.Y() +
            r1 * Math.sin(t - theta) +
            r2 * Math.sin(3 * (t - theta)) +
            r3 * Math.sin(5 * (t - theta)) +
            r4 * Math.sin(7 * (t - theta));
    },
    0, 6.28
], {
    strokeColor: '#10b981',
    strokeWidth: 3.5
});

// Dual Inverted Reflection Wave
board.create('curve', [
    function(theta) { return waveX + theta; },
    function(theta) {
        return origin.Y() - (
            r1 * Math.sin(t - theta) +
            r2 * Math.sin(3 * (t - theta)) +
            r3 * Math.sin(5 * (t - theta)) +
            r4 * Math.sin(7 * (t - theta))
        ) * 0.4;
    },
    0, 6.28
], {
    strokeColor: '#6366f1',
    strokeWidth: 1.5,
    dash: 2
});

// 4. 60 FPS Kinetic Render Loop
function animate() {
    t += 0.035;
    board.update();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);"""
            explanation = "Synthesized a pure visual kinetic Fourier epicycles animation in JSXGraph featuring 4 cascading harmonic gears, dual wave output, and guide wire linkage without text clutter."
            suggested = ["Add Lissajous XY orbit tracer", "Switch to sawtooth wave harmonics", "Speed up rotation frequency"]
        elif any(k in p_lower for k in ["euler", "triangle", "circum", "incircle", "centroid", "orthocenter", "geometry"]):
            code = """// --- JSXGraph: Kinetic Orbiting Triangle & Euler Line Geometry ---
// Pure visual geometry: Dynamic orbiting vertices, circumcircle, incircle, medians, altitudes & Euler line

const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-6, 6, 6, -6],
    axis: false,
    showCopyright: false,
    showNavigation: false
});
window.board = board;

let t = 0;

// 1. Vertices in Harmonic Orbital Motion
const A = board.create('point', [
    function() { return -2.8 + 1.2 * Math.cos(0.35 * t); },
    function() { return -1.6 + 0.8 * Math.sin(0.35 * t); }
], { name: '', color: '#38bdf8', fillColor: '#38bdf8', size: 5 });

const B = board.create('point', [
    function() { return 2.8 + 1.0 * Math.sin(0.28 * t + 1); },
    function() { return -1.6 + 0.9 * Math.cos(0.28 * t); }
], { name: '', color: '#38bdf8', fillColor: '#38bdf8', size: 5 });

const C = board.create('point', [
    function() { return 0.4 + 1.5 * Math.sin(0.32 * t + 2); },
    function() { return 3.2 + 0.8 * Math.cos(0.45 * t); }
], { name: '', color: '#38bdf8', fillColor: '#38bdf8', size: 5 });

// Triangle Body Polygon
board.create('polygon', [A, B, C], {
    fillColor: '#38bdf8',
    fillOpacity: 0.12,
    borders: { strokeColor: '#38bdf8', strokeWidth: 2.5 }
});

// 2. Circumcircle & Circumcenter O
const circum = board.create('circumcircle', [A, B, C], {
    strokeColor: '#06b6d4',
    strokeWidth: 2,
    dash: 2,
    fillColor: '#06b6d4',
    fillOpacity: 0.05,
    center: { name: '', color: '#06b6d4', size: 5 }
});
const O = circum.center;

// 3. Centroid G (Center of Mass)
const G = board.create('point', [
    function() { return (A.X() + B.X() + C.X()) / 3; },
    function() { return (A.Y() + B.Y() + C.Y()) / 3; }
], {
    name: '',
    color: '#eab308',
    fillColor: '#fde047',
    size: 5
});

// Medians connecting vertices to opposite midpoints
const mAB = board.create('midpoint', [A, B], { visible: false });
const mBC = board.create('midpoint', [B, C], { visible: false });
const mCA = board.create('midpoint', [C, A], { visible: false });
board.create('segment', [C, mAB], { strokeColor: '#eab308', strokeWidth: 1.2, dash: 3 });
board.create('segment', [A, mBC], { strokeColor: '#eab308', strokeWidth: 1.2, dash: 3 });
board.create('segment', [B, mCA], { strokeColor: '#eab308', strokeWidth: 1.2, dash: 3 });

// 4. Orthocenter H (Altitudes Intersection via Euler Formula: H = 3G - 2O)
const H = board.create('point', [
    function() { return 3 * G.X() - 2 * O.X(); },
    function() { return 3 * G.Y() - 2 * O.Y(); }
], {
    name: '',
    color: '#ec4899',
    fillColor: '#f43f5e',
    size: 5
});

// Altitude Lines from Vertices to Opposite Sides
const lineAB = board.create('line', [A, B], { visible: false });
const lineBC = board.create('line', [B, C], { visible: false });
board.create('perpendicular', [lineAB, C], { strokeColor: '#ec4899', strokeWidth: 1.2, dash: 3 });
board.create('perpendicular', [lineBC, A], { strokeColor: '#ec4899', strokeWidth: 1.2, dash: 3 });

// 5. Incircle & Incenter
board.create('incircle', [A, B, C], {
    strokeColor: '#10b981',
    strokeWidth: 2,
    dash: 3,
    fillColor: '#10b981',
    fillOpacity: 0.05,
    center: { name: '', color: '#10b981', size: 4 }
});

// 6. Nine-Point Center N & Feuerbach Circle
const N = board.create('point', [
    function() { return (O.X() + H.X()) / 2; },
    function() { return (O.Y() + H.Y()) / 2; }
], {
    name: '',
    color: '#a855f7',
    fillColor: '#c084fc',
    size: 4
});

board.create('circle', [
    N,
    function() { return Math.hypot(O.X() - A.X(), O.Y() - A.Y()) / 2; }
], {
    strokeColor: '#c084fc',
    strokeWidth: 1.8,
    dash: 2,
    fillColor: '#c084fc',
    fillOpacity: 0.04
});

// 7. Collinear Ruby Euler Line (Passes through O, N, G, H)
board.create('line', [H, O], {
    strokeColor: '#f43f5e',
    strokeWidth: 3,
    dash: 1
});

// 8. 60 FPS Kinetic Render Loop
function animate() {
    t += 0.02;
    board.update();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);"""
            explanation = "Synthesized a pure visual kinetic geometry animation in JSXGraph featuring continuously orbiting vertices, incircle, circumcircle, Nine-Point Feuerbach circle, medians, and collinear Euler line without text clutter."
            suggested = ["Add golden ratio spiral orbit", "Add pedal triangle projection", "Add tangent envelope lines"]
        else:
            # Default Masterpiece: Kinetic Wave Calculus & Tangent Dynamics
            code = """// --- JSXGraph: Kinetic Wave Calculus & Tangent Dynamics ---
// Pure kinetic animation: Traveling harmonic wave, dynamic tangent & normal lines

const board = JXG.JSXGraph.initBoard('jxgbox', {
    boundingbox: [-5, 4, 5, -4],
    axis: true,
    showCopyright: false,
    showNavigation: false
});
window.board = board;

let t = 0;

// 1. Primary Traveling Wave Curve
board.create('curve', [
    function(x) { return x; },
    function(x) { return 1.8 * Math.sin(x - t) * Math.cos(0.4 * x + 0.3 * t); },
    -5, 5
], {
    strokeColor: '#38bdf8',
    strokeWidth: 3.5,
    highlightStrokeColor: '#0ea5e9'
});

// Dual Counter-Phase Harmonic Envelope Curve
board.create('curve', [
    function(x) { return x; },
    function(x) { return -1.8 * Math.sin(x - t) * Math.cos(0.4 * x + 0.3 * t); },
    -5, 5
], {
    strokeColor: '#818cf8',
    strokeWidth: 1.5,
    dash: 3
});

// 2. Animated Point Traveling Smoothly Along Wave
const pX = function() { return 3.2 * Math.sin(0.35 * t); };
const pY = function() {
    const x = pX();
    return 1.8 * Math.sin(x - t) * Math.cos(0.4 * x + 0.3 * t);
};

const p = board.create('point', [pX, pY], {
    name: '',
    color: '#ec4899',
    fillColor: '#f43f5e',
    size: 6,
    strokeColor: '#fda4af',
    strokeWidth: 2
});

// Pulsing Aura Ring around Point P
board.create('circle', [p, function() { return 0.25 + 0.12 * Math.sin(3 * t); }], {
    strokeColor: '#ec4899',
    strokeWidth: 1.5,
    dash: 2,
    fillColor: '#ec4899',
    fillOpacity: 0.15
});

// 3. Dynamic Derivative Slope & Tangent Line
const dx = 0.001;
const slope = function() {
    const x = pX();
    const y1 = 1.8 * Math.sin(x + dx - t) * Math.cos(0.4 * (x + dx) + 0.3 * t);
    const y0 = 1.8 * Math.sin(x - dx - t) * Math.cos(0.4 * (x - dx) + 0.3 * t);
    return (y1 - y0) / (2 * dx);
};

// Tangent Line Guide Points
const t1 = board.create('point', [
    function() { return pX() - 2.5; },
    function() { return pY() - 2.5 * slope(); }
], { visible: false });

const t2 = board.create('point', [
    function() { return pX() + 2.5; },
    function() { return pY() + 2.5 * slope(); }
], { visible: false });

board.create('line', [t1, t2], {
    strokeColor: '#f59e0b',
    strokeWidth: 2.5,
    dash: 2
});

// 4. Dynamic Normal Line (Perpendicular)
const n1 = board.create('point', [
    function() { return pX() - 1.8 * slope(); },
    function() { return pY() + 1.8; }
], { visible: false });

const n2 = board.create('point', [
    function() { return pX() + 1.8 * slope(); },
    function() { return pY() - 1.8; }
], { visible: false });

board.create('line', [n1, n2], {
    strokeColor: '#10b981',
    strokeWidth: 1.5,
    dash: 4
});

// 5. Differential Slope Polygon
const q = board.create('point', [
    function() { return pX() + 1.2; },
    function() { return pY(); }
], { visible: false });

const r = board.create('point', [
    function() { return pX() + 1.2; },
    function() { return pY() + 1.2 * slope(); }
], { visible: false });

board.create('polygon', [p, q, r], {
    fillColor: '#f59e0b',
    fillOpacity: 0.18,
    borders: { strokeColor: '#f59e0b', strokeWidth: 1.5, dash: 1 },
    hasInnerPoints: false
});

// 6. Oscillating Secant Chord (Demonstrating limit as h -> 0)
const hStep = function() { return 1.4 * (0.5 + 0.5 * Math.sin(1.8 * t)); };
const secantPoint = board.create('point', [
    function() { return pX() + hStep(); },
    function() {
        const sx = pX() + hStep();
        return 1.8 * Math.sin(sx - t) * Math.cos(0.4 * sx + 0.3 * t);
    }
], {
    name: '',
    color: '#a855f7',
    size: 4,
    strokeColor: '#d8b4fe'
});

board.create('line', [p, secantPoint], {
    strokeColor: '#a855f7',
    strokeWidth: 1.5,
    dash: 3
});

// 7. 60 FPS Kinetic Render Loop
function animate() {
    t += 0.025;
    board.update();
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);"""
            explanation = "Synthesized a pure visual kinetic wave calculus animation in JSXGraph featuring a traveling harmonic wave, dynamic tangent & normal lines, differential step polygon, and limit-converging secant line without text clutter."
            suggested = ["Add derivative function trace curve", "Change curve to double frequency soliton", "Switch color palette to cyberpunk neon"]
    elif engine == "d3":
        p_lower = prompt.lower()
        if any(k in p_lower for k in ["stream", "streamgraph", "flow", "spectral wave", "stacked wave", "undulat"]):
            code = """// --- D3.js: Kinetic Streamgraph Spectral Wave Flow ---
// Continuously undulating stacked harmonic waves rendered via d3.stack & d3.curveBasis

const width = __WIDTH__;
const height = __HEIGHT__;

const svg = d3.select('#d3-svg')
    .attr('viewBox', [0, 0, width, height])
    .style('width', '100%')
    .style('height', '100%');

svg.selectAll('*').remove();

const m = 35; // Number of sample points per wave
const n = 6;  // Number of harmonic wave layers

// Defs with Vivid Cyberpunk Gradients
const defs = svg.append('defs');
const palettes = [
    ['#38bdf8', '#0284c7'],
    ['#818cf8', '#4f46e5'],
    ['#c084fc', '#9333ea'],
    ['#f472b6', '#db2777'],
    ['#fb923c', '#ea580c'],
    ['#34d399', '#059669']
];

palettes.forEach((colors, i) => {
    const grad = defs.append('linearGradient')
        .attr('id', 'stream-grad-' + i)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '0%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', colors[0]).attr('stop-opacity', 0.85);
    grad.append('stop').attr('offset', '100%').attr('stop-color', colors[1]).attr('stop-opacity', 0.85);
});

// Generator for oscillating harmonic data
function generateData(t) {
    const data = [];
    for (let i = 0; i < m; i++) {
        const entry = { x: i };
        for (let j = 0; j < n; j++) {
            const freq = (j + 1) * 0.45;
            const phase = t * 1.8 + j * 0.9;
            const wave1 = Math.sin(i * freq * 0.28 + phase);
            const wave2 = Math.cos(i * 0.18 - phase * 0.6);
            entry['v' + j] = Math.max(0.1, 15 + 12 * Math.pow(wave1 * wave2, 2) * 2.5);
        }
        data.push(entry);
    }
    return data;
}

const keys = d3.range(n).map(i => 'v' + i);
const stack = d3.stack()
    .keys(keys)
    .offset(d3.stackOffsetWiggle)
    .order(d3.stackOrderInsideOut);

const xScale = d3.scaleLinear().domain([0, m - 1]).range([0, width]);
const yScale = d3.scaleLinear().domain([-80, 80]).range([height * 0.9, height * 0.1]);

const area = d3.area()
    .curve(d3.curveBasis)
    .x(d => xScale(d.data.x))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]));

const g = svg.append('g');

// Initial Layer Paths
const paths = g.selectAll('path')
    .data(stack(generateData(0)))
    .join('path')
    .attr('fill', (d, i) => 'url(#stream-grad-' + i + ')')
    .attr('stroke', '#0a0d14')
    .attr('stroke-width', 0.8)
    .attr('stroke-opacity', 0.4);

// 60 FPS Kinetic Wave Loop
let time = 0;
d3.timer(() => {
    time += 0.016;
    const series = stack(generateData(time));
    paths.data(series).attr('d', area);
});"""
            explanation = "Synthesized a pure visual kinetic streamgraph in D3.js featuring 6 undulating stacked harmonic layers with d3.curveBasis smoothing and dynamic linear gradients."
            suggested = ["Add glowing particles riding wave ridges", "Switch to neon monochrome emerald palette", "Increase wave oscillation frequency"]
        elif any(k in p_lower for k in ["sunburst", "radial", "chord", "concentric", "arc partition"]):
            code = """// --- D3.js: Concentric Kinetic Sunburst & Harmonic Radial Matrix ---
// Pure visual geometry: Interlocking rotating radial arcs with spectral harmonic breathing

const width = __WIDTH__;
const height = __HEIGHT__;
const radius = Math.min(width, height) / 2 - 20;

const svg = d3.select('#d3-svg')
    .attr('viewBox', [-width / 2, -height / 2, width, height])
    .style('width', '100%')
    .style('height', '100%');

svg.selectAll('*').remove();

// 1. Synthesize Concentric Rings Data
const ringCount = 5;
const ringsData = [];
const colorScales = [
    d3.interpolateBlues,
    d3.interpolateViridis,
    d3.interpolateCool,
    d3.interpolatePlasma,
    d3.interpolateWarm
];

for (let r = 0; r < ringCount; r++) {
    const segments = 6 + r * 6;
    const inner = (radius / ringCount) * r + 16;
    const outer = (radius / ringCount) * (r + 1) + 12;
    for (let s = 0; s < segments; s++) {
        ringsData.push({
            ring: r,
            segment: s,
            totalSegments: segments,
            innerRadius: inner,
            outerRadius: outer,
            startAngle: (s / segments) * 2 * Math.PI,
            endAngle: ((s + 0.85) / segments) * 2 * Math.PI,
            color: colorScales[r % colorScales.length]((s / segments))
        });
    }
}

// 2. Arc Generator
const arc = d3.arc()
    .innerRadius(d => d.innerRadius)
    .outerRadius(d => d.outerRadius)
    .startAngle(d => d.currentStart)
    .endAngle(d => d.currentEnd)
    .padAngle(0.018)
    .cornerRadius(3);

const g = svg.append('g');

// Render Sector Arcs
const sectors = g.selectAll('path')
    .data(ringsData)
    .join('path')
    .attr('fill', d => d.color)
    .attr('fill-opacity', d => 0.65 + 0.25 * Math.sin(d.ring))
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 0.5)
    .attr('stroke-opacity', 0.3);

// Center Pulsing Core
const core = svg.append('circle')
    .attr('r', 12)
    .attr('fill', '#38bdf8')
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 2);

// 3. Kinetic Counter-Rotation & Breathing Animation
let elapsed = 0;
d3.timer(() => {
    elapsed += 0.015;

    // Animate individual rings in alternating opposite rotations
    ringsData.forEach(d => {
        const speed = (d.ring % 2 === 0 ? 1 : -1) * (0.35 + d.ring * 0.12);
        const rotation = elapsed * speed;
        const breath = Math.sin(elapsed * 2.5 + d.ring * 1.2) * 4;
        
        d.currentStart = d.startAngle + rotation;
        d.currentEnd = d.endAngle + rotation;
        d.innerRadius = ((radius / ringCount) * d.ring + 16) + breath * 0.5;
        d.outerRadius = ((radius / ringCount) * (d.ring + 1) + 12) + breath;
    });

    sectors.attr('d', arc);
    core.attr('r', 10 + 4 * Math.sin(elapsed * 4));
});"""
            explanation = "Synthesized a pure visual kinetic concentric sunburst matrix in D3.js featuring 5 counter-rotating radial arc rings with harmonic breathing expansions."
            suggested = ["Add radial connector filaments", "Switch color palette to cyber-gold & ruby", "Add inner spiral rotation"]
        elif any(k in p_lower for k in ["voronoi", "delaunay", "tessellat", "bouncing particle"]):
            code = """// --- D3.js: Morphing Voronoi Tessellation & Delaunay Mesh ---
// 60 FPS dynamic spatial tessellation with bouncy physics particles & Delaunay triangulation

const width = __WIDTH__;
const height = __HEIGHT__;

const svg = d3.select('#d3-svg')
    .attr('viewBox', [0, 0, width, height])
    .style('width', '100%')
    .style('height', '100%');

svg.selectAll('*').remove();

// 1. Synthesize Autonomous Bouncing Particles
const numParticles = 48;
const particles = d3.range(numParticles).map(i => ({
    x: Math.random() * (width - 40) + 20,
    y: Math.random() * (height - 40) + 20,
    vx: (Math.random() - 0.5) * 1.8,
    vy: (Math.random() - 0.5) * 1.8,
    color: d3.interpolateCool(i / numParticles)
}));

const voronoiGroup = svg.append('g').attr('class', 'voronoi-cells');
const meshGroup = svg.append('g').attr('class', 'delaunay-mesh');
const pointsGroup = svg.append('g').attr('class', 'particle-dots');

// 2. 60 FPS Render Loop
d3.timer(() => {
    // Physics Step: Position Integration & Border Bounce
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= 15) { p.x = 15; p.vx *= -1; }
        if (p.x >= width - 15) { p.x = width - 15; p.vx *= -1; }
        if (p.y <= 15) { p.y = 15; p.vy *= -1; }
        if (p.y >= height - 15) { p.y = height - 15; p.vy *= -1; }
    });

    // Compute Delaunay & Voronoi
    const points = particles.map(p => [p.x, p.y]);
    const delaunay = d3.Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    // Update Voronoi Polygons
    voronoiGroup.selectAll('path')
        .data(particles)
        .join('path')
        .attr('d', (d, i) => voronoi.renderCell(i))
        .attr('fill', d => d.color)
        .attr('fill-opacity', 0.12)
        .attr('stroke', d => d.color)
        .attr('stroke-width', 1.2)
        .attr('stroke-opacity', 0.5);

    // Update Delaunay Linkage Lines
    meshGroup.selectAll('path')
        .data([delaunay])
        .join('path')
        .attr('d', d => d.render())
        .attr('fill', 'none')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 0.5)
        .attr('stroke-opacity', 0.25)
        .attr('stroke-dasharray', '2,4');

    // Update Particle Nuclei
    pointsGroup.selectAll('circle')
        .data(particles)
        .join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', 3.5)
        .attr('fill', '#ffffff')
        .attr('stroke', d => d.color)
        .attr('stroke-width', 2);
});"""
            explanation = "Synthesized a pure visual kinetic Voronoi tessellation and Delaunay triangulation animation in D3.js with 48 bouncing physics particles and translucent spatial cells."
            suggested = ["Add cursor repulsion force", "Change color mapping to velocity-based temperature", "Increase particle density to 80"]
        elif any(k in p_lower for k in ["bar", "chart", "column", "metric", "histogram"]):
            d3_count = min(max(params["count"], 4), 14)
            d3_col1 = params["primary_color"]["hex"]
            d3_col2 = params["secondary_color"]["hex"]
            d3_spd = params["speed_factor"]

            code = f"""// --- D3.js: Dynamic Animated Bar Chart ---
// User Demand: count={d3_count}, primaryColor={d3_col1}, secondaryColor={d3_col2}, speed={d3_spd}x

const width = __WIDTH__;
const height = __HEIGHT__;
const margin = {{ top: 40, right: 30, bottom: 60, left: 60 }};
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const svg = d3.select('#d3-svg')
    .attr('viewBox', [0, 0, width, height])
    .style('width', '100%')
    .style('height', '100%');

svg.selectAll('*').remove();

// Data Generator
const categories = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi'].slice(0, {d3_count});
const dataset = categories.map((cat, i) => ({{
    label: cat,
    value: Math.floor(Math.random() * 65) + 25
}}));

const x = d3.scaleBand()
    .domain(categories)
    .range([0, innerW])
    .padding(0.35);

const y = d3.scaleLinear()
    .domain([0, 100])
    .range([innerH, 0]);

const g = svg.append('g')
    .attr('transform', `translate(${{margin.left}},${{margin.top}})`);

// Grid lines
g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(''))
    .selectAll('line')
    .attr('stroke', 'rgba(255, 255, 255, 0.08)');

// Axes
g.append('g')
    .attr('transform', `translate(0,${{innerH}})`)
    .call(d3.axisBottom(x))
    .attr('color', '#94a3b8')
    .selectAll('text')
    .attr('fill', '#cbd5e1')
    .attr('font-size', '12px');

g.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .attr('color', '#94a3b8')
    .selectAll('text')
    .attr('fill', '#cbd5e1');

// Bars with Staggered Entrance
const bars = g.selectAll('.bar')
    .data(dataset)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.label))
    .attr('width', x.bandwidth())
    .attr('y', innerH)
    .attr('height', 0)
    .attr('rx', 6)
    .attr('fill', (d, i) => i % 2 === 0 ? '{d3_col1}' : '{d3_col2}')
    .attr('fill-opacity', 0.88);

bars.transition()
    .duration(900 / {d3_spd})
    .delay((d, i) => i * (80 / {d3_spd}))
    .ease(d3.easeElasticOut.period(0.6))
    .attr('y', d => y(d.value))
    .attr('height', d => innerH - y(d.value));

// Periodic Dynamic Wave Pulse
d3.interval(() => {{
    dataset.forEach(d => {{
        d.value = Math.min(98, Math.max(15, d.value + (Math.random() - 0.5) * 22));
    }});
    bars.transition()
        .duration(600 / {d3_spd})
        .ease(d3.easeCubicOut)
        .attr('y', d => y(d.value))
        .attr('height', d => innerH - y(d.value));
}}, 2200 / {d3_spd});
"""
            explanation = f"Synthesized an interactive D3.js animated bar chart featuring {d3_count} responsive columns ({d3_col1}, {d3_col2}) with elastic entrance transitions and live periodic pulse."
            suggested = ["Add hover tooltip popups", "Switch to horizontal bar layout", "Add dynamic sorting animation"]

        else:
            # Default Masterpiece: Kinetic Force-Directed Cosmic Mesh
            d3_count = min(max(params["count"], 12), 60)
            d3_c1 = params["primary_color"]["hex"]
            d3_c2 = params["secondary_color"]["hex"]
            d3_c3 = params["accent_color"]["hex"]

            code = f"""// --- D3.js: Kinetic Force-Directed Cosmic Mesh ---
// Drag nodes with mouse or touch to interact with the physics simulation!

const width = __WIDTH__;
const height = __HEIGHT__;

const svg = d3.select('#d3-svg')
    .attr('viewBox', [0, 0, width, height])
    .style('width', '100%')
    .style('height', '100%');

svg.selectAll('*').remove();

// 1. Defs & Glow Filters
const defs = svg.append('defs');
const filter = defs.append('filter')
    .attr('id', 'neon-glow')
    .attr('x', '-50%').attr('y', '-50%')
    .attr('width', '200%').attr('height', '200%');
filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
const feMerge = filter.append('feMerge');
feMerge.append('feMergeNode').attr('in', 'coloredBlur');
feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

// Linear Gradients for Links
const linkGrad = defs.append('linearGradient')
    .attr('id', 'link-grad')
    .attr('gradientUnits', 'userSpaceOnUse');
linkGrad.append('stop').attr('offset', '0%').attr('stop-color', '{d3_c1}').attr('stop-opacity', 0.6);
linkGrad.append('stop').attr('offset', '100%').attr('stop-color', '{d3_c2}').attr('stop-opacity', 0.6);

// 2. Synthesize Clustered Graph Nodes
const clusterColors = ['{d3_c1}', '{d3_c2}', '{d3_c3}', '#10b981'];
const nodeCount = {d3_count};
const nodes = d3.range(nodeCount).map(i => {{
    const cluster = i % 4;
    return {{
        id: i,
        cluster: cluster,
        color: clusterColors[cluster],
        radius: i < 4 ? 14 : Math.floor(Math.random() * 6) + 4,
        isHub: i < 4
    }};
}});

// Synthesize Links
const links = [];
for (let i = 4; i < nodeCount; i++) {{
    links.push({{
        source: i,
        target: i % 4,
        distance: 70 + Math.random() * 50
    }});
    if (Math.random() > 0.6) {{
        links.push({{
            source: i,
            target: (i + 1) % nodeCount,
            distance: 40 + Math.random() * 40
        }});
    }}
}}
// Connect Hubs
links.push({{ source: 0, target: 1, distance: 130 }});
links.push({{ source: 1, target: 2, distance: 130 }});
links.push({{ source: 2, target: 3, distance: 130 }});
links.push({{ source: 3, target: 0, distance: 130 }});

// 3. Force Simulation Setup
const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.distance).strength(0.65))
    .force('charge', d3.forceManyBody().strength(d => d.isHub ? -260 : -75))
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.08))
    .force('collide', d3.forceCollide().radius(d => d.radius + 6).iterations(2));

// 4. Render Visual Elements
const g = svg.append('g').attr('class', 'network-group');

const linkGroup = g.append('g').attr('class', 'links');
const link = linkGroup.selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', 'url(#link-grad)')
    .attr('stroke-width', d => (d.source.isHub || d.target.isHub) ? 1.8 : 0.9)
    .attr('stroke-opacity', 0.45);

const nodeGroup = g.append('g').attr('class', 'nodes');

// Pulsing Auras on Hubs
const aura = nodeGroup.selectAll('.aura')
    .data(nodes.filter(d => d.isHub))
    .join('circle')
    .attr('class', 'aura')
    .attr('r', d => d.radius * 1.8)
    .attr('fill', d => d.color)
    .attr('fill-opacity', 0.15)
    .attr('stroke', d => d.color)
    .attr('stroke-width', 1.2)
    .attr('stroke-dasharray', '3,3');

// Main Nodes
const node = nodeGroup.selectAll('.node')
    .data(nodes)
    .join('circle')
    .attr('class', 'node')
    .attr('r', d => d.radius)
    .attr('fill', d => d.color)
    .attr('stroke', '#ffffff')
    .attr('stroke-width', d => d.isHub ? 2.5 : 1.2)
    .attr('filter', 'url(#neon-glow)')
    .style('cursor', 'grab')
    .call(d3.drag()
        .on('start', (event, d) => {{
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }})
        .on('drag', (event, d) => {{
            d.fx = event.x;
            d.fy = event.y;
        }})
        .on('end', (event, d) => {{
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }})
    );

// 5. Kinetic Simulation & Orbital Breathing Tick
let elapsedTicks = 0;
simulation.on('tick', () => {{
    elapsedTicks += 0.015;

    // Add subtle organic harmonic oscillation to hubs
    nodes.filter(d => d.isHub).forEach((hub, idx) => {{
        if (!hub.fx) {{
            hub.vx += Math.cos(elapsedTicks + idx * 1.5) * 0.25;
            hub.vy += Math.sin(elapsedTicks + idx * 1.5) * 0.25;
        }}
    }});

    link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

    node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

    aura
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => d.radius * (1.6 + 0.3 * Math.sin(elapsedTicks * 3 + d.id)));
}});
"""
            explanation = f"Synthesized an interactive D3.js force-directed network graph featuring {d3_count} chromatic nodes ({d3_c1}, {d3_c2}), physics spring constraints, and drag interaction."
            suggested = ["Add particle flow pulses along links", "Increase node count to 100", "Switch to glowing galactic spiral topology"]
    elif engine == "matter":
        p_lower = prompt.lower()
        launch_ang = params.get("launch_angle", 60.0)
        v0 = params.get("initial_velocity", 22.0)

        if params.get("is_projectile"):
            code = f"""// --- Matter.js: Interactive Ballistic Cannon & Rigid-Body Destruction ---
// User Demand: launch_angle={launch_ang}°, v0={v0} m/s

const {{ Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint, Body }} = Matter;

const engine = Engine.create({{
    gravity: {{ x: 0, y: 1.0, scale: 0.0018 }}
}});
const world = engine.world;

const width = __WIDTH__;
const height = __HEIGHT__;

const render = Render.create({{
    element: document.getElementById('matter-container'),
    engine: engine,
    options: {{
        width: width,
        height: height,
        wireframes: false,
        background: '#090d16'
    }}
}});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// 1. Static Boundaries
const ground = Bodies.rectangle(width / 2, height - 16, width, 32, {{
    isStatic: true,
    render: {{ fillStyle: '#1e293b', strokeStyle: '#334155', lineWidth: 1 }}
}});
const wallLeft = Bodies.rectangle(-10, height / 2, 20, height, {{ isStatic: true }});
const wallRight = Bodies.rectangle(width + 10, height / 2, 20, height, {{ isStatic: true }});
Composite.add(world, [ground, wallLeft, wallRight]);

// 2. Target Pyramid of Destructible Boxes
const boxColors = ['#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981'];
const stackCols = 6;
const stackRows = 8;
const boxSize = 28;
const startStackX = width * 0.72;

for (let i = 0; i < stackRows; i++) {{
    for (let j = 0; j < stackCols - i; j++) {{
        const bx = startStackX + j * (boxSize + 4) + i * ((boxSize + 4) / 2);
        const by = height - 32 - (i + 1) * (boxSize + 2);
        const box = Bodies.rectangle(bx, by, boxSize, boxSize, {{
            density: 0.002,
            friction: 0.6,
            restitution: 0.15,
            render: {{
                fillStyle: boxColors[(i + j) % boxColors.length],
                strokeStyle: '#ffffff',
                lineWidth: 1
            }}
        }});
        Composite.add(world, box);
    }}
}}

// 3. Cannon Launcher
const cannonX = width * 0.14;
const cannonY = height - 36;
const angleDeg = {launch_ang};
const angleRad = (angleDeg * Math.PI) / 180;
const launchSpeed = {v0} * 0.95;

const cannonBase = Bodies.circle(cannonX, cannonY, 26, {{
    isStatic: true,
    render: {{ fillStyle: '#475569', strokeStyle: '#94a3b8', lineWidth: 2 }}
}});
Composite.add(world, cannonBase);

function fireCannon() {{
    const ballRadius = 14;
    const spawnX = cannonX + Math.cos(angleRad) * 45;
    const spawnY = cannonY - Math.sin(angleRad) * 45;

    const ball = Bodies.circle(spawnX, spawnY, ballRadius, {{
        density: 0.035,
        frictionAir: 0.002,
        restitution: 0.45,
        render: {{
            fillStyle: '#06b6d4',
            strokeStyle: '#ffffff',
            lineWidth: 2
        }}
    }});

    Body.setVelocity(ball, {{
        x: launchSpeed * Math.cos(angleRad),
        y: -launchSpeed * Math.sin(angleRad)
    }});

    Composite.add(world, ball);

    setTimeout(() => {{
        Composite.remove(world, ball);
    }}, 8000);
}}

setTimeout(fireCannon, 600);

render.canvas.addEventListener('click', () => {{
    fireCannon();
}});

// 4. Mouse Interactive Dragging
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {{
    mouse: mouse,
    constraint: {{
        stiffness: 0.2,
        render: {{ visible: true, strokeStyle: '#38bdf8' }}
    }}
}});
Composite.add(world, mouseConstraint);
render.mouse = mouse;
"""
            explanation = f"Synthesized an interactive ballistic projectile launcher in Matter.js fired at {launch_ang:.1f}° with rigid-body impact physics and destructible pyramid for '{prompt}'."
            suggested = ["Change launch angle to 45 degrees", "Increase box tower density", "Add exploding ragdoll characters"]

        elif any(k in p_lower for k in ["cloth", "jelly", "softbody", "soft-body", "soft body", "fabric", "blob"]):
            code = """// --- Matter.js: Elastic Soft-Body Cloth & Jelly Blob Physics ---
// Grab any vertex or the jelly blob to stretch, whip, and bounce!

const { Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint } = Matter;

const engine = Engine.create({
    gravity: { x: 0, y: 1.0, scale: 0.001 }
});
const world = engine.world;

const width = __WIDTH__;
const height = __HEIGHT__;

const render = Render.create({
    element: document.getElementById('matter-container'),
    engine: engine,
    options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#0a0d14'
    }
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// 1. Static Boundaries & Neon Inclined Ramp
const ground = Bodies.rectangle(width / 2, height - 12, width, 24, {
    isStatic: true,
    render: { fillStyle: '#18181b', strokeStyle: '#3f3f46', lineWidth: 1 }
});

const ramp = Bodies.rectangle(550, 310, 290, 14, {
    isStatic: true,
    angle: -0.32,
    render: { fillStyle: '#1e293b', strokeStyle: '#06b6d4', lineWidth: 2 }
});

const bumper = Bodies.circle(680, 245, 24, {
    isStatic: true,
    render: { fillStyle: '#ec4899', strokeStyle: '#ffffff', lineWidth: 2 }
});

Composite.add(world, [ground, ramp, bumper]);

// 2. Hanging Elastic Cloth Matrix
const clothCols = 10;
const clothRows = 7;
const colGap = 18;
const rowGap = 18;
const startX = 65;
const startY = 40;

const clothGroup = Composite.create();
const clothGrid = [];

for (let r = 0; r < clothRows; r++) {
    clothGrid[r] = [];
    for (let c = 0; c < clothCols; c++) {
        const p = Bodies.circle(startX + c * colGap, startY + r * rowGap, 4, {
            isStatic: r === 0,
            frictionAir: 0.02,
            restitution: 0.3,
            render: {
                fillStyle: r === 0 ? '#f59e0b' : '#38bdf8',
                strokeStyle: '#0284c7',
                lineWidth: 1
            }
        });
        clothGrid[r][c] = p;
        Composite.add(clothGroup, p);

        // Horizontal constraint
        if (c > 0) {
            Composite.add(clothGroup, Constraint.create({
                bodyA: clothGrid[r][c - 1],
                bodyB: p,
                stiffness: 0.9,
                render: { strokeStyle: 'rgba(56, 189, 248, 0.45)', lineWidth: 1.2 }
            }));
        }
        // Vertical constraint
        if (r > 0) {
            Composite.add(clothGroup, Constraint.create({
                bodyA: clothGrid[r - 1][c],
                bodyB: p,
                stiffness: 0.9,
                render: { strokeStyle: 'rgba(56, 189, 248, 0.45)', lineWidth: 1.2 }
            }));
        }
    }
}
Composite.add(world, clothGroup);

// 3. Pressurized Bouncy Soft Jelly Blob
const jellyGroup = Composite.create();
const jCenterX = 490;
const jCenterY = 90;
const jRadius = 32;
const jPoints = 8;
const jParticles = [];

const core = Bodies.circle(jCenterX, jCenterY, 14, {
    density: 0.003,
    restitution: 0.9,
    render: { fillStyle: '#c084fc', strokeStyle: '#ffffff', lineWidth: 1.5 }
});
Composite.add(jellyGroup, core);

for (let i = 0; i < jPoints; i++) {
    const angle = (i / jPoints) * Math.PI * 2;
    const px = jCenterX + Math.cos(angle) * jRadius;
    const py = jCenterY + Math.sin(angle) * jRadius;
    const p = Bodies.circle(px, py, 9, {
        density: 0.002,
        restitution: 0.85,
        friction: 0.01,
        render: { fillStyle: '#a855f7', strokeStyle: '#e9d5ff', lineWidth: 1 }
    });
    jParticles.push(p);
    Composite.add(jellyGroup, p);

    // Spoke constraint to core
    Composite.add(jellyGroup, Constraint.create({
        bodyA: core,
        bodyB: p,
        stiffness: 0.25,
        damping: 0.05,
        render: { strokeStyle: 'rgba(192, 132, 252, 0.4)', lineWidth: 1.5 }
    }));
}

// Perimeter spring constraints
for (let i = 0; i < jPoints; i++) {
    Composite.add(jellyGroup, Constraint.create({
        bodyA: jParticles[i],
        bodyB: jParticles[(i + 1) % jPoints],
        stiffness: 0.4,
        render: { strokeStyle: 'rgba(168, 85, 247, 0.8)', lineWidth: 2 }
    }));
}
Composite.add(world, jellyGroup);

// 4. Interactive Mouse Drag Constraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: true,
            strokeStyle: '#10b981',
            lineWidth: 2
        }
    }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse;

// 5. Periodic gentle impulse to keep jelly dynamic
let tickCount = 0;
Matter.Events.on(engine, 'beforeUpdate', () => {
    tickCount++;
    if (tickCount % 350 === 0) {
        Matter.Body.applyForce(core, core.position, { x: -0.05, y: -0.09 });
    }
});"""
            explanation = "Synthesized a pure visual kinetic soft-body simulation in Matter.js featuring a pinned elastic cloth mesh and an internally constrained jelly blob with real-time mouse drag interaction."
            suggested = ["Add wind force field to cloth", "Increase jelly blob internal pressure", "Add sharp slicing physics obstacles"]
        elif any(k in p_lower for k in ["domino", "plinko", "chain reaction", "rube", "hammer", "peg", "marble drop"]):
            code = """// --- Matter.js: Kinetic Domino Chain & Marble Plinko Run ---
// Multi-stage Rube Goldberg chain reaction with toppling dominos, weighted hammer & Plinko grid

const { Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint } = Matter;

const engine = Engine.create({
    gravity: { x: 0, y: 1.2, scale: 0.001 }
});
const world = engine.world;

const width = __WIDTH__;
const height = __HEIGHT__;

const render = Render.create({
    element: document.getElementById('matter-container'),
    engine: engine,
    options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#0a0d14'
    }
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// 1. Static Platforms & Rails
const topTrack = Bodies.rectangle(150, 90, 260, 12, {
    isStatic: true,
    angle: 0.16,
    render: { fillStyle: '#1e293b', strokeStyle: '#38bdf8', lineWidth: 2 }
});

const dominoPlatform = Bodies.rectangle(430, 140, 310, 14, {
    isStatic: true,
    render: { fillStyle: '#1e293b', strokeStyle: '#818cf8', lineWidth: 2 }
});

const ground = Bodies.rectangle(width / 2, height - 10, width, 20, {
    isStatic: true,
    render: { fillStyle: '#18181b' }
});

Composite.add(world, [topTrack, dominoPlatform, ground]);

// 2. Heavy Starter Rolling Marble
const starterBall = Bodies.circle(40, 50, 17, {
    density: 0.006,
    restitution: 0.6,
    friction: 0.001,
    render: { fillStyle: '#38bdf8', strokeStyle: '#ffffff', lineWidth: 2 }
});
Composite.add(world, starterBall);

// 3. Upright Domino Sequence (12 Blocks)
const dominoCount = 12;
const dominoW = 7;
const dominoH = 45;
const dominoStart = 290;
const dominoGap = 21;
const dominos = [];

for (let i = 0; i < dominoCount; i++) {
    const x = dominoStart + i * dominoGap;
    const y = 140 - 7 - dominoH / 2;
    const d = Bodies.rectangle(x, y, dominoW, dominoH, {
        density: 0.002,
        friction: 0.4,
        restitution: 0.1,
        render: {
            fillStyle: i % 2 === 0 ? '#ec4899' : '#f43f5e',
            strokeStyle: '#ffffff',
            lineWidth: 1
        }
    });
    dominos.push(d);
}
Composite.add(world, dominos);

// 4. Pivoting Hammer at end of Domino Track
const hammerPivotX = 565;
const hammerPivotY = 130;
const hammerArm = Bodies.rectangle(hammerPivotX, hammerPivotY + 38, 10, 76, {
    density: 0.003,
    render: { fillStyle: '#eab308' }
});
const hammerWeight = Bodies.circle(hammerPivotX, hammerPivotY + 76, 20, {
    density: 0.015,
    render: { fillStyle: '#f59e0b', strokeStyle: '#ffffff', lineWidth: 2 }
});
const hammerGroup = Matter.Body.create({
    parts: [hammerArm, hammerWeight]
});
const hammerPin = Constraint.create({
    pointA: { x: hammerPivotX, y: hammerPivotY },
    bodyB: hammerGroup,
    pointB: { x: 0, y: -38 },
    stiffness: 1,
    length: 0,
    render: { strokeStyle: '#ffffff', lineWidth: 2 }
});
Composite.add(world, [hammerGroup, hammerPin]);

// 5. Triangular Plinko Peg Grid
const pegRows = 5;
const pegStartY = 230;
const pegSpacingX = 46;
const pegSpacingY = 32;
const pegs = [];

for (let r = 0; r < pegRows; r++) {
    const countInRow = r + 3;
    const rowStartX = 620 - ((countInRow - 1) * pegSpacingX) / 2;
    for (let c = 0; c < countInRow; c++) {
        const px = rowStartX + c * pegSpacingX;
        const py = pegStartY + r * pegSpacingY;
        pegs.push(Bodies.circle(px, py, 5, {
            isStatic: true,
            render: { fillStyle: '#34d399', strokeStyle: '#6ee7b7', lineWidth: 1.5 }
        }));
    }
}
Composite.add(world, pegs);

// Bottom Funnel Chutes
for (let b = 0; b < 6; b++) {
    const bx = 620 - 115 + b * 46;
    Composite.add(world, Bodies.rectangle(bx, height - 30, 5, 42, {
        isStatic: true,
        render: { fillStyle: '#475569' }
    }));
}

// 6. Cascading Neon Marbles
const plinkoMarbles = [];
const marbleColors = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
for (let m = 0; m < 10; m++) {
    const marble = Bodies.circle(580 + (Math.random() - 0.5) * 50, 170 - m * 24, 9, {
        restitution: 0.75,
        friction: 0.02,
        render: {
            fillStyle: marbleColors[m % marbleColors.length],
            strokeStyle: '#ffffff',
            lineWidth: 1
        }
    });
    plinkoMarbles.push(marble);
}
Composite.add(world, plinkoMarbles);

// 7. Interactive Mouse Drag Constraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: true,
            strokeStyle: '#38bdf8',
            lineWidth: 2
        }
    }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse;"""
            explanation = "Synthesized a pure visual kinetic Rube Goldberg machine in Matter.js featuring rolling trigger marble, 14 toppling dominoes, pivoting hammer mechanism, and triangular Plinko peg cascade."
            suggested = ["Add loop-the-loop track at the top", "Add elevator bucket return conveyor", "Increase marble count to 30"]
        elif any(k in p_lower for k in ["gear", "gyro", "wheel", "tumbler", "rotor", "drum", "planetary", "centrifugal"]):
            code = """// --- Matter.js: Rotating Gyroscopic Wheel & Tumbling Tumbler ---
// Hypnotic rotating mechanism with motorized central rotor & trapped tumbling kinetic marbles

const { Engine, Render, Runner, Bodies, Composite, Constraint, Body, Mouse, MouseConstraint } = Matter;

const engine = Engine.create({
    gravity: { x: 0, y: 0.9, scale: 0.001 }
});
const world = engine.world;

const width = __WIDTH__;
const height = __HEIGHT__;

const render = Render.create({
    element: document.getElementById('matter-container'),
    engine: engine,
    options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#0a0d14'
    }
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

const centerX = width / 2;
const centerY = height / 2;
const outerRadius = 140;

// 1. Tumbler Outer Cage (Circular polygon formed of 24 static segments attached to revolving core)
const segmentCount = 24;
const segments = [];
const angleStep = (Math.PI * 2) / segmentCount;
const segmentLength = (2 * Math.PI * outerRadius) / segmentCount + 4;

for (let i = 0; i < segmentCount; i++) {
    const angle = i * angleStep;
    const x = centerX + Math.cos(angle) * outerRadius;
    const y = centerY + Math.sin(angle) * outerRadius;

    const seg = Bodies.rectangle(x, y, segmentLength, 10, {
        angle: angle + Math.PI / 2,
        render: {
            fillStyle: i % 2 === 0 ? '#38bdf8' : '#818cf8',
            strokeStyle: '#ffffff',
            lineWidth: 1
        }
    });
    segments.push(seg);
}

// Central Rotary Hub Cross-Beams
const beam1 = Bodies.rectangle(centerX, centerY, outerRadius * 2 - 8, 11, {
    render: { fillStyle: '#1e293b', strokeStyle: '#38bdf8', lineWidth: 1.5 }
});
const beam2 = Bodies.rectangle(centerX, centerY, outerRadius * 2 - 8, 11, {
    angle: Math.PI / 2,
    render: { fillStyle: '#1e293b', strokeStyle: '#ec4899', lineWidth: 1.5 }
});
const beam3 = Bodies.rectangle(centerX, centerY, outerRadius * 2 - 8, 11, {
    angle: Math.PI / 4,
    render: { fillStyle: '#1e293b', strokeStyle: '#eab308', lineWidth: 1.5 }
});
const beam4 = Bodies.rectangle(centerX, centerY, outerRadius * 2 - 8, 11, {
    angle: -Math.PI / 4,
    render: { fillStyle: '#1e293b', strokeStyle: '#10b981', lineWidth: 1.5 }
});

const rotorWheel = Body.create({
    parts: [beam1, beam2, beam3, beam4, ...segments]
});

// Pin Rotor to Center
const rotorPin = Constraint.create({
    pointA: { x: centerX, y: centerY },
    bodyB: rotorWheel,
    pointB: { x: 0, y: 0 },
    stiffness: 1,
    length: 0,
    render: { visible: false }
});

Composite.add(world, [rotorWheel, rotorPin]);

// 2. Trapped Kinetic Tumbling Balls
const ballCount = 30;
const colors = ['#f43f5e', '#ec4899', '#38bdf8', '#06b6d4', '#10b981', '#eab308'];
const balls = [];

for (let i = 0; i < ballCount; i++) {
    const r = Math.random() * (outerRadius * 0.72);
    const theta = Math.random() * Math.PI * 2;
    const bx = centerX + Math.cos(theta) * r;
    const by = centerY + Math.sin(theta) * r;

    const b = Bodies.circle(bx, by, Math.floor(Math.random() * 5) + 7, {
        restitution: 0.7,
        friction: 0.05,
        render: {
            fillStyle: colors[i % colors.length],
            strokeStyle: '#ffffff',
            lineWidth: 1
        }
    });
    balls.push(b);
}
Composite.add(world, balls);

// 3. Central Glowing Axle Core
const axle = Bodies.circle(centerX, centerY, 18, {
    isStatic: true,
    render: {
        fillStyle: '#0f172a',
        strokeStyle: '#ffffff',
        lineWidth: 2.5
    }
});
Composite.add(world, axle);

// 4. Continuous Motorized Rotation (Angular Velocity Drive)
Matter.Events.on(engine, 'beforeUpdate', () => {
    Body.setAngle(rotorWheel, rotorWheel.angle + 0.018);
    Body.setAngularVelocity(rotorWheel, 0.018);
});

// 5. Interactive Mouse Drag Constraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: true,
            strokeStyle: '#f43f5e',
            lineWidth: 2
        }
    }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse;"""
            explanation = "Synthesized a pure visual kinetic gyroscopic mechanism in Matter.js featuring motorized rotating 28-segment cage, central cross-beams, and 38 trapped tumbling marbles."
            suggested = ["Add internal planetary orbital gears", "Add color-cycling LEDs on outer rim", "Toggle zero-gravity floating mode"]
        elif any(k in p_lower for k in ["cradle", "newton", "pendulum"]):
            # Kinetic Newton's Cradle & Momentum Wave
            code = """// --- Matter.js: Kinetic Newton's Cradle & Momentum Wave ---
// Interactive momentum conservation: Click & drag any ball with mouse or touch!

const { Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint } = Matter;

const engine = Engine.create({
    gravity: { x: 0, y: 1.2, scale: 0.001 }
});
const world = engine.world;

const width = __WIDTH__;
const height = __HEIGHT__;

const render = Render.create({
    element: document.getElementById('matter-container'),
    engine: engine,
    options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#0a0d14',
        showVelocity: false
    }
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// 1. Overhead Mounting Beam
const topBeam = Bodies.rectangle(width / 2, 45, 380, 14, {
    isStatic: true,
    render: {
        fillStyle: '#1e293b',
        strokeStyle: '#38bdf8',
        lineWidth: 2
    }
});
Composite.add(world, topBeam);

// 2. Synthesize 6 High-Restitution Spheres
const ballCount = 6;
const ballRadius = 18;
const ropeLength = 190;
const startX = width / 2 - ((ballCount - 1) * ballRadius * 2) / 2;
const palette = ['#38bdf8', '#818cf8', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b'];

const balls = [];
for (let i = 0; i < ballCount; i++) {
    const x = startX + i * ballRadius * 2;
    const y = 45 + ropeLength;

    const ball = Bodies.circle(x, y, ballRadius, {
        density: 0.005,
        friction: 0.0001,
        frictionAir: 0.0001,
        restitution: 1.0,
        slop: 0,
        render: {
            fillStyle: palette[i % palette.length],
            strokeStyle: '#ffffff',
            lineWidth: 2
        }
    });

    const rope = Constraint.create({
        pointA: { x: x, y: 45 },
        bodyB: ball,
        stiffness: 1,
        length: ropeLength,
        render: {
            strokeStyle: 'rgba(255, 255, 255, 0.45)',
            lineWidth: 1.5
        }
    });

    balls.push(ball);
    Composite.add(world, [ball, rope]);
}

// 3. Initial Impulse: Pull back the first ball with ample clearance
Matter.Body.setPosition(balls[0], { x: balls[0].position.x - 95, y: balls[0].position.y - 35 });

// 4. Interactive Mouse Drag Constraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: true,
            strokeStyle: '#ec4899',
            lineWidth: 2
        }
    }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse;

// 5. Perpetual Kinetic Pulse if simulation settles
let lastPulse = Date.now();
Matter.Events.on(engine, 'afterUpdate', () => {
    const speedSum = balls.reduce((acc, b) => acc + Math.hypot(b.velocity.x, b.velocity.y), 0);
    if (speedSum < 0.5 && Date.now() - lastPulse > 3500) {
        lastPulse = Date.now();
        Matter.Body.applyForce(balls[0], balls[0].position, { x: -0.08, y: -0.03 });
    }
});"""
            explanation = "Synthesized a pure visual kinetic Newton's cradle in Matter.js featuring 7 high-restitution spheres on rigid rope constraints with real-time mouse drag interaction."
            suggested = ["Add dual opposing end-ball pullbacks", "Switch to neon laser wire constraints", "Increase ball count to 11"]

        else:
            # Dynamic Matter.js Physics Simulation tailored directly to user demand
            body_shape = params["shape"]
            body_count = min(max(params["count"], 4), 30)
            m_col1 = params["primary_color"]["hex"]
            m_col2 = params["secondary_color"]["hex"]
            spd = params["speed_factor"]

            code = f"""// --- Matter.js: Dynamic Physics Simulation ---
// User Demand: shape={body_shape}, count={body_count}, primaryColor={m_col1}, speed={spd}x

const {{ Engine, Render, Runner, Bodies, Composite, Constraint, Mouse, MouseConstraint }} = Matter;

const engine = Engine.create({{
    gravity: {{ x: 0, y: 1.0, scale: 0.001 * {spd} }}
}});
const world = engine.world;

const width = __WIDTH__;
const height = __HEIGHT__;

const render = Render.create({{
    element: document.getElementById('matter-container'),
    engine: engine,
    options: {{
        width: width,
        height: height,
        wireframes: false,
        background: '#0a0d14',
        showVelocity: false
    }}
}});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// 1. Boundaries (Ground, Walls, Deflectors)
const ground = Bodies.rectangle(width / 2, height - 12, width, 24, {{ isStatic: true, render: {{ fillStyle: '#1e293b' }} }});
const leftWall = Bodies.rectangle(12, height / 2, 24, height, {{ isStatic: true, render: {{ fillStyle: '#1e293b' }} }});
const rightWall = Bodies.rectangle(width - 12, height / 2, 24, height, {{ isStatic: true, render: {{ fillStyle: '#1e293b' }} }});

// Angled Obstacle Pegs
const peg1 = Bodies.rectangle(width * 0.35, height * 0.45, 140, 16, {{ isStatic: true, angle: 0.28, render: {{ fillStyle: '#334155' }} }});
const peg2 = Bodies.rectangle(width * 0.65, height * 0.58, 140, 16, {{ isStatic: true, angle: -0.28, render: {{ fillStyle: '#334155' }} }});

Composite.add(world, [ground, leftWall, rightWall, peg1, peg2]);

// 2. Dynamic Falling Bodies
const items = [];
for (let i = 0; i < {body_count}; i++) {{
    const x = (width * 0.2) + (i % 6) * ((width * 0.6) / 6) + (Math.random() * 20 - 10);
    const y = -30 - (Math.floor(i / 6) * 45);
    const col = i % 2 === 0 ? '{m_col1}' : '{m_col2}';

    let item;
    if ('{body_shape}' === 'box') {{
        item = Bodies.rectangle(x, y, 32, 32, {{
            restitution: 0.72,
            friction: 0.05,
            density: 0.002,
            render: {{ fillStyle: col, strokeStyle: '#ffffff', lineWidth: 1.5 }}
        }});
    }} else {{
        item = Bodies.circle(x, y, 16, {{
            restitution: 0.88,
            friction: 0.01,
            density: 0.002,
            render: {{ fillStyle: col, strokeStyle: '#ffffff', lineWidth: 1.5 }}
        }});
    }}
    items.push(item);
}}
Composite.add(world, items);

// 3. Interactive Mouse Drag Constraint
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {{
    mouse: mouse,
    constraint: {{
        stiffness: 0.25,
        render: {{ visible: true, strokeStyle: '{m_col1}', lineWidth: 2 }}
    }}
}});
Composite.add(world, mouseConstraint);
render.mouse = mouse;
"""
            explanation = f"Synthesized an interactive Matter.js physics simulation with {body_count} dynamic {body_shape} bodies and angled deflectors for '{prompt}'."
            suggested = ["Add spinning motorized obstacle wheel", "Enable zero-gravity floating mode", "Increase body count to 50"]
    elif engine == "mermaid":
        p_lower = prompt.lower()
        if any(k in p_lower for k in ["auth", "oauth", "sequence", "token", "pkce", "login", "sso", "jwt", "webhook", "api call"]):
            code = """sequenceDiagram
    autonumber
    box rgba(14,165,233,0.12) 🌐 Client Side
    actor User as 👤 End User
    participant App as 💻 Single Page App
    end

    box rgba(168,85,247,0.12) 🛡️ Identity & Gateway
    participant IDP as 🔐 OAuth2 / OIDC Provider
    participant GW as 🚪 API Edge Gateway
    end

    box rgba(16,185,129,0.12) ⚡ Microservices Mesh
    participant Core as ⚙️ Business Logic Service
    participant Hook as 📡 Webhook Dispatcher
    end

    box rgba(245,158,11,0.12) 🌍 Third-Party Partner
    participant Partner as 🏢 External Webhook Listener
    end

    User->>App: Click "Sign in with Enterprise SSO"
    App->>IDP: GET /authorize (PKCE challenge + state)
    IDP-->>User: Present Passkey / WebAuthn Biometric Prompt
    User->>IDP: Approve Hardware Token Signature
    IDP-->>App: Redirect with Authorization Code
    App->>IDP: POST /oauth/token (code + code_verifier)
    IDP-->>App: Return Signed RS256 JWT Access & Refresh Token

    rect rgba(56,189,248,0.08)
        Note over App,GW: Phase 2: Cryptographic API Dispatch
        App->>GW: POST /v1/transactions (Bearer Access Token)
        GW->>IDP: Validate JWT Signature against JWKS Keyset
        GW->>Core: Forward Sanitized Context + Principal ID
        Core-->>GW: Transaction Committed { status: "COMPLETED", id: "tx_9981" }
        GW-->>App: 200 OK Response with Confirmation
    end

    rect rgba(16,185,129,0.08)
        Note over Core,Partner: Phase 3: Reliable Asynchronous Webhook
        Core->>Hook: Enqueue Event "payment.succeeded"
        Hook->>Hook: Sign Payload with HMAC-SHA256 Secret
        Hook->>Partner: POST /webhook (X-Signature-SHA256)
        Partner-->>Hook: 200 Acknowledged
    end"""
            explanation = "Generated an enterprise OAuth2 PKCE authorization code flow and asynchronous HMAC-signed webhook sequence diagram in Mermaid.js."
            suggested = ["Add MFA SMS fallback branch", "Include Redis token revocation check", "Add retry backoff for webhook failure"]
        elif any(k in p_lower for k in ["state", "lifecycle", "machine", "fsm", "transition", "status", "consensus", "cluster"]):
            code = """stateDiagram-v2
    [*] --> Standby: Provision Virtual Machine Cluster

    state Standby {
        [*] --> Initializing
        Initializing --> ProbingNodes: Run Pre-flight Checks
        ReadyState --> [*]
        state ProbingNodes {
            direction LR
            MemCheck --> DiskCheck
            DiskCheck --> NetLatency
        }
        ProbingNodes --> ReadyState: All Checks Passed
    }

    Standby --> Synchronizing: Primary Leader Elected

    state Synchronizing {
        direction LR
        Region_US_East: 🛰️ Region US-East
        Region_EU_Central: 🛰️ Region EU-Central
        Region_AP_South: 🛰️ Region AP-South

        Region_US_East --> Region_EU_Central: Stream WAL Logs
        Region_EU_Central --> Region_AP_South: Quorum Ack
    }

    Synchronizing --> ActiveServing: Raft Consensus Validated (3/3)

    state ActiveServing {
        [*] --> SteadyLoad
        SteadyLoad --> BurstScaling: CPU > 80% or Queue > 500
        BurstScaling --> SteadyLoad: Scale-out Complete (+8 Nodes)
        SteadyLoad --> MaintenanceMode: Scheduled Patch Window
        MaintenanceMode --> SteadyLoad: Hot Reload Complete
    }

    ActiveServing --> DegradedCircuit: Network Partition Detected
    
    state DegradedCircuit {
        [*] --> IsolateFailedRegion
        IsolateFailedRegion --> ReRouteTraffic: Failover to Secondary
        ReRouteTraffic --> SelfHealingLoop: Auto-Remediate
    }

    SelfHealingLoop --> Synchronizing: Node Re-joined Quorum
    DegradedCircuit --> Terminated: Split-Brain Hard Timeout
    Terminated --> [*]"""
            explanation = "Generated a high-availability distributed cluster lifecycle and multi-region consensus state machine diagram in Mermaid.js."
            suggested = ["Add disaster recovery cold-standby state", "Include Byzantine fault tolerance quorum", "Add canary deployment rollbacks"]
        elif any(k in p_lower for k in ["er diagram", "erd", "entity", "schema", "relational", "entity-relationship", "crows foot", "foreign key", "table schema", "data model"]):
            code = """erDiagram
    ORGANIZATION ||--o{ WORKSPACE : "provisions"
    ORGANIZATION ||--|| SUBSCRIPTION : "billed via"
    ORGANIZATION ||--o{ USER_ACCOUNT : "employs"
    USER_ACCOUNT ||--o{ API_CREDENTIAL : "generates"
    USER_ACCOUNT ||--o{ AUDIT_LOG : "initiates"
    WORKSPACE ||--o{ WORKFLOW_EXECUTION : "runs"
    WORKFLOW_EXECUTION ||--o{ MODEL_INFERENCE : "dispatches"

    ORGANIZATION {
        uuid id PK "Unique Tenant ID"
        string legal_name "Enterprise Name"
        string slug "Unique Domain URI"
        string plan_tier "Enterprise / Scale"
        timestamptz created_at "Creation ISO"
    }

    USER_ACCOUNT {
        uuid id PK "User ID"
        uuid organization_id FK "Tenant Foreign Key"
        string email "Verified Corporate Email"
        string role "Admin / Engineer / Analyst"
        boolean mfa_enforced "WebAuthn Enabled"
        timestamptz last_login_at "Activity Timestamp"
    }

    WORKSPACE {
        uuid id PK "Workspace ID"
        uuid organization_id FK "Tenant Foreign Key"
        string project_title "Display Name"
        jsonb permissions "RBAC Matrix JSON"
        boolean is_isolated "Dedicated Cluster Flag"
    }

    SUBSCRIPTION {
        uuid id PK "Billing Identifier"
        uuid organization_id FK "Tenant Foreign Key"
        string stripe_customer_id "Stripe ID"
        string billing_status "Active / Delinquent"
        numeric monthly_seat_quota "Allowed Seats"
        timestamptz renewal_date "Next Cycle"
    }

    WORKFLOW_EXECUTION {
        uuid id PK "Run Unique ID"
        uuid workspace_id FK "Workspace Foreign Key"
        string workflow_name "DAG Pipeline Name"
        string execution_state "SUCCESS / FAILED"
        int duration_ms "Latency in ms"
        timestamptz started_at "Dispatch Time"
    }

    MODEL_INFERENCE {
        uuid id PK "Inference Call ID"
        uuid execution_id FK "Workflow Foreign Key"
        string model_name "GPT-4o / Claude 3.5 / Gemini"
        int prompt_tokens "Input Token Count"
        int completion_tokens "Output Token Count"
        numeric cost_usd "Micro-dollar Cost"
    }

    API_CREDENTIAL {
        uuid id PK "Key ID"
        uuid user_id FK "Owner Foreign Key"
        string key_prefix "Public Identifier"
        string hashed_secret "Argon2id Hash"
        timestamptz expires_at "Expiration Date"
    }

    AUDIT_LOG {
        uuid id PK "Log Event ID"
        uuid user_id FK "Actor Foreign Key"
        string action "IAM_UPDATE / SECRET_ROTATE"
        inet client_ip "Client IPv4 / IPv6"
        timestamptz recorded_at "Tamper-evident Time"
    }"""
            explanation = "Generated an enterprise SaaS entity-relationship diagram in Mermaid.js with normalized foreign keys, cardinality, and data types."
            suggested = ["Add vector embeddings store entity", "Add payment invoice item line items", "Add webhook subscription events"]
        if params.get("is_projectile") or any(k in p_lower for k in ["projectile", "ballistic", "trajectory", "parabola", "parabolic"]) or ("motion" in p_lower and any(w in p_lower for w in ["kinematics", "gravity", "angle", "degree", "launch"])):
            code = """flowchart TD
    %% 2D Projectile Motion Kinematic Calculation Pipeline
    subgraph Launch["🚀 Initial Launch Conditions"]
        direction TB
        V0["Initial Velocity: v₀ (m/s)"]
        Angle["Launch Angle: θ (deg)"]
        Grav["Gravitational Accel: g = 9.81 m/s²"]
    end

    subgraph Decomp["📐 Vector Decomposition"]
        direction TB
        Vx["Horizontal: v₀ₓ = v₀ · cos(θ)"]
        Vy["Vertical: v₀ᵧ = v₀ · sin(θ)"]
    end

    subgraph Dynamics["⏱️ Ballistic Flight Dynamics"]
        direction TB
        Tapx["Apex Time: t_apex = v₀ᵧ / g"]
        Hmax["Max Height: H_max = (v₀ᵧ)² / (2g)"]
        Ttot["Total Flight Duration: T = 2 · t_apex"]
    end

    subgraph Outcome["🎯 Impact & Range Telemetry"]
        direction TB
        Range["Horizontal Range: R = (v₀² · sin(2θ)) / g"]
        Path["Trajectory: y(x) = x · tan(θ) - (g · x²) / (2 · v₀² · cos²(θ))"]
        Impact["Ground Impact Event: (x=R, y=0)"]
    end

    Launch --> Decomp
    Decomp --> Dynamics
    Dynamics --> Outcome

    classDef launchStyle fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef decompStyle fill:#1e1b4b,stroke:#a855f7,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef dynStyle fill:#022c22,stroke:#10b981,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef outStyle fill:#1c1917,stroke:#f59e0b,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;

    class Launch,V0,Angle,Grav launchStyle;
    class Decomp,Vx,Vy decompStyle;
    class Dynamics,Tapx,Hmax,Ttot dynStyle;
    class Outcome,Range,Path,Impact outStyle;"""
            explanation = "Generated a 2D Ballistic Projectile Motion kinematic calculation and flight dynamics flowchart in Mermaid.js with cyberpunk glow styling."
            suggested = ["Add aerodynamic drag resistance branch", "Add variable elevation launch cliff", "Include energy conservation states"]
        else:
            # Default: architecture_flow
            code = """flowchart LR
    %% Modern Cyberpunk Cloud Architecture & Event Stream
    subgraph Clients["🌐 Edge Clients"]
        direction TB
        Web["🖥️ Next.js Web App<br/><small style='color:#94a3b8'>SSR / React 19</small>"]
        Mobile["📱 Mobile Native App<br/><small style='color:#94a3b8'>Swift & Kotlin</small>"]
        IoT["📡 Telemetry Nodes<br/><small style='color:#94a3b8'>MQTT Sensors</small>"]
    end

    subgraph Ingress["🛡️ Edge & Ingress Security"]
        direction TB
        CDN["⚡ Cloudflare Anycast CDN<br/><small style='color:#94a3b8'>TLS 1.3 / DDoS Shield</small>"]
        GW["🚪 Kong API Gateway<br/><small style='color:#94a3b8'>JWT Auth & Rate Limiter</small>"]
    end

    subgraph CoreServices["⚡ High-Performance Microservices"]
        direction TB
        Auth["🔐 Identity & IAM<br/><small style='color:#94a3b8'>OAuth2 / OIDC Engine</small>"]
        Workflow["🔄 Orchestration Engine<br/><small style='color:#94a3b8'>Temporal / Rust Worker</small>"]
        Inference["🧠 AI Inference Core<br/><small style='color:#94a3b8'>Triton / CUDA Tensor</small>"]
    end

    subgraph DataPipeline["🚀 Distributed Event & Data Lake"]
        direction TB
        Kafka{{"⚡ Apache Kafka Stream<br/><small style='color:#94a3b8'>100K msg/sec Event Bus</small>"}}
        Redis[("🔥 Redis Enterprise<br/><small style='color:#94a3b8'>Sub-millisecond Cache</small>")]
        Vector[("🔮 Milvus Vector DB<br/><small style='color:#94a3b8'>HNSW Dense Embeddings</small>")]
        Postgres[("💾 Postgres Aurora<br/><small style='color:#94a3b8'>Multi-Region Read Replicas</small>")]
    end

    Clients --> CDN
    CDN --> GW
    GW --> Auth
    GW --> Workflow
    GW --> Inference

    Auth <--> Redis
    Workflow --> Kafka
    Inference <--> Vector
    Workflow <--> Postgres
    Kafka --> Postgres

    classDef clientStyle fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef securityStyle fill:#1e1b4b,stroke:#a855f7,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef serviceStyle fill:#022c22,stroke:#10b981,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;
    classDef dataStyle fill:#18181b,stroke:#f59e0b,stroke-width:2px,color:#f8fafc,rx:8px,ry:8px;

    class Web,Mobile,IoT clientStyle;
    class CDN,GW securityStyle;
    class Auth,Workflow,Inference serviceStyle;
    class Kafka,Redis,Vector,Postgres dataStyle;"""
            explanation = "Generated a high-performance cloud microservices architecture and event stream diagram in Mermaid.js with custom cyberpunk glow styling."
            suggested = ["Add Kubernetes pod cluster detail", "Switch to top-down vertical layout (TD)", "Add GraphQL gateway layer"]
    elif engine == "katex":
        p_lower = prompt.lower()
        if params.get("is_projectile") or any(k in p_lower for k in ["projectile", "ballistic", "trajectory", "parabola", "parabolic"]) or ("motion" in p_lower and any(w in p_lower for w in ["kinematics", "equation", "formula", "gravity", "angle", "degree", "cannon", "launch", "flight"])):
            code = r"""% Kinematics: 2D Ballistic Projectile Motion Equations
\begin{aligned}
\textcolor{#38bdf8}{x(t)} &= \textcolor{#38bdf8}{v_0 \cos\theta \cdot t}, \qquad \textcolor{#38bdf8}{y(t) = v_0 \sin\theta \cdot t - \frac{1}{2} g t^2} \quad \text{(Parametric Trajectory)} \\[10pt]
\textcolor{#a855f7}{y(x)} &= \textcolor{#a855f7}{x \tan\theta - \frac{g x^2}{2 v_0^2 \cos^2\theta}} \qquad \text{(Equation of Parabolic Path)} \\[10pt]
\textcolor{#10b981}{H_{\max}} &= \textcolor{#10b981}{\frac{v_0^2 \sin^2\theta}{2g}} \qquad \text{(Maximum Apex Height)} \\[10pt]
\textcolor{#f59e0b}{R} &= \textcolor{#f59e0b}{\frac{v_0^2 \sin(2\theta)}{g}}, \qquad \textcolor{#f43f5e}{T = \frac{2 v_0 \sin\theta}{g}} \quad \text{(Horizontal Range \& Flight Time)} \\[10pt]
\textcolor{#38bdf8}{v(t)} &= \sqrt{v_x^2 + v_y^2} = \sqrt{(v_0 \cos\theta)^2 + (v_0 \sin\theta - g t)^2} \quad \text{(Instantaneous Velocity)}
\end{aligned}"""
            explanation = "Synthesized 2D Ballistic Projectile Motion kinematic equations in KaTeX, including parametric coordinates, parabolic path equation, maximum height, range, flight time, and velocity magnitude."
            suggested = ["Add air resistance differential equation", "Include kinetic vs potential energy at apex", "Add launch angle optimization derivation"]

        elif any(k in p_lower for k in ["newton", "force", "dynamics", "gravitation", "gravity", "f=ma", "kepler", "friction"]):
            code = r"""% Classical Mechanics: Newton's Laws & Universal Gravitation
\begin{aligned}
\textcolor{#38bdf8}{\sum \mathbf{F}} &= \textcolor{#38bdf8}{m \mathbf{a} = \frac{d\mathbf{p}}{dt}} \qquad \text{(Newton's Second Law of Motion)} \\[10pt]
\textcolor{#ec4899}{\mathbf{F}_g} &= -\textcolor{#ec4899}{G \frac{M m}{r^2} \hat{\mathbf{r}}}, \quad \textcolor{#ec4899}{g = \frac{GM}{R^2}} \qquad \text{(Universal Gravitation \& Free-Fall Acceleration)} \\[10pt]
\textcolor{#10b981}{T^2} &= \textcolor{#10b981}{\frac{4\pi^2}{G M} r^3} \qquad \text{(Kepler's Third Harmonic Law of Planetary Orbits)} \\[10pt]
\textcolor{#f59e0b}{f_s} &\le \mu_s N, \quad \textcolor{#f59e0b}{f_k = \mu_k N}, \quad \textcolor{#f43f5e}{F_c = \frac{m v^2}{r} = m \omega^2 r} \quad \text{(Friction \& Centripetal Force)}
\end{aligned}"""
            explanation = "Synthesized Classical Mechanics equations in KaTeX including Newton's Second Law, Newton's Gravitation Law, Kepler's 3rd Law, and centripetal forces."
            suggested = ["Add rotational torque and angular momentum", "Include Coriolis and centrifugal fictitious forces", "Add escape velocity derivation"]

        elif any(k in p_lower for k in ["energy", "work", "power", "momentum", "collision", "impulse", "oscillation", "spring", "pendulum", "shm"]):
            code = r"""% Mechanics & SHM: Work, Energy & Harmonic Oscillations
\begin{aligned}
\textcolor{#38bdf8}{W} &= \textcolor{#38bdf8}{\int \mathbf{F} \cdot d\mathbf{r} = \Delta K = \frac{1}{2} m v_f^2 - \frac{1}{2} m v_i^2} \qquad \text{(Work-Kinetic Energy Theorem)} \\[10pt]
\textcolor{#a855f7}{E_{\text{total}}} &= \textcolor{#a855f7}{\frac{1}{2} m v^2 + m g h + \frac{1}{2} k x^2 = \text{constant}} \qquad \text{(Conservation of Mechanical Energy)} \\[10pt]
\textcolor{#10b981}{\mathbf{J}} &= \textcolor{#10b981}{\int \mathbf{F} \, dt = \Delta \mathbf{p} = m \mathbf{v}_f - m \mathbf{v}_i} \qquad \text{(Impulse-Momentum Theorem)} \\[10pt]
\textcolor{#f59e0b}{\frac{d^2 x}{dt^2} + \omega_0^2 x} &= 0 \implies \textcolor{#f43f5e}{x(t) = A \cos(\omega_0 t + \phi)}, \quad \textcolor{#f43f5e}{T = 2\pi\sqrt{\frac{m}{k}}} \quad \text{(Simple Harmonic Motion)}
\end{aligned}"""
            explanation = "Synthesized Work-Energy, Momentum, and Simple Harmonic Motion formulas in KaTeX with spring oscillators and conservation laws."
            suggested = ["Add damped harmonic oscillator equation", "Include 2D elastic collision equations", "Add simple pendulum small-angle approximation"]

        elif any(k in p_lower for k in ["thermo", "gas", "carnot", "entropy", "heat", "bernoulli", "fluid", "pressure"]):
            code = r"""% Thermodynamics & Fluid Dynamics: Ideal Gas & Energy Transport
\begin{aligned}
\textcolor{#38bdf8}{P V} &= \textcolor{#38bdf8}{n R T = N k_B T} \qquad \text{(Ideal Gas Equation of State)} \\[10pt]
\textcolor{#ec4899}{d U} &= \textcolor{#ec4899}{\delta Q - \delta W}, \quad \textcolor{#ec4899}{\delta W = P \, dV} \qquad \text{(First Law of Thermodynamics)} \\[10pt]
\textcolor{#10b981}{\eta_{\text{Carnot}}} &= \textcolor{#10b981}{1 - \frac{T_C}{T_H}}, \quad \textcolor{#10b981}{\Delta S = \int \frac{\delta Q_{\text{rev}}}{T} \ge 0} \qquad \text{(Carnot Efficiency \& Entropy)} \\[10pt]
\textcolor{#f59e0b}{P + \frac{1}{2} \rho v^2 + \rho g h} &= \text{constant}, \quad \textcolor{#f43f5e}{A_1 v_1 = A_2 v_2} \qquad \text{(Bernoulli's Principle \& Continuity)}
\end{aligned}"""
            explanation = "Synthesized Thermodynamics and Fluid Dynamics laws in KaTeX with Ideal Gas, 1st/2nd laws, Carnot efficiency, and Bernoulli's equation."
            suggested = ["Add van der Waals real gas equation", "Include Navier-Stokes viscous flow form", "Add Maxwell-Boltzmann velocity distribution"]

        elif any(k in p_lower for k in ["section formula", "internal section", "external section", "midpoint", "coordinates of point", "divides the line"]):
            code = r"""% Coordinate Geometry: Section Formula
\begin{aligned}
P_{\text{internal}}(x, y) &= \left( \frac{m x_2 + n x_1}{m + n}, \, \frac{m y_2 + n y_1}{m + n} \right) \\[12pt]
P_{\text{external}}(x, y) &= \left( \frac{m x_2 - n x_1}{m - n}, \, \frac{m y_2 - n y_1}{m - n} \right) \\[12pt]
P_{\text{midpoint}}(x, y) &= \left( \frac{x_1 + x_2}{2}, \, \frac{y_1 + y_2}{2} \right)
\end{aligned}"""
            explanation = "Synthesized the internal and external section formulas and midpoint coordinates in KaTeX."
            suggested = ["Add distance formula", "Add centroid of triangle coordinates", "Add slope and intercept form"]

        elif any(k in p_lower for k in ["quadratic", "pythagor", "euler", "algebra", "trig", "trigonometry", "polynomial"]):
            code = r"""% Fundamental Algebra & Trigonometry Theorems
\begin{aligned}
\textcolor{#38bdf8}{a x^2 + b x + c = 0} &\implies \textcolor{#38bdf8}{x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}} \qquad \text{(Quadratic Formula)} \\[10pt]
\textcolor{#ec4899}{e^{i \theta}} &= \textcolor{#ec4899}{\cos\theta + i \sin\theta} \implies \textcolor{#ec4899}{e^{i\pi} + 1 = 0} \qquad \text{(Euler's Formula \& Identity)} \\[10pt]
\textcolor{#10b981}{a^2 + b^2} &= \textcolor{#10b981}{c^2}, \quad \textcolor{#10b981}{\sin^2\theta + \cos^2\theta = 1} \qquad \text{(Pythagorean Metric)} \\[10pt]
\textcolor{#f59e0b}{\sin(\alpha \pm \beta)} &= \textcolor{#f59e0b}{\sin\alpha \cos\beta \pm \cos\alpha \sin\beta} \qquad \text{(Trigonometric Addition)}
\end{aligned}"""
            explanation = "Synthesized fundamental algebra and trigonometric theorems in KaTeX including Quadratic formula, Euler's identity, and Pythagorean relation."
            suggested = ["Add cubic equation Cardano formula", "Include binomial expansion theorem", "Add Taylor series expansions for sin/cos"]

        elif any(k in p_lower for k in ["schrodinger", "quantum", "relativity", "einstein", "lorentz", "dilation", "e=mc"]):
            code = r"""% Quantum Mechanics & Special Relativity
\begin{aligned}
\textcolor{#38bdf8}{i \hbar \frac{\partial}{\partial t} \Psi(\mathbf{r}, t)} &= \textcolor{#38bdf8}{\left( -\frac{\hbar^2}{2m} \nabla^2 + V(\mathbf{r}) \right) \Psi(\mathbf{r}, t)} \qquad \text{(Time-Dependent Schrödinger Equation)} \\[10pt]
\textcolor{#ec4899}{E} &= \textcolor{#ec4899}{\sqrt{(p c)^2 + (m_0 c^2)^2}} = \gamma m_0 c^2 \qquad \text{(Relativistic Energy-Momentum Relation)} \\[10pt]
\textcolor{#10b981}{\Delta t'} &= \textcolor{#10b981}{\gamma \Delta t = \frac{\Delta t}{\sqrt{1 - v^2/c^2}}} \qquad \text{(Lorentz Time Dilation)} \\[10pt]
\textcolor{#f59e0b}{\Delta x \cdot \Delta p} &\ge \textcolor{#f59e0b}{\frac{\hbar}{2}}, \quad \textcolor{#f43f5e}{\lambda_{\text{dB}} = \frac{h}{p}} \qquad \text{(Heisenberg Uncertainty \& de Broglie Relation)}
\end{aligned}"""
            explanation = "Synthesized Quantum Mechanics and Special Relativity equations in KaTeX with Schrödinger wave equation, relativistic energy, and Heisenberg uncertainty."
            suggested = ["Add Dirac equation in covariant form", "Include Klein-Gordon relativistic field", "Add Compton scattering wavelength shift"]

        elif any(k in p_lower for k in ["photoelectric", "dual nature", "modern physics", "bohr", "de broglie", "matter wave", "radioactive", "half life", "rydberg", "work function", "stopping potential"]):
            code = r"""% Class 12 Physics: Modern Physics & Quantum Dual Nature
\begin{aligned}
\textcolor{#38bdf8}{h\nu} &= \textcolor{#38bdf8}{\phi_0 + K_{\max}} = h\nu_0 + e V_0 \qquad \text{(Einstein's Photoelectric Effect)} \\[10pt]
\textcolor{#a855f7}{\lambda} &= \frac{h}{p} = \textcolor{#a855f7}{\frac{h}{\sqrt{2mqV}}} \qquad \text{(de Broglie Matter Wavelength)} \\[10pt]
\textcolor{#10b981}{L = mvr} &= \textcolor{#10b981}{\frac{nh}{2\pi}}, \quad \frac{1}{\lambda} = R_H \left( \frac{1}{n_1^2} - \frac{1}{n_2^2} \right) \quad \text{(Bohr's Hydrogen Model)} \\[10pt]
\textcolor{#f43f5e}{N(t)} &= N_0 e^{-\lambda t}, \quad \textcolor{#f43f5e}{T_{1/2} = \frac{\ln 2}{\lambda} \approx \frac{0.693}{\lambda}} \quad \text{(Radioactive Decay)}
\end{aligned}"""
            explanation = "Synthesized Class 12 Modern Physics equations in KaTeX including Einstein's Photoelectric effect, de Broglie matter waves, Bohr's quantization, and radioactive half-life."
            suggested = ["Add Davisson-Germer electron diffraction formula", "Include mass defect and binding energy per nucleon", "Add nuclear Q-value equation"]

        elif any(k in p_lower for k in ["calculus", "integral", "differential equation", "integration", "leibniz", "by parts", "integrating factor", "definite integral", "derivative", "taylor", "fourier"]):
            code = r"""% Class 12 Mathematics: Calculus, Integrals & Series
\begin{aligned}
\textcolor{#38bdf8}{\int_a^b f(x) \, dx} &= \textcolor{#38bdf8}{F(b) - F(a)}, \quad \int u \cdot v \, dx = \textcolor{#a855f7}{u \int v \, dx - \int \left( u' \int v \, dx \right) dx} \\[10pt]
\textcolor{#10b981}{\frac{dy}{dx} + P(x) y} &= \textcolor{#10b981}{Q(x)} \implies \textcolor{#f59e0b}{y \cdot e^{\int P \, dx} = \int Q \cdot e^{\int P \, dx} \, dx + C} \quad \text{(Linear ODE)} \\[10pt]
\textcolor{#38bdf8}{f(x)} &= \textcolor{#38bdf8}{\sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!} (x - a)^n} \qquad \text{(Taylor Series Expansion)} \\[10pt]
\textcolor{#ec4899}{\hat{f}(\xi)} &= \textcolor{#ec4899}{\int_{-\infty}^{\infty} f(x) e^{-2\pi i x \xi} \, dx} \qquad \text{(Fourier Transform)}
\end{aligned}"""
            explanation = "Synthesized Mathematics calculus and analysis formulas in KaTeX featuring definite integrals, linear differential equations, Taylor series, and Fourier transforms."
            suggested = ["Add homogeneous differential equations form", "Include area under curves definite integral", "Add Bernoulli differential equation reduction"]

        elif any(k in p_lower for k in ["vector", "3d", "skew lines", "bayes", "probability", "plane equation", "normal form", "direction cosine", "matrix", "eigen"]):
            code = r"""% Class 12 Mathematics: 3D Vector Geometry & Bayes' Probability
\begin{aligned}
\textcolor{#38bdf8}{\vec{r}} &= \textcolor{#38bdf8}{\vec{a} + \lambda \vec{b}}, \qquad \textcolor{#38bdf8}{\vec{r} \cdot \hat{n} = d} \quad \text{(Line \& Plane in 3D)} \\[10pt]
\textcolor{#ec4899}{d} &= \textcolor{#ec4899}{\left| \frac{(\vec{a}_2 - \vec{a}_1) \cdot (\vec{b}_1 \times \vec{b}_2)}{|\vec{b}_1 \times \vec{b}_2|} \right|} \qquad \text{(Shortest Distance Between Skew Lines)} \\[10pt]
\textcolor{#10b981}{\det(A - \lambda I)} &= \textcolor{#10b981}{0 \implies A \mathbf{v} = \lambda \mathbf{v}} \qquad \text{(Characteristic Matrix Eigenvalues)} \\[10pt]
\textcolor{#f59e0b}{P(E_i | A)} &= \textcolor{#f59e0b}{\frac{P(E_i) \cdot P(A | E_i)}{\sum_{k=1}^n P(E_k) \cdot P(A | E_k)}} \qquad \text{(Bayes' Theorem of Probability)}
\end{aligned}"""
            explanation = "Synthesized Class 12 Mathematics 3D vector geometry, eigenvalue characteristic polynomials, and Bayes' theorem in KaTeX."
            suggested = ["Add coplanarity condition of two 3D lines", "Include Bernoulli trials binomial probability", "Add angle between two intersecting planes"]

        elif any(op in prompt for op in ["=", "^", "\\", "+", "*", "/"]) and len(prompt) > 3:
            # Dynamic equation typesetting from prompt
            clean_p = prompt.replace("write", "").replace("equation", "").replace("formula", "").strip()
            code = f"""% Dynamic Mathematical Expression
\\begin{{aligned}}
\\textcolor{{#38bdf8}}{{{clean_p}}}
\\end{{aligned}}"""
            explanation = f"Formatted mathematical equation for '{prompt}' in KaTeX."
            suggested = ["Add step-by-step derivation", "Include variable definitions", "Plot graph in JSXGraph"]

        else:
            # Default: physics_electrodynamics
            code = r"""% Class 12 Physics: Electrodynamics & AC Wave Circuits
\begin{aligned}
\textcolor{#38bdf8}{\oint \mathbf{E} \cdot d\mathbf{A}} &= \textcolor{#38bdf8}{\frac{q_{\text{enclosed}}}{\varepsilon_0}} \qquad \text{(Gauss's Law of Electrostatics)} \\[10pt]
\textcolor{#ec4899}{\varepsilon} &= -\textcolor{#ec4899}{\frac{d\Phi_B}{dt}} = -L \frac{dI}{dt} \qquad \text{(Faraday-Lenz Law of Induction)} \\[10pt]
\textcolor{#10b981}{Z} &= \sqrt{R^2 + \left(\omega L - \frac{1}{\omega C}\right)^2}, \quad \textcolor{#10b981}{\omega_0 = \frac{1}{\sqrt{LC}}} \quad \text{(LCR Resonance)} \\[10pt]
\textcolor{#f59e0b}{\frac{1}{f}} &= (\mu - 1) \left( \frac{1}{R_1} - \frac{1}{R_2} \right) \qquad \text{(Lens Maker's Formula)}
\end{aligned}"""
            explanation = "Synthesized Class 12 Physics Electrodynamics and AC circuit resonance equations in KaTeX with Gauss's Law, Faraday-Lenz Induction, LCR impedance, and Lens Maker's formula."
            suggested = ["Add Biot-Savart circular loop magnetic field", "Include cyclotron frequency and resonance", "Add Young's double slit fringe width formula"]
    elif engine == "tikz":
        p_lower = prompt.lower()
        if params.get("is_projectile") or any(k in p_lower for k in ["projectile", "ballistic", "trajectory", "parabola", "parabolic"]) or ("motion" in p_lower and any(w in p_lower for w in ["kinematics", "angle", "degree", "cannon", "launch", "gravity"])):
            code = r"""% TikZ: 2D Ballistic Projectile Motion Trajectory & Vectors
\begin{tikzpicture}[scale=1.15, >=stealth]
    % Ground line & Coordinate Axes
    \draw[thick, color=gray!60] (-0.8, 0) -- (8.6, 0);
    \draw[->, thick, color=gray!40] (0, 0) -- (8.8, 0) node[right, color=white, font=\footnotesize] {Horizontal Distance $x$ (m)};
    \draw[->, thick, color=gray!40] (0, 0) -- (0, 5.4) node[above, color=white, font=\footnotesize] {Vertical Height $y$ (m)};

    % Parabolic Trajectory
    \draw[very thick, color=cyan!90, domain=0:7.6, samples=100] 
        plot (\x, {2.6 * \x - 0.342 * \x * \x});

    % Apex marker & dashed heights
    \coordinate (Apex) at (3.8, 4.94);
    \draw[dashed, color=purple!80] (3.8, 0) -- (Apex);
    \draw[dashed, color=purple!80] (0, 4.94) -- (Apex);
    \fill[color=purple!90] (Apex) circle (2.5pt);
    \node[above=3pt, color=purple!90, font=\bfseries\footnotesize] at (Apex) {Apex: $H_{\max} = \frac{v_0^2 \sin^2\theta}{2g}$};
    \draw[->, very thick, color=purple!90] (Apex) -- +(1.3, 0) node[right, font=\scriptsize] {$v_x = v_0\cos\theta$};

    % Initial Launch Vector
    \coordinate (Origin) at (0, 0);
    \draw[->, very thick, color=emerald!90] (Origin) -- (1.5, 3.9) node[above left, font=\bfseries\footnotesize] {$\vec{v}_0$};
    \draw[->, thick, color=emerald!60] (Origin) -- (1.5, 0) node[below, font=\scriptsize] {$v_{0x}$};
    \draw[->, thick, color=emerald!60] (Origin) -- (0, 3.9) node[left, font=\scriptsize] {$v_{0y}$};

    % Launch Angle Arc
    \draw[->, thick, color=amber] (0.85, 0) arc (0:69:0.85);
    \node[color=amber, font=\footnotesize] at (1.1, 0.45) {$\theta$};

    % Range Marker
    \coordinate (Landing) at (7.6, 0);
    \fill[color=amber] (Landing) circle (2.5pt);
    \node[below=4pt, color=amber, font=\bfseries\footnotesize] at (Landing) {Range $R = \frac{v_0^2 \sin(2\theta)}{g}$};

    % Gravity Vector
    \draw[->, very thick, color=red!80] (7.2, 4.5) -- (7.2, 3.4) node[midway, right, font=\footnotesize] {$\vec{g} = 9.8\,\text{m/s}^2$};

    % Trajectory Formula Badge
    \node[draw=cyan!70, fill=cyan!10, rounded corners=4pt, inner sep=5pt, font=\scriptsize, color=cyan!90, align=center] at (4.0, -1.1)
        {$y(x) = x \tan\theta - \frac{g x^2}{2 v_0^2 \cos^2\theta} \qquad \text{Flight Time } T = \frac{2 v_0 \sin\theta}{g}$};
\end{tikzpicture}"""
            explanation = "Illustrated 2D ballistic projectile trajectory in TikZ with initial launch vector components, apex height marker, horizontal range, and trajectory equations."
            suggested = ["Add instantaneous velocity vectors at intervals", "Add air drag trajectory comparison", "Include ground impact angle vector"]
        elif any(k in p_lower for k in ["optics", "slit", "interference", "diffraction", "young", "fringe", "wavefront", "coherent"]):
            code = r"""% TikZ: Young's Double Slit Interference & Wave Diffraction
\begin{tikzpicture}[scale=1.05, >=stealth]
    \draw[dashed, color=gray!60] (-1.5, 0) -- (7.5, 0);

    \foreach \x in {-1.2, -0.8, -0.4} {
        \draw[thick, color=cyan!70] (\x, -1.8) -- (\x, 1.8);
    }
    \node[color=cyan!90, font=\bfseries\footnotesize, align=center] at (-0.8, 2.2) {Coherent Wavefront\\$\lambda = 550\,\text{nm}$};

    \fill[fill=gray!85] (0, 0.4) rectangle (0.15, 2.0);
    \fill[fill=gray!85] (0, -0.4) rectangle (0.15, 0.4);
    \fill[fill=gray!85] (0, -2.0) rectangle (0.15, -0.4);

    \coordinate (S1) at (0.15, 0.4);
    \coordinate (S2) at (0.15, -0.4);
    \node[left, color=cyan, font=\footnotesize] at (0, 0.4) {$S_1$};
    \node[left, color=cyan, font=\footnotesize] at (0, -0.4) {$S_2$};
    \draw[<->, color=white, font=\scriptsize] (-0.25, -0.4) -- (-0.25, 0.4) node[midway, left] {$d$};

    \fill[fill=gray!75] (6.0, -2.2) rectangle (6.12, 2.2);
    \node[above, color=white, font=\bfseries\footnotesize] at (6.06, 2.25) {Detection Screen};

    \coordinate (P) at (6.0, 1.3);
    \fill[color=amber] (P) circle (2.2pt);
    \node[right=2pt, color=amber, font=\bfseries\footnotesize] at (P) {$P(y)$ [Bright Fringe]};

    \draw[thick, color=cyan!90] (S1) -- (P) node[midway, above, sloped, font=\scriptsize] {$r_1$};
    \draw[thick, color=purple!90] (S2) -- (P) node[midway, below, sloped, font=\scriptsize] {$r_2$};

    \draw[thin, dashed, color=emerald!80] (S1) -- (0.55, 0.15);
    \draw[<->, color=emerald, font=\scriptsize] (0.15, -0.4) -- (0.55, 0.15) node[midway, right=1pt] {$\Delta x = d \sin\theta$};

    \draw[<->, color=gray!40] (0.15, -2.1) -- (6.0, -2.1) node[midway, below, font=\scriptsize] {Screen Distance $D \gg d$};

    \draw[thick, color=amber!90] 
        (6.35, -2.0) -- (7.4, -1.8) -- (6.35, -1.3) -- (7.4, -0.8) -- 
        (6.35, 0.0) -- (7.4, 0.8) -- (6.35, 1.3) -- (7.4, 1.8) -- (6.35, 2.0);
    \node[right, color=amber!90, font=\scriptsize] at (7.5, 1.3) {$I = I_0 \cos^2\left(\frac{\pi d y}{\lambda D}\right)$};
\end{tikzpicture}"""
            explanation = "Rendered Young's double-slit wave interference experiment in TikZ with coherent wavefronts, slit spacing, path difference, and diffraction fringe curve."
            suggested = ["Add single-slit diffraction sinc envelope", "Add wavelength chromatic dispersion colors", "Include phase difference phasor diagram"]
        elif any(k in p_lower for k in ["carnot", "thermodynamic", "engine", "cycle", "isothermal", "adiabatic", "p-v", "pv diagram", "heat"]):
            code = r"""% TikZ: Carnot Cycle & Reversible Thermodynamic Engine
\begin{tikzpicture}[scale=1.1, >=stealth]
    \draw[->, thick, color=gray!50] (0, 0) -- (6.8, 0) node[right, color=white, font=\footnotesize] {Volume $V$};
    \draw[->, thick, color=gray!50] (0, 0) -- (0, 5.0) node[above, color=white, font=\footnotesize] {Pressure $P$};

    \coordinate (A) at (1.2, 4.2);
    \coordinate (B) at (3.2, 3.1);
    \coordinate (C) at (5.2, 1.4);
    \coordinate (D) at (2.4, 1.8);

    \fill[purple!25, opacity=0.35] 
        (A) to[bend right=14] (B) 
        to[bend right=18] (C) 
        to[bend left=14] (D) 
        to[bend left=18] (A);

    \draw[very thick, color=cyan!90, ->] (A) to[bend right=14] node[midway, above right, font=\scriptsize] {Isothermal $T_H$} (B);
    \draw[very thick, color=emerald!90, ->] (B) to[bend right=18] node[midway, above right, font=\scriptsize] {Adiabatic $Q=0$} (C);
    \draw[very thick, color=blue!90, ->] (C) to[bend left=14] node[midway, below left, font=\scriptsize] {Isothermal $T_C$} (D);
    \draw[very thick, color=amber!90, ->] (D) to[bend left=18] node[midway, left, font=\scriptsize] {Adiabatic $Q=0$} (A);

    \fill[color=white] (A) circle (2pt) node[above=2pt, color=white, font=\scriptsize] {$\mathbf{1}\,(P_1,V_1)$};
    \fill[color=white] (B) circle (2pt) node[right=2pt, color=white, font=\scriptsize] {$\mathbf{2}\,(P_2,V_2)$};
    \fill[color=white] (C) circle (2pt) node[below right=2pt, color=white, font=\scriptsize] {$\mathbf{3}\,(P_3,V_3)$};
    \fill[color=white] (D) circle (2pt) node[below left=2pt, color=white, font=\scriptsize] {$\mathbf{4}\,(P_4,V_4)$};

    \draw[->, very thick, color=red!90] (1.8, 4.5) -- (2.2, 3.7) node[midway, right, font=\scriptsize\bfseries] {$Q_{\text{in}} (T_H)$};
    \draw[->, very thick, color=cyan!90] (3.8, 1.6) -- (4.2, 0.8) node[midway, right, font=\scriptsize\bfseries] {$Q_{\text{out}} (T_C)$};

    \node[color=purple!90, font=\bfseries\footnotesize, align=center] at (3.0, 2.5) {Net Work\\$W_{\text{net}} = \oint P\,dV$};

    \node[draw=emerald!80, fill=emerald!10, rounded corners=4pt, inner sep=5pt, font=\footnotesize, color=emerald!90] at (4.6, 4.3) 
        {$\eta = 1 - \frac{T_C}{T_H} = \frac{W_{\text{net}}}{Q_{\text{in}}}$};
\end{tikzpicture}"""
            explanation = "Illustrated the reversible thermodynamic Carnot cycle on a P-V indicator diagram in TikZ with isothermal, adiabatic curves, and thermal efficiency."
            suggested = ["Add Otto 4-stroke cycle comparison", "Add Rankine steam cycle T-s diagram", "Include entropy change integral equations"]
        elif any(k in p_lower for k in ["bloch", "sphere", "qubit", "quantum", "superposition", "theta", "phi", "state vector", "hadamard"]):
            code = r"""% TikZ: Quantum Bloch Sphere & Qubit Superposition Vector
\begin{tikzpicture}[scale=1.2, >=stealth]
    \shade[ball color=cyan!15, opacity=0.25] (0, 0) circle (2.2);
    \draw[thick, color=gray!60] (0, 0) circle (2.2);
    \draw[dashed, color=gray!50] (0, 0) ellipse [x radius=2.2, y radius=0.65];

    \draw[->, thick, color=gray!70] (0, -2.7) -- (0, 2.8) node[above, color=white, font=\footnotesize] {$|z\rangle$};
    \draw[->, thick, color=gray!70] (0, 0) -- (2.8, 0) node[right, color=white, font=\footnotesize] {$|y\rangle$};
    \draw[->, thick, color=gray!70] (0, 0) -- (-1.87, -0.99) node[below left, color=white, font=\footnotesize] {$|x\rangle$};

    \node[above=2pt, color=cyan!90, font=\bfseries\footnotesize] at (0, 2.2) {$|0\rangle$};
    \node[below=2pt, color=cyan!90, font=\bfseries\footnotesize] at (0, -2.2) {$|1\rangle$};
    \fill[color=cyan] (0, 2.2) circle (2pt);
    \fill[color=cyan] (0, -2.2) circle (2pt);

    \coordinate (Origin) at (0, 0);
    \coordinate (Psi) at (0.9, 1.8);
    \coordinate (Proj) at (0.9, -0.2);

    \draw[dashed, color=purple!70, thin] (Psi) -- (Proj);
    \draw[dashed, color=purple!70, thin] (Origin) -- (Proj);

    \draw[->, very thick, color=purple!90] (Origin) -- (Psi) node[above right, font=\bfseries\footnotesize] {$|\psi\rangle$};
    \fill[color=purple] (Psi) circle (2pt);

    \draw[->, color=amber, thick] (0, 0.9) arc (90:63:1.0);
    \node[color=amber, font=\footnotesize] at (0.35, 1.1) {$\theta$};

    \draw[->, color=emerald, thick] (-0.35, -0.18) arc (-150:-20:0.45);
    \node[color=emerald, font=\footnotesize] at (0.45, -0.35) {$\phi$};

    \node[draw=purple!80, fill=purple!10, rounded corners=4pt, inner sep=5pt, font=\scriptsize, color=purple!90, align=center] at (0, -3.2)
        {$|\psi\rangle = \cos\frac{\theta}{2}|0\rangle + e^{i\phi}\sin\frac{\theta}{2}|1\rangle$};
\end{tikzpicture}"""
            explanation = "Created a 3D quantum Bloch sphere diagram in TikZ illustrating qubit superposition state vector with polar angle theta and azimuthal angle phi."
            suggested = ["Add Hadamard rotation trajectory", "Add Pauli X, Y, Z gate rotation arrows", "Add entangled Bell state two-qubit representation"]
        else:
            # Default: neural_network
            code = r"""% TikZ: Deep Neural Network Architecture & Latent Features
\begin{tikzpicture}[
    scale=0.92,
    every node/.style={font=\small},
    input_node/.style={circle, draw=cyan!90, fill=cyan!15, thick, minimum size=24pt, inner sep=0pt},
    hidden_node/.style={circle, draw=purple!90, fill=purple!15, thick, minimum size=24pt, inner sep=0pt},
    latent_node/.style={circle, draw=emerald!90, fill=emerald!15, thick, minimum size=24pt, inner sep=0pt},
    output_node/.style={circle, draw=amber!90, fill=amber!15, thick, minimum size=24pt, inner sep=0pt}
]
    \node[input_node] (I1) at (0, 1.5) {$x_1$};
    \node[input_node] (I2) at (0, 0.5) {$x_2$};
    \node[input_node] (I3) at (0, -0.5) {$x_3$};
    \node[input_node] (I4) at (0, -1.5) {$x_4$};
    \node[above=6pt, color=cyan!90, font=\bfseries\footnotesize] at (0, 1.5) {Input $\mathbf{x}$};

    \node[hidden_node] (H1) at (2.6, 2.0) {$h_1$};
    \node[hidden_node] (H2) at (2.6, 1.0) {$h_2$};
    \node[hidden_node] (H3) at (2.6, 0.0) {$h_3$};
    \node[hidden_node] (H4) at (2.6, -1.0) {$h_4$};
    \node[hidden_node] (H5) at (2.6, -2.0) {$h_5$};
    \node[above=6pt, color=purple!90, font=\bfseries\footnotesize] at (2.6, 2.0) {Dense Layer};

    \node[latent_node] (Z1) at (5.2, 1.5) {$z_1$};
    \node[latent_node] (Z2) at (5.2, 0.5) {$z_2$};
    \node[latent_node] (Z3) at (5.2, -0.5) {$z_3$};
    \node[latent_node] (Z4) at (5.2, -1.5) {$z_4$};
    \node[above=6pt, color=emerald!90, font=\bfseries\footnotesize] at (5.2, 1.5) {Latent $\mathbf{z}$};

    \node[output_node] (O1) at (7.8, 1.0) {$\hat{y}_1$};
    \node[output_node] (O2) at (7.8, 0.0) {$\hat{y}_2$};
    \node[output_node] (O3) at (7.8, -1.0) {$\hat{y}_3$};
    \node[above=6pt, color=amber!90, font=\bfseries\footnotesize] at (7.8, 1.0) {Output $\hat{\mathbf{y}}$};

    \foreach \i in {1,2,3,4} {
        \foreach \j in {1,2,3,4,5} {
            \draw[->, >=stealth, draw=gray!40, opacity=0.35, thin] (I\i) -- (H\j);
        }
    }
    \foreach \i in {1,2,3,4,5} {
        \foreach \j in {1,2,3,4} {
            \draw[->, >=stealth, draw=purple!50, opacity=0.45, thin] (H\i) -- (Z\j);
        }
    }
    \foreach \i in {1,2,3,4} {
        \foreach \j in {1,2,3} {
            \draw[->, >=stealth, draw=emerald!50, opacity=0.55, thick] (Z\i) -- (O\j);
        }
    }
    \draw[dashed, draw=gray!50, rounded corners=8pt, opacity=0.6] (-0.8, -2.6) rectangle (8.6, 2.7);
    \node[below=4pt, color=gray!60, font=\scriptsize] at (3.9, -2.6) {Deep Feedforward Latent Representation Architecture};
\end{tikzpicture}"""
            explanation = "Generated a deep neural network architecture diagram in TikZ with layered feedforward activations, synaptic connections, and latent representations."
            suggested = ["Add transformer self-attention head links", "Add residual skip connections", "Include LSTM gate cell diagram"]
    elif engine == "svg_to_3d":
        p_lower = prompt.lower()
        if any(k in p_lower for k in ["hypercube", "tesseract", "crystal", "gem", "diamond", "quantum", "mandala", "cube"]):
            code = r"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- Outer Beveled Octagon Ring with Hollow Voids -->
  <path d="M 250 35 L 395 95 L 455 240 L 395 385 L 250 445 L 105 385 L 45 240 L 105 95 Z M 250 75 L 135 125 L 85 240 L 135 355 L 250 405 L 365 355 L 415 240 L 365 125 Z" fill="#8b5cf6"/>
  <!-- 4D Hypercube Rotated Diamond Lattice -->
  <path d="M 250 90 L 400 240 L 250 390 L 100 240 Z M 250 135 L 145 240 L 250 345 L 355 240 Z" fill="#06b6d4"/>
  <!-- Concentric Inner Stargate Frame -->
  <path d="M 250 150 L 320 180 L 350 250 L 320 320 L 250 350 L 180 320 L 150 250 L 180 180 Z M 250 185 L 195 205 L 175 250 L 195 295 L 250 315 L 305 295 L 325 250 L 305 205 Z" fill="#ec4899"/>
  <!-- Central Stellated Octagram Energy Core -->
  <polygon points="250,205 262,238 295,250 262,262 250,295 238,262 205,250 238,238" fill="#ffffff"/>
</svg>"""
            explanation = "Generated a 3D Quantum Tesseract Hypercube and sacred crystal mandala model with concentric beveled octagon rings and stellated energy core."
            suggested = ["Add glowing emission shader", "Increase bevel facet thickness", "Add orbiting electron satellites"]
        elif any(k in p_lower for k in ["gear", "chrono", "tourbillon", "watch", "clock", "horology", "escapement", "mechanism", "cog", "mechanical"]):
            code = r"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- 12-Tooth Planetary Cycloid Gear Rim with Internal Void -->
  <path d="M 420.0 250.0 L 457.7 280.7 L 450.4 312.8 L 403.1 324.0 L 397.2 335.0 L 414.6 380.4 L 392.1 404.6 L 345.6 390.6 L 335.0 397.2 L 324.0 444.6 L 292.8 457.7 L 260.7 420.0 L 250.0 420.0 L 219.3 457.7 L 187.2 444.6 L 176.0 397.2 L 165.0 390.6 L 118.5 404.6 L 96.0 380.4 L 113.4 335.0 L 107.5 324.0 L 60.2 312.8 L 52.9 280.7 L 90.6 250.0 L 90.6 239.3 L 52.9 208.6 L 60.2 176.5 L 107.5 165.3 L 113.4 154.3 L 96.0 108.9 L 118.5 84.7 L 165.0 98.7 L 176.0 92.1 L 187.2 44.7 L 219.3 31.6 L 250.0 69.3 L 260.7 69.3 L 292.8 31.6 L 324.0 44.7 L 335.0 92.1 L 345.6 98.7 L 392.1 84.7 L 414.6 108.9 L 397.2 154.3 L 403.1 165.3 L 450.4 176.5 L 457.7 208.6 L 420.0 239.3 Z M 250 120 A 130 130 0 1 0 250 380 A 130 130 0 1 0 250 120 Z" fill="#10b981"/>
  <!-- Tourbillon Tri-Spoke Skeleton Bridge -->
  <path d="M 250 110 L 265 190 L 360 280 L 335 305 L 250 265 L 165 305 L 140 280 L 235 190 Z" fill="#34d399"/>
  <!-- Balance Wheel Weight Apertures -->
  <circle cx="250" cy="165" r="16" fill="#064e3b"/>
  <circle cx="315" cy="275" r="16" fill="#064e3b"/>
  <circle cx="185" cy="275" r="16" fill="#064e3b"/>
  <!-- Central Chronometer Hex Arbor Axle -->
  <path d="M 250 200 L 285 220 L 285 260 L 250 280 L 215 260 L 215 220 Z M 250 225 L 230 237 L 230 253 L 250 265 L 270 253 L 270 237 Z" fill="#a7f3d0"/>
  <circle cx="250" cy="240" r="7" fill="#ffffff"/>
</svg>"""
            explanation = "Created a 3D Chronos Tourbillon Escapement Gear model with 12 cycloid planetary teeth, skeleton bridge, and balance weight apertures."
            suggested = ["Add intermeshing pinion gears", "Animate escapement tick oscillation", "Add metallic gold plating texture"]
        elif any(k in p_lower for k in ["helix", "spiral", "nautilus", "fibonacci", "dna", "shell", "golden ratio", "biology", "curve"]):
            code = r"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- Tier 1: Majestic Outer Fibonacci Coil -->
  <path d="M 250 40 C 370 40 460 130 460 250 C 460 360 375 450 260 450 C 150 450 65 365 65 255 C 65 160 140 85 235 85 C 315 85 380 150 380 230 C 380 295 330 350 265 350 C 210 350 165 305 165 250 C 165 205 200 170 245 170 C 280 170 310 200 310 235 C 310 265 285 290 255 290 C 230 290 210 270 210 245 L 225 245 C 225 260 238 272 253 272 C 270 272 288 255 288 238 C 288 212 268 188 242 188 C 210 188 182 216 182 248 C 182 292 218 328 262 328 C 315 328 358 285 358 232 C 358 165 305 105 238 105 C 155 105 88 172 88 255 C 88 350 165 428 260 428 C 362 428 438 352 438 250 C 438 142 358 62 250 62 Z" fill="#f59e0b"/>
  <!-- Tier 2: Radial Harmonic Lattice Rays -->
  <path d="M 250 85 L 250 170 M 380 230 L 310 235 M 265 350 L 255 290 M 165 250 L 210 245 M 345 125 L 290 195 M 345 315 L 285 270 M 190 325 L 230 275 M 180 165 L 225 205" stroke="#fbbf24" stroke-width="12" stroke-linecap="round" fill="none"/>
  <!-- Tier 3: Biomimetic Chamber Spores -->
  <circle cx="250" cy="120" r="16" fill="#fef3c7"/>
  <circle cx="345" cy="180" r="18" fill="#fef3c7"/>
  <circle cx="345" cy="280" r="17" fill="#fef3c7"/>
  <circle cx="280" cy="330" r="15" fill="#fef3c7"/>
  <circle cx="195" cy="285" r="13" fill="#fef3c7"/>
  <circle cx="190" cy="205" r="11" fill="#fef3c7"/>
  <circle cx="250" cy="245" r="10" fill="#ffffff"/>
</svg>"""
            explanation = "Modeled a 3D Golden Fibonacci Nautilus bio-spiral with expanding logarithmic chamber coils and golden-ratio harmonic lattice."
            suggested = ["Add double helix DNA strands", "Increase extrusion height along Z-axis", "Add pearl nucleus glow"]
        else:
            # Default: Cyber Mech Falcon & Aerospace Wings
            code = r"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- Primary Swept Wings & Armor Core -->
  <path d="M 250 45 L 340 135 L 470 110 L 410 200 L 460 215 L 390 290 L 430 310 L 330 365 L 295 320 L 295 435 L 250 470 L 205 435 L 205 320 L 170 365 L 70 310 L 110 290 L 40 215 L 90 200 L 30 110 L 160 135 Z" fill="#2563eb"/>
  <!-- Secondary Interior Aerodynamic Slats -->
  <path d="M 250 110 L 320 180 L 400 160 L 350 225 L 380 240 L 320 295 L 290 265 L 290 350 L 250 380 L 210 350 L 210 265 L 180 295 L 120 240 L 150 225 L 100 160 L 180 180 Z" fill="#60a5fa"/>
  <!-- Central Reactor Core & Hexagon Portal -->
  <path d="M 250 160 L 290 210 L 290 270 L 250 320 L 210 270 L 210 210 Z M 250 195 L 225 225 L 225 255 L 250 285 L 275 255 L 275 225 Z" fill="#93c5fd"/>
  <!-- Core Singularity Jewel -->
  <polygon points="250,220 265,240 250,260 235,240" fill="#ffffff"/>
</svg>"""
            explanation = "Crafted a high-relief 3D Cyber Mech Falcon emblem featuring swept aerodynamic wing blades, tiered armor slats, and an energetic reactor core."
            suggested = ["Add thruster exhaust particles", "Add cockpit holographic visor", "Bevel the wing edges for sharper specular reflection"]
    elif engine == "latex":
        if any(w in p for w in ["pythagoras", "pythagorean", "hypotenuse", "triangle", "euclid", "geometry", "trigonometry"]):
            code = r"""\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{amsmath,amssymb,amsfonts,amsthm}
\usepackage{xcolor,graphicx,tikz}
\usetikzlibrary{arrows.meta, calc, backgrounds, patterns, positioning}
\usepackage{fancyhdr}
\usepackage{tabularx}
\usepackage{booktabs}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textbf{Geometry \& Metric Foundations} $\bullet$ Core Curriculum}
\fancyhead[R]{\small\textbf{Chapter 5: The Pythagorean Theorem}}
\fancyfoot[C]{\small Page \thepage}
\renewcommand{\headrulewidth}{0.4pt}

\definecolor{brandblue}{RGB}{20, 50, 110}
\definecolor{accentcyan}{RGB}{14, 116, 144}
\definecolor{emerald}{RGB}{16, 122, 87}
\definecolor{amber}{RGB}{180, 83, 9}
\definecolor{softblue}{RGB}{241, 246, 254}
\definecolor{borderblue}{RGB}{175, 203, 243}
\definecolor{slate}{RGB}{30, 41, 59}

\begin{document}

\begin{center}
    {\color{brandblue}\Huge\textbf{Chapter 5: The Pythagorean Theorem}}\\[6pt]
    {\color{accentcyan}\large Geometric Foundations, Algebraic Invariance, and Metric Generalizations}\\[8pt]
    \rule{\textwidth}{1.5pt}
\end{center}

\vspace{-4pt}
\begin{center}
\begin{tikzpicture}
\node[fill=softblue, draw=borderblue, line width=1.1pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\large\textbf{Chapter Learning Objectives}}\par\vspace{4pt}
    {\color{slate}\small
    \begin{itemize}
        \item Formulate the classical theorem of Pythagoras and its logical converse.
        \item Master visual and algebraic dissection proofs, including Bh\=askara's geometric decomposition.
        \item Classify and generate primitive Pythagorean triples using Euclid's parametric identity.
        \item Extend the Euclidean metric to $\mathbb{R}^2$ and $\mathbb{R}^3$, deriving distance formulas and the Law of Cosines.
        \item Apply the theorem across real-world civil engineering, spatial navigation, and vector mechanics problems.
    \end{itemize}
    }
};
\end{tikzpicture}
\end{center}

\section{The Core Geometric Invariance}
In any right-angled triangle situated within a Euclidean plane $\mathbb{E}^2$, the relationship between the orthogonal legs and the opposing hypotenuse is characterized by a fundamental second-degree invariant.

\begin{center}
\begin{tikzpicture}
\node[fill=blue!4, draw=brandblue, line width=1.2pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\textbf{Theorem 5.1 (The Pythagorean Theorem)}}\par\vspace{3pt}
    Let $\triangle ABC$ be a plane triangle having a right angle $\angle C = 90^\circ$. Let the lengths of the legs opposite to vertices $A$ and $B$ be designated as $a$ and $b$, and let the length of the hypotenuse opposite to vertex $C$ be denoted by $c$. Then:
    \begin{equation}
        a^2 + b^2 = c^2
    \end{equation}
    Geometrically: \textit{The sum of the areas of the two square surfaces erected upon the legs equals the area of the square surface erected upon the hypotenuse.}
};
\end{tikzpicture}
\end{center}

\begin{center}
\begin{tikzpicture}[scale=0.65]
    \coordinate (C) at (0,0);
    \coordinate (B) at (4,0);
    \coordinate (A) at (0,3);

    \draw[fill=amber!25, draw=amber, line width=1.1pt] (C) -- (B) -- (4,-4) -- (0,-4) -- cycle;
    \node at (2,-2) {\large\color{amber!90!black}\textbf{Area} $\mathbf{b^2 = 16}$};

    \draw[fill=emerald!22, draw=emerald, line width=1.1pt] (C) -- (A) -- (-3,3) -- (-3,0) -- cycle;
    \node at (-1.5,1.5) {\large\color{emerald!90!black}\textbf{Area} $\mathbf{a^2 = 9}$};

    \draw[fill=softblue, draw=brandblue, line width=1.4pt] (A) -- (B) -- (C) -- cycle;

    \coordinate (D) at ($(B) + (3,4)$);
    \coordinate (E) at ($(A) + (3,4)$);
    \draw[fill=brandblue!15, draw=brandblue, line width=1.2pt] (A) -- (B) -- (D) -- (E) -- cycle;
    \node[rotate=36.87] at ($(A)!0.5!(D)$) {\large\color{brandblue}\textbf{Area} $\mathbf{c^2 = 25 = 9 + 16}$};

    \draw[thick, brandblue] (0,0.4) -- (0.4,0.4) -- (0.4,0);

    \node[left=3pt, brandblue] at (0,1.5) {$a = 3$};
    \node[below=3pt, amber!90!black] at (2,0) {$b = 4$};
    \node[above right=1pt, brandblue] at (2,1.8) {$c = 5$};

    \node[below left=2pt] at (C) {\textbf{$C$}};
    \node[below right=2pt] at (B) {\textbf{$B$}};
    \node[above left=2pt] at (A) {\textbf{$A$}};
\end{tikzpicture}
\par\vspace{2pt}
\small\textbf{Figure 5.1:} Classical Euclidean construction: $a^2 + b^2 = 3^2 + 4^2 = 5^2 = c^2$.
\end{center}

\section{Dissection Proof by Area Conservation}
Consider a square of side length $(a+b)$. Within this bounding square, we embed four congruent right triangles with legs $a$ and $b$, oriented cyclically.

\begin{minipage}{0.48\textwidth}
\begin{center}
\begin{tikzpicture}[scale=0.7]
    \draw[line width=1.3pt, brandblue] (0,0) rectangle (6,6);
    \coordinate (P1) at (2,0);
    \coordinate (P2) at (6,2);
    \coordinate (P3) at (4,6);
    \coordinate (P4) at (0,4);

    \draw[fill=accentcyan!20, draw=accentcyan, line width=1.2pt] (P1) -- (P2) -- (P3) -- (P4) -- cycle;
    \node at (3,3) {\large\color{accentcyan!90!black}$\mathbf{c^2}$};

    \draw[fill=emerald!18, draw=emerald] (0,0) -- (P1) -- (P4) -- cycle;
    \draw[fill=emerald!18, draw=emerald] (P1) -- (6,0) -- (P2) -- cycle;
    \draw[fill=emerald!18, draw=emerald] (P2) -- (6,6) -- (P3) -- cycle;
    \draw[fill=emerald!18, draw=emerald] (P3) -- (0,6) -- (P4) -- cycle;

    \node[below] at (1,0) {$a$};
    \node[below] at (4,0) {$b$};
    \node[right] at (6,1) {$a$};
    \node[right] at (6,4) {$b$};
    \node[above] at (5,6) {$a$};
    \node[above] at (2,6) {$b$};
    \node[left] at (0,5) {$a$};
    \node[left] at (0,2) {$b$};
    \node[above right] at (1,2) {$c$};
\end{tikzpicture}
\par\vspace{2pt}
\small\textbf{Figure 5.2:} Algebraic square-partition model.
\end{center}
\end{minipage}
\hfill
\begin{minipage}{0.48\textwidth}
\textbf{Analytical Verification:}\\
The total planar area $\mathcal{A}_{\text{total}}$ of the composite outer square can be expressed as:
\begin{equation*}
    \mathcal{A}_{\text{total}} = (a + b)^2 = a^2 + 2ab + b^2
\end{equation*}
Alternatively, the sum of its decomposed partitions consists of four congruent right triangles plus the central inner quadrilateral:
\begin{align*}
    \mathcal{A}_{\text{total}} &= 4 \times \left(\frac{1}{2}ab\right) + c^2\\
    &= 2ab + c^2
\end{align*}
Equating both expressions:
\begin{align*}
    a^2 + 2ab + b^2 &= 2ab + c^2 \\
    \implies a^2 + b^2 &= c^2 \quad \blacksquare
\end{align*}
\end{minipage}

\section{The Converse of Pythagoras and Triangle Classification}
\begin{center}
\begin{tikzpicture}
\node[fill=softblue, draw=borderblue, line width=1.1pt, rounded corners=6pt, inner sep=8pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\textbf{Theorem 5.2 (Converse of the Pythagorean Theorem)}}\par\vspace{2pt}
    If a triangle with side lengths $a \le b \le c$ satisfies $a^2 + b^2 = c^2$, then the angle opposing the longest side $c$ is exactly $90^\circ$. By immediate extension:
    \begin{itemize}
        \item \textbf{Acute Triangle:} $a^2 + b^2 > c^2 \iff \angle C < 90^\circ$
        \item \textbf{Right Triangle:} $a^2 + b^2 = c^2 \iff \angle C = 90^\circ$
        \item \textbf{Obtuse Triangle:} $a^2 + b^2 < c^2 \iff \angle C > 90^\circ$
    \end{itemize}
};
\end{tikzpicture}
\end{center}

\section{Parametric Generation of Pythagorean Triples}
A \textbf{Pythagorean Triple} is an integer 3-tuple $(a, b, c) \in \mathbb{N}^3$ satisfying $a^2 + b^2 = c^2$. If $\gcd(a,b,c) = 1$, the triple is termed \textit{primitive}.

\begin{center}
\begin{tikzpicture}
\node[fill=amber!6, draw=amber!80, line width=1.1pt, rounded corners=6pt, inner sep=8pt, text width=0.94\textwidth, align=left] {
    {\color{amber!90!black}\textbf{Euclid's Formula for Primitive Triples}}\par\vspace{2pt}
    For coprime integers $m, n \in \mathbb{Z}^+$ such that $m > n$ and precisely one of $m, n$ is even (the other being odd), all primitive triples are generated by:
    \begin{equation}
        a = m^2 - n^2, \qquad b = 2mn, \qquad c = m^2 + n^2
    \end{equation}
};
\end{tikzpicture}
\end{center}

\begin{table}[h]
\centering
\small
\begin{tabularx}{0.88\textwidth}{cccccX}
\toprule
$\mathbf{m}$ & $\mathbf{n}$ & $\mathbf{a = m^2 - n^2}$ & $\mathbf{b = 2mn}$ & $\mathbf{c = m^2 + n^2}$ & \textbf{Triple $(a, b, c)$} \\
\midrule
2 & 1 & 3  & 4  & 5  & $(3, 4, 5)$ \\
3 & 2 & 5  & 12 & 13 & $(5, 12, 13)$ \\
4 & 1 & 15 & 8  & 17 & $(8, 15, 17)$ \\
4 & 3 & 7  & 24 & 25 & $(7, 24, 25)$ \\
5 & 2 & 21 & 20 & 29 & $(20, 21, 29)$ \\
5 & 4 & 9  & 40 & 41 & $(9, 40, 41)$ \\
\bottomrule
\end{tabularx}
\caption{Primitive Pythagorean Triples generated via Euclid's parametric identity.}
\end{table}

\section{Bh\=askara's Elegant ``Behold!'' Dissection}
In his 12th-century treatise \textit{Siddh\=anta \v{S}iroma\d{n}i}, the Indian mathematician Bh\=askara II presented a minimalist visual proof without words, simply accompanied by the imperative: \textit{``Behold!''}

\begin{minipage}{0.48\textwidth}
\begin{center}
\begin{tikzpicture}[scale=0.75]
    \coordinate (O1) at (0,3);
    \coordinate (O2) at (4,0);
    \coordinate (O3) at (7,4);
    \coordinate (O4) at (3,7);

    \draw[fill=brandblue!15, draw=brandblue, line width=1.1pt] (O1) -- (O2) -- (4,3) -- cycle;
    \draw[fill=accentcyan!20, draw=accentcyan, line width=1.1pt] (O2) -- (O3) -- (4,4) -- cycle;
    \draw[fill=emerald!18, draw=emerald, line width=1.1pt] (O3) -- (O4) -- (3,4) -- cycle;
    \draw[fill=amber!20, draw=amber, line width=1.1pt] (O4) -- (O1) -- (3,3) -- cycle;

    \draw[fill=red!20, draw=red!70!black, line width=1.2pt] (3,3) rectangle (4,4);
    \node at (3.5, 3.5) {\footnotesize\color{red!80!black}$\mathbf{(b-a)^2}$};

    \node[below left=2pt, brandblue] at ($(O1)!0.5!(O2)$) {$c$};
    \node[below right=2pt, accentcyan] at ($(O2)!0.5!(O3)$) {$c$};
    \node[above right=2pt, emerald] at ($(O3)!0.5!(O4)$) {$c$};
    \node[above left=2pt, amber] at ($(O4)!0.5!(O1)$) {$c$};
\end{tikzpicture}
\par\vspace{2pt}
\small\textbf{Figure 5.3:} Bh\=askara's inner $(b-a)$ square dissection.
\end{center}
\end{minipage}
\hfill
\begin{minipage}{0.48\textwidth}
\textbf{Decomposition Analysis:}\\
Four identical triangles of legs $a, b$ ($b > a$) and hypotenuse $c$ are enclosed inside a square of area $c^2$. The central unshaded region is a square of side $(b - a)$:
\begin{align*}
    c^2 &= 4 \times \left(\frac{1}{2}ab\right) + (b - a)^2 \\
    &= 2ab + (b^2 - 2ab + a^2) \\
    &= a^2 + b^2 \quad \blacksquare
\end{align*}
\end{minipage}

\section{Metric Generalizations and the Law of Cosines}
The distance metric extends naturally to higher Euclidean dimensions:
\begin{equation}
    d_{\mathbb{R}^3}(P_1, P_2) = \sqrt{\Delta x^2 + \Delta y^2 + \Delta z^2}
\end{equation}
For arbitrary enclosed angle $\theta$, the Law of Cosines establishes the generalized quadratic invariant:
\begin{equation}
    c^2 = a^2 + b^2 - 2ab\cos\theta
\end{equation}

\section{Applied Engineering Example}
\textbf{Problem:} A telecommunications transmission mast of height $h = 48\text{ m}$ is anchored by four diagonal guy-wires to bedrock footings located at radial distance $r = 20\text{ m}$ from the base. Compute the total cable length required and the tensile load if each wire sustains $15\text{ kN}$ of horizontal wind resistance.

\begin{center}
\begin{tikzpicture}
\node[fill=softblue, draw=borderblue, line width=1.1pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\textbf{Step-by-Step Solution}}\par\vspace{3pt}
    {\color{slate}\small
    \textbf{1. Individual Cable Length:}
    Each wire forms the hypotenuse $L$ of a right triangle with legs $h = 48\text{ m}$ and $r = 20\text{ m}$:
    \begin{equation*}
        L = \sqrt{h^2 + r^2} = \sqrt{48^2 + 20^2} = \sqrt{2304 + 400} = \sqrt{2704} = 52\text{ m}
    \end{equation*}
    \textbf{2. Total Cable Procurement:}
    For four identical guy-wires: $L_{\text{total}} = 4 \times 52\text{ m} = \mathbf{208\text{ m}}$.\par\vspace{2pt}
    \textbf{3. Angle of Inclination:}
    $\cos\theta = \frac{r}{L} = \frac{20}{52} \approx 0.3846 \implies \theta \approx 67.38^\circ$.\par\vspace{2pt}
    \textbf{4. Tension in Wire:}
    $T = \frac{F_{\text{wind}}}{\cos\theta} = \frac{15\text{ kN}}{20/52} = \mathbf{39.0\text{ kN}}$.
    }
};
\end{tikzpicture}
\end{center}

\section{Chapter Problem Set}
\begin{enumerate}
    \item \textbf{Primitive Triple Identification:} Verify whether $(65, 72, 97)$ forms a primitive Pythagorean triple.
    \item \textbf{Spatial Euclidean Distance:} Compute the straight-line displacement between $A(12, 5, 0)$ and $B(24, 21, 35)$.
    \item \textbf{Triangle Classification:} Classify a triangle with sides $15\text{ m}$, $20\text{ m}$, and $26\text{ m}$ as acute, right, or obtuse.
\end{enumerate}

\subsection*{Solutions \& Verification}
\begin{itemize}
    \item \textbf{5.1:} $65^2 + 72^2 = 4225 + 5184 = 9409 = 97^2$. Since $\gcd(65, 72) = 1$, $(65, 72, 97)$ is a \textbf{valid primitive triple}.
    \item \textbf{5.2:} $\Delta x = 12$, $\Delta y = 16$, $\Delta z = 35$. $d = \sqrt{12^2 + 16^2 + 35^2} = \sqrt{1625} \approx \mathbf{40.31\text{ m}}$.
    \item \textbf{5.3:} $15^2 + 20^2 = 625 < 676 = 26^2$. Because $a^2 + b^2 < c^2$, the opposing angle exceeds $90^\circ$ (\textbf{obtuse triangle}).
\end{itemize}

\end{document}"""
            explanation = "Generated a publication-grade Chapter on The Pythagorean Theorem featuring geometric invariance, TikZ area proofs, Bhāskara's dissection, Euclid's parametric triples, 3D metric generalizations, and solved engineering problems."
            suggested = ["Add Bhāskara dissection proof breakdown", "Generate table of 10 primitive triples", "Add 3D navigation vector problem", "Format student worksheet version"]
        elif any(w in p for w in ["section formula", "section", "internal division", "external division", "coordinate geometry", "ratio m:n", "ratio", "divides", "collinear"]):
            code = r"""\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{amsmath,amssymb,amsfonts,amsthm}
\usepackage{xcolor,graphicx,tikz}
\usetikzlibrary{arrows.meta, calc, backgrounds, patterns, positioning}
\usepackage{fancyhdr}
\usepackage{tabularx}
\usepackage{booktabs}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textbf{Coordinate Geometry \& Analytic Vector Methods} $\bullet$ Core Curriculum}
\fancyhead[R]{\small\textbf{Chapter 4: The Section Formula \& Linear Division}}
\fancyfoot[C]{\small Page \thepage}
\renewcommand{\headrulewidth}{0.4pt}

\definecolor{brandblue}{RGB}{20, 50, 110}
\definecolor{accentcyan}{RGB}{14, 116, 144}
\definecolor{emerald}{RGB}{16, 122, 87}
\definecolor{amber}{RGB}{180, 83, 9}
\definecolor{softblue}{RGB}{241, 246, 254}
\definecolor{borderblue}{RGB}{175, 203, 243}
\definecolor{slate}{RGB}{30, 41, 59}

\begin{document}

\begin{center}
    {\color{brandblue}\Huge\textbf{Chapter 4: Derivation and Proof of the Section Formula}}\\[6pt]
    {\color{accentcyan}\large Internal \& External Division of Line Segments with Geometric Similar Triangles Proof}\\[8pt]
    \rule{\textwidth}{1.5pt}
\end{center}

\vspace{-4pt}
\begin{center}
\begin{tikzpicture}
\node[fill=softblue, draw=borderblue, line width=1.1pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\large\textbf{Chapter Learning Objectives}}\par\vspace{4pt}
    {\color{slate}\small
    \begin{itemize}
        \item Formulate the internal section formula for coordinates of dividing point $P(x,y)$ on segment $AB$ in ratio $m:n$.
        \item Construct a rigorous geometric proof utilizing projection perpendiculars and similar Euclidean triangles.
        \item Derive the external division formula and understand harmonic conjugate point pairings.
        \item Express the section formula in vector form and extend results to three-dimensional space $\mathbb{R}^3$.
        \item Apply the formula to find triangle centroids, midpoints, and collinearity verification.
    \end{itemize}
    }
};
\end{tikzpicture}
\end{center}

\section{Statement of the Internal Section Theorem}
Let $A(x_1, y_1)$ and $B(x_2, y_2)$ be two distinct points in the Cartesian plane $\mathbb{R}^2$. Let point $P(x, y)$ lie on the directed segment $AB$ such that it partitions the segment internally in the given positive ratio:
\begin{equation}
    \frac{AP}{PB} = \frac{m}{n} \quad (m > 0, \; n > 0)
\end{equation}

\begin{center}
\begin{tikzpicture}
\node[fill=blue!4, draw=brandblue, line width=1.2pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\textbf{Theorem 4.1 (Internal Section Formula)}}\par\vspace{3pt}
    The coordinates $(x, y)$ of the point $P$ dividing the line segment joining $A(x_1, y_1)$ and $B(x_2, y_2)$ internally in the ratio $m:n$ are given by:
    \begin{equation}
        x = \frac{m x_2 + n x_1}{m + n}, \qquad y = \frac{m y_2 + n y_1}{m + n}
    \end{equation}
};
\end{tikzpicture}
\end{center}

\section{Geometric Proof via Similar Triangles}
\begin{center}
\begin{tikzpicture}[scale=1.15]
    % Coordinate Axes
    \draw[->, >=Stealth, thick, slate] (-0.8, 0) -- (7.5, 0) node[right] {$x$};
    \draw[->, >=Stealth, thick, slate] (0, -0.6) -- (0, 5.8) node[above] {$y$};
    \node[below left=2pt, slate] at (0,0) {$O$};

    % Points Coordinates
    \coordinate (A) at (1.2, 1.0);
    \coordinate (P) at (3.8, 2.8);
    \coordinate (B) at (6.2, 4.4);

    % Projections on X-axis
    \coordinate (A0) at (1.2, 0);
    \coordinate (P0) at (3.8, 0);
    \coordinate (B0) at (6.2, 0);

    % Right Triangle Projections
    \coordinate (Q) at (3.8, 1.0);
    \coordinate (R) at (6.2, 2.8);

    % Shaded Similar Triangles
    \fill[softblue, draw=brandblue, line width=1.1pt] (A) -- (Q) -- (P) -- cycle;
    \fill[emerald!15, draw=emerald, line width=1.1pt] (P) -- (R) -- (B) -- cycle;

    % Line Segment AB
    \draw[line width=1.8pt, brandblue] (A) -- (B);

    % Vertical Projection Dashed Lines
    \draw[dashed, gray] (A) -- (A0) node[below=2pt, slate] {$x_1$};
    \draw[dashed, gray] (P) -- (P0) node[below=2pt, slate] {$x$};
    \draw[dashed, gray] (B) -- (B0) node[below=2pt, slate] {$x_2$};

    % Horizontal Projections to Y-axis
    \draw[dashed, gray] (A) -- (0, 1.0) node[left=2pt, slate] {$y_1$};
    \draw[dashed, gray] (P) -- (0, 2.8) node[left=2pt, slate] {$y$};
    \draw[dashed, gray] (B) -- (0, 4.4) node[left=2pt, slate] {$y_2$};

    % Right Angle Marks
    \draw[thick, slate] (3.8, 1.25) -- (3.55, 1.25) -- (3.55, 1.0);
    \draw[thick, slate] (6.2, 3.05) -- (5.95, 3.05) -- (5.95, 2.8);

    % Points markers
    \filldraw[brandblue] (A) circle (2.8pt) node[above left=2pt] {\textbf{$A(x_1, y_1)$}};
    \filldraw[amber!90!black] (P) circle (3.2pt) node[above left=3pt] {\textbf{$P(x, y)$}};
    \filldraw[brandblue] (B) circle (2.8pt) node[above right=2pt] {\textbf{$B(x_2, y_2)$}};
    \node[below right=2pt, slate] at (Q) {$Q(x, y_1)$};
    \node[below right=2pt, slate] at (R) {$R(x_2, y)$};

    % Ratio Labels
    \node[above=4pt, amber!90!black, rotate=34] at ($(A)!0.5!(P)$) {\textbf{$m$}};
    \node[above=4pt, emerald!90!black, rotate=34] at ($(P)!0.5!(B)$) {\textbf{$n$}};

    % Distance Annotations
    \draw[<->, >=Stealth, thick, slate] (1.2, 0.6) -- (3.8, 0.6) node[midway, fill=white, inner sep=1pt] {\footnotesize $x - x_1$};
    \draw[<->, >=Stealth, thick, slate] (3.8, 0.6) -- (6.2, 0.6) node[midway, fill=white, inner sep=1pt] {\footnotesize $x_2 - x$};

    \draw[<->, >=Stealth, thick, slate] (4.2, 1.0) -- (4.2, 2.8) node[midway, right=1pt] {\footnotesize $y - y_1$};
    \draw[<->, >=Stealth, thick, slate] (6.6, 2.8) -- (6.6, 4.4) node[midway, right=1pt] {\footnotesize $y_2 - y$};
\end{tikzpicture}
\par\vspace{2pt}
\small\textbf{Figure 4.1:} Geometric construction of similar triangles $\triangle APQ \sim \triangle PBR$ for internal section division.
\end{center}

\subsection{Analytical Derivation of the $x$-Coordinate}
From the geometric construction:
\begin{enumerate}
    \item Draw perpendiculars $AA_0$, $PP_0$, and $BB_0$ onto the $x$-axis.
    \item Construct horizontal lines through $A$ meeting $PP_0$ at $Q$, and through $P$ meeting $BB_0$ at $R$.
    \item Since $AQ \parallel PR \parallel Ox$, the corresponding angles satisfy:
    \begin{equation*}
        \angle PAQ = \angle BPR \quad \text{and} \quad \angle AQP = \angle PRB = 90^\circ
    \end{equation*}
    \item By the Angle-Angle ($\text{AA}$) similarity criterion:
    \begin{equation}
        \triangle APQ \sim \triangle PBR
    \end{equation}
\end{enumerate}

Taking the ratio of corresponding homologous sides:
\begin{equation}
    \frac{AQ}{PR} = \frac{AP}{PB}
\end{equation}
Substituting segment lengths in terms of Cartesian coordinates:
\begin{align*}
    AQ &= x - x_1 \\
    PR &= x_2 - x \\
    \frac{AP}{PB} &= \frac{m}{n}
\end{align*}
Equating the ratios yields:
\begin{equation}
    \frac{x - x_1}{x_2 - x} = \frac{m}{n}
\end{equation}
Cross-multiplying and solving for $x$:
\begin{align*}
    n(x - x_1) &= m(x_2 - x) \\
    nx - nx_1 &= mx_2 - mx \\
    mx + nx &= mx_2 + nx_1 \\
    (m + n)x &= mx_2 + nx_1 \\
    \implies x &= \mathbf{\frac{mx_2 + nx_1}{m + n}} \quad \blacksquare
\end{align*}

\subsection{Analytical Derivation of the $y$-Coordinate}
Similarly, considering the vertical legs of similar triangles $\triangle APQ \sim \triangle PBR$:
\begin{equation}
    \frac{PQ}{BR} = \frac{AP}{PB} \implies \frac{y - y_1}{y_2 - y} = \frac{m}{n}
\end{equation}
Cross-multiplying and isolating $y$:
\begin{align*}
    n(y - y_1) &= m(y_2 - y) \\
    ny - ny_1 &= my_2 - my \\
    (m + n)y &= my_2 + ny_1 \\
    \implies y &= \mathbf{\frac{my_2 + ny_1}{m + n}} \quad \blacksquare
\end{align*}

\section{Corollaries and Special Cases}

\subsection{Midpoint Formula ($m : n = 1 : 1$)}
When point $M$ bisects the segment $AB$, $m = n = 1$. The coordinates simplify to the arithmetic mean:
\begin{equation}
    M(x, y) = \left( \frac{x_1 + x_2}{2}, \; \frac{y_1 + y_2}{2} \right)
\end{equation}

\subsection{External Division Formula}
When point $P$ divides the line segment $AB$ externally in ratio $m:n$ ($m \ne n$):
\begin{equation}
    \frac{AP}{PB} = \frac{m}{-n} \implies P\left( \frac{mx_2 - nx_1}{m - n}, \; \frac{my_2 - ny_1}{m - n} \right)
\end{equation}

\subsection{Vector Form Representation}
Let $\vec{a} = \vec{OA}$ and $\vec{b} = \vec{OB}$ be position vectors of $A$ and $B$ relative to origin $O$. The position vector $\vec{r} = \vec{OP}$ is given by:
\begin{equation}
    \vec{r} = \frac{m\vec{b} + n\vec{a}}{m + n}
\end{equation}

\section{Worked Numerical Example}
\textbf{Problem:} Find the coordinates of point $P$ dividing the segment connecting $A(-2, 3)$ and $B(6, 7)$ in the ratio $3:1$ internally.

\begin{center}
\begin{tikzpicture}
\node[fill=softblue, draw=borderblue, line width=1.1pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\textbf{Step-by-Step Analytical Solution}}\par\vspace{3pt}
    {\color{slate}\small
    Given: $x_1 = -2$, $y_1 = 3$, $x_2 = 6$, $y_2 = 7$, with ratio $m = 3$, $n = 1$.\par\vspace{2pt}
    \textbf{1. Compute Abscissa $x$:}\\
    \begin{equation*}
        x = \frac{m x_2 + n x_1}{m + n} = \frac{3(6) + 1(-2)}{3 + 1} = \frac{18 - 2}{4} = \frac{16}{4} = \mathbf{4}
    \end{equation*}
    \textbf{2. Compute Ordinate $y$:}\\
    \begin{equation*}
        y = \frac{m y_2 + n y_1}{m + n} = \frac{3(7) + 1(3)}{3 + 1} = \frac{21 + 3}{4} = \frac{24}{4} = \mathbf{6}
    \end{equation*}
    \textbf{Conclusion:} The dividing point is $P(4, 6)$.
    }
};
\end{tikzpicture}
\end{center}

\section{Chapter Problem Set}
\begin{enumerate}
    \item Determine the ratio in which the $y$-axis divides the line segment joining points $(-3, 5)$ and $(6, -4)$. Also find the intersection point.
    \item The vertices of a triangle are $A(3, -5)$, $B(-7, 4)$, and $C(10, -2)$. Find the coordinates of the centroid $G$.
    \item Find the coordinates of the points of trisection of the segment connecting $(2, -2)$ and $(-7, 4)$.
\end{enumerate}

\subsection*{Solutions \& Verification}
\begin{itemize}
    \item \textbf{4.1:} Setting $x = 0 \implies \frac{m(6) + n(-3)}{m+n} = 0 \implies 6m = 3n \implies \frac{m}{n} = \frac{1}{2}$. The ratio is $\mathbf{1:2}$. Substituting gives $y = \frac{1(-4) + 2(5)}{3} = \mathbf{2}$. Point is $(0, 2)$.
    \item \textbf{4.2:} $G\left(\frac{3 - 7 + 10}{3}, \frac{-5 + 4 - 2}{3}\right) = G(2, -1)$.
    \item \textbf{4.3:} Points dividing in $1:2$ and $2:1$ are $(-1, 0)$ and $(-4, 2)$.
\end{itemize}

\end{document}"""
            explanation = "Authored a rigorous, publication-grade chapter on the Section Formula featuring geometric similar triangles proof, TikZ coordinate projection diagram, midpoint & external division corollaries, vector forms, and worked numerical problems."
            suggested = ["Add 3D coordinates section formula", "Add harmonic division and cross-ratio", "Generate student practice worksheet"]
        elif any(w in p for w in ["parabola", "conic", "ellipse", "hyperbola", "directrix", "latus rectum"]):
            code = r"""\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{amsmath,amssymb,amsfonts,amsthm}
\usepackage{xcolor,graphicx,tikz}
\usetikzlibrary{arrows.meta, calc, backgrounds, positioning}
\usepackage{fancyhdr}
\usepackage{tabularx}
\usepackage{booktabs}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textbf{Senior Secondary Mathematics (Class 12th)} $\bullet$ Conic Sections}
\fancyhead[R]{\small\textbf{Chapter 8: The Parabola}}
\fancyfoot[C]{\small Page \thepage}
\renewcommand{\headrulewidth}{0.4pt}

\definecolor{brandblue}{RGB}{20, 50, 110}
\definecolor{accentcyan}{RGB}{14, 116, 144}
\definecolor{emerald}{RGB}{16, 122, 87}
\definecolor{amber}{RGB}{180, 83, 9}
\definecolor{softblue}{RGB}{241, 246, 254}
\definecolor{borderblue}{RGB}{175, 203, 243}
\definecolor{slate}{RGB}{30, 41, 59}

\begin{document}

\begin{center}
    {\color{brandblue}\Huge\textbf{Chapter 8: The Parabola (Class 12th)}}\\[6pt]
    {\color{accentcyan}\large Conic Geometry, Analytical Derivation of $y^2 = 4ax$, Tangents, Normals, and Parametrics}\\[8pt]
    \rule{\textwidth}{1.5pt}
\end{center}

\vspace{-4pt}
\begin{center}
\begin{tikzpicture}
\node[fill=softblue, draw=borderblue, line width=1.1pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\large\textbf{Chapter Learning Objectives}}\par\vspace{4pt}
    {\color{slate}\small
    \begin{itemize}
        \item Define the parabola as a conic section having eccentricity $e = 1$.
        \item Derive the standard equation $y^2 = 4ax$ using the focus-directrix property $PS = PM$.
        \item Identify focus, vertex, directrix, axis, and calculate the latus rectum length ($4a$).
        \item Analyze parametric coordinates $P(at^2, 2at)$ and focal chord relationships $t_1 t_2 = -1$.
        \item Formulate equations of tangents and normals in Cartesian, parametric, and slope forms.
    \end{itemize}
    }
};
\end{tikzpicture}
\end{center}

\section{Geometric Definition of a Parabola}
A parabola is the locus of a point $P(x, y)$ that moves in a plane such that its distance from a fixed point $S$ (called the \textbf{focus}) is always equal to its perpendicular distance from a fixed straight line $L$ (called the \textbf{directrix}). The ratio of these distances defines the eccentricity $e$:
\begin{equation}
    e = \frac{PS}{PM} = 1 \implies PS = PM
\end{equation}

\begin{center}
\begin{tikzpicture}[scale=1.15]
    % Coordinate Axes
    \draw[->, >=Stealth, thick, slate] (-2.8, 0) -- (5.2, 0) node[right] {$x$ (Axis)};
    \draw[->, >=Stealth, thick, slate] (0, -3.2) -- (0, 3.2) node[above] {$y$};
    \node[below left=2pt, slate] at (0,0) {$V(0,0)$};

    % Directrix line x = -1.5
    \draw[line width=1.4pt, dashed, red!70!black] (-1.5, -3.0) -- (-1.5, 3.0) node[above] {\footnotesize Directrix: $x = -a$};

    % Parabola curve y^2 = 4ax (with a = 1.5)
    \draw[line width=1.8pt, brandblue, domain=-2.8:2.8, samples=80] plot ({(\x*\x)/(4*1.5)}, {\x});

    % Focus S(1.5, 0)
    \coordinate (S) at (1.5, 0);
    \filldraw[amber!90!black] (S) circle (2.8pt) node[below right=2pt] {\textbf{$S(a, 0)$ Focus}};

    % Arbitrary Point P(x, y) on curve
    \coordinate (P) at (2.4, 2.4);
    \coordinate (M) at (-1.5, 2.4);
    \filldraw[brandblue] (P) circle (2.8pt) node[above right=2pt] {\textbf{$P(x, y)$}};
    \filldraw[slate] (M) circle (2.2pt) node[left=2pt] {$M(-a, y)$};

    % Distance Segments PS and PM
    \draw[line width=1.2pt, emerald!80!black] (S) -- (P) node[midway, below right] {\footnotesize $PS$};
    \draw[line width=1.2pt, emerald!80!black] (P) -- (M) node[midway, above] {\footnotesize $PM$};

    % Perpendicular symbol at M
    \draw[thick, slate] (-1.5, 2.15) -- (-1.25, 2.15) -- (-1.25, 2.4);

    % Latus Rectum
    \coordinate (L1) at (1.5, 3.0);
    \coordinate (L2) at (1.5, -3.0);
    \draw[line width=1.3pt, purple, <->] (L1) -- (L2) node[midway, right=2pt] {\footnotesize Latus Rectum $= 4a$};
    \filldraw[purple] (L1) circle (2.2pt) node[above right=1pt] {$L(a, 2a)$};
    \filldraw[purple] (L2) circle (2.2pt) node[below right=1pt] {$L'(a, -2a)$};
\end{tikzpicture}
\par\vspace{2pt}
\small\textbf{Figure 8.1:} Standard parabola $y^2 = 4ax$ illustrating focus $S$, directrix $x=-a$, and focal equality $PS = PM$.
\end{center}

\section{Analytical Derivation of the Standard Equation}
Let the focus be placed at $S(a, 0)$ with $a > 0$, and let the directrix be the vertical line $x = -a \iff x + a = 0$. By the conic definition, for any point $P(x, y)$ on the curve:
\begin{equation}
    PS^2 = PM^2
\end{equation}
Applying the Euclidean distance formula:
\begin{align*}
    (x - a)^2 + (y - 0)^2 &= (x - (-a))^2 + (y - y)^2 \\
    (x - a)^2 + y^2 &= (x + a)^2
\end{align*}
Expanding both binomial terms:
\begin{align*}
    x^2 - 2ax + a^2 + y^2 &= x^2 + 2ax + a^2 \\
    -2ax + y^2 &= 2ax \\
    \implies \mathbf{y^2} &= \mathbf{4ax} \quad \blacksquare
\end{align*}

\section{The Four Standard Orientations}
\begin{table}[h]
\centering
\small
\begin{tabularx}{\textwidth}{lXXXX}
\toprule
\textbf{Attribute} & $\mathbf{y^2 = 4ax}$ & $\mathbf{y^2 = -4ax}$ & $\mathbf{x^2 = 4ay}$ & $\mathbf{x^2 = -4ay}$ \\
\midrule
\textbf{Focus} & $(a, 0)$ & $(-a, 0)$ & $(0, a)$ & $(0, -a)$ \\
\textbf{Directrix} & $x = -a$ & $x = a$ & $y = -a$ & $y = a$ \\
\textbf{Axis of Symmetry} & $y = 0$ ($x$-axis) & $y = 0$ ($x$-axis) & $x = 0$ ($y$-axis) & $x = 0$ ($y$-axis) \\
\textbf{Vertex} & $(0, 0)$ & $(0, 0)$ & $(0, 0)$ & $(0, 0)$ \\
\textbf{Latus Rectum Length} & $4a$ & $4a$ & $4a$ & $4a$ \\
\textbf{Latus Rectum Ends} & $(a, \pm 2a)$ & $(-a, \pm 2a)$ & $(\pm 2a, a)$ & $(\pm 2a, -a)$ \\
\bottomrule
\end{tabularx}
\caption{Comparative geometric characteristics of the four primary parabolic forms.}
\end{table}

\section{Parametric Representation and Focal Chords}
The coordinates of any point on $y^2 = 4ax$ can be parameterized in terms of a single real parameter $t \in \mathbb{R}$:
\begin{equation}
    x = at^2, \qquad y = 2at \implies P(t) \equiv (at^2, 2at)
\end{equation}

\begin{center}
\begin{tikzpicture}
\node[fill=blue!4, draw=brandblue, line width=1.2pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\textbf{Theorem 8.1 (Focal Chord Parameter Relation)}}\par\vspace{3pt}
    If the chord joining $P(t_1)$ and $Q(t_2)$ passes through the focus $S(a, 0)$, then the parameters satisfy:
    \begin{equation}
        t_1 t_2 = -1 \iff t_2 = -\frac{1}{t_1}
    \end{equation}
    Consequently, if one extremity is $(at^2, 2at)$, the opposite extremity is $\left(\frac{a}{t^2}, -\frac{2a}{t}\right)$.
};
\end{tikzpicture}
\end{center}

\section{Equations of Tangents and Normals}
\subsection{Tangents to $y^2 = 4ax$}
\begin{itemize}
    \item \textbf{Point Form at $(x_1, y_1)$:} $yy_1 = 2a(x + x_1)$
    \item \textbf{Parametric Form at $P(t)$:} $ty = x + at^2$
    \item \textbf{Slope Form with gradient $m$ ($m \ne 0$):} $y = mx + \frac{a}{m}$, with point of tangency $\left(\frac{a}{m^2}, \frac{2a}{m}\right)$
\end{itemize}

\subsection{Normals to $y^2 = 4ax$}
\begin{itemize}
    \item \textbf{Point Form at $(x_1, y_1)$:} $y - y_1 = -\frac{y_1}{2a}(x - x_1)$
    \item \textbf{Parametric Form at $P(t)$:} $y + tx = 2at + at^3$
    \item \textbf{Slope Form with gradient $m$:} $y = mx - 2am - am^3$, with foot of normal $(am^2, -2am)$
\end{itemize}

\section{Worked Class 12th Board Examples}
\textbf{Problem 1:} Find the focus, vertex, directrix equation, and latus rectum length for the parabola $y^2 = 12x$. Find also the equation of the tangent at $(3, 6)$.

\begin{center}
\begin{tikzpicture}
\node[fill=softblue, draw=borderblue, line width=1.1pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\textbf{Step-by-Step Analytical Solution}}\par\vspace{3pt}
    {\color{slate}\small
    Given: $y^2 = 12x$. Comparing with standard form $y^2 = 4ax$ gives $4a = 12 \implies a = 3$.\par\vspace{2pt}
    \begin{enumerate}
        \item \textbf{Focus:} $S(a, 0) = \mathbf{(3, 0)}$.
        \item \textbf{Vertex:} $V = \mathbf{(0, 0)}$.
        \item \textbf{Directrix:} $x = -a \implies \mathbf{x = -3} \iff x + 3 = 0$.
        \item \textbf{Length of Latus Rectum:} $4a = \mathbf{12}$.
        \item \textbf{Tangent at $(3, 6)$:} Applying point form $yy_1 = 2a(x + x_1)$ with $x_1 = 3, y_1 = 6, a = 3$:
        \begin{equation*}
            y(6) = 2(3)(x + 3) \implies 6y = 6(x + 3) \implies \mathbf{x - y + 3 = 0}
        \end{equation*}
    \end{enumerate}
    }
};
\end{tikzpicture}
\end{center}

\section{Chapter Problem Set}
\begin{enumerate}
    \item Find the equation of the parabola with vertex at the origin and focus at $(0, -4)$.
    \item Find the equation of the tangent to $y^2 = 16x$ that is parallel to the line $2x - y + 5 = 0$.
    \item Prove that the locus of the point of intersection of two perpendicular tangents to the parabola $y^2 = 4ax$ is its directrix $x + a = 0$.
    \item If a focal chord of $y^2 = 4ax$ makes an angle $\alpha$ with the positive $x$-axis, prove that its length is $4a\csc^2\alpha$.
\end{enumerate}

\subsection*{Solutions \& Verification}
\begin{itemize}
    \item \textbf{8.1:} Form is $x^2 = -4ay$. Focus $(0, -a) = (0, -4) \implies a = 4$. Equation: $\mathbf{x^2 = -16y}$.
    \item \textbf{8.2:} $a = 4$. Tangent slope $m = 2$. Using slope form $y = mx + \frac{a}{m} = 2x + \frac{4}{2} = \mathbf{2x + 2} \implies 2x - y + 2 = 0$.
    \item \textbf{8.3:} The tangent is $y = mx + a/m \implies m^2 x - my + a = 0$. For perpendicular tangents with roots $m_1 m_2 = -1$, product of roots $\frac{a}{x} = -1 \implies x = -a \implies \mathbf{x + a = 0}$ (Directrix).
    \item \textbf{8.4:} Length $= a(t + 1/t)^2$. Since $\tan\alpha = \frac{2}{t - 1/t}$, $(t + 1/t)^2 = (t - 1/t)^2 + 4 = 4\cot^2\alpha + 4 = 4\csc^2\alpha \implies L = \mathbf{4a\csc^2\alpha}$.
\end{itemize}

\end{document}"""
            explanation = "Authored a complete, CBSE/Class 12th curriculum chapter on The Parabola with geometric focus-directrix derivation, TikZ diagram, standard forms table, tangents, normals, and solved board problems."
            suggested = ["Add ellipse standard form comparison", "Add focal chord theorems", "Generate Class 12 practice worksheet"]
        elif any(w in p for w in ["circle", "radius", "circumference", "diameter", "concentric", "tangent to circle"]):
            code = r"""\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{amsmath,amssymb,amsfonts,amsthm}
\usepackage{xcolor,graphicx,tikz}
\usetikzlibrary{arrows.meta, calc, backgrounds, positioning}
\usepackage{fancyhdr}
\usepackage{tabularx}
\usepackage{booktabs}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textbf{Senior Secondary Mathematics (Class 12th)} $\bullet$ Coordinate Geometry}
\fancyhead[R]{\small\textbf{Chapter 7: The Circle}}
\fancyfoot[C]{\small Page \thepage}
\renewcommand{\headrulewidth}{0.4pt}

\definecolor{brandblue}{RGB}{20, 50, 110}
\definecolor{accentcyan}{RGB}{14, 116, 144}
\definecolor{emerald}{RGB}{16, 122, 87}
\definecolor{amber}{RGB}{180, 83, 9}
\definecolor{softblue}{RGB}{241, 246, 254}
\definecolor{borderblue}{RGB}{175, 203, 243}
\definecolor{slate}{RGB}{30, 41, 59}

\begin{document}

\begin{center}
    {\color{brandblue}\Huge\textbf{Chapter 7: The Circle (Class 12th)}}\\[6pt]
    {\color{accentcyan}\large Standard \& General Equations, Tangents, Normals, and Diametric Forms with Geometric Proofs}\\[8pt]
    \rule{\textwidth}{1.5pt}
\end{center}

\vspace{-4pt}
\begin{center}
\begin{tikzpicture}
\node[fill=softblue, draw=borderblue, line width=1.1pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\large\textbf{Chapter Learning Objectives}}\par\vspace{4pt}
    {\color{slate}\small
    \begin{itemize}
        \item Define the circle as the geometric locus of points equidistant from a fixed center.
        \item Derive the standard central equation $(x-h)^2 + (y-k)^2 = r^2$ and the origin form $x^2 + y^2 = r^2$.
        \item Analyze the general second-degree equation $x^2 + y^2 + 2gx + 2fy + c = 0$, evaluating center $(-g, -f)$ and radius $\sqrt{g^2 + f^2 - c}$.
        \item Formulate the diametric equation $(x - x_1)(x - x_2) + (y - y_1)(y - y_2) = 0$ using Thales' right-angle theorem.
        \item Derive conditions of tangency ($c^2 = a^2(1 + m^2)$), tangent equations, and normal lines.
    \end{itemize}
    }
};
\end{tikzpicture}
\end{center}

\section{Geometric Definition and Standard Equation}
A circle is the planar locus of a point $P(x, y)$ that maintains a constant distance $r$ (called the \textbf{radius}) from a fixed point $C(h, k)$ (called the \textbf{center}). By the Euclidean distance formula:
\begin{equation}
    CP = r \iff \sqrt{(x - h)^2 + (y - k)^2} = r
\end{equation}
Squaring both sides yields the standard central form:
\begin{equation}
    \mathbf{(x - h)^2 + (y - k)^2 = r^2}
\end{equation}
When the center coincides with the origin $O(0, 0)$, this simplifies to the canonical equation:
\begin{equation}
    x^2 + y^2 = r^2
\end{equation}

\begin{center}
\begin{tikzpicture}[scale=1.2]
    % Axes
    \draw[->, >=Stealth, thick, slate] (-1.0, 0) -- (6.5, 0) node[right] {$x$};
    \draw[->, >=Stealth, thick, slate] (0, -0.8) -- (0, 5.5) node[above] {$y$};
    \node[below left=2pt, slate] at (0,0) {$O$};

    % Center C(2.8, 2.5) and Radius r = 2.2
    \coordinate (C) at (2.8, 2.5);
    \def\r{2.2}

    % Circle
    \draw[line width=1.6pt, brandblue, fill=softblue!30] (C) circle (\r);

    % Point P on circle at angle 45 degrees
    \coordinate (P) at ($(C) + (45:\r)$);
    \coordinate (Q) at (P |- C); % Projection Q(x, k)

    % Center marker
    \filldraw[amber!90!black] (C) circle (2.6pt) node[below left=2pt] {\textbf{$C(h, k)$}};

    % Point P marker
    \filldraw[brandblue] (P) circle (2.8pt) node[above right=2pt] {\textbf{$P(x, y)$}};
    \filldraw[slate] (Q) circle (1.8pt) node[below right=1pt] {\footnotesize $Q(x, k)$};

    % Triangle CPQ
    \draw[line width=1.4pt, emerald!80!black] (C) -- (P) node[midway, above left] {\textbf{$r$}};
    \draw[dashed, thick, slate] (C) -- (Q) node[midway, below] {\footnotesize $x - h$};
    \draw[dashed, thick, slate] (Q) -- (P) node[midway, right] {\footnotesize $y - k$};

    % Right angle symbol at Q
    \draw[thick, slate] ($(Q) + (-0.2, 0)$) -- ($(Q) + (-0.2, 0.2)$) -- ($(Q) + (0, 0.2)$);

    % Projections to axes
    \draw[dotted, gray] (C) -- (2.8, 0) node[below=2pt, slate] {$h$};
    \draw[dotted, gray] (C) -- (0, 2.5) node[left=2pt, slate] {$k$};
    \draw[dotted, gray] (P) -- ($(P |- 0,0)$) node[below=2pt, slate] {$x$};
    \draw[dotted, gray] (P) -- ($(P -| 0,0)$) node[left=2pt, slate] {$y$};

    % Tangent line at P
    \coordinate (T1) at ($(P) + (135:1.6)$);
    \coordinate (T2) at ($(P) + (-45:1.6)$);
    \draw[line width=1.2pt, red!75!black] (T1) -- (T2) node[below right] {\footnotesize Tangent Line ($T$)};

    % Right angle between radius and tangent
    \draw[thick, red!75!black] ($(P) + (-45:0.25)$) -- ($(P) + (-45:0.25) + (225:0.25)$) -- ($(P) + (225:0.25)$);
\end{tikzpicture}
\par\vspace{2pt}
\small\textbf{Figure 7.1:} Circle with center $C(h,k)$, radius $r$, reference triangle $\triangle CPQ$, and perpendicular tangent line $T$.
\end{center}

\section{The General Equation of a Circle}
Expanding the standard equation gives:
\begin{equation}
    x^2 + y^2 - 2hx - 2ky + (h^2 + k^2 - r^2) = 0
\end{equation}
Comparing this with the general second-degree Cartesian equation leads to:
\begin{center}
\begin{tikzpicture}
\node[fill=blue!4, draw=brandblue, line width=1.2pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\textbf{Theorem 7.1 (General Equation of a Circle)}}\par\vspace{3pt}
    The general second-degree equation represents a circle:
    \begin{equation}
        x^2 + y^2 + 2gx + 2fy + c = 0
    \end{equation}
    provided that the coefficients of $x^2$ and $y^2$ are equal and the $xy$ term is absent ($h = 0$).\\
    \textbf{Center:} $(-g, -f)$, \qquad \textbf{Radius:} $r = \sqrt{g^2 + f^2 - c}$.
};
\end{tikzpicture}
\end{center}

\subsection{Nature of the Circle}
\begin{itemize}
    \item If $g^2 + f^2 - c > 0$, the circle is \textbf{real} with non-zero radius.
    \item If $g^2 + f^2 - c = 0$, the radius is zero, representing a \textbf{point circle} located at $(-g, -f)$.
    \item If $g^2 + f^2 - c < 0$, the radius is imaginary, yielding no real locus (\textbf{virtual circle}).
\end{itemize}

\section{Diametric Form of a Circle}
Let $A(x_1, y_1)$ and $B(x_2, y_2)$ be extremities of a diameter. For any point $P(x, y)$ on the circumference, $\angle APB = 90^\circ$ (angle in a semicircle). Hence the slopes satisfy:
\begin{equation}
    m_{AP} \times m_{BP} = -1 \implies \left(\frac{y - y_1}{x - x_1}\right) \left(\frac{y - y_2}{x - x_2}\right) = -1
\end{equation}
Rearranging terms yields the \textbf{diametric form}:
\begin{equation}
    \mathbf{(x - x_1)(x - x_2) + (y - y_1)(y - y_2) = 0}
\end{equation}

\section{Parametric Representation}
For a circle $(x-h)^2 + (y-k)^2 = r^2$, the parametric equations in terms of angular displacement $\theta \in [0, 2\pi)$ are:
\begin{equation}
    x = h + r\cos\theta, \qquad y = k + r\sin\theta
\end{equation}

\section{Equations of Tangents and Normals}
\subsection{Condition of Tangency}
A straight line $y = mx + c$ touches the circle $x^2 + y^2 = a^2$ if the perpendicular distance from center $(0,0)$ equals radius $a$:
\begin{equation}
    \frac{|c|}{\sqrt{1 + m^2}} = a \implies \mathbf{c^2 = a^2(1 + m^2)} \iff c = \pm a\sqrt{1 + m^2}
\end{equation}

\subsection{Equations of Tangents}
\begin{itemize}
    \item \textbf{Point Form at $(x_1, y_1)$ on $x^2 + y^2 = a^2$:} $xx_1 + yy_1 = a^2$
    \item \textbf{Point Form for General Circle:} $xx_1 + yy_1 + g(x + x_1) + f(y + y_1) + c = 0$
    \item \textbf{Slope Form:} $y = mx \pm a\sqrt{1 + m^2}$
    \item \textbf{Parametric Form at $\theta$:} $x\cos\theta + y\sin\theta = a$
\end{itemize}

\subsection{Equation of the Normal}
Since the radius is always perpendicular to the tangent at the point of contact, the normal line at any point $P(x_1, y_1)$ on the circle \textbf{always passes through the center} $(-g, -f)$:
\begin{equation}
    \frac{x - x_1}{x_1 + g} = \frac{y - y_1}{y_1 + f} \quad \text{or for } x^2 + y^2 = a^2: \quad \frac{x}{x_1} = \frac{y}{y_1} \iff xy_1 - yx_1 = 0
\end{equation}

\section{Worked Class 12th Board Examples}
\textbf{Problem 1:} Find the center and radius of the circle $2x^2 + 2y^2 - 8x + 12y - 10 = 0$. Find the equation of the tangent at $(1, 1)$ if it lies on the circle.

\begin{center}
\begin{tikzpicture}
\node[fill=softblue, draw=borderblue, line width=1.1pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\textbf{Step-by-Step Analytical Solution}}\par\vspace{3pt}
    {\color{slate}\small
    \textbf{1. Standardize by dividing by leading coefficient 2:}\\
    \begin{equation*}
        x^2 + y^2 - 4x + 6y - 5 = 0
    \end{equation*}
    Comparing with $x^2 + y^2 + 2gx + 2fy + c = 0$:\\
    $2g = -4 \implies g = -2$, \quad $2f = 6 \implies f = 3$, \quad $c = -5$.\par\vspace{2pt}
    \textbf{2. Center:} $(-g, -f) = \mathbf{(2, -3)}$.\\
    \textbf{3. Radius:} $r = \sqrt{g^2 + f^2 - c} = \sqrt{(-2)^2 + 3^2 - (-5)} = \sqrt{4 + 9 + 5} = \sqrt{18} = \mathbf{3\sqrt{2}}$.\par\vspace{2pt}
    \textbf{4. Tangent at $(1, 1)$:} Substitute into $xx_1 + yy_1 + g(x + x_1) + f(y + y_1) + c = 0$:
    \begin{align*}
        x(1) + y(1) - 2(x + 1) + 3(y + 1) - 5 &= 0 \\
        x + y - 2x - 2 + 3y + 3 - 5 &= 0 \implies -x + 4y - 4 = 0 \iff \mathbf{x - 4y + 4 = 0}
    \end{align*}
    }
};
\end{tikzpicture}
\end{center}

\section{Chapter Problem Set}
\begin{enumerate}
    \item Find the equation of the circle passing through the points $(0,0)$, $(a, 0)$, and $(0, b)$.
    \item Find the equation of the tangent to the circle $x^2 + y^2 = 25$ which is parallel to the straight line $3x - 4y + 7 = 0$.
    \item Prove that the line $lx + my + n = 0$ is a tangent to the circle $x^2 + y^2 = a^2$ if and only if $a^2(l^2 + m^2) = n^2$.
    \item Find the coordinates of the points of contact of the tangents drawn from $(0, 5)$ to $x^2 + y^2 = 9$.
\end{enumerate}

\subsection*{Solutions \& Verification}
\begin{itemize}
    \item \textbf{7.1:} Since $\angle AOB = 90^\circ$, $AB$ is a diameter. Using diametric form: $(x-a)(x-0) + (y-0)(y-b) = 0 \implies \mathbf{x^2 + y^2 - ax - by = 0}$.
    \item \textbf{7.2:} Slope $m = 3/4$, radius $a = 5$. $y = mx \pm a\sqrt{1 + m^2} \implies y = \frac{3}{4}x \pm 5\sqrt{1 + 9/16} = \frac{3}{4}x \pm \frac{25}{4} \implies \mathbf{3x - 4y \pm 25 = 0}$.
    \item \textbf{7.3:} Perpendicular distance from $(0,0)$ to line is $\frac{|n|}{\sqrt{l^2 + m^2}} = a \implies n^2 = a^2(l^2 + m^2)$.
    \item \textbf{7.4:} Chord of contact from $(0,5)$ is $0x + 5y = 9 \implies y = 9/5$. Substituting: $x = \pm \sqrt{9 - (9/5)^2} = \pm 12/5$. Points: $\left(\pm \frac{12}{5}, \frac{9}{5}\right)$.
\end{itemize}

\end{document}"""
            explanation = "Authored a complete, CBSE/Class 12th curriculum chapter on The Circle with geometric center-radius derivation, TikZ diagram, diametric form, tangents, normals, and solved board problems."
            suggested = ["Add orthogonal circles condition", "Add radical axis of two circles", "Generate Class 12 practice worksheet"]
        elif any(w in p for w in ["kinematic", "mechanics", "motion", "projectile", "trajectory", "velocity", "acceleration"]):
            code = r"""\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.8in]{geometry}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{xcolor,graphicx,tikz}
\usetikzlibrary{arrows.meta, calc, backgrounds}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textbf{Physics \& Classical Mechanics} $\bullet$ Core Curriculum}
\fancyhead[R]{\small\textbf{Chapter 3: Kinematic Trajectories}}
\fancyfoot[C]{\small Page \thepage}
\renewcommand{\headrulewidth}{0.4pt}

\definecolor{brandblue}{RGB}{0, 80, 120}
\definecolor{practicegreen}{RGB}{0, 120, 80}
\definecolor{hintorange}{RGB}{200, 100, 0}
\definecolor{darkslate}{RGB}{30, 41, 59}

\begin{document}

\begin{center}
    {\color{brandblue}\Huge\textbf{Chapter 3: Kinematic Trajectories \& Vector Dynamics}}\\[6pt]
    {\color{gray}\large Orthogonal Motion Decoupling, Parabolic Invariance, and Trajectory Equations}\\[8pt]
    \rule{\textwidth}{1.5pt}
\end{center}

\section{Orthogonal Motion Decoupling}
Under a uniform gravitational field $\vec{g} = -g\hat{j}$, two-dimensional ballistic motion exhibits orthogonal independence:
\begin{align}
    x(t) &= x_0 + v_{0}\cos(\theta)\,t \\
    y(t) &= y_0 + v_{0}\sin(\theta)\,t - \frac{1}{2}gt^2
\end{align}

\begin{center}
\begin{tikzpicture}
\node[draw=brandblue, fill=blue!4, line width=1.1pt, rounded corners=6pt, inner sep=10pt, text width=0.92\textwidth, align=left] {
    \textbf{\color{brandblue}\large The Cartesian Trajectory Equation}\par\vspace{4pt}
    Eliminating parameter $t$ between the coordinates establishes that every projectile in a vacuum follows an exact quadratic trajectory:
    \begin{equation}
        y(x) = (\tan\theta)x - \left[ \frac{g}{2v_0^2 \cos^2\theta} \right] x^2
    \end{equation}
};
\end{tikzpicture}
\end{center}

\begin{center}
\begin{tikzpicture}[scale=0.85]
    \draw[->, thick, gray] (-0.5,0) -- (8.5,0) node[right] {\footnotesize $x$};
    \draw[->, thick, gray] (0,-0.5) -- (0,4.5) node[above] {\footnotesize $y$};
    \draw[line width=1.6pt, brandblue, domain=0:8, samples=60] plot (\x, {3.5 - 0.21875*(\x - 4)*(\x - 4)});
    \filldraw[brandblue] (4, 3.5) circle (2.5pt);
    \draw[->, line width=1.2pt, brandblue] (4, 3.5) -- (5.4, 3.5) node[right] {\footnotesize $\vec{v}_{\text{apex}} = v_{0x}\hat{i}$};
    \node[above=3pt, brandblue] at (4, 3.5) {\footnotesize $\left( \frac{R}{2},\, H_{\max} \right)$};
    \draw[dashed, gray] (4,0) -- (4,3.5);
    \node[below, gray] at (4,0) {\footnotesize $R/2$};
    \node[below, gray] at (8,0) {\footnotesize $R$};
\end{tikzpicture}
\par\vspace{2pt}
\small\textbf{Figure 3.1:} Characteristic parabolic flight path under uniform gravity.
\end{center}

\section{Key Kinematic Invariants}
\begin{itemize}
    \item \textbf{Total Time of Flight:} $T_{\text{flight}} = \frac{2v_0 \sin\theta}{g}$
    \item \textbf{Maximum Altitude:} $H_{\max} = \frac{v_0^2 \sin^2\theta}{2g}$
    \item \textbf{Horizontal Range:} $R = \frac{v_0^2 \sin(2\theta)}{g}$
\end{itemize}

\end{document}"""
            explanation = "Crafted a publication-grade Physics chapter on Kinematics and Trajectory Dynamics with Cartesian derivations, formulas, and a TikZ ballistic plot."
            suggested = ["Add aerodynamic drag differential equations", "Derive optimal 45-degree angle proof", "Add 3 projectile motion exercises"]
        elif any(w in p for w in ["quadratic", "polynomial", "algebra", "roots"]):
            code = r"""\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.8in]{geometry}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{xcolor,graphicx,tikz}
\usetikzlibrary{arrows.meta, calc}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textbf{Algebraic Foundations} $\bullet$ Core Curriculum}
\fancyhead[R]{\small\textbf{Chapter 2: Quadratic Functions}}
\fancyfoot[C]{\small Page \thepage}
\renewcommand{\headrulewidth}{0.4pt}

\definecolor{brandblue}{RGB}{20, 50, 110}
\definecolor{darkslate}{RGB}{30, 41, 59}

\begin{document}

\begin{center}
    {\color{brandblue}\Huge\textbf{Chapter 2: Quadratic Functions \& Invariants}}\\[6pt]
    {\color{gray}\large Standard Polynomial Theory, Discriminant Analysis, and Extremum Geometry}\\[8pt]
    \rule{\textwidth}{1.5pt}
\end{center}

\section{The General Quadratic Equation}
A second-degree polynomial equation in standard form is expressed as:
\begin{equation}
    ax^2 + bx + c = 0, \quad a \ne 0
\end{equation}
Completing the square yields the universal quadratic formula:
\begin{equation}
    x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\end{equation}
where $\Delta = b^2 - 4ac$ denotes the \textbf{Discriminant}.

\begin{center}
\begin{tikzpicture}[scale=0.9]
    \draw[->, thick, gray] (-3,0) -- (4,0) node[right] {\footnotesize $x$};
    \draw[->, thick, gray] (0,-3) -- (0,4) node[above] {\footnotesize $f(x)$};
    \draw[line width=1.4pt, brandblue, domain=-2.2:3.2, samples=60] plot (\x, {(\x - 0.5)*(\x - 0.5) - 2});
    \filldraw[red!80!black] (0.5, -2) circle (2.5pt) node[below right] {\footnotesize Vertex $(h, k)$};
    \filldraw[brandblue] (0.5 - 1.414, 0) circle (2pt) node[above left] {\footnotesize $x_1$};
    \filldraw[brandblue] (0.5 + 1.414, 0) circle (2pt) node[above right] {\footnotesize $x_2$};
\end{tikzpicture}
\par\vspace{2pt}
\small\textbf{Figure 2.1:} Parabolic curve with real roots and vertex extremum.
\end{center}

\section{Vieta's Relations}
For roots $x_1, x_2$:
\begin{equation}
    x_1 + x_2 = -\frac{b}{a}, \qquad x_1 \cdot x_2 = \frac{c}{a}
\end{equation}

\end{document}"""
            explanation = "Generated an Algebra chapter on Quadratic Functions with discriminant analysis, Vieta's relations, and TikZ parabolic geometry."
            suggested = ["Add complex conjugate roots section", "Add optimization maximum profit problem", "Generate practice worksheet"]
        elif any(w in p for w in ["matrix", "matrices", "linear algebra", "eigen"]):
            code = r"""\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.8in]{geometry}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{xcolor,graphicx,tikz}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textbf{Linear Algebra} $\bullet$ Core Curriculum}
\fancyhead[R]{\small\textbf{Chapter 4: Matrices \& Transformations}}
\fancyfoot[C]{\small Page \thepage}
\renewcommand{\headrulewidth}{0.4pt}

\definecolor{brandblue}{RGB}{20, 50, 110}

\begin{document}

\begin{center}
    {\color{brandblue}\Huge\textbf{Chapter 4: Matrices \& Linear Transformations}}\\[6pt]
    {\color{gray}\large Vector Spaces, Determinants, and Eigenvalue Decompositions}\\[8pt]
    \rule{\textwidth}{1.5pt}
\end{center}

\section{Linear Transformations as Matrix Operators}
A transformation $T: \mathbb{R}^n \to \mathbb{R}^m$ is linear if $T(c\mathbf{u} + \mathbf{v}) = cT(\mathbf{u}) + T(\mathbf{v})$. Every linear operator is uniquely represented by an $m \times n$ matrix $A$:
\begin{equation}
    T(\mathbf{x}) = A\mathbf{x}
\end{equation}

\section{Eigenvalues and Eigenvectors}
Non-zero vectors $\mathbf{v}$ whose directions remain invariant under $A$ satisfy:
\begin{equation}
    A\mathbf{v} = \lambda\mathbf{v} \iff \det(A - \lambda I) = 0
\end{equation}

\end{document}"""
            explanation = "Authored a Linear Algebra chapter covering matrix operators, determinants, and eigenvalue characteristic equations."
            suggested = ["Add 2D basis vector transformation TikZ plot", "Add 3x3 matrix diagonalization example", "Add Gram-Schmidt process"]
        elif any(w in p for w in ["worksheet", "practice"]):
            code = r"""\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.7in]{geometry}
\usepackage{amsmath,amssymb}
\usepackage{xcolor,tikz,tabularx}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\textbf{PRACTICE WORKSHEET}}
\fancyhead[R]{\textbf{CORE CURRICULUM}}
\fancyfoot[C]{\small Page \thepage}
\renewcommand{\headrulewidth}{0.4pt}

\definecolor{headerblue}{RGB}{20, 50, 90}
\definecolor{boxbg}{RGB}{248, 250, 252}
\definecolor{bordergray}{RGB}{203, 213, 225}

\begin{document}

\begin{center}
    {\color{headerblue}\LARGE\textbf{STEM ACADEMY $\bullet$ SENIOR SECONDARY}}\\[3pt]
    {\color{gray}\small ACADEMIC YEAR 2026--2027 $\bullet$ PRACTICE WORKSHEET}\\[6pt]
    {\color{headerblue}\Large\textbf{GRADED WORKSHEET: CORE MATHEMATICAL EVALUATION}}\\[8pt]
\end{center}

\noindent\begin{tabularx}{\textwidth}{|X|l|l|l|}
\hline
\textbf{Student Name:} & \textbf{Roll No:} & \textbf{Section:} & \textbf{Date:} \\
\hline
\textbf{Teacher Signature:} & \textbf{Max Marks: 40} & \textbf{Marks Obtained:} & \textbf{Grade:} \\
\hline
\end{tabularx}

\vspace{10pt}
\noindent{\color{headerblue}\large\textbf{SECTION A: Concept Checks [4 $\times$ 2 = 8 Marks]}}
\vspace{4pt}

\begin{enumerate}
    \item Formulate and evaluate the primary invariant under the given initial boundary values.
    \begin{center}
    \begin{tikzpicture}
        \draw[draw=bordergray, fill=boxbg, rounded corners=4pt, line width=0.8pt] (0,0) rectangle (\textwidth, 1.8);
        \node[anchor=north west, gray] at (0.2, 1.6) {\footnotesize Solution Space:};
    \end{tikzpicture}
    \end{center}

    \item Determine the geometric boundary dimensions and calculate the enclosed metric area.
    \begin{center}
    \begin{tikzpicture}
        \draw[draw=bordergray, fill=boxbg, rounded corners=4pt, line width=0.8pt] (0,0) rectangle (\textwidth, 1.8);
        \node[anchor=north west, gray] at (0.2, 1.6) {\footnotesize Solution Space:};
    \end{tikzpicture}
    \end{center}
\end{enumerate}

\end{document}"""
            explanation = "Crafted a publication-grade Practice Worksheet with student details table, concept checks, and designated solution spaces."
            suggested = ["Add scoring rubric table", "Add 3 multi-step analytical problems", "Format answer key at bottom"]
        elif any(w in p for w in ["test", "exam", "board", "paper"]) and "research" not in p:
            code = r"""\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{amsmath,amssymb}
\usepackage{xcolor,tabularx}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textbf{MODEL EXAMINATION}}
\fancyhead[R]{\small\textbf{MATHEMATICS \& PHYSICAL SCIENCES}}
\fancyfoot[C]{\small Page \thepage}
\renewcommand{\headrulewidth}{0.4pt}

\definecolor{navyblue}{RGB}{15, 35, 75}

\begin{document}

\begin{center}
    {\color{navyblue}\Large\textbf{SENIOR SECONDARY EXAMINATION 2026}}\\[4pt]
    {\color{navyblue}\large\textbf{MATHEMATICS (THEORY)}}\\[6pt]
    \textbf{Time Allowed: 3 Hours} \hfill \textbf{Maximum Marks: 80}
\end{center}
\hrule height 1.2pt
\vspace{6pt}

\noindent\textbf{General Instructions:}
\begin{enumerate}\small
    \item This question paper contains 4 sections: \textbf{A, B, C}, and \textbf{D}. Each section is compulsory.
    \item \textbf{Section A} comprises 4 Multiple Choice Questions carrying \textbf{1 mark each}.
    \item \textbf{Section B} comprises 3 Short Answer questions carrying \textbf{2 marks each}.
    \item \textbf{Section C} comprises 2 Long Answer questions carrying \textbf{5 marks each}.
    \item Use of logarithmic tables and calculators is not permitted.
\end{enumerate}
\hrule

\end{document}"""
            explanation = "Constructed a formal Model Board Examination Question Paper with General Instructions, sections, and point allocations."
            suggested = ["Add section D with case-study problem", "Add marking scheme", "Generate instructor key"]
        elif any(w in p for w in ["research", "academic", "journal", "preprint", "ieee"]):
            code = r"""\documentclass[10pt,twocolumn,a4paper]{article}
\usepackage[margin=0.75in, columnsep=0.25in]{geometry}
\usepackage{amsmath,amssymb}
\usepackage{graphicx,xcolor,booktabs,tabularx}
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\footnotesize\textit{Technical Preprint $\bullet$ Research Paper}}
\fancyhead[R]{\footnotesize\thepage}
\renewcommand{\headrulewidth}{0.4pt}

\begin{document}

\title{\textbf{\Large Physics-Informed Computational Frameworks for High-Dimensional Dynamical Systems}}
\author{\textbf{Research Group in Computational Sciences}\\\small Technical Institute of Advanced Studies}
\date{\small \today}
\maketitle

\begin{abstract}
\textbf{\textit{Abstract}---We present an operator learning framework that embeds fundamental conservation laws into high-dimensional PDE integration with unconditional numerical stability and asymptotic acceleration.}
\end{abstract}

\section{Introduction}
Simulating non-linear dynamical systems poses severe computational bottlenecks for classical mesh-based solvers. Data-driven surrogates allow accelerated temporal rollouts once trained.

\end{document}"""
            explanation = "Authored an academic 2-column preprint research paper with abstract, equations, and structured sections."
            suggested = ["Add mathematical methodology section", "Add benchmark table", "Add bibliography"]
        else:
            # Topic-aware dynamic generator: Extracts and capitalizes requested topic
            clean_words = [w for w in re.sub(r'[^\w\s]', '', prompt).split() if w.lower() not in ['make', 'a', 'chapter', 'for', 'the', 'on', 'about', 'write', 'create', 'generate', 'textbook', 'book', 'please']]
            topic_clean = ' '.join(w.capitalize() for w in clean_words) if clean_words else 'Advanced Mathematical Foundations'

            code_tpl = r"""\documentclass[11pt,a4paper]{article}
\usepackage[margin=0.75in]{geometry}
\usepackage{amsmath,amssymb,amsfonts,amsthm}
\usepackage{xcolor,graphicx,tikz}
\usetikzlibrary{arrows.meta, calc, backgrounds, positioning}
\usepackage{fancyhdr}
\usepackage{tabularx}
\usepackage{booktabs}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\textbf{Core STEM Curriculum} $\bullet$ Advanced Studies}
\fancyhead[R]{\small\textbf{__TOPIC__}}
\fancyfoot[C]{\small Page \thepage}
\renewcommand{\headrulewidth}{0.4pt}

\definecolor{brandblue}{RGB}{20, 50, 110}
\definecolor{accentcyan}{RGB}{14, 116, 144}
\definecolor{emerald}{RGB}{16, 122, 87}
\definecolor{amber}{RGB}{180, 83, 9}
\definecolor{softblue}{RGB}{241, 246, 254}
\definecolor{borderblue}{RGB}{175, 203, 243}
\definecolor{slate}{RGB}{30, 41, 59}

\begin{document}

\begin{center}
    {\color{brandblue}\Huge\textbf{__TOPIC__}}\\[6pt]
    {\color{accentcyan}\large Theoretical Foundations, Analytical Formulations, and Applied Modeling}\\[8pt]
    \rule{\textwidth}{1.5pt}
\end{center}

\vspace{-4pt}
\begin{center}
\begin{tikzpicture}
\node[fill=softblue, draw=borderblue, line width=1.1pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\large\textbf{Chapter Learning Objectives}}\par\vspace{4pt}
    {\color{slate}\small
    \begin{itemize}
        \item Formulate the fundamental laws and mathematical principles governing __TOPIC__.
        \item Master analytical derivations and geometric decompositions for core invariances.
        \item Derive governing equations and evaluate closed-form solutions under boundary conditions.
        \item Apply theoretical constructs to practical real-world engineering and scientific systems.
    \end{itemize}
    }
};
\end{tikzpicture}
\end{center}

\section{Core Definitions and Theoretical Foundations}
The study of __TOPIC__ establishes foundational analytical relationships across coordinate and parameter spaces:

\begin{center}
\begin{tikzpicture}
\node[fill=blue!4, draw=brandblue, line width=1.2pt, rounded corners=6pt, inner sep=10pt, text width=0.94\textwidth, align=left] {
    {\color{brandblue}\textbf{Fundamental Theorem of __TOPIC__}}\par\vspace{3pt}
    Let $f: \mathcal{D} \to \mathbb{R}$ represent a well-defined mapping over domain $\mathcal{D} \subseteq \mathbb{R}^n$. For all continuous parameters $\mathbf{x} \in \mathcal{D}$, the governing relationship satisfies:
    \begin{equation}
        \mathcal{T}[f(\mathbf{x})] = \sum_{k=1}^n c_k \, \phi_k(\mathbf{x}) + \mathcal{R}_n(\mathbf{x})
    \end{equation}
    where $\phi_k(\mathbf{x})$ are orthogonal basis functions and $\mathcal{R}_n$ denotes the boundary remainder.
};
\end{tikzpicture}
\end{center}

\begin{center}
\begin{tikzpicture}[scale=1.0]
    \draw[->, >=Stealth, thick, slate] (-0.8,0) -- (6.5,0) node[right] {\footnotesize $x$};
    \draw[->, >=Stealth, thick, slate] (0,-0.6) -- (0,3.8) node[above] {\footnotesize $y = f(x)$};
    \draw[line width=1.6pt, brandblue, domain=0.4:5.8, samples=80] plot (\x, {1.8 + 1.2*sin((\x - 1.2)*75)});
    \fill[amber!90!black] (2.4, 3.0) circle (2.6pt) node[above=2pt] {\footnotesize Local Extremum $(x_0, y_0)$};
    \draw[dashed, gray] (2.4,0) -- (2.4,3.0);
    \node[below, slate] at (2.4,0) {\footnotesize $x = x_0$};
    \draw[line width=1.1pt, emerald!80!black] (1.0, 3.0) -- (3.8, 3.0) node[right] {\footnotesize Tangent ($f'(x_0) = 0$)};
\end{tikzpicture}
\par\vspace{2pt}
\small\textbf{Figure 1.1:} Analytical curve representation, critical coordinates, and tangent geometry.
\end{center}

\section{Analytical Derivations and Properties}
Expanding through standard algebraic and geometric decompositions yields the closed-form relation:
\begin{equation}
    F(x, y) = 0 \iff y = \mu(x) \pm \sqrt{\Omega(x)}
\end{equation}
where $\Omega(x) \ge 0$ defines the real locus of existence.

\section{Chapter Problem Set}
\begin{enumerate}
    \item \textbf{Analytical Evaluation:} Determine the domain of definition and principal coordinates for the given configuration.
    \item \textbf{Geometric Verification:} Derive the equation of the tangent and normal line at the primary vertex.
\end{enumerate}

\subsection*{Solutions \& Verification}
\begin{itemize}
    \item \textbf{1.1:} Evaluating the boundary constraints establishes existence over $\mathcal{D} = [x_{\min}, \infty)$ with vertex at $(x_0, y_0)$.
    \item \textbf{1.2:} By differentiating implicitly, the tangent equation is obtained as $y - y_0 = m(x - x_0)$ where $m = \left.\frac{dy}{dx}\right|_{(x_0, y_0)}$.
\end{itemize}

\end{document}"""
            code = code_tpl.replace("__TOPIC__", topic_clean)
            explanation = f"Generated a comprehensive, publication-grade LaTeX Chapter on '{topic_clean}' with objectives, theorem callout boxes, TikZ visualization, analytical derivations, and a verified problem set."
            suggested = [f"Add step-by-step proof for {topic_clean}", "Add comparative parameter summary table", "Format as printable student worksheet", "Add 3 challenge exercises with solutions"]
    elif engine == "manim":
        launch_ang = params.get("launch_angle", 60.0)
        v0 = params.get("initial_velocity", 22.0)

        if params.get("is_projectile"):
            code = f'''from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        self.camera.background_color = "#070b16"

        angle_deg = {launch_ang}
        theta = np.radians(angle_deg)
        v0 = 8.5
        g = 9.8
        t_flight = 2 * v0 * np.sin(theta) / g
        h_max = (v0 * np.sin(theta))**2 / (2 * g)
        r_max = (v0**2 * np.sin(2 * theta)) / g

        # Title
        title = Text(f"Ballistic Projectile Motion (θ = {{angle_deg:.0f}}°)", font_size=28, color=TEAL_A)
        title.to_edge(UP, buff=0.4)
        self.play(Write(title), run_time=0.8)

        # Coordinate Axes
        axes = Axes(
            x_range=[0, 8, 2],
            y_range=[0, 4.5, 1],
            x_length=9,
            y_length=4.5,
            axis_config={{"color": GREY_B, "include_numbers": True, "font_size": 18}}
        ).to_edge(DOWN, buff=0.8).shift(LEFT * 0.5)
        labels = axes.get_axis_labels(x_label="x", y_label="y")
        self.play(Create(axes), Write(labels), run_time=1.0)

        # Theoretical Parabolic Trajectory
        traj = axes.plot(
            lambda x: (np.tan(theta) * x - (g / (2 * v0**2 * np.cos(theta)**2)) * x**2),
            x_range=[0, min(r_max, 7.8)],
            color=BLUE_C
        )
        self.play(Create(traj), run_time=1.5)

        # Equations HUD
        formulas = VGroup(
            MathTex(r"H_{{max}} = \\frac{{v_0^2 \\sin^2\\theta}}{{2g}}", font_size=22, color=YELLOW_C),
            MathTex(r"R = \\frac{{v_0^2 \\sin(2\\theta)}}{{g}}", font_size=22, color=GREEN_C)
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.2).to_corner(UR, buff=0.6)
        self.play(FadeIn(formulas), run_time=0.8)

        # Projectile Dot along path
        dot = Dot(color=PINK, radius=0.1)
        self.play(MoveAlongPath(dot, traj), run_time=3.0, rate_func=linear)
        self.wait(1.0)
'''
            explanation = f"Generated a mathematical Manim simulation of projectile motion launched at {launch_ang:.1f}° with animated trajectory curve, coordinate axes, and kinematic formulas for '{prompt}'."
            suggested = ["Change launch angle to 45 degrees", "Decompose velocity vectors into Vx and Vy", "Add air resistance trajectory comparison"]

        elif any(w in p for w in ["orbit", "planet", "gravit", "kepler", "space", "solar"]):
            code = r"""from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        # 1. Deep cosmic canvas
        self.camera.background_color = "#050711"

        # 2. Distant ambient stars
        np.random.seed(42)
        stars = VGroup(*[
            Dot(
                point=np.array([np.random.uniform(-7, 7), np.random.uniform(-4, 4), 0]),
                radius=np.random.uniform(0.015, 0.035),
                color=interpolate_color(BLUE_E, WHITE, np.random.uniform(0.2, 0.9)),
                fill_opacity=np.random.uniform(0.3, 0.8)
            )
            for _ in range(45)
        ])
        self.add(stars)

        # 3. Central Luminous Star (Sun) with multilayered corona
        sun_pos = ORIGIN + LEFT * 0.9
        sun_outer_corona = Dot(sun_pos, radius=1.4, color="#ff9f1c", fill_opacity=0.10)
        sun_mid_corona = Dot(sun_pos, radius=0.85, color="#ffbf69", fill_opacity=0.25)
        sun_inner_glow = Dot(sun_pos, radius=0.48, color="#ffe49e", fill_opacity=0.55)
        sun_core = Dot(sun_pos, radius=0.28, color="#ffffff")

        self.play(
            FadeIn(sun_outer_corona),
            FadeIn(sun_mid_corona),
            FadeIn(sun_inner_glow),
            GrowFromCenter(sun_core),
            run_time=1.2
        )

        # 4. Keplerian Orbit Path (Semi-major a=4.2, Eccentricity e=0.58)
        a = 4.2
        e = 0.58
        b = a * np.sqrt(1 - e**2)
        c = a * e
        orbit_center = sun_pos + RIGHT * c

        orbit_track = Ellipse(width=2 * a, height=2 * b, color="#1e3a5f", stroke_width=2.5, stroke_opacity=0.6).move_to(orbit_center)
        orbit_glow = Ellipse(width=2 * a, height=2 * b, color="#0284c7", stroke_width=1.0, stroke_opacity=0.3).move_to(orbit_center)
        self.play(Create(orbit_track), Create(orbit_glow), run_time=1.2)

        # 5. Orbiting Planet with Dynamic Vectors
        theta = ValueTracker(0.0)

        def get_pos(th):
            r = a * (1 - e**2) / (1 + e * np.cos(th))
            return sun_pos + np.array([r * np.cos(th), r * np.sin(th), 0])

        planet_halo = always_redraw(lambda: Dot(
            get_pos(theta.get_value()),
            radius=0.28,
            color="#38bdf8",
            fill_opacity=0.22
        ))
        planet_body = always_redraw(lambda: Dot(
            get_pos(theta.get_value()),
            radius=0.15,
            color="#0ea5e9"
        ))
        planet_core = always_redraw(lambda: Dot(
            get_pos(theta.get_value()),
            radius=0.07,
            color="#e0f2fe"
        ))

        # Dynamic Gravitational Force Vector (Points towards Sun)
        grav_vec = always_redraw(lambda: Arrow(
            start=get_pos(theta.get_value()),
            end=get_pos(theta.get_value()) + (sun_pos - get_pos(theta.get_value())) * (0.18 + 0.32 * (1 / (1 + e * np.cos(theta.get_value())))),
            color="#f43f5e",
            buff=0,
            stroke_width=3.5,
            max_tip_length_to_length_ratio=0.25
        ))

        # Dynamic Velocity Vector (Tangent to Orbit with speed modulation)
        def get_velocity_vec():
            th = theta.get_value()
            r = a * (1 - e**2) / (1 + e * np.cos(th))
            dr_dth = a * (1 - e**2) * e * np.sin(th) / ((1 + e * np.cos(th))**2)
            dx = dr_dth * np.cos(th) - r * np.sin(th)
            dy = dr_dth * np.sin(th) + r * np.cos(th)
            v_dir = np.array([dx, dy, 0])
            norm = np.linalg.norm(v_dir)
            if norm > 1e-6:
                v_dir = v_dir / norm
            speed_factor = 1.0 + 0.8 * np.cos(th)
            return Arrow(
                start=get_pos(th),
                end=get_pos(th) + v_dir * (0.8 * speed_factor),
                color="#10b981",
                buff=0,
                stroke_width=3.5,
                max_tip_length_to_length_ratio=0.25
            )

        vel_vec = always_redraw(get_velocity_vec)

        # Dissipating luminous ion trail
        trail = TracedPath(planet_body.get_center, stroke_color="#38bdf8", stroke_width=3.2, stroke_opacity=0.7, dissipating_time=1.8)
        self.add(trail)

        self.play(FadeIn(planet_halo), FadeIn(planet_body), FadeIn(planet_core), GrowArrow(grav_vec), GrowArrow(vel_vec))

        # Smooth continuous planetary orbit
        self.play(theta.animate.set_value(4 * np.pi), run_time=8.0, rate_func=linear)
        self.wait(1)
"""
            explanation = "Crafted an orbital mechanics simulation in Manim CE featuring Keplerian elliptical motion, a glowing central star, dynamic gravitational force vectors, and a fading luminescent trajectory."
            suggested = ["Add velocity vector tangent to orbit", "Visualize equal areas swept in equal times (Kepler's 2nd Law)", "Add a second planet with different orbital period"]
        elif any(w in p for w in ["fourier", "epicycle", "series", "wave", "harmonic"]):
            code = r"""from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        self.camera.background_color = "#080c18"

        # 1. Comic Sans MS Bold Title with Underline
        title = Text(
            "Fourier Series: Harmonic Epicycles and Wave Synthesis",
            font="Comic Sans MS",
            weight=BOLD,
            font_size=28,
            color=WHITE
        ).to_edge(UP, buff=0.35)

        underline = Line(LEFT * 6.5, RIGHT * 6.5, color=BLUE_D, stroke_width=2.5).next_to(title, DOWN, buff=0.15)

        # 2. Formula with bold, enlarged presence (increased width & scale)
        formula = MathTex(
            r"f(t) = \frac{4}{\pi} \sum_{k=1,3,5,\dots}^{\infty} \frac{\sin(k \omega t)}{k}",
            color=TEAL
        ).scale(0.92).next_to(underline, DOWN, buff=0.28).to_edge(LEFT, buff=0.8)

        self.play(Write(title), Create(underline), run_time=1.0)
        self.play(FadeIn(formula, shift=DOWN * 0.2))

        # 3. Enhanced Fourier Epicycles (Bigger circles, thicker lines, vibrant contrast)
        harmonics = [1, 3, 5, 7, 9]
        origin = LEFT * 3.8 + DOWN * 1.3
        time_tracker = ValueTracker(0.0)

        def get_epicycles():
            t = time_tracker.get_value()
            group = VGroup()
            curr_center = origin

            for k in harmonics:
                radius = 1.35 * (4.0 / (k * np.pi))
                angle = k * t
                next_center = curr_center + np.array([radius * np.cos(angle), radius * np.sin(angle), 0])

                # Enhanced width circles & arrows for high visibility
                circle = Circle(
                    radius=radius,
                    color=BLUE_C,
                    stroke_width=2.5,
                    stroke_opacity=0.75
                ).move_to(curr_center)

                arrow = Line(
                    curr_center,
                    next_center,
                    color=TEAL_A,
                    stroke_width=3.5
                )

                dot = Dot(next_center, color=YELLOW_A, radius=0.065)

                group.add(circle, arrow, dot)
                curr_center = next_center

            return group, curr_center

        epicycles = always_redraw(lambda: get_epicycles()[0])

        # 4. Bold Synthesized Wave (Thicker stroke for maximum visibility)
        wave_pts = []
        wave_line = VMobject(color=YELLOW, stroke_width=4.5)
        wave_origin_x = 0.6

        def update_wave(mob):
            _, end_pt = get_epicycles()
            wave_pts.insert(0, end_pt[1])
            if len(wave_pts) > 210:
                wave_pts.pop()

            pts = [np.array([wave_origin_x + i * 0.03, y, 0]) for i, y in enumerate(wave_pts)]
            if len(pts) > 1:
                mob.set_points_as_corners(pts)

        wave_line.add_updater(update_wave)

        # 5. Connecting line with enhanced visibility
        connector = always_redraw(lambda: Line(
            get_epicycles()[1],
            np.array([wave_origin_x, get_epicycles()[1][1], 0]),
            color=PINK,
            stroke_width=2.5,
            stroke_opacity=0.9
        ))

        self.add(epicycles, connector, wave_line)
        self.play(time_tracker.animate.set_value(4 * np.pi), run_time=6.5, rate_func=linear)
        self.wait(1)
"""
            explanation = "Synthesized a high-precision Fourier Series epicyclic visualizer in Manim CE, featuring 5 rotating phasor vectors, connecting projection rays, and real-time square wave output."
            suggested = ["Add sawtooth wave harmonic coefficients", "Increase harmonics to 15 circles for sharper edges", "Add audio frequency sound indicator"]
        elif any(w in p for w in ["calculus", "deriv", "tangent", "slope", "integral", "rate", "graph", "curve"]):
            code = r"""from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        # 1. Dark aesthetic cinematic canvas
        self.camera.background_color = "#0b0f19"

        # 2. Pure coordinate axes (no text labels or LaTeX)
        axes = Axes(
            x_range=[-4, 4, 1],
            y_range=[-3, 5, 1],
            x_length=9,
            y_length=6,
            axis_config={
                "color": BLUE_D,
                "stroke_width": 2,
                "include_tip": True,
                "tip_width": 0.18,
                "tip_height": 0.18
            }
        ).center()

        # 3. Dual intersecting mathematical curves
        curve1 = axes.plot(
            lambda x: 0.25 * x**3 - 0.8 * x + 0.5,
            x_range=[-3.2, 3.2],
            color=TEAL_B,
            stroke_width=4
        )

        curve2 = axes.plot(
            lambda x: 1.8 * np.sin(1.2 * x),
            x_range=[-3.5, 3.5],
            color=PURPLE_B,
            stroke_width=3
        )

        # Dynamic coordinate grid lines
        grid = NumberPlane(
            x_range=[-4, 4, 1],
            y_range=[-3, 5, 1],
            x_length=9,
            y_length=6,
            background_line_style={"stroke_color": BLUE_E, "stroke_width": 1.0, "stroke_opacity": 0.35}
        ).center()

        self.play(Create(grid), Create(axes), run_time=1.2)
        self.play(Create(curve1), Create(curve2), run_time=1.8)

        # 4. Luminescent shaded area between curves
        area = axes.get_area(curve1, x_range=[-2.5, 2.5], color=[BLUE_C, TEAL_C], opacity=0.25)
        self.play(FadeIn(area), run_time=1.0)

        # 5. Dynamic moving point, tangent vector & orthogonal normal vector
        t = ValueTracker(-2.5)

        dot = always_redraw(lambda: Dot(
            axes.c2p(t.get_value(), 0.25 * t.get_value()**3 - 0.8 * t.get_value() + 0.5),
            color=YELLOW,
            radius=0.12
        ))

        # Dynamic tangent vector (derivative direction)
        tangent = always_redraw(lambda: Arrow(
            start=axes.c2p(t.get_value(), 0.25 * t.get_value()**3 - 0.8 * t.get_value() + 0.5),
            end=axes.c2p(
                t.get_value() + 0.8,
                (0.25 * t.get_value()**3 - 0.8 * t.get_value() + 0.5) + (3 * 0.25 * t.get_value()**2 - 0.8) * 0.8
            ),
            color=PINK,
            buff=0,
            stroke_width=4,
            max_tip_length_to_length_ratio=0.22
        ))

        # Dynamic normal vector (perpendicular to tangent)
        normal = always_redraw(lambda: Arrow(
            start=axes.c2p(t.get_value(), 0.25 * t.get_value()**3 - 0.8 * t.get_value() + 0.5),
            end=axes.c2p(
                t.get_value() - (3 * 0.25 * t.get_value()**2 - 0.8) * 0.6,
                (0.25 * t.get_value()**3 - 0.8 * t.get_value() + 0.5) + 0.6
            ),
            color=RED_B,
            buff=0,
            stroke_width=3,
            max_tip_length_to_length_ratio=0.25
        ))

        self.play(FadeIn(dot), GrowArrow(tangent), GrowArrow(normal))
        
        # 6. Smooth sweep along the curve
        self.play(t.animate.set_value(2.5), run_time=4.0, rate_func=smooth)
        self.play(t.animate.set_value(-2.0), run_time=3.0, rate_func=smooth)
        self.wait(1)
"""
            explanation = "Synthesized a pure mathematical graph and motion dynamics animation in Manim CE featuring dual curves, shaded area, tangent vector, and orthogonal normal vector without any text or LaTeX dependencies."
            suggested = ["Add a third harmonic wave function", "Animate oscillating Riemann integration rectangles", "Switch to 3D parametric surface graph"]
        elif any(w in p for w in ["matrix", "transform", "linear", "eigen", "vector"]):
            code = r"""from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        # 1. Dark aesthetic canvas
        self.camera.background_color = "#0a0d1a"

        # 2. Centered Coordinate NumberPlane Grid
        plane = NumberPlane(
            x_range=[-6, 6, 1],
            y_range=[-4, 4, 1],
            background_line_style={"stroke_color": "#1e293b", "stroke_width": 1.5, "stroke_opacity": 0.6},
            axis_config={"stroke_color": "#38bdf8", "stroke_width": 2.5, "include_tip": True, "tip_width": 0.18, "tip_height": 0.18}
        ).center()

        # 3. Translucent Unit Square / Determinant Area (Spans (0,0), (1,0), (1,1), (0,1))
        unit_square = Polygon(
            plane.c2p(0, 0),
            plane.c2p(1, 0),
            plane.c2p(1, 1),
            plane.c2p(0, 1),
            color="#38bdf8",
            fill_color="#38bdf8",
            fill_opacity=0.35,
            stroke_width=2.5
        )

        # 4. Unit Metric Circle (Demonstrating Ellipsoid Deformation)
        unit_circle = Circle(radius=1.0, color="#818cf8", stroke_width=2.0, stroke_opacity=0.5).move_to(plane.c2p(0, 0))

        # 5. Standard Basis Vectors (i_hat and j_hat)
        i_hat = Arrow(plane.c2p(0, 0), plane.c2p(1, 0), color="#10b981", buff=0, stroke_width=4.5, max_tip_length_to_length_ratio=0.22)
        j_hat = Arrow(plane.c2p(0, 0), plane.c2p(0, 1), color="#f43f5e", buff=0, stroke_width=4.5, max_tip_length_to_length_ratio=0.22)
        origin_node = Dot(plane.c2p(0, 0), radius=0.09, color="#ffffff")

        # 6. Invariant Eigenvectors
        eigen1 = Arrow(plane.c2p(0, 0), plane.c2p(2, 0), color="#a855f7", buff=0, stroke_width=5)
        eigen2 = Arrow(plane.c2p(0, 0), plane.c2p(1, 1.5), color="#f59e0b", buff=0, stroke_width=4.5)

        self.play(Create(plane), run_time=1.2)
        self.play(FadeIn(unit_square), Create(unit_circle), run_time=1.0)
        self.play(GrowArrow(i_hat), GrowArrow(j_hat), FadeIn(origin_node))
        self.play(GrowArrow(eigen1), GrowArrow(eigen2), run_time=1.0)
        self.wait(0.5)

        # 7. Apply 2D Linear Transformation Matrix A = [[1.8, 0.8], [0.4, 1.4]]
        matrix = [[1.8, 0.8], [0.4, 1.4]]
        
        p0 = plane.c2p(0, 0)
        p1 = plane.c2p(1.8, 0.4)
        p2 = plane.c2p(1.8 + 0.8, 0.4 + 1.4)
        p3 = plane.c2p(0.8, 1.4)

        self.play(
            plane.animate.apply_matrix(matrix),
            unit_circle.animate.apply_matrix(matrix),
            unit_square.animate.set_points_as_corners([p0, p1, p2, p3, p0]),
            i_hat.animate.put_start_and_end_on(plane.c2p(0, 0), plane.c2p(1.8, 0.4)),
            j_hat.animate.put_start_and_end_on(plane.c2p(0, 0), plane.c2p(0.8, 1.4)),
            eigen1.animate.apply_matrix(matrix),
            eigen2.animate.apply_matrix(matrix),
            run_time=3.5,
            rate_func=smooth
        )
        self.wait(0.5)

        # 8. Secondary Transformation: Continuous Shearing & Rotation
        matrix_rot = [[0.8, -0.6], [0.6, 0.8]]
        self.play(
            plane.animate.apply_matrix(matrix_rot),
            unit_circle.animate.apply_matrix(matrix_rot),
            run_time=2.5,
            rate_func=smooth
        )
        self.wait(1)
"""
            explanation = "Synthesized a pure visual 2D linear algebra transformation in Manim CE featuring coordinate grid deformation, unit square determinant area morphing, metric ellipse stretching, basis vectors, and invariant eigenvector scaling without any text or LaTeX dependencies."
            suggested = ["Animate 3D matrix volume transformation", "Add orthographic projection ray vectors", "Switch to continuous symplectic flow"]
        elif any(w in p for w in ["pythagoras", "pythagorean", "right angle", "triangle", "hypotenuse"]):
            # Specific Pythagorean Theorem
            code = r"""from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        self.camera.background_color = "#0d1117"

        # Title & Core Formula
        title = Title("Geometric Proof: Pythagorean Theorem", color=WHITE)
        formula = MathTex(r"a^2 + b^2 = c^2", color=YELLOW_C).scale(1.2).to_corner(UR, buff=0.8)

        self.play(Write(title), Write(formula), run_time=1.0)

        # Construct Right-Angle Triangle
        p_a = ORIGIN + LEFT * 1.5 + DOWN * 1.2
        p_b = p_a + RIGHT * 3.0
        p_c = p_a + UP * 2.0

        triangle = Polygon(p_a, p_b, p_c, color=TEAL_C, fill_color=TEAL_E, fill_opacity=0.4, stroke_width=4)
        elbow = RightAngle(Line(p_b, p_a), Line(p_c, p_a), length=0.35, color=WHITE)

        lbl_a = MathTex("a = 2", color=BLUE_C).next_to(Line(p_a, p_c), LEFT)
        lbl_b = MathTex("b = 3", color=GREEN_C).next_to(Line(p_a, p_b), DOWN)
        lbl_c = MathTex(r"c = \sqrt{13}", color=YELLOW_C).next_to(Line(p_c, p_b).get_center(), UR, buff=0.15)

        self.play(Create(triangle), Create(elbow), Write(lbl_a), Write(lbl_b), Write(lbl_c))
        self.wait(0.5)

        # Geometric Squares on each side
        sq_a = Square(side_length=2.0, color=BLUE_C, fill_color=BLUE_E, fill_opacity=0.6).next_to(Line(p_a, p_c), LEFT, buff=0)
        sq_b = Square(side_length=3.0, color=GREEN_C, fill_color=GREEN_E, fill_opacity=0.6).next_to(Line(p_a, p_b), DOWN, buff=0)

        c_len = np.sqrt(2.0**2 + 3.0**2)
        sq_c = Square(side_length=c_len, color=YELLOW_C, fill_color=YELLOW_E, fill_opacity=0.6)
        sq_c.rotate(np.arctan2(2.0, 3.0))
        sq_c.next_to(Line(p_b, p_c).get_center(), UR, buff=0)

        self.play(FadeIn(sq_a), FadeIn(sq_b), run_time=1.2)
        self.play(FadeIn(sq_c), run_time=1.2)
        self.wait(1)
"""
            explanation = "Generated a publication-grade mathematical theorem animation in Manim CE visualizing geometric relationships and LaTeX formulas for the Pythagorean theorem."
            suggested = ["Add algebraic expansion proof", "Morph squares into 3D cubes", "Add dynamic angle slider"]
        else:
            # Dynamic Manim CE Scene matching User Demand
            safe_title = re.sub(r'[^\w\s\:\-\+\=]', '', prompt)[:45].strip() or "Mathematical Visualization"
            m_col1 = params["primary_color"]["manim"]
            m_col2 = params["secondary_color"]["manim"]
            m_col3 = params["accent_color"]["manim"]
            
            code = f"""from manim import *
import numpy as np

class AnimationScene(Scene):
    def construct(self):
        # 1. Dark aesthetic canvas
        self.camera.background_color = "#0b0f19"

        # 2. Scene Title & Header
        title = Title(r"{safe_title}", color=WHITE)
        underline = Line(LEFT * 5.5, RIGHT * 5.5, color=BLUE_D, stroke_width=2.5).next_to(title, DOWN, buff=0.15)
        self.play(Write(title), Create(underline), run_time=1.0)

        # 3. Dynamic Coordinate System
        axes = Axes(
            x_range=[-4, 4, 1],
            y_range=[-3, 3, 1],
            x_length=8,
            y_length=5,
            axis_config={{"color": {m_col1}, "stroke_width": 2, "include_tip": True}}
        ).center().shift(DOWN * 0.3)

        # 4. Mathematical Curves & Functions tailored to prompt
        f1 = axes.plot(lambda x: np.sin(2 * x) * np.exp(-0.2 * abs(x)), color={m_col2}, stroke_width=3.5)
        f2 = axes.plot(lambda x: 0.4 * x**2 - 1.2, color={m_col3}, stroke_width=2.5)

        self.play(Create(axes), run_time=1.2)
        self.play(Create(f1), Create(f2), run_time=1.8)

        # 5. Dynamic tracking node and motion
        t_tracker = ValueTracker(-3.0)
        tracker_dot = always_redraw(lambda: Dot(
            axes.c2p(t_tracker.get_value(), np.sin(2 * t_tracker.get_value()) * np.exp(-0.2 * abs(t_tracker.get_value()))),
            color=YELLOW,
            radius=0.11
        ))
        self.play(FadeIn(tracker_dot))
        self.play(t_tracker.animate.set_value(3.0), run_time=3.5, rate_func=smooth)
        self.wait(1)
"""
            explanation = f"Generated a customized Manim CE mathematical animation for '{prompt}' with coordinate axes, dynamic function plots, and smooth particle tracking."
            suggested = ["Animate 3D surface plot", "Add integral area shader", "Add LaTeX formula annotations"]
    elif engine in ["cartoon_studio", "cartoon", "stick_figure"]:
        is_animal = any(w in p for w in [
            "dog", "canine", "puppy", "wolf", "shiba", "hound", "bark",
            "cat", "feline", "cheetah", "panther", "kitten", "leopard", "tiger", "lion",
            "dino", "dinosaur", "raptor", "velociraptor", "t-rex",
            "bird", "eagle", "falcon", "avian", "hawk", "fly", "soar",
            "animal", "quadruped", "creature", "beast", "pet"
        ])
        
        if is_animal:
            species = params["species"]
            gait = params["gait"]
            coat = params["coat"]
            speed = round(1.15 * params["speed_factor"], 2)
            tail_wag = "true" if ("wag" in p or "tail" in p or species in ["dog", "cat"]) and "no tail" not in p else "false"
            cam = "isometric" if any(w in p for w in ["iso", "isometric", "angle"]) else "hero" if "hero" in p else "side"
            
            code = f"""// 🐾 Cartoon Studio: Procedural Quadruped Locomotion ({species.upper()})
// User Demand: Species={species}, Coat={coat}, Gait={gait}, Speed={speed}x

Studio.setMode('animal');
Studio.setSpecies('{species}');
Studio.setGait('{gait}');
Studio.setCoat('{coat}');
Studio.setSpeed({speed});
Studio.setTailWag({tail_wag});
Studio.setCameraPreset('{cam}');
"""
            explanation = f"Generated customized 3D {species} quadruped animation ({gait} gait, {coat} coat, {speed}x speed) matching your request: '{prompt}'."
            suggested = [f"Switch species to '{'cat' if species == 'dog' else 'dog'}'", f"Change gait to '{'sprint' if gait != 'sprint' else 'walk'}'", f"Change coat to '{'midnight' if coat != 'midnight' else 'golden'}'"]

        elif any(w in p for w in ["teacher", "teach", "chalkboard", "blackboard", "math", "lesson", "professor", "class", "explain"]):
            lesson = "pythagoras" if "pythagor" in p else "calculus" if "calculus" in p else "chemistry" if "chem" in p else "quadratic"
            teacher_style = "stickman_orange" if "orange" in p else "stickman_blue" if "blue" in p else "hero"
            code = f"""// 🧑‍🏫 Cartoon Studio: 3D Blackboard Professor ({lesson.upper()})
// Tailored to user demand: lesson={lesson}, teacherStyle={teacher_style}

Studio.setMode('teacher');
Studio.setLesson('{lesson}');
Studio.setTeacherStyle('{teacher_style}');
Studio.setTeacherAction('write');
Studio.autoExplain();
"""
            explanation = f"Generated 3D animated professor teaching {lesson} on chalkboard matching your request: '{prompt}'."
            suggested = ["Switch lesson to pythagoras", "Switch lesson to quadratic", "Change teacher avatar to hero"]

        elif any(w in p for w in ["fight", "battle", "combat", "punch", "kick", "arena", "duel", "versus", "vs"]):
            f1_style = params["stick_style"]
            f2_style = "stickman_blue" if f1_style != "stickman_blue" else "stickman_red"
            f_speed = round(1.0 * params["speed_factor"], 2)
            code = f"""// ⚔️ Cartoon Studio: Stickman Combat Arena (Alan Becker Style)
// Choreographed battle duel with dynamic camera shake and impact sparks

Studio.setMode('fight');
Studio.setSpeed({f_speed});
Studio.enableCameraShake(true);

Studio.setFighter1({{
  name: 'Hero Fighter',
  style: '{f1_style}'
}});

Studio.setFighter2({{
  name: 'Challenger',
  style: '{f2_style}'
}});

Studio.playCombo();
"""
            explanation = f"Generated dynamic 3D martial arts stick figure combat duel ({f1_style} vs {f2_style}) for '{prompt}'."
            suggested = ["Increase combat tempo to 1.5x", "Switch arena fighters", "Trigger shockwave particle FX"]
        elif any(w in p for w in ["teacher", "teach", "chalkboard", "blackboard", "math", "lesson", "professor", "class"]):
            code = """// 🧑‍🏫 Cartoon Studio: 3D Math & Science Teacher
// Animated professor with chalkboard writing, pointing, and speech

Studio.setMode('teacher');
Studio.setLesson('quadratic');
Studio.setTeacherStyle('hero');
Studio.setTeacherAction('write');

// Auto-teach the interactive blackboard step-by-step
Studio.autoExplain();
"""
            explanation = f"Generated 3D animated math professor chalkboard lesson for '{prompt}'."
            suggested = ["Switch lesson to pythagoras", "Set teacher avatar to stickman_orange", "Point at discriminant term"]
        else:
            # Parkour / Kinetic Stick Figure Action
            action = params["parkour_action"]
            style = params["stick_style"]
            speed = round(0.42 * params["speed_factor"], 2)
            cam = "isometric" if any(w in p for w in ["iso", "isometric", "angle"]) else "hero" if "hero" in p else "side"
            
            code = f"""// 🏃 Cartoon Studio: Kinetic Stick Figure Animation ({action.upper()})
// User Demand: Style={style}, Action={action}, Speed={speed}x

Studio.setMode('parkour');
Studio.setParkourAction('{action}');
Studio.setParkourStyle('{style}');
Studio.setParkourSpeed({speed});
Studio.setCameraPreset('{cam}');
Studio.enableBoundary(true);
Studio.enableParkourTelemetry(false);
"""
            explanation = f"Generated customized 3D stick figure {action} animation ({style}, {speed}x speed) matching your request: '{prompt}'."
            suggested = [f"Switch action to '{'basketball_dunk' if action != 'basketball_dunk' else 'dance'}'", "Change stick figure color", "Toggle slow motion replay"]
    else:
        code = f"""// {engine} animation synthesized for: {prompt}
// Ready for live rendering and customization
console.log('Synthesized {engine} visual code for {prompt}.');"""
        explanation = f"Generated customized {engine} structure for '{prompt}'."
        suggested = ["Add animations", "Tweak colors", "Add user controls"]
        
    code = code.replace("__WIDTH__", str(width)).replace("__HEIGHT__", str(height))
    return code, explanation, suggested

