import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, Paperclip, Image as ImageIcon } from 'lucide-react';
import { Car, MaintenanceRecord } from '../types';
import { chatWithMechanic, ChatMessage } from '../services/geminiService';
import { compressImage } from '../utils/imageUtils';

interface Props {
  cars: Car[];
  activeCarId: string | null;
  logs: MaintenanceRecord[];
}

const ChatBot: React.FC<Props> = ({ cars, activeCarId, logs }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hoi! Ik ben je Tuutuut assistent. Heb je vragen over je auto, of brandt er een lampje?' }
  ]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, loading]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setProcessingImage(true);
        try {
            const compressedFile = await compressImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
                setProcessingImage(false);
            };
            reader.readAsDataURL(compressedFile);
        } catch (error) {
            console.error("Image compression failed", error);
            alert("Afbeelding kon niet verwerkt worden.");
            setProcessingImage(false);
        }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || loading || processingImage) return;

    const userMsg: ChatMessage = { 
        role: 'user', 
        text: input,
        image: selectedImage
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(undefined);
    setLoading(true);

    // Filter logs/cars based on active view to be smart contextually
    const responseText = await chatWithMechanic(
        userMsg.text,
        userMsg.image,
        messages, // History
        { cars, activeCarId, logs }
    );

    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white dark:bg-slate-900 w-[90vw] sm:w-[400px] h-[500px] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden mb-4 pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-300 origin-bottom-right ring-1 ring-black/5 dark:ring-white/10">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-inner">
                <Sparkles size={18} className="text-yellow-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Tuutuut Assistent</h3>
                <p className="text-xs text-white/80 font-medium">AI Monteur & Diagnose</p>
              </div>
            </div>
            <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-2 rounded-full transition-colors backdrop-blur-sm"
            >
                <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50 dark:bg-slate-950">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`flex flex-col max-w-[85%] gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    
                    <div className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-auto ${msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 text-violet-600 border border-violet-100 dark:border-slate-700'}`}>
                            {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
                        </div>

                        {/* Bubble Content */}
                        <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-violet-600 text-white rounded-br-none' 
                                : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
                        }`}>
                            {msg.image && (
                                <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                                    <img src={msg.image} alt="Uploaded" className="max-w-full h-auto max-h-48 object-cover" />
                                </div>
                            )}
                            {msg.text}
                        </div>
                    </div>
                 </div>
              </div>
            ))}
            
            {loading && (
                 <div className="flex justify-start animate-pulse">
                    <div className="flex max-w-[85%] gap-2">
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-violet-600 border border-violet-100 dark:border-slate-700 flex items-center justify-center shrink-0 mt-auto">
                            <Bot size={16} />
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 p-3">
              {/* Image Preview */}
              {(selectedImage || processingImage) && (
                  <div className="relative inline-block mb-3 ml-2 group">
                      {processingImage ? (
                          <div className="h-16 w-16 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-slate-700">
                             <Loader2 size={20} className="animate-spin text-violet-600" />
                          </div>
                      ) : (
                        <>
                          <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm" />
                          <button 
                            onClick={() => setSelectedImage(undefined)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600 shadow-md"
                          >
                              <X size={12} />
                          </button>
                        </>
                      )}
                  </div>
              )}

              <form onSubmit={handleSend} className="flex gap-2 items-end">
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processingImage}
                    className="p-3 text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-slate-800 rounded-xl transition-colors mb-0.5 disabled:opacity-50"
                    title="Foto toevoegen"
                >
                    <Paperclip size={20} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageSelect}
                />
                
                <input 
                    type="text" 
                    placeholder={selectedImage ? "Voeg een bericht toe..." : "Stel een vraag of stuur een foto..."}
                    className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:border-violet-500 transition-all placeholder-gray-400 dark:placeholder-gray-600 text-gray-800 dark:text-white"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button 
                    type="submit" 
                    disabled={(loading || (!input.trim() && !selectedImage) || processingImage)}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 mb-0.5"
                >
                    <Send size={18} />
                </button>
              </form>
          </div>

        </div>
      )}

      {/* Floating Button */}
      <div className="relative group">
        {!isOpen && (
            <span className="absolute right-0 -top-10 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 shadow-lg border border-gray-100 dark:border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                Hulp nodig?
            </span>
        )}
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className="pointer-events-auto relative bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 text-white w-14 h-14 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center group z-50 overflow-hidden"
        >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 rounded-full"></div>
            {isOpen ? (
                <X className="group-hover:rotate-90 transition-transform duration-300 relative z-10" />
            ) : (
                <div className="relative z-10">
                    <MessageCircle className="group-hover:scale-110 transition-transform duration-300" />
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-fuchsia-600 rounded-full animate-pulse"></span>
                </div>
            )}
        </button>
      </div>
    </div>
  );
};

export default ChatBot;