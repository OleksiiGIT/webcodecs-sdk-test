// Mock DOM and browser APIs before importing controller.js
if (typeof global.navigator === 'undefined') {
    global.navigator = {};
}
global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue(true),
    enumerateDevices: jest.fn().mockResolvedValue([
        { kind: 'videoinput', deviceId: 'abc', label: 'user camera' },
        { kind: 'videoinput', deviceId: 'def', label: 'back camera' }
    ])
};
if (typeof document === 'undefined') {
    global.document = { body: { style: { backgroundColor: '' } } };
}

import { jest } from '@jest/globals';
import {
    setUIElements,
    startPatternCapture,
    forceStop,
    finishAndDisplayEncoded,
    stopStream,
    getFrontFacingCameraDevice,
    toggleBackground
} from './controller.js';

describe('controller.js', () => {
    beforeEach(() => {
        jest.resetModules();
        document.body.style.backgroundColor = '';
    });

    test('setUIElements sets UI elements', () => {
        const preview = {};
        const chunkList = {};
        const start = {};
        const stop = {};
        expect(() => setUIElements({ preview, chunkList, start, stop })).not.toThrow();
    });

    test('toggleBackground sets body background color', () => {
        toggleBackground('0');
        expect(document.body.style.backgroundColor).toBe('black');
        toggleBackground('1');
        expect(document.body.style.backgroundColor).toBe('white');
    });

    test('getFrontFacingCameraDevice returns a deviceId (mocked)', async () => {
        const deviceId = await getFrontFacingCameraDevice();
        expect(deviceId).toBe('abc');
    });

    test('finishAndDisplayEncoded runs without error (mock)', async () => {
        // Setup chunkListEl and encodedChunks
        setUIElements({ preview: {}, chunkList: document.createElement('ul'), start: {}, stop: {} });
        // Mock encodedChunks and VideoDecoder
        global.encodedChunks = [
            { data: new Uint8Array([1,2,3]), timestamp: 123, type: 'key' }
        ];
        global.window = global;
        global.VideoDecoder = class {
            constructor(cfg) { this.cfg = cfg; }
            configure() {}
            decode(chunk) { setTimeout(() => this.cfg.output({ displayWidth: 1, displayHeight: 1, close: () => {} }), 1); }
        };
        await expect(finishAndDisplayEncoded()).resolves.toBeUndefined();
    });
});
