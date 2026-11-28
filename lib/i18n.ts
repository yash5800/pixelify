export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  short: string;
  active: boolean;
}

/**
 * Supported and upcoming site languages.
 * Languages are rolled out daily to ensure high translation fidelity
 * and remain Google Ads / SEO friendly.
 */
export const SITE_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', short: 'EN', active: true },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', short: 'ES', active: true },
  { code: 'fr', label: 'French', nativeLabel: 'Français', short: 'FR', active: true },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', short: 'PT', active: true },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', short: 'ZH', active: true },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', short: 'JA', active: true },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', short: 'KO', active: true },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', short: 'HI', active: true },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', short: 'RU', active: true },
];

export const DEFAULT_LANGUAGE = 'en';

/**
 * Languages that get a URL prefix. English is served from the unprefixed
 * routes (`/`, `/upscaler/`, `/bg_remove/`), so `/en/...` must never be
 * generated as a real route.
 */
export const PREFIXED_LANGUAGES = SITE_LANGUAGES.filter(
  (lang) => lang.code !== DEFAULT_LANGUAGE
);

export const LANGUAGE_STORAGE_KEY = 'pixelify_lang_pref';

/** Helper to get language info by code */
export function getLanguageInfo(code: string): LanguageOption {
  return (
    SITE_LANGUAGES.find((lang) => lang.code === code) ||
    SITE_LANGUAGES[0]
  );
}
