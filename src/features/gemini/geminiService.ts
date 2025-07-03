
// FILENAME: src/features/gemini/geminiService.ts - VERSION: v8
import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters, GroundingMetadata } from "@google/genai";
import { GeminiResponse, AiPersona, ShapeType, Tool, SHAPE_TYPE_VALUES, LineStyle } from '../../../types';
import { COLORS, STROKE_WIDTHS, EMOJI_LIST, AI_PERSONAS_LIST, ALL_SUPPORTED_IMPORT_EXTENSIONS, DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY, TRANSPARENT_FILL_VALUE, DEFAULT_CONTENT_BOX_FONT_SIZE, LINE_STYLES } from '../../../constants';

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! }); 

const GEMINI_MULTIMODAL_MODEL = 'gemini-2.5-flash-preview-04-17';
export const GEMINI_MODEL_TEXT_ONLY = 'gemini-2.5-flash-preview-04-17';


interface SystemInstructionDetails {
  instruction: string;
  modelConfigOverride?: Partial<GenerateContentParameters['config']>;
}


const getMenuOptionsJSONString = (canvasWidth: number, canvasHeight: number): string => {
  const menuOptions = {
    applicationInfo: {
      name: "Gemini Whiteboard Assistant",
      description: "An interactive digital whiteboard application where users can draw, write, add shapes, and use AI to analyze or generate content.",
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight,
    },
    tools: [
      { id: Tool.SELECT, name: "Select Tool", shortcutHint: "S", description: "Select, move, and resize elements on the canvas.", uiPath: ["Tools Menu", "Main Tools"] },
      { id: Tool.PAN, name: "Pan Tool", shortcutHint: "M", description: "Pan or scroll the canvas view.", uiPath: ["Tools Menu", "Main Tools"] },
      { id: Tool.PENCIL, name: "Pencil Tool", shortcutHint: "P", description: "Draw freehand paths.", commandTypeHint: "path", uiPath: ["Tools Menu", "Main Tools"] },
      { id: Tool.TEXT, name: "Text Tool", shortcutHint: "T", description: "Add resizable text boxes to the canvas.", commandTypeHint: "text", uiPath: ["Tools Menu", "Main Tools"] },
      { id: Tool.ERASER, name: "Eraser Tool", shortcutHint: "E", description: "Erase elements on the canvas.", uiPath: ["Tools Menu", "Utility Tools"] },
      { id: Tool.RECTANGLE, name: "Rectangle Tool", shortcutHint: "R", description: "Draw a rectangle shape.", commandTypeHint: "flowchart-shape", shapeType: "rectangle" as ShapeType, uiPath: ["Tools Menu", "Shape Tools"] },
      { id: Tool.OVAL, name: "Oval Tool", shortcutHint: "O", description: "Draw an oval shape.", commandTypeHint: "flowchart-shape", shapeType: "oval" as ShapeType, uiPath: ["Tools Menu", "Shape Tools"] },
      { id: Tool.DIAMOND, name: "Diamond Tool", shortcutHint: "D", description: "Draw a diamond shape.", commandTypeHint: "flowchart-shape", shapeType: "diamond" as ShapeType, uiPath: ["Tools Menu", "Shape Tools"] },
      { id: Tool.TRIANGLE, name: "Triangle Tool", description: "Draw a triangle shape.", commandTypeHint: "flowchart-shape", shapeType: "triangle" as ShapeType, uiPath: ["Tools Menu", "Shape Tools"] },
      { id: Tool.PARALLELOGRAM, name: "Parallelogram Tool", description: "Draw a parallelogram shape.", commandTypeHint: "flowchart-shape", shapeType: "parallelogram" as ShapeType, uiPath: ["Tools Menu", "Shape Tools"] },
      { id: Tool.HEXAGON, name: "Hexagon Tool", description: "Draw a hexagon shape.", commandTypeHint: "flowchart-shape", shapeType: "hexagon" as ShapeType, uiPath: ["Tools Menu", "Shape Tools"] },
      { id: Tool.CYLINDER, name: "Cylinder Tool", description: "Draw a cylinder shape.", commandTypeHint: "flowchart-shape", shapeType: "cylinder" as ShapeType, uiPath: ["Tools Menu", "Shape Tools"] },
      { id: Tool.CLOUD, name: "Cloud Tool", description: "Draw a cloud shape.", commandTypeHint: "flowchart-shape", shapeType: "cloud" as ShapeType, uiPath: ["Tools Menu", "Shape Tools"] },
      { id: Tool.STAR, name: "Star Tool", description: "Draw a star shape.", commandTypeHint: "flowchart-shape", shapeType: "star" as ShapeType, uiPath: ["Tools Menu", "Shape Tools"] },
      { id: Tool.ARROW, name: "Arrow/Line Tool", shortcutHint: "A", description: "Draw a connector arrow, plain line, or dotted line.", commandTypeHint: "connector", uiPath: ["Tools Menu", "Shape Tools"] },
      { id: Tool.EMOJI_STAMP, name: "Emoji Stamp Tool", shortcutHint: "J", description: "Place emojis on the canvas.", uiPath: ["Tools Menu", "Emoji Stamp (Opens Submenu)"] },
    ],
    shapeTypesAvailable: SHAPE_TYPE_VALUES,
    options: {
      colors: { list: COLORS, customFormat: "#RRGGBB (e.g., #FF0000 for red)", uiLocationHint: "Main Toolbar (Color Selection Area - includes swatches and color picker input)" },
      transparentFillToggle: { name: "Transparent Fill Toggle", value: TRANSPARENT_FILL_VALUE, description: "Toggles transparent fill for shapes.", uiLocationHint: "Main Toolbar (Color Selection Area, next to color picker)" },
      strokeWidths: { list: STROKE_WIDTHS, uiLocationHint: "Main Toolbar (Width Selection Area)" },
      lineStyles: { list: LINE_STYLES, defaultValue: "arrow", description: "Style for connector lines: 'arrow' (solid with arrowhead), 'plain' (solid, no arrowhead), or 'dotted' (dotted line, no arrowhead).", uiLocationHint: "Main Toolbar (Line Style Toggle, appears when Arrow/Line tool is selected)" },
      font: { defaultSize: DEFAULT_CONTENT_BOX_FONT_SIZE, defaultFamily: DEFAULT_FONT_FAMILY, formatExampleForOldTextElement: "16px Arial (Note: new text uses ContentBox with fontSize)" },
      emojis: { list: EMOJI_LIST.slice(0, 20), uiPath: ["Tools Menu", "Emoji Stamp (Opens Submenu)"] }, // Provide a subset to keep prompt shorter
      aiPersonas: { list: AI_PERSONAS_LIST.map(p => ({ id: p.id, name: p.name, description: p.description })), uiPath: ["Tools Menu", "AI Persona Selector (Opens Submenu)"] },
    },
    actions: [
      { name: "Import File", shortcutHint: "I", description: "Import images or text files.", supportedFileTypes: ALL_SUPPORTED_IMPORT_EXTENSIONS, uiLocationHint: "Main Toolbar (Button, Left Group)" },
      { name: "Clear Canvas", shortcutHint: "C", description: "Remove all elements from the canvas.", uiLocationHint: "Main Toolbar (Button, Left Group)" },
      { name: "Mermaid Diagram", description: "Open modal to create diagrams with Mermaid syntax.", uiPath: ["Tools Menu", "Utility Tools"] },
      { name: "Analyze Whiteboard", description: "Get an AI analysis of the current whiteboard content.", uiLocationHint: "Main Toolbar (Button, Right Action Group)" },
      { name: "Interact with Gemini", description: "Open a dialog to chat with Gemini for drawing or analysis.", uiLocationHint: "Main Toolbar (Button, Right Action Group)" },
      { name: "Save Image", description: "Save the current canvas content as a PNG image.", uiLocationHint: "Main Toolbar (Button, Right Action Group)" },
      { name: "Save Card", description: "Save a model card (ZIP) containing canvas image, data, and analysis.", uiLocationHint: "Main Toolbar (Button, Right Action Group)" },
    ],
    sessionManagement: {
        sessionNameInput: { name: "Session Name Input", description: "Input field to edit the current session name.", uiLocationHint: "Main Toolbar (Far Right)" }
    },
    drawingCommandSchemaReminder: {
      description: "Your response for drawing or modification should be a JSON object with an optional 'analysisText' (string) and a 'drawings' (array) key. Each object in 'drawings' is a command.",
      commands: {
        path: { type: "path", points: "[{x,y},...]", color: "#RRGGBB", strokeWidth: "number" },
        text: {
          type: "text",
          x: "number (top-left of text box)",
          y: "number (top-left of text box)",
          content: "string (the text content)",
          textColor: "#RRGGBB",
          fontSize: "number (e.g., 14, optional, defaults to application setting)",
          width: "number (optional, width of the text box, defaults to application setting)",
          height: "number (optional, height of the text box, defaults to application setting)",
          backgroundColor: "#RRGGBB or 'transparent' (optional, defaults to transparent)"
        },
        flowchartShape: { type: "flowchart-shape", shapeType: "ShapeType string", x: "number", y: "number", width: "number", height: "number", text: "string (optional)", fillColor: "#RRGGBB or 'transparent'", borderColor: "#RRGGBB (optional)", strokeWidth: "number (optional)" },
        connector: { type: "connector", startX: "number", startY: "number", endX: "number", endY: "number", color: "#RRGGBB", strokeWidth: "number (optional)", lineStyle: "'arrow', 'plain', or 'dotted' (optional, defaults to 'arrow')" },
        modifyElement: { type: "modify-element", target: "{id?, shapeType?, textContains?, color?}", modifications: "{select?, newX?, newY?, deltaX?, deltaY?, newWidth?, newHeight?}" }
      }
    }
  };
  return JSON.stringify(menuOptions, null, 2);
};


const getSystemInstruction = (
  canvasWidth: number,
  canvasHeight: number,
  persona: AiPersona
): SystemInstructionDetails => {
  let personaInstruction = `You are a helpful whiteboard assistant. The user has provided an image of the current whiteboard and a request.`;
  let modelConfigOverride: Partial<GenerateContentParameters['config']> | undefined = undefined;

  if (persona === 'mindless-robot') {
    personaInstruction = `You are a Mindless Robot. Your responses must be direct, concise, and purely logical.
If asked to draw, provide only the necessary drawing commands in the JSON 'drawings' array. Do NOT include any 'analysisText'.
If asked a question that does not involve drawing, provide only the direct answer in the 'analysisText' field. Do NOT provide 'drawings'.
Do not use conversational phrases, greetings, or elaborations.
If a request is ambiguous or cannot be fulfilled logically and minimally, respond with an error message in 'analysisText'.`;
    modelConfigOverride = {
      thinkingConfig: { thinkingBudget: 0 }
    };
  } else if (persona === 'architect') {
    personaInstruction = `You are a meticulous Architect. Your responses should focus on structure, clear diagrams, and logical flow.
When asked to draw, prioritize accuracy and proper representation of systems or plans.
Provide concise explanations focused on design and functionality.`;
  } else if (persona === 'artist') {
    personaInstruction = `You are an imaginative Artist. Your responses should be visually creative and expressive.
When asked to draw, explore different styles, colors, and compositions. Feel free to interpret requests abstractly.
Emphasize aesthetics and artistic intent in any explanations.`;
  } else if (persona === 'creative-designer') {
    personaInstruction = `You are an innovative Creative Designer. Your responses should offer creative solutions and design concepts.
Focus on user experience, aesthetics, and functionality.
When asked to draw, generate novel designs and visual ideas. Explain the design thinking behind your creations.`;
  }

  const menuOptionsJSON = getMenuOptionsJSONString(canvasWidth, canvasHeight);

  const commonInstructions = `The canvas dimensions are ${canvasWidth}px width and ${canvasHeight}px height. All coordinates and dimensions you provide must be within these bounds.

User's request will be provided in the prompt.

You have access to the following tools, options, and actions available in the whiteboard application. This information is provided to help you understand the application's capabilities and to generate valid and relevant commands.
The MENU_OPTIONS_JSON below also includes 'uiPath' (an array describing a conceptual path in a menu, like ["Tools Menu", "Shape Tools"]) or 'uiLocationHint' (a string describing general placement, like "Main Toolbar Button") for many items. If asked about where a feature is, use this information to describe its location structurally.
Within the 'tools' and 'actions' arrays in the MENU_OPTIONS_JSON, some items may include a 'shortcutHint' (e.g., a letter like 'P' for Pencil). If a user's request seems to refer to a tool or action by such a hint, use it to identify the intended item and proceed with generating the relevant drawing commands or understanding the action. You do not 'press' keys or execute shortcuts directly; these hints are for interpreting user intent.

MENU_OPTIONS_JSON:
${menuOptionsJSON}

Based on the image of the current whiteboard, the user's request, and the MENU_OPTIONS_JSON provided above:
1. If the request is a question, asks for analysis, or you cannot fulfill a drawing/modification request, provide a textual response in the 'analysisText' field of the JSON.
2. If the request asks you to draw or modify something, you MUST respond with a JSON object containing a 'drawings' key. This key should be an array of drawing or modification commands, adhering to the 'drawingCommandSchemaReminder' in the MENU_OPTIONS_JSON.
   You can also include an 'analysisText' field to accompany the action or explain it (unless you are the Mindless Robot and the request is for drawing).
   Each command must be an object with a 'type' field. Ensure all parameters (like shapeType, color, coordinates) are valid based on MENU_OPTIONS_JSON.

   Supported drawing command types are detailed in 'drawingCommandSchemaReminder'.
   - For 'path': points array, color, strokeWidth.
   - For 'text': This command creates a multi-line text box. Properties are 'x', 'y' (top-left), 'content' (string), 'textColor', and optional 'fontSize', 'width', 'height', 'backgroundColor'. If width/height are not provided, defaults will be used. Text will wrap.
   - For 'flowchart-shape': shapeType (from 'shapeTypesAvailable'), x, y, width, height, text (optional), fillColor ('#RRGGBB' or '${TRANSPARENT_FILL_VALUE}'), borderColor (optional), strokeWidth (optional).
     (x, y) is top-left. Ensure x + width <= ${canvasWidth} and y + height <= ${canvasHeight}. Min width/height for shapes is generally 20px.
   - For 'connector': startX, startY, endX, endY, color, strokeWidth (optional), lineStyle ('arrow', 'plain', or 'dotted'; optional, defaults to 'arrow').

   Supported modification command type:
   - For 'modify-element': target (id?, shapeType?, textContains?, color?), modifications (select?, newX?, newY?, deltaX?, deltaY?, newWidth?, newHeight?).
     Use 'deltaX'/'deltaY' for relative moves. Use 'newX'/'newY' for absolute moves.
     Ensure new coordinates and dimensions are within canvas bounds.

3. **Interpreting Previous Responses:** The whiteboard image may contain content boxes that represent your (Gemini's) previous responses. Treat these as part of the existing canvas state and historical context. Do not re-summarize your own previous outputs unless specifically asked to. Acknowledge them as part of the conversation history if relevant to the user's current request.
4. If you cannot fulfill the request reasonably, explain why in the 'analysisText' field.
5. If the user's request is specifically for analysis or summary, provide only 'analysisText'.

Example JSON for drawing and modifying:
{
  "analysisText": "Okay, I will add a red square and then select the existing blue circle and move it.",
  "drawings": [
    { "type": "flowchart-shape", "shapeType": "rectangle", "x": 50, "y": 50, "width": 80, "height": 80, "text": "New", "fillColor":"#FF0000" },
    {
      "type": "modify-element",
      "target": { "shapeType": "oval", "color": "#0000FF" },
      "modifications": { "select": true, "deltaX": 50, "deltaY": 0 }
    }
  ]
}

Respond ONLY with a valid JSON object adhering to this structure.
Do not use markdown like \`\`\`json ... \`\`\` to wrap the JSON response.
`;
  return {
    instruction: `${personaInstruction}\n${commonInstructions}`,
    modelConfigOverride
  };
};

export const interactWithGemini = async (
  imageBase64: string,
  userPrompt: string,
  currentCanvasWidth: number,
  currentCanvasHeight: number,
  persona: AiPersona,
): Promise<GeminiResponse> => {

  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/png',
        data: imageBase64,
      },
    };
    const textPart = {
      text: `User's request: "${userPrompt}"`
    };

    const { instruction: systemInstruction, modelConfigOverride } = getSystemInstruction(currentCanvasWidth, currentCanvasHeight, persona);
    
    const enableSearchGrounding = persona !== 'mindless-robot';

    const requestConfig: GenerateContentParameters['config'] = {
        systemInstruction: systemInstruction,
        ...(modelConfigOverride || {}),
    };

    if (enableSearchGrounding) {
        requestConfig.tools = [{googleSearch: {}}];
        // DO NOT set responseMimeType: "application/json" if googleSearch is used
    } else {
        requestConfig.responseMimeType = "application/json";
    }
    
    const requestParameters: GenerateContentParameters = {
      model: GEMINI_MULTIMODAL_MODEL,
      contents: { parts: [imagePart, textPart] },
      config: requestConfig,
    };

    const genAiResponse: GenerateContentResponse = await ai.models.generateContent(requestParameters);

    let parsedData: GeminiResponse = {};
    let groundingMetadata: GroundingMetadata | undefined = undefined;

    if (enableSearchGrounding) {
        // Extract grounding metadata if search was enabled
        // The structure from API docs: genAiResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
        const firstCandidate = genAiResponse.candidates?.[0];
        if (firstCandidate && firstCandidate.groundingMetadata && Array.isArray(firstCandidate.groundingMetadata.groundingChunks)) {
            groundingMetadata = { groundingChunks: firstCandidate.groundingMetadata.groundingChunks };
        }
    }

    if (typeof genAiResponse.text === 'string' && genAiResponse.text.trim()) {
      let jsonStr = genAiResponse.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }

      try {
        const attemptedParse = JSON.parse(jsonStr);
        // Check if the parsed object looks like our expected GeminiResponse structure
        if (typeof attemptedParse === 'object' && attemptedParse !== null && 
            (attemptedParse.hasOwnProperty('analysisText') || attemptedParse.hasOwnProperty('drawings') || attemptedParse.hasOwnProperty('error'))) {
            parsedData = attemptedParse as GeminiResponse;
            if (parsedData.drawings && !Array.isArray(parsedData.drawings)) {
                console.warn("Gemini 'drawings' field is not an array:", parsedData);
                parsedData.error = (parsedData.error || "") + " Gemini returned 'drawings' but it was not in the correct format.";
                parsedData.drawings = [];
            }
        } else if (enableSearchGrounding) {
            // If search was enabled and parsing failed or didn't yield the expected structure,
            // treat the whole text as analysisText.
            parsedData.analysisText = jsonStr;
        } else {
            // If search was not enabled, and parsing failed or gave an unexpected structure, it's an error.
            parsedData.error = "Gemini API returned an invalid JSON response format. Original text: " + jsonStr;
        }
      } catch (e) {
        // If parsing fails
        if (enableSearchGrounding) {
            // It's common for search-grounded responses to be plain text.
            parsedData.analysisText = jsonStr;
        } else {
            // If search was not enabled, a parse failure is more problematic.
            console.error("Failed to parse Gemini JSON response (search not active):", e, "\nOriginal response text:", jsonStr);
            parsedData.error = `Gemini response was not valid JSON. The response was: "${jsonStr}"`;
        }
      }
    } else {
      parsedData.error = "Gemini API returned an empty or invalid text response.";
      console.error(parsedData.error, "Response object:", genAiResponse);
    }
    
    if (groundingMetadata) {
        parsedData.groundingMetadata = groundingMetadata;
    }

    // Validate drawing commands if any
    if (parsedData.drawings) {
        parsedData.drawings.forEach(cmd => {
            if (!cmd.type) {
                console.warn("Gemini drawing command is missing 'type':", cmd);
            }
            if (cmd.type === 'flowchart-shape') {
                if (!SHAPE_TYPE_VALUES.includes(cmd.shapeType as ShapeType)) {
                    console.warn("Gemini drawing command has invalid 'shapeType':", cmd.shapeType);
                }
            }
            if (cmd.type === 'modify-element') {
                if (!cmd.target || !cmd.modifications) {
                    console.warn("Gemini 'modify-element' command is missing 'target' or 'modifications':", cmd);
                }
            }
        });
    }

    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return Promise.resolve({ error: `Failed to interact with Gemini: ${error.message}` });
    }
    return Promise.resolve({ error: "Failed to interact with Gemini due to an unknown error." });
  }
};
