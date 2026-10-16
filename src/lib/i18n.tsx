"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Dict = { [k: string]: string | Dict };

const en: Dict = {
  nav: {
    verify: "Verify Content", history: "My Scans", admin: "Admin", login: "Log in",
    signup: "Sign up", logout: "Log out", landing: "Home",
  },
  common: {
    loading: "Loading…", analyzing: "Analysing…", error: "Something went wrong", cancel: "Cancel",
    submit: "Submit", close: "Close", newScan: "New scan", downloadPdf: "Download PDF report",
    reportContent: "Report this content", chooseFile: "Choose file", analyzingLong: "Running forensic analysis…",
  },
  landing: {
    badge: "AI Deepfake Detection • Made for India",
    heroTitle1: "Truth, verified.",
    heroTitle2: "Deepfakes, exposed.",
    heroSub: "SatyaCheck is an AI-powered digital trust platform for Indian citizens. Scan images, videos, voices and viral messages for signs of synthetic manipulation — in seconds.",
    ctaStart: "Start verifying free",
    ctaLogin: "I already have an account",
    heroCardTitle: "Live forensic scan",
    statScans: "Content scans completed",
    statUsers: "Citizens protected",
    statFlagged: "Manipulations caught",
    statTrust: "Avg. trust score",
    missionKicker: "Our mission",
    missionTitle: "Every citizen deserves to know what is real.",
    missionBody: "Generated media is eroding public trust — morphed faces in videos, cloned voices in scam calls, and viral misinformation. SatyaCheck puts forensic-grade AI analysis in every citizen's pocket, free and multilingual.",
    howKicker: "How it works",
    howTitle: "Four signals. One trust score.",
    step1t: "Upload or record", step1d: "Drop an image or video, record a voice note, or paste a suspicious forward or link.",
    step2t: "AI forensic analysis", step2d: "Spectral lattice analysis, noise forensics, voice-clone DSP and misinformation heuristics run together.",
    step3t: "Trust score & flags", step3d: "Get a 0–100 trust score with explainable detection flags — never a black box.",
    step4t: "Report & protect", step4d: "Download a certified PDF report and flag harmful content for review.",
    featKicker: "Capabilities",
    featTitle: "Forensic AI across every medium",
    f1t: "Image deepfake detection", f1d: "FFT lattice artifacts, sensor-noise uniformity, ELA and metadata provenance converge to expose generated faces.",
    f2t: "Video temporal analysis", f2d: "Multi-frame sampling detects the flicker and face-signal drift that deepfakes cannot hide.",
    f3t: "Voice clone detection", f3d: "Spectral flatness, prosody stability and breath-band analysis unmask cloned and TTS voices.",
    f4t: "Misinformation shield", f4d: "Stylometric patterns and URL reputation scoring flag fake news and phishing forwards.",
    f5t: "Certified PDF reports", f5d: "Every scan produces a watermarked, downloadable evidence report.",
    f6t: "Community reporting", f6d: "Flag deepfakes and scams — every report reaches the trust & safety dashboard.",
    finalCta: "Your first scan takes 30 seconds.",
    finalCtaBtn: "Create free account",
    footer: "Built for digital India • Report cybercrime at cybercrime.gov.in",
  },
  auth: {
    welcome: "Welcome to SatyaCheck", loginTitle: "Log in to your account", signupTitle: "Create your account",
    name: "Full name", email: "Email address", password: "Password", passwordHint: "Minimum 8 characters",
    loginBtn: "Log in", signupBtn: "Create account",
    haveAccount: "Already registered? Log in", needAccount: "New here? Create an account",
    subtitle: "Verify before you amplify.",
  },
  tabs: { image: "Image", video: "Video", audio: "Audio", text: "Text / Link" },
  dash: {
    title: "Verify Content", subtitle: "Choose a medium and let the forensic engine work.",
    imageHint: "Upload a photo or take one with your camera. Faces, screenshots, viral images — all supported.",
    videoHint: "Upload a video clip — SatyaCheck samples frames across the timeline and analyses each one.",
    audioHint: "Upload a voice clip or record from your microphone. Best results with 3–25 seconds of speech.",
    textHint: "Paste a suspicious message, forward, news claim or link.",
    dropImage: "Drop an image here, or click to upload",
    dropVideo: "Drop a video here, or click to upload",
    capture: "Use camera",
    formatsImage: "JPEG, PNG, WebP, AVIF, GIF • up to 10 MB",
    formatsVideo: "MP4, WebM, MOV • short clips analyse fastest",
    uploadAudio: "Upload audio file", recordMic: "Record microphone", stop: "Stop & analyse",
    formatsAudio: "MP3, WAV, OGG, M4A, WebM • up to 25 s analysed",
    textPlaceholder: "e.g. “URGENT: Government giving free ₹5000 to everyone! Share before deleted!! http://bit.ly/…”",
    analyseText: "Analyse text", sampling: "Sampling frames", rec: "REC",
  },
  result: {
    trustScore: "Trust score", verdict: "Verdict", confidence: "Confidence", flags: "Detection flags",
    signals: "Forensic signals", time: "Analysis time", scanSaved: "Result saved to your history",
    authentic: "Likely authentic", uncertain: "Uncertain — review manually", manipulated: "Likely manipulated",
    high: "high", medium: "medium", low: "low", info: "info",
  },
  report: {
    title: "Report this content", subtitle: "Flag harmful or synthetic content for the trust & safety team.",
    reason: "Reason", notes: "Notes (optional)", notesPh: "Where did you receive this? Any context helps.",
    submit: "File report", filed: "Report filed — thank you for protecting others.",
    deepfake_person: "Deepfake of a real person", voice_clone: "Cloned / fake voice",
    misinformation: "Fake news / misinformation", impersonation: "Impersonation of a person or authority",
    financial_scam: "Financial fraud / scam", communal_hate: "Communal or hate content",
    election_manipulation: "Election manipulation", other: "Other",
  },
  history: {
    title: "My scan history", subtitle: "Every verified scan, re-downloadable anytime.",
    all: "All", empty: "No scans yet — run your first verification.",
    date: "Date", type: "Type", target: "Target", score: "Score", verdict: "Verdict", actions: "Actions",
    pdf: "PDF", report: "Report",
  },
  admin: {
    title: "Admin dashboard", subtitle: "Platform trust & safety overview",
    totalScans: "Total scans", users: "Registered users", openReports: "Open reports", avgTrust: "Avg trust score",
    volume: "Scan volume — last 14 days", typeDist: "Scans by type", verdictDist: "Verdict distribution",
    recent: "Recent scans", reports: "User reports", resolve: "Resolve", reopen: "Reopen",
    open: "open", resolved: "resolved", emptyReports: "No reports filed yet.",
    user: "User", target: "Target", score: "Score", verdict: "Verdict", when: "When", reason: "Reason", status: "Status",
  },
  toast: {
    loginOk: "Welcome back!", signupOk: "Account created — welcome to SatyaCheck", logoutOk: "Logged out",
    scanDone: "Analysis complete", pdfOk: "Report downloaded", error: "Something went wrong — try again",
    lang: "Language switched",
  },
};

const hi: Dict = {
  nav: {
    verify: "सत्यापन करें", history: "मेरे स्कैन", admin: "एडमिन", login: "लॉग इन",
    signup: "साइन अप", logout: "लॉग आउट", landing: "होम",
  },
  common: {
    loading: "लोड हो रहा है…", analyzing: "विश्लेषण जारी…", error: "कुछ गड़बड़ हुई", cancel: "रद्द करें",
    submit: "जमा करें", close: "बंद करें", newScan: "नया स्कैन", downloadPdf: "PDF रिपोर्ट डाउनलोड करें",
    reportContent: "इस कंटेंट की शिकायत करें", chooseFile: "फ़ाइल चुनें", analyzingLong: "फोरेंसिक विश्लेषण चल रहा है…",
  },
  landing: {
    badge: "AI डीपफेक डिटेक्शन • भारत के लिए निर्मित",
    heroTitle1: "सच, सत्यापित।",
    heroTitle2: "डीपफेक, बेनक़ाब।",
    heroSub: "सत्यचेक भारतीय नागरिकों के लिए AI-संचालित डिजिटल ट्रस्ट प्लेटफ़ॉर्म है। छवि, वीडियो, आवाज़ और वायरल संदेशों में सिंथेटिक हेराफेरी की जांच — कुछ ही सेकंड में।",
    ctaStart: "मुफ़्त सत्यापन शुरू करें",
    ctaLogin: "मेरा खाता पहले से है",
    heroCardTitle: "लाइव फोरेंसिक स्कैन",
    statScans: "पूर्ण किए गए स्कैन",
    statUsers: "सुरक्षित नागरिक",
    statFlagged: "पकड़ी गई हेराफेरी",
    statTrust: "औसत ट्रस्ट स्कोर",
    missionKicker: "हमारा मिशन",
    missionTitle: "हर नागरिक को यह जानने का हक है कि क्या सच है।",
    missionBody: "जेनरेटेड मीडिया जन-विश्वास को कमजोर कर रहा है — वीडियो में मोर्फ़ किए चेहरे, स्कैम कॉल में क्लोन की गई आवाज़ें और वायरल गलत सूचना। सत्यचेक हर नागरिक की जेब में फोरेंसिक-ग्रेड AI विश्लेषण देता है — मुफ़्त और बहुभाषी।",
    howKicker: "यह कैसे काम करता है",
    howTitle: "चार संकेत। एक ट्रस्ट स्कोर।",
    step1t: "अपलोड या रिकॉर्ड करें", step1d: "छवि या वीडियो डालें, वॉयस नोट रिकॉर्ड करें, या संदिग्ध फॉरवर्ड/लिंक पेस्ट करें।",
    step2t: "AI फोरेंसिक विश्लेषण", step2d: "स्पेक्ट्रल लैटिस विश्लेषण, नॉइज़ फोरेंसिक्स, वॉयस-क्लोन DSP और मिसइन्फॉर्मेशन ह्यूरिस्टिक्स एक साथ चलते हैं।",
    step3t: "ट्रस्ट स्कोर व संकेत", step3d: "0–100 ट्रस्ट स्कोर पाएं — स्पष्टीकरण योग्य डिटेक्शन फ़्लैग के साथ, कोई ब्लैक-बॉक्स नहीं।",
    step4t: "रिपोर्ट करें, सुरक्षित रखें", step4d: "प्रमाणित PDF रिपोर्ट डाउनलोड करें और हानिकारक कंटेंट को फ़्लैग करें।",
    featKicker: "क्षमताएं",
    featTitle: "हर माध्यम में फोरेंसिक AI",
    f1t: "इमेज डीपफेक डिटेक्शन", f1d: "FFT लैटिस आर्टिफैक्ट, सेंसर-नॉइज़ एकरूपता, ELA और मेटाडेटा मिलकर जेनरेटेड चेहरों को पकड़ते हैं।",
    f2t: "वीडियो टेम्पोरल विश्लेषण", f2d: "मल्टी-फ्रेम सैंपलिंग उस झिलमिलाहट और फेस-सिग्नल ड्रिफ्ट को पकड़ती है जिसे डीपफेक छिपा नहीं पाते।",
    f3t: "वॉयस क्लोन डिटेक्शन", f3d: "स्पेक्ट्रल फ्लैटनेस, प्रोसोडी स्थिरता और ब्रेथ-बैंड विश्लेषण क्लोन/TTS आवाज़ों को बेनक़ाब करते हैं।",
    f4t: "मिसइन्फॉर्मेशन शील्ड", f4d: "स्टाइलोमेट्रिक पैटर्न और URL रेप्युटेशन स्कोरिंग फेक न्यूज़ और फ़िशिंग फॉरवर्ड को फ़्लैग करते हैं।",
    f5t: "प्रमाणित PDF रिपोर्ट", f5d: "हर स्कैन वॉटरमार्क युक्त, डाउनलोड योग्य साक्ष्य रिपोर्ट देता है।",
    f6t: "सामुदायिक रिपोर्टिंग", f6d: "डीपफेक और स्कैम फ़्लैग करें — हर शिकायत ट्रस्ट ऐंड सेफ्टी डैशबोर्ड तक पहुंचती है।",
    finalCta: "आपका पहला स्कैन सिर्फ 30 सेकंड का है।",
    finalCtaBtn: "मुफ़्त खाता बनाएं",
    footer: "डिजिटल भारत के लिए निर्मित • साइबर अपराध की रिपोर्ट cybercrime.gov.in पर करें",
  },
  auth: {
    welcome: "सत्यचेक में आपका स्वागत है", loginTitle: "अपने खाते में लॉग इन करें", signupTitle: "अपना खाता बनाएं",
    name: "पूरा नाम", email: "ईमेल पता", password: "पासवर्ड", passwordHint: "कम से कम 8 अक्षर",
    loginBtn: "लॉग इन करें", signupBtn: "खाता बनाएं",
    haveAccount: "पहले से पंजीकृत? लॉग इन करें", needAccount: "नए हैं? खाता बनाएं",
    subtitle: "आगे बढ़ाने से पहले सत्यापित करें।",
  },
  tabs: { image: "छवि", video: "वीडियो", audio: "ऑडियो", text: "टेक्स्ट / लिंक" },
  dash: {
    title: "कंटेंट सत्यापित करें", subtitle: "माध्यम चुनें और फोरेंसिक इंजन को काम करने दें।",
    imageHint: "फोटो अपलोड करें या कैमरे से खींचें। चेहरे, स्क्रीनशॉट, वायरल इमेज — सब समर्थित।",
    videoHint: "वीडियो क्लिप अपलोड करें — सत्यचेक टाइमलाइन से फ्रेम सैंपल करके प्रत्येक का विश्लेषण करता है।",
    audioHint: "वॉयस क्लिप अपलोड करें या माइक्रोफ़ोन से रिकॉर्ड करें। 3–25 सेकंड की स्पीच सबसे अच्छी।",
    textHint: "कोई संदिग्ध संदेश, फॉरवर्ड, समाचार दावा या लिंक पेस्ट करें।",
    dropImage: "छवि यहाँ डालें, या अपलोड के लिए क्लिक करें",
    dropVideo: "वीडियो यहाँ डालें, या अपलोड के लिए क्लिक करें",
    capture: "कैमरा खोलें",
    formatsImage: "JPEG, PNG, WebP, AVIF, GIF • 10 MB तक",
    formatsVideo: "MP4, WebM, MOV • छोटी क्लिप तेज़ी से विश्लेषित होती हैं",
    uploadAudio: "ऑडियो फ़ाइल अपलोड करें", recordMic: "माइक्रोफ़ोन रिकॉर्ड करें", stop: "रोकें और विश्लेषण करें",
    formatsAudio: "MP3, WAV, OGG, M4A, WebM • 25 सेकंड तक विश्लेषण",
    textPlaceholder: "जैसे: “URGENT: सरकार सबको मुफ़्त ₹5000 दे रही है! डिलीट होने से पहले शेयर करें!! http://bit.ly/…”",
    analyseText: "टेक्स्ट विश्लेषण करें", sampling: "फ्रेम सैंपल हो रहे हैं", rec: "रिकॉर्ड",
  },
  result: {
    trustScore: "ट्रस्ट स्कोर", verdict: "निष्कर्ष", confidence: "विश्वास स्तर", flags: "डिटेक्शन संकेत",
    signals: "फोरेंसिक संकेत", time: "विश्लेषण समय", scanSaved: "परिणाम आपके इतिहास में सहेजा गया",
    authentic: "संभवतः प्रामाणिक", uncertain: "अनिश्चित — स्वयं जांचें", manipulated: "संभवतः हेराफेरी/फ़र्ज़ी",
    high: "उच्च", medium: "मध्यम", low: "कम", info: "जानकारी",
  },
  report: {
    title: "इस कंटेंट की शिकायत करें", subtitle: "हानिकारक या सिंथेटिक कंटेंट को ट्रस्ट ऐंड सेफ्टी टीम को भेजें।",
    reason: "कारण", notes: "टिप्पणी (वैकल्पिक)", notesPh: "यह आपको कहाँ से मिला? प्रसंग मदद करता है।",
    submit: "शिकायत दर्ज करें", filed: "शिकायत दर्ज हुई — दूसरों की सुरक्षा के लिए धन्यवाद।",
    deepfake_person: "किसी वास्तविक व्यक्ति का डीपफेक", voice_clone: "क्लोन / नकली आवाज़",
    misinformation: "फेक न्यूज़ / गलत सूचना", impersonation: "व्यक्ति या अधिकारी का प्रतिरूपण",
    financial_scam: "वित्तीय धोखाधड़ी / स्कैम", communal_hate: "सांप्रदायिक या घृणित कंटेंट",
    election_manipulation: "चुनावी हेराफेरी", other: "अन्य",
  },
  history: {
    title: "मेरा स्कैन इतिहास", subtitle: "हर सत्यापित स्कैन, कभी भी पुनः डाउनलोड करें।",
    all: "सभी", empty: "अभी कोई स्कैन नहीं — अपना पहला सत्यापन करें।",
    date: "तिथि", type: "प्रकार", target: "लक्ष्य", score: "स्कोर", verdict: "निष्कर्ष", actions: "क्रियाएं",
    pdf: "PDF", report: "शिकायत",
  },
  admin: {
    title: "एडमिन डैशबोर्ड", subtitle: "प्लेटफ़ॉर्म ट्रस्ट ऐंड सेफ्टी अवलोकन",
    totalScans: "कुल स्कैन", users: "पंजीकृत उपयोगकर्ता", openReports: "खुली शिकायतें", avgTrust: "औसत ट्रस्ट स्कोर",
    volume: "स्कैन मात्रा — पिछले 14 दिन", typeDist: "प्रकार अनुसार स्कैन", verdictDist: "निष्कर्ष वितरण",
    recent: "हालिया स्कैन", reports: "उपयोगकर्ता शिकायतें", resolve: "हल करें", reopen: "पुनः खोलें",
    open: "खुला", resolved: "हल हुआ", emptyReports: "अभी कोई शिकायत नहीं।",
    user: "उपयोगकर्ता", target: "लक्ष्य", score: "स्कोर", verdict: "निष्कर्ष", when: "समय", reason: "कारण", status: "स्थिति",
  },
  toast: {
    loginOk: "फिर से स्वागत है!", signupOk: "खाता बना — सत्यचेक में स्वागत है", logoutOk: "लॉग आउट हुआ",
    scanDone: "विश्लेषण पूर्ण", pdfOk: "रिपोर्ट डाउनलोड हुई", error: "कुछ गड़बड़ हुई — पुनः प्रयास करें",
    lang: "भाषा बदली गई",
  },
};

const dictionaries: Record<"en" | "hi", Dict> = { en, hi };
export type Lang = "en" | "hi";

type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const Ctx = createContext<LangCtx>({ lang: "en", setLang: () => {}, t: (k) => k });

function lookup(dict: Dict, path: string): string | undefined {
  let cur: string | Dict | undefined = dict;
  for (const part of path.split(".")) {
    if (cur && typeof cur === "object") cur = cur[part];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("satya_lang") as Lang | null) : null;
    if (saved === "hi" || saved === "en") setLangState(saved);
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("satya_lang", l); } catch { /* ignore */ }
    document.documentElement.lang = l === "hi" ? "hi" : "en";
  }, []);
  const t = useCallback((key: string) => lookup(dictionaries[lang], key) ?? lookup(dictionaries.en, key) ?? key, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
