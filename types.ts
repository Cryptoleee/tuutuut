export interface Car {
  id: string;
  make: string; // Merk
  model: string; // Model
  year: number; // Bouwjaar
  mileage: number; // Huidige kilometerstand
  fuelType: string; // Benzine, Diesel, Elektrisch, etc.
  licensePlate: string; // Kenteken
  vin?: string; // Vehicle Identification Number
  apkDate?: string; // APK Expiry Date (YYYY-MM-DD)
  photoUrl?: string; // Base64 string of the car image
  lastAdvice?: MaintenanceSuggestion[]; // Cache for AI advice
  lastAdviceDate?: string; // Timestamp of last advice
}

export interface MaintenanceRecord {
  id: string;
  carId: string;
  date: string;
  title: string; // e.g. "Grote beurt" or "Banden vervangen"
  description: string;
  cost: number;
  mileageAtService: number;
  receiptUrl?: string; // Base64 string of the invoice/receipt image
}

export interface MaintenanceSuggestion {
  task: string;
  urgency: 'high' | 'medium' | 'low';
  reason: string;
  estimatedCostRange?: string;
  dueMileage?: number; // Estimated mileage when this is due
  intervalKm?: number; // How often this usually happens (for the progress bar)
  diyTip?: string; // A smart tip for the user to check themselves
}