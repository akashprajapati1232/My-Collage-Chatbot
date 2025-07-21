// ===== FIREBASE AUTHENTICATION SYSTEM =====

// Firebase imports (loaded via CDN in HTML)
let auth;
let signInWithEmailAndPassword;
let onAuthStateChanged;
let signOut;

// Initialize Firebase Auth functions when available
function initializeFirebaseAuth() {
    // Use the Firebase service instead of separate initialization
    if (window.firebaseService) {
        console.log('Using Firebase service for authentication');
        const currentPage = window.location.pathname;
        const isLoginPage = currentPage.includes('login.html') || currentPage.includes('admin-login.html');
        const isProtectedPage = currentPage.includes('admin-panel.html') || currentPage.includes('student-dashboard.html');
        const isPublicPage = currentPage.includes('index.html') || currentPage === '/' || currentPage === '';

        console.log('Page type:', { isLoginPage, isProtectedPage, isPublicPage, currentPage });

        // Set up auth state listener based on page type
        if (shouldSetupAuthListener()) {
            console.log('Setting up auth state listener');
            setupAuthStateListener();
        } else {
            console.log('Skipping auth state listener setup for this page type');
        }
    } else {
        // Retry after a short delay
        setTimeout(initializeFirebaseAuth, 100);
    }
}

// ===== AUTHENTICATION STATE MANAGEMENT =====

async function setupAuthStateListener() {
    try {
        const firebaseService = window.firebaseService;
        await firebaseService.initialize();

        let isHandlingAuthChange = false;

        // Set up auth state listener using Firebase service
        firebaseService.onAuthStateChanged(async (user) => {
            // Prevent multiple simultaneous auth state changes
            if (isHandlingAuthChange) {
                console.log('Auth state change already in progress, skipping...');
                return;
            }

            isHandlingAuthChange = true;

            try {
                console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');

                if (user) {
                    // User is signed in via Firebase
                    await handleAuthenticatedUser(user);
                } else {
                    // User is not signed in, handle unauthenticated state
                    handleUnauthenticatedUser();
                }
            } catch (error) {
                console.error('Error handling auth state change:', error);
            } finally {
                isHandlingAuthChange = false;
            }
        });
    } catch (error) {
        console.error('Error setting up auth state listener:', error);
    }
}

// Removed localStorage session checking - now using only Firebase Authentication

async function handleAuthenticatedUser(user) {
    const currentPage = window.location.pathname;
    const isLoginPage = currentPage.includes('login.html') || currentPage.includes('admin-login.html');
    const isPublicPage = currentPage.includes('index.html') || currentPage === '/' || currentPage === '';

    console.log('Handling authenticated user:', user.email, 'on page:', currentPage);

    if (isLoginPage) {
        // Check if user is admin before redirecting
        try {
            const firebaseService = window.firebaseService;
            if (firebaseService) {
                await firebaseService.initialize();
                const adminData = await firebaseService.getAdminByUid(user.uid);

                if (adminData) {
                    // User is admin, redirect to admin panel
                    console.log('Redirecting admin to admin panel');
                    window.location.href = 'admin-panel.html';
                    return;
                } else {
                    // User is not admin, check if they're a student
                    const student = await firebaseService.getStudentByEmail(user.email);
                    if (student) {
                        console.log('Redirecting student to dashboard');
                        window.location.href = 'student-dashboard.html';
                        return;
                    } else {
                        // User exists but is neither admin nor student
                        console.log('User exists but has no role assigned');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking user role:', error);
            // Don't redirect on error, let user stay on login page
        }
    }

    // Update UI for authenticated state (only on public pages)
    if (isPublicPage) {
        updateAuthUI(true, user);
    }
}

function handleUnauthenticatedUser() {
    const currentPage = window.location.pathname;
    const isProtectedPage = currentPage.includes('admin-panel.html') ||
                           currentPage.includes('student-dashboard.html');
    const isPublicPage = currentPage.includes('index.html') || currentPage === '/' || currentPage === '';

    console.log('Handling unauthenticated user on page:', currentPage);

    if (isProtectedPage) {
        // Redirect to appropriate login page
        console.log('Redirecting from protected page to login');
        if (currentPage.includes('admin-panel.html')) {
            window.location.href = 'admin-login.html';
        } else {
            window.location.href = 'login.html';
        }
        return;
    }

    // Update UI for unauthenticated state (only on public pages)
    if (isPublicPage) {
        updateAuthUI(false);
    }
}

function redirectUserBasedOnRole(email, userType = null) {
    // Use userType if provided, otherwise check email pattern
    let isAdmin = userType === 'admin';
    if (!userType) {
        isAdmin = isAdminEmail(email);
    }

    if (isAdmin) {
        window.location.href = 'admin-panel.html';
    } else {
        window.location.href = 'student-dashboard.html';
    }
}

function updateAuthUI(isAuthenticated, user = null) {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginBtn && logoutBtn) {
        if (isAuthenticated) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-flex';

            // Update logout button text with user info
            if (user && user.email) {
                const emailPart = user.email.split('@')[0];
                logoutBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16,17 21,12 16,7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    ${emailPart}
                `;
            }
        } else {
            loginBtn.style.display = 'inline-flex';
            logoutBtn.style.display = 'none';
        }
    }
}

function isAdminEmail(email) {
    // Define admin email patterns
    const adminPatterns = [
        '@bit.com',
        '@admin.bit.com',
        'admin@',
        '.admin@'
    ];
    
    return adminPatterns.some(pattern => email.toLowerCase().includes(pattern.toLowerCase()));
}

// ===== STUDENT LOGIN FUNCTIONALITY =====

function initializeStudentLogin() {
    const loginForm = document.getElementById('studentLoginForm');
    const emailInput = document.getElementById('email');
    const dobInput = document.getElementById('dob');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    // Initialize Firebase Auth
    initializeFirebaseAuth();

    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const dob = dobInput.value;

            if (!email || !dob) {
                showError('Please fill in all fields.');
                return;
            }

            // Validate Gmail address
            if (!email.toLowerCase().includes('@gmail.com')) {
                showError('Please enter a valid Gmail address.');
                return;
            }

            await handleStudentLogin(email, dob);
        });
    }
    
    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    function showLoading(show) {
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        
        if (show) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'flex';
            loginBtn.disabled = true;
        } else {
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
            loginBtn.disabled = false;
        }
    }
    
    async function handleStudentLogin(email, dob) {
        showLoading(true);

        try {
            // Initialize Firebase service
            const firebaseService = window.firebaseService;
            await firebaseService.initialize();

            // Check if student exists in Firebase
            const student = await firebaseService.getStudentByEmail(email);

            if (!student) {
                showError('Student not found. Please contact administration.');
                showLoading(false);
                return;
            }

            // Validate date of birth
            if (student.dob !== dob) {
                showError('Invalid date of birth. Please check your information.');
                showLoading(false);
                return;
            }

            // Create a temporary session token for the student
            // Since students don't have Firebase Auth accounts, we'll use a different approach
            const sessionToken = btoa(JSON.stringify({
                studentId: student.id,
                email: student.email,
                loginTime: Date.now(),
                expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            }));

            // Store session in sessionStorage (more secure than localStorage for temporary sessions)
            sessionStorage.setItem('bitbot_student_session', sessionToken);

            // Success - redirect to student dashboard
            console.log('Student login successful:', email);
            window.location.href = 'student-dashboard.html';

        } catch (error) {
            showLoading(false);
            showError('Login failed. Please try again.');
            console.error('Student login error:', error);
        }
    }
}

// ===== ADMIN LOGIN FUNCTIONALITY =====

function initializeAdminLogin() {
    const loginForm = document.getElementById('adminLoginForm');
    const emailInput = document.getElementById('adminEmail');
    const passwordInput = document.getElementById('adminPassword');
    const loginBtn = document.getElementById('adminLoginBtn');
    const errorMessage = document.getElementById('adminErrorMessage');
    const errorText = document.getElementById('adminErrorText');
    const passwordToggle = document.getElementById('adminPasswordToggle');
    
    // Initialize Firebase Auth
    initializeFirebaseAuth();
    
    // Password toggle functionality
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const eyeIcon = passwordToggle.querySelector('.eye-icon');
            if (type === 'text') {
                eyeIcon.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
            } else {
                eyeIcon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
            }
        });
    }
    
    // Form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            if (!email || !password) {
                showError('Please fill in all fields.');
                return;
            }
            
            await handleAdminLogin(email, password);
        });
    }
    
    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    function showLoading(show) {
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        
        if (show) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'flex';
            loginBtn.disabled = true;
        } else {
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
            loginBtn.disabled = false;
        }
    }
    
    async function handleAdminLogin(email, password) {
        showLoading(true);

        try {
            // Use Firebase Authentication
            const firebaseService = window.firebaseService;
            await firebaseService.initialize();

            // Sign in with Firebase
            const result = await firebaseService.signInAdmin(email, password);

            // Success - redirect to admin panel
            console.log('Admin login successful:', result.user.email);
            window.location.href = 'admin-panel.html';

        } catch (error) {
            console.error('Admin login error:', error);

            // Provide specific error messages
            if (error.code === 'auth/user-not-found') {
                showError('No admin account found with this email. Please check your email or create an admin account.');
            } else if (error.code === 'auth/wrong-password') {
                showError('Invalid password. Please check your password and try again.');
            } else if (error.code === 'auth/invalid-email') {
                showError('Invalid email format. Please enter a valid email address.');
            } else if (error.code === 'auth/too-many-requests') {
                showError('Too many failed attempts. Please try again later.');
            } else if (error.message === 'User is not an admin') {
                showError('Access denied. This account is not authorized as an admin.');
            } else {
                showError(`Login failed: ${error.message || 'Please try again.'}`);
            }

            showLoading(false);
        }
    }
}

// ===== ERROR HANDLING =====

function handleAuthError(error, showErrorCallback) {
    let errorMessage = 'An error occurred. Please try again.';
    
    switch (error.code) {
        case 'auth/user-not-found':
            errorMessage = 'No account found with this email address.';
            break;
        case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
        case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
        case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Contact administrator.';
            break;
        case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.';
            break;
        case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection.';
            break;
        case 'auth/invalid-credential':
            errorMessage = 'Invalid credentials. Please check your email and password.';
            break;
        default:
            console.error('Auth error:', error);
            errorMessage = 'Login failed. Please try again.';
    }
    
    showErrorCallback(errorMessage);
}

// ===== NAVIGATION UTILITIES =====

function getRedirectAfterLogout() {
    const currentPage = window.location.pathname;

    // If on admin pages, go to index
    if (currentPage.includes('admin-panel.html') || currentPage.includes('admin-login.html')) {
        return 'index.html';
    }

    // If on student pages, go to index
    if (currentPage.includes('student-dashboard.html') || currentPage.includes('login.html')) {
        return 'index.html';
    }

    // If already on index or public page, stay there
    if (currentPage.includes('index.html') || currentPage === '/' || currentPage === '') {
        return null; // No redirect needed
    }

    // Default to index
    return 'index.html';
}

function shouldSetupAuthListener() {
    const currentPage = window.location.pathname;
    const isLoginPage = currentPage.includes('login.html') || currentPage.includes('admin-login.html');
    const isPublicPage = currentPage.includes('index.html') || currentPage === '/' || currentPage === '';

    // Set up listener on public pages and login pages, but not on protected pages
    // (protected pages handle auth via protectPage function)
    return isPublicPage || isLoginPage;
}

// ===== SESSION CLEANUP UTILITIES =====

function clearAllSessionData() {
    try {
        // Clear localStorage
        const keysToRemove = [
            'bitbot_student_session',
            'bitbot_admin_session',
            'bitbot_admin_password'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        // Clear sessionStorage completely
        sessionStorage.clear();

        console.log('All session data cleared');
    } catch (error) {
        console.error('Error clearing session data:', error);
    }
}

async function performCompleteLogout() {
    try {
        console.log('Performing complete logout...');

        // Clear all session data
        clearAllSessionData();

        // Sign out from Firebase
        const firebaseService = window.firebaseService;
        if (firebaseService) {
            try {
                await firebaseService.initialize();
                await firebaseService.signOut();
                console.log('Firebase logout successful');
            } catch (firebaseError) {
                console.warn('Firebase logout error:', firebaseError);
                // Continue with logout even if Firebase fails
            }
        }

        return true;
    } catch (error) {
        console.error('Error during complete logout:', error);
        return false;
    }
}

// ===== LOGOUT FUNCTIONALITY =====

function initializeLogout() {
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                console.log('Logout initiated...');

                // Perform complete logout
                const logoutSuccess = await performCompleteLogout();

                if (logoutSuccess) {
                    console.log('Logout completed successfully, redirecting...');
                } else {
                    console.warn('Logout completed with errors, redirecting...');
                }

                // Small delay to ensure cleanup is complete
                await new Promise(resolve => setTimeout(resolve, 100));

                // Smart redirect based on current page
                const redirectUrl = getRedirectAfterLogout();
                if (redirectUrl) {
                    console.log('Redirecting to:', redirectUrl);
                    window.location.href = redirectUrl;
                } else {
                    console.log('No redirect needed, staying on current page');
                    // Refresh the page to update UI state
                    window.location.reload();
                }

            } catch (error) {
                console.error('Logout error:', error);
                // Still redirect even if logout fails
                window.location.href = 'index.html';
            }
        });
    }
}

// ===== PAGE PROTECTION =====

async function protectPage() {
    try {
        console.log('Protecting page - checking authentication...');

        // Initialize Firebase service with retry
        const firebaseService = window.firebaseService;
        await firebaseService.ensureReady();

        // Wait for authentication state to be established with longer timeout
        const currentUser = await firebaseService.waitForAuthReady(15000);

        if (!currentUser) {
            // No authenticated user, redirect to admin login
            console.log('No authenticated user found, redirecting to login');
            window.location.href = 'admin-login.html';
            return;
        }

        console.log('User authenticated:', currentUser.email);

        // Check if user is admin with retry logic
        let adminData = null;
        let adminCheckAttempts = 0;
        const maxAdminCheckAttempts = 3;

        while (adminCheckAttempts < maxAdminCheckAttempts && !adminData) {
            try {
                adminData = await firebaseService.getAdminByUid(currentUser.uid);
                if (adminData) {
                    break;
                }
            } catch (error) {
                console.warn(`Admin check attempt ${adminCheckAttempts + 1} failed:`, error);
                adminCheckAttempts++;
                if (adminCheckAttempts < maxAdminCheckAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        if (!adminData) {
            // User exists but is not an admin or admin check failed
            console.warn('User is not an admin or admin verification failed:', currentUser.email);
            window.location.href = 'admin-login.html';
            return;
        }

        // User is authenticated and is an admin
        console.log('Admin access granted:', currentUser.email);

    } catch (error) {
        console.error('Error in protectPage:', error);
        window.location.href = 'admin-login.html';
    }
}

// Using Firebase service waitForAuthReady method instead

// ===== PUBLIC CHATBOT FUNCTIONALITY =====

function initializePublicChatbot() {
    initializeFirebaseAuth();

    // Set up login button functionality
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }

    // Initialize logout functionality
    initializeLogout();
}

function isPrivateQuery(query) {
    const privateKeywords = [
        'my fee', 'fee due', 'my marks', 'my profile', 'my attendance',
        'my exam', 'my result', 'my grade', 'my record', 'my account',
        'my details', 'my information', 'my data', 'my status',
        'show my', 'display my', 'get my', 'check my'
    ];

    const queryLower = query.toLowerCase();
    return privateKeywords.some(keyword => queryLower.includes(keyword));
}

function handlePrivateQueryResponse(query) {
    return {
        isPrivate: true,
        response: `🔒 <strong>Authentication Required</strong><br><br>
                   To access personal information like "${query}", you need to log in as a student.<br><br>
                   <div style="margin-top: 15px;">
                       <a href="login.html" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: 500;">
                           🔑 Login as Student
                       </a>
                   </div><br>
                   <small style="color: #666;">Your personal data is protected and requires authentication to access.</small>`
    };
}

function handlePublicQuery(query) {
    // Sample public responses - replace with your actual data
    const publicResponses = {
        'timetable': {
            'today': `📅 <strong>Today's Timetable</strong><br><br>
                     <strong>BCA 3rd Year - Monday</strong><br>
                     • 9:00 AM - 10:00 AM: Data Structures<br>
                     • 10:15 AM - 11:15 AM: Database Management<br>
                     • 11:30 AM - 12:30 PM: Web Development<br>
                     • 1:30 PM - 2:30 PM: Software Engineering<br>
                     • 2:45 PM - 3:45 PM: Computer Networks`,
            'general': `📅 <strong>Class Timetables</strong><br><br>
                       Our classes run Monday to Friday:<br>
                       • Morning Session: 9:00 AM - 12:30 PM<br>
                       • Afternoon Session: 1:30 PM - 4:30 PM<br><br>
                       For specific timetables, please specify your course and year.`
        },
        'timings': `⏰ <strong>Class Timings</strong><br><br>
                   <strong>Regular Classes:</strong><br>
                   • Period 1: 9:00 AM - 10:00 AM<br>
                   • Period 2: 10:15 AM - 11:15 AM<br>
                   • Period 3: 11:30 AM - 12:30 PM<br>
                   • Lunch Break: 12:30 PM - 1:30 PM<br>
                   • Period 4: 1:30 PM - 2:30 PM<br>
                   • Period 5: 2:45 PM - 3:45 PM<br><br>
                   <strong>Lab Sessions:</strong> 2-hour slots as per schedule`,
        'fees': {
            'bca': `💰 <strong>BCA Course Fees</strong><br><br>
                   <strong>Annual Fee Structure:</strong><br>
                   • Tuition Fee: ₹45,000<br>
                   • Lab Fee: ₹8,000<br>
                   • Library Fee: ₹2,000<br>
                   • Exam Fee: ₹3,000<br>
                   • Total: ₹58,000 per year<br><br>
                   <em>Fees may vary for different batches. Contact office for exact details.</em>`,
            'general': `💰 <strong>Course Fees</strong><br><br>
                       Please specify which course you're interested in:<br>
                       • BCA (Bachelor of Computer Applications)<br>
                       • MCA (Master of Computer Applications)<br>
                       • B.Tech (Various branches)<br>
                       • MBA<br><br>
                       Or contact our office at: +91-XXXXXXXXXX`
        },
        'faculty': {
            'hod_it': `👨‍🏫 <strong>HOD - IT Department</strong><br><br>
                      <strong>Dr. Rajesh Kumar</strong><br>
                      Head of Department - Information Technology<br><br>
                      📧 Email: hod.it@bit.edu.in<br>
                      📞 Phone: +91-XXXXXXXXXX<br>
                      🏢 Office: IT Block, Room 201<br><br>
                      <strong>Office Hours:</strong> Monday to Friday, 10:00 AM - 4:00 PM`,
            'general': `👨‍🏫 <strong>Faculty Information</strong><br><br>
                       Our experienced faculty members are here to guide you:<br><br>
                       <strong>Departments:</strong><br>
                       • Computer Science & IT<br>
                       • Electronics & Communication<br>
                       • Mechanical Engineering<br>
                       • Management Studies<br><br>
                       Please specify which department or faculty member you'd like to know about.`
        }
    };

    const queryLower = query.toLowerCase();

    // Timetable queries
    if (queryLower.includes('today') && queryLower.includes('timetable')) {
        return publicResponses.timetable.today;
    }
    if (queryLower.includes('timetable')) {
        return publicResponses.timetable.general;
    }

    // Timing queries
    if (queryLower.includes('class timing') || queryLower.includes('timings')) {
        return publicResponses.timings;
    }

    // Fee queries
    if (queryLower.includes('bca') && queryLower.includes('fee')) {
        return publicResponses.fees.bca;
    }
    if (queryLower.includes('fee') || queryLower.includes('course fee')) {
        return publicResponses.fees.general;
    }

    // Faculty queries
    if (queryLower.includes('hod') && queryLower.includes('it')) {
        return publicResponses.faculty.hod_it;
    }
    if (queryLower.includes('faculty') || queryLower.includes('teacher') || queryLower.includes('professor')) {
        return publicResponses.faculty.general;
    }

    // Default response
    return `🤖 <strong>BitBot Assistant</strong><br><br>
            I can help you with general information about:<br><br>
            📅 <strong>Academic:</strong> Timetables, class timings, exam schedules<br>
            💰 <strong>Fees:</strong> Course fees, payment information<br>
            👨‍🏫 <strong>Faculty:</strong> Department heads, faculty contacts<br>
            🏢 <strong>Campus:</strong> Facilities, departments, contact info<br><br>
            For personal information like your marks, fee status, or profile, please <a href="login.html" style="color: #000; font-weight: 600;">login as a student</a>.`;
}

// ===== STUDENT PAGE PROTECTION =====

function protectStudentPage() {
    // Check for student session
    const studentSession = localStorage.getItem('bitbot_student_session');

    if (!studentSession) {
        // No student session, redirect to student login
        window.location.href = 'login.html';
        return;
    }

    try {
        const studentData = JSON.parse(studentSession);
        // Verify session is valid
        if (!studentData.email || studentData.userType !== 'student') {
            localStorage.removeItem('bitbot_student_session');
            window.location.href = 'login.html';
            return;
        }

        // Session is valid, initialize Firebase auth for backward compatibility
        initializeFirebaseAuth();
    } catch (error) {
        // Invalid session data
        localStorage.removeItem('bitbot_student_session');
        window.location.href = 'login.html';
    }
}

function initializeAuthenticatedChatbot() {
    // Initialize chatbot for authenticated users
    // This can access private information
    initializeLogout();
}

// ===== INITIALIZATION =====

// Auto-initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;

    if (currentPage.includes('login.html')) {
        // Student login page
        if (typeof initializeStudentLogin === 'function') {
            initializeStudentLogin();
        }
    } else if (currentPage.includes('admin-login.html')) {
        // Admin login page
        if (typeof initializeAdminLogin === 'function') {
            initializeAdminLogin();
        }
    } else if (currentPage.includes('admin-panel.html')) {
        // Admin panel - protected
        protectPage();
        initializeLogout();
    } else if (currentPage.includes('student-dashboard.html')) {
        // Student dashboard - protected
        protectStudentPage();
        initializeAuthenticatedChatbot();
    } else {
        // Public pages (index.html)
        initializePublicChatbot();
    }
});

// Export functions for global access
window.initializeStudentLogin = initializeStudentLogin;
window.initializeAdminLogin = initializeAdminLogin;
window.initializePublicChatbot = initializePublicChatbot;
window.protectPage = protectPage;
window.protectStudentPage = protectStudentPage;
window.initializeAuthenticatedChatbot = initializeAuthenticatedChatbot;
window.isPrivateQuery = isPrivateQuery;
window.handlePrivateQueryResponse = handlePrivateQueryResponse;
window.handlePublicQuery = handlePublicQuery;
