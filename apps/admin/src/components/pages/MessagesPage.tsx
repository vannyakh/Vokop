import React, { useState } from 'react';
import { MessageSquare, Send, Search, CheckCheck, Smile, Star, PhoneCall } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  avatarUrl: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  online: boolean;
  messages: { sender: 'buyer' | 'merchant'; text: string; time: string }[];
}

const initialContacts: Contact[] = [
  {
    id: '1',
    name: 'David Beckham',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
    lastMessage: 'Is the GTA V Key worldwide compatible?',
    time: '12:04 PM',
    unreadCount: 2,
    online: true,
    messages: [
      { sender: 'buyer', text: 'Hey there! I am interested in buying GTA V Premium Edition.', time: '11:58 AM' },
      { sender: 'buyer', text: 'Is the GTA V Key worldwide compatible? My Steam account region is set to Brazil.', time: '12:04 PM' }
    ]
  },
  {
    id: '2',
    name: 'Sarah Connor',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
    lastMessage: 'Awesome, thank you! It worked immediately.',
    time: 'Yesterday',
    unreadCount: 0,
    online: false,
    messages: [
      { sender: 'buyer', text: 'Having trouble activating the key on Epic Games launcher.', time: 'Yesterday 14:02' },
      { sender: 'merchant', text: 'Hi Sarah, make sure you copy-paste without any extra spaces. Also try restarting Epic Launcher.', time: 'Yesterday 14:05' },
      { sender: 'buyer', text: 'Awesome, thank you! It worked immediately.', time: 'Yesterday 14:10' }
    ]
  },
  {
    id: '3',
    name: 'Kobe Bryant',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
    lastMessage: 'Will you replenish Minecraft Java soon?',
    time: 'Jun 28',
    unreadCount: 0,
    online: true,
    messages: [
      { sender: 'buyer', text: 'Hey! I noticed Minecraft Java is out of stock.', time: 'Jun 28 10:20' },
      { sender: 'buyer', text: 'Will you replenish Minecraft Java soon? My kids are waiting for it.', time: 'Jun 28 10:21' }
    ]
  }
];

export const MessagesPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [selectedContact, setSelectedContact] = useState<Contact>(initialContacts[0]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      sender: 'merchant' as const,
      text: inputText,
      time: '12:32 PM'
    };

    const updatedContacts = contacts.map(c => {
      if (c.id === selectedContact.id) {
        return {
          ...c,
          lastMessage: inputText,
          unreadCount: 0,
          messages: [...c.messages, newMsg]
        };
      }
      return c;
    });

    setContacts(updatedContacts);
    const refreshed = updatedContacts.find(c => c.id === selectedContact.id);
    if (refreshed) {
      setSelectedContact(refreshed);
    }
    setInputText('');
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0 overflow-hidden h-full">
      {/* Contact List Pane */}
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-4 flex flex-col min-h-0 h-full overflow-hidden">
        {/* Search header */}
        <div className="flex-shrink-0 space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 select-none">
              <MessageSquare className="w-4 h-4 text-[var(--indigo)]" />
              <span>Customer Chats</span>
            </h3>
            <span className="text-[10px] bg-[var(--indigo)]/10 text-[var(--indigo)] font-bold px-2 py-0.5 rounded-full select-none">
              {contacts.reduce((acc, c) => acc + c.unreadCount, 0)} New
            </span>
          </div>

          <div className="relative flex items-center bg-white/4 border border-[var(--border)] rounded-xl px-3 py-2.5 focus-within:border-[var(--indigo)] transition-all">
            <Search className="w-4 h-4 text-[var(--text-dim)] mr-2" />
            <input
              type="text"
              placeholder="Search chat or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-0 outline-none text-xs text-[var(--text)] w-full placeholder-[var(--text-dim)] font-semibold"
            />
          </div>
        </div>

        {/* List of contacts */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
          {filteredContacts.map(c => (
            <div
              key={c.id}
              onClick={() => {
                setSelectedContact(c);
                // Clear unreads
                setContacts(prev => prev.map(item => item.id === c.id ? { ...item, unreadCount: 0 } : item));
              }}
              className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-150 select-none ${
                selectedContact.id === c.id
                  ? 'bg-[var(--indigo)]/10 border-[var(--indigo)]/40 shadow-sm'
                  : 'bg-white/2 border-transparent hover:bg-white/5 hover:border-[var(--border)]'
              }`}
            >
              {/* Avatar section */}
              <div className="relative flex-shrink-0">
                <img
                  referrerPolicy="no-referrer"
                  src={c.avatarUrl}
                  alt={c.name}
                  className="w-10 h-10 rounded-full object-cover border border-white/10"
                />
                {c.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#09090e]" />
                )}
              </div>

              {/* Text overview */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate">{c.name}</span>
                  <span className="text-[9px] text-[var(--text-dim)] select-none font-semibold">{c.time}</span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] truncate leading-tight font-semibold">
                  {c.lastMessage}
                </p>
              </div>

              {/* Badge count */}
              {c.unreadCount > 0 && (
                <span className="w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center flex-shrink-0 select-none animate-bounce">
                  {c.unreadCount}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active Conversation Pane */}
      <div className="lg:col-span-2 bg-[var(--panel)] border border-[var(--border)] rounded-2xl flex flex-col min-h-0 h-full overflow-hidden relative">
        <div className="flex-shrink-0 p-4 border-b border-[var(--border)] flex items-center justify-between bg-black/10">
          <div className="flex items-center gap-3">
            <img
              referrerPolicy="no-referrer"
              src={selectedContact.avatarUrl}
              alt={selectedContact.name}
              className="w-9 h-9 rounded-full object-cover border border-white/10"
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{selectedContact.name}</span>
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Buyer • Active Session</span>
              </div>
            </div>
          </div>

          <button className="h-8 rounded-lg bg-white/4 hover:bg-white/8 border border-[var(--border)] text-xs text-white px-3 font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer">
            <PhoneCall className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Call Buyer</span>
          </button>
        </div>

        {/* Chat Timeline */}
        <div className="flex-1 overflow-y-auto p-4.5 space-y-4.5 scrollbar-thin">
          {selectedContact.messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col max-w-[75%] ${m.sender === 'merchant' ? 'ml-auto items-end' : 'items-start'}`}
            >
              <div className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                m.sender === 'merchant'
                  ? 'bg-[var(--indigo)] text-white rounded-tr-none'
                  : 'bg-white/5 text-[var(--text)] border border-[var(--border)] rounded-tl-none'
              }`}>
                {m.text}
              </div>
              <div className="text-[8px] text-[var(--text-dim)] font-bold mt-1 select-none flex items-center gap-1">
                <span>{m.time}</span>
                {m.sender === 'merchant' && <CheckCheck className="w-3 h-3 text-[var(--indigo)]" />}
              </div>
            </div>
          ))}
        </div>

        {/* Chat input footer */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--border)] bg-black/10 flex items-center gap-3 flex-shrink-0">
          <button type="button" className="text-[var(--text-dim)] hover:text-white transition-colors cursor-pointer">
            <Smile className="w-5 h-5" />
          </button>
          <input
            type="text"
            required
            placeholder={`Message ${selectedContact.name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-white/4 border border-[var(--border)] rounded-xl px-4 h-11 text-xs text-[var(--text)] outline-none focus:border-[var(--indigo)] focus:ring-2 focus:ring-[var(--indigo)]/10 transition-all font-semibold"
          />
          <button
            type="submit"
            className="h-11 bg-[var(--indigo)] hover:bg-[var(--indigo)]/90 text-white px-4.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
