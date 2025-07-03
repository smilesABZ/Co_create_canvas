# Co-Creation Canvas: Concept Plan

## 1. Application Vision
A modular, AI-assisted collaborative whiteboard designed for intuitive drawing, diagramming, text handling, and intelligent content generation/analysis via Google Gemini. The focus is on a custom-built, extensible platform where features are implemented directly for learning, fine-grained control, and a unique user experience.

## 2. Core Architecture
-   **Frontend Framework:** React with TypeScript.
-   **UI Management:** React components for toolbar, modals, interactive elements.
-   **State Management:** Custom React hooks for modular functionality:
    -   `useToolManager`: Manages active tool, colors, stroke widths, fill options, emoji selection, line style (arrow/plain/dotted).
    -   `useElementManager`: Manages all whiteboard elements (paths, shapes, text, images, connectors, content boxes), selection state, image object loading, and session name.
    -   `useCanvasView`: Manages canvas panning (viewBox) and coordinate transformations (virtual to viewport and vice-versa).
    -   `useTextEditing`: Manages state for inline text input overlay (primarily for shape text, less so for new text creation which uses ContentBoxEditorModal).
    -   `useInteractionManager`: Handles all mouse/touch events on the canvas for drawing, selection, moving, resizing, panning, connector snapping logic, and AI summary button interactions.
    -   `useGemini`: Manages interaction with Google Gemini (modals, prompts, processing responses, applying drawing commands, AI persona, per-element AI summaries).
    -   `useFileOperations`: Handles image/text file import, saving canvas as image, generating and saving model cards (including full app screenshots), saving the project briefcase, and saving/loading full whiteboard sessions.
    -   `useMermaid`: Manages Mermaid diagram input, rendering to canvas, and editing existing Mermaid diagrams.
-   **Rendering:** Direct HTML5 Canvas API for drawing all visual elements, orchestrated by React state changes and redraw cycles.
-   **Utilities:** Helper functions for geometry calculations (`geometryUtils.ts`), color manipulation (`colorUtils.ts`), and canvas drawing primitives (`canvasUtils.ts`).
-   **External Libraries:**
    -   `@google/genai`: For interacting with the Google Gemini API.
    -   `JSZip`: For creating ZIP archives for the "Save Model Card" and "Save Briefcase" features.
    -   `html2canvas`: For capturing full application screenshots.
    -   `Mermaid`: For rendering Mermaid syntax diagrams to SVG.

## 3. Key Implemented Features
-   **Drawing Tools:** Pencil, Eraser, various Flowchart Shapes (Rectangle, Oval, Diamond, Triangle, Parallelogram, Hexagon, Cylinder, Cloud, Star), Arrow/Line (Connector), Emoji Stamp.
-   **Text Handling:**
    -   User-created text (via TEXT tool) creates `ContentBoxElement` (editable via `ContentBoxEditorModal`).
    -   Gemini-generated text also creates `ContentBoxElement`.
    -   Imported text files create `ContentBoxElement`.
    -   Text input within Flowchart Shapes (uses `TextInputOverlay`).
-   **Element Manipulation:** Select, Move, Resize (for shapes, images, emojis, content boxes).
-   **Connectors:**
    -   Arrow, plain, or dotted line styles selectable via toolbar toggle.
    -   Visual Connector Handles on shapes, content boxes, and images.
    -   Interactive creation from handles with snap targeting to other elements.
    -   Sticky Connectors: Connectors remain attached to elements when those elements are moved **or resized**.
    -   Drag-to-Detach: Dragging a connector line itself detaches it from elements.
-   **Import Functionality:**
    -   Images (PNG, JPG, JPEG, GIF, WEBP, SVG) - support connector handles and automatic AI summaries.
    -   Text files (TXT, MD, JS, PY, HTML, CSS, JSON) - imported into `ContentBoxElement`s, support connector handles and automatic AI summaries.
-   **Mermaid Diagram Integration:** Modal to input Mermaid syntax, rendered as an image. **Existing Mermaid diagrams on canvas can be edited.**
-   **Google Gemini AI Integration:**
    -   **Canvas Image Context:** All AI interactions (analysis, drawing prompts) use an image of the **entire logical canvas content**, not just the visible viewport.
    -   Analyze whiteboard content (generates a textual summary).
    -   Interact with Gemini (via modal) to request drawings, modifications, or get ideas.
    -   Gemini system prompt enhanced with a detailed `MENU_OPTIONS_JSON` including `uiPath`, `shortcutHint` for tools/actions, and command schemas.
    -   AI Persona selection (Helpful Assistant, Mindless Robot, Architect, Artist, Creative Designer).
    -   **Google Search Grounding:** Gemini can leverage Google Search for responses, and any web sources used are displayed in the UI.
    -   **Per-Element AI Summaries (Concise):**
        -   Automatic, concise (1-2 sentences) AI summaries generated for new elements (shapes, images, text boxes, emojis). Summaries are initially hidden.
        -   UI controls on selected elements: "Regenerate Summary", "Show/Hide Summary", loading indicator, and "Edit Mermaid" button for Mermaid images.
        -   Multimodal summary generation for images, text-based for others.
-   **Session Management:**
    -   Editable session name reflected in saved files.
    -   **Save/Load Session:** Saves the entire whiteboard state (elements, view position, session name, AI persona) to a `.ccc` file and allows loading these files.
-   **Export/Save Options:**
    -   **"Save Image":** Saves the entire logical canvas content as a PNG file.
    -   **"Save Model Card":** Generates a ZIP file containing:
        -   `model_card.html` (summary, embedded canvas image link, embedded full app screen capture link, Gemini analysis text).
        -   The canvas content image (entire logical canvas PNG).
        -   A full application screen capture image (PNG).
        -   Whiteboard elements data (JSON).
        -   Application metadata (JSON).
        -   `prompt_cards/` directory with Gemini interaction history (Markdown files from response content boxes).
    -   **"Save Briefcase":** Generates a ZIP file containing the project's contextual documents (`README.md`, `CONCEPT_PLAN.md`, `PROGRESS_LOG.md`, `AI_COLLABORATION_MODEL.md`, `briefcase_protocol.md`, and `BRIEFCASE_DIGEST.json`).
-   **User Interface:**
    -   Toolbar for selecting tools, colors, stroke widths, line styles (for connectors), and actions.
    -   Draggable Modals for various interactions (Gemini, Mermaid, Content Box Editor).
    -   Pan tool and functionality.
-   **Briefcase Management Protocol:** Standardized protocol for using briefcase documents for context persistence.

## 4. Planned / Potential Future Features (Backlog Ideas)
-   **Canvas Navigation:**
    -   Zoom functionality (zoom in/out, zoom to fit).
-   **Core Functionality:**
    -   Robust Undo/Redo system for element creation, deletion, and modifications.
    -   Grouping/Ungrouping of elements.
    -   Copy/Paste elements.
    -   Layers for organizing content.
-   **Text & Content Enhancement:**
    -   Richer text editing options for `ContentBoxElement` (e.g., bold, italics, lists, font selection within the modal).
-   **New Element Types:**
    -   Chart elements (Pie, Bar): User input for data, Gemini generation, rendering on canvas.
    -   Sticky notes.
-   **Advanced Gemini Commands:**
    -   "Connect these two shapes with a dotted line."
    -   "Arrange these items neatly."
    -   "Summarize the text in this box." (Should use the per-element summary system)
-   **Persistence & Collaboration:**
    -   (Long-term) Real-time collaboration (would require significant architectural changes, e.g., CRDTs, backend services).
-   **UI/UX Refinements:**
    -   Customizable shape properties (e.g., more colors, line styles via a properties panel).
    -   Snapping elements to a grid or to each other during move/resize.
    -   Improved accessibility (ARIA attributes, keyboard navigation).
    -   More connector styling options (e.g., different arrowheads if applicable, more dash patterns).
    -   Refined UI/UX for displaying per-element AI summaries.

## 5. Design Philosophies
-   **Modularity & Extensibility:** Core functionality is broken down into manageable, reusable custom hooks and utility functions.
-   **Direct Implementation Focus:** Preferring custom implementation for core whiteboard features.
-   **User-Centric Design:** Striving for an intuitive, responsive, and accessible user interface.
-   **Performance:** Being mindful of rendering performance.
-   **AI as an Intelligent Assistant:** Leveraging Google Gemini to genuinely enhance creativity, productivity, and analytical capabilities.
-   **Iterative Development:** Building features incrementally.
-   **Briefcase for Context:** Utilizing a `briefcase` directory with planning and logging documents to maintain persistent project context.