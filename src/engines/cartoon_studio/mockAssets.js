/**
 * Generates an anatomically aligned character texture matching CMU MoCap Subject 02 rest pose.
 */
export async function createMockAssets() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, 1024, 1024);

    // Coordinate mapping (matched 1:1 to PlaneGeometry(28, 28) translated by (0, -4, 0)):
    // 3D range: X: [-14, 14], Y: [-18, 10]
    // Canvas X = (X_3d + 14) / 28 * 1024
    // Canvas Y = (10 - Y_3d) / 28 * 1024
    const toCanvasX = (x) => ((x + 14) / 28) * 1024;
    const toCanvasY = (y) => ((10 - y) / 28) * 1024;

    function drawCapsule(x1, y1, x2, y2, radius, fill, stroke) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.001) return;
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(x1, y1);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.arc(0, 0, radius, Math.PI / 2, (3 * Math.PI) / 2);
        ctx.arc(len, 0, radius, (3 * Math.PI) / 2, Math.PI / 2);
        ctx.closePath();

        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
        ctx.restore();
    }

    // --- LEGS (Aligned with CMU LeftUpLeg, LeftLeg, LeftFoot & Right counterparts) ---
    // Right Leg: Hip (-1.6, -1.8) -> Knee (-4.2, -8.9) -> Ankle (-6.7, -15.7)
    // Left Leg:  Hip ( 1.7, -1.8) -> Knee ( 4.3, -8.9) -> Ankle ( 6.8, -15.8)

    // Right Thigh
    drawCapsule(toCanvasX(-1.6), toCanvasY(-1.8), toCanvasX(-4.2), toCanvasY(-8.9), 32, '#2563eb', '#1d4ed8');
    // Right Calf
    drawCapsule(toCanvasX(-4.2), toCanvasY(-8.9), toCanvasX(-6.7), toCanvasY(-15.2), 26, '#1e40af', '#1d4ed8');
    // Right Sneaker / Foot
    drawCapsule(toCanvasX(-6.7), toCanvasY(-15.0), toCanvasX(-6.5), toCanvasY(-16.8), 28, '#f59e0b', '#d97706');
    // Sneaker sole
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(toCanvasX(-6.5), toCanvasY(-16.6), 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left Thigh
    drawCapsule(toCanvasX(1.7), toCanvasY(-1.8), toCanvasX(4.3), toCanvasY(-8.9), 32, '#3b82f6', '#2563eb');
    // Left Calf
    drawCapsule(toCanvasX(4.3), toCanvasY(-8.9), toCanvasX(6.8), toCanvasY(-15.2), 26, '#2563eb', '#1d4ed8');
    // Left Sneaker / Foot
    drawCapsule(toCanvasX(6.8), toCanvasY(-15.0), toCanvasX(7.0), toCanvasY(-16.8), 28, '#f59e0b', '#d97706');
    // Sneaker sole
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(toCanvasX(7.0), toCanvasY(-16.6), 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Knee Highlights
    ctx.fillStyle = '#ec4899';
    ctx.beginPath(); ctx.arc(toCanvasX(-4.2), toCanvasY(-8.9), 18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(toCanvasX(4.3), toCanvasY(-8.9), 18, 0, Math.PI * 2); ctx.fill();

    // --- HIPS & PELVIS ---
    // Centered at (0, 0)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(toCanvasX(-3.8), toCanvasY(0.8), toCanvasX(3.8) - toCanvasX(-3.8), 65, 18);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Belt
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.roundRect(toCanvasX(-3.6), toCanvasY(0.6), toCanvasX(3.6) - toCanvasX(-3.6), 14, 6);
    ctx.fill();

    // --- TORSO (Spine: Y from 0.0 to 6.5) ---
    const torsoGrad = ctx.createLinearGradient(toCanvasX(0), toCanvasY(6.5), toCanvasX(0), toCanvasY(0.5));
    torsoGrad.addColorStop(0, '#8b5cf6');
    torsoGrad.addColorStop(0.5, '#ec4899');
    torsoGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.roundRect(toCanvasX(-3.4), toCanvasY(6.6), toCanvasX(3.4) - toCanvasX(-3.4), toCanvasY(0.6) - toCanvasY(6.6), 26);
    ctx.fill();
    ctx.strokeStyle = '#ffffffaa';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Chest emblem
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡2D', toCanvasX(0), toCanvasY(4.0));

    // --- ARMS ---
    // Right Arm: Shoulder (-2.1, 7.0) -> Elbow (-8.2, 5.0) -> Hand (-11.9, 0.8)
    // Left Arm:  Shoulder ( 2.1, 7.0) -> Elbow ( 8.2, 5.0) -> Hand ( 11.8, 3.0)

    // Right Upper Arm
    drawCapsule(toCanvasX(-2.1), toCanvasY(7.0), toCanvasX(-8.2), toCanvasY(5.0), 22, '#ec4899', '#db2777');
    // Right Forearm
    drawCapsule(toCanvasX(-8.2), toCanvasY(5.0), toCanvasX(-11.9), toCanvasY(1.0), 18, '#fbbf24', '#f59e0b');
    // Right Glove / Hand
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(toCanvasX(-12.0), toCanvasY(0.8), 20, 0, Math.PI * 2);
    ctx.fill();

    // Left Upper Arm
    drawCapsule(toCanvasX(2.1), toCanvasY(7.0), toCanvasX(8.2), toCanvasY(5.0), 22, '#ec4899', '#db2777');
    // Left Forearm
    drawCapsule(toCanvasX(8.2), toCanvasY(5.0), toCanvasX(11.8), toCanvasY(3.0), 18, '#fbbf24', '#f59e0b');
    // Left Glove / Hand
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(toCanvasX(12.0), toCanvasY(2.8), 20, 0, Math.PI * 2);
    ctx.fill();

    // --- NECK & HEAD (Neck: Y=8.5, Head: Y=7.3 to 10.0) ---
    // Neck
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(toCanvasX(-0.8), toCanvasY(8.5), toCanvasX(0.8) - toCanvasX(-0.8), 24);

    // Head
    const headGrad = ctx.createRadialGradient(toCanvasX(0), toCanvasY(8.6), 10, toCanvasX(0), toCanvasY(8.6), 65);
    headGrad.addColorStop(0, '#ffedd5');
    headGrad.addColorStop(1, '#fed7aa');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(toCanvasX(0), toCanvasY(8.6), 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffffcc';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Cap / Visor
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(toCanvasX(0), toCanvasY(8.8), 58, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(toCanvasX(-2.2), toCanvasY(9.2), toCanvasX(2.2) - toCanvasX(-2.2), 16, 8);
    ctx.fill();

    // Cool Visor Sunglasses
    const sunGrad = ctx.createLinearGradient(toCanvasX(-1.5), toCanvasY(8.4), toCanvasX(1.5), toCanvasY(8.4));
    sunGrad.addColorStop(0, '#06b6d4');
    sunGrad.addColorStop(0.5, '#a855f7');
    sunGrad.addColorStop(1, '#ec4899');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.roundRect(toCanvasX(-1.8), toCanvasY(8.5), toCanvasX(1.8) - toCanvasX(-1.8), 22, 10);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    const textureUrl = canvas.toDataURL('image/png');

    return { 
        bvhUrls: {
            walk: 'assets/walk.bvh',
            run: 'assets/run.bvh'
        }, 
        textureUrl 
    };
}
