
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
  
  // Book Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [bookForm, setBookForm] = useState<Partial<Book>>({ title: '', author: '', genre: '', description: '', standNumber: '', coverImage: '' });
  const [imageSource, setImageSource] = useState<'AI' | 'URL' | 'FILE'>('AI');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', libraryId: '', email: '', password: '', role: 'USER' });

  // Delete State
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<{id: string, role: UserRole} | null>(null);

  const [isAiLoading, setIsAiLoading] = useState(false);

  // Restore Sample Data
  const handleManualSeed = async () => {
    setIsSeeding(true);
    try {
      const data = await db.forceSeed();
      setBooks(data.books);
      setUsers(data.users);
      setAdmins(data.admins);
      alert("System data restored successfully.");
    } catch (e) {
      alert("Error seeding data.");
    } finally {
      setIsSeeding(false);
    }
  };

  // --- BOOK FUNCTIONS ---
  const handleOpenAddBook = () => {
    setBookForm({ title: '', author: '', genre: '', description: '', standNumber: '', coverImage: '' });
    setImageSource('AI');
    setIsEditingBook(false);
    setIsBookModalOpen(true);
  };

  const handleOpenEditBook = (book: Book) => {
    setBookForm(book);
    setImageSource(book.coverImage?.startsWith('data:') ? 'FILE' : 'URL');
    setIsEditingBook(true);
    setIsBookModalOpen(true);
  };

  const handleAiMagic = async () => {
    if (!bookForm.title) return alert("Enter a title first!");
    setIsAiLoading(true);
    try {
      const details = await getBookDetails(bookForm.title);
      if (details) {
        setBookForm(prev => ({ 
          ...prev, 
          author: details.author, 
          genre: details.genre, 
          description: details.description 
        }));

        if (imageSource === 'AI') {
          const cover = await generateBookCover(bookForm.title, details.description);
          if (cover) {
            setBookForm(prev => ({ ...prev, coverImage: cover }));
          }
        }
      }
    } catch (e) {
      alert("AI Service is currently busy.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBookForm(prev => ({ ...prev, coverImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveBook = async () => {
    if (!bookForm.title || !bookForm.author) return alert("Required fields missing.");
    
    let updatedBooks;
    if (isEditingBook && bookForm.id) {
      updatedBooks = books.map(b => b.id === bookForm.id ? { ...b, ...bookForm } as Book : b);
      const updatedBook = updatedBooks.find(b => b.id === bookForm.id);
      if (updatedBook) await db.updateBook(updatedBook);
    } else {
      const newBook: Book = {
        id: Math.random().toString(36).substr(2, 9),
        title: bookForm.title!, 
        author: bookForm.author!, 
        genre: bookForm.genre || 'General',
        coverImage: bookForm.coverImage || 'https://images.unsplash.com/photo-1543005187-a19744feae6d?q=80&w=400',
        standNumber: bookForm.standNumber || 'Unassigned', 
        description: bookForm.description,
        isAvailable: true
      };
      updatedBooks = [...books, newBook];
      await db.updateBook(newBook);
    }
    setBooks(updatedBooks);
    setIsBookModalOpen(false);
  };

  // --- USER FUNCTIONS ---
  const handleOpenAddUser = (role: UserRole) => {
    setUserForm({ name: '', libraryId: '', email: '', password: '', role });
    setIsEditingUser(false);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setUserForm(user);
    setIsEditingUser(true);
    setIsUserModalOpen(true);
  };

  const saveUser = () => {
    if (!userForm.name || !userForm.libraryId) return alert("Required fields missing.");
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

  const tabs = [
    { id: 'OVERVIEW', icon: 'fa-chart-line', label: 'Management Home' },
    { id: 'INVENTORY', icon: 'fa-book-open', label: 'Asset Inventory' },
    { id: 'DIRECTORY', icon: 'fa-user-graduate', label: 'Student Directory' },
    { id: 'LOANS', icon: 'fa-exchange-alt', label: 'Active Loans' },
  ] as const;

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <aside className="w-full lg:w-80 space-y-4">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`w-full text-left px-8 py-5 rounded-[28px] font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center gap-5 ${
              activeTab === tab.id ? 'bg-[#1F2A44] text-white shadow-2xl scale-105' : 'bg-white text-slate-400 border border-[#E5EAF0] hover:border-[#5DA9E9]'
            }`}
          >
            <i className={`fas ${tab.icon} w-6`}></i>
            {tab.label}
          </button>
        ))}
      </aside>

      <main className="flex-1 min-w-0" key={activeTab}>
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-12 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{books.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Inventory Count</p>
                </div>
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{activeLoans.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Active Loans</p>
                </div>
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{users.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Students</p>
                </div>
             </div>

             <div className="bg-[#1F2A44] rounded-[52px] p-12 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="relative z-10 max-w-xl">
                   <h2 className="text-3xl font-black mb-4">Core Management</h2>
                   <p className="text-white/60 text-lg leading-relaxed font-medium">If lists are empty or corrupted, use the repair tool to sync with sample data.</p>
                </div>
                <button 
                  onClick={handleManualSeed}
                  disabled={isSeeding}
                  className="relative z-10 px-10 py-6 bg-[#5DA9E9] text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all"
                >
                  {isSeeding ? 'Syncing...' : 'Seed Sample Data'}
                </button>
             </div>
          </div>
        )}

        {activeTab === 'INVENTORY' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Asset Inventory</h2>
                <button onClick={handleOpenAddBook} className="px-8 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[10px] tracking-widest uppercase">
                  <i className="fas fa-plus mr-2"></i> New Asset
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {books.map(b => (
                  <div key={b.id} className="bg-white p-6 rounded-[40px] border border-[#E5EAF0] flex gap-6 group hover:shadow-2xl transition-all relative overflow-hidden">
                     <img src={b.coverImage} className="w-24 h-32 object-cover rounded-[20px] shadow-lg flex-shrink-0" alt="" />
                     <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-black text-[#1F2A44] truncate mb-1">{b.title}</h4>
                        <p className="text-[10px] text-[#5DA9E9] font-black uppercase tracking-widest truncate">{b.author}</p>
                        
                        {/* THE EDIT BUTTONS (NOW VISIBLE AND PROMINENT) */}
                        <div className="mt-5 flex items-center gap-2">
                           <button 
                             onClick={() => handleOpenEditBook(b)} 
                             className="px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
                           >
                             <i className="fas fa-edit"></i> Edit
                           </button>
                           <button 
                             onClick={() => setDeletingBookId(b.id)} 
                             className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                           >
                             <i className="fas fa-trash-alt text-xs"></i>
                           </button>
                           <span className={`px-2 py-1 ml-auto text-[8px] font-black uppercase tracking-widest rounded-lg ${b.isAvailable ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                             {b.isAvailable ? 'Stock' : 'Loaned'}
                           </span>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'DIRECTORY' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Student Directory</h2>
                <button onClick={() => handleOpenAddUser('USER')} className="px-8 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-xl">
                  <i className="fas fa-user-plus mr-2"></i> Register Student
                </button>
             </div>
             {users.length === 0 ? (
               <div className="bg-white p-24 rounded-[44px] border border-[#E5EAF0] text-center">
                 <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No students registered yet.</p>
               </div>
             ) : (
               <div className="bg-white rounded-[44px] border border-[#E5EAF0] overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="border-b border-[#E5EAF0] bg-slate-50">
                           <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Name</th>
                           <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Library ID</th>
                           <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-[#E5EAF0] hover:bg-slate-50 transition-colors">
                             <td className="px-10 py-6 font-bold text-[#1F2A44]">{u.name}</td>
                             <td className="px-10 py-6"><span className="px-3 py-1 bg-slate-100 text-[#1F2A44] text-[10px] font-black rounded-lg">{u.libraryId}</span></td>
                             <td className="px-10 py-6 text-right space-x-3">
                                {/* THE USER EDIT BUTTON */}
                                <button 
                                  onClick={() => handleOpenEditUser(u)} 
                                  className="px-5 py-2.5 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all font-black text-[9px] uppercase tracking-widest"
                                >
                                  Edit Info
                                </button>
                                <button 
                                  onClick={() => setDeletingUserId({id: u.id, role: 'USER'})} 
                                  className="text-red-400 hover:text-red-600 font-black text-[10px] p-2"
                                >
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
             )}
          </div>
        )}

        {activeTab === 'LOANS' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Active Asset Loans</h2>
             </div>
             {activeLoans.length === 0 ? (
               <div className="bg-white p-24 rounded-[44px] border border-[#E5EAF0] text-center">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">All assets are currently in stock.</p>
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
                       <button onClick={() => onReturnBook(b.id)} className="px-6 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[9px] tracking-widest uppercase shadow-xl">Return Asset</button>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </main>

      {/* ASSET REGISTRY MODAL (RESTORED ALL AI FEATURES) */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/95 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
           <div className="bg-white rounded-[56px] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[95vh] animate-fade-in">
              <div className="md:w-[380px] bg-[#F7F9FC] p-10 border-r border-[#E5EAF0] flex flex-col">
                 <div className="w-full aspect-[3/4.2] bg-white rounded-[40px] overflow-hidden shadow-inner border-2 border-dashed border-slate-200 flex items-center justify-center relative mb-8">
                    {bookForm.coverImage ? (
                      <img src={bookForm.coverImage} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="text-center text-slate-200">
                        <i className="fas fa-image text-4xl mb-2"></i>
                        <p className="text-[9px] font-black uppercase tracking-widest">No Cover</p>
                      </div>
                    )}
                    {isAiLoading && (
                      <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center animate-fade-in">
                        <div className="w-10 h-10 border-4 border-[#5DA9E9] border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="text-[8px] font-black text-[#5DA9E9] uppercase tracking-widest">AI Generating...</span>
                      </div>
                    )}
                 </div>
                 
                 <div className="space-y-6">
                    <div className="flex bg-white p-1 rounded-2xl border border-[#E5EAF0]">
                      {(['AI', 'FILE', 'URL'] as const).map(src => (
                        <button key={src} onClick={() => setImageSource(src)} className={`flex-1 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${imageSource === src ? 'bg-[#1F2A44] text-white' : 'text-slate-400'}`}>{src}</button>
                      ))}
                    </div>

                    {imageSource === 'URL' && (
                       <input 
                         value={bookForm.coverImage?.startsWith('data:') ? '' : bookForm.coverImage} 
                         onChange={e => setBookForm({...bookForm, coverImage: e.target.value})} 
                         placeholder="Paste Image URL" 
                         className="w-full p-4 bg-white border border-[#E5EAF0] rounded-2xl outline-none text-[11px] font-bold"
                       />
                    )}

                    {imageSource === 'FILE' && (
                       <div>
                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                          <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-white border border-[#E5EAF0] text-[#1F2A44] rounded-2xl font-black uppercase text-[10px] tracking-widest">Select From PC</button>
                       </div>
                    )}
                 </div>
              </div>

              <div className="flex-1 p-12 md:p-16 space-y-8 overflow-y-auto">
                 <div className="flex justify-between items-center">
                    <h3 className="text-3xl font-black text-[#1F2A44]">{isEditingBook ? 'Update Asset Info' : 'New Asset Registry'}</h3>
                    <button 
                      onClick={handleAiMagic} 
                      disabled={isAiLoading || !bookForm.title} 
                      className="px-6 py-4 bg-[#F7F9FC] border border-[#E5EAF0] text-[#1F2A44] rounded-2xl flex items-center gap-3 hover:border-[#5DA9E9] transition-all disabled:opacity-50"
                    >
                      <i className="fas fa-wand-magic-sparkles text-[#5DA9E9]"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">AI Magic Fill</span>
                    </button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Book Title</label>
                      <input value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} placeholder="Title" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-3xl outline-none text-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Author Name</label>
                      <input value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} placeholder="Author" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-3xl outline-none text-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Genre Category</label>
                      <input value={bookForm.genre} onChange={e => setBookForm({...bookForm, genre: e.target.value})} placeholder="Genre" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-3xl outline-none text-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Physical Stand ID</label>
                      <input value={bookForm.standNumber} onChange={e => setBookForm({...bookForm, standNumber: e.target.value})} placeholder="Shelf ID" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-3xl outline-none text-sm font-bold" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Official Description</label>
                    <textarea value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})} placeholder="Provide a brief synopsis..." rows={4} className="w-full p-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-[32px] outline-none text-sm font-bold resize-none" />
                 </div>
                 <div className="flex gap-4 pt-10">
                    <button onClick={() => setIsBookModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase text-[11px] tracking-widest rounded-3xl">Dismiss</button>
                    <button onClick={saveBook} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-[11px] tracking-widest rounded-3xl shadow-2xl">Save to Registry</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* USER MODAL (NOW SUPPORTS EDITING) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[56px] w-full max-w-xl p-16 space-y-10 shadow-2xl">
              <h3 className="text-3xl font-black text-[#1F2A44] text-center">{isEditingUser ? 'Update Student Record' : 'Register New Student'}</h3>
              <div className="space-y-6">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Student Full Name</label>
                    <input value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Full Name" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Official Library ID</label>
                    <input value={userForm.libraryId} onChange={e => setUserForm({...userForm, libraryId: e.target.value})} placeholder="ID Number" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Email</label>
                    <input value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="Email" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Portal Password</label>
                    <input value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} type="password" placeholder="Password" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                 </div>
              </div>
              <div className="flex gap-4 pt-6">
                 <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase text-[11px] tracking-widest rounded-3xl">Cancel</button>
                 <button onClick={saveUser} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-[11px] tracking-widest rounded-3xl shadow-xl">{isEditingUser ? 'Confirm Updates' : 'Complete Registration'}</button>
              </div>
           </div>
        </div>
      )}

      {deletingBookId && (
        <ConfirmationModal title="Remove Asset?" message="Delete this book from the collection?" onConfirm={() => { onDeleteBook(deletingBookId); setDeletingBookId(null); }} onCancel={() => setDeletingBookId(null)} />
      )}

      {deletingUserId && (
        <ConfirmationModal title="Delete User?" message={`Remove this ${deletingUserId.role} record?`} onConfirm={() => { 
          if (deletingUserId.role === 'ADMIN') onDeleteAdmin(deletingUserId.id);
          else onDeleteUser(deletingUserId.id);
          setDeletingUserId(null); 
        }} onCancel={() => setDeletingUserId(null)} />
      )}
    </div>
  );
};

export default AdminDashboard;
