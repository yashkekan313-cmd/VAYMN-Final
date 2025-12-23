
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);

  const [view, setView] = useState<ViewState>('HOME');
  const [targetRole, setTargetRole] = useState<UserRole>('USER');
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);

  const hasApiKey = (() => {
    const key = process.env.API_KEY;
    return typeof key === 'string' && key.length > 5 && key !== 'undefined';
  })();

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

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
        if (savedUser) setView('DASHBOARD');
      } catch (err) {
        addToast("Local mode active.", "info");
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, [addToast]);

  const sync = async (action: () => Promise<void>, successMsg?: string) => {
    setIsSyncing(true);
    try {
      await action();
      if (successMsg) addToast(successMsg, 'success');
    } catch (e) {
      addToast("Local update complete.", 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (libraryId: string, password: string, role: UserRole) => {
    const source = role === 'ADMIN' ? admins : users;
    const foundUser = source.find(u => u.libraryId === libraryId && u.password === password);
    if (foundUser) {
      sync(async () => {
        await db.saveSession(foundUser);
        setCurrentUser(foundUser);
        setView('DASHBOARD');
      }, `Welcome, ${foundUser.name}!`);
    } else {
      addToast("Invalid credentials.", "error");
    }
  };

  const handleSignup = (newUser: User) => {
    sync(async () => {
      if (newUser.role === 'ADMIN') {
        setAdmins(prev => [...prev, newUser]);
        await db.updateAdmin(newUser);
      } else {
        setUsers(prev => [...prev, newUser]);
        await db.updateUser(newUser);
      }
      await db.saveSession(newUser);
      setCurrentUser(newUser);
      setView('DASHBOARD');
    }, "Welcome to VAYMN!");
  };

  const handleLogout = useCallback(() => {
    sync(async () => {
      await db.saveSession(null);
      setCurrentUser(null);
      setView('HOME');
      setIsConfirmingLogout(false);
    }, "Signed out.");
  }, []);

  const handleIssueBook = (bookId: string) => {
    if (!currentUser) return;
    const bookToUpdate = books.find(b => b.id === bookId);
    if (!bookToUpdate) return;
    const updatedBook = { ...bookToUpdate, isAvailable: false, issuedTo: currentUser.libraryId };
    sync(async () => {
      setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      await db.updateBook(updatedBook);
    }, `Checked out: ${updatedBook.title}`);
  };

  const handleReturnBook = (bookId: string) => {
    const bookToUpdate = books.find(b => b.id === bookId);
    if (!bookToUpdate) return;
    const updatedBook = { ...bookToUpdate, isAvailable: true, issuedTo: undefined };
    sync(async () => {
      setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      await db.updateBook(updatedBook);
    }, "Asset returned.");
  };

  const handleDeleteBook = (bookId: string) => {
    sync(async () => {
      setBooks(prev => prev.filter(b => b.id !== bookId));
      await db.deleteBook(bookId);
    }, "Asset permanently removed.");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#1F2A44] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-[#5DA9E9] border-t-transparent rounded-full animate-spin mb-6"></div>
        <h1 className="text-4xl font-black tracking-tighter mb-2">VAYMN</h1>
        <p className="text-[#5DA9E9] text-[10px] uppercase tracking-[0.4em] font-bold animate-pulse">Initializing Streams...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] font-sans text-[#1F2A44]">
      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-fade-in ${
            toast.type === 'success' ? 'bg-white border-green-500 text-green-700' : 
            toast.type === 'error' ? 'bg-red-50 border-red-500 text-red-600' : 
            'bg-white border-[#5DA9E9] text-[#1F2A44]'
          }`}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle text-green-500' : toast.type === 'error' ? 'fa-exclamation-circle text-red-500' : 'fa-info-circle text-[#5DA9E9]'}`}></i>
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        ))}
      </div>

      {!hasApiKey && (
        <div className="fixed bottom-6 left-6 z-[300] bg-orange-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in max-w-sm">
          <i className="fas fa-key text-xl"></i>
          <div>
            <p className="font-bold text-sm">AI Configuration Missing</p>
            <p className="text-[10px] opacity-80">Add API_KEY to Vercel & click Redeploy.</p>
          </div>
        </div>
      )}

      {view === 'HOME' && (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#1F2A44]">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#5DA9E9]/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px] animate-pulse"></div>
          </div>
          <div className="relative z-10 w-full max-w-6xl px-6 py-12 flex flex-col items-center">
            <div className="text-center mb-24 animate-fade-in">
              <h1 className="text-8xl md:text-9xl font-black text-white mb-4 tracking-tighter">VAYMN</h1>
              <p className="text-[#5DA9E9] tracking-[0.6em] uppercase text-xs font-black">Stream Smarter. Library Reimagined.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-4xl">
              <button 
                onClick={() => { setTargetRole('USER'); setView('USER_LOGIN'); }} 
                className="group relative bg-white/5 border border-white/10 p-12 rounded-[40px] text-left transition-all hover:bg-white/10 hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-[#5DA9E9] rounded-2xl flex items-center justify-center text-white mb-8 shadow-xl">
                  <i className="fas fa-user text-2xl"></i>
                </div>
                <h3 className="text-3xl font-black text-white mb-2">Student Portal</h3>
                <p className="text-white/40 text-sm font-medium">Browse, discover, and issue assets.</p>
              </button>
              <button 
                onClick={() => { setTargetRole('ADMIN'); setView('ADMIN_LOGIN'); }} 
                className="group relative bg-white/5 border border-white/10 p-12 rounded-[40px] text-left transition-all hover:bg-white/10 hover:-translate-y-2"
              >
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#1F2A44] mb-8 shadow-xl">
                  <i className="fas fa-user-shield text-2xl"></i>
                </div>
                <h3 className="text-3xl font-black text-white mb-2">Admin Control</h3>
                <p className="text-white/40 text-sm font-medium">Manage inventory and students.</p>
              </button>
            </div>
            <div className="mt-20 text-white/20 text-[10px] font-black uppercase tracking-[0.5em]">VAYMN Core 2.0 • AI-Enabled Management</div>
          </div>
        </div>
      )}

      {(view === 'USER_LOGIN' || view === 'ADMIN_LOGIN' || view === 'SIGNUP') && (
        <AuthScreen 
          mode={view === 'SIGNUP' ? 'SIGNUP' : 'LOGIN'} 
          role={targetRole} 
          onLogin={handleLogin} 
          onSignup={handleSignup} 
          onBackToHome={() => setView('HOME')} 
          onToggleSignup={() => setView('SIGNUP')} 
          onBackToLogin={() => setView(targetRole === 'ADMIN' ? 'ADMIN_LOGIN' : 'USER_LOGIN')} 
        />
      )}

      {view === 'DASHBOARD' && currentUser && (
        <>
          <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-2xl border-b border-[#E5EAF0] px-8 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-6">
              <span className="text-2xl font-black text-[#1F2A44] tracking-tighter cursor-pointer hover:opacity-70 transition-opacity" onClick={() => setView('HOME')}>VAYMN</span>
              <div className={`px-4 py-1.5 rounded-full text-[9px] font-black border flex items-center gap-2 transition-all ${
                db.isCloudEnabled() ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${db.isCloudEnabled() ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                {db.isCloudEnabled() ? 'CLOUD' : 'LOCAL'}
              </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] font-black text-[#1F2A44] uppercase tracking-wider leading-none">{currentUser.name}</span>
                  <span className="text-[8px] font-bold text-[#5DA9E9] uppercase tracking-[0.2em]">{currentUser.role}</span>
               </div>
               <button onClick={() => setIsConfirmingLogout(true)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
                 <i className="fas fa-power-off"></i>
               </button>
            </div>
          </nav>
          <main className="p-6 md:p-12 max-w-[1440px] mx-auto animate-fade-in">
            {currentUser.role === 'USER' ? (
              <UserDashboard user={currentUser} books={books} onIssueBook={handleIssueBook} onGoHome={() => setView('HOME')} />
            ) : (
              <AdminDashboard 
                admin={currentUser} books={books} users={users} admins={admins}
                setBooks={(newBooks) => {
                  const updated = typeof newBooks === 'function' ? (newBooks as any)(books) : newBooks;
                  sync(async () => { setBooks(updated); await db.saveAllBooks(updated); }, "Inventory Updated");
                }}
                onDeleteBook={handleDeleteBook}
                onDeleteUser={id => sync(async () => { setUsers(u => u.filter(x => x.id !== id)); await db.deleteUser(id); }, "Removed.")}
                onDeleteAdmin={id => sync(async () => { setAdmins(a => a.filter(x => x.id !== id)); await db.deleteAdmin(id); }, "Removed.")}
                onUpdateUser={u => sync(async () => { setUsers(prev => prev.map(x => x.id === u.id ? u : x)); await db.updateUser(u); }, "Updated.")}
                onUpdateAdmin={a => sync(async () => { setAdmins(prev => prev.map(x => x.id === a.id ? a : x)); await db.updateAdmin(a); }, "Updated.")}
                onAddUser={u => sync(async () => { setUsers(p => [...p, u]); await db.updateUser(u); }, "Registered.")}
                onAddAdmin={a => sync(async () => { setAdmins(p => [...p, a]); await db.updateAdmin(a); }, "Registered.")}
                onReturnBook={handleReturnBook}
                onGoHome={() => setView('HOME')}
              />
            )}
          </main>
        </>
      )}

      {isConfirmingLogout && (
        <ConfirmationModal 
          title="Sign Out" 
          message="End your current session? Local data will persist." 
          onConfirm={handleLogout} 
          onCancel={() => setIsConfirmingLogout(false)} 
        />
      )}
    </div>
  );
};

export default App;
