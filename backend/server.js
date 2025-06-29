// Load environment variables first
require('dotenv').config();

// Debug: Check which environment variables are loaded
console.log('🔍 Environment Variables Debug:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? `Set (${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...)` : 'Not set');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `Set (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : 'Not set');
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `Set (${process.env.GEMINI_API_KEY.substring(0, 10)}...)` : 'Not set');
console.log('- GROQ_API_KEY:', process.env.GROQ_API_KEY ? `Set (${process.env.GROQ_API_KEY.substring(0, 10)}...)` : 'Not set');
console.log('- SENTRY_DSN:', process.env.SENTRY_DSN ? 'Set' : 'Not set');
console.log('---');

const express = require('express');
const cors = require('cors');
const { DOMParser } = require('xmldom');

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

// Import AI service
const { 
  initializeAIClients, 
  getAvailableProviders, 
  generateResponse, 
  getProviderInfo 
} = require('./ai-service');

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
 * Validates XML using DOM parser
 * @param {string} xmlString - The XML string to validate
 * @returns {object} - {valid: boolean, errors: string[]}
 */
function validateXMLWithParser(xmlString) {
  try {
    const parser = new DOMParser({
      errorHandler: {
        warning: function(msg) { console.warn('XML Warning:', msg); },
        error: function(msg) { console.error('XML Error:', msg); },
        fatalError: function(msg) { console.error('XML Fatal Error:', msg); }
      }
    });
    
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const errors = doc.getElementsByTagName('parsererror');
    
    if (errors.length > 0) {
      const errorMessages = [];
      for (let i = 0; i < errors.length; i++) {
        errorMessages.push(errors[i].textContent);
      }
      return { valid: false, errors: errorMessages };
    }
    
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
}

/**
 * Count tags programmatically for debugging
 * @param {string} xml - The XML string to analyze
 * @returns {object} - Tag count statistics
 */
function countTags(xml) {
  if (!xml || typeof xml !== 'string') {
    return { openTags: 0, closeTags: 0, selfClosing: 0, valid: false };
  }

  // More precise regex patterns
  const openTagPattern = /<[^\/!?][^>]*[^\/]>/g;
  const closeTagPattern = /<\/[^>]+>/g;
  const selfClosingPattern = /<[^>]+\/>/g;
  const xmlDeclarationPattern = /<\?xml[^>]*\?>/g;
  
  const openTags = (xml.match(openTagPattern) || []).length;
  const closeTags = (xml.match(closeTagPattern) || []).length;
  const selfClosing = (xml.match(selfClosingPattern) || []).length;
  const xmlDeclarations = (xml.match(xmlDeclarationPattern) || []).length;
  
  // Calculate expected balance
  const expectedBalance = openTags === closeTags;
  
  console.log(`🔍 XML Tag Analysis:
  - Open tags: ${openTags}
  - Close tags: ${closeTags}
  - Self-closing tags: ${selfClosing}
  - XML declarations: ${xmlDeclarations}
  - Balanced: ${expectedBalance ? '✅' : '❌'}`);
  
  return { 
    openTags, 
    closeTags, 
    selfClosing, 
    xmlDeclarations,
    valid: expectedBalance,
    balance: openTags - closeTags
  };
}

/**
 * Comprehensive XML validation combining multiple strategies
 * @param {string} xml - The XML string to validate
 * @returns {object} - {valid: boolean, error: string, details: object}
 */
function comprehensiveXMLValidation(xml) {
  console.log('🔍 Starting comprehensive XML validation...');
  
  // Strategy 1: Basic structure checks
  const basicValidation = validateXMLStructure(xml);
  
  // Strategy 2: DOM parser validation
  const parserValidation = validateXMLWithParser(xml);
  
  // Strategy 3: Tag counting
  const tagCounts = countTags(xml);
  
  // Strategy 4: BPMN-specific validation
  const bpmnValidation = validateBPMNSpecificStructure(xml);
  
  const details = {
    basic: basicValidation,
    parser: parserValidation,
    tags: tagCounts,
    bpmn: bpmnValidation
  };
  
  // Determine overall validity
  const isValid = basicValidation.valid && 
                  parserValidation.valid && 
                  tagCounts.valid && 
                  bpmnValidation.valid;
  
  let error = '';
  if (!isValid) {
    const errors = [];
    if (!basicValidation.valid) errors.push(`Basic: ${basicValidation.error}`);
    if (!parserValidation.valid) errors.push(`Parser: ${parserValidation.errors.join(', ')}`);
    if (!tagCounts.valid) errors.push(`Tags: ${tagCounts.balance > 0 ? 'Unclosed tags' : 'Extra closing tags'} (${Math.abs(tagCounts.balance)})`);
    if (!bpmnValidation.valid) errors.push(`BPMN: ${bpmnValidation.error}`);
    error = errors.join(' | ');
  }
  
  console.log(`🔍 Validation Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  if (!isValid) console.log(`🔍 Validation Errors: ${error}`);
  
  return { valid: isValid, error, details };
}

/**
 * BPMN-specific structure validation
 * @param {string} xml - The XML string to validate
 * @returns {object} - {valid: boolean, error: string}
 */
function validateBPMNSpecificStructure(xml) {
  if (!xml || typeof xml !== 'string') {
    return { valid: false, error: 'XML is empty or not a string' };
  }

  // Check for required BPMN namespaces
  const requiredNamespaces = [
    'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"',
    'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"'
  ];
  
  for (const ns of requiredNamespaces) {
    if (!xml.includes(ns)) {
      return { valid: false, error: `Missing required namespace: ${ns}` };
    }
  }

  // Check for required BPMN structure
  if (!xml.includes('<bpmn:definitions') || !xml.includes('</bpmn:definitions>')) {
    return { valid: false, error: 'Missing BPMN definitions tags' };
  }
  
  if (!xml.includes('<bpmn:process') || !xml.includes('</bpmn:process>')) {
    return { valid: false, error: 'Missing BPMN process tags' };
  }

  // Check for at least one BPMN element
  const bpmnElements = ['startEvent', 'endEvent', 'task', 'userTask', 'serviceTask', 'scriptTask', 'gateway'];
  const hasElements = bpmnElements.some(element => xml.includes(`<bpmn:${element}`));
  
  if (!hasElements) {
    return { valid: false, error: 'No BPMN process elements found' };
  }

  return { valid: true, error: null };
}

/**
 * Basic XML structure validation (legacy function for compatibility)
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
      return { 
        valid: false, 
        error: `Unbalanced tags: ${regularOpenTags} regular open, ${closeTags} close, ${selfClosingTags} self-closing. Check for unclosed tags near the end of the XML.` 
      };
    }

    // Check for common XML syntax errors
    if (xml.includes('<<') || xml.includes('>>')) {
      return { valid: false, error: 'Invalid XML syntax: double angle brackets' };
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

// Initialize AI clients
const aiClients = initializeAIClients();
const availableProviders = getAvailableProviders(aiClients);
const providerInfo = getProviderInfo();

console.log(`🤖 Available AI providers: ${availableProviders.join(', ')}`);

if (availableProviders.length === 0) {
  console.error('❌ No AI providers configured. Please set at least one API key in environment variables.');
  console.error('Required environment variables: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY');
  process.exit(1);
}

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
  let responseHandled = false; // Track if response has been sent

  // Add request timeout - increased for complex AI processing
  const timeout = setTimeout(() => {
    if (!responseHandled && !res.headersSent) {
      responseHandled = true;
      console.log(`⏰ Request timeout after 45 seconds for prompt: "${prompt.substring(0, 50)}..."`);
      res.status(408).json({
        response: 'Request timeout - AI took too long to respond. Please try with a simpler request or try again.',
        updatedDiagramXML: diagramXML,
      });
    }
  }, 45000); // 45 second timeout (increased from 30)

  const fullPrompt = generateBPMNPrompt(diagramXML, selectedElementIds, prompt);
  
  console.log(`🚀 Processing request: "${prompt.substring(0, 50)}..." (prompt length: ${fullPrompt.length} chars)`);
  console.log(`📊 Request details: diagram size=${diagramXML?.length || 0}, selected elements=${selectedElementIds?.length || 0}`);
  
  try {
    const aiStartTime = Date.now();
    const provider = req.body.aiProvider || availableProviders[0]; // Use first available provider as default
    const text = await generateResponse(aiClients, provider, fullPrompt);
    
    const aiResponseTime = Date.now() - aiStartTime;
    console.log(`🤖 AI response received from ${provider} in ${aiResponseTime}ms`);
    
    // Warn about slow AI responses
    if (aiResponseTime > 20000) {
      console.warn(`⚠️ Slow AI response detected (${aiResponseTime}ms). Consider optimizing prompt or checking AI service status.`);
    }
    
    clearTimeout(timeout); // Clear timeout on successful response

    // Check if response was already sent by timeout
    if (responseHandled || res.headersSent) {
      console.log('⚠️ Response already sent, skipping...');
      return;
    }

    // Attempt to parse the JSON response from AI
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

      // Handle batched XML responses
      if (llmResponse.xmlBatched && llmResponse.xmlBatchCount) {
        console.log(`🔧 Reconstructing batched XML with ${llmResponse.xmlBatchCount} parts`);
        let reconstructedXML = '';
        
        for (let i = 1; i <= llmResponse.xmlBatchCount; i++) {
          const batchKey = `xmlBatch${i}`;
          if (llmResponse[batchKey]) {
            reconstructedXML += llmResponse[batchKey];
          } else {
            console.warn(`⚠️ Missing batch part: ${batchKey}`);
          }
        }
        
        if (reconstructedXML) {
          llmResponse.updatedDiagramXML = reconstructedXML;
          console.log(`✅ Reconstructed XML from ${llmResponse.xmlBatchCount} batches, total length: ${reconstructedXML.length}`);
        }
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', text);
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
      
      console.log('🔍 Starting comprehensive XML validation...');
      console.log(`🔍 XML Length: ${xmlToValidate.length} characters`);
      
      // Use comprehensive validation
      let validation = comprehensiveXMLValidation(xmlToValidate);
      
      // If validation fails, try multiple repair strategies
      if (!validation.valid) {
        console.log('🔧 Attempting XML repair strategies...');
        
        // Strategy 1: Basic sanitization (quotes, truncation, etc.)
        console.log('🔧 Strategy 1: Basic sanitization...');
        xmlToValidate = sanitizeXML(llmResponse.updatedDiagramXML);
        validation = comprehensiveXMLValidation(xmlToValidate);
        
        // Strategy 2: If still invalid, try to extract and rebuild from process
        if (!validation.valid && xmlToValidate.includes('<bpmn:process')) {
          console.log('🔧 Strategy 2: Rebuilding from process section...');
          try {
            const processMatch = xmlToValidate.match(/<bpmn:process[\s\S]*?<\/bpmn:process>/);
            if (processMatch) {
              // Create a minimal valid BPMN with just the process
              xmlToValidate = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  ${processMatch[0]}
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
              validation = comprehensiveXMLValidation(xmlToValidate);
              if (validation.valid) {
                console.log('✅ XML rebuilt successfully from process section');
                llmResponse.response = (llmResponse.response || '') + ' [Note: Diagram layout was simplified due to XML issues]';
              }
            }
          } catch (rebuildError) {
            console.error('❌ Failed to rebuild XML:', rebuildError.message);
          }
        }
      }
      
      if (validation.valid) {
        finalXML = xmlToValidate;
        console.log('✅ Final XML validation successful');
      } else {
        console.error('❌ All XML repair strategies failed:', {
          error: validation.error,
          details: validation.details,
          xmlPreview: llmResponse.updatedDiagramXML.substring(0, 200) + '...',
          xmlLength: llmResponse.updatedDiagramXML.length
        });
        console.error('📊 XML Structure Analysis:', analyzeXMLStructure(llmResponse.updatedDiagramXML));
        llmResponse.response = (llmResponse.response || '') + ` [Note: Generated XML was invalid and could not be repaired (${validation.error}), keeping original diagram]`;
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ Request completed in ${responseTime}ms (AI: ${aiResponseTime}ms, Processing: ${responseTime - aiResponseTime}ms)`);

    // Final check before sending response
    if (!responseHandled && !res.headersSent) {
      responseHandled = true;
      res.json({
        response: llmResponse.response || llmResponse.impactAnalysis || 'No specific response provided.',
        updatedDiagramXML: finalXML,
      });
    }

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
      response_time: responseTime,
      ai_provider: req.body.aiProvider || availableProviders[0]
    });
    
    // Only send error response if not already handled
    if (!responseHandled && !res.headersSent) {
      responseHandled = true;
      res.status(500).json({
        response: 'Error: Failed to get response from AI. Please try again.',
        updatedDiagramXML: diagramXML,
      });
    }
  }
});

// API endpoint to get available AI providers
app.get('/api/providers', (req, res) => {
  res.json({
    providers: availableProviders.map(provider => ({
      id: provider,
      ...providerInfo[provider]
    })),
    default: availableProviders[0]
  });
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
    environment: process.env.NODE_ENV || 'development',
    available_providers: availableProviders
  });
});