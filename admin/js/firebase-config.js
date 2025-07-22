// Firebase Configuration
// In production, this should be served from a secure environment variable or server-side
// Never commit sensitive API keys to version control

const FIREBASE_CONFIG = {
    apiKey: "#",
    authDomain: "#",
    projectId: "#",
    storageBucket: "",
    messagingSenderId: "",
    appId: "#",
    measurementId: ""
};

// Make config available globally
window.FIREBASE_CONFIG = FIREBASE_CONFIG;

// Production Security Notes:
// 1. In production, serve this from environment variables
// 2. Use Firebase App Check for additional security
// 3. Implement proper Firestore security rules
// 4. Consider using Firebase Functions for sensitive operations
// 5. Enable Firebase Authentication domain restrictions
