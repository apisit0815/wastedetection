// URL โมเดลของคุณ (ตรวจสอบให้แน่ใจว่าถูกต้อง)
const URL = "https://teachablemachine.withgoogle.com/models/kOI6h0QV-/";

let model, maxPredictions, stream;
let currentFacingMode = 'environment';
let score = 0;
let combo = 0;

// อ้างอิง UI
const statusDiv = document.getElementById("status");
const scoreDisplay = document.getElementById("score");
const comboBadge = document.getElementById("combo-badge");
const mascot = document.getElementById("mascot");
const gameMessage = document.getElementById("game-message");
const gameContainer = document.querySelector(".game-container");

const imageUpload = document.getElementById("image-upload");
const imagePreview = document.getElementById("image-preview");
const inputOptions = document.getElementById("input-options");
const cameraContainer = document.getElementById("camera-container");
const videoPreview = document.getElementById("video-preview");

// ---- ระบบสร้างเสียงเกม 8-bit (ไม่ต้องใช้ไฟล์ mp3) ----
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration, vol=0.1) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}
const sfx = {
    coin: () => { playTone(1200, 'sine', 0.1); setTimeout(() => playTone(1600, 'sine', 0.3), 100); },
    error: () => { playTone(300, 'sawtooth', 0.2); setTimeout(() => playTone(200, 'sawtooth', 0.4), 150); },
    shutter: () => { playTone(800, 'square', 0.05); },
    click: () => { playTone(600, 'sine', 0.05); }
};
// ---------------------------------------------------

// โหลดโมเดล
async function init() {
    statusDiv.innerHTML = "⏳ กำลังเรียกสมองกล AI...";
    try {
        model = await tmImage.load(URL + "model.json", URL + "metadata.json");
        maxPredictions = model.getTotalClasses();
        statusDiv.innerHTML = "พร้อมแล้ว! เลือกวิธีสแกนขยะเลย";
        document.getElementById("camera-btn").addEventListener("click", () => { sfx.click(); startCamera(); });
        document.getElementById("browse-btn").addEventListener("click", () => { sfx.click(); imageUpload.click(); });
    } catch (e) {
        statusDiv.innerHTML = "❌ โหลดภารกิจล้มเหลว ตรวจสอบอินเทอร์เน็ต";
    }
}

// ระบบกล้อง
async function startCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    const constraints = { video: { facingMode: { exact: currentFacingMode } } };

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = stream;
        inputOptions.classList.add("hidden");
        imagePreview.style.display = 'none';
        cameraContainer.style.display = 'flex';
        statusDiv.innerHTML = "เล็งขยะให้อยู่ตรงกลาง แล้วกดถ่าย!";
        gameContainer.className = "game-container"; // รีเซ็ตสีพื้นหลัง
        mascot.innerText = "👀";
        gameMessage.innerText = "เล็งดีๆ นะฮีโร่!";
    } catch (e) {
        if (currentFacingMode === 'environment') {
            currentFacingMode = 'user'; // สลับเป็นกล้องหน้าอัตโนมัติถ้าไม่มีกล้องหลัง
            startCamera(); 
        } else {
            statusDiv.innerHTML = "❌ ไม่สามารถเปิดกล้องได้";
        }
    }
}

function captureImage() {
    sfx.shutter();
    const canvas = document.createElement("canvas");
    canvas.width = videoPreview.videoWidth; canvas.height = videoPreview.videoHeight;
    canvas.getContext("2d").drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
    imagePreview.src = canvas.toDataURL("image/jpeg");
    imagePreview.style.display = 'block';
    
    if (stream) stream.getTracks().forEach(track => track.stop());
    cameraContainer.style.display = 'none';
    inputOptions.classList.remove("hidden");
}

// วิเคราะห์ภาพและให้คะแนน
async function predict() {
    if (!model) return;
    statusDiv.innerHTML = "🧠 AI กำลังวิเคราะห์...";
    mascot.innerText = "🤔";
    gameMessage.innerText = "อืมมม... ขยะชิ้นนี้คืออะไรน้า?";

    const prediction = await model.predict(imagePreview);
    
    // หาค่าเปอร์เซ็นต์ที่สูงที่สุด
    let bestMatch = prediction[0];
    for (let i = 1; i < maxPredictions; i++) {
        if (prediction[i].probability > bestMatch.probability) {
            bestMatch = prediction[i];
        }
    }

    const accuracy = Math.round(bestMatch.probability * 100);
    gameContainer.className = "game-container"; // รีเซ็ตคลาส

    // ถ้า AI มั่นใจเกิน 70% ให้ตัดสินผลลัพธ์
    if (accuracy > 70) {
        let earnedPoints = 10;
        
        if (bestMatch.className.toLowerCase().includes("null") || bestMatch.className.toLowerCase().includes("background")) {
            // ไม่ใช่ขยะ
            mascot.innerText = "❓";
            gameMessage.innerText = `นี่ไม่ใช่ขยะนี่นา! ลองหาขยะของจริงมาถ่ายดูนะ`;
            combo = 0;
            sfx.error();
            mascot.classList.add("shake"); setTimeout(() => mascot.classList.remove("shake"), 500);
        } else {
            // ถ่ายติดขยะจริง! คำนวณคอมโบ
            combo++;
            if (combo >= 2) {
                earnedPoints *= 2;
                comboBadge.classList.remove("hidden");
            } else {
                comboBadge.classList.add("hidden");
            }
            
            score += earnedPoints;
            scoreDisplay.innerText = score;
            sfx.coin(); // เสียงได้แต้ม

            // เปลี่ยนหน้าตาตามประเภทขยะ (แก้ชื่อคลาสภาษาอังกฤษให้ตรงกับที่คุณตั้งใน Teachable Machine ได้เลย)
            const className = bestMatch.className.toLowerCase();
            if (className.includes("recycle")) {
                mascot.innerText = "♻️🤩";
                gameMessage.innerText = `ยอดเยี่ยม! นี่คือ ขยะรีไซเคิล (+${earnedPoints} แต้ม)`;
                gameContainer.classList.add("bg-recycle");
            } else if (className.includes("organic")) {
                mascot.innerText = "🍂😋";
                gameMessage.innerText = `ดีมาก! นี่คือ ขยะอินทรีย์ เอาไปทำปุ๋ยได้ (+${earnedPoints} แต้ม)`;
                gameContainer.classList.add("bg-organic");
            } else if (className.includes("hazardous")) {
                mascot.innerText = "☠️😱";
                gameMessage.innerText = `ระวัง! นี่คือ ขยะอันตราย ต้องทิ้งแยกให้ดี (+${earnedPoints} แต้ม)`;
                gameContainer.classList.add("bg-hazardous");
                sfx.error(); // เพิ่มเสียงเตือนให้ขยะอันตราย
            } else {
                mascot.innerText = "🗑️👍";
                gameMessage.innerText = `เยี่ยม! นี่คือ ขยะทั่วไป ทิ้งลงถังให้เรียบร้อย (+${earnedPoints} แต้ม)`;
                gameContainer.classList.add("bg-general");
            }
            
            // แอนิเมชันคะแนนเด้ง
            scoreDisplay.classList.add("bounce");
            setTimeout(() => scoreDisplay.classList.remove("bounce"), 1000);
        }
    } else {
        // AI ไม่มั่นใจ
        mascot.innerText = "😵‍💫";
        gameMessage.innerText = `ภาพไม่ชัดเลย AI งงไปหมดแล้ว ถ่ายใหม่ให้ชัดๆ หน่อยนะ!`;
        combo = 0;
        comboBadge.classList.add("hidden");
        sfx.error();
    }
    
    statusDiv.innerHTML = "ภารกิจเสร็จสิ้น! สแกนชิ้นต่อไปเลย";
}

// Event Listeners ต่างๆ
document.getElementById("switch-camera-btn").addEventListener("click", () => {
    sfx.click();
    currentFacingMode = (currentFacingMode === 'user') ? 'environment' : 'user';
    startCamera();
});

document.getElementById("close-camera-btn").addEventListener("click", () => {
    sfx.click();
    if (stream) stream.getTracks().forEach(track => track.stop());
    cameraContainer.style.display = 'none';
    inputOptions.classList.remove("hidden");
    statusDiv.innerHTML = "ยกเลิกการใช้กล้องแล้ว";
    mascot.innerText = "🤖";
    gameMessage.innerText = "พร้อมลุยภารกิจต่อไป!";
});

document.getElementById("capture-btn").addEventListener("click", captureImage);
imagePreview.onload = predict;

imageUpload.addEventListener("change", (event) => {
    if (event.target.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            cameraContainer.style.display = 'none';
            inputOptions.classList.remove("hidden");
        };
        reader.readAsDataURL(event.target.files[0]);
    }
});

// เริ่มเกม!
init();
