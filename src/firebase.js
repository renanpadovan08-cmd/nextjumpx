import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADg5nYfj49vG2y08zFBaUNHoxatpXuiJ8",
  authDomain: "nextjumpx.firebaseapp.com",
  projectId: "nextjumpx",
  storageBucket: "nextjumpx.firebasestorage.app",
  messagingSenderId: "244868405828",
  appId: "1:244868405828:web:e2d5d05d2d477494e83a11",
  measurementId: "G-CL6WQGKRRC"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);