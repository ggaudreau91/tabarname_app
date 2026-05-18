import { fr, type TranslationKey } from "./fr";

const dictionary = fr;

export function t(key: TranslationKey): string {
  return dictionary[key];
}
