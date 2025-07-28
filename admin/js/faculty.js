/**
 * Faculty Management Module
 * Handles all faculty-related functionality for the admin panel
 *
 * This module provides:
 * - Faculty CRUD operations (Create, Read, Update, Delete)
 * - Faculty form validation
 * - Dynamic faculty member management
 * - Integration with AdminPanel for database operations
 * - CSV export functionality
 * - Tabulator table for faculty display
 *
 * Dependencies:
 * - AdminPanel class (for database operations)
 * - SweetAlert2 (for dialogs)
 * - Toastify (for notifications)
 * - Tabulator (for data display)
 */

class FacultyManager {
    constructor() {
        this.faculty = [];
        this.currentEditingFaculty = null;
        this.facultyTable = null;
        
        // Initialize asynchronously
        this.init().catch(error => {
            console.error('Error initializing FacultyManager:', error);
        });
    }

    async init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.initializeFacultyTable();
        
        // Load faculty data if AdminPanel is available
        if (window.adminPanel) {
            try {
                await this.loadFaculty();
            } catch (error) {
                console.log('Could not load faculty initially:', error);
            }
        }
    }

    setupEventListeners() {
        // Faculty form submission
        document.getElementById('facultyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFaculty();
        });

        // Import CSV button
        document.getElementById('importFacultyBtn')?.addEventListener('click', () => {
            this.showBulkImportDialog();
        });

        // Export CSV button
        document.getElementById('exportFacultyBtn')?.addEventListener('click', () => {
            this.exportFacultyCSV();
        });

        // Faculty form reset
        document.getElementById('resetFacultyBtn')?.addEventListener('click', () => {
            this.resetForm();
        });

        // Add faculty button
        document.getElementById('addFacultyBtn')?.addEventListener('click', () => {
            this.resetForm();
        });

        // Add faculty member button
        document.getElementById('addFacultyMember')?.addEventListener('click', () => {
            this.addFacultyMember();
        });
    }

    setupFormValidation() {
        const form = document.getElementById('facultyForm');
        if (!form) return;

        // Add real-time validation
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (field.id) {
            case 'department':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Department is required';
                }
                break;
            case 'hodName':
                if (!value) {
                    isValid = false;
                    errorMessage = 'HOD name is required';
                }
                break;
        }

        // Validate faculty member fields
        if (field.name && field.name.includes('facultyName[]')) {
            if (!value) {
                isValid = false;
                errorMessage = 'Faculty name is required';
            }
        }

        if (field.name && field.name.includes('facultySubject[]')) {
            if (!value) {
                isValid = false;
                errorMessage = 'Subject is required';
            }
        }

        this.showFieldError(field, isValid, errorMessage);
        return isValid;
    }

    showFieldError(field, isValid, errorMessage) {
        const errorElement = field.parentNode.querySelector('.field-error');
        
        if (!isValid) {
            field.classList.add('error');
            if (!errorElement) {
                const error = document.createElement('span');
                error.className = 'field-error';
                error.textContent = errorMessage;
                field.parentNode.appendChild(error);
            } else {
                errorElement.textContent = errorMessage;
            }
        } else {
            field.classList.remove('error');
            if (errorElement) {
                errorElement.remove();
            }
        }
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.remove();
        }
    }

    async loadFaculty() {
        try {
            if (!window.adminPanel) {
                throw new Error('AdminPanel not available');
            }

            const snapshot = await window.adminPanel.getCollection('faculty');
            this.faculty = [];

            snapshot.forEach(doc => {
                this.faculty.push({ id: doc.id, ...doc.data() });
            });

            this.renderFaculty(this.faculty);
            this.updateFacultyCount();
        } catch (error) {
            console.error('Error loading faculty:', error);
            this.showMessage('Error loading faculty information', 'error');
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
        const container = document.getElementById('facultyTable');
        if (!container) return;

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
                        if (value && value.length > 0) {
                            return value.map(f => f.name).join(', ');
                        }
                        return '-';
                    }
                },
                {
                    title: "Actions",
                    field: "actions",
                    width: 150,
                    formatter: (cell) => {
                        return `
                            <button class="btn btn-sm btn-secondary" onclick="editFaculty('${cell.getRow().getData().id}')" style="margin-right: 5px; padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteFaculty('${cell.getRow().getData().id}')" style="padding: 4px 8px; font-size: 12px;">
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
        const container = document.getElementById('facultyMembersList') || document.getElementById('editFacultyMembersList');
        if (!container) return;

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
            if (!form) {
                throw new Error('Faculty form not found');
            }

            // Validate form
            if (!this.validateForm(form)) {
                this.showMessage('Please fix the errors in the form', 'error');
                return;
            }

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
                await window.adminPanel.updateData('faculty', facultyId, facultyData);
                this.showMessage('Faculty information updated successfully');
            } else {
                facultyData.createdAt = new Date().toISOString();
                await window.adminPanel.saveData('faculty', facultyData);
                this.showMessage('Faculty information added successfully');
            }

            this.resetForm();
            await this.loadFaculty();
        } catch (error) {
            console.error('Error saving faculty:', error);
            this.showMessage('Error saving faculty information', 'error');
        }
    }

    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    resetForm() {
        const form = document.getElementById('facultyForm');
        if (form) {
            form.reset();
            document.getElementById('facultyId').value = '';
            
            // Clear all field errors
            const errorElements = form.querySelectorAll('.field-error');
            errorElements.forEach(error => error.remove());
            
            const errorFields = form.querySelectorAll('.error');
            errorFields.forEach(field => field.classList.remove('error'));

            // Reset faculty members list to one empty member
            const container = document.getElementById('facultyMembersList');
            if (container) {
                container.innerHTML = `
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
            }
        }
    }

    updateFacultyCount() {
        const countElement = document.getElementById('totalFacultyCount');
        if (countElement) {
            countElement.textContent = this.faculty.length;
        }
    }

    showMessage(message, type = 'success') {
        if (window.adminPanel && window.adminPanel.showMessage) {
            return window.adminPanel.showMessage(message, type);
        }
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    async editFaculty(facultyId) {
        try {
            const faculty = await window.adminPanel.loadData('faculty');
            const facultyData = faculty.find(f => f.id === facultyId);
            if (facultyData) {
                // Populate edit modal
                document.getElementById('editFacultyId').value = facultyId;
                document.getElementById('editDepartment').value = facultyData.department || '';
                document.getElementById('editHodName').value = facultyData.hodName || '';

                // Populate faculty members
                const container = document.getElementById('editFacultyMembersList');
                if (container && facultyData.facultyList) {
                    container.innerHTML = '';
                    facultyData.facultyList.forEach(member => {
                        this.addEditFacultyMember(member);
                    });
                }

                // Show modal
                document.getElementById('editFacultyModal').style.display = 'flex';
            }
        } catch (error) {
            console.error('Error loading faculty for edit:', error);
            this.showMessage('Error loading faculty information', 'error');
        }
    }

    addEditFacultyMember(memberData = null) {
        const container = document.getElementById('editFacultyMembersList');
        if (!container) return;

        const memberDiv = document.createElement('div');
        memberDiv.className = 'faculty-member';
        memberDiv.innerHTML = `
            <div class="form-grid">
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" name="editFacultyName[]" value="${memberData ? memberData.name : ''}" required>
                </div>
                <div class="form-group">
                    <label>Subject *</label>
                    <input type="text" name="editFacultySubject[]" value="${memberData ? memberData.subject : ''}" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="editFacultyEmail[]" value="${memberData ? memberData.email : ''}">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" name="editFacultyPhone[]" value="${memberData ? memberData.phone : ''}">
                </div>
                <div class="form-group">
                    <label>Qualification</label>
                    <input type="text" name="editFacultyQualification[]" value="${memberData ? memberData.qualification : ''}">
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

    async deleteFaculty(facultyId) {
        const result = await Swal.fire({
            title: 'Delete Faculty Department?',
            text: 'Are you sure you want to delete this faculty department?',
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
                await window.adminPanel.deleteData('faculty', facultyId);
                this.showMessage('Faculty department deleted successfully');
                await this.loadFaculty();

                Swal.fire({
                    title: 'Deleted!',
                    text: 'Faculty department has been deleted successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#fff',
                    color: '#333'
                });
            } catch (error) {
                console.error('Error deleting faculty:', error);
                this.showMessage('Error deleting faculty department', 'error');

                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete faculty department. Please try again.',
                    icon: 'error',
                    background: '#fff',
                    color: '#333'
                });
            }
        }
    }

    exportFacultyCSV() {
        if (this.faculty.length === 0) {
            this.showMessage('No faculty data to export', 'warning');
            return;
        }

        const csvData = [];
        this.faculty.forEach(dept => {
            if (dept.facultyList && dept.facultyList.length > 0) {
                dept.facultyList.forEach(member => {
                    csvData.push({
                        Department: dept.department,
                        HOD: dept.hodName,
                        'Faculty Name': member.name,
                        Subject: member.subject,
                        Email: member.email || '',
                        Phone: member.phone || '',
                        Qualification: member.qualification || '',
                        'Created At': dept.createdAt,
                        'Updated At': dept.updatedAt
                    });
                });
            } else {
                csvData.push({
                    Department: dept.department,
                    HOD: dept.hodName,
                    'Faculty Name': '',
                    Subject: '',
                    Email: '',
                    Phone: '',
                    Qualification: '',
                    'Created At': dept.createdAt,
                    'Updated At': dept.updatedAt
                });
            }
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `faculty_data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showMessage('Faculty data exported successfully');
    }

    showBulkImportDialog() {
        Swal.fire({
            title: 'Import Faculty Data',
            html: `
                <div style="text-align: left;">
                    <p>Upload a CSV file with faculty data.</p>
                    <p><strong>Required columns:</strong> Department, HOD, Faculty Name, Subject</p>
                    <p><strong>Optional columns:</strong> Email, Phone, Qualification</p>
                    <input type="file" id="facultyImportFile" accept=".csv" style="margin-top: 10px; width: 100%;">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Import',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const file = document.getElementById('facultyImportFile').files[0];
                if (!file) {
                    Swal.showValidationMessage('Please select a CSV file');
                    return false;
                }
                return file;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.importFacultyFromCSV(result.value);
            }
        });
    }

    importFacultyFromCSV(file) {
        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                try {
                    const facultyData = {};

                    // Group faculty members by department
                    results.data.forEach(row => {
                        if (row.Department && row.HOD) {
                            if (!facultyData[row.Department]) {
                                facultyData[row.Department] = {
                                    department: row.Department,
                                    hodName: row.HOD,
                                    facultyList: []
                                };
                            }

                            if (row['Faculty Name'] && row.Subject) {
                                facultyData[row.Department].facultyList.push({
                                    name: row['Faculty Name'],
                                    subject: row.Subject,
                                    email: row.Email || '',
                                    phone: row.Phone || '',
                                    qualification: row.Qualification || ''
                                });
                            }
                        }
                    });

                    let imported = 0;
                    for (const dept of Object.values(facultyData)) {
                        dept.createdAt = new Date().toISOString();
                        dept.updatedAt = new Date().toISOString();
                        await window.adminPanel.saveData('faculty', dept);
                        imported++;
                    }

                    await this.loadFaculty();
                    this.showMessage(`Successfully imported ${imported} faculty departments`);
                } catch (error) {
                    console.error('Error importing faculty:', error);
                    this.showMessage('Error importing faculty data', 'error');
                }
            },
            error: (error) => {
                console.error('CSV parsing error:', error);
                this.showMessage('Error parsing CSV file', 'error');
            }
        });
    }
}

// View Faculty Page Manager
class ViewFacultyManager extends FacultyManager {
    constructor() {
        super();
        this.setupEditModalListeners();
    }

    setupEditModalListeners() {
        // Edit form submission
        document.getElementById('editFacultyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateFaculty();
        });
    }

    async updateFaculty() {
        try {
            const form = document.getElementById('editFacultyForm');
            const formData = new FormData(form);
            const facultyId = document.getElementById('editFacultyId').value;

            // Collect faculty members from edit form
            const facultyNames = formData.getAll('editFacultyName[]');
            const facultySubjects = formData.getAll('editFacultySubject[]');
            const facultyEmails = formData.getAll('editFacultyEmail[]');
            const facultyPhones = formData.getAll('editFacultyPhone[]');
            const facultyQualifications = formData.getAll('editFacultyQualification[]');

            const facultyList = facultyNames.map((name, index) => ({
                name: name,
                subject: facultySubjects[index] || '',
                email: facultyEmails[index] || '',
                phone: facultyPhones[index] || '',
                qualification: facultyQualifications[index] || ''
            })).filter(member => member.name.trim() !== '');

            const facultyData = {
                department: document.getElementById('editDepartment').value,
                hodName: document.getElementById('editHodName').value,
                facultyList: facultyList,
                updatedAt: new Date().toISOString()
            };

            await window.adminPanel.updateData('faculty', facultyId, facultyData);
            this.showMessage('Faculty information updated successfully');

            // Close modal
            document.getElementById('editFacultyModal').style.display = 'none';

            // Reload data
            await this.loadFaculty();
        } catch (error) {
            console.error('Error updating faculty:', error);
            this.showMessage('Error updating faculty information', 'error');
        }
    }
}

// Initialize faculty management functionality
function initializeViewFacultyPage() {
    console.log('Initializing View Faculty Page...');

    // Initialize the view faculty manager
    setTimeout(() => {
        window.viewFacultyManager = new ViewFacultyManager();
    }, 100);
}

// Export functions for global access
window.ViewFacultyPage = {
    initializeViewFacultyPage
};
