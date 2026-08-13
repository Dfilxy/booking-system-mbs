import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBb_KYmXmAvULjUvU2WVNvPjvyj4QWai9Q",
  authDomain: "gor-mbs-booking.firebaseapp.com",
  projectId: "gor-mbs-booking",
  storageBucket: "gor-mbs-booking.firebasestorage.app",
  messagingSenderId: "801530211255",
  appId: "1:801530211255:web:c167951d160744711b1632",
  measurementId: "G-16H41DVL8G"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
