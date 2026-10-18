import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const TRANSLATIONS = {
  en: {
    // Header & Meta
    brand: 'NoYouPick',
    tagline: 'End the debate',
    history: 'History',
    settings: 'Preferences',
    back: 'Back',
    home: 'Home',
    code: 'Code',
    change: 'Change',
    ready: 'Ready',

    // Landing Tabs & Hero
    startPick: 'Start a Pick',
    joinWithCode: 'Join with Code',
    yourName: 'Your Name',
    namePlaceholder: 'e.g. Alex (optional)',
    whatPicking: 'What are you picking?',
    locationLabel: 'Live device GPS • Hex grid search',
    locationChangeHint: 'Tap to change city or search anywhere',
    detectingLocation: 'Detecting your area...',
    createRoomBtn: 'Create Room',
    joinRoomBtn: 'Join Room',
    roomCodeLabel: '4-Digit Room Code',
    roomCodeHint: 'Shared by your host',
    roomReadyPrefix: 'Room',
    roomReadySuffix: 'ready to join',
    lastWinnerPrefix: 'Last winner',
    seeAll: 'See All',
    footerSubtext: 'Decide where to go in 30 seconds',

    // Categories
    catRestaurants: 'Restaurants',
    catRestaurantsDesc: 'Dinner & lunch spots',
    catRestaurantsTopic: 'Where are we eating?',

    catCafes: 'Coffee & Cafes',
    catCafesDesc: 'Espresso, brunch & tea',
    catCafesTopic: 'Where are we grabbing coffee?',

    catBars: 'Bars & Pubs',
    catBarsDesc: 'Craft beer, wine & drinks',
    catBarsTopic: 'Where are we getting drinks?',

    catCinema: 'Cinema',
    catCinemaDesc: 'Movie theaters & shows',
    catCinemaTopic: 'Which cinema are we going to?',

    catDesserts: 'Desserts',
    catDessertsDesc: 'Gelato, pastries & sweets',
    catDessertsTopic: 'Where to for dessert?',

    catCustom: 'Custom Poll',
    catCustomDesc: 'Add your own options',
    catCustomTopic: 'What should we do?',

    customQuestionLabel: 'Question or Topic',
    customPlaceholder: 'e.g. What board game should we play?',

    // Settings Modal
    prefTitle: 'Preferences',
    prefSubtitle: 'App & consensus configuration',
    langTitle: 'Language',
    langSubtitle: 'Choose your preferred language',
    colorTitle: 'Accent Theme',
    colorSubtitle: 'Personalize your interface style',
    voterIdentity: 'Voter Identity',
    hapticsTitle: 'Tactile Haptics',
    hapticsDesc: 'Acoustic & vibration feedback on taps',
    themeTitle: 'Display Appearance',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    clearHistoryBtn: 'Clear History',
    clearHistoryMsg: 'Delete all past consensus records',
    closeBtn: 'Done',
  },

  ro: {
    // Header & Meta
    brand: 'NoYouPick',
    tagline: 'Gata cu cearta',
    history: 'Istoric',
    settings: 'Preferințe',
    back: 'Înapoi',
    home: 'Acasă',
    code: 'Cod',
    change: 'Schimbă',
    ready: 'Gata',

    // Landing Tabs & Hero
    startPick: 'Alege un loc',
    joinWithCode: 'Intră cu cod',
    yourName: 'Numele tău',
    namePlaceholder: 'ex. Andrei (opțional)',
    whatPicking: 'Ce căutați?',
    locationLabel: 'GPS live • Căutare în apropiere',
    locationChangeHint: 'Apasă pentru alt oraș sau locație',
    detectingLocation: 'Detectăm zona ta...',
    createRoomBtn: 'Creează cameră',
    joinRoomBtn: 'Intră în cameră',
    roomCodeLabel: 'Cod cameră (4 cifre)',
    roomCodeHint: 'Trimis de prietenul tău',
    roomReadyPrefix: 'Camera',
    roomReadySuffix: 'e gata de vot',
    lastWinnerPrefix: 'Ultimul câștigător',
    seeAll: 'Vezi tot',
    footerSubtext: 'Decideți unde ieșiți în 30 de secunde',

    // Categories
    catRestaurants: 'Restaurante',
    catRestaurantsDesc: 'Locuri de prânz și cină',
    catRestaurantsTopic: 'Unde mâncăm azi?',

    catCafes: 'Cafenele',
    catCafesDesc: 'Cafea bună, brunch & ceai',
    catCafesTopic: 'Unde bem o cafea?',

    catBars: 'Baruri & Pub-uri',
    catBarsDesc: 'Bere artizanală, vin & cocktailuri',
    catBarsTopic: 'Unde ieșim la un drink?',

    catCinema: 'Cinema',
    catCinemaDesc: 'Săli de film & premiere',
    catCinemaTopic: 'La ce film mergem?',

    catDesserts: 'Deserturi',
    catDessertsDesc: 'Gelato, prăjituri & dulciuri',
    catDessertsTopic: 'Unde mâncăm un desert?',

    catCustom: 'Sondaj liber',
    catCustomDesc: 'Adaugă propriile variante',
    catCustomTopic: 'Ce facem împreună?',

    customQuestionLabel: 'Întrebare sau subiect',
    customPlaceholder: 'ex. Ce board game jucăm diseară?',

    // Settings Modal
    prefTitle: 'Preferințe',
    prefSubtitle: 'Configurare aplicație și vot',
    langTitle: 'Limba',
    langSubtitle: 'Alege limba interfeței',
    colorTitle: 'Culoare accent',
    colorSubtitle: 'Stilul tău vizual preferat',
    voterIdentity: 'Identitate votant',
    hapticsTitle: 'Feedback tactil',
    hapticsDesc: 'Vibrații și sunete discrete la apăsare',
    themeTitle: 'Aspect ecran',
    themeSystem: 'Automat',
    themeLight: 'Luminos',
    themeDark: 'Întunecat',
    clearHistoryBtn: 'Șterge istoricul',
    clearHistoryMsg: 'Șterge toate voturile anterioare',
    closeBtn: 'Închide',
  },

  ru: {
    // Header & Meta
    brand: 'NoYouPick',
    tagline: 'Конец спорам',
    history: 'История',
    settings: 'Настройки',
    back: 'Назад',
    home: 'Главная',
    code: 'Код',
    change: 'Изменить',
    ready: 'Готово',

    // Landing Tabs & Hero
    startPick: 'Создать выбор',
    joinWithCode: 'Войти по коду',
    yourName: 'Ваше имя',
    namePlaceholder: 'напр. Алекс (необязательно)',
    whatPicking: 'Что выбираем?',
    locationLabel: 'Живой GPS • Поиск поблизости',
    locationChangeHint: 'Нажмите, чтобы сменить город или адрес',
    detectingLocation: 'Определяем геопозицию...',
    createRoomBtn: 'Создать комнату',
    joinRoomBtn: 'Войти в комнату',
    roomCodeLabel: '4-значный код комнаты',
    roomCodeHint: 'Код от организатора',
    roomReadyPrefix: 'Комната',
    roomReadySuffix: 'готова к голосованию',
    lastWinnerPrefix: 'Прошлый выбор',
    seeAll: 'Все',
    footerSubtext: 'Решите, куда пойти, за 30 секунд',

    // Categories
    catRestaurants: 'Рестораны',
    catRestaurantsDesc: 'Обеды, ужины и террасы',
    catRestaurantsTopic: 'Куда пойдём поесть?',

    catCafes: 'Кофейни',
    catCafesDesc: 'Эспрессо, бранчи и выпечка',
    catCafesTopic: 'Где попьём кофе?',

    catBars: 'Бары и пабы',
    catBarsDesc: 'Крафт, вино и коктейли',
    catBarsTopic: 'Куда пойдём выпить?',

    catCinema: 'Кинотеатры',
    catCinemaDesc: 'Фильмы и сеансы',
    catCinemaTopic: 'В какой кинотеатр пойдём?',

    catDesserts: 'Десерты',
    catDessertsDesc: 'Джелато, торты и сладости',
    catDessertsTopic: 'Куда за десертом?',

    catCustom: 'Свой опрос',
    catCustomDesc: 'Любые свои варианты',
    catCustomTopic: 'Чем займёмся?',

    customQuestionLabel: 'Вопрос или тема',
    customPlaceholder: 'напр. В какую настолку сыграем?',

    // Settings Modal
    prefTitle: 'Настройки',
    prefSubtitle: 'Параметры приложения и голосования',
    langTitle: 'Язык',
    langSubtitle: 'Выберите язык интерфейса',
    colorTitle: 'Цвет акцента',
    colorSubtitle: 'Персонализация цветовой темы',
    voterIdentity: 'Имя участника',
    hapticsTitle: 'Тактильный отклик',
    hapticsDesc: 'Вибрация и мягкие звуки при нажатиях',
    themeTitle: 'Оформление',
    themeSystem: 'Системное',
    themeLight: 'Светлое',
    themeDark: 'Тёмное',
    clearHistoryBtn: 'Очистить историю',
    clearHistoryMsg: 'Удалить сохранённые результаты',
    closeBtn: 'Готово',
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('noyoupick_lang') || 'en';
  });

  const setLang = (newLang) => {
    if (TRANSLATIONS[newLang]) {
      setLangState(newLang);
      localStorage.setItem('noyoupick_lang', newLang);
      document.documentElement.setAttribute('lang', newLang);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const t = (key) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
