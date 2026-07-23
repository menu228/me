const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage to accept JavaScript files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Keeping original name for demonstration purposes
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Audit Logging Middleware
app.use((req, res, next) => {
    const logEntry = `[${new Date().toISOString()] ${req.method} ${req.url} - IP: ${req.ip}\n`;
    fs.appendFileSync(path.join(__dirname, 'audit.log'), logEntry);
    next();
});

// 1. Portfolio Data Endpoint
app.get('/api/investments', (req, res) => {
    const portfolio = [
        { id: 1, asset: 'Tech Growth Fund', value: 45000, allocation: '40%' },
        { id: 2, asset: 'Green Energy ETF', value: 25000, allocation: '25%' },
        { id: 3, asset: 'Government Bonds', value: 35000, allocation: '35%' }
    ];
    res.json({ success: true, portfolio });
});

// 2. File Upload Endpoint (Vulnerable)
app.post('/admin/upload', upload.single('scriptFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }
    res.json({ 
        success: true, 
        message: 'File uploaded successfully', 
        filename: req.file.filename 
    });
});

// 3. RCE Execution Endpoint (Vulnerable)
app.get('/admin/exec/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'File not found.' });
    }

    // VULNERABILITY: Executing uploaded user file directly via node
    exec(`node "${filePath}"`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ 
                success: false, 
                error: error.message, 
                stderr 
            });
        }
        res.json({ 
            success: true, 
            stdout, 
            stderr 
        });
    });
});

// Serve Front-End Dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[+] Investment dashboard running on port ${PORT}`);
});
