# LinkedIn PR Sentiment Analyzer - Web UI

A beautiful, modern web interface for analyzing LinkedIn post sentiment and predicting PR impact.

## 🎨 Features

- **Beautiful Modern Design**: Gradient backgrounds, smooth animations, and responsive layout
- **Real-time Predictions**: Instant sentiment analysis with confidence scores
- **Visual Results**: Color-coded predictions with probability bars and feature extraction
- **Example Posts**: Pre-loaded examples to test the system quickly
- **Advanced Options**: Optional metadata inputs for more accurate predictions
- **Mobile Responsive**: Works seamlessly on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Option 1: Using the Start Script (Recommended)

```bash
# Make sure your GEMINI_API_KEY is set
export GEMINI_API_KEY='your-api-key-here'

# Run the start script
./start_webui.sh
```

This will:
1. Check your environment setup
2. Start the FastAPI backend server
3. Open the web UI in your default browser

### Option 2: Manual Start

1. **Start the API Server** (in one terminal):
```bash
export GEMINI_API_KEY='your-api-key-here'
python api.py
```

2. **Open the Web UI** (in your browser):
```bash
# Open webui.html in your browser
# On Linux:
xdg-open webui.html

# Or manually navigate to:
file:///path/to/lyra_hackathon/webui.html
```

## 📋 Prerequisites

- Python 3.8+
- FastAPI backend running on `http://localhost:8000`
- Trained model files in `output/` directory
- GEMINI_API_KEY environment variable set

## 🎯 How to Use

1. **Enter Your Post**: Type or paste your LinkedIn post text in the input area

2. **Optional - Advanced Settings**: Click "Advanced Options" to customize:
   - Post timing (hour, day of week)
   - Media information (has media, count, type)
   - Post type (regular, article)
   - Author follower count

3. **Analyze**: Click the "🚀 Analyze Sentiment" button

4. **View Results**: See your prediction with:
   - Sentiment classification (Positive/Negative PR)
   - Confidence score
   - Probability breakdown
   - Extracted features (text length, emojis, hashtags, etc.)

## 📝 Example Posts

The UI includes three pre-loaded examples:

1. **Positive: Product Launch** - Exciting announcement with emojis
2. **Negative: Service Outage** - Apologetic post about issues
3. **Positive: Award Achievement** - Celebration post

Click any example button to load it instantly!

## 🎨 UI Components

### Input Section
- Large text area for post content
- Collapsible advanced options panel
- Example post quick-load buttons
- Form validation

### Output Section
- Color-coded prediction badges
- Animated confidence bar
- Probability distribution cards
- Feature extraction grid
- Error handling with clear messages

## 🔧 Configuration

### API URL
By default, the UI connects to `http://localhost:8000`. To change this, edit the `API_URL` constant in `webui.html`:

```javascript
const API_URL = 'http://your-api-server:port';
```

### Styling
All styles are embedded in the HTML file. You can customize:
- Colors: Edit the gradient values and color codes
- Layout: Modify the grid layouts and spacing
- Animations: Adjust transition timings and keyframes

## 🐛 Troubleshooting

### "Cannot connect to API"
- Make sure the FastAPI server is running on port 8000
- Check that GEMINI_API_KEY is set
- Verify the API URL in the browser console

### "Model not loaded"
- Ensure model files exist in the `output/` directory
- Check the API server logs for errors
- Verify all required packages are installed

### CORS Errors
- The API has CORS enabled for all origins by default
- If you modify CORS settings, make sure to allow your browser's origin

## 📱 Browser Compatibility

Tested and working on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 API Endpoints Used

- `GET /health` - Check API status
- `POST /predict` - Get sentiment prediction

## 💡 Tips

1. **Be Specific**: More detailed posts generally get more accurate predictions
2. **Use Emojis**: The model considers emoji usage in its analysis
3. **Test Timing**: Try different posting times to see how it affects predictions
4. **Add Media**: Posts with media often have different sentiment patterns

## 🔐 Security Notes

- Never commit your GEMINI_API_KEY to version control
- Use environment variables for sensitive data
- Consider adding authentication for production use
- Implement rate limiting for public deployments

## 📊 Technical Details

### Frontend
- Pure HTML/CSS/JavaScript (no frameworks required)
- Responsive CSS Grid layout
- Fetch API for HTTP requests
- CSS animations and transitions

### Backend Integration
- RESTful API communication
- JSON request/response format
- Error handling with user-friendly messages
- Real-time prediction updates

## 🤝 Contributing

To improve the UI:
1. Edit `webui.html` for layout/styling changes
2. Test with various screen sizes
3. Ensure API compatibility
4. Update this README if adding features

## 📄 License

Part of the Lyra Hackathon project.

---

**Enjoy predicting your LinkedIn PR sentiment! 🎉**

