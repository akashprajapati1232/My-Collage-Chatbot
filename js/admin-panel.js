// ===== MODERN ADMIN PANEL JAVASCRIPT =====

class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.db = null;
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
        this.init();
    }

    async init() {
        try {
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

            // Show initial section
            await this.showSection('dashboard');

            // Load dashboard data
            await this.loadDashboardData();

            // Add smooth animations
            this.addAnimations();

            console.log('Modern admin panel initialized successfully');
        } catch (error) {
            console.error('Error initializing admin panel:', error);
            this.showMessage('Error initializing admin panel', 'error');
        }
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Sidebar overlay
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // Menu buttons
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.closest('.menu-btn').dataset.section;
                this.showSection(section);
                if (this.isMobile) {
                    this.closeSidebar();
                }
            });
        });

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // User menu toggle
        const userMenuToggle = document.getElementById('userMenuToggle');
        const userDropdown = document.getElementById('userDropdown');
        if (userMenuToggle && userDropdown) {
            userMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Form submissions
        this.setupFormListeners();

        // Reset buttons
        this.setupResetButtons();

        // Add buttons
        this.setupAddButtons();

        // Settings event listeners
        this.setupSettingsListeners();

        // Dashboard event listeners
        this.setupDashboardListeners();

        // CSV Import/Export listeners
        this.setupImportExportListeners();

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
        // Theme switch
        document.getElementById('themeSwitch')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Auto-save toggle
        document.getElementById('autoSaveToggle')?.addEventListener('click', (e) => {
            this.toggleAutoSave(e.target);
        });

        // Auto-save interval
        document.getElementById('autoSaveInterval')?.addEventListener('change', (e) => {
            this.setAutoSaveInterval(parseInt(e.target.value) * 1000);
        });

        // Session timeout
        document.getElementById('sessionTimeout')?.addEventListener('change', (e) => {
            this.setSessionTimeout(parseInt(e.target.value) * 60000);
        });

        // Password change
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
            this.showPasswordModal();
        });

        // Password modal events
        document.getElementById('closePasswordModal')?.addEventListener('click', () => {
            this.hidePasswordModal();
        });

        document.getElementById('cancelPasswordChange')?.addEventListener('click', () => {
            this.hidePasswordModal();
        });

        document.getElementById('savePasswordChange')?.addEventListener('click', () => {
            this.changePassword();
        });

        // Password strength checker
        document.getElementById('newPassword')?.addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
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
        // Course form
        document.getElementById('courseForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCourse();
        });

        // Timetable form
        document.getElementById('timetableForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTimetable();
        });

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

        document.getElementById('resetTimetableForm')?.addEventListener('click', () => {
            document.getElementById('timetableForm').reset();
            document.getElementById('timetableId').value = '';
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
        document.getElementById('addCourseBtn')?.addEventListener('click', () => {
            document.getElementById('courseForm').reset();
            document.getElementById('courseId').value = '';
        });

        document.getElementById('addTimetableBtn')?.addEventListener('click', () => {
            document.getElementById('timetableForm').reset();
            document.getElementById('timetableId').value = '';
        });

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

    async showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');

        this.currentSection = sectionName;

        // Load section-specific data
        await this.loadSectionData(sectionName);

        // Restore auto-saved data for forms
        if (sectionName !== 'dashboard' && sectionName !== 'settings') {
            setTimeout(() => {
                this.restoreAutoSavedData(`${sectionName}Form`);
            }, 100);
        }
    }

    async loadSectionData(sectionName) {
        this.showLoading(true);
        
        try {
            switch (sectionName) {
                case 'dashboard':
                    await this.loadDashboardData();
                    break;
                case 'courses':
                    await this.loadCourses();
                    break;
                case 'timetables':
                    await this.loadTimetables();
                    await this.populateCourseDropdowns();
                    break;
                case 'materials':
                    await this.loadMaterials();
                    await this.populateCourseDropdowns();
                    break;
                case 'notices':
                    await this.loadNotices();
                    await this.populateCourseDropdowns();
                    break;
                case 'fees':
                    await this.loadFees();
                    await this.populateCourseDropdowns();
                    break;
                case 'faculty':
                    await this.loadFaculty();
                    break;
                case 'college':
                    await this.loadCollegeInfo();
                    break;
                case 'students':
                    await this.loadStudents();
                    await this.populateCourseDropdowns();
                    break;
                case 'settings':
                    await this.loadSystemInfo();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${sectionName} data:`, error);
            this.showMessage(`Error loading ${sectionName} data`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadCourses() {
        try {
            const snapshot = await this.db.collection('courses').get();
            this.courses = [];
            
            snapshot.forEach(doc => {
                this.courses.push({ id: doc.id, ...doc.data() });
            });

            this.renderCourses();
        } catch (error) {
            console.error('Error loading courses:', error);
            throw error;
        }
    }

    renderCourses() {
        const container = document.getElementById('coursesList');
        if (!container) return;

        if (this.courses.length === 0) {
            container.innerHTML = '<div class="data-item"><p>No courses found. Add your first course above.</p></div>';
            return;
        }

        container.innerHTML = this.courses.map(course => `
            <div class="data-item">
                <div class="data-info">
                    <h3>${course.courseName}</h3>
                    <p><strong>Department:</strong> ${course.department}</p>
                    <p><strong>Duration:</strong> ${course.duration}</p>
                    <p><strong>Total Seats:</strong> ${course.totalSeats}</p>
                    <p><strong>HOD:</strong> ${course.hodName}</p>
                    ${course.counsellor ? `<p><strong>Counsellor:</strong> ${course.counsellor}</p>` : ''}
                </div>
                <div class="data-actions">
                    <button class="btn btn-secondary" onclick="adminPanel.editCourse('${course.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteCourse('${course.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async populateCourseDropdowns() {
        const dropdowns = [
            'timetableCourse',
            'materialCourse', 
            'feeCourse',
            'studentCourse',
            'noticeCourses'
        ];

        dropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                // Clear existing options except the first one
                const firstOption = dropdown.querySelector('option[value=""]');
                dropdown.innerHTML = '';
                if (firstOption) {
                    dropdown.appendChild(firstOption);
                }

                // Add course options
                this.courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.courseName;
                    option.textContent = course.courseName;
                    dropdown.appendChild(option);
                });
            }
        });
    }

    showLoading(show) {
        const indicator = document.getElementById('loadingIndicator');
        if (indicator) {
            indicator.style.display = show ? 'flex' : 'none';
        }
    }

    showMessage(message, type = 'success') {
        const container = document.getElementById('messageContainer');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.innerHTML = `
            <span>${message}</span>
        `;

        container.appendChild(messageEl);

        // Auto remove after 5 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    // ===== COURSE OPERATIONS =====

    async saveCourse() {
        try {
            const form = document.getElementById('courseForm');
            const formData = new FormData(form);
            const courseId = formData.get('courseId');

            const courseData = {
                courseName: formData.get('courseName'),
                duration: formData.get('duration'),
                department: formData.get('department'),
                totalSeats: parseInt(formData.get('totalSeats')),
                hodName: formData.get('hodName'),
                counsellor: formData.get('counsellor') || '',
                scholarshipOpportunities: formData.get('scholarshipOpportunities') || '',
                feeStructure: formData.get('feeStructure') || '',
                admissionEligibility: formData.get('admissionEligibility') || '',
                courseAffiliation: formData.get('courseAffiliation') || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (courseId) {
                // Update existing course
                await this.db.collection('courses').doc(courseId).update(courseData);
                this.showMessage('Course updated successfully');
            } else {
                // Add new course
                courseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await this.db.collection('courses').add(courseData);
                this.showMessage('Course added successfully');
            }

            form.reset();
            document.getElementById('courseId').value = '';
            await this.loadCourses();
        } catch (error) {
            console.error('Error saving course:', error);
            this.showMessage('Error saving course', 'error');
        }
    }

    async editCourse(courseId) {
        try {
            const doc = await this.db.collection('courses').doc(courseId).get();
            if (doc.exists) {
                const course = doc.data();

                // Populate form
                document.getElementById('courseId').value = courseId;
                document.getElementById('courseName').value = course.courseName || '';
                document.getElementById('duration').value = course.duration || '';
                document.getElementById('department').value = course.department || '';
                document.getElementById('totalSeats').value = course.totalSeats || '';
                document.getElementById('hodName').value = course.hodName || '';
                document.getElementById('counsellor').value = course.counsellor || '';
                document.getElementById('scholarshipOpportunities').value = course.scholarshipOpportunities || '';
                document.getElementById('feeStructure').value = course.feeStructure || '';
                document.getElementById('admissionEligibility').value = course.admissionEligibility || '';
                document.getElementById('courseAffiliation').value = course.courseAffiliation || '';

                // Scroll to form
                document.getElementById('courseForm').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error loading course for edit:', error);
            this.showMessage('Error loading course', 'error');
        }
    }

    async deleteCourse(courseId) {
        if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            try {
                await this.db.collection('courses').doc(courseId).delete();
                this.showMessage('Course deleted successfully');
                await this.loadCourses();
            } catch (error) {
                console.error('Error deleting course:', error);
                this.showMessage('Error deleting course', 'error');
            }
        }
    }

    // ===== TIMETABLE OPERATIONS =====

    async loadTimetables() {
        try {
            const snapshot = await this.db.collection('timetables').get();
            const timetables = [];

            snapshot.forEach(doc => {
                timetables.push({ id: doc.id, ...doc.data() });
            });

            this.renderTimetables(timetables);
        } catch (error) {
            console.error('Error loading timetables:', error);
            throw error;
        }
    }

    renderTimetables(timetables) {
        const container = document.getElementById('timetablesList');
        if (!container) return;

        if (timetables.length === 0) {
            container.innerHTML = '<div class="data-item"><p>No timetables found. Add your first timetable above.</p></div>';
            return;
        }

        container.innerHTML = timetables.map(timetable => `
            <div class="data-item">
                <div class="data-info">
                    <h3>${timetable.course} - ${timetable.yearSemester}</h3>
                    <p><strong>Faculty:</strong> ${timetable.facultyName}</p>
                    ${timetable.pdfImageLink ? `<p><strong>PDF/Image:</strong> <a href="${timetable.pdfImageLink}" target="_blank">View</a></p>` : ''}
                </div>
                <div class="data-actions">
                    <button class="btn btn-secondary" onclick="adminPanel.editTimetable('${timetable.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteTimetable('${timetable.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async saveTimetable() {
        try {
            const form = document.getElementById('timetableForm');
            const formData = new FormData(form);
            const timetableId = formData.get('timetableId');

            const timetableData = {
                course: formData.get('course'),
                yearSemester: formData.get('yearSemester'),
                facultyName: formData.get('facultyName'),
                pdfImageLink: formData.get('pdfImageLink') || '',
                schedule: {
                    monday: formData.get('monday') || '',
                    tuesday: formData.get('tuesday') || '',
                    wednesday: formData.get('wednesday') || '',
                    thursday: formData.get('thursday') || '',
                    friday: formData.get('friday') || '',
                    saturday: formData.get('saturday') || ''
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (timetableId) {
                await this.db.collection('timetables').doc(timetableId).update(timetableData);
                this.showMessage('Timetable updated successfully');
            } else {
                timetableData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await this.db.collection('timetables').add(timetableData);
                this.showMessage('Timetable added successfully');
            }

            form.reset();
            document.getElementById('timetableId').value = '';
            await this.loadTimetables();
        } catch (error) {
            console.error('Error saving timetable:', error);
            this.showMessage('Error saving timetable', 'error');
        }
    }

    async editTimetable(timetableId) {
        try {
            const doc = await this.db.collection('timetables').doc(timetableId).get();
            if (doc.exists) {
                const timetable = doc.data();

                document.getElementById('timetableId').value = timetableId;
                document.getElementById('timetableCourse').value = timetable.course || '';
                document.getElementById('yearSemester').value = timetable.yearSemester || '';
                document.getElementById('facultyName').value = timetable.facultyName || '';
                document.getElementById('pdfImageLink').value = timetable.pdfImageLink || '';

                // Populate schedule
                if (timetable.schedule) {
                    document.querySelector('textarea[name="monday"]').value = timetable.schedule.monday || '';
                    document.querySelector('textarea[name="tuesday"]').value = timetable.schedule.tuesday || '';
                    document.querySelector('textarea[name="wednesday"]').value = timetable.schedule.wednesday || '';
                    document.querySelector('textarea[name="thursday"]').value = timetable.schedule.thursday || '';
                    document.querySelector('textarea[name="friday"]').value = timetable.schedule.friday || '';
                    document.querySelector('textarea[name="saturday"]').value = timetable.schedule.saturday || '';
                }

                document.getElementById('timetableForm').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error loading timetable for edit:', error);
            this.showMessage('Error loading timetable', 'error');
        }
    }

    async deleteTimetable(timetableId) {
        if (confirm('Are you sure you want to delete this timetable?')) {
            try {
                await this.db.collection('timetables').doc(timetableId).delete();
                this.showMessage('Timetable deleted successfully');
                await this.loadTimetables();
            } catch (error) {
                console.error('Error deleting timetable:', error);
                this.showMessage('Error deleting timetable', 'error');
            }
        }
    }

    // ===== MATERIALS OPERATIONS =====

    async loadMaterials() {
        try {
            const snapshot = await this.db.collection('materials').get();
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
        const container = document.getElementById('materialsList');
        if (!container) return;

        if (materials.length === 0) {
            container.innerHTML = '<div class="data-item"><p>No materials found. Add your first material above.</p></div>';
            return;
        }

        container.innerHTML = materials.map(material => `
            <div class="data-item">
                <div class="data-info">
                    <h3>${material.course} - ${material.subjectName}</h3>
                    <p><strong>Semester:</strong> ${material.semester}</p>
                    <p><strong>Type:</strong> ${material.fileType}</p>
                    ${material.fileUrl ? `<p><strong>File:</strong> <a href="${material.fileUrl}" target="_blank">View</a></p>` : ''}
                    ${material.refBooks ? `<p><strong>Reference Books:</strong> ${material.refBooks}</p>` : ''}
                </div>
                <div class="data-actions">
                    <button class="btn btn-secondary" onclick="adminPanel.editMaterial('${material.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteMaterial('${material.id}')">Delete</button>
                </div>
            </div>
        `).join('');
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
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (materialId) {
                await this.db.collection('materials').doc(materialId).update(materialData);
                this.showMessage('Material updated successfully');
            } else {
                materialData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await this.db.collection('materials').add(materialData);
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
            const doc = await this.db.collection('materials').doc(materialId).get();
            if (doc.exists) {
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
        if (confirm('Are you sure you want to delete this material?')) {
            try {
                await this.db.collection('materials').doc(materialId).delete();
                this.showMessage('Material deleted successfully');
                await this.loadMaterials();
            } catch (error) {
                console.error('Error deleting material:', error);
                this.showMessage('Error deleting material', 'error');
            }
        }
    }

    // ===== NOTICES OPERATIONS =====

    async loadNotices() {
        try {
            const snapshot = await this.db.collection('notices').get();
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
        const container = document.getElementById('noticesList');
        if (!container) return;

        if (notices.length === 0) {
            container.innerHTML = '<div class="data-item"><p>No notices found. Add your first notice above.</p></div>';
            return;
        }

        container.innerHTML = notices.map(notice => `
            <div class="data-item">
                <div class="data-info">
                    <h3>${notice.title}</h3>
                    <p><strong>Date:</strong> ${notice.date}</p>
                    <p><strong>Courses:</strong> ${Array.isArray(notice.courses) ? notice.courses.join(', ') : notice.courses}</p>
                    <p>${notice.description}</p>
                    ${notice.attachment ? `<p><strong>Attachment:</strong> <a href="${notice.attachment}" target="_blank">View</a></p>` : ''}
                </div>
                <div class="data-actions">
                    <button class="btn btn-secondary" onclick="adminPanel.editNotice('${notice.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteNotice('${notice.id}')">Delete</button>
                </div>
            </div>
        `).join('');
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
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (noticeId) {
                await this.db.collection('notices').doc(noticeId).update(noticeData);
                this.showMessage('Notice updated successfully');
            } else {
                noticeData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await this.db.collection('notices').add(noticeData);
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
            const doc = await this.db.collection('notices').doc(noticeId).get();
            if (doc.exists) {
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
        if (confirm('Are you sure you want to delete this notice?')) {
            try {
                await this.db.collection('notices').doc(noticeId).delete();
                this.showMessage('Notice deleted successfully');
                await this.loadNotices();
            } catch (error) {
                console.error('Error deleting notice:', error);
                this.showMessage('Error deleting notice', 'error');
            }
        }
    }

    // ===== FEES OPERATIONS =====

    async loadFees() {
        try {
            const snapshot = await this.db.collection('fees').get();
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
        const container = document.getElementById('feesList');
        if (!container) return;

        if (fees.length === 0) {
            container.innerHTML = '<div class="data-item"><p>No fee structures found. Add your first fee structure above.</p></div>';
            return;
        }

        container.innerHTML = fees.map(fee => `
            <div class="data-item">
                <div class="data-info">
                    <h3>${fee.course}</h3>
                    <p><strong>Admission Fee:</strong> ₹${fee.admissionFee}</p>
                    ${fee.hostelFee ? `<p><strong>Hostel Fee:</strong> ₹${fee.hostelFee}</p>` : ''}
                    ${fee.busFee ? `<p><strong>Bus Fee:</strong> ₹${fee.busFee}</p>` : ''}
                    ${fee.feePaymentLink ? `<p><strong>Payment Link:</strong> <a href="${fee.feePaymentLink}" target="_blank">Pay Now</a></p>` : ''}
                </div>
                <div class="data-actions">
                    <button class="btn btn-secondary" onclick="adminPanel.editFee('${fee.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteFee('${fee.id}')">Delete</button>
                </div>
            </div>
        `).join('');
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
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (feeId) {
                await this.db.collection('fees').doc(feeId).update(feeData);
                this.showMessage('Fee structure updated successfully');
            } else {
                feeData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await this.db.collection('fees').add(feeData);
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
            const doc = await this.db.collection('fees').doc(feeId).get();
            if (doc.exists) {
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
        if (confirm('Are you sure you want to delete this fee structure?')) {
            try {
                await this.db.collection('fees').doc(feeId).delete();
                this.showMessage('Fee structure deleted successfully');
                await this.loadFees();
            } catch (error) {
                console.error('Error deleting fee structure:', error);
                this.showMessage('Error deleting fee structure', 'error');
            }
        }
    }

    // ===== FACULTY OPERATIONS =====

    async loadFaculty() {
        try {
            const snapshot = await this.db.collection('faculty').get();
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
        const container = document.getElementById('facultyList');
        if (!container) return;

        if (faculty.length === 0) {
            container.innerHTML = '<div class="data-item"><p>No faculty departments found. Add your first department above.</p></div>';
            return;
        }

        container.innerHTML = faculty.map(dept => `
            <div class="data-item">
                <div class="data-info">
                    <h3>${dept.department}</h3>
                    <p><strong>HOD:</strong> ${dept.hodName}</p>
                    <p><strong>Faculty Count:</strong> ${dept.facultyList ? dept.facultyList.length : 0}</p>
                </div>
                <div class="data-actions">
                    <button class="btn btn-secondary" onclick="adminPanel.editFaculty('${dept.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteFaculty('${dept.id}')">Delete</button>
                </div>
            </div>
        `).join('');
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
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (facultyId) {
                await this.db.collection('faculty').doc(facultyId).update(facultyData);
                this.showMessage('Faculty information updated successfully');
            } else {
                facultyData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await this.db.collection('faculty').add(facultyData);
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
            const doc = await this.db.collection('college').doc('info').get();
            if (doc.exists) {
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
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await this.db.collection('college').doc('info').set(collegeData, { merge: true });
            this.showMessage('College information updated successfully');
        } catch (error) {
            console.error('Error saving college info:', error);
            this.showMessage('Error saving college information', 'error');
        }
    }

    // ===== STUDENTS OPERATIONS =====

    async loadStudents() {
        try {
            const snapshot = await this.db.collection('students').get();
            const students = [];

            snapshot.forEach(doc => {
                students.push({ id: doc.id, ...doc.data() });
            });

            this.renderStudents(students);
        } catch (error) {
            console.error('Error loading students:', error);
            throw error;
        }
    }

    renderStudents(students) {
        const container = document.getElementById('studentsList');
        if (!container) return;

        if (students.length === 0) {
            container.innerHTML = '<div class="data-item"><p>No students found. Add your first student above.</p></div>';
            return;
        }

        container.innerHTML = students.map(student => `
            <div class="data-item">
                <div class="data-info">
                    <h3>${student.name} (${student.rollNo})</h3>
                    <p><strong>Course:</strong> ${student.course} - ${student.year}</p>
                    <p><strong>Email:</strong> ${student.email}</p>
                    <p><strong>Phone:</strong> ${student.phone}</p>
                    ${student.attendance ? `<p><strong>Attendance:</strong> ${student.attendance}%</p>` : ''}
                    ${student.feeDue ? `<p><strong>Fee Due:</strong> ₹${student.feeDue}</p>` : ''}
                </div>
                <div class="data-actions">
                    <button class="btn btn-secondary" onclick="adminPanel.editStudent('${student.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="adminPanel.deleteStudent('${student.id}')">Delete</button>
                </div>
            </div>
        `).join('');
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
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (studentId) {
                await this.db.collection('students').doc(studentId).update(studentData);
                this.showMessage('Student updated successfully');
            } else {
                studentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await this.db.collection('students').doc(studentData.rollNo).set(studentData);
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
            const doc = await this.db.collection('students').doc(studentId).get();
            if (doc.exists) {
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
        if (confirm('Are you sure you want to delete this student?')) {
            try {
                await this.db.collection('students').doc(studentId).delete();
                this.showMessage('Student deleted successfully');
                await this.loadStudents();
            } catch (error) {
                console.error('Error deleting student:', error);
                this.showMessage('Error deleting student', 'error');
            }
        }
    }

    // ===== DASHBOARD FUNCTIONALITY =====

    async loadDashboardData() {
        try {
            // Load statistics
            const [courses, students, faculty, notices] = await Promise.all([
                this.db.collection('courses').get(),
                this.db.collection('students').get(),
                this.db.collection('faculty').get(),
                this.db.collection('notices').get()
            ]);

            // Update stat cards
            document.getElementById('totalCourses').textContent = courses.size;
            document.getElementById('totalStudents').textContent = students.size;
            document.getElementById('totalFaculty').textContent = faculty.size;
            document.getElementById('totalNotices').textContent = notices.size;

            // Calculate changes (mock data for now)
            document.getElementById('coursesChange').textContent = `+${Math.floor(Math.random() * 5)} this month`;
            document.getElementById('studentsChange').textContent = `+${Math.floor(Math.random() * 20)} this month`;
            document.getElementById('facultyChange').textContent = `+${Math.floor(Math.random() * 3)} this month`;
            document.getElementById('noticesChange').textContent = `+${Math.floor(Math.random() * 10)} this month`;

            // Update recent activity
            this.updateRecentActivity();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showMessage('Error loading dashboard data', 'error');
        }
    }

    updateRecentActivity() {
        const activities = [
            { icon: '📚', text: 'New course added', time: '2 hours ago' },
            { icon: '👥', text: 'Student record updated', time: '4 hours ago' },
            { icon: '📢', text: 'Notice published', time: '1 day ago' },
            { icon: '👨‍🏫', text: 'Faculty information updated', time: '2 days ago' }
        ];

        const container = document.getElementById('recentActivity');
        if (container) {
            container.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <span class="activity-icon">${activity.icon}</span>
                    <div class="activity-content">
                        <p>${activity.text}</p>
                        <small>${activity.time}</small>
                    </div>
                </div>
            `).join('');
        }
    }

    async loadSystemInfo() {
        try {
            // Calculate total records
            const collections = ['courses', 'students', 'faculty', 'notices', 'materials', 'timetables', 'fees'];
            let totalRecords = 0;

            for (const collection of collections) {
                const snapshot = await this.db.collection(collection).get();
                totalRecords += snapshot.size;
            }

            document.getElementById('totalRecords').textContent = totalRecords;

            // Mock database size calculation
            const dbSize = (totalRecords * 2.5).toFixed(1); // Rough estimate
            document.getElementById('databaseSize').textContent = `${dbSize} KB`;

        } catch (error) {
            console.error('Error loading system info:', error);
            document.getElementById('databaseSize').textContent = 'Error';
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

            const collections = ['courses', 'students', 'faculty', 'notices', 'materials', 'timetables', 'fees'];
            const exportData = {};

            for (const collectionName of collections) {
                const snapshot = await this.db.collection(collectionName).get();
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

            const collections = ['courses', 'students', 'faculty', 'notices', 'materials', 'timetables', 'fees'];
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '2.0',
                data: {}
            };

            for (const collectionName of collections) {
                const snapshot = await this.db.collection(collectionName).get();
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

    // ===== SETTINGS FUNCTIONALITY =====

    initializeSettings() {
        // Set auto-save status
        const autoSaveStatus = document.getElementById('autoSaveStatus');
        if (autoSaveStatus) {
            autoSaveStatus.className = `status-indicator ${this.autoSaveEnabled ? 'online' : 'offline'}`;
        }

        // Set last login time
        const lastLoginTime = document.getElementById('lastLoginTime');
        if (lastLoginTime) {
            const lastLogin = localStorage.getItem('lastLogin') || 'Never';
            lastLoginTime.textContent = lastLogin;
        }

        // Save current login time
        localStorage.setItem('lastLogin', new Date().toLocaleString());

        // Load saved settings
        const savedInterval = localStorage.getItem('autoSaveInterval');
        if (savedInterval) {
            this.autoSaveInterval = parseInt(savedInterval);
            document.getElementById('autoSaveInterval').value = this.autoSaveInterval / 1000;
        }

        const savedTimeout = localStorage.getItem('sessionTimeout');
        if (savedTimeout) {
            this.sessionTimeout = parseInt(savedTimeout);
            document.getElementById('sessionTimeout').value = this.sessionTimeout / 60000;
        }
    }

    toggleAutoSave(toggle) {
        this.autoSaveEnabled = !this.autoSaveEnabled;

        if (this.autoSaveEnabled) {
            toggle.classList.add('active');
            this.startAutoSave();
            this.showMessage('Auto-save enabled', 'success');
        } else {
            toggle.classList.remove('active');
            this.stopAutoSave();
            this.showMessage('Auto-save disabled', 'success');
        }

        // Update status indicator
        const autoSaveStatus = document.getElementById('autoSaveStatus');
        if (autoSaveStatus) {
            autoSaveStatus.className = `status-indicator ${this.autoSaveEnabled ? 'online' : 'offline'}`;
        }
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

    handleSessionTimeout() {
        alert('Your session has expired due to inactivity. You will be logged out.');
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

        if (!this.isMobile) {
            // Auto-open sidebar on desktop
            this.openSidebar();
        }
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
            } else {
                this.openSidebar();
            }
        }
    }

    // ===== ENHANCED SECTION MANAGEMENT =====
    async showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active state from all menu buttons
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Set active menu button
        const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        this.currentSection = sectionName;

        // Update page title and focus
        this.updatePageFocus(sectionName);

        // Load section-specific data
        await this.loadSectionData(sectionName);

        // Add activity log
        this.addActivity(`Navigated to ${sectionName} section`);
    }

    // ===== PAGE FOCUS MANAGEMENT =====
    updatePageFocus(sectionName) {
        // Update document title
        const sectionTitles = {
            'dashboard': 'Dashboard Overview',
            'courses': 'Course Management',
            'timetables': 'Time Table Management',
            'materials': 'Syllabus & Materials',
            'notices': 'Notice Management',
            'fees': 'Fee Structure Management',
            'faculty': 'Faculty Information',
            'college': 'College Information',
            'students': 'Student Data Management',
            'settings': 'Settings & Configuration'
        };

        const title = sectionTitles[sectionName] || 'Admin Panel';
        document.title = `${title} - BitBot Admin`;

        // Hide unnecessary elements based on section
        this.hideUnnecessaryElements(sectionName);

        // Show section-specific tools
        this.showSectionTools(sectionName);
    }

    hideUnnecessaryElements(sectionName) {
        // Hide all other sections completely
        document.querySelectorAll('.content-section').forEach(section => {
            if (!section.id.includes(sectionName)) {
                section.style.display = 'none';
            } else {
                section.style.display = 'block';
            }
        });

        // For dashboard, show overview elements
        if (sectionName === 'dashboard') {
            this.showDashboardElements();
        } else {
            this.hideDashboardElements();
        }
    }

    showDashboardElements() {
        // Show dashboard-specific elements
        const dashboardElements = [
            '.stats-grid',
            '.quick-actions-grid',
            '.dashboard-grid',
            '.recent-activity',
            '.system-status'
        ];

        dashboardElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = '';
            });
        });
    }

    hideDashboardElements() {
        // Hide dashboard overview elements when in other sections
        const dashboardElements = [
            '.stats-grid',
            '.quick-actions-grid',
            '.dashboard-grid'
        ];

        dashboardElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (!el.closest('.content-section.active')) {
                    el.style.display = 'none';
                }
            });
        });
    }

    showSectionTools(sectionName) {
        // Show section-specific tools and hide others
        const allTools = document.querySelectorAll('.section-actions');
        allTools.forEach(tool => {
            const section = tool.closest('.content-section');
            if (section && section.id.includes(sectionName)) {
                tool.style.display = 'flex';
            } else if (section && !section.id.includes(sectionName)) {
                tool.style.display = 'none';
            }
        });

        // Show only relevant forms and data lists
        this.showRelevantContent(sectionName);
    }

    showRelevantContent(sectionName) {
        // Hide all forms and data lists first
        const allForms = document.querySelectorAll('.form-card, .data-card, .content-grid');
        allForms.forEach(form => {
            const section = form.closest('.content-section');
            if (section && !section.id.includes(sectionName)) {
                form.style.display = 'none';
            } else if (section && section.id.includes(sectionName)) {
                form.style.display = '';
            }
        });

        // Show section-specific content
        const activeSection = document.getElementById(`${sectionName}-section`);
        if (activeSection) {
            const sectionContent = activeSection.querySelectorAll('.form-card, .data-card, .content-grid, .section-card');
            sectionContent.forEach(content => {
                content.style.display = '';
            });
        }
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'courses':
                await this.loadCourses();
                break;
            case 'students':
                await this.loadStudents();
                break;
            case 'faculty':
                await this.loadFaculty();
                break;
            case 'notices':
                await this.loadNotices();
                break;
            case 'timetables':
                await this.loadTimetables();
                break;
            case 'materials':
                await this.loadMaterials();
                break;
            case 'fees':
                await this.loadFees();
                break;
            case 'college':
                await this.loadCollegeInfo();
                break;
        }
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

            // Redirect to login
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Error logging out:', error);
            this.showMessage('Error logging out', 'error');
        }
    }
}

// Initialize admin panel when DOM is loaded
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});
