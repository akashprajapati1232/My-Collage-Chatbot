/**
 * Student Management Module
 * Handles all student-related functionality for the admin panel
 *
 * This module provides:
 * - Student CRUD operations (Create, Read, Update, Delete)
 * - Student form validation
 * - Integration with AdminPanel for database operations
 * - CSV export functionality
 * - Tabulator table for student display
 *
 * Dependencies:
 * - AdminPanel class (for database operations)
 * - SweetAlert2 (for dialogs)
 * - Toastify (for notifications)
 * - Tabulator (for data display)
 */

class StudentManager {
    constructor() {
        this.students = [];
        this.currentEditingStudent = null;
        this.studentsTable = null;
        
        // Initialize asynchronously
        this.init().catch(error => {
            console.error('Error initializing StudentManager:', error);
        });
    }

    async init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.initializeStudentsTable();
        
        // Load students data if AdminPanel is available
        if (window.adminPanel) {
            try {
                await this.loadStudents();
                await this.populateCourseDropdowns();
            } catch (error) {
                console.log('Could not load students initially:', error);
            }
        }
    }

    setupEventListeners() {
        // Student form submission
        document.getElementById('studentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveStudent();
        });

        // Import CSV button
        document.getElementById('importStudentsBtn')?.addEventListener('click', () => {
            this.showBulkImportDialog();
        });

        // Export CSV button
        document.getElementById('exportStudentsBtn')?.addEventListener('click', () => {
            this.exportStudentsCSV();
        });

        // Student form reset
        document.getElementById('resetStudentBtn')?.addEventListener('click', () => {
            this.resetForm();
        });

        // Add student button
        document.getElementById('addStudentBtn')?.addEventListener('click', () => {
            this.resetForm();
        });
    }

    setupFormValidation() {
        const form = document.getElementById('studentForm');
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
            case 'studentName':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Student name is required';
                }
                break;
            case 'rollNumber':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Roll number is required';
                }
                break;
            case 'studentCourse':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Course is required';
                }
                break;
            case 'studentSemester':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Semester is required';
                }
                break;
            case 'studentEmail':
                if (!value || !this.isValidEmail(value)) {
                    isValid = false;
                    errorMessage = 'Valid email is required';
                }
                break;
            case 'studentPhone':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Phone number is required';
                }
                break;
            case 'dateOfBirth':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Date of birth is required';
                }
                break;
            case 'admissionDate':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Admission date is required';
                }
                break;
            case 'studentAddress':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Address is required';
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

    async loadStudents() {
        try {
            if (!window.adminPanel) {
                throw new Error('AdminPanel not available');
            }

            const snapshot = await window.adminPanel.getCollection('students');
            this.students = [];

            snapshot.forEach(doc => {
                this.students.push({ id: doc.id, ...doc.data() });
            });

            this.renderStudents(this.students);
            this.updateStudentsCount();
        } catch (error) {
            console.error('Error loading students:', error);
            this.showMessage('Error loading students', 'error');
        }
    }

    renderStudents(students) {
        // Initialize or update Tabulator table for students
        if (!this.studentsTable) {
            this.initializeStudentsTable();
        }

        // Update table data
        this.studentsTable.setData(students);
    }

    initializeStudentsTable() {
        const container = document.getElementById('studentsTable');
        if (!container) return;

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
                    title: "Course",
                    field: "course",
                    width: 120,
                    sorter: "string",
                    headerFilter: "select",
                    headerFilterParams: {values: true}
                },
                {
                    title: "Semester",
                    field: "semester",
                    width: 100,
                    sorter: "number",
                    headerFilter: "select",
                    headerFilterParams: {values: true}
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
                    title: "Admission Date",
                    field: "admissionDate",
                    width: 130,
                    sorter: "date",
                    formatter: function(cell) {
                        const value = cell.getValue();
                        return value ? new Date(value).toLocaleDateString() : '-';
                    }
                },
                {
                    title: "Actions",
                    field: "actions",
                    width: 150,
                    formatter: (cell) => {
                        return `
                            <button class="btn btn-sm btn-secondary" onclick="editStudent('${cell.getRow().getData().id}')" style="margin-right: 5px; padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteStudent('${cell.getRow().getData().id}')" style="padding: 4px 8px; font-size: 12px;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        `;
                    },
                    headerSort: false
                }
            ]
        });
    }

    async saveStudent() {
        try {
            const form = document.getElementById('studentForm');
            if (!form) {
                throw new Error('Student form not found');
            }

            // Validate form
            if (!this.validateForm(form)) {
                this.showMessage('Please fix the errors in the form', 'error');
                return;
            }

            const formData = new FormData(form);
            const studentId = formData.get('studentId');

            const studentData = {
                rollNo: formData.get('rollNumber'),
                name: formData.get('studentName'),
                course: formData.get('studentCourse'),
                semester: formData.get('studentSemester'),
                email: formData.get('studentEmail'),
                phone: formData.get('studentPhone'),
                dateOfBirth: formData.get('dateOfBirth'),
                admissionDate: formData.get('admissionDate'),
                address: formData.get('studentAddress'),
                updatedAt: new Date().toISOString()
            };

            if (studentId) {
                await window.adminPanel.updateData('students', studentId, studentData);
                this.showMessage('Student updated successfully');
            } else {
                studentData.createdAt = new Date().toISOString();
                studentData.id = studentData.rollNo; // Use roll number as ID
                await window.adminPanel.saveData('students', studentData);
                this.showMessage('Student added successfully');
            }

            this.resetForm();
            await this.loadStudents();
        } catch (error) {
            console.error('Error saving student:', error);
            this.showMessage('Error saving student', 'error');
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
        const form = document.getElementById('studentForm');
        if (form) {
            form.reset();
            document.getElementById('studentId').value = '';
            
            // Clear all field errors
            const errorElements = form.querySelectorAll('.field-error');
            errorElements.forEach(error => error.remove());
            
            const errorFields = form.querySelectorAll('.error');
            errorFields.forEach(field => field.classList.remove('error'));
        }
    }

    updateStudentsCount() {
        const countElement = document.getElementById('totalStudentsCount');
        if (countElement) {
            countElement.textContent = this.students.length;
        }
    }

    async populateCourseDropdowns() {
        try {
            if (!window.adminPanel) return;

            const courses = await window.adminPanel.loadData('courses');
            const courseSelects = document.querySelectorAll('#studentCourse, #editStudentCourse');
            
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

    async editStudent(studentId) {
        try {
            const students = await window.adminPanel.loadData('students');
            const student = students.find(s => s.id === studentId);
            if (student) {
                // Populate edit modal
                document.getElementById('editStudentId').value = studentId;
                document.getElementById('editStudentName').value = student.name || '';
                document.getElementById('editRollNumber').value = student.rollNo || '';
                document.getElementById('editStudentCourse').value = student.course || '';
                document.getElementById('editStudentSemester').value = student.semester || '';
                document.getElementById('editStudentEmail').value = student.email || '';
                document.getElementById('editStudentPhone').value = student.phone || '';
                document.getElementById('editDateOfBirth').value = student.dateOfBirth || '';
                document.getElementById('editAdmissionDate').value = student.admissionDate || '';
                document.getElementById('editStudentAddress').value = student.address || '';

                // Show modal
                document.getElementById('editStudentModal').style.display = 'flex';
            }
        } catch (error) {
            console.error('Error loading student for edit:', error);
            this.showMessage('Error loading student information', 'error');
        }
    }

    async deleteStudent(studentId) {
        const result = await Swal.fire({
            title: 'Delete Student?',
            text: 'Are you sure you want to delete this student?',
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
                await window.adminPanel.deleteData('students', studentId);
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

    exportStudentsCSV() {
        if (this.students.length === 0) {
            this.showMessage('No students to export', 'warning');
            return;
        }

        const csvData = this.students.map(student => ({
            'Roll Number': student.rollNo,
            'Name': student.name,
            'Course': student.course,
            'Semester': student.semester,
            'Email': student.email,
            'Phone': student.phone,
            'Date of Birth': student.dateOfBirth,
            'Admission Date': student.admissionDate,
            'Address': student.address,
            'Created At': student.createdAt,
            'Updated At': student.updatedAt
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showMessage('Students exported successfully');
    }

    showBulkImportDialog() {
        Swal.fire({
            title: 'Import Students',
            html: `
                <div style="text-align: left;">
                    <p>Upload a CSV file with student data.</p>
                    <p><strong>Required columns:</strong> Roll Number, Name, Course, Semester, Email, Phone, Date of Birth, Admission Date, Address</p>
                    <input type="file" id="studentImportFile" accept=".csv" style="margin-top: 10px; width: 100%;">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Import',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const file = document.getElementById('studentImportFile').files[0];
                if (!file) {
                    Swal.showValidationMessage('Please select a CSV file');
                    return false;
                }
                return file;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.importStudentsFromCSV(result.value);
            }
        });
    }

    importStudentsFromCSV(file) {
        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                try {
                    const students = results.data.filter(row =>
                        row['Roll Number'] && row['Name'] && row['Course'] &&
                        row['Semester'] && row['Email'] && row['Phone'] &&
                        row['Date of Birth'] && row['Admission Date'] && row['Address']
                    );
                    let imported = 0;

                    for (const studentData of students) {
                        const student = {
                            rollNo: studentData['Roll Number'],
                            name: studentData['Name'],
                            course: studentData['Course'],
                            semester: studentData['Semester'],
                            email: studentData['Email'],
                            phone: studentData['Phone'],
                            dateOfBirth: studentData['Date of Birth'],
                            admissionDate: studentData['Admission Date'],
                            address: studentData['Address'],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            id: studentData['Roll Number'] // Use roll number as ID
                        };

                        await window.adminPanel.saveData('students', student);
                        imported++;
                    }

                    await this.loadStudents();
                    this.showMessage(`Successfully imported ${imported} students`);
                } catch (error) {
                    console.error('Error importing students:', error);
                    this.showMessage('Error importing students', 'error');
                }
            },
            error: (error) => {
                console.error('CSV parsing error:', error);
                this.showMessage('Error parsing CSV file', 'error');
            }
        });
    }
}

// View Students Page Manager
class ViewStudentsManager extends StudentManager {
    constructor() {
        super();
        this.setupEditModalListeners();
    }

    setupEditModalListeners() {
        // Edit form submission
        document.getElementById('editStudentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateStudent();
        });
    }

    async updateStudent() {
        try {
            const form = document.getElementById('editStudentForm');
            const studentId = document.getElementById('editStudentId').value;

            const studentData = {
                rollNo: document.getElementById('editRollNumber').value,
                name: document.getElementById('editStudentName').value,
                course: document.getElementById('editStudentCourse').value,
                semester: document.getElementById('editStudentSemester').value,
                email: document.getElementById('editStudentEmail').value,
                phone: document.getElementById('editStudentPhone').value,
                dateOfBirth: document.getElementById('editDateOfBirth').value,
                admissionDate: document.getElementById('editAdmissionDate').value,
                address: document.getElementById('editStudentAddress').value,
                updatedAt: new Date().toISOString()
            };

            await window.adminPanel.updateData('students', studentId, studentData);
            this.showMessage('Student updated successfully');

            // Close modal
            document.getElementById('editStudentModal').style.display = 'none';

            // Reload data
            await this.loadStudents();
        } catch (error) {
            console.error('Error updating student:', error);
            this.showMessage('Error updating student', 'error');
        }
    }
}

// Initialize student management functionality
function initializeViewStudentsPage() {
    console.log('Initializing View Students Page...');

    // Initialize the view students manager
    setTimeout(() => {
        window.viewStudentsManager = new ViewStudentsManager();
    }, 100);
}

// Export functions for global access
window.ViewStudentsPage = {
    initializeViewStudentsPage
};
