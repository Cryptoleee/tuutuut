
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Car, MaintenanceRecord, DIYTask } from '../types';

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

export const deleteCarFromFirestore = async (userId: string, carId: string) => {
  const carRef = doc(db, USERS_COLLECTION, userId, 'cars', carId);
  await deleteDoc(carRef);
  // Note: Subcollections (logs) are not automatically deleted in standard Firestore client.
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

export const deleteLogFromFirestore = async (userId: string, logId: string) => {
  const logRef = doc(db, USERS_COLLECTION, userId, 'logs', logId);
  await deleteDoc(logRef);
};

// -- DIY TASKS --

export const subscribeToDIYTasks = (userId: string, callback: (tasks: DIYTask[]) => void) => {
  const tasksRef = collection(db, USERS_COLLECTION, userId, 'diyTasks');
  return onSnapshot(tasksRef, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DIYTask));
    callback(tasks);
  });
};

export const addDIYTaskToFirestore = async (userId: string, task: DIYTask) => {
  const taskRef = doc(db, USERS_COLLECTION, userId, 'diyTasks', task.id);
  await setDoc(taskRef, task);
};

export const updateDIYTaskInFirestore = async (userId: string, task: DIYTask) => {
  const taskRef = doc(db, USERS_COLLECTION, userId, 'diyTasks', task.id);
  await updateDoc(taskRef, { ...task });
};

export const deleteDIYTaskFromFirestore = async (userId: string, taskId: string) => {
  const taskRef = doc(db, USERS_COLLECTION, userId, 'diyTasks', taskId);
  await deleteDoc(taskRef);
};
