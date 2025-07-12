// client/firebase-config.js
import {initializeApp} from "firebase/app";
import {getAuth} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAHdfVHFKiSI6Dghnv3-s4x-I8YRssjSjg",
    authDomain: "fixmate-project.firebaseapp.com",
    projectId: "fixmate-project",
    storageBucket: "fixmate-project.appspot.com", // <-- fixed
    messagingSenderId: "1040666277738",
    appId: "1:1040666277738:web:bddfe9c8f6c6ef2a105713",
    measurementId: "G-EZBBPKQ7XJ"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
