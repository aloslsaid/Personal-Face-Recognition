# Personal Face Recognition

A browser-based face-detection and recognition experiment built with React, TypeScript, Vite, and `@vladmandic/face-api`. The interface requests camera access, detects faces, and can compare face descriptors against registrations stored in the browser's local storage.

## Setup

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Open the Vite URL. Camera access generally requires `localhost` or HTTPS and explicit browser permission. Build and lint with:

```sh
npm run build
npm run lint
```

## Model files

The application loads face-api model files from `/models` (`tinyFaceDetector`, `faceLandmark68TinyNet`, and `faceRecognitionNet`). The repository root listing does not contain a `public/models` directory, so add the compatible model weights to that location from a source whose license permits your use before expecting recognition to work. Do not download unknown model files or scripts.

## Privacy and responsible use

Camera video is processed in the browser by this application. Face descriptors and names are saved in that browser's local storage and persist until removed or browser storage is cleared. They are sensitive biometric data: register people only with informed consent, avoid shared devices, provide a deletion process, and do not use this experiment for consequential decisions or identity verification. Recognition can be inaccurate and biased.

## Tests and limitations

No test script is defined in `package.json`. Use `npm run build` and `npm run lint` as available static checks; they do not prove recognition accuracy. Model weights, supported browsers, and threshold calibration should be documented and tested before any wider use.
