/**
 * Cinematic Director & Multi-Shot Movie Sequencer for Cartoon Studio
 * 
 * Empowers creators to build Alan Becker / Hollywood-grade animated movies with:
 * - Multi-shot storyboard sequencing with automated camera cuts
 * - Smooth camera tracking dollies, 360° bullet-time orbits, & dynamic FOV zooms
 * - Variable slow-motion speed ramps (e.g. 1.0x -> 0.2x mid-air -> 1.5x snap landing)
 * - Visceral impact hit-stops (micro-freezes) & decaying screen shakes
 * - Integrated 1080p/4K 60FPS MP4 movie export
 */

import * as THREE from './vendor/three.module.js';

export class Shot {
    constructor(config = {}) {
        this.name = config.name || 'Untitled Shot';
        this.startTime = config.startTime || 0;
        this.duration = config.duration || 3.0;
        this.endTime = this.startTime + this.duration;

        // Camera setup
        this.cameraPos = config.cameraPos ? new THREE.Vector3(...config.cameraPos) : null;
        this.cameraEndPos = config.cameraEndPos ? new THREE.Vector3(...config.cameraEndPos) : null;
        this.lookAt = config.lookAt ? new THREE.Vector3(...config.lookAt) : new THREE.Vector3(0, 0, 0);
        this.lookAtEnd = config.lookAtEnd ? new THREE.Vector3(...config.lookAtEnd) : null;
        this.fov = config.fov || 45;
        this.fovEnd = config.fovEnd || this.fov;
        this.roll = config.roll || 0; // Roll angle in degrees (Dutch tilt)
        this.orbitSpeed = config.orbitSpeed || 0; // Deg/sec around target (bullet-time)
        this.orbitAngleStart = (typeof config.orbitAngleStart === 'number') ? config.orbitAngleStart : undefined;
        this.orbitAngleEnd = (typeof config.orbitAngleEnd === 'number') ? config.orbitAngleEnd : undefined;
        this.orbitRadius = (typeof config.orbitRadius === 'number') ? config.orbitRadius : undefined;
        this.orbitHeight = (typeof config.orbitHeight === 'number') ? config.orbitHeight : undefined;
        this.ease = config.ease || config.cameraEase || 'easeInOut';
        this.trackTarget = config.trackTarget || null; // Function returning Vector3 target

        // Speed ramp (Slow-motion)
        this.speedStart = (typeof config.speedStart === 'number') ? config.speedStart : 1.0;
        this.speedEnd = (typeof config.speedEnd === 'number') ? config.speedEnd : this.speedStart;
        this.speedEase = config.speedEase || 'linear'; // 'linear', 'easeIn', 'easeOut', 'easeInOut'

        // Action & Lighting cues
        this.mode = config.mode || null;
        this.action = config.action || null;
        this.style = config.style || null;
        this.lightingPreset = config.lightingPreset || null;
        this.dialogue = config.dialogue || null;

        // Callbacks
        this.onStart = config.onStart || null;
        this.onUpdate = config.onUpdate || null;
        this.onEnd = config.onEnd || null;

        this._hasStarted = false;
        this._hasEnded = false;
    }

    getProgress(currentTime) {
        if (currentTime < this.startTime) return 0;
        if (currentTime > this.endTime) return 1;
        return (currentTime - this.startTime) / this.duration;
    }
}

export class CinematicDirector {
    constructor({ scene, camera, renderer, controls, studio }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls || (typeof window !== 'undefined' ? window.controls : null);
        this.studio = studio;

        this.shots = [];
        this.totalDuration = 0;
        this.currentTime = 0;
        this.isPlaying = true; // Auto-play director by default
        this.currentSpeed = 1.0;

        // Screen Shake & Hit-Stop
        this.shakeIntensity = 0;
        this.shakeDecay = 8.0;
        this.hitStopTimer = 0;

        // Temp vectors for zero-garbage memory interpolation
        this._vPos = new THREE.Vector3();
        this._vLook = new THREE.Vector3();
        this._originalCameraPos = new THREE.Vector3();

        // Dialogue / Overlay banner element
        this._overlayEl = null;
        this._setupDirectorOverlay();
    }

    _setupDirectorOverlay() {
        if (typeof document === 'undefined') return;
        let el = document.getElementById('director-cinema-overlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'director-cinema-overlay';
            el.style.cssText = `
                position: absolute;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(56, 189, 248, 0.35);
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5), 0 0 15px rgba(56,189,248,0.2);
                border-radius: 9999px;
                padding: 8px 20px;
                color: #f8fafc;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0.5px;
                display: none;
                align-items: center;
                gap: 10px;
                pointer-events: none;
                z-index: 1000;
                transition: opacity 0.2s ease;
            `;
            const container = document.getElementById('canvas-container') || document.body;
            container.appendChild(el);
        }
        this._overlayEl = el;
    }

    addShot(config) {
        // Automatically calculate start time if omitted
        if (typeof config.startTime !== 'number') {
            config.startTime = this.shots.length > 0 ? this.shots[this.shots.length - 1].endTime : 0;
        }

        const shot = new Shot(config);
        this.shots.push(shot);
        this.shots.sort((a, b) => a.startTime - b.startTime);

        this.totalDuration = Math.max(this.totalDuration, shot.endTime);
        this.isPlaying = true;
        return this;
    }

    /**
     * Triggers a high-impact Alan Becker micro-pause + heavy screen shake
     */
    triggerHitStop(durationSec = 0.08, shakeAmount = 1.2) {
        this.hitStopTimer = durationSec;
        this.shakeIntensity = Math.max(this.shakeIntensity, shakeAmount);
    }

    addCameraShake(intensity = 0.8) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    getCurrentShot(time) {
        return this.shots.find(s => time >= s.startTime && time < s.endTime) || this.shots[this.shots.length - 1];
    }

    /**
     * Deterministically updates camera, speed, and actor cues for any given second
     */
    update(delta, explicitTime = null) {
        if (this.shots.length === 0) return;

        if (typeof explicitTime === 'number') {
            this.currentTime = explicitTime;
        } else if (this.isPlaying) {
            // Check hit-stop
            if (this.hitStopTimer > 0) {
                this.hitStopTimer -= delta;
                return; // Freeze movement during hit-stop
            }
            this.currentTime += delta * this.currentSpeed;
            if (this.currentTime >= this.totalDuration) {
                this.currentTime = 0; // Loop or finish
                this.resetShotStates();
            }
        }

        const currentShot = this.getCurrentShot(this.currentTime);
        if (!currentShot) return;

        // 1. Fire shot start lifecycle
        if (!currentShot._hasStarted && this.currentTime >= currentShot.startTime) {
            currentShot._hasStarted = true;
            if (currentShot.mode && this.studio?.setMode) {
                this.studio.setMode(currentShot.mode);
            }
            if (currentShot.action && this.studio?.setParkourAction) {
                this.studio.setParkourAction(currentShot.action);
            }
            if (currentShot.style && this.studio?.setParkourStyle) {
                this.studio.setParkourStyle(currentShot.style);
            }
            if (currentShot.onStart) {
                try { currentShot.onStart(this); } catch (e) { console.warn(e); }
            }
            if (this._overlayEl && currentShot.dialogue) {
                this._overlayEl.style.display = 'flex';
                this._overlayEl.innerHTML = `<span style="color:#38bdf8;">🎬 ${currentShot.name}:</span> ${currentShot.dialogue}`;
            } else if (this._overlayEl) {
                this._overlayEl.style.display = 'none';
            }
        }

        const progress = currentShot.getProgress(this.currentTime);

        // 2. Interpolate speed ramp
        let speedT = progress;
        if (currentShot.speedEase === 'easeInOut') {
            speedT = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        } else if (currentShot.speedEase === 'easeIn') {
            speedT = progress * progress;
        } else if (currentShot.speedEase === 'easeOut') {
            speedT = progress * (2 - progress);
        }
        this.currentSpeed = THREE.MathUtils.lerp(currentShot.speedStart, currentShot.speedEnd, speedT);
        if (this.studio?.setSpeed) {
            this.studio.setSpeed(this.currentSpeed);
        }

        // 3. Interpolate Camera Position & LookAt
        if (this.camera) {
            // Track dynamic target if provided
            let lookTarget = currentShot.lookAt;
            if (typeof currentShot.trackTarget === 'function') {
                const dynamicPos = currentShot.trackTarget();
                if (dynamicPos && dynamicPos.isVector3) lookTarget = dynamicPos;
            } else if (currentShot.lookAtEnd) {
                this._vLook.lerpVectors(currentShot.lookAt, currentShot.lookAtEnd, progress);
                lookTarget = this._vLook;
            }

            let camProgress = progress;
            const easeMode = currentShot.ease || currentShot.cameraEase || 'easeInOut';
            if (easeMode === 'easeInOut') {
                camProgress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
            } else if (easeMode === 'easeOut') {
                camProgress = progress * (2 - progress);
            } else if (easeMode === 'easeIn') {
                camProgress = progress * progress;
            }

            if (currentShot.orbitAngleEnd !== undefined) {
                // 360° / 720° Bullet-Time Orbital Sweep around lookTarget
                const startDeg = currentShot.orbitAngleStart || 0;
                const endDeg = currentShot.orbitAngleEnd;
                const currentDeg = THREE.MathUtils.lerp(startDeg, endDeg, camProgress);
                const rad = THREE.MathUtils.degToRad(currentDeg);
                const orbitR = (typeof currentShot.orbitRadius === 'number') ? currentShot.orbitRadius : (currentShot.cameraPos ? this._vPos.distanceTo(lookTarget) : 34);
                const orbitY = (typeof currentShot.orbitHeight === 'number') ? currentShot.orbitHeight : (currentShot.cameraPos ? this._vPos.y : 14);
                this.camera.position.x = lookTarget.x + Math.sin(rad) * orbitR;
                this.camera.position.y = orbitY;
                this.camera.position.z = lookTarget.z + Math.cos(rad) * orbitR;
            } else if (currentShot.cameraPos) {
                if (currentShot.cameraEndPos) {
                    this._vPos.lerpVectors(currentShot.cameraPos, currentShot.cameraEndPos, camProgress);
                    this.camera.position.copy(this._vPos);
                } else {
                    this.camera.position.copy(currentShot.cameraPos);
                }

                // Bullet-time / 360 Orbit via continuous speed
                if (currentShot.orbitSpeed !== 0) {
                    const angle = THREE.MathUtils.degToRad(currentShot.orbitSpeed * (this.currentTime - currentShot.startTime));
                    const radius = this.camera.position.distanceTo(lookTarget);
                    this.camera.position.x = lookTarget.x + Math.sin(angle) * radius;
                    this.camera.position.z = lookTarget.z + Math.cos(angle) * radius;
                }
            }

            // Dynamic FOV Zoom
            if (currentShot.fov !== currentShot.fovEnd) {
                this.camera.fov = THREE.MathUtils.lerp(currentShot.fov, currentShot.fovEnd, camProgress);
                this.camera.updateProjectionMatrix();
            } else if (this.camera.fov !== currentShot.fov) {
                this.camera.fov = currentShot.fov;
                this.camera.updateProjectionMatrix();
            }

            // Dutch Roll Angle
            if (currentShot.roll !== 0) {
                this.camera.rotation.z = THREE.MathUtils.degToRad(currentShot.roll);
            }

            this.camera.lookAt(lookTarget);
            if (this.controls) {
                this.controls.target.copy(lookTarget);
            }

            // 4. Kinetic Screen Shake Decay
            if (this.shakeIntensity > 0.005) {
                const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
                const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
                const shakeZ = (Math.random() - 0.5) * this.shakeIntensity * 0.5;
                this.camera.position.add(new THREE.Vector3(shakeX, shakeY, shakeZ));
                this.shakeIntensity *= Math.pow(0.1, delta * this.shakeDecay);
            }
        }

        // 5. Fire shot update callback
        if (currentShot.onUpdate) {
            try { currentShot.onUpdate(progress, this.currentTime, delta, this); } catch (e) { console.warn(e); }
        }
    }

    resetShotStates() {
        this.shots.forEach(s => {
            s._hasStarted = false;
            s._hasEnded = false;
        });
    }

    play() {
        this.isPlaying = true;
        this.resetShotStates();
    }

    pause() {
        this.isPlaying = false;
    }

    seek(time) {
        this.currentTime = Math.max(0, Math.min(this.totalDuration, time));
        this.resetShotStates();
        this.update(0.016, this.currentTime);
    }

    /**
     * Exports the entire multi-shot movie as a 1080p/4K 60FPS MP4 file
     */
    async exportMovie(options = {}) {
        const durationSec = options.durationSec || this.totalDuration || 6.0;
        const fps = options.fps || 60;
        const width = options.width || 1920;
        const height = options.height || 1080;
        const bitrate = options.bitrate || 35_000_000;

        console.log(`[CinematicDirector] 🎬 Exporting Multi-Shot Movie: ${this.shots.length} shots, ${durationSec}s @ ${width}x${height}, 60FPS...`);

        this.pause();
        this.seek(0);

        if (this.studio?.exportVideo) {
            return await this.studio.exportVideo({
                durationSec,
                fps,
                width,
                height,
                bitrate,
                onProgress: (pct, frame, total) => {
                    const time = (frame / fps);
                    this.update(1 / fps, time);
                    if (options.onProgress) options.onProgress(pct, frame, total);
                }
            });
        }
    }
}
