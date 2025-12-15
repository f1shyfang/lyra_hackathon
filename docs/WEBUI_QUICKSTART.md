# 🚀 Web UI Quick Start Guide

## Current Status ✅

Your LinkedIn PR Sentiment Analyzer Web UI is ready to use!

### Running Services:

1. **API Server** (Port 8000) - ✅ Running
   - Backend API for predictions
   - Endpoint: `http://localhost:8000`

2. **Web UI Server** (Port 8080) - ✅ Running
   - Serves the web interface
   - Endpoint: `http://localhost:8080`

## 🌐 Access the Web UI

### From Windows Browser (WSL Users):

Open your Windows browser and navigate to:

```
http://localhost:8080/webui.html
```

### From Linux Browser:

```
http://localhost:8080/webui.html
```

## 📱 How to Use

1. **Open the URL** in your browser (see above)

2. **Enter a LinkedIn Post**:
   - Type or paste your post text in the large text area
   - OR click one of the example buttons to load a sample post

3. **Optional - Configure Advanced Settings**:
   - Click "⚙️ Advanced Options" to expand
   - Adjust posting time, media settings, etc.

4. **Analyze**:
   - Click the "🚀 Analyze Sentiment" button
   - Wait a few seconds for the AI to process

5. **View Results**:
   - See if your post will generate Positive or Negative PR
   - Check the confidence score
   - Review probability breakdown
   - Examine extracted features

## 🎯 Example Posts

Try these pre-loaded examples by clicking the buttons in the UI:

### 1. Positive: Product Launch
```
Excited to announce our new AI-powered analytics platform! 
This will transform how businesses understand their customers. 
Join us at the launch event next week! 🚀 #AI #Innovation #TechNews
```

### 2. Negative: Service Outage
```
We deeply regret the service outage that affected our customers yesterday. 
We take full responsibility and are implementing measures to prevent this 
from happening again. Your trust is our priority.
```

### 3. Positive: Award Achievement
```
Proud to share that our team won the Best Workplace Award 2024! 
This achievement reflects our commitment to creating an inclusive and 
innovative environment. Thank you to everyone who made this possible! 🏆✨
```

## 🛠️ Troubleshooting

### Can't Access the Web UI?

1. **Check if servers are running**:
   ```bash
   # Check API server (should show output)
   curl http://localhost:8000/health
   
   # Check Web UI server (should show HTML)
   curl http://localhost:8080/webui.html | head -5
   ```

2. **Restart servers if needed**:
   ```bash
   # Stop any running servers (Ctrl+C in their terminals)
   
   # Start API server
   export GEMINI_API_KEY='your-key-here'
   python3 api.py
   
   # In another terminal, start Web UI server
   python3 serve_webui.py
   ```

### "Cannot connect to API" Error in Browser?

- Make sure the API server is running on port 8000
- Check browser console (F12) for detailed error messages
- Verify GEMINI_API_KEY is set in the API server terminal

### Predictions Taking Too Long?

- First prediction may take 5-10 seconds (loading embeddings)
- Subsequent predictions should be faster (2-3 seconds)
- Check your internet connection (Gemini API requires internet)

## 🎨 Features Overview

### Visual Design
- **Modern gradient backgrounds** - Purple/blue theme
- **Smooth animations** - Slide-in results, animated bars
- **Responsive layout** - Works on desktop, tablet, mobile
- **Color-coded results** - Green for positive, red/orange for negative

### Functionality
- **Real-time predictions** - Instant feedback
- **Confidence visualization** - Animated progress bar
- **Probability breakdown** - See both positive and negative scores
- **Feature extraction** - View what the AI detected
- **Example posts** - Quick testing with pre-loaded samples
- **Advanced options** - Fine-tune predictions with metadata

## 📊 Understanding Results

### Prediction Badge
- **✅ Positive PR** (Green) - Your post will likely generate positive PR
- **⚠️ Negative PR** (Red/Orange) - Your post may generate negative PR

### Confidence Score
- Shows how confident the model is (0-100%)
- Higher = more certain about the prediction
- Displayed as an animated progress bar

### Probabilities
- **Positive PR** - Likelihood of positive sentiment
- **Negative PR** - Likelihood of negative sentiment
- Both add up to 100%

### Extracted Features
- **Text Length** - Number of characters
- **Emoji Count** - Number of emojis used
- **URL Count** - Number of links
- **Hashtag Count** - Number of hashtags
- **Mention Count** - Number of @mentions
- **Embedding Dim** - AI feature dimension (768 or 30 with PCA)

## 🔧 Advanced Options Explained

### Timing Options
- **Post Hour** (0-23) - Hour of day to post
- **Day of Week** - Monday (0) to Sunday (6)
- **Month** - 1-12

### Media Options
- **Has Media** - Whether post includes images/videos
- **Media Count** - Number of media items
- **Media Type** - none/image/video

### Other Options
- **Post Type** - regular/article
- **Follower Count** - Your follower count
- **Comment Sentiment** - Average sentiment from comments (if available)

## 💡 Tips for Best Results

1. **Write Complete Posts** - More text = better predictions
2. **Use Natural Language** - Write as you would on LinkedIn
3. **Include Emojis** - The model considers emoji usage
4. **Test Different Times** - Posting time can affect sentiment
5. **Add Media Info** - Posts with media may have different patterns

## 🚪 Stopping the Servers

When you're done:

1. Go to each terminal running a server
2. Press `Ctrl+C` to stop it
3. Or close the terminal windows

## 📝 Next Steps

- Test with your own LinkedIn posts
- Compare different versions of the same message
- Experiment with timing and media settings
- Use insights to optimize your LinkedIn content strategy

---

**Need help?** Check the main README or API documentation.

**Enjoying the tool?** Share your feedback and results!

