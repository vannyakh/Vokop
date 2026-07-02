import type { UiLanguage } from '../types/preferences.js';

export const UI_LANGUAGES: { code: UiLanguage; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'km', label: 'Khmer', native: 'ភាសាខ្មែរ' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'fr', label: 'French', native: 'Français' },
];

export const translations = {
  en: {
    tagline: 'Video Voice Translator',
    title: 'Video Voice Translator',
    subtitle: 'Transcribe, Translate, and Voiceover your videos with AI precision.',
    dropHere: 'Drop your video here',
    dropHint: 'MP4, MOV, or WebM supported',
    login: 'Login',
    upload: 'Upload Video',
    changeLanguage: 'Change language',
    changeTheme: 'Change theme',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    loginTitle: 'Sign in to Vokop',
    loginSubtitle: 'Sign in to upload and translate your videos.',
    continueGuest: 'Continue as guest',
    signInGoogle: 'Continue with Google',
  },
  km: {
    tagline: 'កម្មវិធីបកប្រែសំឡេងវីដេអូ',
    title: 'កម្មវិធីបកប្រែសំឡេងវីដេអូ',
    subtitle: 'ចុះឈ្មោះ បកប្រែ និងបន្លឺសំឡេងវីដេអូរបស់អ្នកដោយ AI។',
    dropHere: 'ទម្លាក់វីដេអូរបស់អ្នកនៅទីនេះ',
    dropHint: 'គាំទ្រ MP4, MOV, ឬ WebM',
    login: 'ចូល',
    upload: 'ផ្ទុកវីដេអូ',
    changeLanguage: 'ប្តូរភាសា',
    changeTheme: 'ប្តូររចនាបថ',
    lightMode: 'រចនាបថភ្លឺ',
    darkMode: 'រចនាបថងងឹត',
    loginTitle: 'ចូល Vokop',
    loginSubtitle: 'ចូលដើម្បីផ្ទុក និងបកប្រែវីដេអូរបស់អ្នក។',
    continueGuest: 'បន្តជាភ្ញៀវ',
    signInGoogle: 'បន្តជាមួយ Google',
  },
  es: {
    tagline: 'Traductor de Voz de Video',
    title: 'Traductor de Voz de Video',
    subtitle: 'Transcribe, traduce y dobla tus videos con precisión de IA.',
    dropHere: 'Suelta tu video aquí',
    dropHint: 'Compatible con MP4, MOV o WebM',
    login: 'Iniciar sesión',
    upload: 'Subir video',
    changeLanguage: 'Cambiar idioma',
    changeTheme: 'Cambiar tema',
    lightMode: 'Modo claro',
    darkMode: 'Modo oscuro',
    loginTitle: 'Iniciar sesión en Vokop',
    loginSubtitle: 'Inicia sesión para subir y traducir tus videos.',
    continueGuest: 'Continuar como invitado',
    signInGoogle: 'Continuar con Google',
  },
  fr: {
    tagline: 'Traducteur Vocal Vidéo',
    title: 'Traducteur Vocal Vidéo',
    subtitle: 'Transcrivez, traduisez et doublez vos vidéos avec la précision de l\'IA.',
    dropHere: 'Déposez votre vidéo ici',
    dropHint: 'MP4, MOV ou WebM pris en charge',
    login: 'Connexion',
    upload: 'Téléverser',
    changeLanguage: 'Changer la langue',
    changeTheme: 'Changer le thème',
    lightMode: 'Mode clair',
    darkMode: 'Mode sombre',
    loginTitle: 'Connexion à Vokop',
    loginSubtitle: 'Connectez-vous pour téléverser et traduire vos vidéos.',
    continueGuest: 'Continuer en invité',
    signInGoogle: 'Continuer avec Google',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function translate(uiLanguage: UiLanguage, key: TranslationKey): string {
  return translations[uiLanguage][key] ?? translations.en[key];
}
