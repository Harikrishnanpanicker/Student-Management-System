// Import Firebase modules
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

// Import Chart.js
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/+esm';
Chart.register(...registerables);

// Import custom modules
import { RealTimeManager, DataValidator, NotificationSystem, LoadingStateManager } from './realtime.js';

// Initialize Firestore
const db = getFirestore(window.firebaseApp);

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const studentForm = document.getElementById('student-form');
const searchBtn = document.getElementById('search-btn');
const searchResult = document.getElementById('search-result');
const studentsList = document.getElementById('students-list');
const studentModal = document.getElementById('student-modal');
const editModal = document.getElementById('edit-modal');
const modalContent = document.getElementById('modal-content');
const closeModal = document.querySelector('.close');
const closeEditModal = document.querySelector('.close-edit');
const editStudentBtn = document.getElementById('edit-student');
const deleteStudentBtn = document.getElementById('delete-student');
const editForm = document.getElementById('edit-form');

// Attendance functionality
const attendanceDate = document.getElementById('attendance-date');
const attendanceCourse = document.getElementById('attendance-course');
const attendanceBatch = document.getElementById('attendance-batch');
const loadAttendanceBtn = document.getElementById('load-attendance');
const saveAttendanceBtn = document.getElementById('save-attendance');
const markAllPresentBtn = document.getElementById('mark-all-present');
const markAllAbsentBtn = document.getElementById('mark-all-absent');
const attendanceStudents = document.getElementById('attendance-students');
const attendanceCalendar = document.getElementById('attendance-calendar');

// Performance Analytics functionality
const performanceStudent = document.getElementById('performance-student');
const performanceCourse = document.getElementById('performance-course');
const performanceBatch = document.getElementById('performance-batch');
const loadPerformanceBtn = document.getElementById('load-performance');
const averageScore = document.getElementById('average-score');
const highestScore = document.getElementById('highest-score');
const attendanceRate = document.getElementById('attendance-rate');
const studentRank = document.getElementById('student-rank');
const assessmentList = document.getElementById('assessment-list');

let scoreChart = null;
let subjectChart = null;

// Tab functionality
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Add active class to clicked button and corresponding pane
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        
        // If "All Students" tab is clicked, load all students
        if (tabId === 'all-students') {
            loadAllStudents();
        }
    });
});

// Add Student Form Submission
studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const studentId = document.getElementById('student-id').value;
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const mobile = document.getElementById('mobile').value;
    const address = document.getElementById('address').value;
    const course = document.getElementById('course').value;
    const batch = document.getElementById('batch').value;
    
    try {
        // Check if student ID already exists
        const studentQuery = query(collection(db, "students"), where("studentId", "==", studentId));
        const querySnapshot = await getDocs(studentQuery);
        
        if (!querySnapshot.empty) {
            alert("Student ID already exists. Please use a different ID.");
            return;
        }
        
        // Get current user info
        const auth = getAuth();
        const user = auth.currentUser;
        
        // Add student to Firestore with additional metadata
        await addDoc(collection(db, "students"), {
            studentId,
            name,
            email,
            mobile,
            address,
            course,
            batch,
            createdAt: new Date(),
            createdBy: user ? user.email : 'unknown',
            updatedAt: new Date()
        });
        
        alert("Student added successfully!");
        studentForm.reset();
    } catch (error) {
        console.error("Error adding student: ", error);
        alert("Error adding student");
    }
});

// Enhanced search functionality
searchBtn.addEventListener('click', async () => {
    const searchId = document.getElementById('search-id').value.trim();
    
    if (!searchId) {
        alert("Please enter a student ID");
        return;
    }
    
    try {
        // Create a query against the collection
        const q = query(collection(db, "students"), where("studentId", "==", searchId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            searchResult.innerHTML = `<div class="alert alert-warning">No student found with ID: ${searchId}</div>`;
            return;
        }
        
        // Display the first matching student
        const doc = querySnapshot.docs[0];
        const student = doc.data();
        
        // Format dates
        const createdDate = student.createdAt ? 
            (student.createdAt.toDate ? student.createdAt.toDate().toLocaleString() : new Date(student.createdAt).toLocaleString()) : 
            'N/A';
        const updatedDate = student.updatedAt ? 
            (student.updatedAt.toDate ? student.updatedAt.toDate().toLocaleString() : new Date(student.updatedAt).toLocaleString()) : 
            'N/A';
        
        searchResult.innerHTML = `
            <div class="student-details">
                <h3>${student.name}</h3>
                <div class="student-info">
                    <p><strong>Student ID:</strong> ${student.studentId}</p>
                    <p><strong>Email:</strong> ${student.email}</p>
                    <p><strong>Mobile:</strong> ${student.mobile}</p>
                    <p><strong>Address:</strong> ${student.address || 'N/A'}</p>
                    <p><strong>Course:</strong> ${student.course}</p>
                    <p><strong>Batch/Year:</strong> ${student.batch}</p>
                    <p><strong>Added on:</strong> ${createdDate}</p>
                    <p><strong>Last updated:</strong> ${updatedDate}</p>
                </div>
                <div class="student-actions">
                    <button class="btn btn-secondary" onclick="openEditModal('${doc.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="deleteStudentById('${doc.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Error searching for student: ", error);
        searchResult.innerHTML = `<div class="alert alert-danger">Error searching for student: ${error.message}</div>`;
    }
});

// Function to delete a student by ID with confirmation
function deleteStudentById(id) {
    if (confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
        deleteStudent(id).then(() => {
            searchResult.innerHTML = `<div class="alert alert-success">Student deleted successfully!</div>`;
            // Refresh the all students list if that tab is visible
            if (document.getElementById('all-students').classList.contains('active')) {
                loadAllStudents();
            }
        });
    }
}

// Filtering and sorting functionality
let allStudentsData = [];

async function loadAllStudentsWithFilters() {
    try {
        const querySnapshot = await getDocs(collection(db, "students"));
        
        if (querySnapshot.empty) {
            studentsList.innerHTML = '<tr><td colspan="5">No students found</td></tr>';
            return;
        }
        
        // Store all students
        allStudentsData = [];
        querySnapshot.forEach(doc => {
            const student = doc.data();
            student.id = doc.id;
            allStudentsData.push(student);
        });
        
        // Populate filter dropdowns
        populateFilterOptions();
        
        // Apply current filters
        applyFilters();
    } catch (error) {
        console.error("Error loading students: ", error);
        studentsList.innerHTML = '<tr><td colspan="5">Error loading students</td></tr>';
    }
}

function populateFilterOptions() {
    // Get unique courses
    const courses = [...new Set(allStudentsData.map(student => student.course))];
    const courseSelect = document.getElementById('filter-course');
    courseSelect.innerHTML = '<option value="">All Courses</option>';
    courses.forEach(course => {
        courseSelect.innerHTML += `<option value="${course}">${course}</option>`;
    });
    
    // Get unique batches
    const batches = [...new Set(allStudentsData.map(student => student.batch))];
    const batchSelect = document.getElementById('filter-batch');
    batchSelect.innerHTML = '<option value="">All Batches</option>';
    batches.forEach(batch => {
        batchSelect.innerHTML += `<option value="${batch}">${batch}</option>`;
    });
}

function applyFilters() {
    const courseFilter = document.getElementById('filter-course').value;
    const batchFilter = document.getElementById('filter-batch').value;
    const sortBy = document.getElementById('sort-by').value;
    
    // Filter students
    let filteredStudents = [...allStudentsData];
    
    if (courseFilter) {
        filteredStudents = filteredStudents.filter(student => student.course === courseFilter);
    }
    
    if (batchFilter) {
        filteredStudents = filteredStudents.filter(student => student.batch === batchFilter);
    }
    
    // Sort students
    filteredStudents.sort((a, b) => {
        if (sortBy === 'createdAt') {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
        } else {
            return a[sortBy].localeCompare(b[sortBy]);
        }
    });
    
    // Display filtered students
    displayStudents(filteredStudents);
}

function displayStudents(students) {
    if (students.length === 0) {
        studentsList.innerHTML = '<tr><td colspan="5">No students found</td></tr>';
        return;
    }
    
    let html = '';
    students.forEach(student => {
        html += `
            <tr>
                <td>${student.studentId}</td>
                <td>${student.name}</td>
                <td>${student.course}</td>
                <td>${student.mobile}</td>
                <td>
                    <button class="btn-icon" onclick="openStudentModal('${student.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" onclick="openEditModal('${student.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteStudentById('${student.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    studentsList.innerHTML = html;
}

// Event listeners for filters
document.getElementById('apply-filters').addEventListener('click', applyFilters);
document.getElementById('reset-filters').addEventListener('click', () => {
    document.getElementById('filter-course').value = '';
    document.getElementById('filter-batch').value = '';
    document.getElementById('sort-by').value = 'name';
    applyFilters();
});

// Update loadAllStudents function
function loadAllStudents() {
    loadAllStudentsWithFilters();
}

// Open Student Modal
async function openStudentModal(id) {
    try {
        const docRef = doc(db, "students", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const student = docSnap.data();
            
            modalContent.innerHTML = `
                <div class="student-info">
                    <p><strong>Student ID:</strong> ${student.studentId}</p>
                    <p><strong>Name:</strong> ${student.name}</p>
                    <p><strong>Email:</strong> ${student.email}</p>
                    <p><strong>Mobile:</strong> ${student.mobile}</p>
                    <p><strong>Address:</strong> ${student.address || 'N/A'}</p>
                    <p><strong>Course:</strong> ${student.course}</p>
                    <p><strong>Batch/Year:</strong> ${student.batch}</p>
                </div>
            `;
            
            // Store student ID for edit and delete operations
            editStudentBtn.setAttribute('data-id', id);
            deleteStudentBtn.setAttribute('data-id', id);
            
            studentModal.style.display = 'block';
        } else {
            alert("Student not found!");
        }
    } catch (error) {
        console.error("Error getting student: ", error);
        alert("Error getting student details");
    }
}

// Open Edit Modal
async function openEditModal(id) {
    try {
        const docRef = doc(db, "students", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const student = docSnap.data();
            
            // Populate edit form
            document.getElementById('edit-id').value = id;
            document.getElementById('edit-name').value = student.name;
            document.getElementById('edit-email').value = student.email;
            document.getElementById('edit-mobile').value = student.mobile;
            document.getElementById('edit-address').value = student.address || '';
            document.getElementById('edit-course').value = student.course;
            document.getElementById('edit-batch').value = student.batch;
            
            editModal.style.display = 'block';
        } else {
            alert("Student not found!");
        }
    } catch (error) {
        console.error("Error getting student for edit: ", error);
        alert("Error getting student details");
    }
}

// Update Student
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const email = document.getElementById('edit-email').value;
    const mobile = document.getElementById('edit-mobile').value;
    const address = document.getElementById('edit-address').value;
    const course = document.getElementById('edit-course').value;
    const batch = document.getElementById('edit-batch').value;
    
    try {
        const docRef = doc(db, "students", id);
        await updateDoc(docRef, {
            name,
            email,
            mobile,
            address,
            course,
            batch,
            updatedAt: new Date()
        });
        
        alert("Student updated successfully!");
        editModal.style.display = 'none';
        loadAllStudents();
    } catch (error) {
        console.error("Error updating student: ", error);
        alert("Error updating student");
    }
});

// Delete Student
async function deleteStudent(id) {
    try {
        await deleteDoc(doc(db, "students", id));
        alert("Student deleted successfully!");
        studentModal.style.display = 'none';
    } catch (error) {
        console.error("Error deleting student: ", error);
        alert("Error deleting student");
    }
}

// Edit button in modal
editStudentBtn.addEventListener('click', () => {
    const id = editStudentBtn.getAttribute('data-id');
    studentModal.style.display = 'none';
    openEditModal(id);
});

// Delete button in modal
deleteStudentBtn.addEventListener('click', async () => {
    if (confirm("Are you sure you want to delete this student?")) {
        const id = deleteStudentBtn.getAttribute('data-id');
        await deleteStudent(id);
        loadAllStudents();
    }
});

// Close modals
closeModal.addEventListener('click', () => {
    studentModal.style.display = 'none';
});

closeEditModal.addEventListener('click', () => {
    editModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === studentModal) {
        studentModal.style.display = 'none';
    }
    if (e.target === editModal) {
        editModal.style.display = 'none';
    }
});

// Load all students when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if "All Students" tab is active
    if (document.getElementById('all-students').classList.contains('active')) {
        loadAllStudents();
    }
    
    // Display user info
    displayUserInfo();
});

// Add this function to display user info
function displayUserInfo() {
    const auth = getAuth();
    const user = auth.currentUser;
    
    const userActions = document.querySelector('.user-actions');
    if (!userActions) {
        console.error("User actions element not found");
        return;
    }
    
    if (user) {
        const userInfoElement = document.createElement('div');
        userInfoElement.className = 'user-info';
        
        // Create user avatar
        const userAvatar = document.createElement('div');
        userAvatar.className = 'user-avatar';
        
        if (user.photoURL) {
            // If user has a profile picture (from Google)
            userAvatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || user.email}">`;
        } else {
            // Create initials avatar
            const initials = user.displayName ? 
                user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : 
                user.email.substring(0, 2).toUpperCase();
            
            userAvatar.innerHTML = `<div class="initials-avatar">${initials}</div>`;
        }
        
        // Create user name/email display
        const userName = document.createElement('div');
        userName.className = 'user-name';
        userName.textContent = user.displayName || user.email;
        
        userInfoElement.appendChild(userAvatar);
        userInfoElement.appendChild(userName);
        
        // Add to the header
        userActions.prepend(userInfoElement);
    }
}

// Add this near the end of app.js
document.addEventListener('loadAllStudentsEvent', () => {
    loadAllStudents();
});

// Add these to make the functions available globally
window.openEditModal = function(id) {
    // Call the function from the module
    openEditModal(id);
};

window.deleteStudentById = function(id) {
    // Call the function from the module
    deleteStudentById(id);
};

// Dashboard functionality
async function loadDashboardData() {
    try {
        const querySnapshot = await getDocs(collection(db, "students"));
        
        if (querySnapshot.empty) {
            document.getElementById('total-students').textContent = '0';
            document.getElementById('total-courses').textContent = '0';
            document.getElementById('total-batches').textContent = '0';
            document.getElementById('recent-activity').textContent = 'No activity';
            return;
        }
        
        // Get all students
        const students = [];
        querySnapshot.forEach(doc => {
            const student = doc.data();
            student.id = doc.id;
            students.push(student);
        });
        
        // Total students
        document.getElementById('total-students').textContent = students.length;
        
        // Unique courses
        const courses = [...new Set(students.map(student => student.course))];
        document.getElementById('total-courses').textContent = courses.length;
        
        // Unique batches
        const batches = [...new Set(students.map(student => student.batch))];
        document.getElementById('total-batches').textContent = batches.length;
        
        // Recent activity - get the most recent student added
        const sortedByDate = [...students].sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
        });
        
        if (sortedByDate.length > 0) {
            const mostRecent = sortedByDate[0];
            const date = mostRecent.createdAt?.toDate ? 
                mostRecent.createdAt.toDate().toLocaleString() : 
                new Date(mostRecent.createdAt).toLocaleString();
            
            document.getElementById('recent-activity').textContent = `${mostRecent.name} added on ${date}`;
        }
        
        // Create charts
        createCourseChart(students, courses);
        createBatchChart(students, batches);
        
        // Display recent students
        displayRecentStudents(sortedByDate.slice(0, 6));
        
    } catch (error) {
        console.error("Error loading dashboard data: ", error);
    }
}

function createCourseChart(students, courses) {
    // Count students per course
    const courseCounts = {};
    courses.forEach(course => {
        courseCounts[course] = students.filter(student => student.course === course).length;
    });
    
    // Create chart
    const ctx = document.getElementById('course-chart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: courses,
            datasets: [{
                data: Object.values(courseCounts),
                backgroundColor: [
                    '#3498db',
                    '#2ecc71',
                    '#e74c3c',
                    '#f39c12',
                    '#9b59b6',
                    '#1abc9c'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

function createBatchChart(students, batches) {
    // Count students per batch
    const batchCounts = {};
    batches.forEach(batch => {
        batchCounts[batch] = students.filter(student => student.batch === batch).length;
    });
    
    // Create chart
    const ctx = document.getElementById('batch-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: batches,
            datasets: [{
                label: 'Number of Students',
                data: Object.values(batchCounts),
                backgroundColor: '#3498db',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function displayRecentStudents(recentStudents) {
    const container = document.getElementById('recent-students-list');
    
    if (recentStudents.length === 0) {
        container.innerHTML = '<p>No students found</p>';
        return;
    }
    
    let html = '';
    recentStudents.forEach(student => {
        const date = student.createdAt?.toDate ? 
            student.createdAt.toDate().toLocaleString() : 
            new Date(student.createdAt).toLocaleString();
        
        html += `
            <div class="recent-student-card">
                <h4>${student.name}</h4>
                <p><strong>ID:</strong> ${student.studentId}</p>
                <p><strong>Course:</strong> ${student.course}</p>
                <p><strong>Batch:</strong> ${student.batch}</p>
                <p class="timestamp">Added on ${date}</p>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Add event listener for dashboard tab
document.addEventListener('DOMContentLoaded', () => {
    // Existing code...
    
    // Load dashboard data when dashboard tab is clicked
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === 'dashboard') {
            button.addEventListener('click', loadDashboardData);
        }
    });
});

// Export functionality
document.getElementById('export-csv').addEventListener('click', exportToCSV);
document.getElementById('export-pdf').addEventListener('click', exportToPDF);
document.getElementById('print-list').addEventListener('click', printStudentList);

function exportToCSV() {
    try {
        getDocs(collection(db, "students")).then(querySnapshot => {
            if (querySnapshot.empty) {
                alert("No students to export");
                return;
            }
            
            const students = [];
            querySnapshot.forEach(doc => {
                const student = doc.data();
                students.push(student);
            });
            
            // Create CSV content
            let csvContent = "Student ID,Name,Email,Mobile,Address,Course,Batch\n";
            
            students.forEach(student => {
                const row = [
                    student.studentId,
                    student.name,
                    student.email,
                    student.mobile,
                    student.address || '',
                    student.course,
                    student.batch
                ].map(cell => `"${cell}"`).join(',');
                
                csvContent += row + '\n';
            });
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'students.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    } catch (error) {
        console.error("Error exporting to CSV: ", error);
        alert("Error exporting to CSV");
    }
}

function exportToPDF() {
    try {
        getDocs(collection(db, "students")).then(querySnapshot => {
            if (querySnapshot.empty) {
                alert("No students to export");
                return;
            }
            
            const students = [];
            querySnapshot.forEach(doc => {
                const student = doc.data();
                students.push(student);
            });
            
            // Create a new jsPDF instance
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(18);
            doc.text('EduManage - Student List', 14, 22);
            
            // Add date
            doc.setFontSize(11);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
            
            // Create the table
            const tableColumn = ["ID", "Name", "Email", "Mobile", "Course", "Batch"];
            const tableRows = [];
            
            students.forEach(student => {
                const studentData = [
                    student.studentId,
                    student.name,
                    student.email,
                    student.mobile,
                    student.course,
                    student.batch
                ];
                tableRows.push(studentData);
            });
            
            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 40,
                styles: {
                    fontSize: 10,
                    cellPadding: 3,
                    overflow: 'linebreak'
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 40 },
                    2: { cellWidth: 50 },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 20 }
                }
            });
            
            // Save the PDF
            doc.save('students.pdf');
        });
    } catch (error) {
        console.error("Error exporting to PDF: ", error);
        alert("Error exporting to PDF");
    }
}

function printStudentList() {
    const printWindow = window.open('', '_blank');
    
    getDocs(collection(db, "students")).then(querySnapshot => {
        if (querySnapshot.empty) {
            alert("No students to print");
            printWindow.close();
            return;
        }
        
        const students = [];
        querySnapshot.forEach(doc => {
            const student = doc.data();
            students.push(student);
        });
        
        // Create HTML content
        let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>EduManage - Student List</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    h1 { text-align: center; color: #3498db; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #3498db; color: white; }
                    tr:nth-child(even) { background-color: #f2f2f2; }
                    .print-date { text-align: right; margin-bottom: 20px; }
                    @media print {
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>EduManage - Student List</h1>
                <div class="print-date">Generated on: ${new Date().toLocaleString()}</div>
                <button onclick="window.print()">Print</button>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Mobile</th>
                            <th>Course</th>
                            <th>Batch</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        students.forEach(student => {
            htmlContent += `
                <tr>
                    <td>${student.studentId}</td>
                    <td>${student.name}</td>
                    <td>${student.email}</td>
                    <td>${student.mobile}</td>
                    <td>${student.course}</td>
                    <td>${student.batch}</td>
                </tr>
            `;
        });
        
        htmlContent += `
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    });
}

// Set default date to today
if (attendanceDate) {
    attendanceDate.valueAsDate = new Date();
}

// Load courses and batches for attendance
async function loadAttendanceFilters() {
    try {
        if (!attendanceCourse || !attendanceBatch) {
            console.error("Attendance filter elements not found");
            return;
        }

        const querySnapshot = await getDocs(collection(db, "students"));
        
        if (querySnapshot.empty) {
            return;
        }
        
        const courses = new Set();
        const batches = new Set();
        
        querySnapshot.forEach(doc => {
            const student = doc.data();
            if (student.course) courses.add(student.course);
            if (student.batch) batches.add(student.batch);
        });
        
        // Populate course dropdown
        attendanceCourse.innerHTML = '<option value="">Select Course</option>';
        Array.from(courses).sort().forEach(course => {
            attendanceCourse.innerHTML += `<option value="${course}">${course}</option>`;
        });
        
        // Populate batch dropdown
        attendanceBatch.innerHTML = '<option value="">Select Batch</option>';
        Array.from(batches).sort().forEach(batch => {
            attendanceBatch.innerHTML += `<option value="${batch}">${batch}</option>`;
        });
        
    } catch (error) {
        console.error("Error loading attendance filters: ", error);
    }
}

// Add event listeners for attendance buttons if they exist
if (loadAttendanceBtn) {
    loadAttendanceBtn.addEventListener('click', async () => {
        if (!attendanceDate || !attendanceCourse || !attendanceBatch || !attendanceStudents) {
            console.error("Attendance elements not found");
            return;
        }

        const date = attendanceDate.value;
        const course = attendanceCourse.value;
        const batch = attendanceBatch.value;
        
        if (!date || !course || !batch) {
            alert("Please select date, course and batch");
            return;
        }
        
        try {
            // Query students by course and batch
            const q = query(
                collection(db, "students"), 
                where("course", "==", course),
                where("batch", "==", batch)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                attendanceStudents.innerHTML = '<tr><td colspan="4">No students found for this course and batch</td></tr>';
                saveAttendanceBtn.disabled = true;
                markAllPresentBtn.disabled = true;
                markAllAbsentBtn.disabled = true;
                return;
            }
            
            // Check if attendance already exists for this date, course and batch
            const attendanceQuery = query(
                collection(db, "attendance"),
                where("date", "==", date),
                where("course", "==", course),
                where("batch", "==", batch)
            );
            
            const attendanceSnapshot = await getDocs(attendanceQuery);
            let existingAttendance = {};
            
            if (!attendanceSnapshot.empty) {
                const attendanceDoc = attendanceSnapshot.docs[0];
                existingAttendance = attendanceDoc.data().students || {};
            }
            
            // Display students
            let html = '';
            querySnapshot.forEach(doc => {
                const student = doc.data();
                const studentId = student.studentId;
                const existingStatus = existingAttendance[studentId]?.status || '';
                const existingNotes = existingAttendance[studentId]?.notes || '';
                
                html += `
                    <tr data-id="${studentId}">
                        <td>${studentId}</td>
                        <td>${student.name}</td>
                        <td>
                            <div class="attendance-status">
                                <input type="radio" name="status-${studentId}" id="present-${studentId}" value="present" class="status-radio" ${existingStatus === 'present' ? 'checked' : ''}>
                                <label for="present-${studentId}" class="status-label present">Present</label>
                                
                                <input type="radio" name="status-${studentId}" id="absent-${studentId}" value="absent" class="status-radio" ${existingStatus === 'absent' ? 'checked' : ''}>
                                <label for="absent-${studentId}" class="status-label absent">Absent</label>
                                
                                <input type="radio" name="status-${studentId}" id="late-${studentId}" value="late" class="status-radio" ${existingStatus === 'late' ? 'checked' : ''}>
                                <label for="late-${studentId}" class="status-label late">Late</label>
                            </div>
                        </td>
                        <td>
                            <input type="text" class="attendance-notes" placeholder="Notes" value="${existingNotes}">
                        </td>
                    </tr>
                `;
            });
            
            attendanceStudents.innerHTML = html;
            saveAttendanceBtn.disabled = false;
            markAllPresentBtn.disabled = false;
            markAllAbsentBtn.disabled = false;
            
        } catch (error) {
            console.error("Error loading students for attendance: ", error);
            attendanceStudents.innerHTML = '<tr><td colspan="4">Error loading students</td></tr>';
        }
    });
}

if (saveAttendanceBtn) {
    saveAttendanceBtn.addEventListener('click', async () => {
        if (!attendanceDate || !attendanceCourse || !attendanceBatch || !attendanceStudents) {
            console.error("Attendance elements not found");
            return;
        }

        const date = attendanceDate.value;
        const course = attendanceCourse.value;
        const batch = attendanceBatch.value;
        
        if (!date || !course || !batch) {
            alert("Please select date, course and batch");
            return;
        }
        
        try {
            // Get all student rows
            const rows = attendanceStudents.querySelectorAll('tr[data-id]');
            
            if (rows.length === 0) {
                alert("No students to save attendance for");
                return;
            }
            
            // Collect attendance data
            const students = {};
            let hasIncompleteAttendance = false;
            
            rows.forEach(row => {
                const studentId = row.getAttribute('data-id');
                const statusRadios = row.querySelectorAll('input[type="radio"]');
                const notes = row.querySelector('.attendance-notes').value;
                
                let status = '';
                statusRadios.forEach(radio => {
                    if (radio.checked) {
                        status = radio.value;
                    }
                });
                
                if (!status) {
                    hasIncompleteAttendance = true;
                }
                
                students[studentId] = {
                    status,
                    notes
                };
            });
            
            if (hasIncompleteAttendance) {
                if (!confirm("Some students don't have attendance marked. Continue anyway?")) {
                    return;
                }
            }
            
            // Check if attendance already exists for this date, course and batch
            const attendanceQuery = query(
                collection(db, "attendance"),
                where("date", "==", date),
                where("course", "==", course),
                where("batch", "==", batch)
            );
            
            const attendanceSnapshot = await getDocs(attendanceQuery);
            
            if (!attendanceSnapshot.empty) {
                // Update existing attendance
                const attendanceDoc = attendanceSnapshot.docs[0];
                await updateDoc(doc(db, "attendance", attendanceDoc.id), {
                    students,
                    updatedAt: new Date()
                });
            } else {
                // Create new attendance
                await addDoc(collection(db, "attendance"), {
                    date,
                    course,
                    batch,
                    students,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
            
            alert("Attendance saved successfully!");
            
            // Refresh the calendar
            loadAttendanceCalendar();
            
        } catch (error) {
            console.error("Error saving attendance: ", error);
            alert("Error saving attendance");
        }
    });
}

if (markAllPresentBtn) {
    markAllPresentBtn.addEventListener('click', () => {
        if (!attendanceStudents) {
            console.error("Attendance students element not found");
            return;
        }

        const rows = attendanceStudents.querySelectorAll('tr[data-id]');
        rows.forEach(row => {
            const studentId = row.getAttribute('data-id');
            const presentRadio = document.getElementById(`present-${studentId}`);
            if (presentRadio) presentRadio.checked = true;
        });
    });
}

if (markAllAbsentBtn) {
    markAllAbsentBtn.addEventListener('click', () => {
        if (!attendanceStudents) {
            console.error("Attendance students element not found");
            return;
        }

        const rows = attendanceStudents.querySelectorAll('tr[data-id]');
        rows.forEach(row => {
            const studentId = row.getAttribute('data-id');
            const absentRadio = document.getElementById(`absent-${studentId}`);
            if (absentRadio) absentRadio.checked = true;
        });
    });
}

// Load attendance calendar
async function loadAttendanceCalendar() {
    try {
        if (!attendanceCalendar) {
            console.error("Attendance calendar element not found");
            return;
        }

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        
        // Get first day of month
        const firstDay = new Date(year, month, 1);
        const startDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Get last day of month
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Get attendance data for this month
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        
        const attendanceQuery = query(
            collection(db, "attendance"),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceData = {};
        
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const date = data.date;
            
            if (!attendanceData[date]) {
                attendanceData[date] = [];
            }
            
            attendanceData[date].push({
                course: data.course,
                batch: data.batch,
                students: data.students
            });
        });
        
        // Generate calendar
        let html = '';
        
        // Add day headers
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            html += `<div class="calendar-header">${day}</div>`;
        });
        
        // Add empty cells for days before first day of month
        for (let i = 0; i < startDay; i++) {
            html += `<div class="calendar-day other-month"></div>`;
        }
        
        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const hasAttendance = attendanceData[date] && attendanceData[date].length > 0;
            
            let attendanceSummary = '';
            if (hasAttendance) {
                attendanceData[date].forEach(record => {
                    const students = record.students;
                    const presentCount = Object.values(students).filter(s => s.status === 'present').length;
                    const absentCount = Object.values(students).filter(s => s.status === 'absent').length;
                    const lateCount = Object.values(students).filter(s => s.status === 'late').length;
                    
                    attendanceSummary += `
                        <div>
                            ${record.course} (${record.batch}): 
                            ${presentCount} present, 
                            ${absentCount} absent, 
                            ${lateCount} late
                        </div>
                    `;
                });
            }
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${hasAttendance ? 'has-attendance' : ''}" data-date="${date}">
                    <div class="date">${day}</div>
                    ${hasAttendance ? `<div class="attendance-count">${attendanceData[date].length} classes</div>` : ''}
                    ${hasAttendance ? `<div class="attendance-summary">${attendanceSummary}</div>` : ''}
                </div>
            `;
        }
        
        // Add empty cells for days after last day of month
        const endDay = lastDay.getDay();
        for (let i = endDay; i < 6; i++) {
            html += `<div class="calendar-day other-month"></div>`;
        }
        
        attendanceCalendar.innerHTML = html;
        
        // Add click event to calendar days
        const calendarDays = attendanceCalendar.querySelectorAll('.calendar-day[data-date]');
        calendarDays.forEach(day => {
            day.addEventListener('click', () => {
                const date = day.getAttribute('data-date');
                if (date && attendanceDate) {
                    attendanceDate.value = date;
                    // Clear course and batch
                    if (attendanceCourse) attendanceCourse.value = '';
                    if (attendanceBatch) attendanceBatch.value = '';
                    // Scroll to attendance controls
                    const controls = document.querySelector('.attendance-controls');
                    if (controls) controls.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        
    } catch (error) {
        console.error("Error loading attendance calendar: ", error);
        if (attendanceCalendar) {
            attendanceCalendar.innerHTML = '<div class="error">Error loading calendar</div>';
        }
    }
}

// Initialize attendance tab
document.addEventListener('DOMContentLoaded', () => {
    // Existing code...
    
    // Load attendance data when attendance tab is clicked
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === 'attendance') {
            button.addEventListener('click', () => {
                loadAttendanceFilters();
                loadAttendanceCalendar();
            });
        }
    });
});

// Load students, courses and batches for performance
async function loadPerformanceFilters() {
    try {
        if (!performanceStudent || !performanceCourse || !performanceBatch) {
            console.error("Performance filter elements not found");
            return;
        }

        const querySnapshot = await getDocs(collection(db, "students"));
        
        if (querySnapshot.empty) {
            return;
        }
        
        const students = [];
        const courses = new Set();
        const batches = new Set();
        
        querySnapshot.forEach(doc => {
            const student = doc.data();
            students.push({
                id: student.studentId,
                name: student.name,
                course: student.course,
                batch: student.batch
            });
            
            if (student.course) courses.add(student.course);
            if (student.batch) batches.add(student.batch);
        });
        
        // Sort students by name
        students.sort((a, b) => a.name.localeCompare(b.name));
        
        // Populate student dropdown
        performanceStudent.innerHTML = '<option value="">Select Student</option>';
        students.forEach(student => {
            performanceStudent.innerHTML += `<option value="${student.id}" data-course="${student.course}" data-batch="${student.batch}">${student.name} (${student.id})</option>`;
        });
        
        // Populate course dropdown
        performanceCourse.innerHTML = '<option value="">Select Course</option>';
        Array.from(courses).sort().forEach(course => {
            performanceCourse.innerHTML += `<option value="${course}">${course}</option>`;
        });
        
        // Populate batch dropdown
        performanceBatch.innerHTML = '<option value="">Select Batch</option>';
        Array.from(batches).sort().forEach(batch => {
            performanceBatch.innerHTML += `<option value="${batch}">${batch}</option>`;
        });
        
    } catch (error) {
        console.error("Error loading performance filters: ", error);
    }
}

// Add this to the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // Existing code...
    
    // Load performance data when performance tab is clicked
    tabButtons.forEach(button => {
        if (button.getAttribute('data-tab') === 'performance') {
            button.addEventListener('click', loadPerformanceFilters);
        }
    });
});

// Export the StudentManagementSystem class
export class StudentManagementSystem {
    constructor() {
        console.log('Initializing StudentManagementSystem');
        if (!window.firebaseApp) {
            console.error('Firebase app not initialized');
            throw new Error('Firebase app not initialized');
        }
        this.db = getFirestore(window.firebaseApp);
        console.log('Firestore initialized:', this.db);
        this.realTimeManager = new RealTimeManager();
        this.initializeEventListeners();
        this.initializeCharts();
    }

    initializeEventListeners() {
        console.log('Initializing event listeners');
        // Form submissions
        const gradeForm = document.getElementById('gradeSubmissionForm');
        if (gradeForm) {
            console.log('Grade form found, adding submit listener');
            gradeForm.addEventListener('submit', (e) => {
                console.log('Form submit event triggered');
                this.handleGradeSubmission(e);
            });
        } else {
            console.error('Grade form not found in the DOM');
        }
    }

    async handleGradeSubmission(e) {
        console.log('handleGradeSubmission called');
        e.preventDefault();
        
        try {
            const submitButton = e.target.querySelector('button[type="submit"]');
            LoadingStateManager.showLoading(submitButton);
            
            const studentId = document.getElementById('studentId').value.trim();
            const courseId = document.getElementById('courseId').value.trim();
            const grade = parseInt(document.getElementById('grade').value);
            const semester = document.getElementById('semester').value.trim();
            
            console.log('Form values:', { studentId, courseId, grade, semester });
            
            // Validate inputs
            if (!studentId || !courseId || isNaN(grade) || !semester) {
                console.log('Validation failed:', { studentId, courseId, grade, semester });
                NotificationSystem.showNotification('Please fill in all fields correctly', 'error');
                return;
            }
            
            if (grade < 0 || grade > 100) {
                console.log('Invalid grade value:', grade);
                NotificationSystem.showNotification('Grade must be between 0 and 100', 'error');
                return;
            }
            
            // Check if student exists
            console.log('Checking if student exists:', studentId);
            const studentQuery = query(collection(this.db, "students"), where("studentId", "==", studentId));
            const studentSnapshot = await getDocs(studentQuery);
            
            if (studentSnapshot.empty) {
                console.log('Student not found:', studentId);
                NotificationSystem.showNotification('Student not found', 'error');
                return;
            }
            
            console.log('Student found, proceeding with grade submission');
            
            // Check if grade already exists
            console.log('Checking for existing grade');
            const gradeQuery = query(
                collection(this.db, "grades"),
                where("studentId", "==", studentId),
                where("courseId", "==", courseId),
                where("semester", "==", semester)
            );
            
            const existingGrade = await getDocs(gradeQuery);
            
            if (!existingGrade.empty) {
                console.log('Updating existing grade');
                const gradeDoc = existingGrade.docs[0];
                await updateDoc(doc(this.db, "grades", gradeDoc.id), {
                    grade: grade,
                    updatedAt: new Date()
                });
                NotificationSystem.showNotification('Grade updated successfully', 'success');
            } else {
                console.log('Adding new grade');
                const gradeData = {
                    studentId: studentId,
                    courseId: courseId,
                    grade: grade,
                    semester: semester,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                console.log('Grade data to be added:', gradeData);
                
                const docRef = await addDoc(collection(this.db, "grades"), gradeData);
                console.log('Grade added with ID:', docRef.id);
                NotificationSystem.showNotification('Grade added successfully', 'success');
            }
            
            // Reset form
            e.target.reset();
            
            // Reload performance data if on performance tab
            const analyticsSection = document.getElementById('analytics');
            if (analyticsSection && analyticsSection.classList.contains('active')) {
                console.log('Reloading performance charts');
                await this.loadPerformanceCharts();
            }
            
        } catch (error) {
            console.error('Error submitting grade:', error);
            NotificationSystem.showNotification('Error submitting grade: ' + error.message, 'error');
        } finally {
            const submitButton = e.target.querySelector('button[type="submit"]');
            LoadingStateManager.hideLoading(submitButton);
        }
    }

    async loadPerformanceCharts() {
        console.log('Loading performance charts');
        try {
            LoadingStateManager.showLoading(document.querySelector('.performance-trends'));

            const studentId = document.getElementById('performance-student')?.value;
            const course = document.getElementById('performance-course')?.value;
            const batch = document.getElementById('performance-batch')?.value;

            console.log('Performance filters:', { studentId, course, batch });

            // Build query based on selected filters
            let q = collection(this.db, "students");
            if (studentId) {
                q = query(q, where("studentId", "==", studentId));
            }
            if (course) {
                q = query(q, where("course", "==", course));
            }
            if (batch) {
                q = query(q, where("batch", "==", batch));
            }

            const studentsSnapshot = await getDocs(q);
            const students = studentsSnapshot.docs.map(doc => doc.data());
            console.log('Found students:', students.length);

            if (students.length === 0) {
                NotificationSystem.showNotification('No students found with the selected filters', 'warning');
                return;
            }

            // Get performance data
            const performanceData = await this.getPerformanceData(students);
            console.log('Performance data:', performanceData);
            
            // Initialize performance charts
            this.initializePerformanceCharts(performanceData);

            // Update performance metrics
            this.updatePerformanceMetrics(performanceData);

            NotificationSystem.showNotification('Performance data loaded successfully', 'success');

        } catch (error) {
            console.error('Error loading performance data:', error);
            NotificationSystem.showNotification('Error loading performance data: ' + error.message, 'error');
        } finally {
            LoadingStateManager.hideLoading(document.querySelector('.performance-trends'));
        }
    }

    async getPerformanceData(students) {
        console.log('Getting performance data for students:', students);
        
        // Get attendance data
        const attendanceData = await this.getAttendanceData(students);
        console.log('Attendance data:', attendanceData);
        
        // Get grades data
        const gradesData = await this.getGradesData(students);
        console.log('Grades data:', gradesData);

        return {
            students,
            attendance: attendanceData,
            grades: gradesData
        };
    }

    async getAttendanceData(students) {
        console.log('Getting attendance data for students');
        const attendanceData = {};
        for (const student of students) {
            console.log('Getting attendance for student:', student.studentId);
            const q = query(
                collection(this.db, "attendance"),
                where("studentId", "==", student.studentId)
            );
            const snapshot = await getDocs(q);
            attendanceData[student.studentId] = snapshot.docs.map(doc => doc.data());
            console.log('Attendance for student:', student.studentId, attendanceData[student.studentId]);
        }
        return attendanceData;
    }

    async getGradesData(students) {
        console.log('Getting grades data for students');
        const gradesData = {};
        for (const student of students) {
            console.log('Getting grades for student:', student.studentId);
            const q = query(
                collection(this.db, "grades"),
                where("studentId", "==", student.studentId)
            );
            const snapshot = await getDocs(q);
            gradesData[student.studentId] = snapshot.docs.map(doc => doc.data());
            console.log('Grades for student:', student.studentId, gradesData[student.studentId]);
        }
        return gradesData;
    }

    initializePerformanceCharts(performanceData) {
        // Clear existing charts
        this.clearExistingCharts();

        // Initialize new charts
        this.initializeSemesterProgressChart(performanceData);
        this.initializeSubjectPerformanceChart(performanceData);
        this.initializeAttendanceImpactChart(performanceData);
        this.initializeGradeDistributionChart(performanceData);
    }

    clearExistingCharts() {
        const chartElements = [
            'semester-progress-chart',
            'subject-performance-chart',
            'attendance-impact-chart',
            'grade-distribution-chart'
        ];

        chartElements.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const chart = Chart.getChart(canvas);
                if (chart) {
                    chart.destroy();
                }
            }
        });
    }

    initializeSemesterProgressChart(performanceData) {
        const ctx = document.getElementById('semester-progress-chart');
        if (!ctx) return;

        const semesterData = this.processSemesterData(performanceData);
        new Chart(ctx, {
            type: 'line',
            data: semesterData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Semester Progress',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Score (%)'
                        }
                    }
                }
            }
        });
    }

    initializeSubjectPerformanceChart(performanceData) {
        const ctx = document.getElementById('subject-performance-chart');
        if (!ctx) return;

        const subjectData = this.processSubjectData(performanceData);
        new Chart(ctx, {
            type: 'bar',
            data: subjectData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Subject-wise Performance',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Average Score (%)'
                        }
                    }
                }
            }
        });
    }

    initializeAttendanceImpactChart(performanceData) {
        const ctx = document.getElementById('attendance-impact-chart');
        if (!ctx) return;

        const attendanceData = this.processAttendanceData(performanceData);
        new Chart(ctx, {
            type: 'scatter',
            data: attendanceData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Attendance Impact on Performance',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Attendance Rate (%)'
                        },
                        min: 0,
                        max: 100
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Performance Score (%)'
                        },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    initializeGradeDistributionChart(performanceData) {
        const ctx = document.getElementById('grade-distribution-chart');
        if (!ctx) return;

        const gradeData = this.processGradeData(performanceData);
        new Chart(ctx, {
            type: 'pie',
            data: gradeData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Grade Distribution',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    processSemesterData(performanceData) {
        const semesters = ['1', '2', '3', '4'];
        const averageScores = semesters.map(sem => {
            const scores = performanceData.students.map(student => {
                const studentGrades = performanceData.grades[student.studentId] || [];
                const semesterGrades = studentGrades.filter(g => g.semester === sem);
                if (semesterGrades.length === 0) return 0;
                return semesterGrades.reduce((sum, grade) => sum + grade.grade, 0) / semesterGrades.length;
            });
            return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        });

        return {
            labels: semesters.map(sem => `Semester ${sem}`),
            datasets: [{
                label: 'Average Score',
                data: averageScores,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };
    }

    processSubjectData(performanceData) {
        const subjects = ['CS101', 'CS102', 'CS103', 'CS104', 'CS105', 'CS106', 'CS107', 'CS108', 'CS109', 'CS110'];
        const averageScores = subjects.map(subject => {
            const scores = performanceData.students.map(student => {
                const studentGrades = performanceData.grades[student.studentId] || [];
                const subjectGrade = studentGrades.find(g => g.courseId === subject);
                return subjectGrade ? subjectGrade.grade : 0;
            });
            return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        });

        return {
            labels: subjects,
            datasets: [{
                label: 'Average Score',
                data: averageScores,
                backgroundColor: '#2ecc71',
                borderColor: '#27ae60',
                borderWidth: 1
            }]
        };
    }

    processGradeData(performanceData) {
        const gradeRanges = {
            'A': { min: 90, max: 100 },
            'B': { min: 80, max: 89 },
            'C': { min: 70, max: 79 },
            'D': { min: 60, max: 69 },
            'F': { min: 0, max: 59 }
        };

        const gradeCounts = Object.keys(gradeRanges).reduce((acc, grade) => {
            acc[grade] = 0;
            return acc;
        }, {});

        // Process grades from the grades collection
        performanceData.students.forEach(student => {
            const grades = performanceData.grades[student.studentId] || [];
            if (grades.length > 0) {
                // Calculate average grade for the student
                const averageGrade = grades.reduce((sum, grade) => sum + grade.grade, 0) / grades.length;
                
                // Determine grade letter
                for (const [letter, range] of Object.entries(gradeRanges)) {
                    if (averageGrade >= range.min && averageGrade <= range.max) {
                        gradeCounts[letter]++;
                        break;
                    }
                }
            }
        });

        return {
            labels: Object.keys(gradeCounts),
            datasets: [{
                data: Object.values(gradeCounts),
                backgroundColor: [
                    '#2ecc71', // A - Green
                    '#3498db', // B - Blue
                    '#f1c40f', // C - Yellow
                    '#e67e22', // D - Orange
                    '#e74c3c'  // F - Red
                ],
                borderWidth: 1
            }]
        };
    }

    processAttendanceData(performanceData) {
        const data = [];
        performanceData.students.forEach(student => {
            const attendance = performanceData.attendance[student.studentId] || [];
            const grades = performanceData.grades[student.studentId] || [];
            
            if (attendance.length > 0 && grades.length > 0) {
                const attendanceRate = (attendance.filter(a => a.status === 'present').length / attendance.length) * 100;
                const averageGrade = grades.reduce((sum, grade) => sum + grade.grade, 0) / grades.length;
                data.push({
                    x: attendanceRate,
                    y: averageGrade
                });
            }
        });

        return {
            datasets: [{
                label: 'Attendance vs Performance',
                data: data,
                backgroundColor: '#e74c3c',
                borderColor: '#c0392b',
                borderWidth: 1
            }]
        };
    }

    updatePerformanceMetrics(performanceData) {
        const insights = document.querySelectorAll('.insight-card');
        if (insights.length >= 3) {
            // Calculate top performing subject
            const subjectData = this.processSubjectData(performanceData);
            const topSubjectIndex = subjectData.datasets[0].data.indexOf(Math.max(...subjectData.datasets[0].data));
            const topSubject = subjectData.labels[topSubjectIndex];
            const topScore = subjectData.datasets[0].data[topSubjectIndex];
            insights[0].querySelector('p').textContent = `${topSubject} with ${topScore.toFixed(1)}% average`;

            // Calculate areas for improvement
            const lowestSubjectIndex = subjectData.datasets[0].data.indexOf(Math.min(...subjectData.datasets[0].data));
            const lowestSubject = subjectData.labels[lowestSubjectIndex];
            const lowestScore = subjectData.datasets[0].data[lowestSubjectIndex];
            insights[1].querySelector('p').textContent = `${lowestSubject} shows lower performance at ${lowestScore.toFixed(1)}%`;

            // Calculate achievement highlights
            const totalStudents = performanceData.students.length;
            const passingStudents = performanceData.students.filter(student => {
                const grades = performanceData.grades[student.studentId] || [];
                if (grades.length === 0) return false;
                const averageScore = grades.reduce((sum, grade) => sum + grade.grade, 0) / grades.length;
                return averageScore >= 60;
            }).length;
            const passRate = (passingStudents / totalStudents) * 100;
            insights[2].querySelector('p').textContent = `${passRate.toFixed(1)}% of students passed all subjects`;
        }
    }
} 