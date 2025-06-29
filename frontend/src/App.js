import React, { useEffect, useRef, useState } from 'react';
import BpmnJS from 'bpmn-js/lib/Modeler'; // Changed from Viewer to Modeler

import './App.css';
import { captureException, captureMessage, addBreadcrumb, SentryErrorBoundary } from './sentry';

// Import BPMN.js CSS files
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

/**
 * Validates XML using DOM parser (client-side validation)
 * @param {string} xmlString - The XML string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateXML(xmlString) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const errors = doc.querySelectorAll('parsererror');
    return errors.length === 0;
  } catch (error) {
    console.error('XML validation error:', error);
    return false;
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
  
  const openTags = (xml.match(openTagPattern) || []).length;
  const closeTags = (xml.match(closeTagPattern) || []).length;
  const selfClosing = (xml.match(selfClosingPattern) || []).length;
  
  // Calculate expected balance
  const expectedBalance = openTags === closeTags;
  
  console.log(`🔍 Frontend XML Tag Analysis:
  - Open tags: ${openTags}
  - Close tags: ${closeTags}
  - Self-closing tags: ${selfClosing}
  - Balanced: ${expectedBalance ? '✅' : '❌'}`);
  
  return { 
    openTags, 
    closeTags, 
    selfClosing, 
    valid: expectedBalance,
    balance: openTags - closeTags
  };
}

/**
 * Comprehensive XML validation for frontend
 * @param {string} xml - The XML string to validate
 * @returns {object} - {valid: boolean, error: string, details: object}
 */
function validateBPMNXML(xml) {
  console.log('🔍 Frontend: Starting BPMN XML validation...');
  
  // Basic checks
  if (!xml || typeof xml !== 'string') {
    return { valid: false, error: 'XML is empty or not a string', details: {} };
  }

  // DOM parser validation
  const domValid = validateXML(xml);
  
  // Tag counting
  const tagCounts = countTags(xml);
  
  // BPMN-specific checks
  const hasDefinitions = xml.includes('<bpmn:definitions') && xml.includes('</bpmn:definitions>');
  const hasProcess = xml.includes('<bpmn:process') && xml.includes('</bpmn:process>');
  
  const details = {
    domValid,
    tagCounts,
    hasDefinitions,
    hasProcess
  };
  
  const isValid = domValid && tagCounts.valid && hasDefinitions && hasProcess;
  
  let error = '';
  if (!isValid) {
    const errors = [];
    if (!domValid) errors.push('DOM parser failed');
    if (!tagCounts.valid) errors.push(`Unbalanced tags (${tagCounts.balance})`);
    if (!hasDefinitions) errors.push('Missing BPMN definitions');
    if (!hasProcess) errors.push('Missing BPMN process');
    error = errors.join(', ');
  }
  
  console.log(`🔍 Frontend validation result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  if (!isValid) console.log(`🔍 Frontend validation errors: ${error}`);
  
  return { valid: isValid, error, details };
}


function App() {
  const bpmnViewerRef = useRef(null);
  const bpmnModelerRef = useRef(null); // Use a ref for the modeler instance
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [selectedElements, setSelectedElements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const initialLoadRef = useRef(false);
  
  // AI Provider state
  const [availableProviders, setAvailableProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  
  const [bpmnXML, setBpmnXML] = useState(`<?xml version="1.0" encoding="UTF-8"?>
    <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
      <bpmn:process id="Process_1" isExecutable="false">
        <bpmn:startEvent id="StartEvent_1" name="Start">
          <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        </bpmn:startEvent>
        <bpmn:task id="Task_1" name="Do Something">
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
    </bpmn:definitions>
    `);

  // Fetch available AI providers on component mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/providers');
        const data = await response.json();
        setAvailableProviders(data.providers);
        setSelectedProvider(data.default);
        setIsLoadingProviders(false);
        console.log('Available AI providers:', data.providers);
      } catch (error) {
        console.error('Error fetching AI providers:', error);
        setIsLoadingProviders(false);
        // Capture error in Sentry
        captureException(error, {
          component: 'app',
          action: 'fetch_providers',
          backend_url: 'http://localhost:3001/api/providers'
        });
      }
    };

    fetchProviders();
  }, []);

  useEffect(() => {
    // Only initialize the modeler once
    if (!bpmnModelerRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (bpmnViewerRef.current && !bpmnModelerRef.current) {
          console.log('Initializing BPMN modeler...');
          const bpmnModeler = new BpmnJS({
            container: bpmnViewerRef.current,
          });
          bpmnModelerRef.current = bpmnModeler; // Store the modeler instance

          // Set up event listeners
          bpmnModeler.on('selection.changed', (event) => {
            setSelectedElements(event.newSelection.map(element => element.id));
          });

          // Update XML on diagram change
          bpmnModeler.on('commandStack.changed', async () => {
            try {
              const { xml } = await bpmnModeler.saveXML({ format: true });
              setBpmnXML(xml);
            } catch (err) {
              console.error('Error saving BPMN XML:', err);
            }
          });

          // Import initial XML
          bpmnModeler.importXML(bpmnXML).then(function(result) {
            const { warnings } = result;
            console.log('Initial BPMN diagram rendered');
            initialLoadRef.current = true;
            if (warnings.length) {
              console.log('warnings', warnings);
            }
          }).catch(function(err) {
            const { message, warnings } = err;
            console.error('Error loading initial BPMN diagram:', message, warnings);
          });
        }
      }, 100);
    }

    return () => {
      if (bpmnModelerRef.current) {
        console.log('Destroying BPMN modeler...');
        bpmnModelerRef.current.destroy();
        bpmnModelerRef.current = null;
        initialLoadRef.current = false;
      }
    };
  }, []); // Empty dependency array - only run once

  // Separate effect for XML updates - only run when XML changes from external sources
  useEffect(() => {
    // Only update if initial load is complete and this is an external XML change
    if (bpmnModelerRef.current && bpmnXML && initialLoadRef.current && !isLoading) {
      setIsLoading(true);
      
      // Validate XML before attempting to import
      console.log('🔍 Frontend: Validating XML before import...');
      const validation = validateBPMNXML(bpmnXML);
      
      if (!validation.valid) {
        console.error('🔍 Frontend: XML validation failed before import:', validation);
        setChatMessages((prevMessages) => [...prevMessages, { 
          sender: 'llm', 
          text: `Error: Invalid BPMN XML detected before import. ${validation.error}. The backend should have caught this - please report this issue.`
        }]);
        setIsLoading(false);
        return;
      }
      
      console.log('🔍 Frontend: XML validation passed, importing...');
      bpmnModelerRef.current.importXML(bpmnXML).then(function(result) {
        const { warnings } = result;
        console.log('✅ XML updated successfully');
        if (warnings.length) {
          console.log('⚠️ Import warnings:', warnings);
        }
        setIsLoading(false);
      }).catch(function(err) {
        const { message, warnings } = err;
        console.error('❌ Error updating BPMN XML:', message, warnings);
        
        // Run post-import validation for debugging
        const postValidation = validateBPMNXML(bpmnXML);
        console.error('🔍 Post-import validation:', postValidation);
        
        // Provide more specific error messages
        let errorMessage = 'Error updating diagram: ';
        if (message.includes('unparsable content') || message.includes('closing tag mismatch')) {
          errorMessage += 'Invalid BPMN XML structure detected. The AI generated malformed XML. Please try again with a different description.';
        } else if (message.includes('sourceRef') || message.includes('targetRef')) {
          errorMessage += 'Invalid sequence flow references. Please try again.';
        } else if (message.includes('duplicate id')) {
          errorMessage += 'Duplicate element IDs detected. Please try again.';
        } else {
          errorMessage += message + '. Please try again or use the Test BPMN button to load a working diagram.';
        }
        
        // Show user-friendly error message
        setChatMessages((prevMessages) => [...prevMessages, { 
          sender: 'llm', 
          text: errorMessage
        }]);
        setIsLoading(false);
        
        // Capture error in Sentry with detailed context
        captureException(new Error(`BPMN import failed: ${message}`), {
          component: 'app',
          action: 'xml_import',
          xml_length: bpmnXML.length,
          validation_details: postValidation,
          bpmn_warnings: warnings
        });
      });
    }
  }, [bpmnXML]); // Only run when bpmnXML changes

  const handleChatInputChange = (event) => {
    setChatInput(event.target.value);
  };

  const handleChatSubmit = async () => {
    if (chatInput.trim() === '') return;

    const userMessage = { sender: 'user', text: chatInput };
    setChatMessages((prevMessages) => [...prevMessages, userMessage]);
    
    // Add breadcrumb for debugging
    addBreadcrumb({
      message: 'User sent chat message',
      category: 'user_interaction',
      data: {
        message_length: chatInput.length,
        selected_elements_count: selectedElements.length
      }
    });
    
    setChatInput('');

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diagramXML: bpmnXML,
          selectedElementIds: selectedElements,
          prompt: chatInput,
          aiProvider: selectedProvider,
        }),
      });

      const data = await response.json();
      setChatMessages((prevMessages) => [...prevMessages, { sender: 'llm', text: data.response }]);
      
      // Validate and handle the updated diagram XML
      if (data.updatedDiagramXML && data.updatedDiagramXML.trim() !== '') {
        // Check if the XML is valid BPMN
        if (data.updatedDiagramXML.includes('<bpmn:definitions') && 
            data.updatedDiagramXML.includes('</bpmn:definitions>')) {
          setBpmnXML(data.updatedDiagramXML);
        } else {
          console.error('Invalid BPMN XML received:', data.updatedDiagramXML);
          setChatMessages((prevMessages) => [...prevMessages, { 
            sender: 'llm', 
            text: 'Error: Received invalid BPMN XML from AI. Please try again.' 
          }]);
        }
      } else {
        console.log('No diagram update received from AI');
      }

    } catch (error) {
      console.error('Error sending chat message:', error);
      
      // Capture error in Sentry with context
      captureException(error, {
        component: 'chat',
        action: 'send_message',
        user_prompt: chatInput,
        selected_elements: selectedElements,
        backend_url: 'http://localhost:3001/api/chat'
      });
      
      setChatMessages((prevMessages) => [...prevMessages, { sender: 'llm', text: 'Error: Could not connect to backend.' }]);
    }
  };

  const handleTestBPMN = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/test-bpmn');
      const data = await response.json();
      
      if (data.updatedDiagramXML) {
        setBpmnXML(data.updatedDiagramXML);
        setChatMessages((prevMessages) => [...prevMessages, { 
          sender: 'llm', 
          text: 'Test BPMN diagram loaded successfully!' 
        }]);
      }
    } catch (error) {
      console.error('Error loading test BPMN:', error);
      setChatMessages((prevMessages) => [...prevMessages, { 
        sender: 'llm', 
        text: 'Error: Could not load test BPMN diagram.' 
      }]);
    }
  };

  return (
    <SentryErrorBoundary fallback={({ error, resetError }) => (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button onClick={resetError}>Try again</button>
      </div>
    )}>
    <div className="App">
      <div className="bpmn-container">
        <div ref={bpmnViewerRef} className="bpmn-viewer"></div>
        <div className="chat-panel">
          <div className="ai-provider-selector">
            <label htmlFor="ai-provider">AI Provider:</label>
            {isLoadingProviders ? (
              <span>Loading providers...</span>
            ) : (
              <select 
                id="ai-provider"
                value={selectedProvider} 
                onChange={(e) => setSelectedProvider(e.target.value)}
                disabled={isLoading}
              >
                {availableProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.icon} {provider.name} - {provider.description}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="chat-messages">
            {chatMessages.map((message, index) => (
              <div key={index} className={`chat-message ${message.sender}`}>
                <strong>{message.sender}:</strong> {message.text}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="Chat with the diagram..."
              value={chatInput}
              onChange={handleChatInputChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleChatSubmit();
                }
              }}
              disabled={isLoading}
            />
            <button onClick={handleChatSubmit} disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Send'}
            </button>
            <button onClick={handleTestBPMN} className="test-bpmn" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Test BPMN'}
            </button>
          </div>
          <div className="selected-elements">
            Selected Elements: {selectedElements.length > 0 ? selectedElements.join(', ') : 'None'}
          </div>
        </div>
      </div>
    </div>
    </SentryErrorBoundary>
  );
}

export default App;