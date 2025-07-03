// FILENAME: src/features/textEditing/useTextEditing.ts - VERSION: v1
import { useState, useCallback } from 'react';

export interface TextInputConfig {
  x: number;
  y: number;
  initialText?: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  width?: number;
  height?: number;
  centerText?: boolean;
  targetId?: string;
  backgroundColor?: string;
}

export interface TextEditingHook {
  isTextModeActive: boolean;
  textInputConfig: TextInputConfig | null;
  startTextEditing: (config: TextInputConfig) => void;
  cancelTextEditing: () => void;
  setIsTextModeActive: React.Dispatch<React.SetStateAction<boolean>>;
  setTextInputConfig: React.Dispatch<React.SetStateAction<TextInputConfig | null>>;
}

export const useTextEditing = (): TextEditingHook => {
  const [isTextModeActive, setIsTextModeActive] = useState<boolean>(false);
  const [textInputConfig, setTextInputConfig] = useState<TextInputConfig | null>(null);

  const startTextEditing = useCallback((config: TextInputConfig) => {
    setTextInputConfig(config);
    setIsTextModeActive(true);
  }, []);

  const cancelTextEditing = useCallback(() => {
    setIsTextModeActive(false);
    setTextInputConfig(null);
  }, []);

  return {
    isTextModeActive,
    textInputConfig,
    startTextEditing,
    cancelTextEditing,
    setIsTextModeActive, // Export setters if App.tsx needs to manipulate directly
    setTextInputConfig,
  };
};
