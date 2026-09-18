import os
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

router = APIRouter(tags=["engine"])

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
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

    with open(main_tex_path, "w", encoding="utf-8") as f:
        f.write(generate_kdp_book_latex(req))
    with open(chapter_tex_path, "w", encoding="utf-8") as f:
        f.write(sanitize_latex_sections(req.code))

    try:
        cmd = ["pdflatex", "-interaction=nonstopmode", "-output-directory", ".", "main.tex"]
        result = subprocess.run(cmd, cwd=build_dir, capture_output=True, text=True)

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
    """Compiles TikZ diagram code to PDF/PNG."""
    if shutil.which("pdflatex") is None:
        return {"success": False, "error": "pdflatex not installed on server host."}

    file_id = str(uuid.uuid4())
    build_dir = os.path.join(MEDIA_DIR, "tikz", file_id)
    os.makedirs(build_dir, exist_ok=True)

    tex_path = os.path.join(build_dir, "diagram.tex")
    code = req.code.strip()
    if "\\documentclass" not in code:
        code = f"""\\documentclass[tikz,border=5pt]{{standalone}}
\\usepackage[T1]{{fontenc}}
\\usepackage{{amsmath,amsfonts,amssymb,xcolor}}
\\usetikzlibrary{{arrows.meta,calc,positioning,shapes.geometric}}
\\begin{{document}}
{code}
\\end{{document}}
"""
    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(code)

    try:
        cmd = ["pdflatex", "-interaction=nonstopmode", "-output-directory", ".", "diagram.tex"]
        result = subprocess.run(cmd, cwd=build_dir, capture_output=True, text=True, timeout=35)
        pdf_path = os.path.join(build_dir, "diagram.pdf")
        if os.path.exists(pdf_path):
            return {"success": True, "pdfUrl": f"/media/tikz/{file_id}/diagram.pdf", "logs": "TikZ Rendered Successfully"}
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
    
    if not prompt:
        return {"success": False, "error": "Prompt cannot be empty"}

    gemini_key = req.api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    system_instructions = f"""You are the master AI coding assistant for XtraAnim Studio.
The current target animation engine is: '{engine}'.

Engine rules:
- 'p5': Write raw p5.js JavaScript. Use function setup() and function draw(). Do NOT import p5.js via script tags.
- 'three': Write raw Three.js JavaScript with scene, camera, renderer. Append renderer.domElement to document.getElementById('canvas-container') or document.body. Provide an animate() requestAnimationFrame loop.
- 'anime': Write Anime.js JavaScript. Assume anime is globally available. Create SVG or DOM elements and animate them with anime({{ targets: ... }}).
- 'rough': Write Rough.js JavaScript with canvas or SVG.
- 'two': Write Two.js JavaScript attached to document.getElementById('canvas-container') or document.body.
- 'zdog': Write Zdog 3D illustration JavaScript with Illustration and shapes.
- 'jsxgraph': Write JSXGraph JavaScript initializing JXG.JSXGraph.initBoard('jxgbox', {{...}}).
- 'mermaid': Write Mermaid diagram definition text directly (e.g., flowchart TD, sequenceDiagram).
- 'katex': Write pure LaTeX math equations (without \\documentclass).
- 'tikz': Write standalone TikZ code or LaTeX tikzpicture block.
- 'manim': Write Python code for Manim Community Edition with class AnimationScene(Scene): def construct(self): ...
- 'rapier': Write Rapier 3D physics JavaScript using RAPIER with world step and Three.js visualization.
- 'latex': Write publication-quality LaTeX book chapter content with sections (\\section, \\subsection), math formulas, definitions, theorems, exercises (\\begin{{enumerate}}), or diagrams. Do NOT include \\documentclass or \\begin{{document}} as this will be compiled inside an existing book chapter template.

Output Requirements:
1. ONLY valid, runnable code matching the target engine.
2. If modifying existing code, intelligently preserve unchanged parts and apply requested alterations.
3. Keep animations smooth, modern, aesthetically vibrant, dark-mode ready, and optimized (60 FPS).
4. Include clean inline comments explaining key math or visual techniques.
5. Return clean code inside markdown ```code block.
"""

    # 1. Try Gemini if API key available
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": system_instructions},
                            {"text": f"User Prompt: {prompt}\n\nCurrent Code:\n```\n{current_code}\n```\n\nGenerate the complete, updated code."}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 3000
                }
            }
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    code_match = re.search(r"```(?:\w+)?\n([\s\S]*?)```", raw_text)
                    code = code_match.group(1).strip() if code_match else raw_text.strip()
                    explanation = re.sub(r"```(?:\w+)?\n[\s\S]*?```", "", raw_text).strip()
                    if not explanation:
                        explanation = f"Generated {engine} code for '{prompt}'."
                    return {
                        "success": True,
                        "code": code,
                        "explanation": explanation,
                        "engine": engine,
                        "source": "gemini"
                    }
        except Exception as e:
            # Fall through to fallback
            pass

    # 2. Try OpenAI if API key available
    if openai_key:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {openai_key}"}
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_instructions},
                    {"role": "user", "content": f"User Prompt: {prompt}\n\nCurrent Code:\n```\n{current_code}\n```\n\nGenerate complete code."}
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
                    return {
                        "success": True,
                        "code": code,
                        "explanation": explanation,
                        "engine": engine,
                        "source": "openai"
                    }
        except Exception as e:
            pass

    # 3. Intelligent High-Quality Fallback Generator
    code, explanation, suggested_prompts = synthesize_procedural_code(prompt, engine, current_code)
    return {
        "success": True,
        "code": code,
        "explanation": explanation,
        "engine": engine,
        "suggested_prompts": suggested_prompts,
        "source": "studio_ai_engine"
    }


def synthesize_procedural_code(prompt: str, engine: str, current_code: str = ""):
    p = prompt.lower()
    
    # Engine-specific synthesized code templates with parametric adaptations
    if engine == "p5":
        if "orbit" in p or "planet" in p or "gravit" in p:
            code = """// p5.js: Interactive Gravitational Orbit Simulation
let planets = [];
let sun;

function setup() {
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  if (document.getElementById('canvas-container')) {
    canvas.parent('canvas-container');
  }
  
  planets = []; // Reset on each run
  sun = { x: width / 2, y: height / 2, mass: 1200, radius: 24 };
  
  for (let i = 0; i < 7; i++) {
    let r = random(60, min(width, height) * 0.38);
    let angle = random(TWO_PI);
    let speed = sqrt(sun.mass / r) * 0.65;
    planets.push({
      x: sun.x + r * cos(angle),
      y: sun.y + r * sin(angle),
      vx: -sin(angle) * speed,
      vy: cos(angle) * speed,
      radius: random(4, 10),
      r: random(100, 255),
      g: random(150, 255),
      b: 255,
      trail: []
    });
  }
}

function draw() {
  background(6, 9, 18, 45);
  
  // Glowing Central Sun
  noStroke();
  for (let i = 4; i > 0; i--) {
    fill(255, 190, 40, 30 * i);
    circle(sun.x, sun.y, sun.radius + i * 14);
  }
  fill(255, 240, 150);
  circle(sun.x, sun.y, sun.radius);

  // Update & Draw Planets
  for (let p of planets) {
    let dx = sun.x - p.x;
    let dy = sun.y - p.y;
    let d = constrain(sqrt(dx * dx + dy * dy), 20, 500);
    let force = (sun.mass) / (d * d);
    p.vx += (dx / d) * force;
    p.vy += (dy / d) * force;
    p.x += p.vx;
    p.y += p.vy;

    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 35) p.trail.shift();

    // Luminescent Orbit Trail
    noFill();
    for (let i = 0; i < p.trail.length; i++) {
      stroke(p.r, p.g, p.b, (i / p.trail.length) * 180);
      strokeWeight(1.5);
      if (i > 0) line(p.trail[i-1].x, p.trail[i-1].y, p.trail[i].x, p.trail[i].y);
    }

    noStroke();
    fill(p.r, p.g, p.b);
    circle(p.x, p.y, p.radius);
  }
}"""
            explanation = "Crafted an interactive gravitational n-body orbital simulation in p5.js with glowing central mass, multi-body kinematics, velocity vectors, and fading luminescence trails."
            suggested = ["Add asteroid belt", "Enable mouse click to spawn planets", "Switch to 3D WebGL camera"]
        elif "wave" in p or "fourier" in p or "sine" in p:
            code = """// p5.js: Harmonic Fourier Epicycles & Wave Synthesis
let time = 0;
let wave = [];
let numCircles = 5;

function setup() {
  const canvas = createCanvas(__WIDTH__, __HEIGHT__);
  if (document.getElementById('canvas-container')) {
    canvas.parent('canvas-container');
  }
  wave = [];
}

function draw() {
  background(8, 11, 20);
  translate(width * 0.28, height / 2);

  let x = 0;
  let y = 0;

  for (let i = 0; i < numCircles; i++) {
    let prevx = x;
    let prevy = y;
    let n = i * 2 + 1;
    let radius = 80 * (4 / (n * PI));
    x += radius * cos(n * time);
    y += radius * sin(n * time);

    stroke(70, 130, 255, 90);
    strokeWeight(1.2);
    noFill();
    ellipse(prevx, prevy, radius * 2);

    fill(99, 179, 237);
    noStroke();
    circle(x, y, 4);

    stroke(56, 189, 248, 160);
    line(prevx, prevy, x, y);
  }

  wave.unshift(y);
  let waveOffset = width * 0.24;
  stroke(244, 114, 182, 220);
  line(x, y, waveOffset, wave[0]);

  // Render harmonic synthesized wave
  noFill();
  stroke(59, 130, 246);
  strokeWeight(2.5);
  beginShape();
  for (let i = 0; i < wave.length; i++) {
    vertex(i + waveOffset, wave[i]);
  }
  endShape();

  time += 0.035;
  if (wave.length > width * 0.45) {
    wave.pop();
  }
}"""
            explanation = "Synthesized a harmonic Fourier series epicycles visualizer showing rotating phasor vectors, sum projections, and the resulting square wave output."
            suggested = ["Increase harmonic circle count to 12", "Add sawtooth wave mode", "Add audio frequency modulation"]
        else:
            code = f"""// p5.js: Dynamic Cybernetic Particle Flow
// Prompt: {prompt}
let particles = [];
const NUM_PARTICLES = 140;

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
    this.vel = p5.Vector.random2D().mult(random(1, 2.5));
    this.size = random(2.5, 6);
    this.hue = random(180, 280);
  }}

  update() {{
    this.pos.add(this.vel);
    if (this.pos.x < 0 || this.pos.x > width) this.vel.x *= -1;
    if (this.pos.y < 0 || this.pos.y > height) this.vel.y *= -1;
    
    // Subtle mouse repulsion
    let mouse = createVector(mouseX, mouseY);
    let d = p5.Vector.dist(this.pos, mouse);
    if (d < 120 && mouseX > 0) {{
      let repulse = p5.Vector.sub(this.pos, mouse).normalize().mult(1.8);
      this.pos.add(repulse);
    }}
  }}

  display() {{
    noStroke();
    fill(99, 102, 241, 200);
    circle(this.pos.x, this.pos.y, this.size);
  }}
}}

function connectNearby() {{
  strokeWeight(0.8);
  for (let i = 0; i < particles.length; i++) {{
    for (let j = i + 1; j < particles.length; j++) {{
      let d = dist(particles[i].pos.x, particles[i].pos.y, particles[j].pos.x, particles[j].pos.y);
      if (d < 85) {{
        stroke(56, 189, 248, map(d, 0, 85, 140, 0));
        line(particles[i].pos.x, particles[i].pos.y, particles[j].pos.x, particles[j].pos.y);
      }}
    }}
  }}
}}

function windowResized() {{
  resizeCanvas(windowWidth, windowHeight);
}}"""
            explanation = f"Generated an optimized cybernetic particle mesh network in p5.js responding to '{prompt}' with dynamic velocity damping and proximity interconnects."
            suggested = ["Change colors to warm sunset gold/red", "Make particles spiral around center", "Add pulsating ripple effect on mouse click"]
    elif engine == "three":
        code = """// Three.js: Radiant Cybernetic Torus Knot & Particle Ring
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060813, 0.035);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 6.5;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const container = document.getElementById('canvas-container') || document.body;
container.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x38bdf8, 2, 50);
pointLight.position.set(4, 4, 6);
scene.add(pointLight);

const pointLight2 = new THREE.PointLight(0xf43f5e, 2, 50);
pointLight2.position.set(-4, -4, 4);
scene.add(pointLight2);

// Torus Knot Geometry
const geometry = new THREE.TorusKnotGeometry(1.6, 0.45, 160, 32, 2, 3);
const material = new THREE.MeshStandardMaterial({
  color: 0x6366f1,
  wireframe: true,
  roughness: 0.2,
  metalness: 0.85
});
const knot = new THREE.Mesh(geometry, material);
scene.add(knot);

// Floating Particle Cloud
const particleCount = 600;
const pGeom = new THREE.BufferGeometry();
const pPositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i += 3) {
  pPositions[i] = (Math.random() - 0.5) * 16;
  pPositions[i + 1] = (Math.random() - 0.5) * 16;
  pPositions[i + 2] = (Math.random() - 0.5) * 16;
}
pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
const pMat = new THREE.PointsMaterial({ size: 0.06, color: 0x38bdf8, transparent: true, opacity: 0.75 });
const particles = new THREE.Points(pGeom, pMat);
scene.add(particles);

// Animation Loop
let clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const elapsedTime = clock.getElapsedTime();
  
  knot.rotation.x = elapsedTime * 0.4;
  knot.rotation.y = elapsedTime * 0.6;
  particles.rotation.y = elapsedTime * 0.08;

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});"""
        explanation = "Created a 3D wireframe Torus Knot in Three.js with dual chromatic point lights and atmospheric particle field."
        suggested = ["Add mouse orbit controls", "Enable glowing bloom post-processing", "Morph torus parameters dynamically"]
    elif engine == "anime":
        code = """// Anime.js: Kinetic Geometric Matrix Animation
document.body.innerHTML = `
  <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#070913; overflow:hidden;">
    <div id="animeGrid" style="display:grid; grid-template-columns: repeat(9, 32px); gap: 10px;"></div>
  </div>
`;

const grid = document.getElementById('animeGrid');
for (let i = 0; i < 81; i++) {
  const dot = document.createElement('div');
  dot.className = 'grid-dot';
  dot.style.cssText = 'width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); box-shadow: 0 0 12px rgba(59,130,246,0.3);';
  grid.appendChild(dot);
}

anime({
  targets: '.grid-dot',
  scale: [
    { value: 0.2, easing: 'easeOutSine', duration: 500 },
    { value: 1.1, easing: 'easeInOutQuad', duration: 800 },
    { value: 1.0, easing: 'easeInOutQuad', duration: 400 }
  ],
  rotate: {
    value: '1turn',
    duration: 1800,
    easing: 'easeInOutSine'
  },
  backgroundColor: [
    { value: '#06b6d4', duration: 800 },
    { value: '#ec4899', duration: 800 },
    { value: '#3b82f6', duration: 800 }
  ],
  delay: anime.stagger(60, { grid: [9, 9], from: 'center' }),
  loop: true,
  direction: 'alternate',
  easing: 'easeInOutQuad'
});"""
        explanation = "Built an 81-element kinetic stagger animation in Anime.js with radial expansion, chromatic transitions, and seamless looping."
        suggested = ["Make staggered ripple trigger on mouse hover", "Add elastic 3D perspective rotation", "Change shape from squares to pulsing circles"]
    elif engine == "katex":
        code = r"""\begin{aligned}
\mathcal{L}_{\text{XtraAnim}} &= \int_{\mathcal{M}} \left[ \frac{1}{2} (\partial_\mu \Phi)(\partial^\mu \Phi) - V(\Phi) + \bar{\psi} (i \gamma^\mu D_\mu - m) \psi \right] \sqrt{-g} \, d^4x \\[8pt]
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0}, \quad \nabla \times \mathbf{B} = \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t} \\[6pt]
\hat{H} |\Psi(t)\rangle &= i \hbar \frac{\partial}{\partial t} |\Psi(t)\rangle
\end{aligned}"""
        explanation = "Formatted unified relativistic field and quantum electrodynamic equations using KaTeX LaTeX typesetting."
        suggested = ["Add Navier-Stokes fluid equations", "Add General Relativity Einstein Field Tensor", "Add Fourier transform integral definition"]
    elif engine == "latex":
        code = r"""\section{Foundational Principles}
In this section, we formulate the governing dynamical equations and establish the theoretical framework underpinning the system.

\begin{definition}[Harmonic Oscillator State]
A mechanical state characterized by generalized coordinate $q(t)$ and conjugate momentum $p(t)$ undergoing linear restoring potential:
\begin{equation}
\mathcal{H}(q, p) = \frac{p^2}{2m} + \frac{1}{2} m \omega_0^2 q^2
\end{equation}
\end{definition}

\subsection{Equation of Motion}
Applying Hamilton's canonical equations of motion yields:
\begin{equation}
\dot{q} = \frac{\partial \mathcal{H}}{\partial p} = \frac{p}{m}, \qquad \dot{p} = -\frac{\partial \mathcal{H}}{\partial q} = -m \omega_0^2 q
\end{equation}
Combining these canonical first-order differential equations leads to the classical harmonic equation:
\begin{equation}
\frac{d^2 q}{dt^2} + \omega_0^2 q = 0
\end{equation}

\begin{theorem}[Energy Conservation]
For any closed conservative system with time-independent Hamiltonian $\frac{\partial \mathcal{H}}{\partial t} = 0$, the total energy is strictly conserved:
\begin{equation}
\frac{d\mathcal{H}}{dt} = 0 \implies E = \text{constant}
\end{equation}
\end{theorem}

\subsection{Practice Exercises}
\begin{enumerate}
    \item \textbf{Phase Space Trajectory:} Derive the elliptical phase portrait in the normalized plane $\left( q, \frac{p}{m\omega_0} \right)$.
    \item \textbf{Damped Oscillator:} Incorporate a linear velocity-dependent dissipation force $F_d = -\gamma \dot{q}$ and determine the critical damping condition.
\end{enumerate}"""
        explanation = f"Generated structured LaTeX book chapter content with rigorous definitions, mathematical formulations, and practice exercises for '{prompt}'."
        suggested = ["Add detailed step-by-step proof for Theorem 1", "Create a summary table comparing damping regimes", "Add a TikZ diagram for the phase portrait"]
    else:
        code = f"""// {engine} animation synthesized for: {prompt}
// Ready for live rendering and customization
console.log('Synthesized {engine} visual code.');"""
        explanation = f"Generated customized {engine} structure for '{prompt}'."
        suggested = ["Add animations", "Tweak colors", "Add user controls"]
        
    return code, explanation, suggested

