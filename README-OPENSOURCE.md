# 🚀 Personal Branding Audit AI

**Open source AI-powered tool for professional profile auditing**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Claude AI](https://img.shields.io/badge/Powered%20by-Claude%20AI-blue)](https://www.anthropic.com/)

---

## 📖 About

Personal Branding Audit AI analyzes professional profiles using Claude AI to provide:
- **Comprehensive scoring** (60-116 pts scale with bonuses)
- **5-category analysis** (Visual Identity, Value Proposition, Credibility, SEO, Engagement)
- **AI-powered insights** and recommendations
- **Keyword & hashtag suggestions** for better visibility
- **Actionable 90-day plans** for profile improvement

**Key features:**
- ✅ Real-time analysis (no data storage)
- ✅ Image analysis (post screenshots via Claude Vision)
- ✅ Metrics-based scoring (followers, premium, verified)
- ✅ Interactive chat assistant
- ✅ Elegant, responsive UI
- ✅ Export to HTML report

---

## 🎯 Demo

**Live Demo:** https://personalbranding-audit.onrender.com

**Screenshots:**
- Landing page with metrics input
- Analysis dashboard with scoring
- Keywords & hashtags visualization
- Chat AI assistant

---

## 🛠️ Tech Stack

**Frontend:**
- Vanilla JavaScript (no frameworks)
- Modern CSS with CSS variables
- Google Fonts (DM Sans, Playfair Display)

**Backend:**
- Node.js + Express
- Multer (file uploads)
- @anthropic-ai/sdk (Claude AI)
- OpenAI SDK (chat feature)

**Deployment:**
- Render.com (recommended)
- GitHub Actions ready

---

## 📦 Installation

### **Prerequisites**
- Node.js 18+
- Anthropic API key
- OpenAI API key (optional, for chat)

### **1. Clone Repository**
```bash
git clone https://github.com/DanyPalacio/personalbranding-audit.git
cd personalbranding-audit
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Configure Environment**
```bash
cp .env.example .env
```

Edit `.env`:
```env
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
PORT=3000
NODE_ENV=development
```

### **4. Run Locally**
```bash
npm start
```

Open: http://localhost:3000

---

## 🚀 Deploy to Render

1. Fork this repository
2. Create a new Web Service on [Render](https://render.com)
3. Connect your GitHub repo
4. Configure:
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `ANTHROPIC_API_KEY`
     - `OPENAI_API_KEY`
     - `NODE_ENV=production`

Deploy time: ~2-3 minutes

---

## 📊 Scoring System

### **Base Score: 60-100 pts**
- Minimum: 60 pts (complete profile)
- With activity: 70+ pts
- Excellent: 80-100 pts

### **Bonuses (up to +16 pts):**

**Followers (gradual):**
```
< 500        → +0 pts
500-2,000    → +2 pts
2,000-10,000 → +4 pts
10,000+      → +6 pts
```

**LinkedIn Premium (+6 pts):**
- +3 pts Credibility
- +3 pts Visibility SEO

**Verified Account (+4 pts):**
- +2 pts Credibility
- +2 pts Visual Identity

**Maximum possible: 116 pts**

---

## 🎨 Features

### **1. Metrics-Based Analysis**
- Followers count
- Premium status (toggle)
- Verified badge (toggle)
- Post screenshots (5-10 images)

### **2. AI-Powered Insights**
- Engagement analysis from screenshots
- Content type detection (educational, commercial, thought leadership)
- Publishing frequency evaluation
- Next 3-5 posts suggested

### **3. Keywords & Hashtags**
- Keywords currently used (detected)
- Missing keywords (SEO opportunities)
- 10-15 recommended hashtags
- Elegant word cloud visualization

### **4. Interactive Chat**
- Context-aware AI assistant
- Answers questions about your analysis
- Provides additional recommendations

---

## 📁 Project Structure

```
personalbranding-audit/
├── public/
│   ├── css/
│   │   └── styles.css          # All styles
│   ├── js/
│   │   └── app.js              # Frontend logic
│   ├── images/
│   │   └── background.png      # Corporate bg
│   └── index.html              # Main page
├── server.js                   # Express backend
├── package.json
├── .env.example
├── LICENSE.md                  # MIT License
├── TERMS.md                    # Terms of Use
├── PRIVACY.md                  # Privacy Policy
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
└── README.md
```

---

## 🤝 Contributing

We welcome contributions! Please read:
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Community guidelines

**Ways to contribute:**
- 🐛 Report bugs
- ✨ Suggest features
- 📝 Improve documentation
- 💻 Submit PRs

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE.md](LICENSE.md) for details.

**Key points:**
- ✅ Free to use, modify, distribute
- ✅ Commercial use permitted
- ⚠️ Must give attribution
- ⚠️ No warranty provided

---

## ⚖️ Legal

- [Terms of Use](TERMS.md) - Disclaimers, liability limitations
- [Privacy Policy](PRIVACY.md) - Data handling, GDPR compliance
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community standards

**Important:** This software is provided "AS IS" without warranties. See TERMS.md for full disclaimer.

---

## 🙏 Credits

**Developed by:** [Daniel Palacio](https://github.com/DanyPalacio)

**Powered by:**
- [Claude AI](https://www.anthropic.com/) - Anthropic
- [OpenAI](https://openai.com/) - Chat functionality
- [Google Analytics](https://analytics.google.com/) - Usage tracking

**Not affiliated with LinkedIn Corporation.**

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/DanyPalacio/personalbranding-audit/issues)
- **Discussions:** [GitHub Discussions](https://github.com/DanyPalacio/personalbranding-audit/discussions)
- **Email:** [Your email if you want to provide it]

---

## 🗺️ Roadmap

- [ ] Multi-language support (EN, ES, PT)
- [ ] PDF export with charts
- [ ] Competitor comparison
- [ ] Historical tracking
- [ ] Team/Enterprise version
- [ ] API endpoints

---

## 🌟 Star this repo

If you find this tool useful, please ⭐ star the repository!

---

**Made with ❤️ by [Daniel Palacio](https://github.com/DanyPalacio)**

**Powered by 🤖 Claude AI (Anthropic)**
