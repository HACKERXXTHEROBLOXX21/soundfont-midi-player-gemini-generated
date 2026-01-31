const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
const analyser = audioCtx.createAnalyser();
let player, instrument;

// Connection chain
masterGain.connect(analyser);
analyser.connect(audioCtx.destination);
analyser.fftSize = 1024; // Optimized for less lag

// 1. Separate Loaders
document.getElementById('midiFile').onchange = async (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        player.loadArrayBuffer(event.target.result);
        log("MIDI Loaded Successfully.");
        checkReady();
    };
    reader.readAsArrayBuffer(e.target.files[0]);
};

document.getElementById('sf2File').onchange = async (e) => {
    log("Processing Soundfont... please wait.");
    const buffer = await e.target.files[0].arrayBuffer();
    // Using SF2 Player logic
    try {
        instrument = new window.SF2Player(audioCtx, buffer); 
        log("Soundfont Loaded Successfully.");
        checkReady();
    } catch(err) { log("Error: Invalid SF2 file."); }
};

function checkReady() {
    if (instrument && player) {
        const btn = document.getElementById('playBtn');
        btn.disabled = false;
        btn.style.opacity = "1";
        log("SYSTEM READY. Press Play.");
    }
}

// 2. Transport Logic
document.getElementById('playBtn').onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (player.isPlaying()) {
        player.pause();
        document.getElementById('playBtn').innerText = "▶ PLAY MIDI";
    } else {
        player.play();
        document.getElementById('playBtn').innerText = "⏸ PAUSE";
    }
};

// 3. Visualization Loop (Spectrum Split)
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const dataArray = new Uint8Array(analyser.frequencyBinCount);

function animate() {
    requestAnimationFrame(animate);
    const mode = document.getElementById('visSelect').value;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mode === 'SpectrumSplit') {
        analyser.getByteTimeDomainData(dataArray);
        const rows = 4;
        const h = canvas.height / rows;
        const colors = ['#f00', '#f90', '#0cf', '#c0f'];
        for (let r = 0; r < rows; r++) {
            ctx.beginPath();
            ctx.strokeStyle = colors[r];
            let x = 0;
            let step = canvas.width / (dataArray.length / rows);
            for (let i = 0; i < dataArray.length / rows; i++) {
                const v = dataArray[i + (r * 256)] / 128;
                const y = (v * h / 2) + (r * h);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                x += step;
            }
            ctx.stroke();
        }
    }
}
animate();

function log(msg) { document.getElementById('debugLog').innerText = "System: " + msg; }
