
import React, { useState, useRef } from 'react';
import { User, Book, UserRole } from '../types';
import { getBookDetails, generateBookCover } from '../geminiService';
import { db } from '../services/databaseService';
import ConfirmationModal from './ConfirmationModal';

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
  onGoHome: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  admin, books, users, admins, setBooks, setUsers, setAdmins,
  onDeleteBook, onDeleteUser, onUpdateUser, onReturnBook, onAddUser, onAddAdmin, onDeleteAdmin, onUpdateAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INVENTORY' | 'DIRECTORY' | 'LOANS'>('OVERVIEW');
  const [isSeeding, setIsSeeding] = useState(false);
  
  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [bookForm, setBookForm] = useState<Partial<Book>>({ title: '', author: '', genre: '', description: '', standNumber: '', coverImage: '' });
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', libraryId: '', email: '', password: '', role: 'USER' });

  const [imageSource, setImageSource] = useState<'AI' | 'URL' | 'FILE'>('AI');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Delete State
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<{id: string, role: UserRole} | null>(null);

  const handleManualSeed = async () => {
    setIsSeeding(true);
    try {
      const data = await db.forceSeed();
      setBooks(data.books);
      setUsers(data.users);
      setAdmins(data.admins);
      alert("System restored with sample data.");
    } finally {
      setIsSeeding(false);
    }
  };

  // --- BOOK LOGIC ---
  const openAddBook = () => {
    setBookForm({ title: '', author: '', genre: '', description: '', standNumber: '', coverImage: '', isAvailable: true });
    setIsEditingBook(false);
    setIsBookModalOpen(true);
  };

  const openEditBook = (book: Book) => {
    setBookForm({ ...book });
    setIsEditingBook(true);
    setIsBookModalOpen(true);
  };

  const saveBook = async () => {
    if (!bookForm.title || !bookForm.author) return alert("Title and Author are required.");
    const bookData = {
      ...bookForm,
      id: isEditingBook ? bookForm.id : Math.random().toString(36).substr(2, 9),
      isAvailable: bookForm.isAvailable ?? true
    } as Book;

    if (isEditingBook) {
      setBooks(books.map(b => b.id === bookData.id ? bookData : b));
    } else {
      setBooks([...books, bookData]);
    }
    await db.updateBook(bookData);
    setIsBookModalOpen(false);
  };

  const handleAiMagic = async () => {
    if (!bookForm.title) return alert("Enter a title first!");
    setIsAiLoading(true);
    try {
      const meta = await getBookDetails(bookForm.title);
      if (meta) {
        setBookForm(prev => ({ ...prev, author: meta.author, genre: meta.genre, description: meta.description }));
        if (imageSource === 'AI') {
          const cover = await generateBookCover(bookForm.title, meta.description);
          if (cover) setBookForm(prev => ({ ...prev, coverImage: cover }));
        }
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- USER LOGIC ---
  const openAddUser = (role: UserRole) => {
    setUserForm({ name: '', libraryId: '', email: '', password: '', role });
    setIsEditingUser(false);
    setIsUserModalOpen(true);
  };

  const openEditUser = (user: User) => {
    setUserForm({ ...user });
    setIsEditingUser(true);
    setIsUserModalOpen(true);
  };

  const saveUser = () => {
    if (!userForm.name || !userForm.libraryId) return alert("Name and ID are required.");
    if (isEditingUser) {
      if (userForm.role === 'ADMIN') onUpdateAdmin(userForm as User);
      else onUpdateUser(userForm as User);
    } else {
      const newUser = { ...userForm, id: Math.random().toString(36).substr(2, 9) } as User;
      if (userForm.role === 'ADMIN') onAddAdmin(newUser);
      else onAddUser(newUser);
    }
    setIsUserModalOpen(false);
  };

  const activeLoans = books.filter(b => !b.isAvailable);

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      {/* Navigation Sidebar */}
      <aside className="w-full lg:w-80 space-y-4">
        {[
          { id: 'OVERVIEW', icon: 'fa-chart-pie', label: 'Management Home' },
          { id: 'INVENTORY', icon: 'fa-boxes-stacked', label: 'Asset Inventory' },
          { id: 'DIRECTORY', icon: 'fa-users-gear', label: 'Staff & Students' },
          { id: 'LOANS', icon: 'fa-hand-holding-heart', label: 'Active Loans' },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`w-full text-left px-8 py-5 rounded-[28px] font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center gap-5 ${
              activeTab === tab.id ? 'bg-[#1F2A44] text-white shadow-2xl scale-105' : 'bg-white text-slate-400 border border-[#E5EAF0] hover:border-[#5DA9E9]'
            }`}
          >
            <i className={`fas ${tab.icon} w-6`}></i>
            {tab.label}
          </button>
        ))}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-12 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{books.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5DA9E9] mt-2">Total Assets</p>
                </div>
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{activeLoans.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 mt-2">Out on Loan</p>
                </div>
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{users.length + admins.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 mt-2">Accounts</p>
                </div>
             </div>

             <div className="bg-[#1F2A44] rounded-[52px] p-12 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="relative z-10">
                   <h2 className="text-3xl font-black mb-4">Maintenance Center</h2>
                   <p className="text-white/60 text-lg leading-relaxed font-medium">Reset registry if you encounter data inconsistencies.</p>
                </div>
                <button 
                  onClick={handleManualSeed}
                  disabled={isSeeding}
                  className="relative z-10 px-10 py-6 bg-[#5DA9E9] text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all"
                >
                  {isSeeding ? 'Processing...' : 'Seed Sample Data'}
                </button>
             </div>
          </div>
        )}

        {activeTab === 'INVENTORY' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Asset Registry</h2>
                <button onClick={openAddBook} className="px-8 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-xl hover:-translate-y-1 transition-all">
                  <i className="fas fa-plus mr-2"></i> Register New Asset
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {books.map(b => (
                  <div key={b.id} className="bg-white p-6 rounded-[40px] border border-[#E5EAF0] flex gap-6 group hover:shadow-2xl transition-all relative">
                     {/* OVERLAY ON HOVER FOR EDITING */}
                     <div 
                       onClick={() => openEditBook(b)}
                       className="absolute inset-0 z-10 bg-[#1F2A44]/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-[40px] cursor-pointer text-white"
                     >
                        <i className="fas fa-pencil-alt text-3xl mb-3"></i>
                        <span className="font-black uppercase tracking-widest text-xs">Edit Asset</span>
                     </div>

                     <img src={b.coverImage} className="w-24 h-32 object-cover rounded-[20px] shadow-lg flex-shrink-0" alt="" />
                     <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-black text-[#1F2A44] truncate mb-1">{b.title}</h4>
                        <p className="text-[10px] text-[#5DA9E9] font-black uppercase tracking-widest truncate">{b.author}</p>
                        
                        <div className="mt-5 flex items-center gap-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); openEditBook(b); }} 
                             className="px-5 py-2.5 bg-[#1F2A44] text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-colors"
                           >
                             <i className="fas fa-edit mr-2"></i> Edit
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); setDeletingBookId(b.id); }} 
                             className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                           >
                             <i className="fas fa-trash-alt"></i>
                           </button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'DIRECTORY' && (
          <div className="space-y-12 animate-fade-in">
             {/* Admin / Staff Section */}
             <section className="space-y-6">
                <div className="flex justify-between items-center px-4">
                   <h3 className="text-xl font-black text-[#1F2A44] uppercase tracking-widest">Administrative Staff</h3>
                   <button onClick={() => openAddUser('ADMIN')} className="px-6 py-3 bg-[#5DA9E9] text-white rounded-2xl font-black text-[9px] tracking-widest uppercase shadow-lg">
                      <i className="fas fa-user-shield mr-2"></i> Add Staff
                   </button>
                </div>
                <div className="bg-white rounded-[44px] border border-[#E5EAF0] overflow-hidden shadow-sm">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-[#E5EAF0]">
                         <tr>
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Name</th>
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Admin ID</th>
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody>
                         {admins.map(u => (
                           <tr key={u.id} className="border-b border-[#E5EAF0] hover:bg-slate-50">
                              <td className="px-10 py-5 font-bold text-[#1F2A44]">{u.name}</td>
                              <td className="px-10 py-5"><span className="px-3 py-1 bg-[#1F2A44] text-white text-[9px] font-black rounded-lg">{u.libraryId}</span></td>
                              <td className="px-10 py-5 text-right space-x-3">
                                 <button onClick={() => openEditUser(u)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest">Edit Staff</button>
                                 {admin.id !== u.id && (
                                   <button onClick={() => setDeletingUserId({id: u.id, role: 'ADMIN'})} className="text-red-400 hover:text-red-600"><i className="fas fa-trash-alt"></i></button>
                                 )}
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </section>

             {/* Student Section */}
             <section className="space-y-6">
                <div className="flex justify-between items-center px-4">
                   <h3 className="text-xl font-black text-[#1F2A44] uppercase tracking-widest">Student Body</h3>
                   <button onClick={() => openAddUser('USER')} className="px-6 py-3 bg-[#1F2A44] text-white rounded-2xl font-black text-[9px] tracking-widest uppercase shadow-lg">
                      <i className="fas fa-user-plus mr-2"></i> Add Student
                   </button>
                </div>
                <div className="bg-white rounded-[44px] border border-[#E5EAF0] overflow-hidden shadow-sm">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-[#E5EAF0]">
                         <tr>
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Name</th>
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Library ID</th>
                            <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                         </tr>
                      </thead>
                      <tbody>
                         {users.map(u => (
                           <tr key={u.id} className="border-b border-[#E5EAF0] hover:bg-slate-50">
                              <td className="px-10 py-5 font-bold text-[#1F2A44]">{u.name}</td>
                              <td className="px-10 py-5"><span className="px-3 py-1 bg-slate-100 text-[#1F2A44] text-[9px] font-black rounded-lg">{u.libraryId}</span></td>
                              <td className="px-10 py-5 text-right space-x-3">
                                 <button onClick={() => openEditUser(u)} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest shadow-md">Edit Info</button>
                                 <button onClick={() => setDeletingUserId({id: u.id, role: 'USER'})} className="text-red-400 hover:text-red-600 p-2"><i className="fas fa-trash-alt"></i></button>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </section>
          </div>
        )}

        {activeTab === 'LOANS' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Active Loans</h2>
             </div>
             {activeLoans.length === 0 ? (
               <div className="bg-white p-24 rounded-[44px] border border-[#E5EAF0] text-center">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Zero active loans recorded.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {activeLoans.map(b => (
                    <div key={b.id} className="bg-white p-8 rounded-[40px] border border-[#E5EAF0] flex gap-8 items-center shadow-sm">
                       <img src={b.coverImage} className="w-20 h-28 object-cover rounded-2xl shadow-lg" alt="" />
                       <div className="flex-1 min-w-0">
                          <h4 className="font-black text-[#1F2A44] truncate">{b.title}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mt-2">Issued to: {b.issuedTo}</p>
                       </div>
                       <button onClick={() => onReturnBook(b.id)} className="px-6 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[9px] tracking-widest uppercase shadow-xl hover:bg-green-600 transition-colors">Return</button>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </main>

      {/* ASSET MODAL (HIGH VISIBILITY) */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/95 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
           <div className="bg-white rounded-[56px] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-fade-in">
              <div className="md:w-[350px] bg-[#F7F9FC] p-10 flex flex-col">
                 <div className="w-full aspect-[3/4.2] bg-white rounded-[40px] overflow-hidden shadow-2xl border-2 border-slate-200 flex items-center justify-center relative mb-8">
                    {bookForm.coverImage ? <img src={bookForm.coverImage} className="w-full h-full object-cover" alt="" /> : <i className="fas fa-image text-4xl text-slate-200"></i>}
                    {isAiLoading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><i className="fas fa-spinner fa-spin text-2xl text-[#5DA9E9]"></i></div>}
                 </div>
                 <div className="space-y-4">
                    <div className="flex bg-white p-1 rounded-2xl border">
                      {['AI', 'FILE', 'URL'].map(s => (
                        <button key={s} onClick={() => setImageSource(s as any)} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl ${imageSource === s ? 'bg-[#1F2A44] text-white' : 'text-slate-400'}`}>{s}</button>
                      ))}
                    </div>
                    {imageSource === 'FILE' && (
                       <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-white border border-[#E5EAF0] text-[#1F2A44] rounded-2xl font-black uppercase text-[10px]">Select Image</button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" onChange={e => {
                       const file = e.target.files?.[0];
                       if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setBookForm({...bookForm, coverImage: reader.result as string});
                          reader.readAsDataURL(file);
                       }
                    }} />
                 </div>
              </div>
              <div className="flex-1 p-16 space-y-8">
                 <div className="flex justify-between items-center">
                    <h3 className="text-3xl font-black text-[#1F2A44]">{isEditingBook ? 'Update Asset' : 'New Registry'}</h3>
                    <button onClick={handleAiMagic} disabled={isAiLoading || !bookForm.title} className="px-6 py-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2">
                       <i className="fas fa-wand-magic-sparkles"></i> AI Auto-Fill
                    </button>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-slate-400 ml-3">Book Title</label>
                       <input value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl outline-none font-bold border border-transparent focus:border-blue-500" placeholder="Title" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-slate-400 ml-3">Author</label>
                       <input value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl outline-none font-bold border border-transparent focus:border-blue-500" placeholder="Author" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-slate-400 ml-3">Genre</label>
                       <input value={bookForm.genre} onChange={e => setBookForm({...bookForm, genre: e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl outline-none font-bold border border-transparent focus:border-blue-500" placeholder="Genre" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-slate-400 ml-3">Stand ID</label>
                       <input value={bookForm.standNumber} onChange={e => setBookForm({...bookForm, standNumber: e.target.value})} className="w-full p-5 bg-slate-50 rounded-3xl outline-none font-bold border border-transparent focus:border-blue-500" placeholder="Shelf Location" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-3">Official Synopsis</label>
                    <textarea value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})} rows={3} className="w-full p-6 bg-slate-50 rounded-[32px] outline-none font-bold border border-transparent focus:border-blue-500 resize-none" placeholder="Asset description..." />
                 </div>
                 <div className="flex gap-4 pt-10">
                    <button onClick={() => setIsBookModalOpen(false)} className="flex-1 py-6 bg-slate-100 text-slate-400 font-black uppercase text-xs rounded-3xl">Dismiss</button>
                    <button onClick={saveBook} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-xs rounded-3xl shadow-2xl">Confirm Save</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* USER MODAL (HIGH VISIBILITY) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[56px] w-full max-w-xl p-16 space-y-8 shadow-2xl">
              <h3 className="text-3xl font-black text-[#1F2A44] text-center">{isEditingUser ? 'Update Record' : `New ${userForm.role}`}</h3>
              <div className="space-y-5">
                 <input value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Full Name" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" />
                 <input value={userForm.libraryId} onChange={e => setUserForm({...userForm, libraryId: e.target.value})} placeholder="ID Number" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" />
                 <input value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="Email Address" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" />
                 <input value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} type="password" placeholder="System Password" className="w-full p-5 bg-slate-50 rounded-2xl outline-none font-bold" />
              </div>
              <div className="flex gap-4 pt-6">
                 <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase text-xs rounded-3xl">Cancel</button>
                 <button onClick={saveUser} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-xs rounded-3xl shadow-xl">Apply Changes</button>
              </div>
           </div>
        </div>
      )}

      {deletingBookId && (
        <ConfirmationModal title="Delete Asset?" message="Remove this item permanently from the inventory?" onConfirm={() => { onDeleteBook(deletingBookId); setDeletingBookId(null); }} onCancel={() => setDeletingBookId(null)} />
      )}

      {deletingUserId && (
        <ConfirmationModal title="Delete Account?" message={`Are you sure you want to remove this ${deletingUserId.role}?`} onConfirm={() => { 
          if (deletingUserId.role === 'ADMIN') onDeleteAdmin(deletingUserId.id);
          else onDeleteUser(deletingUserId.id);
          setDeletingUserId(null); 
        }} onCancel={() => setDeletingUserId(null)} />
      )}
    </div>
  );
};

export default AdminDashboard;
