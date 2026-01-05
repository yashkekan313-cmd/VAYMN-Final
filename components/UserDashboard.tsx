import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Book } from '../types';
import { getAiRecommendation } from '../geminiService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

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
  const [chatOpen, setChatOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: `VAYMN Core online. Welcome back, ${user.name.split(' ')[0]}. What would you like to stream today?`, sender: 'ai' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const streamCategories = useMemo(() => {
    const cats = [
      { title: 'New Arrivals', filter: (b: Book) => b.isAvailable },
      { title: 'Recommended for You', filter: (b: Book) => b.genre.includes('Fiction') || b.genre.includes('Auto') },
      { title: 'Marathi Streams', filter: (b: Book) => b.title.includes('जावे') || b.id === '4' },
      { title: 'Trending Collection', filter: (b: Book) => true }
    ];
    return cats.map(c => ({
      title: c.title,
      items: books.filter(b => c.filter(b) && (b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase())))
    })).filter(c => c.items.length > 0);
  }, [books, search]);

  const handleChat = async () => {
    if (!query.trim()) return;
    const newMsg: Message = { id: Date.now().toString(), text: query, sender: 'user' };
    setMessages(p => [...p, newMsg]);
    setQuery('');
    setIsTyping(true);
    const res = await getAiRecommendation(query, books);
    setMessages(p => [...p, { id: Date.now().toString(), text: res.text, sender: 'ai' }]);
    setIsTyping(false);
  };

  const calculateDaysLeft = (date?: string) => {
    if (!date) return 0;
    const deadline = new Date(new Date(date).getTime() + 7 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-20 pb-48 animate-fade-in-up">
      {/* Dynamic Search Bar */}
      <div className="relative max-w-5xl mx-auto group">
         <i className="fas fa-search absolute left-10 top-1/2 -translate-y-1/2 text-slate-400 text-2xl group-focus-within:text-[#5DA9E9] transition-colors"></i>
         <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Search authors, titles, or genres..." 
            className="w-full pl-24 pr-12 py-10 bg-white rounded-[56px] shadow-2xl outline-none border border-slate-100 font-bold text-xl focus:scale-[1.02] transition-all"
         />
      </div>

      {/* Categories Streams (Netflix Style) */}
      {streamCategories.map((stream, sIdx) => (
        <section key={stream.title} className="animate-fade-in-up" style={{ animationDelay: `${sIdx * 0.2}s` }}>
           <div className="flex items-center justify-between px-4 mb-10">
              <h2 className="text-4xl font-black text-[#1F2A44] tracking-tighter">{stream.title}</h2>
              <button className="text-xs font-black uppercase text-[#5DA9E9] tracking-[0.4em] hover:opacity-60 transition-opacity">View Stream</button>
           </div>
           <div className="flex gap-10 overflow-x-auto hide-scrollbar pb-10 px-4 snap-x">
              {stream.items.map((book) => (
                <div 
                  key={book.id} 
                  onClick={() => setSelectedBook(book)}
                  className="min-w-[320px] md:min-w-[400px] snap-start stream-card cursor-pointer group"
                >
                   <div className="aspect-[3/4.5] bg-slate-100 rounded-[56px] overflow-hidden shadow-2xl relative border-4 border-transparent group-hover:border-[#5DA9E9]">
                      <img src={book.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                      {!book.isAvailable && (
                        <div className="absolute inset-0 bg-[#0B0F1A]/85 backdrop-blur-md flex items-center justify-center flex-col gap-6 text-white p-10 text-center">
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] bg-red-600 px-6 py-2.5 rounded-full shadow-xl">Stream Busy</span>
                           {book.issuedTo === user.libraryId && (
                             <p className="text-sm font-bold animate-pulse text-[#5DA9E9]">Refresh loan in {calculateDaysLeft(book.issuedDate)} days</p>
                           )}
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-[#1F2A44] to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 p-10 flex flex-col justify-end">
                         <h4 className="text-white font-black text-2xl leading-tight mb-3">{book.title}</h4>
                         <p className="text-[#5DA9E9] text-xs font-black uppercase tracking-[0.3em]">{book.author}</p>
                      </div>
                   </div>
                   <div className="mt-8 text-center px-4">
                      <h4 className="font-black text-xl text-[#1F2A44] line-clamp-1 group-hover:text-[#5DA9E9] transition-colors">{book.title}</h4>
                      <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">{book.author}</p>
                   </div>
                </div>
              ))}
           </div>
        </section>
      ))}

      {/* Floating VAYMN Core AI */}
      <div className="fixed bottom-12 right-12 z-[250] flex flex-col items-end gap-6">
         {chatOpen && (
           <div className="w-[450px] h-[650px] bg-white/95 backdrop-blur-3xl rounded-[64px] shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-white/40 overflow-hidden flex flex-col animate-scale-in">
              <div className="bg-[#1F2A44] p-10 text-white flex items-center justify-between">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[#5DA9E9] rounded-3xl flex items-center justify-center shadow-2xl animate-pulse-soft">
                       <i className="fas fa-brain text-white text-2xl"></i>
                    </div>
                    <div>
                       <h4 className="font-black text-xl tracking-tighter">VAYMN CORE</h4>
                       <span className="text-[9px] font-black uppercase opacity-60 tracking-[0.3em]">AI LIBRARIAN AGENT</span>
                    </div>
                 </div>
                 <button onClick={() => setChatOpen(false)} className="w-12 h-12 rounded-2xl hover:bg-white/10 transition-colors"><i className="fas fa-times text-xl"></i></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/50">
                 {messages.map(m => (
                   <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-6 rounded-[32px] text-sm font-bold leading-relaxed ${m.sender === 'user' ? 'bg-[#1F2A44] text-white rounded-br-none shadow-xl' : 'bg-white shadow-lg border border-slate-100 text-[#1F2A44] rounded-bl-none'}`}>
                        {m.text}
                      </div>
                   </div>
                 ))}
                 {isTyping && <div className="flex justify-start"><div className="bg-white p-5 rounded-full shadow-sm flex gap-2"><span className="w-2 h-2 bg-[#5DA9E9] rounded-full animate-bounce"></span><span className="w-2 h-2 bg-[#5DA9E9] rounded-full animate-bounce [animation-delay:0.2s]"></span><span className="w-2 h-2 bg-[#5DA9E9] rounded-full animate-bounce [animation-delay:0.4s]"></span></div></div>}
                 <div ref={scrollRef} />
              </div>
              <div className="p-10 bg-white border-t flex gap-4">
                 <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="How can VAYMN help?" className="flex-1 bg-slate-100 px-8 py-6 rounded-[24px] text-sm font-bold outline-none border border-transparent focus:border-[#5DA9E9] focus:bg-white transition-all" />
                 <button onClick={handleChat} className="w-16 h-16 bg-[#1F2A44] text-white rounded-[24px] flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"><i className="fas fa-paper-plane text-xl"></i></button>
              </div>
           </div>
         )}
         <button onClick={() => setChatOpen(!chatOpen)} className="w-28 h-28 bg-[#1F2A44] text-white rounded-[44px] flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:scale-110 hover:rotate-12 transition-all animate-float">
            <i className={`fas ${chatOpen ? 'fa-times' : 'fa-wand-magic-sparkles'} text-4xl`}></i>
         </button>
      </div>

      {/* Asset Detail Overlay (Cinematic View) */}
      {selectedBook && (
        <div className="fixed inset-0 z-[300] bg-[#0B0F1A]/95 backdrop-blur-2xl flex items-center justify-center p-8 animate-fade-in">
           <div className="bg-white rounded-[80px] w-full max-w-7xl overflow-hidden shadow-[0_50px_150px_rgba(0,0,0,0.6)] flex flex-col lg:flex-row max-h-[92vh] animate-scale-in border border-white/20">
              <div className="lg:w-5/12 relative bg-slate-900">
                 <img src={selectedBook.coverImage} className="w-full h-full object-cover opacity-90" alt="" />
                 <button onClick={() => setSelectedBook(null)} className="absolute top-12 left-12 w-20 h-20 glass text-white rounded-[32px] flex items-center justify-center hover:scale-110 transition-all border border-white/30"><i className="fas fa-arrow-left text-2xl"></i></button>
              </div>
              <div className="flex-1 p-20 md:p-28 flex flex-col overflow-y-auto">
                 <div className="flex items-center gap-6 mb-10">
                    <span className="px-6 py-2.5 bg-blue-50 text-[#5DA9E9] text-[11px] font-black uppercase tracking-[0.4em] rounded-full shadow-sm">{selectedBook.genre}</span>
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">SHELF ID: {selectedBook.standNumber}</span>
                 </div>
                 <h2 className="text-6xl md:text-8xl font-black text-[#1F2A44] tracking-tighter leading-none mb-8">{selectedBook.title}</h2>
                 <p className="text-2xl font-black text-[#5DA9E9] uppercase tracking-[0.2em] mb-14">{selectedBook.author}</p>
                 <p className="text-xl leading-relaxed text-slate-500 font-medium mb-16 opacity-80">{selectedBook.description}</p>
                 
                 <div className="mt-auto pt-16 border-t border-slate-100 flex flex-col gap-8">
                    {selectedBook.isAvailable ? (
                      <button onClick={() => { onIssueBook(selectedBook.id); setSelectedBook(null); }} className="w-full py-10 bg-[#1F2A44] text-white rounded-[40px] font-black uppercase text-base tracking-[0.5em] shadow-[0_20px_50px_rgba(31,42,68,0.3)] hover:bg-slate-800 transition-all">CHECKOUT ASSET</button>
                    ) : selectedBook.issuedTo === user.libraryId ? (
                      <div className="bg-blue-50/50 p-12 rounded-[40px] flex items-center justify-between border border-blue-100 shadow-sm">
                         <div>
                            <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-3">Time Remaining</p>
                            <p className="text-4xl font-black text-[#1F2A44]">{calculateDaysLeft(selectedBook.issuedDate)} Days</p>
                         </div>
                         <button onClick={() => { onReIssueBook(selectedBook.id); setSelectedBook(null); }} className="px-12 py-6 bg-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] text-[#5DA9E9] shadow-xl hover:bg-[#5DA9E9] hover:text-white transition-all">REFRESH LOAN</button>
                      </div>
                    ) : (
                      <button onClick={() => { onReserveBook(selectedBook.id); setSelectedBook(null); }} className="w-full py-10 bg-orange-500 text-white rounded-[40px] font-black uppercase text-base tracking-[0.5em] shadow-[0_20px_50px_rgba(249,115,22,0.3)] hover:bg-orange-600 transition-all">ADD TO QUEUE</button>
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
