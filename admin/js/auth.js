// ===== FIREBASE AUTHENTICATION SYSTEM =====

// Helper function to get relative paths based on current page location
function getRelativePath(targetPath) {
    const { isInAdminFolder } = getPageType();

    if (isInAdminFolder) {
        // If we're in admin folder, need to go up one level for most paths
        if (targetPath.startsWith('admin/')) {
            // If target is also in admin folder, remove the admin/ prefix
            return targetPath.replace('admin/', '');
        } else {
            // If target is in root, add ../
            return '../' + targetPath;
        }
    } else {
        // If we're in root, use path as-is
        return targetPath;
    }
}

// Firebase service is used instead of direct imports

// Page detection utility
function getPageType() {
    const currentPage = window.location.pathname;
    return {
        currentPage,
        isProtectedPage: currentPage.includes('admin-panel.html') || currentPage.includes('student-dashboard.html'),
        isAdminPage: currentPage.includes('admin-panel.html'),
        isStudentPage: currentPage.includes('student-dashboard.html'),
        isPublicPage: currentPage.includes('index.html') || currentPage === '/' || currentPage === '',
        isInAdminFolder: currentPage.includes('/admin/')
    };
}

// Initialize Firebase Auth functions when available
function initializeFirebaseAuth() {
    // Use the Firebase service instead of separate initialization
    if (window.firebaseService) {
        console.log('Using Firebase service for authentication');
        const pageType = getPageType();

        console.log('Page type:', pageType);

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
    const { isPublicPage } = getPageType();

    console.log('Handling authenticated user:', user.email);

    // Update UI for authenticated state (only on public pages)
    if (isPublicPage) {
        updateAuthUI(true, user);
    }
}

function handleUnauthenticatedUser() {
    const { isProtectedPage, isPublicPage, isAdminPage } = getPageType();

    console.log('Handling unauthenticated user');

    if (isProtectedPage) {
        // Show login popup instead of redirecting
        console.log('Protected page accessed without authentication');
        if (isAdminPage) {
            // For admin pages, show admin login popup
            if (typeof openLoginPopup === 'function') {
                openLoginPopup('admin');
            }
        } else {
            // For student pages, show student login popup
            if (typeof openLoginPopup === 'function') {
                openLoginPopup('student');
            }
        }
        return;
    }

    // Update UI for unauthenticated state (only on public pages)
    if (isPublicPage) {
        updateAuthUI(false);
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









// ===== NAVIGATION UTILITIES =====

function getRedirectAfterLogout() {
    const { isPublicPage } = getPageType();

    // If already on index or public page, stay there
    if (isPublicPage) {
        return null; // No redirect needed
    }

    // For all other pages (admin, student), go to index
    return getRelativePath('index.html');
}

function shouldSetupAuthListener() {
    const { isPublicPage } = getPageType();

    // Set up listener on public pages, but not on protected pages
    // (protected pages handle auth via protectPage function)
    return isPublicPage;
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
                window.location.href = getRelativePath('index.html');
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
            // No authenticated user, show admin login popup
            console.log('No authenticated user found, showing login popup');
            if (typeof openLoginPopup === 'function') {
                openLoginPopup('admin');
            }
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
            if (typeof openLoginPopup === 'function') {
                openLoginPopup('admin');
            }
            return;
        }

        // User is authenticated and is an admin
        console.log('Admin access granted:', currentUser.email);

    } catch (error) {
        console.error('Error in protectPage:', error);
        if (typeof openLoginPopup === 'function') {
            openLoginPopup('admin');
        }
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
            openLoginPopup('student');
        });
    }

    // Initialize popup login forms
    initializePopupLoginForms();

    // Check if student is already logged in
    checkStudentLoginStatus();

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
                       <button onclick="openLoginPopup('student')" style="background: #000; color: #fff; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                           🔑 Login as Student
                       </button>
                   </div><br>
                   <small style="color: #666;">Your personal data is protected and requires authentication to access.</small>`
    };
}

function handlePublicQuery(query) {
    const queryLower = query.toLowerCase();

    // Check for login-related queries first
    if (isLoginQuery(queryLower)) {
        return handleLoginQuery(queryLower);
    }

    // Simple keyword-based responses
    if (queryLower.includes('timetable')) {
        return `📅 <strong>Timetables</strong><br><br>
                Class schedules are available Monday to Friday:<br>
                • Morning: 9:00 AM - 12:30 PM<br>
                • Afternoon: 1:30 PM - 4:30 PM<br><br>
                For specific timetables, please contact the office.`;
    }

    if (queryLower.includes('fee')) {
        return `💰 <strong>Course Fees</strong><br><br>
                Fee information varies by course and year.<br>
                Please contact the office for current fee structure:<br>
                📞 Phone: +91-XXXXXXXXXX`;
    }

    if (queryLower.includes('faculty') || queryLower.includes('teacher')) {
        return `👨‍🏫 <strong>Faculty Information</strong><br><br>
                Our experienced faculty guide students across various departments.<br>
                For specific faculty details, please contact the respective department.`;
    }

    // Default response
    return `🤖 <strong>BitBot Assistant</strong><br><br>
            I can help with general information about:<br>
            📅 Timetables • 💰 Fees • 👨‍🏫 Faculty • 🏢 Campus<br><br>
            For personal information, please <button onclick="openLoginPopup('student')" style="color: #000; font-weight: 600; background: none; border: none; text-decoration: underline; cursor: pointer;">login as a student</button>.`;
}

// Check if query is asking for login
function isLoginQuery(queryLower) {
    const loginKeywords = [
        'student login', 'admin login', 'login as student', 'login as admin',
        'student portal', 'admin portal', 'sign in', 'log in',
        'student access', 'admin access', 'how to login', 'where to login',
        'student dashboard', 'admin panel', 'login page', 'authentication'
    ];

    return loginKeywords.some(keyword => queryLower.includes(keyword));
}

// Handle login-related queries
function handleLoginQuery(queryLower) {
    const isAdminQuery = queryLower.includes('admin');
    const isStudentQuery = queryLower.includes('student') || (!isAdminQuery && (queryLower.includes('login') || queryLower.includes('sign in')));

    if (isAdminQuery) {
        return `🔐 <strong>Admin Login</strong><br><br>
                Access the administrative panel with your admin credentials.<br><br>
                <button onclick="openLoginPopup('admin')" style="background: #000; color: #fff; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; margin-right: 10px;">
                    🛡️ Admin Login
                </button><br><br>
                <small style="color: #666;">For authorized personnel only</small>`;
    } else if (isStudentQuery) {
        return `🎓 <strong>Student Login</strong><br><br>
                Access your personal dashboard with your student credentials.<br><br>
                <button onclick="openLoginPopup('student')" style="background: #000; color: #fff; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; margin-right: 10px;">
                    📚 Student Login
                </button><br><br>
                <small style="color: #666;">Login with your Gmail and date of birth</small>`;
    } else {
        // General login query - show both options
        return `🔐 <strong>Login Options</strong><br><br>
                Choose your login type to access the appropriate portal:<br><br>
                <button onclick="openLoginPopup('student')" style="background: #000; color: #fff; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; margin-right: 10px;">
                    📚 Student Login
                </button>
                <button onclick="openLoginPopup('admin')" style="background: #666; color: #fff; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
                    🛡️ Admin Login
                </button><br><br>
                <small style="color: #666;">Students: Login with Gmail & DOB | Admins: Email & Password</small>`;
    }
}

// ===== STUDENT PAGE PROTECTION =====

function protectStudentPage() {
    // Check for student session
    const studentSession = localStorage.getItem('bitbot_student_session');

    if (!studentSession) {
        // No student session, show student login popup
        if (typeof openLoginPopup === 'function') {
            openLoginPopup('student');
        }
        return;
    }

    try {
        const studentData = JSON.parse(studentSession);
        // Verify session is valid
        if (!studentData.email || studentData.userType !== 'student') {
            localStorage.removeItem('bitbot_student_session');
            if (typeof openLoginPopup === 'function') {
                openLoginPopup('student');
            }
            return;
        }

        // Session is valid, initialize Firebase auth for backward compatibility
        initializeFirebaseAuth();
    } catch (error) {
        // Invalid session data
        localStorage.removeItem('bitbot_student_session');
        if (typeof openLoginPopup === 'function') {
            openLoginPopup('student');
        }
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
    const { isAdminPage, isStudentPage } = getPageType();

    if (isAdminPage) {
        // Admin panel - protected
        protectPage();
        initializeLogout();
    } else if (isStudentPage) {
        // Student dashboard - protected
        protectStudentPage();
        initializeAuthenticatedChatbot();
    } else {
        // Public pages (index.html)
        initializePublicChatbot();
    }
});

// ===== POPUP LOGIN FUNCTIONALITY =====

// Open login popup
function openLoginPopup(type = 'student') {
    const modal = document.getElementById('loginModal');
    const modalTitle = document.getElementById('modalTitle');
    const studentForm = document.getElementById('studentLoginForm');
    const adminForm = document.getElementById('adminLoginForm');

    // Reset forms
    document.getElementById('popupStudentForm').reset();
    document.getElementById('popupAdminForm').reset();
    hidePopupError();

    // Show appropriate form
    if (type === 'admin') {
        modalTitle.textContent = 'Admin Login';
        studentForm.style.display = 'none';
        adminForm.style.display = 'block';
    } else {
        modalTitle.textContent = 'Student Login';
        studentForm.style.display = 'block';
        adminForm.style.display = 'none';
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Focus first input
    setTimeout(() => {
        const firstInput = type === 'admin' ?
            document.getElementById('popupAdminEmail') :
            document.getElementById('popupStudentEmail');
        firstInput.focus();
    }, 100);
}

// Close login popup
function closeLoginPopup() {
    const modal = document.getElementById('loginModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    hidePopupError();
}

// Switch between login types
function switchToAdminLogin() {
    openLoginPopup('admin');
}

function switchToStudentLogin() {
    openLoginPopup('student');
}

// Show error in popup
function showPopupError(message) {
    const errorDiv = document.getElementById('popupErrorMessage');
    const errorText = document.getElementById('popupErrorText');
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
}

// Hide error in popup
function hidePopupError() {
    const errorDiv = document.getElementById('popupErrorMessage');
    errorDiv.style.display = 'none';
}

// Show loading state
function showPopupLoading(isLoading, type = 'student') {
    const formId = type === 'admin' ? 'popupAdminForm' : 'popupStudentForm';
    const form = document.getElementById(formId);
    const btn = form.querySelector('.login-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');

    if (isLoading) {
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
    } else {
        btn.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

// Handle popup student login
async function handlePopupStudentLogin(email, dob) {
    showPopupLoading(true, 'student');
    hidePopupError();

    try {
        const firebaseService = window.firebaseService;
        await firebaseService.initialize();

        // Validate student credentials
        const student = await firebaseService.getStudentByEmail(email);

        if (!student) {
            throw new Error('Student not found. Please check your email address.');
        }

        // Validate date of birth
        if (student.dateOfBirth !== dob) {
            throw new Error('Invalid date of birth. Please check your information.');
        }

        // Create session token
        const sessionToken = btoa(JSON.stringify({
            studentId: student.id,
            email: student.email,
            name: student.name,
            loginTime: Date.now(),
            expires: Date.now() + (24 * 60 * 60 * 1000),
            userType: 'student'
        }));

        sessionStorage.setItem('bitbot_student_session', sessionToken);

        // Close popup and update UI
        closeLoginPopup();
        updateUIForLoggedInStudent(student);

        // Show success message
        if (window.showToast) {
            showToast(`Welcome back, ${student.name}!`, 'success');
        }

    } catch (error) {
        showPopupLoading(false, 'student');
        showPopupError(error.message || 'Login failed. Please try again.');
        console.error('Student login error:', error);
    }
}

// Handle popup admin login
async function handlePopupAdminLogin(email, password) {
    showPopupLoading(true, 'admin');
    hidePopupError();

    try {
        const firebaseService = window.firebaseService;
        await firebaseService.initialize();

        // Sign in with Firebase
        await firebaseService.signInAdmin(email, password);

        // Close popup and redirect to admin panel
        closeLoginPopup();

        if (window.showToast) {
            showToast('Admin login successful! Redirecting...', 'success');
        }

        setTimeout(() => {
            window.location.href = getRelativePath('admin/admin-panel.html');
        }, 1000);

    } catch (error) {
        showPopupLoading(false, 'admin');
        showPopupError(error.message || 'Login failed. Please try again.');
        console.error('Admin login error:', error);
    }
}

// Update UI for logged in student
function updateUIForLoggedInStudent(student) {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
            ${student.name}
        `;
        loginBtn.style.background = '#28a745';
        loginBtn.style.borderColor = '#28a745';
        loginBtn.onclick = () => {
            // Show logout option
            if (window.Swal) {
                Swal.fire({
                    title: `Hello, ${student.name}!`,
                    text: 'You are logged in as a student.',
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Logout',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        logoutStudent();
                    }
                });
            }
        };
    }
}

// Logout student
function logoutStudent() {
    sessionStorage.removeItem('bitbot_student_session');

    // Reset login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10,17 15,12 10,7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Login
        `;
        loginBtn.style.background = '#000';
        loginBtn.style.borderColor = '#000';
        loginBtn.onclick = () => {
            openLoginPopup('student');
        };
    }

    if (window.showToast) {
        showToast('Logged out successfully', 'info');
    }
}

// Initialize popup login forms
function initializePopupLoginForms() {
    // Student form
    const studentForm = document.getElementById('popupStudentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('popupStudentEmail').value.trim();
            const dob = document.getElementById('popupStudentDob').value;

            if (!email || !dob) {
                showPopupError('Please fill in all fields.');
                return;
            }

            if (!email.toLowerCase().includes('@gmail.com')) {
                showPopupError('Please enter a valid Gmail address.');
                return;
            }

            await handlePopupStudentLogin(email, dob);
        });
    }

    // Admin form
    const adminForm = document.getElementById('popupAdminForm');
    if (adminForm) {
        adminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('popupAdminEmail').value.trim();
            const password = document.getElementById('popupAdminPassword').value;

            if (!email || !password) {
                showPopupError('Please fill in all fields.');
                return;
            }

            await handlePopupAdminLogin(email, password);
        });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLoginPopup();
        }
    });
}

// Check if student is already logged in and update UI
function checkStudentLoginStatus() {
    const studentSession = sessionStorage.getItem('bitbot_student_session');
    if (studentSession) {
        try {
            const studentData = JSON.parse(atob(studentSession));
            if (studentData.email && studentData.name && studentData.userType === 'student') {
                // Check if session is still valid
                if (studentData.expires && Date.now() < studentData.expires) {
                    updateUIForLoggedInStudent(studentData);
                } else {
                    // Session expired
                    sessionStorage.removeItem('bitbot_student_session');
                }
            }
        } catch (error) {
            // Invalid session data
            sessionStorage.removeItem('bitbot_student_session');
        }
    }
}

// Export functions for global access
window.initializePublicChatbot = initializePublicChatbot;
window.protectPage = protectPage;
window.protectStudentPage = protectStudentPage;
window.initializeAuthenticatedChatbot = initializeAuthenticatedChatbot;
window.isPrivateQuery = isPrivateQuery;
window.handlePrivateQueryResponse = handlePrivateQueryResponse;
window.handlePublicQuery = handlePublicQuery;
window.openLoginPopup = openLoginPopup;
window.closeLoginPopup = closeLoginPopup;
window.switchToAdminLogin = switchToAdminLogin;
window.switchToStudentLogin = switchToStudentLogin;
window.initializePopupLoginForms = initializePopupLoginForms;
window.checkStudentLoginStatus = checkStudentLoginStatus;
window.updateUIForLoggedInStudent = updateUIForLoggedInStudent;
window.logoutStudent = logoutStudent;
