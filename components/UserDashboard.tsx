import React, { useState, useMemo } from 'react';
import { User, Book } from '../types';

interface UserDashboardProps {
  user: User;
  books: Book[];
  onIssueBook: (id: string) => void;
  onReIssueBook: (id: string) => void;
  onReserveBook: (id: string) => void;
  onGoHome: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, books, onIssueBook, onReIssueBook, onReserveBook }) => {
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const level = Math.floor((user.xp || 0) / 100) + 1;
  const xpInLevel = (user.xp || 0) % 100;

  const getLevelName = (lvl: number) => {
    const ranks = ["Amateur", "Novice", "Apprentice", "Scholar", "Bibliophile", "Archivist", "Researcher", "Sage", "Legend", "Grandmaster"];
    return ranks[Math.min(lvl - 1, 9)];
  };

  const categorizedBooks = useMemo(() => {
    const categories: Record<string, Book[]> = {};
    const safeBooks = Array.isArray(books) ? books : [];
    
    safeBooks.forEach(book => {
      const genre = book.genre || 'Other';
      if (!categories[genre]) categories[genre] = [];
      if (
        book.title.toLowerCase().includes(search.toLowerCase()) ||
        book.author.toLowerCase().includes(search.toLowerCase())
      ) {
        categories[genre].push(book);
      }
    });
    return Object.entries(categories).sort();
  }, [books, search]);

  const calculateDaysLeft = (date?: string) => {
    if (!date) return 0;
    const deadline = new Date(new Date(date).getTime() + 7 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-16 animate-fade-in-scale">
      {/* Dynamic Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 glass-panel p-10 rounded-[48px] flex flex-col md:flex-row items-center gap-10">
            <div className="w-28 h-28 bg-[#1F2A44] text-white rounded-[40px] flex flex-col items-center justify-center shadow-2xl relative">
               <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Rank</span>
               <span className="text-5xl font-bold leading-none heading-serif">{level}</span>
               <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#5DA9E9] rounded-full flex items-center justify-center text-[10px] font-black">XP</div>
            </div>
            <div className="flex-1 w-full text-center md:text-left">
               <p className="text-[10px] font-bold text-[#5DA9E9] uppercase tracking-widest mb-2">Member Status</p>
               <h4 className="text-4xl font-bold text-[#1F2A44] mb-5 heading-serif">{getLevelName(level)}</h4>
               <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-[#5DA9E9] progress-glow transition-all duration-1000" style={{ width: `${xpInLevel}%` }}></div>
               </div>
               <div className="flex justify-between">
                  <span className="text-xs font-bold text-slate-400">{xpInLevel} XP Earned</span>
                  <span className="text-xs font-bold text-[#5DA9E9]">{100 - xpInLevel} XP to next rank</span>
               </div>
            </div>
         </div>
         <div className="lg:col-span-4 glass-panel p-10 rounded-[48px] flex flex-wrap gap-4 items-center justify-center">
            {(user.badges || []).map((b, i) => (
              <div key={i} className="w-14 h-14 bg-white shadow-sm rounded-2xl flex items-center justify-center text-[#5DA9E9] border border-blue-50 hover:scale-110 transition-transform">
                <i className="fas fa-award text-2xl"></i>
              </div>
            ))}
            {(user.badges || []).length === 0 && <p className="text-sm font-medium text-slate-300 italic">No achievements yet</p>}
         </div>
      </div>

      {/* Library Browser */}
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <h2 className="text-3xl font-bold heading-serif">Digital Archives</h2>
           <div className="relative w-full md:w-96">
              <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input 
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Find a title or author..." 
                className="w-full pl-14 pr-8 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium"
              />
           </div>
        </div>

        {categorizedBooks.map(([genre, items], gIdx) => (
          <section key={genre} className="stagger-item" style={{ animationDelay: `${gIdx * 0.1}s` }}>
             <div className="flex items-center gap-4 mb-8">
                <h3 className="text-xl font-bold text-[#1F2A44] heading-serif">{genre}</h3>
                <div className="h-[1px] flex-1 bg-slate-100"></div>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                {items.map((book, bIdx) => (
                  <div 
                    key={book.id} 
                    onClick={() => setSelectedBook(book)}
                    className="group cursor-pointer stagger-item"
                    style={{ animationDelay: `${(gIdx * 0.1) + (bIdx * 0.05)}s` }}
                  >
                     <div className="aspect-[3/4.5] overflow-hidden rounded-[32px] mb-4 relative shadow-md transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-2 border border-slate-100">
                        <img src={book.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={book.title} />
                        {!book.isAvailable && (
                          <div className="absolute inset-0 bg-[#1F2A44]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
                             <span className="text-[10px] font-black text-white uppercase tracking-widest bg-red-500 px-3 py-1.5 rounded-lg shadow-xl">Borrowed</span>
                          </div>
                        )}
                     </div>
                     <h5 className="font-bold text-sm text-[#1F2A44] truncate heading-serif px-1">{book.title}</h5>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{book.author}</p>
                  </div>
                ))}
             </div>
          </section>
        ))}
      </div>

      {/* Book Detail Viewer (Modal) */}
      {selectedBook && (
        <div className="fixed inset-0 z-[400] bg-[#1F2A44]/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[60px] w-full max-w-5xl flex flex-col md:flex-row overflow-hidden shadow-2xl animate-fade-in-scale">
              <div className="md:w-5/12 relative">
                 <img src={selectedBook.coverImage} className="w-full h-full object-cover" alt="" />
                 <button onClick={() => setSelectedBook(null)} className="absolute top-10 left-10 w-12 h-12 glass-panel text-white rounded-2xl flex items-center justify-center hover:bg-white hover:text-[#1F2A44] transition-all"><i className="fas fa-times"></i></button>
              </div>
              <div className="flex-1 p-12 md:p-16 flex flex-col overflow-y-auto max-h-[90vh]">
                 <div className="flex gap-3 mb-8">
                    <span className="px-4 py-1.5 bg-blue-50 text-[#5DA9E9] text-[10px] font-black uppercase tracking-widest rounded-full">{selectedBook.genre}</span>
                    <span className="px-4 py-1.5 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full">{selectedBook.language}</span>
                 </div>
                 <h2 className="text-4xl md:text-5xl font-bold text-[#1F2A44] mb-3 heading-serif leading-tight">{selectedBook.title}</h2>
                 <p className="text-xl font-bold text-[#5DA9E9] mb-10">{selectedBook.author}</p>
                 <div className="flex-1 mb-12">
                    <p className="text-lg text-slate-500 font-medium leading-relaxed italic border-l-4 border-slate-100 pl-6">"{selectedBook.description}"</p>
                 </div>
                 
                 <div className="pt-8 border-t border-slate-50">
                    {selectedBook.isAvailable ? (
                      <button onClick={() => { onIssueBook(selectedBook.id); setSelectedBook(null); }} className="w-full py-6 bg-[#1F2A44] text-white rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95">Issue to my account</button>
                    ) : selectedBook.issuedTo === user.libraryId ? (
                      <div className="bg-blue-50 p-8 rounded-[40px] flex items-center justify-between shadow-inner">
                         <div>
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Due in</p>
                            <p className="text-3xl font-bold text-[#1F2A44]">{calculateDaysLeft(selectedBook.issuedDate)} Days</p>
                         </div>
                         <button onClick={() => { onReIssueBook(selectedBook.id); setSelectedBook(null); }} className="px-10 py-5 bg-white text-[#1F2A44] rounded-2xl font-black text-[10px] uppercase shadow-md hover:bg-[#5DA9E9] hover:text-white transition-all">Renew Loan</button>
                      </div>
                    ) : (
                      <button onClick={() => { onReserveBook(selectedBook.id); setSelectedBook(null); }} className="w-full py-6 bg-orange-500 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-orange-600 transition-all">Join Waitlist</button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
