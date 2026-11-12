# Face model weights

This directory is intentionally kept free of model binaries.

The frontend loads these model families from the Vite public path `/models`:

- Tiny Face Detector
- Face Landmark 68 Tiny Net
- Face Recognition Net

Download compatible weights only from the official `@vladmandic/face-api` project distribution and verify its license before use. Copy each model's manifest and all referenced shard files into this directory, preserving the filenames expected by the package.

Do not use weights from untrusted mirrors or commit them unless redistribution is permitted. The application will show a model-loading error until all required manifests and shards are present.
