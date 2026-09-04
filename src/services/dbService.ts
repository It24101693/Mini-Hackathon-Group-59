import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '../firebase';

export interface Lead {
  id: string;
  businessName: string;
  field: string;
  ownerName: string;
  ownerContact: string;
  country: string;
  city: string;
  businessContact: string;
  email: string;
  workingHours: string;
  managerName: string;
  response: 'none' | 'positive' | 'negative';
  proposalSent: 'yes' | 'no';
  proposalAccepted: 'yes' | 'no';
  paidAmount: number;
  dealClosed: 'yes' | 'no';
  packageType: 'none' | 'one-time' | 'subscription';
  cost: number;
  caller: string;
  engineer1: string;
  engineer2: string;
  engineer3: string;
  numberNotWorking: 'yes' | 'no';
  deployedLink: string;
  domain: string;
  renewalDate: string;
  googleLink: string;
  notes: string;
  followUp: string;
  currency: string;
  totalProjectValue: number;
  paidToDate: number;
  paymentSchedule: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  subscriptionStartDate: string;
  lastPaymentDate: string;
  nextPaymentDate: string;
  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'overdue';
  createdAt: number;
  updatedAt: number;
}

export interface Employer {
  fullName: string;
  username: string;
  password: string;
}

export interface ExchangeRate {
  currency: string;
  rateToLKR: number;
  updatedAt: number;
}

const LEADS_COLLECTION = 'leads';
const EMPLOYERS_COLLECTION = 'employers';
const EXCHANGE_RATES_COLLECTION = 'exchangeRates';

// ============================================
// LEADS CRUD OPERATIONS
// ============================================

export const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    console.log('📝 Adding lead to Firebase:', leadData.businessName);
    const docRef = await addDoc(collection(firestore, LEADS_COLLECTION), {
      ...leadData,
      currency: leadData.currency || 'USD', // ← ADD DEFAULT
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    console.log('✅ Lead saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding lead:', error);
    throw error;
  }
};

export const updateLead = async (lead: Lead) => {
  try {
    console.log('📝 Updating lead:', lead.id);
    const { id, ...updateData } = lead;
    const docRef = doc(firestore, LEADS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Date.now()
    });
    console.log('✅ Lead updated:', id);
  } catch (error) {
    console.error('❌ Error updating lead:', error);
    throw error;
  }
};

export const deleteLead = async (id: string) => {
  try {
    console.log('🗑️ Deleting lead:', id);
    await deleteDoc(doc(firestore, LEADS_COLLECTION, id));
    console.log('✅ Lead deleted:', id);
  } catch (error) {
    console.error('❌ Error deleting lead:', error);
    throw error;
  }
};

export const getLeads = (callback: (leads: Lead[]) => void) => {
  console.log('📡 Listening for leads...');
  const q = query(collection(firestore, LEADS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const leads: Lead[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      leads.push({
        id: doc.id,
        businessName: data.businessName || '',
        field: data.field || '',
        ownerName: data.ownerName || '',
        ownerContact: data.ownerContact || '',
        country: data.country || '',
        city: data.city || '',
        businessContact: data.businessContact || '',
        email: data.email || '',
        workingHours: data.workingHours || '',
        managerName: data.managerName || '',
        response: data.response || 'none',
        proposalSent: data.proposalSent || 'no',
        proposalAccepted: data.proposalAccepted || 'no',
        paidAmount: data.paidAmount || 0,
        dealClosed: data.dealClosed || 'no',
        packageType: data.packageType || 'none',
        cost: data.cost || 0,
        caller: data.caller || '',
        engineer1: data.engineer1 || '',
        engineer2: data.engineer2 || '',
        engineer3: data.engineer3 || '',
        numberNotWorking: data.numberNotWorking || 'no',
        deployedLink: data.deployedLink || '',
        domain: data.domain || '',
        renewalDate: data.renewalDate || '',
        googleLink: data.googleLink || '',
        notes: data.notes || '',
        followUp: data.followUp || '',
        currency: data.currency || 'USD',
        totalProjectValue: data.totalProjectValue ?? data.paidAmount ?? 0,
        paidToDate: data.paidToDate ?? data.paidAmount ?? 0,
        paymentSchedule: data.paymentSchedule || 'one-time',
        subscriptionStartDate: data.subscriptionStartDate || '',
        lastPaymentDate: data.lastPaymentDate || '',
        nextPaymentDate: data.nextPaymentDate || '',
        paymentStatus: data.paymentStatus || 'unpaid',
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
      });
    });
    console.log('📊 Leads loaded:', leads.length);
    callback(leads);
  }, (error) => {
    console.error('❌ Error fetching leads:', error);
  });
};

// ============================================
// EMPLOYERS CRUD OPERATIONS
// ============================================

export const addEmployer = async (employer: Employer) => {
  try {
    console.log('📝 Adding employer:', employer.username);
    const docRef = doc(firestore, EMPLOYERS_COLLECTION, employer.username);
    await setDoc(docRef, employer);
    console.log('✅ Employer saved:', employer.username);
    return employer.username;
  } catch (error) {
    console.error('❌ Error adding employer:', error);
    throw error;
  }
};

export const deleteEmployer = async (username: string) => {
  try {
    console.log('🗑️ Deleting employer:', username);
    await deleteDoc(doc(firestore, EMPLOYERS_COLLECTION, username));
    console.log('✅ Employer deleted:', username);
  } catch (error) {
    console.error('❌ Error deleting employer:', error);
    throw error;
  }
};

export const getEmployers = (callback: (employers: Employer[]) => void) => {
  console.log('📡 Listening for employers...');
  return onSnapshot(collection(firestore, EMPLOYERS_COLLECTION), (snapshot) => {
    const employers: Employer[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      employers.push({
        fullName: data.fullName || '',
        username: data.username || doc.id,
        password: data.password || ''
      });
    });
    console.log('👥 Employers loaded:', employers.length);
    callback(employers);
  }, (error) => {
    console.error('❌ Error fetching employers:', error);
  });
};

// ============================================
// EXCHANGE RATES OPERATIONS
// ============================================

export const getExchangeRates = (callback: (rates: ExchangeRate[]) => void) => {
  console.log('📡 Listening for exchange rates...');
  return onSnapshot(collection(firestore, EXCHANGE_RATES_COLLECTION), (snapshot) => {
    const rates: ExchangeRate[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      rates.push({
        currency: data.currency || doc.id,
        rateToLKR: data.rateToLKR || 1,
        updatedAt: data.updatedAt || Date.now()
      });
    });
    console.log('💱 Exchange rates loaded:', rates.length);
    callback(rates);
  });
};

export const updateExchangeRate = async (currency: string, rateToLKR: number) => {
  try {
    console.log('📝 Updating exchange rate:', currency, '→', rateToLKR);
    const docRef = doc(firestore, EXCHANGE_RATES_COLLECTION, currency);
    await setDoc(docRef, {
      currency,
      rateToLKR,
      updatedAt: Date.now()
    });
    console.log('✅ Exchange rate updated:', currency);
  } catch (error) {
    console.error('❌ Error updating exchange rate:', error);
    throw error;
  }
};

// ============================================
// SEED DATA
// ============================================

export const seedFirestoreIfEmpty = async () => {
  try {
    console.log('🔍 Checking if Firestore needs seeding...');
    const leadsSnapshot = await getDocs(collection(firestore, LEADS_COLLECTION));
    const employersSnapshot = await getDocs(collection(firestore, EMPLOYERS_COLLECTION));
    const ratesSnapshot = await getDocs(collection(firestore, EXCHANGE_RATES_COLLECTION));
    
    if (leadsSnapshot.empty && employersSnapshot.empty) {
      console.log('🌱 Seeding Firestore with initial data...');
      const batch = writeBatch(firestore);
      
      // Default exchange rates
      const defaultRates = [
        { currency: 'USD', rateToLKR: 313 },
        { currency: 'AUD', rateToLKR: 200 },
        { currency: 'LKR', rateToLKR: 1 },
        { currency: 'ZAR', rateToLKR: 17 },
        { currency: 'INR', rateToLKR: 3.8 },
        { currency: 'EUR', rateToLKR: 340 },
        { currency: 'GBP', rateToLKR: 390 },
      ];
      
      for (const rate of defaultRates) {
        const ref = doc(firestore, EXCHANGE_RATES_COLLECTION, rate.currency);
        batch.set(ref, { ...rate, updatedAt: Date.now() });
      }
      
      const sampleEmployer: Employer = {
        fullName: 'John Developer',
        username: 'john_dev',
        password: 'password123'
      };
      const empRef = doc(firestore, EMPLOYERS_COLLECTION, sampleEmployer.username);
      batch.set(empRef, sampleEmployer);
      
      const sampleLeads = [
        {
          businessName: 'Smith Dental Clinic',
          field: 'Dentist',
          ownerName: 'Dr. Sarah Smith',
          ownerContact: '+1-555-0101',
          country: 'USA',
          city: 'Los Angeles',
          businessContact: '+1-555-0102',
          email: 'sarah@smithdental.com',
          workingHours: '9:00 AM - 6:00 PM',
          managerName: 'Mike Johnson',
          notes: 'Interested in new website',
          response: 'positive' as const,
          proposalSent: 'yes' as const,
          proposalAccepted: 'yes' as const,
          paidAmount: 2500,
          dealClosed: 'yes' as const,
          packageType: 'one-time' as const,
          cost: 500,
          caller: 'john_dev',
          engineer1: '',
          engineer2: '',
          engineer3: '',
          numberNotWorking: 'no' as const,
          deployedLink: 'https://smithdental.com',
          domain: 'smithdental.com',
          renewalDate: '',
          googleLink: '',
          followUp: 'Scheduled follow-up call for next month',
          currency: 'USD', // ← ADD THIS
          createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now()
        },
        {
          businessName: 'TechFlow Solutions',
          field: 'IT Services',
          ownerName: 'Alex Chen',
          ownerContact: '+1-555-0201',
          country: 'USA',
          city: 'San Francisco',
          businessContact: '+1-555-0202',
          email: 'alex@techflow.com',
          workingHours: '8:00 AM - 5:00 PM',
          managerName: 'Lisa Wang',
          notes: 'Looking for subscription model',
          response: 'positive' as const,
          proposalSent: 'no' as const,
          proposalAccepted: 'no' as const,
          paidAmount: 0,
          dealClosed: 'no' as const,
          packageType: 'subscription' as const,
          cost: 0,
          caller: 'john_dev',
          engineer1: '',
          engineer2: '',
          engineer3: '',
          numberNotWorking: 'no' as const,
          deployedLink: '',
          domain: '',
          renewalDate: '',
          googleLink: '',
          followUp: 'Send proposal by Friday',
          currency: 'USD', // ← ADD THIS
          createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now()
        }
      ];
      
      for (const lead of sampleLeads) {
        const leadRef = doc(collection(firestore, LEADS_COLLECTION));
        batch.set(leadRef, lead);
      }
      
      await batch.commit();
      console.log('✅ Seeding completed!');
    } else {
      console.log('ℹ️ Firestore already has data, skipping seed.');
    }
  } catch (error) {
    console.error('❌ Error checking/seeding Firestore:', error);
  }
};

export const dbService = {
  addLead,
  updateLead,
  deleteLead,
  getLeads,
  addEmployer,
  deleteEmployer,
  getEmployers,
  seedFirestoreIfEmpty,
  getExchangeRates,
  updateExchangeRate
};