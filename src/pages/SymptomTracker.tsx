import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../App';
import { Activity, Plus, Calendar, AlertCircle, ChevronRight, TrendingUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function SymptomTracker() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLog, setShowNewLog] = useState(false);
  const [newLog, setNewLog] = useState({
    painLevel: 5,
    symptoms: [] as string[],
    observations: '',
    issueId: ''
  });
  const [symptomInput, setSymptomInput] = useState('');

  useEffect(() => {
    if (!user) return;

    const logsQ = query(
      collection(db, 'symptom_logs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const issuesQ = query(
      collection(db, 'issues'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeLogs = onSnapshot(logsQ, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'symptom_logs');
    });

    const unsubscribeIssues = onSnapshot(issuesQ, (snapshot) => {
      setIssues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issues');
    });

    return () => {
      unsubscribeLogs();
      unsubscribeIssues();
    };
  }, [user]);

  const handleAddSymptom = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && symptomInput.trim()) {
      e.preventDefault();
      if (!newLog.symptoms.includes(symptomInput.trim())) {
        setNewLog({ ...newLog, symptoms: [...newLog.symptoms, symptomInput.trim()] });
      }
      setSymptomInput('');
    }
  };

  const removeSymptom = (symptom: string) => {
    setNewLog({ ...newLog, symptoms: newLog.symptoms.filter(s => s !== symptom) });
  };

  const handleSubmitLog = async () => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'symptom_logs'), {
        userId: user.uid,
        issueId: newLog.issueId || null,
        painLevel: newLog.painLevel,
        symptoms: newLog.symptoms,
        observations: newLog.observations,
        createdAt: new Date().toISOString()
      });
      setShowNewLog(false);
      setNewLog({ painLevel: 5, symptoms: [], observations: '', issueId: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'symptom_logs');
    }
  };

  const chartData = [...logs].reverse().map(log => ({
    date: new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    pain: log.painLevel,
    fullDate: formatDate(log.createdAt)
  }));

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Symptom Tracker</h1>
          <p className="text-slate-500">Monitor your recovery and track daily changes.</p>
        </div>
        <button
          onClick={() => setShowNewLog(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Log Today
        </button>
      </header>

      {/* Chart Section */}
      <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Pain Level Progression
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-slate-500">Pain Level (1-10)</span>
            </div>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          {logs.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 10]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pain" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPain)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Activity className="w-12 h-12 opacity-20" />
              <p className="text-sm">Log at least 2 days to see your progression chart.</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-8">
        {/* History List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Logs</h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">No logs yet. Start tracking your symptoms today.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        log.painLevel > 7 ? 'bg-red-50 text-red-600' : 
                        log.painLevel > 4 ? 'bg-amber-50 text-amber-600' : 
                        'bg-green-50 text-green-600'
                      }`}>
                        {log.painLevel}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pain Level</p>
                        <p className="text-sm font-bold text-slate-900">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                    {log.issueId && (
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                        {issues.find(i => i.id === log.issueId)?.title || 'Related Issue'}
                      </span>
                    )}
                  </div>

                  {log.symptoms?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {log.symptoms.map((s: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-medium rounded-lg border border-slate-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {log.observations && (
                    <p className="text-sm text-slate-600 bg-slate-50/50 p-3 rounded-xl italic">
                      "{log.observations}"
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Stats/Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-blue-600 rounded-3xl p-6 text-white space-y-4 shadow-xl shadow-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Info className="w-6 h-6" />
              </div>
              <h3 className="font-bold">Tracking Tips</h3>
            </div>
            <p className="text-sm text-blue-50 leading-relaxed">
              Consistent daily logging helps your doctor understand the patterns of your recovery and identify triggers.
            </p>
            <ul className="text-xs space-y-2 text-blue-100">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                Log at the same time each day
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                Be specific about pain locations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                Note any new medications
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900">Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Pain</p>
                <p className="text-xl font-bold text-slate-900">
                  {logs.length > 0 ? (logs.reduce((acc, curr) => acc + curr.painLevel, 0) / logs.length).toFixed(1) : '-'}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total Logs</p>
                <p className="text-xl font-bold text-slate-900">{logs.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Log Modal */}
      <AnimatePresence>
        {showNewLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Daily Symptom Log</h2>
                <button onClick={() => setShowNewLog(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex justify-between">
                    Pain Level (1-10)
                    <span className={`text-lg ${
                      newLog.painLevel > 7 ? 'text-red-600' : 
                      newLog.painLevel > 4 ? 'text-amber-600' : 
                      'text-green-600'
                    }`}>{newLog.painLevel}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newLog.painLevel}
                    onChange={(e) => setNewLog({ ...newLog, painLevel: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>No Pain</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Related Condition (Optional)</label>
                  <select
                    value={newLog.issueId}
                    onChange={(e) => setNewLog({ ...newLog, issueId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                  >
                    <option value="">General / Not specific</option>
                    {issues.map(issue => (
                      <option key={issue.id} value={issue.id}>{issue.title}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Symptoms</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Add a symptom (press Enter)"
                      value={symptomInput}
                      onChange={(e) => setSymptomInput(e.target.value)}
                      onKeyDown={handleAddSymptom}
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newLog.symptoms.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => removeSymptom(s)}
                        className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 flex items-center gap-1 hover:bg-blue-100 transition-colors"
                      >
                        {s}
                        <Plus className="w-3 h-3 rotate-45" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Observations / Changes</label>
                  <textarea
                    placeholder="Any specific changes or notes about how you feel today?"
                    value={newLog.observations}
                    onChange={(e) => setNewLog({ ...newLog, observations: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmitLog}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Save Daily Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
