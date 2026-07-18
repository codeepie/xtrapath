from manim import *
import numpy as np

# Try importing voiceover dependencies (Optional)
try:
    from manim_voiceover import VoiceoverScene
    from manim_voiceover.services.base import SpeechService
    import edge_tts
    import asyncio
    from pathlib import Path
    VOICEOVER_AVAILABLE = True
except ImportError:
    VOICEOVER_AVAILABLE = False
    class VoiceoverScene(Scene): pass

class FourCirclesTemplate(VoiceoverScene if VOICEOVER_AVAILABLE else Scene):
    def construct(self):
        self.camera.background_color = "#171717"

        # --- PALETTE ---
        C_BLUE_SHADE = "#5dade2"
        C_WHITE      = WHITE
        C_GUIDE      = RED
        C_DIM        = GRAY
        C_HIGHLIGHT  = "#1B2BD8"

        # --- GEOMETRY SETUP ---
        R_vis = 3.2
        VISUAL_SCALE = R_vis / 8.0
        
        r_real = 8 / (np.sqrt(2) + 1)
        r_vis  = r_real * VISUAL_SCALE
        rs_real = r_real * (np.sqrt(2) - 1)
        rs_vis  = rs_real * VISUAL_SCALE
        
        M1 = np.array([r_vis, r_vis, 0.0])
        M2 = np.array([-r_vis, r_vis, 0.0])
        M3 = np.array([-r_vis, -r_vis, 0.0])
        M4 = np.array([r_vis, -r_vis, 0.0])
        ORIGIN_PT = np.array([0.0, 0.0, 0.0])

        # --- SHAPES ---
        large_circle = Circle(radius=R_vis, color=C_BLUE_SHADE, fill_opacity=1, stroke_width=4, stroke_color=WHITE)
        
        medium_circles = VGroup(*[
            Circle(radius=r_vis, color=C_WHITE, fill_opacity=1, stroke_color=BLACK, stroke_width=2).move_to(p)
            for p in [M1, M2, M3, M4]
        ])

        small_circle = Circle(radius=rs_vis, color=C_WHITE, fill_opacity=1, stroke_color=BLACK, stroke_width=2).move_to(ORIGIN_PT)
        
        diagram = VGroup(large_circle, medium_circles, small_circle)
        diagram.move_to(ORIGIN)

        # --- ANIMATION ---
        self.play(DrawBorderThenFill(large_circle), run_time=1.5)
        self.play(FadeIn(medium_circles), FadeIn(small_circle), run_time=1.5)
        
        title = Text("Four Circles Theorem", font_size=36).to_edge(UP)
        self.play(Write(title))
        self.wait(2)
self.wait(1)