# Photos Tank 📸

Easy Guest Photo Sharing for Weddings & Events

## Overview

Photos Tank is a simple, elegant solution for collecting photos and videos from your wedding or event guests. No registration required - guests simply scan a QR code or tap a link to start sharing!

## Features

- **✨ Create Private Event Galleries** - Set up a dedicated gallery for your wedding or event in seconds
- **📱 Easy Guest Access** - Guests scan a QR code or tap a link - no registration or app download needed
- **📸 Upload Photos & Videos** - Guests can upload multiple photos and videos with their name and optional messages
- **💬 Guest Messages** - Each upload can include a personal message from the guest
- **🖼️ Live Gallery** - Everyone can view all shared photos and videos in real-time
- **📦 Download as ZIP** - Download the entire gallery as a full-resolution ZIP file
- **🎨 Beautiful UI** - Modern, responsive design that works on all devices

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/benju69/photos-tank.git
cd photos-tank

# Install dependencies
npm install

# Start the server
npm start
```

The application will be available at `http://localhost:3001`

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
- **QR Code Generation**: qrcode
- **ZIP Creation**: archiver
- **Frontend**: Vanilla JavaScript (no framework needed!)
- **Styling**: Custom CSS with gradient backgrounds

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
├── uploads/            # Uploaded files (auto-created)
├── data/               # Event data storage (auto-created)
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## Configuration

The server runs on port 3001 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Data Storage

- Events are stored in JSON format in `data/events.json`
- Uploaded files are organized in `uploads/[eventId]/`
- Each upload is tracked with metadata (guest name, message, timestamp, etc.)

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