
#set document(title: "Physics 101: Mechanics", author: "Dr. Nova")
#set text(font: "Linux Libertine", lang: "en")

#show heading.where(level: 1): it => {
  v(2em, weak: true)
  strong(it)
  v(1em, weak: true)
}

= Introduction to Typst

Typst is a modern, markup-based typesetting system that is as powerful as LaTeX but much easier to learn.

== Key Features
- *Simple Syntax:* Use familiar markup for **bold** and _italic_ text.
- *Readable Math:* Equations are clean. $a^2 + b^2 = c^2$. The quadratic formula is $x = (-b +- sqrt(b^2 - 4a c)) / (2a)$.
- *Scripting:* You can use variables and logic!
  #let name = "World"
  Hello, #name!