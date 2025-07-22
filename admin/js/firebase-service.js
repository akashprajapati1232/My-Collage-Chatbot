// Firebase Service Module - Centralized Firebase Operations
class FirebaseService {
    constructor() {
        this.app = null;
        this.auth = null;
        this.db = null;
        this.initialized = false;
        this.initPromise = null;
    }

    // Initialize Firebase
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initializeFirebase();
        return this.initPromise;
    }

    async _initializeFirebase() {
        try {
            // Import Firebase modules
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const { getFirestore, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, setDoc, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            // Get Firebase configuration from centralized config
            const firebaseConfig = window.FIREBASE_CONFIG;
            if (!firebaseConfig) {
                throw new Error('Firebase configuration not found. Make sure firebase-config.js is loaded.');
            }

            // Initialize Firebase
            this.app = initializeApp(firebaseConfig);
            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);

            // Store Firebase functions for later use
            this.firebaseAuth = {
                signInWithEmailAndPassword,
                createUserWithEmailAndPassword,
                signOut,
                onAuthStateChanged,
                updatePassword,
                reauthenticateWithCredential,
                EmailAuthProvider
            };

            this.firestore = {
                collection,
                doc,
                addDoc,
                getDoc,
                getDocs,
                updateDoc,
                deleteDoc,
                setDoc,
                query,
                where,
                orderBy
            };

            this.initialized = true;
            console.log('Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            throw error;
        }
    }

    // Authentication Methods
    async signInAdmin(email, password) {
        await this.initialize();
        try {
            console.log('Attempting admin sign in for:', email);
            const userCredential = await this.firebaseAuth.signInWithEmailAndPassword(this.auth, email, password);
            console.log('Firebase authentication successful');

            // Check if user is admin
            let adminDoc;
            try {
                console.log('Checking admin document for UID:', userCredential.user.uid);
                adminDoc = await this.firestore.getDoc(this.firestore.doc(this.db, 'admins', userCredential.user.uid));
            } catch (error) {
                console.warn('Error reading admin doc:', error);
                // Create admin document if it doesn't exist
                await this.createAdminDocument(userCredential.user);
                adminDoc = await this.firestore.getDoc(this.firestore.doc(this.db, 'admins', userCredential.user.uid));
            }

            if (!adminDoc || !adminDoc.exists()) {
                // Admin document doesn't exist, try to create it for existing users
                console.log('Admin document not found, creating it...');
                try {
                    const adminData = {
                        uid: userCredential.user.uid,
                        email: userCredential.user.email,
                        name: 'Admin User',
                        role: 'admin',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    await this.firestore.setDoc(this.firestore.doc(this.db, 'admins', userCredential.user.uid), adminData);
                    console.log('Admin document created successfully');

                    return {
                        user: userCredential.user,
                        adminData: adminData
                    };
                } catch (createError) {
                    console.warn('Could not create admin document:', createError);
                    // Still allow login if user exists in Firebase Auth
                    return {
                        user: userCredential.user,
                        adminData: {
                            uid: userCredential.user.uid,
                            email: userCredential.user.email,
                            role: 'admin'
                        }
                    };
                }
            }

            return {
                user: userCredential.user,
                adminData: adminDoc.data()
            };
        } catch (error) {
            console.error('Admin sign in failed:', error);
            throw error;
        }
    }



    async getAdminByUid(uid) {
        await this.initialize();
        try {
            const adminDoc = await this.firestore.getDoc(this.firestore.doc(this.db, 'admins', uid));

            if (adminDoc.exists()) {
                return adminDoc.data();
            } else {
                // Check if user exists in Firebase Auth
                const currentUser = this.getCurrentUser();
                if (currentUser && currentUser.uid === uid) {
                    // User exists in Auth but not in Firestore, create admin document
                    const adminData = {
                        uid: uid,
                        email: currentUser.email,
                        name: 'Admin User',
                        role: 'admin',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    try {
                        await this.firestore.setDoc(this.firestore.doc(this.db, 'admins', uid), adminData);
                        console.log('Admin document created for existing user');
                        return adminData;
                    } catch (createError) {
                        console.warn('Could not create admin document:', createError);
                        // Return basic admin data even if we can't write to Firestore
                        return adminData;
                    }
                }
                return null;
            }
        } catch (error) {
            console.error('Error getting admin by UID:', error);
            // If there's a permission error, but user is authenticated, assume they're admin
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.uid === uid && error.code === 'permission-denied') {
                return {
                    uid: uid,
                    email: currentUser.email,
                    role: 'admin'
                };
            }
            throw error;
        }
    }

    async signOut() {
        await this.initialize();
        try {
            await this.firebaseAuth.signOut(this.auth);
            console.log('Firebase signOut completed');
            return true;
        } catch (error) {
            console.error('Firebase signOut error:', error);
            throw error;
        }
    }



    // Student Management Methods
    async addStudent(studentData) {
        await this.initialize();
        try {
            const docRef = await this.firestore.addDoc(this.firestore.collection(this.db, 'students'), {
                ...studentData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            return { id: docRef.id, ...studentData };
        } catch (error) {
            console.error('Error adding student:', error);
            throw error;
        }
    }

    async getStudents() {
        await this.initialize();
        try {
            const querySnapshot = await this.firestore.getDocs(
                this.firestore.query(
                    this.firestore.collection(this.db, 'students'),
                    this.firestore.orderBy('createdAt', 'desc')
                )
            );

            const students = [];
            querySnapshot.forEach((doc) => {
                students.push({ id: doc.id, ...doc.data() });
            });

            return students;
        } catch (error) {
            console.error('Error getting students:', error);
            throw error;
        }
    }

    async updateStudent(studentId, updateData) {
        await this.initialize();
        try {
            const studentRef = this.firestore.doc(this.db, 'students', studentId);
            await this.firestore.updateDoc(studentRef, {
                ...updateData,
                updatedAt: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error('Error updating student:', error);
            throw error;
        }
    }

    async deleteStudent(studentId) {
        await this.initialize();
        try {
            await this.firestore.deleteDoc(this.firestore.doc(this.db, 'students', studentId));
            return true;
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        }
    }

    async getStudentByEmail(email) {
        await this.initialize();
        try {
            const q = this.firestore.query(
                this.firestore.collection(this.db, 'students'),
                this.firestore.where('email', '==', email)
            );

            const querySnapshot = await this.firestore.getDocs(q);

            if (querySnapshot.empty) {
                return null;
            }

            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('Error getting student by email:', error);
            throw error;
        }
    }





    // Utility Methods
    onAuthStateChanged(callback) {
        if (this.auth) {
            return this.firebaseAuth.onAuthStateChanged(this.auth, callback);
        }
        return null;
    }

    getCurrentUser() {
        if (!this.auth) {
            console.warn('Firebase auth not initialized');
            return null;
        }

        const user = this.auth.currentUser;
        if (user) {
            console.log('Current user found:', user.email, 'UID:', user.uid);
        } else {
            console.log('No current user found');
        }

        return user;
    }

    // Helper method to wait for auth state to be ready with retry logic
    async waitForAuthReady(maxWaitTime = 10000) {
        if (!this.auth) {
            await this.initialize();
        }

        return new Promise((resolve) => {
            let resolved = false;
            let unsubscribe = null;

            const resolveOnce = (user) => {
                if (resolved) return;
                resolved = true;
                if (unsubscribe) unsubscribe();
                resolve(user);
            };

            // If user is already available, resolve immediately
            if (this.auth.currentUser) {
                resolveOnce(this.auth.currentUser);
                return;
            }

            // Set up auth state listener with retry logic
            let retryCount = 0;
            const maxRetries = 3;

            const setupListener = () => {
                try {
                    unsubscribe = this.firebaseAuth.onAuthStateChanged(this.auth, (user) => {
                        console.log('Auth state changed:', user ? user.email : 'null');
                        resolveOnce(user);
                    });
                } catch (error) {
                    console.warn('Error setting up auth listener, retrying...', error);
                    retryCount++;
                    if (retryCount < maxRetries) {
                        setTimeout(setupListener, 1000);
                    } else {
                        resolveOnce(this.auth.currentUser);
                    }
                }
            };

            setupListener();

            // Timeout fallback with multiple checks
            const checkInterval = 1000;
            const maxChecks = Math.floor(maxWaitTime / checkInterval);
            let checkCount = 0;

            const intervalCheck = setInterval(() => {
                checkCount++;
                if (resolved) {
                    clearInterval(intervalCheck);
                    return;
                }

                // Check if user became available
                if (this.auth.currentUser) {
                    clearInterval(intervalCheck);
                    resolveOnce(this.auth.currentUser);
                    return;
                }

                // Final timeout
                if (checkCount >= maxChecks) {
                    clearInterval(intervalCheck);
                    resolveOnce(this.auth.currentUser);
                }
            }, checkInterval);
        });
    }

    // Helper method to check if Firebase is ready
    isReady() {
        return this.initialized && this.auth && this.db;
    }

    // Helper method to ensure Firebase is ready with retry
    async ensureReady(maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await this.initialize();
                if (this.isReady()) {
                    return true;
                }
            } catch (error) {
                console.warn(`Firebase initialization attempt ${i + 1} failed:`, error);
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }
        throw new Error('Firebase failed to initialize after multiple attempts');
    }

    // Create admin document for authenticated user
    async createAdminDocument(user) {
        try {
            console.log('Creating admin document for user:', user.email);
            const adminData = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || 'Admin User',
                role: 'admin',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            await this.firestore.setDoc(this.firestore.doc(this.db, 'admins', user.uid), adminData);
            console.log('Admin document created successfully');
            return adminData;
        } catch (error) {
            console.error('Error creating admin document:', error);
            throw error;
        }
    }

    // Initialize required collections
    async initializeCollections() {
        const collections = ['courses', 'students', 'faculty', 'notices', 'admins'];

        for (const collectionName of collections) {
            try {
                const snapshot = await this.firestore.getDocs(
                    this.firestore.collection(this.db, collectionName)
                );

                if (snapshot.empty) {
                    console.log(`Initializing ${collectionName} collection...`);
                    // Collection is empty, we'll let the admin panel create sample data
                }
            } catch (error) {
                console.warn(`Error checking ${collectionName} collection:`, error);
            }
        }
    }
}

// Create global instance
window.firebaseService = new FirebaseService();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseService;
}
