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
    roomPrefix: 'Room',

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

    // Lobby
    invite: 'Invite',
    inviteFriends: 'Invite Friends',
    inRoomPrefix: 'In Room',
    hostBadge: 'Host',
    priceFilter: 'Price Filter',
    anonymousHint: '(Anonymous)',
    anyPrice: 'Any Price',
    allSpots: 'All spots',
    placesOnTable: 'Places on the Table',
    optionsOnTable: 'Options on the Table',
    addOption: 'Add Option',
    close: 'Close',
    details: 'Details',
    detailsAndRoute: 'Details & Route',
    startVoting: 'Start Voting',
    placesSuffix: 'Places',
    optionsSuffix: 'Options',
    copied: 'Copied',
    shareQr: 'Show QR Code',
    shareLink: 'Copy Room Code',
    maxBudgetLabel: 'Max',
    spotsFilteredNotice: 'pricier spot(s) hidden by budget',
    filteredBadge: 'Filtered',
    addAtLeastTwoTitle: 'Add At Least 2 Options',
    addAtLeastTwoMsg: 'Add at least 2 options above so everyone can vote.',

    // Swipe Deck & Voting
    lobby: 'Lobby',
    card: 'Card',
    option: 'Option',
    ofWord: 'of',
    likeAction: 'Like',
    passAction: 'Pass',
    swipeRightHint: 'Swipe right to like',
    swipeLeftHint: 'Swipe left to pass',
    waitingFriendsTitle: 'Waiting for friends...',
    waitingFriendsDesc: 'Hold tight while everyone casts their ranked votes.',
    calculatingConsensus: 'Calculating Schulze Consensus...',

    // Winner View
    consensusWinner: 'Consensus Winner',
    everyoneAgreed: 'Your group agreed on this pick!',
    roadDirections: 'Road Directions',
    menuAndReviews: 'Menu & Reviews',
    runnerUpsTitle: 'Runner-ups',
    startAnotherPick: 'Start Another Pick',
    shareWinnerBtn: 'Share Winner',

    // Venue Details Modal
    roadRoute: 'Road Route',
    byCar: 'By Car / Taxi',
    walking: 'Walking',
    viaStreets: 'Via real streets',
    streetTraffic: 'Street traffic',
    pedestrianPath: 'Pedestrian path',
    estimatedSpend: 'Estimated Spend',
    spottedOutdated: 'Spotted outdated info?',
    reportClosed: 'Report closed / wrong spot',
    reportedClosed: 'Reported as closed',
    reporting: 'Reporting...',

    // Operational Stages (Labor Illusion)
    stageGeo: 'Triangulating closest verified spots...',
    stageFilter: 'Eliminating closed spots & ghost listings...',
    stageRouting: 'Calculating real street travel times...',
    stageDeck: 'Assembling high-res candidate cards...',
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
    roomPrefix: 'Camera',

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

    // Lobby
    invite: 'Invită',
    inviteFriends: 'Invită prietenii',
    inRoomPrefix: 'În cameră',
    hostBadge: 'Gazdă',
    priceFilter: 'Filtru de preț',
    anonymousHint: '(Anonim)',
    anyPrice: 'Orice preț',
    allSpots: 'Toate locurile',
    placesOnTable: 'Locuri propuse',
    optionsOnTable: 'Opțiuni propuse',
    addOption: 'Adaugă opțiune',
    close: 'Închide',
    details: 'Detalii',
    detailsAndRoute: 'Detalii & Traseu',
    startVoting: 'Începe votul',
    placesSuffix: 'Locuri',
    optionsSuffix: 'Opțiuni',
    copied: 'Copiat',
    shareQr: 'Arată codul QR',
    shareLink: 'Copiază codul camerei',
    maxBudgetLabel: 'Maxim',
    spotsFilteredNotice: 'locuri mai scumpe ascunse de buget',
    filteredBadge: 'Filtrat',
    addAtLeastTwoTitle: 'Adaugă cel puțin 2 opțiuni',
    addAtLeastTwoMsg: 'Adaugă cel puțin 2 opțiuni pentru a începe votul.',

    // Swipe Deck & Voting
    lobby: 'Cameră',
    card: 'Card',
    option: 'Opțiune',
    ofWord: 'din',
    likeAction: 'Vreau',
    passAction: 'Pas',
    swipeRightHint: 'Glisează spre dreapta dacă vrei',
    swipeLeftHint: 'Glisează spre stânga dacă nu',
    waitingFriendsTitle: 'Așteptăm prietenii...',
    waitingFriendsDesc: 'Așteptăm ca toți să termine de evaluat opțiunile.',
    calculatingConsensus: 'Calculăm consensul Schulze...',

    // Winner View
    consensusWinner: 'Alegerea grupului',
    everyoneAgreed: 'Grupul a căzut de acord pe acest loc!',
    roadDirections: 'Navighează',
    menuAndReviews: 'Meniu & Recenzii',
    runnerUpsTitle: 'Alte locuri apreciate',
    startAnotherPick: 'Alege alt loc',
    shareWinnerBtn: 'Trimite câștigătorul',

    // Venue Details Modal
    roadRoute: 'Traseu auto',
    byCar: 'Cu mașina / Taxi',
    walking: 'Pe jos',
    viaStreets: 'Pe străzi reale',
    streetTraffic: 'Trafic urban',
    pedestrianPath: 'Traseu pietonal',
    estimatedSpend: 'Buget estimat',
    spottedOutdated: 'Informații învechite?',
    reportClosed: 'Raportează închis / locație greșită',
    reportedClosed: 'Raportat ca închis',
    reporting: 'Raportăm...',

    // Operational Stages (Labor Illusion)
    stageGeo: 'Căutăm cele mai apropiate locuri verificate...',
    stageFilter: 'Eliminăm locurile închise și listările vechi...',
    stageRouting: 'Calculăm rutele reale pe străzi...',
    stageDeck: 'Pregătim pachetul de vot...',
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
    roomPrefix: 'Комната',

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

    // Lobby
    invite: 'Пригласить',
    inviteFriends: 'Пригласить друзей',
    inRoomPrefix: 'В комнате',
    hostBadge: 'Создатель',
    priceFilter: 'Фильтр цен',
    anonymousHint: '(Анонимно)',
    anyPrice: 'Любая цена',
    allSpots: 'Все места',
    placesOnTable: 'Варианты на столе',
    optionsOnTable: 'Варианты на столе',
    addOption: 'Добавить',
    close: 'Закрыть',
    details: 'Детали',
    detailsAndRoute: 'Маршрут и детали',
    startVoting: 'Начать голосование',
    placesSuffix: 'Мест',
    optionsSuffix: 'Вариантов',
    copied: 'Скопировано',
    shareQr: 'Показать QR-код',
    shareLink: 'Скопировать код комнаты',
    maxBudgetLabel: 'Макс.',
    spotsFilteredNotice: 'дорогих мест скрыто фильтром',
    filteredBadge: 'Отфильтровано',
    addAtLeastTwoTitle: 'Добавьте хотя бы 2 варианта',
    addAtLeastTwoMsg: 'Добавьте хотя бы 2 варианта, чтобы начать голосование.',

    // Swipe Deck & Voting
    lobby: 'Лобби',
    card: 'Карточка',
    option: 'Вариант',
    ofWord: 'из',
    likeAction: 'Нравится',
    passAction: 'Пропустить',
    swipeRightHint: 'Смахните вправо, если нравится',
    swipeLeftHint: 'Смахните влево, чтобы пропустить',
    waitingFriendsTitle: 'Ждём остальных...',
    waitingFriendsDesc: 'Подождите, пока все участники проголосуют.',
    calculatingConsensus: 'Вычисляем победителя...',

    // Winner View
    consensusWinner: 'Победитель выбора',
    everyoneAgreed: 'Группа выбрала это место!',
    roadDirections: 'Проложить маршрут',
    menuAndReviews: 'Меню и отзывы',
    runnerUpsTitle: 'Другие популярные места',
    startAnotherPick: 'Выбрать снова',
    shareWinnerBtn: 'Поделиться результатом',

    // Venue Details Modal
    roadRoute: 'Маршрут',
    byCar: 'На авто / Такси',
    walking: 'Пешком',
    viaStreets: 'По дорогам',
    streetTraffic: 'С учётом пробок',
    pedestrianPath: 'Пешеходная дорожка',
    estimatedSpend: 'Ориентировочный чек',
    spottedOutdated: 'Заметили ошибку?',
    reportClosed: 'Сообщить о закрытии',
    reportedClosed: 'Отправлено: закрыто',
    reporting: 'Отправка...',

    // Operational Stages (Labor Illusion)
    stageGeo: 'Поиск ближайших проверенных мест...',
    stageFilter: 'Исключаем закрытые места...',
    stageRouting: 'Расчёт реальных маршрутов...',
    stageDeck: 'Формирование карточек для голосования...',
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
