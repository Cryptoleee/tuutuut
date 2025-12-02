import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Car, MaintenanceRecord } from '../types';

// Collection references
const USERS_COLLECTION = 'users';

// -- CARS --

export const subscribeToCars = (userId: string, callback: (cars: Car[]) => void) => {
  const carsRef = collection(db, USERS_COLLECTION, userId, 'cars');
  return onSnapshot(carsRef, (snapshot) => {
    const cars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Car));
    callback(cars);
  });
};

export const addCarToFirestore = async (userId: string, car: Car) => {
  const carRef = doc(db, USERS_COLLECTION, userId, 'cars', car.id);
  await setDoc(carRef, car);
};

export const updateCarInFirestore = async (userId: string, car: Car) => {
  const carRef = doc(db, USERS_COLLECTION, userId, 'cars', car.id);
  await updateDoc(carRef, { ...car });
};

// -- LOGS --

export const subscribeToLogs = (userId: string, callback: (logs: MaintenanceRecord[]) => void) => {
  const logsRef = collection(db, USERS_COLLECTION, userId, 'logs');
  return onSnapshot(logsRef, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRecord));
    callback(logs);
  });
};

export const addLogToFirestore = async (userId: string, log: MaintenanceRecord) => {
  const logRef = doc(db, USERS_COLLECTION, userId, 'logs', log.id);
  await setDoc(logRef, log);
};

export const updateLogInFirestore = async (userId: string, log: MaintenanceRecord) => {
  const logRef = doc(db, USERS_COLLECTION, userId, 'logs', log.id);
  await updateDoc(logRef, { ...log });
};