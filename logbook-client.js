// Log Book Client-Side Database Manager
const API_URL = 'http://localhost:3001/api/logbook';

// Helper function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, setting up form handler');
    const form = document.getElementById('logbookForm');
    console.log('Form element:', form);
    
    if (form) {
        // Fetch and populate user profile data
        fetchUserProfile();
        
        // Prevent default form submission
        form.addEventListener('submit', function(e) {
            console.log('Form submit event fired!');
            e.preventDefault();
            handleLogBookSubmit();
        });
        
        // Also handle the submit button click
        const submitBtn = form.querySelector('input[type="submit"]');
        console.log('Submit button:', submitBtn);
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                console.log('Submit button clicked!');
                e.preventDefault();
                handleLogBookSubmit();
            });
        }
        
        // Attach calculation event listeners to all rubric fields
        attachRubricCalculationListeners();
        
        console.log('Form handler setup complete');
    } else {
        console.error('Form not found!');
    }
});

// Fetch user profile and populate fields
async function fetchUserProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found, user not authenticated');
            return;
        }
        
        const response = await fetch('http://localhost:3002/api/auth/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.user) {
            const user = result.user;
            
            // Populate the readonly fields
            const nameField = document.getElementById('name');
            const rollnoField = document.getElementById('detail1');
            const rgnoField = document.getElementById('detail');
            
            if (nameField) nameField.value = user.name || '';
            if (rollnoField) rollnoField.value = user.rollno || '';
            if (rgnoField) rgnoField.value = user.rgno || '';
            
            console.log('User profile loaded:', user);
            
            // Show/hide buttons based on role
            const teacherActions = document.getElementById('teacherActions');
            const studentActions = document.getElementById('studentActions');
            const studentFormContainer = document.getElementById('studentFormContainer');
            const logbookSelectionPanel = document.getElementById('logbookSelectionPanel');
            
            if (user.role === 'faculty' || user.role === 'admin') {
                // Faculty and admins can see all logbooks (viewer buttons only)
                if (teacherActions) teacherActions.style.display = 'block';
                if (studentActions) studentActions.style.display = 'none';
                if (studentFormContainer) studentFormContainer.style.display = 'none';
                if (logbookSelectionPanel) logbookSelectionPanel.style.display = 'none';
            } else {
                // Students can see their logbooks list and form
                if (teacherActions) teacherActions.style.display = 'none';
                if (studentActions) studentActions.style.display = 'block';
                if (studentFormContainer) studentFormContainer.style.display = 'block';
                if (logbookSelectionPanel) logbookSelectionPanel.style.display = 'block';
                
                // Load student's logbooks
                loadMyLogBooks();
            }
        } else {
            console.error('Failed to fetch user profile:', result.error);
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}

// Load all logbooks for student and show selection panel
async function loadMyLogBooks() {
    try {
        const response = await fetch('http://localhost:3001/api/logbook/my-logbooks', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (result.success) {
            const logbookList = document.getElementById('logbookList');
            const selectionPanel = document.getElementById('logbookSelectionPanel');
            
            if (logbookList) {
                logbookList.innerHTML = '';
                
                if (result.data && result.data.length > 0) {
                    result.data.forEach(logbook => {
                        const card = document.createElement('div');
                        card.style.cssText = 'padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #667eea; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
                        card.innerHTML = `
                            <h4 style="margin: 0 0 10px 0; color: #667eea;">${logbook.subject}</h4>
                            ${logbook.code ? `<p style="margin: 5px 0; font-size: 13px;"><strong>Code:</strong> ${logbook.code}</p>` : ''}
                            <p style="margin: 5px 0; font-size: 13px;"><strong>Created:</strong> ${new Date(logbook.createdAt).toLocaleDateString()}</p>
                            <button style="width: 100%; padding: 8px; margin-top: 10px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Load</button>
                        `;
                        card.onclick = () => loadLogBookById(logbook._id);
                        logbookList.appendChild(card);
                    });
                } else {
                    logbookList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No logbooks yet. Create your first one!</p>';
                }
            }
            
            if (selectionPanel) {
                selectionPanel.style.display = 'block';
            }
        } else {
            showNotification('❌ Error loading logbooks: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error loading logbooks:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Load specific logbook by ID
async function loadLogBookById(logbookId) {
    try {
        const response = await fetch(`http://localhost:3001/api/logbook/${logbookId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadDataIntoForm(result.data);
            showNotification('✅ Log book loaded successfully!', 'success');
            
            // Hide selection panel and show form
            const selectionPanel = document.getElementById('logbookSelectionPanel');
            if (selectionPanel) selectionPanel.style.display = 'none';
            
            // Scroll to form
            document.getElementById('logbookForm').scrollIntoView({ behavior: 'smooth' });
        } else {
            showNotification('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error loading logbook:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Create new logbook for student
function createNewLogBook() {
    // Clear the form
    document.getElementById('logbookForm').reset();
    
    // Clear selection panel and show form
    const selectionPanel = document.getElementById('logbookSelectionPanel');
    if (selectionPanel) selectionPanel.style.display = 'none';
    
    // Fetch and populate user profile data for new entry
    fetchUserProfile();
    
    showNotification('📝 Create new log book - Enter subject details', 'info');
    
    // Scroll to form
    document.getElementById('logbookForm').scrollIntoView({ behavior: 'smooth' });
}

// Attach change event listeners to rubric fields for auto-calculation
function attachRubricCalculationListeners() {
    // Experiments table (1-7, expandable)
    for (let row = 1; row <= 20; row++) { // Allow up to 20 rows for expansion
        for (let rubric = 1; rubric <= 5; rubric++) {
            const field = document.querySelector(`[name="rubric${row}-${rubric}"]`);
            if (field) {
                field.addEventListener('change', () => calculateRubricTotal('', row));
                field.addEventListener('input', () => calculateRubricTotal('', row));
            }
        }
    }
    
    // Open-ended project table (t2)
    for (let rubric = 1; rubric <= 5; rubric++) {
        const field = document.querySelector(`[name="t2rubric1-${rubric}"]`);
        if (field) {
            field.addEventListener('change', () => calculateRubricTotal('t2', 1));
            field.addEventListener('input', () => calculateRubricTotal('t2', 1));
        }
    }
    
    // Lab exams table (t3, 1-3)
    for (let row = 1; row <= 5; row++) { // Allow up to 5 rows
        for (let rubric = 1; rubric <= 5; rubric++) {
            const field = document.querySelector(`[name="t3rubric${row}-${rubric}"]`);
            if (field) {
                field.addEventListener('change', () => calculateRubricTotal('t3', row));
                field.addEventListener('input', () => calculateRubricTotal('t3', row));
            }
        }
    }
    
    // Final Assessment fields - add listeners to calculate total
    const finalFields = ['final1', 'final2', 'final3', 'final4'];
    finalFields.forEach(fieldName => {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.addEventListener('change', calculateFinalAssessmentTotal);
            field.addEventListener('input', calculateFinalAssessmentTotal);
        }
    });
}

// Validate row completeness - if any field in a row has data, all required fields must be filled
function validateRowCompleteness() {
    // Define which tables and fields to validate
    const tableConfigs = [
        { 
            prefix: '', 
            rowRanges: [1, 2, 3, 4, 5, 6, 7], 
            fields: ['date', 'experiment', 'co', 'rubric-1', 'rubric-2', 'rubric-3', 'rubric-4', 'rubric-5']
        },
        { 
            prefix: 't2', 
            rowRanges: [1], 
            fields: ['date', 'experiment', 'co', 'rubric-1', 'rubric-2', 'rubric-3', 'rubric-4', 'rubric-5']
        },
        { 
            prefix: 't3', 
            rowRanges: [1, 2, 3], 
            fields: ['date', ['exam'], 't3co', 'rubric-1', 'rubric-2', 'rubric-3', 'rubric-4', 'rubric-5']
        }
    ];

    for (const config of tableConfigs) {
        for (const rowNum of config.rowRanges) {
            // Build field names based on prefix
            const fieldNames = [];
            
            if (config.prefix === '') {
                // Experiments table: date1, experiment1, co1, rubric1-1, etc.
                fieldNames.push(`date${rowNum}`, `experiment${rowNum}`, `co${rowNum}`);
                for (let i = 1; i <= 5; i++) {
                    fieldNames.push(`rubric${rowNum}-${i}`);
                }
            } else if (config.prefix === 't2') {
                // Open-ended project: t2date1, t2experiment1, t2co1, t2rubric1-1, etc.
                fieldNames.push(`t2date${rowNum}`, `t2experiment${rowNum}`, `t2co${rowNum}`);
                for (let i = 1; i <= 5; i++) {
                    fieldNames.push(`t2rubric${rowNum}-${i}`);
                }
            } else if (config.prefix === 't3') {
                // Lab exams: t3date1, exam1, t3co1, t3rubric1-1, etc.
                fieldNames.push(`t3date${rowNum}`, `exam${rowNum}`, `t3co${rowNum}`);
                for (let i = 1; i <= 5; i++) {
                    fieldNames.push(`t3rubric${rowNum}-${i}`);
                }
            }
            
            // Get all values in this row
            const values = fieldNames.map(name => {
                const field = document.querySelector(`[name="${name}"]`);
                return field ? field.value : '';
            });
            
            // Check if row has any data
            const hasData = values.some(v => v && v.trim() !== '');
            
            if (hasData) {
                // If row has data, all fields must be filled
                const emptyFields = [];
                fieldNames.forEach((name, idx) => {
                    if (!values[idx] || values[idx].trim() === '') {
                        emptyFields.push(name);
                    }
                });
                
                if (emptyFields.length > 0) {
                    showNotification(`❌ Row ${rowNum} is incomplete. Missing fields: ${emptyFields.join(', ')}`, 'error');
                    return false;
                }
            }
        }
    }
    
    return true;
}

// Calculate rubric total for a row and update the total field
function calculateRubricTotal(prefix, rowNum) {
    let rubricSum = 0;
    
    // Get all 5 rubric fields for this row
    for (let i = 1; i <= 5; i++) {
        if (prefix === '') {
            // Experiments: rubric1-1, rubric1-2, etc.
            const field = document.querySelector(`[name="rubric${rowNum}-${i}"]`);
            if (field && field.value) {
                rubricSum += parseFloat(field.value) || 0;
            }
        } else if (prefix === 't2') {
            // Open-ended: t2rubric1-1, t2rubric1-2, etc.
            const field = document.querySelector(`[name="t2rubric${rowNum}-${i}"]`);
            if (field && field.value) {
                rubricSum += parseFloat(field.value) || 0;
            }
        } else if (prefix === 't3') {
            // Lab exams: t3rubric1-1, t3rubric1-2, etc.
            const field = document.querySelector(`[name="t3rubric${rowNum}-${i}"]`);
            if (field && field.value) {
                rubricSum += parseFloat(field.value) || 0;
            }
        }
    }
    
    // Update total field
    let totalFieldName;
    if (prefix === '') {
        totalFieldName = `total${rowNum}`;
    } else if (prefix === 't2') {
        totalFieldName = `t2total${rowNum}`;
    } else if (prefix === 't3') {
        totalFieldName = `t3total${rowNum}`;
    }
    
    const totalField = document.querySelector(`[name="${totalFieldName}"]`);
    if (totalField) {
        totalField.value = rubricSum;
    }
}

// Calculate final assessment total (sum of attendance, lab work, open-ended project, and lab exam)
function calculateFinalAssessmentTotal() {
    // Get the four component fields
    const attendance = parseFloat(document.querySelector('[name="final1"]')?.value) || 0;
    const labWork = parseFloat(document.querySelector('[name="final2"]')?.value) || 0;
    const openEndedProject = parseFloat(document.querySelector('[name="final3"]')?.value) || 0;
    const labExam = parseFloat(document.querySelector('[name="final4"]')?.value) || 0;
    
    // Calculate total (max 75)
    const total = attendance + labWork + openEndedProject + labExam;
    
    // Update the total marks field (final5)
    const totalField = document.querySelector('[name="final5"]');
    if (totalField) {
        totalField.value = total;
    }
}

// Handle form submission
async function handleLogBookSubmit() {
    try {
        // Validate row completeness first
        if (!validateRowCompleteness()) {
            return;
        }
        
        // Get form data
        const formData = new FormData(document.getElementById('logbookForm'));
        const data = Object.fromEntries(formData.entries());
        
        console.log('===== FORM DATA =====');
        console.log(JSON.stringify(data, null, 2));
        console.log('====================');
        
        // Send to server with auth headers
        const response = await fetch(`${API_URL}/create`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        console.log('Server response:', result);
        
        if (result.success) {
            const message = result.isUpdate 
                ? '✅ Log book updated successfully!' 
                : '✅ Log book saved successfully!';
            showNotification(message, 'success');
            // Optionally clear form
            // document.getElementById('logbookForm').reset();
        } else {
            showNotification('❌ Error: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Load log book by roll number
async function loadLogBookByRoll() {
    let rollno;
    
    // Use SweetAlert2 if available, otherwise fallback to prompt
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Load Log Book',
            html: '<i class="fas fa-user"></i> Enter Roll Number:',
            input: 'number',
            inputAttributes: {
                min: 1,
                max: 99,
                step: 1
            },
            width: '600px',
            customClass: {
                input: 'swal-wide-input'
            },
            didOpen: () => {
                const input = Swal.getInput();
                if (input) {
                    input.style.width = '400px';
                    input.style.fontSize = '18px';
                    input.style.padding = '12px';
                }
            },
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-download"></i> Load',
            cancelButtonText: '<i class="fas fa-times"></i> Cancel',
            confirmButtonColor: '#2196f3',
            inputValidator: (value) => {
                if (!value) {
                    return 'Please enter a roll number!';
                }
            }
        });
        
        if (!result.isConfirmed) return;
        rollno = result.value;
    } else {
        rollno = prompt('Enter Roll Number:');
        if (!rollno) return;
    }
    
    try {
        const response = await fetch(`${API_URL}/roll/${rollno}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            loadDataIntoForm(result.data[0]);
            showNotification('✅ Data loaded successfully!', 'success');
        } else {
            showNotification('❌ No data found for roll number: ' + rollno, 'error');
        }
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Load log book by register number
async function loadLogBookByRegister() {
    let rgno;
    
    // Use SweetAlert2 if available, otherwise fallback to prompt
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'Load Log Book',
            html: '<i class="fas fa-id-card"></i> Enter Register Number:',
            input: 'number',
            inputAttributes: {
                min: 0,
                max: 3000000000,
                step: 1
            },
            width: '600px',
            customClass: {
                input: 'swal-wide-input'
            },
            didOpen: () => {
                const input = Swal.getInput();
                if (input) {
                    input.style.width = '400px';
                    input.style.fontSize = '18px';
                    input.style.padding = '12px';
                }
            },
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-download"></i> Load',
            cancelButtonText: '<i class="fas fa-times"></i> Cancel',
            confirmButtonColor: '#ff9800',
            inputValidator: (value) => {
                if (!value) {
                    return 'Please enter a register number!';
                }
            }
        });
        
        if (!result.isConfirmed) return;
        rgno = result.value;
    } else {
        rgno = prompt('Enter Register Number:');
        if (!rgno) return;
    }
    
    try {
        const response = await fetch(`${API_URL}/register/${rgno}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            loadDataIntoForm(result.data[0]);
            showNotification('✅ Data loaded successfully!', 'success');
        } else {
            showNotification('❌ No data found for register number: ' + rgno, 'error');
        }
    } catch (error) {
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// View all log books
function viewAllLogBooks() {
    window.location.href = 'logbook-viewer.html';
}

// Load data into form
function loadDataIntoForm(logBookData) {
    console.log('Loading data into form:', logBookData);
    
    // Student info
    const nameField = document.querySelector('[name="name"]');
    const rollField = document.querySelector('[name="rollno"]');
    const regField = document.querySelector('[name="rgno"]');
    
    if (nameField) nameField.value = logBookData.name || '';
    if (rollField) rollField.value = logBookData.rollno || '';
    if (regField) regField.value = logBookData.rgno || '';
    
    // Load experiments
    if (logBookData.experiments && logBookData.experiments.length > 0) {
        // First, ensure we have enough rows in the form
        const table = document.getElementById('t1');
        if (table) {
            // Count existing data rows (excluding header rows and button row)
            const existingRows = table.querySelectorAll('input[name^="date"]').length;
            const neededRows = logBookData.experiments.length;
            
            console.log(`Need ${neededRows} experiment rows, currently have ${existingRows}`);
            
            // Add rows if we need more
            if (neededRows > existingRows) {
                const rowsToAdd = neededRows - existingRows;
                console.log(`Adding ${rowsToAdd} more rows...`);
                
                for (let i = 0; i < rowsToAdd; i++) {
                    // Simulate clicking the "Add Row" button
                    const addBtn = document.getElementById('addrow');
                    if (addBtn) {
                        const fakeEvent = { preventDefault: () => {} };
                        addRow(fakeEvent);
                    }
                }
            }
        }
        
        // Populate all experiments (with a small delay if rows were added)
        const delay = logBookData.experiments.length > 7 ? 200 : 0;
        setTimeout(() => {
            populateExperiments(logBookData.experiments);
            // After experiments, load other sections
            setTimeout(() => {
                loadOpenEndedProject(logBookData.openEndedProject);
                loadLabExams(logBookData.labExams);
                loadFinalAssessment(logBookData.finalAssessment);
            }, 50);
        }, delay);
    } else {
        // No experiments, load other sections directly
        loadOpenEndedProject(logBookData.openEndedProject);
        loadLabExams(logBookData.labExams);
        loadFinalAssessment(logBookData.finalAssessment);
    }
}

function populateExperiments(experiments) {
    console.log('Populating experiments:', experiments.length);
    experiments.forEach((exp, index) => {
        const num = exp.slNo || (index + 1);
        
        // Find fields by name pattern - matching actual form field names
        const dateField = document.querySelector(`[name="date${num}"]`);
        const expField = document.querySelector(`[name="experiment${num}"]`);
        const coField = document.querySelector(`[name="co${num}"]`);
        const r1Field = document.querySelector(`[name="rubric${num}-1"]`);
        const r2Field = document.querySelector(`[name="rubric${num}-2"]`);
        const r3Field = document.querySelector(`[name="rubric${num}-3"]`);
        const r4Field = document.querySelector(`[name="rubric${num}-4"]`);
        const r5Field = document.querySelector(`[name="rubric${num}-5"]`);
        const totalField = document.querySelector(`[name="total${num}"]`);
        const studentField = document.querySelector(`[name="student${num}"]`);
        const facultyField = document.querySelector(`[name="faculty${num}"]`);
        
        console.log(`Loading experiment ${num}:`, dateField ? 'found' : 'NOT FOUND');
        
        if (dateField) dateField.value = exp.date || '';
        if (expField) expField.value = exp.experimentName || '';
        if (coField) coField.value = exp.co || '';
        if (r1Field) r1Field.value = exp.rubric1 || '';
        if (r2Field) r2Field.value = exp.rubric2 || '';
        if (r3Field) r3Field.value = exp.rubric3 || '';
        if (r4Field) r4Field.value = exp.rubric4 || '';
        if (r5Field) r5Field.value = exp.rubric5 || '';
        if (totalField) totalField.value = exp.total || '';
        if (studentField) studentField.checked = exp.studentSignature || false;
        if (facultyField) facultyField.checked = exp.facultySignature || false;
    });
}

function loadOpenEndedProject(proj) {
    if (!proj) return;
    
    const projDateField = document.querySelector('[name="t2date1"]');
    const projNameField = document.querySelector('[name="t2experiment1"]');
    const projCoField = document.querySelector('[name="t2co1"]');
    
    if (projDateField) projDateField.value = proj.date || '';
    if (projNameField) projNameField.value = proj.projectName || '';
    if (projCoField) projCoField.value = proj.co || '';
    
    for (let i = 1; i <= 5; i++) {
        const rubricField = document.querySelector(`[name="t2rubric1-${i}"]`);
        if (rubricField) rubricField.value = proj[`rubric${i}`] || '';
    }
    
    const projTotalField = document.querySelector('[name="t2total1"]');
    const projStudentField = document.querySelector('[name="t2student1"]');
    const projFacultyField = document.querySelector('[name="t2faculty1"]');
    
    if (projTotalField) projTotalField.value = proj.total || '';
    if (projStudentField) projStudentField.checked = proj.studentSignature || false;
    if (projFacultyField) projFacultyField.checked = proj.facultySignature || false;
}

function loadLabExams(labExams) {
    if (!labExams || !labExams.length) return;
    
    labExams.forEach((exam, index) => {
        const num = exam.slNo || (index + 1);
        const examDateField = document.querySelector(`[name="t3date${num}"]`);
        const examNameField = document.querySelector(`[name="exam${num}"]`);
        const examCoField = document.querySelector(`[name="t3co${num}"]`);
        
        if (examDateField) examDateField.value = exam.date || '';
        if (examNameField) examNameField.value = exam.examName || '';
        if (examCoField) examCoField.value = exam.co || '';
        
        for (let i = 1; i <= 5; i++) {
            const rubricField = document.querySelector(`[name="t3rubric${num}-${i}"]`);
            if (rubricField) rubricField.value = exam[`rubric${i}`] || '';
        }
        
        const examTotalField = document.querySelector(`[name="t3total${num}"]`);
        const examStudentField = document.querySelector(`[name="t3student${num}"]`);
        const examFacultyField = document.querySelector(`[name="t3faculty${num}"]`);
        
        if (examTotalField) examTotalField.value = exam.total || '';
        if (examStudentField) examStudentField.checked = exam.studentSignature || false;
        if (examFacultyField) examFacultyField.checked = exam.facultySignature || false;
    });
}

function loadFinalAssessment(finalAssessment) {
    if (!finalAssessment) return;
    
    const finalFields = ['final1', 'final2', 'final3', 'final4', 'final5'];
    const finalValues = ['attendance', 'labWork', 'openEndedProject', 'labExam', 'totalMarks'];
    
    finalValues.forEach((key, index) => {
        const field = document.querySelector(`[name="${finalFields[index]}"]`);
        if (field) field.value = finalAssessment[key] || '';
    });
}


// Show notification with SweetAlert2 (if available) or fallback to custom notification
function showNotification(message, type = 'info') {
    // Check if SweetAlert2 is available
    if (typeof Swal !== 'undefined') {
        const icon = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
        const title = type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Info';
        
        Swal.fire({
            title: title,
            text: message.replace(/[❌✅]/g, ''),
            icon: icon,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
    } else {
        // Fallback to original notification
        const existing = document.querySelector('.db-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `db-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Add CSS animation
if (!document.getElementById('notificationStyles')) {
    const style = document.createElement('style');
    style.id = 'notificationStyles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}
