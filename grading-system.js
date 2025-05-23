import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Initialize Firestore
const firestore = getFirestore(window.firebaseApp);

// Function to submit a grade
async function submitGrade(studentId, course, grade, semester) {
    try {
        // Validate inputs
        if (!studentId || !course || !grade || !semester) {
            throw new Error('All fields are required');
        }

        // Validate grade format (should be a number between 0 and 100)
        const gradeNum = parseFloat(grade);
        if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
            throw new Error('Grade must be a number between 0 and 100');
        }

        // Check if student exists
        const studentQuery = query(collection(firestore, "students"), where("studentId", "==", studentId));
        const studentSnapshot = await getDocs(studentQuery);
        
        if (studentSnapshot.empty) {
            throw new Error('Student not found');
        }

        // Create grade record
        const gradeData = {
            studentId,
            course,
            grade: gradeNum,
            semester,
            timestamp: new Date().toISOString()
        };

        // Add grade to Firestore
        await addDoc(collection(firestore, "grades"), gradeData);
        return true;
    } catch (error) {
        console.error('Error submitting grade:', error);
        throw error;
    }
}

// Function to get student grades
async function getStudentGrades(studentId) {
    try {
        const gradesQuery = query(
            collection(firestore, "grades"),
            where("studentId", "==", studentId)
        );
        
        const gradesSnapshot = await getDocs(gradesQuery);
        const grades = [];
        
        gradesSnapshot.forEach(doc => {
            grades.push(doc.data());
        });
        
        // Sort grades by semester
        grades.sort((a, b) => a.semester.localeCompare(b.semester));
        
        return grades;
    } catch (error) {
        console.error('Error getting grades:', error);
        throw error;
    }
}

// Function to update grade display
function updateGradeDisplay(grades) {
    const gradeTableBody = document.getElementById('grade-table-body');
    const gradeSummary = document.getElementById('grade-summary');
    
    if (grades.length === 0) {
        gradeTableBody.innerHTML = '<tr><td colspan="4">No grades found for this student</td></tr>';
        gradeSummary.innerHTML = '<p>No grades available</p>';
        return;
    }
    
    // Calculate summary statistics
    const totalGrades = grades.length;
    const averageGrade = grades.reduce((sum, g) => sum + g.grade, 0) / totalGrades;
    const highestGrade = Math.max(...grades.map(g => g.grade));
    const lowestGrade = Math.min(...grades.map(g => g.grade));
    
    // Update summary display
    gradeSummary.innerHTML = `
        <div class="summary-stats">
            <div class="stat">
                <span class="label">Average Grade:</span>
                <span>${averageGrade.toFixed(2)}%</span>
            </div>
            <div class="stat">
                <span class="label">Highest Grade:</span>
                <span>${highestGrade}%</span>
            </div>
            <div class="stat">
                <span class="label">Lowest Grade:</span>
                <span>${lowestGrade}%</span>
            </div>
            <div class="stat">
                <span class="label">Total Courses:</span>
                <span>${totalGrades}</span>
            </div>
        </div>
    `;
    
    // Update grades table
    gradeTableBody.innerHTML = grades.map(grade => `
        <tr>
            <td>${grade.course}</td>
            <td>${grade.semester}</td>
            <td>
                <span class="grade-badge ${getGradeClass(grade.grade)}">
                    ${grade.grade}%
                </span>
            </td>
            <td>${new Date(grade.timestamp).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// Helper function to get grade class for styling
function getGradeClass(grade) {
    if (grade >= 90) return 'excellent';
    if (grade >= 80) return 'good';
    if (grade >= 70) return 'satisfactory';
    if (grade >= 60) return 'passing';
    return 'failing';
}

// Event listener for grade submission
document.getElementById('submit-grade').addEventListener('click', async () => {
    const studentId = document.getElementById('grade-student-id').value.trim();
    const course = document.getElementById('grade-course').value;
    const grade = document.getElementById('grade-value').value.trim();
    const semester = document.getElementById('grade-semester').value;
    
    try {
        await submitGrade(studentId, course, grade, semester);
        alert('Grade submitted successfully');
        
        // Clear form
        document.getElementById('grade-student-id').value = '';
        document.getElementById('grade-course').value = '';
        document.getElementById('grade-value').value = '';
        document.getElementById('grade-semester').value = '';
        
        // Refresh grades display
        const grades = await getStudentGrades(studentId);
        updateGradeDisplay(grades);
    } catch (error) {
        alert('Error submitting grade: ' + error.message);
    }
});

// Event listener for viewing grades
document.getElementById('view-grades').addEventListener('click', async () => {
    const studentId = document.getElementById('view-grade-student-id').value.trim();
    
    if (!studentId) {
        alert('Please enter a Student ID');
        return;
    }
    
    try {
        const grades = await getStudentGrades(studentId);
        updateGradeDisplay(grades);
    } catch (error) {
        alert('Error viewing grades: ' + error.message);
    }
});

// Add styles for grade badges
const style = document.createElement('style');
style.textContent = `
    .grade-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.9em;
        font-weight: bold;
    }
    .grade-badge.excellent {
        background: #d4edda;
        color: #155724;
    }
    .grade-badge.good {
        background: #cce5ff;
        color: #004085;
    }
    .grade-badge.satisfactory {
        background: #fff3cd;
        color: #856404;
    }
    .grade-badge.passing {
        background: #f8d7da;
        color: #721c24;
    }
    .grade-badge.failing {
        background: #dc3545;
        color: white;
    }
    .summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
    }
    .stat {
        text-align: center;
    }
    .stat .label {
        color: #6c757d;
        margin-bottom: 0.5rem;
    }
    .stat span:last-child {
        font-size: 1.2rem;
        font-weight: bold;
    }
`;
document.head.appendChild(style); 