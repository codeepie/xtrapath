# 📚 Human Author Publishing & Prompt Engineering Guide for XtraBook & KDP

> **A comprehensive playbook for authoring publication-grade, mathematically rigorous, and 100% human-voiced textbooks, monographs, and workbooks ready for Amazon KDP and academic distribution.**

---

## 🎯 1. The Core Philosophy

When publishing on Amazon KDP, university presses, or commercial distribution, the difference between an **amateur AI dump** and an **esteemed textbook** is not the typesetting tool—it is the **authenticity of the pedagogical voice**.

* **LaTeX & TikZ are pure code:** Compilation is performed locally by `pdflatex`. Vector diagrams are deterministic coordinate geometry.
* **The Prose is the Manuscript:** The explanations, pedagogical structure, student warnings, and exam insights define whether the book reads as an authentic human masterwork.

---

## 🚫 2. The AI Hallmark Blacklist (What to Never Say)

Real professors, mathematicians, and textbook authors never talk like an uncalibrated LLM. Avoid these dead giveaways:

### Banned Vocabulary & Filler Phrases
| AI Cliché / Filler Phrase | Why It Gets Flagged | Human Professor Alternative |
| :--- | :--- | :--- |
| *"Delve into / Delving"* | Overused AI trope | *"We examine"*, *"Consider"*, *"Let us analyze"* |
| *"In the realm of mathematics..."* | Pompous throat-clearing | Start directly with the definition: *"A circle is defined as..."* |
| *"Plays a crucial / pivotal role"* | Empty generic praise | Explain *why* it matters: *"Enables calculation of geodesics..."* |
| *"It is important to remember that..."* | Monotonous filler | *"Note:"*, *"Notice that..."*, *"Crucially:"* |
| *"A testament to the beauty of..."* | AI sentimentality | Present the clean proof and let the math speak for itself. |
| *"In conclusion / To summarize"* | High school essay closing | *"Summary of Key Results"*, *"Review Formulations"* |
| *"Furthermore / Moreover"* (every paragraph) | Machine transition habit | Use varied sentence starters or logical connectors: *"Hence"*, *"Applying this to..."*, *"Consequently"* |

### Banned Conversational Openers
Never include or leave conversational introductions:
- ❌ *"Certainly! Below is a comprehensive chapter on..."*
- ❌ *"In this chapter, we will embark on a fascinating journey..."*
- ❌ *"I hope this explanation helps your studies!"*
- ✅ **Begin immediately with:** Chapter title, brief historical/physical motivation (1–2 sentences), and the formal mathematical definition.

---

## 🧠 3. Sentence "Burstiness" & Human Rhythm

AI text sounds robotic because every sentence has uniform length (16–22 words) and predictable structure (Subject + Verb + Dependent Clause).

**Human authors write with variable tempo:**
1. **Short, punchy axioms:** *"Parallel lines never meet in Euclidean space."*
2. **Followed by detailed technical derivations:** *"When projected onto a Riemannian manifold of positive curvature, however, the geodesic paths inevitably converge, as demonstrated by the Gauss-Bonnet theorem."*
3. **Conversational pedagogical alerts:** *"Do not confuse the focal length with the semi-latus rectum."*

---

## 🏛️ 4. The 7-Part Master Textbook Chapter Framework

Every chapter generated or edited in XtraBook should follow this academic structure:

1. **Chapter Header & Subtitle:**  
   Clear, professional taxonomy (e.g., `\textbf{Chapter 4: Conic Sections} $\bullet$ Coordinate Geometry`).
2. **Formal Definition & First Principles Intuition:**  
   State the mathematical definition inside a clean theorem/definition environment.
3. **Coordinate-Accurate TikZ Vector Diagram:**  
   Always include a labeled figure with coordinate axes, tangent lines, and focal points.
4. **Step-by-Step Analytical Derivation:**  
   Show every algebraic transition using `\begin{aligned} ... \end{aligned}`. Never skip steps with *"it is obvious that"*.
5. **⚠️ Common Student Pitfalls & Misconceptions:**  
   Address the exact traps students fall into during exams (e.g., sign errors, extraneous roots, domain restrictions).
6. **💡 Exam Insights & Shortcut Methods:**  
   Provide high-yield shortcuts, symmetry arguments, or dimensional analysis checks.
7. **Graded Practice Problem Sets:**  
   - *Level 1: Foundational Formulations*
   - *Level 2: Standard Examination Level*
   - *Level 3: Advanced / Olympiad Challenge Problems with Full Solutions*

---

## 📝 5. High-Performance Copy-Paste Prompts for XtraBook

Use these battle-tested prompts in XtraBook to generate human-caliber chapters:

### Template A: Standard STEM Textbook Chapter
```text
Write a complete, publication-grade LaTeX chapter on: [INSERT TOPIC HERE, e.g., Derivation of the Lens Maker's Formula with Optical Ray Diagram].

Writing Persona & Rules:
1. Voice: Seasoned university professor. Rigorous, direct, engaging, and clear.
2. Tone: Zero AI filler. Do not use words like 'delve', 'crucial', 'testament', 'realm', or 'in conclusion'.
3. Structure:
   - Immediate formal definition and physical principles.
   - Clean TikZ optical/geometric ray diagram with clear axis and ray arrows.
   - Complete step-by-step mathematical proof.
   - Section: '⚠️ Common Examination Pitfalls'.
   - Section: '💡 Practical Problem-Solving Heuristics'.
   - 3 worked examples with complete step-by-step solutions.
4. Technical: Use standard amsmath, tikz, fancyhdr. Ensure all environments close properly with \end{document}.
```

### Template B: Pure Mathematical Theorem & Proof Monograph
```text
Write a rigorous mathematical proof document on: [INSERT THEOREM, e.g., The Spectral Theorem for Symmetric Matrices].

Rules:
1. State the Theorem formally in an amsthm definition/theorem block.
2. Provide geometric intuition with an accompanying TikZ coordinate transformation plot.
3. Present the analytical proof with explicit intermediate lemma steps.
4. Highlight the algebraic conditions where the theorem fails (counterexamples).
5. Avoid all conversational filler or generic transitions.
```

---

## 📦 6. Amazon KDP Publishing & Compliance Checklist

### Amazon AI Disclosure Policy (Official Guidance)
* **If you wrote or heavily edited the explanations:** Select **"No"** to AI-generated content. Amazon classifies tools used for formatting, syntax highlighting, or typesetting assistance as **AI-Assisted** (disclosure not required).
* **If generated directly by prompt:** Select **"Yes"** for text generation (*"Text with minimal human review"* or *"with editing"*). Amazon **fully allows** this and pays standard **70% royalties**.

### Print Technical Specifications for KDP
1. **Trim Sizes for Textbooks:**
   - **7" × 10" (Executive / College Size):** Recommended for calculus, physics, and STEM.
   - **8.5" × 11" (Workbook / High School Size):** Best for practice worksheets and large diagrams.
   - **6" × 9" (Standard Trade):** Best for theoretical or conceptual monographs.
2. **Binding Offset (Gutter Margin):**
   - In LaTeX geometry, always add `bindingoffset=0.25in` to `0.375in` so spine binding does not eat your formulas.
3. **Minimum Page Count:**
   - Amazon requires a minimum of **24 pages** for paperbacks.
4. **Vector Font Embedding:**
   - `pdflatex` automatically embeds vector Type 1 fonts, which satisfies KDP's strict pre-flight font embedding checks.
5. **Cover File:**
   - Upload the interior content as one PDF.
   - Upload the book cover as a **separate PDF spread** (Back Cover + Spine + Front Cover) calculated with Amazon's KDP Cover Calculator.

---

## 🛠️ 7. Maintaining & Updating This Guide

You can freely edit and expand this document over time as you publish more volumes:
- Add your own custom book templates.
- Save your favorite TikZ color palettes and styling conventions.
- Record Amazon KDP category notes and ISBN imprint details.
