/**
 * Explanation Engine (Interactive Guided Reader & Narration Engine)
 * Core runtime powering "Explanation Mode" across XtraPath Articles, Books, and Standalone Explanations.
 * 
 * Features:
 * - Block-by-block sequential reading, auto-scrolling, and spotlighting (spotlights active block, dims siblings)
 * - Synchronized Web Speech API voiceover with voice selection, speech rate, and pitch controls
 * - Optional pre-recorded audio track synchronization with timestamp cues ({ start, end })
 * - Granular SVG / Diagram sub-element spotlighting (glow filter, dim siblings, dynamic coordinate labels)
 * - Native KaTeX mathematical & chemical equation rendering with term-by-term breakdown
 * - Click-to-explain on any paragraph, equation, or diagram sub-part
 * - ExplanationEngine.fromDOM(): Turn any existing article or book chapter into an interactive explanation on the fly
 * - Multi-page publication-ready PDF generator via html2canvas & jsPDF
 */

(function (window) {
  'use strict';

  // Helper: clean math and markdown notation into natural spoken text for TTS
  function sanitizeForSpeech(rawText) {
    if (!rawText) return '';
    let t = String(rawText);

    // Strip HTML tags
    t = t.replace(/<[^>]*>/g, ' ');

    // Convert common LaTeX math patterns into spoken English
    t = t.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2');
    t = t.replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1');
    t = t.replace(/\^2\b/g, ' squared');
    t = t.replace(/\^3\b/g, ' cubed');
    t = t.replace(/\^\{([^}]+)\}/g, ' to the power of $1');
    t = t.replace(/_\{([^}]+)\}/g, ' sub $1');
    t = t.replace(/_([a-zA-Z0-9])/g, ' sub $1');
    t = t.replace(/\\theta/g, 'theta');
    t = t.replace(/\\alpha/g, 'alpha');
    t = t.replace(/\\beta/g, 'beta');
    t = t.replace(/\\gamma/g, 'gamma');
    t = t.replace(/\\lambda/g, 'lambda');
    t = t.replace(/\\pi/g, 'pi');
    t = t.replace(/\\Delta/g, 'delta');
    t = t.replace(/\\sin/g, 'sine');
    t = t.replace(/\\cos/g, 'cosine');
    t = t.replace(/\\tan/g, 'tangent');
    t = t.replace(/\\nabla/g, 'del');
    t = t.replace(/\\times/g, ' times ');
    t = t.replace(/\\cdot/g, ' dot ');
    t = t.replace(/\\le|\\leq/g, ' is less than or equal to ');
    t = t.replace(/\\ge|\\geq/g, ' is greater than or equal to ');
    t = t.replace(/\\neq/g, ' is not equal to ');
    t = t.replace(/\\approx/g, ' is approximately ');
    t = t.replace(/\\rightarrow|\\to/g, ' yields ');
    t = t.replace(/\\pm/g, ' plus or minus ');
    t = t.replace(/\\ce\{([^}]+)\}/g, '$1');
    t = t.replace(/\\text\{([^}]+)\}/g, '$1');
    t = t.replace(/[\$\\]/g, ' ');

    // Clean whitespace
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }

  class ExplanationEngine {
    constructor(options = {}) {
      this.container = options.container || document.getElementById('book');
      this.progressBar = options.progressBar || document.querySelector('#bar > div');
      this.onStateChange = options.onStateChange || (() => {});
      this.onProgress = options.onProgress || (() => {});
      this.onBlockFocus = options.onBlockFocus || (() => {});
      
      this.script = [];
      this.blocks = [];
      this.currentIndex = -1;
      this.isPlaying = false;
      this.speechRate = options.speechRate || 1.0;
      this.speechPitch = options.speechPitch || 1.0;
      this.selectedVoice = null;
      this.activeUtterance = null;
      this._cancelPending = false;
      this.isDomMode = false;

      // Audio track synchronization (optional)
      this.audioPlayer = options.audioPlayer || null;

      // Initialize voice options if speech synthesis is available
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          if (typeof options.onVoicesLoaded === 'function') {
            options.onVoicesLoaded(this.getAvailableVoices());
          }
        };
      }
    }

    getAvailableVoices() {
      if (!('speechSynthesis' in window)) return [];
      const voices = window.speechSynthesis.getVoices();
      const english = voices.filter(v => v.lang.startsWith('en'));
      return english.length > 0 ? english : voices;
    }

    setVoice(voiceUri) {
      if (!('speechSynthesis' in window)) return;
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.voiceURI === voiceUri);
      if (match) this.selectedVoice = match;
    }

    setRate(rate) {
      this.speechRate = Math.max(0.5, Math.min(2.5, parseFloat(rate) || 1.0));
    }

    /**
     * Loads a script array and builds interactive DOM blocks.
     * @param {Array<Object>} scriptArray Array of script items.
     */
    loadScript(scriptArray) {
      this.pause();
      this.isDomMode = false;
      this.script = Array.isArray(scriptArray) ? scriptArray : [];
      this.currentIndex = -1;
      this.blocks = [];

      if (!this.container) return;
      this.container.innerHTML = '';

      this.blocks = this.script.map((item, i) => {
        const section = document.createElement('section');
        section.className = 'block';
        section.dataset.index = i;

        // 1. Heading
        if (item.type === 'heading') {
          const level = item.level || 2;
          section.innerHTML = `<h${level} class="block-heading">${item.html || item.text || ''}</h${level}>`;
        } 
        // 2. Equation (KaTeX)
        else if (item.type === 'equation') {
          const latex = item.latex || item.html || '';
          let rendered = latex;
          if (window.katex) {
            try {
              rendered = window.katex.renderToString(latex, { displayMode: true, throwOnError: false });
            } catch (e) {
              rendered = `<span class="equation-fallback">${latex}</span>`;
            }
          }
          section.innerHTML = `<div class="block-equation">${rendered}</div>`;
        } 
        // 3. Figure / SVG Diagram
        else if (item.type === 'figure') {
          const svgContent = item.svg || '';
          const caption = item.caption ? `<div class="block-caption">${item.caption}</div>` : '';
          section.innerHTML = `
            <div class="block-figure">
              <div class="svg-wrapper">${svgContent}</div>
              ${caption}
            </div>
          `;
          
          // Allow clicking specific SVG parts to spotlight & explain them
          if (Array.isArray(item.parts)) {
            setTimeout(() => {
              item.parts.forEach(part => {
                const svgPartEl = section.querySelector('#' + part.target);
                if (svgPartEl) {
                  svgPartEl.style.cursor = 'pointer';
                  svgPartEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.jumpToPart(i, part);
                  });
                }
              });
            }, 50);
          }
        } 
        // 4. Code Block
        else if (item.type === 'code') {
          const codeText = item.code || item.html || item.text || '';
          const lang = item.language || 'Code';
          section.innerHTML = `
            <div class="block-code-wrapper">
              <div class="block-code-header"><span>${lang}</span></div>
              <pre class="block-code"><code>${codeText}</code></pre>
            </div>
          `;
        }
        // 5. Callout / Note
        else if (item.type === 'callout') {
          section.innerHTML = `
            <div class="block-callout">
              <i class="ri-lightbulb-line callout-icon"></i>
              <div class="callout-content">${item.html || item.text || ''}</div>
            </div>
          `;
        }
        // 6. Standard Text
        else {
          section.innerHTML = `<p class="block-text">${item.html || item.text || ''}</p>`;
        }

        // Clicking any block jumps to and starts explaining that block
        section.addEventListener('click', () => {
          this.jumpToBlock(i);
        });

        this.container.appendChild(section);
        return section;
      });

      // Render any inline math in text/callout blocks
      if (window.renderMathInElement && this.container) {
        try {
          window.renderMathInElement(this.container, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\[', right: '\\]', display: true },
              { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false
          });
        } catch (e) {}
      }

      this.setFocus(-1);
    }

    /**
     * Initializes Explanation Mode directly from an existing DOM node (e.g. articleViewBody).
     * Non-destructively wraps existing elements as spotlight blocks and synthesizes narration.
     * @param {HTMLElement} domContainer Existing article or chapter container
     * @param {Object} options Configuration options
     */
    static fromDOM(domContainer, options = {}) {
      const engine = new ExplanationEngine({
        container: domContainer,
        ...options
      });
      engine.loadFromDOM(domContainer);
      return engine;
    }

    /**
     * Scans an existing DOM element and turns its children into interactive explanation blocks.
     */
    loadFromDOM(domContainer) {
      this.pause();
      this.isDomMode = true;
      this.container = domContainer;
      this.script = [];
      this.blocks = [];
      this.currentIndex = -1;

      if (!domContainer) return;

      // Select meaningful content blocks: headings, paragraphs, blockquotes, katex, mermaid, and figures
      const candidateElements = domContainer.querySelectorAll(
        'h1, h2, h3, h4, p, blockquote, .katex-container, .mermaid-container, .embedded-post, figure, table'
      );

      const scriptItems = [];
      const validBlocks = [];

      candidateElements.forEach((el, index) => {
        // Skip empty paragraphs or hidden elements
        if (el.textContent.trim() === '' && !el.querySelector('svg, canvas, img')) {
          return;
        }

        el.classList.add('block');
        el.dataset.explanationIndex = validBlocks.length;

        // Determine spoken narration: either explicit data-say attribute or sanitized text
        let spokenText = el.getAttribute('data-say') || '';
        if (!spokenText) {
          spokenText = sanitizeForSpeech(el.textContent);
        }

        // Detect type
        let blockType = 'text';
        const tag = el.tagName.toLowerCase();
        if (['h1', 'h2', 'h3', 'h4'].includes(tag)) blockType = 'heading';
        else if (el.classList.contains('katex-container')) blockType = 'equation';
        else if (el.classList.contains('mermaid-container') || tag === 'figure') blockType = 'figure';
        else if (tag === 'blockquote') blockType = 'callout';

        const scriptItem = {
          type: blockType,
          say: spokenText,
          html: el.innerHTML,
          el: el
        };

        // If block has SVG with sub-elements that have IDs, make them clickable
        const svg = el.querySelector('svg');
        if (svg) {
          const parts = svg.querySelectorAll('[id]');
          if (parts.length > 0) {
            scriptItem.parts = [];
            parts.forEach(partEl => {
              const partId = partEl.id;
              if (partId && !partId.startsWith('mermaid')) {
                partEl.style.cursor = 'pointer';
                const partSay = partEl.getAttribute('data-say') || `Here is ${partId.replace(/_/g, ' ')}`;
                const partObj = { target: partId, say: partSay };
                scriptItem.parts.push(partObj);

                partEl.addEventListener('click', (e) => {
                  e.stopPropagation();
                  this.jumpToPart(validBlocks.length, partObj);
                });
              }
            });
          }
        }

        const blockIdx = validBlocks.length;
        el.addEventListener('click', (e) => {
          if (e.target.closest('[id]') && e.target.closest('svg')) return; // handled by part click
          this.jumpToBlock(blockIdx);
        });

        scriptItems.push(scriptItem);
        validBlocks.push(el);
      });

      this.script = scriptItems;
      this.blocks = validBlocks;
      this.setFocus(-1);
    }

    setFocus(index) {
      this.blocks.forEach((b, i) => {
        b.classList.toggle('focus', i === index);
        b.classList.toggle('done', i < index);
      });

      if (index >= 0 && index < this.blocks.length) {
        this.blocks[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        const pct = ((index + 1) / this.blocks.length) * 100;
        if (this.progressBar) this.progressBar.style.width = pct + '%';
        this.onProgress(index, this.blocks.length, pct);
        this.onBlockFocus(index, this.script[index]);
      } else {
        if (this.progressBar) this.progressBar.style.width = '0%';
        this.onProgress(-1, this.blocks.length, 0);
      }
    }

    speak(text) {
      return new Promise((resolve) => {
        if (!text || !('speechSynthesis' in window)) {
          const ms = Math.max(1200, ((text || '').split(' ').length / 3) * 1000);
          setTimeout(resolve, ms);
          return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = this.speechRate;
        utterance.pitch = this.speechPitch;
        if (this.selectedVoice) utterance.voice = this.selectedVoice;

        let resolved = false;
        const done = () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        utterance.onend = done;
        utterance.onerror = done;
        this.activeUtterance = utterance;

        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          done();
        }

        // Safety fallback guard
        const wordCount = (text || '').split(' ').length;
        const guardMs = Math.max(3500, (wordCount / (2.0 * this.speechRate)) * 1000 + 1500);
        setTimeout(() => {
          if (this.isPlaying) done();
        }, guardMs);
      });
    }

    spotlightPart(blockEl, targetId, labelId) {
      if (!blockEl) return;
      const parts = blockEl.querySelectorAll('.part, [id]');
      parts.forEach(p => {
        const isTarget = p.id === targetId;
        p.classList.toggle('part-glow', isTarget);
        p.classList.toggle('part-dim', !isTarget);
      });

      if (labelId) {
        blockEl.querySelectorAll('.partlabel, #' + labelId).forEach(l => {
          l.classList.add('show');
        });
      }
    }

    clearParts(blockEl) {
      if (!blockEl) return;
      blockEl.querySelectorAll('.part, [id]').forEach(p => {
        p.classList.remove('part-glow', 'part-dim');
      });
      blockEl.querySelectorAll('.partlabel').forEach(l => {
        l.classList.remove('show');
      });
    }

    async run(fromIndex = 0) {
      if (this.blocks.length === 0) return;
      this.isPlaying = true;
      this._cancelPending = false;
      this.onStateChange('playing');

      for (let i = fromIndex; i < this.blocks.length; i++) {
        if (!this.isPlaying || this._cancelPending) break;
        this.currentIndex = i;
        this.setFocus(i);

        const item = this.script[i];
        if (item.say) {
          await this.speak(item.say);
        }

        if (!this.isPlaying || this._cancelPending) break;

        // Spotlight individual sub-parts if present
        if (Array.isArray(item.parts) && item.parts.length > 0) {
          for (const part of item.parts) {
            if (!this.isPlaying || this._cancelPending) {
              this.clearParts(this.blocks[i]);
              break;
            }
            this.spotlightPart(this.blocks[i], part.target, part.label);
            if (part.say) {
              await this.speak(part.say);
            }
          }
          this.clearParts(this.blocks[i]);
        }

        if (!this.isPlaying || this._cancelPending) break;
        await new Promise(r => setTimeout(r, 400));
      }

      if (!this._cancelPending && this.currentIndex >= this.blocks.length - 1) {
        this.isPlaying = false;
        this.blocks.forEach(b => b.classList.add('done'));
        this.onStateChange('finished');
      } else {
        this.onStateChange(this.isPlaying ? 'playing' : 'paused');
      }
    }

    pause() {
      this.isPlaying = false;
      this._cancelPending = true;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.onStateChange('paused');
    }

    restart() {
      this.pause();
      this.currentIndex = -1;
      this.setFocus(-1);
      this.blocks.forEach(b => {
        b.classList.remove('done', 'focus');
        this.clearParts(b);
      });
      this.onStateChange('idle');
    }

    next() {
      if (this.currentIndex < this.blocks.length - 1) {
        this.jumpToBlock(this.currentIndex + 1);
      }
    }

    prev() {
      if (this.currentIndex > 0) {
        this.jumpToBlock(this.currentIndex - 1);
      }
    }

    jumpToBlock(index) {
      if (index < 0 || index >= this.blocks.length) return;
      this.pause();
      this.currentIndex = index;
      this.run(index);
    }

    async jumpToPart(blockIndex, partObj) {
      this.pause();
      this.currentIndex = blockIndex;
      this.setFocus(blockIndex);
      this.spotlightPart(this.blocks[blockIndex], partObj.target, partObj.label);
      this.isPlaying = true;
      this.onStateChange('playing');
      if (partObj.say) {
        await this.speak(partObj.say);
      }
      this.clearParts(this.blocks[blockIndex]);
      this.pause();
    }

    /**
     * Clean multi-page A4 PDF Export via html2canvas and jsPDF.
     */
    async exportPDF(filename = 'interactive-article.pdf') {
      if (!window.html2canvas || !(window.jspdf && window.jspdf.jsPDF)) {
        throw new Error('PDF generation libraries (html2canvas or jsPDF) are not loaded.');
      }

      this.pause();

      // Temporarily reveal all blocks with 100% opacity for capture
      const originalOpacities = [];
      this.blocks.forEach((b, i) => {
        originalOpacities[i] = b.style.opacity;
        b.style.opacity = '1';
        this.clearParts(b);
      });

      try {
        const canvas = await window.html2canvas(this.container, {
          scale: 2,
          backgroundColor: '#0a0d14',
          useCORS: true,
          logging: false
        });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * imgW) / canvas.width;

        let heightLeft = imgH;
        let position = 0;
        const imgData = canvas.toDataURL('image/png');

        doc.addImage(imgData, 'PNG', 0, position, imgW, imgH);
        heightLeft -= pageH;

        while (heightLeft > 0) {
          position = heightLeft - imgH;
          doc.addPage();
          doc.addImage(imgData, 'PNG', 0, position, imgW, imgH);
          heightLeft -= pageH;
        }

        doc.save(filename);
      } finally {
        // Restore styles
        this.blocks.forEach((b, i) => {
          b.style.opacity = originalOpacities[i] || '';
        });
        this.setFocus(this.currentIndex);
      }
    }
  }

  // Pre-configured scientific demonstration templates
  ExplanationEngine.TEMPLATES = {
    // 1. Physics: Projectile Motion (from booTest.rtf)
    projectile: [
      {
        type: 'heading',
        level: 1,
        html: 'Projectile Motion & Trajectory Dynamics',
        say: 'Welcome to this interactive explanation on Projectile Motion and Trajectory Dynamics.'
      },
      {
        type: 'text',
        html: 'When an object is launched into the air, its motion is governed entirely by its initial velocity and the downward acceleration due to gravity.',
        say: 'When an object is launched into the air, its motion is governed entirely by its initial velocity and the downward acceleration due to gravity.'
      },
      {
        type: 'equation',
        latex: 'R = \\frac{u^2 \\sin(2\\theta)}{g}',
        say: 'This is the classical range equation: R equals u squared times the sine of two theta, divided by g.'
      },
      {
        type: 'figure',
        svg: `<svg viewBox="0 0 400 240" width="100%" height="240" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#3b82f6"/>
            </marker>
          </defs>
          <line x1="20" y1="200" x2="380" y2="200" stroke="#374151" stroke-width="2"/>
          <path id="p_traj" class="part" d="M30,200 Q200,-20 370,200" stroke="#10b981" fill="none" stroke-width="3" stroke-dasharray="6,4"/>
          <path id="p_theta" class="part" d="M70,200 A40,40 0 0 0 58,165" stroke="#f59e0b" fill="none" stroke-width="3"/>
          <text id="lbl_theta" class="partlabel" x="78" y="180">θ = 45°</text>
          <line id="p_vel" class="part" x1="30" y1="200" x2="115" y2="115" stroke="#3b82f6" stroke-width="3.5" marker-end="url(#arrow)"/>
          <text id="lbl_vel" class="partlabel" x="120" y="110">Initial Velocity u</text>
          <circle id="p_dot" class="part" cx="30" cy="200" r="7" fill="#ef4444"/>
          <text id="lbl_dot" class="partlabel" x="25" y="225">Launch Origin (0,0)</text>
        </svg>`,
        caption: 'Figure 1: Ballistic trajectory with initial velocity vector u, angle θ, and launch origin.',
        say: 'Take a look at the trajectory diagram. Let us break down each part step by step.',
        parts: [
          {
            target: 'p_dot',
            label: 'lbl_dot',
            say: 'This red point marks the launch origin, where time t equals zero.'
          },
          {
            target: 'p_vel',
            label: 'lbl_vel',
            say: 'The blue vector shows the launch velocity u, dictating both initial speed and elevation.'
          },
          {
            target: 'p_theta',
            label: 'lbl_theta',
            say: 'The orange arc is the launch angle theta. In vacuum, forty-five degrees gives maximum range.'
          },
          {
            target: 'p_traj',
            label: null,
            say: 'Finally, this green dashed parabolic curve traces the flight path of the projectile.'
          }
        ]
      },
      {
        type: 'callout',
        html: '<strong>Key Takeaway:</strong> Horizontal velocity remains constant ($u_x = u \\cos\\theta$), while vertical velocity continuously changes under gravitational acceleration ($u_y = u \\sin\\theta - gt$).',
        say: 'Key takeaway: The horizontal speed stays constant, while vertical speed changes continuously under gravity.'
      }
    ],

    // 2. Physics: Maxwell's Equations & Faraday Induction
    maxwell: [
      {
        type: 'heading',
        level: 1,
        html: "Maxwell's Equations & Electromagnetic Induction",
        say: "Welcome to this interactive walkthrough of Maxwell's Equations and Electromagnetic Induction."
      },
      {
        type: 'text',
        html: 'Faraday’s Law of Induction demonstrates that a time-varying magnetic field induces a spatially circulating electric field, forming the foundation for electric generators and light waves.',
        say: 'Faraday’s Law of Induction reveals that a changing magnetic flux produces a circulating electric field.'
      },
      {
        type: 'equation',
        latex: '\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}',
        say: 'Here is the differential form of Faraday’s Law: the curl of E equals the negative partial derivative of B with respect to time.'
      },
      {
        type: 'figure',
        svg: `<svg viewBox="0 0 420 220" width="100%" height="220" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrow-em" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#06b6d4"/>
            </marker>
          </defs>
          <!-- Magnetic field B vector -->
          <g id="p_bfield" class="part">
            <line x1="210" y1="180" x2="210" y2="40" stroke="#ef4444" stroke-width="4" marker-end="url(#arrow)"/>
            <text x="220" y="55" fill="#ef4444" font-weight="bold" font-size="16">dB/dt ↑</text>
          </g>
          <!-- Circulating electric field E loop -->
          <g id="p_eloop" class="part">
            <ellipse cx="210" cy="120" rx="130" ry="45" fill="none" stroke="#06b6d4" stroke-width="3" stroke-dasharray="8,4"/>
            <path d="M 80,120 A 130,45 0 0 0 340,120" fill="none" stroke="#06b6d4" stroke-width="3.5" marker-end="url(#arrow-em)"/>
          </g>
          <!-- Labels -->
          <text id="lbl_bfield" class="partlabel" x="140" y="25">Varying Magnetic Flux</text>
          <text id="lbl_eloop" class="partlabel" x="70" y="195">Circulating Induced Electric Field ∇×E</text>
        </svg>`,
        caption: 'Figure 2: A changing magnetic field through an area induces a circulating electric field.',
        say: 'Examine how the fields couple together.',
        parts: [
          {
            target: 'p_bfield',
            label: 'lbl_bfield',
            say: 'This upward red vector represents a changing magnetic flux through space.'
          },
          {
            target: 'p_eloop',
            label: 'lbl_eloop',
            say: 'In response, this blue circular contour is the induced electric field circulation that opposes the flux change, consistent with Lenz’s Law.'
          }
        ]
      },
      {
        type: 'callout',
        html: '<strong>Wave Propagation:</strong> In empty space, the symmetrical coupling between $\\nabla \\times \\mathbf{E}$ and $\\nabla \\times \\mathbf{B}$ predicts electromagnetic waves traveling at speed $c = 1/\\sqrt{\\mu_0 \\varepsilon_0}$.',
        say: 'In empty space, this mutual field generation gives rise to electromagnetic waves traveling at the speed of light.'
      }
    ],

    // 3. AI / Mathematics: Neural Network Backpropagation
    neuralnet: [
      {
        type: 'heading',
        level: 1,
        html: 'Backpropagation & Gradient Descent in Deep Networks',
        say: 'Let us explore the mathematics of Backpropagation and Gradient Descent in Deep Neural Networks.'
      },
      {
        type: 'text',
        html: 'To train a neural network, we calculate how the loss function changes with respect to each internal weight using the chain rule of calculus.',
        say: 'Backpropagation uses the chain rule of calculus to compute loss gradients with respect to every weight in the network.'
      },
      {
        type: 'equation',
        latex: '\\frac{\\partial \\mathcal{L}}{\\partial w_{ij}} = \\frac{\\partial \\mathcal{L}}{\\partial a_j} \\cdot \\sigma\'(z_j) \\cdot a_i',
        say: 'Here is the weight gradient: the derivative of loss with respect to weight w sub ij equals the downstream error times the activation derivative, times input a sub i.'
      },
      {
        type: 'figure',
        svg: `<svg viewBox="0 0 420 180" width="100%" height="180" xmlns="http://www.w3.org/2000/svg">
          <!-- Input Node -->
          <circle id="p_input_node" class="part" cx="60" cy="90" r="22" fill="#1f2937" stroke="#3b82f6" stroke-width="3"/>
          <text x="54" y="96" fill="#3b82f6" font-weight="bold" font-size="16">aᵢ</text>
          <!-- Weight Synapse -->
          <line id="p_synapse" class="part" x1="82" y1="90" x2="200" y2="90" stroke="#f59e0b" stroke-width="4"/>
          <text id="lbl_weight" class="partlabel" x="120" y="75">Weight wᵢⱼ</text>
          <!-- Hidden Node -->
          <circle id="p_hidden_node" class="part" cx="225" cy="90" r="24" fill="#1f2937" stroke="#10b981" stroke-width="3"/>
          <text x="219" y="96" fill="#10b981" font-weight="bold" font-size="16">zⱼ</text>
          <!-- Loss Flow Backwards -->
          <path id="p_gradient_flow" class="part" d="M 330,120 L 260,120" stroke="#ef4444" stroke-width="3" stroke-dasharray="6,3"/>
          <text id="lbl_grad" class="partlabel" x="270" y="145">← ∂L/∂aⱼ (Error Signal)</text>
          <!-- Output Node -->
          <circle cx="360" cy="90" r="22" fill="#1f2937" stroke="#ec4899" stroke-width="3"/>
          <text x="350" y="96" fill="#ec4899" font-weight="bold" font-size="14">Loss</text>
          <line x1="250" y1="90" x2="338" y2="90" stroke="#6b7280" stroke-width="2"/>
        </svg>`,
        caption: 'Figure 3: Reverse sensitivity gradient flow propagating backwards from output loss to input synapse.',
        say: 'Observe the backward propagation of error gradients through the synapse.',
        parts: [
          {
            target: 'p_gradient_flow',
            label: 'lbl_grad',
            say: 'The error gradient flows backwards from the objective loss towards the hidden node.'
          },
          {
            target: 'p_synapse',
            label: 'lbl_weight',
            say: 'At this synapse weight w sub ij, the gradient directly updates the parameter by subtracting learning rate times the derivative.'
          },
          {
            target: 'p_input_node',
            label: null,
            say: 'The upstream node a sub i provides the activation scale factor for the gradient calculation.'
          }
        ]
      },
      {
        type: 'callout',
        html: '<strong>Parameter Update Rule:</strong> The gradient descent optimizer adjusts parameters using $w_{ij}^{(t+1)} = w_{ij}^{(t)} - \\eta \\frac{\\partial \\mathcal{L}}{\\partial w_{ij}}$, where $\\eta$ is the learning rate.',
        say: 'Each weight is updated by stepping in the negative gradient direction scaled by the learning rate.'
      }
    ],

    // 4. Chemistry: Fischer Esterification Reaction Mechanism
    chemistry: [
      {
        type: 'heading',
        level: 1,
        html: 'Fischer Esterification Mechanism',
        say: 'Let us examine the Fischer Esterification mechanism, synthesizing an ester from a carboxylic acid and an alcohol.'
      },
      {
        type: 'text',
        html: 'In the presence of an acid catalyst, acetic acid reacts reversibly with ethanol to form ethyl acetate and water.',
        say: 'In the presence of an acid catalyst, acetic acid reacts reversibly with ethanol to produce ethyl acetate and water.'
      },
      {
        type: 'equation',
        latex: '\\ce{CH3COOH + CH3CH2OH <=>[\\text{H}_2\\text{SO}_4][\\Delta] CH3COOCH2CH3 + H2O}',
        say: 'Here is the balanced chemical equation with sulfuric acid as the dehydrating catalyst.'
      },
      {
        type: 'figure',
        svg: `<svg viewBox="0 0 420 200" width="100%" height="200" xmlns="http://www.w3.org/2000/svg">
          <g id="p_acid" class="part">
            <text x="30" y="90" fill="#e5e7eb" font-family="monospace" font-size="16">CH₃—</text>
            <circle id="p_carbonyl_c" class="part" cx="80" cy="85" r="14" fill="rgba(59,130,246,0.2)" stroke="#3b82f6" stroke-width="2"/>
            <text x="75" y="90" fill="#3b82f6" font-family="monospace" font-size="16" font-weight="bold">C</text>
            <line x1="80" y1="71" x2="80" y2="40" stroke="#ef4444" stroke-width="2.5"/>
            <line x1="84" y1="71" x2="84" y2="40" stroke="#ef4444" stroke-width="2.5"/>
            <text x="76" y="32" fill="#ef4444" font-family="monospace" font-size="16">O</text>
            <line x1="94" y1="85" x2="120" y2="85" stroke="#e5e7eb" stroke-width="2"/>
            <text id="p_leaving_group" class="part" x="125" y="90" fill="#f59e0b" font-family="monospace" font-size="16" font-weight="bold">OH</text>
          </g>
          <text x="170" y="90" fill="#9ca3af" font-size="22">+</text>
          <g id="p_alcohol" class="part">
            <text id="p_nucleophile" class="part" x="200" y="90" fill="#10b981" font-family="monospace" font-size="16" font-weight="bold">H—O</text>
            <text x="245" y="90" fill="#e5e7eb" font-family="monospace" font-size="16">—CH₂CH₃</text>
          </g>
          <path d="M 310,85 L 340,85" stroke="#8b5cf6" stroke-width="2" marker-end="url(#arrow)"/>
          <text x="315" y="75" fill="#8b5cf6" font-size="11">H⁺, Δ</text>
          <text id="lbl_carb" class="partlabel" x="40" y="130">Electrophilic Carbon</text>
          <text id="lbl_nuc" class="partlabel" x="180" y="130">Nucleophilic Oxygen</text>
          <text id="lbl_lg" class="partlabel" x="100" y="155">Leaves as H₂O</text>
        </svg>`,
        caption: 'Figure 4: Nucleophilic attack of ethanol on the protonated carbonyl carbon.',
        say: 'Notice the reactive centers in this esterification step.',
        parts: [
          {
            target: 'p_carbonyl_c',
            label: 'lbl_carb',
            say: 'Protonation makes this carbonyl carbon strongly electrophilic, ready for nucleophilic attack.'
          },
          {
            target: 'p_nucleophile',
            label: 'lbl_nuc',
            say: 'The lone pairs on ethanol oxygen attack the electrophilic carbon to form a tetrahedral intermediate.'
          },
          {
            target: 'p_leaving_group',
            label: 'lbl_lg',
            say: 'Following proton transfer, this hydroxyl group departs as a neutral water molecule.'
          }
        ]
      },
      {
        type: 'text',
        html: 'Because this reaction is an equilibrium, excess alcohol or continuous water removal drives high yields via Le Chatelier’s principle.',
        say: 'Because this reaction is an equilibrium, removing water or using excess alcohol drives high yields.'
      }
    ]
  };

  // Expose to window
  window.ExplanationEngine = ExplanationEngine;

})(window);
