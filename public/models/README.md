# Face API model assets

The React application loads the following face-api model manifests and weight shards from this directory at runtime:

- `tiny_face_detector_model-weights_manifest.json` and its referenced weight shard(s)
- `face_landmark_68_tiny_model-weights_manifest.json` and its referenced weight shard(s)
- `face_recognition_model-weights_manifest.json` and its referenced weight shard(s)

The exact filenames and shard paths must match the manifests. Do not create placeholder JSON or empty weight files: the model loader will fail and recognition will not work.

Obtain the compatible assets from the official `@vladmandic/face-api` model distribution or another source whose license permits redistribution. Keep the original license/attribution with the assets. Verify checksums and inspect the files before adding them to this repository.

After adding the assets, run `npm run build` and test camera/model loading on localhost or HTTPS. Face descriptors are biometric data; only register people with informed consent and provide a clear deletion path.
