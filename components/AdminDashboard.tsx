
import React, { useState } from 'react';
import { User, Book } from '../types';
import { getBookDetails, generateBookCover } from '../geminiService';

interface AdminDashboardProps {
  admin: User; 
  books: Book[]; 
  users: User[]; 
  admins: User[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
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
  admin, books, users, admins, setBooks, onDeleteUser, onUpdateUser, onReturnBook 
}) => {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  
  // Book Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [bookForm, setBookForm] = useState<Partial<Book>>({ title: '', author: '', genre: '', description: '', standNumber: '', coverImage: '' });
  
  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', libraryId: '', email: '' });

  const [isAiLoading, setIsAiLoading] = useState(false);

  const totalBooks = books.length;
  const issuedBooks = books.filter(b => !b.isAvailable).length;

  const handleOpenAddBook = () => {
    setBookForm({ title: '', author: '', genre: '', description: '', standNumber: '', coverImage: '' });
    setIsEditingBook(false);
    setIsBookModalOpen(true);
  };

  const handleOpenEditBook = (book: Book) => {
    setBookForm(book);
    setIsEditingBook(true);
    setIsBookModalOpen(true);
  };

  const handleAiMagic = async () => {
    if (!bookForm.title) return alert("Enter a title first!");
    setIsAiLoading(true);
    try {
      // Step 1: Get Metadata
      const details = await getBookDetails(bookForm.title);
      if (details) {
        setBookForm(prev => ({ 
          ...prev, 
          author: details.author, 
          genre: details.genre, 
          description: details.description 
        }));

        // Step 2: Generate Cover based on metadata
        const cover = await generateBookCover(bookForm.title, details.description);
        if (cover) {
          setBookForm(prev => ({ ...prev, coverImage: cover }));
        }
      }
    } catch (e) {
      alert("AI Librarian is busy processing other requests. Please try again in a few seconds.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const saveBook = () => {
    if (!bookForm.title || !bookForm.author) return alert("Title and Author are mandatory.");
    
    if (isEditingBook && bookForm.id) {
      const updated = books.map(b => b.id === bookForm.id ? { ...b, ...bookForm } as Book : b);
      setBooks(updated);
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
      setBooks([...books, newBook]);
    }
    setIsBookModalOpen(false);
  };

  const handleOpenEditUser = (user: User) => {
    setUserForm(user);
    setIsUserModalOpen(true);
  };

  const saveUser = () => {
    if (!userForm.name || !userForm.libraryId) return alert("Required fields missing.");
    onUpdateUser(userForm as User);
    setIsUserModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <aside className="w-full lg:w-80 space-y-4">
        {[
          { id: 'OVERVIEW', icon: 'fa-chart-line', label: 'Management Home' },
          { id: 'BOOKS', icon: 'fa-book-open', label: 'Asset Inventory' },
          { id: 'USERS', icon: 'fa-user-graduate', label: 'Student Directory' },
          { id: 'ISSUES', icon: 'fa-exchange-alt', label: 'Active Loans' },
        ].map(tab => (
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

      <main className="flex-1 min-w-0">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-12 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6"><i className="fas fa-archive"></i></div>
                   <h3 className="text-4xl font-black text-[#1F2A44]">{totalBooks}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Total Assets</p>
                </div>
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6"><i className="fas fa-hand-holding"></i></div>
                   <h3 className="text-4xl font-black text-[#1F2A44]">{issuedBooks}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Active Loans</p>
                </div>
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <div className="w-14 h-14 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-6"><i className="fas fa-users-viewfinder"></i></div>
                   <h3 className="text-4xl font-black text-[#1F2A44]">{users.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Students Registered</p>
                </div>
             </div>
             <div className="bg-[#1F2A44] rounded-[52px] p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10 max-w-xl">
                   <h2 className="text-3xl font-black mb-4">Librarian Panel</h2>
                   <p className="text-white/60 text-lg leading-relaxed font-medium">System status: Optimal. You can now edit any asset or student profile directly from their respective tabs.</p>
                </div>
                <div className="absolute top-[-40px] right-[-40px] w-64 h-64 bg-white/5 rounded-full blur-[80px]"></div>
             </div>
          </div>
        )}

        {activeTab === 'BOOKS' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Asset Inventory</h2>
                <button onClick={handleOpenAddBook} className="px-8 py-4 bg-[#1F2A44] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3">
                  <i className="fas fa-plus"></i> New Asset
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {books.map(b => (
                  <div key={b.id} className="bg-white p-6 rounded-[40px] border border-[#E5EAF0] flex gap-6 group hover:shadow-2xl transition-all relative overflow-hidden">
                     <img src={b.coverImage} className="w-24 h-32 object-cover rounded-[20px] shadow-lg flex-shrink-0" alt="" />
                     <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-black text-[#1F2A44] leading-tight truncate mb-1" title={b.title}>{b.title}</h4>
                        <p className="text-[10px] text-[#5DA9E9] font-black uppercase tracking-widest truncate">{b.author}</p>
                        <div className="mt-5 flex items-center gap-3">
                           <button onClick={() => handleOpenEditBook(b)} className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"><i className="fas fa-edit text-sm"></i></button>
                           <span className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl ${b.isAvailable ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                             {b.isAvailable ? 'In Stock' : 'Issued'}
                           </span>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'USERS' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Student Directory</h2>
             </div>
             <div className="bg-white rounded-[40px] border border-[#E5EAF0] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="bg-[#F7F9FC]">
                        <tr>
                           <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Student Identity</th>
                           <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Library ID</th>
                           <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Email</th>
                           <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[#E5EAF0]">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-10 py-6 font-black text-sm text-[#1F2A44] truncate max-w-[150px]">{u.name}</td>
                             <td className="px-10 py-6"><code className="text-[11px] font-black text-[#5DA9E9] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">{u.libraryId}</code></td>
                             <td className="px-10 py-6 text-sm text-slate-400 truncate max-w-[200px]">{u.email}</td>
                             <td className="px-10 py-6 flex gap-3">
                                <button onClick={() => handleOpenEditUser(u)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-500 transition-all"><i className="fas fa-user-edit"></i></button>
                                <button onClick={() => onDeleteUser(u.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt"></i></button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'ISSUES' && (
          <div className="space-y-10 animate-fade-in">
             <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider px-4">Current Asset Loans</h2>
             <div className="bg-white rounded-[40px] border border-[#E5EAF0] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="bg-[#F7F9FC]">
                        <tr>
                           <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Borrowed Title</th>
                           <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Student ID</th>
                           <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Processing</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[#E5EAF0]">
                        {books.filter(b => !b.isAvailable).map(b => (
                          <tr key={b.id}>
                             <td className="px-10 py-6 font-black text-sm">{b.title}</td>
                             <td className="px-10 py-6"><span className="text-[11px] font-black text-[#5DA9E9] bg-blue-50 px-3 py-1.5 rounded-xl">{b.issuedTo}</span></td>
                             <td className="px-10 py-6">
                                <button onClick={() => onReturnBook(b.id)} className="px-6 py-3 bg-green-500 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg hover:bg-green-600 transition-all">Accept Return</button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Book Registry Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[56px] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
              <div className="md:w-[400px] bg-[#F7F9FC] p-12 border-r border-[#E5EAF0] flex flex-col items-center">
                 <div className="w-full aspect-[3/4.2] bg-white rounded-[40px] overflow-hidden shadow-inner border-2 border-dashed border-slate-200 flex items-center justify-center relative">
                    {bookForm.coverImage ? (
                      <img src={bookForm.coverImage} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-slate-200">
                        <i className="fas fa-image text-6xl"></i>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">No Cover Preview</span>
                      </div>
                    )}
                    {isAiLoading && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                        <div className="w-12 h-12 border-4 border-[#5DA9E9] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#5DA9E9] animate-pulse">AI PAINTING...</span>
                      </div>
                    )}
                 </div>
                 <p className="mt-10 text-[10px] text-slate-300 font-black uppercase tracking-[0.3em] text-center leading-loose">VAYMN AI Core is active for generation.</p>
              </div>
              <div className="flex-1 p-12 md:p-16 space-y-8 overflow-y-auto">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-3xl font-black text-[#1F2A44]">{isEditingBook ? 'Modify Asset' : 'Register Asset'}</h3>
                    <button 
                      onClick={handleAiMagic} 
                      disabled={isAiLoading || !bookForm.title} 
                      className={`px-6 py-4 rounded-2xl flex items-center gap-3 transition-all border ${
                        isAiLoading ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-[#F7F9FC] border-[#E5EAF0] text-[#1F2A44] hover:bg-white hover:border-[#5DA9E9]'
                      }`}
                    >
                      <i className={`fas ${isAiLoading ? 'fa-circle-notch fa-spin' : 'fa-sparkles text-[#5DA9E9]'}`}></i>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{isAiLoading ? 'GENERATING...' : 'AI MAGIC'}</span>
                    </button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Book Title</label>
                      <input value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} placeholder="e.g. The Great Gatsby" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-3xl outline-none text-sm font-bold focus:border-[#5DA9E9] transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Author Name</label>
                      <input value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} placeholder="Author" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-3xl outline-none text-sm font-bold focus:border-[#5DA9E9] transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Asset Classification</label>
                      <input value={bookForm.genre} onChange={e => setBookForm({...bookForm, genre: e.target.value})} placeholder="Genre" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-3xl outline-none text-sm font-bold focus:border-[#5DA9E9] transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Physical Location</label>
                      <input value={bookForm.standNumber} onChange={e => setBookForm({...bookForm, standNumber: e.target.value})} placeholder="Stand #" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-3xl outline-none text-sm font-bold focus:border-[#5DA9E9] transition-colors" />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Asset Synopsis</label>
                    <textarea value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})} placeholder="Synopsis" rows={4} className="w-full p-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-[32px] outline-none text-sm font-bold resize-none focus:border-[#5DA9E9] transition-colors" />
                 </div>
                 <div className="flex gap-4 pt-10">
                    <button onClick={() => setIsBookModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase text-[11px] tracking-widest rounded-[28px] hover:bg-slate-100 transition-all">Discard</button>
                    <button onClick={saveBook} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-[11px] tracking-widest rounded-[28px] shadow-2xl hover:bg-slate-800 transition-all">{isEditingBook ? 'Update Entry' : 'Save Registry'}</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Student Edit Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/90 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[56px] w-full max-w-2xl overflow-hidden shadow-2xl p-16 space-y-10 animate-fade-in">
              <h3 className="text-3xl font-black text-[#1F2A44]">Edit Student Profile</h3>
              <div className="space-y-8">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4 mb-3 block">Full Name</label>
                    <input value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-[32px] outline-none text-sm font-bold" />
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4 mb-3 block">Library ID</label>
                       <input value={userForm.libraryId} onChange={e => setUserForm({...userForm, libraryId: e.target.value})} className="w-full p-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-[32px] outline-none text-sm font-bold" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-4 mb-3 block">Registry Email</label>
                       <input value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full p-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-[32px] outline-none text-sm font-bold" />
                    </div>
                 </div>
              </div>
              <div className="flex gap-4 pt-8">
                 <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase text-[11px] tracking-widest rounded-[32px]">Cancel</button>
                 <button onClick={saveUser} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-[11px] tracking-widest rounded-[32px] shadow-2xl">Save Changes</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
