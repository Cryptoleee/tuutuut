import React, { useState, useEffect, useRef } from 'react';
import { MaintenanceRecord } from '../types';
import { X, ClipboardList, Upload, FileText, Trash2, Eye, Loader2, Wrench, Droplet, Filter, AlertCircle } from 'lucide-react';
import { uploadFileToStorage } from '../services/storageService';
import { deleteLogFromFirestore } from '../services/firestoreService';
import { auth } from '../firebase';
import { compressImage } from '../utils/imageUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<MaintenanceRecord, 'id'>) => Promise<void>;
  onDelete?: (logId: string) => Promise<void>; // Added onDelete prop
  carId: string;
  initialData?: Partial<MaintenanceRecord>;
}

// Maintenance Templates
const TEMPLATES = [
    { id: 'custom', label: 'Handmatig invoeren', icon: <FileText size={18} /> },
    { id: 'oil_change', label: 'Olie Verversen', icon: <Droplet size={18} /> },
];

const AddLogModal: React.FC<Props> = ({ isOpen, onClose, onSave, onDelete, carId, initialData }) => {
  const defaultForm = {
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: 0,
    mileageAtService: 0,
    receiptUrl: ''
  };

  const [formData, setFormData] = useState(defaultForm);
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  
  // Specific fields for templates
  const [oilDetails, setOilDetails] = useState({
      oilType: '',
      oilAmount: '',
      replacedFilter: true,
      replacedPlug: false,
      engineFlush: false
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
            setSelectedTemplate('custom'); 
        } else {
            setFormData(defaultForm);
            setSelectedTemplate('custom');
        }
        setOilDetails({
            oilType: '',
            oilAmount: '',
            replacedFilter: true,
            replacedPlug: false,
            engineFlush: false
        });
        setSelectedFile(null);
        setShowDeleteConfirm(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const generateDescriptionFromTemplate = () => {
      if (selectedTemplate === 'oil_change') {
          let desc = `Olie ververst`;
          if (oilDetails.oilType) desc += ` met ${oilDetails.oilType}`;
          if (oilDetails.oilAmount) desc += ` (${oilDetails.oilAmount}L)`;
          desc += `.`;
          
          const parts = [];
          if (oilDetails.replacedFilter) parts.push("Oliefilter vervangen");
          if (oilDetails.replacedPlug) parts.push("Aftapplug/ring vervangen");
          if (oilDetails.engineFlush) parts.push("Motor flush uitgevoerd");
          
          if (parts.length > 0) {
              desc += `\nUitgevoerd: ${parts.join(', ')}.`;
          }
          
          if (formData.description) {
              desc += `\n\nOpmerkingen: ${formData.description}`;
          }
          return desc;
      }
      return formData.description;
  };

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

        const finalDescription = generateDescriptionFromTemplate();
        const finalTitle = selectedTemplate === 'oil_change' && !formData.title ? 'Olie Verversen' : formData.title;

        await onSave({
            ...formData,
            title: finalTitle,
            description: finalDescription,
            receiptUrl,
            carId,
        });
        
        onClose();
    } catch (error: any) {
        console.error("Failed to save log", error);
        if (error.code === 'permission-denied') {
            alert("Toegang geweigerd. Controleer je Firestore Rules.");
        } else {
            alert(`Fout bij opslaan: ${error.message}`);
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
      if (!initialData?.id) return;
      setIsDeleting(true);
      try {
          // If we have a direct onDelete prop (from App), use it. 
          // Otherwise try direct service call (though App state update is preferred)
          if (onDelete) {
              await onDelete(initialData.id);
          } else if (auth.currentUser) {
              await deleteLogFromFirestore(auth.currentUser.uid, initialData.id);
              window.location.reload(); // Fallback if no state handler
          }
          onClose();
      } catch (error) {
          console.error("Delete failed", error);
          alert("Kan item niet verwijderen");
      } finally {
          setIsDeleting(false);
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

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-neutral-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 dark:[color-scheme:dark]";
  const isEditing = initialData && initialData.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-neutral-800 bg-gradient-to-r from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-800 sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-primary">
                <ClipboardList size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {isEditing ? 'Onderhoud Bewerken' : initialData ? 'Onderhoud Voltooien' : 'Onderhoud Registreren'}
            </h2>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 p-2 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Template Selector */}
          {!isEditing && !initialData && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplate(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                            selectedTemplate === t.id 
                            ? 'bg-primary text-white shadow-md shadow-primary/20' 
                            : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                          {t.icon}
                          {t.label}
                      </button>
                  ))}
              </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">Wat is er gedaan?</label>
            <input 
              required
              name="title"
              type="text" 
              placeholder={selectedTemplate === 'oil_change' ? "Olie Verversen" : "bv. Olie ververst, APK, Nieuwe banden"}
              className={inputClasses}
              value={selectedTemplate === 'oil_change' && !formData.title ? 'Olie Verversen' : formData.title}
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
                name="mileageAtService"
                type="number" 
                placeholder="bv. 120000"
                className={inputClasses}
                value={formData.mileageAtService || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Special Template Fields: Oil Change */}
          {selectedTemplate === 'oil_change' && (
              <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 space-y-4">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                      <Droplet size={16} /> Details Oliebeurt
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Olie Type</label>
                          <input 
                            type="text" 
                            placeholder="bv. 5W30"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                            value={oilDetails.oilType}
                            onChange={(e) => setOilDetails(prev => ({ ...prev, oilType: e.target.value }))}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Hoeveelheid (L)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            placeholder="bv. 4.5"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                            value={oilDetails.oilAmount}
                            onChange={(e) => setOilDetails(prev => ({ ...prev, oilAmount: e.target.value }))}
                          />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-primary focus:ring-primary"
                            checked={oilDetails.replacedFilter}
                            onChange={(e) => setOilDetails(prev => ({ ...prev, replacedFilter: e.target.checked }))}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Oliefilter vervangen</span>
                      </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-primary focus:ring-primary"
                            checked={oilDetails.replacedPlug}
                            onChange={(e) => setOilDetails(prev => ({ ...prev, replacedPlug: e.target.checked }))}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Aftapplug/ring vervangen</span>
                      </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-primary focus:ring-primary"
                            checked={oilDetails.engineFlush}
                            onChange={(e) => setOilDetails(prev => ({ ...prev, engineFlush: e.target.checked }))}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Motor flush uitgevoerd</span>
                      </label>
                  </div>
              </div>
          )}

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
                <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900">
                    <img src={formData.receiptUrl} alt="Receipt" className="w-full h-48 object-contain bg-gray-100 dark:bg-neutral-800" />
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
                    className="border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 hover:border-primary/50 transition-all bg-gray-50/50 dark:bg-neutral-900/50"
                >
                    {isCompressing ? (
                        <div className="flex flex-col items-center text-primary">
                            <Loader2 size={24} className="animate-spin mb-2" />
                            <span className="text-sm">Verkleinen...</span>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white dark:bg-neutral-800 p-3 rounded-full mb-2 shadow-sm text-gray-400 dark:text-gray-500">
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

          <div className="flex gap-3 mt-2">
            {isEditing && (
                <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    title="Verwijderen"
                >
                    <Trash2 size={20} />
                </button>
            )}

            <button 
                type="submit"
                disabled={isSubmitting || isCompressing}
                className="flex-1 bg-gradient-to-r from-primary to-secondary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : null}
                {isSubmitting ? 'Opslaan...' : (isEditing ? 'Wijzigingen Opslaan' : 'Opslaan')}
            </button>
          </div>
        </form>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
             <div className="absolute inset-0 z-20 bg-white/95 dark:bg-neutral-900/95 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                 <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full text-red-600 dark:text-red-400 mb-4">
                     <AlertCircle size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Weet je het zeker?</h3>
                 <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
                     Dit item wordt permanent verwijderd en kan niet worden hersteld.
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

export default AddLogModal;