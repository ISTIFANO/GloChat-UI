import { Lang } from '../api/contracts';

type Entry = Record<Lang, string>;

/** UI copy in French (default), Moroccan-friendly Arabic, and English. */
export const DICTIONARY: Record<string, Entry> = {
  'brand.tagline': { fr: 'Commande en discutant', ar: 'اطلب بالدردشة', en: 'Order by chatting' },
  'header.deliverTo': { fr: 'Livrer à', ar: 'التوصيل إلى', en: 'Deliver to' },
  'hero.title': { fr: 'Tu as envie de quoi ?', ar: 'شنو بغيتي تاكل؟', en: 'What are you craving?' },
  'hero.subtitle': {
    fr: 'Dis-le simplement, je trouve les meilleures options autour de toi.',
    ar: 'قولها ببساطة، وأنا نلقى ليك أحسن الاختيارات قريب منك.',
    en: 'Just say it — I’ll find the best options around you.',
  },
  'composer.placeholder': { fr: 'Ex. un burger sous 70 MAD…', ar: 'مثلا: برغر أقل من 70 درهم…', en: 'e.g. a burger under 70 MAD…' },
  'composer.send': { fr: 'Chercher', ar: 'ابحث', en: 'Search' },
  'chip.burger': { fr: 'Burger', ar: 'برغر', en: 'Burger' },
  'chip.sushi2': { fr: 'Sushi pour 2', ar: 'سوشي لجوج', en: 'Sushi for 2' },
  'chip.healthy': { fr: 'Healthy < 70 MAD', ar: 'صحي أقل من 70', en: 'Healthy < 70 MAD' },
  'chip.sweet': { fr: 'Un truc sucré', ar: 'شي حاجة حلوة', en: 'Something sweet' },
  'chip.tajine': { fr: 'Tajine', ar: 'طاجين', en: 'Tajine' },
  'chip.coffee': { fr: 'Café', ar: 'قهوة', en: 'Coffee' },
  'results.found': { fr: '{n} options près de toi', ar: '{n} اختيارات قريبة منك', en: '{n} options near you' },
  'results.for': { fr: 'pour « {q} »', ar: 'لـ « {q} »', en: 'for “{q}”' },
  'results.empty.title': { fr: 'Rien d’ouvert pour ça', ar: 'ما كاين حتى حاجة محلولة', en: 'Nothing open for that' },
  'results.empty.text': {
    fr: 'Essaie un autre plat, ou un budget plus large.',
    ar: 'جرب طبق آخر أو ميزانية أكبر.',
    en: 'Try another dish or a bigger budget.',
  },
  'error.network': {
    fr: 'Impossible de joindre le serveur. Vérifie que la gateway tourne (port 8080).',
    ar: 'تعذر الاتصال بالخادم.',
    en: 'Cannot reach the server. Check that the gateway is running (port 8080).',
  },
  'error.generic': { fr: 'Oups, une erreur est survenue ({code}).', ar: 'وقع خطأ ({code}).', en: 'Oops, something went wrong ({code}).' },
  'card.delivery': { fr: 'Livraison {fee}', ar: 'التوصيل {fee}', en: 'Delivery {fee}' },
  'card.choose': { fr: 'Choisir', ar: 'اختار', en: 'Choose' },
  'card.add': { fr: 'Ajouter', ar: 'زيد', en: 'Add' },
  'card.closed': { fr: 'Fermé', ar: 'مغلق', en: 'Closed' },
  'sheet.required': { fr: 'Obligatoire', ar: 'إجباري', en: 'Required' },
  'sheet.optional': { fr: 'Optionnel', ar: 'اختياري', en: 'Optional' },
  'sheet.upTo': { fr: 'Jusqu’à {n}', ar: 'حتى {n}', en: 'Up to {n}' },
  'sheet.quantity': { fr: 'Quantité', ar: 'الكمية', en: 'Quantity' },
  'sheet.addToCart': { fr: 'Ajouter · {price}', ar: 'زيد · {price}', en: 'Add · {price}' },
  'sheet.missing': { fr: 'Choisis : {groups}', ar: 'اختار: {groups}', en: 'Choose: {groups}' },
  'sheet.cartSoon': {
    fr: 'Le panier arrive à la prochaine étape (incrément 2).',
    ar: 'السلة جاية فالمرحلة الجاية.',
    en: 'The cart arrives in the next step (increment 2).',
  },
  'sheet.close': { fr: 'Fermer', ar: 'سد', en: 'Close' },
  'lang.label': { fr: 'Langue', ar: 'اللغة', en: 'Language' },
};
