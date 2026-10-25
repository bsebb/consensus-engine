import { en } from './translations/en';
import { fr } from './translations/fr';
import { de } from './translations/de';
import { es } from './translations/es';
import { ro } from './translations/ro';
import { ru } from './translations/ru';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', badge: 'EN', nativeName: 'English', regionLabel: 'United States • UK • Global' },
  { code: 'fr', badge: 'FR', nativeName: 'Français', regionLabel: 'France • Belgique • Suisse' },
  { code: 'de', badge: 'DE', nativeName: 'Deutsch', regionLabel: 'Deutschland • Österreich • Schweiz' },
  { code: 'es', badge: 'ES', nativeName: 'Español', regionLabel: 'España • Latinoamérica' },
  { code: 'ro', badge: 'RO', nativeName: 'Română', regionLabel: 'România • Moldova' },
  { code: 'ru', badge: 'RU', nativeName: 'Русский', regionLabel: 'Восточная Европа • СНГ' },
];

export const TRANSLATIONS = {
  en,
  fr,
  de,
  es,
  ro,
  ru,
};
