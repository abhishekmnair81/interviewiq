import { useState, useEffect, useRef } from 'react';

export interface FaceMetricReading {
  timestamp: number;
  eye_contact_score: number;
  stability_score: number;
  emotion: string;
}

export function useFaceTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [eyeContactScore, setEyeContactScore] = useState(85);
  const [stabilityScore, setStabilityScore] = useState(88);
  const [currentEmotion, setCurrentEmotion] = useState('focused');
  const [isTracking, setIsTracking] = useState(false);

  const readingsRef = useRef<FaceMetricReading[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  const currentMetricsRef = useRef({ eyeContactScore: 85, stabilityScore: 88, currentEmotion: 'focused' });

  useEffect(() => {
    let faceMeshInstance: any = null;
    let isMounted = true;

    async function initFaceMesh() {
      if (typeof window === 'undefined') return;

      try {
        const { FaceMesh } = await import('@mediapipe/face_mesh');
        faceMeshInstance = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMeshInstance.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMeshInstance.onResults((results: any) => {
          isProcessingRef.current = false;
          if (!isMounted) return;

          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            setIsTracking(true);
            const landmarks = results.multiFaceLandmarks[0];

            const nose = landmarks[1];
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];

            if (nose && leftEye && rightEye) {
              const eyeDistance = Math.abs(rightEye.x - leftEye.x);
              const eyeCenter = (leftEye.x + rightEye.x) / 2;
              const eyeDiff = Math.abs(nose.x - eyeCenter);

              const eyeContact = Math.max(60, Math.min(98, Math.round(100 - eyeDiff * 250)));
              const stability = Math.max(70, Math.min(96, Math.round(90 - eyeDistance * 30)));
              const emotion = eyeContact > 82 ? 'confident' : 'focused';

              setEyeContactScore(eyeContact);
              setStabilityScore(stability);
              setCurrentEmotion(emotion);

              currentMetricsRef.current = {
                eyeContactScore: eyeContact,
                stabilityScore: stability,
                currentEmotion: emotion,
              };
            }
          } else {
            setIsTracking(false);
          }
        });

        let lastProcessTime = 0;
        const processFrame = async (timestamp: number) => {
          if (!isMounted) return;

          if (
            videoRef.current &&
            videoRef.current.readyState >= 2 &&
            !isProcessingRef.current &&
            timestamp - lastProcessTime > 100
          ) {
            lastProcessTime = timestamp;
            isProcessingRef.current = true;
            try {
              await faceMeshInstance.send({ image: videoRef.current });
            } catch {
              isProcessingRef.current = false;
            }
          }
          animFrameRef.current = requestAnimationFrame(processFrame);
        };

        animFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.warn('FaceMesh initialization skipped or fallback active:', err);
        setIsTracking(false);
      }
    }

    initFaceMesh();

    const recordInterval = setInterval(() => {
      readingsRef.current.push({
        timestamp: Date.now(),
        eye_contact_score: currentMetricsRef.current.eyeContactScore,
        stability_score: currentMetricsRef.current.stabilityScore,
        emotion: currentMetricsRef.current.currentEmotion,
      });
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(recordInterval);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (faceMeshInstance) {
        try {
          const res = faceMeshInstance.close();
          if (res && typeof res.catch === 'function') {
            res.catch(() => {});
          }
        } catch {}
      }
    };
  }, [videoRef]);

  return {
    eyeContactScore,
    stabilityScore,
    currentEmotion,
    isTracking,
    readings: readingsRef.current,
  };
}

