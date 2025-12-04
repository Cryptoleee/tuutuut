import React, { useState, useRef, useEffect } from 'react';
import { Car } from '../types';
import { X, CarFront, Search, Loader2, Camera, PlusCircle, Save, Trash2, AlertCircle } from 'lucide-react';
import { fetchCarDataByLicensePlate } from '../services/rdwService';
import { fetchCarImage } from '../services/imageService';
import { uploadFileToStorage } from '../services/storageService';
import { auth } from '../firebase';
import { compressImage } from '../utils/imageUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (car: Omit<Car, 'id'>) => Promise<void>;
  onDelete?: (carId: string) => Promise<void>;
  userId: string;
  initialData?: Car;
}

const AddCarModal: React.FC<Props> = ({ isOpen, onClose, onSave, onDelete, userId, initialData }) => {
  const defaultForm = {
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: 0,
    fuelType: 'Benzine',
    licensePlate: '',
    vin: '',
    photoUrl: '',
    apkDate: ''
  };

  const [formData, setFormData] = useState(defaultForm);
  const [loadingRDW, setLoadingRDW] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [rdwError, setRdwError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setFormData({
                make: initialData.make,
                model: initialData.model,
                year: initialData.year,
                mileage: initialData.mileage,
                fuelType: initialData.fuelType,
                licensePlate: initialData.licensePlate,
                vin: initialData.vin || '',
                photoUrl: initialData.photoUrl || '',
                apkDate: initialData.apkDate || ''
            });
        } else {
            setFormData(defaultForm);
        }
        setSelectedFile(null);
        setRdwError(null);
        setShowDeleteConfirm(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        let photoUrl = formData.photoUrl;

        // 1. If user selected a file, upload it (or keep base64 for guest)
        if (selectedFile) {
            if (auth.currentUser) {
                const fileName = `car_${Date.now()}_${selectedFile.name}`;
                const path = `users/${userId}/cars/${fileName}`;
                photoUrl = await uploadFileToStorage(selectedFile, path);
            } else {
                // For guest: keep the base64 preview as the final url
                // This is already set in handleImageSelect via FileReader
            }
        } 
        // 2. If NO file selected, NO existing photoUrl, try to fetch stock image (only for new cars or if explicit retry)
        else if (!photoUrl && formData.make && formData.model && !initialData) {
           const stockImage = await fetchCarImage(formData.make, formData.model, formData.year);
           if (stockImage) {
             photoUrl = stockImage;
           }
        }

        await onSave({
            ...formData,
            photoUrl
        });
        
        handleClose();
    } catch (error: any) {
        console.error("Error adding/saving car:", error);
        if (error.code === 'permission-denied') {
            alert("Toegang geweigerd. Heb je de Firestore Database aangemaakt en de 'Rules' ingesteld in de Firebase Console?");
        } else if (error.code === 'unavailable') {
             alert("Kan geen verbinding maken met de database. Controleer of Firestore is ingeschakeld in je project.");
        } else {
            alert(`Fout bij opslaan: ${error.message}`);
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(initialData.id);
      handleClose();
    } catch (error) {
      console.error("Delete failed", error);
      alert("Kan auto niet verwijderen.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData(defaultForm);
    setSelectedFile(null);
    setRdwError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'licensePlate') {
        const formatted = value.toUpperCase();
        setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
        setFormData(prev => ({
          ...prev,
          [name]: name === 'year' || name === 'mileage' ? (value === '' ? 0 : Number(value)) : value
        }));
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressing(true);
        const compressedFile = await compressImage(file);
        setSelectedFile(compressedFile);

        // Create local preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
          setIsCompressing(false);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Compression failed", error);
        alert("Kon afbeelding niet verwerken.");
        setIsCompressing(false);
      }
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFormData(prev => ({ ...prev, photoUrl: '' }));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLookupLicensePlate = async () => {
    if (!formData.licensePlate) return;
    
    setLoadingRDW(true);
    setRdwError(null);
    
    const data = await fetchCarDataByLicensePlate(formData.licensePlate);
    
    if (data) {
        setFormData(prev => ({
            ...prev,
            make: data.make,
            model: data.model,
            year: data.year,
            fuelType: data.fuelType,
            apkDate: data.apkDate || ''
        }));
    } else {
        setRdwError("Kenteken niet gevonden of onbekend.");
    }
    setLoadingRDW(false);
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-neutral-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 dark:[color-scheme:dark]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-neutral-800 bg-gradient-to-r from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-800 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-primary">
                <CarFront size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {initialData ? 'Auto Bewerken' : 'Nieuwe Auto'}
            </h2>
          </div>
          <button onClick={handleClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 p-2 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div 
            className="w-full h-40 rounded-xl border-2 border-dashed border-gray-300 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-950 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-900 hover:border-primary/50 transition-all group overflow-hidden relative"
            onClick={() => !isSubmitting && !isCompressing && fileInputRef.current?.click()}
          >
            {isCompressing ? (
                 <div className="flex flex-col items-center text-primary">
                    <Loader2 size={32} className="animate-spin mb-2" />
                    <span className="text-sm">Afbeelding verwerken...</span>
                 </div>
            ) : formData.photoUrl ? (
                <>
                  <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-medium flex items-center gap-2">
                        <Camera size={20} /> Wijzigen
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors z-20"
                    title="Foto verwijderen"
                  >
                      <Trash2 size={16} />
                  </button>
                </>
            ) : (
                <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center">
                    <div className="bg-white dark:bg-neutral-900 p-3 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
                        <Camera size={24} className="text-primary" />
                    </div>
                    <span className="text-sm font-medium">Foto toevoegen</span>
                </div>
            )}
            <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageSelect}
            />
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Kenteken</label>
              <div className="flex gap-2">
                <input 
                  required
                  name="licensePlate"
                  type="text" 
                  placeholder="XX-XX-XX"
                  className={`${inputClasses} uppercase tracking-wider font-bold text-center bg-yellow-300 border-yellow-400 focus:bg-yellow-300 focus:border-yellow-500 focus:ring-yellow-500/20 text-black placeholder-yellow-600/50 dark:bg-yellow-400 dark:text-black dark:border-yellow-500`}
                  value={formData.licensePlate}
                  onChange={handleChange}
                  onBlur={handleLookupLicensePlate}
                />
                <button 
                    type="button"
                    onClick={handleLookupLicensePlate}
                    disabled={loadingRDW || isSubmitting}
                    className="bg-primary hover:bg-sky-600 text-white px-4 rounded-xl font-medium transition-colors flex items-center justify-center min-w-[50px]"
                >
                    {loadingRDW ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
              </div>
              {rdwError && <p className="text-red-500 text-xs mt-2 ml-1">{rdwError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Merk</label>
              <input 
                required
                name="make"
                type="text" 
                placeholder="bv. Volkswagen"
                className={inputClasses}
                value={formData.make}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Model</label>
              <input 
                required
                name="model"
                type="text" 
                placeholder="bv. Golf"
                className={inputClasses}
                value={formData.model}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Bouwjaar</label>
              <input 
                required
                name="year"
                type="number" 
                min="1900"
                max={new Date().getFullYear() + 1}
                className={inputClasses}
                value={formData.year}
                onChange={handleChange}
              />
            </div>
             <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Brandstof</label>
              <div className="relative">
                <select 
                    name="fuelType"
                    className={`${inputClasses} appearance-none`}
                    value={formData.fuelType}
                    onChange={handleChange}
                >
                    <option value="Benzine">Benzine</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Elektrisch">Elektrisch</option>
                    <option value="Hybride">Hybride</option>
                    <option value="LPG">LPG</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Huidige KM-stand</label>
              <input 
                name="mileage"
                type="number" 
                placeholder="0"
                className={inputClasses}
                value={formData.mileage || ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">APK Geldig Tot</label>
              <input 
                name="apkDate"
                type="date"
                className={inputClasses}
                value={formData.apkDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">VIN / Chassisnummer</label>
             <input 
                name="vin"
                type="text" 
                placeholder="Optioneel"
                className={`${inputClasses} font-mono uppercase`}
                value={formData.vin}
                onChange={handleChange}
              />
          </div>

          <div className="flex gap-3 mt-2">
            {initialData && onDelete && (
                <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title="Auto Verwijderen"
                >
                    <Trash2 size={20} />
                </button>
            )}

            <button 
                type="submit"
                disabled={isSubmitting || isCompressing}
                className="flex-1 bg-gradient-to-r from-primary to-secondary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : initialData ? <Save size={20} /> : <PlusCircle size={20} />}
                {isSubmitting ? 'Bezig...' : initialData ? 'Wijzigingen Opslaan' : 'Auto Toevoegen'}
            </button>
          </div>
        </form>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
             <div className="absolute inset-0 z-20 bg-white/95 dark:bg-neutral-900/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                 <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full text-red-600 dark:text-red-400 mb-4">
                     <AlertCircle size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Auto Verwijderen?</h3>
                 <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
                     Weet je zeker dat je de <strong>{formData.make} {formData.model}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                 </p>
                 <div className="flex gap-3 w-full max-w-xs">
                     <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
                     >
                         Annuleren
                     </button>
                     <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-500/20"
                     >
                         {isDeleting ? 'Verwijderen...' : 'Ja, verwijder'}
                     </button>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default AddCarModal;