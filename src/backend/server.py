#!/usr/bin/env python3
import os
import subprocess
import shutil
from fastapi import FastAPI, UploadFile, File, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from fastapi.staticfiles import StaticFiles
from starlette.responses import Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import uuid
import re
import threading
import time
import tempfile
import socket
from dotenv import load_dotenv

load_dotenv() # Load environment variables from a .env file

app = FastAPI()

# --- NEW: Private Access Middleware ---
PRIVATE_ACCESS_TOKEN = os.environ.get("PRIVATE_ACCESS_TOKEN")

class PrivateAccessMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # If no private token is set in the environment, the site is public.
        if not PRIVATE_ACCESS_TOKEN:
            return await call_next(request)

        # Allow access to the maintenance page itself.
        if "/maintenance.html" in request.url.path:
            return await call_next(request)

        # Check if the user has a valid access cookie.
        if request.cookies.get("access_granted") == PRIVATE_ACCESS_TOKEN:
            return await call_next(request)

        # If no cookie, check if the user is providing the token in the query params.
        if request.query_params.get("access_token") == PRIVATE_ACCESS_TOKEN:
            # If the token is correct, proceed with the request but set a cookie on the response.
            response = await call_next(request)
            response.set_cookie(
                key="access_granted",
                value=PRIVATE_ACCESS_TOKEN,
                httponly=True,       # Prevents client-side JS from accessing the cookie
                samesite="lax",      # Good for security
                max_age=86400,       # Cookie lasts for 1 day
                path="/",            # Cookie is valid for the whole site
            )
            return response

        # If none of the above, show the maintenance page with a 503 status.
        SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
        maintenance_page_path = os.path.join(SRC_DIR, "views", "maintenance.html")
        return FileResponse(maintenance_page_path, status_code=503)

api_router = APIRouter()

# Read allowed origins from an environment variable for flexibility and security.
# For local dev, run: CORS_ORIGINS="http://localhost:8000" python src/backend/server.py
# On Railway, set the CORS_ORIGINS variable to: "https://www.xtrapath.com,https://your-app.up.railway.app"
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:8000,https://www.xtrapath.com")
origins = [origin.strip() for origin in CORS_ORIGINS.split(",")]

print(f"Allowing CORS from: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Use the dynamically loaded list of origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add the private access middleware. It runs for every request.
app.add_middleware(PrivateAccessMiddleware)

# Setup media directory for video output
MEDIA_DIR = "media"
os.makedirs(MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# NEW: Use a system-level temporary directory to completely avoid server reloads.
# This is more robust than relying on reload_excludes.
TEMP_DIR = os.path.join(tempfile.gettempdir(), "xtraanim_scenes")
os.makedirs(TEMP_DIR, exist_ok=True)

@app.on_event("startup")
async def startup_event():
    """Runs dependency checks and debugging prints when the app starts."""
    # --- For Debugging on Railway ---
    print("\n--- Environment Debug ---")
    print(f"SUPABASE_URL is set: {'Yes' if os.environ.get('SUPABASE_URL') else 'No'}")
    print(f"SUPABASE_ANON_KEY is set: {'Yes' if os.environ.get('SUPABASE_ANON_KEY') else 'No'}")
    print(f"CORS_ORIGINS is set to: {os.environ.get('CORS_ORIGINS')}")
    print("-------------------------\n")

    # Check if manim is accessible
    if shutil.which("manim") is None:
        print("WARNING: 'manim' command not found in PATH. Rendering will fail.")
    else:
        print(f"Manim found at: {shutil.which('manim')}")

    # Check for LaTeX dependency
    if shutil.which("pdflatex") is None:
        print("WARNING: 'pdflatex' command not found in PATH. Book generation will fail.")
    else:
        print(f"pdflatex found at: {shutil.which('pdflatex')}")

# --- BACKGROUND TASK SYSTEM ---
tasks_db = {} # In-memory store for task status

def run_background_render(task_id, cmd, script_base_name, script_path, is_preview):
    print(f"\n--- [Task {task_id}] Thread Started ---")
    print(f"Executing command: {' '.join(cmd)}")
    try:
        # Run Manim
        env = os.environ.copy()
        env["PYTHONWARNINGS"] = "ignore"
        
        result = subprocess.run(cmd, capture_output=True, text=True, env=env)
        print(f"[Task {task_id}] Manim process finished with return code: {result.returncode}")
        
        # Process Logs
        raw_logs = result.stderr + "\n" + result.stdout
        clean_logs = []
        for line in raw_logs.splitlines():
            if "0%|" in line or "it/s]" in line: continue
            if "pkg_resources" in line: continue
            clean_logs.append(line)
        final_logs = "\n".join(clean_logs)
        print(f"[Task {task_id}] Manim Logs:\n{final_logs}\n--------------------")


        if result.returncode != 0:
            tasks_db[task_id] = {"status": "failed", "result": {"success": False, "error": "Render Failed", "logs": final_logs}}
            return

        # Find Video
        search_dir = os.path.join(MEDIA_DIR, "videos", script_base_name)
        video_path = None
        print(f"[Task {task_id}] Searching for video in: {search_dir}")
        
        if os.path.exists(search_dir):
            for root, dirs, files in os.walk(search_dir):
                if "partial_movie_files" in dirs: dirs.remove("partial_movie_files")
                for file in files:
                    if file == "output.mp4":
                        video_path = os.path.join(root, file)
                        break
                if video_path: break
        
        if video_path:
            print(f"[Task {task_id}] Video found: {video_path}")
            relative_path = os.path.relpath(video_path, MEDIA_DIR)
            video_url = f"/media/{relative_path}?t={time.time()}"
            tasks_db[task_id] = {"status": "completed", "result": {"success": True, "videoUrl": video_url, "logs": final_logs}}
        else: # No video found, check for preview image or error
            print(f"[Task {task_id}] No video found. Checking for preview image...")
            image_search_dir = os.path.join(MEDIA_DIR, "images", script_base_name)
            image_path = None
            print(f"[Task {task_id}] Searching for image in: {image_search_dir}")
            if os.path.exists(image_search_dir):
                for root, dirs, files in os.walk(image_search_dir):
                    for file in files:
                        if file == "preview.png":
                            image_path = os.path.join(root, file)
                            break
            
            if is_preview and image_path:
                print(f"[Task {task_id}] Preview image found: {image_path}")
                relative_path = os.path.relpath(image_path, MEDIA_DIR)
                image_url = f"/media/{relative_path}?t={time.time()}"
                tasks_db[task_id] = {"status": "completed", "result": {"success": True, "imageUrl": image_url, "logs": final_logs}}
            elif image_path: # Image found but it wasn't a preview render -> error
                print(f"[Task {task_id}] Error: Image generated instead of video on a full render.")
                tasks_db[task_id] = {"status": "failed", "result": {"success": False, "error": "No animations played. Manim generated an image instead of a video. Ensure your method is named 'construct' and you use self.play() or self.wait().", "logs": final_logs}}
            else:
                print(f"[Task {task_id}] Error: No output file (video or image) was found.")
                tasks_db[task_id] = {"status": "failed", "result": {"success": False, "error": "Video file not found", "logs": final_logs}}

        # Cleanup the temporary python script to keep backend folder clean
        if os.path.exists(script_path):
            print(f"[Task {task_id}] Cleaning up script: {script_path}")
            os.remove(script_path)
        print(f"--- [Task {task_id}] Thread Finished ---")

    except Exception as e:
        tasks_db[task_id] = {"status": "failed", "result": {"success": False, "error": str(e)}}

@api_router.get("/status/{task_id}")
def get_status(task_id: str):
    return tasks_db.get(task_id, {"status": "not_found"})

class RenderRequest(BaseModel):
    code: str
    width: int = 854
    height: int = 480
    project_id: str = "default"
    preview: bool = False
    engine: str = "manim" # Add engine field

class BookRequest(BaseModel):
    code: str
    title: str = "My XtraBook"
    author: str = "Generated by XtraPath"

class AppConfig(BaseModel):
    supabase_url: str
    supabase_anon_key: str

@api_router.get("/config", response_model=AppConfig)
def get_app_config():
    """Provides the frontend with the necessary public Supabase configuration."""
    # These should be set as environment variables in your Railway project settings.
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_anon_key:
        raise HTTPException(status_code=500, detail="Supabase environment variables are not set on the server.")
    return AppConfig(supabase_url=supabase_url, supabase_anon_key=supabase_anon_key)

# --- ENDPOINTS ---

@api_router.post("/upload")
def upload_video(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    extension = file.filename.split(".")[-1] if "." in file.filename else "webm"
    filename = f"upload_{file_id}.{extension}"
    
    # Ensure uploads directory exists
    upload_dir = os.path.join(MEDIA_DIR, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    relative_path = os.path.join("media", "uploads", filename)
    return {"url": f"/{relative_path}"}

@api_router.post("/render")
def render(req: RenderRequest):
    print(f"Received render request for code length: {len(req.code)}")
    print(f"Code snippet: {req.code[:100]}...")
    
    has_import = "from manim import" in req.code
    # Regex to detect a class inheriting from Scene
    has_scene = re.search(r"class\s+\w+\(.*\):", req.code)
    scene_name = "GeneratedScene" # Default for snippets

    processed_code = ""
    if not has_scene:
        # It's a snippet. Wrap it in a boilerplate Scene.
        lines = req.code.splitlines()
        indented_lines = []
        for line in lines:
            indented_lines.append("        " + line)
        
        indented_body = "\n".join(indented_lines)
        processed_code = f"from manim import *\n\nclass GeneratedScene(Scene):\n    def construct(self):\n{indented_body}\n        self.wait(1)"
    else:
        # It's a full scene, use it as is.
        processed_code = req.code
        if not has_import:
            processed_code = "from manim import *\n" + processed_code
        
        # CRITICAL FIX: Extract the actual class name to render
        match = re.search(r"class\s+(\w+)\(.*\):", processed_code)
        if match:
            scene_name = match.group(1)
        # CRITICAL FIX: Add a final wait to full scenes to prevent race conditions
        # The logic to auto-append a wait call is brittle and can cause NameErrors
        # by appending to the global scope. It's safer to require the user to add it.
        # if not processed_code.strip().endswith("self.wait()"):
        #      processed_code += "\nself.wait(1)"

    print("\n--- Processed Code to be Rendered ---")
    print(processed_code)
    print("------------------------------------")
    # UNIQUE FILENAME: Use timestamp/uuid to force a fresh render directory every time.
    # This prevents Manim from serving stale cached videos from previous runs.
    clean_project_id = "".join([c for c in req.project_id if c.isalnum() or c in ('-','_')]) or "default"
    unique_suffix = f"{int(time.time())}_{str(uuid.uuid4())[:4]}"
    script_base_name = f"scene_{clean_project_id}_{unique_suffix}"
    script_name = f"{script_base_name}.py" # The file name itself
    script_path = os.path.join(TEMP_DIR, script_name) # The full path to the temp file
    
    # Write the processed code to a file
    with open(script_path, "w") as f:
        f.write(processed_code)

    try:
        # Run Manim command
        # -ql: Low quality (faster for preview)
        # --media_dir: Output to our media folder
        # --progress_bar none: Suppress progress bars in logs
        # -s: Save last frame only (if preview mode), --format png: output a png
        
        # SECURITY WARNING: subprocess.run with user-provided code is dangerous in production.
        # A malicious user could execute harmful commands. For a real deployment, use Docker/Sandboxing.
        task_id = str(uuid.uuid4())
        if req.preview:
            cmd = ["manim", "-ql", "-s", "--format", "png", "--media_dir", MEDIA_DIR, "-o", "preview.png", "--resolution", f"{req.width},{req.height}", "--progress_bar", "none", script_path, scene_name]
        else:
            cmd = ["manim", "-ql", "--media_dir", MEDIA_DIR, "-o", "output.mp4", "--resolution", f"{req.width},{req.height}", "--progress_bar", "none", script_path, scene_name]
        
        print(f"Prepared command: {' '.join(cmd)}")
            
        tasks_db[task_id] = {"status": "processing", "timestamp": time.time()}
        print(f"Created background task: {task_id}")
        thread = threading.Thread(target=run_background_render, args=(task_id, cmd, script_base_name, script_path, req.preview))
        thread.start()
        
        return {"success": True, "task_id": task_id, "message": "Render started in background"}

    except Exception as e:
        return {"success": False, "error": str(e)}

# --- XtraBook Logic ---

TIKZ_TEMPLATE = r"""
\documentclass[tikz, border=5pt]{standalone}
\usepackage{lmodern}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{amsmath, amsfonts, amssymb, xcolor}

% --- XtraPath Palette ---
\definecolor{primaryblue}{HTML}{3b82f6}
\definecolor{accentpurple}{HTML}{8b5cf6}
\definecolor{textmain}{HTML}{e4e4e7}
\definecolor{textmuted}{HTML}{a1a1aa}
\definecolor{bgvoid}{HTML}{0a0a0a}
\definecolor{bgcard}{HTML}{1e1e23}

\begin{document}
\begin{tikzpicture}
    % User code goes here
    CODE_PLACEHOLDER
\end{tikzpicture}
\end{document}
"""

BOOK_TEMPLATE = r"""
\documentclass[11pt,openany]{book}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{lmodern}
\usepackage[paperwidth=7in, paperheight=10in, top=0.7in, bottom=0.7in, left=0.75in, right=0.75in]{geometry}
\usepackage{amsmath, amsfonts, amssymb, xcolor, tikz, fancyhdr, graphicx}
\usepackage[hidelinks, unicode]{hyperref}

\definecolor{mainblue}{RGB}{0, 80, 120}
\definecolor{practicegreen}{RGB}{0, 120, 80}
\definecolor{hintorange}{RGB}{200, 100, 0}

% Fallback for tcolorbox if package is missing
\newsavebox{\dummybox}
\newenvironment{tcolorbox}[1][]
  {\begin{lrbox}{\dummybox}\begin{minipage}{\dimexpr\linewidth-2\fboxsep}}
  {\end{minipage}\end{lrbox}\noindent\colorbox{practicegreen}{\usebox{\dummybox}}\par\medskip}

\fancypagestyle{fancy}{
    \fancyhf{}
    \fancyhead[RO,LE]{\small\bfseries\color{mainblue}\nouppercase{\leftmark}}
    \renewcommand{\headrulewidth}{1.5pt}
    \fancyfoot[C]{\thepage}
}
\pagestyle{fancy}

\title{PLACEHOLDER_TITLE}
\author{PLACEHOLDER_AUTHOR}
\date{\today}

\begin{document}
\frontmatter
\maketitle
\tableofcontents
\mainmatter
\input{chapter.tex}
\end{document}
"""

@api_router.post("/compile_book")
def compile_book(req: BookRequest):
    file_id = str(uuid.uuid4())
    # Create a dedicated folder for this book build
    build_dir = os.path.join(MEDIA_DIR, "books", file_id)
    os.makedirs(build_dir, exist_ok=True)

    main_tex_path = os.path.join(build_dir, "main.tex")
    chapter_tex_path = os.path.join(build_dir, "chapter.tex")

    # Write the template and user content
    template_content = BOOK_TEMPLATE.replace("PLACEHOLDER_TITLE", req.title).replace("PLACEHOLDER_AUTHOR", req.author)
    with open(main_tex_path, "w") as f:
        f.write(template_content)
    
    with open(chapter_tex_path, "w") as f:
        f.write(req.code)

    try:
        # Run pdflatex
        # We run it inside the build directory to keep artifacts contained
        cmd = ["pdflatex", "-interaction=nonstopmode", "-output-directory", ".", "main.tex"]
        
        # Run twice for layout/references/TOC
        result = subprocess.run(cmd, cwd=build_dir, capture_output=True, text=True)
        if result.returncode == 0:
            result = subprocess.run(cmd, cwd=build_dir, capture_output=True, text=True)
        
        if result.returncode != 0:
            # Clean logs
            logs = result.stdout
            # Try to find the error line
            error_summary = "\n".join([line for line in logs.splitlines() if "!" in line or "Error" in line][:10])
            return {"success": False, "error": "Compilation Failed", "logs": error_summary or logs}

        # Check for PDF
        pdf_name = "main.pdf"
        if os.path.exists(os.path.join(build_dir, pdf_name)):
            # Force forward slashes for URL compatibility
            pdf_url = f"/media/books/{file_id}/{pdf_name}"
            return {"success": True, "pdfUrl": pdf_url, "logs": "Compilation Successful"}
        else:
            return {"success": False, "error": "PDF not generated", "logs": result.stdout}

    except FileNotFoundError:
        return {"success": False, "error": "pdflatex not found. Please install TeX Live or MiKTeX."}
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- Mount the API Router ---
app.include_router(api_router, prefix="/api")

# --- Serve Frontend (Static Files) ---
# IMPORTANT: Mount more specific paths BEFORE the root path "/"

# Define the root directory of the frontend source, which is one level up from this script.
SRC_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

# Define an explicit route for the root path to serve the main entry point.
# This must come BEFORE the general static file mount.
@app.get("/", include_in_schema=False)
async def read_index():
    # Point to the correct location of index.html inside the 'views' folder.
    return FileResponse(os.path.join(SRC_DIR, "views", "index.html"))

# Mount the entire 'src' directory to serve all other static assets (CSS, JS, images, other HTML files).
# This is more robust than mounting each subdirectory individually.
# Any request that doesn't match an API route or the root "/" route
# will be looked for as a file in the SRC_DIR.
app.mount("/", StaticFiles(directory=SRC_DIR, html=True), name="static_root")

if __name__ == "__main__":
    # Find Local IP Address for Mobile Testing
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = "127.0.0.1"

    print("Starting server on http://localhost:8000...")
    print(f"MOBILE ACCESS: http://{local_ip}:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True, reload_excludes=[MEDIA_DIR])