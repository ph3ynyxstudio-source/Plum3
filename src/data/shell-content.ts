export interface RecentDocumentItem {
  title: string;
  time: string;
  style?: string;
  active?: boolean;
}

export interface WritingStyleItem {
  name: string;
  symbol: string;
  active?: boolean;
}

// Ces listes resteront vides tant que leurs sources réelles ne seront pas implémentées.
export const recentDocuments: RecentDocumentItem[] = [];
export const writingStyles: WritingStyleItem[] = [];
