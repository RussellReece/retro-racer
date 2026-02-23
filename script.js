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
let obstacles = [];
let spawnTimer = 0; // Timer untuk mengatur jarak antar rintangan

// --- ASSETS LOAD ---
const imgCarStraight = new Image(); imgCarStraight.src = 'assets/car.gif';
const imgCarLeft = new Image();     imgCarLeft.src = 'assets/car_left.gif';
const imgCarRight = new Image();    imgCarRight.src = 'assets/car_right.gif';

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

// --- PLAYER OBJECT ---
const player = {
    y: 550, // Posisi vertikal mobil (tetap di bawah)
    width: 85,
    height: 100,
    sprite: imgCarStraight,
    
    draw: function() {
        // Gambar mobil di posisi jalur saat ini
        let targetX = LANE_Positions[currentLane] - (this.width / 2);
        
        // Efek bayangan sederhana
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.ellipse(targetX + this.width/2, this.y + this.height - 5, this.width/1.5, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Gambar Mobil
        ctx.drawImage(this.sprite, targetX, this.y, this.width, this.height);
    },

    setDirection: function(dir) {
        if (dir === 'left') this.sprite = imgCarLeft;
        if (dir === 'right') this.sprite = imgCarRight;
        if (dir === 'straight') this.sprite = imgCarStraight;
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
    // Gunakan fungsi helper untuk mendapatkan index background
    let phaseIndex = getPhaseIndex();
    let currentBg = backgrounds[phaseIndex];

    // 1. Gambar Background Langit/Kota yang sedang aktif
    if (currentBg && currentBg.complete) {
        ctx.drawImage(currentBg, 0, 0, canvas.width, 300); 
    } else {
        ctx.fillStyle = "#87CEEB"; 
        ctx.fillRect(0,0, canvas.width, 300);
    }

    // 2. Gambar Tanah Dasar (Hijau/Gelap)
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, 300, canvas.width, canvas.height);

    // 3. Gambar Jalan Raya (Trapesium)
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.moveTo(150, 300);  // Kiri Atas
    ctx.lineTo(250, 300);  // Kanan Atas
    ctx.lineTo(400, 700);  // Kanan Bawah
    ctx.lineTo(0, 700);    // Kiri Bawah
    ctx.fill();

    // 4. Garis Putus-putus Bergerak
    ctx.strokeStyle = "#FFF";
    ctx.setLineDash([20, 20]); 
    ctx.lineWidth = 2;
    ctx.lineDashOffset = -roadOffset; 

    // Garis Kiri
    ctx.beginPath();
    ctx.moveTo(183, 300); 
    ctx.lineTo(133, 700);
    ctx.stroke();

    // Garis Kanan
    ctx.beginPath();
    ctx.moveTo(216, 300); 
    ctx.lineTo(266, 700);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset garis
}

// --- OBSTACLE LOGIC ---
class Obstacle {
    constructor(lane) {
        this.lane = lane;
        this.y = 300; 
        this.scale = 0.1; 
        
        // Pilih rintangan secara acak dari array obstacleTypes
        let randomIndex = Math.floor(Math.random() * obstacleTypes.length);
        this.sprite = obstacleTypes[randomIndex];
    }

    update() {
        this.y += gameSpeed;
        let progress = (this.y - 300) / 400; 
        this.scale = 0.2 + (progress * 0.8); 

        let centerRoadX = 200; 
        let laneOffset = (this.lane - 1) * (30 * (1 + progress * 4)); 
        this.x = centerRoadX + laneOffset;
    }

    draw() {
        let w = 90 * this.scale;
        let h = 90 * this.scale;
        
        // Gambar menggunakan sprite yang terpilih secara acak untuk rintangan ini
        if (this.sprite && this.sprite.complete) {
            ctx.drawImage(this.sprite, this.x - w/2, this.y - h, w, h);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(this.x - w/2, this.y - h, w, h);
        }
    }
}

// --- INPUT HANDLING ---
document.addEventListener('keydown', (e) => {
    if (!isRunning) {
        if (e.code === 'Space') startGame();
        return;
    }

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

// --- GAME LOOP ---
function update() {
    if (isGameOver) return;

    roadOffset += gameSpeed;
    score++;
    document.getElementById('score').innerText = Math.floor(score/10);

    // --- PERBAIKAN LOGIKA SPAWN ---
    spawnTimer--; // Kurangi timer setiap frame
    if (spawnTimer <= 0) {
        spawnPattern();
        
        // Reset timer agar rintangan tidak menumpuk
        // Semakin cepat game (gameSpeed tinggi), semakin cepat rintangan muncul
        // Tapi kita batasi minimal 40 frame agar ada jarak aman
        spawnTimer = Math.max(40, 200 / gameSpeed); 
    }

    // Update Obstacles & Collision Check
    obstacles.forEach((obs, index) => {
        obs.update();

        // Cek Tabrakan (Logika hitbox sedikit diperkecil agar lebih forgiving)
        if (obs.y > player.y + 40 &&          // Bagian atas rintangan menyentuh mobil
            obs.y < player.y + player.height && // Rintangan belum lewat mobil
            obs.lane === currentLane) {         // Jalur sama
            
            gameOver();
        }

        // Hapus jika lewat layar
        if (obs.y > canvas.height + 50) {
            obstacles.splice(index, 1);
        }
    });

    // Difficulty Increase
    gameSpeed += 0.002; // Naikkan kecepatan perlahan
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
    
    // 3. Urutkan dan Gambar Rintangan & Mobil
    let allObjects = [...obstacles, {type:'player', y: player.y + player.height}];
    allObjects.sort((a,b) => a.y - b.y);

    allObjects.forEach(obj => {
        if (obj.type === 'player') player.draw();
        else obj.draw();
    });

    // 4. --- EFEK PENCAHAYAAN (OVERLAY) ---
    let phaseIndex = getPhaseIndex();
    
    // 0: Siang (Tidak ada efek overlay, biarkan default)
    
    if (phaseIndex === 1) { 
        // 1: Senja (Lapisan warna Oranye/Kemerahan transparan)
        ctx.fillStyle = "rgba(220, 100, 0, 0.25)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
    } else if (phaseIndex === 2) { 
        // 2: Malam (Lapisan warna Biru Gelap yang pekat)
        ctx.fillStyle = "rgba(0, 10, 40, 0.65)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // BONUS: Sorot Lampu Mobil (Headlights) membelah kegelapan!
        ctx.fillStyle = "rgba(255, 255, 150, 0.25)"; // Warna kuning cahaya
        ctx.beginPath();
        let carCenterX = LANE_Positions[currentLane];
        // Gambar trapesium cahaya dari lampu belakang mobil ke arah jalan
        ctx.moveTo(carCenterX - 20, player.y + 70); 
        ctx.lineTo(carCenterX - 180, 700);          
        ctx.lineTo(carCenterX + 180, 700);          
        ctx.lineTo(carCenterX + 20, player.y + 70); 
        ctx.fill();
        
    } else if (phaseIndex === 3) { 
        // 3: Pagi/Sunrise (Lapisan warna Kuning/Pink hangat)
        ctx.fillStyle = "rgba(255, 180, 100, 0.2)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function loop() {
    if (isRunning && !isGameOver) {
        update();
        draw();
        requestAnimationFrame(loop);
    }
}

// --- GAME STATES ---
function startGame() {
    isRunning = true;
    isGameOver = false;
    score = 0;
    gameSpeed = 5;
    obstacles = [];
    currentLane = 1;
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    
    // Load High Score
    let savedScore = localStorage.getItem('racingHighScore') || 0;
    document.getElementById('high-score').innerText = savedScore;

    loop();
}

function gameOver() {
    isGameOver = true;
    
    // Cek High Score
    let currentHigh = localStorage.getItem('racingHighScore') || 0;
    let finalScore = Math.floor(score/10);
    if (finalScore > currentHigh) {
        localStorage.setItem('racingHighScore', finalScore);
    }

    document.getElementById('final-score').innerText = finalScore;
    document.getElementById('game-over-screen').classList.remove('hidden');
}