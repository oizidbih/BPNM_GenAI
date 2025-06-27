import React, { useEffect, useRef, useState } from 'react';
import BpmnJS from 'bpmn-js/lib/Modeler'; // Changed from Viewer to Modeler

import './App.css';
import { captureException, captureMessage, addBreadcrumb, SentryErrorBoundary } from './sentry';
import 'bpmn-js/dist/assets/diagram-js.css'; // Modeler CSS
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'; // Modeler CSS
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css'; // Modeler CSS
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'; // Modeler CSS

function App() {
  const bpmnViewerRef = useRef(null);
  const bpmnModelerRef = useRef(null); // Use a ref for the modeler instance
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [selectedElements, setSelectedElements] = useState([]);
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
    const bpmnModeler = new BpmnJS({
      container: bpmnViewerRef.current,
    });
    bpmnModelerRef.current = bpmnModeler; // Store the modeler instance

    bpmnModeler.importXML(bpmnXML).then(function(result) {
      const { warnings } = result;
      console.log('rendered');
      if (warnings.length) {
        console.log('warnings', warnings);
      }
    }).catch(function(err) {
      const { message, warnings } = err;
      console.log('something went wrong:', message, warnings);
    });

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

    return () => {
      bpmnModeler.destroy();
    };
  }, [bpmnXML]);

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
      if (data.updatedDiagramXML) {
        setBpmnXML(data.updatedDiagramXML);
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
              />
              <button onClick={handleChatSubmit}>Send</button>
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