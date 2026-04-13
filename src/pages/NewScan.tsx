import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Check, ArrowRight, Info, AlertCircle } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { analyzeHealthScan } from '../services/gemini';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { Bluetooth, Smartphone, Zap } from 'lucide-react';

export default function NewScan() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const issueIdFromUrl = searchParams.get('issueId');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [step, setStep] = useState<'info' | 'camera' | 'details' | 'analyzing'>('info');
  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueId, setIssueId] = useState(issueIdFromUrl || '');
  const [issues, setIssues] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fetchIssues = async () => {
        try {
          const q = query(collection(db, 'issues'), where('userId', '==', user.uid));
          const snap = await getDocs(q);
          setIssues(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, 'issues');
        }
      };
      fetchIssues();
    }
  }, [user]);

  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera Error:", err);
      setError("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        setImages(prev => [...prev, dataUrl]);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setStep('analyzing');
    
    try {
      // 1. Get AI Analysis
      const analysis = await analyzeHealthScan(images, description, profile?.medicalHistory || "None provided.");

      // 2. Save to Firestore
      const scanData = {
        userId: user.uid,
        issueId: issueId || null,
        title: title || 'New Scan',
        description,
        images,
        aiAnalysis: analysis,
        status: 'analyzed',
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'scans'), scanData);
      navigate(`/scan/${docRef.id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'scans');
      setError("Failed to save scan. Please try again.");
      setStep('details');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <AnimatePresence mode="wait">
        {step === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <Info className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">Choose Capture Method</h1>
                <p className="text-slate-500">
                  Select how you want to capture your health data today.
                </p>
              </div>

              <div className="grid gap-4">
                <button
                  onClick={() => setStep('camera')}
                  className="flex items-center gap-4 p-6 bg-white border-2 border-blue-100 rounded-3xl hover:border-blue-600 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">Phone Camera</h3>
                    <p className="text-xs text-slate-400">Standard multi-angle photo scan</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                </button>

                <div className="relative">
                  <div className="flex items-center gap-4 p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl opacity-60 cursor-not-allowed text-left">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                      <Bluetooth className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        Health Cam
                        <span className="bg-blue-100 text-blue-600 text-[8px] px-1.5 py-0.5 rounded uppercase tracking-tighter">Coming Soon</span>
                      </h3>
                      <p className="text-xs text-slate-400">Bluetooth sensor suite for deep analysis</p>
                    </div>
                    <Zap className="w-5 h-5 text-slate-300" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 p-6 rounded-3xl text-white space-y-2">
              <h3 className="font-bold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Pro Tip
              </h3>
              <p className="text-xs text-blue-100 leading-relaxed">
                Take photos from at least 3 angles. This helps our AI reconstruct a 3D model of the area for better diagnosis.
              </p>
            </div>
          </motion.div>
        )}


        {step === 'camera' && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="relative aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <div className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium">
                  {images.length} photos captured
                </div>
                <button 
                  onClick={() => setStep('info')}
                  className="bg-black/50 backdrop-blur-md text-white p-2 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-6">
                <div className="flex gap-2 overflow-x-auto px-4 max-w-full no-scrollbar">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-white/50 flex-shrink-0">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-8">
                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform"
                  >
                    <div className="w-16 h-16 border-4 border-slate-200 rounded-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-slate-900" />
                    </div>
                  </button>
                  
                  {images.length >= 1 && (
                    <button
                      onClick={() => setStep('details')}
                      className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2"
                    >
                      Next
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </motion.div>
        )}

        {step === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6"
          >
            <h1 className="text-2xl font-bold text-slate-900">Scan Details</h1>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Link to Issue Folder (Optional)</label>
                <select
                  value={issueId}
                  onChange={(e) => setIssueId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                >
                  <option value="">No Folder (Individual Scan)</option>
                  {issues.map(issue => (
                    <option key={issue.id} value={issue.id}>{issue.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Title</label>
                <input
                  type="text"
                  placeholder="e.g., Rash on arm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  placeholder="How long has this been occurring? Any pain or itching?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-slate-100">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setStep('camera')}
                className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!description}
                className="flex-[2] bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Analyze with AI
              </button>
            </div>
          </motion.div>
        )}

        {step === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 space-y-8"
          >
            <div className="relative">
              <div className="w-32 h-32 border-4 border-blue-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="w-12 h-12 text-blue-600 animate-bounce" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Analyzing Scan</h2>
              <p className="text-slate-500">Our AI is processing your photos and medical history...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Activity = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
