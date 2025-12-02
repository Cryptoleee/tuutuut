import React, { useState, useEffect, useRef } from 'react';
import { Car, MaintenanceRecord, MaintenanceSuggestion, CustomMaintenanceInterval } from '../types';
import { ArrowLeft, Plus, History, Sparkles, Gauge, CheckCircle, RefreshCw, Clock, Euro, Calendar, AlertCircle, Info, PenTool, CarFront, Camera, ChevronDown, ChevronUp, Lightbulb, Pencil, FileText, Settings, X, PlusCircle, Trash2, ScanLine } from 'lucide-react';
import { getMaintenanceAdvice } from '../services/geminiService';
import AddLogModal from './AddLogModal';
import AddCarModal from './AddCarModal';
import { uploadFileToStorage } from '../services/storageService';
import { auth } from '../firebase';
import { compressImage } from '../utils/imageUtils';

interface Props {
  car: Car;
  logs: MaintenanceRecord[];
  onBack: () => void;
  onAddLog: (record: Omit<MaintenanceRecord, 'id'>) => Promise<void>;
  onUpdateLog: (record: MaintenanceRecord) => Promise<void>;
  onDeleteLog?: (logId: string) => Promise<void>;
  onUpdateMileage: (newMileage: number) => Promise<void>;
  onUpdateCar: (updatedCar: Car) => Promise<void>;
  onDeleteCar?: (carId: string) => Promise<void>; // Added prop
  highlightedTask?: string;
}

const CarDetail: React.FC<Props> = ({ car, logs, onBack, onAddLog, onUpdateLog, onDeleteLog, onUpdateMileage, onUpdateCar, onDeleteCar, highlightedTask }) => {
  const [isLogModalOpen, setLogModalOpen] = useState(false);
  const [isEditCarModalOpen, setEditCarModalOpen] = useState(false);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [newMileage, setNewMileage] = useState(car.mileage.toString());
  const [isEditingMileage, setIsEditingMileage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [suggestionToComplete, setSuggestionToComplete] = useState<MaintenanceSuggestion | undefined>(undefined);
  const [editingLog, setEditingLog] = useState<MaintenanceRecord | null>(null);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set());
  
  // Settings Mode for Monitor
  const [isSettingsMode, setIsSettingsMode] = useState(false);
  const [customIntervals, setCustomIntervals] = useState<CustomMaintenanceInterval[]>(car.customMaintenanceIntervals || []);
  const [newIntervalTask, setNewIntervalTask] = useState('');
  const [newIntervalKm, setNewIntervalKm] = useState('');

  const suggestionRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!car.lastAdvice || car.lastAdvice.length === 0) {
        fetchAdvice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (highlightedTask && car.lastAdvice) {
        const index = car.lastAdvice.findIndex(item => item.task === highlightedTask);
        if (index !== -1) {
            setExpandedSuggestions(prev => new Set(prev).add(index));
            setTimeout(() => {
                const el = suggestionRefs.current.get(index);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }
  }, [highlightedTask, car.lastAdvice]);

  const fetchAdvice = async () => {
    setLoadingAdvice(true);
    // Force a small delay to make sure the animation is perceived if API is too fast
    // and to let the UI update the loading state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const advice = await getMaintenanceAdvice(car, logs);
    
    const updatedCar = {
        ...car,
        lastAdvice: advice,
        lastAdviceDate: new Date().toISOString()
    };
    await onUpdateCar(updatedCar);
    setLoadingAdvice(false);
    setExpandedSuggestions(new Set());
  };

  const toggleSuggestion = (index: number) => {
    setExpandedSuggestions(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        return newSet;
    });
  };

  const handleMileageSave = async () => {
    const m = parseInt(newMileage);
    if (!isNaN(m)) {
        await onUpdateMileage(m);
        setIsEditingMileage(false);
    }
  };

  const handleCompleteSuggestion = (suggestion: MaintenanceSuggestion, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setSuggestionToComplete(suggestion);
    setLogModalOpen(true);
  };

  const handleLogClick = (log: MaintenanceRecord) => {
      setEditingLog(log);
      setLogModalOpen(true);
  };

  const handleModalClose = () => {
    setLogModalOpen(false);
    setSuggestionToComplete(undefined);
    setEditingLog(null);
  };

  const handleSaveLog = async (recordData: Omit<MaintenanceRecord, 'id'>) => {
      if (editingLog) {
          await onUpdateLog({
              ...editingLog,
              ...recordData
          });
      } else {
          await onAddLog(recordData);
          if (suggestionToComplete) {
              const updatedAdvice = car.lastAdvice?.filter(item => item.task !== suggestionToComplete.task) || [];
              await onUpdateCar({
                  ...car,
                  lastAdvice: updatedAdvice
              });
          }
      }
      handleModalClose();
  };

  const handleEditCarSave = async (carData: Omit<Car, 'id'>) => {
      await onUpdateCar({
          ...car,
          ...carData
      });
      setEditCarModalOpen(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (auth.currentUser) {
        // Logged in: Upload to Storage
        try {
            const compressedFile = await compressImage(file);
            const fileName = `car_${car.id}_${Date.now()}`;
            const path = `users/${auth.currentUser.uid}/cars/${fileName}`;
            const url = await uploadFileToStorage(compressedFile, path);

            await onUpdateCar({
                ...car,
                photoUrl: url
            });
        } catch (e: any) {
            console.error("Failed to upload photo", e);
            if (e.code === 'permission-denied') {
                alert("Upload mislukt: Toegang geweigerd. Heb je de Firebase Storage rules geactiveerd?");
            } else if (e.message?.includes("bucket")) {
                alert("Upload mislukt: Gratis bucket niet beschikbaar in deze regio. Kies 'us-central1' of upgrade naar Blaze.");
            } else {
                alert(`Upload mislukt: ${e.message}`);
            }
        }
      } else {
         // Guest mode: update local photo (base64)
         try {
             const compressedFile = await compressImage(file);
             const reader = new FileReader();
             reader.onloadend = async () => {
                 await onUpdateCar({
                     ...car,
                     photoUrl: reader.result as string
                 });
             };
             reader.readAsDataURL(compressedFile);
         } catch (e) {
             console.error("Compression failed", e);
         }
      }
    }
  };

  // --- Custom Interval Handlers ---
  const addCustomInterval = () => {
      if (newIntervalTask && newIntervalKm) {
          const km = parseInt(newIntervalKm);
          if (km > 0) {
              const updated = [...customIntervals, { taskName: newIntervalTask, intervalKm: km }];
              setCustomIntervals(updated);
              setNewIntervalTask('');
              setNewIntervalKm('');
          }
      }
  };

  const removeCustomInterval = (idx: number) => {
      const updated = [...customIntervals];
      updated.splice(idx, 1);
      setCustomIntervals(updated);
  };

  const saveCustomIntervals = async () => {
      await onUpdateCar({
          ...car,
          customMaintenanceIntervals: customIntervals
      });
      setIsSettingsMode(false);
      // Re-fetch advice to apply new rules
      fetchAdvice();
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
        case 'high': 
            return {
                border: 'bg-red-500',
                badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
            };
        case 'medium': 
            return {
                border: 'bg-orange-400',
                badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
            };
        case 'low': 
        default:
            return {
                border: 'bg-blue-400',
                badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            };
    }
  };

  const renderTimeline = (suggestion: MaintenanceSuggestion) => {
    if (!suggestion.dueMileage || !suggestion.intervalKm || suggestion.intervalKm <= 0) return null;

    const dueAt = suggestion.dueMileage;
    const interval = suggestion.intervalKm;
    const startOfCycle = dueAt - interval;
    const current = car.mileage;
    
    const distanceCoveredInCycle = current - startOfCycle;
    let percentage = (distanceCoveredInCycle / interval) * 100;
    
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;

    const isOverdue = current > dueAt;
    const kmLeft = dueAt - current;

    return (
        <div className="mt-4 bg-gray-50 dark:bg-neutral-950 rounded-xl p-3 border border-gray-100 dark:border-neutral-800">
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Interval Voortgang</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isOverdue ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' : 'bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'}`}>
                    {isOverdue 
                        ? `${Math.abs(kmLeft).toLocaleString()} km over tijd` 
                        : `Nog ${kmLeft.toLocaleString()} km`
                    }
                </span>
            </div>
            
            <div className="relative h-2 w-full bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div 
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out ${isOverdue ? 'bg-red-500' : percentage > 85 ? 'bg-orange-400' : 'bg-primary'}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>

            <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium font-mono">
                <span>{startOfCycle.toLocaleString()} km</span>
                <span>{dueAt.toLocaleString()} km</span>
            </div>
        </div>
    );
  };

  const getApkStatus = () => {
      if (!car.apkDate) return null;
      const today = new Date();
      const apkDate = new Date(car.apkDate);
      const diffTime = apkDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return { color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-900/50', text: 'Verlopen', days: diffDays };
      if (diffDays < 60) return { color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-900/50', text: 'Binnenkort', days: diffDays };
      return { color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-900/50', text: 'Geldig', days: diffDays };
  };

  const apkStatus = getApkStatus();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
        <button onClick={onBack} className="absolute top-24 left-4 md:static p-2 hover:bg-gray-200/50 md:hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors group z-10 bg-white/80 dark:bg-neutral-900/80 md:bg-transparent shadow-sm md:shadow-none backdrop-blur-sm">
            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white" />
        </button>

        <div 
            className="w-full md:w-auto shrink-0 relative group rounded-2xl overflow-hidden cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
        >
            <div className="w-full h-48 md:w-32 md:h-32 bg-gray-200 dark:bg-neutral-800 flex items-center justify-center">
                {car.photoUrl ? (
                    <img src={car.photoUrl} alt="Car" className="w-full h-full object-contain" />
                ) : (
                    <CarFront size={40} className="text-gray-400 dark:text-gray-500" />
                )}
            </div>
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={24} />
            </div>
            <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handlePhotoUpload} 
            />
        </div>

        <div className="px-1 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300">
                    {car.make} {car.model}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-lg text-sm font-mono font-bold uppercase tracking-wider">
                        {car.licensePlate}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">{car.year}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">{car.fuelType}</span>
                    {car.vin && (
                        <>
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span className="text-gray-500 dark:text-gray-500 text-xs font-mono hidden sm:inline" title="VIN / Chassisnummer">VIN: {car.vin}</span>
                        </>
                    )}
                </div>
            </div>
            
            <button 
                onClick={() => setEditCarModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300 font-medium transition-colors shadow-sm"
            >
                <Pencil size={16} />
                <span>Bewerken</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="space-y-6 lg:col-span-2">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-neutral-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 shrink-0">
                    <Gauge size={24} />
                </div>
                <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Huidige Kilometerstand</p>
                    {isEditingMileage ? (
                        <div className="flex gap-2 mt-1">
                            <input 
                                type="number" 
                                value={newMileage === '0' ? '' : newMileage}
                                onChange={(e) => setNewMileage(e.target.value)}
                                className="w-24 border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-white rounded-lg px-2 py-1 text-sm font-medium focus:bg-white dark:focus:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                            <button onClick={handleMileageSave} className="text-xs bg-primary hover:bg-sky-600 text-white px-2 rounded-lg font-medium transition-colors">OK</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <p className="text-xl font-bold text-gray-800 dark:text-white">{car.mileage.toLocaleString()} km</p>
                            <button onClick={() => setIsEditingMileage(true)} className="text-xs text-primary hover:underline font-medium p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20">Wijzig</button>
                        </div>
                    )}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-neutral-800 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${apkStatus ? apkStatus.color.split(' ')[0] + ' ' + apkStatus.color.split(' ')[1] : 'bg-gray-50 dark:bg-neutral-800 text-gray-400'}`}>
                    <Calendar size={24} />
                </div>
                <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">APK Vervaldatum</p>
                    <div className="flex items-center gap-2">
                        {car.apkDate ? (
                            <>
                                <p className="text-xl font-bold text-gray-800 dark:text-white">
                                    {new Date(car.apkDate).toLocaleDateString('nl-NL')}
                                </p>
                                {apkStatus && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${apkStatus.color}`}>
                                        {apkStatus.text}
                                    </span>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-400 dark:text-gray-500 text-sm">Onbekend</p>
                        )}
                    </div>
                </div>
              </div>
          </div>

          <div className="flex justify-end">
             <button onClick={() => setLogModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white px-5 py-2.5 rounded-full font-medium shadow-md hover:shadow-lg transition-all active:scale-95">
                <Plus size={18} />
                <span>Nieuw Logboek</span>
             </button>
          </div>

          {/* Main Card: Monitor or Settings */}
          <div className="relative perspective-1000">
            {/* Monitor View */}
            <div className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border overflow-hidden min-h-[400px] transition-all duration-500 relative z-0 ${loadingAdvice ? 'border-red-500/50 shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)] dark:shadow-[0_0_30px_-5px_rgba(239,68,68,0.2)]' : 'border-gray-100 dark:border-neutral-800'} ${isSettingsMode ? 'hidden' : 'block'}`}>
                <div className="p-5 border-b border-gray-50 dark:border-neutral-800 flex justify-between items-center bg-gradient-to-r from-blue-50/50 to-teal-50/50 dark:from-neutral-800 dark:to-neutral-800/50">
                    <div className="flex items-center gap-2">
                        <div className="bg-white dark:bg-neutral-800 p-1.5 rounded-lg shadow-sm">
                            <Sparkles className="text-amber-500" size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Tuutuut Monitor</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsSettingsMode(true)}
                            disabled={loadingAdvice}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Instellingen & Intervallen"
                        >
                            <Settings size={18} />
                        </button>
                        <button 
                            onClick={fetchAdvice} 
                            disabled={loadingAdvice}
                            className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-wait"
                        >
                            <RefreshCw size={14} className={loadingAdvice ? "animate-spin" : ""} />
                            {loadingAdvice ? 'Analyseren...' : 'Verversen'}
                        </button>
                    </div>
                </div>
                
                <div className="p-4 bg-gray-50/30 dark:bg-neutral-950/30 relative">
                    {loadingAdvice ? (
                        <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
                            <div className="relative mb-8">
                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                                
                                <div className="relative z-10 bg-white dark:bg-neutral-900 p-6 rounded-full shadow-xl border-4 border-red-50 dark:border-red-900/30 overflow-hidden">
                                    <CarFront size={48} className="text-gray-400 dark:text-gray-500" />
                                    
                                    {/* Scanning Laser Line */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 animate-pulse">AI Diagnose Bezig...</h3>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 text-center max-w-xs">
                                Onderhoudshistorie analyseren & intervallen berekenen. <br/>
                                <span className="text-xs opacity-70">Dit kan enkele seconden duren.</span>
                            </p>
                        </div>
                    ) : car.lastAdvice && car.lastAdvice.length > 0 ? (
                        <div className="space-y-4">
                            {car.lastAdvice.map((item, idx) => {
                                const style = getUrgencyStyles(item.urgency);
                                const isExpanded = expandedSuggestions.has(idx);
                                
                                return (
                                    <div 
                                        key={idx}
                                        ref={(el) => { if (el) suggestionRefs.current.set(idx, el); }}
                                        id={`suggestion-${idx}`}
                                        onClick={() => toggleSuggestion(idx)}
                                        className={`bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden hover:shadow-md transition-all cursor-pointer relative group ${highlightedTask === item.task ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-neutral-950' : ''}`}
                                    >
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.border}`}></div>
                                        
                                        <div className="grid grid-cols-[100px_1fr_auto] gap-4 pl-6 pr-4 py-4 items-center">
                                            
                                            <div className="shrink-0">
                                                <span className={`flex items-center justify-center w-full px-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                                                    {item.urgency === 'high' ? 'Urgent' : item.urgency === 'medium' ? 'Binnenkort' : 'Info'}
                                                </span>
                                            </div>

                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base" title={item.task}>
                                                    {item.task}
                                                </h3>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 justify-end">
                                                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 justify-end min-w-[80px]">
                                                    {item.estimatedCostRange ? (
                                                        <span className="flex items-center justify-end gap-1 bg-gray-50 dark:bg-neutral-800 px-2 py-1 rounded w-full">
                                                            <Euro size={12} /> {item.estimatedCostRange}
                                                        </span>
                                                    ) : item.dueMileage ? (
                                                        <span className="flex items-center justify-end gap-1 bg-gray-50 dark:bg-neutral-800 px-2 py-1 rounded w-full">
                                                            <Gauge size={12} /> {item.dueMileage.toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span></span>
                                                    )}
                                                </div>
                                                
                                                <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                    <ChevronDown size={20} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="border-t border-gray-50 dark:border-neutral-800 pt-4 px-6 pb-6">
                                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                                    {item.reason}
                                                </p>
                                                
                                                {item.diyTip && (
                                                    <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg p-3 flex gap-3">
                                                        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-1.5 rounded-full h-fit text-yellow-600 dark:text-yellow-400 shrink-0">
                                                            <Lightbulb size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wide mb-0.5">Doe het zelf Tip</p>
                                                            <p className="text-sm text-yellow-900/80 dark:text-yellow-100/80">{item.diyTip}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="sm:hidden flex flex-wrap gap-2 mt-3">
                                                    {item.estimatedCostRange && (
                                                        <span className="flex items-center gap-1 bg-gray-50 dark:bg-neutral-800 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-neutral-700">
                                                            <Euro size={12} /> {item.estimatedCostRange}
                                                        </span>
                                                    )}
                                                    {item.dueMileage && (
                                                        <span className="flex items-center gap-1 bg-gray-50 dark:bg-neutral-800 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-neutral-700">
                                                            <Gauge size={12} /> {item.dueMileage.toLocaleString()} km
                                                        </span>
                                                    )}
                                                </div>

                                                {renderTimeline(item)}

                                                <div className="mt-5 flex justify-end">
                                                    <button 
                                                        onClick={(e) => handleCompleteSuggestion(item, e)}
                                                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-semibold transition-all group-hover:bg-green-50 dark:group-hover:bg-green-900/20 shadow-sm"
                                                    >
                                                        <CheckCircle size={16} />
                                                        <span>Taak Afronden</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <CheckCircle className="mx-auto mb-3 text-green-500" size={48} />
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Alles in orde!</h3>
                            <p>Op basis van de gegevens is er nu geen direct onderhoud nodig.</p>
                            <button onClick={fetchAdvice} className="mt-4 text-primary text-sm font-medium hover:underline">
                                Toch controleren
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Settings View (Back of Card) */}
             <div className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden min-h-[400px] transition-all duration-500 ${!isSettingsMode ? 'hidden' : 'block'}`}>
                <div className="p-5 border-b border-gray-50 dark:border-neutral-800 flex justify-between items-center bg-gray-50 dark:bg-neutral-800/50">
                     <div className="flex items-center gap-2">
                         <div className="bg-white dark:bg-neutral-800 p-1.5 rounded-lg shadow-sm text-gray-600 dark:text-gray-300">
                            <Settings size={18} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Persoonlijke Intervallen</h2>
                     </div>
                     <button onClick={saveCustomIntervals} className="text-primary font-medium text-sm hover:underline">
                         Klaar
                     </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Stel hier je eigen voorkeuren in. De AI zal deze respecteren boven de fabrieksopgave.
                    </p>

                    <div className="space-y-3 mb-6">
                        {customIntervals.map((ci, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-neutral-950 border border-gray-100 dark:border-neutral-800 p-3 rounded-xl">
                                <div>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200 block">{ci.taskName}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-500">Elke {ci.intervalKm.toLocaleString()} km</span>
                                </div>
                                <button onClick={() => removeCustomInterval(idx)} className="text-red-400 hover:text-red-500 p-2">
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                        {customIntervals.length === 0 && (
                            <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-100 dark:border-neutral-800 rounded-xl">
                                Geen eigen regels ingesteld.
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
                        <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">Nieuwe regel toevoegen</h4>
                        <div className="flex flex-col gap-3">
                            <input 
                                type="text" 
                                placeholder="Taak (bv. Motorolie)" 
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                                value={newIntervalTask}
                                onChange={(e) => setNewIntervalTask(e.target.value)}
                            />
                            <div className="flex gap-3">
                                <input 
                                    type="number" 
                                    placeholder="Interval (km)" 
                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                                    value={newIntervalKm}
                                    onChange={(e) => setNewIntervalKm(e.target.value)}
                                />
                                <button 
                                    onClick={addCustomInterval}
                                    disabled={!newIntervalTask || !newIntervalKm}
                                    className="bg-primary text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
                                >
                                    Toevoegen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

          </div>

        </div>

        <div className="lg:col-span-1">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 h-full flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center gap-2">
                    <History className="text-gray-400" size={20} />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Logboek</h2>
                </div>
                <div className="p-0 flex-1 space-y-0">
                    {logs.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm p-4">
                            <p>Nog geen onderhoud geregistreerd.</p>
                            <button onClick={() => setLogModalOpen(true)} className="text-primary hover:underline mt-2">
                                Voeg de eerste toe
                            </button>
                        </div>
                    ) : (
                        [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                            <div 
                                key={log.id} 
                                onClick={() => handleLogClick(log)}
                                className="relative border-b border-gray-50 dark:border-neutral-800 group cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 p-5 transition-colors"
                            >
                                <div className="mb-1 flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(log.date).toLocaleDateString('nl-NL')}
                                    </span>
                                    {log.cost > 0 && <span className="text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">€{log.cost.toFixed(2)}</span>}
                                </div>
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm group-hover:text-primary transition-colors line-clamp-2">{log.title}</h4>
                                    <div className="opacity-0 group-hover:opacity-100 text-gray-300 transition-opacity">
                                        <PenTool size={14} />
                                    </div>
                                </div>
                                
                                <div className="group/tooltip relative mt-1">
                                    <p title={log.description} className="text-xs text-gray-500 line-clamp-1">{log.description}</p>
                                    
                                    <div className="absolute z-50 invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 left-0 w-64 p-3 bg-neutral-900 text-white text-xs rounded-xl shadow-xl pointer-events-none
                                        top-full mt-2
                                    ">
                                        <div className="absolute -top-1 left-4 w-2 h-2 bg-neutral-900 transform rotate-45"></div>
                                        {log.description}
                                    </div>
                                </div>
                                
                                <span className="text-xs text-gray-400 mt-2 block font-mono bg-gray-50 dark:bg-neutral-950 dark:text-gray-500 inline-block px-1.5 py-0.5 rounded">
                                    {log.mileageAtService.toLocaleString()} km
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>

      <AddLogModal 
        isOpen={isLogModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveLog}
        onDelete={onDeleteLog}
        carId={car.id}
        initialData={
            editingLog ? editingLog : 
            suggestionToComplete ? {
                title: suggestionToComplete.task,
                description: `Afgevinkt van AI advies: ${suggestionToComplete.reason}`,
                mileageAtService: car.mileage
            } : undefined
        }
      />
      
      <AddCarModal
        isOpen={isEditCarModalOpen}
        onClose={() => setEditCarModalOpen(false)}
        onSave={handleEditCarSave}
        onDelete={onDeleteCar}
        userId={auth.currentUser ? auth.currentUser.uid : 'guest'}
        initialData={car}
      />
    </div>
  );
};

export default CarDetail;