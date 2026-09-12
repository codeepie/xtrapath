// /Users/yogendrasingh/Documents/XtraAnim/src/viewmodel/sound_handler.js

/**
 * Sound Studio Engine Handler (sound_handler.js)
 * -------------------------------------------------------------
 * Powers the interactive Sound & Audio Studio inside XtraAnim:
 * - Real-time Web Audio API synthesizer & sound generator (Sound.* API)
 * - Guaranteed audio playback with pending trigger queues across browser autoplay policies
 * - Live Sound Waves Visualizer (Oscilloscope Waveform, FFT Spectrum Bars, Radial Pulse)
 * - Harmonics & Fourier acoustics analysis
 * - Melodic synth arpeggiator, chord generator & procedural drum sequencer
 * - Procedural sound FX / foley generator (whooshes, punches, bass drops, lasers)
 * - Zero external CDN dependencies - 100% self-contained in-browser Web Audio
 */

window.soundStudioTemplates = {
    metal_collision: `// ⚔️ Sound Studio: Procedural Metal Collision & Acoustic Physics
// Synthesize realistic metal collisions: sword clashes, steel impacts & inharmonic ringing

Sound.setVisualMode('oscilloscope');
Sound.setVolume(0.85);

// 1. Initial sword clash with sharp transient & resonant steel ringing
Sound.playMetalCollision({ type: 'sword_clash', resonance: 1.4 });

// 2. Continuous dynamic metal collision duel (alternating blade clash and heavy iron anvil)
let strike = 0;
setInterval(() => {
  strike++;
  if (strike % 3 === 0) {
    // Heavy iron anvil strike / steel bar drop
    Sound.playMetalCollision({ type: 'heavy_metal', pitch: 0.8, resonance: 1.8 });
  } else {
    // High-speed steel blade clash with natural pitch variance
    const pitch = 0.92 + Math.random() * 0.25;
    Sound.playMetalCollision({ type: 'sword_clash', pitch: pitch, resonance: 1.3 });
  }
}, 1800);
`,

    harmonic_wave: `// 🌊 Sound Studio: Acoustics & Wave Superposition
// Visualize fundamental frequency and Fourier harmonic sound waves in real time

Sound.setVisualMode('oscilloscope');
Sound.setVolume(0.75);

// Play fundamental 440 Hz (Concert Pitch A4) + harmonics with continuous sustain
// Demonstrates y(t) = sin(wt) + 0.5*sin(2wt) + 0.33*sin(3wt) + 0.2*sin(4wt)
Sound.playHarmonics(440, [1.0, 0.5, 0.33, 0.2], { loop: true });
`,

    electronic_melody: `// 🎹 Sound Studio: Melodic Synth & Arpeggiator
// Program polyphonic chords, note sequences & tempo

Sound.setVisualMode('spectrum');
Sound.setVolume(0.7);

// Dreamy Synth Arpeggiator (Am9 -> Fmaj7 -> Cmaj -> G)
Sound.playSequence([
  { note: 'A3', dur: 0.25 }, { note: 'C4', dur: 0.25 }, { note: 'E4', dur: 0.25 }, { note: 'B4', dur: 0.5 },
  { note: 'F3', dur: 0.25 }, { note: 'A3', dur: 0.25 }, { note: 'C4', dur: 0.25 }, { note: 'E4', dur: 0.5 },
  { note: 'C3', dur: 0.25 }, { note: 'E3', dur: 0.25 }, { note: 'G3', dur: 0.25 }, { note: 'D4', dur: 0.5 },
  { note: 'G3', dur: 0.25 }, { note: 'B3', dur: 0.25 }, { note: 'D4', dur: 0.25 }, { note: 'F#4', dur: 0.5 }
], { loop: true, bpm: 120 });
`,

    beat_box: `// 🥁 Sound Studio: Procedural Rhythm & Drum Sequencer
// Synthesize kick, snare & hi-hat without external audio samples

Sound.setVisualMode('spectrum');
Sound.setVolume(0.8);

// 16-step procedural drum pattern looping continuously
Sound.playBeat('kick - hat - snare - hat - kick kick hat - snare - hat hat', { bpm: 124, loop: true });
`,

    combat_foley: `// 💥 Sound Studio: Procedural Foley & Sound FX
// Synthesize physics impacts, whooshes, punches, and sci-fi sounds

Sound.setVisualMode('oscilloscope');
Sound.setVolume(0.85);

// Loop martial arts combo sequence
function playCombo() {
  Sound.playFX('whoosh');
  setTimeout(() => Sound.playFX('punch'), 220);
  setTimeout(() => Sound.playFX('bassdrop'), 520);
}
playCombo();
setInterval(playCombo, 2200);
`
};

/**
 * Renders the Sound Studio engine inside an iframe.
 * @param {string} userCode The sound.js code written by user in the Studio editor.
 * @param {object} options Configuration options from XtraAnim Studio.
 * @returns {string} The full HTML document source for the player iframe.
 */
window.renderSoundStudio = function (userCode, options = {}) {
    const rawCode = (userCode || window.soundStudioTemplates.metal_collision || window.soundStudioTemplates.harmonic_wave).trim();
    const safeUserCode = rawCode.replace(/<\/script>/gi, '<\\/script>');
    const isFeed = options.isFeed === true;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sound Studio (Audio Waves & Synthesizer)</title>
    <link href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            user-select: none;
        }
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #060913;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        #sound-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: radial-gradient(circle at 50% 30%, #0d1527 0%, #050811 100%);
        }
        /* Top HUD Bar */
        .sound-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(to bottom, rgba(6, 9, 19, 0.9) 0%, transparent 100%);
            backdrop-filter: blur(8px);
            z-index: 10;
        }
        .brand-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            font-weight: 700;
            color: #38bdf8;
            letter-spacing: 0.5px;
        }
        .brand-title i {
            font-size: 1.2rem;
            color: #06b6d4;
        }
        .badge-live {
            background: rgba(6, 182, 212, 0.15);
            border: 1px solid rgba(6, 182, 212, 0.4);
            color: #67e8f9;
            font-size: 0.65rem;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        /* Canvas Area - Pure 100% Edge-to-Edge Sound Waves */
        #canvas-wrapper {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            cursor: pointer;
        }
        canvas#soundCanvas {
            width: 100%;
            height: 100%;
            display: block;
        }
        /* Unobtrusive Overlay if audio context is suspended */
        #play-start-overlay {
            position: absolute;
            inset: 0;
            background: rgba(5, 8, 17, 0.72);
            backdrop-filter: blur(6px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            z-index: 20;
            cursor: pointer;
            transition: opacity 0.25s ease, visibility 0.25s ease;
        }
        .big-play-btn {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: linear-gradient(135deg, #06b6d4, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 2.2rem;
            box-shadow: 0 0 35px rgba(6, 182, 212, 0.7);
            animation: pulsePlayBtn 1.8s infinite ease-in-out;
        }
        @keyframes pulsePlayBtn {
            0%, 100% { transform: scale(1); box-shadow: 0 0 25px rgba(6, 182, 212, 0.5); }
            50% { transform: scale(1.08); box-shadow: 0 0 45px rgba(6, 182, 212, 0.85); }
        }
        .overlay-label {
            font-size: 0.95rem;
            font-weight: 700;
            color: #f8fafc;
            letter-spacing: 0.4px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(6, 182, 212, 0.4);
            padding: 8px 18px;
            border-radius: 20px;
        }
    </style>
</head>
<body>
    <div id="sound-container">
        <!-- Minimal Sound Badge (Watermark) -->
        <div style="position: absolute; top: 12px; left: 14px; display: flex; align-items: center; gap: 8px; font-size: 0.82rem; font-weight: 700; color: #38bdf8; z-index: 10; pointer-events: none; opacity: 0.85;">
            <i class="ri-pulse-line" style="font-size: 1.1rem; color: #06b6d4;"></i>
            <span>Sound Waves</span>
            <span id="hud-status" class="badge-live">Live</span>
        </div>

        <!-- Pure Edge-to-Edge Sound Waves Canvas -->
        <div id="canvas-wrapper" title="Click anywhere to Play Sound & Waves">
            <canvas id="soundCanvas"></canvas>
            <!-- Overlay to satisfy browser autoplay security policy -->
            <div id="play-start-overlay" style="display: ${isFeed ? 'none' : 'flex'};">
                <div class="big-play-btn">
                    <i class="ri-play-fill" style="margin-left: 4px;"></i>
                </div>
                <div class="overlay-label">🔊 Click Anywhere to Play Sound</div>
            </div>
        </div>
    </div>

    <script>
        const isFeedMode = ${isFeed ? 'true' : 'false'};

        // ==========================================
        // 1. ROBUST WEB AUDIO API ENGINE (Sound.* API)
        // ==========================================
        const NOTE_MAP = {
            'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
            'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
            'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
            'C6': 1046.50
        };

        function noteToFreq(val) {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                const clean = val.trim().toUpperCase();
                if (NOTE_MAP[clean]) return NOTE_MAP[clean];
                const parsed = parseFloat(val);
                if (!isNaN(parsed)) return parsed;
            }
            return 440.0;
        }

        class SoundEngine {
            constructor() {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioCtx();
                
                // Master Gain
                this.masterGain = this.ctx.createGain();
                this.volume = 0.75;
                this.isFeedMode = isFeedMode;
                this.isMuted = isFeedMode;
                this.isPaused = isFeedMode;

                if (isFeedMode) {
                    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
                    try { this.ctx.suspend(); } catch(_) {}
                } else {
                    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
                }

                // Master Analyser Node for Real-time Sound Waves
                this.analyser = this.ctx.createAnalyser();
                this.analyser.fftSize = 2048;
                this.analyser.smoothingTimeConstant = 0.82;

                // Chain: Audio Nodes -> masterGain -> analyser -> destination
                this.masterGain.connect(this.analyser);
                this.analyser.connect(this.ctx.destination);

                this.visualMode = 'oscilloscope'; // 'oscilloscope', 'spectrum', 'radial'
                this.activeNodes = [];
                this.activeTimers = [];
                this.pendingActions = [];
                this.currentBpm = 120;
                this.userCodeFn = null;
                this.hasRun = false;

                // Check initial audio state
                this.checkAudioState();
            }

            checkAudioState() {
                const overlay = document.getElementById('play-start-overlay');
                const hudStatus = document.getElementById('hud-status');
                if (this.isFeedMode) {
                    if (overlay) overlay.style.display = 'none';
                    if (hudStatus) {
                        hudStatus.textContent = (this.isPaused || this.isMuted) ? 'Paused' : 'Live';
                        hudStatus.style.color = (this.isPaused || this.isMuted) ? '#f59e0b' : '#06b6d4';
                    }
                    return;
                }
                if (this.ctx && this.ctx.state === 'running') {
                    if (overlay) overlay.style.display = 'none';
                    if (hudStatus) { hudStatus.textContent = 'Playing'; hudStatus.style.color = '#4ade80'; }
                } else {
                    if (overlay) overlay.style.display = 'flex';
                    if (hudStatus) { hudStatus.textContent = 'Paused (Click to Start)'; hudStatus.style.color = '#f59e0b'; }
                }
            }

            mute() {
                this.isMuted = true;
                if (this.masterGain && this.ctx) {
                    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
                }
                this.checkAudioState();
            }

            unmute() {
                this.isMuted = false;
                if (this.masterGain && this.ctx) {
                    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
                }
                this.checkAudioState();
            }

            pause() {
                this.isPaused = true;
                this.mute();
                if (this.ctx && this.ctx.state === 'running') {
                    try { this.ctx.suspend(); } catch(_) {}
                }
                this.checkAudioState();
            }

            resume() {
                this.isPaused = false;
                this.unmute();
                if (this.ctx && this.ctx.state !== 'running') {
                    try { this.ctx.resume(); } catch(_) {}
                }
                this.resumeContext();
                this.checkAudioState();
            }

            async resumeContext() {
                if (this.ctx && this.ctx.state !== 'running') {
                    try {
                        await this.ctx.resume();
                    } catch (e) {
                        console.warn("AudioContext resume attempt:", e);
                    }
                }
                this.checkAudioState();

                // CRITICAL FIX: Only flush pending actions if AudioContext is ACTUALLY running!
                if (this.ctx && this.ctx.state === 'running') {
                    if (this.pendingActions.length > 0) {
                        const actions = [...this.pendingActions];
                        this.pendingActions = [];
                        actions.forEach(fn => {
                            try { fn(); } catch(err) { console.error("Sound action error:", err); }
                        });
                    } else if (this.activeNodes.length === 0 && this.activeTimers.length === 0 && typeof this.userCodeFn === 'function') {
                        // If no audio is currently playing, run user's sound code now!
                        this.userCodeFn();
                    }
                }
            }

            deferUntilRunning(action) {
                if (this.ctx && this.ctx.state === 'running') {
                    action();
                } else {
                    this.pendingActions.push(action);
                    // Try resuming in case user gesture already occurred on parent page
                    this.resumeContext();
                }
            }

            setVisualMode(mode) {
                if (['oscilloscope', 'spectrum', 'radial'].includes(mode)) {
                    this.visualMode = mode;
                    if (window.parent && window.parent !== window) {
                        try {
                            window.parent.postMessage({ type: 'SOUND_MODE_CHANGED', mode: mode }, '*');
                        } catch (e) {}
                    }
                }
            }

            setVolume(val) {
                const v = Math.max(0, Math.min(1, val));
                this.volume = v;
                if (!this.isMuted && this.ctx) {
                    this.masterGain.gain.setValueAtTime(v, this.ctx.currentTime);
                }
            }

            setBpm(bpm) {
                this.currentBpm = Math.max(40, Math.min(240, bpm));
            }

            // --- 1. Play Tone ---
            playTone(freq, durationOrOpts = 1.0, type = 'sine') {
                const opts = typeof durationOrOpts === 'object' ? durationOrOpts : { duration: durationOrOpts, type: type };
                const dur = opts.duration || 1.0;
                const waveType = opts.type || type || 'sine';
                const loop = opts.loop || false;

                this.deferUntilRunning(() => {
                    const f = noteToFreq(freq);
                    this.updateHudFreq(f, waveType);

                    const now = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = waveType;
                    osc.frequency.setValueAtTime(f, now);

                    const attack = Math.min(0.04, dur * 0.2);
                    gain.gain.setValueAtTime(0.0001, now);
                    gain.gain.linearRampToValueAtTime(0.45, now + attack);

                    if (!loop) {
                        const releaseStart = Math.max(now + attack, now + dur - 0.06);
                        gain.gain.setValueAtTime(0.45, releaseStart);
                        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
                        osc.stop(now + dur + 0.05);
                    }

                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(now);

                    const nodeItem = { osc, gain };
                    this.activeNodes.push(nodeItem);
                });
            }

            // --- 2. Play Harmonics (Fourier Wave Superposition) ---
            playHarmonics(baseFreq = 440, amplitudes = [1.0, 0.5, 0.33], durationOrOpts = {}) {
                const opts = typeof durationOrOpts === 'object' ? durationOrOpts : { duration: durationOrOpts };
                const dur = opts.duration || 4.0;
                const loop = opts.loop !== undefined ? opts.loop : true;

                this.deferUntilRunning(() => {
                    const f0 = noteToFreq(baseFreq);
                    this.updateHudFreq(f0, 'Harmonic Wave');

                    const now = this.ctx.currentTime;

                    amplitudes.forEach((amp, idx) => {
                        const harmonicMultiplier = idx + 1;
                        const harmonicFreq = f0 * harmonicMultiplier;
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();

                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(harmonicFreq, now);

                        const scaledVol = Math.max(0.01, amp * 0.22);
                        gain.gain.setValueAtTime(0.0001, now);
                        gain.gain.linearRampToValueAtTime(scaledVol, now + 0.08);

                        if (!loop) {
                            const releaseStart = Math.max(now + 0.08, now + dur - 0.1);
                            gain.gain.setValueAtTime(scaledVol, releaseStart);
                            gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
                            osc.stop(now + dur + 0.05);
                        }

                        osc.connect(gain);
                        gain.connect(this.masterGain);
                        osc.start(now);

                        this.activeNodes.push({ osc, gain });
                    });
                });
            }

            // --- 3. Play Chord ---
            playChord(notes, durationOrOpts = 1.5, options = {}) {
                const opts = typeof durationOrOpts === 'object' ? durationOrOpts : { duration: durationOrOpts, ...options };
                if (!Array.isArray(notes)) return;
                notes.forEach(n => {
                    this.playTone(n, opts);
                });
            }

            // --- 4. Play Sequence (Melody & Arpeggiator) ---
            playSequence(sequence, options = {}) {
                if (!Array.isArray(sequence) || sequence.length === 0) return;
                const bpm = options.bpm || this.currentBpm;
                const loop = options.loop !== false;
                let step = 0;

                this.deferUntilRunning(() => {
                    const tick = () => {
                        if (this.ctx.state !== 'running') {
                            this.pendingActions.push(tick);
                            return;
                        }
                        const item = sequence[step % sequence.length];
                        const dur = item.dur || 0.25;
                        const note = item.note || 'A4';
                        const type = item.type || 'sawtooth';
                        this.playTone(note, { duration: dur * 1.6, type });

                        step++;
                        if (!loop && step >= sequence.length) return;
                        const nextMs = (60000 / bpm) * dur;
                        const timerId = setTimeout(tick, Math.max(70, nextMs));
                        this.activeTimers.push(timerId);
                    };
                    tick();
                });
            }

            // --- 5. Play Procedural Drum Beat ---
            playBeat(patternStr = 'kick - snare -', options = {}) {
                const opts = typeof options === 'object' ? options : { bpm: options };
                const bpm = opts.bpm || 120;
                const loop = opts.loop !== false;
                const tokens = patternStr.toLowerCase().split(/\s+/);
                const stepMs = (60000 / bpm) / 4;
                let step = 0;

                this.deferUntilRunning(() => {
                    const tick = () => {
                        if (this.ctx.state !== 'running') {
                            this.pendingActions.push(tick);
                            return;
                        }
                        const token = tokens[step % tokens.length];
                        if (token === 'kick') this.playKick();
                        else if (token === 'snare') this.playSnare();
                        else if (token === 'hat' || token === 'hihat') this.playHiHat();

                        step++;
                        if (!loop && step >= tokens.length) return;
                        const timerId = setTimeout(tick, stepMs);
                        this.activeTimers.push(timerId);
                    };
                    tick();
                });
            }

            playKick() {
                this.deferUntilRunning(() => {
                    const now = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.frequency.setValueAtTime(160, now);
                    osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);

                    gain.gain.setValueAtTime(1.0, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(now);
                    osc.stop(now + 0.26);
                });
            }

            playSnare() {
                this.deferUntilRunning(() => {
                    const now = this.ctx.currentTime;
                    const bufferSize = this.ctx.sampleRate * 0.12;
                    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

                    const noise = this.ctx.createBufferSource();
                    noise.buffer = buffer;

                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.value = 1000;

                    const gain = this.ctx.createGain();
                    gain.gain.setValueAtTime(0.7, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.masterGain);
                    noise.start(now);
                });
            }

            playHiHat() {
                this.deferUntilRunning(() => {
                    const now = this.ctx.currentTime;
                    const bufferSize = this.ctx.sampleRate * 0.05;
                    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

                    const noise = this.ctx.createBufferSource();
                    noise.buffer = buffer;

                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.value = 9000;

                    const gain = this.ctx.createGain();
                    gain.gain.setValueAtTime(0.35, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.masterGain);
                    noise.start(now);
                });
            }

            // --- 6. Realistic Physical Metal Collision Synthesis ---
            playMetalCollision(options = {}) {
                const opts = typeof options === 'string' ? { type: options } : (options || {});
                const type = opts.type || 'sword_clash'; // 'sword_clash', 'heavy_metal', 'metal_pipe', 'anvil'
                const pitchMult = opts.pitch || 1.0;
                const resonance = opts.resonance || 1.4; // ringing duration in seconds
                const volume = opts.volume !== undefined ? opts.volume : 0.85;

                this.deferUntilRunning(() => {
                    const now = this.ctx.currentTime;
                    this.updateHudFreq(780 * pitchMult, 'Metal Collision (' + type + ')');

                    // 1. Initial High-Frequency Spark / Transient Impact Noise
                    const noiseDur = 0.038;
                    const noiseSize = Math.floor(this.ctx.sampleRate * noiseDur);
                    const noiseBuffer = this.ctx.createBuffer(1, noiseSize, this.ctx.sampleRate);
                    const noiseData = noiseBuffer.getChannelData(0);
                    for (let i = 0; i < noiseSize; i++) {
                        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseSize * 0.22));
                    }
                    const noiseSource = this.ctx.createBufferSource();
                    noiseSource.buffer = noiseBuffer;

                    const noiseFilter = this.ctx.createBiquadFilter();
                    noiseFilter.type = 'highpass';
                    noiseFilter.frequency.setValueAtTime(type === 'heavy_metal' ? 1400 : 3400, now);

                    const noiseGain = this.ctx.createGain();
                    noiseGain.gain.setValueAtTime(0.95 * volume, now);
                    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDur);

                    noiseSource.connect(noiseFilter);
                    noiseFilter.connect(noiseGain);
                    noiseGain.connect(this.masterGain);
                    noiseSource.start(now);
                    this.activeNodes.push({ osc: noiseSource, gain: noiseGain });

                    // 2. Mechanical Shockwave Sweep (Fast downward deformation thump)
                    const sweepOsc = this.ctx.createOscillator();
                    const sweepGain = this.ctx.createGain();
                    sweepOsc.type = 'triangle';
                    const sweepStart = (type === 'heavy_metal' ? 1200 : 2600) * pitchMult;
                    const sweepEnd = (type === 'heavy_metal' ? 160 : 340) * pitchMult;
                    sweepOsc.frequency.setValueAtTime(sweepStart, now);
                    sweepOsc.frequency.exponentialRampToValueAtTime(sweepEnd, now + 0.04);

                    sweepGain.gain.setValueAtTime(0.75 * volume, now);
                    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

                    sweepOsc.connect(sweepGain);
                    sweepGain.connect(this.masterGain);
                    sweepOsc.start(now);
                    sweepOsc.stop(now + 0.055);
                    this.activeNodes.push({ osc: sweepOsc, gain: sweepGain });

                    // 3. Inharmonic Metallic Partials (Euler-Bernoulli vibrational modes for steel plates & bars)
                    let baseFreq = 780 * pitchMult;
                    let partialRatios = [1.0, 1.414, 2.14, 2.82, 3.65, 5.15];
                    if (type === 'heavy_metal' || type === 'anvil') {
                        baseFreq = 340 * pitchMult;
                        partialRatios = [1.0, 1.38, 1.84, 2.62, 3.44, 4.88];
                    } else if (type === 'metal_pipe') {
                        baseFreq = 520 * pitchMult;
                        partialRatios = [1.0, 1.95, 2.92, 3.88, 5.02, 6.22];
                    }

                    partialRatios.forEach((ratio, idx) => {
                        const freq = baseFreq * ratio;
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();

                        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
                        osc.frequency.setValueAtTime(freq, now);

                        const damping = Math.pow(0.72, idx);
                        const decay = Math.max(0.12, resonance * damping);
                        const amp = (0.32 / (idx + 1)) * volume;

                        gain.gain.setValueAtTime(0.0001, now);
                        gain.gain.linearRampToValueAtTime(amp, now + 0.003);
                        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

                        osc.connect(gain);
                        gain.connect(this.masterGain);
                        osc.start(now);
                        osc.stop(now + decay + 0.02);

                        this.activeNodes.push({ osc, gain });
                    });

                    // 4. Metallic FM Shimmer Ring (High-speed FM producing steel clash ring)
                    const carrier = this.ctx.createOscillator();
                    const modulator = this.ctx.createOscillator();
                    const modGain = this.ctx.createGain();
                    const carrierGain = this.ctx.createGain();

                    carrier.type = 'sine';
                    modulator.type = 'sine';

                    const cFreq = (type === 'heavy_metal' ? 480 : 960) * pitchMult;
                    const mFreq = (type === 'heavy_metal' ? 290 : 540) * pitchMult;
                    carrier.frequency.setValueAtTime(cFreq, now);
                    modulator.frequency.setValueAtTime(mFreq, now);

                    modGain.gain.setValueAtTime(340 * pitchMult, now);
                    modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

                    const fmDecay = Math.min(0.65, resonance * 0.6);
                    carrierGain.gain.setValueAtTime(0.48 * volume, now);
                    carrierGain.gain.exponentialRampToValueAtTime(0.0001, now + fmDecay);

                    modulator.connect(modGain);
                    modGain.connect(carrier.frequency);
                    carrier.connect(carrierGain);
                    carrierGain.connect(this.masterGain);

                    modulator.start(now);
                    carrier.start(now);
                    modulator.stop(now + 0.7);
                    carrier.stop(now + 0.7);

                    this.activeNodes.push({ osc: carrier, gain: carrierGain });
                    this.activeNodes.push({ osc: modulator, gain: modGain });

                    // 5. Hollow secondary bounce for metal pipes
                    if (type === 'metal_pipe') {
                        setTimeout(() => {
                            if (this.ctx && this.ctx.state === 'running') {
                                this.playTone(baseFreq * 1.02, { duration: 0.35, type: 'sine' });
                            }
                        }, 90);
                    }
                });
            }

            // --- 7. Procedural Sound FX ---
            playFX(type = 'punch') {
                if (type === 'metal' || type === 'metal_collision' || type === 'sword_clash' || type === 'anvil' || type === 'metal_pipe' || type === 'heavy_metal') {
                    this.playMetalCollision({ type });
                    return;
                }
                this.deferUntilRunning(() => {
                    const now = this.ctx.currentTime;
                    if (type === 'punch') {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.frequency.setValueAtTime(220, now);
                        osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);
                        gain.gain.setValueAtTime(1.0, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                        osc.connect(gain);
                        gain.connect(this.masterGain);
                        osc.start(now);
                        osc.stop(now + 0.22);
                    } else if (type === 'whoosh') {
                        const bufferSize = this.ctx.sampleRate * 0.28;
                        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                        const data = buffer.getChannelData(0);
                        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                        const noise = this.ctx.createBufferSource();
                        noise.buffer = buffer;
                        const filter = this.ctx.createBiquadFilter();
                        filter.type = 'bandpass';
                        filter.frequency.setValueAtTime(600, now);
                        filter.frequency.exponentialRampToValueAtTime(3200, now + 0.14);
                        filter.frequency.exponentialRampToValueAtTime(400, now + 0.28);
                        const gain = this.ctx.createGain();
                        gain.gain.setValueAtTime(0.01, now);
                        gain.gain.linearRampToValueAtTime(0.8, now + 0.12);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                        noise.connect(filter);
                        filter.connect(gain);
                        gain.connect(this.masterGain);
                        noise.start(now);
                    } else if (type === 'bassdrop') {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.frequency.setValueAtTime(80, now);
                        osc.frequency.exponentialRampToValueAtTime(24, now + 1.2);
                        gain.gain.setValueAtTime(1.0, now);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
                        osc.connect(gain);
                        gain.connect(this.masterGain);
                        osc.start(now);
                        osc.stop(now + 1.35);
                    } else if (type === 'laser') {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.setValueAtTime(1200, now);
                        osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);
                        gain.gain.setValueAtTime(0.5, now);
                        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
                        osc.connect(gain);
                        gain.connect(this.masterGain);
                        osc.start(now);
                        osc.stop(now + 0.23);
                    }
                });
            }

            updateHudFreq(freq, type = '') {
                const el = document.getElementById('hud-frequency');
                if (el) el.textContent = Math.round(freq) + ' Hz ' + (type ? '(' + type + ')' : '');
            }

            stopAll() {
                this.activeTimers.forEach(t => clearTimeout(t));
                this.activeTimers = [];
                this.activeNodes.forEach(item => {
                    try { item.osc.stop(); } catch(_) {}
                    try { item.gain.disconnect(); } catch(_) {}
                });
                this.activeNodes = [];
            }

            replay() {
                this.stopAll();
                this.resumeContext().then(() => {
                    if (typeof this.userCodeFn === 'function') {
                        this.userCodeFn();
                    }
                });
            }
        }

        // Global Sound instance
        window.Sound = new SoundEngine();

        // ==========================================
        // 2. REAL-TIME SOUND WAVE CANVAS RENDERER
        // ==========================================
        const canvas = document.getElementById('soundCanvas');
        const ctx = canvas.getContext('2d');

        function resizeCanvas() {
            canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio || 800;
            canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio || 450;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const bufferLength = window.Sound.analyser.frequencyBinCount;
        const timeData = new Uint8Array(bufferLength);
        const freqData = new Uint8Array(bufferLength);
        const peakBars = new Float32Array(64);
        let smoothBass = 0;

        function drawVisualizer() {
            requestAnimationFrame(drawVisualizer);

            const w = canvas.width;
            const h = canvas.height;

            // Clear with dark subtle fade trail
            ctx.fillStyle = 'rgba(6, 9, 19, 0.35)';
            ctx.fillRect(0, 0, w, h);

            // Draw Background Grid Lines (Oscilloscope reticle)
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            const gridSpacing = 40 * window.devicePixelRatio;
            for (let x = 0; x < w; x += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, h);
                ctx.stroke();
            }
            for (let y = 0; y < h; y += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }

            // Center zero-line
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();

            const mode = window.Sound.visualMode || 'oscilloscope';

            if (mode === 'oscilloscope') {
                // --- MODE 1: TIME-DOMAIN SOUND WAVEFORM ---
                window.Sound.analyser.getByteTimeDomainData(timeData);

                let maxDev = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const dev = Math.abs(timeData[i] - 128);
                    if (dev > maxDev) maxDev = dev;
                }

                // If silent or waiting for gesture, add subtle ambient breathing wave so canvas feels alive
                if (maxDev <= 1) {
                    const t = performance.now() * 0.003;
                    for (let i = 0; i < bufferLength; i++) {
                        const ratio = i / bufferLength;
                        timeData[i] = 128 + Math.round(Math.sin(ratio * 12 + t) * 6 * Math.sin(ratio * Math.PI));
                    }
                }

                const peakDb = maxDev > 1 ? (20 * Math.log10(maxDev / 128)).toFixed(1) + ' dB' : '-inf dB';
                const hudPeak = document.getElementById('hud-peak');
                if (hudPeak) hudPeak.textContent = peakDb;

                ctx.lineWidth = 3.5 * window.devicePixelRatio;
                const waveGrad = ctx.createLinearGradient(0, 0, w, 0);
                waveGrad.addColorStop(0, '#06b6d4');
                waveGrad.addColorStop(0.5, '#a855f7');
                waveGrad.addColorStop(1, '#f43f5e');
                ctx.strokeStyle = waveGrad;
                ctx.shadowColor = '#06b6d4';
                ctx.shadowBlur = 14 * window.devicePixelRatio;

                ctx.beginPath();
                const sliceWidth = w / bufferLength;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const v = timeData[i] / 128.0;
                    const y = (v * h) / 2;

                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);

                    x += sliceWidth;
                }
                ctx.stroke();
                ctx.shadowBlur = 0;

            } else if (mode === 'spectrum') {
                // --- MODE 2: FFT FREQUENCY EQUALIZER BARS ---
                window.Sound.analyser.getByteFrequencyData(freqData);

                const numBars = 64;
                const dpr = window.devicePixelRatio || 1;
                const barWidth = Math.max(3, (w / numBars) * 0.72);
                const gap = (w - (numBars * barWidth)) / numBars;
                const maxBin = Math.min(bufferLength - 1, 360); // Audible spectrum up to ~7.8kHz

                // Compute overall signal energy to detect silence
                let totalEnergy = 0;
                for (let b = 1; b < 64; b++) totalEnergy += freqData[b];
                const isSilent = totalEnergy < 12;

                const bottomPad = 20 * dpr;

                for (let i = 0; i < numBars; i++) {
                    const norm = i / numBars;
                    // Logarithmic frequency distribution starting at bin 1
                    const startBin = Math.max(1, Math.floor(Math.pow(norm, 1.85) * maxBin));
                    const endBin = Math.max(startBin + 1, Math.floor(Math.pow((i + 1) / numBars, 1.85) * maxBin));

                    let sum = 0;
                    let count = 0;
                    for (let b = startBin; b < endBin && b < bufferLength; b++) {
                        sum += freqData[b];
                        count++;
                    }
                    let val = count > 0 ? (sum / count) : (freqData[startBin] || 0);

                    // Equal loudness / high frequency boost (+2.5x on high harmonics)
                    const highBoost = 1.0 + Math.pow(norm, 0.8) * 2.5;
                    val = Math.min(255, val * highBoost);

                    // If audio is idle/silent, provide ambient breathing wave
                    if (isSilent) {
                        const wave1 = Math.sin(performance.now() * 0.003 + i * 0.18) * 0.5 + 0.5;
                        const wave2 = Math.cos(performance.now() * 0.002 + i * 0.08) * 0.5 + 0.5;
                        val = Math.max(val, (wave1 * 0.7 + wave2 * 0.3) * 26 + 4);
                    }

                    // Peak falling caps
                    if (val >= peakBars[i]) {
                        peakBars[i] = val;
                    } else {
                        peakBars[i] = Math.max(0, peakBars[i] - 2.2);
                    }

                    const barHeight = Math.max(4 * dpr, (val / 255) * (h * 0.72));
                    const x = i * (barWidth + gap) + gap / 2;
                    const y = h - bottomPad - barHeight;

                    // Dynamic vertical gradient (cyan at bottom -> purple in mid -> vibrant neon rose at top)
                    const barGrad = ctx.createLinearGradient(0, y, 0, h - bottomPad);
                    barGrad.addColorStop(0, '#f43f5e');
                    barGrad.addColorStop(0.4, '#a855f7');
                    barGrad.addColorStop(0.9, '#06b6d4');

                    ctx.fillStyle = barGrad;

                    // Clean rounded bar top
                    const radius = Math.min(3 * dpr, barWidth / 2, barHeight / 2);
                    ctx.beginPath();
                    ctx.moveTo(x + radius, y);
                    ctx.lineTo(x + barWidth - radius, y);
                    ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
                    ctx.lineTo(x + barWidth, y + barHeight);
                    ctx.lineTo(x, y + barHeight);
                    ctx.lineTo(x, y + radius);
                    ctx.quadraticCurveTo(x, y, x + radius, y);
                    ctx.closePath();
                    ctx.fill();

                    // Floating neon peak cap
                    const peakY = h - bottomPad - ((peakBars[i] / 255) * (h * 0.72)) - (4 * dpr);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x, Math.max(12, peakY), barWidth, 2.5 * dpr);
                }

            } else if (mode === 'radial') {
                // --- MODE 3: CIRCULAR RADIAL PULSAR ---
                window.Sound.analyser.getByteFrequencyData(freqData);
                const dpr = window.devicePixelRatio || 1;
                const cx = w / 2;
                const cy = h / 2;
                const minDim = Math.min(w, h);
                const baseRadius = minDim * 0.22;

                // Compute bass impact energy for center core
                let bassEnergy = 0;
                for (let b = 1; b < 14; b++) bassEnergy += freqData[b];
                bassEnergy = (bassEnergy / 13) / 255.0;
                smoothBass += (bassEnergy - smoothBass) * 0.28;

                // Detect overall silence
                let totalEnergy = 0;
                for (let b = 1; b < 64; b++) totalEnergy += freqData[b];
                const isSilent = totalEnergy < 12;

                // 1. Subtle concentric background orbital rings
                ctx.lineWidth = 1 * dpr;
                ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
                ctx.beginPath();
                ctx.arc(cx, cy, baseRadius * 0.6, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = 'rgba(168, 85, 247, 0.06)';
                ctx.beginPath();
                ctx.arc(cx, cy, baseRadius * 1.5, 0, Math.PI * 2);
                ctx.stroke();

                // 2. Inner disc and glowing base ring
                ctx.fillStyle = 'rgba(8, 12, 26, 0.7)';
                ctx.beginPath();
                ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
                ctx.lineWidth = 1.5 * dpr;
                ctx.stroke();

                // 3. Glowing pulsing center bass orb
                const coreRadius = Math.max(12 * dpr, baseRadius * 0.38 * (1 + smoothBass * 0.85));
                const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 1.5);
                coreGrad.addColorStop(0, 'rgba(244, 63, 94, 0.85)');
                coreGrad.addColorStop(0.45, 'rgba(168, 85, 247, 0.4)');
                coreGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
                ctx.fillStyle = coreGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, coreRadius * 1.5, 0, Math.PI * 2);
                ctx.fill();

                // 4. 64 Radial equalizer bars with bilateral symmetry (bass at bottom, highs meeting at top)
                const numRays = 64;
                const halfRays = numRays / 2;
                const rayPoints = [];

                for (let r = 0; r < numRays; r++) {
                    // Start from bottom (PI/2) and sweep symmetrically
                    const angle = (Math.PI / 2) + ((r / numRays) * Math.PI * 2);
                    const symIdx = r <= halfRays ? r : numRays - r;
                    const norm = symIdx / halfRays;

                    const bin = Math.min(bufferLength - 1, Math.max(1, Math.floor(Math.pow(norm, 1.8) * 320)));
                    let val = (freqData[bin] || 0) / 255.0;

                    // High frequency boost
                    val = Math.min(1.0, val * (1.0 + Math.pow(norm, 0.75) * 2.2));

                    // Ambient flutter if idle
                    if (isSilent) {
                        const breath = Math.sin(performance.now() * 0.003 + symIdx * 0.22) * 0.5 + 0.5;
                        val = Math.max(val, breath * 0.08);
                    }

                    const barLen = Math.max(3 * dpr, val * minDim * 0.24);
                    const startR = baseRadius + (2 * dpr);
                    const endR = startR + barLen;

                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const x1 = cx + cos * startR;
                    const y1 = cy + sin * startR;
                    const x2 = cx + cos * endR;
                    const y2 = cy + sin * endR;

                    rayPoints.push({ x: x2, y: y2 });

                    // Draw radiating bar with dynamic color
                    ctx.lineWidth = 2.5 * dpr;
                    ctx.strokeStyle = val > 0.45 ? '#f43f5e' : (val > 0.18 ? '#a855f7' : '#06b6d4');
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();

                    // Glowing tip cap dot
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(x2, y2, 1.5 * dpr, 0, Math.PI * 2);
                    ctx.fill();
                }

                // 5. Smooth outer neon perimeter aura connecting all ray tips
                if (rayPoints.length > 0) {
                    ctx.save();
                    ctx.lineWidth = 2 * dpr;
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
                    ctx.beginPath();
                    ctx.moveTo(rayPoints[0].x, rayPoints[0].y);
                    for (let i = 1; i < rayPoints.length; i++) {
                        const xc = (rayPoints[i].x + rayPoints[i - 1].x) / 2;
                        const yc = (rayPoints[i].y + rayPoints[i - 1].y) / 2;
                        ctx.quadraticCurveTo(rayPoints[i - 1].x, rayPoints[i - 1].y, xc, yc);
                    }
                    const last = rayPoints[rayPoints.length - 1];
                    const first = rayPoints[0];
                    ctx.quadraticCurveTo(last.x, last.y, (last.x + first.x) / 2, (last.y + first.y) / 2);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
        drawVisualizer();

        // ==========================================
        // 3. UI INTERACTIONS & GESTURE ACTIVATION
        // ==========================================
        // Universal click listener anywhere on document to activate audio context
        const unlockAudio = async () => {
            await window.Sound.resumeContext();
        };
        window.addEventListener('click', unlockAudio, { passive: true });
        window.addEventListener('pointerdown', unlockAudio, { passive: true });
        window.addEventListener('touchstart', unlockAudio, { passive: true });
        window.addEventListener('keydown', unlockAudio, { passive: true });

        // Connect to parent window if same origin
        if (window.parent && window.parent !== window) {
            try {
                window.parent.addEventListener('click', unlockAudio, { passive: true });
                window.parent.addEventListener('keydown', unlockAudio, { passive: true });
            } catch (e) {}
        }

        window.addEventListener('message', (event) => {
            if (!event.data) return;
            const type = event.data.type;
            if (type === 'SOUND_RESUME' || type === 'SOUND_PLAY' || type === 'FOCUS' || type === 'PLAY') {
                window.Sound?.resume();
                unlockAudio();
            } else if (type === 'SOUND_PAUSE' || type === 'UNFOCUS' || type === 'STOP' || type === 'PAUSE') {
                window.Sound?.pause();
            } else if (type === 'SET_VISUAL_MODE') {
                if (window.Sound && typeof window.Sound.setVisualMode === 'function') {
                    window.Sound.setVisualMode(event.data.mode);
                }
            } else if (type === 'SET_VOLUME') {
                if (window.Sound && typeof window.Sound.setVolume === 'function') {
                    window.Sound.setVolume(event.data.volume);
                }
            }
        });

        document.getElementById('play-start-overlay')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.Sound?.resume();
            unlockAudio();
        });

        document.getElementById('canvas-wrapper')?.addEventListener('click', () => {
            if (window.Sound?.isPaused || window.Sound?.isMuted) {
                window.Sound?.resume();
            } else if (isFeedMode) {
                window.Sound?.pause();
            } else {
                unlockAudio();
            }
        });

        document.getElementById('btn-mode-oscilloscope')?.addEventListener('click', () => window.Sound.setVisualMode('oscilloscope'));
        document.getElementById('btn-mode-spectrum')?.addEventListener('click', () => window.Sound.setVisualMode('spectrum'));
        document.getElementById('btn-mode-radial')?.addEventListener('click', () => window.Sound.setVisualMode('radial'));

        const btnReplay = document.getElementById('btn-replay-sound');
        if (btnReplay) {
            btnReplay.onclick = (e) => {
                e.stopPropagation();
                window.Sound.replay();
            };
        }

        const toggleBtn = document.getElementById('btn-toggle-sound');
        const muteIcon = document.getElementById('mute-btn-icon');
        if (toggleBtn) {
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                window.Sound.resumeContext();
                window.Sound.isMuted = !window.Sound.isMuted;
                if (window.Sound.isMuted) {
                    if (muteIcon) muteIcon.className = 'ri-volume-mute-line';
                    window.Sound.masterGain.gain.setValueAtTime(0.0, window.Sound.ctx.currentTime);
                } else {
                    if (muteIcon) muteIcon.className = 'ri-volume-up-line';
                    window.Sound.masterGain.gain.setValueAtTime(0.75, window.Sound.ctx.currentTime);
                }
            };
        }

        // Piano Key Taps
        document.querySelectorAll('.piano-key').forEach(key => {
            const playKey = (e) => {
                if (e) e.stopPropagation();
                window.Sound.resumeContext().then(() => {
                    const note = key.dataset.note;
                    const freq = parseFloat(key.dataset.freq);
                    window.Sound.playTone(freq, { duration: 0.8, type: 'sawtooth' });
                    key.classList.add('pressed');
                    setTimeout(() => key.classList.remove('pressed'), 180);
                });
            };
            key.addEventListener('mousedown', playKey);
            key.addEventListener('touchstart', (e) => { e.preventDefault(); playKey(e); });
        });

        // Snapshot capability for post publishing
        window.Sound.getSnapshot = function () {
            return canvas.toDataURL('image/png');
        };

        // ==========================================
        // 4. EXECUTE USER'S SOUND.JS CODE
        // ==========================================
        window.Sound.userCodeFn = function() {
            try {
                ${safeUserCode}
            } catch (err) {
                console.error("Sound Studio Execution Error:", err);
                const hud = document.getElementById('hud-status');
                if (hud) {
                    hud.textContent = 'Code Error';
                    hud.style.color = '#ef4444';
                    hud.title = String(err.message || err);
                }
            }
        };

        window.addEventListener('load', () => {
            // Register and attempt first run
            if (typeof window.Sound.userCodeFn === 'function') {
                window.Sound.userCodeFn();
            }
            // Auto-check status
            window.Sound.checkAudioState();
        });
    </script>
</body>
</html>`;
};

/**
 * Generates an SVG visual poster thumbnail for Sound Studio posts on Explore.
 */
window.getSoundStudioThumbnail = function (post) {
    const title = String(post.title || 'Sound Waves').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
        <defs>
            <linearGradient id="soundBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#050811"/>
                <stop offset="50%" stop-color="#0c1322"/>
                <stop offset="100%" stop-color="#050811"/>
            </linearGradient>
            <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#06b6d4"/>
                <stop offset="50%" stop-color="#a855f7"/>
                <stop offset="100%" stop-color="#f43f5e"/>
            </linearGradient>
            <filter id="neonSoundGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
        </defs>
        <rect width="640" height="360" fill="url(#soundBg)"/>
        
        <!-- Oscilloscope Grid Lines -->
        <g stroke="rgba(255,255,255,0.06)" stroke-width="1">
            <line x1="0" y1="90" x2="640" y2="90"/>
            <line x1="0" y1="180" x2="640" y2="180"/>
            <line x1="0" y1="270" x2="640" y2="270"/>
            <line x1="160" y1="0" x2="160" y2="360"/>
            <line x1="320" y1="0" x2="320" y2="360"/>
            <line x1="480" y1="0" x2="480" y2="360"/>
        </g>

        <!-- FFT Spectrum Equalizer Background Silhouette -->
        <g fill="rgba(6,182,212,0.18)">
            <rect x="50" y="240" width="12" height="60" rx="3"/>
            <rect x="70" y="210" width="12" height="90" rx="3"/>
            <rect x="90" y="170" width="12" height="130" rx="3"/>
            <rect x="110" y="230" width="12" height="70" rx="3"/>
            <rect x="130" y="190" width="12" height="110" rx="3"/>
            <rect x="150" y="140" width="12" height="160" rx="3"/>
            <rect x="170" y="180" width="12" height="120" rx="3"/>
            <rect x="190" y="220" width="12" height="80" rx="3"/>
            <rect x="210" y="250" width="12" height="50" rx="3"/>
            
            <rect x="420" y="250" width="12" height="50" rx="3"/>
            <rect x="440" y="220" width="12" height="80" rx="3"/>
            <rect x="460" y="160" width="12" height="140" rx="3"/>
            <rect x="480" y="130" width="12" height="170" rx="3"/>
            <rect x="500" y="170" width="12" height="130" rx="3"/>
            <rect x="520" y="200" width="12" height="100" rx="3"/>
            <rect x="540" y="230" width="12" height="70" rx="3"/>
            <rect x="560" y="260" width="12" height="40" rx="3"/>
        </g>

        <!-- Oscilloscope Glowing Harmonic Waveform -->
        <path d="M 0 180 Q 40 180 80 120 T 160 240 T 240 70 T 320 290 T 400 90 T 480 250 T 560 140 Q 600 180 640 180" 
              fill="none" stroke="url(#waveGrad)" stroke-width="5" stroke-linecap="round" filter="url(#neonSoundGlow)"/>

        <!-- Center Audio Pulse Core -->
        <circle cx="320" cy="180" r="38" fill="none" stroke="#06b6d4" stroke-width="2" opacity="0.6"/>
        <circle cx="320" cy="180" r="16" fill="#06b6d4" opacity="0.8"/>

        <!-- Bottom Banner -->
        <rect x="0" y="295" width="640" height="65" fill="rgba(6,9,19,0.92)"/>
        <text x="30" y="333" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="17" font-weight="700">${title}</text>
        <rect x="490" y="310" width="120" height="28" rx="14" fill="#06b6d4"/>
        <text x="550" y="328" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="11" font-weight="800" text-anchor="middle">SOUND 440Hz</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};
