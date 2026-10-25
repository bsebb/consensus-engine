import { Film, Utensils, Dices, Plane } from 'lucide-react';

export function getStarterPacks(lang) {
  if (lang === 'ro') {
    return [
      {
        id: 'movies',
        icon: Film,
        title: 'Seara de filme',
        question: 'Ce film vizionăm?',
        options: ['Inception', 'Interstellar', 'Dune', 'Oppenheimer'],
      },
      {
        id: 'dinner',
        icon: Utensils,
        title: 'Unde mâncăm',
        question: 'Unde ieșim la masă?',
        options: ['Pizza în oraș', 'Sushi & Rolls', 'Smash Burgers', 'Paste & Vin'],
      },
      {
        id: 'games',
        icon: Dices,
        title: 'Jocuri de societate',
        question: 'Ce board game jucăm?',
        options: ['Catan', 'Codenames', 'Monopoly', 'Activity'],
      },
      {
        id: 'getaway',
        icon: Plane,
        title: 'Escapadă de weekend',
        question: 'Unde mergem în weekend?',
        options: ['Cabană la munte', 'Pensiune rustică', 'City break', 'Camping la lac'],
      },
    ];
  }
  if (lang === 'ru') {
    return [
      {
        id: 'movies',
        icon: Film,
        title: 'Вечер кино',
        question: 'Какой фильм посмотрим?',
        options: ['Интерстеллар', 'Начало', 'Дюна', 'Оппенгеймер'],
      },
      {
        id: 'dinner',
        icon: Utensils,
        title: 'Где поесть',
        question: 'Что закажем поесть?',
        options: ['Пицца', 'Суши и роллы', 'Бургеры', 'Паста'],
      },
      {
        id: 'games',
        icon: Dices,
        title: 'Настольные игры',
        question: 'В какую настолку сыграем?',
        options: ['Catan', 'Codenames', 'Монополия', 'Имаджинариум'],
      },
      {
        id: 'getaway',
        icon: Plane,
        title: 'Выходные',
        question: 'Куда поедем на выходные?',
        options: ['Домик в горах', 'Загородный отель', 'Поездка за город', 'Кемпинг у озера'],
      },
    ];
  }
  if (lang === 'de') {
    return [
      {
        id: 'movies',
        icon: Film,
        title: 'Filmabend',
        question: 'Welchen Film schauen wir?',
        options: ['Inception', 'Interstellar', 'Dune', 'Oppenheimer'],
      },
      {
        id: 'dinner',
        icon: Utensils,
        title: 'Essen gehen',
        question: 'Wo essen wir heute?',
        options: ['Pizza & Pasta', 'Sushi & Rolls', 'Smash Burger', 'Tapas & Wein'],
      },
      {
        id: 'games',
        icon: Dices,
        title: 'Brettspiele',
        question: 'Welches Spiel spielen wir?',
        options: ['Catan', 'Codenames', 'Monopoly', 'Ticket to Ride'],
      },
      {
        id: 'getaway',
        icon: Plane,
        title: 'Wochenendausflug',
        question: 'Wohin am Wochenende?',
        options: ['Berghütte', 'Wellnesshotel', 'Städtetrip', 'Camping am See'],
      },
    ];
  }
  if (lang === 'fr') {
    return [
      {
        id: 'movies',
        icon: Film,
        title: 'Soirée cinéma',
        question: 'Quel film regarde-t-on ?',
        options: ['Inception', 'Interstellar', 'Dune', 'Oppenheimer'],
      },
      {
        id: 'dinner',
        icon: Utensils,
        title: 'Où manger',
        question: 'Où va-t-on manger ?',
        options: ['Pizza au feu de bois', 'Sushi & Makis', 'Burgers maison', 'Pâtes & Vin'],
      },
      {
        id: 'games',
        icon: Dices,
        title: 'Jeux de société',
        question: 'À quel jeu joue-t-on ?',
        options: ['Catan', 'Codenames', 'Monopoly', 'Dixit'],
      },
      {
        id: 'getaway',
        icon: Plane,
        title: 'Escapade week-end',
        question: 'Où part-on ce week-end ?',
        options: ['Chalet en montagne', 'Gîte rustique', 'City break', 'Camping au bord du lac'],
      },
    ];
  }
  if (lang === 'es') {
    return [
      {
        id: 'movies',
        icon: Film,
        title: 'Noche de cine',
        question: '¿Qué película vemos?',
        options: ['Inception', 'Interstellar', 'Dune', 'Oppenheimer'],
      },
      {
        id: 'dinner',
        icon: Utensils,
        title: 'Dónde cenar',
        question: '¿Dónde vamos a cenar?',
        options: ['Pizza artesanal', 'Sushi & Rolls', 'Smash Burgers', 'Tapas & Vino'],
      },
      {
        id: 'games',
        icon: Dices,
        title: 'Juegos de mesa',
        question: '¿A qué juego jugamos?',
        options: ['Catan', 'Codenames', 'Monopoly', 'Aventureros al Tren'],
      },
      {
        id: 'getaway',
        icon: Plane,
        title: 'Escapada de finde',
        question: '¿Adónde vamos el fin de semana?',
        options: ['Cabaña en la montaña', 'Casa rural', 'City break', 'Camping junto al lago'],
      },
    ];
  }
  return [
    {
      id: 'movies',
      icon: Film,
      title: 'Movie Night',
      question: 'What movie should we watch?',
      options: ['Inception', 'Interstellar', 'Spirited Away', 'The Dark Knight'],
    },
    {
      id: 'dinner',
      icon: Utensils,
      title: 'Dinner Spots',
      question: 'Where should we grab dinner?',
      options: ['Pizza Night', 'Sushi & Rolls', 'Smash Burgers', 'Taco Fiesta'],
    },
    {
      id: 'games',
      icon: Dices,
      title: 'Board Games',
      question: 'What board game should we play?',
      options: ['Catan', 'Codenames', 'Monopoly Deal', 'Ticket to Ride'],
    },
    {
      id: 'getaway',
      icon: Plane,
      title: 'Weekend Getaway',
      question: 'Where to this weekend?',
      options: ['Mountain Cabin', 'Beach Resort', 'City Break', 'Lakeside Camping'],
    },
  ];
}

export function getSuggestedTopics(lang) {
  if (lang === 'ro') {
    return ['Ce film vizionăm?', 'Unde ieșim la masă?', 'Ce board game jucăm?', 'Unde mergem în weekend?'];
  }
  if (lang === 'ru') {
    return ['Какой фильм посмотрим?', 'Куда пойдем сегодня?', 'В какую настолку сыграем?', 'Куда поедем на выходные?'];
  }
  if (lang === 'de') {
    return ['Welchen Film schauen wir?', 'Wo gehen wir essen?', 'Welches Spiel spielen wir?', 'Wohin am Wochenende?'];
  }
  if (lang === 'fr') {
    return ['Quel film regarde-t-on ?', 'Où va-t-on manger ?', 'À quel jeu joue-t-on ?', 'Où part-on ce week-end ?'];
  }
  if (lang === 'es') {
    return ['¿Qué película vemos?', '¿Dónde vamos a cenar?', '¿A qué juego jugamos?', '¿Adónde vamos el fin de semana?'];
  }
  return ['What movie should we watch?', 'Where should we hang out?', 'What game to play?', 'Where to this weekend?'];
}
