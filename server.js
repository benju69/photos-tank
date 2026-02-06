import 'dotenv/config';
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
import { v2 as cloudinary } from 'cloudinary';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; media-src 'self' blob: https://res.cloudinary.com; connect-src 'self'"
  );
  next();
});

app.use(express.static('public'));
app.use('/api/', apiLimiter); // Apply rate limiting to all API routes

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify([], null, 2));
}

// Configure multer for memory storage (files will be uploaded to Cloudinary)
const storage = multer.memoryStorage();

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (Cloudinary free tier)
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
app.post('/api/events/:eventId/upload', uploadLimiter, upload.array('files', 20), async (req, res) => {
  const uploadedFiles = req.files || [];
  const cloudinaryPublicIds = []; // Track uploaded files for cleanup on error
  
  try {
    const { eventId } = req.params;
    const { guestName, message } = req.body;
    
    // Validate inputs
    if (!guestName || !validateInputLength(guestName, 100)) {
      return res.status(400).json({ error: 'Guest name is required and must be less than 100 characters' });
    }
    
    if (message && !validateInputLength(message, 500)) {
      return res.status(400).json({ error: 'Message must be less than 500 characters' });
    }
    
    // Sanitize inputs
    const sanitizedGuestName = sanitizeInput(guestName);
    const sanitizedMessage = message ? sanitizeInput(message) : '';
    
    const event = findEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Upload files to Cloudinary
    const uploadPromises = uploadedFiles.map(file => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `photos-tank/${eventId}`,
            resource_type: 'auto',
            public_id: `${Date.now()}-${uuidv4()}`,
            context: {
              guest_name: sanitizedGuestName,
              event_id: eventId
            }
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        uploadStream.end(file.buffer);
      });
    });
    
    const cloudinaryResults = await Promise.all(uploadPromises);
    cloudinaryResults.forEach(result => cloudinaryPublicIds.push(result.public_id));
    
    // Create file records
    const uploadedFileRecords = cloudinaryResults.map((result, index) => ({
      id: uuidv4(),
      filename: result.public_id,
      originalName: uploadedFiles[index].originalname,
      path: result.secure_url,
      thumbnailUrl: result.eager?.[0]?.secure_url || result.secure_url,
      type: uploadedFiles[index].mimetype,
      size: result.bytes,
      guestName: sanitizedGuestName,
      message: sanitizedMessage,
      uploadedAt: new Date().toISOString(),
      cloudinaryPublicId: result.public_id
    }));
    
    event.uploads.push(...uploadedFileRecords);
    
    const events = readEvents();
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
      // Rollback: delete uploaded files from Cloudinary
      await Promise.all(
        cloudinaryPublicIds.map(publicId =>
          cloudinary.uploader.destroy(publicId).catch(err =>
            console.error('Error deleting from Cloudinary:', publicId, err)
          )
        )
      );
      return res.status(404).json({ error: 'Event not found in database' });
    }
    
    events[eventIndex] = event;
    
    try {
      writeEvents(events);
    } catch (writeError) {
      // Rollback: delete uploaded files from Cloudinary
      await Promise.all(
        cloudinaryPublicIds.map(publicId =>
          cloudinary.uploader.destroy(publicId).catch(err =>
            console.error('Error deleting from Cloudinary:', publicId, err)
          )
        )
      );
      throw writeError;
    }
    
    res.json({ 
      success: true, 
      files: uploadedFileRecords,
      message: `Successfully uploaded ${uploadedFileRecords.length} file(s)`
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    // Rollback: delete any successfully uploaded files from Cloudinary
    if (cloudinaryPublicIds.length > 0) {
      await Promise.all(
        cloudinaryPublicIds.map(publicId =>
          cloudinary.uploader.destroy(publicId).catch(err =>
            console.error('Error deleting from Cloudinary:', publicId, err)
          )
        )
      );
    }
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
app.get('/api/events/:eventId/download', async (req, res) => {
  try {
    const event = findEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (!event.uploads || event.uploads.length === 0) {
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
    
    // Download files from Cloudinary and add to archive
    for (const upload of event.uploads) {
      try {
        const response = await fetch(upload.path);
        if (!response.ok) {
          console.error(`Failed to fetch ${upload.path}: ${response.statusText}`);
          continue;
        }
        
        const buffer = await response.arrayBuffer();
        const ext = path.extname(upload.originalName) || '.jpg';
        const filename = `${upload.guestName}_${upload.id}${ext}`;
        
        archive.append(Buffer.from(buffer), { name: filename });
      } catch (error) {
        console.error(`Error downloading file ${upload.path}:`, error);
        // Continue with other files even if one fails
      }
    }
    
    await archive.finalize();
  } catch (error) {
    console.error('Error downloading gallery:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download gallery' });
    }
  }
});

// Error handling middleware for multer errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum file size is 10MB per file. Please compress your images/videos or use smaller files.' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files. Maximum 20 files per upload.' 
      });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  
  next(err);
});

// Serve frontend - catch all routes not matched by API
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
