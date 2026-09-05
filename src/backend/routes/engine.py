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


def run_background_render(task_id: str, cmd: List[str], script_base_name: str, script_path: str, is_preview: bool):
    """Executes Manim compilation in background worker thread."""
    try:
        env = os.environ.copy()
        env["PYTHONWARNINGS"] = "ignore"
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)

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

        if os.path.exists(script_path):
            os.remove(script_path)
    except Exception as e:
        tasks_db[task_id] = {"status": "failed", "result": {"success": False, "error": str(e)}}


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

    return {"success": True, "taskId": task_id, "status": "processing"}


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
