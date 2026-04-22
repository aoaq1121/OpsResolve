import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  limit 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUydvAmR94UH1CHaxit4neUHLYULhS01w",
  authDomain: "opsresolve.firebaseapp.com",
  projectId: "opsresolve",
  storageBucket: "opsresolve.firebasestorage.app",
  messagingSenderId: "965202900693",
  appId: "1:965202900693:web:4decc6781b6b3c38c1d45c",
  measurementId: "G-ZQ273GEVCJ"
};

// 1. Initialize the app once
const app = initializeApp(firebaseConfig);

// 2. Initialize Firestore once
export const db = getFirestore(app);

// 3. Export all the tools you and the supervisor need
export { collection, addDoc, onSnapshot, updateDoc, doc, query, orderBy, limit };