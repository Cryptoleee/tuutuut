import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';
import { AlertTriangle, ArrowRight, AlertCircle } from 'lucide-react';
import Logo from './Logo';

interface Props {
  onGuestLogin: () => void;
}

const LoginScreen: React.FC<Props> = ({ onGuestLogin }) => {
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfigured = isFirebaseConfigured();

  const handleLogin = async () => {
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      
      // Specifieke foutmeldingen vertalen voor de gebruiker
      if (error.code === 'auth/popup-closed-by-user') {
        return; // Gebruiker klikte het weg, geen error nodig
      } else if (error.code === 'auth/unauthorized-domain') {
        setErrorMessage("Dit domein is niet toegestaan. Voeg 'tuutuut.vercel.app' toe in de Firebase Console bij Authentication -> Settings -> Authorized Domains.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        return;
      } else {
        setErrorMessage(`Inloggen mislukt: ${error.message}`);
      }
    }
  };

  return (
    <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-in fade-in duration-500">
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-gray-100 dark:border-neutral-800 relative overflow-hidden">
            
            {/* Background blobs */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-secondary/10 blur-2xl"></div>

            {!showGuestWarning ? (
                <>
                    <div className="relative w-20 h-20 flex items-center justify-center mx-auto mb-6">
                        <Logo size={80} className="drop-shadow-xl" />
                    </div>
                    
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tuutuut</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        Houd je auto-onderhoud bij, ontvang slim AI advies en bewaar al je werkbonnen veilig in de cloud.
                    </p>

                    {errorMessage && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-left flex gap-3">
                             <AlertCircle className="text-red-500 shrink-0" size={20} />
                             <p className="text-sm text-red-600 dark:text-red-300 font-medium">{errorMessage}</p>
                        </div>
                    )}

                    <div className="space-y-3 relative z-10">
                        <button 
                            onClick={handleLogin}
                            className="w-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-800 dark:text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm group"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span>Inloggen met Google</span>
                        </button>

                        <button 
                            onClick={() => setShowGuestWarning(true)}
                            className="w-full text-gray-500 dark:text-gray-400 font-medium py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors text-sm"
                        >
                            Doorgaan als gast
                        </button>
                    </div>
                </>
            ) : (
                <div className="animate-in slide-in-from-right-8 duration-300">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Let op!</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                        In de gastmodus worden je gegevens <strong>alleen op dit apparaat</strong> opgeslagen. 
                        Als je cache wist of van apparaat wisselt, ben je alles kwijt. 
                        Er wordt niets in de cloud bewaard.
                    </p>

                    <div className="space-y-3">
                        <button 
                            onClick={onGuestLogin}
                            className="w-full bg-gradient-to-r from-gray-800 to-gray-700 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <span>Ik begrijp het, ga door</span>
                            <ArrowRight size={18} />
                        </button>
                        <button 
                            onClick={() => setShowGuestWarning(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-medium"
                        >
                            Terug
                        </button>
                    </div>
                </div>
            )}
        </div>
        </div>
    </>
  );
};

export default LoginScreen;