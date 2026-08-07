from manim import *

class KinematicsTemplate(Scene):
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
        self.wait()