/**
 * College Information Management Module
 * Handles all college info-related functionality for the admin panel
 *
 * This module provides:
 * - College Info CRUD operations (Create, Read, Update, Delete)
 * - College Info form validation
 * - Integration with AdminPanel for database operations
 * - CSV export functionality
 * - Tabulator table for college info display
 *
 * Dependencies:
 * - AdminPanel class (for database operations)
 * - SweetAlert2 (for dialogs)
 * - Toastify (for notifications)
 * - Tabulator (for data display)
 */

class CollegeInfoManager {
    constructor() {
        this.collegeInfo = [];
        this.currentEditingCollegeInfo = null;
        this.collegeInfoTable = null;
        
        // Initialize asynchronously
        this.init().catch(error => {
            console.error('Error initializing CollegeInfoManager:', error);
        });
    }

    async init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.initializeCollegeInfoTable();
        
        // Load college info data if AdminPanel is available
        if (window.adminPanel) {
            try {
                await this.loadCollegeInfo();
            } catch (error) {
                console.log('Could not load college info initially:', error);
            }
        }
    }

    setupEventListeners() {
        // College info form submission
        document.getElementById('collegeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCollegeInfo();
        });

        // Import CSV button
        document.getElementById('importCollegeInfoBtn')?.addEventListener('click', () => {
            this.showBulkImportDialog();
        });

        // Export CSV button
        document.getElementById('exportCollegeInfoBtn')?.addEventListener('click', () => {
            this.exportCollegeInfoCSV();
        });

        // College info form reset
        document.getElementById('resetCollegeBtn')?.addEventListener('click', () => {
            this.resetForm();
        });

        // Add college info button
        document.getElementById('addCollegeBtn')?.addEventListener('click', () => {
            this.resetForm();
        });
    }

    setupFormValidation() {
        const form = document.getElementById('collegeForm');
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
            case 'collegeName':
                if (!value) {
                    isValid = false;
                    errorMessage = 'College name is required';
                }
                break;
            case 'establishedYear':
                if (!value || isNaN(value) || parseInt(value) < 1800 || parseInt(value) > 2030) {
                    isValid = false;
                    errorMessage = 'Valid established year is required';
                }
                break;
            case 'affiliation':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Affiliation is required';
                }
                break;
            case 'address':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Address is required';
                }
                break;
            case 'contactPhone':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Contact phone is required';
                }
                break;
            case 'contactEmail':
                if (!value || !this.isValidEmail(value)) {
                    isValid = false;
                    errorMessage = 'Valid contact email is required';
                }
                break;
            case 'principalName':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Principal name is required';
                }
                break;
        }

        this.showFieldError(field, isValid, errorMessage);
        return isValid;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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

    async loadCollegeInfo() {
        try {
            if (!window.adminPanel) {
                throw new Error('AdminPanel not available');
            }

            const snapshot = await window.adminPanel.getCollection('college');
            this.collegeInfo = [];

            snapshot.forEach(doc => {
                this.collegeInfo.push({ id: doc.id, ...doc.data() });
            });

            this.renderCollegeInfo(this.collegeInfo);
            this.updateCollegeInfoCount();
        } catch (error) {
            console.error('Error loading college info:', error);
            this.showMessage('Error loading college information', 'error');
        }
    }

    renderCollegeInfo(collegeInfo) {
        // Initialize or update Tabulator table for college info
        if (!this.collegeInfoTable) {
            this.initializeCollegeInfoTable();
        }

        // Update table data
        this.collegeInfoTable.setData(collegeInfo);
    }

    initializeCollegeInfoTable() {
        const container = document.getElementById('collegeInfoTable');
        if (!container) return;

        // Initialize Tabulator table
        this.collegeInfoTable = new Tabulator("#collegeInfoTable", {
            height: "400px",
            layout: "fitColumns",
            pagination: "local",
            paginationSize: 10,
            paginationSizeSelector: [5, 10, 20, 50],
            movableColumns: true,
            resizableRows: true,
            selectable: true,
            placeholder: "No college information found. Add your first college info above.",
            columns: [
                {
                    title: "College Name",
                    field: "collegeName",
                    width: 200,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "Established",
                    field: "establishedYear",
                    width: 120,
                    sorter: "number",
                    headerFilter: "input"
                },
                {
                    title: "Affiliation",
                    field: "affiliation",
                    width: 150,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "Principal",
                    field: "principalName",
                    width: 150,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "Contact",
                    field: "contactPhone",
                    width: 130,
                    sorter: "string"
                },
                {
                    title: "Email",
                    field: "contactEmail",
                    width: 200,
                    sorter: "string",
                    headerFilter: "input"
                },
                {
                    title: "Actions",
                    field: "actions",
                    width: 150,
                    formatter: (cell) => {
                        return `
                            <button class="btn btn-sm btn-secondary" onclick="editCollegeInfo('${cell.getRow().getData().id}')" style="margin-right: 5px; padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteCollegeInfo('${cell.getRow().getData().id}')" style="padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        `;
                    },
                    headerSort: false
                }
            ]
        });
    }

    async saveCollegeInfo() {
        try {
            const form = document.getElementById('collegeForm');
            if (!form) {
                throw new Error('College info form not found');
            }

            // Validate form
            if (!this.validateForm(form)) {
                this.showMessage('Please fix the errors in the form', 'error');
                return;
            }

            const formData = new FormData(form);
            const collegeId = formData.get('collegeId');

            const collegeData = {
                collegeName: formData.get('collegeName'),
                establishedYear: parseInt(formData.get('establishedYear')),
                affiliation: formData.get('affiliation'),
                accreditation: formData.get('accreditation') || '',
                address: formData.get('address'),
                contactPhone: formData.get('contactPhone'),
                contactEmail: formData.get('contactEmail'),
                website: formData.get('website') || '',
                principalName: formData.get('principalName'),
                updatedAt: new Date().toISOString()
            };

            if (collegeId) {
                await window.adminPanel.updateData('college', collegeId, collegeData);
                this.showMessage('College information updated successfully');
            } else {
                collegeData.createdAt = new Date().toISOString();
                await window.adminPanel.saveData('college', collegeData);
                this.showMessage('College information added successfully');
            }

            this.resetForm();
            await this.loadCollegeInfo();
        } catch (error) {
            console.error('Error saving college info:', error);
            this.showMessage('Error saving college information', 'error');
        }
    }

    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    resetForm() {
        const form = document.getElementById('collegeForm');
        if (form) {
            form.reset();
            document.getElementById('collegeId').value = '';
            
            // Clear all field errors
            const errorElements = form.querySelectorAll('.field-error');
            errorElements.forEach(error => error.remove());
            
            const errorFields = form.querySelectorAll('.error');
            errorFields.forEach(field => field.classList.remove('error'));
        }
    }

    updateCollegeInfoCount() {
        const countElement = document.getElementById('totalCollegeInfoCount');
        if (countElement) {
            countElement.textContent = this.collegeInfo.length;
        }
    }

    showMessage(message, type = 'success') {
        if (window.adminPanel && window.adminPanel.showMessage) {
            return window.adminPanel.showMessage(message, type);
        }
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    async editCollegeInfo(collegeInfoId) {
        try {
            const collegeInfo = await window.adminPanel.loadData('college');
            const college = collegeInfo.find(c => c.id === collegeInfoId);
            if (college) {
                // Populate edit modal
                document.getElementById('editCollegeInfoId').value = collegeInfoId;
                document.getElementById('editCollegeName').value = college.collegeName || '';
                document.getElementById('editEstablishedYear').value = college.establishedYear || '';
                document.getElementById('editAffiliation').value = college.affiliation || '';
                document.getElementById('editAccreditation').value = college.accreditation || '';
                document.getElementById('editAddress').value = college.address || '';
                document.getElementById('editContactPhone').value = college.contactPhone || '';
                document.getElementById('editContactEmail').value = college.contactEmail || '';
                document.getElementById('editWebsite').value = college.website || '';
                document.getElementById('editPrincipalName').value = college.principalName || '';

                // Show modal
                document.getElementById('editCollegeInfoModal').style.display = 'flex';
            }
        } catch (error) {
            console.error('Error loading college info for edit:', error);
            this.showMessage('Error loading college information', 'error');
        }
    }

    async deleteCollegeInfo(collegeInfoId) {
        const result = await Swal.fire({
            title: 'Delete College Information?',
            text: 'Are you sure you want to delete this college information?',
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
                await window.adminPanel.deleteData('college', collegeInfoId);
                this.showMessage('College information deleted successfully');
                await this.loadCollegeInfo();

                Swal.fire({
                    title: 'Deleted!',
                    text: 'College information has been deleted successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#fff',
                    color: '#333'
                });
            } catch (error) {
                console.error('Error deleting college info:', error);
                this.showMessage('Error deleting college information', 'error');

                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete college information. Please try again.',
                    icon: 'error',
                    background: '#fff',
                    color: '#333'
                });
            }
        }
    }

    exportCollegeInfoCSV() {
        if (this.collegeInfo.length === 0) {
            this.showMessage('No college information to export', 'warning');
            return;
        }

        const csvData = this.collegeInfo.map(college => ({
            'College Name': college.collegeName,
            'Established Year': college.establishedYear,
            'Affiliation': college.affiliation,
            'Accreditation': college.accreditation || '',
            'Address': college.address,
            'Contact Phone': college.contactPhone,
            'Contact Email': college.contactEmail,
            'Website': college.website || '',
            'Principal Name': college.principalName,
            'Created At': college.createdAt,
            'Updated At': college.updatedAt
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `college_info_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showMessage('College information exported successfully');
    }

    showBulkImportDialog() {
        Swal.fire({
            title: 'Import College Information',
            html: `
                <div style="text-align: left;">
                    <p>Upload a CSV file with college information.</p>
                    <p><strong>Required columns:</strong> College Name, Established Year, Affiliation, Address, Contact Phone, Contact Email, Principal Name</p>
                    <p><strong>Optional columns:</strong> Accreditation, Website</p>
                    <input type="file" id="collegeInfoImportFile" accept=".csv" style="margin-top: 10px; width: 100%;">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Import',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const file = document.getElementById('collegeInfoImportFile').files[0];
                if (!file) {
                    Swal.showValidationMessage('Please select a CSV file');
                    return false;
                }
                return file;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.importCollegeInfoFromCSV(result.value);
            }
        });
    }

    importCollegeInfoFromCSV(file) {
        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                try {
                    const collegeInfos = results.data.filter(row =>
                        row['College Name'] && row['Established Year'] && row['Affiliation'] &&
                        row['Address'] && row['Contact Phone'] && row['Contact Email'] && row['Principal Name']
                    );
                    let imported = 0;

                    for (const collegeData of collegeInfos) {
                        const college = {
                            collegeName: collegeData['College Name'],
                            establishedYear: parseInt(collegeData['Established Year']) || new Date().getFullYear(),
                            affiliation: collegeData['Affiliation'],
                            accreditation: collegeData['Accreditation'] || '',
                            address: collegeData['Address'],
                            contactPhone: collegeData['Contact Phone'],
                            contactEmail: collegeData['Contact Email'],
                            website: collegeData['Website'] || '',
                            principalName: collegeData['Principal Name'],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        await window.adminPanel.saveData('college', college);
                        imported++;
                    }

                    await this.loadCollegeInfo();
                    this.showMessage(`Successfully imported ${imported} college information records`);
                } catch (error) {
                    console.error('Error importing college info:', error);
                    this.showMessage('Error importing college information', 'error');
                }
            },
            error: (error) => {
                console.error('CSV parsing error:', error);
                this.showMessage('Error parsing CSV file', 'error');
            }
        });
    }
}

// View College Info Page Manager
class ViewCollegeInfoManager extends CollegeInfoManager {
    constructor() {
        super();
        this.setupEditModalListeners();
    }

    setupEditModalListeners() {
        // Edit form submission
        document.getElementById('editCollegeInfoForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateCollegeInfo();
        });
    }

    async updateCollegeInfo() {
        try {
            const form = document.getElementById('editCollegeInfoForm');
            const collegeInfoId = document.getElementById('editCollegeInfoId').value;

            const collegeData = {
                collegeName: document.getElementById('editCollegeName').value,
                establishedYear: parseInt(document.getElementById('editEstablishedYear').value),
                affiliation: document.getElementById('editAffiliation').value,
                accreditation: document.getElementById('editAccreditation').value || '',
                address: document.getElementById('editAddress').value,
                contactPhone: document.getElementById('editContactPhone').value,
                contactEmail: document.getElementById('editContactEmail').value,
                website: document.getElementById('editWebsite').value || '',
                principalName: document.getElementById('editPrincipalName').value,
                updatedAt: new Date().toISOString()
            };

            await window.adminPanel.updateData('college', collegeInfoId, collegeData);
            this.showMessage('College information updated successfully');

            // Close modal
            document.getElementById('editCollegeInfoModal').style.display = 'none';

            // Reload data
            await this.loadCollegeInfo();
        } catch (error) {
            console.error('Error updating college info:', error);
            this.showMessage('Error updating college information', 'error');
        }
    }
}

// Initialize college info management functionality
function initializeViewCollegeInfoPage() {
    console.log('Initializing View College Info Page...');

    // Initialize the view college info manager
    setTimeout(() => {
        window.viewCollegeInfoManager = new ViewCollegeInfoManager();
    }, 100);
}

// Export functions for global access
window.ViewCollegeInfoPage = {
    initializeViewCollegeInfoPage
};
