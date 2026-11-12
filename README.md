# Personal Face Recognition

A browser-based face-detection and face-descriptor matching experiment built with React, TypeScript, Vite and `@vladmandic/face-api`. It uses the device camera, detects faces locally in the browser and compares descriptors against people registered in the same browser profile.

## Features

- Live camera preview and face detection.
- Tiny Face Detector and lightweight landmark model.
- 128-dimensional face descriptors and nearest-match thresholding.
- Local registration list with per-person deletion.
- Canvas overlays for detected face boxes and match labels.

## Requirements

- Node.js 20+ and npm.
- A browser with camera support.
- Camera permission and a secure context: `localhost` or HTTPS.

## Setup

```bash
npm ci
npm run dev
```

Open the local Vite URL. For production:

```bash
npm run build
npm run lint
```

## Required model weights

The application loads three model families from `/models`. Place the compatible model files in `public/models/`:

- Tiny Face Detector: `tiny_face_detector_model-weights_manifest.json` and its shard file(s).
- Tiny 68-point landmarks: `face_landmark_68_tiny_model-weights_manifest.json` and its shard file(s).
- Face Recognition: `face_recognition_model-weights_manifest.json` and its shard file(s).

Use only model weights from the official project distribution whose license permits your use. Do not commit model weights unless redistribution is permitted. A checklist is provided in `public/models/README.md`.

## Privacy and security

Camera frames and matching are processed in the browser. Registered names and face descriptors are stored in browser `localStorage`; they are not encrypted and can be read by scripts running on the same origin. Treat them as sensitive biometric data.

- Register people only with informed consent.
- Use a private device/browser profile; do not use a shared kiosk.
- Delete registrations when they are no longer needed and clear site data when disposing of a device.
- Do not use the prototype for access control, employment, law enforcement, identity proofing or other consequential decisions.
- Face matching can produce false matches and missed matches. The threshold is experimental and must be calibrated on an appropriate consented evaluation set.

## Tests and limitations

The repository provides build and lint scripts. These checks do not validate recognition accuracy or fairness. Model weights, supported browsers, camera failure handling, threshold calibration and deletion behavior should be tested before broader use.

## License

No license is declared. All rights reserved unless the repository owner adds an explicit license.
