
// FILENAME: src/features/gemini/useGemini.ts - VERSION: v11 (Reverted from v13)
// Updated to v10: Added action words dropdown functionality for interaction modal
// Updated to v11: Fallback for Mermaid image summary failures.
import { useState, useCallback } from 'react';
import { GenerateContentResponse, GenerateContentParameters, Part } from "@google/genai";
import { 
    GeminiResponse, AiPersona, GeminiDrawingCommand, 
    PathElement, ContentBoxElement, FlowchartShapeElement, ConnectorElement, ImageElement, EmojiElement, 
    GeminiFlowchartShapeCommand, GeminiConnectorCommand, GeminiModifyElementCommand, 
    TargetElementDescription, WhiteboardElement, ShapeType, GeminiTextCommand as ParsedGeminiTextCommand,
    GroundingChunk, WebChunk 
} from '../../../types';
import { interactWithGemini, GEMINI_MODEL_TEXT_ONLY, ai as geminiServiceAiInstance } from './geminiService';
import { ElementManagerHook } from '../elementManager/useElementManager';
import { ToolManagerHook } from '../toolManager/useToolManager';
import { 
    DEFAULT_AI_PERSONA, TRANSPARENT_FILL_VALUE, DEFAULT_SHAPE_BORDER_COLOR, 
    MIN_SHAPE_SIZE, MIN_IMAGE_SIZE, MIN_EMOJI_SIZE,
    DEFAULT_ONSCREEN_TEXT_BOX_WIDTH, DEFAULT_ONSCREEN_TEXT_BOX_HEIGHT, DEFAULT_CONTENT_BOX_FONT_SIZE,
    DEFAULT_CONTENT_BOX_BACKGROUND_COLOR, DEFAULT_CONTENT_BOX_TEXT_COLOR
} from '../../../constants';
import { getTextColorForBackground } from '../../utils/colorUtils';

const GEMINI_MULTIMODAL_MODEL = 'gemini-2.5-flash-preview-04-17';

// Helper to format date-time for filenames
const getFormattedDateTimeForFilename = () => {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const MIN = String(now.getMinutes()).padStart(2, '0');
  const SS = String(now.getSeconds()).padStart(2, '0');
  return `${YYYY}${MM}${DD}_${HH}${MIN}${SS}`;
};

interface UseGeminiProps {
  elementManager: ElementManagerHook;
  toolManager: ToolManagerHook;
  getCanvasImageBase64: () => string | null; 
  canvasRenderWidth: number;
  canvasRenderHeight: number;
  viewBoxX: number; 
  viewBoxY: number; 
}

export interface GeminiHook {
  isGeminiLoading: boolean;
  currentAiPersona: AiPersona;
  setCurrentAiPersona: React.Dispatch<React.SetStateAction<AiPersona>>;
  
  showAnalysisModal: boolean;
  analysisResult: GeminiResponse | null;
  openAnalysisModal: () => Promise<void>;
  closeAnalysisModal: () => void;

  showInteractionModal: boolean;
  interactionUserPrompt: string;
  setInteractionUserPrompt: React.Dispatch<React.SetStateAction<string>>;
  interactionResult: GeminiResponse | null;
  openInteractionModal: () => void;
  sendInteractionPrompt: () => Promise<void>;
  closeInteractionModal: () => void;

  generateSummaryForElement: (element: WhiteboardElement) => Promise<string | null>;
  triggerAutomaticSummaryGeneration: (element: WhiteboardElement) => Promise<void>;
  
  // For action words dropdown
  actionWords: string[];
  handleActionWordSelect: (actionWord: string) => void;
}

const ACTION_WORDS: string[] = ['Describe', 'Explain', 'Summarize', 'Synthesize', 'Analyze', 'List', 'Compare', 'Contrast', 'Define', 'Suggest', 'Generate', 'Create'];

type UpdatableAISummaryElement = Exclude<WhiteboardElement, ConnectorElement>;


export const useGemini = ({
  elementManager,
  toolManager,
  getCanvasImageBase64,
  canvasRenderWidth,
  canvasRenderHeight,
  viewBoxX, 
  viewBoxY, 
}: UseGeminiProps): GeminiHook => {
  const { elements, addElement, updateElement, selectedElementId, setSelectedElementId, setElements, getElementById } = elementManager;
  const { currentStrokeWidth } = toolManager;

  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);
  const [currentAiPersona, setCurrentAiPersona] = useState<AiPersona>(DEFAULT_AI_PERSONA);

  const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<GeminiResponse | null>(null);

  const [showInteractionModal, setShowInteractionModal] = useState<boolean>(false);
  const [interactionUserPrompt, setInteractionUserPrompt] = useState<string>('');
  const [interactionResult, setInteractionResult] = useState<GeminiResponse | null>(null);


  const createAndAddGeminiResponseContentBox = useCallback((
    result: GeminiResponse,
    promptText: string | undefined,
    currentViewBoxX: number,
    currentViewBoxY: number
  ) => {
    if (!result.analysisText && (!result.groundingMetadata || !result.groundingMetadata.groundingChunks || result.groundingMetadata.groundingChunks.length === 0)) {
      return; // No content to put in a box
    }

    let markdownContent = "";

    if (promptText) {
      markdownContent += `## User Prompt\n${promptText}\n\n`;
    }
    if (result.analysisText) {
      markdownContent += `## Gemini's Response\n${result.analysisText}\n\n`;
    }
    if (result.groundingMetadata && result.groundingMetadata.groundingChunks && result.groundingMetadata.groundingChunks.length > 0) {
      markdownContent += `## Sources\n`;
      result.groundingMetadata.groundingChunks.forEach(chunk => {
        const sourceInfo: WebChunk | undefined = chunk.web || chunk.searchResult;
        if (sourceInfo && sourceInfo.uri) {
          markdownContent += `* [${sourceInfo.title || sourceInfo.uri}](${sourceInfo.uri})\n`;
        }
      });
    }

    if (!markdownContent.trim()) return;

    const newContentBoxId = `gemini-response-cb-${Date.now()}`;
    const newContentBox: ContentBoxElement = {
      id: newContentBoxId,
      type: 'content-box',
      x: currentViewBoxX + 50,
      y: currentViewBoxY + 50,
      width: 500, 
      height: 300, 
      contentType: 'markdown',
      filename: `Gemini_Response_${getFormattedDateTimeForFilename()}.md`,
      content: markdownContent.trim(),
      backgroundColor: DEFAULT_CONTENT_BOX_BACKGROUND_COLOR,
      textColor: DEFAULT_CONTENT_BOX_TEXT_COLOR,
      fontSize: DEFAULT_CONTENT_BOX_FONT_SIZE,
    };
    addElement(newContentBox);
    setSelectedElementId(newContentBoxId);
  }, [addElement, setSelectedElementId]);


  const openAnalysisModal = useCallback(async () => {
    const imageBase64 = getCanvasImageBase64();
    if (!imageBase64) {
      setAnalysisResult({ error: "Failed to capture whiteboard image for analysis." });
      setShowAnalysisModal(true);
      return;
    }
    setIsGeminiLoading(true);
    setAnalysisResult(null);
    setShowAnalysisModal(true);
    const analysisPrompt = `Provide a concise summary of the current activities, key topics, or ideas presented on this whiteboard. Describe any significant text, diagrams, or drawings. Do not ask clarifying questions, just provide the analysis based on the image. The current canvas size is ${canvasRenderWidth}x${canvasRenderHeight} pixels.`;
    try {
      const result = await interactWithGemini(imageBase64, analysisPrompt, canvasRenderWidth, canvasRenderHeight, 'helpful-assistant'); 
      setAnalysisResult(result);
      createAndAddGeminiResponseContentBox(result, undefined, viewBoxX, viewBoxY);
    } catch (err: any) {
      setAnalysisResult({ error: err.message || "An unknown error occurred during analysis." });
    } finally {
      setIsGeminiLoading(false);
    }
  }, [getCanvasImageBase64, canvasRenderWidth, canvasRenderHeight, createAndAddGeminiResponseContentBox, viewBoxX, viewBoxY]);

  const closeAnalysisModal = useCallback(() => setShowAnalysisModal(false), []);

  const openInteractionModal = useCallback(() => {
    setShowInteractionModal(true);
    setInteractionResult(null);
  }, []);
  
  const closeInteractionModal = useCallback(() => setShowInteractionModal(false), []);

  const handleActionWordSelect = useCallback((actionWord: string) => {
    setInteractionUserPrompt(prevPrompt => {
        if (prevPrompt.trim() === "") {
            return `${actionWord} `;
        }
        return `${actionWord} ${prevPrompt}`;
    });
  }, []);

  const findTargetElement = (description: TargetElementDescription, currentElements: WhiteboardElement[]): WhiteboardElement | null => {
    if (description.id) return currentElements.find(el => el.id === description.id) || null;
    let bestMatch: WhiteboardElement | null = null;
    let highestScore = 0;
    currentElements.forEach(el => {
        let currentScore = 0;
        if (el.type === 'flowchart-shape') {
            if (description.shapeType && el.shapeType === description.shapeType) currentScore += 10;
            if (description.textContains && el.text && el.text.toLowerCase().includes(description.textContains.toLowerCase())) currentScore += (el.text.toLowerCase() === description.textContains.toLowerCase()) ? 8 : 5;
            if (description.color && el.fillColor.toLowerCase() === description.color.toLowerCase()) currentScore += 3;
        } else if (el.type === 'text') {
            if (description.textContains && el.text && el.text.toLowerCase().includes(description.textContains.toLowerCase())) currentScore += (el.text.toLowerCase() === description.textContains.toLowerCase()) ? 8 : 5;
            if (description.color && el.color.toLowerCase() === description.color.toLowerCase()) currentScore += 3;
        } else if (el.type === 'content-box') {
             if (description.textContains && el.content && el.content.toLowerCase().includes(description.textContains.toLowerCase())) currentScore += (el.content.toLowerCase() === description.textContains.toLowerCase()) ? 8 : 5;
             if (description.color && el.backgroundColor.toLowerCase() === description.color.toLowerCase()) currentScore += 3;
        }
        if (currentScore > highestScore) { highestScore = currentScore; bestMatch = el; }
    });
    return bestMatch;
  };

  const sendInteractionPrompt = useCallback(async () => {
    const imageBase64 = getCanvasImageBase64();
    if (!imageBase64) {
      setInteractionResult({ error: "Failed to capture whiteboard image for interaction." });
      return;
    }
    setIsGeminiLoading(true);
    let newSelectedElementIdFromGemini: string | null = selectedElementId;

    try {
      const result = await interactWithGemini(imageBase64, interactionUserPrompt, canvasRenderWidth, canvasRenderHeight, currentAiPersona);
      
      setInteractionResult(result); 
      createAndAddGeminiResponseContentBox(result, interactionUserPrompt, viewBoxX, viewBoxY);

      if (result.drawings && result.drawings.length > 0) {
        let currentElementsStateAfterPotentialBox = [...elementManager.elements];

        result.drawings.forEach((cmd: GeminiDrawingCommand, index) => {
          const commonId = `gemini-draw-${Date.now()}-${index}`;
          if (cmd.type === 'path') {
            const newPath: PathElement = { id: commonId, type: 'path', points: cmd.points, color: cmd.color, strokeWidth: cmd.strokeWidth };
            addElement(newPath); 
            currentElementsStateAfterPotentialBox.push(newPath);
          } else if (cmd.type === 'text') {
            const textCmd = cmd as ParsedGeminiTextCommand; 
            const newContentBox: ContentBoxElement = {
              id: commonId,
              type: 'content-box',
              x: textCmd.x,
              y: textCmd.y,
              width: textCmd.width || DEFAULT_ONSCREEN_TEXT_BOX_WIDTH,
              height: textCmd.height || DEFAULT_ONSCREEN_TEXT_BOX_HEIGHT,
              contentType: 'plaintext',
              filename: undefined,
              content: textCmd.content,
              backgroundColor: textCmd.backgroundColor || TRANSPARENT_FILL_VALUE,
              textColor: textCmd.textColor,
              fontSize: textCmd.fontSize || DEFAULT_CONTENT_BOX_FONT_SIZE,
            };
            addElement(newContentBox);
            currentElementsStateAfterPotentialBox.push(newContentBox);
          } else if (cmd.type === 'flowchart-shape') {
            const shapeCmd = cmd as GeminiFlowchartShapeCommand;
            const fillColor = shapeCmd.fillColor === 'transparent' ? TRANSPARENT_FILL_VALUE : shapeCmd.fillColor;
            const newShape: FlowchartShapeElement = {
              id: commonId, type: 'flowchart-shape', shapeType: shapeCmd.shapeType,
              x: shapeCmd.x, y: shapeCmd.y, width: shapeCmd.width, height: shapeCmd.height,
              text: shapeCmd.text || '', fillColor: fillColor,
              borderColor: shapeCmd.borderColor || (fillColor === TRANSPARENT_FILL_VALUE ? '#000000' : DEFAULT_SHAPE_BORDER_COLOR),
              strokeWidth: shapeCmd.strokeWidth || currentStrokeWidth,
              textColor: getTextColorForBackground(fillColor)
            };
            addElement(newShape);
            currentElementsStateAfterPotentialBox.push(newShape);
          } else if (cmd.type === 'connector') {
            const connectorCmd = cmd as GeminiConnectorCommand;
            const newConnector: ConnectorElement = {
              id: commonId, type: 'connector',
              startPoint: { x: connectorCmd.startX, y: connectorCmd.startY },
              endPoint: { x: connectorCmd.endX, y: connectorCmd.endY },
              color: connectorCmd.color, strokeWidth: connectorCmd.strokeWidth || currentStrokeWidth,
              lineStyle: connectorCmd.lineStyle 
            };
            addElement(newConnector);
            currentElementsStateAfterPotentialBox.push(newConnector);
          } else if (cmd.type === 'modify-element') {
            const modifyCmd = cmd as GeminiModifyElementCommand;
            const targetElement = findTargetElement(modifyCmd.target, currentElementsStateAfterPotentialBox);
            if (targetElement) {
              let modifiedElement = { ...targetElement };
              const { modifications } = modifyCmd;
              if (typeof modifications.select === 'boolean') {
                if (modifications.select) newSelectedElementIdFromGemini = targetElement.id;
                else if (newSelectedElementIdFromGemini === targetElement.id) newSelectedElementIdFromGemini = null;
              }
              const deltaX = modifications.deltaX || 0; const deltaY = modifications.deltaY || 0;

              if (modifiedElement.type === 'flowchart-shape' || modifiedElement.type === 'text' || modifiedElement.type === 'image' || modifiedElement.type === 'emoji' || modifiedElement.type === 'content-box') {
                modifiedElement.x = modifications.newX !== undefined ? modifications.newX : modifiedElement.x + deltaX;
                modifiedElement.y = modifications.newY !== undefined ? modifications.newY : modifiedElement.y + deltaY;
                if (modifiedElement.type === 'flowchart-shape' || modifiedElement.type === 'image' || modifiedElement.type === 'content-box') {
                  if (modifications.newWidth !== undefined) modifiedElement.width = Math.max(modifiedElement.type === 'flowchart-shape' ? MIN_SHAPE_SIZE : (modifiedElement.type === 'image' ? MIN_IMAGE_SIZE : 50), modifications.newWidth);
                  if (modifications.newHeight !== undefined) modifiedElement.height = Math.max(modifiedElement.type === 'flowchart-shape' ? MIN_SHAPE_SIZE : (modifiedElement.type === 'image' ? MIN_IMAGE_SIZE : 50), modifications.newHeight);
                } else if (modifiedElement.type === 'emoji' && modifications.newWidth !== undefined) { 
                     modifiedElement.size = Math.max(MIN_EMOJI_SIZE, modifications.newWidth);
                }
              } else if (modifiedElement.type === 'path') {
                modifiedElement.points = modifiedElement.points.map(p => ({ x: p.x + deltaX, y: p.y + deltaY }));
              } else if (modifiedElement.type === 'connector') {
                modifiedElement.startPoint = { x: modifiedElement.startPoint.x + deltaX, y: modifiedElement.startPoint.y + deltaY };
                modifiedElement.endPoint = { x: modifiedElement.endPoint.x + deltaX, y: modifiedElement.endPoint.y + deltaY };
              }
              updateElement(modifiedElement as WhiteboardElement);
              currentElementsStateAfterPotentialBox = currentElementsStateAfterPotentialBox.map(el => el.id === targetElement.id ? modifiedElement as WhiteboardElement : el);

            } else {
                console.warn("Gemini: Target element not found for modification:", modifyCmd.target);
                 if(interactionResult && interactionResult.analysisText) { 
                    setInteractionResult(prev => ({...prev, analysisText: (prev?.analysisText || "") + "\nNote: I couldn't find the element you wanted to modify."}));
                } else { 
                    setInteractionResult(prev => ({...prev, analysisText: "Note: I couldn't find the element you wanted to modify."}));
                }
            }
          }
        });
        
        if (newSelectedElementIdFromGemini !== selectedElementId && (!newSelectedElementIdFromGemini || !newSelectedElementIdFromGemini.startsWith('gemini-response-cb-'))) {
             setSelectedElementId(newSelectedElementIdFromGemini);
        }
      }
    } catch (err: any) {
      const errorMessage = err.error || err.message || "An unknown error occurred while interacting with Gemini.";
      console.error("[Gemini Interaction] Catch block error:", errorMessage, err);
      setInteractionResult({ error: errorMessage });
    } finally {
      setIsGeminiLoading(false);
    }
  }, [getCanvasImageBase64, interactionUserPrompt, canvasRenderWidth, canvasRenderHeight, currentAiPersona, elements, addElement, updateElement, selectedElementId, setSelectedElementId, currentStrokeWidth, elementManager, createAndAddGeminiResponseContentBox, viewBoxX, viewBoxY]);

  const generateSummaryForElement = useCallback(async (element: WhiteboardElement): Promise<string | null> => {
    if (!geminiServiceAiInstance) {
      console.error("Gemini AI service instance not available for element summary generation.");
      return "AI service not configured.";
    }
    if (element.type === 'connector') { 
        return Promise.resolve("This is a connector line.");
    }
    if (element.id.startsWith('gemini-response-cb-')) { 
        return Promise.resolve("This content box contains a response from Gemini.");
    }

    const summaryPromptDepth = " (1-2 sentences)"; // Reverted to concise summaries

    const generateTextSummary = async (promptContent: string): Promise<string | null> => {
        try {
            const systemInstruction = `You are an AI assistant specializing in creating concise summaries${summaryPromptDepth} for visual elements on a digital whiteboard. Focus on the essence of the element's appearance, content, or likely purpose. Do not use conversational filler or markdown formatting. Respond only with the summary text.`;
            const requestParameters: GenerateContentParameters = {
                model: GEMINI_MODEL_TEXT_ONLY,
                contents: { parts: [{ text: promptContent }] },
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "text/plain",
                    temperature: 0.4, topK: 32, topP: 0.9,
                },
            };
            const response: GenerateContentResponse = await geminiServiceAiInstance.models.generateContent(requestParameters);
            if (response.text && response.text.trim() !== "") {
                let summaryText = response.text.trim();
                if ((summaryText.startsWith('"') && summaryText.endsWith('"')) || (summaryText.startsWith("'") && summaryText.endsWith("'"))) {
                    summaryText = summaryText.substring(1, summaryText.length - 1);
                }
                return summaryText;
            }
            return "Summary not available (empty response).";
        } catch (error: any) {
            console.error("Error generating text-based summary for element:", element.id, error);
            return `Error: ${error.message || "Could not generate text-based summary."}`;
        }
    };

    if (element.type === 'image') {
        const imageObject = elementManager.getImageObject(element.id);
        if (imageObject && imageObject.complete && imageObject.naturalWidth > 0) {
            try {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = element.width; 
                tempCanvas.height = element.height;
                const tempCtx = tempCanvas.getContext('2d');
                if (!tempCtx) throw new Error("Failed to get temporary canvas context for image summary.");
                
                tempCtx.drawImage(imageObject, 0, 0, element.width, element.height);
                const imageDataUrl = tempCanvas.toDataURL('image/png');
                const base64ImageData = imageDataUrl.split(',')[1];

                if (!base64ImageData) throw new Error("Failed to get base64 data from temporary canvas.");

                const imagePart: Part = { inlineData: { mimeType: 'image/png', data: base64ImageData } };
                const textPartPrompt = `Describe the visual content of this image clearly and concisely${summaryPromptDepth}.`;
                
                const systemInstruction = "You are an AI assistant skilled at describing images. Provide a concise summary of the visual content. Focus on main subjects and objects. Avoid speculation. The summary should be suitable for a quick tooltip on a whiteboard.";

                const requestParameters: GenerateContentParameters = {
                    model: GEMINI_MULTIMODAL_MODEL, 
                    contents: { parts: [imagePart, {text: textPartPrompt}] },
                    config: {
                        systemInstruction: systemInstruction,
                        responseMimeType: "text/plain",
                        temperature: 0.3, topK: 32, topP: 0.9,
                    },
                };
                const response: GenerateContentResponse = await geminiServiceAiInstance.models.generateContent(requestParameters);
                if (response.text && response.text.trim() !== "") {
                    let summaryText = response.text.trim();
                     if ((summaryText.startsWith('"') && summaryText.endsWith('"')) || (summaryText.startsWith("'") && summaryText.endsWith("'"))) {
                        summaryText = summaryText.substring(1, summaryText.length - 1);
                    }
                    return summaryText;
                }
                throw new Error("Gemini returned an empty visual summary.");
            } catch (error: any) {
                console.error("Error generating visual summary for image element:", element.id, error.message);
                if (element.mermaidSyntax) { 
                    console.warn("Visual summary failed for Mermaid image. Falling back to text-based summary of syntax for:", element.id);
                    const mermaidPrompt = `This is a diagram defined by Mermaid syntax. Provide a concise summary${summaryPromptDepth} of what this diagram likely represents.
--- Mermaid Syntax ---
${element.mermaidSyntax.substring(0, 1000)} 
--- End Mermaid Syntax ---
Respond with only the summary text.`;
                    return generateTextSummary(mermaidPrompt);
                }
                return `Error: ${error.message || "Visual summary failed."}`;
            }
        } else {
            console.warn("Image object not ready or invalid for visual summary, falling back to text description for:", element.id);
        }
    }

    let elementDetails = `Element Type: ${element.type}\n`;
    switch (element.type) {
        case 'path': elementDetails += `Color: ${element.color}\nStroke Width: ${element.strokeWidth}px\nDescription: A freehand drawing or path.\n`; break;
        case 'text': elementDetails += `Content: "${element.text.substring(0, 250)}${element.text.length > 250 ? '...' : ''}"\nColor: ${element.color}\nFont: ${element.font}\nDescription: A simple text note.\n`; break;
        case 'flowchart-shape': elementDetails += `Shape Type: ${element.shapeType}\nText Content: "${element.text || 'none'}"\nFill Color: ${element.fillColor}\nBorder Color: ${element.borderColor}\nStroke Width: ${element.strokeWidth}px\nDimensions: ${element.width}x${element.height}px\nDescription: A flowchart or diagram shape.\n`; break;
        case 'image': { 
            let srcDetail = element.mermaidSyntax ? "Mermaid Diagram" : "Raster Image";
            if (element.src.startsWith('data:image/svg+xml') && !element.mermaidSyntax) srcDetail = "SVG Image";
            elementDetails += `Image Type: ${srcDetail}\nDisplayed Dimensions: ${element.width}x${element.height}px\nDescription: An imported image or diagram (visual content could not be processed for summary).\n`;
            if (element.mermaidSyntax) elementDetails += `Mermaid Syntax (first 200 chars): ${element.mermaidSyntax.substring(0,200)}...\n`;
            break;
        }
        case 'emoji': elementDetails += `Emoji Character: ${element.emojiChar}\nSize: ${element.size}px\nDescription: An emoji icon.\n`; break;
        case 'content-box': elementDetails += `Filename: ${element.filename || 'N/A'}\nContent Type: ${element.contentType}\nBackground Color: ${element.backgroundColor}\nText Color: ${element.textColor}\nFont Size: ${element.fontSize}px\nDimensions: ${element.width}x${element.height}px\nContent Snippet: "${element.content.substring(0, 300)}${element.content.length > 300 ? '...' : ''}"\nDescription: A structured content box, possibly imported or generated.\n`; break;
        default: elementDetails += "Description: An unrecognized element type.\n";
    }
    const promptContent = `Please provide a concise summary${summaryPromptDepth} for the following whiteboard element. Focus on its visual appearance, key content, or likely purpose.
--- Element Data ---
${elementDetails}
--- End Element Data ---
Respond with only the summary text itself, no conversational filler or markdown.`;
    
    return generateTextSummary(promptContent);

  }, [elementManager]);

  const triggerAutomaticSummaryGeneration = useCallback(async (element: WhiteboardElement): Promise<void> => {
    if (element.type === 'connector' || element.id.startsWith('gemini-response-cb-')) {
        return; 
    }

    const updatableElement = element as UpdatableAISummaryElement;
    updateElement({ ...updatableElement, aiSummaryLoading: true, aiSummaryVisible: false });
    
    try {
        const summaryText = await generateSummaryForElement(element);
        const finalUpdatableElement = getElementById(element.id) as UpdatableAISummaryElement | undefined;
        if (!finalUpdatableElement) {
            console.warn("Element disappeared before summary could be applied:", element.id);
            return;
        }
        updateElement({ 
            ...finalUpdatableElement, 
            aiSummary: summaryText || "Summary unavailable.", 
            aiSummaryLoading: false, 
            aiSummaryVisible: !!(summaryText && !summaryText.startsWith("Error:")), // Show if summary is valid
        });
    } catch (e: any) {
        console.error("Error in triggerAutomaticSummaryGeneration for element:", element.id, e);
        const finalUpdatableElementOnError = getElementById(element.id) as UpdatableAISummaryElement | undefined;
        if (finalUpdatableElementOnError) {
            updateElement({ 
                ...finalUpdatableElementOnError, 
                aiSummary: `Error: ${e.message || "Summary generation failed."}`, 
                aiSummaryLoading: false, 
                aiSummaryVisible: true 
            });
        }
    }
  }, [elementManager, generateSummaryForElement, updateElement, getElementById]);


  return {
    isGeminiLoading,
    currentAiPersona,
    setCurrentAiPersona,
    showAnalysisModal,
    analysisResult,
    openAnalysisModal,
    closeAnalysisModal,
    showInteractionModal,
    interactionUserPrompt,
    setInteractionUserPrompt,
    interactionResult,
    openInteractionModal,
    sendInteractionPrompt,
    closeInteractionModal,
    generateSummaryForElement,
    triggerAutomaticSummaryGeneration,
    actionWords: ACTION_WORDS,
    handleActionWordSelect,
  };
};
