import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, limit, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../App';
import { Plus, ChevronRight, Clock, CheckCircle2, AlertCircle, FolderPlus, Folder, MessageSquare, TrendingUp, MoreVertical, Move, X } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const { user } = useAuth();
  const [scans, setScans] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [latestSymptom, setLatestSymptom] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [movingScan, setMovingScan] = useState<any | null>(null);
  const [activeIssue, setActiveIssue] = useState<any | null>(null);
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const scansQ = query(
      collection(db, 'scans'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const issuesQ = query(
      collection(db, 'issues'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const forumQ = query(
      collection(db, 'forum_posts'),
      orderBy('likes', 'desc'),
      limit(3)
    );

    const conversationsQ = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc'),
      limit(3)
    );

    const symptomsQ = query(
      collection(db, 'symptom_logs'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribeScans = onSnapshot(scansQ, (snapshot) => {
      setScans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'scans');
    });

    const unsubscribeIssues = onSnapshot(issuesQ, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIssues(issuesData);
      
      // Update active issue if it was deleted or changed
      if (activeIssue) {
        const updated = issuesData.find(i => i.id === activeIssue.id);
        setActiveIssue(updated || null);
      }
      
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issues');
    });

    const unsubscribeForum = onSnapshot(forumQ, (snapshot) => {
      setTrendingPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeConversations = onSnapshot(conversationsQ, (snapshot) => {
      setRecentMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeSymptoms = onSnapshot(symptomsQ, (snapshot) => {
      if (!snapshot.empty) {
        setLatestSymptom({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
    });

    return () => {
      unsubscribeScans();
      unsubscribeIssues();
      unsubscribeForum();
      unsubscribeConversations();
      unsubscribeSymptoms();
    };
  }, [user, activeIssue?.id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'doctor-reviewed':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'analyzed':
        return <CheckCircle2 className="w-3 h-3 text-blue-500" />;
      case 'pending':
      default:
        return <Clock className="w-3 h-3 text-amber-500" />;
    }
  };

  const handleCreateIssue = async () => {
    if (!user || !newIssueTitle) return;
    try {
      await addDoc(collection(db, 'issues'), {
        userId: user.uid,
        title: newIssueTitle,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setNewIssueTitle('');
      setShowNewIssue(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'issues');
    }
  };

  const handleDeleteIssue = async () => {
    if (!issueToDelete) return;
    
    try {
      // 1. Move all scans in this issue to "Individual Scans"
      const issueScans = scans.filter(s => s.issueId === issueToDelete);
      for (const scan of issueScans) {
        await updateDoc(doc(db, 'scans', scan.id), { issueId: null });
      }
      
      // 2. Delete the issue
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'issues', issueToDelete));
      
      if (activeIssue?.id === issueToDelete) {
        setActiveIssue(null);
      }
      setIssueToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `issues/${issueToDelete}`);
    }
  };

  const moveScanToIssue = async (scanId: string, issueId: string | null) => {
    try {
      await updateDoc(doc(db, 'scans', scanId), { issueId });
      setMovingScan(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `scans/${scanId}`);
    }
  };

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {issueToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Delete Folder?</h3>
                <p className="text-slate-500 text-sm">
                  Are you sure? Scans inside will be moved to individual scans. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteIssue}
                  className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-bold hover:bg-red-600 transition-all"
                >
                  Delete
                </button>
                <button
                  onClick={() => setIssueToDelete(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {activeIssue && (
              <button 
                onClick={() => setActiveIssue(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            )}
            <h1 className="text-3xl font-bold text-slate-900">
              {activeIssue ? activeIssue.title : 'Dashboard'}
            </h1>
          </div>
          <p className="text-slate-500">
            {activeIssue ? `Tracking progress for ${activeIssue.title}` : 'Track your healing progress.'}
          </p>
        </div>
        <div className="flex gap-2">
          {!activeIssue && (
            <button
              onClick={() => setShowNewIssue(true)}
              className="bg-white border border-slate-200 text-slate-700 p-3 rounded-full hover:bg-slate-50 transition-all"
              title="New Issue Folder"
            >
              <FolderPlus className="w-6 h-6" />
            </button>
          )}
          <Link
            to={activeIssue ? `/new-scan?issueId=${activeIssue.id}` : "/new-scan"}
            className="bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
            title="New Scan"
          >
            <Plus className="w-6 h-6" />
          </Link>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {showNewIssue && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4"
            >
              <h3 className="font-bold text-slate-900">New Issue Folder</h3>
              <input
                type="text"
                placeholder="e.g. Sprained Ankle, Skin Rash"
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateIssue}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm"
                >
                  Create Folder
                </button>
                <button
                  onClick={() => setShowNewIssue(false)}
                  className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {!activeIssue ? (
            <>
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  Issue Folders
                  <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {issues.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {issues.map((issue) => (
                    <div 
                      key={issue.id} 
                      className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm hover:border-blue-200 transition-all group relative cursor-pointer"
                      onClick={() => setActiveIssue(issue)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                          <Folder className="w-6 h-6" />
                        </div>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            {issue.status}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIssueToDelete(issue.id);
                            }}
                            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">{issue.title}</h3>
                      <p className="text-xs text-slate-400 mb-4">Started {formatDate(issue.createdAt)}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="text-xs text-slate-500">
                          {scans.filter(s => s.issueId === issue.id).length} scans logged
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  Recent Individual Scans
                  <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {scans.filter(s => !s.issueId).length}
                  </span>
                </h2>

                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                ) : scans.filter(s => !s.issueId).length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Plus className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-600 font-medium">No individual scans yet</p>
                      <p className="text-slate-400 text-sm">Start your first health scan to get AI insights.</p>
                    </div>
                    <Link
                      to="/new-scan"
                      className="inline-block text-blue-600 font-semibold hover:underline"
                    >
                      Create new scan
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {scans.filter(s => !s.issueId).map((scan, index) => (
                      <motion.div
                        key={scan.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative"
                      >
                        <div className="flex items-center gap-4">
                          <Link
                            to={`/scan/${scan.id}`}
                            className="flex-1 bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 hover:border-blue-200 transition-all group shadow-sm"
                          >
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                              {scan.images?.[0] ? (
                                <img src={scan.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <Activity className="w-6 h-6" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 truncate">{scan.title || 'Untitled Scan'}</h3>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                <span>{formatDate(scan.createdAt)}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(scan.status)}
                                  <span className="capitalize">{scan.status.replace('-', ' ')}</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                          </Link>
                          <button 
                            onClick={() => setMovingScan(movingScan?.id === scan.id ? null : scan)}
                            className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all"
                          >
                            <Move className="w-5 h-5 text-slate-400" />
                          </button>
                        </div>

                        <AnimatePresence>
                          {movingScan?.id === scan.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-2"
                            >
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Move to Folder</p>
                                <div className="flex flex-wrap gap-2">
                                  {issues.map(issue => (
                                    <button
                                      key={issue.id}
                                      onClick={() => moveScanToIssue(scan.id, issue.id)}
                                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:border-blue-500 hover:text-blue-600 transition-all"
                                    >
                                      {issue.title}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  Scans in this Folder
                  <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {scans.filter(s => s.issueId === activeIssue.id).length}
                  </span>
                </h2>
                <button 
                  onClick={() => setIssueToDelete(activeIssue.id)}
                  className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Delete Folder
                </button>
              </div>

              <div className="grid gap-4">
                {scans.filter(s => s.issueId === activeIssue.id).length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-4">
                    <p className="text-slate-500">No scans in this folder yet.</p>
                    <Link
                      to={`/new-scan?issueId=${activeIssue.id}`}
                      className="inline-block bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-sm"
                    >
                      Log First Progress
                    </Link>
                  </div>
                ) : (
                  scans.filter(s => s.issueId === activeIssue.id).map((scan, index) => (
                    <motion.div
                      key={scan.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={`/scan/${scan.id}`}
                        className="bg-white border border-slate-100 p-4 rounded-2xl flex items-center gap-4 hover:border-blue-200 transition-all group shadow-sm"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          {scan.images?.[0] ? (
                            <img src={scan.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Activity className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{scan.title || 'Untitled Scan'}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <span>{formatDate(scan.createdAt)}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(scan.status)}
                              <span className="capitalize">{scan.status.replace('-', ' ')}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-8">
          <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Trending in Forum
            </h2>
            <div className="space-y-4">
              {trendingPosts.map(post => (
                <Link key={post.id} to="/forum" className="block group">
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">{post.title}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-400">{post.category}</span>
                    <span className="text-[10px] font-bold text-blue-600">{post.likes} likes</span>
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/forum" className="block text-center text-xs font-bold text-blue-600 hover:underline pt-2">
              View All Posts
            </Link>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Recent Consultations
            </h2>
            <div className="space-y-4">
              {recentMessages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No active chats.</p>
              ) : (
                recentMessages.map(chat => (
                  <Link key={chat.id} to="/communications" className="flex items-center gap-3 group">
                    <img src={chat.expertPhoto} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate">{chat.expertName}</h3>
                      <p className="text-[10px] text-slate-500 truncate">{chat.lastMessage || 'No messages yet'}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
            <Link to="/communications" className="block text-center text-xs font-bold text-blue-600 hover:underline pt-2">
              Go to Consultations
            </Link>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Recovery Progress
            </h2>
            {latestSymptom ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Latest Pain Level</span>
                  <span className={`text-sm font-bold ${
                    latestSymptom.painLevel > 7 ? 'text-red-600' : 
                    latestSymptom.painLevel > 4 ? 'text-amber-600' : 
                    'text-green-600'
                  }`}>{latestSymptom.painLevel}/10</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      latestSymptom.painLevel > 7 ? 'bg-red-500' : 
                      latestSymptom.painLevel > 4 ? 'bg-amber-500' : 
                      'bg-green-500'
                    }`}
                    style={{ width: `${latestSymptom.painLevel * 10}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 italic line-clamp-2">
                  "{latestSymptom.observations || 'No observations logged.'}"
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No symptom logs yet.</p>
            )}
            <Link to="/symptoms" className="block text-center text-xs font-bold text-blue-600 hover:underline pt-2">
              View Progress Charts
            </Link>
          </section>

          <section className="bg-blue-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-blue-200">
            <div className="relative z-10 space-y-2">
              <h2 className="text-xl font-bold">Need help?</h2>
              <p className="text-blue-100 text-sm max-w-[240px]">
                Our AI can help you understand your symptoms before you see a doctor.
              </p>
              <Link
                to="/new-scan"
                className="inline-block bg-white text-blue-600 px-4 py-2 rounded-xl font-semibold text-sm mt-2"
              >
                Start AI Scan
              </Link>
            </div>
            <Activity className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-500 opacity-20" />
          </section>
        </div>
      </div>
    </div>
  );
}

const Activity = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

