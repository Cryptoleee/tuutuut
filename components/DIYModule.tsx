import React, { useState } from 'react';
import { DIYTask } from '../types';
import { Wrench, Plus, CheckCircle, Circle, Clock, Trash2, Edit2, X, Euro, Calendar, AlertTriangle, ChevronDown } from 'lucide-react';

interface Props {
  carId: string;
  tasks: DIYTask[];
  onAddTask: (task: Omit<DIYTask, 'id'>) => Promise<void>;
  onUpdateTask: (task: DIYTask) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onConvertToLog: (task: DIYTask) => void;
}

const DIYModule: React.FC<Props> = ({ carId, tasks, onAddTask, onUpdateTask, onDeleteTask, onConvertToLog }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Form State
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const resetForm = () => {
    setTitle('');
    setPriority('normal');
    setCost('');
    setNotes('');
    setScheduledDate('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
        carId,
        title,
        priority,
        estimatedCost: cost ? parseFloat(cost) : undefined,
        notes,
        scheduledDate: scheduledDate || undefined,
        status: 'todo' as const,
        createdAt: new Date().toISOString()
    };

    if (editingId) {
        const existing = tasks.find(t => t.id === editingId);
        if (existing) {
            await onUpdateTask({ ...existing, ...taskData, status: existing.status, id: existing.id });
        }
    } else {
        await onAddTask(taskData);
    }
    resetForm();
  };

  const handleEdit = (task: DIYTask) => {
      setTitle(task.title);
      setPriority(task.priority);
      setCost(task.estimatedCost?.toString() || '');
      setNotes(task.notes || '');
      setScheduledDate(task.scheduledDate || '');
      setEditingId(task.id);
      setIsAdding(true);
  };

  const toggleStatus = async (task: DIYTask) => {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      
      if (newStatus === 'done') {
          // Confirm conversion to log
          if (confirm('Top! Wil je deze klus direct toevoegen aan je logboek?')) {
              onConvertToLog(task);
              // We do NOT update status here, the parent will handle deletion/conversion
              return; 
          }
      }
      
      await onUpdateTask({ ...task, status: newStatus });
  };

  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
          case 'low': return 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-400';
          default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
      if (a.status === b.status) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return a.status === 'done' ? 1 : -1;
  });

  // Agenda Logic
  const scheduledTasks = tasks.filter(t => t.scheduledDate && t.status !== 'done').sort((a, b) => {
      return new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime();
  });

  const getDayLabel = (dateStr: string) => {
      const date = new Date(dateStr);
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const d = new Date(date);
      d.setHours(0,0,0,0);

      if (d < today) return 'Over tijd';
      if (d.getTime() === today.getTime()) return 'Vandaag';
      if (d.getTime() === tomorrow.getTime()) return 'Morgen';
      return date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden flex flex-col transition-all duration-300 h-auto">
        <div className="p-5 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-gradient-to-r from-orange-50/50 to-amber-50/50 dark:from-neutral-800 dark:to-neutral-800/50">
            <div className="flex items-center gap-2">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-1.5 rounded-lg text-orange-600 dark:text-orange-500">
                    <Wrench size={18} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Mijn Kluslijst</h2>
            </div>
            <div className="flex items-center gap-2">
                {!isAdding && (
                    <button 
                        onClick={() => { setIsExpanded(true); setIsAdding(true); }}
                        className="flex items-center gap-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95"
                    >
                        <Plus size={14} />
                        <span>Nieuwe Klus</span>
                    </button>
                )}
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                     <ChevronDown size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>
        </div>

        {isExpanded && (
            <div className="p-4 flex-1 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-300">
                {isAdding && (
                    <form onSubmit={handleSubmit} className="mb-2 bg-gray-50 dark:bg-neutral-950 p-4 rounded-xl border border-gray-200 dark:border-neutral-800 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">{editingId ? 'Klus Bewerken' : 'Nieuwe Klus'}</h3>
                            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Wat moet er gebeuren?" 
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            
                            <div className="flex gap-3">
                                <select 
                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm outline-none"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as any)}
                                >
                                    <option value="low">Lage Prio</option>
                                    <option value="normal">Normaal</option>
                                    <option value="high">Hoog</option>
                                </select>
                                
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-2 text-gray-400 text-xs">€</span>
                                    <input 
                                        type="number" 
                                        placeholder="Budget" 
                                        className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm outline-none"
                                        value={cost}
                                        onChange={(e) => setCost(e.target.value)}
                                    />
                                </div>
                            </div>

                             <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Calendar size={14} className="text-gray-400" />
                                </div>
                                <input 
                                    type="date" 
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                />
                            </div>

                            <textarea 
                                placeholder="Notities, onderdelen nummers, etc..."
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />

                            <button 
                                type="submit"
                                className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-2.5 rounded-lg text-sm shadow-md hover:shadow-lg transition-all"
                            >
                                {editingId ? 'Wijzigen' : 'Toevoegen'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Task List */}
                <div className="space-y-3">
                    {sortedTasks.length === 0 && !isAdding && (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                            <Wrench size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Geen openstaande klussen.</p>
                            <p className="text-xs mt-1">Plan je volgende project!</p>
                        </div>
                    )}

                    {sortedTasks.map(task => (
                        <div 
                            key={task.id} 
                            className={`group relative p-3 rounded-xl border transition-all ${
                                task.status === 'done' 
                                ? 'bg-gray-50 dark:bg-neutral-900 border-gray-100 dark:border-neutral-800 opacity-60' 
                                : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 shadow-sm hover:border-orange-300 dark:hover:border-neutral-600'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <button 
                                    onClick={() => toggleStatus(task)}
                                    className={`mt-0.5 shrink-0 transition-colors ${task.status === 'done' ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}
                                >
                                    {task.status === 'done' ? <CheckCircle size={20} /> : <Circle size={20} />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <h4 className={`font-medium text-sm truncate ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                            {task.title}
                                        </h4>
                                        <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(task)} className="text-gray-400 hover:text-blue-500">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => onDeleteTask(task.id)} className="text-gray-400 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${getPriorityColor(task.priority)}`}>
                                            {task.priority === 'normal' ? 'Normaal' : task.priority === 'high' ? 'Hoog' : 'Laag'}
                                        </span>
                                        
                                        {task.scheduledDate && (
                                            <span className="flex items-center gap-0.5 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">
                                                <Calendar size={10} />
                                                {new Date(task.scheduledDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                                            </span>
                                        )}

                                        {task.estimatedCost && (
                                            <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                                <Euro size={10} />
                                                {task.estimatedCost}
                                            </span>
                                        )}

                                        {task.notes && (
                                            <span className="text-xs text-gray-400 truncate max-w-[150px]" title={task.notes}>
                                                {task.notes}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Agenda View */}
                {scheduledTasks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                            <Calendar size={16} className="text-primary" />
                            Planning
                        </h3>
                        <div className="space-y-2">
                            {scheduledTasks.map(task => {
                                const label = getDayLabel(task.scheduledDate!);
                                const isOverdue = label === 'Over tijd';
                                const isToday = label === 'Vandaag';
                                
                                return (
                                    <div key={task.id} className="flex items-center gap-3 bg-gray-50 dark:bg-neutral-950 p-3 rounded-xl border border-gray-100 dark:border-neutral-800">
                                        <div className={`shrink-0 w-16 text-center text-xs font-bold py-1 rounded-md ${
                                            isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                            isToday ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                            'bg-gray-200 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'
                                        }`}>
                                            {label}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{task.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(task.scheduledDate!).toLocaleDateString('nl-NL')}</p>
                                        </div>
                                        {isOverdue && <AlertTriangle size={16} className="text-red-500" />}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default DIYModule;