import {
    setUIElements,
    startPatternCapture,
    forceStop,
    finishAndDisplayEncoded,
    stopStream
} from './controller.js';

const previewVideo = document.getElementById('preview');
const chunkListEl = document.getElementById('chunkList');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

setUIElements({
    preview: previewVideo,
    chunkList: chunkListEl,
    start: startBtn,
    stop: stopBtn
});

startBtn.addEventListener('click', async () => {
    try {
        await startPatternCapture(finishAndDisplayEncoded);
    } catch (e) {
        console.log('Error starting pattern capture:', e);
        stopStream();
    }
});

stopBtn.addEventListener('click', () => {
    forceStop();
});

window.addEventListener('beforeunload', () => {
    try { stopStream(); } catch {}
});
