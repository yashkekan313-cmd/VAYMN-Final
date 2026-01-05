
import React, { useState } from 'react';
import { User, Book } from '../types';
import { getBookDetails, generateBookCover } from '../geminiService';
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
  onPenalty: (id: string) => void;
  onGoHome: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  admin, books, users, admins, setBooks, setUsers, setAdmins,
  onDeleteBook, onDeleteUser, onReturnBook, onAddUser, onAddAdmin, onDeleteAdmin, onPenalty
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INVENTORY' | 'DIRECTORY' | 'LOANS'>('OVERVIEW');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState<Partial<Book>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);

  const stats = [
    { label: 'Total Assets', val: books.length, color: 'from-blue-500 to-indigo-600', icon: 'fa-layer-group' },
    { label: 'Active Streams', val: books.filter(b => !b.isAvailable).length, color: 'from-emerald-500 to-teal-600', icon: 'fa-satellite-dish' },
    { label: 'System Members', val: users.length, color: 'from-purple-500 to-pink-600', icon: 'fa-fingerprint' }
  ];

  const handleMagicFill = async () => {
    if (!bookForm.title) return;
    setIsAiLoading(true);
    const details = await getBookDetails(bookForm.title);
    if (details) setBookForm(prev => ({ ...prev, ...details }));
    setIsAiLoading(false);
  };

  const handleAiCover = async () => {
    if (!bookForm.title || !bookForm.description) return;
    setIsAiLoading(true);
    const url = await generateBookCover(bookForm.title, bookForm.description);
    if (url) setBookForm(prev => ({ ...prev, coverImage: url }));
    setIsAiLoading(false);
  };

  const saveBook = async () => {
    const bookData = { ...bookForm, id: bookForm.id || Math.random().toString(36).substr(2, 9), isAvailable: true } as Book;
    const isEdit = books.some(b => b.id === bookData.id);
    if (isEdit) setBooks(books.map(b => b.id === bookData.id ? bookData : b));
    else setBooks([...books, bookData]);
    db.updateBook(bookData);
    setIsBookModalOpen(false);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-16 animate-fade-in-up">
      <aside className="w-full xl:w-96 space-y-4">
        <div className="bg-[#1F2A44] p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
           <p className="text-[10px] font-black uppercase opacity-40 tracking-[0.4em] mb-4">Command Identity</p>
           <h3 className="text-3xl font-black mb-1">{admin.name}</h3>
           <p className="text-[#5DA9E9] font-black text-[10px] uppercase tracking-widest">Lead Librarian Core</p>
        </div>
        
        <div className="bg-white p-4 rounded-[40px] border border-slate-100 shadow-sm space-y-2">
          {['OVERVIEW', 'INVENTORY', 'DIRECTORY', 'LOANS'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`w-full text-left px-10 py-6 rounded-[32px] font-black text-[11px] uppercase tracking-[0.4em] transition-all ${activeTab === tab ? 'bg-[#F7F9FC] text-[#1F2A44] shadow-inner' : 'text-slate-400 hover:text-[#1F2A44] hover:translate-x-2'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 space-y-12">
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
             {stats.map((stat, idx) => (
               <div key={stat.label} className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-3xl flex items-center justify-center text-white text-2xl mb-8 shadow-xl`}>
                    <i className={`fas ${stat.icon}`}></i>
                  </div>
                  <h4 className="text-6xl font-black text-[#1F2A44] mb-2">{stat.val}</h4>
                  <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">{stat.label}</p>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'INVENTORY' && (
          <div className="space-y-10">
             <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div>
                   <h2 className="text-3xl font-black text-[#1F2A44] tracking-tight">ASSET STACKS</h2>
                   <p className="text-xs font-bold text-slate-400">Manage all library resources</p>
                </div>
                <button onClick={() => { setBookForm({}); setIsBookModalOpen(true); }} className="px-10 py-5 bg-[#1F2A44] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Add New Stream</button>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
                {books.map((b) => (
                  <div key={b.id} className="bg-white p-8 rounded-[48px] border border-slate-50 flex gap-8 group hover:shadow-xl transition-all animate-fade-in-up relative overflow-hidden">
                     <img src={b.coverImage} className="w-24 h-36 object-cover rounded-[28px] shadow-lg group-hover:scale-110 transition-transform" alt="" />
                     <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-black text-[#1F2A44] text-lg leading-tight uppercase mb-2 line-clamp-2">{b.title}</h4>
                        <p className="text-[10px] font-black text-[#5DA9E9] uppercase tracking-widest mb-6 truncate">{b.author}</p>
                        <div className="flex gap-3">
                           <button onClick={() => { setBookForm(b); setIsBookModalOpen(true); }} className="px-6 py-3 bg-slate-100 text-[#1F2A44] rounded-xl font-black text-[9px] uppercase hover:bg-[#1F2A44] hover:text-white transition-all">Edit</button>
                           <button onClick={() => onDeleteBook(b.id)} className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'LOANS' && (
          <div className="space-y-10">
             <h2 className="text-4xl font-black text-[#1F2A44] tracking-tight">LIVE STREAMS</h2>
             <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8">
                {books.filter(b => !b.isAvailable).map((b) => (
                  <div key={b.id} className="bg-white p-10 rounded-[56px] border border-slate-100 flex gap-10 items-start shadow-sm hover:shadow-xl transition-all">
                     <img src={b.coverImage} className="w-24 h-36 object-cover rounded-[28px] shadow-xl" alt="" />
                     <div className="flex-1 min-w-0">
                        <h4 className="font-black text-[#1F2A44] text-xl tracking-tight mb-2 line-clamp-2">{b.title}</h4>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6">User: {b.issuedTo}</p>
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Check</span>
                           <button onClick={() => onReturnBook(b.id)} className="px-10 py-4 bg-[#1F2A44] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-600 transition-all">Terminate Loan</button>
                        </div>
                     </div>
                  </div>
                ))}
                {books.filter(b => !b.isAvailable).length === 0 && (
                  <div className="col-span-full py-40 text-center text-slate-300 font-black uppercase tracking-[0.5em] border-4 border-dashed rounded-[64px] animate-pulse">No Active Streams Detected</div>
                )}
             </div>
          </div>
        )}
      </main>

      {/* Book Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[400] bg-[#1F2A44]/80 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[64px] w-full max-w-2xl p-16 space-y-10 shadow-2xl animate-scale-in">
              <div className="flex justify-between items-center">
                 <h3 className="text-4xl font-black text-[#1F2A44]">Stream Config</h3>
                 <button onClick={() => setIsBookModalOpen(false)} className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-times"></i></button>
              </div>
              <div className="space-y-6">
                 <div className="relative">
                    <input value={bookForm.title || ''} onChange={e => setBookForm({...bookForm, title: e.target.value})} className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[32px] outline-none font-black text-lg focus:bg-white transition-all pr-40" placeholder="Stream Title" />
                    <button onClick={handleMagicFill} disabled={isAiLoading} className="absolute right-4 top-4 bottom-4 px-8 bg-gradient-to-r from-[#5DA9E9] to-blue-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all">
                       {isAiLoading ? 'Magic...' : 'AI Meta Fill'}
                    </button>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <input value={bookForm.author || ''} onChange={e => setBookForm({...bookForm, author: e.target.value})} className="w-full p-6 bg-slate-50 border rounded-2xl font-bold" placeholder="Author" />
                    <input value={bookForm.standNumber || ''} onChange={e => setBookForm({...bookForm, standNumber: e.target.value})} className="w-full p-6 bg-slate-50 border rounded-2xl font-bold" placeholder="Shelf ID" />
                 </div>
                 <textarea value={bookForm.description || ''} onChange={e => setBookForm({...bookForm, description: e.target.value})} className="w-full p-8 bg-slate-50 border rounded-[32px] font-bold min-h-[160px]" placeholder="Synopsis..."></textarea>
                 <button onClick={handleAiCover} disabled={isAiLoading} className="w-full py-6 bg-[#F7F9FC] border-2 border-dashed border-slate-200 rounded-[32px] font-black text-[10px] uppercase text-[#5DA9E9] tracking-[0.4em] hover:bg-blue-50 transition-all">
                    {isAiLoading ? 'Synthesizing...' : 'Generate AI Stream Cover'}
                 </button>
              </div>
              <button onClick={saveBook} className="w-full py-8 bg-[#1F2A44] text-white rounded-[32px] font-black uppercase tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">Confirm Asset</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
