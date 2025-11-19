# AI-Powered Process Builder V2

> Conversational process mapping with Mermaid swimlane diagrams

Transform narrative process descriptions into professional flowcharts through natural conversation with AI. Built with React, TypeScript, Mermaid.js, and OpenAI GPT-4o-mini.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![React](https://img.shields.io/badge/React-18.3-blue)
![Mermaid](https://img.shields.io/badge/Mermaid-11.12-green)

---

## ✨ Features

### V2 (Mermaid-based) - **Recommended**
- 🤖 **Conversational AI**: Natural language process documentation with GPT-4o-mini
- 📊 **Professional Diagrams**: Auto-generated Mermaid swimlane flowcharts
- 🎯 **Smart Questioning**: AI probes for missing information and validates logic
- 🏊 **Actor Swimlanes**: Organized by roles/departments
- 🔀 **Decision Support**: Diamond nodes with branching logic
- 🛡️ **Controls & Risks**: Visual annotations for governance
- 📥 **Export Options**: SVG, PNG, PDF diagram export
- 💾 **JSON Import/Export**: Save and load process definitions
- 🔄 **Real-time Updates**: 300ms debounced diagram rendering
- 📱 **Responsive**: Works on desktop and tablet

### V1 (Legacy ReactFlow)
- Still available at `/v1` route for backward compatibility

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account ([sign up free](https://supabase.com))
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

```bash
# Clone the repository
git clone https://github.com/nathanfarq/afm417-workflow-diagrams.git
cd afm417-workflow-diagrams

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your API keys
# See SETUP-LOCAL.md for detailed instructions
```

> 💡 **Quick Setup**: See [SETUP-LOCAL.md](SETUP-LOCAL.md) for a 5-minute setup guide with your API keys.

### Set Up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push

# Set OpenAI API key (in Supabase secrets, NOT .env)
supabase secrets set OPENAI_API_KEY=sk-your-key-here

# Deploy Edge Function
supabase functions deploy openai-chat-v2
```

### Run Locally

```bash
# Start development server
npm run dev

# Open browser to http://localhost:5173/v2
```

---

## 📖 Usage

### Basic Workflow

1. **Start Conversation**: "I want to document an expense reimbursement process"
2. **Answer Questions**: AI asks about actors, steps, decisions, controls
3. **Watch Diagram Build**: Real-time visualization as you provide details
4. **Refine**: Ask for changes ("Add a approval step for amounts over $1000")
5. **Export**: Download as SVG/PNG/PDF or save JSON for later

### Example Interaction

```
User: "Manager reviews the expense report and decides if it needs more info"

AI: "I understand there's a decision point. A few questions:
1. What happens if more info IS needed? Who provides it?
2. What happens if it's approved? What's the next step?
3. Are there spending limits that affect this decision?
4. What controls exist at this review stage?"
```

### Features

- **JSON Viewer**: Collapsible panel showing current process structure
- **Start Over**: Clear conversation and begin fresh
- **Upload JSON**: Load previously saved process
- **Download JSON**: Save process definition
- **Export Diagram**: SVG (vector), PNG (raster), PDF (document)
- **Zoom Controls**: 50% to 200% zoom with pan

---

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Diagrams**: Mermaid.js (auto-layout swimlanes)
- **AI**: OpenAI GPT-4o-mini (cost-effective reasoning)
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: Supabase PostgreSQL (with RLS)
- **Styling**: Tailwind CSS
- **Routing**: React Router v7

### Project Structure

```
├── src/
│   ├── components/
│   │   ├── ChatInterfaceV2.tsx    # Chat UI with JSON viewer
│   │   ├── MermaidRenderer.tsx     # Mermaid diagram component
│   │   └── ...                     # Legacy V1 components
│   ├── services/
│   │   ├── openai-v2.ts            # OpenAI API service
│   │   ├── conversationServiceV2.ts # Database operations
│   │   └── ...                     # Legacy V1 services
│   ├── utils/
│   │   ├── mermaidGenerator.ts     # JSON → Mermaid converter
│   │   └── ...                     # Helpers
│   ├── types/
│   │   ├── processSchema.ts        # V2 TypeScript types
│   │   └── auditProcess.ts         # V1 types (legacy)
│   ├── AppV2.tsx                   # V2 main app
│   ├── App.tsx                     # V1 main app (legacy)
│   └── main.tsx                    # Router entry point
├── supabase/
│   ├── functions/
│   │   └── openai-chat-v2/        # Edge Function (gpt-4o-mini)
│   └── migrations/                # Database schema
├── tests/
│   └── *.test.ts                  # Vitest unit tests
└── docs/
    ├── DEPLOYMENT.md              # Deployment guide
    ├── SECURITY.md                # Security considerations
    └── PRD.md                     # Product requirements (in .github/)
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Generate coverage report
npm run test:coverage
```

### Test Coverage

- ✅ `mermaidGenerator.ts`: Schema validation, Mermaid syntax generation
- ✅ `openai-v2.ts`: JSON extraction, tag parsing (`<UPDATED>`/`<UNCHANGED>`)
- ⏳ Integration tests: Coming soon

---

## 🔒 Security

### API Key Protection
- ✅ OpenAI key stored in Supabase secrets (server-side only)
- ✅ Supabase anon key safe to expose (intended for public use)
- ✅ `.env` files in `.gitignore` (never committed)

### Data Privacy
- ✅ No authentication required (privacy-friendly)
- ✅ Session-based isolation (Row Level Security)
- ✅ Auto-expire conversations after 30 days
- ✅ No PII collected

### For Production
⚠️ **Before going live**, review [SECURITY.md](./SECURITY.md) for:
- Rate limiting recommendations
- Authentication setup (optional)
- CORS configuration
- Monitoring best practices

---

## 📦 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy Options

**Vercel**:
```bash
vercel --prod
```

**Netlify**:
```bash
npm run build && netlify deploy --prod
```

**Bolt.new**:
1. Upload project to Bolt
2. Set environment variables
3. Click "Deploy"

---

## 🎯 Roadmap

### Completed ✅
- [x] Mermaid.js integration with swimlanes
- [x] GPT-4o-mini conversational agent
- [x] JSON schema with actors/decisions/flows
- [x] Export to SVG/PNG/PDF
- [x] JSON download/upload
- [x] Start Over functionality
- [x] Debounced diagram updates
- [x] Schema versioning (V1 vs V2)

### In Progress 🚧
- [x] **Comprehensive test suite** ✅ (24 tests passing)
- [x] **Performance optimization (lazy loading)** ✅ (75% bundle size reduction)
- [x] **Rate limiting** ✅ (20 req/5min per session)
- [ ] Error boundaries for production

### Future Enhancements 🔮
- [ ] Undo/Redo functionality
- [ ] Click-to-edit nodes in diagram
- [ ] Process templates library
- [ ] Multi-user collaboration
- [ ] Version history with rollback
- [ ] AI-suggested improvements
- [ ] Alternative diagram layouts
- [ ] Export to BPMN format

---

## 🐛 Known Limitations

1. ~~**Bundle Size**: Mermaid.js is ~1.5MB~~ ✅ **FIXED**: Now lazy-loaded (~500KB initial)
2. **No Authentication**: Anyone can use (add Supabase Auth for production)
3. ~~**No Rate Limiting**~~ ✅ **FIXED**: 20 requests per 5 minutes per session
4. **Client-Side Validation**: Malicious users could bypass
5. ~~**Test Setup**~~ ✅ **FIXED**: Tests now run successfully (24/24 passing)

See [SECURITY.md](.github/MARKDOWNS/SECURITY.md) for mitigation strategies.

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style (ESLint configured)
- Add tests for new features
- Update documentation
- Test locally before submitting PR

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Mermaid.js** - Beautiful diagram rendering
- **OpenAI** - GPT-4o-mini for natural language processing
- **Supabase** - Backend infrastructure and Edge Functions
- **React Flow** - Inspiration for V1 implementation
- **Tailwind CSS** - Rapid UI development

---

## 📞 Support

- **Documentation**: See `/docs` folder or [DEPLOYMENT.md](./DEPLOYMENT.md) and [SECURITY.md](./SECURITY.md)
- **Issues**: [GitHub Issues](https://github.com/nathanfarq/afm417-workflow-diagrams/issues)
- **PRD**: See [.github/CLAUDE_PRD/process-diagram-generation-prd1.md](.github/CLAUDE_PRD/process-diagram-generation-prd1.md)

---

## 📊 Project Stats

- **Lines of Code**: ~5,500+
- **Components**: 11 (+ 1 lazy wrapper)
- **Tests**: 24 unit tests (all passing ✅)
- **Dependencies**: 29 production, 22 dev
- **Build Time**: ~27s
- **Initial Bundle Size**: ~500KB (75% reduction from 2MB)
- **Lazy-loaded Chunks**: ~1.5MB Mermaid (loads on demand)
- **Rate Limit**: 20 requests/5min per session

---

Made with ❤️ for AFM417 Project

**⭐ Star this repo if you find it useful!**
