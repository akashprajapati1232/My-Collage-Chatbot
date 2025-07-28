/**
 * Fee Structure Management Module
 * Handles all fee-related functionality for the admin panel
 *
 * This module provides:
 * - Fee CRUD operations (Create, Read, Update, Delete)
 * - Fee form validation
 * - Integration with AdminPanel for database operations
 * - CSV export functionality
 * - Tabulator table for fee display
 *
 * Dependencies:
 * - AdminPanel class (for database operations)
 * - SweetAlert2 (for dialogs)
 * - Toastify (for notifications)
 * - Tabulator (for data display)
 */

class FeeManager {
    constructor() {
        this.fees = [];
        this.currentEditingFee = null;
        this.feesTable = null;
        
        // Initialize asynchronously
        this.init().catch(error => {
            console.error('Error initializing FeeManager:', error);
        });
    }

    async init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.initializeFeesTable();
        
        // Load fees data if AdminPanel is available
        if (window.adminPanel) {
            try {
                await this.loadFees();
                await this.populateCourseDropdowns();
            } catch (error) {
                console.log('Could not load fees initially:', error);
            }
        }
    }

    setupEventListeners() {
        // Fee form submission
        document.getElementById('feeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveFee();
        });

        // Import CSV button
        document.getElementById('importFeesBtn')?.addEventListener('click', () => {
            this.showBulkImportDialog();
        });

        // Export CSV button
        document.getElementById('exportFeesBtn')?.addEventListener('click', () => {
            this.exportFeesCSV();
        });

        // Fee form reset
        document.getElementById('resetFeeBtn')?.addEventListener('click', () => {
            this.resetForm();
        });

        // Add fee button
        document.getElementById('addFeeBtn')?.addEventListener('click', () => {
            this.resetForm();
        });
    }

    setupFormValidation() {
        const form = document.getElementById('feeForm');
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
            case 'feeCourse':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Course is required';
                }
                break;
            case 'admissionFee':
                if (!value || isNaN(value) || parseInt(value) < 0) {
                    isValid = false;
                    errorMessage = 'Valid admission fee is required';
                }
                break;
            case 'semwiseFee':
                if (!value || isNaN(value) || parseInt(value) < 0) {
                    isValid = false;
                    errorMessage = 'Valid semester fee is required';
                }
                break;
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

    async loadFees() {
        try {
            if (!window.adminPanel) {
                throw new Error('AdminPanel not available');
            }

            const snapshot = await window.adminPanel.getCollection('fees');
            this.fees = [];

            snapshot.forEach(doc => {
                this.fees.push({ id: doc.id, ...doc.data() });
            });

            this.renderFees(this.fees);
            this.updateFeesCount();
        } catch (error) {
            console.error('Error loading fees:', error);
            this.showMessage('Error loading fee structures', 'error');
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
        const container = document.getElementById('feesTable');
        if (!container) return;

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
                    title: "Semester Fee",
                    field: "semwiseFee",
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
                    title: "Actions",
                    field: "actions",
                    width: 150,
                    formatter: (cell) => {
                        return `
                            <button class="btn btn-sm btn-secondary" onclick="editFee('${cell.getRow().getData().id}')" style="margin-right: 5px; padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteFee('${cell.getRow().getData().id}')" style="padding: 4px 8px; font-size: 12px;">
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
            if (!form) {
                throw new Error('Fee form not found');
            }

            // Validate form
            if (!this.validateForm(form)) {
                this.showMessage('Please fix the errors in the form', 'error');
                return;
            }

            const formData = new FormData(form);
            const feeId = formData.get('feeId');

            const feeData = {
                course: formData.get('course'),
                admissionFee: parseInt(formData.get('admissionFee')),
                semwiseFee: parseInt(formData.get('semwiseFee')),
                hostelFee: formData.get('hostelFee') ? parseInt(formData.get('hostelFee')) : null,
                busFee: formData.get('busFee') ? parseInt(formData.get('busFee')) : null,
                scholarshipInfo: formData.get('scholarshipInfo') || '',
                feePaymentLink: formData.get('feePaymentLink') || '',
                updatedAt: new Date().toISOString()
            };

            if (feeId) {
                await window.adminPanel.updateData('fees', feeId, feeData);
                this.showMessage('Fee structure updated successfully');
            } else {
                feeData.createdAt = new Date().toISOString();
                await window.adminPanel.saveData('fees', feeData);
                this.showMessage('Fee structure added successfully');
            }

            this.resetForm();
            await this.loadFees();
        } catch (error) {
            console.error('Error saving fee structure:', error);
            this.showMessage('Error saving fee structure', 'error');
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
        const form = document.getElementById('feeForm');
        if (form) {
            form.reset();
            document.getElementById('feeId').value = '';
            
            // Clear all field errors
            const errorElements = form.querySelectorAll('.field-error');
            errorElements.forEach(error => error.remove());
            
            const errorFields = form.querySelectorAll('.error');
            errorFields.forEach(field => field.classList.remove('error'));
        }
    }

    updateFeesCount() {
        const countElement = document.getElementById('totalFeesCount');
        if (countElement) {
            countElement.textContent = this.fees.length;
        }
    }

    async populateCourseDropdowns() {
        try {
            if (!window.adminPanel) return;

            const courses = await window.adminPanel.loadData('courses');
            const courseSelects = document.querySelectorAll('#feeCourse, #editFeeCourse');
            
            courseSelects.forEach(select => {
                if (select) {
                    // Clear existing options except the first one
                    while (select.children.length > 1) {
                        select.removeChild(select.lastChild);
                    }
                    
                    courses.forEach(course => {
                        const option = document.createElement('option');
                        option.value = course.courseName;
                        option.textContent = course.courseName;
                        select.appendChild(option);
                    });
                }
            });
        } catch (error) {
            console.error('Error populating course dropdowns:', error);
        }
    }

    showMessage(message, type = 'success') {
        if (window.adminPanel && window.adminPanel.showMessage) {
            return window.adminPanel.showMessage(message, type);
        }
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    async editFee(feeId) {
        try {
            const fees = await window.adminPanel.loadData('fees');
            const fee = fees.find(f => f.id === feeId);
            if (fee) {
                // Populate edit modal
                document.getElementById('editFeeId').value = feeId;
                document.getElementById('editFeeCourse').value = fee.course || '';
                document.getElementById('editAdmissionFee').value = fee.admissionFee || '';
                document.getElementById('editSemwiseFee').value = fee.semwiseFee || '';
                document.getElementById('editHostelFee').value = fee.hostelFee || '';
                document.getElementById('editBusFee').value = fee.busFee || '';
                document.getElementById('editScholarshipInfo').value = fee.scholarshipInfo || '';
                document.getElementById('editFeePaymentLink').value = fee.feePaymentLink || '';

                // Show modal
                document.getElementById('editFeeModal').style.display = 'flex';
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
                await window.adminPanel.deleteData('fees', feeId);
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

    exportFeesCSV() {
        if (this.fees.length === 0) {
            this.showMessage('No fee structures to export', 'warning');
            return;
        }

        const csvData = this.fees.map(fee => ({
            Course: fee.course,
            'Admission Fee': fee.admissionFee,
            'Semester Fee': fee.semwiseFee,
            'Hostel Fee': fee.hostelFee || '',
            'Bus Fee': fee.busFee || '',
            'Scholarship Info': fee.scholarshipInfo || '',
            'Payment Link': fee.feePaymentLink || '',
            'Created At': fee.createdAt,
            'Updated At': fee.updatedAt
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `fee_structures_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showMessage('Fee structures exported successfully');
    }

    showBulkImportDialog() {
        Swal.fire({
            title: 'Import Fee Structures',
            html: `
                <div style="text-align: left;">
                    <p>Upload a CSV file with fee structure data.</p>
                    <p><strong>Required columns:</strong> Course, Admission Fee, Semester Fee</p>
                    <p><strong>Optional columns:</strong> Hostel Fee, Bus Fee, Scholarship Info, Payment Link</p>
                    <input type="file" id="feeImportFile" accept=".csv" style="margin-top: 10px; width: 100%;">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Import',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const file = document.getElementById('feeImportFile').files[0];
                if (!file) {
                    Swal.showValidationMessage('Please select a CSV file');
                    return false;
                }
                return file;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.importFeesFromCSV(result.value);
            }
        });
    }

    importFeesFromCSV(file) {
        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                try {
                    const fees = results.data.filter(row => row.Course && row['Admission Fee']);
                    let imported = 0;

                    for (const feeData of fees) {
                        const fee = {
                            course: feeData.Course,
                            admissionFee: parseInt(feeData['Admission Fee']) || 0,
                            semwiseFee: parseInt(feeData['Semester Fee']) || 0,
                            hostelFee: feeData['Hostel Fee'] ? parseInt(feeData['Hostel Fee']) : null,
                            busFee: feeData['Bus Fee'] ? parseInt(feeData['Bus Fee']) : null,
                            scholarshipInfo: feeData['Scholarship Info'] || '',
                            feePaymentLink: feeData['Payment Link'] || '',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        await window.adminPanel.saveData('fees', fee);
                        imported++;
                    }

                    await this.loadFees();
                    this.showMessage(`Successfully imported ${imported} fee structures`);
                } catch (error) {
                    console.error('Error importing fees:', error);
                    this.showMessage('Error importing fee structures', 'error');
                }
            },
            error: (error) => {
                console.error('CSV parsing error:', error);
                this.showMessage('Error parsing CSV file', 'error');
            }
        });
    }
}

// View Fees Page Manager
class ViewFeesManager extends FeeManager {
    constructor() {
        super();
        this.setupEditModalListeners();
    }

    setupEditModalListeners() {
        // Edit form submission
        document.getElementById('editFeeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateFee();
        });
    }

    async updateFee() {
        try {
            const form = document.getElementById('editFeeForm');
            const formData = new FormData(form);
            const feeId = formData.get('editFeeId') || document.getElementById('editFeeId').value;

            const feeData = {
                course: formData.get('editFeeCourse') || document.getElementById('editFeeCourse').value,
                admissionFee: parseInt(formData.get('editAdmissionFee') || document.getElementById('editAdmissionFee').value),
                semwiseFee: parseInt(formData.get('editSemwiseFee') || document.getElementById('editSemwiseFee').value),
                hostelFee: formData.get('editHostelFee') || document.getElementById('editHostelFee').value ?
                    parseInt(formData.get('editHostelFee') || document.getElementById('editHostelFee').value) : null,
                busFee: formData.get('editBusFee') || document.getElementById('editBusFee').value ?
                    parseInt(formData.get('editBusFee') || document.getElementById('editBusFee').value) : null,
                scholarshipInfo: formData.get('editScholarshipInfo') || document.getElementById('editScholarshipInfo').value || '',
                feePaymentLink: formData.get('editFeePaymentLink') || document.getElementById('editFeePaymentLink').value || '',
                updatedAt: new Date().toISOString()
            };

            await window.adminPanel.updateData('fees', feeId, feeData);
            this.showMessage('Fee structure updated successfully');

            // Close modal
            document.getElementById('editFeeModal').style.display = 'none';

            // Reload data
            await this.loadFees();
        } catch (error) {
            console.error('Error updating fee structure:', error);
            this.showMessage('Error updating fee structure', 'error');
        }
    }
}

// Initialize fee management functionality
function initializeViewFeesPage() {
    console.log('Initializing View Fees Page...');

    // Initialize the view fees manager
    setTimeout(() => {
        window.viewFeesManager = new ViewFeesManager();
    }, 100);
}

// Export functions for global access
window.ViewFeesPage = {
    initializeViewFeesPage
};
