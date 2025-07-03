// FILENAME: src/utils/colorUtils.ts - VERSION: v1
import { DEFAULT_TEXT_COLOR_LIGHT_BG, DEFAULT_TEXT_COLOR_DARK_BG, TRANSPARENT_FILL_VALUE } from '../../constants';

export const getTextColorForBackground = (hexBgColor: string): string => {
  if (hexBgColor === TRANSPARENT_FILL_VALUE) return DEFAULT_TEXT_COLOR_LIGHT_BG;
  if (!hexBgColor || !hexBgColor.startsWith('#') || hexBgColor.length < 4) return DEFAULT_TEXT_COLOR_LIGHT_BG; // Handle invalid or short hex

  let R = 0, G = 0, B = 0;
  if (hexBgColor.length === 4) { // #RGB format
    R = parseInt(hexBgColor[1] + hexBgColor[1], 16);
    G = parseInt(hexBgColor[2] + hexBgColor[2], 16);
    B = parseInt(hexBgColor[3] + hexBgColor[3], 16);
  } else if (hexBgColor.length === 7) { // #RRGGBB format
    R = parseInt(hexBgColor.slice(1, 3), 16);
    G = parseInt(hexBgColor.slice(3, 5), 16);
    B = parseInt(hexBgColor.slice(5, 7), 16);
  } else {
    return DEFAULT_TEXT_COLOR_LIGHT_BG; // Fallback for other invalid formats
  }

  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  return luminance > 128 ? DEFAULT_TEXT_COLOR_LIGHT_BG : DEFAULT_TEXT_COLOR_DARK_BG;
};
