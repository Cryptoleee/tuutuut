import React, { useState } from 'react';
import { X, Save, Database, AlertCircle, Check } from 'lucide-react';
import { saveFirebaseConfig } from '../firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FirebaseSetupModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    setError(null);
    try {
      // 1. Try to parse as pure JSON
      let config = null;
      try {
        config = JSON.parse(input);
      } catch (e) {
        // 2. Try to extract from JS object syntax (e.g. copied from Firebase console)
        // Matches properties like apiKey: "..." or "apiKey": "..."
        const cleanInput = input
            .replace(/const\s+firebaseConfig\s*=\s*/, '') // Remove variable declaration
            .replace(/;/g, '') // Remove semicolons
            // simplistic conversion of JS object string to JSON
            .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') 
            .replace(/'/g, '"');
        
        config = JSON.parse(cleanInput);
      }

      // Basic validation
      if (!config || !config.apiKey || !config.projectId) {
        throw new Error("Ongeldige configuratie. Zorg dat apiKey en projectId aanwezig zijn.");
      }

      saveFirebaseConfig(config);
      
    } catch (err) {
      console.error(err);
      setError("Kon configuratie niet lezen. Plak de volledige JSON of het object tussen { }.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-800">
          <div className="flex items-center gap-3">
             <div className="bg-orange-50 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-500">
                <Database size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Database Koppelen</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Verbind met je eigen Firebase project</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
           <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm flex gap-3">
              <InfoIcon className="shrink-0 mt-0.5" size={18} />
              <div>
                  <p className="font-semibold mb-1">Instructies:</p>
                  <ol className="list-decimal ml-4 space-y-1 opacity-90">
                      <li>Ga naar <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="underline hover:text-blue-600">console.firebase.google.com</a></li>
                      <li>Maak een project en voeg een Web App toe.</li>
                      <li>Kopieer de <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">firebaseConfig</code> code.</li>
                      <li>Plak het hieronder en klik op Opslaan.</li>
                  </ol>
              </div>
           </div>

           <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Plak Config Hier
              </label>
              <textarea 
                className="w-full h-48 bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 rounded-xl p-4 font-mono text-xs text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                placeholder={`{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "..."
}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                  </div>
              )}
           </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50">
            <button 
                onClick={handleSave}
                disabled={!input.trim()}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
                <Save size={18} />
                Opslaan & Herstarten
            </button>
        </div>
      </div>
    </div>
  );
};

const InfoIcon = ({ className, size }: { className?: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);

export default FirebaseSetupModal;