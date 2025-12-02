import React from 'react';
import { Car } from '../types';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Props {
  cars: Car[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCar: (carId: string, task?: string) => void;
}

const NotificationCenter: React.FC<Props> = ({ cars, isOpen, onClose, onSelectCar }) => {
  if (!isOpen) return null;

  // Collect all alerts from all cars
  const alerts = cars.flatMap(car => {
    if (!car.lastAdvice) return [];
    
    return car.lastAdvice
        .filter(advice => {
            // Filter logic: High urgency OR close to due mileage (within 1000km) OR overdue
            const isHighUrgency = advice.urgency === 'high';
            const isDueSoon = advice.dueMileage ? (advice.dueMileage - car.mileage) < 1000 : false;
            return isHighUrgency || isDueSoon;
        })
        .map(advice => ({
            car,
            advice
        }));
  });

  return (
    <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-40" onClick={onClose}></div>
        
        {/* Popover */}
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right mx-4 sm:mx-0">
            <div className="p-4 border-b border-gray-50 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Bell size={16} className="text-gray-500 dark:text-gray-400" />
                    Notificaties
                </h3>
                <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{alerts.length}</span>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
                {alerts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                        <CheckCircle size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm">Geen urgente meldingen.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-slate-800">
                        {alerts.map((alert, idx) => {
                            const isOverdue = alert.advice.dueMileage && alert.car.mileage > alert.advice.dueMileage;
                            
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => {
                                        onSelectCar(alert.car.id, alert.advice.task);
                                        onClose();
                                    }}
                                    className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-1 ${alert.advice.urgency === 'high' || isOverdue ? 'text-red-500' : 'text-orange-500'}`}>
                                            <AlertTriangle size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-0.5">{alert.car.make} {alert.car.model}</p>
                                            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors">
                                                {alert.advice.task}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {isOverdue 
                                                    ? `Over tijd! (${alert.car.mileage - (alert.advice.dueMileage || 0)} km)` 
                                                    : alert.advice.reason}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </>
  );
};

export default NotificationCenter;