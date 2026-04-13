import React, { useState } from 'react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Mail, Shield, Save, CheckCircle, Ruler, Scale, Activity, Wind } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState({
    medicalHistory: profile?.medicalHistory || '',
    allergies: profile?.allergies || '',
    weight: profile?.weight || '',
    age: profile?.age || '',
    height: profile?.height || '',
    exercise: profile?.exercise || '',
    medicalPlan: profile?.medicalPlan || '',
  });

  // Update form data when profile changes (e.g. after setup)
  React.useEffect(() => {
    if (profile) {
      setFormData({
        medicalHistory: profile.medicalHistory || '',
        allergies: profile.allergies || '',
        weight: profile.weight || '',
        age: profile.age || '',
        height: profile.height || '',
        exercise: profile.exercise || '',
        medicalPlan: profile.medicalPlan || '',
      });
    }
  }, [profile]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { name: 'age', label: 'Age', icon: User },
    { name: 'height', label: 'Height', icon: Ruler },
    { name: 'weight', label: 'Weight', icon: Scale },
    { name: 'exercise', label: 'Exercise', icon: Activity },
    { name: 'allergies', label: 'Allergies', icon: Wind },
    { name: 'medicalPlan', label: 'Medical Plan', icon: Shield },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500">Manage your medical history and account settings.</p>
      </header>

      <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.displayName || 'User'}</h2>
            <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
              <Mail className="w-4 h-4" />
              {user?.email}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <field.icon className="w-3 h-3" />
                {field.label}
              </label>
              <input
                type="text"
                value={(formData as any)[field.name]}
                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              />
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <Shield className="w-5 h-5 text-blue-600" />
            Medical History
          </div>
          <p className="text-slate-500 text-sm">
            Providing your medical history helps our AI provide more accurate assessments.
          </p>
          <textarea
            value={formData.medicalHistory}
            onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
            placeholder="List any allergies, chronic conditions, or current medications..."
            rows={6}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none text-slate-700"
          />
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saved ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Saved Successfully
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </section>

      <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Primary Doctor Connection
        </h3>
        <p className="text-slate-500 text-sm">
          Connect your medical plan to automatically share progress with your primary healthcare provider.
        </p>
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-blue-900">{formData.medicalPlan || 'No plan connected'}</p>
            <p className="text-xs text-blue-600">Status: {formData.medicalPlan ? 'Connected' : 'Not configured'}</p>
          </div>
          {formData.medicalPlan && (
            <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all">
              Share Progress
            </button>
          )}
        </div>
      </section>

      <section className="bg-slate-100 p-6 rounded-3xl space-y-4">
        <h3 className="font-bold text-slate-800">Privacy & Security</h3>
        <p className="text-slate-500 text-xs leading-relaxed">
          Your health data is encrypted and stored securely. We only share your scans and medical history with licensed healthcare providers when you explicitly request a review.
        </p>
      </section>
    </div>
  );
}
