import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';
import { Wrench, AlertTriangle, ArrowRight } from 'lucide-react';
// import FirebaseSetupModal from './FirebaseSetupModal'; // No longer needed as config is hardcoded

interface Props {
  onGuestLogin: () => void;
}

const LoginScreen: React.FC<Props> = ({ onGuestLogin }) => {
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  // const [showSetup, setShowSetup] = useState(false); // No longer needed

  const isConfigured = isFirebaseConfigured();

  const handleLogin = async () => {
    // Config is hardcoded, so no need to check or show setup
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      alert("Inloggen mislukt. Controleer je internetverbinding.");
    }
  };

  return (
    <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-500">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-gray-100 dark:border-slate-800 relative overflow-hidden">
            
            {/* Background blobs */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-secondary/10 blur-2xl"></div>

            {!showGuestWarning ? (
                <>
                    <div className="relative bg-gradient-to-tr from-primary to-secondary w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
                        <Wrench size={32} className="text-white" />
                    </div>
                    
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tuutuut</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                        Houd je auto-onderhoud bij, ontvang slim AI advies en bewaar al je werkbonnen veilig in de cloud.
                    </p>

                    <div className="space-y-3 relative z-10">
                        <button 
                            onClick={handleLogin}
                            className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm group"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span>Inloggen met Google</span>
                        </button>

                        <button 
                            onClick={() => setShowGuestWarning(true)}
                            className="w-full text-gray-500 dark:text-gray-400 font-medium py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm"
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
        {/* <FirebaseSetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} /> */}
    </>
  );
};

export default LoginScreen;