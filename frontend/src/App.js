import React, { useEffect, useRef, useState } from 'react';
import BpmnJS from 'bpmn-js/lib/Modeler'; // Changed from Viewer to Modeler

import './App.css';
import { captureException, captureMessage, addBreadcrumb, SentryErrorBoundary } from './sentry';

// Import BPMN.js CSS files
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';


function App() {
  const bpmnViewerRef = useRef(null);
  const bpmnModelerRef = useRef(null); // Use a ref for the modeler instance
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [selectedElements, setSelectedElements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const initialLoadRef = useRef(false);
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
      bpmnModelerRef.current.importXML(bpmnXML).then(function(result) {
        const { warnings } = result;
        console.log('XML updated successfully');
        if (warnings.length) {
          console.log('warnings', warnings);
        }
        setIsLoading(false);
      }).catch(function(err) {
        const { message, warnings } = err;
        console.error('Error updating BPMN XML:', message, warnings);
        
        // Provide more specific error messages
        let errorMessage = 'Error updating diagram: ';
        if (message.includes('unparsable content') || message.includes('closing tag mismatch')) {
          errorMessage += 'Invalid BPMN XML structure detected. The AI generated malformed XML. Please try again with a different description.';
        } else if (message.includes('sourceRef') || message.includes('targetRef')) {
          errorMessage += 'Invalid sequence flow references. Please try again.';
        } else {
          errorMessage += message + '. Please try again or use the Test BPMN button to load a working diagram.';
        }
        
        // Show user-friendly error message
        setChatMessages((prevMessages) => [...prevMessages, { 
          sender: 'llm', 
          text: errorMessage
        }]);
        setIsLoading(false);
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