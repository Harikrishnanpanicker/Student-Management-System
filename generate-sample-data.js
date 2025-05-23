import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    // Add your Firebase configuration here
    // You can get this from your Firebase Console
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Sample data arrays for generating realistic student data
const firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Emma', 'Daniel', 'Lisa', 'Matthew',
    'Nancy', 'Anthony', 'Betty', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven'
];

const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker'
];

const courses = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'English Literature', 'History', 'Geography', 'Economics', 'Psychology',
    'Sociology', 'Political Science', 'Business Administration', 'Engineering',
    'Art History', 'Music Theory', 'Philosophy', 'Statistics', 'Environmental Science'
];

const semesters = ['Fall 2023', 'Spring 2024', 'Summer 2024'];

// Function to generate a random number between min and max
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to generate a random student ID
function generateStudentId() {
    return `STU${getRandomNumber(10000, 99999)}`;
}

// Function to generate a random grade
function generateGrade() {
    return getRandomNumber(60, 100);
}

// Function to generate a random date within the last year
function generateRandomDate() {
    const now = new Date();
    const pastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return new Date(pastYear.getTime() + Math.random() * (now.getTime() - pastYear.getTime()));
}

// Function to generate a single student record
function generateStudent() {
    const firstName = firstNames[getRandomNumber(0, firstNames.length - 1)];
    const lastName = lastNames[getRandomNumber(0, lastNames.length - 1)];
    
    return {
        studentId: generateStudentId(),
        firstName: firstName,
        lastName: lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@university.edu`,
        enrollmentDate: generateRandomDate().toISOString(),
        department: courses[getRandomNumber(0, courses.length - 1)],
        status: Math.random() > 0.1 ? 'Active' : 'Inactive'
    };
}

// Function to generate grades for a student
function generateStudentGrades(studentId) {
    const grades = [];
    const numCourses = getRandomNumber(3, 6); // Each student takes 3-6 courses
    
    for (let i = 0; i < numCourses; i++) {
        grades.push({
            studentId: studentId,
            course: courses[getRandomNumber(0, courses.length - 1)],
            grade: generateGrade(),
            semester: semesters[getRandomNumber(0, semesters.length - 1)],
            timestamp: generateRandomDate().toISOString()
        });
    }
    
    return grades;
}

// Function to update progress
function updateProgress(current, total) {
    const progress = Math.round((current / total) * 100);
    document.getElementById('progress').textContent = `${progress}%`;
}

// Main function to generate and upload sample data
async function generateAndUploadSampleData(numStudents = 1000) {
    const loadingElement = document.getElementById('loading');
    const statusElement = document.getElementById('status');
    const button = document.getElementById('generate-sample-data');
    
    try {
        loadingElement.classList.add('active');
        button.disabled = true;
        statusElement.textContent = 'Starting data generation...';
        
        console.log(`Starting to generate ${numStudents} student records...`);
        
        for (let i = 0; i < numStudents; i++) {
            // Generate student data
            const student = generateStudent();
            
            // Add student to Firestore
            await addDoc(collection(firestore, "students"), student);
            
            // Generate and add grades for the student
            const grades = generateStudentGrades(student.studentId);
            for (const grade of grades) {
                await addDoc(collection(firestore, "grades"), grade);
            }
            
            // Update progress
            updateProgress(i + 1, numStudents);
            
            // Log progress every 100 students
            if ((i + 1) % 100 === 0) {
                console.log(`Processed ${i + 1} students...`);
                statusElement.textContent = `Processed ${i + 1} students...`;
            }
        }
        
        console.log('Sample data generation completed successfully!');
        statusElement.textContent = 'Sample data generation completed successfully!';
        alert('Sample data generated successfully!');
    } catch (error) {
        console.error('Error generating sample data:', error);
        statusElement.textContent = `Error: ${error.message}`;
        alert('Error generating sample data: ' + error.message);
    } finally {
        loadingElement.classList.remove('active');
        button.disabled = false;
    }
}

// Add event listener to the generate button
document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generate-sample-data');
    if (generateButton) {
        generateButton.addEventListener('click', async () => {
            try {
                await generateAndUploadSampleData();
            } catch (error) {
                console.error('Error:', error);
            }
        });
    }
}); 