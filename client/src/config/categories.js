import { Utensils, Coffee, Wine, IceCream, Ticket, Film, ListPlus } from 'lucide-react';

export const CATEGORIES = [
  {
    id: 'Restaurants',
    theme: 'restaurants',
    titleKey: 'catRestaurants',
    descKey: 'catRestaurantsDesc',
    topicKey: 'catRestaurantsTopic',
    icon: Utensils,
    wide: false,
    query: 'food dining restaurant',
    providerIds: ['13065'],
  },
  {
    id: 'Cafes',
    theme: 'cafes',
    titleKey: 'catCafes',
    descKey: 'catCafesDesc',
    topicKey: 'catCafesTopic',
    icon: Coffee,
    wide: false,
    query: 'coffee tea cafe bakery',
    providerIds: ['13032'],
  },
  {
    id: 'Bars',
    theme: 'bars',
    titleKey: 'catBars',
    descKey: 'catBarsDesc',
    topicKey: 'catBarsTopic',
    icon: Wine,
    wide: false,
    query: 'bar pub nightlife cocktails',
    providerIds: ['13003'],
  },
  {
    id: 'Desserts',
    theme: 'desserts',
    titleKey: 'catDesserts',
    descKey: 'catDessertsDesc',
    topicKey: 'catDessertsTopic',
    icon: IceCream,
    wide: false,
    query: 'dessert ice cream pastry sweet',
    providerIds: ['13040'],
  },
  {
    id: 'Activities',
    theme: 'activities',
    titleKey: 'catActivities',
    descKey: 'catActivitiesDesc',
    topicKey: 'catActivitiesTopic',
    icon: Ticket,
    wide: false,
    query: 'entertainment fun activities bowling games',
    providerIds: ['10000'],
  },
  {
    id: 'Cinema',
    theme: 'cinema',
    titleKey: 'catCinema',
    descKey: 'catCinemaDesc',
    topicKey: 'catCinemaTopic',
    icon: Film,
    wide: false,
    query: 'movie theater cinema films',
    providerIds: ['10024'],
  },
  {
    id: 'Custom',
    theme: 'custom',
    titleKey: 'customGroupPoll',
    descKey: 'customGroupPollDesc',
    topicKey: 'customPollDrawerTitle',
    icon: ListPlus,
    wide: true,
    query: 'custom user poll',
    providerIds: [],
  },
];

export function getCategoryById(id) {
  return CATEGORIES.find((c) => c.id.toLowerCase() === String(id || '').toLowerCase()) || CATEGORIES[0];
}

export function getCategoryByTheme(theme) {
  return CATEGORIES.find((c) => c.theme.toLowerCase() === String(theme || '').toLowerCase()) || CATEGORIES[0];
}
