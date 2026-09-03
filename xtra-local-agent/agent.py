import os
import subprocess
import tempfile
import sys

# --- AUTO-BOOTSTRAP AGENT DEPENDENCIES IF MISSING ---
REQUIRED_BOOTSTRAP_PKGS = ["fastapi", "uvicorn", "pydantic"]
missing = []
for pkg in REQUIRED_BOOTSTRAP_PKGS:
    try:
        __import__(pkg)
    except ImportError:
        missing.append(pkg)

if missing:
    print(f"📦 [XtraPath Agent] Installing required agent packages ({', '.join(missing)})...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])
        print("✅ [XtraPath Agent] Packages installed successfully!")
    except Exception as e:
        print(f"❌ Error auto-installing packages: {e}")
        sys.exit(1)

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_pna_and_cors_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        response = Response(status_code=200)
    else:
        response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

class ExecuteRequest(BaseModel):
    task_type: str # e.g., "manim", "latex"
    code: str

@app.get("/")
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "XtraPath Local Agent is active and running!"}

def check_and_install_dependency(task_type: str, code: str = ""):
    if task_type == "manim":
        try:
            # Check if manim is installed
            subprocess.run(["manim", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            print("✅ Manim is already installed.")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("⏳ Manim not found. Auto-installing... (this may take a minute)")
            try:
                subprocess.run([sys.executable, "-m", "pip", "install", "manim"], check=True)
                print("✅ Manim successfully installed!")
            except subprocess.CalledProcessError as e:
                raise HTTPException(status_code=500, detail=f"Failed to auto-install manim: {str(e)}")
        
        # Auto-detect voiceover and TTS packages
        if "manim_voiceover" in code:
            try:
                __import__("manim_voiceover")
            except ImportError:
                print("⏳ Auto-installing manim-voiceover...")
                subprocess.run([sys.executable, "-m", "pip", "install", "manim-voiceover"], check=True)
        if "edge_tts" in code:
            try:
                __import__("edge_tts")
            except ImportError:
                print("⏳ Auto-installing edge-tts...")
                subprocess.run([sys.executable, "-m", "pip", "install", "edge-tts"], check=True)
    
    elif task_type == "latex":
        try:
            # Check for pdflatex
            subprocess.run(["pdflatex", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            print("✅ pdflatex is already installed.")
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise HTTPException(status_code=500, detail="pdflatex is not installed on this machine. Please install it manually (e.g. MacTeX, TeXLive, or MiKTeX).")


@app.post("/execute")
async def execute_task(req: ExecuteRequest):
    print(f"\n--- Received Task: {req.task_type} ---")
    
    # 1. Check and Auto-Install Dependencies
    check_and_install_dependency(req.task_type, req.code)
    
    # 2. Execute Task
    if req.task_type == "manim":
        # Create a temporary directory and file
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_py = os.path.join(temp_dir, "temp_scene.py")
            with open(temp_py, "w") as f:
                f.write(req.code)
            
            print("🎥 Rendering Manim Scene...")
            try:
                result = subprocess.run(
                    ["manim", temp_py, "-qm", "--media_dir", temp_dir],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                if result.returncode != 0:
                    print("❌ Manim Error:", result.stderr)
                    raise HTTPException(status_code=500, detail=f"Manim Error:\n{result.stderr}")
                
                print("✅ Render Complete!")
                
                # Robust recursive search for final compiled .mp4 (supports all resolutions and voiceover)
                candidate_videos = []
                for root, _, files in os.walk(temp_dir):
                    if "partial_movie_files" in root:
                        continue
                    for f in files:
                        if f.endswith(".mp4"):
                            full_p = os.path.join(root, f)
                            candidate_videos.append((os.path.getsize(full_p), full_p, f))
                
                if not candidate_videos:
                    raise HTTPException(status_code=500, detail="Manim executed but no final .mp4 video was produced.")
                
                # Pick largest .mp4 file (the full stitched scene)
                candidate_videos.sort(key=lambda x: x[0], reverse=True)
                final_video_path = candidate_videos[0][1]
                video_filename = candidate_videos[0][2]
                
                output_dir = os.path.join(os.getcwd(), "xtra_outputs")
                os.makedirs(output_dir, exist_ok=True)
                final_dest = os.path.join(output_dir, video_filename)
                import shutil
                shutil.copy2(final_video_path, final_dest)
                
                return FileResponse(final_dest, media_type="video/mp4", filename=video_filename)

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")

    elif req.task_type == "latex":
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_tex = os.path.join(temp_dir, "document.tex")
            with open(temp_tex, "w", encoding="utf-8") as f:
                f.write(req.code)
            
            print("📄 Compiling LaTeX Document with pdflatex...")
            try:
                result = None
                for pass_num in range(2):
                    result = subprocess.run(
                        ["pdflatex", "-interaction=nonstopmode", "-output-directory", temp_dir, temp_tex],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True
                    )
                
                pdf_path = os.path.join(temp_dir, "document.pdf")
                if not os.path.exists(pdf_path):
                    err_logs = (result.stdout if result else "")[-800:]
                    print("❌ LaTeX Error:", err_logs)
                    raise HTTPException(status_code=500, detail=f"LaTeX compilation failed:\n{err_logs}")
                
                print("✅ PDF Compile Complete!")
                output_dir = os.path.join(os.getcwd(), "xtra_outputs")
                os.makedirs(output_dir, exist_ok=True)
                import time
                pdf_filename = f"xtrabook_{int(time.time())}.pdf"
                final_dest = os.path.join(output_dir, pdf_filename)
                import shutil
                shutil.copy2(pdf_path, final_dest)
                
                return FileResponse(final_dest, media_type="application/pdf", filename=pdf_filename)

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"LaTeX execution error: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported task_type: {req.task_type}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting XtraPath Local Agent on http://localhost:8989")
    uvicorn.run(app, host="0.0.0.0", port=8989)
