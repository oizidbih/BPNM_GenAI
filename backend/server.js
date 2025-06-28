// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

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
 * Attempts to fix common XML quote issues
 * @param {string} xml - The XML string to fix
 * @returns {string} - Fixed XML string
 */
function sanitizeXML(xml) {
  if (!xml || typeof xml !== 'string') return xml;
  
  // Fix common quote issues in attribute values
  // Replace unescaped quotes within attribute values
  xml = xml.replace(/="([^"]*)"([^"]*)"([^"]*)"([^"]*)"([^"]*)"([^"]*)"([^>]*)/g, '="$1\'$2\'$3\'$4\'$5\'$6\'$7"');
  xml = xml.replace(/="([^"]*)"([^"]*)"([^>]*)/g, '="$1\'$2\'$3"');
  
  // Fix attributes with missing closing quotes
  xml = xml.replace(/=("[^"]*[^">])\s*([a-zA-Z])/g, '="$1" $2');
  
  return xml;
}

/**
 * Provides detailed XML analysis for debugging
 * @param {string} xml - The XML string to analyze
 * @returns {string} - Detailed analysis of XML structure
 */
function analyzeXMLStructure(xml) {
  if (!xml) return 'XML is empty';
  
  const lines = xml.split('\n');
  const lastFewLines = lines.slice(-10).join('\n');
  
  const selfClosingTags = (xml.match(/<[^>]*\/>/g) || []).length;
  const allOpenTags = (xml.match(/<[^/!?][^>]*>/g) || []).length;
  const closeTags = (xml.match(/<\/[^>]*>/g) || []).length;
  const regularOpenTags = allOpenTags - selfClosingTags;
  
  return `XML Analysis:
- Total lines: ${lines.length}
- Regular opening tags: ${regularOpenTags}
- Closing tags: ${closeTags}
- Self-closing tags: ${selfClosingTags}
- Last 10 lines:
${lastFewLines}`;
}

/**
 * Validates BPMN XML structure properly
 * @param {string} xml - The XML string to validate
 * @returns {object} - {valid: boolean, error: string}
 */
function validateXMLStructure(xml) {
  try {
    // Check for basic XML structure
    if (!xml || typeof xml !== 'string') {
      return { valid: false, error: 'XML is empty or not a string' };
    }

    if (!xml.includes('<bpmn:definitions') || !xml.includes('</bpmn:definitions>')) {
      return { valid: false, error: 'Missing BPMN definitions tags' };
    }
    
    // Check for required BPMN elements
    if (!xml.includes('<bpmn:process') || !xml.includes('</bpmn:process>')) {
      return { valid: false, error: 'Missing BPMN process tags' };
    }

    // Improved tag balance check that handles self-closing tags
    const selfClosingTags = (xml.match(/<[^>]*\/>/g) || []).length;
    const allOpenTags = (xml.match(/<[^/!?][^>]*>/g) || []).length; // All opening tags including self-closing
    const closeTags = (xml.match(/<\/[^>]*>/g) || []).length;
    
    // Regular opening tags = all opening tags - self-closing tags
    const regularOpenTags = allOpenTags - selfClosingTags;
    
    // For balanced XML: regular opening tags should equal closing tags
    if (regularOpenTags !== closeTags) {
      // Find specific unmatched tags for better error reporting
      const openTagsArray = (xml.match(/<([^/!?][^>\s]*)[^>]*>/g) || []).map(tag => tag.match(/<([^>\s]+)/)[1]);
      const closeTagsArray = (xml.match(/<\/([^>]+)>/g) || []).map(tag => tag.match(/<\/([^>]+)>/)[1]);
      const selfClosingArray = (xml.match(/<([^>]*)\s*\/>/g) || []).map(tag => tag.match(/<([^>\s]+)/)[1]);
      
      // Remove self-closing tags from open tags
      const regularOpenArray = openTagsArray.filter(tag => !selfClosingArray.includes(tag));
      
      return { 
        valid: false, 
        error: `Unbalanced tags: ${regularOpenTags} regular open, ${closeTags} close, ${selfClosingTags} self-closing. Check for unclosed tags near the end of the XML.` 
      };
    }

    // Check for common XML syntax errors
    if (xml.includes('<<') || xml.includes('>>')) {
      return { valid: false, error: 'Invalid XML syntax: double angle brackets' };
    }

    // Check for unclosed quotes in attributes (improved)
    const quoteMatches = xml.match(/="/g);
    const quoteCount = quoteMatches ? quoteMatches.length : 0;
    const closingQuotes = (xml.match(/"\s*[/>]/g) || []).length + (xml.match(/"\s*\w/g) || []).length;
    
    if (quoteCount !== closingQuotes) {
      // Try to find the specific problematic attribute
      const problematicLines = xml.split('\n').filter(line => {
        const lineQuotes = (line.match(/="/g) || []).length;
        const lineClosing = (line.match(/"\s*[/>]/g) || []).length + (line.match(/"\s*\w/g) || []).length;
        return lineQuotes !== lineClosing;
      });
      
      return { 
        valid: false, 
        error: `Unclosed quotes in XML attributes. Problematic line(s): ${problematicLines.slice(0, 2).join('; ')}` 
      };
    }

    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: `Validation error: ${error.message}` };
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
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY environment variable is not set.');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: API_KEY,
});

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
  const startTime = Date.now();
  const { diagramXML, selectedElementIds, prompt } = req.body;

  // Add request timeout
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        response: 'Request timeout - AI took too long to respond. Please try again.',
        updatedDiagramXML: diagramXML,
      });
    }
  }, 30000); // 30 second timeout

  const fullPrompt = generateBPMNPrompt(diagramXML, selectedElementIds, prompt);
  
  console.log(`🚀 Processing request: "${prompt.substring(0, 50)}..." (prompt length: ${fullPrompt.length} chars)`);
  
  try {
    const result = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: fullPrompt
        }
      ]
    });
    
    const text = result.content[0].text;
    
    clearTimeout(timeout); // Clear timeout on successful response

    // Attempt to parse the JSON response from Claude
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
      console.error('Failed to parse Claude response as JSON:', text);
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
    if (llmResponse.updatedDiagramXML) {
      let xmlToValidate = llmResponse.updatedDiagramXML;
      let validation = validateXMLStructure(xmlToValidate);
      
      // If validation fails, try to sanitize and validate again
      if (!validation.valid && validation.error.includes('quote')) {
        console.log('🔧 Attempting to fix XML quote issues...');
        xmlToValidate = sanitizeXML(llmResponse.updatedDiagramXML);
        validation = validateXMLStructure(xmlToValidate);
        
        if (validation.valid) {
          console.log('✅ XML fixed successfully after sanitization');
        }
      }
      
      if (validation.valid) {
        finalXML = xmlToValidate;
        console.log('✅ Generated XML validated successfully');
      } else {
        console.error('❌ Invalid XML generated by AI:', {
          error: validation.error,
          xmlPreview: llmResponse.updatedDiagramXML.substring(0, 200) + '...',
          xmlLength: llmResponse.updatedDiagramXML.length
        });
        console.error('📊 XML Structure Analysis:', analyzeXMLStructure(llmResponse.updatedDiagramXML));
        llmResponse.response = (llmResponse.response || '') + ` [Note: Generated XML was invalid (${validation.error}), keeping original diagram]`;
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ Request completed in ${responseTime}ms`);

    res.json({
      response: llmResponse.response || llmResponse.impactAnalysis || 'No specific response provided.',
      updatedDiagramXML: finalXML,
    });

  } catch (error) {
    clearTimeout(timeout); // Clear timeout on error
    const responseTime = Date.now() - startTime;
    console.error(`❌ Error after ${responseTime}ms:`, error.message);
    
    // Capture error in Sentry with context
    captureException(error, {
      api_endpoint: '/api/chat',
      user_prompt: prompt,
      selected_elements: selectedElementIds,
      diagram_length: diagramXML?.length || 0,
      response_time: responseTime
    });
    
    if (!res.headersSent) {
      res.status(500).json({
        response: 'Error: Failed to get response from AI. Please try again.',
        updatedDiagramXML: diagramXML,
      });
    }
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