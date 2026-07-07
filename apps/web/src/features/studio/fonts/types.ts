export interface FontAtlasEntry {
  x: number;
  y: number;
  w: number;
  ch: number;
  s: string[];
}

export interface FontAtlas {
  fonts: Record<string, FontAtlasEntry>;
}

export interface StudioFontLoadOptions {
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
}
