# BPMN AI Editor

An intelligent BPMN (Business Process Model and Notation) diagram editor powered by Google Gemini AI. This application allows users to create, edit, and modify BPMN diagrams through natural language conversations with an AI assistant.

## 🚀 Features

- **Interactive BPMN Editor**: Full-featured BPMN 2.0 compliant diagram editor using bpmn-js
- **AI-Powered Assistant**: Natural language processing for diagram modifications using Google Gemini
- **Real-time Collaboration**: Chat interface for seamless interaction with the AI
- **Context-Aware Processing**: AI understands selected elements and provides targeted suggestions
- **Impact Analysis**: Intelligent analysis of how changes affect the overall process flow
- **Educational Insights**: Learn BPMN best practices and modeling techniques

## 🏗️ Architecture

### Frontend (React)
- React 19.1.0 with modern hooks
- BPMN.js for diagram rendering and editing
- Real-time chat interface
- Responsive design with split-panel layout

### Backend (Node.js/Express)
- Express 5.1.0 server with CORS support
- Google Gemini AI integration (gemini-1.5-flash model)
- RESTful API for diagram processing
- JSON-based communication protocol

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API key

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bpmn-ai-editor
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Set up environment variables**
   
   **Backend (.env file in backend directory):**
   ```bash
   # Google Gemini AI Configuration
   GEMINI_API_KEY=your_google_gemini_api_key_here
   
   # Sentry Configuration
   SENTRY_DSN=https://32dc66ac426344352ff8953ddef755c0@o4509520289202176.ingest.de.sentry.io/4509571066822736
   SENTRY_ENVIRONMENT=development
   SENTRY_TRACES_SAMPLE_RATE=1.0
   SENTRY_DEBUG_MODE=true
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   ```
   
   **Frontend (.env file in frontend directory):**
   ```bash
   # Sentry Configuration
   REACT_APP_SENTRY_DSN=https://32dc66ac426344352ff8953ddef755c0@o4509520289202176.ingest.de.sentry.io/4509571066822736
   REACT_APP_SENTRY_ENVIRONMENT=development
   REACT_APP_SENTRY_TRACES_SAMPLE_RATE=1.0
   REACT_APP_SENTRY_DEBUG_MODE=true
   
   # Application Configuration
   REACT_APP_VERSION=1.0.0
   REACT_APP_API_URL=http://localhost:3001
   ```

## 🚀 Usage

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```
   Server will run on `http://localhost:3001`

2. **Start the frontend application**
   ```bash
   cd frontend
   npm start
   ```
   Application will open on `http://localhost:3000`

3. **Using the Application**
   - The left panel shows the BPMN diagram editor
   - The right panel contains the AI chat interface
   - Select elements in the diagram to provide context to the AI
   - Type natural language requests in the chat to modify the diagram
   - The AI will respond with explanations and update the diagram accordingly

## 💬 AI Capabilities

The AI assistant can:

### Diagram Modifications
- Add, remove, or modify BPMN elements
- Create sequence flows and connections
- Restructure process flows
- Add gateways, events, and tasks

### Conversational Analysis
- Explain selected elements and their purpose
- Analyze connections between elements
- Provide BPMN best practices guidance
- Suggest process improvements
- Answer questions about process flow and logic

### Example Interactions
- "Add a decision gateway after the current task"
- "Explain what this selected element does"
- "How does this task connect to other elements?"
- "What are the best practices for this type of process?"

## 🔧 API Endpoints

### POST `/api/chat`
Processes chat messages and diagram modifications.

**Request Body:**
```json
{
  "diagramXML": "string",
  "selectedElementIds": ["array", "of", "ids"],
  "prompt": "string"
}
```

**Response:**
```json
{
  "response": "AI response text",
  "updatedDiagramXML": "modified diagram XML"
}
```

## 📁 Project Structure

```
bpmn-ai-editor/
├── frontend/                 # React application
│   ├── public/              # Static assets
│   ├── src/                 # Source code
│   │   ├── App.js          # Main application component
│   │   ├── App.css         # Application styles
│   │   └── ...
│   └── package.json        # Frontend dependencies
├── backend/                 # Express server
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

## 🔒 Environment Variables

### Backend Variables
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `SENTRY_DSN` | Sentry Data Source Name for error tracking | No | - |
| `SENTRY_ENVIRONMENT` | Environment name for Sentry | No | development |
| `SENTRY_TRACES_SAMPLE_RATE` | Sampling rate for performance monitoring | No | 1.0 (dev), 0.1 (prod) |
| `SENTRY_DEBUG_MODE` | Enable Sentry in development | No | false |
| `PORT` | Server port | No | 3001 |
| `NODE_ENV` | Node environment | No | development |

### Frontend Variables
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_SENTRY_DSN` | Sentry DSN for React app | No | - |
| `REACT_APP_SENTRY_ENVIRONMENT` | Environment name for Sentry | No | development |
| `REACT_APP_SENTRY_TRACES_SAMPLE_RATE` | Performance monitoring sample rate | No | 1.0 (dev), 0.1 (prod) |
| `REACT_APP_SENTRY_DEBUG_MODE` | Enable Sentry in development | No | false |
| `REACT_APP_VERSION` | Application version | No | 1.0.0 |
| `REACT_APP_API_URL` | Backend API URL | No | http://localhost:3001 |

## 🧪 Development

### Frontend Development
```bash
cd frontend
npm start          # Start development server
npm test           # Run tests
npm run build      # Build for production
```

### Backend Development
```bash
cd backend
npm start          # Start server
npm run dev        # Start with nodemon (if configured)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [bpmn-js](https://github.com/bpmn-io/bpmn-js) - BPMN 2.0 rendering toolkit
- [Google Gemini](https://ai.google.dev/) - AI language model
- [React](https://reactjs.org/) - Frontend framework
- [Express](https://expressjs.com/) - Backend framework

## 📊 Sentry Monitoring

This project includes comprehensive error tracking and performance monitoring using Sentry.

### Features
- **Error Tracking**: Automatic capture of frontend and backend errors
- **Performance Monitoring**: Request tracing and performance metrics
- **Session Replay**: Visual reproduction of user sessions (production)
- **Custom Context**: Detailed error context including user actions and system state
- **Environment Separation**: Different configurations for development and production

### Configuration

**Sentry Project Details:**
- **Organization**: el-technology
- **Project**: bpmn-ai-editor
- **DSN**: `https://32dc66ac426344352ff8953ddef755c0@o4509520289202176.ingest.de.sentry.io/4509571066822736`
- **Region**: Germany (de.sentry.io)

**Environment Modes:**
- **Development**: Sentry disabled by default (set `SENTRY_DEBUG_MODE=true` to enable)
- **Production**: Full monitoring with optimized sampling rates

### Custom Error Tracking

**Backend:**
```javascript
const { captureException, captureMessage } = require('./sentry.config');

// Capture errors with context
captureException(error, {
  user_id: userId,
  action: 'process_diagram',
  diagram_size: xml.length
});

// Capture custom messages
captureMessage('User uploaded large diagram', 'warning', {
  diagram_size: xmlSize
});
```

**Frontend:**
```javascript
import { captureException, addBreadcrumb } from './sentry';

// Add breadcrumbs for debugging
addBreadcrumb({
  message: 'User clicked element',
  category: 'user_interaction',
  data: { elementId: 'task_1' }
});

// Capture errors with context
captureException(error, {
  component: 'bpmn-viewer',
  action: 'load_diagram'
});
```

### Monitoring Dashboard

Access your Sentry dashboard at: [https://el-technology.sentry.io/projects/bpmn-ai-editor/](https://el-technology.sentry.io/projects/bpmn-ai-editor/)

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team. 