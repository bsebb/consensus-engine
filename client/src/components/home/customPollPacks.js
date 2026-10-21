import { Film, Utensils, Dices, Plane } from 'lucide-react';

export function getStarterPacks(lang) {
  if (lang === 'ro') {
    return [
      {
        id: 'movies',
        icon: Film,
        title: 'Seara de filme',
        question: 'Ce film vizionam?',
        options: ['Inception', 'Interstellar', 'Dune', 'Oppenheimer'],
      },
      {
        id: 'dinner',
        icon: Utensils,
        title: 'Unde mancam',
        question: 'Unde iesim la masa?',
        options: ['Pizza in oras', 'Sushi & Rolls', 'Smash Burgers', 'Paste & Vin'],
      },
      {
        id: 'games',
        icon: Dices,
        title: 'Board Games',
        question: 'Ce board game jucam?',
        options: ['Catan', 'Codenames', 'Monopoly', 'Activity'],
      },
      {
        id: 'getaway',
        icon: Plane,
        title: 'Weekend Getaway',
        question: 'Unde mergem in weekend?',
        options: ['Cabana la munte', 'Pensiune rustica', 'City break', 'Camping la lac'],
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
    return ['Ce film vizionam?', 'Unde iesim diseara?', 'Ce board game jucam?', 'Unde mergem in weekend?'];
  }
  if (lang === 'ru') {
    return ['Какой фильм посмотрим?', 'Куда пойдем сегодня?', 'В какую настолку сыграем?', 'Куда поедем на выходные?'];
  }
  return ['What movie should we watch?', 'Where should we hang out?', 'What game to play?', 'Where to this weekend?'];
}
