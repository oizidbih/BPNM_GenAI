// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import Sentry configuration
const { 
  initSentry, 
  sentryRequestHandler, 
  sentryTracingHandler, 
  sentryErrorHandler,
  captureException,
  captureMessage 
} = require('./sentry.config');

// Import BPMN prompt template
const { generateBPMNPrompt } = require('./prompts/bpmn-assistant');

/**
 * Validates basic XML structure
 * @param {string} xml - The XML string to validate
 * @returns {boolean} - True if XML is valid, false otherwise
 */
function validateXMLStructure(xml) {
  try {
    // Check for basic XML structure
    if (!xml.includes('<bpmn:definitions') || !xml.includes('</bpmn:definitions>')) {
      return false;
    }
    
    // Check for balanced tags (simple check)
    const openTags = (xml.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (xml.match(/<\/[^>]*>/g) || []).length;
    
    if (openTags !== closeTags) {
      return false;
    }
    
    // Check for required BPMN elements
    if (!xml.includes('<bpmn:process') || !xml.includes('</bpmn:process>')) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

const app = express();
const port = process.env.PORT || 3001;

// Initialize Sentry (must be done before other middleware)
const sentryEnabled = initSentry();

// Sentry middleware (automatic in v8+ but keeping for compatibility)
if (sentryEnabled) {
  app.use(sentryRequestHandler());
  app.use(sentryTracingHandler());
}

app.use(cors());
app.use(express.json());

// Access your API key as an environment variable (recommended)
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('GEMINI_API_KEY environment variable is not set.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Changed model to gemini-1.5-flash

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

// Test endpoint to verify BPMN functionality
app.get('/api/test-bpmn', (req, res) => {
  const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Test Task">
      <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
      <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="179" y="145" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_Task_2" bpmnElement="Task_1">
        <dc:Bounds x="250" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="_BPMNShape_EndEvent_2" bpmnElement="EndEvent_1">
        <dc:Bounds x="400" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="409" y="145" width="19" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="SequenceFlow_1_di" bpmnElement="SequenceFlow_1">
        <di:waypoint x="209" y="120" />
        <di:waypoint x="250" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="SequenceFlow_2_di" bpmnElement="SequenceFlow_2">
        <di:waypoint x="350" y="120" />
        <di:waypoint x="400" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
  
  res.json({
    response: 'Test BPMN diagram loaded successfully',
    updatedDiagramXML: testXML
  });
});

app.post('/api/chat', async (req, res) => {
  const { diagramXML, selectedElementIds, prompt } = req.body;

  const fullPrompt = generateBPMNPrompt(diagramXML, selectedElementIds, prompt);
  
  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // Attempt to parse the JSON response from Gemini
    let llmResponse;
    try {
      // Attempt to extract JSON from markdown code block
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        llmResponse = JSON.parse(jsonMatch[1]);
      } else {
        // If not in markdown, try parsing directly
        llmResponse = JSON.parse(text);
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', text);
      // If parsing fails, treat the entire text as the LLM's response
      llmResponse = {
        updatedDiagramXML: diagramXML, // Return original XML if parsing fails
        impactAnalysis: `Error: Could not parse AI response. Raw response: ${text}`
      };
    }

    // Log the parsed response for debugging
    console.log('LLM Response:', {
      hasResponse: !!llmResponse.response,
      hasImpactAnalysis: !!llmResponse.impactAnalysis,
      hasUpdatedXML: !!llmResponse.updatedDiagramXML,
      xmlLength: llmResponse.updatedDiagramXML?.length || 0,
      xmlPreview: llmResponse.updatedDiagramXML?.substring(0, 100) + '...'
    });

    // Validate the generated XML before sending to frontend
    let finalXML = diagramXML; // Default to original XML
    if (llmResponse.updatedDiagramXML && validateXMLStructure(llmResponse.updatedDiagramXML)) {
      finalXML = llmResponse.updatedDiagramXML;
    } else if (llmResponse.updatedDiagramXML) {
      console.error('Invalid XML generated by AI:', llmResponse.updatedDiagramXML);
      llmResponse.response = (llmResponse.response || '') + ' [Note: Generated XML was invalid, keeping original diagram]';
    }

    res.json({
      response: llmResponse.response || llmResponse.impactAnalysis || 'No specific response provided.',
      updatedDiagramXML: finalXML,
    });

  } catch (error) {
    console.error('Error communicating with Gemini API:', error);
    
    // Capture error in Sentry with context
    captureException(error, {
      api_endpoint: '/api/chat',
      user_prompt: prompt,
      selected_elements: selectedElementIds,
      diagram_length: diagramXML?.length || 0
    });
    
    res.status(500).json({
      response: 'Error: Failed to get response from AI.',
      updatedDiagramXML: diagramXML,
    });
  }
});

// Sentry error handler (automatic in v8+ but keeping for compatibility)
if (sentryEnabled) {
  app.use(sentryErrorHandler());
}

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(port, () => {
  console.log(`🚀 Backend listening at http://localhost:${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log successful startup to Sentry
  captureMessage(`Backend server started successfully on port ${port}`, 'info', {
    port: port,
    environment: process.env.NODE_ENV || 'development'
  });
});