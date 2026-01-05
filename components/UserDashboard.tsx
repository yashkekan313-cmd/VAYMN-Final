
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
    { id: '1', text: `Access Granted. I am VAYMN Core. Search for a stream or ask for a recommendation.`, sender: 'ai' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const streams = useMemo(() => {
    const categories = ['Trending Now', 'Recommended for You', 'Marathi Collections', 'New Arrivals'];
    return categories.map(cat => ({
      title: cat,
      items: books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase()))
    }));
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

  const calculateRemaining = (date?: string) => {
    if (!date) return 0;
    const deadline = new Date(new Date(date).getTime() + 7 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-16 pb-40 animate-fade-in-up">
      {/* Search Focus */}
      <div className="relative max-w-4xl mx-auto">
         <i className="fas fa-search absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 text-xl"></i>
         <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder="Search streams, authors, or genres..." 
            className="w-full pl-20 pr-10 py-8 bg-white rounded-[40px] shadow-2xl outline-none border border-slate-100 font-bold text-lg focus:scale-[1.01] transition-all"
         />
      </div>

      {/* Categories Streams */}
      {streams.map((stream, sIdx) => (
        <section key={stream.title} className="space-y-8 animate-fade-in-up" style={{ animationDelay: `${sIdx * 0.15}s` }}>
           <div className="flex items-center justify-between px-2">
              <h2 className="text-3xl font-black text-[#1F2A44] tracking-tight">{stream.title}</h2>
              <button className="text-[10px] font-black uppercase text-[#5DA9E9] tracking-[0.3em] hover:opacity-70 transition-opacity">View All</button>
           </div>
           <div className="flex gap-8 overflow-x-auto hide-scrollbar pb-10 px-2 snap-x">
              {stream.items.map((book) => (
                <div 
                  key={book.id} 
                  onClick={() => setSelectedBook(book)}
                  className="min-w-[280px] md:min-w-[320px] snap-start stream-card cursor-pointer group"
                >
                   <div className="aspect-[2/3] bg-slate-100 rounded-[48px] overflow-hidden shadow-xl relative border-4 border-transparent group-hover:border-[#5DA9E9]">
                      <img src={book.coverImage} className="w-full h-full object-cover" alt="" />
                      {!book.isAvailable && (
                        <div className="absolute inset-0 bg-[#1F2A44]/80 backdrop-blur-sm flex items-center justify-center flex-col gap-4 text-white p-6 text-center">
                           <span className="text-[10px] font-black uppercase tracking-widest bg-red-500 px-4 py-1.5 rounded-full">Stream Busy</span>
                           {book.issuedTo === user.libraryId && (
                             <p className="text-xs font-bold animate-pulse">Expires in {calculateRemaining(book.issuedDate)} days</p>
                           )}
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-[#1F2A44]/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-8 flex flex-col justify-end">
                         <h4 className="text-white font-bold text-lg leading-tight mb-2">{book.title}</h4>
                         <p className="text-[#5DA9E9] text-xs font-black uppercase tracking-widest">{book.author}</p>
                      </div>
                   </div>
                   <div className="mt-6 text-center group-hover:translate-y-2 transition-transform">
                      <h4 className="font-bold text-[#1F2A44] line-clamp-1">{book.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{book.author}</p>
                   </div>
                </div>
              ))}
           </div>
        </section>
      ))}

      {/* Floating AI Core */}
      <div className="fixed bottom-12 right-12 z-[250] flex flex-col items-end gap-6">
         {chatOpen && (
           <div className="w-[400px] h-[600px] bg-white/90 backdrop-blur-2xl rounded-[56px] shadow-[0_40px_100px_rgba(31,42,68,0.25)] border border-white/40 overflow-hidden flex flex-col animate-scale-in">
              <div className="bg-[#1F2A44] p-8 text-white flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#5DA9E9] rounded-2xl flex items-center justify-center shadow-lg animate-pulse-soft">
                       <i className="fas fa-sparkles"></i>
                    </div>
                    <div>
                       <h4 className="font-black text-sm tracking-tight">VAYMN CORE</h4>
                       <span className="text-[8px] font-black uppercase opacity-60 tracking-widest">Neural Librarian Agent</span>
                    </div>
                 </div>
                 <button onClick={() => setChatOpen(false)} className="w-10 h-10 rounded-xl hover:bg-white/10 transition-colors"><i className="fas fa-times"></i></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                 {messages.map(m => (
                   <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-5 rounded-[28px] text-sm font-medium ${m.sender === 'user' ? 'bg-[#1F2A44] text-white rounded-br-none' : 'bg-white shadow-sm border border-slate-100 text-[#1F2A44] rounded-bl-none'}`}>
                        {m.text}
                      </div>
                   </div>
                 ))}
                 {isTyping && <div className="flex justify-start"><div className="bg-slate-50 p-4 rounded-full animate-pulse text-xs font-bold text-slate-400">Thinking...</div></div>}
                 <div ref={scrollRef} />
              </div>
              <div className="p-8 bg-white border-t flex gap-4">
                 <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Ask VAYMN anything..." className="flex-1 bg-slate-50 px-6 py-4 rounded-2xl text-xs font-bold outline-none border border-transparent focus:border-[#5DA9E9] transition-all" />
                 <button onClick={handleChat} className="w-14 h-14 bg-[#1F2A44] text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"><i className="fas fa-paper-plane"></i></button>
              </div>
           </div>
         )}
         <button onClick={() => setChatOpen(!chatOpen)} className="w-24 h-24 bg-gradient-to-tr from-[#1F2A44] to-blue-900 text-white rounded-[40px] flex items-center justify-center shadow-2xl hover:scale-110 hover:rotate-12 transition-all animate-float">
            <i className={`fas ${chatOpen ? 'fa-times' : 'fa-brain'} text-3xl`}></i>
         </button>
      </div>

      {/* Asset Detail Overlay */}
      {selectedBook && (
        <div className="fixed inset-0 z-[300] bg-[#1F2A44]/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-white rounded-[64px] w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col lg:flex-row max-h-[90vh] animate-scale-in border border-white/20">
              <div className="lg:w-2/5 relative">
                 <img src={selectedBook.coverImage} className="w-full h-full object-cover" alt="" />
                 <button onClick={() => setSelectedBook(null)} className="absolute top-10 left-10 w-16 h-16 bg-white/20 backdrop-blur-xl border border-white/40 text-white rounded-3xl flex items-center justify-center hover:scale-110 transition-all"><i className="fas fa-arrow-left"></i></button>
              </div>
              <div className="flex-1 p-16 md:p-24 flex flex-col overflow-y-auto">
                 <div className="flex items-center gap-4 mb-8">
                    <span className="px-4 py-1.5 bg-blue-50 text-[#5DA9E9] text-[10px] font-black uppercase tracking-widest rounded-full">{selectedBook.genre}</span>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Shelf ID: {selectedBook.standNumber}</span>
                 </div>
                 <h2 className="text-5xl md:text-7xl font-black text-[#1F2A44] tracking-tighter leading-none mb-6">{selectedBook.title}</h2>
                 <p className="text-xl font-bold text-[#5DA9E9] uppercase tracking-[0.2em] mb-12">{selectedBook.author}</p>
                 <p className="text-lg leading-relaxed text-slate-500 font-medium mb-16">{selectedBook.description}</p>
                 
                 <div className="mt-auto flex flex-col gap-6">
                    {selectedBook.isAvailable ? (
                      <button onClick={() => { onIssueBook(selectedBook.id); setSelectedBook(null); }} className="w-full py-8 bg-[#1F2A44] text-white rounded-[32px] font-black uppercase text-sm tracking-[0.4em] shadow-2xl hover:bg-slate-800 transition-all">START STREAM</button>
                    ) : selectedBook.issuedTo === user.libraryId ? (
                      <div className="flex flex-col gap-4">
                        <div className="bg-blue-50 p-8 rounded-[32px] flex items-center justify-between border border-blue-100">
                           <div>
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Stream Remaining</p>
                              <p className="text-2xl font-black text-[#1F2A44]">{calculateRemaining(selectedBook.issuedDate)} Days</p>
                           </div>
                           <button onClick={() => { onReIssueBook(selectedBook.id); setSelectedBook(null); }} className="px-10 py-5 bg-white rounded-2xl font-black text-[10px] uppercase tracking-widest text-[#5DA9E9] shadow-lg hover:bg-[#5DA9E9] hover:text-white transition-all">REFRESH LOAN</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { onReserveBook(selectedBook.id); setSelectedBook(null); }} className="w-full py-8 bg-orange-500 text-white rounded-[32px] font-black uppercase text-sm tracking-[0.4em] shadow-2xl">ADD TO QUEUE</button>
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
