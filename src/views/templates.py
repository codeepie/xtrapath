from manim import *
import numpy as np

# Try importing voiceover dependencies
try:
    from manim_voiceover import VoiceoverScene
    from manim_voiceover.services.base import SpeechService
    import edge_tts
    import asyncio
    from pathlib import Path
    VOICEOVER_AVAILABLE = True
except ImportError:
    VOICEOVER_AVAILABLE = False
    # Fallback classes to prevent import errors
    class VoiceoverScene(Scene): pass
    class SpeechService: 
        def __init__(self, **kwargs): pass

# Try importing pymunk for physics
try:
    import pymunk
    PYMUNK_AVAILABLE = True
except ImportError:
    PYMUNK_AVAILABLE = False

class BaseTemplate(Scene):
    """Base class with common helper methods."""
    def intro(self, title_text):
        title = Text(title_text, font_size=48)
        self.play(Write(title))
        self.wait(1)
        self.play(FadeOut(title))

class KinematicsTemplate(BaseTemplate):
    """Template for physics/kinematics animations."""
    def construct(self):
        # A simple ball drop animation
        ground = Line(LEFT * 3, RIGHT * 3).shift(DOWN * 2)
        ball = Circle(radius=0.2, color=RED, fill_opacity=1).shift(UP * 2)
        
        self.play(Create(ground), FadeIn(ball))
        self.wait(0.5)
        
        # Animate falling
        self.play(
            ball.animate.next_to(ground, UP, buff=0),
            rate_func=rate_functions.ease_out_bounce,
            run_time=2
        )

class GeometryTemplate(BaseTemplate):
    """Template for geometric transformations."""
    def construct(self):
        square = Square(color=BLUE, fill_opacity=0.5)
        circle = Circle(color=RED, fill_opacity=0.5)
        
        self.play(Create(square))
        self.play(Transform(square, circle))
        self.play(square.animate.set_fill(YELLOW, opacity=0.8))

class QATemplate(BaseTemplate):
    """Template for Question & Answer flows."""
    def question_flow(self, qa_list):
        for question, answer in qa_list:
            q_mob = Text(question, font_size=36).to_edge(UP)
            a_mob = Text(answer, font_size=48, color=YELLOW)
            
            self.play(Write(q_mob))
            self.wait(1)
            self.play(Write(a_mob))
            self.wait(2)
            self.play(FadeOut(q_mob), FadeOut(a_mob))

class PymunkTemplate(BaseTemplate):
    """Template for Pymunk physics integration."""
    def construct(self):
        if not PYMUNK_AVAILABLE:
            self.add(Text("Pymunk not installed.\nRun: pip install pymunk", color=RED).scale(0.6))
            self.wait(2)
            return

        # 1. Setup Physics Space
        space = pymunk.Space()
        space.gravity = (0.0, -9.81)

        # 2. Create Static Floor
        floor_y = -3
        floor_body = pymunk.Body(body_type=pymunk.Body.STATIC)
        floor_body.position = (0, floor_y)
        floor_shape = pymunk.Segment(floor_body, (-5, 0), (5, 0), 0.1)
        floor_shape.elasticity = 0.8
        floor_shape.friction = 0.5
        space.add(floor_body, floor_shape)

        floor = Line(LEFT * 5, RIGHT * 5).shift(UP * floor_y)
        floor.set_stroke(width=5)
        self.add(floor)

        # 3. Create Dynamic Ball
        mass = 1
        radius = 0.5
        moment = pymunk.moment_for_circle(mass, 0, radius)
        body = pymunk.Body(mass, moment)
        body.position = (0, 3)
        shape = pymunk.Circle(body, radius)
        shape.elasticity = 0.8
        space.add(body, shape)

        ball = Circle(radius=radius, color=RED, fill_opacity=0.8)
        ball.move_to(UP * 3)
        self.add(ball)

        # 4. Update Loop
        def update_ball(mob, dt):
            # Run multiple physics steps per frame for stability
            for _ in range(10):
                space.step(dt/10)
            # Sync Manim object with Pymunk body
            mob.move_to([body.position.x, body.position.y, 0])
        
        ball.add_updater(update_ball)
        self.wait(4)
        ball.remove_updater(update_ball)

class PymunkCollisionTemplate(BaseTemplate):
    """Template for Pymunk sensor collisions."""
    def construct(self):
        if not PYMUNK_AVAILABLE:
            self.add(Text("Pymunk not installed.", color=RED))
            self.wait(2)
            return

        # 1. Setup Space
        space = pymunk.Space()
        space.gravity = (0, 0)

        # 2. Setup Static Sensors
        # Segment
        b1 = pymunk.Body(body_type=pymunk.Body.STATIC)
        b1.position = (3, 1.5)
        s1 = pymunk.Segment(b1, (-1, 0), (1, 0), 0.1)
        s1.sensor = True
        space.add(b1, s1)
        vis1 = Line(LEFT, RIGHT).scale(1).move_to([3, 1.5, 0]).set_stroke(width=5, color=BLUE)
        self.add(vis1)

        # Circle
        b2 = pymunk.Body(body_type=pymunk.Body.STATIC)
        b2.position = (-3, 0)
        s2 = pymunk.Circle(b2, 0.8)
        s2.sensor = True
        space.add(b2, s2)
        vis2 = Circle(radius=0.8, color=BLUE, fill_opacity=0.3).move_to([-3, 0, 0])
        self.add(vis2)

        # Box
        b3 = pymunk.Body(body_type=pymunk.Body.STATIC)
        b3.position = (3, -1.5)
        s3 = pymunk.Poly.create_box(b3, (2, 1))
        s3.sensor = True
        space.add(b3, s3)
        vis3 = Rectangle(width=2, height=1, color=BLUE, fill_opacity=0.3).move_to([3, -1.5, 0])
        self.add(vis3)

        # Moving Body
        mouse_body = pymunk.Body(body_type=pymunk.Body.KINEMATIC)
        mouse_body.position = (0, 0)
        mouse_shape = pymunk.Circle(mouse_body, 0.5)
        mouse_shape.sensor = True
        space.add(mouse_body, mouse_shape)
        mouse_vis = Circle(radius=0.5, color=YELLOW, fill_opacity=0.8)
        self.add(mouse_vis)

        # Collision Handler
        collisions = {"active": False}
        def pre_solve(arbiter, space, data):
            collisions["active"] = True
            return True

        h = space.add_default_collision_handler()
        h.pre_solve = pre_solve

        # Update Loop
        def update_sim(mob, dt):
            collisions["active"] = False
            # Move kinematic body (Figure 8)
            t = self.renderer.time
            x = 4 * np.sin(t)
            y = 2 * np.cos(2 * t)
            mouse_body.position = (x, y)
            
            space.step(dt)
            mob.move_to([mouse_body.position.x, mouse_body.position.y, 0])
            
            if collisions["active"]:
                mob.set_color(RED)
            else:
                mob.set_color(YELLOW)

        mouse_vis.add_updater(update_sim)
        self.wait(8)
        mouse_vis.remove_updater(update_sim)

# --- Voiceover & Advanced Templates ---

if VOICEOVER_AVAILABLE:
    class EdgeTTS(SpeechService):
        def __init__(self, voice="en-US-AndrewNeural", rate="-7%", **kwargs):
            self.voice = voice
            self.rate = rate
            super().__init__(**kwargs)

        def generate_from_text(self, text: str, cache_dir: str = None, path: str = None, **kwargs) -> dict:
            if cache_dir is None: cache_dir = self.cache_dir
            input_data = {"input_text": text, "service": "edge-tts", "config": {"voice": self.voice, "rate": self.rate}}
            cached_result = self.get_cached_result(input_data, cache_dir)
            if cached_result is not None: return cached_result
            audio_path = path if path else self.get_audio_basename(input_data) + ".mp3"
            full_path = str(Path(cache_dir) / audio_path)
            async def _gen():
                communicate = edge_tts.Communicate(text, self.voice, rate=self.rate)
                await communicate.save(full_path)
            asyncio.run(_gen())
            return {"input_text": text, "input_data": input_data, "original_audio": audio_path}

    class FourCirclesTemplate(VoiceoverScene):
        """Template for the Four Circles math problem with voiceover."""
        def construct(self):
            self.set_speech_service(EdgeTTS(voice="en-US-AndrewNeural", rate="-7%"))
            self.camera.background_color = "#171717"

            # --- PALETTE ---
            C_BLUE_SHADE = "#5dade2"
            C_WHITE      = WHITE
            C_GUIDE      = RED
            C_DIM        = GRAY
            C_HIGHLIGHT  = "#1B2BD8"

            # --- GEOMETRY SETUP ---
            # Large Circle Radius R = 8 (Diameter 16)
            # Scale down to fit screen: visual R = 3.2
            VISUAL_SCALE = 3.2 / 8
            R_vis = 8 * VISUAL_SCALE
            
            # Derived radii
            r_real = 8 / (np.sqrt(2) + 1)
            r_vis  = r_real * VISUAL_SCALE
            
            rs_real = r_real * (np.sqrt(2) - 1)
            rs_vis  = rs_real * VISUAL_SCALE
            
            # Positions
            M1 = np.array([r_vis, r_vis, 0.0])
            M2 = np.array([-r_vis, r_vis, 0.0])
            M3 = np.array([-r_vis, -r_vis, 0.0])
            M4 = np.array([r_vis, -r_vis, 0.0])
            ORIGIN_PT = np.array([0.0, 0.0, 0.0])

            # --- SHAPES ---
            large_circle = Circle(radius=R_vis, color=C_BLUE_SHADE, fill_opacity=1, stroke_width=4, stroke_color=WHITE)
            
            m1 = Circle(radius=r_vis, color=C_WHITE, fill_opacity=1, stroke_color=BLACK, stroke_width=2).move_to(M1)
            m2 = Circle(radius=r_vis, color=C_WHITE, fill_opacity=1, stroke_color=BLACK, stroke_width=2).move_to(M2)
            m3 = Circle(radius=r_vis, color=C_WHITE, fill_opacity=1, stroke_color=BLACK, stroke_width=2).move_to(M3)
            m4 = Circle(radius=r_vis, color=C_WHITE, fill_opacity=1, stroke_color=BLACK, stroke_width=2).move_to(M4)
            medium_circles = VGroup(m1, m2, m3, m4)

            small_circle = Circle(radius=rs_vis, color=C_WHITE, fill_opacity=1, stroke_color=BLACK, stroke_width=2).move_to(ORIGIN_PT)
            
            diagram = VGroup(large_circle, medium_circles, small_circle)
            diagram.move_to(ORIGIN)
            
            MATH_Y = DOWN * 4.0

            # --- ANIMATION SCRIPT ---

            with self.voiceover(text="What is the area of the blue shaded region?") as tracker:
                self.play(DrawBorderThenFill(large_circle), run_time=2.0)
                self.play(FadeIn(medium_circles), FadeIn(small_circle), run_time=1.5)
                
                d_line = DoubleArrow(large_circle.get_left(), large_circle.get_right(), buff=0, color=BLACK)
                d_lbl = MathTex("16", color=BLACK).next_to(d_line, UP, buff=0.1)
                self.play(Create(d_line), Write(d_lbl))
                self.wait(1)

            with self.voiceover(text="We have a large circle of diameter 16. So the radius R is 8.") as tracker:
                self.play(FadeOut(d_line), FadeOut(d_lbl))
                
                LIFT_AMT = UP * 3.5
                self.play(diagram.animate.shift(LIFT_AMT))
                M1 += LIFT_AMT
                ORIGIN_PT += LIFT_AMT
                
                r_line_large = Line(ORIGIN_PT, large_circle.get_right(), color=C_GUIDE, stroke_width=6)
                r_lbl_large = MathTex("R=8", color=C_GUIDE).next_to(r_line_large, UP)
                self.play(Create(r_line_large), Write(r_lbl_large))
                self.wait(1)

            with self.voiceover(text="First, let's find the radius 'r' of the four medium circles.") as tracker:
                self.play(FadeOut(r_line_large), FadeOut(r_lbl_large))
                
                touch_pt = M1 + (normalize(M1 - ORIGIN_PT) * r_vis)
                diag_full = Line(ORIGIN_PT, touch_pt, color=C_GUIDE)
                self.play(Create(diag_full), run_time=1.5)

            with self.voiceover(text="The centers form a square. Let's look at the geometry.") as tracker:
                corner_pt = np.array([M1[0], ORIGIN_PT[1], 0])
                leg_h = Line(ORIGIN_PT, corner_pt, color=C_DIM, stroke_width=4)
                leg_v = Line(corner_pt, M1, color=C_DIM, stroke_width=4)
                self.play(Create(leg_h), Create(leg_v))
                
                lbl_leg_h = MathTex("r", color=C_DIM, font_size=36).next_to(leg_h, DOWN, buff=0.1)
                lbl_leg_v = MathTex("r", color=C_DIM, font_size=36).next_to(leg_v, RIGHT, buff=0.1)
                self.play(Write(lbl_leg_h), Write(lbl_leg_v))
                self.wait(1)

            with self.voiceover(text="Using Pythagoras, the hypotenuse is the square root of r squared plus r squared.") as tracker:
                pythag_text = MathTex(r"\sqrt{r^2 + r^2} = r\sqrt{2}", color=C_HIGHLIGHT, font_size=40)
                pythag_text.next_to(leg_v, RIGHT, buff=0.5).shift(DOWN * 0.5)
                # Check bounds using config
                if pythag_text.get_right()[0] > config.frame_width/2 - 0.5:
                     pythag_text.next_to(m1, DOWN, buff=0.5).shift(RIGHT*0.5)
                self.play(Write(pythag_text))
                self.wait(2)

            with self.voiceover(text="So the distance from the center to the medium circle is r root 2.") as tracker:
                self.play(FadeOut(leg_h), FadeOut(leg_v), FadeOut(lbl_leg_h), FadeOut(lbl_leg_v), FadeOut(pythag_text))

            with self.voiceover(text="The distance from the center to the edge is composed of two parts.") as tracker:
                l1 = Line(ORIGIN_PT, M1, color=C_HIGHLIGHT, stroke_width=6)
                l2 = Line(M1, touch_pt, color=C_GUIDE, stroke_width=6)
                self.play(Create(l1), Create(l2))
                
            with self.voiceover(text="One part is the diagonal of the square, r root 2. The other is the radius r.") as tracker:
                lbl_r = MathTex("r", color=C_GUIDE).next_to(l2, UL, buff=0.05)
                lbl_diag = MathTex(r"r\sqrt{2}", color=C_HIGHLIGHT).next_to(l1, DR, buff=0.05)
                self.play(Write(lbl_r), Write(lbl_diag))

            with self.voiceover(text="The total length is the large radius, 8.") as tracker:
                eq1 = MathTex(r"r\sqrt{2} + r = 8").move_to(MATH_Y)
                self.play(Write(eq1))
                self.wait(1)

            with self.voiceover(text="We factor out r.") as tracker:
                eq1_factor = MathTex(r"r(\sqrt{2} + 1) = 8").move_to(MATH_Y)
                self.play(ReplacementTransform(eq1, eq1_factor))
                self.wait(1)

            with self.voiceover(text="Solving for r... we get 8 over root 2 plus 1.") as tracker:
                eq2 = MathTex(r"r = \frac{8}{\sqrt{2}+1}").move_to(MATH_Y)
                self.play(ReplacementTransform(eq1_factor, eq2))
                self.wait(1)

            with self.voiceover(text="Rationalizing the denominator gives us a cleaner value.") as tracker:
                eq3 = MathTex(r"r = 8(\sqrt{2}-1)").move_to(MATH_Y)
                self.play(ReplacementTransform(eq2, eq3))
                self.play(Indicate(eq3))
                self.wait(1)
                res_r = eq3.copy().scale(0.8).move_to(DOWN * 0.5)
                self.play(Transform(eq3, res_r))

            with self.voiceover(text="Now for the tiny circle in the middle.") as tracker:
                self.play(Indicate(small_circle, color=C_HIGHLIGHT))
                l_small = Line(ORIGIN_PT, ORIGIN_PT + (normalize(M1 - ORIGIN_PT) * rs_vis), color=C_GUIDE)
                self.play(Create(l_small))

            with self.voiceover(text="Its radius fits in the remaining gap. It is distance to center minus medium radius.") as tracker:
                eq_s1 = MathTex(r"r_s = r\sqrt{2} - r").move_to(MATH_Y)
                self.play(Write(eq_s1))
                self.wait(1)

            with self.voiceover(text="We can factor out r again.") as tracker:
                eq_s1_b = MathTex(r"r_s = r(\sqrt{2} - 1)").move_to(MATH_Y)
                self.play(ReplacementTransform(eq_s1, eq_s1_b))
                self.wait(1)

            with self.voiceover(text="Substituting our value for r... gives us this.") as tracker:
                eq_s2 = MathTex(r"r_s = 8(\sqrt{2}-1)(\sqrt{2}-1)").move_to(MATH_Y)
                self.play(ReplacementTransform(eq_s1_b, eq_s2))
                self.wait(1)

            with self.voiceover(text="Which simplifies to 8 times 3 minus 2 root 2.") as tracker:
                eq_s3 = MathTex(r"r_s = 8(3 - 2\sqrt{2})").move_to(MATH_Y)
                self.play(ReplacementTransform(eq_s2, eq_s3))
                self.wait(1)
                res_rs = eq_s3.copy().scale(0.8).next_to(res_r, DOWN, buff=0.5)
                self.play(Transform(eq_s3, res_rs))
                self.play(FadeOut(diag_full), FadeOut(l1), FadeOut(l2), FadeOut(l_small), FadeOut(lbl_r), FadeOut(lbl_diag))

            with self.voiceover(text="Now we calculate the blue area. Total area minus the white circles.") as tracker:
                icon_large = large_circle.copy().scale(0.15).set_fill(opacity=1)
                icon_med = m1.copy().scale(0.15).set_fill(opacity=1)
                icon_small = small_circle.copy().scale(0.15).set_fill(opacity=1)
                eq_row = VGroup(MathTex("A_{blue} = "), icon_large, MathTex(" - 4"), icon_med, MathTex(" - "), icon_small).arrange(RIGHT).move_to(MATH_Y + UP*1.0)
                self.play(Write(eq_row))
                self.wait(1)

            with self.voiceover(text="The total area is 64 pi.") as tracker:
                val_total = MathTex(r"64\pi").next_to(eq_row, DOWN, buff=0.5)
                self.play(Write(val_total))
                self.wait(1)

else:
    class FourCirclesTemplate(Scene):
        def construct(self):
            self.add(Text("Manim Voiceover library not installed.", color=RED))