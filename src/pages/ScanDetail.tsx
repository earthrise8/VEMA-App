import React, { useEffect, useState, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ChevronLeft, Clock, CheckCircle2, AlertCircle, Share2, MessageSquare, Folder } from 'lucide-react';
import { formatDate } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, MeshDistortMaterial } from '@react-three/drei';
import { motion } from 'motion/react';

// A simple simulated 3D model component
function Simulated3DModel({ images }: { images: string[] }) {
  return (
    <Canvas className="w-full h-full">
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls enableZoom={true} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh>
          <sphereGeometry args={[1.5, 64, 64]} />
          <MeshDistortMaterial
            color="#3b82f6"
            speed={2}
            distort={0.3}
            radius={1}
          />
        </mesh>
      </Float>
      <Environment preset="city" />
    </Canvas>
  );
}

export default function ScanDetail() {
  const { id } = useParams();
  const [scan, setScan] = useState<any>(null);
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'photos' | '3d'>('photos');

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'scans', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setScan({ id: docSnap.id, ...data });
        
        if (data.issueId) {
          getDoc(doc(db, 'issues', data.issueId)).then(issueSnap => {
            if (issueSnap.exists()) {
              setIssue({ id: issueSnap.id, ...issueSnap.data() });
            }
          }).catch(error => {
            handleFirestoreError(error, OperationType.GET, `issues/${data.issueId}`);
          });
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `scans/${id}`);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Scan not found</h2>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">Return home</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        <section className="space-y-6">
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('photos')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    viewMode === 'photos' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  Photos
                </button>
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    viewMode === '3d' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  3D Model
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {formatDate(scan.createdAt)}
              </div>
            </div>

            <div className="aspect-[4/3] bg-slate-50 relative">
              {viewMode === 'photos' ? (
                <div className="grid grid-cols-2 gap-1 h-full">
                  {scan.images.map((img: string, i: number) => (
                    <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                  ))}
                </div>
              ) : (
                <div className="w-full h-full">
                  <Simulated3DModel images={scan.images} />
                  <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-md p-3 rounded-xl border border-white/50 text-[10px] text-slate-500">
                    <Info className="w-3 h-3 inline mr-1" />
                    3D reconstruction generated from {scan.images.length} photos. Rotate to inspect.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{scan.title}</h2>
              {issue && (
                <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-[10px] font-bold">
                  <Folder className="w-3 h-3" />
                  {issue.title}
                </div>
              )}
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              {scan.description || "No description provided."}
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-blue-600 text-white p-8 rounded-3xl shadow-xl shadow-blue-100 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold">AI Preliminary Analysis</h3>
                <p className="text-blue-100 text-xs">Generated instantly</p>
              </div>
            </div>
            
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{scan.aiAnalysis}</ReactMarkdown>
            </div>

            <div className="bg-blue-700/50 p-4 rounded-2xl flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-blue-200 flex-shrink-0" />
              <p className="text-[10px] text-blue-100 leading-tight">
                This is an AI-generated assessment. It is not a medical diagnosis. Please wait for a professional review or consult a doctor immediately if symptoms worsen.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Doctor's Response
              </h3>
              {scan.status === 'doctor-reviewed' ? (
                <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Reviewed
                </span>
              ) : (
                <span className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full">
                  Waiting for review
                </span>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 rounded-2xl min-h-[100px] flex flex-col items-center justify-center text-center">
              {scan.doctorResponse ? (
                <p className="text-slate-700 text-sm">{scan.doctorResponse}</p>
              ) : (
                <>
                  <Clock className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-slate-400 text-xs">
                    Your scan has been shared with our network of doctors. You'll be notified when they respond.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const Activity = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const Info = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
