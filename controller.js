// controller.js
// Handles all video/camera/encoding/decoding logic for the app

const PATTERN = "00110011001100110011"; // 20 frames
const TOTAL_DURATION_MS = 10000; // 10 seconds
const FRAMES = PATTERN.length;
const INTERVAL_MS = TOTAL_DURATION_MS / FRAMES; // 500 ms

let mediaStream = null;
let encoder = null;
let encodedChunks = [];
let capturing = false;
let captureTimer = null;
let startTime = 0;
let chosenTrack = null;
let decoder = null;

// UI elements passed from index.js
let previewVideo, chunkListEl, startBtn, stopBtn;

function setUIElements({ preview, chunkList, start, stop }) {
    previewVideo = preview;
    chunkListEl = chunkList;
    startBtn = start;
    stopBtn = stop;
}

async function getFrontFacingCameraDevice() {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    if (videoInputs.length === 0) throw new Error('No video input devices found.');
    const frontCandidates = videoInputs.filter(d => /front|user/i.test(d.label));
    return (frontCandidates[0] || videoInputs[0]).deviceId;
}

async function startStream() {
    const deviceId = await getFrontFacingCameraDevice();
    const constraints = {
        video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
        },
        audio: false
    };
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    previewVideo.srcObject = mediaStream;
    chosenTrack = mediaStream.getVideoTracks()[0];
    await previewVideo.play();
}

function stopStream() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
        if (previewVideo) previewVideo.srcObject = null;
        chosenTrack = null;
    }
}

function toggleBackground(bit) {
    document.body.style.backgroundColor = bit === '0' ? 'black' : 'white';
}

async function setupEncoder(width, height) {
    encodedChunks = [];
    encoder = new VideoEncoder({
        output: (chunk, meta) => {
            const arr = new Uint8Array(chunk.byteLength);
            chunk.copyTo(arr);
            encodedChunks.push({
                data: arr,
                timestamp: chunk.timestamp,
                type: chunk.type
            });
        },
        error: (e) => {
            console.error('Encoder error:', e);
        }
    });
    encoder.configure({
        codec: 'vp8',
        width,
        height,
        bitrate: 500_000,
        framerate: 2
    });
}

function makeVideoFrameFromPreview() {
    const ts = Math.floor(performance.now() * 1000);
    return new VideoFrame(previewVideo, { timestamp: ts });
}

async function startPatternCapture(onFinish) {
    if (!mediaStream) {
        await startStream();
    }
    if (previewVideo.videoWidth === 0 || previewVideo.videoHeight === 0) {
        await new Promise(r => setTimeout(r, 250));
    }
    const width = previewVideo.videoWidth || 320;
    const height = previewVideo.videoHeight || 240;
    await setupEncoder(width, height);
    capturing = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    startTime = performance.now();
    let step = 0;
    captureTimer = setInterval(async () => {
        if (!capturing) return;
        const bit = PATTERN[step];
        toggleBackground(bit);
        await new Promise(r => setTimeout(r, 40));
        try {
            const frame = makeVideoFrameFromPreview();
            const keyFrame = (step === 0) || (step > 0 && PATTERN[step] !== PATTERN[step - 1]);
            encoder.encode(frame, { keyFrame });
            frame.close();
        } catch (e) {
            console.error('Error capturing frame:', e);
        }
        step++;
        if (step >= FRAMES) {
            clearInterval(captureTimer);
            capturing = false;
            try {
                await encoder.flush();
            } catch (e) {
                console.warn('Error flushing encoder:', e);
            }
            if (onFinish) onFinish(encodedChunks);
            cleanup();
        }
    }, INTERVAL_MS);
}

function forceStop() {
    if (captureTimer) {
        clearInterval(captureTimer);
        captureTimer = null;
    }
    capturing = false;
    cleanup();
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

async function finishAndDisplayEncoded() {
    if (!chunkListEl) return;
    chunkListEl.innerHTML = '';
    if (encodedChunks.length === 0) {
        chunkListEl.textContent = 'No encoded chunks to display.';
        return;
    }
    if (!('VideoDecoder' in window)) {
        chunkListEl.textContent = 'VideoDecoder not available; cannot decode frames.';
        return;
    }
    async function decodeChunkToDataURL(chunkData, chunkType, chunkTimestamp) {
        return new Promise((resolve, reject) => {
            const tempCanvas = document.createElement('canvas');
            let frameWidth = 320, frameHeight = 240;
            const decoder = new VideoDecoder({
                output: (frame) => {
                    frameWidth = frame.displayWidth;
                    frameHeight = frame.displayHeight;
                    tempCanvas.width = frameWidth;
                    tempCanvas.height = frameHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(frame, 0, 0, frameWidth, frameHeight);
                    frame.close();
                    resolve(tempCanvas.toDataURL());
                },
                error: (e) => {
                    reject(e);
                }
            });
            decoder.configure({ codec: 'vp8' });
            const chunk = new EncodedVideoChunk({
                type: chunkType,
                timestamp: chunkTimestamp,
                data: chunkData
            });
            decoder.decode(chunk);
        });
    }
    for (let i = 0; i < encodedChunks.length; i++) {
        const c = encodedChunks[i];
        const item = document.createElement('li');
        item.textContent = `Chunk #${i + 1}: timestamp=${c.timestamp}, type=${c.type}, size=${c.data.length} bytes`;
        try {
            const imgURL = await decodeChunkToDataURL(c.data, c.type, c.timestamp);
            const img = document.createElement('img');
            img.src = imgURL;
            img.style.maxWidth = '160px';
            img.style.maxHeight = '120px';
            img.alt = `Frame ${i + 1}`;
            item.appendChild(document.createElement('br'));
            item.appendChild(img);
        } catch (e) {
            item.appendChild(document.createTextNode(' (Could not decode frame)'));
        }
        chunkListEl.appendChild(item);
    }
}

function cleanup() {
    try {
        if (encoder) {
            try { encoder.close(); } catch {}
            encoder = null;
        }
        if (decoder) {
            try { decoder.close(); } catch {}
            decoder = null;
        }
    } catch (e) {
        console.warn('Cleanup encoder/decoder error', e);
    }
    stopStream();
    startBtn.disabled = false;
    stopBtn.disabled = true;
    document.body.style.backgroundColor = '';
}

export {
    setUIElements,
    startPatternCapture,
    forceStop,
    finishAndDisplayEncoded,
    stopStream,
    getFrontFacingCameraDevice,
    toggleBackground
};
