import os
import re
import base64
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/ai", tags=["ai"])

_DEFAULT_KEY_B64 = b"QVEuQWI4Uk42SV9QX1hKbDdvMXpLal9JaERzSGZFVzA5N0NlSks4UklWNmEwMlg4eUc2OVE="
try:
    _DECODED_KEY = base64.b64decode(_DEFAULT_KEY_B64).decode("utf-8")
except Exception:
    _DECODED_KEY = ""

DEFAULT_GEMINI_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or _DECODED_KEY
CANDIDATE_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.7-flash"
]

class AIGenerateRequest(BaseModel):
    prompt: str
    target_type: Optional[str] = "canvas"  # "canvas", "p5", "threejs", "svg", "mermaid"
    user_api_key: Optional[str] = None
    context_code: Optional[str] = None

class AIRefineRequest(BaseModel):
    current_code: str
    instruction: str
    target_type: Optional[str] = "canvas"
    user_api_key: Optional[str] = None

SYSTEM_PROMPT = """
You are XtraPath AI, an expert computational science, physics simulation, mathematical diagram, and creative animation generator.
The user wants an interactive animation, simulation, or diagram for their educational or research lesson.

STRICT GENERATION RULES:
1. Output MUST be self-contained, high-performance, and ready to execute immediately.
2. For "canvas": Provide clean HTML5 2D Canvas JavaScript. If creating a canvas dynamically, append it to document.body or container, handle window resize, requestAnimationFrame loop, and modern dark aesthetics (deep background #07080d, vibrant neon hues, glowing strokes).
3. For "p5": Output standard p5.js setup() and draw() functions.
4. For "threejs": Output standard Three.js scene, camera, renderer, animation loop, and lighting.
5. For "svg" / "mermaid": Output valid SVG XML or Mermaid diagram code.
6. Provide interactive controls where natural (mouse drag, click to emit particles, keyboard arrows, or HTML sliders).
7. Return ONLY the code inside markdown code fences: ```javascript ... ``` or ```html ... ``` or ```xml ... ```. Include a brief 1-2 sentence explanation before or after the code block.
"""

@router.get("/status")
async def get_ai_status():
    """Returns AI readiness status and available features."""
    has_key = bool(os.environ.get("GEMINI_API_KEY") or DEFAULT_GEMINI_KEY)
    return {
        "success": True,
        "available": has_key,
        "provider": "google_gemini",
        "default_model": CANDIDATE_MODELS[0],
        "supported_engines": ["canvas", "p5", "threejs", "svg", "mermaid"],
        "free_tier": True
    }

@router.post("/generate")
async def generate_animation(req: AIGenerateRequest):
    """Generates working simulation / animation code from a natural language prompt."""
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")

    api_key = (req.user_api_key or "").strip() or os.environ.get("GEMINI_API_KEY") or DEFAULT_GEMINI_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on server.")

    target = req.target_type or "canvas"
    user_content = f"{SYSTEM_PROMPT}\n\nUser Request: {prompt}\nTarget Engine/Format: {target}"
    if req.context_code:
        user_content += f"\n\nExisting Code Base to Extend / Remix:\n```\n{req.context_code[:3000]}\n```"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_content}]
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 4096,
        }
    }

    last_error = ""
    # Try candidate models in order of capability and availability
    async with httpx.AsyncClient(timeout=12.0, verify=False) as client:
        for model in CANDIDATE_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "")
                            # Extract code inside backticks
                            code_match = re.search(r'```(?:javascript|html|js|typescript|ts|svg|xml|mermaid)?\n([\s\S]*?)```', raw_text)
                            clean_code = code_match.group(1).strip() if code_match else raw_text.strip()
                            # Extract explanation outside code block
                            clean_explanation = re.sub(r'```[\s\S]*?```', '', raw_text).strip()
                            return {
                                "success": True,
                                "model": model,
                                "target_type": target,
                                "code": clean_code,
                                "explanation": clean_explanation[:300] if clean_explanation else f"Generated {target} animation for: {prompt}",
                                "raw_text": raw_text
                            }
                elif resp.status_code == 429:
                    return {
                        "success": False,
                        "error": "Google Gemini free quota is busy right now. Please wait 30 seconds or paste your own free Gemini key in settings!"
                    }
                else:
                    last_error = f"Model {model} returned status {resp.status_code}: {resp.text[:180]}"
            except Exception as e:
                last_error = str(e)
                continue

    return {
        "success": False,
        "error": f"Failed to generate animation with Gemini: {last_error}"
    }

@router.post("/refine")
async def refine_animation(req: AIRefineRequest):
    """Refines or adds features to existing simulation code based on user instruction."""
    current_code = req.current_code.strip()
    instruction = req.instruction.strip()
    if not current_code or not instruction:
        raise HTTPException(status_code=400, detail="Current code and instruction are required.")

    api_key = (req.user_api_key or "").strip() or os.environ.get("GEMINI_API_KEY") or DEFAULT_GEMINI_KEY
    target = req.target_type or "canvas"

    user_content = f"""
{SYSTEM_PROMPT}

You are modifying an existing XtraPath {target} animation.
User's modification request: {instruction}

Existing Code:
```
{current_code[:4000]}
```

Provide the complete updated and improved runnable code inside a ``` code block.
"""

    payload = {
        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4096}
    }

    async with httpx.AsyncClient(timeout=45.0, verify=False) as client:
        for model in CANDIDATE_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    raw_text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                    code_match = re.search(r'```(?:javascript|html|js|typescript|ts|svg|xml|mermaid)?\n([\s\S]*?)```', raw_text)
                    clean_code = code_match.group(1).strip() if code_match else raw_text.strip()
                    clean_explanation = re.sub(r'```[\s\S]*?```', '', raw_text).strip()
                    return {
                        "success": True,
                        "model": model,
                        "code": clean_code,
                        "explanation": clean_explanation[:250] or f"Updated animation with: {instruction}"
                    }
            except Exception:
                continue

    return {"success": False, "error": "Unable to refine animation code at this moment."}
