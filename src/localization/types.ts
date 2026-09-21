export const supportedUILanguages = ["en", "de"] as const;

export type UILanguage = (typeof supportedUILanguages)[number];

export interface TranslationValues {
  [name: string]: string | number;
}
