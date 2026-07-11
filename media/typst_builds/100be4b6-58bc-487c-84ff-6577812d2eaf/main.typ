
#set document(title: "Physics 101: Mechanics", author: "Dr. Nova")
#set text(font: "Linux Libertine", size: 11pt)

// --- Document Configuration ---
#set page(
  paper: "a4",
  margin: (x: 2cm, y: 2.5cm),
  header: align(right, text(fill: gray, size: 9pt)[Physics 101: Mechanics | Section Appendix]),
  footer: context [
    #let page_number = counter(page).display()
    #let total_pages = counter(page).final().first()
    #align(center, text(size: 10pt)[Page #page_number of #total_pages])
  ]
)
#set text(font: "serif", size: 11pt)
#set par(justify: true, leading: 0.65em)

// --- Helper for Placeholders ---
#let figure-box(title) = rect(
  width: 100%, 
  height: 120pt, 
  stroke: 0.5pt + blue.darken(20%), 
  radius: 4pt,
  fill: blue.lighten(95%),
  align(center + horizon)[
    #text(weight: "bold", fill: blue.darken(40%))[#title] \
    #text(size: 9pt, fill: gray)[[Vector Graphics Canvas]]
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

#v(1em)
#figure(
  figure-box("Graph 1: Standard Right-Angled Triangle with sides a, b, and c"),
  caption: [The standard configuration of a right triangle showing the orthogonal legs and the hypotenuse.]
)
#v(1em)

== 2. Geometric Interpretation
Beyond simple algebra, the theorem describes an equivalence of areas. If we construct literal squares on each side of the right triangle, the total area of the two smaller squares will exactly equal the area of the largest square resting on the hypotenuse.

This visualization helps bridge the gap between algebraic expressions and spatial reality, demonstrating that $a^2$ and $b^2$ are physical surfaces being combined into $c^2$.

#v(1em)
#figure(
  figure-box("Graph 2: Area Mapping (Squares constructed on sides a, b, and c)"),
  caption: [Visualizing the theorem as a sum of physical areas ($text(Area)_A + text(Area)_B = text(Area)_C$).]
)

#pagebreak() // Forcing the document to stretch gracefully across 2 pages

== 3. Classical Algebraic Proof
There are hundreds of known proofs for the Pythagorean theorem. One of the most intuitive is the algebraic proof using a large square containing four identical right-angled triangles.

Consider a large square with side length $(a + b)$. Inside this square, four triangles are arranged such that they form a smaller, tilted inner square with side length $c$.

#v(1em)
#figure(
  figure-box("Graph 3: Four Triangles inside a Large Square Arrangement"),
  caption: [Geometric arrangement for the algebraic proof.]
)
#v(1em)

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

#v(1em)
#figure(
  figure-box("Graph 4: Distance Formula on a Cartesian Coordinate Plane"),
  caption: [Projecting Euclidean distance as a right triangle over coordinate axes.]
)
#v(1em)

This principle scales effortlessly into three dimensions ($d = sqrt(Delta x^2 + Delta y^2 + Delta z^2)$) and generalized Hilbert vector spaces, underscoring its immense value to modern physics and mechanical engineering.
