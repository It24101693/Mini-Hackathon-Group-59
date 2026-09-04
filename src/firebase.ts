import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMtR0cpfDAJciSyy5878h35M5W-Jf9MHs",
  authDomain: "codoconsole.firebaseapp.com",
  projectId: "codoconsole",
  storageBucket: "codoconsole.firebasestorage.app",
  messagingSenderId: "865339682705",
  appId: "1:865339682705:web:0d1446ca65a969826a7430",
  measurementId: "G-J8L3GHJNQ4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ✅ Export as 'firestore' (not 'db') to match dbService.ts import
export const firestore = getFirestore(app);