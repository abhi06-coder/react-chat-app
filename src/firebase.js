import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdmgUVlLZICknS0YFA4xVAw_kXnbwMnyA",
  authDomain: "my-chat-app-4b0a5.firebaseapp.com",
  projectId: "my-chat-app-4b0a5",
  storageBucket: "my-chat-app-4b0a5.appspot.com",
  messagingSenderId: "108847860844",
  appId: "1:108847860844:web:70a2590ba02621b42e9c49",
  measurementId: "G-GV33H2TW7V"
};


// Initialize Firebase
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (error) {
    console.error("Error initializing Firebase:", error);
    // This can happen with hot-reloading. We'll try to get the existing app.
    if (error.code === 'duplicate-app') {
        app = initializeApp(firebaseConfig, "secondary"); // Give it a unique name
    } else {
        // Handle other errors
    }
}


// Export the instances for use in other parts of the app
export const auth = getAuth(app);
export const db = getFirestore(app);
