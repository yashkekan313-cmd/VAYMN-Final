
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

  const handleOpenAddBook = () => {
    setBookForm({ title: '', author: '', genre: '', description: '', standNumber: '', coverImage: '' });
    setImageSource('AI');
    setIsEditingBook(false);
    setIsBookModalOpen(true);
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
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Assets</p>
                </div>
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{activeLoans.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Loans</p>
                </div>
                <div className="bg-white p-10 rounded-[44px] border border-[#E5EAF0] shadow-sm">
                   <h3 className="text-4xl font-black text-[#1F2A44]">{users.length}</h3>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Students</p>
                </div>
             </div>

             <div className="bg-[#1F2A44] rounded-[52px] p-12 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="relative z-10 max-w-xl">
                   <h2 className="text-3xl font-black mb-4">Core Management</h2>
                   <p className="text-white/60 text-lg leading-relaxed font-medium">Use the repair tool if your lists are not populating from the cloud.</p>
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
                <h2 className="text-2xl font-black text-[#1F2A44] uppercase tracking-wider">Inventory</h2>
                <button onClick={handleOpenAddBook} className="px-8 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[10px] tracking-widest uppercase">
                  <i className="fas fa-plus mr-2"></i> New Asset
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {books.map(b => (
                  <div key={b.id} className="bg-white p-6 rounded-[40px] border border-[#E5EAF0] flex gap-6 group hover:shadow-2xl transition-all">
                     <img src={b.coverImage} className="w-24 h-32 object-cover rounded-[20px] shadow-lg" alt="" />
                     <div className="flex-1 min-w-0">
                        <h4 className="font-black text-[#1F2A44] truncate mb-1">{b.title}</h4>
                        <p className="text-[10px] text-[#5DA9E9] font-black uppercase tracking-widest truncate">{b.author}</p>
                        <div className="mt-5 flex items-center gap-2">
                           <button onClick={() => setDeletingBookId(b.id)} className="w-9 h-9 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
                           <span className={`px-2 py-1 ml-auto text-[8px] font-black uppercase tracking-widest rounded-lg ${b.isAvailable ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                             {b.isAvailable ? 'In Stock' : 'Loaned'}
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
                           <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Name</th>
                           <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">ID</th>
                           <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                        </tr>
                     </thead>
                     <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-[#E5EAF0] hover:bg-slate-50 transition-colors">
                             <td className="px-10 py-6 font-bold text-[#1F2A44]">{u.name}</td>
                             <td className="px-10 py-6"><span className="px-3 py-1 bg-slate-100 text-[#1F2A44] text-[10px] font-black rounded-lg">{u.libraryId}</span></td>
                             <td className="px-10 py-6 text-right">
                                <button onClick={() => setDeletingUserId({id: u.id, role: 'USER'})} className="text-red-400 hover:text-red-600 font-black text-[10px] uppercase tracking-widest">Delete</button>
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
                          <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mt-2">ID: {b.issuedTo}</p>
                       </div>
                       <button onClick={() => onReturnBook(b.id)} className="px-6 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[9px] tracking-widest uppercase shadow-xl">Return</button>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}
      </main>

      {/* Simplified Asset Registry Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[200] bg-[#1F2A44]/95 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-white rounded-[56px] w-full max-w-4xl p-16 shadow-2xl space-y-10 animate-fade-in">
              <h3 className="text-3xl font-black text-[#1F2A44]">Register Asset</h3>
              <div className="grid grid-cols-2 gap-8">
                 <input value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} placeholder="Title" className="p-6 bg-slate-50 rounded-3xl outline-none font-bold" />
                 <input value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} placeholder="Author" className="p-6 bg-slate-50 rounded-3xl outline-none font-bold" />
                 <input value={bookForm.genre} onChange={e => setBookForm({...bookForm, genre: e.target.value})} placeholder="Genre" className="p-6 bg-slate-50 rounded-3xl outline-none font-bold" />
                 <input value={bookForm.standNumber} onChange={e => setBookForm({...bookForm, standNumber: e.target.value})} placeholder="Shelf Location" className="p-6 bg-slate-50 rounded-3xl outline-none font-bold" />
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setIsBookModalOpen(false)} className="flex-1 py-6 bg-slate-100 text-slate-400 font-black uppercase text-xs tracking-widest rounded-3xl">Cancel</button>
                 <button onClick={saveBook} className="flex-1 py-6 bg-[#1F2A44] text-white font-black uppercase text-xs tracking-widest rounded-3xl">Save to Registry</button>
              </div>
           </div>
        </div>
      )}

      {deletingBookId && (
        <ConfirmationModal title="Remove Asset?" message="Delete this book from the collection?" onConfirm={() => { onDeleteBook(deletingBookId); setDeletingBookId(null); }} onCancel={() => setDeletingBookId(null)} />
      )}

      {deletingUserId && (
        <ConfirmationModal title="Delete Student?" message="Remove this student record?" onConfirm={() => { onDeleteUser(deletingUserId.id); setDeletingUserId(null); }} onCancel={() => setDeletingUserId(null)} />
      )}
    </div>
  );
};

export default AdminDashboard;
