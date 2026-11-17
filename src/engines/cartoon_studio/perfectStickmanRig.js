/**
 * PerfectStickmanRig.js - XtraAnim Character Engine
 * Whiteboard Explainer & 3D High-Definition Dynamic Stick Figure Rig
 * 
 * Includes:
 * - Iconic 3-Tuft Explainer Hair (\ | /) & Hairstyle Library
 * - Capsule Spine & Pelvis with Seamless Rounded Joints
 * - Multi-State Expressive Eyes (Sparkle, Inquisitive, Joyful Crescent, Shocked, Smug)
 * - 3D Eyebrows with Surface Projection & Dynamic Arching
 * - HD Canvas Viseme & Phonetic Mouth Engine (AH, OH, EE, FV, MBP, REST, Wavy Thinking)
 * - Kinetic Poses: Thinking (Hand-to-Chin), Presenting, Eureka, Laughing, Conversational
 */

import * as ModuleTHREE from './vendor/three.module.js';
const THREE = (typeof window !== 'undefined' && window.THREE) ? window.THREE : ModuleTHREE;

/**
 * Creates a discrete step gradient texture for sharp cartoon cel-shading
 */
export function createToonRampTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const colors = ['#8892b0', '#cbd5e1', '#f1f5f9', '#ffffff'];
    colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(i, 0, 1, 1);
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
}

/**
 * Creates an outlined mesh using the Inverted Hull technique (BackSide with normal inflation)
 */
export function createOutlinedMesh(geometry, baseMaterial, outlineThickness = 0.012, outlineColor = 0x18181b) {
    const group = new THREE.Group();

    const mainMesh = new THREE.Mesh(geometry, baseMaterial);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    const outlineGeom = geometry.clone();
    const posAttr = outlineGeom.attributes.position;
    const normAttr = outlineGeom.attributes.normal;
    if (posAttr && normAttr) {
        for (let i = 0; i < posAttr.count; i++) {
            const nx = normAttr.getX(i);
            const ny = normAttr.getY(i);
            const nz = normAttr.getZ(i);
            posAttr.setXYZ(
                i,
                posAttr.getX(i) + nx * outlineThickness,
                posAttr.getY(i) + ny * outlineThickness,
                posAttr.getZ(i) + nz * outlineThickness
            );
        }
        outlineGeom.computeVertexNormals();
    }

    const outlineMat = new THREE.MeshBasicMaterial({
        color: outlineColor,
        side: THREE.BackSide
    });
    const outlineMesh = new THREE.Mesh(outlineGeom, outlineMat);
    group.add(outlineMesh);

    return { group, mainMesh, outlineMesh };
}

export function createHairStrandLock(curvePoints, radiusStart = 0.02, radiusEnd = 0.004, mat = null, segments = 16) {
    const v3s = curvePoints.map(p => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(v3s);
    const radialSegments = 10;
    const geom = new THREE.BufferGeometry();
    const pos = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const frenetFrames = curve.computeFrenetFrames(segments, false);

    for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const pt = curve.getPointAt(u);
        const N = frenetFrames.normals[i];
        const B = frenetFrames.binormals[i];
        const r = radiusStart * (1.0 - u) + radiusEnd * u;

        for (let j = 0; j <= radialSegments; j++) {
            const v = j / radialSegments;
            const theta = v * Math.PI * 2;
            const sin = Math.sin(theta);
            const cos = -Math.cos(theta);

            const normalX = cos * N.x + sin * B.x;
            const normalY = cos * N.y + sin * B.y;
            const normalZ = cos * N.z + sin * B.z;

            pos.push(pt.x + r * normalX, pt.y + r * normalY, pt.z + r * normalZ);
            normals.push(normalX, normalY, normalZ);
            uvs.push(u, v);
        }
    }

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < radialSegments; j++) {
            const a = i * (radialSegments + 1) + j;
            const b = (i + 1) * (radialSegments + 1) + j;
            const c = (i + 1) * (radialSegments + 1) + (j + 1);
            const d = i * (radialSegments + 1) + (j + 1);
            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);

    const mesh = new THREE.Mesh(geom, mat || new THREE.MeshBasicMaterial({ color: 0x18181b }));
    mesh.castShadow = true;
    return mesh;
}

export function buildHairstyle(styleName = 'three_tufts', colorHex = 0x18181b) {
    const hairGroup = new THREE.Group();
    hairGroup.name = `hair_${styleName}`;
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });

    if (styleName === 'three_tufts' || styleName === 'classic_whiteboard') {
        // Iconic hand-drawn curved strands: center, left flare, right flare
        hairGroup.add(createHairStrandLock([
            [0, 0.32, 0],
            [0.005, 0.44, 0.01],
            [0.022, 0.54, 0.02]
        ], 0.022, 0.004, mat, 14));

        hairGroup.add(createHairStrandLock([
            [-0.025, 0.32, 0],
            [-0.08, 0.42, 0.01],
            [-0.15, 0.48, 0.02]
        ], 0.020, 0.004, mat, 14));

        hairGroup.add(createHairStrandLock([
            [0.025, 0.32, 0],
            [0.08, 0.42, 0.01],
            [0.15, 0.48, 0.02]
        ], 0.018, 0.004, mat, 14));
    } else if (styleName === 'spiky') {
        hairGroup.add(createHairStrandLock([[0, 0.32, 0], [0.03, 0.45, 0.02], [0.08, 0.58, 0.03]], 0.024, 0.003, mat, 14));
        hairGroup.add(createHairStrandLock([[-0.04, 0.31, 0.01], [-0.10, 0.42, 0.02], [-0.16, 0.52, 0.02]], 0.020, 0.003, mat, 14));
        hairGroup.add(createHairStrandLock([[0.05, 0.30, 0.01], [0.12, 0.40, 0.02], [0.18, 0.49, 0.02]], 0.018, 0.003, mat, 14));
        hairGroup.add(createHairStrandLock([[-0.01, 0.31, -0.02], [-0.02, 0.43, -0.01], [-0.04, 0.54, 0.01]], 0.019, 0.003, mat, 14));
    } else if (styleName === 'side_part') {
        hairGroup.add(createHairStrandLock([[-0.08, 0.32, 0.03], [-0.02, 0.38, 0.05], [0.10, 0.36, 0.06], [0.18, 0.28, 0.04]], 0.026, 0.006, mat, 16));
        hairGroup.add(createHairStrandLock([[-0.06, 0.33, 0.01], [0.02, 0.41, 0.03], [0.14, 0.38, 0.04], [0.22, 0.29, 0.02]], 0.022, 0.005, mat, 16));
    } else if (styleName === 'top_knot' || styleName === 'tuft') {
        hairGroup.add(createHairStrandLock([[0, 0.32, 0], [0.01, 0.44, 0.02], [0.06, 0.50, 0.04], [0.02, 0.55, 0.02]], 0.028, 0.006, mat, 16));
    } else if (styleName === 'curls') {
        hairGroup.add(createHairStrandLock([[-0.04, 0.32, 0], [-0.09, 0.39, 0.03], [-0.06, 0.45, 0.01], [-0.10, 0.49, 0.02]], 0.022, 0.005, mat, 16));
        hairGroup.add(createHairStrandLock([[0.04, 0.32, 0], [0.09, 0.39, 0.03], [0.06, 0.45, 0.01], [0.10, 0.49, 0.02]], 0.022, 0.005, mat, 16));
        hairGroup.add(createHairStrandLock([[0, 0.33, 0.01], [0.02, 0.43, 0.02], [-0.02, 0.49, 0.02]], 0.022, 0.005, mat, 16));
    } else if (styleName === 'pigtails_bunches' || styleName === 'pigtails' || styleName === 'pia') {
        // 1. Center-Parted Curved Bangs / Fringe across forehead
        hairGroup.add(createHairStrandLock([
            [0.00, 0.28, 0.26],
            [-0.08, 0.27, 0.28],
            [-0.17, 0.22, 0.27],
            [-0.23, 0.15, 0.22]
        ], 0.022, 0.005, mat, 16));

        hairGroup.add(createHairStrandLock([
            [0.00, 0.28, 0.26],
            [0.08, 0.27, 0.28],
            [0.17, 0.22, 0.27],
            [0.23, 0.15, 0.22]
        ], 0.022, 0.005, mat, 16));

        // 2. Head Crown Arch
        hairGroup.add(createHairStrandLock([
            [-0.24, 0.18, 0.14],
            [-0.18, 0.32, 0.08],
            [0.00, 0.35, 0.08],
            [0.18, 0.32, 0.08],
            [0.24, 0.18, 0.14]
        ], 0.024, 0.014, mat, 20));

        // 3. Left Pigtail / Bunch (3 wavy flared lock tips)
        const leftTieGeom = new THREE.TorusGeometry(0.038, 0.010, 10, 16);
        const leftTie = new THREE.Mesh(leftTieGeom, mat);
        leftTie.position.set(-0.25, 0.22, -0.04);
        leftTie.rotation.y = Math.PI / 2;
        leftTie.rotation.x = -0.3;
        hairGroup.add(leftTie);

        hairGroup.add(createHairStrandLock([
            [-0.25, 0.22, -0.04],
            [-0.38, 0.28, -0.03],
            [-0.48, 0.16, -0.01],
            [-0.52, -0.04, 0.02]
        ], 0.030, 0.006, mat, 18));

        hairGroup.add(createHairStrandLock([
            [-0.38, 0.20, -0.03],
            [-0.45, 0.08, 0.00],
            [-0.42, -0.08, 0.03]
        ], 0.024, 0.005, mat, 16));

        hairGroup.add(createHairStrandLock([
            [-0.34, 0.22, -0.05],
            [-0.48, 0.12, -0.05],
            [-0.56, -0.02, -0.02]
        ], 0.022, 0.005, mat, 16));

        // 4. Right Pigtail / Bunch (3 wavy flared lock tips)
        const rightTieGeom = new THREE.TorusGeometry(0.038, 0.010, 10, 16);
        const rightTie = new THREE.Mesh(rightTieGeom, mat);
        rightTie.position.set(0.25, 0.22, -0.04);
        rightTie.rotation.y = -Math.PI / 2;
        rightTie.rotation.x = -0.3;
        hairGroup.add(rightTie);

        hairGroup.add(createHairStrandLock([
            [0.25, 0.22, -0.04],
            [0.38, 0.28, -0.03],
            [0.48, 0.16, -0.01],
            [0.52, -0.04, 0.02]
        ], 0.030, 0.006, mat, 18));

        hairGroup.add(createHairStrandLock([
            [0.38, 0.20, -0.03],
            [0.45, 0.08, 0.00],
            [0.42, -0.08, 0.03]
        ], 0.024, 0.005, mat, 16));

        hairGroup.add(createHairStrandLock([
            [0.34, 0.22, -0.05],
            [0.48, 0.12, -0.05],
            [0.56, -0.02, -0.02]
        ], 0.022, 0.005, mat, 16));
    }
    return hairGroup;
}

export function renderStickmanMouth(ctx, expression = 'smug', viseme = 'REST', isSpeaking = false) {
    ctx.clearRect(0, 0, 512, 512);
    ctx.save();
    ctx.translate(256, 256);

    const inkColor = '#18181b';
    const teethColor = '#ffffff';
    const tongueColor = '#ff5577';
    const darkCavity = '#1e1b24';

    if (isSpeaking && viseme !== 'REST') {
        if (viseme === 'AH' || viseme === 'AA') {
            // Natural Cartoon Open "AH" Mouth with rounded teeth and curved tongue
            ctx.beginPath();
            ctx.moveTo(-75, -15);
            ctx.bezierCurveTo(-85, 60, 85, 60, 75, -15);
            ctx.bezierCurveTo(40, -28, -40, -28, -75, -15);
            ctx.closePath();
            ctx.fillStyle = darkCavity;
            ctx.fill();
            ctx.save();
            ctx.clip();

            // Upper rounded white teeth
            ctx.beginPath();
            ctx.roundRect(-55, -30, 110, 26, 8);
            ctx.fillStyle = teethColor;
            ctx.fill();

            // Lower curved pink tongue
            ctx.beginPath();
            ctx.ellipse(0, 42, 50, 32, 0, 0, Math.PI * 2);
            ctx.fillStyle = tongueColor;
            ctx.fill();
            ctx.restore();

            // Bold Ink Outline
            ctx.lineWidth = 16;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = inkColor;
            ctx.stroke();

        } else if (viseme === 'OH' || viseme === 'OO') {
            // Natural Cartoon Round "OH" Mouth
            ctx.beginPath();
            ctx.ellipse(0, 0, 48, 64, 0, 0, Math.PI * 2);
            ctx.fillStyle = darkCavity;
            ctx.fill();
            ctx.save();
            ctx.clip();

            // Tongue tip at bottom
            ctx.beginPath();
            ctx.ellipse(0, 36, 32, 24, 0, 0, Math.PI * 2);
            ctx.fillStyle = tongueColor;
            ctx.fill();
            ctx.restore();

            ctx.lineWidth = 16;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = inkColor;
            ctx.stroke();

        } else if (viseme === 'EE' || viseme === 'IH') {
            // Wide Grinning / Teeth "EE"
            ctx.beginPath();
            ctx.roundRect(-95, -30, 190, 60, 18);
            ctx.fillStyle = darkCavity;
            ctx.fill();
            ctx.save();
            ctx.clip();

            // Full teeth row with center divider
            ctx.beginPath();
            ctx.roundRect(-86, -26, 172, 52, 12);
            ctx.fillStyle = teethColor;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(-86, 0);
            ctx.lineTo(86, 0);
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#cbd5e1';
            ctx.stroke();
            ctx.restore();

            ctx.lineWidth = 16;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = inkColor;
            ctx.stroke();

        } else if (viseme === 'FV') {
            // Lip-Teeth Viseme (F / V sound)
            ctx.beginPath();
            ctx.roundRect(-75, -24, 150, 48, 16);
            ctx.fillStyle = darkCavity;
            ctx.fill();
            ctx.save();
            ctx.clip();

            // Upper teeth showing against bottom lip
            ctx.beginPath();
            ctx.roundRect(-65, -24, 130, 24, 8);
            ctx.fillStyle = teethColor;
            ctx.fill();
            ctx.restore();

            ctx.lineWidth = 16;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = inkColor;
            ctx.stroke();

        } else if (viseme === 'MBP') {
            // Closed / Pressed Lips (M / B / P sound)
            ctx.beginPath();
            ctx.moveTo(-75, 0);
            ctx.quadraticCurveTo(0, 10, 75, 0);
            ctx.lineWidth = 16;
            ctx.lineCap = 'round';
            ctx.strokeStyle = inkColor;
            ctx.stroke();

        } else {
            // Soft speech flap (subtle open mouth)
            ctx.beginPath();
            ctx.moveTo(-70, -4);
            ctx.quadraticCurveTo(0, 28, 70, -4);
            ctx.quadraticCurveTo(0, -14, -70, -4);
            ctx.fillStyle = darkCavity;
            ctx.fill();
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = inkColor;
            ctx.stroke();
        }
    } else {
        // Resting expressions
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = inkColor;

        if (expression === 'smug' || expression === 'casual_smirk') {
            // Signature Inquisitive Upward Side Smirk with subtle cheeky curve
            ctx.beginPath();
            ctx.moveTo(-70, 16);
            ctx.quadraticCurveTo(12, 22, 92, -26);
            ctx.stroke();

            // Corner cheeky tick
            ctx.beginPath();
            ctx.moveTo(88, -22);
            ctx.lineTo(96, -36);
            ctx.lineWidth = 14;
            ctx.stroke();

        } else if (expression === 'happy') {
            // Big open happy smile with tongue
            ctx.beginPath();
            ctx.moveTo(-75, -8);
            ctx.quadraticCurveTo(0, 65, 75, -8);
            ctx.quadraticCurveTo(0, 12, -75, -8);
            ctx.fillStyle = darkCavity;
            ctx.fill();
            ctx.save();
            ctx.clip();
            ctx.beginPath();
            ctx.ellipse(0, 36, 52, 28, 0, 0, Math.PI * 2);
            ctx.fillStyle = tongueColor;
            ctx.fill();
            ctx.restore();
            ctx.lineWidth = 16;
            ctx.stroke();

        } else if (expression === 'laughing') {
            // Wide laughing mouth
            ctx.beginPath();
            ctx.arc(0, -10, 95, 0.08 * Math.PI, 0.92 * Math.PI, false);
            ctx.closePath();
            ctx.fillStyle = darkCavity;
            ctx.fill();
            ctx.save();
            ctx.clip();
            ctx.beginPath();
            ctx.ellipse(0, 48, 62, 36, 0, 0, Math.PI * 2);
            ctx.fillStyle = tongueColor;
            ctx.fill();
            ctx.restore();
            ctx.lineWidth = 16;
            ctx.stroke();

        } else if (expression === 'thinking' || expression === 'curious') {
            ctx.beginPath();
            ctx.moveTo(-80, -10);
            ctx.bezierCurveTo(-38, 24, -8, -30, 32, 10);
            ctx.bezierCurveTo(56, 30, 78, 0, 88, -6);
            ctx.lineWidth = 18;
            ctx.stroke();

        } else if (expression === 'shocked') {
            // Big shocked O-mouth
            ctx.beginPath();
            ctx.ellipse(0, 4, 44, 58, 0, 0, Math.PI * 2);
            ctx.fillStyle = darkCavity;
            ctx.fill();
            ctx.lineWidth = 16;
            ctx.stroke();

        } else if (expression === 'angry') {
            ctx.beginPath();
            ctx.moveTo(-65, 18);
            ctx.quadraticCurveTo(0, -14, 65, 18);
            ctx.stroke();

        } else {
            // Neutral gentle smile
            ctx.beginPath();
            ctx.moveTo(-65, 0);
            ctx.quadraticCurveTo(0, 12, 65, 0);
            ctx.stroke();
        }
    }

    ctx.restore();
}

/**
 * Universal Vector Canvas Emblem Renderer
 * Renders mathematical symbols, icons, or custom typography on character T-shirts
 */
export function renderEmblemCanvas(ctx, emblemType = 'pi', isDark = false) {
    ctx.clearRect(0, 0, 512, 512);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const mainColor = isDark ? '#ffffff' : '#18181b';
    ctx.strokeStyle = mainColor;
    ctx.fillStyle = mainColor;

    const emblem = String(emblemType || 'pi').toLowerCase().trim();

    if (emblem === 'pi' || emblem === 'π') {
        // High-Definition Mathematical Pi (π)
        ctx.beginPath();
        ctx.moveTo(110, 155);
        ctx.bezierCurveTo(105, 175, 125, 185, 145, 175);
        ctx.bezierCurveTo(240, 135, 330, 140, 395, 155);
        ctx.lineWidth = 38;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(195, 170);
        ctx.bezierCurveTo(205, 250, 185, 330, 150, 365);
        ctx.bezierCurveTo(140, 375, 130, 370, 135, 355);
        ctx.lineWidth = 36;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(315, 165);
        ctx.bezierCurveTo(318, 250, 320, 325, 322, 365);
        ctx.bezierCurveTo(325, 375, 345, 375, 355, 360);
        ctx.lineWidth = 36;
        ctx.stroke();
    } else if (emblem === 'sigma' || emblem === 'σ' || emblem === 'sum') {
        // Mathematical Sigma (Σ)
        ctx.lineWidth = 38;
        ctx.beginPath();
        ctx.moveTo(370, 140);
        ctx.lineTo(145, 140);
        ctx.lineTo(260, 256);
        ctx.lineTo(145, 372);
        ctx.lineTo(370, 372);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(370, 120);
        ctx.lineTo(370, 160);
        ctx.moveTo(370, 352);
        ctx.lineTo(370, 392);
        ctx.stroke();
    } else if (emblem === 'dex' || emblem === 'lightning' || emblem === '⚡' || emblem === 'bolt') {
        // Electric Lightning Bolt
        ctx.beginPath();
        ctx.moveTo(290, 100);
        ctx.lineTo(180, 260);
        ctx.lineTo(260, 260);
        ctx.lineTo(220, 412);
        ctx.lineTo(340, 235);
        ctx.lineTo(265, 235);
        ctx.closePath();
        ctx.fill();
    } else if (emblem === 'nova' || emblem === 'star' || emblem === '★' || emblem === 'sparkle') {
        // 5-Point Star
        ctx.beginPath();
        const cx = 256, cy = 256, outerR = 150, innerR = 65;
        for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    } else if (emblem === 'maya' || emblem === 'infinity' || emblem === '∞') {
        // Infinity Symbol (∞)
        ctx.lineWidth = 36;
        ctx.beginPath();
        ctx.moveTo(256, 256);
        ctx.bezierCurveTo(200, 160, 120, 160, 120, 256);
        ctx.bezierCurveTo(120, 352, 200, 352, 256, 256);
        ctx.bezierCurveTo(312, 160, 392, 160, 392, 256);
        ctx.bezierCurveTo(392, 352, 312, 352, 256, 256);
        ctx.stroke();
    } else if (emblem === 'turing' || emblem === '01' || emblem === 'binary') {
        // Binary Code '01'
        ctx.font = '900 160px "Outfit", "Inter", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('01', 256, 256);
    } else if (emblem === 'delta' || emblem === 'δ' || emblem === 'triangle') {
        // Delta (Δ)
        ctx.lineWidth = 36;
        ctx.beginPath();
        ctx.moveTo(256, 120);
        ctx.lineTo(380, 370);
        ctx.lineTo(132, 370);
        ctx.closePath();
        ctx.stroke();
    } else if (emblem === 'omega' || emblem === 'ω') {
        // Omega (Ω)
        ctx.lineWidth = 36;
        ctx.beginPath();
        ctx.moveTo(130, 370);
        ctx.lineTo(195, 370);
        ctx.arc(256, 235, 110, Math.PI * 0.75, Math.PI * 0.25, false);
        ctx.lineTo(382, 370);
        ctx.stroke();
    } else {
        // Custom text / string
        ctx.font = '900 140px "Outfit", "Inter", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(emblemType).slice(0, 4), 256, 256);
    }

    ctx.restore();
}

/**
 * Reusable Named Character Registry for XtraAnim Studio
 * Characters can be instantiated, listed, customized, and controlled by their unique id/name
 */
export const CHARACTER_REGISTRY = {
    pi: {
        id: 'pi',
        name: 'Pi',
        symbol: 'π',
        role: 'Hero Explainer Guide',
        gender: 'male',
        shirtColor: 0xf59e0b, // Warm Amber Gold
        shortsColor: 0x3d6b99, // Denim Blue
        shoesColor: 0xffffff,  // White sneakers
        skinColor: 0xf6cbb0,   // Natural human skin
        charColor: 0xffffff,   // White head/face
        hairStyle: 'none',     // Bald / Expressive
        bottomType: 'shorts',  // Denim Shorts
        hasEyelashes: false,
        emblem: 'pi',          // Mathematical π
        description: 'The iconic flagship explainer. Curious, sharp, and charismatic whiteboard host.'
    },
    pia: {
        id: 'pia',
        name: 'Pia',
        symbol: 'π',
        role: 'Hero Explainer Partner',
        gender: 'female',
        shirtColor: 0xf59e0b, // Warm Amber Gold
        shortsColor: 0x3d6b99, // Denim Blue A-Line Skirt
        shoesColor: 0xffffff,  // White sneakers
        skinColor: 0xf6cbb0,   // Natural human skin
        charColor: 0xffffff,   // White head/face
        hairStyle: 'pigtails_bunches', // Dual curly pigtails with center-parted bangs
        bottomType: 'skirt',   // Flared A-Line Skirt
        hasEyelashes: true,    // 3 delicate upward eyelashes
        emblem: 'pi',          // Mathematical π emblem
        description: 'The iconic female explainer partner. Expressive pigtails, flared A-line denim skirt, and high-definition π emblem.'
    },
    sigma: {
        id: 'sigma',
        name: 'Sigma',
        symbol: 'Σ',
        role: 'Math & Data Analyst',
        shirtColor: 0xef4444, // Crimson Red
        shortsColor: 0x1e293b, // Deep Slate
        shoesColor: 0xffffff,
        skinColor: 0xf6cbb0,
        charColor: 0xffffff,
        hairStyle: 'side_part',
        emblem: 'sigma',
        description: 'Analytical genius specializing in calculus, statistics, algorithms, and deep dives.'
    },
    dex: {
        id: 'dex',
        name: 'Dex',
        symbol: '⚡',
        role: 'Tech & Speed Explainer',
        shirtColor: 0x06b6d4, // Electric Cyan
        shortsColor: 0x334155, // Charcoal
        shoesColor: 0xffffff,
        skinColor: 0xf6cbb0,
        charColor: 0xffffff,
        hairStyle: 'spiky',
        emblem: 'dex',
        description: 'High-energy hardware and tech specialist who breaks down complex systems at lightning speed.'
    },
    nova: {
        id: 'nova',
        name: 'Nova',
        symbol: '★',
        role: 'Creative & Storyteller',
        shirtColor: 0x8b5cf6, // Vibrant Violet
        shortsColor: 0x475569, // Slate
        shoesColor: 0xffffff,
        skinColor: 0xf6cbb0,
        charColor: 0xffffff,
        hairStyle: 'top_knot',
        emblem: 'nova',
        description: 'Imaginative whiteboard artist and philosophical guide for creative narratives.'
    },
    maya: {
        id: 'maya',
        name: 'Maya',
        symbol: '∞',
        role: 'Science & Nature Explorer',
        shirtColor: 0x10b981, // Emerald Mint
        shortsColor: 0x1e1b4b, // Midnight Indigo
        shoesColor: 0xffffff,
        skinColor: 0xf6cbb0,
        charColor: 0xffffff,
        hairStyle: 'three_tufts',
        emblem: 'maya',
        description: 'Nature, astrophysics, and quantum explorer discovering the wonders of the universe.'
    },
    turing: {
        id: 'turing',
        name: 'Turing',
        symbol: '01',
        role: 'Logic & Code Architect',
        shirtColor: 0x3b82f6, // Royal Blue
        shortsColor: 0x0f172a, // Dark Obsidian
        shoesColor: 0xffffff,
        skinColor: 0xf6cbb0,
        charColor: 0xffffff,
        hairStyle: 'three_tufts',
        emblem: 'turing',
        description: 'Software engineer and logic theorist leading code tutorials and architecture breakdowns.'
    },
    delta: {
        id: 'delta',
        name: 'Delta',
        symbol: 'Δ',
        role: 'Change & Strategy Consultant',
        shirtColor: 0xec4899, // Magenta Pink
        shortsColor: 0x374151, // Graphite
        shoesColor: 0xffffff,
        skinColor: 0xf6cbb0,
        charColor: 0xffffff,
        hairStyle: 'curls',
        emblem: 'delta',
        description: 'Strategic thinker focused on continuous improvement, pivots, and exponential growth.'
    },
    omega: {
        id: 'omega',
        name: 'Omega',
        symbol: 'Ω',
        role: 'Master Synthesizer',
        shirtColor: 0x18181b, // Obsidian Black
        shortsColor: 0x4b5563, // Steel Grey
        shoesColor: 0xffffff,
        skinColor: 0xf6cbb0,
        charColor: 0xffffff,
        hairStyle: 'none',
        emblem: 'omega',
        description: 'Executive closing presenter who delivers master summaries and strategic conclusions.'
    }
};

/**
 * Register a character into the runtime library
 */
export function registerCharacter(characterConfig) {
    if (!characterConfig || !characterConfig.id) return false;
    const id = characterConfig.id.toLowerCase().trim();
    CHARACTER_REGISTRY[id] = {
        ...CHARACTER_REGISTRY.pi,
        ...characterConfig,
        id
    };
    return CHARACTER_REGISTRY[id];
}

/**
 * Get a character config by id or name
 */
export function getCharacter(idOrName) {
    if (!idOrName) return CHARACTER_REGISTRY.pi;
    const key = String(idOrName).toLowerCase().trim();
    return CHARACTER_REGISTRY[key] || Object.values(CHARACTER_REGISTRY).find(c => c.name.toLowerCase() === key) || CHARACTER_REGISTRY.pi;
}

/**
 * Get all registered characters as an array
 */
export function getAllCharacters() {
    return Object.values(CHARACTER_REGISTRY);
}

/**
 * Delete a custom character
 */
export function deleteCharacter(id) {
    const key = String(id).toLowerCase().trim();
    if (key === 'pi') return false; // Pi is protected flagship
    if (CHARACTER_REGISTRY[key]) {
        delete CHARACTER_REGISTRY[key];
        return true;
    }
    return false;
}

export function createPerfectStickman(options = {}) {
    const characterId = options.characterId || options.id || 'pi';
    const preset = getCharacter(characterId);

    const root = new THREE.Group();
    root.name = options.name || preset.name || 'StickmanRig';

    const colorHex = (options.color !== undefined) ? options.color : preset.charColor;
    const skinHex = (options.skinColor !== undefined) ? options.skinColor : preset.skinColor;
    const shirtHex = (options.shirtColor !== undefined) ? options.shirtColor : preset.shirtColor;
    const shortsHex = (options.shortsColor !== undefined) ? options.shortsColor : preset.shortsColor;
    const shoesHex = (options.shoesColor !== undefined) ? options.shoesColor : preset.shoesColor;
    let hasEyelashes = (options.hasEyelashes !== undefined) ? options.hasEyelashes : Boolean(preset.hasEyelashes);

    // --- MATERIALS (1-to-1 matching perfectStickman.html) ---
    const matWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const matInk = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const matSkin = new THREE.MeshBasicMaterial({ color: skinHex });
    const matBody = new THREE.MeshBasicMaterial({ color: colorHex });
    const matShirt = new THREE.MeshBasicMaterial({ color: shirtHex });
    const matShorts = new THREE.MeshBasicMaterial({ color: shortsHex });
    const matShoes = new THREE.MeshBasicMaterial({ color: shoesHex });

    // Pelvis Hub (1.25 height)
    const pelvis = new THREE.Group();
    pelvis.position.y = 1.25;
    root.add(pelvis);

    // Denim Shorts Bridge
    const shortsPelvisGeom = new THREE.BoxGeometry(0.34, 0.18, 0.20);
    const shortsPelvisObj = createOutlinedMesh(shortsPelvisGeom, matShorts, 0.008);
    shortsPelvisObj.group.position.set(0, 0, 0);
    pelvis.add(shortsPelvisObj.group);

    // A-Line Flared Skirt for Female Character (Pia style)
    const skirtGroup = new THREE.Group();
    pelvis.add(skirtGroup);

    // 1. Standing A-Line Skirt (for walk, run, standing explainer)
    const standingSkirt = new THREE.Group();
    skirtGroup.add(standingSkirt);

    const skirtTopR = 0.170;
    const skirtBottomR = 0.280;
    const skirtHeight = 0.52;
    const skirtGeom = new THREE.CylinderGeometry(skirtTopR, skirtBottomR, skirtHeight, 28, 8, true);
    skirtGeom.scale(1.08, 1.0, 0.86);
    const skirtObj = createOutlinedMesh(skirtGeom, matShorts, 0.010);
    skirtObj.group.position.y = -skirtHeight * 0.48;
    standingSkirt.add(skirtObj.group);

    const skirtHemGeom = new THREE.TorusGeometry(skirtBottomR * 1.02, 0.012, 10, 28);
    skirtHemGeom.rotateX(Math.PI / 2);
    skirtHemGeom.scale(1.08, 0.86, 1.0);
    const skirtHemObj = createOutlinedMesh(skirtHemGeom, matShorts, 0.007);
    skirtHemObj.group.position.y = -skirtHeight * 0.98;
    standingSkirt.add(skirtHemObj.group);

    // 2. Seated Skirt Lap Cover (drapes seamlessly over horizontal thighs & knees when seated)
    const seatedSkirt = new THREE.Group();
    skirtGroup.add(seatedSkirt);

    function buildSeatedSkirtGeom() {
        const geom = new THREE.BufferGeometry();
        const rows = 12;
        const cols = 12;
        const pos = [];
        const uvs = [];
        const indices = [];

        for (let r = 0; r <= rows; r++) {
            const v = r / rows; // 0 (waist) to 1 (past knees)
            for (let c = 0; c <= cols; c++) {
                const u = c / cols;
                const uCentered = (u - 0.5) * 2; // -1 to +1

                // Wide flare covering thighs: 0.48 at waist to 0.62 at knees
                const halfW = (0.24 * (1.0 - v) + 0.31 * v);
                const x = uCentered * halfW;

                let z, y;
                if (v < 0.78) {
                    // Main lap surface over thighs (strictly above thigh top y = 0.025)
                    const t = v / 0.78;
                    z = -0.06 + t * 0.52;
                    
                    // Smooth dome arched over both thighs
                    const arch = Math.cos(uCentered * Math.PI * 0.5) * 0.028;
                    y = 0.048 - t * 0.018 + arch;
                } else {
                    // Front knee drape drop
                    const t = (v - 0.78) / 0.22;
                    z = 0.46 + Math.sin(t * Math.PI * 0.5) * 0.07;
                    y = 0.030 - Math.sin(t * Math.PI * 0.5) * 0.22;
                }

                // Side drop down to chair seat
                if (Math.abs(uCentered) > 0.55) {
                    const sideT = (Math.abs(uCentered) - 0.55) / 0.45;
                    y -= sideT * sideT * 0.22;
                }

                pos.push(x, y, z);
                uvs.push(u, v);
            }
        }

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const a = r * (cols + 1) + c;
                const b = (r + 1) * (cols + 1) + c;
                const d = r * (cols + 1) + (c + 1);
                const e = (r + 1) * (cols + 1) + (c + 1);
                indices.push(a, b, d);
                indices.push(d, b, e);
            }
        }

        geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geom.setIndex(indices);
        geom.computeVertexNormals();
        return geom;
    }

    const seatedGeom = buildSeatedSkirtGeom();
    const seatedSkirtObj = createOutlinedMesh(seatedGeom, matShorts, 0.008);
    seatedSkirt.add(seatedSkirtObj.group);

    // Default: Standing skirt visible, seated skirt hidden
    seatedSkirt.visible = false;

    const initialBottomType = options.bottomType || preset.bottomType || 'shorts';
    const isInitialSkirt = (initialBottomType === 'skirt');
    skirtGroup.visible = isInitialSkirt;
    shortsPelvisObj.group.visible = !isInitialSkirt;

    // Front pocket slits
    const slitL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.10, 0.02), matInk);
    slitL.position.set(-0.08, 0, 0.105);
    slitL.rotation.z = -0.3;
    shortsPelvisObj.group.add(slitL);

    const slitR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.10, 0.02), matInk);
    slitR.position.set(0.08, 0, 0.105);
    slitR.rotation.z = 0.3;
    shortsPelvisObj.group.add(slitR);

    // Torso Spine
    const torso = new THREE.Group();
    pelvis.add(torso);

    const spineLen = 0.90;
    const spineGeom = new THREE.CapsuleGeometry(0.025, spineLen, 12, 16);
    const spineMesh = new THREE.Mesh(spineGeom, matInk);
    spineMesh.position.y = spineLen * 0.5;
    torso.add(spineMesh);

    // --- PERFECT TAILORED CARTOON T-SHIRT ---
    const shirtGroup = new THREE.Group();
    torso.add(shirtGroup);

    // 1. Main T-Shirt Body (Anatomical Chest Taper)
    const shirtBodyGeom = new THREE.CylinderGeometry(0.175, 0.165, spineLen * 0.95, 24, 8);
    shirtBodyGeom.scale(1.08, 1.0, 0.88);
    const shirtBodyObj = createOutlinedMesh(shirtBodyGeom, matShirt, 0.008);
    shirtBodyObj.group.position.y = spineLen * 0.48;
    shirtGroup.add(shirtBodyObj.group);

    // 2. Bottom Hem Ribbing (Neatly layering over denim shorts)
    const shirtHemGeom = new THREE.TorusGeometry(0.170, 0.014, 10, 24);
    shirtHemGeom.rotateX(Math.PI / 2);
    shirtHemGeom.scale(1.08, 0.88, 1.0);
    const shirtHemObj = createOutlinedMesh(shirtHemGeom, matShirt, 0.006);
    shirtHemObj.group.position.y = spineLen * 0.02;
    shirtGroup.add(shirtHemObj.group);

    // 3. Crewneck Collar Band (Framing neck base with subtle forward curve)
    const shirtCollarGeom = new THREE.TorusGeometry(0.110, 0.016, 12, 24);
    shirtCollarGeom.rotateX(Math.PI / 2 + 0.10);
    const shirtCollarObj = createOutlinedMesh(shirtCollarGeom, matShirt, 0.007);
    shirtCollarObj.group.position.set(0, spineLen * 0.96, 0.01);
    shirtGroup.add(shirtCollarObj.group);

    // 4. Shoulder Yoke Bridge (Smooth continuous fabric over shoulders)
    const shoulderYokeGeom = new THREE.CapsuleGeometry(0.048, 0.46, 12, 16);
    shoulderYokeGeom.rotateZ(Math.PI / 2);
    shoulderYokeGeom.scale(1.0, 0.80, 0.90);
    const shoulderYokeObj = createOutlinedMesh(shoulderYokeGeom, matShirt, 0.007);
    shoulderYokeObj.group.position.y = spineLen * 0.98;
    shirtGroup.add(shoulderYokeObj.group);

    // 5. Universal Vector Canvas Emblem Decal (Centered between chest & stomach)
    function createShirtEmblem(initialEmblem = 'pi') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;

        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const geom = new THREE.PlaneGeometry(0.18, 0.18);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(0, spineLen * 0.50, 0.158);
        mesh.renderOrder = 8;
        shirtGroup.add(mesh);

        let currentEmblem = initialEmblem;
        function renderEmblem(emblem = currentEmblem, isDark = false) {
            currentEmblem = emblem;
            renderEmblemCanvas(ctx, emblem, isDark);
            tex.needsUpdate = true;
        }

        const isDarkShirt = (shirtHex === 0x18181b || shirtHex === 0x1c1e22 || shirtHex === 0x0f172a);
        renderEmblem(initialEmblem, isDarkShirt);
        return { mesh, canvas, ctx, tex, renderEmblem, renderPi: (isDark) => renderEmblem('pi', isDark) };
    }

    const currentEmblemType = options.emblem || preset.emblem || 'pi';
    const shirtEmblem = createShirtEmblem(currentEmblemType);

    // Shoulder
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.y = spineLen;
    torso.add(shoulderGroup);

    const shoulderBarGeom = new THREE.CapsuleGeometry(0.030, 0.52, 12, 16);
    shoulderBarGeom.rotateZ(Math.PI / 2);
    const shoulderBar = new THREE.Mesh(shoulderBarGeom, matInk);
    shoulderGroup.add(shoulderBar);

    // --- CONNECTED NECK (Firmly connects collar to base of head with NO gap) ---
    const neckLen = 0.18;
    const neckGeom = new THREE.CylinderGeometry(0.028, 0.028, neckLen, 16);
    const neckObj = createOutlinedMesh(neckGeom, matSkin, 0.006);
    neckObj.group.position.y = neckLen * 0.5;
    shoulderGroup.add(neckObj.group);

    // Head Group (Centered directly on top of connected neck)
    const headGroup = new THREE.Group();
    headGroup.position.y = neckLen + 0.30;
    shoulderGroup.add(headGroup);

    // --- HEAD SPHERE (Pure White on Entire Front Face Z > 0, Grey on Back Side Z < 0) ---
    const headR = 0.32;
    const solidGeom = new THREE.SphereGeometry(headR, 48, 48);
    solidGeom.scale(0.96, 1.05, 0.96);

    const posAttr = solidGeom.attributes.position;
    const vertexColors = new Float32Array(posAttr.count * 3);
    const colWhite = new THREE.Color(0xffffff);
    const colGrey = new THREE.Color(0x8e9aaf);

    for (let i = 0; i < posAttr.count; i++) {
        const z = posAttr.getZ(i);
        const t = THREE.MathUtils.clamp((z + 0.02) / 0.04, 0, 1);
        const col = colGrey.clone().lerp(colWhite, t);
        vertexColors[i * 3] = col.r;
        vertexColors[i * 3 + 1] = col.g;
        vertexColors[i * 3 + 2] = col.b;
    }
    solidGeom.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));

    const matHead = new THREE.MeshBasicMaterial({ vertexColors: true });
    const headMeshObj = createOutlinedMesh(solidGeom, matHead, 0.012);
    headGroup.add(headMeshObj.group);

    // Hairstyle Root with Dynamic Switcher
    const hairRoot = new THREE.Group();
    headGroup.add(hairRoot);

    function setHairstyle(styleName = 'none') {
        while (hairRoot.children.length > 0) {
            hairRoot.remove(hairRoot.children[0]);
        }
        if (styleName && styleName !== 'none' && styleName !== 'bald') {
            const hair = buildHairstyle(styleName);
            hairRoot.add(hair);
        }
    }

    const initialHair = options.hairStyle !== undefined ? options.hairStyle : preset.hairStyle;
    setHairstyle(initialHair);

    // Facial Rig Container
    const faceContainer = new THREE.Group();
    headGroup.add(faceContainer);

    function getHeadSurfaceZ(x, y, offset = 0.006) {
        const rx = headR * 0.96;
        const ry = headR * 1.05;
        const rz = headR * 0.96;
        const normSq = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        const zBase = (normSq < 1.0) ? rz * Math.sqrt(Math.max(0, 1.0 - normSq)) : 0;
        return zBase + offset;
    }

    function buildTubeCurve(points2D, radius = 0.013) {
        const v3s = points2D.map(p => new THREE.Vector3(p[0], p[1], getHeadSurfaceZ(p[0], p[1], 0.009)));
        const curve = new THREE.CatmullRomCurve3(v3s, false);
        const geom = new THREE.TubeGeometry(curve, 24, radius, 10, false);
        return new THREE.Mesh(geom, matInk);
    }

    function updateTubeCurve(mesh, points2D, radius = 0.013) {
        if (!mesh) return;
        const v3s = points2D.map(p => new THREE.Vector3(p[0], p[1], getHeadSurfaceZ(p[0], p[1], 0.009)));
        const curve = new THREE.CatmullRomCurve3(v3s, false);
        const newGeom = new THREE.TubeGeometry(curve, 24, radius, 10, false);
        if (mesh.geometry) mesh.geometry.dispose();
        mesh.geometry = newGeom;
    }

    // --- CARTOONIST NATURALISTIC VECTOR EYE ENGINE ---
    function makeEye(isRight) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;

        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        // Horizontally elongated eye plane
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.19), mat);
        const eyeX = isRight ? 0.092 : -0.092;
        const eyeY = 0.024;
        const eyeZ = getHeadSurfaceZ(eyeX, eyeY, 0.007);
        mesh.position.set(eyeX, eyeY, eyeZ);
        mesh.rotation.y = isRight ? 0.22 : -0.22;
        mesh.renderOrder = 9;

        faceContainer.add(mesh);
        return { canvas, ctx, tex, mesh, isRight };
    }

    function renderEyeCanvas(eye, gazeX = 0, gazeY = 0, blinkAmt = 0, expression = 'smug') {
        const { ctx, tex, isRight } = eye;
        ctx.clearRect(0, 0, 512, 512);

        const cx = 256;
        const cy = 256;
        const rx = 125;
        const ry = 92;

        if (expression === 'laughing') {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.beginPath();
            ctx.arc(0, 12, 85, 1.12 * Math.PI, 1.88 * Math.PI, false);
            ctx.lineWidth = 24;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#18181b';
            ctx.stroke();
            ctx.restore();
            tex.needsUpdate = true;
            return;
        }

        const blinkScale = Math.max(0.04, 1.0 - blinkAmt * 0.96);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1.0, blinkScale);

        // 1. Soft Natural Sclera (White Eye background - horizontal)
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Save clip for pupil inside sclera
        ctx.save();
        ctx.clip();

        // 2. Black Pupil with Organic Saccade Tracking (Identical on both eyes)
        const maxGazeX = rx * 0.38;
        const maxGazeY = ry * 0.32;
        const pupilX = Math.max(-maxGazeX, Math.min(maxGazeX, gazeX * maxGazeX));
        const pupilY = Math.max(-maxGazeY, Math.min(maxGazeY, gazeY * maxGazeY));
        const prx = 70;
        const pry = 60;

        ctx.beginPath();
        ctx.ellipse(pupilX, pupilY, prx, pry, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#141416';
        ctx.fill();

        // 3. Glossy Specular Highlights on Black Pupil (Identical on both eyes)
        if (blinkScale > 0.3) {
            ctx.beginPath();
            ctx.arc(pupilX + 22, pupilY - 16, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(pupilX - 20, pupilY + 18, 7.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }

        // Restore clip
        ctx.restore();

        // 4. Single Crisp Hand-Drawn Ink Border around Sclera
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#18181b';
        ctx.stroke();

        // 5. Delicate Hand-Drawn Eyelashes (3 upward curved lashes on upper-outer corner for female character)
        if (hasEyelashes && blinkScale > 0.2) {
            const lashSign = isRight ? 1 : -1;
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#18181b';

            ctx.beginPath();
            ctx.moveTo(lashSign * (rx * 0.78), -ry * 0.65);
            ctx.quadraticCurveTo(lashSign * (rx * 1.06), -ry * 1.08, lashSign * (rx * 1.25), -ry * 1.15);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(lashSign * (rx * 0.90), -ry * 0.35);
            ctx.quadraticCurveTo(lashSign * (rx * 1.18), -ry * 0.60, lashSign * (rx * 1.34), -ry * 0.55);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(lashSign * (rx * 0.50), -ry * 0.88);
            ctx.quadraticCurveTo(lashSign * (rx * 0.72), -ry * 1.28, lashSign * (rx * 0.85), -ry * 1.40);
            ctx.stroke();
        }

        ctx.restore();
        tex.needsUpdate = true;
    }

    const leftEye = makeEye(false);
    const rightEye = makeEye(true);

    // Eyebrows (Sitting Harmoniously Above Horizontally Elongated Eyes)
    const browLPts = [[-0.026, 0.142], [-0.090, 0.182], [-0.155, 0.135]];
    const browRPts = [[0.026, 0.105], [0.090, 0.125], [0.155, 0.098]];
    const lBrowMesh = buildTubeCurve(browLPts, 0.013);
    const rBrowMesh = buildTubeCurve(browRPts, 0.013);
    faceContainer.add(lBrowMesh);
    faceContainer.add(rBrowMesh);

    // Vector Mouth Canvas (Shifted down for ideal golden facial balance)
    const mouthCanvas = document.createElement('canvas');
    mouthCanvas.width = 512;
    mouthCanvas.height = 512;
    const mouthCtx = mouthCanvas.getContext('2d');
    const mouthTex = new THREE.CanvasTexture(mouthCanvas);
    mouthTex.colorSpace = THREE.SRGBColorSpace;
    const mouthMat = new THREE.MeshBasicMaterial({
        map: mouthTex,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const mouthMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.36), mouthMat);
    const mouthY = -0.128;
    const mouthZ = getHeadSurfaceZ(0, mouthY, 0.007);
    mouthMesh.position.set(0, mouthY, mouthZ);
    mouthMesh.renderOrder = 10;
    faceContainer.add(mouthMesh);

    // Emote Bulb
    const emoteGroup = new THREE.Group();
    emoteGroup.position.set(0, 0.65, 0.05);
    emoteGroup.scale.set(0.001, 0.001, 0.001);
    headGroup.add(emoteGroup);
    const bulbMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffea00 })
    );
    emoteGroup.add(bulbMesh);

    // Arms & Stick Limbs (Exact Proportions: 0.48 / 0.46 / 0.024)
    const upperArmLen = 0.48;
    const foreArmLen = 0.46;
    const armRadius = 0.024;

    function makeHumanHand(isRightHand) {
        const handGroup = new THREE.Group();
        handGroup.name = isRightHand ? 'right_human_hand' : 'left_human_hand';

        const thumbSide = isRightHand ? -1 : 1;

        // 1. Anatomical Palm Metacarpus (Wider, natural human palm breadth)
        const palmW = 0.068;
        const palmH = 0.058;
        const palmD = 0.020;
        const palmGeom = new THREE.BoxGeometry(palmW, palmH, palmD, 2, 2, 2);
        
        const pos = palmGeom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const x = pos.getX(i);
            if (y > 0) {
                pos.setX(i, x * 0.82);
            }
        }
        palmGeom.computeVertexNormals();

        const palmObj = createOutlinedMesh(palmGeom, matSkin, 0.0035);
        palmObj.group.position.set(0, -palmH * 0.48, 0);
        handGroup.add(palmObj.group);

        // 2. Thenar Muscle Pad (Thumb Base Bulge on Palmar Side)
        const thenarGeom = new THREE.SphereGeometry(0.016, 12, 12);
        thenarGeom.scale(1.0, 1.35, 0.85);
        const thenarObj = createOutlinedMesh(thenarGeom, matSkin, 0.0025);
        thenarObj.group.position.set(thumbSide * 0.024, -palmH * 0.35, 0.007);
        handGroup.add(thenarObj.group);

        // 3. Opposable Thumb (2 Articulated Segments + Base Opposition Angle)
        const thumbBase = new THREE.Group();
        thumbBase.position.set(thumbSide * 0.028, -palmH * 0.28, 0.004);
        thumbBase.rotation.z = thumbSide * 0.44;
        thumbBase.rotation.y = thumbSide * -0.34;
        thumbBase.rotation.x = -0.18;
        handGroup.add(thumbBase);

        const thumbP1Len = 0.026;
        const thumbP1Geom = new THREE.CapsuleGeometry(0.0076, thumbP1Len, 8, 12);
        const thumbP1Obj = createOutlinedMesh(thumbP1Geom, matSkin, 0.0025);
        thumbP1Obj.group.position.y = -thumbP1Len * 0.5;
        thumbBase.add(thumbP1Obj.group);

        const thumbP2Group = new THREE.Group();
        thumbP2Group.position.y = -thumbP1Len;
        thumbP2Group.rotation.x = -0.28;
        thumbBase.add(thumbP2Group);

        const thumbP2Len = 0.021;
        const thumbP2Geom = new THREE.CapsuleGeometry(0.0070, thumbP2Len, 8, 12);
        const thumbP2Obj = createOutlinedMesh(thumbP2Geom, matSkin, 0.0025);
        thumbP2Obj.group.position.y = -thumbP2Len * 0.5;
        thumbP2Group.add(thumbP2Obj.group);

        // 4. Four Articulated Fingers (Index, Middle, Ring, Pinky across wider arch)
        const fingerConfigs = [
            { name: 'index',  x: thumbSide * 0.024, len: 0.042, rad: 0.0066, curl: 0.22, splay: thumbSide * 0.07 },
            { name: 'middle', x: thumbSide * 0.008, len: 0.047, rad: 0.0068, curl: 0.25, splay: 0.00 },
            { name: 'ring',   x: thumbSide * -0.008, len: 0.043, rad: 0.0064, curl: 0.28, splay: thumbSide * -0.06 },
            { name: 'pinky',  x: thumbSide * -0.023, len: 0.033, rad: 0.0056, curl: 0.32, splay: thumbSide * -0.13 }
        ];

        const fingers = {};

        fingerConfigs.forEach(f => {
            const knuckle = new THREE.Group();
            const knuckleY = -palmH * 0.80 - (f.name === 'middle' ? 0.003 : (f.name === 'pinky' ? -0.004 : 0.0));
            knuckle.position.set(f.x, knuckleY, 0);
            knuckle.rotation.z = f.splay;
            knuckle.rotation.x = -f.curl;
            handGroup.add(knuckle);

            const p1Len = f.len * 0.46;
            const p1Geom = new THREE.CapsuleGeometry(f.rad, p1Len, 8, 12);
            const p1Obj = createOutlinedMesh(p1Geom, matSkin, 0.0025);
            p1Obj.group.position.y = -p1Len * 0.5;
            knuckle.add(p1Obj.group);

            const midJoint = new THREE.Group();
            midJoint.position.y = -p1Len;
            midJoint.rotation.x = -f.curl * 0.80;
            knuckle.add(midJoint);

            const p2Len = f.len * 0.32;
            const p2Geom = new THREE.CapsuleGeometry(f.rad * 0.90, p2Len, 8, 12);
            const p2Obj = createOutlinedMesh(p2Geom, matSkin, 0.0025);
            p2Obj.group.position.y = -p2Len * 0.5;
            midJoint.add(p2Obj.group);

            const tipJoint = new THREE.Group();
            tipJoint.position.y = -p2Len;
            tipJoint.rotation.x = -f.curl * 0.60;
            midJoint.add(tipJoint);

            const p3Len = f.len * 0.26;
            const p3Geom = new THREE.CapsuleGeometry(f.rad * 0.82, p3Len, 8, 12);
            const p3Obj = createOutlinedMesh(p3Geom, matSkin, 0.0025);
            p3Obj.group.position.y = -p3Len * 0.5;
            tipJoint.add(p3Obj.group);

            fingers[f.name] = { knuckle, midJoint, tipJoint };
        });

        return { handGroup, fingers, thumb: { thumbBase, thumbP2Group } };
    }

    function makeArm(isRight) {
        const shoulderJoint = new THREE.Group();
        const sign = isRight ? 1 : -1;
        shoulderJoint.position.set(sign * 0.27, 0, 0);
        shoulderGroup.add(shoulderJoint);

        // Upper arm stick
        const upperArmGeom = new THREE.CapsuleGeometry(armRadius, upperArmLen, 12, 16);
        const upperArmObj = createOutlinedMesh(upperArmGeom, matSkin, 0.005);
        upperArmObj.group.position.y = -upperArmLen * 0.5;
        shoulderJoint.add(upperArmObj.group);

        // T-Shirt Short Sleeve with Ribbed Cuff & Cap
        const sleeveLen = upperArmLen * 0.54;
        const sleeveGeom = new THREE.CylinderGeometry(0.078, 0.090, sleeveLen, 20);
        const sleeveObj = createOutlinedMesh(sleeveGeom, matShirt, 0.007);
        sleeveObj.group.position.y = -sleeveLen * 0.50;
        shoulderJoint.add(sleeveObj.group);

        const sleeveCapGeom = new THREE.SphereGeometry(0.080, 16, 16);
        sleeveCapGeom.scale(1.0, 0.70, 1.0);
        const sleeveCapObj = createOutlinedMesh(sleeveCapGeom, matShirt, 0.006);
        shoulderJoint.add(sleeveCapObj.group);

        const sleeveCuffGeom = new THREE.TorusGeometry(0.086, 0.012, 10, 20);
        sleeveCuffGeom.rotateX(Math.PI / 2);
        const sleeveCuffObj = createOutlinedMesh(sleeveCuffGeom, matShirt, 0.006);
        sleeveCuffObj.group.position.y = -sleeveLen;
        shoulderJoint.add(sleeveCuffObj.group);

        const elbowJoint = new THREE.Group();
        elbowJoint.position.y = -upperArmLen;
        shoulderJoint.add(elbowJoint);

        // Forearm stick
        const foreArmGeom = new THREE.CapsuleGeometry(armRadius * 0.9, foreArmLen, 12, 16);
        const foreArmObj = createOutlinedMesh(foreArmGeom, matSkin, 0.005);
        foreArmObj.group.position.y = -foreArmLen * 0.5;
        elbowJoint.add(foreArmObj.group);

        const wristJoint = new THREE.Group();
        wristJoint.position.y = -foreArmLen;
        elbowJoint.add(wristJoint);

        const hand = makeHumanHand(isRight);
        wristJoint.add(hand.handGroup);

        return { shoulderJoint, upperArm: upperArmObj.group, sleeve: sleeveObj.group, elbowJoint, foreArm: foreArmObj.group, wristJoint, hand: hand.handGroup };
    }

    const leftArm = makeArm(false);
    const rightArm = makeArm(true);

    // Legs & White Sneakers (Exact Proportions: 0.56 / 0.58 / 0.025)
    const thighLen = 0.56;
    const shinLen = 0.58;
    const legRadius = 0.025;

    function makeSneaker(isRight) {
        const shoeGroup = new THREE.Group();
        shoeGroup.name = isRight ? 'right_sneaker' : 'left_sneaker';

        // 1. Thick White Midsole (Crisp outlined platform)
        const soleGeom = new THREE.BoxGeometry(0.155, 0.045, 0.30);
        const soleObj = createOutlinedMesh(soleGeom, matShoes, 0.006);
        soleObj.group.position.set(0, 0.022, 0.04);
        shoeGroup.add(soleObj.group);

        // 2. Black Rubber Outsole Tread Line (Bottom rim)
        const outsoleGeom = new THREE.BoxGeometry(0.158, 0.012, 0.304);
        const outsole = new THREE.Mesh(outsoleGeom, matInk);
        outsole.position.set(0, 0.006, 0.04);
        shoeGroup.add(outsole);

        // 3. Curved Toe Box / Bumper (Smooth rounded cartoon front with toe-spring)
        const toeGeom = new THREE.SphereGeometry(0.078, 16, 16);
        toeGeom.scale(1.0, 0.55, 1.25);
        const toeObj = createOutlinedMesh(toeGeom, matShoes, 0.006);
        toeObj.group.position.set(0, 0.045, 0.12);
        shoeGroup.add(toeObj.group);

        // 4. Main Upper Body (Foot Bridge)
        const upperGeom = new THREE.BoxGeometry(0.142, 0.085, 0.20);
        const upperObj = createOutlinedMesh(upperGeom, matShoes, 0.006);
        upperObj.group.position.set(0, 0.070, 0.01);
        shoeGroup.add(upperObj.group);

        // 5. Raised Padded Ankle Collar (Smooth connection around the skin leg)
        const collarGeom = new THREE.TorusGeometry(0.065, 0.014, 10, 20);
        collarGeom.rotateX(Math.PI / 2);
        collarGeom.scale(1.0, 1.15, 1.0);
        const collarObj = createOutlinedMesh(collarGeom, matShoes, 0.005);
        collarObj.group.position.set(0, 0.115, -0.01);
        shoeGroup.add(collarObj.group);

        // 6. Sneaker Tongue (Angled front flap)
        const tongueGeom = new THREE.BoxGeometry(0.085, 0.065, 0.016);
        tongueGeom.rotateX(-0.35);
        const tongueObj = createOutlinedMesh(tongueGeom, matShoes, 0.005);
        tongueObj.group.position.set(0, 0.105, 0.065);
        shoeGroup.add(tongueObj.group);

        // 7. Heel Counter / Pull Tab (Back of sneaker)
        const heelTabGeom = new THREE.BoxGeometry(0.040, 0.035, 0.015);
        const heelTab = new THREE.Mesh(heelTabGeom, matInk);
        heelTab.position.set(0, 0.115, -0.095);
        shoeGroup.add(heelTab);

        // 8. Crisp Black Lace Bars
        for (let l = 0; l < 3; l++) {
            const laceGeom = new THREE.BoxGeometry(0.095 - l * 0.010, 0.010, 0.020);
            const lace = new THREE.Mesh(laceGeom, matInk);
            lace.position.set(0, 0.092 + l * 0.014, 0.035 + l * 0.032);
            lace.rotation.x = -0.25;
            shoeGroup.add(lace);
        }

        // 9. Side Accent Wave / Panel Stripe
        [-1, 1].forEach(side => {
            const stripeGeom = new THREE.BoxGeometry(0.008, 0.014, 0.12);
            const stripe = new THREE.Mesh(stripeGeom, matInk);
            stripe.position.set(side * 0.075, 0.062, 0.01);
            stripe.rotation.z = side * 0.08;
            shoeGroup.add(stripe);
        });

        return shoeGroup;
    }

    function makeLeg(isRight) {
        const hipJoint = new THREE.Group();
        const sign = isRight ? 1 : -1;
        hipJoint.position.set(sign * 0.14, 0, 0);
        pelvis.add(hipJoint);

        // Thigh Stick
        const thighGeom = new THREE.CapsuleGeometry(legRadius, thighLen, 12, 16);
        const thighObj = createOutlinedMesh(thighGeom, matSkin, 0.005);
        thighObj.group.position.y = -thighLen * 0.5;
        hipJoint.add(thighObj.group);

        // Shorts leg
        const shortsLegGeom = new THREE.CylinderGeometry(0.095, 0.105, thighLen * 0.65, 16);
        const shortsLegObj = createOutlinedMesh(shortsLegGeom, matShorts, 0.006);
        shortsLegObj.group.position.y = -thighLen * 0.32;
        hipJoint.add(shortsLegObj.group);

        const shortsCuffGeom = new THREE.TorusGeometry(0.105, 0.016, 10, 20);
        shortsCuffGeom.rotateX(Math.PI / 2);
        const shortsCuffObj = createOutlinedMesh(shortsCuffGeom, matShorts, 0.006);
        shortsCuffObj.group.position.y = -thighLen * 0.65;
        hipJoint.add(shortsCuffObj.group);

        const kneeJoint = new THREE.Group();
        kneeJoint.position.y = -thighLen;
        hipJoint.add(kneeJoint);

        // Shin Stick
        const shinGeom = new THREE.CapsuleGeometry(legRadius * 0.9, shinLen, 12, 16);
        const shinObj = createOutlinedMesh(shinGeom, matSkin, 0.005);
        shinObj.group.position.y = -shinLen * 0.5;
        kneeJoint.add(shinObj.group);

        const footJoint = new THREE.Group();
        footJoint.position.y = -shinLen;
        kneeJoint.add(footJoint);

        const sneaker = makeSneaker(isRight);
        footJoint.add(sneaker);

        return { hipJoint, thigh: thighObj.group, shortsLeg: shortsLegObj.group, shortsCuff: shortsCuffObj.group, kneeJoint, shin: shinObj.group, footJoint, sneaker };
    }

    const leftLeg = makeLeg(false);
    const rightLeg = makeLeg(true);

    function updateEyebrows(expression = 'smug', speechInflection = 0) {
        let ptsL, ptsR;
        if (expression === 'smug') {
            ptsL = [[-0.026, 0.142 + speechInflection], [-0.090, 0.182 + speechInflection], [-0.155, 0.135 + speechInflection]];
            ptsR = [[0.026, 0.105 - speechInflection], [0.090, 0.125 - speechInflection], [0.155, 0.098 - speechInflection]];
        } else if (expression === 'thinking') {
            ptsL = [[-0.022, 0.180 + speechInflection], [-0.092, 0.230 + speechInflection], [-0.168, 0.165 + speechInflection]];
            ptsR = [[0.020, 0.075 - speechInflection], [0.088, 0.092 - speechInflection], [0.158, 0.076 - speechInflection]];
        } else if (expression === 'happy') {
            ptsL = [[-0.022, 0.168 + speechInflection], [-0.090, 0.210 + speechInflection], [-0.162, 0.158 + speechInflection]];
            ptsR = [[0.022, 0.168 + speechInflection], [0.090, 0.210 + speechInflection], [0.162, 0.158 + speechInflection]];
        } else if (expression === 'laughing') {
            ptsL = [[-0.022, 0.182 + speechInflection], [-0.090, 0.228 + speechInflection], [-0.162, 0.170 + speechInflection]];
            ptsR = [[0.022, 0.182 + speechInflection], [0.090, 0.228 + speechInflection], [0.162, 0.170 + speechInflection]];
        } else if (expression === 'shocked') {
            ptsL = [[-0.020, 0.210 + speechInflection], [-0.090, 0.255 + speechInflection], [-0.168, 0.205 + speechInflection]];
            ptsR = [[0.020, 0.210 + speechInflection], [0.090, 0.255 + speechInflection], [0.168, 0.205 + speechInflection]];
        } else if (expression === 'curious') {
            ptsL = [[-0.020, 0.195 + speechInflection], [-0.090, 0.242 + speechInflection], [-0.168, 0.180 + speechInflection]];
            ptsR = [[0.024, 0.100 - speechInflection], [0.088, 0.122 - speechInflection], [0.155, 0.095 - speechInflection]];
        } else if (expression === 'angry') {
            ptsL = [[-0.024, 0.085 + speechInflection], [-0.090, 0.145 + speechInflection], [-0.165, 0.185 + speechInflection]];
            ptsR = [[0.024, 0.085 + speechInflection], [0.090, 0.145 + speechInflection], [0.165, 0.185 + speechInflection]];
        } else {
            ptsL = [[-0.024, 0.138 + speechInflection], [-0.090, 0.172 + speechInflection], [-0.160, 0.135 + speechInflection]];
            ptsR = [[0.024, 0.138 + speechInflection], [0.090, 0.172 + speechInflection], [0.160, 0.135 + speechInflection]];
        }
        updateTubeCurve(lBrowMesh, ptsL, 0.013);
        updateTubeCurve(rBrowMesh, ptsR, 0.013);
    }

    const stickman = {
        characterId,
        characterName: preset.name,
        root,
        pelvis,
        torso,
        shirtGroup,
        shoulderGroup,
        headGroup,
        headMesh: headMeshObj.mainMesh,
        hairRoot,
        leftEye,
        rightEye,
        lBrowMesh,
        rBrowMesh,
        mouthCanvas,
        mouthCtx,
        mouthTex,
        mouthMesh,
        emoteGroup,
        emblem: shirtEmblem,
        piEmblem: shirtEmblem,
        skirtGroup,
        leftArm,
        rightArm,
        leftLeg,
        rightLeg,
        matBody,
        matSkin,
        matShirt,
        matShorts,
        matShoes,
        matWhite,
        matInk,
        setHairstyle,
        setBottomType(type = 'shorts', isSeated = false) {
            const isSkirt = (type === 'skirt');
            if (skirtGroup) skirtGroup.visible = isSkirt;
            if (standingSkirt) standingSkirt.visible = isSkirt && !isSeated;
            if (seatedSkirt) seatedSkirt.visible = isSkirt && isSeated;
            if (shortsPelvisObj && shortsPelvisObj.group) shortsPelvisObj.group.visible = !isSkirt;
            if (leftLeg) {
                if (leftLeg.shortsLeg) leftLeg.shortsLeg.visible = !isSkirt;
                if (leftLeg.shortsCuff) leftLeg.shortsCuff.visible = !isSkirt;
            }
            if (rightLeg) {
                if (rightLeg.shortsLeg) rightLeg.shortsLeg.visible = !isSkirt;
                if (rightLeg.shortsCuff) rightLeg.shortsCuff.visible = !isSkirt;
            }
        },
        setSeated(isSeated = false) {
            const isSkirt = (stickman.bottomType === 'skirt' || stickman.bottomType === 'dress');
            if (standingSkirt) standingSkirt.visible = isSkirt && !isSeated;
            if (seatedSkirt) seatedSkirt.visible = isSkirt && isSeated;
            if (shortsPelvisObj && shortsPelvisObj.group) shortsPelvisObj.group.visible = !isSkirt;
            if (leftLeg) {
                if (leftLeg.shortsLeg) leftLeg.shortsLeg.visible = !isSkirt;
                if (leftLeg.shortsCuff) leftLeg.shortsCuff.visible = !isSkirt;
            }
            if (rightLeg) {
                if (rightLeg.shortsLeg) rightLeg.shortsLeg.visible = !isSkirt;
                if (rightLeg.shortsCuff) rightLeg.shortsCuff.visible = !isSkirt;
            }
        },
        setEyelashes(bool) {
            hasEyelashes = Boolean(bool);
        },
        setShirtColor(col) {
            matShirt.color.set(col);
            const isDark = (matShirt.color.getHex() === 0x18181b || matShirt.color.getHex() === 0x1c1e22 || matShirt.color.getHex() === 0x0f172a);
            shirtEmblem.renderEmblem(undefined, isDark);
        },
        setShortsColor(col) { matShorts.color.set(col); },
        setSkinColor(col) { matSkin.color.set(col); },
        setEmblem(emblemType, isDark) {
            if (isDark === undefined) {
                isDark = (matShirt.color.getHex() === 0x18181b || matShirt.color.getHex() === 0x1c1e22 || matShirt.color.getHex() === 0x0f172a);
            }
            shirtEmblem.renderEmblem(emblemType, isDark);
        },
        setCharacter(idOrConfig) {
            const char = typeof idOrConfig === 'string' ? getCharacter(idOrConfig) : { ...CHARACTER_REGISTRY.pi, ...idOrConfig };
            stickman.characterId = char.id || 'custom';
            stickman.characterName = char.name || 'Character';
            stickman.setShirtColor((char.shirtColor !== undefined) ? char.shirtColor : 0xf59e0b);
            stickman.setShortsColor((char.shortsColor !== undefined) ? char.shortsColor : 0x3d6b99);
            stickman.setSkinColor((char.skinColor !== undefined) ? char.skinColor : 0xf6cbb0);
            stickman.setHairstyle(char.hairStyle || 'none');
            stickman.setBottomType(char.bottomType || 'shorts');
            stickman.setEyelashes(Boolean(char.hasEyelashes));
            stickman.setEmblem(char.emblem || 'pi');
            return char;
        },
        updateTubeCurve,
        updateEyebrows,
        renderEyeCanvas
    };

    // Synchronize initial character config and render initial face
    stickman.setCharacter(preset);
    stickman.renderEyeCanvas(stickman.leftEye, 0, 0, 0, 'smug');
    stickman.renderEyeCanvas(stickman.rightEye, 0, 0, 0, 'smug');
    renderStickmanMouth(stickman.mouthCtx, 'smug', 'REST', false);
    stickman.mouthTex.needsUpdate = true;

    return stickman;
}

export function drawWhiteboardStickman2D(ctx, {
    x = 400,
    y = 500,
    scale = 1.0,
    pose = 'hands_in_pockets',
    expression = 'smug',
    viseme = 'REST',
    hairStyle = 'three_tufts',
    shirt = 'black',
    shorts = 'denim',
    shoes = 'white',
    inkColor = '#18181b',
    fillColor = '#ffffff',
    time = 0,
    blinkAmt = 0,
    gazeX = 0,
    gazeY = 0,
    weightShift = 0.6
}) {
    ctx.save();
    ctx.translate(x, y);

    const groundY = 0;
    const pelvisY = -240 * scale + Math.sin(time * 1.8) * 2 * scale;
    const pelvisX = weightShift * 8 * scale;
    const hipTilt = weightShift * 0.06;

    const torsoLen = 145 * scale;
    const shoulderY = pelvisY - torsoLen;
    const shoulderX = pelvisX - weightShift * 5 * scale;

    const headRadius = 46 * scale;
    const headY = shoulderY - headRadius - 28 * scale;
    const headX = shoulderX + 4 * scale;

    const strokeW = 6.5 * scale;

    // Ground Shadow Drop
    ctx.beginPath();
    ctx.ellipse(weightShift * 4 * scale, groundY, 110 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fill();

    // Joints
    let lHip = { x: pelvisX - 22 * scale, y: pelvisY + hipTilt * 15 * scale };
    let rHip = { x: pelvisX + 22 * scale, y: pelvisY - hipTilt * 15 * scale };
    let lKnee = { x: lHip.x - 4 * scale, y: lHip.y + 115 * scale };
    let rKnee = { x: rHip.x + 4 * scale, y: rHip.y + 115 * scale };
    let lFoot = { x: lKnee.x - 8 * scale, y: groundY };
    let rFoot = { x: rKnee.x + 8 * scale, y: groundY };

    let lShoulder = { x: shoulderX - 34 * scale, y: shoulderY };
    let rShoulder = { x: shoulderX + 34 * scale, y: shoulderY };
    let lElbow = { x: lShoulder.x - 26 * scale, y: lShoulder.y + 62 * scale };
    let rElbow = { x: rShoulder.x + 26 * scale, y: rShoulder.y + 62 * scale };
    let lHand = { x: lHip.x + 6 * scale, y: lHip.y + 32 * scale };
    let rHand = { x: rHip.x - 6 * scale, y: rHip.y + 32 * scale };

    // Line Limbs
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = strokeW;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Legs
    ctx.beginPath();
    ctx.moveTo(lHip.x, lHip.y); ctx.lineTo(lKnee.x, lKnee.y); ctx.lineTo(lFoot.x, lFoot.y);
    ctx.moveTo(rHip.x, rHip.y); ctx.lineTo(rKnee.x, rKnee.y); ctx.lineTo(rFoot.x, rFoot.y);
    ctx.stroke();

    // Sneakers
    if (shoes !== 'none') {
        const shoeCol = shoes === 'white' ? fillColor : '#18181b';
        [lFoot, rFoot].forEach(ft => {
            ctx.beginPath();
            ctx.roundRect(ft.x - 16 * scale, ft.y - 12 * scale, 34 * scale, 12 * scale, [4 * scale, 8 * scale, 2 * scale, 2 * scale]);
            ctx.fillStyle = shoeCol;
            ctx.fill();
            ctx.stroke();
        });
    }

    // Denim Shorts
    if (shorts !== 'none') {
        ctx.beginPath();
        ctx.moveTo(pelvisX - 32 * scale, pelvisY - 14 * scale);
        ctx.lineTo(pelvisX + 32 * scale, pelvisY - 14 * scale);
        ctx.lineTo(rHip.x + 22 * scale, pelvisY + 54 * scale);
        ctx.lineTo(rHip.x - 4 * scale, pelvisY + 54 * scale);
        ctx.lineTo(pelvisX, pelvisY + 22 * scale);
        ctx.lineTo(lHip.x + 4 * scale, pelvisY + 54 * scale);
        ctx.lineTo(lHip.x - 22 * scale, pelvisY + 54 * scale);
        ctx.closePath();
        ctx.fillStyle = '#3d6b99';
        ctx.fill();
        ctx.stroke();
    }

    // Torso Spine
    ctx.beginPath();
    ctx.moveTo(pelvisX, pelvisY);
    ctx.lineTo(shoulderX, shoulderY);
    ctx.stroke();

    // T-Shirt
    if (shirt !== 'none') {
        ctx.beginPath();
        ctx.moveTo(shoulderX - 32 * scale, shoulderY - 8 * scale);
        ctx.lineTo(shoulderX + 32 * scale, shoulderY - 8 * scale);
        ctx.lineTo(shoulderX + 36 * scale, pelvisY - 12 * scale);
        ctx.lineTo(shoulderX - 36 * scale, pelvisY - 12 * scale);
        ctx.closePath();
        let sCol = '#f59e0b'; // Warm Amber Yellow
        if (shirt === 'black') sCol = '#18181b';
        else if (shirt === 'white') sCol = '#f8fafc';
        else if (shirt === 'orange') sCol = '#f97316';
        else if (shirt === 'blue') sCol = '#2563eb';
        ctx.fillStyle = sCol;
        ctx.fill();
        ctx.stroke();

        // Mathematical Pi (π) Symbol on 2D T-Shirt
        const piY = shoulderY + torsoLen * 0.48;
        const piX = shoulderX;
        ctx.save();
        ctx.strokeStyle = (shirt === 'black') ? '#ffffff' : '#18181b';
        ctx.lineWidth = 3.2 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        // Crossbar
        ctx.moveTo(piX - 11 * scale, piY - 7 * scale);
        ctx.lineTo(piX + 11 * scale, piY - 7 * scale);
        // Left leg
        ctx.moveTo(piX - 5 * scale, piY - 7 * scale);
        ctx.lineTo(piX - 7 * scale, piY + 7 * scale);
        // Right leg
        ctx.moveTo(piX + 4 * scale, piY - 7 * scale);
        ctx.lineTo(piX + 5 * scale, piY + 7 * scale);
        ctx.stroke();
        ctx.restore();
    }

    // Arms
    ctx.beginPath();
    ctx.moveTo(lShoulder.x, lShoulder.y); ctx.lineTo(lElbow.x, lElbow.y); ctx.lineTo(lHand.x, lHand.y);
    ctx.moveTo(rShoulder.x, rShoulder.y); ctx.lineTo(rElbow.x, rElbow.y); ctx.lineTo(rHand.x, rHand.y);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.ellipse(headX, headY, headRadius * 0.96, headRadius * 1.08, -0.05, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 4.5 * scale;
    ctx.stroke();

    // 3 Hair Tufts
    if (hairStyle === 'three_tufts') {
        const topHeadY = headY - headRadius * 1.05;
        ctx.beginPath();
        ctx.moveTo(headX + 2 * scale, topHeadY + 2 * scale);
        ctx.quadraticCurveTo(headX + 4 * scale, topHeadY - 24 * scale, headX + 12 * scale, topHeadY - 42 * scale);
        ctx.moveTo(headX - 14 * scale, topHeadY + 4 * scale);
        ctx.quadraticCurveTo(headX - 26 * scale, topHeadY - 18 * scale, headX - 44 * scale, topHeadY - 28 * scale);
        ctx.moveTo(headX + 16 * scale, topHeadY + 4 * scale);
        ctx.quadraticCurveTo(headX + 32 * scale, topHeadY - 18 * scale, headX + 48 * scale, topHeadY - 28 * scale);
        ctx.stroke();
    }

    // Eyes (White Sclera with Black Pupil & Sparkles)
    const eyeY = headY - 4 * scale;
    const lEyeX = headX - 18 * scale;
    const rEyeX = headX + 18 * scale;
    const blinkH = Math.max(0.1, 1.0 - blinkAmt);

    [lEyeX, rEyeX].forEach((ex, idx) => {
        const isR = idx === 1;
        const rScale = (isR && expression === 'smug') ? 0.92 : 1.0;
        
        // 1. White Eye Background (Sclera)
        ctx.beginPath();
        ctx.ellipse(
            ex,
            eyeY,
            10.5 * scale * rScale,
            (15.5 * scale * rScale) * blinkH,
            0, 0, Math.PI * 2
        );
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2.5 * scale;
        ctx.strokeStyle = inkColor;
        ctx.stroke();

        // 2. Black Pupil inside White Background
        if (blinkH > 0.25) {
            const px = ex + gazeX * 2.2 * scale;
            const py = eyeY + gazeY * 1.8 * scale;
            ctx.beginPath();
            ctx.ellipse(
                px,
                py,
                6.2 * scale * rScale,
                (8.2 * scale * rScale) * blinkH,
                0, 0, Math.PI * 2
            );
            ctx.fillStyle = inkColor;
            ctx.fill();

            // 3. Specular Catchlights
            ctx.beginPath();
            ctx.arc(px + 2.2 * scale, py - 2.8 * scale, 2.0 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(px - 1.8 * scale, py + 2.0 * scale, 1.0 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
    });

    // Eyebrows
    if (expression === 'smug' || pose === 'hands_in_pockets') {
        ctx.beginPath();
        ctx.moveTo(headX - 34 * scale, eyeY - 26 * scale);
        ctx.quadraticCurveTo(headX - 22 * scale, eyeY - 42 * scale, headX - 8 * scale, eyeY - 28 * scale);
        ctx.moveTo(headX + 8 * scale, eyeY - 22 * scale);
        ctx.quadraticCurveTo(headX + 22 * scale, eyeY - 28 * scale, headX + 34 * scale, eyeY - 20 * scale);
        ctx.stroke();
    }

    // Bold Expressive Smirk Mouth (Lowered for facial balance)
    const mouthY = headY + 28 * scale;
    ctx.beginPath();
    ctx.moveTo(headX - 22 * scale, mouthY + 5 * scale);
    ctx.quadraticCurveTo(headX + 4 * scale, mouthY + 8 * scale, headX + 32 * scale, mouthY - 10 * scale);
    ctx.lineWidth = 4.5 * scale;
    ctx.stroke();

    // Corner cheek tick
    ctx.beginPath();
    ctx.moveTo(headX + 30 * scale, mouthY - 8 * scale);
    ctx.lineTo(headX + 35 * scale, mouthY - 14 * scale);
    ctx.lineWidth = 3.5 * scale;
    ctx.stroke();

    ctx.restore();
}

/**
 * 3D Locomotion & Kinematics Engine for 3D Stickman Rig
 * Applies BVH-style mathematical gait cycles (walk, run, sprint, jump, dance, dunk)
 */
export function applyLocomotionPose(stickman, pose, time, delta, options = {}) {
    const {
        breatheAmp = 1.0,
        gestureSpeed = 1.0,
        locomotionSpeed = 1.0,
        strideLength = 1.0,
        isTreadmill = true
    } = options;

    const sp = gestureSpeed * locomotionSpeed;
    const stride = strideLength;
    const breath = Math.sin(time * 1.8 * sp) * 0.012 * breatheAmp;

    let tPelvisY = 1.25 + breath * 0.5;
    let tPelvisRot = [0, 0, 0];
    let tTorsoRot = [0, 0, 0];
    let tHeadRot = [0, 0, 0];

    let tRShoulder = [0, 0, 0.15];
    let tRElbow = [-0.15, 0, 0];
    let tLShoulder = [0, 0, -0.15];
    let tLElbow = [-0.15, 0, 0];

    let tRHip = [0, 0, 0];
    let tRKnee = [0, 0, 0];
    let tRFoot = [0, 0, 0];

    let tLHip = [0, 0, 0];
    let tLKnee = [0, 0, 0];
    let tLFoot = [0, 0, 0];

    // 1. BVH NATURAL BIOMECHANICAL WALK CYCLE
    if (pose === 'walk') {
        const wFreq = 4.0 * sp;
        const phi = (time * wFreq) % (Math.PI * 2);

        // Pelvis double-bounce (dips on heel-strike/contact, rises at mid-stance)
        const wBounce = -Math.cos(phi * 2) * 0.038;
        tPelvisY = 1.248 + wBounce;

        // Lateral weight sway over the supporting foot
        const wSway = Math.sin(phi) * 0.032;
        tPelvisRot = [0.03, Math.sin(phi) * 0.075, wSway];

        // Torso and spine counter-rotation
        tTorsoRot = [0.04, -Math.sin(phi) * 0.085, -wSway * 0.85];
        tHeadRot = [-0.02, Math.sin(phi) * 0.020, 0];

        const phiL = phi;
        const phiR = (phi + Math.PI) % (Math.PI * 2);

        function computeWalkLeg(phaseAngle) {
            const hip = -Math.cos(phaseAngle) * 0.48 * stride;
            let knee = 0.05;
            if (phaseAngle < Math.PI) {
                knee += Math.sin(phaseAngle) * 0.16;
            } else {
                knee += Math.sin(phaseAngle - Math.PI) * 0.82 * stride;
            }

            let foot = 0;
            if (phaseAngle < Math.PI) {
                foot = -Math.cos(phaseAngle) * 0.36;
            } else {
                foot = -Math.sin(phaseAngle - Math.PI) * 0.18;
            }
            return { hip, knee, foot };
        }

        const leftLegMotion = computeWalkLeg(phiL);
        const rightLegMotion = computeWalkLeg(phiR);

        tLHip = [leftLegMotion.hip, 0, -0.02];
        tLKnee = [leftLegMotion.knee, 0, 0];
        tLFoot = [leftLegMotion.foot, 0, 0];

        tRHip = [rightLegMotion.hip, 0, 0.02];
        tRKnee = [rightLegMotion.knee, 0, 0];
        tRFoot = [rightLegMotion.foot, 0, 0];

        const lArmPitch = -leftLegMotion.hip * 0.88;
        const rArmPitch = -rightLegMotion.hip * 0.88;

        const lElbowBend = -0.28 - Math.max(0, -lArmPitch) * 0.55;
        const rElbowBend = -0.28 - Math.max(0, -rArmPitch) * 0.55;

        tLShoulder = [lArmPitch, 0, -0.14];
        tRShoulder = [rArmPitch, 0, 0.14];
        tLElbow = [lElbowBend, 0, 0];
        tRElbow = [rElbowBend, 0, 0];

    // 2. BVH ATHLETIC RUN CYCLE (True Flight Phase & Heel-Kick Dynamics)
    } else if (pose === 'run') {
        const rFreq = 7.6 * sp;
        const rPhi = (time * rFreq) % (Math.PI * 2);

        // Prominent Double-Float Flight Phase (Pelvis leaps in air, dips deep on foot strike)
        const rBounce = -Math.cos(rPhi * 2) * 0.068;
        tPelvisY = 1.268 + rBounce;

        // Dynamic athletic posture (controlled 5-6 deg lean with energetic hip twist)
        tPelvisRot = [0.05, Math.sin(rPhi) * 0.11, Math.sin(rPhi) * 0.03];
        tTorsoRot = [0.07, -Math.sin(rPhi) * 0.13, -Math.sin(rPhi) * 0.025];
        tHeadRot = [-0.04, Math.sin(rPhi) * 0.02, 0];

        const rPhiL = rPhi;
        const rPhiR = (rPhi + Math.PI) % (Math.PI * 2);

        function computeRunLeg(theta) {
            let hip = 0;
            let knee = 0.08;
            let foot = 0;

            if (theta < 0.75 * Math.PI) {
                const t = theta / (0.75 * Math.PI);
                hip = (-0.56 + t * 1.26) * stride;
                const cushion = Math.sin(t * Math.PI);
                knee = 0.12 + cushion * 0.68;
                foot = -0.22 + t * 0.82;
            } else {
                const t = (theta - 0.75 * Math.PI) / (1.25 * Math.PI);
                hip = (0.70 * Math.cos(t * Math.PI) - 0.12 * Math.sin(t * Math.PI)) * stride;
                if (t < 0.45) {
                    const kick = Math.sin((t / 0.45) * Math.PI * 0.5);
                    knee = 0.14 + kick * 1.92 * stride;
                } else {
                    const drop = Math.cos(((t - 0.45) / 0.55) * Math.PI * 0.5);
                    knee = 0.14 + drop * 1.92 * stride;
                }
                foot = 0.35 * (1.0 - t) - 0.22 * t;
            }
            return { hip, knee, foot };
        }

        const leftRun = computeRunLeg(rPhiL);
        const rightRun = computeRunLeg(rPhiR);

        tLHip = [leftRun.hip, 0, -0.025];
        tLKnee = [leftRun.knee, 0, 0];
        tLFoot = [leftRun.foot, 0, 0];

        tRHip = [rightRun.hip, 0, 0.025];
        tRKnee = [rightRun.knee, 0, 0];
        tRFoot = [rightRun.foot, 0, 0];

        const lRunArm = -leftRun.hip * 0.82;
        const rRunArm = -rightRun.hip * 0.82;

        const lElbow = -1.52 - Math.max(0, -lRunArm) * 0.22;
        const rElbow = -1.52 - Math.max(0, -rRunArm) * 0.22;

        tLShoulder = [lRunArm, 0.12, -0.18];
        tRShoulder = [rRunArm, -0.12, 0.18];
        tLElbow = [lElbow, 0, 0];
        tRElbow = [rElbow, 0, 0];

    // 3. TURBO SPRINT (Maximum Power & High Knee Drive)
    } else if (pose === 'sprint') {
        const sFreq = 9.8 * sp;
        const sPhi = (time * sFreq) % (Math.PI * 2);

        const sBounce = -Math.cos(sPhi * 2) * 0.085;
        tPelvisY = 1.275 + sBounce;

        tPelvisRot = [0.08, Math.sin(sPhi) * 0.14, 0];
        tTorsoRot = [0.11, -Math.sin(sPhi) * 0.16, 0];
        tHeadRot = [-0.07, 0, 0];

        const sPhiL = sPhi;
        const sPhiR = (sPhi + Math.PI) % (Math.PI * 2);

        function computeSprintLeg(theta) {
            let hip = 0;
            let knee = 0.10;
            let foot = 0;

            if (theta < 0.70 * Math.PI) {
                const t = theta / (0.70 * Math.PI);
                hip = (-0.72 + t * 1.55) * stride;
                knee = 0.12 + Math.sin(t * Math.PI) * 0.80;
                foot = -0.30 + t * 1.0;
            } else {
                const t = (theta - 0.70 * Math.PI) / (1.30 * Math.PI);
                hip = (0.83 * Math.cos(t * Math.PI) - 0.18 * Math.sin(t * Math.PI)) * stride;
                if (t < 0.45) {
                    knee = 0.15 + Math.sin((t / 0.45) * Math.PI * 0.5) * 2.15 * stride;
                } else {
                    knee = 0.15 + Math.cos(((t - 0.45) / 0.55) * Math.PI * 0.5) * 2.15 * stride;
                }
                foot = 0.40 * (1.0 - t) - 0.30 * t;
            }
            return { hip, knee, foot };
        }

        const leftSprint = computeSprintLeg(sPhiL);
        const rightSprint = computeSprintLeg(sPhiR);

        tLHip = [leftSprint.hip, 0, -0.035];
        tLKnee = [leftSprint.knee, 0, 0];
        tLFoot = [leftSprint.foot, 0, 0];

        tRHip = [rightSprint.hip, 0, 0.035];
        tRKnee = [rightSprint.knee, 0, 0];
        tRFoot = [rightSprint.foot, 0, 0];

        const lSprintArm = -leftSprint.hip * 0.95;
        const rSprintArm = -rightSprint.hip * 0.95;

        tLShoulder = [lSprintArm, 0.15, -0.22];
        tRShoulder = [rSprintArm, -0.15, 0.22];
        tLElbow = [-1.62, 0, 0];
        tRElbow = [-1.62, 0, 0];

    // 4. PARKOUR JUMP & VAULT
    } else if (pose === 'jump') {
        const jFreq = 1.6 * sp;
        const jCycle = (time * jFreq) % (Math.PI * 2);
        let jY = 0, jTorso = 0, jKnee = 0, jHip = 0, jArm = 0;

        if (jCycle < 1.1) {
            const prep = Math.sin((jCycle / 1.1) * Math.PI);
            jY = -0.32 * prep;
            jTorso = 0.25 * prep;
            jHip = -0.65 * prep;
            jKnee = 1.25 * prep;
            jArm = 0.45 * prep;
        } else if (jCycle < 3.8) {
            const flight = (jCycle - 1.1) / 2.7;
            const arc = Math.sin(flight * Math.PI);
            jY = arc * 0.65;
            jTorso = -0.12 * arc;
            jHip = 0.35 * arc;
            jKnee = 0.85 * arc;
            jArm = -2.1 * arc;
        } else {
            const land = Math.sin(((jCycle - 3.8) / (Math.PI * 2 - 3.8)) * Math.PI);
            jY = -0.25 * land;
            jTorso = 0.20 * land;
            jHip = -0.55 * land;
            jKnee = 1.05 * land;
            jArm = 0.25 * land;
        }

        tPelvisY = 1.25 + jY;
        tTorsoRot = [jTorso, 0, 0];
        tLHip = [jHip, 0, -0.05];
        tLKnee = [jKnee, 0, 0];
        tRHip = [jHip, 0, 0.05];
        tRKnee = [jKnee, 0, 0];
        tLShoulder = [jArm, 0, -0.20];
        tRShoulder = [jArm, 0, 0.20];
        tLElbow = [-0.65, 0, 0];
        tRElbow = [-0.65, 0, 0];

    // 5. GROOVE DANCE
    } else if (pose === 'dance') {
        const dFreq = 3.2 * sp;
        const dPhase = time * dFreq;
        const dBeat = Math.abs(Math.sin(dPhase)) * 0.06;

        tPelvisY = 1.25 - dBeat;
        tPelvisRot = [0, Math.sin(dPhase * 0.5) * 0.25, Math.sin(dPhase) * 0.08];
        tTorsoRot = [0, -Math.sin(dPhase * 0.5) * 0.22, -Math.sin(dPhase) * 0.07];
        tHeadRot = [-dBeat * 2, 0, Math.sin(dPhase) * 0.12];

        tLHip = [Math.sin(dPhase) * 0.18, 0, -0.06];
        tLKnee = [dBeat * 4, 0, 0];
        tRHip = [-Math.sin(dPhase) * 0.18, 0, 0.06];
        tRKnee = [dBeat * 4, 0, 0];

        tLShoulder = [-1.4 + Math.sin(dPhase) * 0.45, 0, -0.45 + Math.cos(dPhase) * 0.25];
        tRShoulder = [-1.4 - Math.sin(dPhase) * 0.45, 0, 0.45 - Math.cos(dPhase) * 0.25];
        tLElbow = [-1.35 + Math.sin(dPhase * 2) * 0.35, 0, 0];
        tRElbow = [-1.35 - Math.sin(dPhase * 2) * 0.35, 0, 0];

    // 6. BASKETBALL SLAM DUNK
    } else if (pose === 'dunk') {
        const dCycle = (time * 1.4 * sp) % (Math.PI * 2);
        let dunkY = 0, dunkArm = 0;
        if (dCycle < 3.2) {
            const arc = Math.sin((dCycle / 3.2) * Math.PI);
            dunkY = arc * 0.72;
            dunkArm = -2.6 * arc;
            tLHip = [0.45 * arc, 0, -0.1];
            tLKnee = [1.1 * arc, 0, 0];
            tRHip = [0.25 * arc, 0, 0.1];
            tRKnee = [0.9 * arc, 0, 0];
        } else {
            dunkY = -0.15 * Math.sin(((dCycle - 3.2) / (Math.PI * 2 - 3.2)) * Math.PI);
        }
        tPelvisY = 1.25 + dunkY;
        tRShoulder = [dunkArm, 0, 0.25];
        tRElbow = [-0.65, 0, 0];
        tLShoulder = [dunkArm * 0.5, 0, -0.4];
        tLElbow = [-1.2, 0, 0];

    // 7. SIGNATURE POSES
    } else if (pose === 'hands_in_pockets') {
        tRShoulder = [-0.25, 0.15, 0.28];
        tRElbow = [-1.02, 0.25, -0.20];
        tLShoulder = [-0.25, -0.15, -0.28];
        tLElbow = [-1.02, -0.25, 0.20];
        tHeadRot = [0.02, 0, -0.05];
        tRHip = [0, 0, 0.03];
        tLHip = [0, 0, -0.03];

    } else if (pose === 'thinking') {
        tRShoulder = [-0.85, 0.45, 0.75];
        tRElbow = [-2.15, 0.35, -0.45];
        tLShoulder = [0.20, -0.30, -0.75];
        tLElbow = [-1.65, -0.20, 0.45];
        tHeadRot = [0.08, 0, -0.15];

    } else if (pose === 'explaining') {
        tRShoulder = [-0.65, 0.35, 0.45];
        tRElbow = [-0.65 + Math.sin(time * 2.2) * 0.12, 0.15, 0];
        tLShoulder = [0.15, 0, -0.15];
        tLElbow = [-0.25, 0, 0];

    } else if (pose === 'laughing') {
        const lBounce = Math.sin(time * 8.0) * 0.025;
        tPelvisY = 1.25 + lBounce;
        tTorsoRot = [-0.15 + lBounce * 2, 0, 0];
        tRShoulder = [-0.4, 0.2, 0.3];
        tRElbow = [-1.3, 0, 0];
        tLShoulder = [-0.4, -0.2, -0.3];
        tLElbow = [-1.3, 0, 0];
        tHeadRot = [-0.25, 0, 0];

    } else if (pose === 'head_scratch') {
        tRShoulder = [-2.4, 0.4, 0.6];
        tRElbow = [-2.2 + Math.sin(time * 6.0) * 0.15, 0, 0];
        tLShoulder = [0.1, 0, -0.15];
        tLElbow = [-0.25, 0, 0];
        tHeadRot = [0.05, 0, 0.12];

    } else if (pose === 'waving') {
        tRShoulder = [-1.9, 0.2, 0.4];
        tRElbow = [-0.8, 0, Math.sin(time * 6.5) * 0.55];
        tLShoulder = [0.1, 0, -0.15];
        tLElbow = [-0.15, 0, 0];

    } else if (pose === 'talking') {
        tRShoulder = [-0.45 + Math.sin(time * 2.5) * 0.15, 0.2, 0.3];
        tRElbow = [-0.75 + Math.sin(time * 3.0) * 0.2, 0, 0];
        tLShoulder = [-0.35 + Math.cos(time * 2.2) * 0.12, -0.15, -0.25];
        tLElbow = [-0.65, 0, 0];
        tHeadRot = [Math.sin(time * 2.0) * 0.05, Math.sin(time * 1.5) * 0.08, 0];

    } else {
        // Idle
        tRShoulder = [0.1, 0, 0.15];
        tRElbow = [-0.15, 0, 0];
        tLShoulder = [0.1, 0, -0.15];
        tLElbow = [-0.15, 0, 0];
    }

    // Smooth Multi-Axis Joint Interpolation
    const lerpSpeed = Math.min(1.0, delta * 8.5);

    stickman.pelvis.position.y += (tPelvisY - stickman.pelvis.position.y) * lerpSpeed;
    stickman.pelvis.rotation.x += (tPelvisRot[0] - stickman.pelvis.rotation.x) * lerpSpeed;
    stickman.pelvis.rotation.y += (tPelvisRot[1] - stickman.pelvis.rotation.y) * lerpSpeed;
    stickman.pelvis.rotation.z += (tPelvisRot[2] - stickman.pelvis.rotation.z) * lerpSpeed;

    stickman.torso.rotation.x += (tTorsoRot[0] - stickman.torso.rotation.x) * lerpSpeed;
    stickman.torso.rotation.y += (tTorsoRot[1] - stickman.torso.rotation.y) * lerpSpeed;
    stickman.torso.rotation.z += (tTorsoRot[2] - stickman.torso.rotation.z) * lerpSpeed;

    stickman.headGroup.rotation.x += (tHeadRot[0] - stickman.headGroup.rotation.x) * lerpSpeed;
    stickman.headGroup.rotation.y += (tHeadRot[1] - stickman.headGroup.rotation.y) * lerpSpeed;
    stickman.headGroup.rotation.z += (tHeadRot[2] - stickman.headGroup.rotation.z) * lerpSpeed;

    stickman.rightArm.shoulderJoint.rotation.x += (tRShoulder[0] - stickman.rightArm.shoulderJoint.rotation.x) * lerpSpeed;
    stickman.rightArm.shoulderJoint.rotation.y += (tRShoulder[1] - stickman.rightArm.shoulderJoint.rotation.y) * lerpSpeed;
    stickman.rightArm.shoulderJoint.rotation.z += (tRShoulder[2] - stickman.rightArm.shoulderJoint.rotation.z) * lerpSpeed;
    stickman.rightArm.elbowJoint.rotation.x += (tRElbow[0] - stickman.rightArm.elbowJoint.rotation.x) * lerpSpeed;

    stickman.leftArm.shoulderJoint.rotation.x += (tLShoulder[0] - stickman.leftArm.shoulderJoint.rotation.x) * lerpSpeed;
    stickman.leftArm.shoulderJoint.rotation.y += (tLShoulder[1] - stickman.leftArm.shoulderJoint.rotation.y) * lerpSpeed;
    stickman.leftArm.shoulderJoint.rotation.z += (tLShoulder[2] - stickman.leftArm.shoulderJoint.rotation.z) * lerpSpeed;
    stickman.leftArm.elbowJoint.rotation.x += (tLElbow[0] - stickman.leftArm.elbowJoint.rotation.x) * lerpSpeed;

    stickman.rightLeg.hipJoint.rotation.x += (tRHip[0] - stickman.rightLeg.hipJoint.rotation.x) * lerpSpeed;
    stickman.rightLeg.hipJoint.rotation.y += (tRHip[1] - stickman.rightLeg.hipJoint.rotation.y) * lerpSpeed;
    stickman.rightLeg.kneeJoint.rotation.x += (tRKnee[0] - stickman.rightLeg.kneeJoint.rotation.x) * lerpSpeed;
    stickman.rightLeg.footJoint.rotation.x += (tRFoot[0] - stickman.rightLeg.footJoint.rotation.x) * lerpSpeed;

    stickman.leftLeg.hipJoint.rotation.x += (tLHip[0] - stickman.leftLeg.hipJoint.rotation.x) * lerpSpeed;
    stickman.leftLeg.hipJoint.rotation.y += (tLHip[1] - stickman.leftLeg.hipJoint.rotation.y) * lerpSpeed;
    stickman.leftLeg.kneeJoint.rotation.x += (tLKnee[0] - stickman.leftLeg.kneeJoint.rotation.x) * lerpSpeed;
    stickman.leftLeg.footJoint.rotation.x += (tLFoot[0] - stickman.leftLeg.footJoint.rotation.x) * lerpSpeed;
}


// Global Window Export for Universal Runtime Compatibility
if (typeof window !== 'undefined') {
    window.createPerfectStickman = createPerfectStickman;
    window.applyLocomotionPose = applyLocomotionPose;
    window.CHARACTER_REGISTRY = CHARACTER_REGISTRY;
    window.getCharacter = getCharacter;
    window.registerCharacter = registerCharacter;
    window.getAllCharacters = getAllCharacters;
    window.createOutlinedMesh = createOutlinedMesh;
    window.buildHairstyle = buildHairstyle;
    window.renderStickmanMouth = renderStickmanMouth;
    window.renderEmblemCanvas = renderEmblemCanvas;
}
