import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Bilingual layer (English / Hindi). Kannada and other languages can be
 * added later by extending the `Language` union and adding a dictionary.
 * The in-progress state (temple, date, form values) lives in route state
 * and is unaffected by switching languages.
 */

export type Language = "en" | "hi";

const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    "brand.name": "Aadi Sparsh",
    "brand.tagline": "Reconnect with your family temple",
    "nav.home": "Home",
    "nav.temples": "Temples",
    "nav.about": "About",
    "nav.contact": "Contact",
    "nav.signIn": "Sign in",
    "nav.signOut": "Sign out",
    "nav.myAccount": "My account",
    "lang.switch": "हिन्दी",
    "lang.label": "Language",

    "hero.kicker": "Aadi Sparsh",
    "hero.title": "Return to your family temple, at least once a year",
    "hero.subtitle":
      "Many of us have moved to newer neighbourhoods, far from the temple our families have prayed at for generations. Aadi Sparsh makes it simple to plan a visit on a meaningful day — a birthday, an anniversary, a pooja — and stay connected with your traditional temple.",
    "hero.cta": "Plan Your Temple Visit",
    "hero.ctaSecondary": "How it works",
    "hero.note": "Starting in Bengaluru — Chickpete.",

    "how.title": "How it works",
    "how.step1.title": "Choose your temple",
    "how.step1.body": "Find your traditional temple among the participating temples.",
    "how.step2.title": "Pick a meaningful date",
    "how.step2.body":
      "Choose a day that matters to your family — the calendar shows real availability.",
    "how.step3.title": "Reserve and visit",
    "how.step3.body":
      "Register your family's visit, receive a confirmation, and stay in touch with your temple.",

    "occasions.title": "Occasions for a visit",
    "occasions.subtitle":
      "Any day your family chooses can become a day of seva and blessing.",
    "occasion.birthday": "Birthday",
    "occasion.wedding_anniversary": "Wedding anniversary",
    "occasion.family_pooja_seva": "Family pooja or seva",
    "occasion.jain_religious_occasion": "Jain religious occasion",
    "occasion.kalyanak_festival": "Kalyanak or festival",
    "occasion.special_family_day": "A special family day",
    "occasion.other": "Other",

    "temples.title": "Participating temples",
    "temples.subtitle": "Each temple manages its own timings, capacity and policies.",
    "temples.view": "View temple",
    "temples.capacity": "{n} families per day",
    "temples.timings": "Timings",
    "temples.location": "Location",
    "temples.contact": "Contact",
    "temples.directions": "Get directions",
    "temples.book": "Plan your visit",
    "temples.signInToBook": "Sign in to plan your visit",
    "temples.bookDisabled": "Registrations are currently paused for this temple.",
    "temples.detailsPending":
      "Official details are being confirmed by the temple administrators.",
    "temples.sundayNote": "Sundays are not available for visits.",

    "auth.signInTitle": "Welcome back",
    "auth.signUpTitle": "Create your family account",
    "auth.signInSubtitle": "Sign in to manage your temple visits.",
    "auth.signUpSubtitle":
      "One account for your family — reuse it for every visit and occasion.",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.fullName": "Full name",
    "auth.phone": "Mobile number",
    "auth.phoneHint":
      "Your mobile number is used to match your family records. Verification by SMS OTP will arrive when enabled.",
    "auth.signIn": "Sign in",
    "auth.signUp": "Create account",
    "auth.haveAccount": "Already have an account?",
    "auth.needAccount": "New to Aadi Sparsh?",
    "auth.checkEmailTitle": "Check your email",
    "auth.checkEmailBody":
      "We've sent a confirmation link to {email}. Click it to activate your account, then sign in.",
    "auth.passwordMismatch": "Passwords do not match",
    "auth.passwordShort": "Password must be at least 8 characters",
    "auth.signInFailed": "Sign in failed. Check your email and password.",
    "auth.signUpFailed": "Could not create the account. Please try again.",

    "account.title": "My account",
    "account.profile": "Profile",
    "account.registrations": "My registrations",
    "account.preferences": "Preferences",
    "account.overview": "Overview",
    "account.upcoming": "Upcoming visits",
    "account.past": "Past visits",
    "account.cancelled": "Cancelled or rescheduled",
    "account.noRegistrations": "No temple visits yet.",
    "account.noRegistrationsBody": "When you plan a visit, your registrations appear here.",
    "account.memberSince": "Member since",
    "account.save": "Save changes",
    "account.saving": "Saving…",
    "account.saved": "Changes saved",
    "account.saveFailed": "Could not save changes. Please try again.",
    "account.locality": "Locality",
    "account.city": "City",
    "account.state": "State",
    "account.country": "Country",
    "account.language": "Preferred language",
    "account.phoneVerified": "Verified",
    "account.phoneUnverified": "Not verified yet",
    "account.consentMessages": "Allow the temple to send me booking updates and reminders",
    "account.consentMedia": "Allow the temple to share photographs from my visits with me",
    "account.viewDetails": "Details",
    "account.totalPeople": "{n} people expected",
    "account.cancelled": "Cancelled",
    "account.rescheduled": "Rescheduled",

    "status.upcoming": "Upcoming",
    "status.completed": "Completed",
    "status.cancelled": "Cancelled",
    "status.rescheduled": "Rescheduled",
    "status.no_show": "No-show",

    "common.loading": "Loading…",
    "common.error": "Something went wrong",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.optional": "optional",
  },

  hi: {
    "brand.name": "आदि स्पर्श",
    "brand.tagline": "अपने पारिवारिक मंदिर से जुड़ें",
    "nav.home": "मुख्य पृष्ठ",
    "nav.temples": "मंदिर",
    "nav.about": "परिचय",
    "nav.contact": "संपर्क",
    "nav.signIn": "साइन इन",
    "nav.signOut": "साइन आउट",
    "nav.myAccount": "मेरा खाता",
    "lang.switch": "English",
    "lang.label": "भाषा",

    "hero.kicker": "आदि स्पर्श",
    "hero.title": "अपने पारिवारिक मंदिर से फिर जुड़ें — वर्ष में कम से कम एक बार",
    "hero.subtitle":
      "हम में से अनेक परिवार नए मोहल्लों में बस गए हैं, उन मंदिरों से दूर जहाँ पीढ़ियों से पूजा होती आई है। आदि स्पर्श के साथ किसी शुभ अवसर — जन्मदिन, वैवाहिक एनिवर्सरी या पूजा — पर दर्शन की योजना बनाइए और अपने पारंपरिक मंदिर से जुड़े रहिए।",
    "hero.cta": "मंदिर दर्शन की योजना बनाएँ",
    "hero.ctaSecondary": "यह कैसे काम करता है",
    "hero.note": "शुरुआत बेंगलुरु — चिकपेट से।",

    "how.title": "यह कैसे काम करता है",
    "how.step1.title": "अपना मंदिर चुनें",
    "how.step1.body": "सहभागी मंदिरों में अपना पारंपरिक मंदिर खोजें।",
    "how.step2.title": "शुभ तिथि चुनें",
    "how.step2.body": "अपने परिवार के लिए सार्थक दिन चुनें — कैलेंडर पर वास्तविक उपलब्धता दिखती है।",
    "how.step3.title": "आरक्षण करें और पधारें",
    "how.step3.body": "परिवार की यात्रा दर्ज करें, पुष्टि पाएँ, और मंदिर से जुड़े रहें।",

    "occasions.title": "दर्शन के अवसर",
    "occasions.subtitle": "परिवार जो दिन चुने, वही सेवा और आशीर्वाद का दिन बन सकता है।",
    "occasion.birthday": "जन्मदिन",
    "occasion.wedding_anniversary": "वैवाहिक एनिवर्सरी",
    "occasion.family_pooja_seva": "पारिवारिक पूजा या सेवा",
    "occasion.jain_religious_occasion": "जैन धार्मिक अवसर",
    "occasion.kalyanak_festival": "कल्याणक या पर्व",
    "occasion.special_family_day": "विशेष पारिवारिक दिन",
    "occasion.other": "अन्य",

    "temples.title": "सहभागी मंदिर",
    "temples.subtitle": "प्रत्येक मंदिर अपने समय, क्षमता और नियम स्वयं प्रबंधित करता है।",
    "temples.view": "मंदिर देखें",
    "temples.capacity": "प्रतिदिन {n} परिवार",
    "temples.timings": "समय",
    "temples.location": "स्थान",
    "temples.contact": "संपर्क",
    "temples.directions": "रास्ता देखें",
    "temples.book": "दर्शन की योजना बनाएँ",
    "temples.signInToBook": "योजना बनाने के लिए साइन इन करें",
    "temples.bookDisabled": "इस मंदिर के लिए पंजीकरण अभी रोका गया है।",
    "temples.detailsPending": "आधिकारिक विवरण मंदिर प्रशासकों द्वारा पुष्ट किए जा रहे हैं।",
    "temples.sundayNote": "रविवार को दर्शन उपलब्ध नहीं हैं।",

    "auth.signInTitle": "पुनः स्वागत है",
    "auth.signUpTitle": "अपना पारिवारिक खाता बनाएँ",
    "auth.signInSubtitle": "अपनी मंदिर यात्राओं को प्रबंधित करने के लिए साइन इन करें।",
    "auth.signUpSubtitle": "एक खाता पूरे परिवार के लिए — हर अवसर और यात्रा के लिए।",
    "auth.email": "ईमेल",
    "auth.password": "पासवर्ड",
    "auth.fullName": "पूरा नाम",
    "auth.phone": "मोबाइल नंबर",
    "auth.phoneHint": "आपका मोबाइल नंबर पारिवारिक रिकॉर्ड मिलाने के काम आता है। एसएमएस ओटीपी सत्यापन चालू होने पर उपलब्ध होगा।",
    "auth.signIn": "साइन इन",
    "auth.signUp": "खाता बनाएँ",
    "auth.haveAccount": "पहले से खाता है?",
    "auth.needAccount": "आदि स्पर्श पर नए हैं?",
    "auth.checkEmailTitle": "अपना ईमेल देखें",
    "auth.checkEmailBody": "हमने {email} पर पुष्टि का लिंक भेजा है। लिंक खोलकर खाता सक्रिय करें, फिर साइन इन करें।",
    "auth.passwordMismatch": "पासवर्ड मेल नहीं खाते",
    "auth.passwordShort": "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए",
    "auth.signInFailed": "साइन इन विफल। ईमेल और पासवर्ड जाँचें।",
    "auth.signUpFailed": "खाता नहीं बन सका। कृपया पुनः प्रयास करें।",

    "account.title": "मेरा खाता",
    "account.profile": "प्रोफ़ाइल",
    "account.registrations": "मेरे आरक्षण",
    "account.preferences": "प्राथमिकताएँ",
    "account.overview": "सारांश",
    "account.upcoming": "आगामी दर्शन",
    "account.past": "पूर्व दर्शन",
    "account.cancelled": "रद्द या पुनर्निर्धारित",
    "account.noRegistrations": "अभी कोई मंदिर यात्रा नहीं।",
    "account.noRegistrationsBody": "दर्शन की योजना बनाने पर आपके आरक्षण यहाँ दिखेंगे।",
    "account.memberSince": "सदस्य बने",
    "account.save": "बदलाव सहेजें",
    "account.saving": "सहेजा जा रहा है…",
    "account.saved": "बदलाव सहेजे गए",
    "account.saveFailed": "बदलाव सहेजे नहीं जा सके। कृपया पुनः प्रयास करें।",
    "account.locality": "मोहल्ला",
    "account.city": "शहर",
    "account.state": "राज्य",
    "account.country": "देश",
    "account.language": "पसंदीदा भाषा",
    "account.phoneVerified": "सत्यापित",
    "account.phoneUnverified": "अभी सत्यापित नहीं",
    "account.consentMessages": "मंदिर मुझे आरक्षण संबंधी सूचनाएँ और अनुस्मारक भेज सके",
    "account.consentMedia": "मंदिर मेरी यात्राओं के चित्र मुझे भेज सके",
    "account.viewDetails": "विवरण",
    "account.totalPeople": "{n} व्यक्ति प्रत्याशित",
    "account.cancelled": "रद्द",
    "account.rescheduled": "पुनर्निर्धारित",

    "status.upcoming": "आगामी",
    "status.completed": "पूर्ण",
    "status.cancelled": "रद्द",
    "status.rescheduled": "पुनर्निर्धारित",
    "status.no_show": "अनुपस्थित",

    "common.loading": "लोड हो रहा है…",
    "common.error": "कुछ गड़बड़ हो गई",
    "common.cancel": "रद्द करें",
    "common.close": "बंद करें",
    "common.optional": "वैकल्पिक",
  },
};

export function translate(lang: Language, key: string, vars?: Record<string, string | number>): string {
  let s: string = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

interface I18nValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => undefined,
  t: (key) => key,
});

const LANG_STORAGE_KEY = "aadi-sparsh-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  // Initialize to the default language on both server and client so SSR
  // hydration matches; the stored preference is applied after mount.
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  };

  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

/** All registration status values, in a stable display order. */
export const REGISTRATION_STATUSES = [
  "upcoming",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
