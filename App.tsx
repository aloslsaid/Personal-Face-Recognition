
import { useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import "./App.css";

type Person = {
  id: string;
  name: string;
  descriptor: number[];
};

type DetectedFace = {
  descriptor: number[];
  box: { x: number; y: number; width: number; height: number };
  name: string;
  distance: number | null;
};

const STORAGE_KEY = "personal-vision-registered-people";
const MATCH_THRESHOLD = 0.48;

function readPeople(): Person[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is Person =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        Array.isArray(item.descriptor) &&
        item.descriptor.length === 128 &&
        item.descriptor.every(
          (value: unknown) =>
            typeof value === "number" && Number.isFinite(value)
        )
    );
  } catch {
    return [];
  }
}

function distanceBetween(a: number[], b: number[]) {
  let sum = 0;

  for (let i = 0; i < a.length; i++) {
    const difference = a[i] - b[i];
    sum += difference * difference;
  }

  return Math.sqrt(sum);
}

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const cameraOnRef = useRef(false);
  const lastDetectionTimeRef = useRef(0);
  const busyRef = useRef(false);
  const peopleRef = useRef<Person[]>([]);
  const facesRef = useRef<DetectedFace[]>([]);

  const [people, setPeople] = useState<Person[]>(readPeople);
  const [personName, setPersonName] = useState("");
  const [faceCount, setFaceCount] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
  const [modelsReady, setModelsReady] = useState(false);
  const [modelsError, setModelsError] = useState(false);
  const [registerMessage, setRegisterMessage] = useState("");

  // Keep the latest registrations available to the live detection loop.
  peopleRef.current = people;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
    } catch {
      setError(
        "تعذر حفظ التسجيلات محلياً. تحقق من مساحة المتصفح وإعدادات التخزين."
      );
    }
  }, [people]);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);

        if (!cancelled) {
          setModelsReady(true);
          setModelsError(false);
        }
      } catch (err) {
        console.error("Face model loading failed:", err);

        if (!cancelled) {
          setModelsError(true);
          setError(
            "تعذر تحميل مودلات التعرف. تأكد من وجود الملفات داخل public/models ثم أعد تحميل الصفحة."
          );
        }
      }
    }

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  const stopDetectionLoop = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const detectFrame = useCallback(async () => {
    animationRef.current = null;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !cameraOnRef.current ||
      !video ||
      !canvas ||
      video.paused ||
      video.ended ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      setError("تعذر إنشاء لوحة رسم مربعات كشف الوجه.");
      return;
    }

    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const now = performance.now();

    // Run recognition about 8 times per second, not on every animation frame.
    if (now - lastDetectionTimeRef.current >= 125 && !busyRef.current) {
      lastDetectionTimeRef.current = now;
      busyRef.current = true;

      try {
        const results = await faceapi
          .detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.5,
            })
          )
          .withFaceLandmarks(true)
          .withFaceDescriptors();

        facesRef.current = results.map((result) => {
          const descriptor = Array.from(result.descriptor);
          let bestName = "";
          let bestDistance = Infinity;

          for (const person of peopleRef.current) {
            const distance = distanceBetween(
              descriptor,
              person.descriptor
            );

            if (distance < bestDistance) {
              bestDistance = distance;
              bestName = person.name;
            }
          }

          const matched = bestName !== "" &&
            bestDistance <= MATCH_THRESHOLD;

          return {
            descriptor,
            box: {
              x: result.detection.box.x,
              y: result.detection.box.y,
              width: result.detection.box.width,
              height: result.detection.box.height,
            },
            name: matched ? bestName : "غير معروف",
            distance: Number.isFinite(bestDistance)
              ? bestDistance
              : null,
          };
        });

        setFaceCount(results.length);
      } catch (err) {
        console.error("Face recognition failed:", err);
      } finally {
        busyRef.current = false;
      }
    }

    context.clearRect(0, 0, canvas.width, canvas.height);

    const mirrored = window
      .getComputedStyle(video)
      .transform.includes("matrix(-1");

    context.font = `bold ${Math.max(16, canvas.width / 45)}px Arial`;
    context.textBaseline = "top";
    context.lineWidth = Math.max(2, canvas.width / 400);

    for (const face of facesRef.current) {
      const { x, y, width, height } = face.box;
      const drawX = mirrored ? canvas.width - x - width : x;
      const color = face.name === "غير معروف" ? "#ffb547" : "#00e5a8";

      context.strokeStyle = color;
      context.strokeRect(drawX, y, width, height);

      const label = face.name;
      const labelWidth = context.measureText(label).width + 16;
      const labelHeight = Math.max(28, canvas.width / 32);
      const labelY = Math.max(0, y - labelHeight);

      context.fillStyle = color;
      context.fillRect(drawX, labelY, labelWidth, labelHeight);

      context.fillStyle = "#07130f";
      context.fillText(label, drawX + 8, labelY + 5);
    }

    if (cameraOnRef.current) {
      animationRef.current = requestAnimationFrame(() => {
        void detectFrame();
      });
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (startingRef.current || streamRef.current) return;

    if (!modelsReady) {
      setError(
        modelsError
          ? "فشل تحميل المودلات. أعد تحميل الصفحة وتحقق من الملفات."
          : "انتظر حتى يكتمل تحميل مودلات التعرف على الوجوه."
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("المتصفح لا يدعم الكاميرا. استخدم localhost أو HTTPS.");
      return;
    }

    startingRef.current = true;
    let stream: MediaStream | null = null;

    try {
      setError("");

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      cameraOnRef.current = true;
      lastDetectionTimeRef.current = 0;
      facesRef.current = [];
      setCameraOn(true);
      setFaceCount(0);

      stopDetectionLoop();
      animationRef.current = requestAnimationFrame(() => {
        void detectFrame();
      });
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());

      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      cameraOnRef.current = false;
      setCameraOn(false);

      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("تم رفض إذن الكاميرا. اسمح للمتصفح باستخدامها.");
      } else if (err instanceof Error && err.name === "NotFoundError") {
        setError("لم يتم العثور على كاميرا متصلة بالجهاز.");
      } else {
        setError("تعذر تشغيل الكاميرا. تحقق من الإذن واتصال الكاميرا.");
      }

      console.error("Camera start failed:", err);
    } finally {
      startingRef.current = false;
    }
  }, [modelsReady, modelsError, detectFrame, stopDetectionLoop]);

  const stopCamera = useCallback(() => {
    cameraOnRef.current = false;
    stopDetectionLoop();

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    facesRef.current = [];
    busyRef.current = false;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    setFaceCount(0);
    setCameraOn(false);
  }, [stopDetectionLoop]);

  useEffect(() => {
    return () => {
      cameraOnRef.current = false;
      stopDetectionLoop();

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [stopDetectionLoop]);

  const registerPerson = useCallback(() => {
    const name = personName.trim();

    if (!name) {
      setRegisterMessage("اكتب اسم الشخص أولاً.");
      return;
    }

    if (!cameraOn) {
      setRegisterMessage("شغّل الكاميرا أولاً.");
      return;
    }

    if (facesRef.current.length !== 1) {
      setRegisterMessage(
        "يجب أن يظهر وجه واحد فقط أمام الكاميرا حتى نسجّله."
      );
      return;
    }

    const face = facesRef.current[0];

    if (face.descriptor.length !== 128) {
      setRegisterMessage("تعذر استخراج بصمة الوجه. حاول مرة أخرى.");
      return;
    }

    const duplicate = peopleRef.current.some(
      (person) =>
        distanceBetween(face.descriptor, person.descriptor) <=
        MATCH_THRESHOLD
    );

    if (duplicate) {
      setRegisterMessage(
        "هذا الوجه قريب من تسجيل موجود بالفعل. تحقق من قائمة الأشخاص."
      );
      return;
    }

    const person: Person = {
      id: crypto.randomUUID(),
      name,
      descriptor: face.descriptor,
    };

    setPeople((current) => [...current, person]);
    setPersonName("");
    setRegisterMessage(`تم تسجيل ${name} محلياً بنجاح.`);
  }, [personName, cameraOn]);

  const deletePerson = useCallback((id: string) => {
    setPeople((current) => current.filter((person) => person.id !== id));
    setRegisterMessage("تم حذف تسجيل الشخص.");
  }, []);

  return (
    <main className="vision-app" dir="rtl">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">V</div>
          <div>
            <h1>Personal Vision AI</h1>
            <p>منصة علوش السيد ي</p>
          </div>
        </div>

        <span className="system-status">
          <span className="status-dot" />
          {cameraOn
            ? "الكاميرا نشطة"
            : modelsReady
              ? "النظام جاهز"
              : "جارٍ تحميل النموذج"}
        </span>
      </header>

      <section className="welcome">
        <span className="eyebrow">COMPUTER VISION PLATFORM</span>
        <h2>رؤية صدام حسين ق.</h2>
        <p>
          منصة لتشغيل نماذج تعلم الآلة وتحليل الفيديو والتعرف على الأشخاص
          المسجلين محلياً.
        </p>
      </section>

      <section className="dashboard">
        <div className="camera-card">
          <div className="card-heading">
            <div>
              <h3>الكاميرا المباشرة</h3>
              <p>Live camera feed</p>
            </div>

            <span className={cameraOn ? "live-label active" : "live-label"}>
              {cameraOn ? "LIVE" : "STANDBY"}
            </span>
          </div>

          <div className="video-container">
            <video ref={videoRef} autoPlay playsInline muted />
            <canvas
              ref={canvasRef}
              className="face-overlay"
              aria-hidden="true"
            />

            {!cameraOn && (
              <div className="camera-placeholder">
                <div className="camera-icon">◎</div>
                <h3>بانتظار تشغيل الكاميرا</h3>
                <p>اضغط الزر بالأسفل لبدء البث المباشر</p>
              </div>
            )}
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <div className="camera-controls">
            {!cameraOn ? (
              <button
                className="primary-button"
                onClick={startCamera}
                disabled={!modelsReady}
              >
                {modelsReady
                  ? "تشغيل الكاميرا"
                  : "جارٍ تحميل مودلات التعرف..."}
              </button>
            ) : (
              <button className="stop-button" onClick={stopCamera}>
                إيقاف الكاميرا
              </button>
            )}
          </div>

          <section className="people-manager">
            <h3>تسجيل شخص جديد</h3>
            <p>
              انظر إلى الكاميرا وتأكد من ظهور وجه واحد بوضوح، ثم اكتب الاسم.
            </p>

            <div className="register-form">
              <input
                type="text"
                value={personName}
                onChange={(event) => setPersonName(event.target.value)}
                placeholder="اسم الشخص"
                maxLength={80}
                aria-label="اسم الشخص المراد تسجيله"
              />
              <button
                className="primary-button"
                onClick={registerPerson}
                disabled={!cameraOn || !modelsReady}
              >
                تسجيل الوجه
              </button>
            </div>

            {registerMessage && (
              <p className="register-message" role="status">
                {registerMessage}
              </p>
            )}

            <div className="registered-heading">
              <h3>الأشخاص المسجلون</h3>
              <span>{people.length}</span>
            </div>

            {people.length === 0 ? (
              <p className="muted">ماكو أشخاص مسجلين لحد الآن.</p>
            ) : (
              <ul className="registered-list">
                {people.map((person) => (
                  <li key={person.id}>
                    <span>{person.name}</span>
                    <button
                      className="delete-person-button"
                      onClick={() => deletePerson(person.id)}
                      aria-label={`حذف ${person.name}`}
                    >
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="features-card">
          <h3>مكوّنات النظام</h3>
          <p className="muted">حالة وحدات المنصة</p>

          <div className="feature-row">
            <span className="feature-symbol">◉</span>
            <div className="feature-info">
              <strong>البث المباشر</strong>
              <p>{cameraOn ? "الكاميرا تعمل" : "بانتظار التشغيل"}</p>
            </div>
            <span className="feature-state">
              {cameraOn ? "نشط" : "جاهز"}
            </span>
          </div>

          <div className="feature-row">
            <span className="feature-symbol">⌕</span>
            <div className="feature-info">
              <strong>كشف الوجه</strong>
              <p>
                {modelsReady
                  ? cameraOn
                    ? `عدد الوجوه المكتشفة: ${faceCount}`
                    : "النموذج جاهز"
                  : modelsError
                    ? "فشل تحميل النموذج"
                    : "جارٍ تحميل النموذج..."}
              </p>
            </div>
            <span className="feature-state">
              {modelsReady ? (cameraOn ? "نشط" : "جاهز") : "تحميل"}
            </span>
          </div>

          <div className="feature-row">
            <span className="feature-symbol">◇</span>
            <div className="feature-info">
              <strong>كشف الجسم</strong>
              <p>نموذج كشف الجسم غير مضاف</p>
            </div>
            <span className="feature-state pending">لاحقاً</span>
          </div>

          <div className="feature-row">
            <span className="feature-symbol">✳️</span>
            <div className="feature-info">
              <strong>التعرّف على الأشخاص</strong>
              <p>
                {people.length
                  ? `${people.length} شخص مسجل`
                  : "بانتظار تسجيل أول شخص"}
              </p>
            </div>
            <span className="feature-state">
              {modelsReady ? "جاهز" : "تحميل"}
            </span>
          </div>

          <div className="privacy-box">
            <strong>الخصوصية والتحكم</strong>
            <p>
              لا تبدأ الكاميرا إلا بعد الضغط على زر التشغيل والموافقة على
              الإذن. تتم معالجة الفيديو داخل المتصفح، وتُحفظ بصمات الوجه
              والأسماء في التخزين المحلي لهذا المتصفح.
            </p>
          </div>
        </aside>
      </section>

      <footer>Personal Vision AI · الإصدار الأولي</footer>
    </main>
  );
}

export default App;

