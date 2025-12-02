import React, { useState, useEffect } from 'react';
import { Car, MaintenanceRecord } from './types';
import AddCarModal from './components/AddCarModal';
import CarDetail from './components/CarDetail';
import NotificationCenter from './components/NotificationCenter';
import ChatBot from './components/ChatBot';
import LoginScreen from './components/LoginScreen';
import Logo from './components/Logo';
import { CarFront, ChevronRight, PlusCircle, Bell, Sun, Moon, LogOut, Loader2, User as UserIcon } from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { subscribeToCars, subscribeToLogs, addCarToFirestore, addLogToFirestore, updateLogInFirestore, updateCarInFirestore, deleteLogFromFirestore, deleteCarFromFirestore } from './services/firestoreService';

const STORAGE_KEY_THEME = 'autoslim_theme';
const STORAGE_KEY_CARS = 'autoslim_cars';
const STORAGE_KEY_LOGS = 'autoslim_logs';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [cars, setCars] = useState<Car[]>([]);
  const [logs, setLogs] = useState<MaintenanceRecord[]>([]);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [highlightedTask, setHighlightedTask] = useState<string | undefined>(undefined);
  const [isAddCarModalOpen, setAddCarModalOpen] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Theme initialization
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY_THEME) === 'dark' || (!localStorage.getItem(STORAGE_KEY_THEME) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
    } else {
        setDarkMode(false);
        document.documentElement.classList.remove('dark');
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoadingAuth(false);
        if (currentUser) {
            setIsGuest(false);
        }
    });
    return () => unsubscribe();
  }, []);

  // Data Subscription / Fetching
  useEffect(() => {
      // 1. Authenticated User: Subscribe to Firebase
      if (user) {
          const unsubCars = subscribeToCars(user.uid, (data) => setCars(data));
          const unsubLogs = subscribeToLogs(user.uid, (data) => setLogs(data));
          return () => {
              unsubCars();
              unsubLogs();
          };
      } 
      // 2. Guest Mode: Load from LocalStorage
      else if (isGuest) {
          const storedCars = localStorage.getItem(STORAGE_KEY_CARS);
          const storedLogs = localStorage.getItem(STORAGE_KEY_LOGS);

          if (storedCars) {
              setCars(JSON.parse(storedCars));
          } else {
              setCars([]);
          }

          if (storedLogs) {
              setLogs(JSON.parse(storedLogs));
          } else {
              setLogs([]);
          }
      } else {
          // Reset if neither
          setCars([]);
          setLogs([]);
      }
  }, [user, isGuest]);

  const toggleDarkMode = () => {
    if (darkMode) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem(STORAGE_KEY_THEME, 'light');
        setDarkMode(false);
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem(STORAGE_KEY_THEME, 'dark');
        setDarkMode(true);
    }
  };

  const handleLogout = () => {
      signOut(auth);
      setIsGuest(false);
      setSelectedCarId(null);
  };

  // --- Data Handlers (Hybrid: Firebase or LocalStorage) ---

  const saveCarsLocally = (newCars: Car[]) => {
      setCars(newCars);
      localStorage.setItem(STORAGE_KEY_CARS, JSON.stringify(newCars));
  };

  const saveLogsLocally = (newLogs: MaintenanceRecord[]) => {
      setLogs(newLogs);
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(newLogs));
  };

  const handleAddCar = async (newCar: Omit<Car, 'id'>) => {
    const car: Car = { ...newCar, id: crypto.randomUUID() };
    
    if (user) {
        await addCarToFirestore(user.uid, car);
    } else {
        saveCarsLocally([...cars, car]);
    }
  };

  const handleUpdateCar = async (updatedCar: Car) => {
    if (user) {
        await updateCarInFirestore(user.uid, updatedCar);
    } else {
        const newCars = cars.map(c => c.id === updatedCar.id ? updatedCar : c);
        saveCarsLocally(newCars);
    }
  };

  const handleDeleteCar = async (carId: string) => {
      if (user) {
          await deleteCarFromFirestore(user.uid, carId);
      } else {
          const newCars = cars.filter(c => c.id !== carId);
          saveCarsLocally(newCars);
      }
      setSelectedCarId(null); // Return to dashboard
  };

  const handleAddLog = async (newLog: Omit<MaintenanceRecord, 'id'>) => {
    const log: MaintenanceRecord = { ...newLog, id: crypto.randomUUID() };

    // Auto-update car mileage
    const currentCar = cars.find(c => c.id === newLog.carId);
    let updatedCar = currentCar;
    if (currentCar && newLog.mileageAtService > currentCar.mileage) {
        updatedCar = { ...currentCar, mileage: newLog.mileageAtService };
        if (user) {
            await updateCarInFirestore(user.uid, updatedCar);
        } else {
            // Updated later in local flow
        }
    }

    if (user) {
        await addLogToFirestore(user.uid, log);
    } else {
        saveLogsLocally([...logs, log]);
        if (updatedCar && updatedCar !== currentCar) {
            const newCars = cars.map(c => c.id === updatedCar!.id ? updatedCar! : c);
            saveCarsLocally(newCars);
        }
    }
  };

  const handleUpdateLog = async (updatedLog: MaintenanceRecord) => {
    if (user) {
        await updateLogInFirestore(user.uid, updatedLog);
    } else {
        const newLogs = logs.map(l => l.id === updatedLog.id ? updatedLog : l);
        saveLogsLocally(newLogs);
    }
  };

  const handleDeleteLog = async (logId: string) => {
      if (user) {
          await deleteLogFromFirestore(user.uid, logId);
      } else {
          // Guest mode delete
          const newLogs = logs.filter(l => l.id !== logId);
          saveLogsLocally(newLogs);
      }
  };

  const handleUpdateMileage = async (carId: string, mileage: number) => {
      const currentCar = cars.find(c => c.id === carId);
      if (currentCar) {
          const updated = { ...currentCar, mileage };
          if (user) {
              await updateCarInFirestore(user.uid, updated);
          } else {
              const newCars = cars.map(c => c.id === carId ? updated : c);
              saveCarsLocally(newCars);
          }
      }
  };

  const handleSelectCarFromNotification = (carId: string, task?: string) => {
      setSelectedCarId(carId);
      setHighlightedTask(task);
  };

  const selectedCar = cars.find(c => c.id === selectedCarId);
  const selectedCarLogs = logs.filter(l => l.carId === selectedCarId);

  // Calculate alert count
  const alertCount = cars.reduce((acc, car) => {
      if (!car.lastAdvice) return acc;
      const urgent = car.lastAdvice.filter(a => a.urgency === 'high' || (a.dueMileage && (a.dueMileage - car.mileage) < 1000)).length;
      let apkAlert = 0;
      if (car.apkDate) {
         const diffTime = new Date(car.apkDate).getTime() - new Date().getTime();
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         if (diffDays < 60) apkAlert = 1;
      }
      return acc + urgent + apkAlert;
  }, 0);

  if (loadingAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950 text-primary">
              <Loader2 className="animate-spin" size={48} />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-neutral-950 text-gray-800 dark:text-gray-100 pb-20 relative transition-colors duration-300">
      
      {/* Login Overlay if not logged in and not guest */}
      {!user && !isGuest && (
          <LoginScreen onGuestLogin={() => setIsGuest(true)} />
      )}

      {/* Top Navigation */}
      <nav className="bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800 sticky top-0 z-30 shadow-sm transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedCarId(null)}>
            <div className="text-primary">
                <Logo size={32} />
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Tuutuut</span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={toggleDarkMode}
                className="p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <div className="relative">
                  <button 
                    onClick={() => setNotificationOpen(!isNotificationOpen)}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-full transition-colors relative"
                  >
                      <Bell size={20} className="text-gray-500 dark:text-gray-400" />
                      {alertCount > 0 && (
                          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-neutral-900"></span>
                      )}
                  </button>
                  <NotificationCenter 
                    cars={cars} 
                    isOpen={isNotificationOpen} 
                    onClose={() => setNotificationOpen(false)} 
                    onSelectCar={handleSelectCarFromNotification}
                  />
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-neutral-700 mx-1"></div>

              <div className="flex items-center gap-2">
                  {user ? (
                      <>
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-gray-200 dark:border-neutral-700" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                <UserIcon size={16} />
                            </div>
                        )}
                      </>
                  ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-gray-400">
                          <UserIcon size={16} />
                      </div>
                  )}
                  
                  <button onClick={handleLogout} className="p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-full text-gray-500 dark:text-gray-400" title={user ? "Uitloggen" : "Reset"}>
                      <LogOut size={20} />
                  </button>
              </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {selectedCar ? (
          <CarDetail 
            car={selectedCar} 
            logs={selectedCarLogs}
            onBack={() => setSelectedCarId(null)}
            onAddLog={handleAddLog}
            onUpdateLog={handleUpdateLog}
            onDeleteLog={handleDeleteLog}
            onUpdateMileage={(m) => handleUpdateMileage(selectedCar.id, m)}
            onUpdateCar={handleUpdateCar}
            onDeleteCar={handleDeleteCar}
            highlightedTask={highlightedTask}
          />
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-900 to-neutral-800 dark:from-neutral-800 dark:to-neutral-900 text-white p-8 sm:p-10 shadow-2xl">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-primary/20 blur-3xl"></div>
              
              <div className="relative z-10 max-w-2xl">
                <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                    {user ? `Welkom, ${user.displayName?.split(' ')[0]}` : 'Welkom bij Tuutuut'}
                </h1>
                <p className="text-neutral-300 text-lg mb-8 leading-relaxed">
                  Vergeet nooit meer wanneer je olie ververst moet worden. 
                  Tuutuut houdt je onderhoud bij en voorspelt toekomstige reparaties met AI.
                </p>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setAddCarModalOpen(true)}
                        className="bg-white text-neutral-900 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-50 transition transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <PlusCircle size={20} className="text-primary" />
                        Auto Toevoegen
                    </button>
                    {!user && isGuest && (
                         <button 
                            onClick={handleLogout} // Actually triggers reset to login screen
                            className="bg-white/10 text-white hover:bg-white/20 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 backdrop-blur-md"
                        >
                            <UserIcon size={20} />
                            Inloggen
                        </button>
                    )}
                </div>
              </div>
            </div>

            {/* Car Grid */}
            <div>
               <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                 Mijn Auto's 
                 <span className="bg-gray-200 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">{cars.length}</span>
               </h2>
               
               {cars.length === 0 ? (
                 <div className="border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-2xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => setAddCarModalOpen(true)}>
                    <div className="w-16 h-16 bg-gray-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-50 dark:group-hover:bg-neutral-700 transition-colors">
                        <CarFront className="text-gray-400 dark:text-gray-500 group-hover:text-primary transition-colors" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Nog geen auto's</h3>
                    <p className="text-gray-500 dark:text-gray-500 mt-1">Voeg je eerste auto toe om te beginnen.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cars.map(car => (
                        <div 
                            key={car.id} 
                            onClick={() => setSelectedCarId(car.id)}
                            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full"
                        >
                            <div className="h-64 w-full bg-gray-100 dark:bg-neutral-800 relative overflow-hidden p-4 flex items-center justify-center">
                                {car.photoUrl ? (
                                    <img src={car.photoUrl} alt={`${car.make} ${car.model}`} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-neutral-800 dark:to-neutral-700 text-gray-300 dark:text-neutral-500">
                                        <CarFront size={48} />
                                        <span className="text-xs mt-2 uppercase tracking-wide font-medium text-gray-400 dark:text-neutral-400">Geen foto</span>
                                    </div>
                                )}
                                <div className="absolute bottom-3 left-3">
                                     <span className="bg-white/90 dark:bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-gray-800 dark:text-white uppercase shadow-sm">
                                        {car.licensePlate}
                                    </span>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-primary transition-colors">{car.make} {car.model}</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{car.year} • {car.fuelType}</p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-neutral-800 flex items-center justify-center text-sm">
                                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                                        KM-stand
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono tracking-tight ml-auto">{car.mileage.toLocaleString()}</span>
                                </div>
                            </div>
                            {car.lastAdvice && car.lastAdvice.some(a => a.urgency === 'high') && (
                                <div className="absolute top-3 right-3">
                                    <span className="flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-neutral-800"></span>
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                    <div 
                        onClick={() => setAddCarModalOpen(true)}
                        className="bg-gray-50 dark:bg-neutral-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-neutral-800 hover:border-primary/50 hover:bg-blue-50/30 dark:hover:bg-neutral-800/50 transition-all cursor-pointer flex flex-col items-center justify-center h-full min-h-[350px] gap-3 group"
                    >
                        <div className="bg-white dark:bg-neutral-800 p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                            <PlusCircle className="text-gray-400 dark:text-gray-500 group-hover:text-primary" size={32} />
                        </div>
                        <span className="font-semibold text-gray-500 dark:text-gray-400 group-hover:text-primary transition-colors">Nieuwe auto toevoegen</span>
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}
      </main>

      <AddCarModal 
        isOpen={isAddCarModalOpen} 
        onClose={() => setAddCarModalOpen(false)}
        onSave={handleAddCar}
        userId={user ? user.uid : 'guest'}
      />
      
      <ChatBot 
        cars={cars} 
        activeCarId={selectedCarId} 
        logs={logs}
      />
      
    </div>
  );
};

export default App;