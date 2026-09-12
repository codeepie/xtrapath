"""
Manim-to-Three.js Math Bridge (manim_three_bridge.py)
A declarative Python-to-WebGL bridge for mathematics educators.
Enables teachers and students to write intuitive Manim-like Python code
and render interactive 3D Three.js math simulations in real-time.
"""

import math
import json
from typing import List, Dict, Any, Callable, Optional, Union

# Color constants
RED = "#ef4444"
BLUE = "#3b82f6"
GREEN = "#10b981"
YELLOW = "#f59e0b"
PURPLE = "#8b5cf6"
CYAN = "#06b6d4"
PINK = "#ec4899"
ORANGE = "#f97316"
WHITE = "#ffffff"
GRAY = "#6b7280"
DARK_GRAY = "#1f2937"
GOLD = "#fbbf24"

# Direction vectors
ORIGIN = [0.0, 0.0, 0.0]
UP = [0.0, 1.0, 0.0]
DOWN = [0.0, -1.0, 0.0]
RIGHT = [1.0, 0.0, 0.0]
LEFT = [-1.0, 0.0, 0.0]
OUT = [0.0, 0.0, 1.0]
IN = [0.0, 0.0, -1.0]


class MObject3D:
    """Base class for all 3D mathematical objects in the bridge."""
    def __init__(self, id_name: Optional[str] = None):
        self.id = id_name or f"obj_{id(self)}"
        self.color = BLUE
        self.opacity = 1.0
        self.position = [0.0, 0.0, 0.0]
        self.rotation = [0.0, 0.0, 0.0]
        self.scale = [1.0, 1.0, 1.0]
        self.visible = True

    def shift(self, vector: List[float]):
        self.position = [self.position[i] + vector[i] for i in range(3)]
        return self

    def scale_by(self, factor: Union[float, List[float]]):
        if isinstance(factor, (int, float)):
            self.scale = [s * factor for s in self.scale]
        else:
            self.scale = [self.scale[i] * factor[i] for i in range(3)]
        return self

    def set_color(self, color: str):
        self.color = color
        return self

    def set_opacity(self, opacity: float):
        self.opacity = opacity
        return self

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.__class__.__name__,
            "color": self.color,
            "opacity": self.opacity,
            "position": self.position,
            "rotation": self.rotation,
            "scale": self.scale,
            "visible": self.visible,
        }


class Axes3D(MObject3D):
    """3D Coordinate axes with grid planes and tick marks."""
    def __init__(
        self,
        x_range: List[float] = [-5, 5, 1],
        y_range: List[float] = [-5, 5, 1],
        z_range: List[float] = [-5, 5, 1],
        show_grid: bool = True,
        show_labels: bool = True,
        axis_colors: Dict[str, str] = None,
        id_name: Optional[str] = None
    ):
        super().__init__(id_name)
        self.x_range = x_range
        self.y_range = y_range
        self.z_range = z_range
        self.show_grid = show_grid
        self.show_labels = show_labels
        self.axis_colors = axis_colors or {"x": "#ef4444", "y": "#10b981", "z": "#3b82f6"}

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "x_range": self.x_range,
            "y_range": self.y_range,
            "z_range": self.z_range,
            "show_grid": self.show_grid,
            "show_labels": self.show_labels,
            "axis_colors": self.axis_colors,
        })
        return data


class ParametricSurface(MObject3D):
    """Parametric or explicit mathematical 3D surface z = f(x, y) or [x(u,v), y(u,v), z(u,v)]."""
    def __init__(
        self,
        func: Optional[Callable[[float, float], List[float]]] = None,
        expr: Optional[str] = None,
        u_range: List[float] = [-3, 3],
        v_range: List[float] = [-3, 3],
        resolution: int = 40,
        color_map: str = "viridis",
        wireframe: bool = False,
        opacity: float = 0.85,
        id_name: Optional[str] = None
    ):
        super().__init__(id_name)
        self.func = func
        self.expr = expr
        self.u_range = u_range
        self.v_range = v_range
        self.resolution = resolution
        self.color_map = color_map
        self.wireframe = wireframe
        self.opacity = opacity
        self.vertices = []
        self.indices = []

        if func:
            self._generate_mesh(func)

    def _generate_mesh(self, func: Callable[[float, float], List[float]]):
        u_min, u_max = self.u_range[0], self.u_range[1]
        v_min, v_max = self.v_range[0], self.v_range[1]
        n = self.resolution

        du = (u_max - u_min) / n
        dv = (v_max - v_min) / n

        # Vertices [x, y, z, u_norm, v_norm]
        self.vertices = []
        for i in range(n + 1):
            u = u_min + i * du
            for j in range(n + 1):
                v = v_min + j * dv
                try:
                    pt = func(u, v)
                    if isinstance(pt, (int, float)): # explicit z = f(x, y)
                        pt = [u, v, float(pt)]
                except Exception:
                    pt = [u, v, 0.0]
                self.vertices.append([float(pt[0]), float(pt[1]), float(pt[2]), i / n, j / n])

        # Triangle indices
        self.indices = []
        for i in range(n):
            for j in range(n):
                a = i * (n + 1) + j
                b = (i + 1) * (n + 1) + j
                c = (i + 1) * (n + 1) + (j + 1)
                d = i * (n + 1) + (j + 1)
                self.indices.extend([a, b, d, b, c, d])

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "expr": self.expr,
            "u_range": self.u_range,
            "v_range": self.v_range,
            "resolution": self.resolution,
            "color_map": self.color_map,
            "wireframe": self.wireframe,
            "vertices": self.vertices,
            "indices": self.indices,
        })
        return data


class TangentPlane(MObject3D):
    """Calculus tangent plane to a surface at a specific (u, v) coordinate."""
    def __init__(
        self,
        surface_expr: Optional[str] = None,
        u: float = 1.0,
        v: float = 1.0,
        size: float = 2.0,
        color: str = "#ec4899",
        opacity: float = 0.7,
        id_name: Optional[str] = None
    ):
        super().__init__(id_name)
        self.surface_expr = surface_expr
        self.u = u
        self.v = v
        self.size = size
        self.color = color
        self.opacity = opacity

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "surface_expr": self.surface_expr,
            "u": self.u,
            "v": self.v,
            "size": self.size,
        })
        return data


class ParametricCurve(MObject3D):
    """3D trajectory or space curve r(t) = [x(t), y(t), z(t)]."""
    def __init__(
        self,
        func: Optional[Callable[[float], List[float]]] = None,
        expr: Optional[str] = None,
        t_range: List[float] = [0, 2 * math.pi],
        num_points: int = 150,
        line_width: float = 3.0,
        color: str = "#38bdf8",
        id_name: Optional[str] = None
    ):
        super().__init__(id_name)
        self.expr = expr
        self.t_range = t_range
        self.num_points = num_points
        self.line_width = line_width
        self.color = color
        self.points = []

        if func:
            t_min, t_max = t_range[0], t_range[1]
            dt = (t_max - t_min) / (num_points - 1)
            for i in range(num_points):
                t = t_min + i * dt
                pt = func(t)
                self.points.append([float(pt[0]), float(pt[1]), float(pt[2])])

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "expr": self.expr,
            "t_range": self.t_range,
            "line_width": self.line_width,
            "points": self.points,
        })
        return data


class Vector3D(MObject3D):
    """3D Vector arrow from origin or start point to end point with label."""
    def __init__(
        self,
        vector: List[float] = [1, 1, 1],
        start: List[float] = [0, 0, 0],
        color: str = "#f59e0b",
        label: Optional[str] = None,
        thickness: float = 0.08,
        id_name: Optional[str] = None
    ):
        super().__init__(id_name)
        self.vector = vector
        self.start = start
        self.color = color
        self.label = label
        self.thickness = thickness

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "vector": self.vector,
            "start": self.start,
            "label": self.label,
            "thickness": self.thickness,
        })
        return data


class VectorField3D(MObject3D):
    """3D Vector field F(x, y, z) = [P, Q, R] rendered as instanced arrow vectors."""
    def __init__(
        self,
        func: Optional[Callable[[float, float, float], List[float]]] = None,
        expr: Optional[str] = None,
        x_range: List[float] = [-3, 3, 1.5],
        y_range: List[float] = [-3, 3, 1.5],
        z_range: List[float] = [-3, 3, 1.5],
        color_by_magnitude: bool = True,
        max_vector_length: float = 0.8,
        id_name: Optional[str] = None
    ):
        super().__init__(id_name)
        self.expr = expr
        self.x_range = x_range
        self.y_range = y_range
        self.z_range = z_range
        self.color_by_magnitude = color_by_magnitude
        self.max_vector_length = max_vector_length
        self.vectors = []

        if func:
            self._compute_field(func)

    def _compute_field(self, func):
        def frange(start, stop, step):
            curr = start
            while curr <= stop + 1e-9:
                yield curr
                curr += step

        for x in frange(self.x_range[0], self.x_range[1], self.x_range[2]):
            for y in frange(self.y_range[0], self.y_range[1], self.y_range[2]):
                for z in frange(self.z_range[0], self.z_range[1], self.z_range[2]):
                    try:
                        v = func(x, y, z)
                        mag = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
                        self.vectors.append({
                            "pos": [float(x), float(y), float(z)],
                            "vec": [float(v[0]), float(v[1]), float(v[2])],
                            "mag": float(mag)
                        })
                    except Exception:
                        pass

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "expr": self.expr,
            "x_range": self.x_range,
            "y_range": self.y_range,
            "z_range": self.z_range,
            "color_by_magnitude": self.color_by_magnitude,
            "max_vector_length": self.max_vector_length,
            "vectors": self.vectors,
        })
        return data


class RiemannSum3D(MObject3D):
    """3D Double Riemann Sum: columns approximating the double integral ∬ f(x,y) dA."""
    def __init__(
        self,
        func: Optional[Callable[[float, float], float]] = None,
        expr: Optional[str] = None,
        x_range: List[float] = [-2, 2],
        y_range: List[float] = [-2, 2],
        nx: int = 8,
        ny: int = 8,
        color: str = "#8b5cf6",
        opacity: float = 0.75,
        id_name: Optional[str] = None
    ):
        super().__init__(id_name)
        self.expr = expr
        self.x_range = x_range
        self.y_range = y_range
        self.nx = nx
        self.ny = ny
        self.color = color
        self.opacity = opacity
        self.columns = []

        if func:
            x_min, x_max = x_range[0], x_range[1]
            y_min, y_max = y_range[0], y_range[1]
            dx = (x_max - x_min) / nx
            dy = (y_max - y_min) / ny

            for i in range(nx):
                x = x_min + (i + 0.5) * dx
                for j in range(ny):
                    y = y_min + (j + 0.5) * dy
                    try:
                        h = float(func(x, y))
                    except Exception:
                        h = 0.0
                    self.columns.append({
                        "x": float(x),
                        "y": float(y),
                        "dx": float(dx),
                        "dy": float(dy),
                        "height": h
                    })

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "expr": self.expr,
            "x_range": self.x_range,
            "y_range": self.y_range,
            "nx": self.nx,
            "ny": self.ny,
            "columns": self.columns,
        })
        return data


class MatrixTransform3D(MObject3D):
    """Linear transformation in 3D showing transformed basis vectors i, j, k and grid distortion."""
    def __init__(
        self,
        matrix: List[List[float]] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        show_basis_vectors: bool = True,
        show_unit_cube: bool = True,
        id_name: Optional[str] = None
    ):
        super().__init__(id_name)
        self.matrix = matrix
        self.show_basis_vectors = show_basis_vectors
        self.show_unit_cube = show_unit_cube

    def to_dict(self) -> Dict[str, Any]:
        data = super().to_dict()
        data.update({
            "matrix": self.matrix,
            "show_basis_vectors": self.show_basis_vectors,
            "show_unit_cube": self.show_unit_cube,
        })
        return data


# --- Animation Timeline & Actions ---

class AnimationAction:
    def __init__(self, action_type: str, target_id: str, duration: float = 1.0, **kwargs):
        self.action_type = action_type
        self.target_id = target_id
        self.duration = duration
        self.params = kwargs

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.action_type,
            "target": self.target_id,
            "duration": self.duration,
            "params": self.params
        }

def Create(mobject: MObject3D, duration: float = 1.5) -> AnimationAction:
    return AnimationAction("Create", mobject.id, duration=duration)

def FadeIn(mobject: MObject3D, duration: float = 1.0) -> AnimationAction:
    return AnimationAction("FadeIn", mobject.id, duration=duration)

def FadeOut(mobject: MObject3D, duration: float = 1.0) -> AnimationAction:
    return AnimationAction("FadeOut", mobject.id, duration=duration)

def Rotate(mobject: MObject3D, angle: float = math.pi, axis: List[float] = [0, 1, 0], duration: float = 2.0) -> AnimationAction:
    return AnimationAction("Rotate", mobject.id, duration=duration, angle=angle, axis=axis)

def Transform(source: MObject3D, target: MObject3D, duration: float = 2.0) -> AnimationAction:
    return AnimationAction("Transform", source.id, duration=duration, target_data=target.to_dict())


# --- Math Scene Base Class ---

class MathScene3D:
    """Main Scene container for 3D Math visual lessons."""
    def __init__(self, title: str = "3D Math Visualization"):
        self.title = title
        self.objects: List[MObject3D] = []
        self.animations: List[List[Dict[str, Any]]] = []
        self.sliders: List[Dict[str, Any]] = []
        self.latex_annotations: List[Dict[str, Any]] = []
        self.camera_position = [10.0, 8.0, 12.0]
        self.camera_target = [0.0, 0.0, 0.0]

    def add(self, *mobjects: MObject3D):
        for m in mobjects:
            self.objects.append(m)
        return self

    def add_slider(self, name: str, label: str, min_val: float, max_val: float, value: float, step: float = 0.1):
        self.sliders.append({
            "name": name,
            "label": label,
            "min": min_val,
            "max": max_val,
            "value": value,
            "step": step
        })

    def add_latex(self, latex: str, position: List[float] = [0, 0, 0], color: str = "#ffffff"):
        self.latex_annotations.append({
            "latex": latex,
            "position": position,
            "color": color
        })

    def set_camera(self, position: List[float], target: List[float] = [0, 0, 0]):
        self.camera_position = position
        self.camera_target = target

    def play(self, *actions: AnimationAction):
        step = [action.to_dict() for action in actions]
        self.animations.append(step)

    def wait(self, duration: float = 1.0):
        self.animations.append([{
            "type": "Wait",
            "duration": duration
        }])

    def construct(self):
        """Override this method to build the math scene."""
        pass

    def serialize(self) -> str:
        """Serializes the entire scene graph into JSON for Three.js."""
        self.construct()
        scene_data = {
            "title": self.title,
            "camera": {
                "position": self.camera_position,
                "target": self.camera_target
            },
            "objects": [obj.to_dict() for obj in self.objects],
            "animations": self.animations,
            "sliders": self.sliders,
            "latex_annotations": self.latex_annotations
        }
        return json.dumps(scene_data, indent=2)


def compile_manim_three_code(python_code: str) -> Dict[str, Any]:
    """Compiles Python MathScene3D code string into Three.js scene JSON data."""
    # Execute user code in a controlled namespace
    safe_globals = {
        "MathScene3D": MathScene3D,
        "Axes3D": Axes3D,
        "ParametricSurface": ParametricSurface,
        "TangentPlane": TangentPlane,
        "ParametricCurve": ParametricCurve,
        "Vector3D": Vector3D,
        "VectorField3D": VectorField3D,
        "RiemannSum3D": RiemannSum3D,
        "MatrixTransform3D": MatrixTransform3D,
        "Create": Create,
        "FadeIn": FadeIn,
        "FadeOut": FadeOut,
        "Rotate": Rotate,
        "Transform": Transform,
        "math": math,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "exp": math.exp,
        "sqrt": math.sqrt,
        "pi": math.pi,
        "e": math.e,
        "RED": RED,
        "BLUE": BLUE,
        "GREEN": GREEN,
        "YELLOW": YELLOW,
        "PURPLE": PURPLE,
        "CYAN": CYAN,
        "PINK": PINK,
        "ORANGE": ORANGE,
        "WHITE": WHITE,
        "GRAY": GRAY,
        "GOLD": GOLD,
        "ORIGIN": ORIGIN,
        "UP": UP,
        "DOWN": DOWN,
        "RIGHT": RIGHT,
        "LEFT": LEFT,
        "OUT": OUT,
        "IN": IN,
    }

    local_vars = {}
    try:
        exec(python_code, safe_globals, local_vars)

        # Find the subclass of MathScene3D
        scene_cls = None
        for val in local_vars.values():
            if isinstance(val, type) and issubclass(val, MathScene3D) and val != MathScene3D:
                scene_cls = val
                break

        if not scene_cls:
            for val in safe_globals.values():
                if isinstance(val, type) and issubclass(val, MathScene3D) and val != MathScene3D:
                    scene_cls = val
                    break

        if not scene_cls:
            return {"success": False, "error": "No class inheriting from MathScene3D found in Python code."}

        scene_instance = scene_cls()
        json_data = scene_instance.serialize()
        return {"success": True, "scene": json.loads(json_data)}
    except Exception as ex:
        import traceback
        return {"success": False, "error": str(ex), "traceback": traceback.format_exc()}
