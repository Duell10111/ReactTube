import {AppSettings} from "../context/AppDataContext";

interface Language {
  key: string;
  label: string;
}

export const languages: Language[] = [
  {
    key: "en",
    label: "English",
  },
  {
    key: "de",
    label: "Deutsch",
  },
];

export function parseLanguage(appSettings: AppSettings) {
  return (
    languages.find(v => v.key === appSettings.languageSelected) ?? languages[0]
  );
}
