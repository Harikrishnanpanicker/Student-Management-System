// Academic Features Module
class AcademicFeatures {
    constructor() {
        this.grades = {};
        this.analytics = {};
        this.courses = {
            'CS101': 'Computer Science Fundamentals',
            'CS102': 'Data Structures',
            'CS103': 'Algorithms',
            'CS104': 'Database Systems',
            'CS105': 'Web Development',
            'CS106': 'Software Engineering',
            'CS107': 'Artificial Intelligence',
            'CS108': 'Computer Networks',
            'CS109': 'Operating Systems',
            'CS110': 'Cybersecurity'
        };
        this.initializeFeatures();
    }

    // Initialize all features
    initializeFeatures() {
        this.setupGradeSubmission();
        this.setupAnalytics();
        this.setupCourseSelection();
    }

    // Setup course selection functionality
    setupCourseSelection() {
        const courseSelect = document.getElementById('courseId');
        if (courseSelect) {
            courseSelect.addEventListener('change', (e) => {
                const selectedCourse = e.target.value;
                if (selectedCourse) {
                    this.showNotification(`Selected course: ${this.courses[selectedCourse]}`, 'success');
                }
            });
        }
    }

    // Grade Submission System
    setupGradeSubmission() {
        const gradeForm = document.getElementById('gradeSubmissionForm');
        if (gradeForm) {
            gradeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitGrade();
            });
        }
    }

    submitGrade() {
        const studentId = document.getElementById('studentId').value;
        const courseId = document.getElementById('courseId').value;
        const grade = document.getElementById('grade').value;
        const semester = document.getElementById('semester').value;

        if (!studentId || !courseId || !grade || !semester) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }

        const gradeNum = parseFloat(grade);
        if (gradeNum < 0 || gradeNum > 100) {
            this.showNotification('Grade must be between 0 and 100', 'error');
            return;
        }

        const gradeData = {
            studentId,
            courseId,
            courseName: this.courses[courseId],
            grade: gradeNum,
            semester,
            timestamp: new Date().toISOString()
        };

        if (!this.grades[studentId]) {
            this.grades[studentId] = [];
        }
        this.grades[studentId].push(gradeData);

        this.showNotification(`Grade submitted successfully for ${this.courses[courseId]}`, 'success');
        this.updateAnalytics(studentId);
        this.resetForm();
    }

    resetForm() {
        const form = document.getElementById('gradeSubmissionForm');
        if (form) {
            form.reset();
        }
    }

    // Performance Analytics
    setupAnalytics() {
        const loadButton = document.getElementById('loadAnalytics');
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                const studentId = document.getElementById('analyticsStudentId').value;
                if (studentId) {
                    this.loadStudentAnalytics(studentId);
                } else {
                    this.showNotification('Please enter a Student ID', 'error');
                }
            });
        }
    }

    loadStudentAnalytics(studentId) {
        if (!this.grades[studentId] || this.grades[studentId].length === 0) {
            this.showNotification('No grades found for this student', 'error');
            return;
        }

        this.updateAnalytics(studentId);
        this.displayStudentSummary(studentId);
        this.displayDetailedPerformance(studentId);
        this.renderCharts(studentId);
    }

    displayStudentSummary(studentId) {
        const studentGrades = this.grades[studentId];
        const grades = studentGrades.map(g => g.grade);
        
        const average = grades.reduce((a, b) => a + b, 0) / grades.length;
        const highest = Math.max(...grades);
        const lowest = Math.min(...grades);
        const totalCourses = new Set(studentGrades.map(g => g.courseId)).size;

        document.getElementById('overallAverage').textContent = average.toFixed(2) + '%';
        document.getElementById('totalCourses').textContent = totalCourses;
        document.getElementById('highestGrade').textContent = highest + '%';
        document.getElementById('lowestGrade').textContent = lowest + '%';

        document.querySelector('.student-summary').style.display = 'block';
    }

    displayDetailedPerformance(studentId) {
        const tbody = document.getElementById('performanceTableBody');
        const studentGrades = this.grades[studentId];

        if (studentGrades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No performance data available</td></tr>';
            return;
        }

        tbody.innerHTML = studentGrades.map(grade => `
            <tr>
                <td>${grade.courseName}</td>
                <td>${grade.grade}%</td>
                <td>Semester ${grade.semester}</td>
                <td>${new Date(grade.timestamp).toLocaleDateString()}</td>
                <td>${this.getGradeStatus(grade.grade)}</td>
            </tr>
        `).join('');
    }

    getGradeStatus(grade) {
        if (grade >= 90) return '<span class="status-excellent">Excellent</span>';
        if (grade >= 80) return '<span class="status-good">Good</span>';
        if (grade >= 70) return '<span class="status-satisfactory">Satisfactory</span>';
        if (grade >= 60) return '<span class="status-passing">Passing</span>';
        return '<span class="status-failing">Failing</span>';
    }

    renderCharts(studentId) {
        const studentGrades = this.grades[studentId];
        
        // Grade Distribution Chart
        const gradeCtx = document.getElementById('gradeChart').getContext('2d');
        const gradeData = this.prepareGradeDistributionData(studentGrades);
        new Chart(gradeCtx, {
            type: 'bar',
            data: gradeData,
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });

        // Course Performance Chart
        const courseCtx = document.getElementById('courseChart').getContext('2d');
        const courseData = this.prepareCoursePerformanceData(studentGrades);
        new Chart(courseCtx, {
            type: 'line',
            data: courseData,
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    prepareGradeDistributionData(grades) {
        const gradeRanges = {
            '90-100': 0,
            '80-89': 0,
            '70-79': 0,
            '60-69': 0,
            '0-59': 0
        };

        grades.forEach(grade => {
            if (grade.grade >= 90) gradeRanges['90-100']++;
            else if (grade.grade >= 80) gradeRanges['80-89']++;
            else if (grade.grade >= 70) gradeRanges['70-79']++;
            else if (grade.grade >= 60) gradeRanges['60-69']++;
            else gradeRanges['0-59']++;
        });

        return {
            labels: Object.keys(gradeRanges),
            datasets: [{
                label: 'Number of Grades',
                data: Object.values(gradeRanges),
                backgroundColor: [
                    '#2ecc71',
                    '#3498db',
                    '#f1c40f',
                    '#e67e22',
                    '#e74c3c'
                ]
            }]
        };
    }

    prepareCoursePerformanceData(grades) {
        const courseData = {};
        grades.forEach(grade => {
            if (!courseData[grade.courseId]) {
                courseData[grade.courseId] = {
                    name: grade.courseName,
                    grades: []
                };
            }
            courseData[grade.courseId].grades.push(grade.grade);
        });

        return {
            labels: Object.values(courseData).map(course => course.name),
            datasets: [{
                label: 'Course Average',
                data: Object.values(courseData).map(course => 
                    course.grades.reduce((a, b) => a + b, 0) / course.grades.length
                ),
                borderColor: '#6a11cb',
                tension: 0.1
            }]
        };
    }

    // Utility Functions
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const academicFeatures = new AcademicFeatures();
}); 