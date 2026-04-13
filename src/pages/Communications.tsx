import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../App';
import { Search, MessageSquare, Star, Send, ShieldCheck, Clock, DollarSign, FileText, Share2, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/utils';

export default function Communications() {
  const { user } = useAuth();
  const [experts, setExperts] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [userScans, setUserScans] = useState<any[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch experts
    const fetchExperts = async () => {
      try {
        const q = query(collection(db, 'experts'), limit(20));
        const snap = await getDocs(q);
        const expertData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (expertData.length === 0) {
          const seedExperts = [
            { name: "Dr. Sarah Chen", specialty: "Dermatology", rating: 4.9, reviewCount: 124, bio: "Specialist in skin conditions and rashes.", photoUrl: "https://picsum.photos/seed/doc1/200", pricingPlan: "$50 / consult" },
            { name: "Dr. James Wilson", specialty: "Dentistry", rating: 4.8, reviewCount: 89, bio: "Expert in oral health and dental surgery.", photoUrl: "https://picsum.photos/seed/doc2/200", pricingPlan: "$75 / consult" },
            { name: "Dr. Elena Rodriguez", specialty: "General Practice", rating: 4.7, reviewCount: 210, bio: "Family medicine and preventive care.", photoUrl: "https://picsum.photos/seed/doc3/200", pricingPlan: "$40 / consult" }
          ];
          for (const exp of seedExperts) {
            await addDoc(collection(db, 'experts'), exp);
          }
          fetchExperts();
        } else {
          setExperts(expertData);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'experts');
      } finally {
        setLoading(false);
      }
    };
    fetchExperts();

    // Fetch conversations
    const convQ = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribeConv = onSnapshot(convQ, (snapshot) => {
      setConversations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch pending requests
    const reqQ = query(
      collection(db, 'consultation_requests'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubscribeReq = onSnapshot(reqQ, (snapshot) => {
      setPendingRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch user scans for sharing
    const scansQ = query(collection(db, 'scans'), where('userId', '==', user.uid));
    getDocs(scansQ).then(snapshot => {
      setUserScans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeConv();
      unsubscribeReq();
    };
  }, [user]);

  useEffect(() => {
    if (!activeChat) return;

    const msgQ = query(
      collection(db, `conversations/${activeChat.id}/messages`),
      orderBy('createdAt', 'asc')
    );
    const unsubscribeMsg = onSnapshot(msgQ, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribeMsg();
  }, [activeChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChat || !newMessage.trim()) return;

    try {
      const msgData = {
        senderId: user.uid,
        text: newMessage,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, `conversations/${activeChat.id}/messages`), msgData);
      await updateDoc(doc(db, 'conversations', activeChat.id), {
        lastMessage: newMessage,
        updatedAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `conversations/${activeChat.id}/messages`);
    }
  };

  const startConsultation = async (expert: any) => {
    if (!user) return;
    
    // Check if request already exists
    const existingReq = pendingRequests.find(r => r.expertId === expert.id);
    if (existingReq) {
      alert("You already have a pending request with this expert.");
      return;
    }

    try {
      // 1. Create consultation request
      await addDoc(collection(db, 'consultation_requests'), {
        userId: user.uid,
        expertId: expert.id,
        expertName: expert.name,
        expertPhoto: expert.photoUrl,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2. Check if conversation already exists, if not create a placeholder one
      let conv = conversations.find(c => c.participants.includes(expert.id));
      if (!conv) {
        const newConvRef = await addDoc(collection(db, 'conversations'), {
          participants: [user.uid, expert.id],
          expertName: expert.name,
          expertPhoto: expert.photoUrl,
          lastMessage: 'Consultation requested',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        conv = { 
          id: newConvRef.id, 
          participants: [user.uid, expert.id],
          expertName: expert.name,
          expertPhoto: expert.photoUrl
        };
      }
      
      setActiveChat(conv);
      alert(`Request sent to ${expert.name}. You can now see the chat, but messaging will be enabled once they confirm the time.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'consultation_requests');
    }
  };

  const isChatEnabled = () => {
    if (!activeChat || !user) return false;
    const expertId = activeChat.participants.find((p: string) => p !== user.uid);
    // Find a confirmed request for this expert
    // We need to fetch all requests or have a listener
    // Let's add a listener for all requests of the user
    return confirmedRequests.some(r => r.expertId === expertId);
  };

  // Add state for confirmed requests
  const [confirmedRequests, setConfirmedRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'consultation_requests'),
      where('userId', '==', user.uid),
      where('status', '==', 'confirmed')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConfirmedRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const shareScan = async (scanId: string) => {
    if (!activeChat) return;
    try {
      const scan = userScans.find(s => s.id === scanId);
      const expertId = activeChat.participants.find((p: string) => p !== user.uid);
      
      const sharedWith = scan.sharedWith || [];
      if (!sharedWith.includes(expertId)) {
        await updateDoc(doc(db, 'scans', scanId), {
          sharedWith: [...sharedWith, expertId]
        });
      }

      await addDoc(collection(db, `conversations/${activeChat.id}/messages`), {
        senderId: user.uid,
        text: `Shared a scan: ${scan.title || 'Untitled Scan'}`,
        scanId: scanId,
        createdAt: serverTimestamp()
      });
      
      setShowShareModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `scans/${scanId}`);
    }
  };

  const filteredExperts = experts.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row gap-6">
      {/* Experts & Conversations Sidebar */}
      <div className="w-full md:w-80 flex flex-col gap-6">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search experts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-900">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-8">No active conversations.</p>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveChat(conv)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activeChat?.id === conv.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <img src={conv.expertPhoto} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="text-sm font-bold truncate">{conv.expertName}</h3>
                    <p className="text-[10px] opacity-70 truncate">{conv.lastMessage || 'No messages yet'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area or Expert List */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {activeChat ? (
          <>
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <img src={activeChat.expertPhoto} alt="" className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h2 className="font-bold text-slate-900">{activeChat.expertName}</h2>
                  <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Expert
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowShareModal(true)}
                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                title="Share Scan"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.senderId === user?.uid ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                    {msg.scanId && (
                      <div className="mb-2 p-2 bg-white/10 rounded-lg flex items-center gap-2 border border-white/20">
                        <FileText className="w-4 h-4" />
                        <span className="font-bold text-xs">Shared Scan</span>
                      </div>
                    )}
                    {msg.text}
                    <p className={`text-[10px] mt-1 ${msg.senderId === user?.uid ? 'text-blue-200' : 'text-slate-400'}`}>
                      {formatDate(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-50 flex flex-col gap-2">
              {!isChatEnabled() && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                    Waiting for expert to confirm consultation time...
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={isChatEnabled() ? "Type your message..." : "Messaging disabled until confirmed"}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!isChatEnabled()}
                  className={`flex-1 px-4 py-2 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none ${isChatEnabled() ? 'bg-slate-50' : 'bg-slate-100 cursor-not-allowed'}`}
                />
                <button 
                  type="submit" 
                  disabled={!isChatEnabled() || !newMessage.trim()}
                  className={`p-2 rounded-xl transition-all ${isChatEnabled() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Available Experts</h2>
              <p className="text-sm text-slate-500">Connect with licensed professionals for a consultation.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredExperts.map(expert => (
                <div key={expert.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4 hover:border-blue-200 transition-all">
                  <div className="flex gap-4">
                    <img src={expert.photoUrl} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{expert.name}</h3>
                      <p className="text-xs text-blue-600 font-medium">{expert.specialty}</p>
                      <div className="flex items-center gap-1 text-amber-500 mt-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs font-bold">{expert.rating}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({expert.reviewCount} reviews)</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{expert.bio}</p>
                  
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-slate-700 font-bold">
                      <DollarSign className="w-3 h-3" />
                      <span className="text-sm">{expert.pricingPlan || 'Custom Pricing'}</span>
                    </div>
                    <button
                      onClick={() => startConsultation(expert)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                    >
                      Request Consult
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share Scan Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Share a Scan</h3>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto space-y-2">
                {userScans.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No scans available to share.</p>
                ) : (
                  userScans.map(scan => (
                    <button
                      key={scan.id}
                      onClick={() => shareScan(scan.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-blue-100"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden">
                        {scan.images?.[0] && <img src={scan.images[0]} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-sm font-bold text-slate-800">{scan.title || 'Untitled Scan'}</h4>
                        <p className="text-[10px] text-slate-400">{formatDate(scan.createdAt)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
