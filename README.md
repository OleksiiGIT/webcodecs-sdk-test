# WebCodecs SDK Test

## Preview

This project is a browser-based demo that captures video frames from the user's front-facing camera, encodes them using the VP8 codec via the WebCodecs API, and displays the encoded chunks along with their decoded frame previews. The UI allows you to start and stop the test, and view all encoded frames and their metadata in a list.

## Project Structure & Explanation

- **index.html**: Main HTML file with UI elements for video preview, controls, and chunk list.
- **index.js**: Handles UI event wiring and delegates all video logic to controller.js.
- **controller.js**: Contains all camera, encoding, decoding, and frame capture logic. Modularized for maintainability.
- **controller.test.js**: Unit tests for all exported functions in controller.js, using Jest and jsdom for browser API mocking.
- **package.json**: Project configuration, dependencies, and test scripts.

## How to Run

1. **Open index.html in your Chrome browser:**
   - No server setup is required. Just double-click or open the file directly in Chrome.
   - Grant camera permissions when prompted.
   - Click "Start test" to begin capturing and encoding frames.

## How to Test

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run unit tests:**
   ```bash
   npm run test
   ```
   - This runs Jest and executes all tests in `controller.test.js`.
   - The test environment uses jsdom to mock browser APIs.

## Improvements

- **Improve unit tests:**
  - Add more edge cases and coverage for error handling and async flows.
- **Introduce E2E testing using Playwright:**
  - Automate browser interactions and permissions for full workflow validation.
- **Use a UI framework (e.g., Vite + React):**
  - Refactor the UI for better state management and scalability.
- **Move encoding/decoding to a Web Worker:**
  - Offload heavy processing from the main thread for smoother UI and better performance.
