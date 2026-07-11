
#set document(title: "Physics 101: Mechanics", author: "Dr. Nova")
#set text(font: "Linux Libertine", size: 11pt)

// --- Document Configuration ---
#set page(
  paper: "a4",
  margin: (x: 2cm, y: 2.5cm),
  header: align(right, text(fill: gray.darken(20%), size: 9pt)[Physics 101: Mechanics | Section Appendix]),
  footer: context [
    #let page_number = counter(page).display()
    #let total_pages = counter(page).final().first()
    #align(center, text(size: 10pt)[Page #page_number of #total_pages])
  ]
)
#set text(size: 11pt)
#set par(justify: true, leading: 0.65em)

// --- Native Diagram Draw Functions (Corrected) ---

#let diagram-right-triangle() = block(
  width: 100%, height: 140pt, fill: gray.lighten(90%), radius: 4pt, stroke: 0.5pt + gray,
  context [
    #place(center + horizon, dy: -10pt, {
      // Triangle with corner at (0,0) for easier math
      let triangle = polygon(
        (0pt, 0pt), (120pt, 0pt), (0pt, 90pt),
        fill: blue.lighten(80%),
        stroke: 1.5pt + blue.darken(20%)
      )
      // Draw the triangle
      triangle
      // Right angle indicator, placed precisely at the corner
      place(rect(width: 10pt, height: 10pt, stroke: 1pt + blue.darken(20%)))
      // Labels placed relative to the triangle's points
      place(left + dx: -15pt + dy: 45pt, [$a$])
      place(bottom + dx: 60pt + dy: -15pt, [$b$])
      place(dx: 50pt + dy: 55pt, [$c$])
    })
  ]
)

#let diagram-area-proof() = block(
  width: 100%, height: 160pt, fill: gray.lighten(90%), radius: 4pt, stroke: 0.5pt + gray,
  context [
    #place(center + horizon, dy: -10pt, {
      // Central Right Triangle
      polygon(fill: blue.lighten(80%), stroke: 1pt + black, (0pt, 40pt), (50pt, 40pt), (0pt, 0pt))
      // Square on side a (left)
      place(dx: -40pt, dy: 0pt, {
        rect(width: 40pt, height: 40pt, fill: red.lighten(85%), stroke: 1pt + red)
        place(center, [$a^2$])
      })
      // Square on side b (bottom)
      place(dx: 0pt, dy: 40pt, {
        rect(width: 50pt, height: 50pt, fill: green.lighten(85%), stroke: 1pt + green)
        place(center, [$b^2$])
      })
      // Square on hypotenuse c (tilted)
      place(dx: 0pt, dy: 0pt, {
        polygon(fill: purple.lighten(85%), stroke: 1pt + purple, (0pt, 0pt), (50pt, 40pt), (90pt, -10pt), (40pt, -50pt))
        place(center, dx: 5pt, dy: -5pt, [$c^2$])
      })
    })
  ]
)

#let diagram-algebraic-proof() = block(
  width: 100%, height: 150pt, fill: gray.lighten(90%), radius: 4pt, stroke: 0.5pt + gray,
  context [
    #place(center + horizon, {
      // Large Outer Square (side a + b = 100pt)
      let a = 30pt
      let b = 70pt
      rect(width: a+b, height: a+b, stroke: 1pt + black)
      // Inner Tilted Square (c^2) - Corrected Coordinates
      polygon(
        (a, 0pt), (a+b, a), (b, a+b), (0pt, b),
        fill: yellow.lighten(85%),
        stroke: 1.5pt + orange
      )
      // Labels for sides
      place(top + left + dx: a/2, dy: -15pt, [$a$])
      place(top + left + dx: a + b/2, dy: -15pt, [$b$])
      place(center, [$c^2$])
    })
  ]
)

#let diagram-coordinate-distance() = block(
  width: 100%, height: 150pt, fill: gray.lighten(90%), radius: 4pt, stroke: 0.5pt + gray,
  context [
    #place(center + horizon, {
      // Axes
      line(start: (-10pt, 110pt), end: (150pt, 110pt), stroke: 1pt + gray.darken(40%)) // X axis
      line(start: (0pt, 0pt), end: (0pt, 120pt), stroke: 1pt + gray.darken(40%))  // Y axis
      // Triangle representing distance
      let p1 = (50pt, 30pt)
      let p2 = (120pt, 80pt)
      let p3 = (120pt, 30pt)
      polygon(p1, p3, p2, fill: blue.lighten(85%), stroke: 1.5pt + blue)
      // Points
      circle(radius: 2pt, fill: black, at: p1)
      circle(radius: 2pt, fill: black, at: p2)
      place(top + right, at: p1, dx: -2pt, [$P_1$])
      place(bottom + left, at: p2, dx: 2pt, [$P_2$])
      // Labels
      place(center, at: (p1.x, (p1.y + p2.y)/2), dx: -20pt, [$Delta y$])
      place(center, at: (((p1.x + p2.x)/2), p1.y), dy: -15pt, [$Delta x$])
      place(center, at: ((p1.x + p2.x)/2, (p1.y + p2.y)/2), dx: -10pt, dy: 10pt, [$d$])
    })
  ]
)

// --- Document Content ---

= The Geometry of Space: Pythagoras Theorem
*Author:* Dr. Nova \
*Date:* July 2026

== 1. Introduction
The Pythagorean theorem is one of the most fundamental principles in Euclidean geometry. It establishes a strict geometric relationship between the three sides of a right-angled triangle. Named after the ancient Greek mathematician Pythagoras, the theorem states that the square of the hypotenuse (the side opposite the right angle) is equal to the sum of the squares of the other two sides.

Mathematically, if $a$ and $b$ represent the lengths of the legs perpendicular to one another, and $c$ represents the length of the hypotenuse, the relation is expressed as:

$ a^2 + b^2 = c^2 $

#v(0.5em)
#figure(
  diagram-right-triangle(),
  caption: [The standard configuration of a right triangle showing the orthogonal legs and the hypotenuse.]
)
#v(0.5em)

== 2. Geometric Interpretation
Beyond simple algebra, the theorem describes an equivalence of areas. If we construct literal squares on each side of the right triangle, the total area of the two smaller squares will exactly equal the area of the largest square resting on the hypotenuse.

This visualization helps bridge the gap between algebraic expressions and spatial reality, demonstrating that $a^2$ and $b^2$ are physical surfaces being combined into $c^2$.

#v(0.5em)
#figure(
  diagram-area-proof(),
  caption: [Visualizing the theorem as a sum of physical areas ($"Area"_a + "Area"_b = "Area"_c$).]
)

#pagebreak() 

== 3. Classical Algebraic Proof
There are hundreds of known proofs for the Pythagorean theorem. One of the most intuitive is the algebraic proof using a large square containing four identical right-angled triangles.

Consider a large square with side length $(a + b)$. Inside this square, four triangles are arranged such that they form a smaller, tilted inner square with side length $c$.

#v(0.5em)
#figure(
  diagram-algebraic-proof(),
  caption: [Geometric arrangement for the algebraic proof.]
)
#v(0.5em)

The total area of the large outer square can be calculated in two distinct ways:
1. As a single large square: $A = (a + b)^2$
2. As the sum of the four internal triangles and the inner square: $A = 4 times (1/2 a b) + c^2$

Equating the two expressions yields the following algebraic breakdown:

$ (a + b)^2 = 4(1/2 a b) + c^2 $
$ a^2 + 2a b + b^2 = 2a b + c^2 $

Subtracting $2a b$ from both sides structurally validates our primary thesis:

$ a^2 + b^2 = c^2 $

== 4. Coordinate System Applications and Vector Space
In Cartesian coordinates, the theorem forms the bedrock of the distance formula. For any two points $P_1(x_1, y_1)$ and $P_2(x_2, y_2)$, the absolute distance $d$ is treated as a hypotenuse derived from the horizontal change $Delta x$ and vertical change $Delta y$.

$ d = sqrt((x_2 - x_1)^2 + (y_2 - y_1)^2) $

#v(0.5em)
#figure(
  diagram-coordinate-distance(),
  caption: [Projecting Euclidean distance as a right triangle over coordinate axes.]
)
#v(0.5em)

This principle scales effortlessly into three dimensions ($d = sqrt(Delta x^2 + Delta y^2 + Delta z^2)$) and generalized Hilbert vector spaces, underscoring its immense value to modern physics and mechanical engineering.
