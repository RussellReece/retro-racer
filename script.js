const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Setup Resolusi Canvas
canvas.width = 400;
canvas.height = 700;

// --- CONFIGURATION ---
const LANE_Positions = [100, 200, 300]; // Koordinat X untuk Jalur Kiri, Tengah, Kanan
let currentLane = 1; // 0: Kiri, 1: Tengah, 2: Kanan
let gameSpeed = 5;
let score = 0;
let isGameOver = false;
let isRunning = false;
let isPaused = false;
let isTransitioning = false;
let obstacles = [];
let projectiles = [];
let spawnTimer = 0;
let currentDimension = 'car';
let dimensionScore = 0;
let portalSpawnedAt = 0;

// --- ASSETS LOAD ---
const imgCarStraight = new Image(); imgCarStraight.src = 'assets/car.gif';
const imgCarLeft = new Image(); imgCarLeft.src = 'assets/car_left.gif';
const imgCarRight = new Image(); imgCarRight.src = 'assets/car_right.gif';

const carOptions = [
    { name: 'Red Racer', straight: 'assets/car.gif', left: 'assets/car_left.gif', right: 'assets/car_right.gif' },
    { name: 'Blue Phantom', straight: 'assets/car_library/car.gif', left: 'assets/car_library/car_left.gif', right: 'assets/car_library/car_right.gif' },
    { name: 'Storm Coupe', straight: 'assets/car_library/car2.gif', left: 'assets/car_library/car2_left.gif', right: 'assets/car_library/car2_right.gif' },
    { name: 'Shadow GT', straight: 'assets/car_library/car3.gif', left: 'assets/car_library/car3_left.gif', right: 'assets/car_library/car3_right.gif' },
    { name: 'Blaze Runner', straight: 'assets/car_library/car4.gif', left: 'assets/car_library/car4_left.gif', right: 'assets/car_library/car4_right.gif' },
    { name: 'Neon Drift', straight: 'assets/car_library/car5.gif', left: 'assets/car_library/car5_left.gif', right: 'assets/car_library/car5_right.gif' }
];
let selectedCarIndex = 0;

function changeCar(direction) {
    selectedCarIndex += direction;
    if (selectedCarIndex < 0) selectedCarIndex = carOptions.length - 1;
    if (selectedCarIndex >= carOptions.length) selectedCarIndex = 0;

    document.getElementById('car-preview-img').src = carOptions[selectedCarIndex].straight;
    document.getElementById('car-name').innerText = carOptions[selectedCarIndex].name;
}

function openCustomize() {
    document.getElementById('main-menu-content').classList.add('hidden');
    document.getElementById('customize-screen').classList.remove('hidden');
}

function closeCustomize() {
    document.getElementById('customize-screen').classList.add('hidden');
    document.getElementById('main-menu-content').classList.remove('hidden');
}

function returnToMainMenu() {
    isRunning = false;
    isPaused = false;
    isGameOver = false;
    isTransitioning = false;
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('countdown-screen').classList.add('hidden');
    document.getElementById('pause-btn').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}


// Load semua variasi background (Pastikan nama filenya sama persis!)
const imgBgSky = new Image(); imgBgSky.src = 'assets/bg_sky.png';
const imgBgSunset = new Image(); imgBgSunset.src = 'assets/bg_sunset.png';
const imgBgNight = new Image(); imgBgNight.src = 'assets/bg_night.png';
const imgBgSunrise = new Image(); imgBgSunrise.src = 'assets/bg_sunrise.png';

// Urutan siklus waktu: Siang -> Senja -> Malam -> Pagi
const backgrounds = [imgBgSky, imgBgSunset, imgBgNight, imgBgSunrise];

// Load semua jenis rintangan
const imgObsBarrier = new Image(); imgObsBarrier.src = 'assets/concrete_barrier.png';
const imgObsCrate = new Image(); imgObsCrate.src = 'assets/crate_stack.png';
const imgObsTire = new Image(); imgObsTire.src = 'assets/tire_stack.png';
const imgObsTire2 = new Image(); imgObsTire2.src = 'assets/tire_barrier.png';
const imgObsBarrel = new Image(); imgObsBarrel.src = 'assets/red_barrel.png';
const imgObsBarrel2 = new Image(); imgObsBarrel2.src = 'assets/rusty_barrel.png';

// Masukkan ke dalam array agar mudah diacak nanti
const obstacleTypes = [imgObsBarrier, imgObsCrate, imgObsTire, imgObsTire2, imgObsBarrel, imgObsBarrel2];

// --- ASSETS DIMENSI ALTERNATIF ---
// Portal
const imgPortal = new Image(); imgPortal.src = 'assets/space/portal.png';

// Space Mode
const imgSpaceShip = new Image(); imgSpaceShip.src = 'assets/space/spaceship.png';
const imgLaser = new Image(); imgLaser.src = 'assets/space/laser_shoot.png';
const imgAsteroid = new Image(); imgAsteroid.src = 'assets/space/asteroid_dynamic.png';
const imgAlien = new Image(); imgAlien.src = 'assets/space/alien.png';
const imgBgSpace = new Image(); imgBgSpace.src = 'assets/space/asteroid_static.png'; // Used as BG tile
const spaceObstacleTypes = [imgAsteroid, imgAlien];

// --- SPRITE SHEET ---
// Semua sheet = deretan frame horizontal dengan lebar sama. Jumlah frame ditulis eksplisit
// (menebak dari rasio lebar/tinggi salah untuk spaceship, alien, dan asteroid).
imgPortal.frames = 6;
imgAsteroid.frames = 5;
imgAlien.frames = 4;
imgLaser.frames = 1;
const SHIP_FRAMES = 3;   // 0 = lurus, 1 = belok kiri, 2 = belok kanan
const RUNNER_FRAMES = 3; // 0 = lurus, 1 = kiri, 2 = kanan

// Gambar satu frame dengan rasio asli terjaga, rata tengah horizontal (cx) dan rata bawah (bottom)
function drawFrame(img, frames, idx, cx, bottom, maxW, maxH) {
    const fw = img.naturalWidth / frames;
    const fh = img.naturalHeight;
    const s = Math.min(maxW / fw, maxH / fh);
    const dw = fw * s, dh = fh * s;
    ctx.drawImage(img, idx * fw, 0, fw, fh, cx - dw / 2, bottom - dh, dw, dh);
}

function loadImg(src) { const i = new Image(); i.src = src; return i; }

// Park Mode — Runner: tiap karakter = 1 sprite sheet 3 frame (lihat runnerOptions)

// Park Mode — Park obstacle
const imgParkObstacle = new Image(); imgParkObstacle.src = 'assets/park/trash_can.png';

// Park Mode — Backgrounds (Siang, Senja, Malam, Pagi)
const imgBgParkDay = new Image(); imgBgParkDay.src = 'assets/park/bg_sky_park.jpg';
const imgBgParkSunset = new Image(); imgBgParkSunset.src = 'assets/park/bg_sunset_park.jpg';
const imgBgParkNight = new Image(); imgBgParkNight.src = 'assets/park/bg_night_park.jpg';
const imgBgParkSunrise = new Image(); imgBgParkSunrise.src = 'assets/park/bg_sunrise_park.jpg';
const parkBackgrounds = [imgBgParkDay, imgBgParkSunset, imgBgParkNight, imgBgParkSunrise];

const spaceshipOptions = [
    { name: 'Galactic', img: 'assets/space/spaceship.png', preview: 'assets/space/spaceship_preview.png', imgObj: imgSpaceShip }
];
let selectedSpaceshipIndex = 0;

function changeSpaceship(direction) {
    selectedSpaceshipIndex += direction;
    if (selectedSpaceshipIndex < 0) selectedSpaceshipIndex = spaceshipOptions.length - 1;
    if (selectedSpaceshipIndex >= spaceshipOptions.length) selectedSpaceshipIndex = 0;

    document.getElementById('spaceship-preview-img').src = spaceshipOptions[selectedSpaceshipIndex].preview;
    document.getElementById('spaceship-name').innerText = spaceshipOptions[selectedSpaceshipIndex].name;
}

// Tiap karakter = 1 sprite sheet (3 frame). Tambah karakter baru cukup tambah 1 baris di sini.
const runnerOptions = [
    { name: 'Park Boy',  sheet: 'assets/park/person_2.png', preview: 'assets/park/person_2_preview.png', img: loadImg('assets/park/person_2.png') },
    { name: 'Park Girl', sheet: 'assets/park/person_3.png', preview: 'assets/park/person_3_preview.png', img: loadImg('assets/park/person_3.png') },
    { name: 'Ranger',    sheet: 'assets/park/person_1.png', preview: 'assets/park/person_1_preview.png', img: loadImg('assets/park/person_1.png') }
];
let selectedRunnerIndex = 0;

function changeRunner(direction) {
    selectedRunnerIndex += direction;
    if (selectedRunnerIndex < 0) selectedRunnerIndex = runnerOptions.length - 1;
    if (selectedRunnerIndex >= runnerOptions.length) selectedRunnerIndex = 0;

    document.getElementById('runner-preview-img').src = runnerOptions[selectedRunnerIndex].preview;
    document.getElementById('runner-name').innerText = runnerOptions[selectedRunnerIndex].name;
}

// --- PLAYER OBJECT ---
const player = {
    y: 550, // Posisi vertikal mobil (tetap di bawah)
    width: 85,
    height: 100,
    sprite: imgCarStraight,
    direction: 0, // 0=straight, 1=left, 2=right (untuk sprite sheet frame)

    draw: function () {
        // Di Space mode, gambar player di tengah bawah tanpa pseudo-3D offset
        let targetX;
        if (currentDimension === 'space') {
            let lanePositionsSpace = [80, 200, 320];
            targetX = lanePositionsSpace[currentLane] - (this.width / 2);
        } else if (currentDimension === 'car') {
            targetX = carLaneX(currentLane, this.y + this.height) - (this.width / 2);
        } else {
            targetX = LANE_Positions[currentLane] - (this.width / 2);
        }

        // Efek bayangan sederhana (tidak di space)
        if (currentDimension !== 'space') {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.beginPath();
            ctx.ellipse(targetX + this.width / 2, this.y + this.height - 5, this.width / 1.5, 10, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Gambar sprite player
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
            // Space/park: 1 sprite sheet, frame dipilih dari arah gerak (0 lurus, 1 kiri, 2 kanan)
            if (currentDimension === 'space' || currentDimension === 'park') {
                const frames = currentDimension === 'space' ? SHIP_FRAMES : RUNNER_FRAMES;
                drawFrame(this.sprite, frames, Math.min(this.direction, frames - 1),
                    targetX + this.width / 2, this.y + this.height, this.width, this.height);
            } else {
                // Mode car: sprite sudah diganti per file (car.gif, car_left.gif, dll)
                ctx.drawImage(this.sprite, targetX, this.y, this.width, this.height);
            }
        } else {
            // Fallback kotak berwarna
            ctx.fillStyle = currentDimension === 'space' ? "#00aaff" : "#ff0055";
            ctx.fillRect(targetX, this.y, this.width, this.height);
        }
    },

    setDirection: function (dir) {
        if (currentDimension === 'car') {
            // Mode car: ganti file sprite
            if (dir === 'left') this.sprite = imgCarLeft;
            if (dir === 'right') this.sprite = imgCarRight;
            if (dir === 'straight') this.sprite = imgCarStraight;
            this.direction = 0;
        } else if (currentDimension === 'space') {
            // Mode space: ganti frame index di sprite sheet yang sama
            if (dir === 'left') this.direction = 1;
            else if (dir === 'right') this.direction = 2;
            else this.direction = 0;
        } else if (currentDimension === 'park') {
            // Mode park: sheet yang sama, cukup ganti frame
            if (dir === 'left') this.direction = 1;
            else if (dir === 'right') this.direction = 2;
            else this.direction = 0;
        }
    }
};

// --- HELPER FUNCTION ---
// Mengembalikan angka 0 (Siang), 1 (Senja), 2 (Malam), atau 3 (Pagi)
function getPhaseIndex() {
    let displayScore = Math.floor(score / 10);
    return Math.floor(displayScore / 100) % backgrounds.length;
}

// --- ROAD LOGIC (PSEUDO 3D) ---
let roadOffset = 0;

// ---------------------------------------------------------------------------
// LANTAI PIXEL ART
// Lantai digambar ke kanvas kecil (1 piksel = PX piksel layar) lalu diperbesar tanpa
// smoothing, supaya blok pikselnya sama dengan background. Hanya warna solid + dither,
// tanpa gradasi atau antialias.
// ---------------------------------------------------------------------------
const HORIZON = 300;
const GROUND_H = 400;
const PX = 3;                              // ukuran 1 "piksel" gambar di layar
const GW = Math.ceil(400 / PX);
const GH = Math.ceil(GROUND_H / PX);
const CXL = 200 / PX;                      // titik tengah jalan (satuan piksel kecil)
// Fase tekstur = K / (t + OFF) + scroll, t = 0 (horizon) .. 1 (bawah layar)
const PERSP_K = 26;
const PERSP_OFF = 1.2;
const SCROLL_C = 0.0195;
const roadLights = [];                     // posisi lampu jalan frame ini (koordinat layar)

const groundCanvas = document.createElement('canvas');
groundCanvas.width = GW;
groundCanvas.height = GH;
const gctx = groundCanvas.getContext('2d');

const GROUND_THEMES = {
    car: {
        grass: ['#5aa843', '#4e9c3a'],
        road: ['#464c59', '#40465a'],
        wear: '#3a4050',
        curbs: ['#d9363e', '#f4f1ea'],
        edge: '#ecebe4',
        mark: '#f6f2e2',
        outline: '#1f2433',
        horizon: ['#1f2433', '#33543f'],
        halfW: t => 50 + 150 * t
    },
    park: {
        grass: ['#6f9d3b', '#648f35'],
        road: ['#d9b97a', '#d0ae6e'],
        border: ['#8a6a3c', '#b98f55'],
        joint: '#a98550',
        outline: '#2a2a1c',
        horizon: ['#2a2a1c', '#4a5a28'],
        halfW: t => 50 + 130 * t
    }
};

// Posisi jalur mode car: 3 jalur membagi lebar aspal sama rata, jadi pembatas jalur,
// bekas ban, rintangan, peluru, dan mobil semua memakai perspektif yang sama dengan jalan.
function carLaneSpacing(t) {
    return (2 / 3) * GROUND_THEMES.car.halfW(t);
}
function carLaneX(lane, y) {
    const t = Math.min(1, Math.max(0, (y - HORIZON) / GROUND_H));
    return 200 + (lane - 1) * carLaneSpacing(t);
}

function roadPhase(t) {
    return PERSP_K / (t + PERSP_OFF) + roadOffset * SCROLL_C;
}

function hash01(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

// --- primitif pixel (semua koordinat dibulatkan ke grid piksel kecil) ---
function pxRect(x, y, w, h, c) {
    gctx.fillStyle = c;
    gctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function pxCircle(cx, cy, r, c) {
    gctx.fillStyle = c;
    cx = Math.round(cx); cy = Math.round(cy); r = Math.max(1, Math.round(r));
    for (let dy = -r; dy <= r; dy++) {
        const w = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.5));
        gctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
    }
}

function pxShadow(cx, cy, rx, ry) {
    gctx.fillStyle = 'rgba(0,0,0,0.25)';
    cx = Math.round(cx); cy = Math.round(cy);
    rx = Math.max(1, Math.round(rx)); ry = Math.max(1, Math.round(ry));
    for (let dy = -ry; dy <= ry; dy++) {
        const w = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry + 0.5)));
        gctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
    }
}

// Rumput belang + jalan/jalur taman, per baris piksel agar perspektif benar
function drawGround(mode) {
    const th = GROUND_THEMES[mode];
    gctx.clearRect(0, 0, GW, GH);
    let prevBand = -1;

    for (let r = 0; r < GH; r++) {
        const t = (r + 0.5) * PX / GROUND_H;
        const ph = roadPhase(t);
        const hw = th.halfW(t) / PX;
        const xl = Math.round(CXL - hw), xr = Math.round(CXL + hw);
        const band = Math.floor(ph) & 1;
        // setengah lebar jalur: car = 1/3 lebar aspal (sama dengan carLaneSpacing/2), park = rumus lama
        const off = (mode === 'car' ? th.halfW(t) / 3 : (15 + 60 * t)) / PX;

        // rumput
        gctx.fillStyle = th.grass[band];
        gctx.fillRect(0, r, GW, 1);

        if (mode === 'car') {
            const cw = Math.max(1, Math.round((3 + 11 * t) / PX));
            // outline gelap + curb merah-putih
            gctx.fillStyle = th.outline;
            gctx.fillRect(xl - cw - 1, r, 1, 1);
            gctx.fillRect(xr + cw, r, 1, 1);
            gctx.fillStyle = th.curbs[Math.floor(ph * 2) & 1];
            gctx.fillRect(xl - cw, r, cw, 1);
            gctx.fillRect(xr, r, cw, 1);
            // aspal
            gctx.fillStyle = th.road[band];
            gctx.fillRect(xl, r, xr - xl, 1);
            // bekas ban di tengah tiap jalur
            const ww = Math.max(1, Math.round((8 + 30 * t) / PX));
            gctx.fillStyle = th.wear;
            for (let lane = -1; lane <= 1; lane++) {
                gctx.fillRect(Math.round(CXL + lane * (2 * off) - ww / 2), r, ww, 1);
            }
            // garis tepi
            const inset = Math.max(1, Math.round((4 + 10 * t) / PX));
            const ew = Math.max(1, Math.round((1 + 3 * t) / PX));
            gctx.fillStyle = th.edge;
            gctx.fillRect(xl + inset, r, ew, 1);
            gctx.fillRect(xr - inset - ew, r, ew, 1);
            // pembatas jalur putus-putus
            if ((Math.floor(ph) & 1) === 0) {
                const lw = Math.max(1, Math.round((1 + 5 * t) / PX));
                gctx.fillStyle = th.mark;
                gctx.fillRect(Math.round(CXL - off - lw / 2), r, lw, 1);
                gctx.fillRect(Math.round(CXL + off - lw / 2), r, lw, 1);
            }
        } else {
            const bw = Math.max(1, Math.round((4 + 12 * t) / PX));
            // batu tepi: outline gelap, badan cokelat, 1 piksel terang di sisi jalan
            gctx.fillStyle = th.outline;
            gctx.fillRect(xl - bw - 1, r, 1, 1);
            gctx.fillRect(xr + bw, r, 1, 1);
            gctx.fillStyle = th.border[0];
            gctx.fillRect(xl - bw, r, bw, 1);
            gctx.fillRect(xr, r, bw, 1);
            gctx.fillStyle = th.border[1];
            gctx.fillRect(xl - 1, r, 1, 1);
            gctx.fillRect(xr, r, 1, 1);
            // paving: garis sambungan mendatar tiap pergantian pita
            const isJoint = prevBand !== -1 && band !== prevBand;
            gctx.fillStyle = isJoint ? th.joint : th.road[band];
            gctx.fillRect(xl, r, xr - xl, 1);
            // sambungan tegak berselang-seling (susunan bata)
            if (!isJoint) {
                gctx.fillStyle = th.joint;
                const js = band === 0 ? [-off, off] : [-2 * off, 0, 2 * off];
                for (const j of js) gctx.fillRect(Math.round(CXL + j), r, 1, 1);
            }
        }
        prevBand = band;
    }
}

// --- Objek tepi jalan (fase sama dengan lantai); parameter dalam satuan layar ---
function drawTree(x, y, S, r, mode) {
    const th = GROUND_THEMES[mode];
    const lx = x / PX, ly = (y - HORIZON) / PX, ss = S / PX;
    const h = 170 * ss * (0.85 + 0.3 * r);
    let pal = ['#2f8a38', '#5cc05a', '#1d5e2b'];
    if (mode === 'park') {
        const k = hash01(r * 1000);
        if (k > 0.82) pal = ['#e0782a', '#f4b13c', '#a14a1a'];       // musim gugur
        else if (k > 0.68) pal = ['#ee9db9', '#fbd3e0', '#b8628a'];  // sakura
        else if (k > 0.35) pal = ['#4f8f35', '#7fbf55', '#2f5f2a'];
        else pal = ['#3c8a3a', '#6cc765', '#25602c'];
    }
    pxShadow(lx, ly, 28 * ss, 6 * ss);
    // batang
    const tw = Math.max(1, Math.round(10 * ss)), trunkH = h * 0.45;
    pxRect(lx - tw / 2 - 1, ly - trunkH - 1, tw + 2, trunkH + 1, th.outline);
    pxRect(lx - tw / 2, ly - trunkH, tw, trunkH, '#6b4426');
    // tajuk: outline dulu, lalu isi 3 tone
    const cy = ly - h * 0.62, R = h * 0.28;
    const blobs = [[R * 0.2, R * 0.35, R], [0, 0, R], [-R * 0.7, R * 0.25, R * 0.75], [R * 0.7, R * 0.25, R * 0.75]];
    blobs.forEach(([bx, by, br]) => pxCircle(lx + bx, cy + by, br + 1, th.outline));
    pxCircle(lx + blobs[0][0], cy + blobs[0][1], R, pal[2]);
    pxCircle(lx, cy, R, pal[0]);
    pxCircle(lx - R * 0.7, cy + R * 0.25, R * 0.75, pal[0]);
    pxCircle(lx + R * 0.7, cy + R * 0.25, R * 0.75, pal[0]);
    pxCircle(lx - R * 0.25, cy - R * 0.3, R * 0.5, pal[1]);
}

function drawLamp(x, y, S, side, mode) {
    const th = GROUND_THEMES[mode];
    const lx = x / PX, ly = (y - HORIZON) / PX, ss = S / PX;
    const h = 150 * ss, arm = 28 * ss;
    const ax = lx - side * arm; // lengan mengarah ke jalan
    const c = mode === 'park' ? '#2f3a2f' : '#4b5563';
    const pw = Math.max(1, Math.round(5 * ss));
    const bar = Math.max(1, Math.round(3 * ss));
    pxShadow(lx, ly, 12 * ss, 3 * ss);
    pxRect(lx - pw / 2, ly - h, pw, h, c);
    pxRect(Math.min(lx, ax), ly - h, Math.abs(ax - lx) + 1, bar, c);
    pxRect(ax - 4 * ss, ly - h + bar, 8 * ss, bar, '#fde68a');
    roadLights.push({ x: ax * PX, y: HORIZON + (ly - h + bar * 1.5) * PX, r: 30 + 80 * S });
}

function drawBush(x, y, S, r, mode) {
    const th = GROUND_THEMES[mode];
    const lx = x / PX, ly = (y - HORIZON) / PX, ss = S / PX;
    const w = 22 * ss * (0.8 + 0.5 * r);
    const base = mode === 'park' ? '#3f8f3a' : '#2f8a38';
    const light = mode === 'park' ? '#62b85a' : '#5cc05a';
    pxShadow(lx, ly, w * 1.3, 4 * ss);
    const blobs = [[-w * 0.7, -w * 0.5, w * 0.7], [w * 0.7, -w * 0.5, w * 0.7], [0, -w * 0.8, w * 0.85]];
    blobs.forEach(([bx, by, br]) => pxCircle(lx + bx, ly + by, br + 1, th.outline));
    blobs.forEach(([bx, by, br]) => pxCircle(lx + bx, ly + by, br, base));
    pxCircle(lx - w * 0.2, ly - w * 1.0, w * 0.4, light);
    if (mode === 'park') { // bunga
        const cols = ['#ff5c8a', '#ffd23f', '#ffffff', '#ff8a3d'];
        for (let i = 0; i < 5; i++) {
            pxRect(lx + (hash01(r * 50 + i) - 0.5) * w * 2, ly - w * (0.3 + hash01(r * 90 + i)),
                1, 1, cols[(i + Math.floor(r * 10)) % cols.length]);
        }
    }
}

function drawBench(x, y, S, mode) {
    const th = GROUND_THEMES[mode];
    const lx = x / PX, ly = (y - HORIZON) / PX, ss = S / PX;
    pxShadow(lx, ly, 26 * ss, 4 * ss);
    pxRect(lx - 22 * ss, ly - 16 * ss, Math.max(1, 4 * ss), 16 * ss, '#3a3a3a');
    pxRect(lx + 18 * ss, ly - 16 * ss, Math.max(1, 4 * ss), 16 * ss, '#3a3a3a');
    pxRect(lx - 26 * ss - 1, ly - 38 * ss - 1, 52 * ss + 2, 5 * ss + 2, th.outline);
    pxRect(lx - 26 * ss - 1, ly - 20 * ss - 1, 52 * ss + 2, 6 * ss + 2, th.outline);
    pxRect(lx - 26 * ss, ly - 20 * ss, 52 * ss, 6 * ss, '#9a6a37');   // dudukan
    pxRect(lx - 26 * ss, ly - 38 * ss, 52 * ss, 5 * ss, '#b98348');   // sandaran
}

function drawRoadside(mode) {
    const th = GROUND_THEMES[mode];
    const spacing = 2.2;
    const scroll = roadOffset * SCROLL_C;
    const vMax = PERSP_K / PERSP_OFF;          // t = 0 (horizon)
    const vMin = PERSP_K / (1.3 + PERSP_OFF);  // t = 1.3 (lewat tepi bawah layar)

    for (const side of [-1, 1]) {
        const shift = side > 0 ? 0.5 : 0;     // kiri-kanan berselang-seling
        const jMin = Math.floor((scroll + vMin) / spacing - shift);
        const jMax = Math.ceil((scroll + vMax) / spacing - shift);
        for (let j = jMax; j >= jMin; j--) {  // jauh dulu, dekat belakangan
            const v = (j + shift) * spacing - scroll;
            if (v < vMin || v > vMax) continue;
            const t = PERSP_K / v - PERSP_OFF;
            const S = 0.12 + t;
            const y = HORIZON + GROUND_H * t;
            const id = j * 2 + (side > 0 ? 1 : 0);
            const r = hash01(id);
            const gap = (mode === 'car' ? 20 : 30) + 70 * t;
            const x = 200 + side * (th.halfW(t) + gap);

            if (mode === 'car') {
                if (r < 0.45) drawTree(x, y, S, hash01(id + 7), mode);
                else if (r < 0.78) drawLamp(x, y, S, side, mode);
                else drawBush(x, y, S, hash01(id + 3), mode);
            } else {
                if (r < 0.40) drawTree(x, y, S, hash01(id + 7), mode);
                else if (r < 0.60) drawLamp(x, y, S, side, mode);
                else if (r < 0.85) drawBush(x, y, S, hash01(id + 3), mode);
                else drawBench(x - side * 8 * S, y, S, mode);
            }
        }
    }
}

// Transisi dari silhouette background ke lantai: dither checkerboard (gaya background)
function drawHorizonDither(mode) {
    const th = GROUND_THEMES[mode];
    for (let x = 0; x < GW; x++) {
        gctx.fillStyle = th.horizon[0];
        gctx.fillRect(x, 0, 1, 1);
        if (((x + 1) & 1) === 0) gctx.fillRect(x, 1, 1, 1);
        gctx.fillStyle = th.horizon[1];
        if ((x & 1) === 0) gctx.fillRect(x, 2, 1, 1);
    }
}

// Perbesar kanvas kecil ke layar tanpa smoothing
function blitGround() {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(groundCanvas, 0, HORIZON, GW * PX, GH * PX);
    ctx.restore();
}

function drawRoad() {
    let phaseIndex = getPhaseIndex();

    if (currentDimension === 'space') {
        // Selalu gambar parallax bintang procedural dulu sebagai dasar
        ctx.fillStyle = "#000018";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Bintang layer 1 (jauh, pelan)
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for (let i = 0; i < 60; i++) {
            let x = (Math.abs(Math.sin(i * 127.1) * 1000)) % canvas.width;
            let y = ((Math.abs(Math.cos(i * 311.7) * 1000) + roadOffset * 0.2)) % canvas.height;
            ctx.fillRect(x, y, 1, 1);
        }
        // Bintang layer 2 (sedang)
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        for (let i = 0; i < 30; i++) {
            let x = (Math.abs(Math.sin(i * 251.3) * 1000)) % canvas.width;
            let y = ((Math.abs(Math.cos(i * 173.9) * 1000) + roadOffset * 0.5)) % canvas.height;
            ctx.fillRect(x, y, 2, 2);
        }
        // Bintang besar
        ctx.fillStyle = "rgba(200,230,255,1)";
        for (let i = 0; i < 8; i++) {
            let x = (Math.abs(Math.sin(i * 99.7) * 1000)) % canvas.width;
            let y = ((Math.abs(Math.cos(i * 89.3) * 1000) + roadOffset * 0.8)) % canvas.height;
            ctx.fillRect(x, y, 3, 3);
        }
        // Jika ada bg_space tersedia, overlay sebagai nebula
        if (imgBgSpace.complete && imgBgSpace.naturalWidth > 0) {
            ctx.globalAlpha = 0.15;
            let spaceOffset = (roadOffset * 0.3) % canvas.height;
            ctx.drawImage(imgBgSpace, 0, spaceOffset - canvas.height, canvas.width, canvas.height);
            ctx.drawImage(imgBgSpace, 0, spaceOffset, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;
        }
        return;
    }

    let bgToDraw = currentDimension === 'park' ? parkBackgrounds[phaseIndex] : backgrounds[phaseIndex];
    if (bgToDraw && bgToDraw.complete && bgToDraw.src) {
        ctx.drawImage(bgToDraw, 0, 0, canvas.width, 300);
    } else {
        ctx.fillStyle = currentDimension === 'park' ? "#A9DFBF" : "#87CEEB";
        ctx.fillRect(0, 0, canvas.width, 300);
    }

    // Tanah + jalan/jalur taman (pseudo 3D), pemandangan tepi jalan, lalu kabut horizon
    const mode = currentDimension === 'park' ? 'park' : 'car';
    roadLights.length = 0;
    drawGround(mode);
    drawRoadside(mode);
    drawHorizonDither(mode);
    blitGround();
}

// --- OBSTACLE LOGIC ---
class Obstacle {
    constructor(lane, isPortal = false) {
        this.lane = lane;
        this.y = 300;
        this.scale = 0.1;
        this.isPortal = isPortal;
        // Offset unik agar tiap obstacle tidak beranimasi sinkron
        this.animOffset = Math.floor(Math.random() * 1000);

        if (this.isPortal) {
            this.sprite = imgPortal;
        } else if (currentDimension === 'space') {
            // Acak antara asteroid dan alien
            let idx = Math.floor(Math.random() * spaceObstacleTypes.length);
            this.sprite = spaceObstacleTypes[idx];
        } else if (currentDimension === 'park') {
            this.sprite = imgParkObstacle;
        } else {
            let randomIndex = Math.floor(Math.random() * obstacleTypes.length);
            this.sprite = obstacleTypes[randomIndex];
        }
    }

    update() {
        this.y += gameSpeed;
        let progress = (this.y - 300) / 400;
        this.scale = 0.2 + (progress * 0.8);

        if (currentDimension === 'space') {
            // Di mode space: lane tersebar di seluruh lebar layar
            let lanePositionsSpace = [80, 200, 320];
            this.x = lanePositionsSpace[this.lane];
            // scale tetap untuk efek 3D ringan
        } else {
            if (currentDimension === 'car') {
                this.x = carLaneX(this.lane, this.y);
            } else {
                let centerRoadX = 200;
                let laneOffset = (this.lane - 1) * (30 * (1 + progress * 4));
                this.x = centerRoadX + laneOffset;
            }
        }
    }

    draw() {
        let w = 90 * this.scale;
        let h = 90 * this.scale;

        // Override ukuran untuk space dan portal
        if (currentDimension === 'space' && !this.isPortal) {
            // Di space, obstacle selalu ukuran medium (tidak pseudo-3D)
            w = 70;
            h = 70;
        }
        if (this.isPortal) {
            w = 80 * this.scale;
            h = 80 * this.scale;
        }

        // Sprite: sheet animasi (frames > 1) atau gambar tunggal. Rasio asli terjaga.
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
            const frames = this.sprite.frames || 1;
            // Animasi pelan + offset unik per obstacle agar tidak sinkron
            const frame = frames > 1 ? Math.floor((score + this.animOffset) / 20) % frames : 0;
            drawFrame(this.sprite, frames, frame, this.x, this.y, w, h);
        } else {
            ctx.fillStyle = this.isPortal ? "rgba(180,0,255,0.8)" : (currentDimension === 'space' ? "#ff4400" : "red");
            if (this.isPortal) {
                ctx.beginPath();
                ctx.arc(this.x, this.y - h / 2, w / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "cyan";
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                ctx.fillRect(this.x - w / 2, this.y - h, w, h);
            }
        }
    }
}

// --- PROJECTILE LOGIC ---
class Projectile {
    constructor(lane) {
        this.lane = lane;
        this.y = player.y;
        this.updateX();
    }
    updateX() {
        // Space: x sama dengan jalur kapal/obstacle (80, 200, 320), bukan perspektif jalan
        if (currentDimension === 'space') {
            this.x = [80, 200, 320][this.lane];
        } else {
            if (currentDimension === 'car') {
                this.x = carLaneX(this.lane, this.y);
            } else {
                let progress = (this.y - 300) / 400;
                this.x = 200 + (this.lane - 1) * (30 * (1 + progress * 4));
            }
        }
    }
    update() {
        this.y -= 10;
        this.updateX();
    }
    draw() {
        if (imgLaser.complete && imgLaser.naturalWidth > 0) {
            // laser_shoot.png sudah vertikal (ujung ke atas); bagian bawah sprite = this.y
            drawFrame(imgLaser, 1, 0, this.x, this.y, 14, 50);
        } else {
            // Fallback: garis neon cyan
            ctx.shadowColor = "cyan";
            ctx.shadowBlur = 10;
            ctx.fillStyle = "cyan";
            ctx.fillRect(this.x - 3, this.y - 30, 6, 30);
            ctx.shadowBlur = 0;
        }
    }
}

// --- INPUT HANDLING ---
function shoot() {
    if (currentDimension === 'space' && !isTransitioning && !isPaused && !isGameOver) {
        projectiles.push(new Projectile(currentLane));
    }
}

document.addEventListener('keydown', (e) => {
    if (isGameOver) {
        if (e.code === 'Space') startGame();
        return;
    }

    if (!isRunning) {
        if (e.code === 'Space') startGame();
        return;
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
        togglePause();
        return;
    }

    if (e.code === 'KeyX' || e.code === 'ArrowUp' || e.code === 'Space') shoot();

    if (isPaused || isTransitioning) return;

    if (e.key === 'ArrowLeft' && currentLane > 0) {
        currentLane--;
        player.setDirection('left');
        setTimeout(() => player.setDirection('straight'), 200);
    }
    else if (e.key === 'ArrowRight' && currentLane < 2) {
        currentLane++;
        player.setDirection('right');
        setTimeout(() => player.setDirection('straight'), 200);
    }
});

// --- TOUCH CONTROLS ---
canvas.addEventListener('touchstart', (e) => {
    if (!isRunning || isGameOver || isPaused || isTransitioning) return;
    e.preventDefault();

    const touchX = e.touches[0].clientX;
    const screenWidth = window.innerWidth;

    if (touchX < screenWidth / 2 && currentLane > 0) {
        currentLane--;
        player.setDirection('left');
        setTimeout(() => player.setDirection('straight'), 200);
    } else if (touchX >= screenWidth / 2 && currentLane < 2) {
        currentLane++;
        player.setDirection('right');
        setTimeout(() => player.setDirection('straight'), 200);
    }
}, { passive: false });

document.getElementById('shoot-btn').addEventListener('touchstart', (e) => {
    e.preventDefault();
    shoot();
});
document.getElementById('shoot-btn').addEventListener('mousedown', (e) => {
    e.preventDefault();
    shoot();
});

// --- GAME LOOP ---
function update() {
    if (isGameOver) return;

    roadOffset += gameSpeed;
    score++;

    let displayScore = Math.floor(score / 10);
    document.getElementById('score').innerText = displayScore;

    let currentHigh = parseInt(document.getElementById('high-score').innerText) || 0;
    if (displayScore > currentHigh) {
        document.getElementById('high-score').innerText = displayScore;
    }

    if (currentDimension === 'car' && displayScore > 0 && displayScore % 100 === 0 && portalSpawnedAt !== displayScore) {
        portalSpawnedAt = displayScore;
        let randomLane = Math.floor(Math.random() * 3);
        obstacles.push(new Obstacle(randomLane, true));
    }

    if (currentDimension !== 'car') {
        dimensionScore++;
        if (Math.floor(dimensionScore / 10) >= 100) {
            startTransition('car');
            return;
        }
    }

    spawnTimer--;
    if (spawnTimer <= 0) {
        spawnPattern();
        spawnTimer = Math.max(40, 200 / gameSpeed);
    }

    projectiles.forEach((proj, pIndex) => {
        proj.update();
        obstacles.forEach((obs, oIndex) => {
            if (obs.lane === proj.lane && Math.abs(obs.y - proj.y) < 50 && !obs.isPortal) {
                obstacles.splice(oIndex, 1);
                projectiles.splice(pIndex, 1);
                score += 50;
            }
        });
        if (proj.y < 200) projectiles.splice(pIndex, 1);
    });

    obstacles.forEach((obs, index) => {
        obs.update();

        if (obs.y > player.y + 40 && obs.y < player.y + player.height && obs.lane === currentLane) {
            if (obs.isPortal) {
                obstacles.splice(index, 1);
                let nextDim = Math.random() < 0.5 ? 'space' : 'park';
                startTransition(nextDim);
                return;
            } else {
                gameOver();
            }
        }

        if (obs.y > canvas.height + 50) obstacles.splice(index, 1);
    });

    gameSpeed += 0.002;
}

// --- FUNCTION BARU UNTUK POLA RINTANGAN ---
function spawnPattern() {
    // Tentukan mau spawn 1 atau 2 rintangan?
    // 60% peluang muncul 1 rintangan, 40% peluang muncul 2 rintangan
    let numberOfObstacles = Math.random() < 0.6 ? 1 : 2;

    // Siapkan daftar jalur: [0, 1, 2]
    let availableLanes = [0, 1, 2];

    // Acak urutan jalur tersebut
    availableLanes.sort(() => Math.random() - 0.5);

    // Ambil jalur sesuai jumlah rintangan
    // Karena kita maksimal mengambil 2, PASTI ada 1 sisa jalur yang kosong
    for (let i = 0; i < numberOfObstacles; i++) {
        obstacles.push(new Obstacle(availableLanes[i]));
    }
}

function draw() {
    // 1. Bersihkan kanvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Gambar Jalan dan Latar Belakang
    drawRoad();

    // 3. Urutkan dan Gambar Rintangan, Proyektil & Mobil
    let allObjects = [...obstacles, ...projectiles, { type: 'player', y: player.y + player.height }];
    allObjects.sort((a, b) => a.y - b.y);

    allObjects.forEach(obj => {
        if (obj.type === 'player') player.draw();
        else obj.draw();
    });

    // 4. --- EFEK PENCAHAYAAN (OVERLAY) ---
    if (currentDimension !== 'space') {
        let phaseIndex = getPhaseIndex();

        if (phaseIndex === 1) {
            ctx.fillStyle = "rgba(220, 100, 0, 0.25)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (phaseIndex === 2) {
            ctx.fillStyle = "rgba(0, 10, 40, 0.65)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (currentDimension === 'car') {
                ctx.fillStyle = "rgba(255, 255, 150, 0.25)";
                ctx.beginPath();
                let carCenterX = carLaneX(currentLane, player.y + player.height);
                ctx.moveTo(carCenterX - 20, player.y + 70);
                ctx.lineTo(carCenterX - 180, 700);
                ctx.lineTo(carCenterX + 180, 700);
                ctx.lineTo(carCenterX + 20, player.y + 70);
                ctx.fill();
            }

            // Lampu jalan menyala (ditambahkan di atas overlay gelap)
            ctx.globalCompositeOperation = 'lighter';
            roadLights.forEach(l => {
                const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
                g.addColorStop(0, 'rgba(255,215,120,0.6)');
                g.addColorStop(1, 'rgba(255,215,120,0)');
                ctx.fillStyle = g;
                ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
            });
            ctx.globalCompositeOperation = 'source-over';
        } else if (phaseIndex === 3) {
            ctx.fillStyle = "rgba(255, 180, 100, 0.2)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
}

function loop() {
    if (isRunning && !isGameOver && !isPaused) {
        if (!isTransitioning) {
            update();
        }
        draw();
        requestAnimationFrame(loop);
    }
}

// --- GAME STATES ---
function togglePause() {
    if (!isRunning || isGameOver || isTransitioning) return;

    isPaused = !isPaused;
    if (isPaused) {
        document.getElementById('pause-screen').classList.remove('hidden');
        document.getElementById('pause-btn').classList.add('hidden');
    } else {
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('pause-btn').classList.remove('hidden');
        loop();
    }
}

function startTransition(targetDimension) {
    isTransitioning = true;
    obstacles = [];
    projectiles = [];

    document.getElementById('countdown-screen').classList.remove('hidden');

    if (targetDimension === 'space') {
        document.getElementById('countdown-tutorial').classList.remove('hidden');
        document.getElementById('countdown-text').innerText = 'WAIT';

        const spaceStartHandler = (e) => {
            if (e.code === 'Space' || e.type === 'touchstart' || e.type === 'mousedown') {
                document.removeEventListener('keydown', spaceStartHandler);
                document.getElementById('shoot-btn').removeEventListener('touchstart', spaceStartHandler);
                document.getElementById('shoot-btn').removeEventListener('mousedown', spaceStartHandler);
                document.getElementById('countdown-tutorial').classList.add('hidden');
                runCountdown(targetDimension);
            }
        };
        document.addEventListener('keydown', spaceStartHandler);
        document.getElementById('shoot-btn').addEventListener('touchstart', spaceStartHandler);
        document.getElementById('shoot-btn').addEventListener('mousedown', spaceStartHandler);
        document.getElementById('shoot-btn').classList.remove('hidden');
    } else {
        document.getElementById('countdown-tutorial').classList.add('hidden');
        document.getElementById('shoot-btn').classList.add('hidden');
        runCountdown(targetDimension);
    }
}

function runCountdown(targetDimension) {
    let count = 3;
    document.getElementById('countdown-text').innerText = count;

    let interval = setInterval(() => {
        count--;
        if (count > 0) {
            document.getElementById('countdown-text').innerText = count;
        } else if (count === 0) {
            document.getElementById('countdown-text').innerText = "GO!";
        } else {
            clearInterval(interval);
            document.getElementById('countdown-screen').classList.add('hidden');
            applyDimension(targetDimension);
            isTransitioning = false;
        }
    }, 1000);
}

function applyDimension(dim) {
    currentDimension = dim;
    dimensionScore = 0;

    if (dim === 'car') {
        player.sprite = imgCarStraight;
        player.width = 85;
        player.height = 100;
        document.getElementById('shoot-btn').classList.add('hidden');
    } else if (dim === 'space') {
        player.sprite = spaceshipOptions[selectedSpaceshipIndex].imgObj;
        player.width = 110;  // sprite kapal lebar (rasio ~2.5:1); jarak antar jalur 120px
        player.height = 100;
        document.getElementById('shoot-btn').classList.remove('hidden');
    } else if (dim === 'park') {
        player.sprite = runnerOptions[selectedRunnerIndex].img;
        player.width = 70;
        player.height = 100;
        document.getElementById('shoot-btn').classList.add('hidden');
    }
}

function startGame() {
    imgCarStraight.src = carOptions[selectedCarIndex].straight;
    imgCarLeft.src = carOptions[selectedCarIndex].left;
    imgCarRight.src = carOptions[selectedCarIndex].right;
    player.sprite = imgCarStraight;

    isRunning = true;
    isGameOver = false;
    isPaused = false;
    isTransitioning = false;
    score = 0;
    gameSpeed = 5;
    obstacles = [];
    projectiles = [];
    currentLane = 1;
    portalSpawnedAt = 0;

    applyDimension('car');

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-btn').classList.remove('hidden');

    // Load High Score
    let savedScore = localStorage.getItem('racingHighScore') || 0;
    document.getElementById('high-score').innerText = savedScore;

    loop();
}

function gameOver() {
    isGameOver = true;
    document.getElementById('pause-btn').classList.add('hidden');

    // Cek High Score
    let currentHigh = localStorage.getItem('racingHighScore') || 0;
    let finalScore = Math.floor(score / 10);
    if (finalScore > currentHigh) {
        localStorage.setItem('racingHighScore', finalScore);
    }

    document.getElementById('final-score').innerText = finalScore;
    document.getElementById('game-over-screen').classList.remove('hidden');
}