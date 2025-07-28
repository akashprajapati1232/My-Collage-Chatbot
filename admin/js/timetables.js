/* ===== TIMETABLES PAGE JAVASCRIPT ===== */

// Initialize the timetables page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Use singleton pattern to prevent duplicate instances
    if (!AdminPanel.getInstance()) {
        window.adminPanel = new AdminPanel();
        // Determine current page based on URL
        const currentPage = window.location.pathname.includes('view-timetables') ? 'view-timetables' : 'timetables';
        window.adminPanel.currentPage = currentPage;
    } else {
        window.adminPanel = AdminPanel.getInstance();
        // Determine current page based on URL
        const currentPage = window.location.pathname.includes('view-timetables') ? 'view-timetables' : 'timetables';
        window.adminPanel.currentPage = currentPage;
        console.log(`Using existing AdminPanel instance for ${currentPage}`);
    }

    // Initialize page-specific functionality
    if (window.location.pathname.includes('view-timetables')) {
        // Load page data first, then initialize view functionality
        if (window.adminPanel) {
            window.adminPanel.loadPageData('view-timetables').then(() => {
                initializeViewTimetablesPage();
            }).catch(error => {
                console.error('Error loading page data:', error);
                initializeViewTimetablesPage();
            });
        } else {
            initializeViewTimetablesPage();
        }
    } else {
        initializeTimetablesPage();
    }
});

// Initialize timetables page specific functionality
function initializeTimetablesPage() {
    // Setup form listeners
    setupTimetableFormListeners();

    // Setup button listeners
    setupTimetableButtonListeners();

    // Load initial data
    if (window.adminPanel) {
        window.adminPanel.loadPageData('timetables');
    }

    // Load courses for dropdown (handled by courses.js)
    if (window.populateCourseDropdowns) {
        setTimeout(() => {
            window.populateCourseDropdowns();
            // Check for URL parameters after courses are loaded
            checkForEditParameters();
        }, 500);
    }
}

// Initialize view timetables page specific functionality
function initializeViewTimetablesPage() {
    console.log('Initializing view timetables page...');

    // Setup import/export buttons
    setupImportExportButtons();

    // Setup filter functionality
    setupTimetableFilters();

    // Load courses for filter dropdown with retry mechanism
    const loadCoursesWithRetry = (attempts = 0) => {
        if (attempts < 5) {
            setTimeout(() => {
                if (window.adminPanel && window.adminPanel.getCollection) {
                    console.log('AdminPanel ready, loading courses...');
                    loadCoursesForFilter();
                } else {
                    console.log(`AdminPanel not ready, attempt ${attempts + 1}/5`);
                    loadCoursesWithRetry(attempts + 1);
                }
            }, 1000 * (attempts + 1)); // Increasing delay
        } else {
            console.error('Failed to load courses after 5 attempts');
            showMessage('Failed to load courses. Please refresh the page.', 'error');
        }
    };

    loadCoursesWithRetry();
}

// Check for URL parameters to populate form for editing
function checkForEditParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
        // Populate form with URL parameters
        document.getElementById('timetableId').value = id;
        document.getElementById('timetableCourse').value = urlParams.get('course') || '';
        document.getElementById('semester').value = urlParams.get('semester') || '';
        document.getElementById('roomNo').value = urlParams.get('roomNo') || '';
        document.getElementById('day').value = urlParams.get('day') || '';
        document.getElementById('lecture').value = urlParams.get('lecture') || '';
        document.getElementById('subject').value = urlParams.get('subject') || '';
        document.getElementById('faculty').value = urlParams.get('faculty') || '';
        document.getElementById('time').value = urlParams.get('time') || '';

        // Scroll to form
        document.getElementById('timetableForm').scrollIntoView({ behavior: 'smooth' });

        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Setup form event listeners for timetables
function setupTimetableFormListeners() {
    // Timetable form submission
    const timetableForm = document.getElementById('timetableForm');
    if (timetableForm) {
        timetableForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveTimetable();
        });
    }
    

}

// Setup button event listeners for timetables
function setupTimetableButtonListeners() {
    // Import/Export buttons for view-timetables page
    if (window.location.pathname.includes('view-timetables')) {
        setupImportExportButtons();
    }
    console.log('Timetable button listeners setup complete');
}

// Setup import/export button listeners
function setupImportExportButtons() {
    // Import timetables button
    document.getElementById('importTimetablesBtn')?.addEventListener('click', () => {
        showBulkImportDialog();
    });

    // Export timetables button
    document.getElementById('exportTimetablesBtn')?.addEventListener('click', () => {
        bulkExportCSV();
    });
}

// ===== FILTER FUNCTIONALITY =====

// Setup timetable filter functionality
function setupTimetableFilters() {
    // Course filter change event
    document.getElementById('courseFilter')?.addEventListener('change', async (e) => {
        const selectedCourse = e.target.value;
        const semesterFilter = document.getElementById('semesterFilter');

        if (selectedCourse) {
            // Load semesters for selected course
            await loadSemestersForCourse(selectedCourse);
            semesterFilter.disabled = false;
        } else {
            // Clear semester filter and disable it
            semesterFilter.innerHTML = '<option value="">-- Select Semester --</option>';
            semesterFilter.disabled = true;
            hideTimetableDisplay();
        }
    });

    // Semester filter change event
    document.getElementById('semesterFilter')?.addEventListener('change', async (e) => {
        const selectedCourse = document.getElementById('courseFilter').value;
        const selectedSemester = e.target.value;

        console.log('Semester filter changed:', selectedSemester, 'for course:', selectedCourse);

        if (selectedCourse && selectedSemester) {
            // Show loading message
            showMessage('Loading timetables...', 'info');

            // Add small delay to ensure UI updates
            setTimeout(async () => {
                try {
                    await loadTimetablesByCourseAndSemester(selectedCourse, selectedSemester);
                } catch (error) {
                    console.error('Error loading timetables:', error);
                    showMessage('Error loading timetables', 'error');
                }
            }, 100);
        } else {
            hideTimetableDisplay();
        }
    });

    // Clear filters button
    document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
        clearAllFilters();
    });
}

// Load courses for filter dropdown
async function loadCoursesForFilter() {
    try {
        // Wait for AdminPanel to be ready
        if (!window.adminPanel) {
            console.log('AdminPanel not ready, waiting...');
            setTimeout(() => loadCoursesForFilter(), 1000);
            return;
        }

        console.log('Loading courses for filter...');
        const courses = await loadData('courses');
        console.log('Loaded courses:', courses);

        const courseFilter = document.getElementById('courseFilter');

        if (courseFilter) {
            courseFilter.innerHTML = '<option value="">-- Select Course --</option>';
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.courseName;
                option.textContent = course.courseName;
                courseFilter.appendChild(option);
            });
            console.log('Course filter populated with', courses.length, 'courses');
        }
    } catch (error) {
        console.error('Error loading courses for filter:', error);
        showMessage('Error loading courses', 'error');
    }
}

// Load semesters for selected course
async function loadSemestersForCourse(courseName) {
    try {
        console.log('Loading semesters for course:', courseName);
        const timetables = await loadData('timetables');
        console.log('All timetables for semester loading:', timetables);

        const semesterFilter = document.getElementById('semesterFilter');

        // Get unique semesters for the selected course
        const courseTimetables = timetables.filter(timetable => timetable.course === courseName);
        console.log('Filtered timetables for course:', courseTimetables);

        const semesters = [...new Set(
            courseTimetables
                .map(timetable => timetable.semester)
                .filter(semester => semester) // Remove empty values
        )].sort((a, b) => parseInt(a) - parseInt(b));

        console.log('Available semesters:', semesters);

        if (semesterFilter) {
            semesterFilter.innerHTML = '<option value="">-- Select Semester --</option>';
            semesters.forEach(semester => {
                const option = document.createElement('option');
                option.value = semester;
                option.textContent = `${semester}${getOrdinalSuffix(semester)} Semester`;
                semesterFilter.appendChild(option);
            });

            if (semesters.length === 0) {
                showMessage('No timetables found for the selected course', 'info');
            }
        }
    } catch (error) {
        console.error('Error loading semesters:', error);
        showMessage('Error loading semesters', 'error');
    }
}

// Load timetables by course and semester
async function loadTimetablesByCourseAndSemester(courseName, semester) {
    try {
        console.log('Loading timetables for:', courseName, semester);

        // Check if AdminPanel is ready
        if (!window.adminPanel || !window.adminPanel.getCollection) {
            console.log('AdminPanel not ready, waiting...');
            setTimeout(() => loadTimetablesByCourseAndSemester(courseName, semester), 1000);
            return;
        }

        const allTimetables = await loadData('timetables');
        console.log('All timetables:', allTimetables);

        // Filter timetables - check both string and number comparison for semester
        const filteredTimetables = allTimetables.filter(timetable => {
            const courseMatch = timetable.course === courseName;
            const semesterMatch = timetable.semester == semester || timetable.semester === semester.toString();
            console.log(`Checking timetable: course=${timetable.course}, semester=${timetable.semester}, courseMatch=${courseMatch}, semesterMatch=${semesterMatch}`);
            return courseMatch && semesterMatch;
        });
        console.log('Filtered timetables:', filteredTimetables);

        // Update display title
        const displayTitle = document.getElementById('timetableDisplayTitle');
        if (displayTitle) {
            displayTitle.innerHTML = `
                <i class="fas fa-table"></i>
                Timetable for ${courseName} - ${semester}${getOrdinalSuffix(semester)} Semester
            `;
        }

        // Show timetable display container
        const displayContainer = document.getElementById('timetablesDisplayContainer');
        if (displayContainer) {
            displayContainer.style.display = 'block';
        }

        // Wait a moment then initialize and render table
        setTimeout(() => {
            initializeTimetablesTable();
            setTimeout(() => {
                renderTimetables(filteredTimetables);

                if (filteredTimetables.length === 0) {
                    showMessage('No timetables found for the selected course and semester', 'info');
                } else {
                    showMessage(`Found ${filteredTimetables.length} timetable entries`, 'success');
                }
            }, 500);
        }, 200);

    } catch (error) {
        console.error('Error loading filtered timetables:', error);
        showMessage('Error loading timetables: ' + error.message, 'error');
    }
}

// Hide timetable display
function hideTimetableDisplay() {
    const displayContainer = document.getElementById('timetablesDisplayContainer');
    if (displayContainer) {
        displayContainer.style.display = 'none';
    }
}

// Clear all filters
function clearAllFilters() {
    const courseFilter = document.getElementById('courseFilter');
    const semesterFilter = document.getElementById('semesterFilter');

    if (courseFilter) courseFilter.value = '';
    if (semesterFilter) {
        semesterFilter.innerHTML = '<option value="">-- Select Semester --</option>';
        semesterFilter.disabled = true;
    }

    hideTimetableDisplay();
}

// Helper function to get ordinal suffix
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j == 1 && k != 11) return 'st';
    if (j == 2 && k != 12) return 'nd';
    if (j == 3 && k != 13) return 'rd';
    return 'th';
}

// Reset timetable form
function resetTimetableForm() {
    const form = document.getElementById('timetableForm');
    if (form) {
        form.reset();
        document.getElementById('timetableId').value = '';

        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth' });
    }
}

// Utility function to validate timetable form
function validateTimetableForm() {
    const form = document.getElementById('timetableForm');
    if (!form) return false;

    const course = document.getElementById('timetableCourse').value;
    const semester = document.getElementById('semester').value;
    const roomNo = document.getElementById('roomNo').value;
    const day = document.getElementById('day').value;
    const lecture = document.getElementById('lecture').value;
    const subject = document.getElementById('subject').value;
    const faculty = document.getElementById('faculty').value;
    const time = document.getElementById('time').value;

    if (!course || !semester || !roomNo || !day || !lecture || !subject || !faculty || !time) {
        showMessage('Please fill in all required fields', 'error');
        return false;
    }

    return true;
}

// ===== TIMETABLE OPERATIONS =====

// Load timetables from database (used for timetables.html page)
async function loadTimetables() {
    try {
        // Only load all timetables if we're on the timetables.html page (not view-timetables)
        if (!window.location.pathname.includes('view-timetables')) {
            const timetables = await loadData('timetables');
            renderTimetables(timetables);
        }
    } catch (error) {
        console.error('Error loading timetables:', error);
        showMessage('Error loading timetables: ' + error.message, 'error');
    }
}

// Render timetables in table
function renderTimetables(timetables) {
    console.log('Rendering timetables:', timetables.length, 'entries');

    // Ensure table container is visible
    const displayContainer = document.getElementById('timetablesDisplayContainer');
    if (displayContainer) {
        displayContainer.style.display = 'block';
    }

    // Update table data if table exists
    if (window.timetablesTable && window.timetablesTable.setData) {
        try {
            window.timetablesTable.setData(timetables);
            console.log('Table data set successfully with', timetables.length, 'entries');

            // Show success message for view-timetables page
            if (window.location.pathname.includes('view-timetables') && timetables.length > 0) {
                showMessage(`Loaded ${timetables.length} timetable entries`, 'success');
            }
        } catch (error) {
            console.error('Error setting table data:', error);
            window.pendingTimetablesData = timetables;
        }
    } else {
        console.log('Table not ready, storing data for later');
        // Store data for when table is ready
        window.pendingTimetablesData = timetables;

        // Try to initialize table if it doesn't exist
        if (!window.timetablesTable) {
            setTimeout(() => {
                initializeTimetablesTable();
            }, 100);
        }
    }
}

// Initialize Tabulator table for timetables
function initializeTimetablesTable() {
    const container = document.getElementById('timetablesList');
    if (!container) return;

    // Clear any existing content
    container.innerHTML = '<div id="timetablesTable" style="background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;"></div>';

    // Initialize Tabulator table
    const isViewPage = window.location.pathname.includes('view-timetables');
    window.timetablesTable = new Tabulator("#timetablesTable", {
        height: isViewPage ? "600px" : "400px",
        layout: "fitColumns",
        pagination: "local",
        paginationSize: isViewPage ? 20 : 10,
        paginationSizeSelector: isViewPage ? [15, 20, 30, 50] : [5, 10, 20, 50],
        movableColumns: true,
        resizableRows: true,
        selectable: true,
        placeholder: "No timetable entries found. Select course and semester to view timetables.",
        headerFilterPlaceholder: "",
        columns: [
            {
                title: "Course",
                field: "course",
                minWidth: 100,
                sorter: "string"
            },
            {
                title: "Semester",
                field: "semester",
                minWidth: 80,
                sorter: "string",
                headerFilter: "select",
                headerFilterParams: {values: ["", "1", "2", "3", "4", "5", "6", "7", "8"]}
            },
            {
                title: "Room",
                field: "roomNo",
                minWidth: 70,
                sorter: "string"
            },
            {
                title: "Day",
                field: "day",
                minWidth: 90,
                sorter: "string",
                headerFilter: "select",
                headerFilterParams: {values: ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]}
            },
            {
                title: "Lecture",
                field: "lecture",
                minWidth: 70,
                sorter: "string",
                headerFilter: "select",
                headerFilterParams: {values: ["", "1", "2", "3", "4", "5", "6"]}
            },
            {
                title: "Subject",
                field: "subject",
                minWidth: 150,
                sorter: "string"
            },
            {
                title: "Faculty",
                field: "faculty",
                minWidth: 180,
                sorter: "string"
            },
            {
                title: "Time",
                field: "time",
                minWidth: 120,
                sorter: "string"
            },
            {
                title: "Actions",
                field: "actions",
                width: 100,
                minWidth: 100,
                formatter: (cell) => {
                    return `
                        <div class="action-buttons" style="display: flex; gap: 5px; justify-content: center;">
                            <button class="btn-edit" onclick="TimetablesPage.editTimetable('${cell.getRow().getData().id}')" title="Edit" style="background: #28a745; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete" onclick="TimetablesPage.deleteTimetable('${cell.getRow().getData().id}')" title="Delete" style="background: #dc3545; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                },
                headerSort: false
            }
        ]
    });

    // If there's pending data, set it now
    if (window.pendingTimetablesData) {
        setTimeout(() => {
            try {
                window.timetablesTable.setData(window.pendingTimetablesData);
                console.log('Pending data loaded:', window.pendingTimetablesData.length, 'entries');

                // Show success message for view-timetables page
                if (window.location.pathname.includes('view-timetables') && window.pendingTimetablesData.length > 0) {
                    showMessage(`Loaded ${window.pendingTimetablesData.length} timetable entries`, 'success');
                }

                window.pendingTimetablesData = null;
            } catch (error) {
                console.error('Error setting pending data:', error);
            }
        }, 200);
    }

    console.log('Table initialized successfully');
}

// Save timetable to database
async function saveTimetable() {
    try {
        if (!validateTimetableForm()) return;

        const form = document.getElementById('timetableForm');
        const formData = new FormData(form);
        const timetableId = formData.get('timetableId');

        const timetableData = {
            course: formData.get('course'),
            semester: formData.get('semester'),
            roomNo: formData.get('roomNo'),
            day: formData.get('day'),
            lecture: formData.get('lecture'),
            subject: formData.get('subject'),
            faculty: formData.get('faculty'),
            time: formData.get('time'),
            updatedAt: new Date().toISOString()
        };

        if (timetableId) {
            await updateData('timetables', timetableId, timetableData);
            showMessage('Timetable updated successfully');
        } else {
            timetableData.createdAt = new Date().toISOString();
            await saveData('timetables', timetableData);
            showMessage('Timetable added successfully');
        }

        form.reset();
        document.getElementById('timetableId').value = '';
    } catch (error) {
        console.error('Error saving timetable:', error);
        showMessage('Error saving timetable', 'error');
    }
}

// Edit timetable
async function editTimetable(timetableId) {
    try {
        const doc = await getData('timetables', timetableId);
        if (doc.exists()) {
            const timetable = doc.data();

            // Check if we're on the view-timetables page
            if (window.location.pathname.includes('view-timetables')) {
                // Show edit modal with timetable data
                await showEditModal(timetableId, timetable);
            } else {
                // We're on the timetables.html page, populate form directly
                document.getElementById('timetableId').value = timetableId;
                document.getElementById('timetableCourse').value = timetable.course || '';
                document.getElementById('semester').value = timetable.semester || '';
                document.getElementById('roomNo').value = timetable.roomNo || '';
                document.getElementById('day').value = timetable.day || '';
                document.getElementById('lecture').value = timetable.lecture || '';
                document.getElementById('subject').value = timetable.subject || '';
                document.getElementById('faculty').value = timetable.faculty || '';
                document.getElementById('time').value = timetable.time || '';

                document.getElementById('timetableForm').scrollIntoView({ behavior: 'smooth' });
            }
        }
    } catch (error) {
        console.error('Error loading timetable for edit:', error);
        showMessage('Error loading timetable', 'error');
    }
}

// Delete timetable
async function deleteTimetable(timetableId) {
    const result = await Swal.fire({
        title: 'Delete Timetable?',
        text: 'Are you sure you want to delete this timetable?',
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
            await deleteData('timetables', timetableId);
            showMessage('Timetable deleted successfully');
            await loadTimetables();

            Swal.fire({
                title: 'Deleted!',
                text: 'Timetable has been deleted successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: '#fff',
                color: '#333'
            });
        } catch (error) {
            console.error('Error deleting timetable:', error);
            showMessage('Error deleting timetable', 'error');

            Swal.fire({
                title: 'Error!',
                text: 'Failed to delete timetable. Please try again.',
                icon: 'error',
                background: '#fff',
                color: '#333'
            });
        }
    }
}

// ===== EDIT MODAL FUNCTIONALITY =====

// Show edit modal with timetable data
async function showEditModal(timetableId, timetable) {
    try {
        console.log('Opening edit modal for timetable:', timetable);

        // Load courses for edit modal dropdown first
        await loadCoursesForEditModal();

        // Wait a moment for DOM to update
        setTimeout(() => {
            // Populate form fields with existing data
            document.getElementById('editTimetableId').value = timetableId;

            // Set course value
            const courseSelect = document.getElementById('editCourse');
            if (courseSelect && timetable.course) {
                courseSelect.value = timetable.course;
                console.log('Set course to:', timetable.course);
            }

            // Set semester value - ensure it's a string
            const semesterSelect = document.getElementById('editSemester');
            if (semesterSelect && timetable.semester) {
                const semesterValue = String(timetable.semester);
                semesterSelect.value = semesterValue;
                console.log('Set semester to:', semesterValue);

                // Force update if needed
                if (semesterSelect.value !== semesterValue) {
                    // Try to find the option and select it
                    const options = semesterSelect.options;
                    for (let i = 0; i < options.length; i++) {
                        if (options[i].value === semesterValue || options[i].text.includes(semesterValue)) {
                            semesterSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            }

            // Set other fields
            document.getElementById('editRoomNo').value = timetable.roomNo || '';

            // Set day value
            const daySelect = document.getElementById('editDay');
            if (daySelect && timetable.day) {
                daySelect.value = timetable.day;
                console.log('Set day to:', timetable.day);
            }

            // Set lecture value - ensure it's a string
            const lectureSelect = document.getElementById('editLecture');
            if (lectureSelect && timetable.lecture) {
                const lectureValue = String(timetable.lecture);
                lectureSelect.value = lectureValue;
                console.log('Set lecture to:', lectureValue);

                // Force update if needed
                if (lectureSelect.value !== lectureValue) {
                    // Try to find the option and select it
                    const options = lectureSelect.options;
                    for (let i = 0; i < options.length; i++) {
                        if (options[i].value === lectureValue || options[i].text.includes(lectureValue)) {
                            lectureSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            }

            document.getElementById('editSubject').value = timetable.subject || '';
            document.getElementById('editFaculty').value = timetable.faculty || '';
            document.getElementById('editTime').value = timetable.time || '';

            console.log('All fields populated successfully');
            console.log('Final values:', {
                course: courseSelect?.value,
                semester: semesterSelect?.value,
                day: daySelect?.value,
                lecture: lectureSelect?.value
            });
        }, 500);

        // Setup form submission
        setupEditModalForm();

        // Show modal
        document.getElementById('editTimetableModal').style.display = 'flex';

        showMessage('Edit form opened', 'info');
    } catch (error) {
        console.error('Error showing edit modal:', error);
        showMessage('Error opening edit form', 'error');
    }
}

// Load courses for edit modal
async function loadCoursesForEditModal() {
    try {
        console.log('Loading courses for edit modal...');

        // Check if AdminPanel is ready
        if (!window.adminPanel || !window.adminPanel.getCollection) {
            console.log('AdminPanel not ready for edit modal');
            return;
        }

        const courses = await loadData('courses');
        const editCourseSelect = document.getElementById('editCourse');

        if (editCourseSelect && courses.length > 0) {
            // Store current value
            const currentValue = editCourseSelect.value;

            editCourseSelect.innerHTML = '<option value="">-- Select Course --</option>';
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.courseName;
                option.textContent = course.courseName;
                editCourseSelect.appendChild(option);
            });

            // Restore current value if it exists
            if (currentValue) {
                editCourseSelect.value = currentValue;
            }

            console.log('Courses loaded for edit modal:', courses.length);
        }
    } catch (error) {
        console.error('Error loading courses for edit modal:', error);
        showMessage('Error loading courses for edit form', 'error');
    }
}

// Setup edit modal form submission
function setupEditModalForm() {
    const editForm = document.getElementById('editTimetableForm');
    if (editForm) {
        // Remove existing event listeners
        editForm.replaceWith(editForm.cloneNode(true));

        // Add new event listener
        document.getElementById('editTimetableForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateTimetable();
        });
    }
}

// Update timetable from modal
async function updateTimetable() {
    try {
        const timetableId = document.getElementById('editTimetableId').value;

        // Validate form
        if (!validateEditForm()) {
            return;
        }

        const timetableData = {
            course: document.getElementById('editCourse').value.trim(),
            semester: document.getElementById('editSemester').value.trim(),
            roomNo: document.getElementById('editRoomNo').value.trim(),
            day: document.getElementById('editDay').value.trim(),
            lecture: document.getElementById('editLecture').value.trim(),
            subject: document.getElementById('editSubject').value.trim(),
            faculty: document.getElementById('editFaculty').value.trim(),
            time: document.getElementById('editTime').value.trim(),
            updatedAt: new Date().toISOString()
        };

        await updateData('timetables', timetableId, timetableData);
        showMessage('Timetable updated successfully');

        // Close modal
        closeEditModal();

        // Refresh the current view
        const courseFilter = document.getElementById('courseFilter');
        const semesterFilter = document.getElementById('semesterFilter');
        if (courseFilter.value && semesterFilter.value) {
            await loadTimetablesByCourseAndSemester(courseFilter.value, semesterFilter.value);
        }

    } catch (error) {
        console.error('Error updating timetable:', error);
        showMessage('Error updating timetable', 'error');
    }
}

// Validate edit form
function validateEditForm() {
    const requiredFields = [
        'editCourse', 'editSemester', 'editRoomNo', 'editDay',
        'editLecture', 'editSubject', 'editFaculty', 'editTime'
    ];

    for (const fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (!field || !field.value.trim()) {
            const fieldName = fieldId.replace('edit', '').replace(/([A-Z])/g, ' $1').toLowerCase();
            showMessage(`Please fill in the ${fieldName} field`, 'error');
            field?.focus();
            return false;
        }
    }
    return true;
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('editTimetableModal');
    if (modal) {
        modal.style.display = 'none';

        // Clear form
        const form = document.getElementById('editTimetableForm');
        if (form) {
            form.reset();
        }
    }
}

// ===== BULK IMPORT/EXPORT FUNCTIONALITY =====

function showBulkImportDialog() {
    const modalHtml = `
        <div id="bulkImportModal" class="course-modal-overlay" style="display: flex;">
            <div class="course-modal-content">
                <div class="course-modal-header">
                    <h3 class="course-modal-title">📁 Bulk Import Timetables from CSV</h3>
                    <button class="course-modal-close" onclick="document.getElementById('bulkImportModal').style.display='none'">&times;</button>
                </div>
                <div class="course-modal-body">
                    <div class="import-export-options">
                        <div class="import-export-option">
                            <h4>📋 CSV Format Requirements</h4>
                            <p>Your CSV file should include the following columns (in any order):</p>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; font-family: monospace; font-size: 0.875rem;">
                                <strong>Required columns:</strong><br>
                                • course<br>
                                • semester<br>
                                • roomNo<br>
                                • day<br>
                                • lecture<br>
                                • subject<br>
                                • faculty<br>
                                • time
                            </div>
                            <div class="file-input-container">
                                <label for="csvFileInput" style="display: block; margin-bottom: 8px; font-weight: 600;">Select CSV File:</label>
                                <input type="file" id="csvFileInput" accept=".csv" style="margin-bottom: 15px; padding: 8px; border: 2px solid #e2e8f0; border-radius: 6px; width: 100%;">
                            </div>
                            <button onclick="TimetablesPage.bulkImportFromCSV()" class="btn-import-file">
                                <i class="fas fa-upload"></i> Import Timetables from CSV
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

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function bulkImportFromCSV() {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];

    if (!file) {
        showMessage('Please select a CSV file to import', 'error');
        return;
    }

    showMessage('Processing CSV file...', 'info');

    try {
        const text = await file.text();

        // Use PapaParse if available, otherwise simple CSV parsing
        if (typeof Papa !== 'undefined') {
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: async function(results) {
                    try {
                        const timetables = results.data;

                        if (timetables.length === 0) {
                            showMessage('No valid timetable data found in CSV file', 'error');
                            return;
                        }

                        await processBulkImport(timetables);
                    } catch (error) {
                        console.error('Error processing CSV data:', error);
                        showMessage('Error processing CSV data: ' + error.message, 'error');
                    }
                },
                error: function(error) {
                    console.error('Error parsing CSV:', error);
                    showMessage('Error parsing CSV file: ' + error.message, 'error');
                }
            });

        } else {
            console.error('Error importing from CSV:', error);
            showMessage('Error importing timetables from CSV: ' + error.message, 'error');
        }
    } catch (error) {
        console.error('Error reading file:', error);
        showMessage('Error reading CSV file: ' + error.message, 'error');
    }
}

async function processBulkImport(timetables) {
    try {
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const timetable of timetables) {
            try {
                // Validate required fields
                const requiredFields = ['course', 'semester', 'roomNo', 'day', 'lecture', 'subject', 'faculty', 'time'];
                const missingFields = requiredFields.filter(field => !timetable[field] || timetable[field].toString().trim() === '');

                if (missingFields.length > 0) {
                    errors.push(`Row ${successCount + errorCount + 1}: Missing required fields: ${missingFields.join(', ')}`);
                    errorCount++;
                    continue;
                }

                // Prepare timetable data
                const timetableData = {
                    course: timetable.course.toString().trim(),
                    semester: timetable.semester.toString().trim(),
                    roomNo: timetable.roomNo.toString().trim(),
                    day: timetable.day.toString().trim(),
                    lecture: timetable.lecture.toString().trim(),
                    subject: timetable.subject.toString().trim(),
                    faculty: timetable.faculty.toString().trim(),
                    time: timetable.time.toString().trim(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Add to database
                await saveData('timetables', timetableData);
                successCount++;

            } catch (error) {
                console.error(`Error importing timetable ${successCount + errorCount + 1}:`, error);
                errors.push(`Row ${successCount + errorCount + 1}: ${error.message}`);
                errorCount++;
            }
        }

        // Close modal
        document.getElementById('bulkImportModal').style.display = 'none';

        // Show detailed results
        if (successCount > 0) {
            let message = `Successfully imported ${successCount} timetables`;
            if (errorCount > 0) {
                message += ` (${errorCount} failed)`;
            }
            showMessage(message, 'success');

            // Show errors if any
            if (errors.length > 0 && errors.length <= 5) {
                setTimeout(() => {
                    showMessage(`Import errors:\n${errors.join('\n')}`, 'warning');
                }, 2000);
            }

            // Reload timetables data
            await loadTimetables();
        } else {
            let errorMessage = 'No timetables were imported.';
            if (errors.length > 0) {
                errorMessage += `\n\nErrors:\n${errors.slice(0, 5).join('\n')}`;
                if (errors.length > 5) {
                    errorMessage += `\n... and ${errors.length - 5} more errors`;
                }
            }
            showMessage(errorMessage, 'error');
        }

    } catch (error) {
        console.error('Error in bulk import:', error);
        showMessage('Error processing bulk import', 'error');
    }
}

async function bulkExportCSV() {
    try {
        // Load fresh timetables data
        const timetables = await loadData('timetables');

        if (timetables.length === 0) {
            showMessage('No timetables to export', 'warning');
            return;
        }

        showMessage('Preparing CSV export...', 'info');

        // Define the columns to export
        const columns = [
            'course',
            'semester',
            'roomNo',
            'day',
            'lecture',
            'subject',
            'faculty',
            'time'
        ];

        // Prepare data for CSV export
        const csvData = timetables.map(timetable => {
            const row = {};
            columns.forEach(column => {
                let value = timetable[column] || '';
                // Clean the data for CSV export
                if (typeof value === 'string') {
                    value = value.trim();
                    // Escape quotes and handle commas
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        value = '"' + value.replace(/"/g, '""') + '"';
                    }
                }
                row[column] = value;
            });
            return row;
        });

        // Convert to CSV format
        const csvContent = [
            columns.join(','), // Header row
            ...csvData.map(row => columns.map(col => row[col]).join(','))
        ].join('\n');

        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().split('T')[0];
        const timeString = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `timetables_export_${timestamp}_${timeString}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL object
        URL.revokeObjectURL(url);

        showMessage(`Successfully exported ${timetables.length} timetables to ${filename}`, 'success');

    } catch (error) {
        console.error('Error exporting timetables to CSV:', error);
        showMessage('Error exporting timetables to CSV: ' + error.message, 'error');
    }
}

// ===== UTILITY FUNCTIONS (SIMILAR TO COURSES.JS) =====

// Utility methods that delegate to AdminPanel instance
async function loadData(collection) {
    if (window.adminPanel && window.adminPanel.loadData) {
        try {
            const data = await window.adminPanel.loadData(collection);
            console.log(`Loaded ${data.length} items from ${collection}`);
            return data;
        } catch (error) {
            console.error(`Error loading data from ${collection}:`, error);
            throw error;
        }
    }
    console.warn('AdminPanel not available, returning empty array for', collection);
    return [];
}

async function getData(collection, id) {
    if (window.adminPanel && window.adminPanel.loadData) {
        const data = await window.adminPanel.loadData(collection);
        const item = data.find(item => item.id === id);
        return item ? { exists: () => true, data: () => item } : { exists: () => false };
    }
    console.log('Getting data from', collection, id);
    return { exists: () => false };
}

async function saveData(collection, data) {
    if (window.adminPanel && window.adminPanel.saveData) {
        return await window.adminPanel.saveData(collection, data);
    }
    console.log('Saving data to', collection, data);
}

async function updateData(collection, id, data) {
    if (window.adminPanel && window.adminPanel.updateData) {
        return await window.adminPanel.updateData(collection, id, data);
    }
    console.log('Updating data in', collection, id, data);
}

async function deleteData(collection, id) {
    if (window.adminPanel && window.adminPanel.deleteData) {
        return await window.adminPanel.deleteData(collection, id);
    }
    console.log('Deleting data from', collection, id);
}

function showMessage(message, type = 'success') {
    if (window.adminPanel && window.adminPanel.showMessage) {
        return window.adminPanel.showMessage(message, type);
    }
    console.log(`${type.toUpperCase()}: ${message}`);
}

// Export functions for global access
window.TimetablesPage = {
    initializeTimetablesPage,
    initializeViewTimetablesPage,
    setupTimetableFormListeners,
    setupTimetableButtonListeners,
    setupImportExportButtons,
    setupTimetableFilters,
    resetTimetableForm,
    validateTimetableForm,
    checkForEditParameters,
    loadTimetables,
    loadCoursesForFilter,
    loadSemestersForCourse,
    loadTimetablesByCourseAndSemester,
    hideTimetableDisplay,
    clearAllFilters,
    renderTimetables,
    initializeTimetablesTable,
    saveTimetable,
    editTimetable,
    deleteTimetable,
    showEditModal,
    loadCoursesForEditModal,
    setupEditModalForm,
    updateTimetable,
    validateEditForm,
    closeEditModal,
    showBulkImportDialog,
    bulkImportFromCSV,
    processBulkImport,
    bulkExportCSV
};

// Also export as ViewTimetablesPage for backward compatibility
window.ViewTimetablesPage = window.TimetablesPage;
