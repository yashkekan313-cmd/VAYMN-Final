import React, { useState } from 'react';
import { User, Book } from '../types';
import { getBookDetails } from '../geminiService';
import { db } from '../services/databaseService';

interface AdminDashboardProps {
  admin: User; 
  books: Book[]; 
  users: User[]; 
  admins: User[];
  setBooks: (books: Book[]) => void;
  setUsers: (users: User[]) => void;
  setAdmins: (admins: User[]) => void;
  onDeleteBook: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onDeleteAdmin: (id: string) => void;
  onUpdateUser: (user: User) => void;
  onUpdateAdmin: (admin: User) => void;
  onAddUser: (user: User) => void;
  onAddAdmin: (admin: User) => void;
  onReturnBook: (id: string) => void;
  onPenalty: (libraryId: string) => void;
  onGoHome: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  admin, books = [], users = [], admins = [], onDeleteBook, onReturnBook, onPenalty, setBooks, setUsers, setAdmins, onDeleteUser, onDeleteAdmin, onUpdateUser, onUpdateAdmin, onAddUser, onAddAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INVENTORY' | 'USERS' | 'LOANS'>('OVERVIEW');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userTab, setUserTab] = useState<'STUDENTS' | 'STAFF'>('STUDENTS');
  const [bookForm, setBookForm] = useState<Partial<Book>>({ language: 'English' });
  const [userForm, setUserForm] = useState<Partial<User>>({ role: 'USER', xp: 0, badges: [] });
  const [isAiLoading, setIsAiLoading] = useState(false);

  const safeBooks = Array.isArray(books) ? books : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeAdmins = Array.isArray(admins) ? admins : [];

  const stats = [
    { label: 'Total Inventory', val: safeBooks.length, icon: 'fa-book', color: 'bg-[#1F2A44]' },
    { label: 'Registered Members', val: safeUsers.length + safeAdmins.length, icon: 'fa-users', color: 'bg-[#5DA9E9]' },
    { label: 'Active Loans', val: safeBooks.filter(b => !b.isAvailable).length, icon: 'fa-exchange-alt', color: 'bg-orange-500' }
  ];

  const handleMagicFill = async () => {
    if (!bookForm.title) return;
    setIsAiLoading(true);
    const details = await getBookDetails(bookForm.title);
    if (details) setBookForm(prev => ({ ...prev, ...details }));
    setIsAiLoading(false);
  };

  const saveBook = async () => {
    const bookData: Book = { 
      id: bookForm.id || Math.random().toString(36).substr(2, 9),
      title: bookForm.title || 'Untitled',
      author: bookForm.author || 'Unknown',
      genre: bookForm.genre || 'Uncategorized',
      language: bookForm.language || 'English',
      coverImage: bookForm.coverImage || 'https://via.placeholder.com/300x450?text=No+Cover',
      standNumber: bookForm.standNumber || 'N/A',
      description: bookForm.description || '',
      isAvailable: bookForm.isAvailable ?? true,
      waitlist: bookForm.waitlist || []
    };
    await db.updateBook(bookData);
    setBooks(await db.getBooks());
    setIsBookModalOpen(false);
  };

  const saveUser = async () => {
    const userData: User = {
      id: userForm.id || Math.random().toString(36).substr(2, 9),
      name: userForm.name || 'Anonymous',
      email: userForm.email || '',
      libraryId: userForm.libraryId || '',
      password: userForm.password || 'password123',
      role: userForm.role || 'USER',
      xp: userForm.xp ?? 0,
      badges: userForm.badges || []
    };
    if (userData.role === 'ADMIN') {
      await db.updateAdmin(userData);
      setAdmins(await db.getAdmins());
    } else {
      await db.updateUser(userData);
      setUsers(await db.getUsers());
    }
    setIsUserModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-16">
      {/* Admin Nav */}
      <aside className="lg:w-80 space-y-8">
        <div className="p-8 glass-panel rounded-[40px] flex flex-col gap-3">
          {(['OVERVIEW', 'INVENTORY', 'USERS', 'LOANS'] as const).map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`w-full text-left px-8 py-5 rounded-2xl font-bold text-sm transition-all duration-300 ${activeTab === tab ? 'bg-[#1F2A44] text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-[#1F2A44] hover:bg-slate-50'}`}
            >
              <i className={`fas ${tab === 'OVERVIEW' ? 'fa-grid-2' : tab === 'INVENTORY' ? 'fa-book-open' : tab === 'USERS' ? 'fa-user-cog' : 'fa-clipboard-list'} mr-4 opacity-50`}></i>
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </aside>

      {/* Admin Body */}
      <main className="flex-1">
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
             {stats.map((stat, i) => (
               <div key={stat.label} className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-sm stagger-item" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center text-white text-xl mb-12 shadow-xl`}>
                    <i className={`fas ${stat.icon}`}></i>
                  </div>
                  <h4 className="text-7xl font-bold text-[#1F2A44] mb-3 tracking-tighter heading-serif">{stat.val}</h4>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.3em]">{stat.label}</p>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'USERS' && (
          <div className="space-y-10">
             <div className="flex justify-between items-center glass-panel p-10 rounded-[48px]">
                <div className="flex gap-4">
                   <button onClick={() => setUserTab('STUDENTS')} className={`px-10 py-4 rounded-2xl font-bold text-sm transition-all ${userTab === 'STUDENTS' ? 'bg-[#1F2A44] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>Students</button>
                   <button onClick={() => setUserTab('STAFF')} className={`px-10 py-4 rounded-2xl font-bold text-sm transition-all ${userTab === 'STAFF' ? 'bg-[#1F2A44] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>Staff Members</button>
                </div>
                <button onClick={() => { setUserForm({ role: userTab === 'STAFF' ? 'ADMIN' : 'USER', xp: 0, badges: [] }); setIsUserModalOpen(true); }} className="px-10 py-5 bg-[#5DA9E9] text-white rounded-2xl font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all">Add New User</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {(userTab === 'STUDENTS' ? safeUsers : safeAdmins).map((u, i) => (
                  <div key={u.id} className="bg-white p-10 rounded-[48px] border border-slate-50 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all stagger-item" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="mb-10">
                      <div className="w-14 h-14 bg-slate-50 text-[#1F2A44] rounded-2xl flex items-center justify-center mb-6"><i className="fas fa-id-badge text-2xl"></i></div>
                      <h4 className="font-bold text-[#1F2A44] text-xl mb-1 heading-serif">{u.name}</h4>
                      <p className="text-xs font-bold text-[#5DA9E9] tracking-widest">{u.libraryId}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setUserForm(u); setIsUserModalOpen(true); }} className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-400 hover:text-[#1F2A44] transition-all font-bold text-xs uppercase tracking-widest">Edit</button>
                      <button onClick={() => u.role === 'ADMIN' ? onDeleteAdmin(u.id) : onDeleteUser(u.id)} className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt"></i></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'INVENTORY' && (
          <div className="space-y-10">
             <div className="flex justify-between items-center glass-panel p-10 rounded-[48px]">
                <h2 className="text-3xl font-bold text-[#1F2A44] heading-serif">Digital Collection</h2>
                <button onClick={() => { setBookForm({ language: 'English' }); setIsBookModalOpen(true); }} className="px-10 py-5 bg-[#1F2A44] text-white rounded-2xl font-bold text-sm shadow-xl hover:scale-105 transition-all">Add New Title</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-10">
                {safeBooks.map((b, i) => (
                  <div key={b.id} className="bg-white p-8 rounded-[48px] border border-slate-50 flex gap-8 items-center hover:shadow-2xl transition-all group stagger-item" style={{ animationDelay: `${i * 0.05}s` }}>
                     <img src={b.coverImage} className="w-32 h-44 object-cover rounded-3xl shadow-lg transition-transform duration-500 group-hover:scale-110" alt="" />
                     <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[#1F2A44] text-lg mb-1 truncate heading-serif">{b.title}</h4>
                        <p className="text-[10px] text-[#5DA9E9] font-black uppercase tracking-[0.2em] mb-8">{b.genre}</p>
                        <div className="flex gap-3">
                           <button onClick={() => { setBookForm(b); setIsBookModalOpen(true); }} className="flex-1 py-4 bg-slate-50 text-[#1F2A44] rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100">Details</button>
                           <button onClick={() => onDeleteBook(b.id)} className="w-12 h-12 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt"></i></button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'LOANS' && (
          <div className="space-y-10">
             <h2 className="text-3xl font-bold text-[#1F2A44] heading-serif">Pending Returns</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {safeBooks.filter(b => !b.isAvailable).map((b, i) => (
                  <div key={b.id} className="bg-white p-10 rounded-[56px] border border-slate-100 flex gap-10 items-center shadow-sm stagger-item" style={{ animationDelay: `${i * 0.1}s` }}>
                     <img src={b.coverImage} className="w-28 h-40 object-cover rounded-3xl shadow-xl" alt="" />
                     <div className="flex-1">
                        <h4 className="font-bold text-[#1F2A44] text-2xl mb-1 heading-serif">{b.title}</h4>
                        <p className="text-xs font-bold text-[#5DA9E9] uppercase tracking-widest mb-10">Lent to: {b.issuedTo}</p>
                        <button onClick={() => onReturnBook(b.id)} className="w-full py-5 bg-[#1F2A44] text-white rounded-3xl font-bold text-[10px] uppercase tracking-widest hover:bg-green-600 shadow-xl transition-all">Acknowledge Return</button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {/* Forms remain consistent but with updated styling */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[60px] w-full max-w-2xl p-16 space-y-12 shadow-2xl animate-spring">
              <div className="flex justify-between items-center">
                 <h3 className="text-4xl font-bold text-[#1F2A44] heading-serif">Modify Record</h3>
                 <button onClick={() => setIsBookModalOpen(false)} className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-300 hover:text-red-500 transition-all"><i className="fas fa-times text-xl"></i></button>
              </div>
              <div className="space-y-8">
                 <div className="relative">
                    <input value={bookForm.title || ''} onChange={e => setBookForm({...bookForm, title: e.target.value})} className="w-full p-8 bg-slate-50 rounded-3xl outline-none font-bold text-xl heading-serif focus:bg-white border-2 border-transparent focus:border-blue-100 transition-all" placeholder="Enter Book Title" />
                    <button onClick={handleMagicFill} disabled={isAiLoading} className="absolute right-4 top-4 bottom-4 px-8 bg-[#5DA9E9] text-white rounded-2xl font-bold text-xs shadow-lg uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                       {isAiLoading ? <i className="fas fa-spinner fa-spin"></i> : 'AI Auto-Fill'}
                    </button>
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <input value={bookForm.author || ''} onChange={e => setBookForm({...bookForm, author: e.target.value})} className="w-full p-6 bg-slate-50 rounded-2xl font-bold text-sm focus:bg-white outline-none border-2 border-transparent focus:border-blue-100 transition-all" placeholder="Author" />
                    <input value={bookForm.genre || ''} onChange={e => setBookForm({...bookForm, genre: e.target.value})} className="w-full p-6 bg-slate-50 rounded-2xl font-bold text-sm focus:bg-white outline-none border-2 border-transparent focus:border-blue-100 transition-all" placeholder="Category" />
                 </div>
                 <textarea value={bookForm.description || ''} onChange={e => setBookForm({...bookForm, description: e.target.value})} className="w-full p-8 bg-slate-50 rounded-3xl font-medium min-h-[160px] outline-none border-2 border-transparent focus:border-blue-100 transition-all text-slate-500" placeholder="Book Synopsis..."></textarea>
                 <input value={bookForm.coverImage || ''} onChange={e => setBookForm({...bookForm, coverImage: e.target.value})} className="w-full p-6 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-100 transition-all" placeholder="Cover Image URL" />
              </div>
              <button onClick={saveBook} className="w-full py-8 bg-[#1F2A44] text-white rounded-[40px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-800 transition-all active:scale-95">Commit to Archive</button>
           </div>
        </div>
      )}

      {/* User Form Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[60px] w-full max-w-xl p-16 space-y-12 shadow-2xl animate-spring">
              <div className="flex justify-between items-center">
                 <h3 className="text-4xl font-bold text-[#1F2A44] heading-serif">User Profile</h3>
                 <button onClick={() => setIsUserModalOpen(false)} className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-300 hover:text-red-500 transition-all"><i className="fas fa-times text-xl"></i></button>
              </div>
              <div className="space-y-6">
                 <input value={userForm.name || ''} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-6 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-100 transition-all" placeholder="Legal Full Name" />
                 <input value={userForm.libraryId || ''} onChange={e => setUserForm({...userForm, libraryId: e.target.value})} className="w-full p-6 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-100 transition-all" placeholder="Assigned Library ID" />
                 <input value={userForm.email || ''} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full p-6 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-100 transition-all" placeholder="Contact Email" />
                 <input value={userForm.password || ''} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-6 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-100 transition-all" placeholder="Authentication Key" />
                 <div className="flex gap-4 p-2 bg-slate-50 rounded-[32px]">
                    <button onClick={() => setUserForm({...userForm, role: 'USER'})} className={`flex-1 py-5 rounded-[24px] font-bold transition-all ${userForm.role === 'USER' ? 'bg-[#5DA9E9] text-white shadow-lg' : 'text-slate-400'}`}>Student</button>
                    <button onClick={() => setUserForm({...userForm, role: 'ADMIN'})} className={`flex-1 py-5 rounded-[24px] font-bold transition-all ${userForm.role === 'ADMIN' ? 'bg-[#5DA9E9] text-white shadow-lg' : 'text-slate-400'}`}>Staff</button>
                 </div>
              </div>
              <button onClick={saveUser} className="w-full py-8 bg-[#1F2A44] text-white rounded-[40px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-800 transition-all active:scale-95">Update Identity</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
