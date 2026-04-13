import React, { useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, ArrowRight, CheckCircle, Heart, Ruler, Scale, User, Wind } from 'lucide-react';

interface SetupProps {
  onComplete: () => void;
}

export default function SetupWalkthrough({ onComplete }: SetupProps) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    age: '',
    weight: '',
    height: '',
    allergies: '',
    exercise: '',
    medicalHistory: '',
  });
  const [saving, setSaving] = useState(false);

  const steps = [
    {
      title: "Welcome to VEMA Health",
      description: "Let's set up your health profile to give you better AI insights.",
      icon: Heart,
      fields: []
    },
    {
      title: "Basic Information",
      description: "Tell us a bit about yourself.",
      icon: User,
      fields: [
        { name: 'age', label: 'Age', placeholder: 'e.g. 28', icon: User },
        { name: 'height', label: 'Height', placeholder: 'e.g. 5\'10"', icon: Ruler },
        { name: 'weight', label: 'Weight', placeholder: 'e.g. 160 lbs', icon: Scale },
      ]
    },
    {
      title: "Health & Lifestyle",
      description: "Your habits and history matter.",
      icon: Activity,
      fields: [
        { name: 'exercise', label: 'Exercise Frequency', placeholder: 'e.g. 3 times a week', icon: Activity },
        { name: 'allergies', label: 'Allergies', placeholder: 'e.g. Peanuts, Penicillin', icon: Wind },
      ]
    },
    {
      title: "Medical History",
      description: "Any chronic conditions or past surgeries?",
      icon: Activity,
      fields: [
        { name: 'medicalHistory', label: 'History of Diseases', placeholder: 'e.g. Diabetes, Hypertension', type: 'textarea' },
      ]
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...formData,
        setupComplete: true
      });
      onComplete();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= step ? 'w-8 bg-blue-600' : 'w-4 bg-slate-100'
              }`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4">
                <currentStep.icon className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{currentStep.title}</h1>
              <p className="text-slate-500">{currentStep.description}</p>
            </div>

            <div className="space-y-4">
              {currentStep.fields.map((field: any) => (
                <div key={field.name} className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={(formData as any)[field.name]}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      placeholder={field.placeholder}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                    />
                  ) : (
                    <div className="relative">
                      <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={(formData as any)[field.name]}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={handleNext}
          disabled={saving}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          {saving ? 'Saving...' : step === steps.length - 1 ? 'Complete Setup' : 'Continue'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
