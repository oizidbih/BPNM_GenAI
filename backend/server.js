const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3001;

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

app.post('/api/chat', async (req, res) => {
  const { diagramXML, selectedElementIds, prompt } = req.body;

  const fullPrompt = `You are a AI assistant that helps modify BPMN diagrams based on user instructions.
The user will provide the current BPMN diagram XML, a list of selected element IDs, and a natural language prompt.
Your task is to:
1. Understand the user's request in the context of the provided BPMN diagram and selected elements.
2. Generate the updated BPMN XML based on the request. **Crucially, ensure the generated BPMN XML is valid and adheres 
to the BPMN 2.0 specification, including all required attributes 
(e.g., \`sourceRef\` and \`targetRef\` for \`bpmn:sequenceFlow\`).**
3. Identify any potential impacts or inconsistencies that the change might introduce to other parts of the diagram.

**Enhanced Conversational Capabilities:**
4. Engage in natural conversation with the user about their BPMN diagram and selected elements.
5. When the user asks questions about selected shapes, provide detailed explanations including:
   - Element type and purpose within the BPMN process
   - Current properties and configuration
   - Business logic and significance in the overall workflow
6. Analyze and explain connections between selected elements and other shapes:
   - Incoming and outgoing sequence flows
   - Data associations and message flows
   - Parent-child relationships (pools, lanes, subprocesses)
   - Dependencies and logical relationships
7. Provide educational insights about BPMN best practices and modeling techniques.
8. Offer suggestions for process improvements and optimization opportunities.
9. Answer questions about process flow, potential bottlenecks, and business logic.

**Response Format:**
- For modification requests: Return JSON with 'updatedDiagramXML' and 'impactAnalysis'
- For conversational queries: Return JSON with 'response' field containing your explanation
- For mixed requests (conversation + modification): Return JSON with all relevant fields

**Connection Analysis Guidelines:**
When explaining element connections, include:
- Direct predecessors and successors in the process flow
- Conditional flows and their criteria
- Parallel branches and synchronization points
- Exception handling and error flows
- Data inputs/outputs and their sources/destinations
- Role responsibilities (if lanes/pools are present)

**Educational Context:**
Provide context about:
- BPMN element semantics and when to use each type
- Process modeling best practices
- Common anti-patterns and how to avoid them
- Performance and maintainability considerations

Return your response in a JSON object with appropriate fields based on the request type:

For modifications:
{
  "updatedDiagramXML": "<bpmn:definitions>...</bpmn:definitions>",
  "impactAnalysis": "Changing this task might affect the subsequent gateway decision."
}

For conversations:
{
  "response": "The selected task 'Review Application' is a User Task that represents manual work. It connects to..."
}

For mixed requests:
{
  "response": "I understand you want to modify the gateway. Currently, this exclusive gateway...",
  "updatedDiagramXML": "<bpmn:definitions>...</bpmn:definitions>",
  "impactAnalysis": "This change will affect downstream processes..."
}

If no changes are made to the XML, return the original XML in 'updatedDiagramXML'.
If there are no impacts, return an empty string for 'impactAnalysis'.

Current BPMN Diagram XML:
${diagramXML}

Selected Element IDs: ${selectedElementIds.length > 0 ? selectedElementIds.join(', ') : 'None'}

User's Request: ${prompt}

Example JSON response structure:
{
  "updatedDiagramXML": "<bpmn:definitions>...</bpmn:definitions>",
  "impactAnalysis": "Changing this task might affect the subsequent gateway decision."
}`
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

    res.json({
      response: llmResponse.response || llmResponse.impactAnalysis || 'No specific response provided.',
      updatedDiagramXML: llmResponse.updatedDiagramXML || diagramXML,
    });

  } catch (error) {
    console.error('Error communicating with Gemini API:', error);
    res.status(500).json({
      response: 'Error: Failed to get response from AI.',
      updatedDiagramXML: diagramXML,
    });
  }
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});