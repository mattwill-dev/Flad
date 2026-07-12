import { createI18n } from 'vue-i18n';
import en from './en.js';

// English only for now. A second locale is just another entry in `messages` —
// no call site changes.
export default createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
});
