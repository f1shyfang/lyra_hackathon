# 🚀 Next.js Sentiment Analyzer - Quick Start

## ✅ Status: Ready to Use!

Your Next.js sentiment analyzer page is **live and ready**!

## 🌐 Access Now

### Open in Your Browser:
```
http://localhost:3000/sentiment-analyzer
```

## 📋 Prerequisites (Already Running)

✅ **API Server** - Running on port 8000  
✅ **Next.js Dev Server** - Running on port 3000  
✅ **Model Loaded** - XGBoost + Gemini ready  

## 🎯 Quick Test

1. **Open the page**: http://localhost:3000/sentiment-analyzer

2. **Click an example button** (e.g., "Positive: Product Launch")

3. **Click "🚀 Analyze Sentiment"**

4. **View results** in 2-3 seconds!

## 🎨 What You'll See

### Beautiful Modern UI
- Purple gradient background
- White cards with shadows
- Smooth animations
- Responsive layout

### Two Main Sections

#### Left: Input Section
- Large text area for your post
- Advanced options (collapsible)
- Example post buttons
- Analyze button

#### Right: Results Section
- Loading spinner (while analyzing)
- Prediction badge (✅ Positive or ⚠️ Negative)
- Confidence bar (animated)
- Probability cards
- Feature extraction grid

## 📝 Example Workflow

### Test 1: Positive Post
1. Click "Positive: Product Launch Announcement"
2. Click "🚀 Analyze Sentiment"
3. Expected: **✅ Positive PR** with ~85% confidence

### Test 2: Negative Post
1. Click "Negative: Service Outage Apology"
2. Click "🚀 Analyze Sentiment"
3. Expected: **⚠️ Negative PR** with ~75% confidence

### Test 3: Your Own Post
1. Clear the text area
2. Type your LinkedIn post
3. (Optional) Click "Advanced Options" to configure
4. Click "🚀 Analyze Sentiment"
5. View your personalized results!

## 🔧 If Something's Not Working

### Check API Server
```bash
curl http://localhost:8000/health
```
Should return: `{"status":"healthy","model_loaded":true,...}`

### Check Next.js Server
```bash
curl http://localhost:3000
```
Should return HTML content

### Restart Next.js (if needed)
```bash
# In the terminal running Next.js, press Ctrl+C
# Then restart:
cd /home/micha/dev/lyra_hackathon
npm run dev
```

## 🎨 Features Overview

### ✅ Implemented
- Real-time predictions
- Loading states
- Error handling
- Example posts
- Advanced options
- Responsive design
- Smooth animations
- TypeScript type safety
- Tailwind CSS styling

### 🎯 How to Use Advanced Options

1. Click "⚙️ Advanced Options (Optional)"
2. Configure:
   - **Post Hour**: 0-23 (default: 12)
   - **Day of Week**: Monday-Sunday (default: Wednesday)
   - **Has Media**: Yes/No (default: No)
   - **Media Count**: Number of images/videos (default: 0)
   - **Media Type**: None/Image/Video (default: None)
   - **Post Type**: Regular/Article (default: Regular)
   - **Follower Count**: Your follower count (default: 1000)
3. Click "🚀 Analyze Sentiment"

## 📱 Mobile Friendly

The page works great on mobile devices too!

- Touch-friendly buttons
- Responsive layout
- Readable text sizes
- Scrollable content

## 🎉 You're All Set!

### Your Next.js page is at:
```
🌐 http://localhost:3000/sentiment-analyzer
```

### What you have:
✅ Modern React/TypeScript implementation  
✅ Beautiful Tailwind CSS design  
✅ Full API integration  
✅ Real-time predictions  
✅ Example posts for testing  
✅ Advanced configuration options  
✅ Mobile responsive  
✅ Production-ready code  

## 📚 More Information

- **Full Documentation**: `NEXTJS_SENTIMENT_ANALYZER.md`
- **API Documentation**: `API_README.md`
- **HTML Version**: `WEBUI_COMPLETE.md`

---

**Start analyzing your LinkedIn posts now!** 🚀

Open: http://localhost:3000/sentiment-analyzer

