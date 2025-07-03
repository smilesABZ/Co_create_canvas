
// FILENAME: src/features/fileOperations/useFileOperations.ts - VERSION: v20 (Zoom in Session)
// Updated to v17 to include Gemini response content boxes as 'prompt_cards' in the Model Card ZIP.
// Updated to v18 to add saveSession functionality and isSessionSaving state.
// Updated to v19 to fix .ccc session file loading and update file extension checks.
// Updated to v20 to include zoomLevel in session saving/loading.

import { useState, useRef, useCallback } from 'react';
import { WhiteboardElement, ImageElement, GeminiResponse, ContentBoxElement, ContentType, Tool, AiPersona, ZoomState } from '../../../types';
import { ElementManagerHook } from '../elementManager/useElementManager';
import { CanvasViewHook } from '../canvasView/useCanvasView';
import { interactWithGemini } from '../gemini/geminiService'; 
import { GeminiHook } from '../gemini/useGemini'; 
import { DEFAULT_SESSION_NAME, SUPPORTED_TEXT_IMPORT_EXTENSIONS, ALL_SUPPORTED_IMPORT_EXTENSIONS, DEFAULT_CONTENT_BOX_WIDTH, DEFAULT_CONTENT_BOX_HEIGHT, DEFAULT_CONTENT_BOX_BACKGROUND_COLOR, DEFAULT_CONTENT_BOX_TEXT_COLOR, DEFAULT_CONTENT_BOX_FONT_SIZE, SESSION_FILE_EXTENSION, DEFAULT_ZOOM_LEVEL } from '../../../constants';

declare var JSZip: any; 

interface UseFileOperationsProps {
  elementManager: ElementManagerHook;
  canvasView: CanvasViewHook;
  geminiHook: GeminiHook; 
  getCanvasImageBase64: () => string | null;
  getFullAppScreenshotBase64?: () => Promise<string | null>;
  canvasRenderWidth: number;
  canvasRenderHeight: number;
  setCurrentTool: (tool: Tool) => void;
  setSelectedElementId: (id: string | null) => void;
}

export interface FileOperationsHook {
  saveCanvasAsImage: () => void;
  saveModelCard: () => Promise<void>;
  saveBriefcaseAsZip: () => Promise<void>;
  triggerImageImport: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  acceptedFileTypes: string;
  isModelCardGenerating: boolean;
  isBriefcaseSaving: boolean;
  saveSession: () => Promise<void>; 
  isSessionSaving: boolean; 
}
const generateSafeFilename = (name: string, extension: string): string => {
  const date = new Date();
  const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
  const safeName = name.replace(/[^a-zA-Z0-9_-\s]/g, '').replace(/\s+/g, '_');
  return `${safeName}_${timestamp}.${extension.startsWith('.') ? extension.substring(1) : extension}`;
};


export const useFileOperations = ({
  elementManager,
  canvasView,
  geminiHook, 
  getCanvasImageBase64,
  getFullAppScreenshotBase64,
  canvasRenderWidth,
  canvasRenderHeight,
  setCurrentTool,
  setSelectedElementId,
}: UseFileOperationsProps): FileOperationsHook => {
  const { elements, addElement, sessionName, setElements, onSessionNameChange, clearCanvasElements } = elementManager; 
  const { viewBoxX, viewBoxY, zoomLevel, setViewBox, setZoomLevel } = canvasView; 
  const [isModelCardGenerating, setIsModelCardGenerating] = useState(false);
  const [isBriefcaseSaving, setIsBriefcaseSaving] = useState(false);
  const [isSessionSaving, setIsSessionSaving] = useState(false); 


  const fileInputRef = useRef<HTMLInputElement>(null);
  const acceptedFileTypes = ALL_SUPPORTED_IMPORT_EXTENSIONS;


  const saveCanvasAsImage = useCallback(() => {
    const imageBase64 = getCanvasImageBase64();
    if (imageBase64) {
      const link = document.createElement('a');
      link.download = generateSafeFilename(sessionName || DEFAULT_SESSION_NAME, 'png');
      link.href = `data:image/png;base64,${imageBase64}`;
      link.click();
    } else {
      alert("Could not save canvas image. Canvas might be empty or an error occurred.");
    }
  }, [getCanvasImageBase64, sessionName]);

  const saveModelCard = useCallback(async () => {
    setIsModelCardGenerating(true);
    try {
      const imageBase64 = getCanvasImageBase64();
      const fullAppScreenshotBase64 = getFullAppScreenshotBase64 ? await getFullAppScreenshotBase64() : null;

      if (!imageBase64) {
        alert("Could not generate model card. Canvas image is unavailable.");
        return;
      }

      let analysisText = "AI analysis not performed for this model card.";
      try {
        const analysisPrompt = `Generate a concise model card summary for a digital whiteboard session. Based on the provided image, describe the key visual elements, potential topics, and overall nature of the content. The canvas size is ${canvasRenderWidth}x${canvasRenderHeight} pixels.`;
        const geminiResult = await interactWithGemini(imageBase64, analysisPrompt, canvasRenderWidth, canvasRenderHeight, 'helpful-assistant');
        if (geminiResult.analysisText) {
          analysisText = geminiResult.analysisText;
        } else if (geminiResult.error) {
          analysisText = `Error during AI analysis: ${geminiResult.error}`;
        }
      } catch (error: any) {
        analysisText = `Error performing AI analysis: ${error.message}`;
      }

      const modelCardHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Model Card: ${sessionName || DEFAULT_SESSION_NAME}</title>
          <style>
            body { font-family: sans-serif; margin: 20px; line-height: 1.6; background-color: #f4f4f4; color: #333; }
            .container { background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            h1, h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;}
            img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; margin-bottom:15px;}
            .section { margin-bottom: 20px; }
            .section h2 { margin-top: 0; }
            pre { background-color: #eee; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
            ul { padding-left: 20px; }
            li { margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Model Card: ${sessionName || DEFAULT_SESSION_NAME}</h1>
            <div class="section">
              <h2>Whiteboard Content Analysis</h2>
              <pre>${analysisText}</pre>
            </div>
            <div class="section">
              <h2>Canvas Image</h2>
              <img src="canvas_image.png" alt="Whiteboard Canvas Image">
            </div>
            ${fullAppScreenshotBase64 ? `
            <div class="section">
              <h2>Full Application Screenshot</h2>
              <img src="full_app_screenshot.png" alt="Full Application Screenshot">
            </div>` : ''}
            <div class="section">
              <h2>Whiteboard Elements Data</h2>
              <p>Raw data of whiteboard elements is included in <code>whiteboard_elements.json</code>.</p>
            </div>
            <div class="section">
              <h2>Prompt Cards</h2>
              <p>A history of Gemini interactions (prompts and responses) from this session is included in the <code>prompt_cards/</code> directory as individual Markdown files.</p>
            </div>
            <div class="section">
              <h2>Application Metadata</h2>
              <p>Application metadata is included in <code>application_metadata.json</code>.</p>
              <p>ViewBox State at Save: X=${viewBoxX.toFixed(2)}, Y=${viewBoxY.toFixed(2)}, Zoom=${zoomLevel.toFixed(2)}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const zip = new JSZip();
      zip.file("model_card.html", modelCardHTML);
      zip.file("canvas_image.png", imageBase64, { base64: true });
      if (fullAppScreenshotBase64) {
        zip.file("full_app_screenshot.png", fullAppScreenshotBase64, { base64: true });
      }
      zip.file("whiteboard_elements.json", JSON.stringify(elements, null, 2));
      
      const appMetadata = {
        name: "Co-Creation Canvas Session",
        version: "1.0", 
        sessionName: sessionName || DEFAULT_SESSION_NAME,
        savedAt: new Date().toISOString(),
        canvasRenderWidth,
        canvasRenderHeight,
        viewBoxX,
        viewBoxY,
        zoomLevel,
        elementCount: elements.length
      };
      zip.file("application_metadata.json", JSON.stringify(appMetadata, null, 2));

      const promptCardsFolder = zip.folder("prompt_cards");
      if (promptCardsFolder) {
          elements.forEach(element => {
              if (element.type === 'content-box' && element.filename?.startsWith('Gemini_Response_')) {
                  promptCardsFolder.file(element.filename, element.content);
              }
          });
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.download = generateSafeFilename(`${sessionName || DEFAULT_SESSION_NAME}_ModelCard`, 'zip');
      link.href = URL.createObjectURL(zipBlob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Error generating ZIP for model card:", err);
      alert("Failed to generate Model Card ZIP file.");
    } finally {
      setIsModelCardGenerating(false);
    }
  }, [getCanvasImageBase64, getFullAppScreenshotBase64, elements, canvasRenderWidth, canvasRenderHeight, sessionName, viewBoxX, viewBoxY, zoomLevel]);


  const saveBriefcaseAsZip = useCallback(async () => {
    setIsBriefcaseSaving(true);
    try {
      const zip = new JSZip();
      const briefcaseFolder = zip.folder("briefcase");

      if (!briefcaseFolder) {
          alert("Failed to create briefcase folder in ZIP.");
          return;
      }
      
      const briefcaseFiles: Record<string, string> = {
          "README.md": `# Project Briefcase

This directory serves as a "briefcase" to maintain persistent context, track progress, and outline the core concept and features for the Co-Creation Canvas application. It's designed to aid continuity in development, especially across sessions or if conversational context is limited.

## Understanding and Using This Briefcase

For detailed information on the contents of this briefcase, how to use them, and the protocol for maintaining context (especially with an AI assistant), please refer to:

**[./briefcase_protocol.md](./briefcase_protocol.md)**

This protocol document is the primary guide for managing and utilizing the project briefcase effectively.

## Core Context Documents

While \`briefcase_protocol.md\` provides the full details, the key documents you'll typically interact with for project context are:

*   **\`CONCEPT_PLAN.md\`**: Outlines the application's long-term strategic vision and current feature set.
*   **\`PROGRESS_LOG.md\`**: A dynamic journal of development progress, current focus, and next steps.
*   **\`AI_COLLABORATION_MODEL.md\`**: Defines the interaction model with the AI.
*   **\`BRIEFCASE_DIGEST.json\`**: An aggregated JSON of all key briefcase documents for AI ingestion.

These documents are intended to be updated as the project evolves.`,
        "CONCEPT_PLAN.md": `# Co-Creation Canvas: Concept Plan

## 1. Application Vision
A modular, AI-assisted collaborative whiteboard designed for intuitive drawing, diagramming, text handling, and intelligent content generation/analysis via Google Gemini. The focus is on a custom-built, extensible platform where features are implemented directly for learning, fine-grained control, and a unique user experience.

## 2. Core Architecture
-   **Frontend Framework:** React with TypeScript.
-   **UI Management:** React components for toolbar, modals, interactive elements.
-   **State Management:** Custom React hooks for modular functionality:
    -   \`useToolManager\`: Manages active tool, colors, stroke widths, fill options, emoji selection, line style (arrow/plain/dotted).
    -   \`useElementManager\`: Manages all whiteboard elements (paths, shapes, text, images, connectors, content boxes), selection state, image object loading, and session name.
    -   \`useCanvasView\`: Manages canvas panning (viewBox) and coordinate transformations (virtual to viewport and vice-versa), and zoom.
    -   \`useTextEditing\`: Manages state for inline text input overlay (primarily for shape text, less so for new text creation which uses ContentBoxEditorModal).
    -   \`useInteractionManager\`: Handles all mouse/touch events on the canvas for drawing, selection, moving, resizing, panning, connector snapping logic, and AI summary button interactions, aware of zoom.
    -   \`useGemini\`: Manages interaction with Google Gemini (modals, prompts, processing responses, applying drawing commands, AI persona, per-element AI summaries).
    -   \`useFileOperations\`: Handles image/text file import, saving canvas as image, generating and saving model cards (including full app screenshots), saving the project briefcase, and saving/loading full whiteboard sessions (including zoom state).
    -   \`useMermaid\`: Manages Mermaid diagram input, rendering to canvas, and editing existing Mermaid diagrams.
-   **Rendering:** Direct HTML5 Canvas API for drawing all visual elements, orchestrated by React state changes and redraw cycles, with zoom scaling.
-   **Utilities:** Helper functions for geometry calculations (\`geometryUtils.ts\`), color manipulation (\`colorUtils.ts\`), and canvas drawing primitives (\`canvasUtils.ts\` - now zoom-aware).
-   **External Libraries:**
    -   \`@google/genai\`: For interacting with the Google Gemini API.
    -   \`JSZip\`: For creating ZIP archives for the \"Save Model Card\" and \"Save Briefcase\" features.
    -   \`html2canvas\`: For capturing full application screenshots.
    -   \`Mermaid\`: For rendering Mermaid syntax diagrams to SVG.

## 3. Key Implemented Features
-   **Drawing Tools:** Pencil, Eraser, various Flowchart Shapes, Arrow/Line (Connector), Emoji Stamp.
-   **Text Handling:** User-created text (via TEXT tool) creates \`ContentBoxElement\`, Gemini-generated text also creates \`ContentBoxElement\`, Imported text files create \`ContentBoxElement\`. Text input within Flowchart Shapes.
-   **Element Manipulation:** Select, Move, Resize (for shapes, images, emojis, content boxes).
-   **Connectors:** Arrow, plain, or dotted line styles. Connectors can snap to flowchart shapes, content boxes, and images. Connectors stay attached when elements are moved or resized.
-   **Color & Style Customization:** Color picker, predefined color swatches, stroke width selection, transparent fill option for shapes, line style toggle.
-   **AI Integration (Gemini):**
    -   **Whiteboard Analysis:** Gemini analyzes the canvas image and provides a summary.
    -   **Interactive Drawing/Modification:** Users can prompt Gemini to draw elements or modify existing ones. Gemini responses (including text and grounding metadata) are displayed and added as content boxes to the canvas.
    -   **AI Personas:** Different AI personas (Helpful Assistant, Mindless Robot, Architect, Artist, Creative Designer) influence Gemini's responses and drawing style. 'Mindless Robot' uses zero thinking budget.
    -   **Per-Element AI Summaries:** Automatic and on-demand AI-generated summaries for individual whiteboard elements (paths, shapes, text, images, emojis, content boxes). Summary visibility can be toggled.
    -   **Action Words for Prompting:** Quick action words (e.g., 'Describe', 'Create') to prepend to Gemini interaction prompts.
-   **Mermaid Diagrams:** Input Mermaid syntax via a modal and render it as an SVG image onto the canvas. Existing Mermaid diagrams can be edited. AI summaries are generated for Mermaid diagrams.
-   **Zoom & Pan:** Canvas can be zoomed (mouse wheel, buttons) and panned (pan tool, mouse wheel + modifier if implemented). Interactions and drawing are zoom-aware.
-   **Import:** Import images (PNG, JPG, SVG, etc.) and text files (.txt, .md, .js, .py, .html, .css, .json) onto the canvas. Text files become content boxes.
-   **Export/Save:**
    -   Save canvas as PNG image.
    -   Save "Model Card" (ZIP): Includes canvas image, full app screenshot, AI analysis, elements data, Gemini prompt/response history as markdown files, and application metadata.
    -   Save "Briefcase" (ZIP): Contains project context documents (like this one) for AI development continuity.
    -   Save/Load Session: Save the entire whiteboard state (elements, session name, zoom level, viewbox position) to a \`.ccc\` file. Load \`.ccc\` files to restore sessions.
-   **UI:**
    -   Toolbar with tool selection (dropdown with submenus for shapes, emoji, AI persona), color/stroke controls, action buttons.
    -   Draggable modals for Gemini interaction, Mermaid input, and Content Box editing.
    -   Visual feedback for selected elements, resize handles, connector attachment points, snap targets.
    -   Loading indicators for AI operations and file saving.
-   **Content Boxes:** Resizable boxes for displaying formatted text content (plaintext, markdown, code). Can be created by text tool, file import, or Gemini responses. Content can be edited in a modal.
-   **Offline Functionality:** Core drawing and element manipulation should work offline. AI features require connectivity.
-   **Responsiveness:** Basic responsiveness for canvas area. Toolbar wraps on smaller screens.
-   **Accessibility:** ARIA attributes used for toolbar buttons, inputs, and modals.
-   **Undo/Redo:** (Conceptual - Not yet fully implemented)
-   **Session Name:** Editable session name reflected in saved files.

## 4. Current Development Focus
- Ensuring stability and correctness of existing features, especially around zoom, element interactions, and AI summary generation/display.
- Refining the AI interaction model and prompt engineering.
- Bug fixing and performance optimization.

## 5. Future/Planned Features (High-Level)
-   Undo/Redo functionality.
-   Multi-user collaboration (potential).
-   More advanced shape/diagramming tools (e.g., swimlanes, tables).
-   Customizable element properties panel.
-   Keyboard shortcuts for more actions.
-   Enhanced AI capabilities (e.g., context-aware suggestions, content transformation).
-   Theming.
-   More robust error handling and user feedback.
-   Touch gesture enhancements for panning and zooming.
`
      };

      for (const filename in briefcaseFiles) {
          if (Object.prototype.hasOwnProperty.call(briefcaseFiles, filename)) {
              briefcaseFolder.file(filename, briefcaseFiles[filename]);
          }
      }

      const appMetadata = {
        name: "Co-Creation Canvas Session Briefcase",
        version: "1.0",
        savedAt: new Date().toISOString(),
        sessionName: sessionName || DEFAULT_SESSION_NAME,
      };
      briefcaseFolder.file("briefcase_metadata.json", JSON.stringify(appMetadata, null, 2));

      try { // Inner try for zip generation
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.download = generateSafeFilename(sessionName || DEFAULT_SESSION_NAME, 'zip');
        link.href = URL.createObjectURL(zipBlob);
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (err) {
        console.error("Error generating ZIP for briefcase:", err);
        alert("Failed to generate Briefcase ZIP file.");
      }
    } catch (outerError) {
      console.error("Error creating briefcase zip structure:", outerError);
      alert("Failed to create briefcase structure.");
    } finally {
      setIsBriefcaseSaving(false);
    }
  }, [sessionName]);


  const saveSession = useCallback(async () => {
    setIsSessionSaving(true);
    try {
      const sessionData = {
        sessionName: sessionName || DEFAULT_SESSION_NAME,
        elements: elements,
        viewBoxX: viewBoxX,
        viewBoxY: viewBoxY,
        zoomLevel: zoomLevel,
        createdAt: new Date().toISOString(),
        appVersion: "1.0" // Example version
      };
      const sessionJson = JSON.stringify(sessionData, null, 2);
      const blob = new Blob([sessionJson], { type: 'application/json' });
      const link = document.createElement('a');
      link.download = generateSafeFilename(sessionName || DEFAULT_SESSION_NAME, SESSION_FILE_EXTENSION);
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error saving session:", error);
      alert("Failed to save session.");
    } finally {
      setIsSessionSaving(false);
    }
  }, [sessionName, elements, viewBoxX, viewBoxY, zoomLevel]);


  const triggerImageImport = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Allow re-selecting the same file
      fileInputRef.current.click();
    }
  }, []);

  const handleFileSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;

    if (fileExtension === SESSION_FILE_EXTENSION) {
      reader.onload = (e) => {
        try {
          const sessionData = JSON.parse(e.target?.result as string);
          if (sessionData && Array.isArray(sessionData.elements) && typeof sessionData.sessionName === 'string') {
            clearCanvasElements(); // Clear existing canvas before loading
            setElements(sessionData.elements); // ElementManager's setElements
            onSessionNameChange(sessionData.sessionName); // ElementManager's onSessionNameChange
            
            const loadedZoomLevel = typeof sessionData.zoomLevel === 'number' ? sessionData.zoomLevel : DEFAULT_ZOOM_LEVEL;
            const loadedViewBoxX = typeof sessionData.viewBoxX === 'number' ? sessionData.viewBoxX : 0;
            const loadedViewBoxY = typeof sessionData.viewBoxY === 'number' ? sessionData.viewBoxY : 0;
            
            setViewBox(loadedViewBoxX, loadedViewBoxY); // CanvasView's setViewBox
            // Directly set zoom level without anchor point for session load
            const newZoom = Math.max(0.1, Math.min(loadedZoomLevel, 5.0)); // MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL
            setZoomLevel(newZoom); // CanvasView's setZoomLevel

            setSelectedElementId(null);
            setCurrentTool(Tool.SELECT);
            alert(`Session "${sessionData.sessionName}" loaded successfully.`);
          } else {
            throw new Error("Invalid session file format.");
          }
        } catch (error) {
          console.error("Error loading session:", error);
          alert(`Failed to load session file. Error: ${(error as Error).message}`);
        }
      };
      reader.readAsText(file);
      return; 
    }
    
    if (SUPPORTED_TEXT_IMPORT_EXTENSIONS[fileExtension]) {
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        const newContentBox: ContentBoxElement = {
          id: `imported-text-${Date.now()}`,
          type: 'content-box',
          x: viewBoxX + 50, 
          y: viewBoxY + 50, 
          width: DEFAULT_CONTENT_BOX_WIDTH,
          height: DEFAULT_CONTENT_BOX_HEIGHT,
          contentType: SUPPORTED_TEXT_IMPORT_EXTENSIONS[fileExtension],
          filename: file.name,
          content: textContent,
          backgroundColor: DEFAULT_CONTENT_BOX_BACKGROUND_COLOR,
          textColor: DEFAULT_CONTENT_BOX_TEXT_COLOR,
          fontSize: DEFAULT_CONTENT_BOX_FONT_SIZE,
        };
        addElement(newContentBox);
        setSelectedElementId(newContentBox.id);
        setCurrentTool(Tool.SELECT);
         if (geminiHook.triggerAutomaticSummaryGeneration) { // Call from geminiHook
            geminiHook.triggerAutomaticSummaryGeneration(newContentBox);
        }
      };
      reader.readAsText(file);
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(fileExtension)) {
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          let width = Math.min(img.naturalWidth, canvasRenderWidth * 0.5);
          let height = width / aspectRatio;
          if (height > canvasRenderHeight * 0.5) {
            height = canvasRenderHeight * 0.5;
            width = height * aspectRatio;
          }
          const newImageElement: ImageElement = {
            id: `imported-image-${Date.now()}`, type: 'image', src: dataUrl,
            x: viewBoxX + (canvasRenderWidth - width) / 2,
            y: viewBoxY + (canvasRenderHeight - height) / 2,
            width, height,
            naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
          };
          addElement(newImageElement);
          setSelectedElementId(newImageElement.id);
          setCurrentTool(Tool.SELECT);
          if (geminiHook.triggerAutomaticSummaryGeneration) { // Call from geminiHook
            geminiHook.triggerAutomaticSummaryGeneration(newImageElement);
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } else {
      alert(`Unsupported file type: ${file.name}. Please select an image or text file listed in constants.`);
    }
  }, [addElement, canvasRenderWidth, canvasRenderHeight, setCurrentTool, setSelectedElementId, viewBoxX, viewBoxY, geminiHook, clearCanvasElements, setElements, onSessionNameChange, setViewBox, setZoomLevel]);

  return {
    saveCanvasAsImage,
    saveModelCard,
    saveBriefcaseAsZip,
    triggerImageImport,
    fileInputRef,
    handleFileSelected,
    acceptedFileTypes,
    isModelCardGenerating,
    isBriefcaseSaving,
    saveSession,
    isSessionSaving,
  };
};
