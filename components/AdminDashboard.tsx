
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
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
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
  admin, books, users, admins, setBooks, onDeleteBook, onDeleteUser, onUpdateUser, onReturnBook, onAddUser, onAddAdmin, onDeleteAdmin, onUpdateAdmin
}) => {
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isSeeding, setIsSeeding] = useState(false);
  
  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [bookForm, setBookForm] = useState<Partial<Book>>({ title: '', author: '', genre: '', description: '', standNumber: '', coverImage: '' });
  const [imageSource, setImageSource] = useState<'AI' | 'URL' | 'FILE'>('AI');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({ name: '', libraryId: '', email: '', password: '', role: 'USER' });

  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<{id: string, role: UserRole} | null>(null);

  const [isAiLoading, setIsAiLoading] = useState(false);

  // Manual Seeding Logic (To help the user see data)
  const handleManualSeed = async () => {
    if (!confirm("This will populate your library with sample books and students. Continue?")) return;
    setIsSeeding(true);
    try {
      await db.forceSeed();
      window.location.reload(); // Refresh to show new data
    } catch (e) {
      alert("Seeding failed.");
    } finally {
      setIsSeeding(false);
    }
  };

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

  const saveBook = () => {
    if (!bookForm.title || !bookForm.author) return alert("Required fields missing.");
    if (isEditingBook && bookForm.id) {
      setBooks(books.map(b => b.id === bookForm.id ? { ...b, ...bookForm } as Book : b));
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

  const handleOpenAddUser = (role: UserRole) => {
    setUserForm({ name: '', libraryId: '', email: '', password: '', role });
    setIsEditingUser(false);
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

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <aside className="w-full lg:w-80 space-y-4">
        {[
          { id: 'OVERVIEW', icon: 'fa-chart-line', label: 'Management Home' },
          { id: 'BOOKS', icon: 'fa-book-open', label: 'Asset Inventory' },
          { id: 'USERS', icon: 'fa-user-graduate', label: 'Student Directory' },
          { id: 'ISSUES', icon: 'fa-exchange-alt', label: 'Active Asset Loans' },
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
                   <h2 className="text-3xl font-black mb-4">System Management</h2>
                   <p className="text-white/60 text-lg leading-relaxed font-medium">If your directory or inventory appears empty, use the repair tool below to populate sample data.</p>
                </div>
                <button 
                  onClick={handleManualSeed}
                  disabled={isSeeding}
                  className="relative z-10 px-10 py-6 bg-white text-[#1F2A44] rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-[#5DA9E9] hover:text-white transition-all whitespace-nowrap"
                >
                  {isSeeding ? 'Populating...' : 'Seed Sample Data'}
                </button>
                <div className="absolute top-[-40px] right-[-40px] w-64 h-64 bg-white/5 rounded-full blur-[80px]"></div>
             </div>
          </div>
        )}

        {activeTab === 'BOOKS' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Asset Inventory</h2>
                <button onClick={handleOpenAddBook} className="px-8 py-4 bg-[#1F2A44] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
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
                        <div className="mt-5 flex items-center gap-2">
                           <button onClick={() => handleOpenEditBook(b)} className="w-9 h-9 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"><i className="fas fa-edit text-xs"></i></button>
                           <button onClick={() => setDeletingBookId(b.id)} className="w-9 h-9 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
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

        {activeTab === 'USERS' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Student Directory</h2>
                <button onClick={() => handleOpenAddUser('USER')} className="px-8 py-4 bg-[#1F2A44] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
                  <i className="fas fa-user-plus mr-2"></i> Register Student
                </button>
             </div>
             
             {users.length === 0 ? (
               <div className="bg-white p-24 rounded-[44px] border border-[#E5EAF0] text-center flex flex-col items-center gap-6">
                 <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center text-4xl"><i className="fas fa-user-slash"></i></div>
                 <div>
                    <h4 className="text-xl font-black text-[#1F2A44] mb-2">No Students Registered</h4>
                    <p className="text-slate-400 text-sm">Add students manually or use the Seed button in Home.</p>
                 </div>
               </div>
             ) : (
               <div className="bg-white rounded-[44px] border border-[#E5EAF0] overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="border-b border-[#E5EAF0] bg-[#F7F9FC]">
                           <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Name</th>
                           <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Library ID</th>
                           <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-[#E5EAF0] hover:bg-slate-50 transition-colors">
                             <td className="px-8 py-6 font-bold text-[#1F2A44]">{u.name}</td>
                             <td className="px-8 py-6">
                                <span className="px-3 py-1 bg-[#1F2A44] text-white text-[9px] font-black rounded-lg">{u.libraryId}</span>
                             </td>
                             <td className="px-8 py-6 text-right space-x-2">
                                <button onClick={() => setDeletingUserId({id: u.id, role: 'USER'})} className="w-9 h-9 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
             )}
          </div>
        )}

        {activeTab === 'ISSUES' && (
          <div className="space-y-10 animate-fade-in">
             <div className="flex justify-between items-center px-4">
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Active Loans</h2>
             </div>
             {activeLoans.length === 0 ? (
               <div className="bg-white p-24 rounded-[44px] border border-[#E5EAF0] text-center flex flex-col items-center gap-6">
                  <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center text-4xl"><i className="fas fa-check-circle"></i></div>
                  <h4 className="text-xl font-black text-[#1F2A44]">All Assets are in Stock</h4>
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
                       <button onClick={() => onReturnBook(b.id)} className="px-6 py-4 bg-[#1F2A44] text-white rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-800 transition-all shadow-xl">
                          Return Asset
                       </button>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </main>

      {/* Book Registry Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/95 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
           <div className="bg-white rounded-[56px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[95vh] animate-fade-in">
              <div className="md:w-[350px] bg-[#F7F9FC] p-10 border-r border-[#E5EAF0] flex flex-col">
                 <div className="w-full aspect-[3/4.2] bg-white rounded-[40px] overflow-hidden shadow-inner border-2 border-dashed border-slate-200 flex items-center justify-center relative mb-8">
                    {bookForm.coverImage ? (
                      <img src={bookForm.coverImage} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <i className="fas fa-image text-4xl text-slate-200"></i>
                    )}
                    {isAiLoading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center animate-fade-in">
                        <div className="w-10 h-10 border-4 border-[#5DA9E9] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                 </div>
                 <div className="space-y-4">
                    <button onClick={() => setImageSource('AI')} className={`w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border ${imageSource === 'AI' ? 'bg-[#1F2A44] text-white' : 'bg-white text-slate-400'}`}>AI Generated</button>
                    <button onClick={() => setImageSource('URL')} className={`w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border ${imageSource === 'URL' ? 'bg-[#1F2A44] text-white' : 'bg-white text-slate-400'}`}>Direct URL</button>
                    {imageSource === 'URL' && (
                      <input 
                        value={bookForm.coverImage} 
                        onChange={e => setBookForm({...bookForm, coverImage: e.target.value})} 
                        placeholder="Paste Link" 
                        className="w-full p-3 bg-white border border-[#E5EAF0] rounded-xl text-[11px] font-bold"
                      />
                    )}
                 </div>
              </div>
              <div className="flex-1 p-12 space-y-8 overflow-y-auto">
                 <div className="flex justify-between items-center">
                    <h3 className="text-3xl font-black text-[#1F2A44]">Asset Details</h3>
                    <button 
                      onClick={handleAiMagic} 
                      disabled={isAiLoading || !bookForm.title} 
                      className="px-6 py-4 bg-[#F7F9FC] border border-[#E5EAF0] text-[#1F2A44] rounded-2xl flex items-center gap-3 hover:border-[#5DA9E9] transition-all"
                    >
                      <i className="fas fa-wand-magic-sparkles text-[#5DA9E9]"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">AI Fill</span>
                    </button>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <input value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} placeholder="Title" className="p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                    <input value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} placeholder="Author" className="p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                    <input value={bookForm.genre} onChange={e => setBookForm({...bookForm, genre: e.target.value})} placeholder="Genre" className="p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                    <input value={bookForm.standNumber} onChange={e => setBookForm({...bookForm, standNumber: e.target.value})} placeholder="Shelf Location" className="p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                 </div>
                 <textarea value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})} placeholder="Asset Synopsis" rows={4} className="w-full p-6 bg-[#F7F9FC] border border-[#E5EAF0] rounded-[32px] outline-none text-sm font-bold resize-none" />
                 <div className="flex gap-4 pt-10">
                    <button onClick={() => setIsBookModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase text-[11px] tracking-widest rounded-3xl">Cancel</button>
                    <button onClick={saveBook} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-[11px] tracking-widest rounded-3xl shadow-2xl">Save Asset</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* User Management Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[56px] w-full max-w-xl p-16 space-y-10 shadow-2xl">
              <h3 className="text-3xl font-black text-[#1F2A44] text-center">Register Student</h3>
              <div className="space-y-6">
                 <input value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Full Name" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                 <input value={userForm.libraryId} onChange={e => setUserForm({...userForm, libraryId: e.target.value})} placeholder="Library ID (e.g. PP1001)" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                 <input value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="Email Address" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
                 <input value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} type="password" placeholder="Password" className="w-full p-5 bg-[#F7F9FC] border border-[#E5EAF0] rounded-2xl outline-none text-sm font-bold" />
              </div>
              <div className="flex gap-4 pt-6">
                 <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 font-black uppercase text-[11px] tracking-widest rounded-3xl">Cancel</button>
                 <button onClick={saveUser} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-[11px] tracking-widest rounded-3xl">Complete Registration</button>
              </div>
           </div>
        </div>
      )}

      {deletingBookId && (
        <ConfirmationModal 
          title="Remove Asset?" 
          message="This will permanently delete this book from the system."
          onConfirm={() => { onDeleteBook(deletingBookId); setDeletingBookId(null); }}
          onCancel={() => setDeletingBookId(null)}
        />
      )}

      {deletingUserId && (
        <ConfirmationModal 
          title="Remove Student?" 
          message="Delete this student account? All loan history will be lost."
          onConfirm={() => { 
            if (deletingUserId.role === 'ADMIN') onDeleteAdmin(deletingUserId.id);
            else onDeleteUser(deletingUserId.id);
            setDeletingUserId(null); 
          }}
          onCancel={() => setDeletingUserId(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
