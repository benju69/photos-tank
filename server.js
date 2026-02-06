import express from 'express';
import multer from 'multer';
import QRCode from 'qrcode';
import archiver from 'archiver';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit uploads to 20 per 15 minutes
  message: 'Too many uploads from this IP, please try again later.'
});

// Middleware
app.use(cors());
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'"
  );
  next();
});

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/api/', apiLimiter); // Apply rate limiting to all API routes

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify([], null, 2));
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const eventId = req.params.eventId || req.body.eventId;
    const eventDir = path.join(UPLOADS_DIR, eventId);
    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }
    cb(null, eventDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Allowed file types for uploads
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.mp4',
  '.webm',
  '.ogg',
  '.mov',
  '.avi'
]);

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();

    if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
      return cb(null, true);
    }

    return cb(new Error('Invalid file type. Only image and video uploads are allowed.'), false);
  }
});

// Helper functions

// Sanitize user input to prevent XSS
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Validate input length
function validateInputLength(input, maxLength = 500) {
  if (typeof input !== 'string') return false;
  return input.length > 0 && input.length <= maxLength;
}

function readEvents() {
  try {
    const data = fs.readFileSync(EVENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading events file:', error.message);
    return [];
  }
}

function writeEvents(events) {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
  } catch (error) {
    console.error('Error writing events file:', error.message);
    throw error;
  }
}

function findEvent(eventId) {
  const events = readEvents();
  return events.find(e => e.id === eventId);
}

// API Routes

// Create a new event
app.post('/api/events', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validate inputs
    if (!name || !validateInputLength(name, 200)) {
      return res.status(400).json({ error: 'Event name is required and must be less than 200 characters' });
    }
    
    if (description && !validateInputLength(description, 1000)) {
      return res.status(400).json({ error: 'Description must be less than 1000 characters' });
    }
    
    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = description ? sanitizeInput(description) : '';
    
    const eventId = uuidv4();
    const eventLink = `${req.protocol}://${req.get('host')}/event/${eventId}`;
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(eventLink);
    
    const newEvent = {
      id: eventId,
      name: sanitizedName,
      description: sanitizedDescription,
      createdAt: new Date().toISOString(),
      link: eventLink,
      qrCode,
      uploads: []
    };
    
    const events = readEvents();
    events.push(newEvent);
    writeEvents(events);
    
    // Create event directory
    const eventDir = path.join(UPLOADS_DIR, eventId);
    if (!fs.existsSync(eventDir)) {
      fs.mkdirSync(eventDir, { recursive: true });
    }
    
    res.json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get all events
app.get('/api/events', (req, res) => {
  try {
    const events = readEvents();
    res.json(events);
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get a specific event
app.get('/api/events/:eventId', (req, res) => {
  try {
    const event = findEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

// Upload files to an event
app.post('/api/events/:eventId/upload', uploadLimiter, upload.array('files', 20), (req, res) => {
  const uploadedFiles = req.files || [];
  
  try {
    const { eventId } = req.params;
    const { guestName, message } = req.body;
    
    // Validate inputs
    if (!guestName || !validateInputLength(guestName, 100)) {
      // Clean up uploaded files
      uploadedFiles.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error deleting file:', file.path, err);
        }
      });
      return res.status(400).json({ error: 'Guest name is required and must be less than 100 characters' });
    }
    
    if (message && !validateInputLength(message, 500)) {
      // Clean up uploaded files
      uploadedFiles.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error deleting file:', file.path, err);
        }
      });
      return res.status(400).json({ error: 'Message must be less than 500 characters' });
    }
    
    // Sanitize inputs
    const sanitizedGuestName = sanitizeInput(guestName);
    const sanitizedMessage = message ? sanitizeInput(message) : '';
    
    const event = findEvent(eventId);
    if (!event) {
      // Clean up uploaded files
      uploadedFiles.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error deleting file:', file.path, err);
        }
      });
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const uploadedFileRecords = uploadedFiles.map(file => ({
      id: uuidv4(),
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/${eventId}/${file.filename}`,
      type: file.mimetype,
      size: file.size,
      guestName: sanitizedGuestName,
      message: sanitizedMessage,
      uploadedAt: new Date().toISOString()
    }));
    
    event.uploads.push(...uploadedFileRecords);
    
    const events = readEvents();
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      // Clean up uploaded files
      uploadedFiles.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error deleting file:', file.path, err);
        }
      });
      return res.status(404).json({ error: 'Event not found in database' });
    }
    
    events[eventIndex] = event;
    
    try {
      writeEvents(events);
    } catch (writeError) {
      // If database write fails, clean up uploaded files to prevent orphaned files
      uploadedFiles.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error deleting file:', file.path, err);
        }
      });
      throw writeError;
    }
    
    res.json({ 
      success: true, 
      files: uploadedFileRecords,
      message: `Successfully uploaded ${uploadedFileRecords.length} file(s)`
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    // Clean up uploaded files on any error
    uploadedFiles.forEach(file => {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (err) {
        console.error('Error deleting file:', file.path, err);
      }
    });
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Get uploads for an event (gallery)
app.get('/api/events/:eventId/gallery', (req, res) => {
  try {
    const event = findEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({
      eventName: event.name,
      uploads: event.uploads || []
    });
  } catch (error) {
    console.error('Error getting gallery:', error);
    res.status(500).json({ error: 'Failed to get gallery' });
  }
});

// Download event gallery as ZIP
app.get('/api/events/:eventId/download', (req, res) => {
  try {
    const event = findEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const eventDir = path.join(UPLOADS_DIR, req.params.eventId);
    if (!fs.existsSync(eventDir)) {
      return res.status(404).json({ error: 'No files to download' });
    }
    
    const safeEventName = event.name.replace(/[^a-z0-9]/gi, '_');
    const safeEventId = String(req.params.eventId).slice(0, 8);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeEventName}_${safeEventId}_gallery.zip"`);
    
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.end();
      }
    });
    
    archive.pipe(res);
    
    // Add all files from event directory
    const files = fs.readdirSync(eventDir);
    files.forEach(file => {
      const filePath = path.join(eventDir, file);
      const upload = event.uploads.find(u => u.filename === file);
      const guestName = upload ? upload.guestName : 'untracked';
      if (!upload) {
        console.warn(`File ${file} found in directory but not in event metadata`);
      }
      archive.file(filePath, { name: `${guestName}_${file}` });
    });
    
    archive.finalize();
  } catch (error) {
    console.error('Error downloading gallery:', error);
    res.status(500).json({ error: 'Failed to download gallery' });
  }
});

// Serve frontend - catch all routes not matched by API
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
