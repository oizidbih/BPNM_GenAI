# BPMN AI Editor Prompts

This directory contains prompt templates and functions used by the BPMN AI Editor to communicate with the Gemini AI model.

## Files

### `bpmn-assistant.js`
Contains the main prompt template for the BPMN AI assistant that can both create new workflow diagrams and modify existing ones.

**Exports:**
- `generateBPMNPrompt(diagramXML, selectedElementIds, prompt)` - Generates the complete prompt for creating new BPMN diagrams or modifying existing ones

**Usage:**
```javascript
const { generateBPMNPrompt } = require('./prompts/bpmn-assistant');

const fullPrompt = generateBPMNPrompt(diagramXML, selectedElementIds, userPrompt);
```

## Prompt Structure

The BPMN assistant prompt includes:

1. **Role Definition** - Defines the AI as a BPMN expert for creating and modifying workflow diagrams
2. **Dual Functionality** - Handles both new diagram creation and existing diagram modification
3. **Process Creation/Modification Guidelines** - Rules for creating valid BPMN 2.0 diagrams
4. **BPMN Elements Guide** - Available elements and their purposes
5. **Enhanced Conversational Capabilities** - Explaining elements, connections, and best practices
6. **Response Format** - JSON structure for different types of responses (creation, modification, conversation)
7. **XML Requirements** - Technical requirements for valid BPMN XML
8. **Dynamic Content** - Current context, existing diagram (if any), and user request

## Functionality

### Creating New Diagrams
When no existing diagram is provided or user requests a completely new workflow:
- Creates complete BPMN 2.0 XML from scratch
- Includes all required elements (Start Event, Tasks, End Event, etc.)
- Provides proper positioning and visual layout

### Modifying Existing Diagrams
When an existing diagram is provided:
- Analyzes the current diagram structure
- Modifies elements based on user requests
- Preserves existing elements unless specifically asked to change them
- Provides impact analysis of changes

### Conversational Queries
For questions about diagrams without modifications:
- Explains BPMN elements and their purposes
- Describes connections and relationships
- Provides best practices and optimization suggestions
- Returns existing diagram unchanged

## Benefits of Separation

- **Maintainability** - Easy to update and version control prompts
- **Reusability** - Prompts can be used across different endpoints
- **Testing** - Prompts can be tested independently
- **Documentation** - Clear structure and purpose for each prompt
- **Collaboration** - Non-developers can easily review and modify prompts 