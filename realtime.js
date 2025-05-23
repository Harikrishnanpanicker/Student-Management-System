// Real-time updates and data validation
import { getFirestore, collection, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

class RealTimeManager {
    constructor() {
        this.db = getFirestore();
        this.subscriptions = new Map();
    }

    // Subscribe to student updates
    subscribeToStudentUpdates(studentId, callback) {
        const q = query(collection(this.db, "students"), where("studentId", "==", studentId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "modified") {
                    callback(change.doc.data());
                }
            });
        });
        this.subscriptions.set(studentId, unsubscribe);
    }

    // Subscribe to attendance updates
    subscribeToAttendanceUpdates(courseId, callback) {
        const q = query(collection(this.db, "attendance"), where("courseId", "==", courseId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                callback(change.doc.data());
            });
        });
        this.subscriptions.set(`attendance_${courseId}`, unsubscribe);
    }

    // Unsubscribe from updates
    unsubscribe(id) {
        const unsubscribe = this.subscriptions.get(id);
        if (unsubscribe) {
            unsubscribe();
            this.subscriptions.delete(id);
        }
    }
}

// Data validation
class DataValidator {
    static validateStudentData(data) {
        const errors = [];
        
        // Student ID validation
        if (!data.studentId || !/^[A-Z]{2}\d{3}$/.test(data.studentId)) {
            errors.push("Student ID must be in format: 2 letters followed by 3 numbers");
        }

        // Email validation
        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push("Invalid email format");
        }

        // Phone validation
        if (!data.mobile || !/^\d{10}$/.test(data.mobile.replace(/\D/g, ''))) {
            errors.push("Phone number must be 10 digits");
        }

        // Name validation
        if (!data.name || data.name.length < 2) {
            errors.push("Name must be at least 2 characters long");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validateGradeData(data) {
        const errors = [];
        
        if (!data.grade || data.grade < 0 || data.grade > 100) {
            errors.push("Grade must be between 0 and 100");
        }

        if (!data.courseId) {
            errors.push("Course ID is required");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Notification system
class NotificationSystem {
    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        // Add animation classes
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }

    static getIcon(type) {
        switch(type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }
}

// Loading state manager
class LoadingStateManager {
    static showLoading(element) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Loading...</div>
        `;
        element.appendChild(loadingOverlay);
    }

    static hideLoading(element) {
        const loadingOverlay = element.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
}

// Export the classes
export { RealTimeManager, DataValidator, NotificationSystem, LoadingStateManager }; 