import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Initialize Firestore
const firestore = getFirestore(window.firebaseApp);

// Function to generate attendance report
async function generateAttendanceReport(studentId, month) {
    try {
        // Get student details
        const studentQuery = query(collection(firestore, "students"), where("studentId", "==", studentId));
        const studentSnapshot = await getDocs(studentQuery);
        
        if (studentSnapshot.empty) {
            throw new Error('Student not found');
        }
        
        const student = studentSnapshot.docs[0].data();
        
        // Get attendance records for the selected month
        const year = new Date().getFullYear();
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = `${year}-${month.padStart(2, '0')}-31`;
        
        const attendanceQuery = query(
            collection(firestore, "attendance"),
            where("date", ">=", startDate),
            where("date", "<=", endDate)
        );
        
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceRecords = [];
        
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.students && data.students[studentId]) {
                attendanceRecords.push({
                    date: data.date,
                    course: data.course,
                    batch: data.batch,
                    status: data.students[studentId].status,
                    notes: data.students[studentId].notes || ''
                });
            }
        });
        
        // Sort records by date
        attendanceRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        return {
            student,
            records: attendanceRecords
        };
    } catch (error) {
        console.error('Error generating report:', error);
        throw error;
    }
}

// Function to update report display
function updateReportDisplay(reportData) {
    const { student, records } = reportData;
    
    // Calculate summary statistics
    const totalClasses = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const attendanceRate = totalClasses > 0 ? ((present + late/2) / totalClasses * 100).toFixed(1) : 0;
    
    // Update summary statistics
    document.getElementById('total-classes').textContent = totalClasses;
    document.getElementById('total-present').textContent = present;
    document.getElementById('total-absent').textContent = absent;
    document.getElementById('total-late').textContent = late;
    document.getElementById('attendance-rate').textContent = `${attendanceRate}%`;
    
    // Update detailed records
    const reportBody = document.getElementById('attendance-report-body');
    if (records.length === 0) {
        reportBody.innerHTML = '<tr><td colspan="4">No attendance records found for this month</td></tr>';
    } else {
        reportBody.innerHTML = records.map(record => `
            <tr>
                <td>${new Date(record.date).toLocaleDateString()}</td>
                <td>${record.course} (${record.batch})</td>
                <td>
                    <span class="status-badge ${record.status}">
                        ${record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                </td>
                <td>${record.notes || '-'}</td>
            </tr>
        `).join('');
    }
    
    // Enable export buttons
    document.getElementById('export-report-csv').disabled = false;
    document.getElementById('export-report-pdf').disabled = false;
    document.getElementById('print-report').disabled = false;
}

// Event listener for generate report button
document.getElementById('generate-report').addEventListener('click', async () => {
    const studentId = document.getElementById('report-student').value.trim();
    const month = document.getElementById('report-month').value;
    
    if (!studentId || !month) {
        alert('Please enter both Student ID and select a month');
        return;
    }
    
    try {
        const reportData = await generateAttendanceReport(studentId, month);
        updateReportDisplay(reportData);
    } catch (error) {
        alert('Error generating report: ' + error.message);
    }
});

// Export to CSV
document.getElementById('export-report-csv').addEventListener('click', () => {
    const table = document.getElementById('attendance-report-table');
    const rows = Array.from(table.querySelectorAll('tr'));
    
    const csvContent = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => {
            const text = cell.textContent.replace(/<[^>]*>/g, '').replace(/"/g, '""');
            return `"${text}"`;
        }).join(',');
    }).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'attendance_report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Export to PDF
document.getElementById('export-report-pdf').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const studentId = document.getElementById('report-student').value;
    const month = document.getElementById('report-month').value;
    const monthName = new Date(2000, parseInt(month) - 1).toLocaleString('default', { month: 'long' });
    
    // Add title and info
    doc.setFontSize(16);
    doc.text('Attendance Report', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Student ID: ${studentId}`, 14, 32);
    doc.text(`Month: ${monthName} ${new Date().getFullYear()}`, 14, 38);
    
    // Add summary
    doc.text('Summary:', 14, 48);
    doc.setFontSize(10);
    doc.text(`Total Classes: ${document.getElementById('total-classes').textContent}`, 14, 56);
    doc.text(`Present: ${document.getElementById('total-present').textContent}`, 14, 62);
    doc.text(`Absent: ${document.getElementById('total-absent').textContent}`, 14, 68);
    doc.text(`Late: ${document.getElementById('total-late').textContent}`, 14, 74);
    doc.text(`Attendance Rate: ${document.getElementById('attendance-rate').textContent}`, 14, 80);
    
    // Add table
    doc.autoTable({
        html: '#attendance-report-table',
        startY: 90,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 152, 219] }
    });
    
    doc.save('attendance_report.pdf');
});

// Print report
document.getElementById('print-report').addEventListener('click', () => {
    const printWindow = window.open('', '_blank');
    const studentId = document.getElementById('report-student').value;
    const month = document.getElementById('report-month').value;
    const monthName = new Date(2000, parseInt(month) - 1).toLocaleString('default', { month: 'long' });
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Attendance Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #2c3e50; }
                .student-info { margin: 20px 0; }
                .summary-stats { 
                    display: grid; 
                    grid-template-columns: repeat(5, 1fr); 
                    gap: 1rem; 
                    margin: 20px 0;
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                }
                .stat { text-align: center; }
                .stat .label { color: #666; }
                .stat span:last-child { font-size: 1.2rem; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f8f9fa; }
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.9em;
                }
                .status-badge.present { background: #d4edda; color: #155724; }
                .status-badge.absent { background: #f8d7da; color: #721c24; }
                .status-badge.late { background: #fff3cd; color: #856404; }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>Attendance Report</h1>
            <div class="student-info">
                <p><strong>Student ID:</strong> ${studentId}</p>
                <p><strong>Month:</strong> ${monthName} ${new Date().getFullYear()}</p>
            </div>
            ${document.querySelector('.report-content').innerHTML}
            <div class="no-print" style="margin-top: 20px; text-align: center;">
                <button onclick="window.print()">Print Report</button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
});

// Add styles for status badges
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.9em;
    }
    .status-badge.present {
        background: #d4edda;
        color: #155724;
    }
    .status-badge.absent {
        background: #f8d7da;
        color: #721c24;
    }
    .status-badge.late {
        background: #fff3cd;
        color: #856404;
    }
`;
document.head.appendChild(style); 