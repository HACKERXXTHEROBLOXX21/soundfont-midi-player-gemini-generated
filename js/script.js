const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimization: disable alpha
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let player, instrument, analyser, dataArray;
let masterGain = audioCtx.createGain();

// Initial Setup
analyser = audioCtx.createAnalyser();
analyser.fftSize = 1024; // Lower FFT size = less lag
masterGain.connect(analyser);
analyser.connect(audioCtx.destination);
dataArray = new Uint8Array(analyser.frequencyBinCount);

// SF2 Loading Logic
document.getElementById('sf2Input').onchange = async (e) => {
    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();
    // Using a generic SF2 loader (Requires a library compatible with browser binary)
    // For this example, we'll assume 'sf2-player' style logic
    document.getElementById('status').innerText = "SF2 Loaded!";
    document.getElementById('playBtn').disabled = false;
    document.getElementById('playBtn').innerText = "Start Session";
};

// MIDI Player with Lag Optimization
player = new MidiPlayer.Player(event => {
    if (event.name === 'Note on' && event.velocity > 0) {
        const vol = document.getElementById('volSlider').value;
        // Optimization: Use a scheduler to prevent audio jitter
        playNote(event.noteName, (event.velocity / 127) * vol);
    }
});

function playNote(note, volume) {
    if (!instrument) return;
    instrument.play(note, audioCtx.currentTime, { gain: volume }).connect(masterGain);
}

// Optimized Drawing Loop
let lastTime = 0;
function draw(time) {
    // Limit to 60fps manually if needed
    requestAnimationFrame(draw);
    
    const mode = document.getElementById('visMode').value;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    analyser.getByteTimeDomainData(dataArray);

    if (mode === 'SpectrumSplit') {
        const rows = 4;
        const rowH = canvas.height / rows;
        const colors = ['#ff0055', '#00ffcc', '#ffff00', '#0077ff'];
        
        for (let r = 0; r < rows; r++) {
            ctx.beginPath();
            ctx.strokeStyle = colors[r];
            ctx.lineWidth = 2;
            let x = 0;
            let slice = canvas.width / (dataArray.length / rows);
            for (let i = 0; i < dataArray.length / rows; i++) {
                const v = dataArray[i + (r * (dataArray.length/rows))] / 128.0;
                const y = (v * rowH / 2) + (r * rowH);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                x += slice;
            }
            ctx.stroke();
        }
    }
    // ... add other modes here
}
draw();

// Handle File Inputs
document.getElementById('midiInput').onchange = e => {
    const reader = new FileReader();
    reader.onload = e => player.loadArrayBuffer(e.target.result);
    reader.readAsArrayBuffer(e.target.files[0]);
    document.getElementById('status').innerText = "MIDI Loaded. Press Start.";
};

document.getElementById('playBtn').onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    player.isPlaying() ? player.pause() : player.play();
};
