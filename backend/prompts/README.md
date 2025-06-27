# BPMN AI Editor Prompts

This directory contains prompt templates and functions used by the BPMN AI Editor to communicate with the Gemini AI model.

## Files

### `bpmn-assistant.js`
Contains the main prompt template for the BPMN AI assistant that creates new workflow diagrams.

**Exports:**
- `generateBPMNPrompt(diagramXML, selectedElementIds, prompt)` - Generates the complete prompt for creating new BPMN diagrams

**Usage:**
```javascript
const { generateBPMNPrompt } = require('./prompts/bpmn-assistant');

const fullPrompt = generateBPMNPrompt(diagramXML, selectedElementIds, userPrompt);
```

## Prompt Structure

The BPMN assistant prompt includes:

1. **Role Definition** - Defines the AI as a BPMN expert for creating workflow diagrams
2. **Process Creation Guidelines** - Rules for creating valid BPMN 2.0 diagrams
3. **BPMN Elements Guide** - Available elements and their purposes
4. **Response Format** - JSON structure for the response
5. **XML Requirements** - Technical requirements for valid BPMN XML
6. **Example Process Types** - Common workflow patterns
7. **Dynamic Content** - Current context and user request

## Benefits of Separation

- **Maintainability** - Easy to update and version control prompts
- **Reusability** - Prompts can be used across different endpoints
- **Testing** - Prompts can be tested independently
- **Documentation** - Clear structure and purpose for each prompt
- **Collaboration** - Non-developers can easily review and modify prompts 