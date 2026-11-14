# Personal Face Recognition — Real-Time Browser Vision

> A browser-based computer-vision application for live face detection, face descriptor extraction, and matching against locally registered people.

## Overview
Personal Face Recognition turns a camera stream into a live visual recognition workspace. The React interface requests camera permission, detects visible faces, draws the detection results, extracts numerical face descriptors, and compares them with descriptors saved for previously registered people.

## Core capabilities
- Live camera access through the browser.
- Multi-face detection in a camera frame.
- Face landmark estimation.
- Face descriptor generation using the recognition network.
- Registration of a person's name and face descriptor.
- Matching new detections against saved registrations using Euclidean descriptor distance and a configurable threshold.
- Local persistence of registered names and descriptors using browser `localStorage`.
- Live detection loop throttled to approximately eight recognition passes per second to reduce unnecessary work.
- React state management for camera status, model loading, registration feedback, and errors.

## Technology stack
- React 19 and TypeScript
- Vite
- `@vladmandic/face-api`
- MediaPipe Tasks Vision dependency
- Browser MediaDevices / camera APIs
- Canvas rendering and localStorage

## Requirements
- Node.js and npm.
- A modern browser with camera access.
- The compatible face-api model weight files required by the application.

## Installation
```bash
git clone https://github.com/aloslsaid/Personal-Face-Recognition.git
cd Personal-Face-Recognition
npm install
```

## Model weights
At startup, the app loads the Tiny Face Detector, Tiny 68-point Landmark Network, and Face Recognition Network from `/models`. Place the compatible model files in `public/models` before expecting detection and recognition to initialize. The repository tree does not currently include that model directory. Use model files only from a trusted source and check their licenses.

## Run and build
```bash
npm run dev
```
Open the local Vite URL and grant camera permission. For a production build:
```bash
npm run build
npm run lint
npm run preview
```
Camera access generally requires localhost or HTTPS.

## How matching works
A face descriptor is a fixed-length numerical representation of facial appearance. The app calculates Euclidean distance between a detected descriptor and saved descriptors; a smaller distance indicates a closer descriptor match. The current matching threshold is defined in the source and should be calibrated with representative test images rather than treated as a universal identity boundary.

## Privacy and limitations
Face descriptors and names are biometric information. This implementation stores registrations in the current browser's local storage; they are not automatically synchronized to a secure account. Use only with informed consent, protect shared devices, and delete registrations when no longer needed. Lighting, camera quality, pose, occlusion, model weights, and threshold selection can all affect accuracy. This is an experimental recognition application, not a secure identity-verification or surveillance system.

## Skills demonstrated
Computer vision · Real-time browser processing · Face detection · Landmark estimation · Embedding similarity · TypeScript · React · Client-side data persistence
