/**
 * Notice Management Module
 * Handles all notice-related functionality for the admin panel
 *
 * This module provides:
 * - Notice CRUD operations (Create, Read, Update, Delete)
 * - Quill.js rich text editor integration
 * - File upload functionality
 * - Notice form validation
 * - Integration with AdminPanel for database operations
 * - CSV export functionality
 *
 * Dependencies:
 * - AdminPanel class (for database operations)
 * - Quill.js (for rich text editing)
 * - SweetAlert2 (for dialogs)
 * - Toastify (for notifications)
 * - Tabulator (for data display)
 */

class NoticeManager {
    constructor() {
        this.notices = [];
        this.quillEditor = null;
        this.currentEditingNotice = null;
        this.noticesTable = null;
        
        // Initialize asynchronously
        this.init().catch(error => {
            console.error('Error initializing NoticeManager:', error);
        });
    }

    async init() {
        this.setupQuillEditor();
        this.setupEventListeners();
        this.setupFormValidation();
        this.initializeNoticesTable();
        this.populateCurrentDateTime();
        this.populatePostedBy();
        
        // Load notices data if AdminPanel is available
        if (window.adminPanel) {
            try {
                await this.loadNotices();
                await this.populateTargetAudienceOptions();
            } catch (error) {
                console.log('Could not load notices initially:', error);
            }
        }
    }

    setupQuillEditor() {
        const quillContainer = document.getElementById('quillEditor');
        if (quillContainer) {
            this.quillEditor = new Quill('#quillEditor', {
                theme: 'snow',
                placeholder: 'Write your notice description here...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['link', 'blockquote', 'code-block'],
                        ['clean']
                    ]
                }
            });

            // Sync Quill content with hidden textarea
            this.quillEditor.on('text-change', () => {
                const content = this.quillEditor.root.innerHTML;
                document.getElementById('noticeDescription').value = content;
            });
        }
    }

    setupEventListeners() {
        // Notice form submission
        document.getElementById('noticeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNotice();
        });

        // Import CSV button
        document.getElementById('bulkImportBtn')?.addEventListener('click', () => {
            this.showBulkImportDialog();
        });

        // Export CSV button
        document.getElementById('bulkExportBtn')?.addEventListener('click', () => {
            this.exportNoticesCSV();
        });

        // View All Notices button
        document.getElementById('viewAllNoticesBtn')?.addEventListener('click', () => {
            this.scrollToNoticesTable();
        });

        // Notice form reset
        document.getElementById('resetNoticeBtn')?.addEventListener('click', () => {
            this.resetForm();
        });

        // File upload progress
        document.getElementById('attachmentFile')?.addEventListener('change', (e) => {
            this.handleFileSelection(e);
        });
    }

    setupFormValidation() {
        const requiredFields = ['noticeTitle', 'publishDateTime', 'targetAudience', 'postedBy'];

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                // Validate on blur
                field.addEventListener('blur', () => {
                    this.validateSingleField(fieldId);
                });

                // Clear error on input
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

    populateCurrentDateTime() {
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        
        const publishDateTimeField = document.getElementById('publishDateTime');
        if (publishDateTimeField) {
            publishDateTimeField.value = localDateTime;
        }
    }

    populatePostedBy() {
        // Get current admin user info from AdminPanel or localStorage and set as placeholder
        const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
        const postedByField = document.getElementById('postedBy');

        if (postedByField && !postedByField.value) {
            const displayName = adminUser.displayName || adminUser.email || 'Admin User';
            postedByField.value = displayName;
        }
    }

    // No longer needed since targetAudience is now a text input
    async populateTargetAudienceOptions() {
        // This method is no longer needed since we're using a text input
        // but keeping it for backward compatibility
        console.log('Target audience is now a manual text input field');
    }

    initializeNoticesTable() {
        const tableContainer = document.getElementById('noticesTable');
        if (!tableContainer) return;

        this.noticesTable = new Tabulator('#noticesTable', {
            layout: 'fitColumns',
            responsiveLayout: 'hide',
            pagination: 'local',
            paginationSize: 10,
            paginationSizeSelector: [5, 10, 20, 50],
            movableColumns: true,
            resizableRows: true,
            selectable: false,
            placeholder: 'No notices found',
            columns: [
                {
                    title: 'Title',
                    field: 'title',
                    minWidth: 200,
                    headerFilter: 'input',
                    formatter: (cell) => {
                        const value = cell.getValue();
                        return `<div class="notice-title-cell" title="${value}">${value}</div>`;
                    }
                },
                {
                    title: 'Target Audience',
                    field: 'targetAudience',
                    minWidth: 150,
                    headerFilter: 'input',
                    formatter: (cell) => {
                        const audience = cell.getValue() || '';
                        return audience.length > 30 ? audience.substring(0, 30) + '...' : audience;
                    }
                },
                {
                    title: 'Published',
                    field: 'publishDateTime',
                    minWidth: 120,
                    sorter: 'datetime',
                    formatter: (cell) => {
                        const date = new Date(cell.getValue());
                        return date.toLocaleDateString() + '<br><small>' + date.toLocaleTimeString() + '</small>';
                    }
                },
                {
                    title: 'Posted By',
                    field: 'postedBy',
                    minWidth: 120,
                    headerFilter: 'input'
                },
                {
                    title: 'Status',
                    field: 'status',
                    minWidth: 100,
                    formatter: (cell) => {
                        const status = this.getNoticeStatus(cell.getRow().getData());
                        const statusClass = status === 'Active' ? 'status-active' : 
                                          status === 'Expired' ? 'status-expired' : 'status-scheduled';
                        return `<span class="notice-status ${statusClass}">${status}</span>`;
                    }
                },
                {
                    title: 'Actions',
                    field: 'actions',
                    minWidth: 120,
                    headerSort: false,
                    formatter: () => {
                        return `
                            <div class="action-buttons">
                                <button class="btn-edit" title="Edit Notice">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-view" title="View Notice">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-delete" title="Delete Notice">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                    },
                    cellClick: (e, cell) => {
                        e.stopPropagation();
                        const target = e.target.closest('button');
                        if (!target) return;

                        const rowData = cell.getRow().getData();
                        
                        if (target.classList.contains('btn-edit')) {
                            this.editNotice(rowData);
                        } else if (target.classList.contains('btn-view')) {
                            this.viewNotice(rowData);
                        } else if (target.classList.contains('btn-delete')) {
                            this.deleteNotice(rowData);
                        }
                    }
                }
            ]
        });
    }

    getNoticeStatus(notice) {
        const now = new Date();
        const publishDate = new Date(notice.publishDateTime);
        const expiryDate = notice.expiryDate ? new Date(notice.expiryDate) : null;

        if (publishDate > now) {
            return 'Scheduled';
        } else if (expiryDate && expiryDate < now) {
            return 'Expired';
        } else {
            return 'Active';
        }
    }

    async loadNotices() {
        if (!window.adminPanel) {
            console.error('AdminPanel not available');
            return;
        }

        try {
            this.notices = await window.adminPanel.loadData('notices');
            this.updateNoticesTable();
            this.updateNoticesStats();
        } catch (error) {
            console.error('Error loading notices:', error);
            this.showToast('Error loading notices', 'error');
        }
    }

    updateNoticesTable() {
        if (this.noticesTable) {
            this.noticesTable.setData(this.notices);
        }
    }

    updateNoticesStats() {
        const totalNotices = this.notices.length;
        const activeNotices = this.notices.filter(notice =>
            this.getNoticeStatus(notice) === 'Active'
        ).length;

        document.getElementById('totalNotices').textContent = totalNotices;
        document.getElementById('activeNotices').textContent = activeNotices;
    }

    validateSingleField(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return true;

        let isValid = true;
        let errorMessage = '';

        // Remove existing error
        field.classList.remove('error');
        const existingError = document.getElementById(`${fieldId}-error`);
        if (existingError) {
            existingError.remove();
        }

        // Validate based on field type
        switch (fieldId) {
            case 'noticeTitle':
                if (!field.value.trim()) {
                    errorMessage = 'Notice title is required';
                    isValid = false;
                } else if (field.value.trim().length < 5) {
                    errorMessage = 'Notice title must be at least 5 characters';
                    isValid = false;
                }
                break;

            case 'publishDateTime':
                if (!field.value) {
                    errorMessage = 'Publish date and time is required';
                    isValid = false;
                }
                break;

            case 'targetAudience':
                if (!field.value.trim()) {
                    errorMessage = 'Target audience is required';
                    isValid = false;
                } else if (field.value.trim().length < 3) {
                    errorMessage = 'Target audience must be at least 3 characters';
                    isValid = false;
                }
                break;

            case 'postedBy':
                if (!field.value.trim()) {
                    errorMessage = 'Posted by field is required';
                    isValid = false;
                } else if (field.value.trim().length < 2) {
                    errorMessage = 'Posted by must be at least 2 characters';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            field.classList.add('error');
            const errorElement = document.createElement('div');
            errorElement.id = `${fieldId}-error`;
            errorElement.className = 'field-error';
            errorElement.textContent = errorMessage;
            field.parentNode.appendChild(errorElement);
        }

        return isValid;
    }

    validateForm() {
        const requiredFields = ['noticeTitle', 'publishDateTime', 'targetAudience'];
        let isValid = true;

        // Validate each required field
        requiredFields.forEach(fieldId => {
            if (!this.validateSingleField(fieldId)) {
                isValid = false;
            }
        });

        // Validate Quill editor content
        if (this.quillEditor) {
            const content = this.quillEditor.getText().trim();
            if (!content || content.length < 10) {
                this.showToast('Notice description must be at least 10 characters', 'error');
                isValid = false;
            }
        }

        return isValid;
    }

    async saveNotice() {
        if (!this.validateForm()) {
            return;
        }

        if (!window.adminPanel) {
            this.showToast('AdminPanel not available', 'error');
            return;
        }

        const submitBtn = document.querySelector('.btn-save-notice');
        const originalText = submitBtn.innerHTML;

        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';

            // Collect form data
            const formData = this.collectFormData();

            // Upload file if present
            if (formData.attachmentFile) {
                formData.attachmentUrl = await this.uploadFile(formData.attachmentFile);
                delete formData.attachmentFile; // Remove file object from data
            }

            // Save to localStorage
            const noticeId = formData.id || null;
            if (noticeId) {
                // Update existing notice
                await window.adminPanel.updateData('notices', noticeId, formData);
                this.showToast('Notice updated successfully!', 'success');
            } else {
                // Create new notice
                formData.createdAt = new Date().toISOString();
                await window.adminPanel.saveData('notices', formData);
                this.showToast('Notice published successfully!', 'success');
            }

            // Reload notices and reset form
            await this.loadNotices();
            this.resetForm();

        } catch (error) {
            console.error('Error saving notice:', error);
            this.showToast('Error saving notice: ' + error.message, 'error');
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    collectFormData() {
        const form = document.getElementById('noticeForm');
        const formData = new FormData(form);

        const data = {
            id: formData.get('noticeId') || null,
            title: formData.get('noticeTitle').trim(),
            description: this.quillEditor ? this.quillEditor.root.innerHTML : '',
            publishDateTime: formData.get('publishDateTime'),
            expiryDate: formData.get('expiryDate') || null,
            postedBy: formData.get('postedBy').trim(),
            targetAudience: formData.get('targetAudience').trim(),
            attachmentFile: formData.get('attachmentFile').size > 0 ? formData.get('attachmentFile') : null,
            updatedAt: new Date().toISOString()
        };

        return data;
    }

    async uploadFile(file) {
        if (!file || file.size === 0) return null;

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error('File size must be less than 10MB');
        }

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedTypes.includes(file.type)) {
            throw new Error('File type not supported. Please use PDF, Images, or Word documents.');
        }

        try {
            // Show upload progress
            this.showUploadProgress(true);

            // Upload file to localStorage
            const timestamp = Date.now();
            const fileName = `notices/${timestamp}_${file.name}`;

            const uploadResult = await window.adminPanel.uploadFile(file, fileName, (progress) => {
                this.updateUploadProgress(progress);
            });

            this.showUploadProgress(false);
            return uploadResult.downloadURL;

        } catch (error) {
            this.showUploadProgress(false);
            throw new Error('File upload failed: ' + error.message);
        }
    }

    showUploadProgress(show) {
        const progressContainer = document.getElementById('uploadProgress');
        if (progressContainer) {
            progressContainer.style.display = show ? 'flex' : 'none';
            if (!show) {
                this.updateUploadProgress(0);
            }
        }
    }

    updateUploadProgress(progress) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }
    }

    handleFileSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file immediately
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showToast('File size must be less than 10MB', 'error');
            event.target.value = '';
            return;
        }

        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedTypes.includes(file.type)) {
            this.showToast('File type not supported. Please use PDF, Images, or Word documents.', 'error');
            event.target.value = '';
            return;
        }

        // Show file info
        const fileInfo = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        this.showToast(fileInfo, 'info');
    }

    resetForm() {
        const form = document.getElementById('noticeForm');
        if (form) {
            form.reset();
        }

        // Reset Quill editor
        if (this.quillEditor) {
            this.quillEditor.setContents([]);
        }

        // Reset file upload progress
        this.showUploadProgress(false);

        // Clear validation errors
        const errorElements = document.querySelectorAll('.field-error');
        errorElements.forEach(element => element.remove());

        const errorFields = document.querySelectorAll('.notice-form-input.error, .notice-form-select.error');
        errorFields.forEach(field => field.classList.remove('error'));

        // Repopulate default values
        this.populateCurrentDateTime();
        this.populatePostedBy();

        // Clear editing state
        this.currentEditingNotice = null;
        document.getElementById('noticeId').value = '';

        // Update form title
        const formTitle = document.querySelector('.notice-form-title');
        if (formTitle) {
            formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Create New Notice';
        }

        // Update submit button
        const submitBtn = document.querySelector('.btn-save-notice');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Publish Notice';
        }
    }

    async editNotice(notice) {
        this.currentEditingNotice = notice;

        // Populate form fields
        document.getElementById('noticeId').value = notice.id;
        document.getElementById('noticeTitle').value = notice.title;
        document.getElementById('publishDateTime').value = notice.publishDateTime;
        document.getElementById('expiryDate').value = notice.expiryDate || '';
        document.getElementById('postedBy').value = notice.postedBy;

        // Set target audience (now a text input)
        const targetAudienceInput = document.getElementById('targetAudience');
        if (targetAudienceInput) {
            targetAudienceInput.value = notice.targetAudience || '';
        }

        // Set Quill editor content
        if (this.quillEditor && notice.description) {
            this.quillEditor.root.innerHTML = notice.description;
        }

        // Update form title and button
        const formTitle = document.querySelector('.notice-form-title');
        if (formTitle) {
            formTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Notice';
        }

        const submitBtn = document.querySelector('.btn-save-notice');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Notice';
        }

        // Scroll to form
        document.getElementById('noticeForm').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    async viewNotice(notice) {
        const content = `
            <div class="notice-view-content">
                <div class="notice-view-header">
                    <h3>${notice.title}</h3>
                    <div class="notice-meta">
                        <p><strong>Published:</strong> ${new Date(notice.publishDateTime).toLocaleString()}</p>
                        <p><strong>Posted by:</strong> ${notice.postedBy}</p>
                        <p><strong>Target Audience:</strong> ${notice.targetAudience}</p>
                        ${notice.expiryDate ? `<p><strong>Expires:</strong> ${new Date(notice.expiryDate).toLocaleDateString()}</p>` : ''}
                        <p><strong>Status:</strong> <span class="notice-status ${this.getNoticeStatus(notice).toLowerCase()}">${this.getNoticeStatus(notice)}</span></p>
                    </div>
                </div>
                <div class="notice-view-body">
                    <h4>Description:</h4>
                    <div class="notice-description">${notice.description}</div>
                    ${notice.attachmentUrl ? `
                        <div class="notice-attachment">
                            <h4>Attachment:</h4>
                            <a href="${notice.attachmentUrl}" target="_blank" class="attachment-link">
                                <i class="fas fa-Subjectclip"></i> View Attachment
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        Swal.fire({
            title: 'Notice Details',
            html: content,
            width: '800px',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
                popup: 'notice-view-modal'
            }
        });
    }

    async deleteNotice(notice) {
        const result = await Swal.fire({
            title: 'Delete Notice?',
            text: `Are you sure you want to delete "${notice.title}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await window.adminPanel.deleteData('notices', notice.id);

                // Delete attachment file if exists
                if (notice.attachmentUrl) {
                    try {
                        await window.adminPanel.deleteFile(notice.attachmentUrl);
                    } catch (error) {
                        console.warn('Could not delete attachment file:', error);
                    }
                }

                await this.loadNotices();
                this.showToast('Notice deleted successfully!', 'success');

            } catch (error) {
                console.error('Error deleting notice:', error);
                this.showToast('Error deleting notice: ' + error.message, 'error');
            }
        }
    }

    async exportNoticesCSV() {
        if (this.notices.length === 0) {
            this.showToast('No notices to export', 'warning');
            return;
        }

        try {
            // Prepare data for CSV export
            const csvData = this.notices.map(notice => ({
                'Title': notice.title,
                'Description': this.stripHtml(notice.description),
                'Target Audience': notice.targetAudience,
                'Published Date': new Date(notice.publishDateTime).toLocaleString(),
                'Expiry Date': notice.expiryDate ? new Date(notice.expiryDate).toLocaleDateString() : 'No expiry',
                'Posted By': notice.postedBy,
                'Status': this.getNoticeStatus(notice),
                'Has Attachment': notice.attachmentUrl ? 'Yes' : 'No',
                'Created At': new Date(notice.createdAt).toLocaleString()
            }));

            // Convert to CSV using PapaParse
            const csv = Papa.unparse(csvData);

            // Download CSV file
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `notices_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showToast('Notices exported successfully!', 'success');

        } catch (error) {
            console.error('Error exporting notices:', error);
            this.showToast('Error exporting notices: ' + error.message, 'error');
        }
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    scrollToNoticesTable() {
        const tableContainer = document.getElementById('noticesTable');
        if (tableContainer) {
            tableContainer.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    showBulkImportDialog() {
        Swal.fire({
            title: 'Import Notices from CSV',
            html: `
                <div class="import-options">
                    <div class="import-option">
                        <h4><i class="fas fa-upload"></i> Upload CSV File</h4>
                        <p>Upload a CSV file containing notice data. The file should have the following columns:</p>
                        <ul style="text-align: left; margin: 10px 0; padding-left: 20px;">
                            <li><strong>title</strong> - Notice title (required)</li>
                            <li><strong>description</strong> - Notice description (required)</li>
                            <li><strong>targetAudience</strong> - Target audience (required)</li>
                            <li><strong>postedBy</strong> - Posted by (required)</li>
                            <li><strong>publishDateTime</strong> - Publish date/time (YYYY-MM-DD HH:MM format)</li>
                            <li><strong>expiryDate</strong> - Expiry date (YYYY-MM-DD format, optional)</li>
                        </ul>
                        <input type="file" id="csvFileInput" accept=".csv" style="margin: 10px 0;">
                        <div>
                            <button class="btn-import-file" onclick="window.noticeManager.handleCSVImport()">
                                <i class="fas fa-upload"></i> Import CSV
                            </button>
                        </div>
                    </div>
                    <div class="import-option" style="margin-top: 20px;">
                        <h4><i class="fas fa-download"></i> Download Sample CSV</h4>
                        <p>Download a sample CSV file with the correct format to get started.</p>
                        <button class="btn-download-sample" onclick="window.noticeManager.downloadSampleCSV()">
                            <i class="fas fa-download"></i> Download Sample
                        </button>
                    </div>
                </div>
            `,
            width: '600px',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
                popup: 'import-modal'
            }
        });
    }

    async handleCSVImport() {
        const fileInput = document.getElementById('csvFileInput');
        const file = fileInput?.files[0];

        if (!file) {
            this.showToast('Please select a CSV file', 'error');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showToast('Please select a valid CSV file', 'error');
            return;
        }

        try {
            // Show loading
            Swal.fire({
                title: 'Importing Notices...',
                text: 'Please wait while we process your CSV file.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Read and parse CSV file
            const csvText = await this.readFileAsText(file);
            const parsedData = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim().toLowerCase()
            });

            if (parsedData.errors.length > 0) {
                throw new Error('CSV parsing errors: ' + parsedData.errors.map(e => e.message).join(', '));
            }

            const notices = parsedData.data;
            if (notices.length === 0) {
                throw new Error('No valid data found in CSV file');
            }

            // Validate and process notices
            const validNotices = [];
            const errors = [];

            for (let i = 0; i < notices.length; i++) {
                const notice = notices[i];
                const rowNum = i + 2; // +2 because of header and 0-based index

                try {
                    const validatedNotice = this.validateCSVNotice(notice, rowNum);
                    validNotices.push(validatedNotice);
                } catch (error) {
                    errors.push(`Row ${rowNum}: ${error.message}`);
                }
            }

            if (errors.length > 0 && validNotices.length === 0) {
                throw new Error('No valid notices found:\n' + errors.join('\n'));
            }

            // Show confirmation dialog
            const confirmResult = await Swal.fire({
                title: 'Import Summary',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Valid notices:</strong> ${validNotices.length}</p>
                        ${errors.length > 0 ? `<p><strong>Errors:</strong> ${errors.length}</p>` : ''}
                        ${errors.length > 0 ? `<details><summary>View Errors</summary><pre style="text-align: left; font-size: 12px;">${errors.join('\n')}</pre></details>` : ''}
                        <p>Do you want to import the valid notices?</p>
                    </div>
                `,
                icon: errors.length > 0 ? 'warning' : 'question',
                showCancelButton: true,
                confirmButtonText: 'Import Valid Notices',
                cancelButtonText: 'Cancel'
            });

            if (!confirmResult.isConfirmed) {
                return;
            }

            // Import valid notices
            let successCount = 0;
            let failCount = 0;

            for (const notice of validNotices) {
                try {
                    notice.createdAt = new Date().toISOString();
                    await window.adminPanel.saveData('notices', notice);
                    successCount++;
                } catch (error) {
                    console.error('Error saving notice:', error);
                    failCount++;
                }
            }

            // Show results
            await Swal.fire({
                title: 'Import Complete',
                html: `
                    <p><strong>Successfully imported:</strong> ${successCount} notices</p>
                    ${failCount > 0 ? `<p><strong>Failed:</strong> ${failCount} notices</p>` : ''}
                `,
                icon: failCount > 0 ? 'warning' : 'success'
            });

            // Reload notices table
            await this.loadNotices();
            this.showToast(`Successfully imported ${successCount} notices!`, 'success');

        } catch (error) {
            console.error('CSV import error:', error);
            Swal.fire({
                title: 'Import Failed',
                text: error.message,
                icon: 'error'
            });
        }
    }

    validateCSVNotice(notice, rowNum) {
        const errors = [];

        // Required fields validation
        if (!notice.title || !notice.title.trim()) {
            errors.push('Title is required');
        }
        if (!notice.description || !notice.description.trim()) {
            errors.push('Description is required');
        }
        if (!notice.targetaudience || !notice.targetaudience.trim()) {
            errors.push('Target audience is required');
        }
        if (!notice.postedby || !notice.postedby.trim()) {
            errors.push('Posted by is required');
        }

        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        // Create validated notice object
        const validatedNotice = {
            title: notice.title.trim(),
            description: notice.description.trim(),
            targetAudience: notice.targetaudience.trim(),
            postedBy: notice.postedby.trim(),
            publishDateTime: notice.publishdatetime ?
                this.parseDateTime(notice.publishdatetime) :
                new Date().toISOString().slice(0, 16),
            expiryDate: notice.expirydate ?
                this.parseDate(notice.expirydate) : null,
            attachmentUrl: null // CSV import doesn't support file attachments
        };

        return validatedNotice;
    }

    parseDateTime(dateTimeStr) {
        try {
            // Try to parse various date formats
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date format');
            }
            return date.toISOString().slice(0, 16); // Format for datetime-local input
        } catch (error) {
            // Return current date/time if parsing fails
            return new Date().toISOString().slice(0, 16);
        }
    }

    parseDate(dateStr) {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                return null;
            }
            return date.toISOString().split('T')[0]; // Format for date input
        } catch (error) {
            return null;
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    downloadSampleCSV() {
        const sampleData = [
            {
                title: 'Important Exam Schedule Update',
                description: 'Please note that the mid-term examinations have been rescheduled. Check the updated timetable on the notice board.',
                targetAudience: 'All Students',
                postedBy: 'Academic Office',
                publishDateTime: '2024-01-15 09:00',
                expiryDate: '2024-01-30'
            },
            {
                title: 'Faculty Meeting Notice',
                description: 'Monthly faculty meeting scheduled for next week. All department heads are requested to attend.',
                targetAudience: 'Faculty Only',
                postedBy: 'Principal Office',
                publishDateTime: '2024-01-16 10:00',
                expiryDate: ''
            },
            {
                title: 'BCA Project Submission Deadline',
                description: 'Final year BCA students must submit their project reports by the specified deadline.',
                targetAudience: 'BCA Final Year Students',
                postedBy: 'BCA Department',
                publishDateTime: '2024-01-17 11:00',
                expiryDate: '2024-02-15'
            }
        ];

        const csv = Papa.unparse(sampleData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'notices_sample.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast('Sample CSV downloaded successfully!', 'success');
    }

    showToast(message, type = 'info') {
        if (typeof Toastify !== 'undefined') {
            const backgroundColor = {
                'success': 'linear-gradient(to right, #00b09b, #96c93d)',
                'error': 'linear-gradient(to right, #ff5f6d, #ffc371)',
                'warning': 'linear-gradient(to right, #f093fb, #f5576c)',
                'info': 'linear-gradient(to right, #4facfe, #00f2fe)'
            };

            Toastify({
                text: message,
                duration: 3000,
                gravity: 'top',
                position: 'right',
                style: {
                    background: backgroundColor[type] || backgroundColor['info']
                }
            }).showToast();
        } else {
            // Fallback to console if Toastify is not available
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Initialize NoticeManager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for AdminPanel to be ready
    setTimeout(() => {
        if (typeof NoticeManager !== 'undefined') {
            window.NoticeManager = NoticeManager;
        }
    }, 100);
});
