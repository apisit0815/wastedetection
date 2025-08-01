// <<<< ‼️ สำคัญ: ใส่ลิงก์โมเดล Teachable Machine ของคุณที่นี่ ‼️ >>>>
const URL = "https://teachablemachine.withgoogle.com/models/kOI6h0QV-/";

let model, maxPredictions, stream;

// อ้างอิงถึง element ต่างๆ ในหน้าเว็บ
const statusDiv = document.getElementById("status");
const imageUpload = document.getElementById("image-upload");
const imagePreview = document.getElementById("image-preview");
const labelContainer = document.getElementById("label-container");
const inputOptions = document.getElementById("input-options");
const browseBtn = document.getElementById("browse-btn");
const cameraBtn = document.getElementById("camera-btn");
const cameraContainer = document.getElementById("camera-container");
const videoPreview = document.getElementById("video-preview");
const captureBtn = document.getElementById("capture-btn");
const closeCameraBtn = document.getElementById("close-camera-btn");

// ฟังก์ชันเริ่มต้นระบบ: โหลดโมเดล AI
async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    
    statusDiv.innerHTML = "กำลังโหลดโมเดล...";
    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        statusDiv.innerHTML = "เลือกวิธีการป้อนรูปภาพ";
        inputOptions.style.display = 'flex'; // แสดงปุ่มเลือก
    } catch (e) {
        console.error(e);
        statusDiv.innerHTML = "เกิดข้อผิดพลาด: ไม่สามารถโหลดโมเดลได้";
        statusDiv.classList.add("error");
    }
}

// ฟังก์ชันสำหรับเปิดกล้อง
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoPreview.srcObject = stream;
        
        inputOptions.style.display = 'none';
        imagePreview.style.display = 'none';
        cameraContainer.style.display = 'flex';
        labelContainer.innerHTML = "";
        statusDiv.innerHTML = "จัดตำแหน่งแล้วกด 'ถ่ายภาพ'";
    } catch (e) {
        console.error("เกิดข้อผิดพลาดในการเข้าถึงกล้อง:", e);
        statusDiv.innerHTML = "ไม่สามารถเข้าถึงกล้องได้";
        statusDiv.classList.add("error");
    }
}

// ฟังก์ชันสำหรับปิดกล้อง
function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    inputOptions.style.display = 'flex';
    cameraContainer.style.display = 'none';
    statusDiv.innerHTML = "เลือกวิธีการป้อนรูปภาพ";
}

// ฟังก์ชันสำหรับถ่ายภาพจากวิดีโอ
function captureImage() {
    const canvas = document.createElement("canvas");
    canvas.width = videoPreview.videoWidth;
    canvas.height = videoPreview.videoHeight;
    canvas.getContext("2d").drawImage(videoPreview, 0, 0, canvas.width, canvas.height);

    imagePreview.src = canvas.toDataURL("image/jpeg");
    imagePreview.style.display = 'block';

    closeCamera();
}

// ฟังก์ชันทำนายผลจากรูปภาพ
async function predict() {
    if (!model) return;

    labelContainer.innerHTML = "";
    statusDiv.innerHTML = "กำลังวิเคราะห์...";
    statusDiv.classList.remove("error");

    try {
        const prediction = await model.predict(imagePreview);
        for (let i = 0; i < maxPredictions; i++) {
            const classPrediction =
                prediction[i].className + ": " + (prediction[i].probability * 100).toFixed(2) + "%";
            const div = document.createElement("div");
            div.innerHTML = classPrediction;
            labelContainer.appendChild(div);
        }
        statusDiv.innerHTML = "เลือกภาพใหม่เพื่อทดสอบอีกครั้ง";
        inputOptions.style.display = 'flex';
    } catch (e) {
        console.error(e);
        statusDiv.innerHTML = "เกิดข้อผิดพลาดระหว่างการทำนายผล";
        statusDiv.classList.add("error");
    }
}

// ---- Event Listeners ----
imagePreview.onload = predict;

imageUpload.addEventListener("change", (event) => {
    if (event.target.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            cameraContainer.style.display = 'none';
            inputOptions.style.display = 'none';
        };
        reader.readAsDataURL(event.target.files[0]);
    }
});

browseBtn.addEventListener("click", () => imageUpload.click());
cameraBtn.addEventListener("click", startCamera);
captureBtn.addEventListener("click", captureImage);
closeCameraBtn.addEventListener("click", closeCamera);

// เริ่มการทำงานทั้งหมด
init();
