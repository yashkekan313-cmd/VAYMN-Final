
import React, { useState, useEffect, useCallback } from 'react';
import { User, Book, ViewState, UserRole } from './types';
import { db } from './services/databaseService';
import AuthScreen from './components/AuthScreen';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import ConfirmationModal from './components/ConfirmationModal';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
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

  const [aiOnline, setAiOnline] = useState(false);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    const hasKey = !!process.env.API_KEY;
    setAiOnline(hasKey);

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
        if (savedUser) setView('DASHBOARD');
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const handleIssueBook = (bookId: string) => {
    if (!currentUser) return;
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const updatedBook = { 
      ...book, 
      isAvailable: false, 
      issuedTo: currentUser.libraryId,
      issuedDate: new Date().toISOString()
    };
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
    db.updateBook(updatedBook);
    addToast(`Stream confirmed: ${book.title}. Enjoy your asset.`, 'success');
  };

  const handleReIssueBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const updatedBook = { ...book, issuedDate: new Date().toISOString() };
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
    db.updateBook(updatedBook);
    addToast(`Stream refreshed: ${book.title}. Loan extended.`, 'info');
  };

  const handleReturnBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    if (book.issuedTo) {
      const issuedUser = users.find(u => u.libraryId === book.issuedTo);
      if (issuedUser) {
        const updatedUser = { 
          ...issuedUser, 
          xp: (issuedUser.xp || 0) + 20, 
          badges: issuedUser.badges?.includes('POWER_READER') ? issuedUser.badges : [...(issuedUser.badges || []), 'ASSET_RETURNER']
        };
        setUsers(prev => prev.map(u => u.id === issuedUser.id ? updatedUser : u));
        db.updateUser(updatedUser);
        if (currentUser?.id === issuedUser.id) setCurrentUser(updatedUser);
      }
    }

    const updatedBook = { ...book, isAvailable: true, issuedTo: undefined, issuedDate: undefined };
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
    db.updateBook(updatedBook);
    addToast("Asset returned to stacks. +20 XP awarded.", "success");
  };

  // Added handleReserveBook to fix missing reference on UserDashboard
  const handleReserveBook = (bookId: string) => {
    if (!currentUser) return;
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    const waitlist = book.waitlist || [];
    if (waitlist.includes(currentUser.libraryId)) {
      addToast("System: You are already in the queue for this stream.", "info");
      return;
    }
    
    const updatedBook = { ...book, waitlist: [...waitlist, currentUser.libraryId] };
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
    db.updateBook(updatedBook);
    addToast(`Queue position secured: ${book.title}.`, 'success');
  };

  // Added handlePenalty to fix missing reference on AdminDashboard
  const handlePenalty = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const updatedUser = { ...user, xp: Math.max(0, (user.xp || 0) - 50) };
    setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    db.updateUser(updatedUser);
    addToast(`Penalty applied: ${user.name}. -50 XP.`, 'error');
  };

  const handleLogin = (libraryId: string, password: string, role: UserRole) => {
    const source = role === 'ADMIN' ? admins : users;
    const found = source.find(u => u.libraryId === libraryId && u.password === password);
    if (found) {
      db.saveSession(found);
      setCurrentUser(found);
      setView('DASHBOARD');
      addToast(`Access granted. Hello, ${found.name}.`, 'success');
    } else {
      addToast("Credentials rejected.", "error");
    }
  };

  if (isInitializing) return (
    <div className="min-h-screen bg-[#1F2A44] flex flex-col items-center justify-center text-white">
      <div className="w-16 h-16 border-4 border-[#5DA9E9] border-t-transparent rounded-full animate-spin mb-8"></div>
      <h1 className="text-4xl font-black tracking-tighter animate-pulse">VAYMN</h1>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mt-4">Calibrating Streams</p>
    </div>
  );

  return (
    <div className="min-h-screen">
       <div className="fixed top-6 right-6 z-[300] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className="bg-white border-l-4 border-[#1F2A44] px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 animate-toast border-b border-slate-100">
             <i className={`fas ${t.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-info-circle text-blue-500'}`}></i>
             <span className="font-bold text-sm text-[#1F2A44]">{t.message}</span>
          </div>
        ))}
      </div>

      {view === 'HOME' && (
        <div className="min-h-screen data-stream-bg flex flex-col items-center justify-center px-4 relative">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#111827]/40 backdrop-blur-xl border border-white/5 px-6 py-2.5 rounded-full shadow-2xl animate-fade-in-up">
              <div className={`w-2.5 h-2.5 rounded-full ${aiOnline ? 'bg-green-500 shadow-[0_0_12px_#22c55e] animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-bold text-white/90 uppercase tracking-[0.3em] select-none font-['JetBrains_Mono']">
                AI CORE {aiOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
          </div>

          <div className="text-center mb-16 relative z-10 animate-fade-in-up">
            <h1 className="text-8xl md:text-[11rem] font-black text-white tracking-tighter leading-none mb-6">VAYMN</h1>
            <p className="text-[#5DA9E9] font-black text-[10px] md:text-sm tracking-[0.8em] uppercase opacity-90 drop-shadow-lg">
              Stream Smarter. Library Reimagined.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl relative z-10">
            <button 
              onClick={() => { setTargetRole('USER'); setView('USER_LOGIN'); }}
              className="bg-white/5 backdrop-blur-md border border-white/10 p-12 rounded-[56px] text-left hover:bg-white/10 hover:scale-[1.02] transition-all group flex flex-col gap-8 shadow-2xl animate-fade-in-up"
            >
              <div className="w-20 h-20 bg-gradient-to-tr from-[#5DA9E9] to-blue-600 rounded-[28px] flex items-center justify-center text-white text-3xl shadow-2xl group-hover:rotate-6 transition-transform duration-500">
                <i className="fas fa-play"></i>
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white mb-2">Student Portal</h3>
                <p className="text-slate-400 font-medium">Browse the stream of knowledge.</p>
              </div>
            </button>

            <button 
              onClick={() => { setTargetRole('ADMIN'); setView('ADMIN_LOGIN'); }}
              className="bg-white/5 backdrop-blur-md border border-white/10 p-12 rounded-[56px] text-left hover:bg-white/10 hover:scale-[1.02] transition-all group flex flex-col gap-8 shadow-2xl animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center text-[#1F2A44] text-3xl shadow-2xl group-hover:-rotate-6 transition-transform duration-500">
                <i className="fas fa-layer-group"></i>
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white mb-2">Command Center</h3>
                <p className="text-slate-400 font-medium">Manage assets and streams.</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {(view === 'USER_LOGIN' || view === 'ADMIN_LOGIN' || view === 'SIGNUP') && (
        <AuthScreen mode={view === 'SIGNUP' ? 'SIGNUP' : 'LOGIN'} role={targetRole} onLogin={handleLogin} onSignup={u => { db.updateUser(u); setCurrentUser(u); setView('DASHBOARD'); }} onBackToHome={() => setView('HOME')} onToggleSignup={() => setView('SIGNUP')} onBackToLogin={() => setView('USER_LOGIN')} />
      )}

      {view === 'DASHBOARD' && currentUser && (
        <div className="animate-fade-in-up">
          <nav className="bg-white/80 backdrop-blur-md px-10 py-6 border-b flex justify-between items-center sticky top-0 z-[200]">
            <div className="flex items-center gap-10">
              <span className="text-3xl font-black tracking-tighter cursor-pointer hover:text-[#5DA9E9] transition-colors" onClick={() => setView('HOME')}>VAYMN</span>
              <div className="hidden lg:flex items-center gap-4 bg-[#1F2A44] px-5 py-2.5 rounded-full shadow-lg border border-white/5">
                 <div className={`w-2 h-2 rounded-full ${aiOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse' : 'bg-red-500'}`}></div>
                 <span className="text-[9px] font-bold text-white/90 uppercase tracking-[0.3em] font-['JetBrains_Mono']">
                    AI CORE {aiOnline ? 'ONLINE' : 'OFFLINE'}
                 </span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-sm font-black text-[#1F2A44]">{currentUser.name}</span>
                <span className="text-[9px] font-black uppercase text-[#5DA9E9] tracking-widest">{currentUser.role === 'ADMIN' ? 'Command Level 1' : `Reader Level ${Math.floor((currentUser.xp || 0) / 100) + 1}`}</span>
              </div>
              <button onClick={() => setIsConfirmingLogout(true)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-all"><i className="fas fa-power-off"></i></button>
            </div>
          </nav>
          
          <main className="max-w-[1600px] mx-auto p-10">
            {currentUser.role === 'USER' ? (
              <UserDashboard user={currentUser} books={books} onIssueBook={handleIssueBook} onReIssueBook={handleReIssueBook} onReserveBook={handleReserveBook} onGoHome={() => setView('HOME')} />
            ) : (
              <AdminDashboard 
                admin={currentUser} books={books} users={users} admins={admins}
                setBooks={setBooks} setUsers={setUsers} setAdmins={setAdmins}
                onDeleteBook={id => { setBooks(b => b.filter(x => x.id !== id)); db.deleteBook(id); }}
                onDeleteUser={id => { setUsers(u => u.filter(x => x.id !== id)); db.deleteUser(id); }}
                onDeleteAdmin={id => { setAdmins(a => a.filter(x => x.id !== id)); db.deleteAdmin(id); }}
                onUpdateUser={u => { setUsers(prev => prev.map(x => x.id === u.id ? u : x)); db.updateUser(u); }}
                onUpdateAdmin={a => { setAdmins(prev => prev.map(x => x.id === a.id ? a : x)); db.updateAdmin(a); }}
                onAddUser={u => { setUsers(p => [...p, u]); db.updateUser(u); }}
                onAddAdmin={a => { setAdmins(p => [...p, a]); db.updateAdmin(a); }}
                onReturnBook={handleReturnBook}
                onPenalty={handlePenalty}
                onGoHome={() => setView('HOME')}
              />
            )}
          </main>
        </div>
      )}

      {isConfirmingLogout && (
        <ConfirmationModal title="End Session" message="Confirm system logout? Your current stream state will be saved." onConfirm={() => { db.saveSession(null); setCurrentUser(null); setView('HOME'); setIsConfirmingLogout(false); }} onCancel={() => setIsConfirmingLogout(false)} />
      )}
    </div>
  );
};

export default App;
