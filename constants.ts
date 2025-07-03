
// FILENAME: constants.ts - VERSION: v13
// Updated to v5 with ContentBox constants
// Updated to v6 with DEFAULT_ONSCREEN_TEXT_BOX dimensions
// Updated to v7 with Connector Handle constants
// Updated to v8 with Connector Snap Target constants
// Updated to v9 with LineStyle constants
// Updated to v10 with dotted lineStyle
// Updated to v11 with AI Summary constants
// Updated to v12 to include .ccc in ALL_SUPPORTED_IMPORT_EXTENSIONS
// Updated to v13 to include zoom constants
import React from 'react'; 
import { AiPersonaOption, AiPersona, ContentType, LineStyle } from './types';

export const DEFAULT_COLOR = '#000000'; // Black
export const ERASER_COLOR = '#FFFFFF'; // White, like the canvas background
export const DEFAULT_STROKE_WIDTH = 5;
export const ERASER_STROKE_WIDTH = 20;
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_FONT_FAMILY = 'Arial';

export const COLORS: string[] = ['#000000', '#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#F97316', '#A855F7'];

export const STROKE_WIDTHS: number[] = [2, 5, 10, 15, 20];

export const DEFAULT_SESSION_NAME = "Untitled Co-Creation Canvas";
export const SESSION_FILE_EXTENSION = '.ccc'; // Added for Co-Creation Canvas session files

export const DEFAULT_SHAPE_WIDTH = 150;
export const DEFAULT_SHAPE_HEIGHT = 80;
export const DEFAULT_SHAPE_BORDER_COLOR = '#000000'; 
export const DEFAULT_TEXT_COLOR_LIGHT_BG = '#000000'; 
export const DEFAULT_TEXT_COLOR_DARK_BG = '#FFFFFF'; 
export const TRANSPARENT_FILL_VALUE = 'transparent';

export const FALLBACK_CANVAS_WIDTH = 1000;
export const FALLBACK_CANVAS_HEIGHT = 700;

export const DEFAULT_EMOJI_SIZE = 48; 
export const EMOJI_LIST: string[] = [
  '😀', '😂', '😍', '🤔', '🤯', '👍', '👎', '🙌', '🎉', '💡',
  '🔥', '⭐', '❤️', '💯', '✅', '❌', '❓', '❗', '✏️', '🎨',
  '🖱️', '💻', '🤖', '🌍', '🏠', '🏢', '🚗', '✈️', '☀️', '☁️',
  '🍎', '🍌', '🍕', '🎂', '☕', '🍺', '💡', '💰', '📈', '📉',
  '🕒', '📅', '📌', '📎', '📢', '🔔', '🏁', '🚩', '🎯', '✨',
  '😊', '🥳', '😢', '😠', '😱', '😴', '🤓', '😎', '👻', '👽',
  '🤝', '🙏', '💪', '🧠', '👀', '👂', '👃', '👄', '🎈', '🎁',
  '🔑', '🔒', '🔓', '🔨', '🔧', '⚙️', '🔗', '📊', '📈', '📉'
];

export const DEFAULT_AI_PERSONA: AiPersona = 'helpful-assistant';
export const AI_PERSONAS_LIST: AiPersonaOption[] = [
  { id: 'helpful-assistant', name: 'Helpful Assistant', description: 'Standard conversational and helpful AI.' },
  { id: 'mindless-robot', name: 'Mindless Robot', description: 'Direct, concise, logical, and minimal output. Uses no thinking budget.' },
  { id: 'architect', name: 'Architect', description: 'Focuses on structure, diagrams, and logical flow with technical accuracy.' },
  { id: 'artist', name: 'Artist', description: 'Emphasizes visual creativity, style, and abstract representation.' },
  { id: 'creative-designer', name: 'Creative Designer', description: 'Offers innovative ideas, user experience focus, and design concepts.' },
];

export const MIN_IMAGE_SIZE = 20; // Virtual units
export const HANDLE_SIZE = 8; // Virtual units, will scale with zoom for now
export const MIN_SHAPE_SIZE = 20; // Virtual units
export const MIN_EMOJI_SIZE = 16; // Virtual units

// Content Box Constants
export const DEFAULT_CONTENT_BOX_WIDTH = 300; // Virtual units
export const DEFAULT_CONTENT_BOX_HEIGHT = 200; // Virtual units
export const DEFAULT_CONTENT_BOX_BACKGROUND_COLOR = '#F3F4F6'; // gray-100
export const DEFAULT_CONTENT_BOX_TEXT_COLOR = '#1F2937'; // gray-800
export const DEFAULT_CONTENT_BOX_FONT_SIZE = 14; // Virtual units
export const MIN_CONTENT_BOX_SIZE = 50; // Virtual units

// Constants for text boxes created directly on canvas
export const DEFAULT_ONSCREEN_TEXT_BOX_WIDTH = 200; // Virtual units
export const DEFAULT_ONSCREEN_TEXT_BOX_HEIGHT = 100; // Virtual units


export const SUPPORTED_TEXT_IMPORT_EXTENSIONS: Record<string, ContentType> = {
  '.txt': 'plaintext',
  '.md': 'markdown',
  '.js': 'javascript',
  '.py': 'python',
  '.html': 'html',
  '.css': 'css',
  '.json': 'json',
  // Add more as needed
};
export const ALL_SUPPORTED_IMPORT_EXTENSIONS = [
    ...Object.keys(SUPPORTED_TEXT_IMPORT_EXTENSIONS),
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', // Common image extensions
    SESSION_FILE_EXTENSION // Added .ccc for session files
].join(',');


export const PanIcon: React.FC<{ className?: string }> = ({ className }) => React.createElement(
  "svg",
  {
    className: className,
    xmlns: "http://www.w3.org/2000/svg",
    height: "24px",
    viewBox: "0 0 24 24",
    width: "24px",
    fill: "currentColor"
  },
  React.createElement("path", { d: "M0 0h24v24H0V0z", fill: "none" }),
  React.createElement("path", { d: "M22.62 10.44c-.22-.63-.66-1.19-1.23-1.62l-2.98-2.23c-.42-.32-.96-.49-1.52-.49H9.82c-.43 0-.83.11-1.19.32L3.08 9.84c-.55.34-.9.9-1 1.53L1 15.59c0 1.11.9 2.01 2.01 2.01H6.5c1.05 0 1.92-.77 2-1.79l.39-4.32 4.09 3.07c.56.42 1.34.54 2 .33l3.55-1.03c.76-.22 1.31-.83 1.47-1.59l1.02-4.77zM7.1 14.06l-.33 3.65c-.03.29-.29.5-.57.5H2.01c-.5 0-.9-.36-.99-.83l1.02-4.15c.03-.15.09-.28.18-.4l5.18-3.45c.11-.07.23-.1.36-.1h4.92c.16 0 .3.06.42.15l2.98 2.23c.18.14.32.31.41.51l-1.02 4.77c-.05.22-.23.39-.46.45l-3.55 1.03c-.19.05-.39.03-.55-.05L7.1 14.06z" }),
  React.createElement("path", { d: "M10.09 12.51L6 9.79V7.51c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v1l2.89 2.17zm8.41-1.57l-1.02 4.77c-.05.22-.23.39-.46.45l-3.55 1.03c-.19.05-.39.03-.55-.05l-4.09-3.07-.39 4.32c-.08 1.02-.95 1.79-2 1.79H2.01c-1.11 0-2.01-.9-2.01-2.01L1 11.97c.1-.63.45-1.19 1-1.53l5.55-3.42c.36-.21.76-.32 1.19-.32h7.29c.56 0 1.1.17 1.52.49l2.98 2.23c.57.43 1.01.99 1.23 1.62zM7.5 7.51c-.28 0-.5.22-.5.5v1.59l3.48 2.61 1.03-.77-3.52-2.64c-.16-.12-.36-.19-.57-.19zm10.08 3.43l1.02-4.77c-.09-.2-.23-.37-.41-.51l-2.98-2.23c-.12-.09-.26-.15-.42-.15H9.82c-.21 0-.41.07-.57.19l-3.52 2.64 1.03.77 3.48-2.61v-1.59c0-.28-.22-.5-.5-.5s-.5.22-.5.5v.51L6 9.79l-5.18 3.45c-.09.06-.15.19-.18.34l-1.02 4.15c.09.47.49.83.99.83h4.18c.28 0 .54-.21.57-.5l.33-3.65 4.49 3.37c.16.12.36.18.55.18s.39-.06.55-.18l3.55-1.03c.23-.06.41-.23.46-.45l1.02-4.77c.05-.24-.02-.49-.18-.67s-.38-.29-.6-.29h-2.42z" })
);

// Connector Handle Constants
export const CONNECTOR_HANDLE_RADIUS = 4; // Virtual units
export const CONNECTOR_HANDLE_FILL_COLOR = '#4A90E2'; // A distinct blue
export const CONNECTOR_HANDLE_STROKE_COLOR = '#FFFFFF'; // White for contrast
export const CONNECTOR_HANDLE_STROKE_WIDTH = 1; // Virtual units

// Connector Snap Target Constants
export const CONNECTOR_SNAP_TARGET_RADIUS = 6; // Virtual units
export const CONNECTOR_SNAP_PROXIMITY_THRESHOLD = 20; // Virtual units for snap detection range
export const CONNECTOR_SNAP_TARGET_FILL_COLOR = 'rgba(74, 144, 226, 0.5)'; // Semi-transparent blue for highlighting snap target


// Line Style Constants
export const DEFAULT_LINE_STYLE: LineStyle = 'arrow';
export const LINE_STYLES: LineStyle[] = ['arrow', 'plain', 'dotted']; // Added 'dotted'

// AI Summary Constants
export const AI_SUMMARY_BUTTON_SIZE = 18; // Virtual units
export const AI_SUMMARY_BUTTON_PADDING = 4; // Virtual units
export const AI_SUMMARY_BUTTON_COLOR = '#6B7280'; // gray-500
export const AI_SUMMARY_BUTTON_HOVER_COLOR = '#4B5563'; // gray-600
export const AI_SUMMARY_LOADING_COLOR = '#3B82F6'; // blue-500

export const AI_SUMMARY_TEXT_MAX_WIDTH = 200; // Virtual units
export const AI_SUMMARY_TEXT_PADDING = 8; // Virtual units
export const AI_SUMMARY_TEXT_FONT_SIZE = 12; // Virtual units
export const AI_SUMMARY_TEXT_LINE_HEIGHT = 1.4;
export const AI_SUMMARY_TEXT_COLOR = '#1F2937'; // gray-800
export const AI_SUMMARY_BACKGROUND_COLOR = 'rgba(249, 250, 251, 0.9)'; // gray-50 with opacity
export const AI_SUMMARY_BORDER_COLOR = '#D1D5DB'; // gray-300
export const AI_SUMMARY_OFFSET_X = 5; // Virtual units
export const AI_SUMMARY_OFFSET_Y = 5; // Virtual units
export const AI_SUMMARY_MARGIN_FROM_BUTTONS = 2; // Virtual units

// Zoom Constants
export const DEFAULT_ZOOM_LEVEL = 1.0;
export const MIN_ZOOM_LEVEL = 0.1;
export const MAX_ZOOM_LEVEL = 5.0;
export const ZOOM_STEP_BUTTON = 0.2; // Zoom change per button click (e.g., 1.0 -> 1.2 or 1.0 -> 0.8)
export const ZOOM_STEP_WHEEL = 0.001; // Sensitivity for mouse wheel zoom
