# Photos Tank 📸

Easy Guest Photo Sharing for Weddings & Events

## Overview

Photos Tank is a simple, elegant solution for collecting photos and videos from your wedding or event guests. No registration required - guests simply scan a QR code or tap a link to start sharing!

## Features

- **✨ Create Private Event Galleries** - Set up a dedicated gallery for your wedding or event in seconds
- **📱 Easy Guest Access** - Guests scan a QR code or tap a link - no registration or app download needed
- **📸 Upload Photos & Videos** - Guests can upload multiple photos and videos with their name and optional messages (max 10MB per file)
- **💬 Guest Messages** - Each upload can include a personal message from the guest
- **🖼️ Live Gallery** - Everyone can view all shared photos and videos in real-time
- **📦 Download as ZIP** - Download the entire gallery as a full-resolution ZIP file
- **🎨 Beautiful UI** - Modern, responsive design that works on all devices
- **☁️ Cloud Storage** - Files stored securely in Cloudinary (25GB free tier)

## Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/benju69/photos-tank.git
cd photos-tank

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your Cloudinary credentials

# Start the server
npm start
```

The application will be available at `http://localhost:3001`

### Environment Setup

1. **Sign up for Cloudinary** (free tier: 25GB storage)
   - Go to [cloudinary.com](https://cloudinary.com)
   - Create a free account
   - Get your credentials from the Dashboard

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in your Cloudinary credentials:
     ```
     CLOUDINARY_CLOUD_NAME=your_cloud_name
     CLOUDINARY_API_KEY=your_api_key
     CLOUDINARY_API_SECRET=your_api_secret
     ```

### Deploy to Render (Free Hosting)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Render**
   - Sign up at [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Render will auto-detect the configuration from `render.yaml`
   - Add your environment variables in Render Dashboard:
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
   - Click "Create Web Service"

Your app will be live at `https://your-app-name.onrender.com`

**Note**: Free tier sleeps after 15 minutes of inactivity (30-second cold start on first request).

### Usage

1. **Create an Event**
   - Go to the home page
   - Click "Create Event" tab
   - Enter your event name and optional description
   - Click "Create Event Gallery"

2. **Share with Guests**
   - After creating an event, you'll receive a QR code and a shareable link
   - Display the QR code at your event or share the link via email/text
   - Guests can scan the code or click the link to access the upload page

3. **Guests Upload Photos**
   - Guests enter their name
   - Optionally add a message
   - Select or drag & drop photos/videos
   - Click "Upload Files"

4. **View Gallery**
   - All uploads appear in the live gallery immediately
   - Gallery shows guest names, messages, and timestamps
   - Gallery auto-refreshes every 10 seconds

5. **Download Gallery**
   - From the admin view, click "Download All Photos & Videos (ZIP)"
   - All files are downloaded with guest names prefixed

## Technology Stack

- **Backend**: Node.js with Express
- **File Upload**: Multer
- **Cloud Storage**: Cloudinary (25GB free tier)
- **QR Code Generation**: qrcode
- **ZIP Creation**: archiver
- **Frontend**: Vanilla JavaScript (no framework needed!)
- **Styling**: Custom CSS with gradient backgrounds
- **Hosting**: Render (free tier)

## API Endpoints

- `POST /api/events` - Create a new event
- `GET /api/events` - Get all events
- `GET /api/events/:eventId` - Get specific event details
- `POST /api/events/:eventId/upload` - Upload files to an event
- `GET /api/events/:eventId/gallery` - Get event gallery
- `GET /api/events/:eventId/download` - Download gallery as ZIP

## File Structure

```
photos-tank/
├── server.js           # Express server and API endpoints
├── public/
│   └── index.html      # Frontend application (SPA)
├── data/               # Event data storage (auto-created)
├── .env.example        # Environment variables template
├── .env                # Your local environment variables (git-ignored)
├── render.yaml         # Render deployment configuration
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

**Note**: Photos are stored in Cloudinary, not locally.

## Configuration

**Environment Variables:**

- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name (required)
- `CLOUDINARY_API_KEY` - Your Cloudinary API key (required)
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret (required)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

**Cloudinary Free Tier Limits:**
- 25GB storage (plenty for most events)
- **10MB max file size per upload**
- Automatic image optimization
- Fast global CDN delivery
- No server storage needed

**File Size Recommendations:**
- Most smartphone photos are 2-5MB (perfect!)
- If files exceed 10MB, compress them before uploading
- Videos should ideally be under 10MB or pre-compressed

## Data Storage

- **Events**: Stored in JSON format in `data/events.json`
- **Photos/Videos**: Stored in Cloudinary cloud storage
- **Metadata**: Each upload is tracked with guest name, message, timestamp, etc.
- **Organization**: Files are organized by event ID in Cloudinary folders

## Features in Detail

### QR Code Generation
Every event automatically gets a unique QR code that links directly to the guest upload page.

### File Labeling
All uploaded files are labeled with:
- Guest name
- Upload timestamp
- Optional message
- Original filename

### Gallery Organization
The gallery displays:
- Newest uploads first
- Guest name for each upload
- Personal messages (if provided)
- Upload date and time
- Thumbnail previews (click to view full size)

### ZIP Download
The download feature:
- Includes all photos and videos at full resolution
- Prefixes filenames with guest names for easy organization
- Creates a single ZIP file for convenient sharing

## Browser Support

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential features for future versions:
- User authentication for event organizers
- Database integration (MongoDB, PostgreSQL)
- Real-time updates using WebSockets
- Photo moderation/approval
- Custom event themes
- Social media integration
- Email notifications

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues or questions, please open an issue on GitHub.