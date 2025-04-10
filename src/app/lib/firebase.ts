import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// isi konfigurasi sesuai dengan konfigurasi firebase kalian
const firebaseConfig = {
    apiKey: "AIzaSyC82On6eY6w2C3XXpsVNyLT0njOPWIH2Hw",
    authDomain: "to-do-list-b78df.firebaseapp.com",
    projectId: "to-do-list-b78df",
    storageBucket: "to-do-list-b78df.firebasestorage.app",
    messagingSenderId: "948340400294",
    appId: "1:948340400294:web:71f62e272447026be51467",
    measurementId: "G-LRBLY5M95G"   
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
