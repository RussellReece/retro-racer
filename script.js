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
const imgCarLeft = new Image();     imgCarLeft.src = 'assets/car_left.gif';
const imgCarRight = new Image();    imgCarRight.src = 'assets/car_right.gif';

const carOptions = [
    { name: 'Red Racer',     straight: 'assets/car.gif',                    left: 'assets/car_left.gif',                 right: 'assets/car_right.gif' },
    { name: 'Blue Phantom',  straight: 'assets/car_library/car.gif',         left: 'assets/car_library/car_left.gif',      right: 'assets/car_library/car_right.gif' },
    { name: 'Storm Coupe',   straight: 'assets/car_library/car2.gif',        left: 'assets/car_library/car2_left.gif',     right: 'assets/car_library/car2_right.gif' },
    { name: 'Shadow GT',     straight: 'assets/car_library/car3.gif',        left: 'assets/car_library/car3_left.gif',     right: 'assets/car_library/car3_right.gif' },
    { name: 'Blaze Runner',  straight: 'assets/car_library/car4.gif',        left: 'assets/car_library/car4_left.gif',     right: 'assets/car_library/car4_right.gif' },
    { name: 'Neon Drift',    straight: 'assets/car_library/car5.gif',        left: 'assets/car_library/car5_left.gif',     right: 'assets/car_library/car5_right.gif' }
];
let selectedCarIndex = 0;

function changeCar(direction) {
    selectedCarIndex += direction;
    if (selectedCarIndex < 0) selectedCarIndex = carOptions.length - 1;
    if (selectedCarIndex >= carOptions.length) selectedCarIndex = 0;
    
    document.getElementById('car-preview-img').src = carOptions[selectedCarIndex].straight;
    document.getElementById('car-name').innerText = carOptions[selectedCarIndex].name;
}

// Load semua variasi background (Pastikan nama filenya sama persis!)
const imgBgSky = new Image();       imgBgSky.src = 'assets/bg_sky.png';
const imgBgSunset = new Image();    imgBgSunset.src = 'assets/bg_sunset.png';
const imgBgNight = new Image();     imgBgNight.src = 'assets/bg_night.png';
const imgBgSunrise = new Image();   imgBgSunrise.src = 'assets/bg_sunrise.png';

// Urutan siklus waktu: Siang -> Senja -> Malam -> Pagi
const backgrounds = [imgBgSky, imgBgSunset, imgBgNight, imgBgSunrise];

// Load semua jenis rintangan
const imgObsBarrier = new Image();  imgObsBarrier.src = 'assets/concrete_barrier.png';
const imgObsCrate = new Image();    imgObsCrate.src = 'assets/crate_stack.png';
const imgObsTire = new Image();     imgObsTire.src = 'assets/tire_stack.png';
const imgObsTire2 = new Image();     imgObsTire2.src = 'assets/tire_barrier.png';
const imgObsBarrel = new Image();   imgObsBarrel.src = 'assets/red_barrel.png';
const imgObsBarrel2 = new Image();   imgObsBarrel2.src = 'assets/rusty_barrel.png';

// Masukkan ke dalam array agar mudah diacak nanti
const obstacleTypes = [imgObsBarrier, imgObsCrate, imgObsTire, imgObsTire2, imgObsBarrel, imgObsBarrel2];

// --- ASSETS DIMENSI ALTERNATIF ---
// Portal
const imgPortal = new Image(); imgPortal.src = 'assets/space/portal.png';

// Space Mode
const imgSpaceShip = new Image();       imgSpaceShip.src  = 'assets/space/spaceship.png';
const imgLaser = new Image();           imgLaser.src      = 'assets/space/laser_shoot.jpg';
const imgAsteroid = new Image();        imgAsteroid.src   = 'assets/space/asteroid_dynamic.jpg';
const imgAlien = new Image();           imgAlien.src      = 'assets/space/alien.jpg';
const imgBgSpace = new Image();         imgBgSpace.src    = 'assets/space/asteroid_static.jpg'; // Used as BG tile
const spaceObstacleTypes = [imgAsteroid, imgAlien];

// Park Mode — Runner sprites
const imgRunnerStraight = new Image(); imgRunnerStraight.src = 'assets/park/person_2.jpg';
const imgRunnerLeft = new Image();     imgRunnerLeft.src     = 'assets/park/person_1.jpg';
const imgRunnerRight = new Image();    imgRunnerRight.src    = 'assets/park/person_3.jpg';

// Park Mode — Park obstacle
const imgParkObstacle = new Image();   imgParkObstacle.src   = 'assets/park/trash_can.jpg';

// Park Mode — Backgrounds (Siang, Senja, Malam, Pagi)
const imgBgParkDay     = new Image();  imgBgParkDay.src     = 'assets/park/bg_sky_park.jpg';
const imgBgParkSunset  = new Image();  imgBgParkSunset.src  = 'assets/park/bg_sunset_park.jpg';
const imgBgParkNight   = new Image();  imgBgParkNight.src   = 'assets/park/bg_night_park.jpg';
const imgBgParkSunrise = new Image();  imgBgParkSunrise.src = 'assets/park/bg_sunrise_park.jpg';
const parkBackgrounds  = [imgBgParkDay, imgBgParkSunset, imgBgParkNight, imgBgParkSunrise];

// --- PLAYER OBJECT ---
const player = {
    y: 550, // Posisi vertikal mobil (tetap di bawah)
    width: 85,
    height: 100,
    sprite: imgCarStraight,
    
    draw: function() {
        // Di Space mode, gambar player di tengah bawah tanpa pseudo-3D offset
        let targetX;
        if (currentDimension === 'space') {
            let lanePositionsSpace = [80, 200, 320];
            targetX = lanePositionsSpace[currentLane] - (this.width / 2);
        } else {
            targetX = LANE_Positions[currentLane] - (this.width / 2);
        }
        
        // Efek bayangan sederhana (tidak di space)
        if (currentDimension !== 'space') {
            ctx.fillStyle = "rgba(0,0,0,0.5)";
            ctx.beginPath();
            ctx.ellipse(targetX + this.width/2, this.y + this.height - 5, this.width/1.5, 10, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Gambar sprite player
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
            ctx.drawImage(this.sprite, targetX, this.y, this.width, this.height);
        } else {
            // Fallback kotak berwarna
            ctx.fillStyle = currentDimension === 'space' ? "#00aaff" : "#ff0055";
            ctx.fillRect(targetX, this.y, this.width, this.height);
        }
    },

    setDirection: function(dir) {
        if (currentDimension === 'car') {
            if (dir === 'left') this.sprite = imgCarLeft;
            if (dir === 'right') this.sprite = imgCarRight;
            if (dir === 'straight') this.sprite = imgCarStraight;
        } else if (currentDimension === 'park') {
            if (dir === 'left') this.sprite = imgRunnerLeft;
            if (dir === 'right') this.sprite = imgRunnerRight;
            if (dir === 'straight') this.sprite = imgRunnerStraight;
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
        ctx.fillRect(0,0, canvas.width, 300);
    }

    ctx.fillStyle = currentDimension === 'park' ? "#27AE60" : "#2c3e50";
    ctx.fillRect(0, 300, canvas.width, canvas.height);

    ctx.fillStyle = currentDimension === 'park' ? "#D4AC0D" : "#555";
    ctx.beginPath();
    ctx.moveTo(150, 300);  
    ctx.lineTo(250, 300);  
    if (currentDimension === 'park') {
        ctx.lineTo(380, 700);  
        ctx.lineTo(20, 700);    
    } else {
        ctx.lineTo(400, 700);  
        ctx.lineTo(0, 700);    
    }
    ctx.fill();

    if (currentDimension === 'car') {
        ctx.strokeStyle = "#FFF";
        ctx.setLineDash([20, 20]); 
        ctx.lineWidth = 2;
        ctx.lineDashOffset = -roadOffset; 

        ctx.beginPath();
        ctx.moveTo(183, 300); 
        ctx.lineTo(133, 700);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(216, 300); 
        ctx.lineTo(266, 700);
        ctx.stroke();
        
        ctx.setLineDash([]); 
    }
}

// --- OBSTACLE LOGIC ---
class Obstacle {
    constructor(lane, isPortal = false) {
        this.lane = lane;
        this.y = 300; 
        this.scale = 0.1; 
        this.isPortal = isPortal;
        
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
            let centerRoadX = 200; 
            let laneOffset = (this.lane - 1) * (30 * (1 + progress * 4)); 
            this.x = centerRoadX + laneOffset;
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
        
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) {
            ctx.drawImage(this.sprite, this.x - w/2, this.y - h, w, h);
        } else {
            ctx.fillStyle = this.isPortal ? "rgba(180,0,255,0.8)" : (currentDimension === 'space' ? "#ff4400" : "red");
            if (this.isPortal) {
                ctx.beginPath();
                ctx.arc(this.x, this.y - h/2, w/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "cyan";
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                ctx.fillRect(this.x - w/2, this.y - h, w, h);
            }
        }
    }
}

// --- PROJECTILE LOGIC ---
class Projectile {
    constructor(lane) {
        this.lane = lane;
        let centerRoadX = 200; 
        let laneOffset = (this.lane - 1) * 150; 
        this.x = centerRoadX + laneOffset;
        this.y = player.y;
    }
    update() {
        this.y -= 10;
        let progress = (this.y - 300) / 400; 
        let centerRoadX = 200; 
        let laneOffset = (this.lane - 1) * (30 * (1 + progress * 4)); 
        this.x = centerRoadX + laneOffset;
    }
    draw() {
        let w = 15;
        let h = 40;
        if (imgLaser.complete && imgLaser.naturalWidth > 0) {
            ctx.drawImage(imgLaser, this.x - w/2, this.y - h, w, h);
        } else {
            // Fallback: gambar laser sebagai garis neon cyan
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
    
    let displayScore = Math.floor(score/10);
    document.getElementById('score').innerText = displayScore;

    if (currentDimension === 'car' && displayScore > 0 && displayScore % 100 === 0 && portalSpawnedAt !== displayScore) {
        portalSpawnedAt = displayScore;
        let randomLane = Math.floor(Math.random() * 3);
        obstacles.push(new Obstacle(randomLane, true));
    }
    
    if (currentDimension !== 'car') {
        dimensionScore++;
        if (Math.floor(dimensionScore/10) >= 100) {
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
    let allObjects = [...obstacles, ...projectiles, {type:'player', y: player.y + player.height}];
    allObjects.sort((a,b) => a.y - b.y);

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
                let carCenterX = LANE_Positions[currentLane];
                ctx.moveTo(carCenterX - 20, player.y + 70); 
                ctx.lineTo(carCenterX - 180, 700);          
                ctx.lineTo(carCenterX + 180, 700);          
                ctx.lineTo(carCenterX + 20, player.y + 70); 
                ctx.fill();
            }
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
        player.width  = 85;
        player.height = 100;
        document.getElementById('shoot-btn').classList.add('hidden');
    } else if (dim === 'space') {
        player.sprite = imgSpaceShip;
        player.width  = 80;
        player.height = 110;
        document.getElementById('shoot-btn').classList.remove('hidden');
    } else if (dim === 'park') {
        player.sprite = imgRunnerStraight;
        player.width  = 70;
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
    let finalScore = Math.floor(score/10);
    if (finalScore > currentHigh) {
        localStorage.setItem('racingHighScore', finalScore);
    }

    document.getElementById('final-score').innerText = finalScore;
    document.getElementById('game-over-screen').classList.remove('hidden');
}