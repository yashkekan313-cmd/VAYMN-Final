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
    const updatedBook: Book = { 
      ...book, 
      isAvailable: false, 
      issuedTo: currentUser.libraryId,
      issuedDate: new Date().toISOString()
    };
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
    db.updateBook(updatedBook);
    addToast(`Stream initiated: ${book.title}.`, 'success');
  };

  const handleReIssueBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const updatedBook: Book = { ...book, issuedDate: new Date().toISOString() };
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
    db.updateBook(updatedBook);
    addToast(`Stream refreshed: ${book.title}.`, 'info');
  };

  const handleReturnBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    
    if (book.issuedTo) {
      const issuedUser = users.find(u => u.libraryId === book.issuedTo);
      if (issuedUser) {
        const updatedUser: User = { 
          ...issuedUser, 
          xp: (issuedUser.xp || 0) + 20, 
          badges: issuedUser.badges || []
        };
        setUsers(prev => prev.map(u => u.id === issuedUser.id ? updatedUser : u));
        db.updateUser(updatedUser);
        if (currentUser?.id === issuedUser.id) setCurrentUser(updatedUser);
      }
    }

    const updatedBook: Book = { ...book, isAvailable: true, issuedTo: undefined, issuedDate: undefined };
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
    db.updateBook(updatedBook);
    addToast("Asset returned. +20 XP awarded.", "success");
  };

  const handleReserveBook = (bookId: string) => {
    if (!currentUser) return;
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const waitlist = book.waitlist || [];
    if (waitlist.includes(currentUser.libraryId)) return;
    const updatedBook: Book = { ...book, waitlist: [...waitlist, currentUser.libraryId] };
    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
    db.updateBook(updatedBook);
    addToast(`Waitlist confirmed for ${book.title}.`, 'success');
  };

  const handlePenalty = (libraryId: string) => {
    const user = users.find(u => u.libraryId === libraryId);
    if (!user) return;
    const updatedUser: User = { ...user, xp: Math.max(0, (user.xp || 0) - 50) };
    setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    db.updateUser(updatedUser);
    addToast(`System Warning: XP deducted for ${user.name}.`, 'error');
  };

  const handleLogin = (libraryId: string, password: string, role: UserRole) => {
    const source = role === 'ADMIN' ? admins : users;
    const found = source.find(u => u.libraryId === libraryId && u.password === password);
    if (found) {
      db.saveSession(found);
      setCurrentUser(found);
      setView('DASHBOARD');
      addToast(`System access granted. Hello, ${found.name}.`, 'success');
    } else {
      addToast("Access denied. Invalid credentials.", "error");
    }
  };

  if (isInitializing) return (
    <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center justify-center text-white">
      <div className="w-16 h-16 border-4 border-[#5DA9E9] border-t-transparent rounded-full animate-spin mb-8"></div>
      <h1 className="text-5xl font-black tracking-tighter">VAYMN</h1>
      <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 mt-4">Initializing Streams</p>
    </div>
  );

  return (
    <div className="min-h-screen">
       <div className="fixed top-6 right-6 z-[300] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className="glass px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in-up">
             <i className={`fas ${t.type === 'success' ? 'fa-check-circle text-green-500' : 'fa-info-circle text-blue-500'}`}></i>
             <span className="font-bold text-sm text-[#1F2A44]">{t.message}</span>
          </div>
        ))}
      </div>

      {view === 'HOME' && (
        <div className="min-h-screen data-stream-bg flex flex-col items-center justify-center px-4 relative">
          <div className="grid-overlay"></div>
          <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-4 glass px-8 py-3 rounded-full shadow-2xl animate-fade-in-up">
              <div className={`w-3 h-3 rounded-full ${aiOnline ? 'bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] font-['JetBrains_Mono']">
                AI CORE {aiOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
          </div>

          <div className="text-center mb-24 relative z-10 animate-fade-in-up">
            <h1 className="text-9xl md:text-[14rem] font-black text-white tracking-tighter leading-none mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">VAYMN</h1>
            <p className="text-[#5DA9E9] font-black text-xs md:text-sm tracking-[0.8em] uppercase opacity-90">
              Stream Smarter. Library Reimagined.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-6xl relative z-10">
            <button 
              onClick={() => { setTargetRole('USER'); setView('USER_LOGIN'); }}
              className="glass p-14 rounded-[64px] text-left hover:bg-white/10 hover:scale-[1.03] transition-all group flex flex-col gap-10 shadow-2xl animate-fade-in-up"
            >
              <div className="w-24 h-24 bg-gradient-to-tr from-[#5DA9E9] to-blue-600 rounded-[32px] flex items-center justify-center text-white text-4xl shadow-2xl group-hover:rotate-12 transition-transform duration-500">
                <i className="fas fa-play"></i>
              </div>
              <div>
                <h3 className="text-4xl font-black text-white mb-3">Student Portal</h3>
                <p className="text-slate-400 font-medium text-lg">Browse your knowledge streams.</p>
              </div>
            </button>

            <button 
              onClick={() => { setTargetRole('ADMIN'); setView('ADMIN_LOGIN'); }}
              className="glass p-14 rounded-[64px] text-left hover:bg-white/10 hover:scale-[1.03] transition-all group flex flex-col gap-10 shadow-2xl animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center text-[#1F2A44] text-4xl shadow-2xl group-hover:-rotate-12 transition-transform duration-500">
                <i className="fas fa-microchip"></i>
              </div>
              <div>
                <h3 className="text-4xl font-black text-white mb-3">Admin Core</h3>
                <p className="text-slate-400 font-medium text-lg">Manage assets and users.</p>
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
          <nav className="bg-white/90 backdrop-blur-xl px-12 py-8 border-b border-slate-100 flex justify-between items-center sticky top-0 z-[200]">
            <div className="flex items-center gap-12">
              <span className="text-4xl font-black tracking-tighter cursor-pointer hover:text-[#5DA9E9] transition-colors" onClick={() => setView('HOME')}>VAYMN</span>
              <div className="hidden lg:flex items-center gap-5 bg-[#0B0F1A] px-6 py-3 rounded-full shadow-2xl border border-white/5">
                 <div className={`w-2.5 h-2.5 rounded-full ${aiOnline ? 'bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse' : 'bg-red-500'}`}></div>
                 <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] font-['JetBrains_Mono']">
                    AI CORE ONLINE
                 </span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-base font-black text-[#1F2A44]">{currentUser.name}</p>
                <p className="text-[10px] font-black uppercase text-[#5DA9E9] tracking-widest">{currentUser.role === 'ADMIN' ? 'Command Level' : `Level ${Math.floor((currentUser.xp || 0) / 100) + 1}`}</p>
              </div>
              <button onClick={() => setIsConfirmingLogout(true)} className="w-14 h-14 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><i className="fas fa-power-off text-xl"></i></button>
            </div>
          </nav>
          
          <main className="max-w-[1700px] mx-auto p-12">
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
        <ConfirmationModal title="Terminate Session" message="Confirm system logout? Your current stream state will be saved." onConfirm={() => { db.saveSession(null); setCurrentUser(null); setView('HOME'); setIsConfirmingLogout(false); }} onCancel={() => setIsConfirmingLogout(false)} />
      )}
    </div>
  );
};

export default App;
