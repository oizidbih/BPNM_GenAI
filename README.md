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
   Create a `.env` file in the backend directory:
   ```bash
   GEMINI_API_KEY=your_google_gemini_api_key_here
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

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes |

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

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team. 