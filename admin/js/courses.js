/**
 * Course Management Module
 * Handles all course-related functionality for the admin panel
 *
 * This module provides:
 * - Course CRUD operations (Create, Read, Update, Delete)
 * - Course import functionality (CSV and JSON)
 * - Course form validation
 * - Integration with AdminPanel for database operations
 * - Course dropdown population for other modules
 *
 * Dependencies:
 * - AdminPanel class (for database operations)
 * - SweetAlert2 (optional, for better dialogs)
 * - Toastify (optional, for notifications)
 */

class CourseManager {
    constructor() {
        this.courses = [];
        // Initialize asynchronously
        this.init().catch(error => {
            console.error('Error initializing CourseManager:', error);
        });
    }

    async init() {
        this.setupEventListeners();
        this.setupFormValidation();

        // Initialize all-courses page if we're on it
        if (window.adminPanel && window.adminPanel.currentPage === 'all-courses') {
            this.initializeAllCoursesPage();
        }

        // Load courses data if AdminPanel is available
        if (window.adminPanel) {
            try {
                await this.loadCourses();
            } catch (error) {
                console.log('Could not load courses initially:', error);
            }
        }
    }

    setupEventListeners() {
        // Course form submission
        document.getElementById('courseForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCourse();
        });

        // Bulk Import CSV button
        document.getElementById('bulkImportBtn')?.addEventListener('click', () => {
            this.showBulkImportDialog();
        });

        // Bulk Export CSV button
        document.getElementById('bulkExportBtn')?.addEventListener('click', () => {
            this.bulkExportCSV();
        });

        // View All Courses button
        document.getElementById('viewAllCoursesBtn')?.addEventListener('click', () => {
            this.showAllCoursesModal();
        });

        // Course form reset (for editing)
        document.getElementById('resetCourseBtn')?.addEventListener('click', () => {
            document.getElementById('courseForm').reset();
            document.getElementById('courseId').value = '';
        });
    }

    setupFormValidation() {
        const requiredFields = ['courseName', 'department', 'courseAffiliation', 'duration', 'totalSeats', 'feeStructure', 'hodName'];

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                // Validate on blur (when user leaves the field)
                field.addEventListener('blur', () => {
                    this.validateSingleField(fieldId);
                });

                // Clear error on input (when user starts typing)
                field.addEventListener('input', () => {
                    if (field.classList.contains('error')) {
                        field.classList.remove('error');
                        const errorElement = document.getElementById(`${fieldId}-error`);
                        if (errorElement) {
                            errorElement.style.display = 'none';
                        }
                    }
                });
            }
        });
    }

    validateSingleField(fieldId) {
        const field = document.getElementById(fieldId);
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Remove existing error state
        field.classList.remove('error');
        const existingError = document.getElementById(`${fieldId}-error`);
        if (existingError) {
            existingError.remove();
        }

        // Validate based on field type
        switch (fieldId) {
            case 'courseName':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Course name is required';
                } else if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Course name must be at least 2 characters';
                }
                break;
            case 'department':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Department is required';
                }
                break;
            case 'courseAffiliation':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Course affiliation is required';
                }
                break;
            case 'duration':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Duration is required';
                }
                break;
            case 'totalSeats':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Total seats is required';
                } else if (isNaN(value) || parseInt(value) <= 0) {
                    isValid = false;
                    errorMessage = 'Total seats must be a positive number';
                }
                break;
            case 'feeStructure':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Fee structure is required';
                }
                break;
            case 'hodName':
                if (!value) {
                    isValid = false;
                    errorMessage = 'HOD name is required';
                }
                break;
        }

        if (!isValid) {
            field.classList.add('error');
            const errorElement = document.createElement('div');
            errorElement.id = `${fieldId}-error`;
            errorElement.className = 'field-error';
            errorElement.textContent = errorMessage;
            errorElement.style.color = '#ef4444';
            errorElement.style.fontSize = '0.75rem';
            errorElement.style.marginTop = '4px';
            field.parentNode.appendChild(errorElement);
        }

        return isValid;
    }

    async saveCourse() {
        try {
            const form = document.getElementById('courseForm');
            if (!form) return;

            // Validate all required fields
            const requiredFields = ['courseName', 'department', 'courseAffiliation', 'duration', 'totalSeats', 'feeStructure', 'hodName'];
            let isFormValid = true;

            requiredFields.forEach(fieldId => {
                if (!this.validateSingleField(fieldId)) {
                    isFormValid = false;
                }
            });

            if (!isFormValid) {
                this.showMessage('Please fix the errors before submitting', 'error');
                return;
            }

            const formData = new FormData(form);
            const courseId = formData.get('courseId');
            const isUpdate = !!courseId;

            // Show immediate feedback
            this.showMessage(isUpdate ? 'Updating course...' : 'Saving course...', 'info');

            const courseData = {
                courseName: formData.get('courseName'),
                department: formData.get('department'),
                courseAffiliation: formData.get('courseAffiliation'),
                duration: formData.get('duration'),
                totalSeats: parseInt(formData.get('totalSeats')),
                feeStructure: formData.get('feeStructure'),
                otherFee: formData.get('otherFee') || '',
                scholarshipOpportunities: formData.get('scholarshipOpportunities') || '',
                admissionEligibility: formData.get('admissionEligibility') || '',
                hodName: formData.get('hodName'),
                counsellor: formData.get('counsellor') || '',
                updatedAt: new Date().toISOString()
            };

            if (isUpdate) {
                // Update existing course
                await this.updateDocument('courses', courseId, courseData);
                this.showMessage('Course updated successfully', 'success');
            } else {
                // Add new course
                courseData.createdAt = new Date().toISOString();
                await this.addDocument('courses', courseData);
                this.showMessage('Course added successfully', 'success');
            }

            // Reset form immediately after success message
            form.reset();
            document.getElementById('courseId').value = '';

            // Refresh course dropdowns on other pages (in background)
            this.populateCourseDropdowns().catch(error => {
                console.log('Could not refresh dropdowns:', error);
            });

        } catch (error) {
            console.error('Error saving course:', error);
            this.showMessage('Error saving course', 'error');
        }
    }

    async editCourse(courseId) {
        try {
            if (!courseId) return;

            // Find the course in our local data
            const course = this.courses.find(c => c.id === courseId);
            if (!course) {
                this.showMessage('Course not found', 'error');
                return;
            }

            // Populate form
            document.getElementById('courseId').value = courseId;
            document.getElementById('courseName').value = course.courseName || '';
            document.getElementById('department').value = course.department || '';
            document.getElementById('courseAffiliation').value = course.courseAffiliation || '';
            document.getElementById('duration').value = course.duration || '';
            document.getElementById('totalSeats').value = course.totalSeats || '';
            document.getElementById('feeStructure').value = course.feeStructure || '';
            document.getElementById('otherFee').value = course.otherFee || '';
            document.getElementById('scholarshipOpportunities').value = course.scholarshipOpportunities || '';
            document.getElementById('admissionEligibility').value = course.admissionEligibility || '';
            document.getElementById('hodName').value = course.hodName || '';
            document.getElementById('counsellor').value = course.counsellor || '';

            // Scroll to form
            document.getElementById('courseForm').scrollIntoView({ behavior: 'smooth' });
            
            // Close modal if open
            const modal = document.getElementById('allCoursesModal');
            if (modal) {
                modal.style.display = 'none';
            }

        } catch (error) {
            console.error('Error editing course:', error);
            this.showMessage('Error loading course data', 'error');
        }
    }

    async showAllCoursesModal() {
        try {
            // Show immediate loading message
            this.showMessage('Loading courses...', 'info');

            // Always load fresh courses data
            await this.loadCourses();

            let modalHtml = `
                <div id="allCoursesModal" class="modal-overlay" style="display: flex;">
                    <div class="modal-content large-modal">
                        <div class="modal-header">
                            <h3>All Courses</h3>
                            <button class="modal-close" onclick="document.getElementById('allCoursesModal').style.display='none'">&times;</button>
                        </div>
                        <div class="modal-body">
            `;

            if (this.courses.length === 0) {
                modalHtml += '<p style="text-align: center; color: #666; padding: 40px;">No courses found. Add some courses to get started.</p>';
            } else {
                modalHtml += `
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left; font-weight: 600;">Course Details</th>
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left; font-weight: 600;">Department & Affiliation</th>
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left; font-weight: 600;">Duration & Seats</th>
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left; font-weight: 600;">Fee Structure</th>
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left; font-weight: 600;">Faculty</th>
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: center; font-weight: 600;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                this.courses.forEach(course => {
                    modalHtml += `
                        <tr style="border-bottom: 1px solid #dee2e6;">
                            <td style="padding: 12px; border: 1px solid #dee2e6; vertical-align: top;">
                                <div style="font-weight: 600; margin-bottom: 4px;">📚 ${course.courseName}</div>
                                ${course.admissionEligibility ? `<div style="font-size: 12px; color: #666;">🎓 ${course.admissionEligibility}</div>` : ''}
                            </td>
                            <td style="padding: 12px; border: 1px solid #dee2e6; vertical-align: top;">
                                <div style="margin-bottom: 4px;">🏢 <strong>${course.department}</strong></div>
                                <div style="font-size: 12px; color: #666;">🏛️ ${course.courseAffiliation}</div>
                            </td>
                            <td style="padding: 12px; border: 1px solid #dee2e6; vertical-align: top;">
                                <div style="margin-bottom: 4px;">⏱️ <strong>${course.duration}</strong></div>
                                <div style="font-size: 12px; color: #666;">👥 ${course.totalSeats} seats</div>
                            </td>
                            <td style="padding: 12px; border: 1px solid #dee2e6; vertical-align: top;">
                                <div style="margin-bottom: 4px;">💰 <strong>${course.feeStructure}</strong></div>
                                ${course.otherFee ? `<div style="font-size: 12px; color: #666;">➕ ${course.otherFee}</div>` : ''}
                                ${course.scholarshipOpportunities ? `<div style="font-size: 12px; color: #10b981;">🎓 ${course.scholarshipOpportunities}</div>` : ''}
                            </td>
                            <td style="padding: 12px; border: 1px solid #dee2e6; vertical-align: top;">
                                <div style="margin-bottom: 4px;">👨‍💼 <strong>${course.hodName || 'N/A'}</strong></div>
                                ${course.counsellor ? `<div style="font-size: 12px; color: #666;">👩‍🏫 ${course.counsellor}</div>` : ''}
                            </td>
                            <td style="padding: 12px; border: 1px solid #dee2e6; text-align: center; vertical-align: top;">
                                <button onclick="courseManager.editCourse('${course.id}')" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; margin-bottom: 4px; cursor: pointer; font-size: 12px; display: block; width: 100%;">
                                    ✏️ Edit
                                </button>
                                <button onclick="courseManager.deleteCourse('${course.id}')" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; display: block; width: 100%;">
                                    🗑️ Delete
                                </button>
                            </td>
                        </tr>
                    `;
                });

                modalHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
            }

            modalHtml += `
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            const existingModal = document.getElementById('allCoursesModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Show success message
            this.showMessage(`Loaded ${this.courses.length} courses`, 'success');

        } catch (error) {
            console.error('Error showing courses modal:', error);
            this.showMessage('Error loading courses', 'error');
        }
    }

    async deleteCourse(courseId) {
        try {
            if (!courseId) return;

            const course = this.courses.find(c => c.id === courseId);
            if (!course) {
                this.showMessage('Course not found', 'error');
                return;
            }

            // Use SweetAlert2 if available, otherwise use confirm
            let confirmed = false;
            if (window.Swal) {
                const result = await Swal.fire({
                    title: 'Delete Course?',
                    text: `Are you sure you want to delete "${course.courseName}"? This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, delete it!',
                    cancelButtonText: 'Cancel'
                });
                confirmed = result.isConfirmed;
            } else {
                confirmed = confirm(`Are you sure you want to delete the course "${course.courseName}"? This action cannot be undone.`);
            }

            if (confirmed) {
                // Show immediate feedback
                this.showMessage('Deleting course...', 'info');

                await this.deleteDocument('courses', courseId);
                this.showMessage('Course deleted successfully', 'success');

                // Refresh the modal in background
                this.showAllCoursesModal().catch(error => {
                    console.log('Could not refresh modal:', error);
                });
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            this.showMessage('Error deleting course', 'error');
        }
    }

    async loadCourses() {
        try {
            this.courses = await this.getDocuments('courses');
            await this.populateCourseDropdowns();
        } catch (error) {
            console.error('Error loading courses:', error);
            this.showMessage('Error loading courses', 'error');
        }
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



    // Utility methods that delegate to AdminPanel instance
    async getDocuments(collection) {
        if (window.adminPanel && window.adminPanel.getCollection) {
            const snapshot = await window.adminPanel.getCollection(collection);
            const documents = [];
            snapshot.forEach(doc => {
                documents.push({ id: doc.id, ...doc.data() });
            });
            return documents;
        }
        return [];
    }

    async addDocument(collection, data) {
        if (window.adminPanel && window.adminPanel.addDocument) {
            return await window.adminPanel.addDocument(collection, data);
        }
        console.log('Adding document to', collection, data);
    }

    async updateDocument(collection, id, data) {
        if (window.adminPanel && window.adminPanel.updateDocument) {
            return await window.adminPanel.updateDocument(collection, id, data);
        }
        console.log('Updating document in', collection, id, data);
    }

    async deleteDocument(collection, id) {
        if (window.adminPanel && window.adminPanel.deleteDocument) {
            return await window.adminPanel.deleteDocument(collection, id);
        }
        console.log('Deleting document from', collection, id);
    }

    showMessage(message, type = 'success') {
        if (window.adminPanel && window.adminPanel.showMessage) {
            return window.adminPanel.showMessage(message, type);
        }
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    // ===== ALL COURSES PAGE FUNCTIONALITY =====

    initializeAllCoursesPage() {
        this.setupAllCoursesEventListeners();
        this.initializeCoursesTable();
    }

    setupAllCoursesEventListeners() {
        // Import courses button
        document.getElementById('importCoursesBtn')?.addEventListener('click', () => {
            this.showBulkImportDialog();
        });

        // Export courses button
        document.getElementById('exportCoursesBtn')?.addEventListener('click', () => {
            this.bulkExportCSV();
        });
    }

    async initializeCoursesTable() {
        try {
            // Load courses data
            await this.loadCourses();

            // Initialize Tabulator table
            this.coursesTable = new Tabulator("#coursesTable", {
                data: this.courses,
                layout: "fitColumns",
                responsiveLayout: "hide",
                pagination: "local",
                paginationSize: 10,
                paginationSizeSelector: [5, 10, 20, 50],
                movableColumns: true,
                resizableRows: true,
                selectable: true,
                tooltipsHeader: true,
                printAsHtml: true,
                printHeader: "<h1>All Courses<h1>",
                printFooter: "",
                rowContextMenu: [
                    {
                        label: "Edit Course",
                        action: (_, row) => {
                            this.editCourseInline(row.getData().id);
                        }
                    },
                    {
                        label: "Delete Course",
                        action: (_, row) => {
                            this.deleteCourseFromTable(row.getData().id);
                        }
                    }
                ],
                columns: [
                    {
                        title: "Course Name",
                        field: "courseName",
                        width: 200,
                        headerFilter: "input",
                        formatter: (cell) => {
                            const value = cell.getValue();
                            return `<strong style="color: var(--primary-color);">${value}</strong>`;
                        }
                    },
                    {
                        title: "Department",
                        field: "department",
                        width: 180,
                        headerFilter: "input"
                    },
                    {
                        title: "Affiliation",
                        field: "courseAffiliation",
                        width: 150,
                        headerFilter: "input"
                    },
                    {
                        title: "Duration",
                        field: "duration",
                        width: 120,
                        headerFilter: "input"
                    },
                    {
                        title: "Total Seats",
                        field: "totalSeats",
                        width: 120,
                        headerFilter: "number",
                        formatter: (cell) => {
                            const value = cell.getValue();
                            return `<span style="background: var(--success-color); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">${value}</span>`;
                        }
                    },
                    {
                        title: "Fee Structure",
                        field: "feeStructure",
                        width: 150,
                        headerFilter: "input",
                        formatter: (cell) => {
                            const value = cell.getValue();
                            return `<span style="color: var(--success-color); font-weight: 600;">₹${value}</span>`;
                        }
                    },
                    {
                        title: "HOD",
                        field: "hodName",
                        width: 150,
                        headerFilter: "input"
                    },
                    {
                        title: "Actions",
                        field: "actions",
                        width: 150,
                        headerSort: false,
                        formatter: (cell) => {
                            const rowData = cell.getRow().getData();
                            return `
                                <div style="display: flex; gap: 5px; justify-content: center;">
                                    <button onclick="courseManager.editCourseInline('${rowData.id}')"
                                            style="background: var(--primary-color); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button onclick="courseManager.deleteCourseFromTable('${rowData.id}')"
                                            style="background: var(--danger-color); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </div>
                            `;
                        }
                    }
                ]
            });

            // Update course count
            this.updateCourseCount();

        } catch (error) {
            console.error('Error initializing courses table:', error);
            this.showMessage('Error loading courses table', 'error');
        }
    }

    updateCourseCount() {
        const countElement = document.getElementById('totalCoursesCount');
        if (countElement) {
            countElement.textContent = this.courses.length;
        }
    }

    async editCourseInline(courseId) {
        try {
            const course = this.courses.find(c => c.id === courseId);
            if (!course) {
                this.showMessage('Course not found', 'error');
                return;
            }

            // Redirect to courses.html with course data for editing
            const params = new URLSearchParams({
                edit: courseId,
                courseName: course.courseName || '',
                department: course.department || '',
                courseAffiliation: course.courseAffiliation || '',
                duration: course.duration || '',
                totalSeats: course.totalSeats || '',
                feeStructure: course.feeStructure || '',
                otherFee: course.otherFee || '',
                scholarshipOpportunities: course.scholarshipOpportunities || '',
                admissionEligibility: course.admissionEligibility || '',
                hodName: course.hodName || '',
                counsellor: course.counsellor || ''
            });

            window.location.href = `courses.html?${params.toString()}`;

        } catch (error) {
            console.error('Error editing course:', error);
            this.showMessage('Error loading course for editing', 'error');
        }
    }

    async deleteCourseFromTable(courseId) {
        try {
            if (!courseId) return;

            const course = this.courses.find(c => c.id === courseId);
            if (!course) {
                this.showMessage('Course not found', 'error');
                return;
            }

            // Use SweetAlert2 if available, otherwise use confirm
            let confirmed = false;
            if (window.Swal) {
                const result = await Swal.fire({
                    title: 'Delete Course?',
                    text: `Are you sure you want to delete "${course.courseName}"? This action cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, delete it!',
                    cancelButtonText: 'Cancel'
                });
                confirmed = result.isConfirmed;
            } else {
                confirmed = confirm(`Are you sure you want to delete the course "${course.courseName}"? This action cannot be undone.`);
            }

            if (confirmed) {
                // Show immediate feedback
                this.showMessage('Deleting course...', 'info');

                await this.deleteDocument('courses', courseId);
                this.showMessage('Course deleted successfully', 'success');

                // Refresh the table in background
                this.loadCourses().then(() => {
                    if (this.coursesTable) {
                        this.coursesTable.setData(this.courses);
                        this.updateCourseCount();
                    }
                }).catch(error => {
                    console.log('Could not refresh table:', error);
                });
            }
        } catch (error) {
            console.error('Error deleting course:', error);
            this.showMessage('Error deleting course', 'error');
        }
    }

    // ===== BULK IMPORT/EXPORT FUNCTIONALITY =====

    showBulkImportDialog() {
        const modalHtml = `
            <div id="bulkImportModal" class="course-modal-overlay" style="display: flex;">
                <div class="course-modal-content">
                    <div class="course-modal-header">
                        <h3 class="course-modal-title">📁 Bulk Import Courses from CSV</h3>
                        <button class="course-modal-close" onclick="document.getElementById('bulkImportModal').style.display='none'">&times;</button>
                    </div>
                    <div class="course-modal-body">
                        <div class="import-export-options">
                            <div class="import-export-option">
                                <h4>📋 CSV Format Requirements</h4>
                                <p>Your CSV file should include the following columns (in any order):</p>
                                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; font-family: monospace; font-size: 0.875rem;">
                                    <strong>Required columns:</strong><br>
                                    • courseName<br>
                                    • department<br>
                                    • courseAffiliation<br>
                                    • duration<br>
                                    • totalSeats<br>
                                    • feeStructure<br>
                                    • hodName<br><br>
                                    <strong>Optional columns:</strong><br>
                                    • counsellor<br>
                                    • otherFee<br>
                                    • scholarshipOpportunities<br>
                                    • admissionEligibility
                                </div>
                                <div style="margin: 15px 0;">
                                    <label for="csvFileInput" style="display: block; margin-bottom: 8px; font-weight: 600;">Select CSV File:</label>
                                    <input type="file" id="csvFileInput" accept=".csv" style="margin-bottom: 15px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 6px; width: 100%;">
                                </div>
                                <button onclick="courseManager.bulkImportFromCSV()" class="btn-import-file">
                                    <i class="fas fa-upload"></i> Import Courses from CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('bulkImportModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async bulkImportFromCSV() {
        const fileInput = document.getElementById('csvFileInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showMessage('Please select a CSV file to import', 'error');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showMessage('Please select a valid CSV file', 'error');
            return;
        }

        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showMessage('File size too large. Please select a file smaller than 5MB', 'error');
            return;
        }

        try {
            this.showMessage('Processing CSV file...', 'info');

            // Use PapaParse to parse the CSV file
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => {
                    // Clean header names (remove extra spaces, normalize case)
                    return header.trim().toLowerCase().replace(/\s+/g, '');
                },
                complete: async (results) => {
                    try {
                        if (results.errors.length > 0) {
                            console.warn('CSV parsing warnings:', results.errors);
                            // Show non-critical parsing warnings
                            const criticalErrors = results.errors.filter(error => error.type === 'Quotes');
                            if (criticalErrors.length > 0) {
                                this.showMessage('CSV format issues detected. Please check your file format.', 'warning');
                            }
                        }

                        const courses = results.data;
                        if (courses.length === 0) {
                            this.showMessage('No valid course data found in CSV file', 'error');
                            return;
                        }

                        await this.processBulkImport(courses);
                    } catch (error) {
                        console.error('Error processing CSV data:', error);
                        this.showMessage('Error processing CSV data: ' + error.message, 'error');
                    }
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                    this.showMessage('Error parsing CSV file: ' + error.message, 'error');
                }
            });

        } catch (error) {
            console.error('Error importing from CSV:', error);
            this.showMessage('Error importing courses from CSV: ' + error.message, 'error');
        }
    }

    async processBulkImport(courses) {
        try {
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            // Create field mapping for normalized headers
            const fieldMapping = {
                'coursename': 'courseName',
                'department': 'department',
                'courseaffiliation': 'courseAffiliation',
                'duration': 'duration',
                'totalseats': 'totalSeats',
                'feestructure': 'feeStructure',
                'hodname': 'hodName',
                'counsellor': 'counsellor',
                'otherfee': 'otherFee',
                'scholarshipopportunities': 'scholarshipOpportunities',
                'admissioneligibility': 'admissionEligibility'
            };

            // Validate and process each course
            for (let i = 0; i < courses.length; i++) {
                const rawCourseData = courses[i];
                const rowNumber = i + 2; // +2 because of header row and 0-based index

                try {
                    // Normalize the course data using field mapping
                    const courseData = {};
                    Object.keys(rawCourseData).forEach(key => {
                        const normalizedKey = fieldMapping[key.toLowerCase()] || key;
                        courseData[normalizedKey] = rawCourseData[key];
                    });

                    // Validate required fields
                    const requiredFields = ['courseName', 'department', 'courseAffiliation', 'duration', 'totalSeats', 'feeStructure', 'hodName'];
                    const missingFields = [];

                    requiredFields.forEach(field => {
                        if (!courseData[field] || String(courseData[field]).trim() === '') {
                            missingFields.push(field);
                        }
                    });

                    if (missingFields.length > 0) {
                        errors.push(`Row ${rowNumber}: Missing required fields: ${missingFields.join(', ')}`);
                        errorCount++;
                        continue;
                    }

                    // Clean and validate data
                    const cleanCourseData = {
                        courseName: String(courseData.courseName).trim(),
                        department: String(courseData.department).trim(),
                        courseAffiliation: String(courseData.courseAffiliation).trim(),
                        duration: String(courseData.duration).trim(),
                        totalSeats: parseInt(courseData.totalSeats),
                        feeStructure: String(courseData.feeStructure).trim(),
                        hodName: String(courseData.hodName).trim(),
                        counsellor: courseData.counsellor ? String(courseData.counsellor).trim() : '',
                        otherFee: courseData.otherFee ? String(courseData.otherFee).trim() : '',
                        scholarshipOpportunities: courseData.scholarshipOpportunities ? String(courseData.scholarshipOpportunities).trim() : '',
                        admissionEligibility: courseData.admissionEligibility ? String(courseData.admissionEligibility).trim() : '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    // Validate totalSeats is a valid number
                    if (isNaN(cleanCourseData.totalSeats) || cleanCourseData.totalSeats <= 0) {
                        errors.push(`Row ${rowNumber}: Total seats must be a positive number`);
                        errorCount++;
                        continue;
                    }

                    // Save to Firestore
                    await this.addDocument('courses', cleanCourseData);
                    successCount++;

                } catch (error) {
                    console.error(`Error processing row ${rowNumber}:`, error);
                    errors.push(`Row ${rowNumber}: ${error.message}`);
                    errorCount++;
                }
            }

            // Close modal
            document.getElementById('bulkImportModal').style.display = 'none';

            // Show detailed results
            if (successCount > 0) {
                let message = `Successfully imported ${successCount} courses`;
                if (errorCount > 0) {
                    message += ` (${errorCount} failed)`;
                }
                this.showMessage(message, 'success');

                // Show errors if any
                if (errors.length > 0 && errors.length <= 5) {
                    setTimeout(() => {
                        this.showMessage(`Import errors:\n${errors.join('\n')}`, 'warning');
                    }, 2000);
                }

                // Reload courses data
                await this.loadCourses();
            } else {
                let errorMessage = 'No courses were imported.';
                if (errors.length > 0) {
                    errorMessage += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}`;
                    if (errors.length > 5) {
                        errorMessage += `\n... and ${errors.length - 5} more errors`;
                    }
                }
                this.showMessage(errorMessage, 'error');
            }

        } catch (error) {
            console.error('Error in bulk import:', error);
            this.showMessage('Error processing bulk import', 'error');
        }
    }

    async bulkExportCSV() {
        try {
            // Load fresh courses data
            await this.loadCourses();

            if (this.courses.length === 0) {
                this.showMessage('No courses to export', 'warning');
                return;
            }

            this.showMessage('Preparing CSV export...', 'info');

            // Define the columns to export (in the order they should appear)
            const columns = [
                'courseName',
                'department',
                'courseAffiliation',
                'duration',
                'totalSeats',
                'feeStructure',
                'hodName',
                'counsellor',
                'otherFee',
                'scholarshipOpportunities',
                'admissionEligibility'
            ];

            // Prepare data for CSV export with data cleaning
            const csvData = this.courses.map(course => {
                const row = {};
                columns.forEach(column => {
                    let value = course[column] || '';
                    // Clean the data for CSV export
                    if (typeof value === 'string') {
                        value = value.trim();
                        // Remove any problematic characters that might break CSV
                        value = value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
                    }
                    row[column] = value;
                });
                return row;
            });

            // Use PapaParse to generate CSV with proper escaping
            const csv = Papa.unparse(csvData, {
                header: true,
                columns: columns,
                quotes: true, // Always quote fields to handle commas and special characters
                quoteChar: '"',
                escapeChar: '"'
            });

            // Create and download the file
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            const timestamp = new Date().toISOString().split('T')[0];
            const timeString = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
            const filename = `courses_export_${timestamp}_${timeString}.csv`;

            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the URL object
            URL.revokeObjectURL(url);

            this.showMessage(`Successfully exported ${this.courses.length} courses to ${filename}`, 'success');

        } catch (error) {
            console.error('Error exporting courses to CSV:', error);
            this.showMessage('Error exporting courses to CSV: ' + error.message, 'error');
        }
    }



    // ===== FORM POPULATION FROM URL PARAMS =====

    populateFormFromParams(urlParams) {
        try {
            // Populate form fields from URL parameters
            document.getElementById('courseId').value = urlParams.get('edit') || '';
            document.getElementById('courseName').value = urlParams.get('courseName') || '';
            document.getElementById('department').value = urlParams.get('department') || '';
            document.getElementById('courseAffiliation').value = urlParams.get('courseAffiliation') || '';
            document.getElementById('duration').value = urlParams.get('duration') || '';
            document.getElementById('totalSeats').value = urlParams.get('totalSeats') || '';
            document.getElementById('feeStructure').value = urlParams.get('feeStructure') || '';
            document.getElementById('otherFee').value = urlParams.get('otherFee') || '';
            document.getElementById('scholarshipOpportunities').value = urlParams.get('scholarshipOpportunities') || '';
            document.getElementById('admissionEligibility').value = urlParams.get('admissionEligibility') || '';
            document.getElementById('hodName').value = urlParams.get('hodName') || '';
            document.getElementById('counsellor').value = urlParams.get('counsellor') || '';

            // Scroll to form
            document.getElementById('courseForm').scrollIntoView({ behavior: 'smooth' });

            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);

        } catch (error) {
            console.error('Error populating form from params:', error);
        }
    }
}

// Global function to populate course dropdowns (called from other pages)
window.populateCourseDropdowns = async function() {
    if (window.courseManager) {
        await window.courseManager.populateCourseDropdowns();
    }
};

// Initialize course manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for AdminPanel to be ready
    setTimeout(() => {
        window.courseManager = new CourseManager();

        // If AdminPanel is available, ensure courses are loaded
        if (window.adminPanel) {
            window.courseManager.loadCourses().catch(error => {
                console.log('Could not load courses on initialization:', error);
            });
        }
    }, 100);
});
