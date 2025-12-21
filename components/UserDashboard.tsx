
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Book } from '../types';
import { getBookInsight, getAiRecommendation } from '../geminiService';
import ConfirmationModal from './ConfirmationModal';

interface UserDashboardProps {
  user: User;
  books: Book[];
  onIssueBook: (id: string) => void;
  onGoHome: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, books, onIssueBook }) => {
  const [search, setSearch] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState<Book | null>(null);

  // AI Chat State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiHistory, setAiHistory] = useState<{role: 'user' | 'bot', text: string, links?: any[]}[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [aiHistory]);

  // CRITICAL: Reset insight state whenever a new book is handled to prevent data carry-over
  const handleOpenBook = (book: Book) => {
    setInsight(null); 
    setSelectedBook(book);
  };

  const filteredBooks = useMemo(() => 
    books.filter(b => 
      b.title.toLowerCase().includes(search.toLowerCase()) || 
      b.author.toLowerCase().includes(search.toLowerCase())
    ), [books, search]
  );

  const handleAiAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    const q = aiQuery; 
    setAiQuery(''); 
    setAiHistory(prev => [...prev, { role: 'user', text: q }]);
    setIsAiThinking(true);
    
    // Improved logic for AI Librarian
    const res = await getAiRecommendation(q, books);
    setAiHistory(prev => [...prev, { role: 'bot', text: res.text, links: res.links }]);
    setIsAiThinking(false);
  };

  const fetchInsight = async (book: Book) => {
    setIsLoadingInsight(true);
    setInsight(null); // Clear previous immediately
    try {
      const text = await getBookInsight(book.title, book.author);
      setInsight(text);
    } finally {
      setIsLoadingInsight(false);
    }
  };

  return (
    <div className="space-y-12 pb-32">
      {/* Welcome Banner */}
      <div className="bg-white p-10 md:p-14 rounded-[48px] border border-[#E5EAF0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="max-w-xl text-center md:text-left">
           <h1 className="text-4xl md:text-6xl font-black text-[#1F2A44] tracking-tight mb-4">Welcome, {user.name.split(' ')[0]}</h1>
           <p className="text-slate-400 font-medium text-base md:text-lg">Discover your next academic or leisure asset from the VAYMN stacks.</p>
        </div>
        <div className="w-full md:w-[450px] relative group">
          <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#5DA9E9] transition-colors"></i>
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search by title, author, or ID..." 
            className="w-full pl-16 pr-8 py-6 bg-[#F7F9FC] rounded-3xl outline-none border border-[#E5EAF0] text-sm font-bold focus:border-[#5DA9E9] focus:ring-4 focus:ring-[#5DA9E9]/5 transition-all shadow-inner" 
          />
        </div>
      </div>

      {/* Collection Grid */}
      <section>
        <div className="flex items-center justify-between mb-10 px-6">
          <h3 className="text-xl font-black text-[#1F2A44] uppercase tracking-[0.2em]">Library Stacks</h3>
          <span className="px-5 py-2 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredBooks.length} Assets Found</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-8 md:gap-12">
          {filteredBooks.map(book => (
            <div key={book.id} onClick={() => handleOpenBook(book)} className="group cursor-pointer">
              <div className="aspect-[3/4.2] rounded-[40px] overflow-hidden shadow-lg group-hover:shadow-2xl group-hover:-translate-y-4 transition-all duration-500 relative bg-white border border-[#E5EAF0]">
                <img src={book.coverImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={book.title} />
                {!book.isAvailable && (
                  <div className="absolute inset-0 bg-[#1F2A44]/70 backdrop-blur-[3px] flex items-center justify-center">
                    <span className="px-5 py-2.5 bg-white text-[#1F2A44] text-[9px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl">On Loan</span>
                  </div>
                )}
              </div>
              <div className="mt-6 px-2">
                <h4 className="font-bold text-sm text-[#1F2A44] line-clamp-1 group-hover:text-[#5DA9E9] transition-colors">{book.title}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider truncate">{book.author}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Book Insight Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-[150] bg-[#1F2A44]/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white rounded-[56px] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-auto md:max-h-[85vh]">
              <div className="md:w-[40%] bg-slate-100 relative group overflow-hidden">
                 <img src={selectedBook.coverImage} className="w-full h-full object-cover" alt="" />
                 <button onClick={() => setSelectedBook(null)} className="absolute top-10 left-10 w-14 h-14 bg-white/90 backdrop-blur shadow-2xl rounded-2xl flex items-center justify-center hover:scale-110 transition-all"><i className="fas fa-arrow-left"></i></button>
              </div>
              <div className="flex-1 p-12 md:p-18 flex flex-col overflow-y-auto">
                 <div className="flex flex-wrap items-center gap-4 mb-10">
                    <span className="px-5 py-2.5 bg-[#F7F9FC] border text-[9px] font-black uppercase tracking-widest rounded-2xl text-slate-500">{selectedBook.genre}</span>
                    <span className="px-5 py-2.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-2xl">Location: {selectedBook.standNumber}</span>
                 </div>
                 
                 <h2 className="text-5xl font-black text-[#1F2A44] leading-tight mb-5 line-clamp-2" title={selectedBook.title}>{selectedBook.title}</h2>
                 <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em] mb-12">Authored By {selectedBook.author}</p>
                 
                 <div className="flex-1 space-y-10">
                    <div className="p-10 bg-[#F7F9FC] rounded-[44px] border border-[#E5EAF0]">
                       <div className="flex justify-between items-center mb-6">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#5DA9E9]">AI Asset Intelligence</h5>
                          {!insight && !isLoadingInsight && (
                            <button onClick={() => fetchInsight(selectedBook)} className="text-[10px] font-black text-slate-400 uppercase hover:text-[#5DA9E9] transition-all"><i className="fas fa-magic mr-2"></i>Consult AI</button>
                          )}
                       </div>
                       {isLoadingInsight ? (
                         <div className="flex items-center gap-5 py-4">
                           <div className="w-6 h-6 border-4 border-[#5DA9E9] border-t-transparent rounded-full animate-spin"></div>
                           <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Consulting VAYMN Core...</span>
                         </div>
                       ) : (
                         <p className="text-base leading-relaxed text-[#1F2A44]/80 font-medium">
                            {insight || selectedBook.description || "The catalog entry for this asset is awaiting a professional synopsis."}
                         </p>
                       )}
                    </div>
                 </div>

                 <div className="mt-12">
                    {selectedBook.isAvailable ? (
                      <button onClick={() => { setConfirmIssue(selectedBook); setSelectedBook(null); }} className="w-full py-7 bg-[#1F2A44] text-white rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-slate-800 hover:-translate-y-1 transition-all">Proceed to Checkout</button>
                    ) : (
                      <div className="w-full py-7 bg-red-50 text-red-500 text-center rounded-3xl font-black uppercase text-xs tracking-[0.3em] border border-red-100">Asset Unavailable</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Floating AI Librarian */}
      <div className="fixed bottom-10 right-10 z-[100] flex flex-col items-end gap-5">
         {isAiOpen && (
           <div className="w-[380px] md:w-[450px] h-[600px] bg-white rounded-[44px] shadow-[0_40px_120px_rgba(0,0,0,0.2)] border border-[#E5EAF0] flex flex-col overflow-hidden animate-fade-in">
             <div className="p-8 bg-[#1F2A44] text-white flex justify-between items-center">
               <div className="flex items-center gap-4">
                 <div className="w-3.5 h-3.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.6)]"></div>
                 <span className="text-[11px] font-black uppercase tracking-[0.3em]">VAYMN Librarian</span>
               </div>
               <button onClick={() => setIsAiOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"><i className="fas fa-times"></i></button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
               {aiHistory.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-8">
                    <div className="w-24 h-24 bg-blue-50 text-[#5DA9E9] rounded-[40px] flex items-center justify-center text-4xl shadow-inner border border-blue-100"><i className="fas fa-book-reader"></i></div>
                    <div>
                      <h4 className="font-black text-[#1F2A44] text-xl mb-3">Knowledge Awaits</h4>
                      <p className="text-[13px] font-medium text-slate-400 italic">"Ask me about specific books, authors, or for recommendations based on your academic path."</p>
                    </div>
                 </div>
               )}
               {aiHistory.map((h, i) => (
                 <div key={i} className={`flex ${h.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[90%] text-[13px] p-6 rounded-[32px] leading-relaxed shadow-sm ${h.role === 'user' ? 'bg-[#1F2A44] text-white rounded-tr-none' : 'bg-[#F7F9FC] text-[#1F2A44] border border-[#E5EAF0] rounded-tl-none font-medium'}`}>
                     {h.text}
                     {h.links && h.links.length > 0 && (
                       <div className="mt-5 pt-5 border-t border-[#E5EAF0]">
                         <p className="font-black mb-3 text-[#5DA9E9] text-[9px] uppercase tracking-widest">Grounding Citations:</p>
                         {h.links.slice(0, 3).map((link: any, idx) => (
                           link.web && (
                             <a key={idx} href={link.web.uri} target="_blank" rel="noopener noreferrer" className="block truncate text-[#5DA9E9] hover:underline mb-3 font-bold">
                               <i className="fas fa-link mr-2 text-[10px]"></i>{link.web.title || "External Research"}
                             </a>
                           )
                         ))}
                       </div>
                     )}
                   </div>
                 </div>
               ))}
               {isAiThinking && (
                 <div className="flex justify-start">
                    <div className="bg-[#F7F9FC] p-6 rounded-[32px] rounded-tl-none border border-[#E5EAF0] flex gap-2.5">
                       <div className="w-2 h-2 bg-[#5DA9E9] rounded-full animate-bounce"></div>
                       <div className="w-2 h-2 bg-[#5DA9E9] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                       <div className="w-2 h-2 bg-[#5DA9E9] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                 </div>
               )}
               <div ref={chatEndRef} />
             </div>
             <form onSubmit={handleAiAsk} className="p-8 border-t border-[#E5EAF0] flex gap-5 bg-white">
               <input 
                 value={aiQuery} 
                 onChange={e => setAiQuery(e.target.value)} 
                 placeholder="Search the repository..." 
                 className="flex-1 bg-[#F7F9FC] px-7 py-5 rounded-2xl outline-none border border-[#E5EAF0] text-sm font-bold focus:border-[#5DA9E9] transition-all" 
               />
               <button type="submit" className="w-16 h-16 bg-[#1F2A44] text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-all shadow-2xl shadow-[#1F2A44]/30">
                 <i className="fas fa-paper-plane"></i>
               </button>
             </form>
           </div>
         )}
         <button onClick={() => setIsAiOpen(!isAiOpen)} className="w-20 h-20 bg-[#1F2A44] text-white rounded-[32px] flex items-center justify-center shadow-[0_25px_80px_rgba(31,42,68,0.4)] hover:scale-110 transition-all border-4 border-white relative">
            <i className="fas fa-wand-sparkles text-2xl"></i>
            {!isAiOpen && <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#5DA9E9] rounded-full border-2 border-white animate-bounce"></div>}
         </button>
      </div>

      {confirmIssue && (
        <ConfirmationModal 
          title="Confirm Loan" 
          message={`Are you sure you wish to borrow "${confirmIssue.title}"? Please return it within the standard loan period.`} 
          onConfirm={() => { onIssueBook(confirmIssue.id); setConfirmIssue(null); }} 
          onCancel={() => setConfirmIssue(null)} 
        />
      )}
    </div>
  );
};

export default UserDashboard;
