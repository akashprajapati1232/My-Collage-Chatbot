// Firebase Configuration
// In production, this should be served from a secure environment variable or server-side
// Never commit sensitive API keys to version control

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA0gXeFSshTDc-tAlXYHK_xezkNblz7GMg",
    authDomain: "bitbot-d967b.firebaseapp.com",
    projectId: "bitbot-d967b",
    storageBucket: "bitbot-d967b.firebasestorage.app",
    messagingSenderId: "416388708240",
    appId: "1:416388708240:web:dbbc2c271ca15e36cfe515",
    measurementId: "G-9L48V12SBB"
};

// Make config available globally
window.FIREBASE_CONFIG = FIREBASE_CONFIG;

// Production Security Notes:
// 1. In production, serve this from environment variables
// 2. Use Firebase App Check for additional security
// 3. Implement proper Firestore security rules
// 4. Consider using Firebase Functions for sensitive operations
// 5. Enable Firebase Authentication domain restrictions
