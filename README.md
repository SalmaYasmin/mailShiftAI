# MailSift AI - Chrome Extension

An AI-powered Chrome extension that intelligently prioritizes and summarizes emails across Gmail, Outlook Web, and Yahoo Mail. Built with privacy-first principles and modern web technologies.

## 🚀 Features

### Core Functionality
- **Multi-Platform Support**: Works seamlessly with Gmail, Outlook Web, and Yahoo Mail
- **Smart Email Prioritization**: Automatically highlights and moves important emails to the top based on user-defined keywords
- **AI-Powered Summarization**: Uses OpenAI GPT-4 to generate concise email summaries
- **Floating Widget**: Displays top 5 priority emails with summaries in a draggable widget
- **Real-time Updates**: Monitors inbox changes and updates prioritization dynamically

### Privacy & Security
- **Privacy-First Design**: Never stores or logs email content
- **Local Processing**: All prioritization logic runs locally in your browser
- **Consent-Based AI**: Requires explicit user consent before using AI features
- **Secure API Calls**: Only sends email content (not metadata) to OpenAI
- **Opt-out Anytime**: Users can disable AI features at any time

### User Experience
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Customizable Keywords**: Add/remove priority keywords through the popup interface
- **Visual Highlighting**: Color-coded priority levels with badges and animations
- **Draggable Widget**: Position the floating widget anywhere on the page
- **Responsive Design**: Works on desktop and mobile browsers

## 📦 Installation

### For Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/mailsift-ai.git
   cd mailsift-ai
   ```

2. **Open Chrome and navigate to Extensions**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the extension**
   - Click "Load unpacked"
   - Select the project directory

4. **Configure OpenAI API Key** (Optional)
   - Open `summarizer.js`
   - Replace `'sk-your-openai-api-key-here'` with your actual OpenAI API key
   - **Note**: For production, implement a secure proxy endpoint (see Security section)

### For Production

1. **Build the extension**
   ```bash
   # Add build process if needed
   npm run build
   ```

2. **Package for Chrome Web Store**
   - Zip all files (excluding development files)
   - Submit to Chrome Web Store

## 🔧 Configuration

### OpenAI API Key Setup

**Option 1: Direct API Key (Development Only)**
```javascript
// In summarizer.js
this.apiKey = 'sk-your-actual-openai-api-key';
```

**Option 2: Secure Proxy (Recommended for Production)**
```javascript
// In background.js - implement proxy endpoint
async function handleProxyRequest(data) {
  const response = await fetch('https://your-proxy.com/api/summarize', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer your-proxy-key' },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

### Default Settings

The extension comes with sensible defaults:
- **Default Keywords**: `['urgent', 'important', 'meeting', 'deadline']`
- **Highlight Mode**: Enabled
- **AI Summarization**: Enabled (requires consent)
- **Widget Display**: Enabled

## 🏗️ Architecture

### File Structure
```
mailsift-ai/
├── manifest.json              # Extension manifest (Manifest V3)
├── content.js                 # Main content script orchestrator
├── background.js              # Service worker for lifecycle management
├── popup.html                 # Settings popup interface
├── popup.js                   # Popup logic and event handling
├── popup.css                  # Popup styling
├── summarizer.js              # OpenAI API integration
├── utils/
│   ├── email-detector.js      # Email service detection
│   ├── email-extractor.js     # DOM email extraction
│   ├── email-prioritizer.js   # Priority calculation and highlighting
│   └── widget-manager.js      # Floating widget management
├── styles/
│   └── content.css            # Content script styling
└── README.md                  # This file
```

### Key Components

#### Email Detector (`utils/email-detector.js`)
- Detects which email service is being used (Gmail, Outlook, Yahoo)
- Provides service-specific DOM selectors
- Handles URL-based service identification

#### Email Extractor (`utils/email-extractor.js`)
- Extracts email data from DOM elements
- Handles different email service layouts
- Uses MutationObserver for dynamic content updates

#### Email Prioritizer (`utils/email-prioritizer.js`)
- Calculates priority scores based on keywords
- Applies visual highlighting and reordering
- Manages user settings and preferences

#### Widget Manager (`utils/widget-manager.js`)
- Creates and manages the floating widget
- Handles draggable functionality
- Displays email summaries and actions

#### Summarizer (`summarizer.js`)
- Integrates with OpenAI GPT-4 API
- Handles content cleaning and caching
- Includes rate limiting and error handling

## 🔒 Security & Privacy

### Privacy Commitments
- **No Email Storage**: Emails are never stored or logged
- **Local Processing**: Prioritization runs entirely in your browser
- **Minimal Data Transfer**: Only email content (not metadata) sent to OpenAI
- **User Control**: Full control over what data is processed

### Security Best Practices
- **API Key Protection**: Use proxy endpoints in production
- **Content Sanitization**: All content is cleaned before API calls
- **Rate Limiting**: Built-in protection against API abuse
- **Error Handling**: Graceful degradation when services are unavailable

### Implementing Secure Proxy

For production use, implement a secure proxy endpoint:

```javascript
// Example Node.js proxy endpoint
app.post('/api/summarize', async (req, res) => {
  const { content, options } = req.body;
  
  // Validate and sanitize input
  const cleanContent = sanitizeContent(content);
  
  // Make OpenAI API call with server-side key
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'Summarize email content concisely' },
      { role: 'user', content: cleanContent }
    ]
  });
  
  res.json({ summary: response.choices[0].message.content });
});
```

## 🎯 Usage

### Getting Started
1. Install the extension
2. Navigate to Gmail, Outlook, or Yahoo Mail
3. Accept the privacy consent dialog
4. Add priority keywords in the extension popup
5. Watch as important emails are highlighted and moved to the top

### Managing Keywords
- Click the extension icon to open settings
- Add keywords like "urgent", "meeting", "deadline"
- Keywords are matched against subject, sender, and content
- Remove keywords by clicking the × button

### Using the Widget
- The floating widget shows top 5 priority emails
- Drag the widget to reposition it
- Click minimize to collapse the widget
- Use the refresh button to update the display

### AI Summarization
- Click the 🤖 button on any email to generate a summary
- Summaries are cached to avoid duplicate API calls
- Disable summarization in settings if desired

## 🛠️ Development

### Prerequisites
- Chrome browser with developer mode enabled
- Basic knowledge of JavaScript and Chrome Extensions
- OpenAI API key (for AI features)

### Development Workflow
1. Make changes to source files
2. Reload the extension in `chrome://extensions/`
3. Refresh the email page to see changes
4. Use Chrome DevTools for debugging

### Testing
- Test on all supported email services
- Verify keyword matching and prioritization
- Test widget functionality and responsiveness
- Ensure privacy features work correctly

### Building for Production
1. Update version in `manifest.json`
2. Implement secure proxy endpoint
3. Remove development comments and console logs
4. Package and submit to Chrome Web Store

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Add meaningful comments for complex logic
- Test changes across all supported email services
- Ensure privacy and security features remain intact

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for providing the GPT-4 API
- Chrome Extensions team for the excellent documentation
- The open-source community for inspiration and tools

## 📞 Support

- **Issues**: Report bugs and feature requests on GitHub
- **Documentation**: Check the code comments for implementation details
- **Security**: Report security issues privately to the maintainers

## 🔄 Changelog

### Version 1.0.0
- Initial release
- Support for Gmail, Outlook, and Yahoo Mail
- AI-powered email prioritization and summarization
- Floating widget with draggable functionality
- Privacy-first design with user consent
- Modern, responsive UI

---

**Note**: This extension is designed as a productivity tool with privacy in mind. Always review the privacy policy and ensure you're comfortable with how your data is processed before using AI features. 