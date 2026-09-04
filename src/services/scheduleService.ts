import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { firestore } from '../firebase';
import type { Schedule } from '../types/schedule';

const SCHEDULES_COLLECTION = 'schedules';

export const addSchedule = async (schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(firestore, SCHEDULES_COLLECTION), {
      ...schedule,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    console.log('✅ Schedule saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding schedule:', error);
    throw error;
  }
};

export const updateSchedule = async (schedule: Schedule) => {
  try {
    const { id, ...updateData } = schedule;
    const docRef = doc(firestore, SCHEDULES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Date.now()
    });
    console.log('✅ Schedule updated:', id);
  } catch (error) {
    console.error('❌ Error updating schedule:', error);
    throw error;
  }
};

export const deleteSchedule = async (id: string) => {
  try {
    await deleteDoc(doc(firestore, SCHEDULES_COLLECTION, id));
    console.log('✅ Schedule deleted:', id);
  } catch (error) {
    console.error('❌ Error deleting schedule:', error);
    throw error;
  }
};

export const getSchedules = (callback: (schedules: Schedule[]) => void) => {
  console.log('📡 Listening for schedules...');
  const q = query(collection(firestore, SCHEDULES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const schedules: Schedule[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      schedules.push({
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        assignedTo: data.assignedTo || 'all',
        date: data.date || '',
        timeSlots: data.timeSlots || [],
        notes: data.notes || '',
        target: data.target || { type: 'weekly', value: 0, unit: 'leads' },
        createdBy: data.createdBy || '',
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
      });
    });
    console.log('📊 Schedules loaded:', schedules.length);
    callback(schedules);
  }, (error) => {
    console.error('❌ Error fetching schedules:', error);
  });
};

export const getSchedulesForUser = (username: string, callback: (schedules: Schedule[]) => void) => {
  console.log('📡 Listening for schedules for user:', username);
  const q = query(
    collection(firestore, SCHEDULES_COLLECTION),
    where('assignedTo', 'in', [username, 'all'])
  );
  return onSnapshot(q, (snapshot) => {
    const schedules: Schedule[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      schedules.push({
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        assignedTo: data.assignedTo || 'all',
        date: data.date || '',
        timeSlots: data.timeSlots || [],
        notes: data.notes || '',
        target: data.target || { type: 'weekly', value: 0, unit: 'leads' },
        createdBy: data.createdBy || '',
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
      });
    });
    console.log('📊 Schedules loaded for user:', schedules.length);
    callback(schedules);
  }, (error) => {
    console.error('❌ Error fetching schedules:', error);
  });
};

export const scheduleService = {
  addSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedules,
  getSchedulesForUser
};