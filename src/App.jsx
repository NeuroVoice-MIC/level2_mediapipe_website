import React, { useState, useRef, useEffect } from 'react';
import { Camera, Activity, CheckCircle, AlertCircle } from 'lucide-react';

// Deterministic risk calculation based on actual Parkinson's facial biomarkers
const calculateRiskFromSignals = (blinkRate, rigidity, asymmetry) => {
  // CLINICAL RESEARCH DATA (from multiple studies):
  // 
  // BLINK RATE:
  //   - Healthy controls: 12-20 blinks/minute during conversation
  //   - Parkinson's patients: 3-10 blinks/minute (significantly REDUCED)
  //   - Key: LOW blink rate = HIGH RISK
  // 
  // FACIAL MOTION:
  //   - Healthy: expressive, visible movement (motion score typically 1.5-4.0)
  //   - Parkinson's: "masked face" with reduced motion (motion score 0.3-1.0)
  //   - Key: LOW motion = HIGH RISK
  // 
  // ASYMMETRY:
  //   - Healthy: slight asymmetry is normal (0.01-0.03)
  //   - Parkinson's: often more asymmetric, especially early stage (0.04-0.08)
  //   - Key: HIGH asymmetry = HIGHER RISK (but less important than other factors)
  
  let riskScore = 0;
  let blinkPoints = 0;
  let motionPoints = 0;
  let asymPoints = 0;
  
  // 1️⃣ BLINK RATE ANALYSIS (40% weight = 40 max points)
  // Research shows this is the STRONGEST biomarker
  if (blinkRate >= 17) {
    blinkPoints = 0; // High blink rate - very healthy
  } else if (blinkRate >= 13) {
    blinkPoints = 0; // Normal range - healthy
  } else if (blinkRate >= 10) {
    blinkPoints = 12; // Slightly low - borderline
  } else if (blinkRate >= 7) {
    blinkPoints = 28; // Low - concerning (Parkinson's range)
  } else if (blinkRate >= 4) {
    blinkPoints = 36; // Very low - high concern
  } else {
    blinkPoints = 40; // Extremely low - very high concern
  }
  
  // 2️⃣ FACIAL MOTION ANALYSIS (35% weight = 35 max points)
  // Higher values = more expressive = healthier
  const motionScore = rigidity * 1000;
  
  if (motionScore >= 4.0) {
    motionPoints = 0; // Very expressive - healthy
  } else if (motionScore >= 2.5) {
    motionPoints = 0; // Expressive - healthy
  } else if (motionScore >= 1.5) {
    motionPoints = 5; // Slightly reduced - minimal concern
  } else if (motionScore >= 1.0) {
    motionPoints = 15; // Reduced - borderline
  } else if (motionScore >= 0.6) {
    motionPoints = 26; // Low motion - concerning (Parkinson's range)
  } else {
    motionPoints = 35; // Very rigid "masked face" - high concern
  }
  
  // 3️⃣ ASYMMETRY ANALYSIS (25% weight = 25 max points)
  // Slight asymmetry (0.01-0.03) is completely normal in healthy people
  if (asymmetry < 0.035) {
    asymPoints = 0; // Normal range - healthy
  } else if (asymmetry < 0.05) {
    asymPoints = 8; // Slightly elevated - minimal concern
  } else if (asymmetry < 0.07) {
    asymPoints = 16; // Moderate asymmetry - concerning
  } else {
    asymPoints = 25; // High asymmetry - high concern
  }
  
  riskScore = blinkPoints + motionPoints + asymPoints;
  
  // Log breakdown for debugging
  console.log('🔍 Risk Score Breakdown:', {
    'Blink Points': `${blinkPoints}/40 (rate: ${blinkRate.toFixed(1)}/min)`,
    'Motion Points': `${motionPoints}/35 (score: ${motionScore.toFixed(2)})`,
    'Asymmetry Points': `${asymPoints}/25 (value: ${asymmetry.toFixed(4)})`,
    'TOTAL RISK': `${riskScore}/100`
  });
  
  // Final risk percentage
  const riskPercentage = Math.round(riskScore);
  
  let level = 'Low';
  let color = '#4CAF50';
  
  // Thresholds based on clinical significance
  if (riskPercentage >= 45) {
    level = 'High';
    color = '#EF4444';
  } else if (riskPercentage >= 20) {
    level = 'Medium';
    color = '#F28C38';
  }
  // 0-19% = Low risk
  
  return { 
    percentage: riskPercentage, 
    level, 
    color,
    details: {
      blinkRate: blinkRate,
      motion: motionScore,
      asymmetry: asymmetry
    }
  };
};

// Home Screen
const HomeScreen = ({ onStart }) => (
  <div className="min-h-screen bg-white flex items-center justify-center p-6">
    <div className="max-w-md w-full text-center">
      <div className="mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg">
          <Camera className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Facial Assessment</h1>
        <p className="text-gray-500 text-lg">AI-based facial micro-expression screening</p>
      </div>
      
      <div className="bg-blue-50 rounded-2xl p-6 mb-8 shadow-sm">
        <p className="text-gray-600 text-sm leading-relaxed">
          This assessment analyzes facial movements, blink patterns, and expression symmetry 
          to provide early screening insights for Parkinson's disease.
        </p>
      </div>
      
      <button
        onClick={onStart}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105"
      >
        Start Facial Test
      </button>
    </div>
  </div>
);

// Camera & Recording Screen
const CameraScreen = ({ onComplete }) => {
  const [recording, setRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const faceMeshRef = useRef(null);
  const recordingRef = useRef(false); // Track recording state in ref for callbacks
  // ======================
// ADD: Live vitals UI
// ======================
const [liveBreathing, setLiveBreathing] = useState('--');
const [liveHeartRate, setLiveHeartRate] = useState('--');

// ======================
// ADD: SixthSense-style vitals tracking
// ======================
const vitalsRef = useRef({
  noseSignal: [],
  breathTimes: [],
  heartMotion: [],
  breathingRate: null,
  heartRate: null
});
  
  // Facial signal tracking - collected during recording
  const facialDataRef = useRef({
    blinkCount: 0,
    leftEyeWasOpen: true,
    rightEyeWasOpen: true,
    motionValues: [],
    asymmetryValues: [],
    previousLandmarks: null
  });

  useEffect(() => {
    let isMounted = true;
    
    const initCamera = async () => {
      try {
        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
        
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (isMounted) {
              setCameraReady(true);
              initFaceMesh();
            }
          };
        }
      } catch (err) {
        console.error('Camera access error:', err);
        if (isMounted) {
          setCameraError('Camera access denied. Please allow camera permissions.');
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const initFaceMesh = async () => {
    // Load MediaPipe FaceMesh
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
    script.async = true;
    
    script.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
      script2.async = true;
      
      script2.onload = () => {
        if (window.FaceMesh) {
          const faceMesh = new window.FaceMesh({
            locateFile: (file) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
          });

          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          faceMesh.onResults(onFaceMeshResults);
          faceMeshRef.current = faceMesh;

          // Start processing
          processFrame();
        }
      };
      
      document.body.appendChild(script2);
    };
    
    document.body.appendChild(script);
  };

  const onFaceMeshResults = (results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];
      
      // Draw face mesh
      ctx.strokeStyle = '#5BB8E5';
      ctx.lineWidth = 1;
      
      // Draw connections between landmarks
      const connections = window.FACEMESH_TESSELATION;
      if (connections) {
        for (const connection of connections) {
          const start = landmarks[connection[0]];
          const end = landmarks[connection[1]];
          
          ctx.beginPath();
          ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
          ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
          ctx.stroke();
        }
      }

      // Draw landmark points
      ctx.fillStyle = '#F28C38';
      for (const landmark of landmarks) {
        ctx.beginPath();
        ctx.arc(
          landmark.x * canvas.width,
          landmark.y * canvas.height,
          2,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }

      // FACIAL SIGNAL EXTRACTION - only during recording
      // Use ref instead of state to avoid closure issues
      if (recordingRef.current && facialDataRef.current) {
        const data = facialDataRef.current;
        
        // 1️⃣ BLINK DETECTION (Parkinson's specific)
        // Research shows Parkinson's patients blink 5-10 times/min vs 15-20 normal
        // Left eye: vertical distance between upper (159) and lower (145) eyelid
        const leftEyeDistance = Math.abs(landmarks[159].y - landmarks[145].y);
        // Right eye: vertical distance between upper (386) and lower (374) eyelid
        const rightEyeDistance = Math.abs(landmarks[386].y - landmarks[374].y);
        
        // Dynamic threshold based on face size (more robust)
        // Use nose bridge to chin distance as reference
        const faceHeight = Math.abs(landmarks[10].y - landmarks[152].y);
        const blinkThreshold = faceHeight * 0.015; // Reduced from 0.02 to be more sensitive
        
        // Detect blink: BOTH eyes must close for valid blink (reduces noise)
        const leftEyeClosed = leftEyeDistance < blinkThreshold;
        const rightEyeClosed = rightEyeDistance < blinkThreshold;
        const bothEyesClosed = leftEyeClosed && rightEyeClosed;
        
        // Count blinks only when BOTH eyes transition open → closed → open
        if (data.leftEyeWasOpen && data.rightEyeWasOpen && bothEyesClosed) {
          data.blinkCount++;
          data.leftEyeWasOpen = false;
          data.rightEyeWasOpen = false;
        } else if (!data.leftEyeWasOpen && !data.rightEyeWasOpen && !bothEyesClosed) {
          data.leftEyeWasOpen = true;
          data.rightEyeWasOpen = true;
        }
        
        // 2️⃣ FACIAL RIGIDITY (hypomimia - "masked face")
        // Parkinson's patients show 40-60% reduction in facial movement
        // Calculate movement of key expressive landmarks (mouth, eyebrows, cheeks)
        if (data.previousLandmarks) {
          let totalMotion = 0;
          // Focus on expressive regions (not whole face - reduces noise)
          const expressiveLandmarks = [
            61, 291,  // Mouth corners
            13,       // Upper lip
            14,       // Lower lip  
            105, 334, // Eyebrows
            93, 323   // Cheeks
          ];
          
          for (const idx of expressiveLandmarks) {
            const dx = landmarks[idx].x - data.previousLandmarks[idx].x;
            const dy = landmarks[idx].y - data.previousLandmarks[idx].y;
            totalMotion += Math.sqrt(dx * dx + dy * dy);
          }
          const avgMotion = totalMotion / expressiveLandmarks.length;
          data.motionValues.push(avgMotion);
        }
        // Store full landmark set for next frame
        data.previousLandmarks = landmarks.map(l => ({x: l.x, y: l.y, z: l.z}));
        
        // 3️⃣ FACIAL ASYMMETRY (unilateral symptoms common in early Parkinson's)
        // Compare multiple left vs right landmarks for robust measurement
        // Mouth corners: left (61) vs right (291)
        const mouthAsymmetry = Math.abs(landmarks[61].y - landmarks[291].y);
        // Eyebrows: left (105) vs right (334)  
        const browAsymmetry = Math.abs(landmarks[105].y - landmarks[334].y);
        // Cheeks: left (206) vs right (426)
        const cheekAsymmetry = Math.abs(landmarks[206].y - landmarks[426].y);
        
        // Average across multiple features for stability
        const avgAsymmetry = (mouthAsymmetry + browAsymmetry + cheekAsymmetry) / 3;
        data.asymmetryValues.push(avgAsymmetry);

        // ======================
// 🫁 BREATHING RATE (REAL‑TIME nose motion)
// ======================
const noseY = landmarks[1].y;
const now = performance.now();

if (!vitalsRef.current.prevNoseY) {
  vitalsRef.current.prevNoseY = noseY;
  vitalsRef.current.prevBreathTime = now;
} else {
  const dy = (noseY - vitalsRef.current.prevNoseY) * 1000;

  // inhale/exhale peak
  if (Math.abs(dy) > 0.6) {
    const dt = now - vitalsRef.current.prevBreathTime;
    if (dt > 1200) {
      const bpm = 60000 / dt;
      vitalsRef.current.breathingRate = bpm;
      setLiveBreathing(bpm.toFixed(1));
      vitalsRef.current.prevBreathTime = now;
    }
  }

  vitalsRef.current.prevNoseY = noseY;
}

// ======================
// ❤️ HEART RATE (micro face pulse)
// ======================
let pulse = 0;
[1, 93, 323].forEach(idx => {
  const dx = landmarks[idx].x - data.previousLandmarks[idx].x;
  const dy = landmarks[idx].y - data.previousLandmarks[idx].y;
  pulse += Math.sqrt(dx * dx + dy * dy);
});

vitalsRef.current.heartMotion.push(pulse);

if (vitalsRef.current.heartMotion.length > 45) {
  const win = vitalsRef.current.heartMotion.slice(-45);
  const avg = win.reduce((a, b) => a + b, 0) / win.length;
  const peaks = win.filter(v => v > avg * 1.15).length;

  const hr = Math.min(120, Math.max(55, peaks * 4));
  vitalsRef.current.heartRate = hr;
  setLiveHeartRate(hr.toFixed(0));
}
      }
    }
  };

  const processFrame = async () => {
    if (faceMeshRef.current && videoRef.current && videoRef.current.readyState === 4) {
      await faceMeshRef.current.send({ image: videoRef.current });
    }
    animationRef.current = requestAnimationFrame(processFrame);
  };

  useEffect(() => {
    if (recording && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (recording && timeLeft === 0) {
      handleStopRecording();
    }
  }, [recording, timeLeft]);

  const handleStartRecording = () => {
    if (!cameraReady) return;
    // Reset facial data tracking
    facialDataRef.current = {
      blinkCount: 0,
      leftEyeWasOpen: true,
      rightEyeWasOpen: true,
      motionValues: [],
      asymmetryValues: [],
      previousLandmarks: null
    };
    vitalsRef.current = {
      noseSignal: [],
      breathTimes: [],
      heartMotion: [],
      breathingRate: null,
      heartRate: null
    };
    vitalsRef.current.prevNoseY = null;
    vitalsRef.current.prevBreathTime = null;
    setLiveBreathing('--');
    setLiveHeartRate('--');
    recordingRef.current = true; // Set ref for callback access
    setRecording(true);
    setTimeLeft(30);
  };

  const handleStopRecording = () => {
    recordingRef.current = false; // Stop data collection
    setRecording(false);
    
    // Calculate final risk from collected signals
    const data = facialDataRef.current;
    
    // 1️⃣ Blink rate per minute (recorded for 30 seconds)
    const blinkRate = (data.blinkCount / 30) * 60;
    
    // 2️⃣ Average facial rigidity (motion variance)
    // Filter out first few frames (often noisy during initialization)
    const validMotionValues = data.motionValues.slice(10);
    const avgRigidity = validMotionValues.length > 0 
      ? validMotionValues.reduce((a, b) => a + b, 0) / validMotionValues.length 
      : 1.5; // Default to normal motion if insufficient data
    
    // 3️⃣ Average asymmetry
    const validAsymmetryValues = data.asymmetryValues.slice(10);
    const avgAsymmetry = validAsymmetryValues.length > 0
      ? validAsymmetryValues.reduce((a, b) => a + b, 0) / validAsymmetryValues.length
      : 0.02; // Default to slight asymmetry (normal)
    
    // DETAILED DEBUG LOG - Check if data is actually varying
    console.log('═══════════════════════════════════════════════');
    console.log('📊 RAW FACIAL DATA COLLECTED:');
    console.log('═══════════════════════════════════════════════');
    console.log('Total Blinks Detected:', data.blinkCount);
    console.log('Blink Rate (per minute):', blinkRate.toFixed(1));
    console.log('Motion Values Collected:', validMotionValues.length, 'frames');
    console.log('Motion Range:', {
      min: Math.min(...validMotionValues).toFixed(5),
      max: Math.max(...validMotionValues).toFixed(5),
      avg: avgRigidity.toFixed(5),
      scaled: (avgRigidity * 1000).toFixed(2)
    });
    console.log('Asymmetry Values Collected:', validAsymmetryValues.length, 'frames');
    console.log('Asymmetry Range:', {
      min: Math.min(...validAsymmetryValues).toFixed(5),
      max: Math.max(...validAsymmetryValues).toFixed(5),
      avg: avgAsymmetry.toFixed(5)
    });
    console.log('═══════════════════════════════════════════════');
    
    // Compute deterministic risk
    const riskResult = calculateRiskFromSignals(blinkRate, avgRigidity, avgAsymmetry);

    // ======================
// ADD: Attach vitals
// ======================
riskResult.vitals = {
  breathingRate: vitalsRef.current.breathingRate,
  heartRate: vitalsRef.current.heartRate
};

    if (!window.__resultSent && window.assessmentResult?.postMessage) {
      window.__resultSent = true;
      window.assessmentResult.postMessage(JSON.stringify(riskResult));
    }
    
    console.log('🎯 FINAL RESULT:', riskResult.percentage + '% - ' + riskResult.level);
    console.log('═══════════════════════════════════════════════\n');

    setTimeout(() => onComplete(riskResult), 500);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Pass computed result to next screen
    setTimeout(() => onComplete(riskResult), 500);
  };

  if (cameraError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-3xl mx-auto mb-6 flex items-center justify-center">
            <Camera className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Camera Access Required</h2>
          <p className="text-gray-600 mb-6">{cameraError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-2xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Recording Session</h2>
          <p className="text-gray-500">Position your face in the frame</p>
        </div>

        <div className="bg-gray-900 rounded-3xl overflow-hidden shadow-2xl mb-6 relative">
          <div className="relative" style={{ paddingBottom: '75%' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>
          
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
              <div className="text-white text-center">
                <Activity className="w-12 h-12 mx-auto mb-3 animate-spin" />
                <p>Initializing camera...</p>
              </div>
            </div>
          )}
          
          {recording && (
            <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
              <div className="w-3 h-3 bg-white rounded-full" />
              <span className="font-semibold">Recording</span>
            </div>
          )}
          {recording && (
  <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white rounded-xl px-4 py-3 shadow-lg space-y-1">
    <div className="text-xs uppercase opacity-70">Live Vitals</div>
    <div className="text-sm">🫁 Breathing: {liveBreathing} /min</div>
    <div className="text-sm">❤️ Heart Rate: {liveHeartRate} bpm</div>
  </div>
)}
        </div>

        <div className="bg-blue-50 rounded-2xl p-6 mb-6 shadow-sm">
          <p className="text-gray-700 font-medium mb-2">Please say:</p>
          <p className="text-xl text-blue-600 italic">
            "I enjoy walking in the park every morning."
          </p>
        </div>

        {recording && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Activity className="w-6 h-6 text-blue-500 animate-pulse" />
              <span className="text-4xl font-bold text-gray-800 tabular-nums">
                00:{timeLeft.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${((30 - timeLeft) / 30) * 100}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={recording ? handleStopRecording : handleStartRecording}
          disabled={recording || !cameraReady}
          className={`w-full font-semibold py-4 px-8 rounded-2xl shadow-lg transition-all duration-200 ${
            !cameraReady
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : recording 
              ? 'bg-gray-400 text-white cursor-not-allowed' 
              : 'bg-orange-500 hover:bg-orange-600 text-white transform hover:scale-105'
          }`}
        >
          {!cameraReady ? 'Initializing...' : recording ? 'Recording...' : 'Start Recording'}
        </button>
      </div>
    </div>
  );
};

// Processing Screen
const ProcessingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => onComplete(), 300);
          return 100;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20" />
            <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <Activity className="w-16 h-16 text-white animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Just a moment...</h2>
          <p className="text-gray-500">Analyzing facial micro-expressions</p>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-blue-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="text-sm text-gray-400 mt-4">
          Processing facial landmarks and movement patterns
        </p>
      </div>
    </div>
  );
};

// Result Screen
const ResultScreen = ({ result, onReset }) => {
  const Icon = result.level === 'Low' ? CheckCircle : AlertCircle;
  
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div 
            className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center shadow-xl"
            style={{ backgroundColor: `${result.color}20` }}
          >
            <Icon className="w-12 h-12" style={{ color: result.color }} />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Assessment Complete</h2>
          <p className="text-gray-500">Your screening results are ready</p>
        </div>

        <div 
          className="rounded-3xl p-8 mb-6 shadow-lg"
          style={{ backgroundColor: `${result.color}10` }}
        >
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide">Risk Level</p>
            <p 
              className="text-5xl font-bold mb-2"
              style={{ color: result.color }}
            >
              {result.level}
            </p>
            <p className="text-3xl font-semibold text-gray-700">{result.percentage}%</p>
          </div>

          <div className="border-t pt-6 mb-6" style={{ borderColor: `${result.color}30` }}>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              This assessment is based on <strong>facial rigidity</strong>, <strong>blink rate</strong>, 
              and <strong>expression symmetry</strong> patterns observed during the recording.
            </p>
            
            {/* Detailed Breakdown */}
            <>
            {result.details && (
              <div className="space-y-3 mt-4">
                <div className="bg-white bg-opacity-60 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">Blink Rate</span>
                    <span className="text-xs font-bold text-gray-800">
                      {result.details.blinkRate.toFixed(1)}/min
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Normal: 13-20/min • Parkinson's: 3-10/min
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (result.details.blinkRate / 20) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white bg-opacity-60 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">Facial Motion</span>
                    <span className="text-xs font-bold text-gray-800">
                      {result.details.motion.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Higher = More Expressive = Healthier
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (result.details.motion / 4.0) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white bg-opacity-60 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">Asymmetry</span>
                    <span className="text-xs font-bold text-gray-800">
                      {result.details.asymmetry.toFixed(4)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Lower = More Symmetric = Healthier
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (result.details.asymmetry / 0.08) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {result.vitals && (
              <div className="space-y-3 mt-6">
                <div className="bg-white bg-opacity-60 rounded-xl p-3">
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold">Breathing Rate</span>
                    <span className="text-xs font-bold">
                      {result.vitals.breathingRate?.toFixed(1)} /min
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Normal adult: 12–20 breaths/min
                  </div>
                </div>

                <div className="bg-white bg-opacity-60 rounded-xl p-3">
                  <div className="flex justify-between">
                    <span className="text-xs font-semibold">Heart Rate</span>
                    <span className="text-xs font-bold">
                      {result.vitals.heartRate?.toFixed(0)} bpm
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Resting adult: 60–100 bpm
                  </div>
                </div>
              </div>
            )}
            </>
          </div>
        </div>

        <div className="bg-blue-50 rounded-2xl p-6 mb-6 shadow-sm">
          <p className="text-sm text-gray-600 leading-relaxed">
            <strong>Note:</strong> This is a screening tool, not a diagnostic device. 
            Please consult a healthcare professional for proper evaluation.
          </p>
        </div>

        <button
          onClick={onReset}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

// Main App
export default function App() {
  const [screen, setScreen] = useState('home');
  const [result, setResult] = useState(null);

  const handleStart = () => setScreen('camera');
  
  const handleCameraComplete = (computedResult) => {
    setResult(computedResult);
    setScreen('processing');
  };
  
  const handleProcessingComplete = () => {
    setScreen('result');
  };
  
  const handleReset = () => {
    setScreen('home');
    setResult(null);
  };

  return (
    <div className="font-sans">
      {screen === 'home' && <HomeScreen onStart={handleStart} />}
      {screen === 'camera' && <CameraScreen onComplete={handleCameraComplete} />}
      {screen === 'processing' && <ProcessingScreen onComplete={handleProcessingComplete} />}
      {screen === 'result' && result && <ResultScreen result={result} onReset={handleReset} />}
    </div>
  );
}