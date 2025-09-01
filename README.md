# FoodFinder AI 🍽️🤖

An AI-powered restaurant discovery and recommendation system that uses OpenAI's language models via LangChain to intelligently search and analyze restaurants from multiple sources including Google and Yelp.

## 🚀 Features

- **AI-Powered Search**: Uses OpenAI LLMs to understand user queries and provide intelligent recommendations
- **Multi-Source Data**: Aggregates restaurant information from Google and Yelp APIs
- **Smart Ranking**: AI-driven restaurant ranking based on user preferences and multiple data points
- **TypeScript**: Built with modern TypeScript for type safety and better development experience
- **LangChain Integration**: Leverages LangChain for structured AI interactions and tool calling

## 🛠️ Tech Stack

- **Backend**: Node.js + TypeScript
- **AI Framework**: LangChain + OpenAI
- **APIs**: Google Custom Search API, Yelp Fusion API
- **HTTP Client**: Axios
- **Environment**: Dotenv for configuration

## 📋 Prerequisites

### **System Requirements**
- **macOS**: 10.15+ (Catalina) or later
- **Node.js**: 18+ (LTS version recommended)
- **npm**: 8+ (comes with Node.js)
- **Homebrew**: For easy installation on macOS

### **API Keys Required**
- **Perplexity API key** (primary data source) ✅
- **OpenAI API key** (optional - temporarily disabled)
- ~~Google Custom Search API key~~ (commented out)
- ~~Yelp Fusion API key~~ (commented out)

### **Installation Commands**
```bash
# Install Homebrew (macOS)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Verify installation
node --version  # Should show v18+ or v20+
npm --version   # Should show v8+ or v9+
```

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd foodfinder-ai
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Use CLI Interface

```bash
npm run cli
```

## 🔧 Configuration

Create a `.env` file with the following variables:

```env
# Perplexity API (Primary Data Source) ✅
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# OpenAI Configuration (Optional - Temporarily Disabled)
# OPENAI_API_KEY=your_openai_api_key_here

# Google Custom Search API (Commented Out)
# GOOGLE_API_KEY=your_google_api_key_here
# GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_custom_search_engine_id_here

# Yelp Fusion API (Commented Out)
# YELP_API_KEY=your_yelp_api_key_here

# Application Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

### **API Key Setup**
1. **Perplexity API**: Get your key from [perplexity.ai](https://perplexity.ai)
2. **OpenAI API**: Get your key from [platform.openai.com](https://platform.openai.com) (optional)
3. **Environment File**: Copy `.env.example` to `.env` and add your keys

## 📁 Project Structure

```
foodfinder-ai/
├── src/
│   ├── tools/          # API integration tools
│   ├── agents/         # LangChain AI agents
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── index.ts        # Main application entry
│   └── cli.ts          # Command-line interface
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🎯 Development Status

- [x] **Phase 1**: Project Setup & Dependencies ✅
- [ ] **Phase 2**: Dependencies & Configuration
- [ ] **Phase 3**: Type Definitions
- [ ] **Phase 4**: Google Search Tool
- [ ] **Phase 5**: Yelp Search Tool
- [ ] **Phase 6**: Tool Integration
- [ ] **Phase 7**: LangChain Setup
- [ ] **Phase 8**: Data Processing
- [ ] **Phase 9**: Main Application Logic
- [ ] **Phase 10**: CLI Interface
- [ ] **Phase 11**: Error Handling & Validation
- [ ] **Phase 12**: Testing & Quality Assurance
- [ ] **Phase 13**: Documentation & Deployment
- [ ] **Phase 14**: Optimization & Refinement

## 📝 Available Scripts

- `npm run build` - Build the TypeScript project
- `npm run start` - Run the built application
- `npm run dev` - Run in development mode
- `npm run dev:watch` - Run with auto-reload
- `npm run cli` - Run the command-line interface
- `npm run clean` - Clean build artifacts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please open an issue in the repository.

---

**Built with ❤️ using TypeScript, Node.js, and AI technologies**
