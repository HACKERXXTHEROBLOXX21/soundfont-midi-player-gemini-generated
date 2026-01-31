const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let player, instrument, analyser, dataArray;
let masterGain = audioCtx.createGain();

// Resize canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = resize;
resize();

// Init Analyser
analyser = audioCtx.createAnalyser();
analyser.fftSize = 1024;
masterGain.connect(analyser);
analyser.connect(audioCtx.destination);
dataArray = new Uint8Array(analyser.frequencyBinCount);

// Load Soundfont
Soundfont.instrument(audioCtx, 'acoustic_grand_piano').then(inst => {
    instrument = inst;
    document.getElementById('playBtn').disabled = false;
    document.getElementById('playBtn').innerText = "Play MIDI";
});

// MIDI Player Setup
player = new MidiPlayer.Player(event => {
    if (event.name === 'Note on' && event.velocity > 0) {
        const vol = document.getElementById('volSlider').value;
        instrument.play(event.noteName, audioCtx.currentTime, { 
            gain: (event.velocity / 127) * vol 
        }).connect(masterGain);
    }
});

// File Loading
document.getElementById('fileInput').onchange = e => {
    const reader = new FileReader();
    reader.onload = e => player.loadArrayBuffer(e.target.result);
    reader.readAsArrayBuffer(e.target.files[0]);
};

// Controls
document.getElementById('playBtn').onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    player.isPlaying() ? player.pause() : player.play();
};

document.getElementById('speedSlider').oninput = e => {
    player.setTempo(player.getTempo() * (e.target.value / 100));
};

// --- Visualization Loop ---
function draw() {
    requestAnimationFrame(draw);
    const mode = document.getElementById('visMode').value;
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const colors = ['#ff0000', '#ff9900', '#33ccff', '#ff00ff'];
    ctx.lineWidth = 2;

    if (mode === 'SpectrumSplit') {
        // Split view: draws the waveform in 4 horizontal rows
        const sliceHeight = canvas.height / 4;
        for (let row = 0; row < 4; row++) {
            ctx.strokeStyle = colors[row];
            ctx.beginPath();
            let x = 0;
            let sliceWidth = canvas.width / (dataArray.length / 4);
            
            for (let i = 0; i < dataArray.length / 4; i++) {
                const v = dataArray[i + (row * 128)] / 128.0;
                const y = (v * sliceHeight / 2) + (row * sliceHeight);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.stroke();
        }
    } else {
        // Standard Single Waveform
        ctx.strokeStyle = '#00ff00';
        ctx.beginPath();
        let x = 0;
        let sliceWidth = canvas.width / dataArray.length;
        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        if (mode === 'Filled') {
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.fill();
        }
        ctx.stroke();
    }
}
draw();
