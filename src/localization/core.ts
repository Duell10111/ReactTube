export type CoreUILanguage = "en" | "de";

export const defaultCoreUILanguage: CoreUILanguage = "en";

export function normalizeCoreUILanguage(value: unknown): CoreUILanguage {
  return value === "de" || value === "en" ? value : defaultCoreUILanguage;
}

export function getCoreUILanguageFromSettings(settings: {
  uiLanguage?: unknown;
}): CoreUILanguage {
  return normalizeCoreUILanguage(settings.uiLanguage);
}

export function resolveTranslation(
  language: CoreUILanguage,
  key: string,
  values: Record<string, string | number>,
  resources: Partial<Record<CoreUILanguage, Partial<Record<string, string>>>>,
): string | undefined {
  const template = resources[language]?.[key] ?? resources.en?.[key];

  return template?.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : placeholder,
  );
}
