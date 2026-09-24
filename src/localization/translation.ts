import {
  defaultCoreUILanguage,
  getCoreUILanguageFromSettings,
  resolveTranslation,
} from "./core";
import {de} from "./de";
import {en, type TranslationKey} from "./en";
import {type TranslationValues, type UILanguage} from "./types";

export const defaultUILanguage: UILanguage = defaultCoreUILanguage;

const translations: Record<UILanguage, Record<TranslationKey, string>> = {
  en,
  de,
};

export function getUILanguageFromSettings(settings: {
  uiLanguage?: unknown;
}): UILanguage {
  return getCoreUILanguageFromSettings(settings);
}

export function translate(
  language: UILanguage,
  key: TranslationKey,
  values: TranslationValues = {},
  resources: Partial<
    Record<UILanguage, Partial<Record<TranslationKey, string>>>
  > = translations,
): string {
  return resolveTranslation(language, key, values, resources) ?? en[key];
}
