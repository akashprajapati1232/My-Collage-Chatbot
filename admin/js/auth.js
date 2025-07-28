// ===== MOCK AUTHENTICATION SYSTEM =====

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

// Page detection utility
function getPageType() {
    const currentPage = window.location.pathname;
    return {
        currentPage,
        isProtectedPage: currentPage.includes('admin-panel.html'),
        isAdminPage: currentPage.includes('admin-panel.html'),
        isStudentPage: false, // Student dashboard removed
        isPublicPage: currentPage.includes('index.html') || currentPage === '/' || currentPage === '',
        isInAdminFolder: currentPage.includes('/admin/')
    };
}

// Mock Authentication System
class MockAuth {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('mockUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }

        const pageType = getPageType();
        console.log('Page type:', pageType);

        // Set up auth state listener based on page type
        if (shouldSetupAuthListener()) {
            console.log('Setting up mock auth state listener');
            this.setupAuthStateListener();
        } else {
            console.log('Skipping auth state listener setup for this page type');
        }
    }

    async signIn(email, password) {
        // Mock sign in - accept any email/password combination
        const mockUser = {
            uid: 'mock-user-id',
            email: email,
            displayName: email.split('@')[0],
            emailVerified: true
        };

        this.currentUser = mockUser;
        localStorage.setItem('mockUser', JSON.stringify(mockUser));

        console.log('Mock user signed in:', email);
        return mockUser;
    }

    async signOut() {
        this.currentUser = null;
        localStorage.removeItem('mockUser');
        console.log('Mock user signed out');
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    setupAuthStateListener() {
        // Mock auth state listener
        const pageType = getPageType();

        if (this.currentUser) {
            handleAuthenticatedUser(this.currentUser);
        } else {
            handleUnauthenticatedUser();
        }
    }
}

// Initialize mock auth system
const mockAuth = new MockAuth();

// ===== AUTHENTICATION STATE MANAGEMENT =====

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

        // Sign out from mock auth
        if (mockAuth) {
            await mockAuth.signOut();
            console.log('Mock logout successful');
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

        // Check if user is authenticated with mock auth
        if (!mockAuth.isAuthenticated()) {
            console.log('No authenticated user found, showing login popup');
            if (typeof openLoginPopup === 'function') {
                openLoginPopup('admin');
            }
            return;
        }

        const currentUser = mockAuth.getCurrentUser();
        console.log('User authenticated:', currentUser.email);

        // Mock admin check - all authenticated users are considered admins
        console.log('Admin access granted:', currentUser.email);

    } catch (error) {
        console.error('Error in protectPage:', error);
        if (typeof openLoginPopup === 'function') {
            openLoginPopup('admin');
        }
    }
}

// Mock authentication system - no external dependencies

// ===== PUBLIC CHATBOT FUNCTIONALITY =====

function initializePublicChatbot() {
    // Initialize mock auth
    mockAuth.setupAuthStateListener();

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
    // Directly open login popup instead of showing intermediate dialog
    setTimeout(() => {
        if (typeof openLoginPopup === 'function') {
            openLoginPopup('student');
        }
    }, 300);

    return {
        isPrivate: true,
        response: `🔒 <strong>Login Required</strong><br><br>
                   Opening student login window to access "${query}"...<br><br>
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
// Student dashboard functionality removed

// ===== INITIALIZATION =====

// Auto-initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    const { isAdminPage } = getPageType();

    if (isAdminPage) {
        // Admin panel - protected
        protectPage();
        initializeLogout();
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
        // Mock student validation - accept any email/dob combination
        const student = {
            id: 'mock-student-id',
            email: email,
            name: email.split('@')[0],
            dateOfBirth: dob,
            course: 'BCA',
            year: '2nd Year'
        };

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
        // Mock admin login - accept any email/password combination
        await mockAuth.signIn(email, password);

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
