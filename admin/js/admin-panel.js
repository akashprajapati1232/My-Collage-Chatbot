// ===== MODERN ADMIN PANEL JAVASCRIPT =====

class AdminPanel {
    constructor() {
        // Prevent multiple instances (singleton pattern)
        if (AdminPanel.instance) {
            console.warn('AdminPanel instance already exists. Returning existing instance.');
            return AdminPanel.instance;
        }

        AdminPanel.instance = this;

        this.currentSection = 'dashboard';
        this.firebaseService = null;
        this.courses = [];
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 30000; // 30 seconds
        this.autoSaveTimer = null;
        this.darkTheme = localStorage.getItem('darkTheme') === 'true';
        this.sessionTimeout = 3600000; // 1 hour
        this.lastActivity = Date.now();
        this.activityTimer = null;
        this.sidebarOpen = false;
        this.isMobile = window.innerWidth <= 1024;
        this.initialized = false; // Track initialization state

        // Message queue system
        this.messageQueue = [];
        this.isShowingMessage = false;
        this.currentToast = null;
        this.messageTimeout = null;

        this.init();
    }

    async init() {
        // Prevent duplicate initialization
        if (this.initialized) {
            console.log('AdminPanel already initialized, skipping...');
            return;
        }

        try {
            // Initialize Firebase service first
            await this.initializeFirebase();

            // Apply saved theme immediately
            this.applyTheme();

            // Setup event listeners
            this.setupEventListeners();

            // Initialize sidebar state
            this.initializeSidebar();

            // Initialize settings
            this.initializeSettings();

            // Start activity monitoring
            this.startActivityMonitoring();

            // Initialize current page
            await this.initializePage();

            // Add smooth animations
            this.addAnimations();

            this.initialized = true;
            console.log('Modern admin panel initialized successfully');

        } catch (error) {
            console.error('Error initializing admin panel:', error);
            this.showMessage('Error initializing admin panel: ' + error.message, 'error');
        }
    }


    async initializeFirebase() {
        try {
            // Wait for firebaseService to be available
            let attempts = 0;
            while (!window.firebaseService && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.firebaseService) {
                throw new Error('Firebase service not available');
            }

            this.firebaseService = window.firebaseService;
            await this.firebaseService.initialize();

            if (!this.firebaseService.isReady()) {
                throw new Error('Firebase service failed to initialize');
            }

            // Test Firebase connection
            await this.testFirebaseConnection();

            console.log('Firebase service initialized for admin panel');
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            this.showMessage('Firebase initialization failed. Please check your connection and try again.', 'error');
            throw error;
        }
    }

    async testFirebaseConnection() {
        try {
            console.log('Testing Firebase connection...');

            // Test authentication
            const currentUser = this.firebaseService.getCurrentUser();
            if (!currentUser) {
                console.warn('No authenticated user found');
                return;
            }

            console.log('User authenticated:', currentUser.email);

            // Test Firestore access by trying to read a collection
            const testCollection = this.firebaseService.firestore.collection(this.firebaseService.db, 'admins');
            await this.firebaseService.firestore.getDocs(testCollection);

            console.log('Firebase connection test successful');
        } catch (error) {
            console.error('Firebase connection test failed:', error);

            if (error.code === 'permission-denied') {
                throw new Error('Permission denied. Please check Firestore security rules.');
            } else if (error.code === 'unauthenticated') {
                throw new Error('Authentication required. Please log in again.');
            } else {
                throw new Error(`Firebase connection failed: ${error.message}`);
            }
        }
    }

    // Helper methods for Firebase operations
    async getCollection(collectionName) {
        if (!this.firebaseService || !this.firebaseService.isReady()) {
            throw new Error('Firebase service not ready');
        }
        return this.firebaseService.firestore.getDocs(
            this.firebaseService.firestore.collection(this.firebaseService.db, collectionName)
        );
    }

    async getDocument(collectionName, docId) {
        if (!this.firebaseService || !this.firebaseService.isReady()) {
            throw new Error('Firebase service not ready');
        }
        return this.firebaseService.firestore.getDoc(
            this.firebaseService.firestore.doc(this.firebaseService.db, collectionName, docId)
        );
    }

    async addDocument(collectionName, data) {
        if (!this.firebaseService || !this.firebaseService.isReady()) {
            throw new Error('Firebase service not ready');
        }
        return this.firebaseService.firestore.addDoc(
            this.firebaseService.firestore.collection(this.firebaseService.db, collectionName),
            data
        );
    }

    async updateDocument(collectionName, docId, data) {
        if (!this.firebaseService || !this.firebaseService.isReady()) {
            throw new Error('Firebase service not ready');
        }
        return this.firebaseService.firestore.updateDoc(
            this.firebaseService.firestore.doc(this.firebaseService.db, collectionName, docId),
            data
        );
    }

    async setDocument(collectionName, docId, data, options = {}) {
        if (!this.firebaseService || !this.firebaseService.isReady()) {
            throw new Error('Firebase service not ready');
        }
        return this.firebaseService.firestore.setDoc(
            this.firebaseService.firestore.doc(this.firebaseService.db, collectionName, docId),
            data,
            options
        );
    }

    async deleteDocument(collectionName, docId) {
        if (!this.firebaseService || !this.firebaseService.isReady()) {
            throw new Error('Firebase service not ready');
        }
        return this.firebaseService.firestore.deleteDoc(
            this.firebaseService.firestore.doc(this.firebaseService.db, collectionName, docId)
        );
    }

    removeEventListeners() {
        if (!this.boundFunctions) return;

        // Remove existing event listeners
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.removeEventListener('click', this.boundFunctions.toggleSidebar);
        }

        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebarOverlay) {
            sidebarOverlay.removeEventListener('click', this.boundFunctions.closeSidebar);
        }

        document.querySelectorAll('.menu-link').forEach(link => {
            link.removeEventListener('click', this.boundFunctions.menuLinkClick);
        });

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.removeEventListener('click', this.boundFunctions.toggleTheme);
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.removeEventListener('click', this.boundFunctions.logout);
        }
    }

    setupEventListeners() {
        // Remove existing event listeners to prevent duplicates
        this.removeEventListeners();

        // Store bound functions for later removal
        this.boundFunctions = {
            toggleSidebar: () => this.toggleSidebar(),
            closeSidebar: () => this.closeSidebar(),
            toggleTheme: () => this.toggleTheme(),
            logout: () => this.logout(),
            menuLinkClick: () => {
                if (this.isMobile) {
                    this.closeSidebar();
                }
            }
        };

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.boundFunctions.toggleSidebar);
        }

        // Sidebar overlay
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', this.boundFunctions.closeSidebar);
        }

        // Menu links - close sidebar on mobile when clicking
        document.querySelectorAll('.menu-link').forEach(link => {
            link.addEventListener('click', this.boundFunctions.menuLinkClick);
        });

        // Submenu links - close sidebar on mobile when clicking
        document.querySelectorAll('.submenu-link').forEach(link => {
            link.addEventListener('click', this.boundFunctions.menuLinkClick);
        });

        // Setup dropdown toggles
        this.setupDropdownMenus();

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.boundFunctions.toggleTheme);
        }

        // User menu toggle - Enhanced implementation
        this.setupUserMenu();

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.boundFunctions.logout);
        }

        // Form submissions
        this.setupFormListeners();
    }

    setupDropdownMenus() {
        // Handle dropdown toggle buttons
        document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const dropdownId = toggle.getAttribute('data-dropdown');
                const dropdown = document.getElementById(`${dropdownId}-dropdown`);

                if (dropdown) {
                    // Close other dropdowns
                    document.querySelectorAll('.dropdown-submenu').forEach(menu => {
                        if (menu !== dropdown) {
                            menu.classList.remove('show');
                            const otherToggle = document.querySelector(`[data-dropdown="${menu.id.replace('-dropdown', '')}"]`);
                            if (otherToggle) {
                                otherToggle.classList.remove('active');
                            }
                        }
                    });

                    // Toggle current dropdown
                    const isOpen = dropdown.classList.contains('show');
                    if (isOpen) {
                        dropdown.classList.remove('show');
                        toggle.classList.remove('active');
                    } else {
                        dropdown.classList.add('show');
                        toggle.classList.add('active');
                    }
                }
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.has-dropdown')) {
                document.querySelectorAll('.dropdown-submenu').forEach(menu => {
                    menu.classList.remove('show');
                });
                document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
                    toggle.classList.remove('active');
                });
            }
        });
    }

    setupUserMenu() {
        // Wait for DOM to be fully ready
        setTimeout(() => {
            const userMenuToggle = document.getElementById('userMenuToggle');
            const userDropdown = document.getElementById('userDropdown');

            if (userMenuToggle && userDropdown) {
                // Remove any existing event listeners to prevent duplicates
                const newToggle = userMenuToggle.cloneNode(true);
                userMenuToggle.parentNode.replaceChild(newToggle, userMenuToggle);

                // Add click event listener to toggle button
                newToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    // Toggle the dropdown
                    const isCurrentlyVisible = userDropdown.classList.contains('show');

                    // Close all other dropdowns first
                    document.querySelectorAll('.user-dropdown.show, .dropdown-menu.show').forEach(dropdown => {
                        if (dropdown !== userDropdown) {
                            dropdown.classList.remove('show');
                        }
                    });

                    // Toggle this dropdown
                    if (isCurrentlyVisible) {
                        userDropdown.classList.remove('show');
                    } else {
                        userDropdown.classList.add('show');
                    }
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!newToggle.contains(e.target) && !userDropdown.contains(e.target)) {
                        userDropdown.classList.remove('show');
                    }
                });

                // Prevent dropdown from closing when clicking inside it
                userDropdown.addEventListener('click', (e) => {
                    e.stopPropagation();
                });

                // Handle keyboard navigation
                newToggle.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        userDropdown.classList.toggle('show');
                    }
                    if (e.key === 'Escape') {
                        userDropdown.classList.remove('show');
                    }
                });

                console.log('User menu setup completed successfully');
            } else {
                console.warn('User menu elements not found, retrying in 1 second...');
                // Retry after 1 second if elements not found
                setTimeout(() => this.setupUserMenu(), 1000);
            }
        }, 100);
    }

    setupFormListeners() {
        // Reset buttons
        this.setupResetButtons();

        // Add buttons
        this.setupAddButtons();



        // Dashboard event listeners
        this.setupDashboardListeners();

        // CSV Import/Export listeners
        this.setupImportExportListeners();

        // Settings listeners
        this.setupSettingsListeners();

        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    setupSettingsListeners() {
        // Auto-save toggle
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', (e) => {
                this.toggleAutoSave(e.target.checked);
            });
        }

        // Auto-save interval
        const autoSaveInterval = document.getElementById('autoSaveInterval');
        if (autoSaveInterval) {
            autoSaveInterval.addEventListener('change', (e) => {
                this.setAutoSaveInterval(parseInt(e.target.value));
            });
        }

        // Theme mode
        const themeMode = document.getElementById('themeMode');
        if (themeMode) {
            themeMode.addEventListener('change', (e) => {
                this.setThemeMode(e.target.value);
            });
        }

        // Password form
        const passwordForm = document.getElementById('changePasswordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }

        // Password toggle buttons
        document.querySelectorAll('.password-toggle').forEach(button => {
            button.addEventListener('click', (e) => {
                this.togglePasswordVisibility(e.target.closest('.password-toggle'));
            });
        });
    }



    setupDashboardListeners() {
        // Refresh dashboard
        document.getElementById('refreshDashboard')?.addEventListener('click', () => {
            this.loadDashboardData();
        });

        // Export all data
        document.getElementById('exportAllData')?.addEventListener('click', () => {
            this.exportAllData();
        });

        // Import data button
        document.getElementById('importDataBtn')?.addEventListener('click', () => {
            this.showImportModal();
        });
    }

    setupImportExportListeners() {
        // CSV Import button
        document.getElementById('importCsvBtn')?.addEventListener('click', () => {
            this.showImportModal();
        });

        // Export CSV button
        document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
            this.exportAllData();
        });

        // Backup button
        document.getElementById('backupBtn')?.addEventListener('click', () => {
            this.createBackup();
        });
    }

    setupFormListeners() {
        // Material form
        document.getElementById('materialForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMaterial();
        });

        // Notice form
        document.getElementById('noticeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNotice();
        });

        // Fee form
        document.getElementById('feeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFee();
        });

        // Faculty form
        document.getElementById('facultyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFaculty();
        });

        // College form
        document.getElementById('collegeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCollege();
        });

        // Student form
        document.getElementById('studentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStudent();
        });
    }

    setupResetButtons() {
        document.getElementById('resetCourseForm')?.addEventListener('click', () => {
            document.getElementById('courseForm').reset();
            document.getElementById('courseId').value = '';
        });

        document.getElementById('resetMaterialForm')?.addEventListener('click', () => {
            document.getElementById('materialForm').reset();
            document.getElementById('materialId').value = '';
        });

        document.getElementById('resetNoticeForm')?.addEventListener('click', () => {
            document.getElementById('noticeForm').reset();
            document.getElementById('noticeId').value = '';
        });

        document.getElementById('resetFeeForm')?.addEventListener('click', () => {
            document.getElementById('feeForm').reset();
            document.getElementById('feeId').value = '';
        });

        document.getElementById('resetFacultyForm')?.addEventListener('click', () => {
            document.getElementById('facultyForm').reset();
            document.getElementById('facultyId').value = '';
        });

        document.getElementById('resetCollegeForm')?.addEventListener('click', () => {
            document.getElementById('collegeForm').reset();
        });

        document.getElementById('resetStudentForm')?.addEventListener('click', () => {
            document.getElementById('studentForm').reset();
            document.getElementById('studentId').value = '';
        });
    }

    setupAddButtons() {
        document.getElementById('addMaterialBtn')?.addEventListener('click', () => {
            document.getElementById('materialForm').reset();
            document.getElementById('materialId').value = '';
        });

        document.getElementById('addNoticeBtn')?.addEventListener('click', () => {
            document.getElementById('noticeForm').reset();
            document.getElementById('noticeId').value = '';
        });

        document.getElementById('addFeeBtn')?.addEventListener('click', () => {
            document.getElementById('feeForm').reset();
            document.getElementById('feeId').value = '';
        });

        document.getElementById('addFacultyBtn')?.addEventListener('click', () => {
            document.getElementById('facultyForm').reset();
            document.getElementById('facultyId').value = '';
        });

        document.getElementById('addStudentBtn')?.addEventListener('click', () => {
            document.getElementById('studentForm').reset();
            document.getElementById('studentId').value = '';
        });

        // Add faculty member button
        document.getElementById('addFacultyMember')?.addEventListener('click', () => {
            this.addFacultyMember();
        });
    }

    async initializePage() {
        // Determine current page from URL or currentPage property
        const currentPage = this.currentPage || this.getCurrentPageFromURL();

        // Update navigation highlighting
        this.updateNavigationHighlight(currentPage);

        // Load page-specific data
        await this.loadPageData(currentPage);

        // Restore auto-saved data for forms
        if (currentPage !== 'dashboard' && currentPage !== 'settings') {
            setTimeout(() => {
                this.restoreAutoSavedData(`${currentPage}Form`);
            }, 100);
        }
    }

    getCurrentPageFromURL() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();

        // Map filenames to page names
        const pageMap = {
            'admin-panel.html': 'dashboard',
            'courses.html': 'courses',
            'syllabus.html': 'syllabus',
            'notices.html': 'notices',
            'fee-structure.html': 'fee-structure',
            'faculty.html': 'faculty',
            'college-info.html': 'college-info',
            'students.html': 'students',
            'settings.html': 'settings'
        };

        return pageMap[filename] || 'dashboard';
    }

    updateNavigationHighlight(currentPage) {
        // Remove active state from all menu links
        document.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('active');
        });

        // Add active state to current page link
        const currentLink = document.querySelector(`.menu-link[href*="${currentPage}"]`);
        if (currentLink) {
            currentLink.classList.add('active');
        }
    }

    async loadPageData(pageName) {
        this.showLoading(true);

        try {
            switch (pageName) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'courses':
                    // Course data is handled by CourseManager
                    break;
                case 'syllabus':
                    await this.loadMaterials();
                    if (window.populateCourseDropdowns) await window.populateCourseDropdowns();
                    break;
                case 'notices':
                    await this.loadNotices();
                    if (window.populateCourseDropdowns) await window.populateCourseDropdowns();
                    break;
                case 'fee-structure':
                    await this.loadFees();
                    if (window.populateCourseDropdowns) await window.populateCourseDropdowns();
                    break;
                case 'faculty':
                    await this.loadFaculty();
                    break;
                case 'college-info':
                    await this.loadCollegeInfo();
                    break;
                case 'students':
                    await this.loadStudents();
                    if (window.populateCourseDropdowns) await window.populateCourseDropdowns();
                    break;
                case 'timetables':
                case 'view-timetables':
                    // Timetable data is handled by TimetablesPage
                    if (window.populateCourseDropdowns) await window.populateCourseDropdowns();
                    break;
                case 'settings':
                    await this.loadSystemInfo();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${pageName} data:`, error);

            // Provide more specific error messages
            let errorMessage = `Error loading ${pageName} data`;
            if (error.code === 'permission-denied') {
                errorMessage = 'Permission denied. Please check Firebase security rules.';
            } else if (error.code === 'unauthenticated') {
                errorMessage = 'Authentication required. Please log in again.';
            } else if (error.message.includes('Firebase service not ready')) {
                errorMessage = 'Firebase connection failed. Please refresh the page.';
            } else if (error.message) {
                errorMessage = `${errorMessage}: ${error.message}`;
            }

            this.showMessage(errorMessage, 'error');

            // Add debug information to console
            this.debugFirebaseState();
        } finally {
            this.showLoading(false);
        }
    }

    debugFirebaseState() {
        console.group('🔍 Firebase Debug Information');
        console.log('Firebase Service Available:', !!window.firebaseService);
        console.log('Firebase Service Ready:', window.firebaseService?.isReady());
        console.log('Current User:', window.firebaseService?.getCurrentUser()?.email || 'Not authenticated');
        console.log('Firebase Config:', window.FIREBASE_CONFIG);
        console.groupEnd();
    }





    showLoading(show) {
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.style.display = show ? 'flex' : 'none';
        }
    }

    showMessage(message, type = 'success') {
        // Clear any existing messages immediately to prevent overlapping
        this.clearAllMessages();

        // Show the new message immediately without queuing
        this.displayMessage(message, type);
    }

    clearAllMessages() {
        // Clear current toast
        if (this.currentToast) {
            try {
                this.currentToast.hideToast();
            } catch (e) {
                // Ignore errors if toast is already hidden
            }
            this.currentToast = null;
        }

        // Remove any existing toasts from DOM immediately
        const existingToasts = document.querySelectorAll('.toastify');
        existingToasts.forEach(toast => {
            try {
                toast.remove();
            } catch (e) {
                // Ignore errors
            }
        });

        // Clear any pending timeouts
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }

        // Reset state
        this.isShowingMessage = false;
        this.messageQueue = [];
    }

    displayMessage(message, type) {
        // Map types to Toastify styles
        let backgroundColor;
        let icon;
        let duration;

        switch(type) {
            case 'success':
                backgroundColor = 'linear-gradient(135deg, #10b981, #059669)';
                icon = '✅';
                duration = 2500; // Shorter duration for better UX
                break;
            case 'error':
                backgroundColor = 'linear-gradient(135deg, #ef4444, #dc2626)';
                icon = '❌';
                duration = 4000; // Longer for errors
                break;
            case 'warning':
                backgroundColor = 'linear-gradient(135deg, #f59e0b, #d97706)';
                icon = '⚠️';
                duration = 3000;
                break;
            case 'info':
                backgroundColor = 'linear-gradient(135deg, #3b82f6, #2563eb)';
                icon = 'ℹ️';
                duration = 2500;
                break;
            default:
                backgroundColor = 'linear-gradient(135deg, #6b7280, #4b5563)';
                icon = '📝';
                duration = 2500;
        }

        this.isShowingMessage = true;

        this.currentToast = Toastify({
            text: `${icon} ${message}`,
            duration: duration,
            close: true,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
                background: backgroundColor,
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                padding: "12px 40px 12px 16px",
                maxWidth: "400px",
                minWidth: "300px",
                lineHeight: "1.4",
                zIndex: "10000"
            },
            callback: () => {
                // When this message finishes, reset state
                this.currentToast = null;
                this.isShowingMessage = false;
            },
            onClick: () => {
                // When clicked, hide immediately
                if (this.currentToast) {
                    this.currentToast.hideToast();
                    this.currentToast = null;
                    this.isShowingMessage = false;
                }
            }
        });

        // Show the toast immediately
        this.currentToast.showToast();
    }

    // Legacy method for backward compatibility - now just calls showMessage
    processMessageQueue() {
        // This method is now deprecated but kept for compatibility
        // All message processing is now immediate via showMessage
    }










    // ===== MATERIALS OPERATIONS =====

    async loadMaterials() {
        try {
            const snapshot = await this.getCollection('materials');
            const materials = [];

            snapshot.forEach(doc => {
                materials.push({ id: doc.id, ...doc.data() });
            });

            this.renderMaterials(materials);
        } catch (error) {
            console.error('Error loading materials:', error);
            throw error;
        }
    }

    renderMaterials(materials) {
        // Initialize or update Tabulator table for materials
        if (!this.materialsTable) {
            this.initializeMaterialsTable();
        }

        // Update table data
        this.materialsTable.setData(materials);
    }

    initializeMaterialsTable() {
        const container = document.getElementById('materialsList');
        if (!container) return;

        // Clear any existing content
        container.innerHTML = '<div id="materialsTable" style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;"></div>';

        // Initialize Tabulator table
        this.materialsTable = new Tabulator("#materialsTable", {
            height: "400px",
            layout: "fitColumns",
            pagination: "local",
            paginationSize: 10,
            paginationSizeSelector: [5, 10, 20, 50],
            movableColumns: true,
            resizableRows: true,
            selectable: true,
            placeholder: "No materials found. Add your first material above.",
            columns: [
                {
                    title: "Course",
                    field: "course",
                    width: 120,
                    sorter: "string",
                    headerFilter: "select",
                    headerFilterParams: {values: true}
                },
                {
                    title: "Subject",
                    field: "subjectName",
                    width: 150,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "Semester",
                    field: "semester",
                    width: 100,
                    sorter: "string",
                    headerFilter: "select",
                    headerFilterParams: {values: true}
                },
                {
                    title: "Type",
                    field: "fileType",
                    width: 100,
                    sorter: "string",
                    headerFilter: "select",
                    headerFilterParams: {values: true}
                },
                {
                    title: "File",
                    field: "fileUrl",
                    width: 80,
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value ? `<a href="${value}" target="_blank" style="color: #007bff; text-decoration: none;"><i class="fas fa-external-link-alt"></i> View</a>` : '-';
                    },
                    headerSort: false
                },
                {
                    title: "Reference Books",
                    field: "refBooks",
                    width: 150,
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value || '-';
                    }
                },
                {
                    title: "Actions",
                    field: "actions",
                    width: 150,
                    formatter: (cell) => {
                        return `
                            <button class="btn btn-sm btn-secondary" onclick="adminPanel.editMaterial('${cell.getRow().getData().id}')" style="margin-right: 5px; padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteMaterial('${cell.getRow().getData().id}')" style="padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        `;
                    },
                    headerSort: false
                }
            ]
        });
    }

    async saveMaterial() {
        try {
            const form = document.getElementById('materialForm');
            const formData = new FormData(form);
            const materialId = formData.get('materialId');

            const materialData = {
                course: formData.get('course'),
                semester: formData.get('semester'),
                subjectName: formData.get('subjectName'),
                fileType: formData.get('fileType'),
                refBooks: formData.get('refBooks') || '',
                fileUrl: formData.get('fileUrl'),
                updatedAt: new Date().toISOString()
            };

            if (materialId) {
                await this.updateDocument('materials', materialId, materialData);
                this.showMessage('Material updated successfully');
            } else {
                materialData.createdAt = new Date().toISOString();
                await this.addDocument('materials', materialData);
                this.showMessage('Material added successfully');
            }

            form.reset();
            document.getElementById('materialId').value = '';
            await this.loadMaterials();
        } catch (error) {
            console.error('Error saving material:', error);
            this.showMessage('Error saving material', 'error');
        }
    }

    async editMaterial(materialId) {
        try {
            const doc = await this.getDocument('materials', materialId);
            if (doc.exists()) {
                const material = doc.data();

                document.getElementById('materialId').value = materialId;
                document.getElementById('materialCourse').value = material.course || '';
                document.getElementById('materialSemester').value = material.semester || '';
                document.getElementById('subjectName').value = material.subjectName || '';
                document.getElementById('fileType').value = material.fileType || '';
                document.getElementById('refBooks').value = material.refBooks || '';
                document.getElementById('fileUrl').value = material.fileUrl || '';

                document.getElementById('materialForm').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error loading material for edit:', error);
            this.showMessage('Error loading material', 'error');
        }
    }

    async deleteMaterial(materialId) {
        const result = await Swal.fire({
            title: 'Delete Material?',
            text: 'Are you sure you want to delete this material?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            background: '#fff',
            color: '#333'
        });

        if (result.isConfirmed) {
            try {
                await this.deleteDocument('materials', materialId);
                this.showMessage('Material deleted successfully');
                await this.loadMaterials();

                Swal.fire({
                    title: 'Deleted!',
                    text: 'Material has been deleted successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#fff',
                    color: '#333'
                });
            } catch (error) {
                console.error('Error deleting material:', error);
                this.showMessage('Error deleting material', 'error');

                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete material. Please try again.',
                    icon: 'error',
                    background: '#fff',
                    color: '#333'
                });
            }
        }
    }

    // ===== NOTICES OPERATIONS =====

    async loadNotices() {
        try {
            const snapshot = await this.getCollection('notices');
            const notices = [];

            snapshot.forEach(doc => {
                notices.push({ id: doc.id, ...doc.data() });
            });

            this.renderNotices(notices);
        } catch (error) {
            console.error('Error loading notices:', error);
            throw error;
        }
    }

    renderNotices(notices) {
        // Initialize or update Tabulator table for notices
        if (!this.noticesTable) {
            this.initializeNoticesTable();
        }

        // Update table data
        this.noticesTable.setData(notices);
    }

    initializeNoticesTable() {
        const container = document.getElementById('noticesList');
        if (!container) return;

        // Clear any existing content
        container.innerHTML = '<div id="noticesTable" style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;"></div>';

        // Initialize Tabulator table
        this.noticesTable = new Tabulator("#noticesTable", {
            height: "400px",
            layout: "fitColumns",
            pagination: "local",
            paginationSize: 10,
            paginationSizeSelector: [5, 10, 20, 50],
            movableColumns: true,
            resizableRows: true,
            selectable: true,
            placeholder: "No notices found. Add your first notice above.",
            columns: [
                {
                    title: "Title",
                    field: "title",
                    width: 200,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "Date",
                    field: "date",
                    width: 120,
                    sorter: "date",
                    headerFilter: "input"
                },
                {
                    title: "Courses",
                    field: "courses",
                    width: 150,
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return Array.isArray(value) ? value.join(', ') : value || '-';
                    },
                    headerFilter: "input"
                },
                {
                    title: "Description",
                    field: "description",
                    width: 250,
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : '-';
                    },
                    headerFilter: "input"
                },
                {
                    title: "Attachment",
                    field: "attachment",
                    width: 100,
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value ? `<a href="${value}" target="_blank" style="color: #007bff; text-decoration: none;"><i class="fas fa-external-link-alt"></i> View</a>` : '-';
                    },
                    headerSort: false
                },
                {
                    title: "Actions",
                    field: "actions",
                    width: 150,
                    formatter: (cell) => {
                        return `
                            <button class="btn btn-sm btn-secondary" onclick="adminPanel.editNotice('${cell.getRow().getData().id}')" style="margin-right: 5px; padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteNotice('${cell.getRow().getData().id}')" style="padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        `;
                    },
                    headerSort: false
                }
            ]
        });
    }

    async saveNotice() {
        try {
            const form = document.getElementById('noticeForm');
            const formData = new FormData(form);
            const noticeId = formData.get('noticeId');

            // Get selected courses
            const coursesSelect = document.getElementById('noticeCourses');
            const selectedCourses = Array.from(coursesSelect.selectedOptions).map(option => option.value);

            const noticeData = {
                title: formData.get('title'),
                date: formData.get('date'),
                description: formData.get('description'),
                courses: selectedCourses,
                attachment: formData.get('attachment') || '',
                updatedAt: new Date().toISOString()
            };

            if (noticeId) {
                await this.updateDocument('notices', noticeId, noticeData);
                this.showMessage('Notice updated successfully');
            } else {
                noticeData.createdAt = new Date().toISOString();
                await this.addDocument('notices', noticeData);
                this.showMessage('Notice added successfully');
            }

            form.reset();
            document.getElementById('noticeId').value = '';
            await this.loadNotices();
        } catch (error) {
            console.error('Error saving notice:', error);
            this.showMessage('Error saving notice', 'error');
        }
    }

    async editNotice(noticeId) {
        try {
            const doc = await this.getDocument('notices', noticeId);
            if (doc.exists()) {
                const notice = doc.data();

                document.getElementById('noticeId').value = noticeId;
                document.getElementById('noticeTitle').value = notice.title || '';
                document.getElementById('noticeDate').value = notice.date || '';
                document.getElementById('noticeDescription').value = notice.description || '';
                document.getElementById('noticeAttachment').value = notice.attachment || '';

                // Select courses
                const coursesSelect = document.getElementById('noticeCourses');
                Array.from(coursesSelect.options).forEach(option => {
                    option.selected = notice.courses && notice.courses.includes(option.value);
                });

                document.getElementById('noticeForm').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error loading notice for edit:', error);
            this.showMessage('Error loading notice', 'error');
        }
    }

    async deleteNotice(noticeId) {
        const result = await Swal.fire({
            title: 'Delete Notice?',
            text: 'Are you sure you want to delete this notice?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            background: '#fff',
            color: '#333'
        });

        if (result.isConfirmed) {
            try {
                await this.deleteDocument('notices', noticeId);
                this.showMessage('Notice deleted successfully');
                await this.loadNotices();

                Swal.fire({
                    title: 'Deleted!',
                    text: 'Notice has been deleted successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#fff',
                    color: '#333'
                });
            } catch (error) {
                console.error('Error deleting notice:', error);
                this.showMessage('Error deleting notice', 'error');

                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete notice. Please try again.',
                    icon: 'error',
                    background: '#fff',
                    color: '#333'
                });
            }
        }
    }

    // ===== FEES OPERATIONS =====

    async loadFees() {
        try {
            const snapshot = await this.getCollection('fees');
            const fees = [];

            snapshot.forEach(doc => {
                fees.push({ id: doc.id, ...doc.data() });
            });

            this.renderFees(fees);
        } catch (error) {
            console.error('Error loading fees:', error);
            throw error;
        }
    }

    renderFees(fees) {
        // Initialize or update Tabulator table for fees
        if (!this.feesTable) {
            this.initializeFeesTable();
        }

        // Update table data
        this.feesTable.setData(fees);
    }

    initializeFeesTable() {
        const container = document.getElementById('feesList');
        if (!container) return;

        // Clear any existing content
        container.innerHTML = '<div id="feesTable" style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;"></div>';

        // Initialize Tabulator table
        this.feesTable = new Tabulator("#feesTable", {
            height: "400px",
            layout: "fitColumns",
            pagination: "local",
            paginationSize: 10,
            paginationSizeSelector: [5, 10, 20, 50],
            movableColumns: true,
            resizableRows: true,
            selectable: true,
            placeholder: "No fee structures found. Add your first fee structure above.",
            columns: [
                {
                    title: "Course",
                    field: "course",
                    width: 150,
                    sorter: "string",
                    headerFilter: "select",
                    headerFilterParams: {values: true}
                },
                {
                    title: "Admission Fee",
                    field: "admissionFee",
                    width: 120,
                    sorter: "number",
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value ? `₹${value}` : '-';
                    }
                },
                {
                    title: "Hostel Fee",
                    field: "hostelFee",
                    width: 120,
                    sorter: "number",
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value ? `₹${value}` : '-';
                    }
                },
                {
                    title: "Bus Fee",
                    field: "busFee",
                    width: 120,
                    sorter: "number",
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value ? `₹${value}` : '-';
                    }
                },
                {
                    title: "Payment Link",
                    field: "feePaymentLink",
                    width: 120,
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value ? `<a href="${value}" target="_blank" style="color: #007bff; text-decoration: none;"><i class="fas fa-external-link-alt"></i> Pay Now</a>` : '-';
                    },
                    headerSort: false
                },
                {
                    title: "Actions",
                    field: "actions",
                    width: 150,
                    formatter: (cell) => {
                        return `
                            <button class="btn btn-sm btn-secondary" onclick="adminPanel.editFee('${cell.getRow().getData().id}')" style="margin-right: 5px; padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteFee('${cell.getRow().getData().id}')" style="padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        `;
                    },
                    headerSort: false
                }
            ]
        });
    }

    async saveFee() {
        try {
            const form = document.getElementById('feeForm');
            const formData = new FormData(form);
            const feeId = formData.get('feeId');

            const feeData = {
                course: formData.get('course'),
                admissionFee: parseInt(formData.get('admissionFee')),
                semwiseFee: formData.get('semwiseFee'),
                hostelFee: formData.get('hostelFee') ? parseInt(formData.get('hostelFee')) : null,
                busFee: formData.get('busFee') ? parseInt(formData.get('busFee')) : null,
                scholarshipInfo: formData.get('scholarshipInfo') || '',
                feePaymentLink: formData.get('feePaymentLink') || '',
                updatedAt: new Date().toISOString()
            };

            if (feeId) {
                await this.updateDocument('fees', feeId, feeData);
                this.showMessage('Fee structure updated successfully');
            } else {
                feeData.createdAt = new Date().toISOString();
                await this.addDocument('fees', feeData);
                this.showMessage('Fee structure added successfully');
            }

            form.reset();
            document.getElementById('feeId').value = '';
            await this.loadFees();
        } catch (error) {
            console.error('Error saving fee structure:', error);
            this.showMessage('Error saving fee structure', 'error');
        }
    }

    async editFee(feeId) {
        try {
            const doc = await this.getDocument('fees', feeId);
            if (doc.exists()) {
                const fee = doc.data();

                document.getElementById('feeId').value = feeId;
                document.getElementById('feeCourse').value = fee.course || '';
                document.getElementById('admissionFee').value = fee.admissionFee || '';
                document.getElementById('semwiseFee').value = fee.semwiseFee || '';
                document.getElementById('hostelFee').value = fee.hostelFee || '';
                document.getElementById('busFee').value = fee.busFee || '';
                document.getElementById('scholarshipInfo').value = fee.scholarshipInfo || '';
                document.getElementById('feePaymentLink').value = fee.feePaymentLink || '';

                document.getElementById('feeForm').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error loading fee for edit:', error);
            this.showMessage('Error loading fee structure', 'error');
        }
    }

    async deleteFee(feeId) {
        const result = await Swal.fire({
            title: 'Delete Fee Structure?',
            text: 'Are you sure you want to delete this fee structure?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            background: '#fff',
            color: '#333'
        });

        if (result.isConfirmed) {
            try {
                await this.deleteDocument('fees', feeId);
                this.showMessage('Fee structure deleted successfully');
                await this.loadFees();

                Swal.fire({
                    title: 'Deleted!',
                    text: 'Fee structure has been deleted successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#fff',
                    color: '#333'
                });
            } catch (error) {
                console.error('Error deleting fee structure:', error);
                this.showMessage('Error deleting fee structure', 'error');

                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete fee structure. Please try again.',
                    icon: 'error',
                    background: '#fff',
                    color: '#333'
                });
            }
        }
    }

    // ===== FACULTY OPERATIONS =====

    async loadFaculty() {
        try {
            const snapshot = await this.getCollection('faculty');
            const faculty = [];

            snapshot.forEach(doc => {
                faculty.push({ id: doc.id, ...doc.data() });
            });

            this.renderFaculty(faculty);
        } catch (error) {
            console.error('Error loading faculty:', error);
            throw error;
        }
    }

    renderFaculty(faculty) {
        // Initialize or update Tabulator table for faculty
        if (!this.facultyTable) {
            this.initializeFacultyTable();
        }

        // Update table data
        this.facultyTable.setData(faculty);
    }

    initializeFacultyTable() {
        const container = document.getElementById('facultyList');
        if (!container) return;

        // Clear any existing content
        container.innerHTML = '<div id="facultyTable" style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;"></div>';

        // Initialize Tabulator table
        this.facultyTable = new Tabulator("#facultyTable", {
            height: "400px",
            layout: "fitColumns",
            pagination: "local",
            paginationSize: 10,
            paginationSizeSelector: [5, 10, 20, 50],
            movableColumns: true,
            resizableRows: true,
            selectable: true,
            placeholder: "No faculty departments found. Add your first department above.",
            columns: [
                {
                    title: "Department",
                    field: "department",
                    width: 200,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "HOD",
                    field: "hodName",
                    width: 200,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "Faculty Count",
                    field: "facultyList",
                    width: 120,
                    sorter: "number",
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value ? value.length : 0;
                    }
                },
                {
                    title: "Faculty Members",
                    field: "facultyList",
                    width: 300,
                    formatter: function(cell) {
                        const value = cell.getValue();
                        if (!value || value.length === 0) return '-';

                        const names = value.map(member => member.name).slice(0, 3);
                        const display = names.join(', ');
                        return value.length > 3 ? `${display} (+${value.length - 3} more)` : display;
                    }
                },
                {
                    title: "Actions",
                    field: "actions",
                    width: 150,
                    formatter: (cell) => {
                        return `
                            <button class="btn btn-sm btn-secondary" onclick="adminPanel.editFaculty('${cell.getRow().getData().id}')" style="margin-right: 5px; padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteFaculty('${cell.getRow().getData().id}')" style="padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        `;
                    },
                    headerSort: false
                }
            ]
        });
    }

    addFacultyMember() {
        const container = document.getElementById('facultyMembersList');
        const memberDiv = document.createElement('div');
        memberDiv.className = 'faculty-member';
        memberDiv.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" name="facultyName[]" required>
                </div>
                <div class="form-group">
                    <label>Subject *</label>
                    <input type="text" name="facultySubject[]" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="facultyEmail[]">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" name="facultyPhone[]">
                </div>
                <div class="form-group">
                    <label>Qualification</label>
                    <input type="text" name="facultyQualification[]">
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger remove-faculty">Remove</button>
                </div>
            </div>
        `;

        // Add remove functionality
        memberDiv.querySelector('.remove-faculty').addEventListener('click', () => {
            memberDiv.remove();
        });

        container.appendChild(memberDiv);
    }

    async saveFaculty() {
        try {
            const form = document.getElementById('facultyForm');
            const formData = new FormData(form);
            const facultyId = formData.get('facultyId');

            // Collect faculty members
            const facultyNames = formData.getAll('facultyName[]');
            const facultySubjects = formData.getAll('facultySubject[]');
            const facultyEmails = formData.getAll('facultyEmail[]');
            const facultyPhones = formData.getAll('facultyPhone[]');
            const facultyQualifications = formData.getAll('facultyQualification[]');

            const facultyList = facultyNames.map((name, index) => ({
                name: name,
                subject: facultySubjects[index] || '',
                email: facultyEmails[index] || '',
                phone: facultyPhones[index] || '',
                qualification: facultyQualifications[index] || ''
            })).filter(member => member.name.trim() !== '');

            const facultyData = {
                department: formData.get('department'),
                hodName: formData.get('hodName'),
                facultyList: facultyList,
                updatedAt: new Date().toISOString()
            };

            if (facultyId) {
                await this.updateDocument('faculty', facultyId, facultyData);
                this.showMessage('Faculty information updated successfully');
            } else {
                facultyData.createdAt = new Date().toISOString();
                await this.addDocument('faculty', facultyData);
                this.showMessage('Faculty information added successfully');
            }

            form.reset();
            document.getElementById('facultyId').value = '';
            // Reset faculty members list to one empty member
            document.getElementById('facultyMembersList').innerHTML = `
                <div class="faculty-member">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Name *</label>
                            <input type="text" name="facultyName[]" required>
                        </div>
                        <div class="form-group">
                            <label>Subject *</label>
                            <input type="text" name="facultySubject[]" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="facultyEmail[]">
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" name="facultyPhone[]">
                        </div>
                        <div class="form-group">
                            <label>Qualification</label>
                            <input type="text" name="facultyQualification[]">
                        </div>
                        <div class="form-group">
                            <button type="button" class="btn btn-danger remove-faculty">Remove</button>
                        </div>
                    </div>
                </div>
            `;
            await this.loadFaculty();
        } catch (error) {
            console.error('Error saving faculty:', error);
            this.showMessage('Error saving faculty information', 'error');
        }
    }

    // ===== COLLEGE INFO OPERATIONS =====

    async loadCollegeInfo() {
        try {
            const doc = await this.getDocument('college', 'info');
            if (doc.exists()) {
                const college = doc.data();
                this.populateCollegeForm(college);
            }
        } catch (error) {
            console.error('Error loading college info:', error);
            throw error;
        }
    }

    populateCollegeForm(college) {
        document.getElementById('collegeName').value = college.collegeName || '';
        document.getElementById('collegeType').value = college.collegeType || '';
        document.getElementById('collegeLocation').value = college.location || '';
        document.getElementById('establishmentYear').value = college.establishmentYear || '';
        document.getElementById('contactEmail').value = college.contactEmail || '';
        document.getElementById('contactPhone').value = college.contactPhone || '';
        document.getElementById('affiliatedUniversity').value = college.affiliatedUniversity || '';
        document.getElementById('director').value = college.director || '';
        document.getElementById('dean').value = college.dean || '';
        document.getElementById('asstDirector').value = college.asstDirector || '';
        document.getElementById('facilities').value = college.facilities || '';
        document.getElementById('eventsClubs').value = college.eventsClubs || '';
        document.getElementById('googleMapsLocation').value = college.googleMapsLocation || '';
        document.getElementById('hostelInfo').value = college.hostelInfo || '';
    }

    async saveCollege() {
        try {
            const form = document.getElementById('collegeForm');
            const formData = new FormData(form);

            const collegeData = {
                collegeName: formData.get('collegeName'),
                collegeType: formData.get('collegeType'),
                location: formData.get('location'),
                establishmentYear: parseInt(formData.get('establishmentYear')),
                contactEmail: formData.get('contactEmail'),
                contactPhone: formData.get('contactPhone'),
                affiliatedUniversity: formData.get('affiliatedUniversity'),
                director: formData.get('director') || '',
                dean: formData.get('dean') || '',
                asstDirector: formData.get('asstDirector') || '',
                facilities: formData.get('facilities') || '',
                eventsClubs: formData.get('eventsClubs') || '',
                googleMapsLocation: formData.get('googleMapsLocation') || '',
                hostelInfo: formData.get('hostelInfo') || '',
                updatedAt: new Date().toISOString()
            };

            await this.setDocument('college', 'info', collegeData, { merge: true });
            this.showMessage('College information updated successfully');
        } catch (error) {
            console.error('Error saving college info:', error);
            this.showMessage('Error saving college information', 'error');
        }
    }

    // ===== STUDENTS OPERATIONS =====

    async loadStudents() {
        try {
            const snapshot = await this.getCollection('students');
            const students = [];

            snapshot.forEach(doc => {
                students.push({ id: doc.id, ...doc.data() });
            });

            this.renderStudentsTable(students);
        } catch (error) {
            console.error('Error loading students:', error);
            throw error;
        }
    }

    initializeStudentsTable() {
        // Initialize Tabulator table
        this.studentsTable = new Tabulator("#studentsTable", {
            height: "500px",
            layout: "fitColumns",
            pagination: "local",
            paginationSize: 10,
            paginationSizeSelector: [5, 10, 20, 50],
            movableColumns: true,
            resizableRows: true,
            selectable: true,
            placeholder: "No students found. Add your first student above.",
            columns: [
                {
                    title: "Roll No",
                    field: "rollNo",
                    width: 100,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "Name",
                    field: "name",
                    width: 200,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "Email",
                    field: "email",
                    width: 250,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "Phone",
                    field: "phone",
                    width: 130,
                    sorter: "string"
                },
                {
                    title: "Course",
                    field: "course",
                    width: 120,
                    sorter: "string",
                    headerFilter: "select",
                    headerFilterParams: {values: true}
                },
                {
                    title: "Year",
                    field: "year",
                    width: 100,
                    sorter: "string",
                    headerFilter: "select",
                    headerFilterParams: {
                        values: ["1st Year", "2nd Year", "3rd Year", "4th Year"]
                    }
                },
                {
                    title: "Fee Due",
                    field: "feeDue",
                    width: 100,
                    sorter: "number",
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value ? `₹${value}` : '-';
                    }
                },
                {
                    title: "Actions",
                    field: "actions",
                    width: 150,
                    formatter: (cell) => {
                        return `
                            <button class="btn btn-sm btn-secondary" onclick="adminPanel.editStudent('${cell.getRow().getData().id}')" style="margin-right: 5px; padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteStudent('${cell.getRow().getData().id}')" style="padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        `;
                    },
                    headerSort: false
                }
            ]
        });

        // Setup search functionality
        const searchInput = document.getElementById('studentSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.studentsTable.setFilter([
                    {field: "name", type: "like", value: e.target.value},
                    {field: "rollNo", type: "like", value: e.target.value},
                    {field: "email", type: "like", value: e.target.value}
                ]);
            });
        }

        // Setup filter functionality
        const courseFilter = document.getElementById('courseFilter');
        const yearFilter = document.getElementById('yearFilter');
        const clearFilters = document.getElementById('clearFilters');

        if (courseFilter) {
            courseFilter.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.studentsTable.setFilter("course", "=", e.target.value);
                } else {
                    this.studentsTable.removeFilter("course", "=");
                }
            });
        }

        if (yearFilter) {
            yearFilter.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.studentsTable.setFilter("year", "=", e.target.value);
                } else {
                    this.studentsTable.removeFilter("year", "=");
                }
            });
        }

        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.studentsTable.clearFilter();
                if (searchInput) searchInput.value = '';
                if (courseFilter) courseFilter.value = '';
                if (yearFilter) yearFilter.value = '';
            });
        }
    }

    renderStudentsTable(students) {
        // Initialize table if not already done
        if (!this.studentsTable) {
            this.initializeStudentsTable();
        }

        // Populate course filter dropdown
        const courseFilter = document.getElementById('courseFilter');
        if (courseFilter) {
            const courses = [...new Set(students.map(s => s.course).filter(Boolean))];
            courseFilter.innerHTML = '<option value="">All Courses</option>' +
                courses.map(course => `<option value="${course}">${course}</option>`).join('');
        }

        // Set table data
        this.studentsTable.setData(students);
    }

    async saveStudent() {
        try {
            const form = document.getElementById('studentForm');
            const formData = new FormData(form);
            const studentId = formData.get('studentId');

            const studentData = {
                rollNo: formData.get('rollNo'),
                enrollmentNo: formData.get('enrollmentNo'),
                name: formData.get('name'),
                fatherName: formData.get('fatherName') || '',
                motherName: formData.get('motherName') || '',
                phone: formData.get('phone'),
                email: formData.get('email'),
                course: formData.get('course'),
                branch: formData.get('branch') || '',
                year: formData.get('year'),
                attendance: formData.get('attendance') ? parseInt(formData.get('attendance')) : null,
                feePaid: formData.get('feePaid') ? parseInt(formData.get('feePaid')) : null,
                feeDue: formData.get('feeDue') ? parseInt(formData.get('feeDue')) : null,
                address: formData.get('address') || '',
                updatedAt: new Date().toISOString()
            };

            if (studentId) {
                await this.updateDocument('students', studentId, studentData);
                this.showMessage('Student updated successfully');
            } else {
                studentData.createdAt = new Date().toISOString();
                await this.setDocument('students', studentData.rollNo, studentData);
                this.showMessage('Student added successfully');
            }

            form.reset();
            document.getElementById('studentId').value = '';
            await this.loadStudents();
        } catch (error) {
            console.error('Error saving student:', error);
            this.showMessage('Error saving student', 'error');
        }
    }

    async editStudent(studentId) {
        try {
            const doc = await this.getDocument('students', studentId);
            if (doc.exists()) {
                const student = doc.data();

                document.getElementById('studentId').value = studentId;
                document.getElementById('rollNo').value = student.rollNo || '';
                document.getElementById('enrollmentNo').value = student.enrollmentNo || '';
                document.getElementById('studentName').value = student.name || '';
                document.getElementById('fatherName').value = student.fatherName || '';
                document.getElementById('motherName').value = student.motherName || '';
                document.getElementById('studentPhone').value = student.phone || '';
                document.getElementById('studentEmail').value = student.email || '';
                document.getElementById('studentCourse').value = student.course || '';
                document.getElementById('studentBranch').value = student.branch || '';
                document.getElementById('studentYear').value = student.year || '';
                document.getElementById('attendance').value = student.attendance || '';
                document.getElementById('feePaid').value = student.feePaid || '';
                document.getElementById('feeDue').value = student.feeDue || '';
                document.getElementById('studentAddress').value = student.address || '';

                document.getElementById('studentForm').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error loading student for edit:', error);
            this.showMessage('Error loading student', 'error');
        }
    }

    async deleteStudent(studentId) {
        const result = await Swal.fire({
            title: 'Delete Student?',
            text: 'Are you sure you want to delete this student? This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            background: '#fff',
            color: '#333',
            customClass: {
                popup: 'swal-popup',
                title: 'swal-title',
                content: 'swal-content'
            }
        });

        if (result.isConfirmed) {
            try {
                await this.deleteDocument('students', studentId);
                this.showMessage('Student deleted successfully');
                await this.loadStudents();

                Swal.fire({
                    title: 'Deleted!',
                    text: 'Student has been deleted successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#fff',
                    color: '#333'
                });
            } catch (error) {
                console.error('Error deleting student:', error);
                this.showMessage('Error deleting student', 'error');

                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete student. Please try again.',
                    icon: 'error',
                    background: '#fff',
                    color: '#333'
                });
            }
        }
    }

    // ===== DASHBOARD FUNCTIONALITY =====

    async loadDashboardData() {
        if (!this.firebaseService || !this.firebaseService.isReady()) {
            throw new Error('Firebase service not ready');
        }

        try {
            console.log('Loading dashboard data from Firebase...');

            // Check authentication first
            const currentUser = this.firebaseService.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            console.log('User authenticated:', currentUser.email);

            // Load statistics with individual error handling
            const stats = await this.loadCollectionStats();

            // Update stat cards
            document.getElementById('totalCourses').textContent = stats.courses;
            document.getElementById('totalStudents').textContent = stats.students;
            document.getElementById('totalFaculty').textContent = stats.faculty;
            document.getElementById('totalNotices').textContent = stats.notices;

            // Calculate real changes from Firebase data
            await this.calculateStatChanges();

            console.log('Dashboard data loaded successfully');
        } catch (error) {
            console.error('Error in loadDashboardData:', error);
            throw error;
        }
    }

    async loadCollectionStats() {
        const collections = ['courses', 'students', 'faculty', 'notices'];
        const stats = {};

        for (const collectionName of collections) {
            try {
                console.log(`Loading ${collectionName} collection...`);
                const snapshot = await this.firebaseService.firestore.getDocs(
                    this.firebaseService.firestore.collection(this.firebaseService.db, collectionName)
                );
                stats[collectionName] = snapshot.size;
                console.log(`${collectionName}: ${snapshot.size} documents`);
            } catch (error) {
                console.warn(`Error loading ${collectionName}:`, error);
                stats[collectionName] = 0;

                // Try to create the collection if it doesn't exist
                await this.initializeCollection(collectionName);
            }
        }

        return stats;
    }

    async initializeCollection(collectionName) {
        try {
            console.log(`Initializing ${collectionName} collection...`);

            // Create a sample document to initialize the collection
            const sampleData = this.getSampleData(collectionName);

            await this.firebaseService.firestore.addDoc(
                this.firebaseService.firestore.collection(this.firebaseService.db, collectionName),
                sampleData
            );

            console.log(`${collectionName} collection initialized with sample data`);
        } catch (error) {
            console.warn(`Could not initialize ${collectionName} collection:`, error);
        }
    }

    getSampleData(collectionName) {
        const timestamp = new Date().toISOString();

        switch (collectionName) {
            case 'courses':
                return {
                    courseName: 'Sample Course',
                    department: 'Computer Science',
                    duration: '3 years',
                    totalSeats: 60,
                    feeStructure: '₹25,000',
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    isActive: true
                };
            case 'students':
                return {
                    name: 'Sample Student',
                    email: 'sample@example.com',
                    course: 'BCA',
                    year: '1',
                    rollNumber: '001',
                    createdAt: timestamp,
                    updatedAt: timestamp
                };
            case 'faculty':
                return {
                    name: 'Sample Faculty',
                    email: 'faculty@example.com',
                    department: 'Computer Science',
                    designation: 'Professor',
                    createdAt: timestamp,
                    updatedAt: timestamp
                };
            case 'notices':
                return {
                    title: 'Welcome Notice',
                    content: 'Welcome to the admin panel!',
                    priority: 'medium',
                    isActive: true,
                    createdAt: timestamp,
                    updatedAt: timestamp
                };
            default:
                return {
                    name: 'Sample Data',
                    createdAt: timestamp,
                    updatedAt: timestamp
                };
        }
    }





    async calculateStatChanges() {
        try {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const oneMonthAgoISO = oneMonthAgo.toISOString();

            const collections = ['courses', 'students', 'faculty', 'notices'];

            for (const collectionName of collections) {
                try {
                    console.log(`Calculating changes for ${collectionName}...`);

                    const snapshot = await this.firebaseService.firestore.getDocs(
                        this.firebaseService.firestore.query(
                            this.firebaseService.firestore.collection(this.firebaseService.db, collectionName),
                            this.firebaseService.firestore.where('createdAt', '>=', oneMonthAgoISO)
                        )
                    );

                    const changeCount = snapshot.size;
                    const changeText = changeCount > 0 ? `+${changeCount} this month` : 'No changes this month';

                    const elementId = `${collectionName}Change`;
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.textContent = changeText;
                    } else {
                        console.warn(`Element ${elementId} not found in DOM`);
                    }
                } catch (error) {
                    console.warn(`Error calculating changes for ${collectionName}:`, error);
                    const elementId = `${collectionName}Change`;
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.textContent = 'Unable to calculate';
                    }
                }
            }
        } catch (error) {
            console.error('Error calculating stat changes:', error);
        }
    }

    async loadSystemInfo() {
        try {
            if (!this.firebaseService || !this.firebaseService.isReady()) {
                throw new Error('Firebase service not ready');
            }

            // Calculate total records
            const collections = ['courses', 'students', 'faculty', 'notices', 'materials', 'fees'];
            let totalRecords = 0;

            for (const collection of collections) {
                try {
                    const snapshot = await this.firebaseService.firestore.getDocs(
                        this.firebaseService.firestore.collection(this.firebaseService.db, collection)
                    );
                    totalRecords += snapshot.size;
                } catch (error) {
                    console.warn(`Error loading ${collection} collection:`, error);
                }
            }

            document.getElementById('totalRecords').textContent = totalRecords;

            // Estimate database size calculation
            const dbSize = (totalRecords * 2.5).toFixed(1); // Rough estimate
            document.getElementById('databaseSize').textContent = `${dbSize} KB`;

        } catch (error) {
            console.error('Error loading system info:', error);
            document.getElementById('databaseSize').textContent = 'Error';
            document.getElementById('totalRecords').textContent = '0';
        }
    }

    // ===== CSV IMPORT/EXPORT FUNCTIONALITY =====

    showImportModal() {
        document.getElementById('csvImportModal').style.display = 'flex';
        this.resetImportModal();
    }

    hideImportModal() {
        document.getElementById('csvImportModal').style.display = 'none';
    }

    resetImportModal() {
        // Reset to step 1
        document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
        document.getElementById('step1').classList.add('active');

        // Reset form
        document.getElementById('importDataType').value = '';
        document.getElementById('csvFileInput').value = '';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('previewContainer').innerHTML = '';
        document.getElementById('importProgress').style.display = 'none';

        // Reset buttons
        document.getElementById('nextStep').disabled = true;
        document.getElementById('nextStep').style.display = 'inline-block';
        document.getElementById('startImport').style.display = 'none';
    }

    async exportAllData() {
        try {
            this.showMessage('Preparing export...', 'info');

            const collections = ['courses', 'students', 'faculty', 'notices', 'materials', 'fees'];
            const exportData = {};

            for (const collectionName of collections) {
                const snapshot = await this.getCollection(collectionName);
                exportData[collectionName] = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Remove Firestore timestamps for CSV export
                    Object.keys(data).forEach(key => {
                        if (data[key] && typeof data[key].toDate === 'function') {
                            data[key] = data[key].toDate().toISOString();
                        }
                    });
                    exportData[collectionName].push({ id: doc.id, ...data });
                });
            }

            // Create and download ZIP file with all CSV files
            this.downloadCSVFiles(exportData);
            this.showMessage('Data exported successfully!', 'success');

        } catch (error) {
            console.error('Error exporting data:', error);
            this.showMessage('Error exporting data: ' + error.message, 'error');
        }
    }

    downloadCSVFiles(data) {
        Object.keys(data).forEach(collectionName => {
            if (data[collectionName].length > 0) {
                const csv = this.convertToCSV(data[collectionName]);
                this.downloadCSV(csv, `${collectionName}.csv`);
            }
        });
    }

    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            )
        ].join('\n');

        return csvContent;
    }

    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    async createBackup() {
        try {
            this.showMessage('Creating backup...', 'info');

            const collections = ['courses', 'students', 'faculty', 'notices', 'materials', 'fees'];
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '2.0',
                data: {}
            };

            for (const collectionName of collections) {
                const snapshot = await this.getCollection(collectionName);
                backupData.data[collectionName] = [];

                snapshot.forEach(doc => {
                    backupData.data[collectionName].push({
                        id: doc.id,
                        data: doc.data()
                    });
                });
            }

            // Download backup as JSON
            const backupJson = JSON.stringify(backupData, null, 2);
            const blob = new Blob([backupJson], { type: 'application/json' });
            const link = document.createElement('a');

            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `bitbot-backup-${new Date().toISOString().split('T')[0]}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showMessage('Backup created successfully!', 'success');

        } catch (error) {
            console.error('Error creating backup:', error);
            this.showMessage('Error creating backup: ' + error.message, 'error');
        }
    }

    // ===== THEME FUNCTIONALITY =====

    applyTheme() {
        if (this.darkTheme) {
            document.body.classList.add('dark-theme');
            document.getElementById('themeToggle').textContent = '☀️';
            document.getElementById('themeSwitch')?.classList.add('active');
        } else {
            document.body.classList.remove('dark-theme');
            document.getElementById('themeToggle').textContent = '🌙';
            document.getElementById('themeSwitch')?.classList.remove('active');
        }
    }

    toggleTheme() {
        this.darkTheme = !this.darkTheme;
        localStorage.setItem('darkTheme', this.darkTheme.toString());
        this.applyTheme();
        this.showMessage(`Switched to ${this.darkTheme ? 'dark' : 'light'} theme`, 'success');
    }







    setAutoSaveInterval(interval) {
        this.autoSaveInterval = interval;
        localStorage.setItem('autoSaveInterval', interval.toString());

        if (this.autoSaveEnabled) {
            this.stopAutoSave();
            this.startAutoSave();
        }

        this.showMessage(`Auto-save interval set to ${interval / 1000} seconds`, 'success');
    }

    setSessionTimeout(timeout) {
        this.sessionTimeout = timeout;
        localStorage.setItem('sessionTimeout', timeout.toString());
        this.showMessage(`Session timeout set to ${timeout / 60000} minutes`, 'success');
    }





















    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            this.performAutoSave();
        }, this.autoSaveInterval);
    }

    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    performAutoSave() {
        // Auto-save current form data to localStorage
        const activeForms = document.querySelectorAll('.admin-section.active form');
        activeForms.forEach(form => {
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            localStorage.setItem(`autosave_${form.id}`, JSON.stringify(data));
        });
    }

    restoreAutoSavedData(formId) {
        const savedData = localStorage.getItem(`autosave_${formId}`);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                const form = document.getElementById(formId);
                if (form) {
                    Object.keys(data).forEach(key => {
                        const field = form.querySelector(`[name="${key}"]`);
                        if (field && data[key]) {
                            field.value = data[key];
                        }
                    });
                }
            } catch (error) {
                console.error('Error restoring auto-saved data:', error);
            }
        }
    }

    // ===== ACTIVITY MONITORING =====

    startActivityMonitoring() {
        // Track user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
            }, true);
        });

        // Check for inactivity
        this.activityTimer = setInterval(() => {
            const inactiveTime = Date.now() - this.lastActivity;
            if (inactiveTime > this.sessionTimeout) {
                this.handleSessionTimeout();
            }
        }, 60000); // Check every minute
    }

    async handleSessionTimeout() {
        await Swal.fire({
            title: '⏰ Session Expired',
            text: 'Your session has expired due to inactivity. You will be logged out for security.',
            icon: 'warning',
            confirmButtonColor: '#000',
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            allowEscapeKey: false,
            background: '#fff',
            color: '#333'
        });
        this.logout();
    }

    // ===== PASSWORD CHANGE FUNCTIONALITY =====

    showPasswordModal() {
        document.getElementById('passwordModal').style.display = 'flex';
        document.getElementById('currentPassword').focus();
    }

    hidePasswordModal() {
        document.getElementById('passwordModal').style.display = 'none';
        document.getElementById('passwordChangeForm').reset();
        document.getElementById('passwordStrength').style.display = 'none';
    }

    checkPasswordStrength(password) {
        const strengthIndicator = document.getElementById('passwordStrength');
        let strength = 0;
        let message = '';

        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        if (password.length === 0) {
            strengthIndicator.style.display = 'none';
            return;
        }

        if (strength < 3) {
            strengthIndicator.className = 'password-strength weak';
            message = 'Weak password. Add uppercase, lowercase, numbers, and symbols.';
        } else if (strength < 5) {
            strengthIndicator.className = 'password-strength medium';
            message = 'Medium strength. Consider adding more character types.';
        } else {
            strengthIndicator.className = 'password-strength strong';
            message = 'Strong password!';
        }

        strengthIndicator.textContent = message;
        strengthIndicator.style.display = 'block';
    }

    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showMessage('Please fill in all password fields', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showMessage('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        try {
            const user = firebase.auth().currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);

            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);

            this.hidePasswordModal();
            this.showMessage('Password changed successfully', 'success');
        } catch (error) {
            console.error('Error changing password:', error);
            this.showMessage('Error changing password: ' + error.message, 'error');
        }
    }

    // ===== SIDEBAR MANAGEMENT =====
    initializeSidebar() {
        this.isMobile = window.innerWidth <= 1024;

        // Sidebar starts closed by default
        // Users must manually click the menu button to open it
        this.closeSidebar();
    }

    toggleSidebar() {
        if (this.sidebarOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const mainContent = document.getElementById('mainContent');

        if (sidebar) {
            sidebar.classList.add('open');
            this.sidebarOpen = true;

            if (this.isMobile) {
                sidebarOverlay?.classList.add('show');
                document.body.style.overflow = 'hidden';
            } else {
                mainContent?.classList.add('sidebar-open');
            }
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const mainContent = document.getElementById('mainContent');

        if (sidebar) {
            sidebar.classList.remove('open');
            this.sidebarOpen = false;

            if (this.isMobile) {
                sidebarOverlay?.classList.remove('show');
                document.body.style.overflow = '';
            } else {
                mainContent?.classList.remove('sidebar-open');
            }
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 1024;

        if (wasMobile !== this.isMobile) {
            if (this.isMobile) {
                this.closeSidebar();
            }
            // Removed auto-opening of sidebar on desktop
            // Users must manually click the menu button to open sidebar
        }
    }

    // ===== PAGE TITLE MANAGEMENT =====
    updatePageTitle(pageName) {
        const pageTitles = {
            'dashboard': 'Dashboard Overview',
            'courses': 'Course Management',
            'syllabus': 'Syllabus & Materials',
            'notices': 'Notice Management',
            'fee-structure': 'Fee Structure Management',
            'faculty': 'Faculty Information',
            'college-info': 'College Information',
            'students': 'Student Data Management',
            'settings': 'Settings & Configuration'
        };

        const title = pageTitles[pageName] || 'Admin Panel';
        document.title = `${title} - BitBot Admin`;
    }

    // ===== KEYBOARD SHORTCUTS =====
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K to toggle sidebar
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.toggleSidebar();
        }

        // Ctrl/Cmd + D to toggle dark mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            this.toggleTheme();
        }

        // Escape to close sidebar on mobile
        if (e.key === 'Escape' && this.isMobile && this.sidebarOpen) {
            this.closeSidebar();
          }
    }

    // ===== ANIMATIONS =====
    addAnimations() {
        // Add stagger animation to stat cards
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });

        // Add hover effects to action cards
        const actionCards = document.querySelectorAll('.action-card');
        actionCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px) scale(1.02)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    async logout() {
        try {
            // Clear auto-saved data
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('autosave_')) {
                    localStorage.removeItem(key);
                }
            });

            // Stop timers
            this.stopAutoSave();
            if (this.activityTimer) {
                clearInterval(this.activityTimer);
            }

            // Close sidebar
            this.closeSidebar();

            // Redirect to home
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error logging out:', error);
            this.showMessage('Error logging out', 'error');
        }
    }

    // ===== SETTINGS FUNCTIONALITY =====

    toggleAutoSave(enabled) {
        this.autoSaveEnabled = enabled;
        localStorage.setItem('autoSaveEnabled', enabled.toString());

        if (enabled) {
            this.startAutoSave();
            this.showMessage('Auto-save enabled', 'success');
        } else {
            this.stopAutoSave();
            this.showMessage('Auto-save disabled', 'success');
        }
    }

    setAutoSaveInterval(seconds) {
        this.autoSaveInterval = seconds * 1000; // Convert to milliseconds
        localStorage.setItem('autoSaveInterval', this.autoSaveInterval.toString());

        // Restart auto-save with new interval if it's enabled
        if (this.autoSaveEnabled) {
            this.stopAutoSave();
            this.startAutoSave();
        }

        this.showMessage(`Auto-save interval set to ${seconds} seconds`, 'success');
    }

    setThemeMode(mode) {
        this.themeMode = mode;
        localStorage.setItem('themeMode', mode);

        if (mode === 'dark') {
            this.darkTheme = true;
        } else if (mode === 'light') {
            this.darkTheme = false;
        } else { // auto
            this.darkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        this.applyTheme();
        this.showMessage(`Theme mode set to ${mode}`, 'success');
    }

    changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showMessage('Please fill in all password fields', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showMessage('New passwords do not match', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showMessage('New password must be at least 6 characters long', 'error');
            return;
        }

        // Simulate password change (in real app, this would call an API)
        setTimeout(() => {
            this.showMessage('Password changed successfully', 'success');
            document.getElementById('changePasswordForm').reset();
        }, 1000);
    }

    togglePasswordVisibility(button) {
        const targetId = button.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const icon = button.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    // Initialize settings from localStorage
    initializeSettings() {
        // Load auto-save settings
        const autoSaveEnabled = localStorage.getItem('autoSaveEnabled');
        if (autoSaveEnabled !== null) {
            this.autoSaveEnabled = autoSaveEnabled === 'true';
        }

        const autoSaveInterval = localStorage.getItem('autoSaveInterval');
        if (autoSaveInterval) {
            this.autoSaveInterval = parseInt(autoSaveInterval);
        }

        // Load theme mode
        const themeMode = localStorage.getItem('themeMode');
        if (themeMode) {
            this.themeMode = themeMode;
        }

        // Update UI elements
        this.updateSettingsUI();
    }

    updateSettingsUI() {
        // Update auto-save toggle
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        if (autoSaveToggle) {
            autoSaveToggle.checked = this.autoSaveEnabled;
        }

        // Update auto-save interval
        const autoSaveInterval = document.getElementById('autoSaveInterval');
        if (autoSaveInterval) {
            autoSaveInterval.value = (this.autoSaveInterval / 1000).toString();
        }

        // Update theme mode
        const themeMode = document.getElementById('themeMode');
        if (themeMode) {
            themeMode.value = this.themeMode;
        }
    }

    // Static methods for singleton management
    static getInstance() {
        return AdminPanel.instance;
    }

    static clearInstance() {
        if (AdminPanel.instance) {
            AdminPanel.instance.removeEventListeners();
            AdminPanel.instance = null;
        }
    }
}
