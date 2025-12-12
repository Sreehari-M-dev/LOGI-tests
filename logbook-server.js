const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

const JWT_SECRET = 'your-secret-key-change-in-production'; // Same as auth-server

// Security Enhancement: Simple rate limiting middleware
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 100; // Max requests per window

function simpleRateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    } else {
        const data = requestCounts.get(ip);
        if (now > data.resetTime) {
            data.count = 1;
            data.resetTime = now + RATE_LIMIT_WINDOW;
        } else {
            data.count++;
            if (data.count > MAX_REQUESTS) {
                return res.status(429).json({ 
                    success: false, 
                    error: 'Too many requests. Please try again later.' 
                });
            }
        }
    }
    next();
}

// Security Enhancement: Input sanitization middleware
function sanitizeInput(obj) {
    if (typeof obj === 'string') {
        return obj.replace(/[<>]/g, '').trim();
    }
    if (typeof obj === 'object' && obj !== null) {
        for (let key in obj) {
            obj[key] = sanitizeInput(obj[key]);
        }
    }
    return obj;
}

// JWT Token verification function
function verifyToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        
        const [header, payload, signature] = parts;
        const expectedSignature = crypto
            .createHmac('sha256', JWT_SECRET)
            .update(`${header}.${payload}`)
            .digest('base64');
        
        if (signature !== expectedSignature) return null;
        
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
        const now = Math.floor(Date.now() / 1000);
        
        if (decodedPayload.exp < now) return null; // Token expired
        
        return decodedPayload;
    } catch (error) {
        return null;
    }
}

// Authentication middleware
function authenticateToken(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'Authentication failed' });
    }
}

// Middleware
app.use(cors({
    origin: '*',  // Allow all origins for debugging
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: false
}));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

app.use(simpleRateLimit);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
const MONGODB_URI = 'mongodb://localhost:27017/LOGI';
mongoose.connect(MONGODB_URI)
.then(() => console.log('Connected to MongoDB - Database: LOGI'))
.catch((err) => console.error('MongoDB connection error:', err));

// Log Book Schema - updated to support multiple subjects per student
const logBookSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rollno: { type: Number, required: true },
    rgno: { type: Number, required: true },
    subject: { type: String, required: true }, // Subject/Course name
    code: { type: String }, // Subject code
    semester: { type: Number },
    experiments: [{
        slNo: Number,
        date: String,
        experimentName: String,
        co: Number,
        rubric1: Number,
        rubric2: Number,
        rubric3: Number,
        rubric4: Number,
        rubric5: Number,
        total: Number,
        studentSignature: Boolean,
        facultySignature: Boolean
    }],
    openEndedProject: {
        date: String,
        projectName: String,
        co: Number,
        rubric1: Number,
        rubric2: Number,
        rubric3: Number,
        rubric4: Number,
        rubric5: Number,
        total: Number,
        studentSignature: Boolean,
        facultySignature: Boolean
    },
    labExams: [{
        slNo: Number,
        date: String,
        examName: String,
        co: Number,
        rubric1: Number,
        rubric2: Number,
        rubric3: Number,
        rubric4: Number,
        rubric5: Number,
        total: Number,
        studentSignature: Boolean,
        facultySignature: Boolean
    }],
    finalAssessment: {
        attendance: Number,
        labWork: Number,
        openEndedProject: Number,
        labExam: Number,
        totalMarks: Number
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const LogBook = mongoose.model('LogBook', logBookSchema);

// Create or update log book entry
app.post('/api/logbook/create', authenticateToken, async (req, res) => {
    try {
        // Only students can create logbooks
        if (req.user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'Only students can create logbooks. Faculty can view and manage student logbooks.'
            });
        }
        
        // Sanitize input data
        const sanitizedBody = sanitizeInput(req.body);
        console.log('Received data from user:', req.user.rgno);
        
        // Validate required fields
        if (!sanitizedBody.name || !sanitizedBody.rollno || !sanitizedBody.rgno || !sanitizedBody.subject) {
            return res.status(400).json({
                success: false,
                error: 'Name, Roll Number, Register Number, and Subject are required'
            });
        }

        // Students can only create/update their own logbook
        if (parseInt(sanitizedBody.rgno) !== req.user.rgno) {
            return res.status(403).json({
                success: false,
                error: 'You can only edit your own logbook'
            });
        }
        
        // Parse experiments from form data
        const experiments = [];
        let expIndex = 1;
        while (sanitizedBody[`date${expIndex}`] || sanitizedBody[`experiment${expIndex}`]) {
            const rubricKey1 = `rubric${expIndex}-1`;
            const rubricVal1 = sanitizedBody[rubricKey1];
            console.log(`Parsing exp ${expIndex}: key="${rubricKey1}" value="${rubricVal1}"`);
            
            experiments.push({
                slNo: expIndex,
                date: sanitizedBody[`date${expIndex}`] || '',
                experimentName: sanitizedBody[`experiment${expIndex}`] || '',
                co: parseInt(sanitizedBody[`co${expIndex}`]) || 0,
                rubric1: parseInt(sanitizedBody[`rubric${expIndex}-1`]) || 0,
                rubric2: parseInt(sanitizedBody[`rubric${expIndex}-2`]) || 0,
                rubric3: parseInt(sanitizedBody[`rubric${expIndex}-3`]) || 0,
                rubric4: parseInt(sanitizedBody[`rubric${expIndex}-4`]) || 0,
                rubric5: parseInt(sanitizedBody[`rubric${expIndex}-5`]) || 0,
                total: parseInt(sanitizedBody[`total${expIndex}`]) || 0,
                studentSignature: sanitizedBody[`student${expIndex}`] === 'on',
                facultySignature: sanitizedBody[`faculty${expIndex}`] === 'on'
            });
            expIndex++;
        }
        
        // Parse lab exams
        const labExams = [];
        for (let i = 1; i <= 3; i++) {
            if (sanitizedBody[`t3date${i}`] || sanitizedBody[`exam${i}`]) {
                labExams.push({
                    slNo: i,
                    date: sanitizedBody[`t3date${i}`] || '',
                    examName: sanitizedBody[`exam${i}`] || `Lab Exam ${i}`,
                    co: parseInt(sanitizedBody[`t3co${i}`]) || 0,
                    rubric1: parseInt(sanitizedBody[`t3rubric${i}-1`]) || 0,
                    rubric2: parseInt(sanitizedBody[`t3rubric${i}-2`]) || 0,
                    rubric3: parseInt(sanitizedBody[`t3rubric${i}-3`]) || 0,
                    rubric4: parseInt(sanitizedBody[`t3rubric${i}-4`]) || 0,
                    rubric5: parseInt(sanitizedBody[`t3rubric${i}-5`]) || 0,
                    total: parseInt(sanitizedBody[`t3total${i}`]) || 0,
                    studentSignature: sanitizedBody[`t3student${i}`] === 'on',
                    facultySignature: sanitizedBody[`t3faculty${i}`] === 'on'
                });
            }
        }
        
        const newData = {
            name: sanitizedBody.name,
            rollno: parseInt(sanitizedBody.rollno),
            rgno: parseInt(sanitizedBody.rgno),
            subject: sanitizedBody.subject,
            code: sanitizedBody.code || '',
            semester: sanitizedBody.semester ? parseInt(sanitizedBody.semester) : null,
            experiments: experiments,
            openEndedProject: {
                date: sanitizedBody.t2date1 || '',
                projectName: sanitizedBody.t2experiment1 || '',
                co: parseInt(sanitizedBody.t2co1) || 0,
                rubric1: parseInt(sanitizedBody['t2rubric1-1']) || 0,
                rubric2: parseInt(sanitizedBody['t2rubric1-2']) || 0,
                rubric3: parseInt(sanitizedBody['t2rubric1-3']) || 0,
                rubric4: parseInt(sanitizedBody['t2rubric1-4']) || 0,
                rubric5: parseInt(sanitizedBody['t2rubric1-5']) || 0,
                total: parseInt(sanitizedBody.t2total1) || 0,
                studentSignature: sanitizedBody.t2student1 === 'on',
                facultySignature: sanitizedBody.t2faculty1 === 'on'
            },
            labExams: labExams,
            finalAssessment: {
                attendance: parseFloat(req.body.final1) || 0,
                labWork: parseFloat(req.body.final2) || 0,
                openEndedProject: parseFloat(req.body.final3) || 0,
                labExam: parseFloat(req.body.final4) || 0,
                totalMarks: parseFloat(req.body.final5) || 0
            },
            updatedAt: new Date()
        };
        
        // Check if logbook exists for this student and subject
        const existing = await LogBook.findOne({ 
            rollno: newData.rollno,
            rgno: newData.rgno,
            subject: newData.subject
        });
        
        let result;
        if (existing) {
            // Smart merge: only update fields with actual values
            
            // Update name if provided
            if (newData.name) existing.name = newData.name;
            
            // Merge experiments - keep existing, add/update only filled ones
            const existingExps = existing.experiments || [];
            newData.experiments.forEach(newExp => {
                const existingExp = existingExps.find(e => e.slNo === newExp.slNo);
                if (existingExp) {
                    // Update existing experiment only if new fields have values
                    if (newExp.date) existingExp.date = newExp.date;
                    if (newExp.experimentName) existingExp.experimentName = newExp.experimentName;
                    if (newExp.co) existingExp.co = newExp.co;
                    if (newExp.rubric1) existingExp.rubric1 = newExp.rubric1;
                    if (newExp.rubric2) existingExp.rubric2 = newExp.rubric2;
                    if (newExp.rubric3) existingExp.rubric3 = newExp.rubric3;
                    if (newExp.rubric4) existingExp.rubric4 = newExp.rubric4;
                    if (newExp.rubric5) existingExp.rubric5 = newExp.rubric5;
                    if (newExp.total) existingExp.total = newExp.total;
                    if (newExp.studentSignature !== undefined) existingExp.studentSignature = newExp.studentSignature;
                    if (newExp.facultySignature !== undefined) existingExp.facultySignature = newExp.facultySignature;
                } else if (newExp.date || newExp.experimentName) {
                    // Add new experiment only if it has some data
                    existingExps.push(newExp);
                }
            });
            existing.experiments = existingExps;
            
            // Merge open-ended project
            if (!existing.openEndedProject) existing.openEndedProject = {};
            if (newData.openEndedProject.date) existing.openEndedProject.date = newData.openEndedProject.date;
            if (newData.openEndedProject.projectName) existing.openEndedProject.projectName = newData.openEndedProject.projectName;
            if (newData.openEndedProject.co) existing.openEndedProject.co = newData.openEndedProject.co;
            if (newData.openEndedProject.rubric1) existing.openEndedProject.rubric1 = newData.openEndedProject.rubric1;
            if (newData.openEndedProject.rubric2) existing.openEndedProject.rubric2 = newData.openEndedProject.rubric2;
            if (newData.openEndedProject.rubric3) existing.openEndedProject.rubric3 = newData.openEndedProject.rubric3;
            if (newData.openEndedProject.rubric4) existing.openEndedProject.rubric4 = newData.openEndedProject.rubric4;
            if (newData.openEndedProject.rubric5) existing.openEndedProject.rubric5 = newData.openEndedProject.rubric5;
            if (newData.openEndedProject.total) existing.openEndedProject.total = newData.openEndedProject.total;
            
            // Merge lab exams
            const existingExams = existing.labExams || [];
            newData.labExams.forEach(newExam => {
                const existingExam = existingExams.find(e => e.slNo === newExam.slNo);
                if (existingExam) {
                    if (newExam.date) existingExam.date = newExam.date;
                    if (newExam.examName) existingExam.examName = newExam.examName;
                    if (newExam.co) existingExam.co = newExam.co;
                    if (newExam.rubric1) existingExam.rubric1 = newExam.rubric1;
                    if (newExam.rubric2) existingExam.rubric2 = newExam.rubric2;
                    if (newExam.rubric3) existingExam.rubric3 = newExam.rubric3;
                    if (newExam.rubric4) existingExam.rubric4 = newExam.rubric4;
                    if (newExam.rubric5) existingExam.rubric5 = newExam.rubric5;
                    if (newExam.total) existingExam.total = newExam.total;
                } else if (newExam.date || newExam.examName) {
                    existingExams.push(newExam);
                }
            });
            existing.labExams = existingExams;
            
            // Merge final assessment
            if (!existing.finalAssessment) existing.finalAssessment = {};
            if (newData.finalAssessment.attendance) existing.finalAssessment.attendance = newData.finalAssessment.attendance;
            if (newData.finalAssessment.labWork) existing.finalAssessment.labWork = newData.finalAssessment.labWork;
            if (newData.finalAssessment.openEndedProject) existing.finalAssessment.openEndedProject = newData.finalAssessment.openEndedProject;
            if (newData.finalAssessment.labExam) existing.finalAssessment.labExam = newData.finalAssessment.labExam;
            if (newData.finalAssessment.totalMarks) existing.finalAssessment.totalMarks = newData.finalAssessment.totalMarks;
            
            existing.updatedAt = new Date();
            result = await existing.save();
            console.log('Updated log book (smart merge):', result._id);
            res.json({ success: true, message: 'Log book updated successfully', id: result._id, isUpdate: true });
        } else {
            // Create new record
            const logBook = new LogBook(newData);
            result = await logBook.save();
            console.log('Created new log book:', result._id);
            res.json({ success: true, message: 'Log book saved successfully', id: result._id, isUpdate: false });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all log books (Faculty/Admin only)
app.get('/api/logbook/all', authenticateToken, async (req, res) => {
    try {
        // Only faculty and admin can view all logbooks
        if (req.user.role === 'student') {
            return res.status(403).json({ 
                success: false, 
                error: 'Students can only view their own logbook' 
            });
        }

        const logBooks = await LogBook.find().sort({ createdAt: -1 });
        res.json({ success: true, count: logBooks.length, data: logBooks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get logbooks for authenticated student (must be before :id route)
app.get('/api/logbook/my-logbooks', authenticateToken, async (req, res) => {
    try {
        // Get all logbooks for the authenticated student
        const logBooks = await LogBook.find({ rgno: req.user.rgno }).sort({ createdAt: -1 });
        console.log(`Student ${req.user.rgno} has ${logBooks.length} logbooks`);
        res.json({ 
            success: true, 
            count: logBooks.length, 
            data: logBooks
        });
    } catch (error) {
        console.error('Error fetching logbooks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get by ID (Faculty/Admin only or own student logbook)
app.get('/api/logbook/:id', authenticateToken, async (req, res) => {
    try {
        const logBook = await LogBook.findById(req.params.id);
        if (!logBook) return res.status(404).json({ success: false, error: 'Not found' });
        
        // Students can only view their own logbook
        if (req.user.role === 'student' && logBook.rgno !== req.user.rgno) {
            return res.status(403).json({ 
                success: false, 
                error: 'You can only view your own logbook' 
            });
        }
        
        res.json({ success: true, data: logBook });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get by roll number (Faculty/Admin only or own student)
app.get('/api/logbook/roll/:rollno', authenticateToken, async (req, res) => {
    try {
        // Faculty and Admin can view any roll number
        // Students can only view their own
        if (req.user.role === 'student') {
            return res.status(403).json({ 
                success: false, 
                error: 'Students can only view their own logbook' 
            });
        }

        const rollno = parseInt(req.params.rollno);
        const logBooks = await LogBook.find({ rollno: rollno }).sort({ createdAt: -1 });
        console.log(`Finding by roll ${rollno}: found ${logBooks.length} records`);
        res.json({ success: true, count: logBooks.length, data: logBooks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get by register number (Faculty/Admin only or own student)
app.get('/api/logbook/register/:rgno', authenticateToken, async (req, res) => {
    try {
        const rgno = parseInt(req.params.rgno);
        
        // Students can only view their own logbooks
        if (req.user.role === 'student' && rgno !== req.user.rgno) {
            return res.status(403).json({ 
                success: false, 
                error: 'You can only view your own logbooks' 
            });
        }

        // Get all logbooks for this student (multiple subjects)
        const logBooks = await LogBook.find({ rgno: rgno }).sort({ createdAt: -1 });
        console.log(`Finding logbooks for register ${rgno}: found ${logBooks.length} records (user role: ${req.user.role})`);
        res.json({ success: true, count: logBooks.length, data: logBooks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete by ID
app.delete('/api/logbook/:id', async (req, res) => {
    try {
        const logBook = await LogBook.findByIdAndDelete(req.params.id);
        if (!logBook) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Log Book Server running on port ${PORT}\nDatabase: LOGI`));
