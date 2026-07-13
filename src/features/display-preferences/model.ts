export interface DisplayPreferences {
  wordCount: boolean;
  characterCount: boolean;
  lineCount: boolean;
  markdownPreview: boolean;
}

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  wordCount: true,
  characterCount: true,
  lineCount: true,
  markdownPreview: false,
};

export type DisplayPreferenceName = keyof DisplayPreferences;
