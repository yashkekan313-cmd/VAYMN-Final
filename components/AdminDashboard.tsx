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
  admin, books, users, onDeleteBook, onReturnBook, onPenalty
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INVENTORY' | 'LOANS'>('OVERVIEW');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState<Partial<Book>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);

  const stats = [
    { label: 'Total Assets', val: books.length, color: 'from-blue-600 to-indigo-700', icon: 'fa-book-atlas' },
    { label: 'Live Streams', val: books.filter(b => !b.isAvailable).length, color: 'from-emerald-500 to-teal-700', icon: 'fa-tower-broadcast' },
    { label: 'System Health', val: '98%', color: 'from-purple-600 to-pink-700', icon: 'fa-heart-pulse' }
  ];

  const handleMagicFill = async () => {
    if (!bookForm.title) return;
    setIsAiLoading(true);
    const details = await getBookDetails(bookForm.title);
    if (details) setBookForm(prev => ({ ...prev, ...details }));
    setIsAiLoading(false);
  };

  const saveBook = async () => {
    const bookData = { ...bookForm, id: bookForm.id || Math.random().toString(36).substr(2, 9), isAvailable: true } as Book;
    db.updateBook(bookData);
    setIsBookModalOpen(false);
    window.location.reload(); // Simple refresh for state update
  };

  return (
    <div className="flex flex-col xl:flex-row gap-20 animate-fade-in-up">
      <aside className="w-full xl:w-[450px] space-y-6">
        <div className="bg-[#1F2A44] p-12 rounded-[64px] text-white shadow-2xl relative overflow-hidden group border border-white/10">
           <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-700"></div>
           <p className="text-[10px] font-black uppercase opacity-40 tracking-[0.5em] mb-6">Command Authority</p>
           <h3 className="text-4xl font-black mb-2 tracking-tighter">{admin.name}</h3>
           <p className="text-[#5DA9E9] font-black text-xs uppercase tracking-[0.3em]">System Administrator</p>
        </div>
        
        <div className="bg-white p-6 rounded-[56px] border border-slate-100 shadow-xl space-y-3">
          {['OVERVIEW', 'INVENTORY', 'LOANS'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)} 
              className={`w-full text-left px-12 py-8 rounded-[40px] font-black text-xs uppercase tracking-[0.5em] transition-all ${activeTab === tab ? 'bg-[#F7F9FC] text-[#1F2A44] shadow-inner' : 'text-slate-400 hover:text-[#1F2A44] hover:translate-x-3'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 space-y-16">
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
             {stats.map((stat, idx) => (
               <div key={stat.label} className="bg-white p-14 rounded-[72px] border border-slate-100 shadow-xl hover:shadow-2xl transition-all animate-fade-in-up" style={{ animationDelay: `${idx * 0.15}s` }}>
                  <div className={`w-20 h-20 bg-gradient-to-br ${stat.color} rounded-[32px] flex items-center justify-center text-white text-3xl mb-10 shadow-2xl`}>
                    <i className={`fas ${stat.icon}`}></i>
                  </div>
                  <h4 className="text-7xl font-black text-[#1F2A44] tracking-tighter mb-4">{stat.val}</h4>
                  <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em]">{stat.label}</p>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'INVENTORY' && (
          <div className="space-y-12">
             <div className="flex justify-between items-center bg-white p-10 rounded-[56px] border border-slate-100 shadow-xl">
                <div>
                   <h2 className="text-4xl font-black text-[#1F2A44] tracking-tighter">ASSET COMMAND</h2>
                   <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest">Global Resource Repository</p>
                </div>
                <button onClick={() => { setBookForm({}); setIsBookModalOpen(true); }} className="px-12 py-6 bg-[#1F2A44] text-white rounded-[28px] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:scale-105 active:scale-95 transition-all">New Resource</button>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-10">
                {books.map((b) => (
                  <div key={b.id} className="bg-white p-10 rounded-[64px] border border-slate-50 flex gap-10 group hover:shadow-2xl transition-all animate-fade-in-up">
                     <img src={b.coverImage} className="w-28 h-40 object-cover rounded-[32px] shadow-2xl group-hover:scale-110 transition-transform duration-500 flex-shrink-0" alt="" />
                     <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-black text-[#1F2A44] text-xl tracking-tight uppercase mb-2 line-clamp-2 leading-tight">{b.title}</h4>
                        <p className="text-[10px] font-black text-[#5DA9E9] uppercase tracking-[0.3em] mb-8 truncate">{b.author}</p>
                        <div className="flex gap-4">
                           <button onClick={() => { setBookForm(b); setIsBookModalOpen(true); }} className="flex-1 py-4 bg-slate-100 text-[#1F2A44] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#1F2A44] hover:text-white transition-all">Config</button>
                           <button onClick={() => onDeleteBook(b.id)} className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-lg"></i></button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'LOANS' && (
          <div className="space-y-12">
             <h2 className="text-5xl font-black text-[#1F2A44] tracking-tighter">LIVE MONITOR</h2>
             <div className="grid grid-cols-1 2xl:grid-cols-2 gap-10">
                {books.filter(b => !b.isAvailable).map((b) => (
                  <div key={b.id} className="bg-white p-12 rounded-[72px] border border-slate-100 flex gap-12 items-start shadow-xl hover:shadow-2xl transition-all">
                     <img src={b.coverImage} className="w-28 h-40 object-cover rounded-[36px] shadow-2xl" alt="" />
                     <div className="flex-1 min-w-0">
                        <h4 className="font-black text-[#1F2A44] text-2xl tracking-tight mb-3 line-clamp-2 leading-tight">{b.title}</h4>
                        <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] mb-8">Access: {b.issuedTo}</p>
                        <div className="flex items-center gap-6">
                           <button onClick={() => onReturnBook(b.id)} className="px-12 py-5 bg-[#1F2A44] text-white rounded-3xl font-black text-xs uppercase tracking-[0.4em] hover:bg-emerald-600 transition-all shadow-xl">End Stream</button>
                           <button onClick={() => onPenalty(b.issuedTo!)} className="px-6 py-5 text-red-500 font-black text-[10px] uppercase tracking-widest hover:opacity-60">Issue Alert</button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {/* Futuristic Config Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 z-[400] bg-[#0B0F1A]/90 backdrop-blur-3xl flex items-center justify-center p-8 animate-fade-in">
           <div className="bg-white rounded-[80px] w-full max-w-3xl p-20 space-y-12 shadow-[0_50px_150px_rgba(0,0,0,0.5)] animate-scale-in">
              <div className="flex justify-between items-center">
                 <h3 className="text-5xl font-black text-[#1F2A44] tracking-tighter">Stream Configuration</h3>
                 <button onClick={() => setIsBookModalOpen(false)} className="w-16 h-16 rounded-[28px] bg-slate-100 text-slate-400 hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-times text-xl"></i></button>
              </div>
              <div className="space-y-8">
                 <div className="relative">
                    <input value={bookForm.title || ''} onChange={e => setBookForm({...bookForm, title: e.target.value})} className="w-full p-10 bg-slate-50 border border-slate-100 rounded-[40px] outline-none font-black text-2xl focus:bg-white transition-all pr-44" placeholder="Resource Title" />
                    <button onClick={handleMagicFill} disabled={isAiLoading} className="absolute right-5 top-5 bottom-5 px-10 bg-gradient-to-r from-[#5DA9E9] to-blue-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                       {isAiLoading ? 'Synthesizing...' : 'AI Meta Fill'}
                    </button>
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <input value={bookForm.author || ''} onChange={e => setBookForm({...bookForm, author: e.target.value})} className="w-full p-8 bg-slate-50 border rounded-[32px] font-bold text-lg" placeholder="Creator/Author" />
                    <input value={bookForm.standNumber || ''} onChange={e => setBookForm({...bookForm, standNumber: e.target.value})} className="w-full p-8 bg-slate-50 border rounded-[32px] font-bold text-lg" placeholder="Storage ID" />
                 </div>
                 <textarea value={bookForm.description || ''} onChange={e => setBookForm({...bookForm, description: e.target.value})} className="w-full p-10 bg-slate-50 border rounded-[40px] font-bold text-lg min-h-[180px]" placeholder="Asset description..."></textarea>
              </div>
              <button onClick={saveBook} className="w-full py-10 bg-[#1F2A44] text-white rounded-[40px] font-black uppercase tracking-[0.6em] shadow-[0_20px_60px_rgba(31,42,68,0.4)] hover:scale-[1.02] active:scale-95 transition-all text-sm">Synchronize Resource</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
