/**
 * Syllabus Management Module
 * Handles all syllabus-related functionality for the admin panel
 *
 * This module provides:
 * - Syllabus CRUD operations (Create, Read, Update, Delete)
 * - Course and semester dropdown population from existing courses data
 * - Syllabus form validation and submission
 * - Integration with AdminPanel for database operations
 * - Import/Export functionality for syllabus data
 *
 * Dependencies:
 * - AdminPanel class (for database operations)
 * - courses.js (for course dropdown population)
 * - SweetAlert2 (for dialogs)
 * - Toastify (for notifications)
 */

class SyllabusManager {
    constructor() {
        this.syllabusList = [];
        this.currentEditId = null;
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Syllabus Manager...');

            // Wait for AdminPanel to be ready
            if (!window.adminPanel) {
                console.log('AdminPanel not ready, waiting...');
                setTimeout(() => this.init(), 500);
                return;
            }

            // Setup form listeners
            this.setupFormListeners();

            // Setup field validation
            this.setupFieldValidation();

            // Setup course auto-complete
            this.setupCourseAutoComplete();

            // Setup dynamic subjects
            this.setupDynamicSubjects();

            // Setup button listeners
            this.setupButtonListeners();

            // Load syllabus data
            await this.loadSyllabusList();

            console.log('Syllabus Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing Syllabus Manager:', error);
        }
    }

    setupFormListeners() {
        const form = document.getElementById('syllabusForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSyllabus();
            });
        }

        const resetBtn = document.getElementById('resetSyllabusBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetForm();
            });
        }
    }

    setupFieldValidation() {
        const requiredFields = [
            'syllabusCourse', 'syllabusSemester'
        ];

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
                        const existingError = document.getElementById(`${fieldId}-error`);
                        if (existingError) {
                            existingError.remove();
                        }
                    }
                });
            }
        });

        // Setup validation for dynamic subject fields
        this.setupSubjectFieldValidation();
    }

    setupSubjectFieldValidation() {
        // This will be called whenever new subject fields are added
        const subjectEntries = document.querySelectorAll('.subject-entry');
        subjectEntries.forEach((entry, index) => {
            const nameField = entry.querySelector(`[name="subjects[${index}][name]"]`);
            const codeField = entry.querySelector(`[name="subjects[${index}][code]"]`);
            const marksField = entry.querySelector(`[name="subjects[${index}][marks]"]`);
            const creditsField = entry.querySelector(`[name="subjects[${index}][credits]"]`);

            [nameField, codeField, marksField, creditsField].forEach(field => {
                if (field) {
                    field.addEventListener('blur', () => {
                        this.validateSubjectField(field);
                    });

                    field.addEventListener('input', () => {
                        if (field.classList.contains('error')) {
                            field.classList.remove('error');
                            const existingError = document.getElementById(`${field.id}-error`);
                            if (existingError) {
                                existingError.remove();
                            }
                        }
                    });
                }
            });
        });
    }

    setupCourseAutoComplete() {
        const courseInput = document.getElementById('syllabusCourse');
        const suggestionsDiv = document.getElementById('courseSuggestions');

        if (!courseInput || !suggestionsDiv) return;

        courseInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();

            if (query.length < 1) {
                suggestionsDiv.style.display = 'none';
                return;
            }

            try {
                // Load courses if not already loaded
                if (!this.coursesList || this.coursesList.length === 0) {
                    await this.loadCoursesList();
                }

                // Filter courses based on input
                const filteredCourses = this.coursesList.filter(course =>
                    course.courseName.toLowerCase().includes(query.toLowerCase()) ||
                    course.department.toLowerCase().includes(query.toLowerCase())
                );

                this.displayCourseSuggestions(filteredCourses, suggestionsDiv, courseInput);
            } catch (error) {
                console.error('Error filtering courses:', error);
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!courseInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                suggestionsDiv.style.display = 'none';
            }
        });
    }

    async loadCoursesList() {
        try {
            if (!window.adminPanel) {
                console.log('AdminPanel not ready for loading courses');
                return;
            }

            this.coursesList = await window.adminPanel.loadData('courses');
            console.log('Loaded courses list:', this.coursesList.length, 'items');
        } catch (error) {
            console.error('Error loading courses list:', error);
            this.coursesList = [];
        }
    }

    displayCourseSuggestions(courses, suggestionsDiv, inputField) {
        if (courses.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = '';
        courses.slice(0, 5).forEach(course => { // Show max 5 suggestions
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'course-suggestion-item';
            suggestionItem.textContent = `${course.courseName} - ${course.department}`;

            suggestionItem.addEventListener('click', () => {
                inputField.value = course.courseName;
                suggestionsDiv.style.display = 'none';

                // Trigger validation
                this.validateSingleField('syllabusCourse');
            });

            suggestionsDiv.appendChild(suggestionItem);
        });

        suggestionsDiv.style.display = 'block';
    }

    setupDynamicSubjects() {
        this.subjectCount = 1; // Start with 1 subject (already in HTML)
        this.quillEditors = {}; // Store Quill editor instances

        // Initialize first Quill editor
        this.initializeQuillEditor(0);

        const addBtn = document.getElementById('addSubjectBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addSubject();
            });
        }
    }

    initializeQuillEditor(index) {
        const editorId = `syllabusContent_${index}`;
        const editorElement = document.getElementById(editorId);

        if (editorElement && !this.quillEditors[index]) {
            const quill = new Quill(`#${editorId}`, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'indent': '-1'}, { 'indent': '+1' }],
                        ['link', 'blockquote', 'code-block'],
                        ['clean']
                    ]
                },
                placeholder: 'Enter detailed syllabus content for this subject...'
            });

            this.quillEditors[index] = quill;

            // Update hidden input when content changes
            quill.on('text-change', () => {
                const hiddenInput = document.getElementById(`${editorId}_hidden`);
                if (hiddenInput) {
                    hiddenInput.value = quill.root.innerHTML;
                }
            });
        }
    }

    addSubject() {
        const container = document.getElementById('subjectsContainer');
        if (!container) return;

        const subjectEntry = document.createElement('div');
        subjectEntry.className = 'subject-entry';
        subjectEntry.setAttribute('data-subject-index', this.subjectCount);

        subjectEntry.innerHTML = `
            <div class="subject-header">
                <h5 class="subject-number">Subject ${this.subjectCount + 1}</h5>
                <button type="button" class="btn-remove-subject" onclick="window.syllabusManager.removeSubject(${this.subjectCount})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="subject-fields">
                <div class="course-form-grid">
                    <div class="course-form-group">
                        <label class="course-form-label" for="SubjectName_${this.subjectCount}">Subject Name *</label>
                        <input class="course-form-input" type="text" id="SubjectName_${this.subjectCount}" name="subjects[${this.subjectCount}][name]" placeholder="e.g., Data Structures" required>
                    </div>
                    <div class="course-form-group">
                        <label class="course-form-label" for="SubjectCode_${this.subjectCount}">Subject Code *</label>
                        <input class="course-form-input" type="text" id="SubjectCode_${this.subjectCount}" name="subjects[${this.subjectCount}][code]" placeholder="e.g., CS101" required>
                    </div>
                </div>
                <div class="course-form-grid">
                    <div class="course-form-group">
                        <label class="course-form-label" for="internalExternalMarks_${this.subjectCount}">Internal/External Marks *</label>
                        <input class="course-form-input" type="text" id="internalExternalMarks_${this.subjectCount}" name="subjects[${this.subjectCount}][marks]" placeholder="e.g., 30/70, 40/60" required>
                    </div>
                    <div class="course-form-group">
                        <label class="course-form-label" for="credit_${this.subjectCount}">Credit *</label>
                        <input class="course-form-input" type="number" id="credit_${this.subjectCount}" name="subjects[${this.subjectCount}][credits]" placeholder="e.g., 3, 4" min="1" max="10" required>
                    </div>
                </div>
                <div class="course-form-group">
                    <label class="course-form-label" for="syllabusContent_${this.subjectCount}">Syllabus Content *</label>
                    <div id="syllabusContent_${this.subjectCount}" class="quill-editor" style="height: 200px;"></div>
                    <input type="hidden" name="subjects[${this.subjectCount}][content]" id="syllabusContent_${this.subjectCount}_hidden" required>
                </div>
            </div>
        `;

        container.appendChild(subjectEntry);

        // Initialize Quill editor for the new subject
        // Use current subjectCount before incrementing
        const currentIndex = this.subjectCount;
        setTimeout(() => {
            this.initializeQuillEditor(currentIndex);
        }, 200);

        this.subjectCount++;

        // Setup validation for the new fields
        this.setupSubjectFieldValidation();

        // Show remove buttons for all subjects if there's more than one
        this.updateRemoveButtons();
    }

    removeSubject(index) {
        const subjectEntry = document.querySelector(`[data-subject-index="${index}"]`);
        if (subjectEntry) {
            // Clean up Quill editor
            if (this.quillEditors[index]) {
                delete this.quillEditors[index];
            }

            subjectEntry.remove();

            // Update subject numbers
            this.updateSubjectNumbers();

            // Update remove buttons visibility
            this.updateRemoveButtons();
        }
    }

    updateSubjectNumbers() {
        const subjectEntries = document.querySelectorAll('.subject-entry');
        subjectEntries.forEach((entry, index) => {
            const numberElement = entry.querySelector('.subject-number');
            if (numberElement) {
                numberElement.textContent = `Subject ${index + 1}`;
            }

            // Update data attribute
            entry.setAttribute('data-subject-index', index);

            // Update field names and IDs
            const nameField = entry.querySelector('input[name*="[name]"]');
            const codeField = entry.querySelector('input[name*="[code]"]');
            const marksField = entry.querySelector('input[name*="[marks]"]');
            const creditsField = entry.querySelector('input[name*="[credits]"]');
            const contentField = entry.querySelector('div[id*="syllabusContent"]'); // Quill editor div

            if (nameField) {
                nameField.name = `subjects[${index}][name]`;
                nameField.id = `SubjectName_${index}`;
                const label = entry.querySelector(`label[for*="SubjectName"]`);
                if (label) label.setAttribute('for', `SubjectName_${index}`);
            }

            if (codeField) {
                codeField.name = `subjects[${index}][code]`;
                codeField.id = `SubjectCode_${index}`;
                const label = entry.querySelector(`label[for*="SubjectCode"]`);
                if (label) label.setAttribute('for', `SubjectCode_${index}`);
            }

            if (marksField) {
                marksField.name = `subjects[${index}][marks]`;
                marksField.id = `internalExternalMarks_${index}`;
                const label = entry.querySelector(`label[for*="internalExternalMarks"]`);
                if (label) label.setAttribute('for', `internalExternalMarks_${index}`);
            }

            if (creditsField) {
                creditsField.name = `subjects[${index}][credits]`;
                creditsField.id = `credit_${index}`;
                const label = entry.querySelector(`label[for*="credit"]`);
                if (label) label.setAttribute('for', `credit_${index}`);
            }

            if (contentField) {
                contentField.id = `syllabusContent_${index}`;
                const label = entry.querySelector(`label[for*="syllabusContent"]`);
                if (label) label.setAttribute('for', `syllabusContent_${index}`);

                // Update hidden field
                const hiddenField = entry.querySelector('input[type="hidden"]');
                if (hiddenField) {
                    hiddenField.name = `subjects[${index}][content]`;
                    hiddenField.id = `syllabusContent_${index}_hidden`;
                }
            }

            // Update remove button onclick
            const removeBtn = entry.querySelector('.btn-remove-subject');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `window.syllabusManager.removeSubject(${index})`);
            }

            // Reinitialize Quill editor if it doesn't exist
            if (!this.quillEditors[index]) {
                setTimeout(() => {
                    this.initializeQuillEditor(index);
                }, 100);
            }
        });

        // Update subject count
        this.subjectCount = subjectEntries.length;
    }

    updateRemoveButtons() {
        const removeButtons = document.querySelectorAll('.btn-remove-subject');
        const subjectEntries = document.querySelectorAll('.subject-entry');

        removeButtons.forEach(btn => {
            btn.style.display = subjectEntries.length > 1 ? 'flex' : 'none';
        });
    }

    validateSingleField(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return true;

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
            case 'syllabusCourse':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Course is required';
                } else if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Course name must be at least 2 characters';
                }
                break;
            case 'syllabusSemester':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Semester/Year is required';
                } else if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Semester/Year must be at least 2 characters';
                }
                break;
        }

        // Show error if validation failed
        if (!isValid) {
            field.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.id = `${fieldId}-error`;
            errorDiv.className = 'field-error';
            errorDiv.textContent = errorMessage;
            field.parentNode.appendChild(errorDiv);
        }

        return isValid;
    }

    validateSubjectField(field) {
        if (!field) return true;

        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Remove existing error state
        field.classList.remove('error');
        const existingError = document.getElementById(`${field.id}-error`);
        if (existingError) {
            existingError.remove();
        }

        // Determine field type from name attribute
        const fieldName = field.name;
        if (fieldName.includes('[name]')) {
            // Subject name validation
            if (!value) {
                isValid = false;
                errorMessage = 'Subject name is required';
            } else if (value.length < 2) {
                isValid = false;
                errorMessage = 'Subject name must be at least 2 characters';
            }
        } else if (fieldName.includes('[code]')) {
            // Subject code validation
            if (!value) {
                isValid = false;
                errorMessage = 'Subject code is required';
            } else if (value.length < 2) {
                isValid = false;
                errorMessage = 'Subject code must be at least 2 characters';
            }
        } else if (fieldName.includes('[marks]')) {
            // Internal/External marks validation
            if (!value) {
                isValid = false;
                errorMessage = 'Internal/External marks is required';
            } else if (value.length < 3) {
                isValid = false;
                errorMessage = 'Please enter marks in format like 30/70';
            }
        } else if (fieldName.includes('[credits]')) {
            // Credits validation
            if (!value) {
                isValid = false;
                errorMessage = 'Credits is required';
            } else if (isNaN(value) || parseInt(value) <= 0 || parseInt(value) > 10) {
                isValid = false;
                errorMessage = 'Credits must be a number between 1 and 10';
            }
        } else if (fieldName.includes('[content]')) {
            // Syllabus content validation
            if (!value) {
                isValid = false;
                errorMessage = 'Syllabus content is required';
            } else if (value.length < 20) {
                isValid = false;
                errorMessage = 'Syllabus content must be at least 20 characters';
            }
        }

        // Show error if validation failed
        if (!isValid) {
            field.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.id = `${field.id}-error`;
            errorDiv.className = 'field-error';
            errorDiv.textContent = errorMessage;
            field.parentNode.appendChild(errorDiv);
        }

        return isValid;
    }

    setupButtonListeners() {
        // Import button
        const importBtn = document.getElementById('importSyllabusBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.showImportDialog();
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportSyllabusBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSyllabus();
            });
        }

        // View all button
        const viewAllBtn = document.getElementById('viewAllSyllabusBtn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                this.showAllSyllabus();
            });
        }
    }

    async loadSyllabusList() {
        try {
            if (!window.adminPanel) {
                console.log('AdminPanel not ready for loading syllabus');
                this.syllabusList = [];
                return;
            }

            this.syllabusList = await window.adminPanel.loadData('syllabus');
            console.log('Loaded syllabus list:', this.syllabusList.length, 'items');
        } catch (error) {
            console.error('Error loading syllabus list:', error);
            // Don't show error message for initial load - just log it
            this.syllabusList = [];
        }
    }

    async saveSyllabus() {
        try {
            const form = document.getElementById('syllabusForm');
            if (!form) return;

            // Validate form
            if (!this.validateForm()) {
                return;
            }

            const formData = new FormData(form);
            const syllabusId = formData.get('syllabusId');
            const isUpdate = !!syllabusId;

            this.showMessage(isUpdate ? 'Updating syllabus...' : 'Saving syllabus...', 'info');

            // Collect subjects data
            const subjects = [];
            const subjectEntries = document.querySelectorAll('.subject-entry');

            subjectEntries.forEach((entry, index) => {
                const nameField = entry.querySelector(`[name="subjects[${index}][name]"]`);
                const codeField = entry.querySelector(`[name="subjects[${index}][code]"]`);
                const marksField = entry.querySelector(`[name="subjects[${index}][marks]"]`);
                const creditsField = entry.querySelector(`[name="subjects[${index}][credits]"]`);

                // Get content from Quill editor
                let content = '';
                if (this.quillEditors[index]) {
                    content = this.quillEditors[index].root.innerHTML;
                } else {
                    const hiddenField = entry.querySelector(`[name="subjects[${index}][content]"]`);
                    content = hiddenField ? hiddenField.value.trim() : '';
                }

                if (nameField && codeField && marksField && creditsField) {
                    subjects.push({
                        name: nameField.value.trim(),
                        code: codeField.value.trim(),
                        marks: marksField.value.trim(),
                        credits: parseInt(creditsField.value) || 0,
                        content: content
                    });
                }
            });

            const syllabusData = {
                course: formData.get('course'),
                semester: formData.get('semester'),
                subjects: subjects,
                referenceBooks: formData.get('referenceBooks') || '',
                updatedAt: new Date().toISOString()
            };

            if (isUpdate) {
                await window.adminPanel.updateData('syllabus', syllabusId, syllabusData);
                this.showMessage('Syllabus updated successfully', 'success');
            } else {
                syllabusData.createdAt = new Date().toISOString();
                await window.adminPanel.saveData('syllabus', syllabusData);
                this.showMessage('Syllabus added successfully', 'success');
            }

            // Reset form and reload data
            this.resetForm();
            await this.loadSyllabusList();

        } catch (error) {
            console.error('Error saving syllabus:', error);
            this.showMessage('Error saving syllabus', 'error');
        }
    }

    validateForm() {
        let isFormValid = true;

        // Validate main fields
        const mainFields = ['syllabusCourse', 'syllabusSemester'];
        mainFields.forEach(fieldId => {
            if (!this.validateSingleField(fieldId)) {
                isFormValid = false;
            }
        });

        // Validate all subject fields
        const subjectEntries = document.querySelectorAll('.subject-entry');
        if (subjectEntries.length === 0) {
            this.showMessage('At least one subject is required', 'error');
            isFormValid = false;
        } else {
            subjectEntries.forEach((entry, index) => {
                const nameField = entry.querySelector(`[name="subjects[${index}][name]"]`);
                const codeField = entry.querySelector(`[name="subjects[${index}][code]"]`);
                const marksField = entry.querySelector(`[name="subjects[${index}][marks]"]`);
                const creditsField = entry.querySelector(`[name="subjects[${index}][credits]"]`);

                [nameField, codeField, marksField, creditsField].forEach(field => {
                    if (field && !this.validateSubjectField(field)) {
                        isFormValid = false;
                    }
                });

                // Validate Quill editor content
                if (this.quillEditors[index]) {
                    const content = this.quillEditors[index].root.innerHTML;
                    if (!content || content.trim() === '<p><br></p>' || content.trim().length < 20) {
                        isFormValid = false;
                        this.showMessage(`Syllabus content for subject ${index + 1} is required (minimum 20 characters)`, 'error');
                    }
                }
            });
        }

        if (!isFormValid) {
            this.showMessage('Please fix the errors before submitting', 'error');
        }

        return isFormValid;
    }

    resetForm() {
        const form = document.getElementById('syllabusForm');
        if (form) {
            form.reset();
            document.getElementById('syllabusId').value = '';

            // Remove error classes and error messages
            const errorFields = form.querySelectorAll('.error');
            errorFields.forEach(field => field.classList.remove('error'));

            const errorMessages = form.querySelectorAll('.field-error');
            errorMessages.forEach(error => error.remove());

            // Reset to single subject
            const container = document.getElementById('subjectsContainer');
            if (container) {
                // Keep only the first subject entry
                const subjectEntries = container.querySelectorAll('.subject-entry');
                for (let i = 1; i < subjectEntries.length; i++) {
                    subjectEntries[i].remove();
                }

                // Reset the first subject entry
                const firstEntry = container.querySelector('.subject-entry');
                if (firstEntry) {
                    const nameField = firstEntry.querySelector('input[name*="[name]"]');
                    const codeField = firstEntry.querySelector('input[name*="[code]"]');
                    const contentField = firstEntry.querySelector('textarea[name*="[content]"]');

                    if (nameField) nameField.value = '';
                    if (codeField) codeField.value = '';
                    if (contentField) contentField.value = '';

                    // Get all fields
                    const marksField = firstEntry.querySelector('input[name*="[marks]"]');
                    const creditsField = firstEntry.querySelector('input[name*="[credits]"]');

                    // Clear field values
                    if (nameField) nameField.value = '';
                    if (codeField) codeField.value = '';
                    if (marksField) marksField.value = '';
                    if (creditsField) creditsField.value = '';

                    // Update field attributes to index 0
                    if (nameField) {
                        nameField.name = 'subjects[0][name]';
                        nameField.id = 'SubjectName_0';
                    }
                    if (codeField) {
                        codeField.name = 'subjects[0][code]';
                        codeField.id = 'SubjectCode_0';
                    }
                    if (marksField) {
                        marksField.name = 'subjects[0][marks]';
                        marksField.id = 'internalExternalMarks_0';
                    }
                    if (creditsField) {
                        creditsField.name = 'subjects[0][credits]';
                        creditsField.id = 'credit_0';
                    }

                    // Update Quill editor div
                    const editorDiv = firstEntry.querySelector('div[id*="syllabusContent"]');
                    if (editorDiv) {
                        editorDiv.id = 'syllabusContent_0';
                    }

                    // Update hidden field
                    const hiddenField = firstEntry.querySelector('input[type="hidden"]');
                    if (hiddenField) {
                        hiddenField.name = 'subjects[0][content]';
                        hiddenField.id = 'syllabusContent_0_hidden';
                        hiddenField.value = '';
                    }

                    // Update labels
                    const nameLabel = firstEntry.querySelector('label[for*="SubjectName"]');
                    const codeLabel = firstEntry.querySelector('label[for*="SubjectCode"]');
                    const marksLabel = firstEntry.querySelector('label[for*="internalExternalMarks"]');
                    const creditsLabel = firstEntry.querySelector('label[for*="credit"]');
                    const contentLabel = firstEntry.querySelector('label[for*="syllabusContent"]');

                    if (nameLabel) nameLabel.setAttribute('for', 'SubjectName_0');
                    if (codeLabel) codeLabel.setAttribute('for', 'SubjectCode_0');
                    if (marksLabel) marksLabel.setAttribute('for', 'internalExternalMarks_0');
                    if (creditsLabel) creditsLabel.setAttribute('for', 'credit_0');
                    if (contentLabel) contentLabel.setAttribute('for', 'syllabusContent_0');

                    // Update subject number
                    const numberElement = firstEntry.querySelector('.subject-number');
                    if (numberElement) numberElement.textContent = 'Subject 1';

                    // Hide remove button
                    const removeBtn = firstEntry.querySelector('.btn-remove-subject');
                    if (removeBtn) removeBtn.style.display = 'none';
                }

                this.subjectCount = 1;
            }

            // Hide course suggestions
            const suggestionsDiv = document.getElementById('courseSuggestions');
            if (suggestionsDiv) {
                suggestionsDiv.style.display = 'none';
            }
        }

        this.currentEditId = null;
    }

    showMessage(message, type = 'info') {
        if (typeof Toastify !== 'undefined') {
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                warning: '#f59e0b',
                info: '#3b82f6'
            };

            Toastify({
                text: message,
                duration: 3000,
                gravity: 'top',
                position: 'right',
                backgroundColor: colors[type] || colors.info,
                stopOnFocus: true
            }).showToast();
        } else {
            alert(message);
        }
    }

    async showImportDialog() {
        if (typeof Swal !== 'undefined') {
            const { value: file } = await Swal.fire({
                title: 'Import Syllabus Data',
                html: `
                    <div style="text-align: left; margin: 20px 0;">
                        <p>Upload a CSV file with syllabus data. The file should contain the following columns:</p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li><strong>course</strong> - Course name (e.g., BCA, B.Tech CSE)</li>
                            <li><strong>semester</strong> - Semester/Year (e.g., 1st Semester)</li>
                            <li><strong>subjects</strong> - JSON array of subjects with name, code, and content</li>
                            <li><strong>referenceBooks</strong> - Reference books (optional)</li>
                        </ul>
                        <p><small>For legacy format, you can also use: subjectName, subjectCode, syllabusContent columns for single subject entries.</small></p>
                    </div>
                    <input type="file" id="syllabusFile" accept=".csv" class="swal2-input">
                `,
                showCancelButton: true,
                confirmButtonText: 'Import',
                preConfirm: () => {
                    const fileInput = document.getElementById('syllabusFile');
                    if (!fileInput.files[0]) {
                        Swal.showValidationMessage('Please select a CSV file');
                        return false;
                    }
                    return fileInput.files[0];
                }
            });

            if (file) {
                this.importFromCSV(file);
            }
        } else {
            alert('Import functionality requires SweetAlert2 library');
        }
    }

    async importFromCSV(file) {
        try {
            if (typeof Papa === 'undefined') {
                this.showMessage('CSV parsing library not available', 'error');
                return;
            }

            Papa.parse(file, {
                header: true,
                complete: async (results) => {
                    if (results.errors.length > 0) {
                        this.showMessage('Error parsing CSV file', 'error');
                        return;
                    }

                    let successCount = 0;
                    let errorCount = 0;

                    for (const row of results.data) {
                        if (!row.course || !row.semester) {
                            errorCount++;
                            continue;
                        }

                        try {
                            // Parse subjects from CSV (assuming they're in separate columns or JSON format)
                            let subjects = [];
                            if (row.subjects) {
                                try {
                                    subjects = JSON.parse(row.subjects);
                                    // Ensure all subjects have the required fields
                                    subjects = subjects.map(subject => ({
                                        name: subject.name || '',
                                        code: subject.code || '',
                                        marks: subject.marks || '',
                                        credits: parseInt(subject.credits) || 0,
                                        content: subject.content || ''
                                    }));
                                } catch (e) {
                                    // If not JSON, treat as single subject
                                    subjects = [{
                                        name: row.subjectName || row.SubjectName || '',
                                        code: row.subjectCode || row.SubjectCode || '',
                                        marks: row.marks || row.internalExternalMarks || '',
                                        credits: parseInt(row.credits) || 0,
                                        content: row.syllabusContent || ''
                                    }];
                                }
                            } else {
                                // Legacy format - single subject
                                subjects = [{
                                    name: row.subjectName || row.SubjectName || '',
                                    code: row.subjectCode || row.SubjectCode || '',
                                    marks: row.marks || row.internalExternalMarks || '',
                                    credits: parseInt(row.credits) || 0,
                                    content: row.syllabusContent || ''
                                }];
                            }

                            const syllabusData = {
                                course: row.course,
                                semester: row.semester,
                                subjects: subjects,
                                referenceBooks: row.referenceBooks || '',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };

                            await window.adminPanel.saveData('syllabus', syllabusData);
                            successCount++;
                        } catch (error) {
                            console.error('Error importing row:', error);
                            errorCount++;
                        }
                    }

                    this.showMessage(`Import completed: ${successCount} success, ${errorCount} errors`,
                                   errorCount > 0 ? 'warning' : 'success');
                    await this.loadSyllabusList();
                }
            });
        } catch (error) {
            console.error('Error importing CSV:', error);
            this.showMessage('Error importing CSV file', 'error');
        }
    }

    async exportSyllabus() {
        try {
            await this.loadSyllabusList();

            if (this.syllabusList.length === 0) {
                this.showMessage('No syllabus data to export', 'warning');
                return;
            }

            if (typeof Papa === 'undefined') {
                this.showMessage('CSV export library not available', 'error');
                return;
            }

            const csvData = this.syllabusList.map(item => ({
                course: item.course,
                semester: item.semester,
                subjects: JSON.stringify(item.subjects || []),
                referenceBooks: item.referenceBooks
            }));

            const csv = Papa.unparse(csvData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');

            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `syllabus_export_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                this.showMessage('Syllabus data exported successfully', 'success');
            }
        } catch (error) {
            console.error('Error exporting syllabus:', error);
            this.showMessage('Error exporting syllabus data', 'error');
        }
    }

    async showAllSyllabus() {
        // This will be implemented to show all syllabus in a modal or redirect to a view page
        this.showMessage('View All Syllabus feature coming soon', 'info');
    }

    populateFormFromParams(urlParams) {
        // Handle URL parameters for editing
        const editId = urlParams.get('edit');
        if (editId) {
            // Find and populate form with existing data
            const syllabus = this.syllabusList.find(s => s.id === editId);
            if (syllabus) {
                this.populateForm(syllabus);
            }
        }
    }

    populateForm(syllabusData) {
        // Populate basic fields
        const courseField = document.getElementById('syllabusCourse');
        const semesterField = document.getElementById('syllabusSemester');
        const referenceField = document.getElementById('referenceBooks');

        if (courseField) courseField.value = syllabusData.course || '';
        if (semesterField) semesterField.value = syllabusData.semester || '';
        if (referenceField) referenceField.value = syllabusData.referenceBooks || '';

        // Handle subjects array
        if (syllabusData.subjects && Array.isArray(syllabusData.subjects)) {
            // Clear existing subjects except the first one
            const container = document.getElementById('subjectsContainer');
            if (container) {
                const existingEntries = container.querySelectorAll('.subject-entry');
                for (let i = 1; i < existingEntries.length; i++) {
                    existingEntries[i].remove();
                }
            }

            // Populate subjects
            syllabusData.subjects.forEach((subject, index) => {
                if (index > 0) {
                    // Add new subject entry for index > 0
                    this.addSubject();
                }

                // Wait for DOM to update, then populate
                setTimeout(() => {
                    const nameField = document.getElementById(`SubjectName_${index}`);
                    const codeField = document.getElementById(`SubjectCode_${index}`);
                    const marksField = document.getElementById(`internalExternalMarks_${index}`);
                    const creditsField = document.getElementById(`credit_${index}`);

                    if (nameField) nameField.value = subject.name || '';
                    if (codeField) codeField.value = subject.code || '';
                    if (marksField) marksField.value = subject.marks || '';
                    if (creditsField) creditsField.value = subject.credits || '';

                    // Set Quill editor content
                    if (this.quillEditors[index] && subject.content) {
                        this.quillEditors[index].root.innerHTML = subject.content;
                        // Update hidden field
                        const hiddenField = document.getElementById(`syllabusContent_${index}_hidden`);
                        if (hiddenField) {
                            hiddenField.value = subject.content;
                        }
                    }
                }, 200 * (index + 1)); // Stagger the updates
            });
        }

        document.getElementById('syllabusId').value = syllabusData.id || '';
        this.currentEditId = syllabusData.id;
    }
}

// Initialize syllabus page functionality
function initializeSyllabusPage() {
    // Setup form listeners
    setupSyllabusFormListeners();

    // Setup button listeners
    setupSyllabusButtonListeners();

    // Load initial data
    if (window.adminPanel) {
        window.adminPanel.loadPageData('syllabus');
    }

    // Load courses for dropdown (handled by courses.js)
    if (window.populateCourseDropdowns) {
        setTimeout(() => {
            window.populateCourseDropdowns();
        }, 500);
    }
}

// Setup form listeners
function setupSyllabusFormListeners() {
    const form = document.getElementById('syllabusForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (window.syllabusManager) {
                window.syllabusManager.saveSyllabus();
            }
        });
    }

    const resetBtn = document.getElementById('resetSyllabusBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (window.syllabusManager) {
                window.syllabusManager.resetForm();
            }
        });
    }
}

// Setup button listeners
function setupSyllabusButtonListeners() {
    // Import button
    const importBtn = document.getElementById('importSyllabusBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            if (window.syllabusManager) {
                window.syllabusManager.showImportDialog();
            }
        });
    }

    // Export button
    const exportBtn = document.getElementById('exportSyllabusBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (window.syllabusManager) {
                window.syllabusManager.exportSyllabus();
            }
        });
    }

    // View all button
    const viewAllBtn = document.getElementById('viewAllSyllabusBtn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            if (window.syllabusManager) {
                window.syllabusManager.showAllSyllabus();
            }
        });
    }
}

// Export functions for global access
window.SyllabusPage = {
    initializeSyllabusPage,
    setupSyllabusFormListeners,
    setupSyllabusButtonListeners
};

/**
 * View Syllabus Module
 * Handles viewing and filtering of all syllabus entries
 * Reuses patterns from timetables.js for consistency
 */

class ViewSyllabusManager {
    constructor() {
        this.syllabusList = [];
        this.filteredSyllabus = [];
        this.init();
    }

    async init() {
        try {
            console.log('Initializing View Syllabus Manager...');

            // Wait for AdminPanel to be ready
            if (!window.adminPanel) {
                console.log('AdminPanel not ready, waiting...');
                setTimeout(() => this.init(), 500);
                return;
            }

            // Setup filter listeners
            this.setupFilterListeners();

            // Load initial data
            await this.loadAllSyllabus();
            await this.loadCoursesForFilter();

            console.log('View Syllabus Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing View Syllabus Manager:', error);
        }
    }

    setupFilterListeners() {
        // Apply filters button
        const applyBtn = document.getElementById('applyFilters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyFilters();
            });
        }

        // Clear filters button
        const clearBtn = document.getElementById('clearFilters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Course filter change
        const courseFilter = document.getElementById('courseFilter');
        if (courseFilter) {
            courseFilter.addEventListener('change', () => {
                this.loadSemestersForCourse(courseFilter.value);
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportSyllabusBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportFilteredSyllabus();
            });
        }
    }

    async loadAllSyllabus() {
        try {
            if (!window.adminPanel) {
                console.log('AdminPanel not ready for loading syllabus');
                this.syllabusList = [];
                return;
            }

            this.syllabusList = await window.adminPanel.loadData('syllabus');
            console.log('Loaded syllabus list:', this.syllabusList.length, 'items');

            // Display all syllabus initially
            this.displaySyllabus(this.syllabusList);
        } catch (error) {
            console.error('Error loading syllabus list:', error);
            // Don't show error message for initial load - just log it
            this.syllabusList = [];
            this.displaySyllabus([]);
        }
    }

    // Load courses from syllabus data for filter dropdown
    async loadCoursesForFilter() {
        try {
            if (!window.adminPanel) {
                console.log('AdminPanel not ready for loading courses');
                return;
            }

            // Load courses from syllabus data instead of courses collection
            const uniqueCourses = [...new Set(this.syllabusList.map(s => s.course))];
            const courseFilter = document.getElementById('courseFilter');

            if (courseFilter && uniqueCourses.length > 0) {
                // Clear existing options except "All Courses"
                courseFilter.innerHTML = '<option value="">All Courses</option>';

                uniqueCourses.sort().forEach(courseName => {
                    const option = document.createElement('option');
                    option.value = courseName;
                    option.textContent = courseName;
                    courseFilter.appendChild(option);
                });

                console.log('Loaded courses for filter from syllabus data:', uniqueCourses);
            }
        } catch (error) {
            console.error('Error loading courses for filter:', error);
            this.showMessage('Error loading courses', 'error');
        }
    }

    // Load semesters for selected course
    async loadSemestersForCourse(courseName) {
        try {
            const semesterFilter = document.getElementById('semesterFilter');
            if (!semesterFilter) return;

            // Clear existing options
            semesterFilter.innerHTML = '<option value="">All Semesters</option>';

            if (!courseName) {
                // If no course selected, show all unique semesters from syllabus
                const uniqueSemesters = [...new Set(this.syllabusList.map(s => s.semester))];
                uniqueSemesters.sort().forEach(semester => {
                    const option = document.createElement('option');
                    option.value = semester;
                    option.textContent = semester;
                    semesterFilter.appendChild(option);
                });
                return;
            }

            // Get semesters for the selected course from syllabus data
            const courseSyllabus = this.syllabusList.filter(s => s.course === courseName);
            const uniqueSemesters = [...new Set(courseSyllabus.map(s => s.semester))];

            uniqueSemesters.sort().forEach(semester => {
                const option = document.createElement('option');
                option.value = semester;
                option.textContent = semester;
                semesterFilter.appendChild(option);
            });

            console.log('Loaded semesters for course:', courseName, uniqueSemesters);
        } catch (error) {
            console.error('Error loading semesters:', error);
            this.showMessage('Error loading semesters', 'error');
        }
    }

    // Apply filters based on selected course and semester
    applyFilters() {
        const courseFilter = document.getElementById('courseFilter');
        const semesterFilter = document.getElementById('semesterFilter');

        const selectedCourse = courseFilter.value;
        const selectedSemester = semesterFilter.value;

        if (!selectedCourse && !selectedSemester) {
            this.showMessage('Please select at least one filter', 'warning');
            return;
        }

        this.showMessage('Loading syllabus...', 'info');

        // Add small delay to ensure UI updates
        setTimeout(() => {
            try {
                this.loadSyllabusByCourseAndSemester(selectedCourse, selectedSemester);
            } catch (error) {
                console.error('Error loading syllabus:', error);
                this.showMessage('Error loading syllabus', 'error');
            }
        }, 100);
    }

    // Filter syllabus by course and semester
    loadSyllabusByCourseAndSemester(courseName, semester) {
        try {
            console.log('Loading syllabus for:', courseName, semester);

            // Filter syllabus based on course and semester
            let filteredSyllabus = this.syllabusList;

            if (courseName) {
                filteredSyllabus = filteredSyllabus.filter(syllabus =>
                    syllabus.course === courseName
                );
            }

            if (semester) {
                filteredSyllabus = filteredSyllabus.filter(syllabus =>
                    syllabus.semester === semester
                );
            }

            console.log('Filtered syllabus:', filteredSyllabus);
            this.filteredSyllabus = filteredSyllabus;

            // Display filtered results
            this.displaySyllabus(filteredSyllabus);

            if (filteredSyllabus.length === 0) {
                this.showMessage('No syllabus found for the selected filters', 'info');
            } else {
                this.showMessage(`Found ${filteredSyllabus.length} syllabus entries`, 'success');
            }

        } catch (error) {
            console.error('Error filtering syllabus:', error);
            this.showMessage('Error filtering syllabus', 'error');
        }
    }

    clearFilters() {
        const courseFilter = document.getElementById('courseFilter');
        const semesterFilter = document.getElementById('semesterFilter');

        if (courseFilter) courseFilter.value = '';
        if (semesterFilter) semesterFilter.value = '';

        // Reset semester options
        this.loadSemestersForCourse('');

        // Display all syllabus
        this.displaySyllabus(this.syllabusList);
        this.showMessage('Filters cleared', 'info');
    }

    displaySyllabus(syllabusList) {
        const resultsContainer = document.getElementById('syllabusResults');
        const noResultsDiv = document.getElementById('noResults');

        if (!resultsContainer) return;

        if (syllabusList.length === 0) {
            resultsContainer.innerHTML = '';
            if (noResultsDiv) noResultsDiv.style.display = 'block';
            return;
        }

        if (noResultsDiv) noResultsDiv.style.display = 'none';

        // Group syllabus by course and semester
        const groupedSyllabus = this.groupSyllabusByCourseAndSemester(syllabusList);

        resultsContainer.innerHTML = '';

        Object.keys(groupedSyllabus).forEach(courseKey => {
            Object.keys(groupedSyllabus[courseKey]).forEach(semesterKey => {
                const syllabusEntry = groupedSyllabus[courseKey][semesterKey];
                const syllabusCard = this.createSyllabusCard(syllabusEntry);
                resultsContainer.appendChild(syllabusCard);
            });
        });
    }

    groupSyllabusByCourseAndSemester(syllabusList) {
        const grouped = {};

        syllabusList.forEach(syllabus => {
            const course = syllabus.course;
            const semester = syllabus.semester;

            if (!grouped[course]) {
                grouped[course] = {};
            }

            if (!grouped[course][semester]) {
                grouped[course][semester] = syllabus;
            }
        });

        return grouped;
    }

    createSyllabusCard(syllabusEntry) {
        const card = document.createElement('div');
        card.className = 'syllabus-card';
        card.setAttribute('data-syllabus-id', syllabusEntry.id);

        const subjectsHtml = syllabusEntry.subjects.map((subject, index) => `
            <div class="subject-item">
                <div class="subject-header">
                    <h4 class="subject-title">${subject.name} (${subject.code})</h4>
                    <div class="subject-meta">
                        <span class="meta-item">Credits: ${subject.credits || 'N/A'}</span>
                        <span class="meta-item">Marks: ${subject.marks || 'N/A'}</span>
                    </div>
                </div>
                <div class="subject-content">
                    <div class="syllabus-content">${subject.content}</div>
                </div>
            </div>
        `).join('');

        card.innerHTML = `
            <div class="syllabus-card-header">
                <div class="syllabus-card-info">
                    <h3 class="syllabus-card-title">${syllabusEntry.course} - ${syllabusEntry.semester}</h3>
                    <div class="syllabus-card-meta">
                        <span class="meta-item">
                            <i class="fas fa-graduation-cap"></i>
                            ${syllabusEntry.course}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-calendar"></i>
                            ${syllabusEntry.semester}
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-book"></i>
                            ${syllabusEntry.subjects.length} Subject${syllabusEntry.subjects.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                <div class="syllabus-card-actions">
                    <button class="btn-syllabus-edit" onclick="editSyllabus('${syllabusEntry.id}')">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="btn-syllabus-delete" onclick="deleteSyllabus('${syllabusEntry.id}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
            <div class="syllabus-card-content">
                <div class="subjects-list">
                    ${subjectsHtml}
                </div>
                ${syllabusEntry.referenceBooks ? `
                    <div class="reference-books-section">
                        <h4 class="reference-title">
                            <i class="fas fa-book-open"></i>
                            Reference Books
                        </h4>
                        <div class="reference-content">${syllabusEntry.referenceBooks}</div>
                    </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    async exportFilteredSyllabus() {
        try {
            const dataToExport = this.filteredSyllabus.length > 0 ? this.filteredSyllabus : this.syllabusList;

            if (dataToExport.length === 0) {
                this.showMessage('No syllabus data to export', 'warning');
                return;
            }

            if (typeof Papa === 'undefined') {
                this.showMessage('CSV export library not available', 'error');
                return;
            }

            const csvData = dataToExport.map(item => ({
                course: item.course,
                semester: item.semester,
                subjects: JSON.stringify(item.subjects || []),
                referenceBooks: item.referenceBooks
            }));

            const csv = Papa.unparse(csvData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');

            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `syllabus_export_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                this.showMessage('Syllabus data exported successfully', 'success');
            }
        } catch (error) {
            console.error('Error exporting syllabus:', error);
            this.showMessage('Error exporting syllabus data', 'error');
        }
    }
}

// Global functions for button actions
function editSyllabus(syllabusId) {
    // Redirect to syllabus.html with edit parameter
    window.location.href = `syllabus.html?edit=${syllabusId}`;
}

async function deleteSyllabus(syllabusId) {
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Delete Syllabus?',
            text: 'This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await window.adminPanel.deleteData('syllabus', syllabusId);

                // Refresh the view
                if (window.viewSyllabusManager) {
                    await window.viewSyllabusManager.loadAllSyllabus();
                }

                Swal.fire({
                    title: 'Deleted!',
                    text: 'Syllabus has been deleted successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Error deleting syllabus:', error);
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete syllabus.',
                    icon: 'error'
                });
            }
        }
    } else {
        if (confirm('Are you sure you want to delete this syllabus?')) {
            try {
                await window.adminPanel.deleteData('syllabus', syllabusId);
                if (window.viewSyllabusManager) {
                    await window.viewSyllabusManager.loadAllSyllabus();
                }
                alert('Syllabus deleted successfully');
            } catch (error) {
                console.error('Error deleting syllabus:', error);
                alert('Error deleting syllabus');
            }
        }
    }
}

// Initialize view syllabus page functionality
function initializeViewSyllabusPage() {
    console.log('Initializing View Syllabus Page...');

    // Initialize the view syllabus manager
    setTimeout(() => {
        window.viewSyllabusManager = new ViewSyllabusManager();
    }, 100);
}

// Export functions for global access
window.ViewSyllabusPage = {
    initializeViewSyllabusPage
};

// Initialize syllabus manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        if (window.location.pathname.includes('view-syllabus')) {
            // Initialize view syllabus manager for view page
            window.viewSyllabusManager = new ViewSyllabusManager();
        } else {
            // Initialize regular syllabus manager for add/edit page
            window.syllabusManager = new SyllabusManager();
        }
    }, 100);
});