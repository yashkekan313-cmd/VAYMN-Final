import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Book, ViewState, UserRole } from './types';
import { db } from './services/databaseService';
import AuthScreen from './components/AuthScreen';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import ConfirmationModal from './components/ConfirmationModal';
import { getAiRecommendation, getAiVoice } from './geminiService';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [view, setView] = useState<ViewState>('HOME');
  const [targetRole, setTargetRole] = useState<UserRole>('USER');
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  
  // Persistent Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { id: '1', text: "Hello! I'm VAYMN, your virtual librarian. How can I help you find your next book today?", sender: 'ai' }
  ]);
  const [chatQuery, setChatQuery] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatTyping]);

  useEffect(() => {
    const init = async () => {
      try {
        await db.seedIfEmpty();
        const [savedUser, savedBooks, savedUsers, savedAdmins] = await Promise.all([
          db.getCurrentUser().catch(() => null),
          db.getBooks().catch(() => []),
          db.getUsers().catch(() => []),
          db.getAdmins().catch(() => [])
        ]);
        setCurrentUser(savedUser);
        setBooks(savedBooks || []);
        setUsers(savedUsers || []);
        setAdmins(savedAdmins || []);
        if (savedUser) {
          setView('DASHBOARD');
          // Only auto-open chat for students
          if (savedUser.role === 'USER') setIsChatOpen(true);
        }
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const handleChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatQuery.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), text: chatQuery, sender: 'user' };
    setChatMessages(p => [...p, userMsg]);
    setChatQuery('');
    setIsChatTyping(true);
    
    const res = await getAiRecommendation(chatQuery, books);
    const aiMsg: Message = { id: (Date.now() + 1).toString(), text: res.text, sender: 'ai' };
    setChatMessages(p => [...p, aiMsg]);
    setIsChatTyping(false);

    const audioData = await getAiVoice(res.text);
    if (audioData) {
        const binaryString = atob(audioData);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
    }
  };

  const handleReturnBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    if (book.issuedTo) {
      const issuedUser = users.find(u => u.libraryId === book.issuedTo);
      if (issuedUser) {
        const updatedUser: User = { ...issuedUser, xp: (issuedUser.xp || 0) + 20 };
        setUsers(prev => prev.map(u => u.id === issuedUser.id ? updatedUser : u));
        db.updateUser(updatedUser);
        if (currentUser?.id === issuedUser.id) setCurrentUser(updatedUser);
      }
    }

    const updatedBook: Book = { ...book, isAvailable: true, issuedTo: undefined, issuedDate: undefined };
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
    db.updateBook(updatedBook);
    addToast("Book Returned. +20 XP earned!", "success");
  };

  // Logic to determine if sidebar should be present
  const showSidebar = currentUser?.role === 'USER';

  if (isInitializing) return (
    <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-white/10 border-t-[#5DA9E9] rounded-full animate-spin mb-6"></div>
      <h1 className="text-3xl font-bold text-white tracking-widest heading-serif">VAYMN</h1>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex overflow-hidden">
      {/* Toast System */}
      <div className="fixed top-6 right-6 z-[500] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className="glass-panel px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 animate-slide-right">
             <i className={`fas ${t.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-info-circle text-blue-500'}`}></i>
             <span className="font-semibold text-sm text-[#1F2A44]">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Main Content Viewport */}
      <div className={`flex-1 flex flex-col transition-all duration-700 h-screen overflow-y-auto ${isChatOpen && showSidebar ? 'mr-[400px]' : ''}`}>
        
        {view === 'HOME' && (
          <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center justify-center px-4 relative overflow-hidden">
            <div className="grid-overlay"></div>
            <div className="text-center mb-24 relative z-10 animate-spring">
              <h1 className="text-8xl md:text-[9.5rem] font-bold text-white mb-4 heading-serif tracking-tight">VAYMN</h1>
              <p className="text-[#5DA9E9] font-bold text-sm md:text-base tracking-[0.7em] uppercase opacity-90">STREAM SMARTER</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl relative z-10">
              {/* Student Portal - Corrected Label & Style */}
              <button 
                onClick={() => { setTargetRole('USER'); setView('USER_LOGIN'); }} 
                className="portal-card p-14 rounded-[56px] text-left group animate-spring"
              >
                <div className="w-16 h-16 bg-[#5DA9E9] rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg mb-10 group-hover:rotate-12 transition-transform duration-500">
                  <i className="fas fa-user-graduate"></i>
                </div>
                <h3 className="text-4xl font-bold text-white mb-3 heading-serif">Student Portal</h3>
                <p className="text-slate-400 text-lg font-medium opacity-80">Access books, track XP, and explore your library.</p>
              </button>

              {/* Admin Control - Corrected Style */}
              <button 
                onClick={() => { setTargetRole('ADMIN'); setView('ADMIN_LOGIN'); }} 
                className="portal-card p-14 rounded-[56px] text-left group animate-spring"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#1F2A44] text-2xl shadow-lg mb-10 group-hover:rotate-12 transition-transform duration-500">
                  <i className="fas fa-lock"></i>
                </div>
                <h3 className="text-4xl font-bold text-white mb-3 heading-serif">Admin Control</h3>
                <p className="text-slate-400 text-lg font-medium opacity-80">Management dashboard for librarians and staff.</p>
              </button>
            </div>
          </div>
        )}

        {(view === 'USER_LOGIN' || view === 'ADMIN_LOGIN' || view === 'SIGNUP') && (
          <AuthScreen 
            mode={view === 'SIGNUP' ? 'SIGNUP' : 'LOGIN'} 
            role={targetRole} 
            onLogin={(id, p, r) => {
              const source = r === 'ADMIN' ? admins : users;
              const found = source.find(u => u.libraryId === id && u.password === p);
              if (found) { 
                db.saveSession(found); 
                setCurrentUser(found); 
                setView('DASHBOARD'); 
                if (found.role === 'USER') setIsChatOpen(true); 
                addToast(`Welcome back, ${found.name}`, 'success'); 
              }
              else addToast("Invalid credentials provided", "error");
            }} 
            onSignup={u => { db.updateUser(u); setCurrentUser(u); setView('DASHBOARD'); setIsChatOpen(true); }} 
            onBackToHome={() => setView('HOME')} 
            onToggleSignup={() => setView('SIGNUP')} 
            onBackToLogin={() => setView('USER_LOGIN')} 
          />
        )}

        {view === 'DASHBOARD' && currentUser && (
          <>
            <nav className="bg-white/80 backdrop-blur-2xl px-12 py-8 border-b border-slate-100 flex justify-between items-center sticky top-0 z-[100] animate-spring">
              <div className="flex items-center gap-6 cursor-pointer group" onClick={() => setView('HOME')}>
                <div className="w-12 h-12 bg-[#1F2A44] rounded-2xl flex items-center justify-center text-white font-black text-xl group-hover:scale-110 transition-transform">V</div>
                <span className="text-2xl font-bold tracking-tighter heading-serif">VAYMN</span>
              </div>
              <div className="flex items-center gap-8">
                {showSidebar && (
                  <button onClick={() => setIsChatOpen(!isChatOpen)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isChatOpen ? 'bg-blue-50 text-[#5DA9E9] shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}>
                    <i className="fas fa-comment-dots text-xl"></i>
                  </button>
                )}
                <div className="h-10 w-[1px] bg-slate-100"></div>
                <div className="text-right hidden sm:block">
                  <p className="text-base font-bold text-[#1F2A44]">{currentUser.name}</p>
                  <p className="text-[10px] font-bold text-[#5DA9E9] uppercase tracking-[0.2em]">{currentUser.role === 'ADMIN' ? 'Head Librarian' : 'Student Member'}</p>
                </div>
                <button onClick={() => setIsConfirmingLogout(true)} className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><i className="fas fa-sign-out-alt"></i></button>
              </div>
            </nav>
            <main className="max-w-[1400px] mx-auto w-full p-12 animate-spring">
              {currentUser.role === 'USER' ? (
                <UserDashboard user={currentUser} books={books} onIssueBook={id => {
                  const b = books.find(x => x.id === id);
                  if (b) {
                    const ub: Book = { ...b, isAvailable: false, issuedTo: currentUser.libraryId, issuedDate: new Date().toISOString() };
                    setBooks(p => p.map(x => x.id === id ? ub : x)); db.updateBook(ub); addToast("Checkout Successful", "success");
                  }
                }} onReIssueBook={id => {
                  const b = books.find(x => x.id === id);
                  if (b) {
                    const ub: Book = { ...b, issuedDate: new Date().toISOString() };
                    setBooks(p => p.map(x => x.id === id ? ub : x)); db.updateBook(ub); addToast("Book Renewed", "info");
                  }
                }} onReserveBook={id => {
                  const b = books.find(x => x.id === id);
                  if (b) {
                    const ub: Book = { ...b, waitlist: [...(b.waitlist || []), currentUser.libraryId] };
                    setBooks(p => p.map(x => x.id === id ? ub : x)); db.updateBook(ub); addToast("Added to Waitlist", "success");
                  }
                }} onGoHome={() => setView('HOME')} />
              ) : (
                <AdminDashboard 
                  admin={currentUser} books={books} users={users} admins={admins}
                  setBooks={setBooks} setUsers={setUsers} setAdmins={setAdmins}
                  onDeleteBook={id => { setBooks(b => b.filter(x => x.id !== id)); db.deleteBook(id); }}
                  onDeleteUser={id => { setUsers(u => u.filter(x => x.id !== id)); db.deleteUser(id); }}
                  onDeleteAdmin={id => { setAdmins(a => a.filter(x => x.id !== id)); db.deleteAdmin(id); }}
                  onUpdateUser={u => { setUsers(p => p.map(x => x.id === u.id ? u : x)); db.updateUser(u); }}
                  onUpdateAdmin={a => { setAdmins(p => p.map(x => x.id === a.id ? a : x)); db.updateAdmin(a); }}
                  onAddUser={u => { setUsers(p => [...p, u]); db.updateUser(u); }}
                  onAddAdmin={a => { setAdmins(p => [...p, a]); db.updateAdmin(a); }}
                  onReturnBook={handleReturnBook}
                  onPenalty={id => {
                    const u = users.find(x => x.libraryId === id);
                    if (u) { const uu = { ...u, xp: Math.max(0, u.xp - 50) }; setUsers(p => p.map(x => x.id === u.id ? uu : x)); db.updateUser(uu); addToast("Point Deduction Applied", "error"); }
                  }}
                  onGoHome={() => setView('HOME')}
                />
              )}
            </main>
          </>
        )}
      </div>

      {/* Persistent AI Sidebar - ONLY FOR USERS */}
      {showSidebar && (
        <aside className={`fixed right-0 top-0 h-screen w-[400px] bg-white border-l border-slate-100 flex flex-col transition-all duration-700 z-[250] ${isChatOpen ? 'translate-x-0' : 'translate-x-full shadow-none'}`}>
          <div className="p-10 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 text-[#5DA9E9] rounded-xl flex items-center justify-center animate-pulse"><i className="fas fa-brain"></i></div>
              <h4 className="font-bold text-[#1F2A44] text-lg heading-serif">VAYMN AI</h4>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="w-10 h-10 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"><i className="fas fa-times"></i></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-10 space-y-8 hide-scrollbar">
            {chatMessages.map(m => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-6 text-sm font-medium leading-relaxed tracking-tight ${m.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isChatTyping && (
              <div className="flex justify-start">
                <div className="chat-bubble-ai p-4 flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-[#5DA9E9] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#5DA9E9] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-[#5DA9E9] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={chatScrollRef} />
          </div>

          <form onSubmit={handleChat} className="p-10 bg-white border-t border-slate-50 flex gap-4">
            <input 
              value={chatQuery} onChange={e => setChatQuery(e.target.value)}
              placeholder="Ask for book recommendations..." 
              className="flex-1 bg-slate-50 px-8 py-5 rounded-2xl text-sm font-semibold outline-none border border-transparent focus:border-[#5DA9E9] focus:bg-white transition-all shadow-inner" 
            />
            <button type="submit" className="w-16 h-16 bg-[#1F2A44] text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg transition-all">
              <i className="fas fa-paper-plane text-xl"></i>
            </button>
          </form>
        </aside>
      )}

      {isConfirmingLogout && (
        <ConfirmationModal 
          title="Sign Out" 
          message="Are you sure you want to end your session? Your progress will be saved." 
          onConfirm={() => { db.saveSession(null); setCurrentUser(null); setView('HOME'); setIsConfirmingLogout(false); setIsChatOpen(false); }} 
          onCancel={() => setIsConfirmingLogout(false)} 
        />
      )}
    </div>
  );
};

export default App;
