
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

  // --- BOOK LOGIC ---
  const openAddBook = () => {
    setBookForm({ title: '', author: '', genre: '', description: '', standNumber: '', coverImage: '', isAvailable: true });
    setImageSource('AI');
    setIsEditingBook(false);
    setIsBookModalOpen(true);
  };

  const openEditBook = (book: Book) => {
    setBookForm({ ...book });
    // Determine image source for UX
    if (book.coverImage?.startsWith('data:')) setImageSource('FILE');
    else if (book.coverImage?.startsWith('http')) setImageSource('URL');
    else setImageSource('AI');
    
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
        setBookForm(prev => ({ 
          ...prev, 
          author: meta.author, 
          genre: meta.genre, 
          description: meta.description 
        }));

        if (imageSource === 'AI') {
          const cover = await generateBookCover(bookForm.title, meta.description);
          if (cover) setBookForm(prev => ({ ...prev, coverImage: cover }));
        }
      }
    } catch (err) {
      alert("AI Service is currently busy.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBookForm({...bookForm, coverImage: reader.result as string});
      reader.readAsDataURL(file);
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
      {/* Sidebar Nav */}
      <aside className="w-full lg:w-80 space-y-4">
        {[
          { id: 'OVERVIEW', icon: 'fa-chart-pie', label: 'Dashboard' },
          { id: 'INVENTORY', icon: 'fa-boxes-stacked', label: 'Inventory' },
          { id: 'DIRECTORY', icon: 'fa-users-gear', label: 'Accounts' },
          { id: 'LOANS', icon: 'fa-hand-holding-heart', label: 'Loan Status' },
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

      {/* Content Area */}
      <main className="flex-1 min-w-0">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-12 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{books.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5DA9E9] mt-2">Assets in Stacks</p>
                </div>
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{activeLoans.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400 mt-2">Current Loans</p>
                </div>
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{users.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-500 mt-2">Students</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'INVENTORY' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-3xl font-black text-[#1F2A44] tracking-tight">INVENTORY</h2>
                <button onClick={openAddBook} className="px-8 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[11px] tracking-widest uppercase shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all">
                  <i className="fas fa-plus"></i> NEW ASSET
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {books.map(b => (
                  <div key={b.id} className="bg-white p-6 rounded-[40px] border border-[#E5EAF0] flex gap-6 shadow-sm hover:shadow-xl transition-all relative group">
                     <img src={b.coverImage} className="w-24 h-32 object-cover rounded-[20px] shadow-sm flex-shrink-0" alt="" />
                     <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-black text-[#1F2A44] truncate text-base mb-1 uppercase tracking-tight">{b.title}</h4>
                        <p className="text-[10px] text-[#5DA9E9] font-black uppercase tracking-widest truncate mb-4">{b.author}</p>
                        
                        <div className="flex items-center gap-2">
                           {/* EDIT BOOK BUTTON - HIGH VISIBILITY */}
                           <button 
                             onClick={() => openEditBook(b)} 
                             className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                           >
                             <i className="fas fa-edit"></i> Edit
                           </button>
                           {/* DELETE BOOK BUTTON */}
                           <button 
                             onClick={() => setDeletingBookId(b.id)} 
                             className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                           >
                             <i className="fas fa-trash-alt"></i>
                           </button>
                           <span className={`px-2 py-1 ml-auto text-[8px] font-black uppercase tracking-widest rounded-lg ${b.isAvailable ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                             {b.isAvailable ? 'IN STOCK' : 'LOANED'}
                           </span>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'DIRECTORY' && (
          <div className="space-y-12 animate-fade-in">
             <section className="space-y-6">
                <div className="flex justify-between items-center px-4">
                   <h2 className="text-3xl font-black text-[#1F2A44] tracking-tight">STUDENT DIRECTORY</h2>
                   <button onClick={() => openAddUser('USER')} className="px-8 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[11px] tracking-widest uppercase shadow-xl hover:-translate-y-1 transition-all">
                      <i className="fas fa-user-plus mr-2"></i> NEW STUDENT
                   </button>
                </div>
                <div className="bg-white rounded-[44px] border border-[#E5EAF0] overflow-hidden shadow-sm">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-[#E5EAF0]">
                         <tr>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">NAME</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">ID</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">ACTION</th>
                         </tr>
                      </thead>
                      <tbody>
                         {users.map(u => (
                           <tr key={u.id} className="border-b border-[#E5EAF0] hover:bg-slate-50 group">
                              <td className="px-10 py-6 font-bold text-[#1F2A44] text-sm uppercase">{u.name}</td>
                              <td className="px-10 py-6"><span className="px-3 py-1 bg-slate-100 text-[#1F2A44] text-[10px] font-black rounded-lg">{u.libraryId}</span></td>
                              <td className="px-10 py-6 text-right space-x-3">
                                 {/* EDIT USER BUTTON */}
                                 <button 
                                   onClick={() => openEditUser(u)} 
                                   className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all"
                                 >
                                   EDIT
                                 </button>
                                 <button onClick={() => setDeletingUserId({id: u.id, role: 'USER'})} className="px-5 py-2.5 bg-red-50 text-red-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                                   DELETE
                                 </button>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </section>

             <section className="space-y-6">
                <div className="flex justify-between items-center px-4">
                   <h2 className="text-3xl font-black text-[#1F2A44] tracking-tight">ADMIN STAFF</h2>
                   <button onClick={() => openAddUser('ADMIN')} className="px-8 py-4 bg-[#5DA9E9] text-white rounded-2xl font-black text-[11px] tracking-widest uppercase shadow-xl hover:-translate-y-1 transition-all">
                      <i className="fas fa-user-shield mr-2"></i> NEW STAFF
                   </button>
                </div>
                <div className="bg-white rounded-[44px] border border-[#E5EAF0] overflow-hidden shadow-sm">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-[#E5EAF0]">
                         <tr>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">STAFF NAME</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">ID</th>
                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">ACTION</th>
                         </tr>
                      </thead>
                      <tbody>
                         {admins.map(u => (
                           <tr key={u.id} className="border-b border-[#E5EAF0] hover:bg-slate-50">
                              <td className="px-10 py-6 font-bold text-[#1F2A44] text-sm uppercase">{u.name}</td>
                              <td className="px-10 py-6"><span className="px-3 py-1 bg-[#1F2A44] text-white text-[10px] font-black rounded-lg">{u.libraryId}</span></td>
                              <td className="px-10 py-6 text-right space-x-3">
                                 <button onClick={() => openEditUser(u)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md">EDIT</button>
                                 {admin.id !== u.id && (
                                   <button onClick={() => setDeletingUserId({id: u.id, role: 'ADMIN'})} className="px-5 py-2.5 bg-red-50 text-red-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">DELETE</button>
                                 )}
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
                <h2 className="text-3xl font-black text-[#1F2A44] tracking-tight">ACTIVE ASSET LOANS</h2>
             </div>
             {activeLoans.length === 0 ? (
               <div className="bg-white p-24 rounded-[44px] border border-[#E5EAF0] text-center">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">NO ASSETS ARE CURRENTLY OUT ON LOAN.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {activeLoans.map(b => (
                    <div key={b.id} className="bg-white p-8 rounded-[40px] border border-[#E5EAF0] flex gap-8 items-center shadow-sm">
                       <img src={b.coverImage} className="w-20 h-28 object-cover rounded-2xl shadow-lg" alt="" />
                       <div className="flex-1 min-w-0">
                          <h4 className="font-black text-[#1F2A44] text-lg uppercase truncate">{b.title}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mt-2">ISSUED TO: {b.issuedTo}</p>
                       </div>
                       <button onClick={() => onReturnBook(b.id)} className="px-8 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[11px] tracking-widest uppercase shadow-xl hover:bg-green-600 transition-colors">RETURN ASSET</button>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </main>

      {/* ASSET MODAL (WITH AI MAGIC AND COVER CONTROLS) */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/95 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
           <div className="bg-white rounded-[56px] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-fade-in max-h-[95vh]">
              <div className="md:w-[380px] bg-[#F7F9FC] p-10 flex flex-col border-r border-[#E5EAF0]">
                 <div className="w-full aspect-[3/4.2] bg-white rounded-[40px] overflow-hidden shadow-2xl border-2 border-slate-200 flex items-center justify-center relative mb-8">
                    {bookForm.coverImage ? (
                      <img src={bookForm.coverImage} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <i className="fas fa-image text-4xl text-slate-200"></i>
                    )}
                    {isAiLoading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <i className="fas fa-spinner fa-spin text-2xl text-[#5DA9E9]"></i>
                      </div>
                    )}
                 </div>
                 
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">COVER SOURCE</label>
                    <div className="flex bg-white p-1 rounded-2xl border border-[#E5EAF0]">
                      {(['AI', 'FILE', 'URL'] as const).map(s => (
                        <button 
                          key={s} 
                          onClick={() => setImageSource(s)} 
                          className={`flex-1 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${imageSource === s ? 'bg-[#1F2A44] text-white' : 'text-slate-400'}`}
                        >
                          {s === 'AI' ? 'GENERATE' : s}
                        </button>
                      ))}
                    </div>

                    {imageSource === 'URL' && (
                       <input 
                         value={bookForm.coverImage?.startsWith('data:') ? '' : bookForm.coverImage} 
                         onChange={e => setBookForm({...bookForm, coverImage: e.target.value})} 
                         placeholder="Paste Image Address..." 
                         className="w-full p-4 bg-white border border-[#E5EAF0] rounded-2xl outline-none text-[11px] font-bold"
                       />
                    )}

                    {imageSource === 'FILE' && (
                       <div className="space-y-2">
                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                          <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-white border border-[#E5EAF0] text-[#1F2A44] rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm">
                            <i className="fas fa-upload mr-2"></i> FROM COMPUTER
                          </button>
                       </div>
                    )}

                    {imageSource === 'AI' && (
                       <p className="text-[10px] text-slate-400 text-center font-bold px-4 italic">Cover will be generated automatically when using "AI MAGIC FILL" below.</p>
                    )}
                 </div>
              </div>

              <div className="flex-1 p-12 md:p-16 space-y-8 overflow-y-auto">
                 <div className="flex justify-between items-center">
                    <h3 className="text-3xl font-black text-[#1F2A44]">{isEditingBook ? 'EDIT ASSET INFO' : 'NEW ASSET REGISTRY'}</h3>
                    {/* RESTORED AI MAGIC BUTTON */}
                    <button 
                      onClick={handleAiMagic} 
                      disabled={isAiLoading || !bookForm.title} 
                      className="px-6 py-4 bg-blue-50 border border-blue-100 text-blue-600 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                    >
                       <i className="fas fa-wand-magic-sparkles"></i> AI MAGIC FILL
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-slate-400 ml-3">TITLE</label>
                       <input value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} className="w-full p-5 bg-[#F7F9FC] rounded-3xl outline-none font-bold border border-[#E5EAF0] focus:border-[#5DA9E9]" placeholder="Book Title" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-slate-400 ml-3">AUTHOR</label>
                       <input value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} className="w-full p-5 bg-[#F7F9FC] rounded-3xl outline-none font-bold border border-[#E5EAF0] focus:border-[#5DA9E9]" placeholder="Author Name" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-slate-400 ml-3">GENRE</label>
                       <input value={bookForm.genre} onChange={e => setBookForm({...bookForm, genre: e.target.value})} className="w-full p-5 bg-[#F7F9FC] rounded-3xl outline-none font-bold border border-[#E5EAF0] focus:border-[#5DA9E9]" placeholder="Genre" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-slate-400 ml-3">LOCATION (STAND ID)</label>
                       <input value={bookForm.standNumber} onChange={e => setBookForm({...bookForm, standNumber: e.target.value})} className="w-full p-5 bg-[#F7F9FC] rounded-3xl outline-none font-bold border border-[#E5EAF0] focus:border-[#5DA9E9]" placeholder="e.g. A-101" />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-3">DESCRIPTION / SYNOPSIS</label>
                    <textarea value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})} rows={4} className="w-full p-6 bg-[#F7F9FC] rounded-[32px] outline-none font-bold border border-[#E5EAF0] focus:border-[#5DA9E9] resize-none" placeholder="Enter asset synopsis..." />
                 </div>

                 <div className="flex gap-4 pt-10">
                    <button onClick={() => setIsBookModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase text-[12px] rounded-3xl">DISMISS</button>
                    <button onClick={saveBook} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-[12px] rounded-3xl shadow-2xl">SAVE TO REGISTRY</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* USER MODAL (FOR ADDING AND EDITING) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[56px] w-full max-w-xl p-16 space-y-10 shadow-2xl">
              <h3 className="text-3xl font-black text-[#1F2A44] text-center uppercase tracking-tight">{isEditingUser ? 'EDIT USER ACCOUNT' : `CREATE NEW ${userForm.role}`}</h3>
              <div className="space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">FULL NAME</label>
                    <input value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="e.g. Yash Kekan" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none font-bold focus:border-[#5DA9E9]" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">LIBRARY / STAFF ID</label>
                    <input value={userForm.libraryId} onChange={e => setUserForm({...userForm, libraryId: e.target.value})} placeholder="e.g. PP1707" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none font-bold focus:border-[#5DA9E9]" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">EMAIL ADDRESS</label>
                    <input value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="e.g. user@vaymn.com" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none font-bold focus:border-[#5DA9E9]" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">PASSWORD</label>
                    <input value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} type="text" placeholder="Access Code" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none font-bold focus:border-[#5DA9E9]" />
                 </div>
              </div>
              <div className="flex gap-4 pt-6">
                 <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase text-[12px] rounded-3xl">CANCEL</button>
                 <button onClick={saveUser} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-[12px] rounded-3xl shadow-xl">{isEditingUser ? 'APPLY CHANGES' : 'CREATE ACCOUNT'}</button>
              </div>
           </div>
        </div>
      )}

      {deletingBookId && (
        <ConfirmationModal title="REMOVE ASSET?" message="This will permanently delete the book from the system catalog." onConfirm={() => { onDeleteBook(deletingBookId); setDeletingBookId(null); }} onCancel={() => setDeletingBookId(null)} />
      )}

      {deletingUserId && (
        <ConfirmationModal title="DELETE ACCOUNT?" message={`Are you sure you want to remove this ${deletingUserId.role}?`} onConfirm={() => { 
          if (deletingUserId.role === 'ADMIN') onDeleteAdmin(deletingUserId.id);
          else onDeleteUser(deletingUserId.id);
          setDeletingUserId(null); 
        }} onCancel={() => setDeletingUserId(null)} />
      )}
    </div>
  );
};

export default AdminDashboard;
