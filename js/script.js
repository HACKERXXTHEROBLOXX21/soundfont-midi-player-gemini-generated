const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let player, instrument, analyser, dataArray;
let masterGain = audioCtx.createGain();

// Resize canvas to window
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.onresize = resize;
resize();

// 1. Audio Setup
analyser = audioCtx.createAnalyser();
analyser.fftSize = 2048;
masterGain.connect(analyser);
analyser.connect(audioCtx.destination);
dataArray = new Uint8Array(analyser.frequencyBinCount);

// 2. Load Soundfont
Soundfont.instrument(audioCtx, 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/acoustic_grand_piano-mp3.js').then(inst => {
    instrument = inst;
    const pBtn = document.getElementById('playBtn');
    pBtn.disabled = false;
    pBtn.innerText = "Play / Pause";
});

// 3. MIDI Engine
player = new MidiPlayer.Player(event => {
    if (event.name === 'Note on' && event.velocity > 0) {
        const vol = document.getElementById('volSlider').value;
        instrument.play(event.noteName, audioCtx.currentTime, { 
            gain: (event.velocity / 127) * vol 
        }).connect(masterGain);
    }
});

// 4. Input Handlers
document.getElementById('midiInput').onchange = e => {
    const reader = new FileReader();
    reader.onload = e => {
        player.loadArrayBuffer(e.target.result);
        document.getElementById('fileStatus').innerText = "Loaded: " + e.target.fileName;
    };
    reader.readAsArrayBuffer(e.target.files[0]);
};

document.getElementById('playBtn').onclick = () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    player.isPlaying() ? player.pause() : player.play();
};

document.getElementById('speedSlider').oninput = e => {
    player.setTempo(player.getTempo() * (e.target.value / 100));
};

// 5. Font Selector Logic
const fontSelect = document.getElementById('fontSelect');
const fontUpload = document.getElementById('fontUpload');

fontSelect.onchange = e => {
    if (e.target.value === 'UPLOAD') fontUpload.click();
    else document.body.style.fontFamily = e.target.value;
};

fontUpload.onchange = async e => {
    const file = e.target.files[0];
    const fontName = 'Custom_' + Date.now();
    const font = new FontFace(fontName, `url(${URL.createObjectURL(file)})`);
    await font.load();
    document.fonts.add(font);
    document.body.style.fontFamily = fontName;
};

// 6. Visualizer Drawing Loop
function draw() {
    requestAnimationFrame(draw);
    const mode = document.getElementById('visMode').value;
    
    // Clear Background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mode === 'SpectrumSplit') {
        analyser.getByteTimeDomainData(dataArray);
        const rows = 4;
        const colors = ['#ff3300', '#ff9900', '#00ccff', '#cc33ff'];
        const rowH = canvas.height / rows;
        
        for (let r = 0; r < rows; r++) {
            ctx.beginPath();
            ctx.strokeStyle = colors[r];
            let x = 0;
            let slice = canvas.width / (dataArray.length / rows);
            for (let i = 0; i < dataArray.length / rows; i++) {
                const v = dataArray[i + (r * 256)] / 128.0;
                const y = (v * rowH / 2) + (r * rowH);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                x += slice;
            }
            ctx.stroke();
        }
    } else if (mode === 'Spectrum') {
        analyser.getByteFrequencyData(dataArray);
        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = dataArray[i];
            ctx.fillStyle = `rgb(${barHeight + 100}, 150, 0)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    } else {
        analyser.getByteTimeDomainData(dataArray);
        ctx.beginPath();
        ctx.strokeStyle = '#ff9900';
        let x = 0;
        let slice = canvas.width / dataArray.length;
        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            x += slice;
        }
        if (mode === 'Filled') {
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.fillStyle = 'rgba(255, 153, 0, 0.1)';
            ctx.fill();
        }
        ctx.stroke();
    }
}
draw();
