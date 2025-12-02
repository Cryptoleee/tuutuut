import React, { useState, useEffect, useRef } from 'react';
import { MaintenanceRecord } from '../types';
import { X, ClipboardList, Upload, FileText, Trash2, Eye, Loader2 } from 'lucide-react';
import { uploadFileToStorage } from '../services/storageService';
import { auth } from '../firebase';
import { compressImage } from '../utils/imageUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<MaintenanceRecord, 'id'>) => Promise<void>;
  carId: string;
  initialData?: Partial<MaintenanceRecord>;
}

const AddLogModal: React.FC<Props> = ({ isOpen, onClose, onSave, carId, initialData }) => {
  const defaultForm = {
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: 0,
    mileageAtService: 0,
    receiptUrl: ''
  };

  const [formData, setFormData] = useState(defaultForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setFormData(prev => ({
                ...defaultForm,
                ...initialData,
                date: initialData.date || new Date().toISOString().split('T')[0],
                receiptUrl: initialData.receiptUrl || ''
            }));
        } else {
            setFormData(defaultForm);
        }
        setSelectedFile(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
        let receiptUrl = formData.receiptUrl;

        // Upload new receipt if selected
        if (selectedFile) {
             if (auth.currentUser) {
                const fileName = `receipt_${Date.now()}_${selectedFile.name}`;
                const path = `users/${auth.currentUser.uid}/logs/${fileName}`;
                receiptUrl = await uploadFileToStorage(selectedFile, path);
             } else {
                 // For Guest: Keep local base64 preview as final url
             }
        }

        await onSave({
            ...formData,
            receiptUrl,
            carId,
        });
        
        onClose();
    } catch (error) {
        console.error("Failed to save log", error);
        alert("Fout bij opslaan. Probeer opnieuw.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'cost' || name === 'mileageAtService' ? Number(value) : value
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressing(true);
        const compressedFile = await compressImage(file);
        setSelectedFile(compressedFile);
        
        // Local preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ ...prev, receiptUrl: reader.result as string }));
          setIsCompressing(false);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Compression error", error);
        alert("Kon werkbon niet verwerken.");
        setIsCompressing(false);
      }
    }
  };

  const removeReceipt = () => {
      setFormData(prev => ({ ...prev, receiptUrl: '' }));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200";
  const isEditing = initialData && initialData.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-primary">
                <ClipboardList size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {isEditing ? 'Onderhoud Bewerken' : initialData ? 'Onderhoud Voltooien' : 'Onderhoud Registreren'}
            </h2>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Wat is er gedaan?</label>
            <input 
              required
              name="title"
              type="text" 
              placeholder="bv. Olie ververst, APK, Nieuwe banden"
              className={inputClasses}
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Datum</label>
              <input 
                required
                name="date"
                type="date" 
                className={inputClasses}
                value={formData.date}
                onChange={handleChange}
              />
            </div>
             <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">KM-stand</label>
              <input 
                required
                name="mileageAtService"
                type="number" 
                placeholder="bv. 120000"
                className={inputClasses}
                value={formData.mileageAtService || ''}
                onChange={handleChange}
              />
            </div>
          </div>

           <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Kosten (€)</label>
            <input 
              name="cost"
              type="number" 
              step="0.01"
              placeholder="0.00"
              className={inputClasses}
              value={formData.cost || ''}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Extra omschrijving (optioneel)</label>
            <textarea 
              name="description"
              rows={3}
              placeholder="Bijzonderheden, naam garage, gebruikte onderdelen..."
              className={`${inputClasses} resize-none`}
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {/* Receipt Upload Section */}
          <div className="pt-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Werkbon / Factuur</label>
            
            {formData.receiptUrl ? (
                <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                    <img src={formData.receiptUrl} alt="Receipt" className="w-full h-48 object-contain bg-gray-100 dark:bg-slate-800" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button 
                            type="button"
                            onClick={() => window.open(formData.receiptUrl)}
                            className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                            title="Bekijken"
                        >
                            <Eye size={20} />
                        </button>
                        <button 
                            type="button"
                            onClick={removeReceipt}
                            className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                            title="Verwijderen"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            ) : (
                <div 
                    onClick={() => !isSubmitting && !isCompressing && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-primary/50 transition-all bg-gray-50/50 dark:bg-slate-900/50"
                >
                    {isCompressing ? (
                        <div className="flex flex-col items-center text-primary">
                            <Loader2 size={24} className="animate-spin mb-2" />
                            <span className="text-sm">Verkleinen...</span>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-full mb-2 shadow-sm text-gray-400 dark:text-gray-500">
                                <FileText size={24} />
                            </div>
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Klik om werkbon te uploaden</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Afbeelding</span>
                        </>
                    )}
                </div>
            )}
            <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload}
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || isCompressing}
            className="w-full mt-2 bg-gradient-to-r from-primary to-secondary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : null}
            {isSubmitting ? 'Opslaan...' : (isEditing ? 'Wijzigingen Opslaan' : 'Opslaan')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddLogModal;