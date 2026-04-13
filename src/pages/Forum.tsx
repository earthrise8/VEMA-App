import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, limit, updateDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../App';
import { MessageSquare, Plus, User, Heart, MessageCircle, ChevronRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/utils';

export default function Forum() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'General' });
  const [activeCategory, setActiveCategory] = useState('All');
  const [activePost, setActivePost] = useState<any | null>(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  const isDoctor = profile?.role === 'doctor';

  const categories = ['All', 'General', 'Diabetes', 'Acne', 'Nutrition', 'Mental Health', 'Fitness'];

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'forum_posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'forum_posts');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activePost) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, `forum_posts/${activePost.id}/comments`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `forum_posts/${activePost.id}/comments`);
    });

    return () => unsubscribe();
  }, [activePost]);

  const handleCreatePost = async () => {
    if (!user || !newPost.title || !newPost.content) return;

    try {
      await addDoc(collection(db, 'forum_posts'), {
        userId: user.uid,
        userName: isDoctor ? (user.displayName || 'Doctor') : 'Anonymous',
        isDoctor: isDoctor,
        title: newPost.title,
        content: newPost.content,
        category: newPost.category,
        createdAt: new Date().toISOString(),
        likes: 0,
        commentCount: 0
      });
      setNewPost({ title: '', content: '', category: 'General' });
      setShowNewPost(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'forum_posts');
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activePost || !newComment.trim()) return;

    try {
      await addDoc(collection(db, `forum_posts/${activePost.id}/comments`), {
        userId: user.uid,
        userName: isDoctor ? (user.displayName || 'Doctor') : 'Anonymous',
        isDoctor: isDoctor,
        content: newComment,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'forum_posts', activePost.id), {
        commentCount: (activePost.commentCount || 0) + 1
      });

      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `forum_posts/${activePost.id}/comments`);
    }
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'forum_posts', postId), {
        likes: (currentLikes || 0) + 1
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `forum_posts/${postId}`);
    }
  };

  const filteredPosts = activeCategory === 'All' 
    ? posts 
    : posts.filter(p => p.category === activeCategory);

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Health Forum</h1>
          <p className="text-slate-500">Connect with the community and share experiences anonymously.</p>
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Post
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              activeCategory === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showNewPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl p-8 rounded-3xl shadow-2xl space-y-6"
            >
              <h2 className="text-xl font-bold text-slate-900">Create a Community Post</h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Category</label>
                  <select
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Title</label>
                  <input
                    type="text"
                    placeholder="What's on your mind?"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Content</label>
                  <textarea
                    placeholder="Share your experience or ask for help..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  />
                </div>
                <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isDoctor ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Posting as: {isDoctor ? (user?.displayName || 'Doctor') : 'Anonymous'}</p>
                    <p className="text-[10px] text-slate-500">
                      {isDoctor 
                        ? "Your professional identity will be visible to build trust." 
                        : "Your identity is hidden to protect your privacy."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreatePost}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                >
                  Post to Community
                </button>
                <button
                  onClick={() => setShowNewPost(false)}
                  className="flex-1 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Detail / Comments Modal */}
      <AnimatePresence>
        {activePost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white w-full max-w-3xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    {activePost.category}
                  </span>
                  <p className="text-xs text-slate-400">{formatDate(activePost.createdAt)}</p>
                </div>
                <button onClick={() => setActivePost(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activePost.isDoctor ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                      {activePost.isDoctor ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        {activePost.userName}
                        {activePost.isDoctor && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-md uppercase">Doctor</span>}
                      </h3>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{activePost.title}</h2>
                  <p className="text-slate-600 leading-relaxed">{activePost.content}</p>
                </div>

                <div className="space-y-6">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Comments ({comments.length})
                  </h3>

                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-slate-50 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${comment.isDoctor ? 'text-blue-600' : 'text-slate-700'}`}>
                              {comment.userName}
                              {comment.isDoctor && <span className="ml-1 text-[8px] bg-blue-600 text-white px-1 py-0.5 rounded uppercase">Doctor</span>}
                            </span>
                            <span className="text-[10px] text-slate-400">{formatDate(comment.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600">{comment.content}</p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-center text-slate-400 py-8 text-sm italic">No comments yet. Be the first to reply!</p>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateComment} className="p-6 border-t border-slate-100 bg-slate-50/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a helpful reply..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    Reply
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  Posting as: <span className="font-bold">{isDoctor ? (user?.displayName || 'Doctor') : 'Anonymous'}</span>
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-slate-200" />
            <p className="text-slate-500">No posts in this category yet.</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setActivePost(post)}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${post.isDoctor ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    {post.isDoctor ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-none flex items-center gap-2">
                      {post.userName}
                      {post.isDoctor && <span className="text-[8px] bg-blue-600 text-white px-1 py-0.5 rounded uppercase">Doctor</span>}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
                <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                  {post.category}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{post.title}</h2>
              <p className="text-slate-600 text-sm line-clamp-3 mb-6">{post.content}</p>
              
              <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(post.id, post.likes);
                  }}
                  className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  <span className="text-xs font-bold">{post.likes || 0}</span>
                </button>
                <div className="flex items-center gap-2 text-slate-400">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-bold">{post.commentCount || 0}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

import { getDocs, where } from 'firebase/firestore';
import { ShieldCheck, X } from 'lucide-react';
