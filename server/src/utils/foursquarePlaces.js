function formatPriceLabel(price) {
  switch (price) {
    case 1:
      return "$ (Budget: ~50-120 MDL)";     case 2:       return "$$ (Moderate: ~120-250 MDL)";     case 3:       return "$$$ (Expensive: ~250-500 MDL)";     case 4:       return "$$$$ (Fine Dining: 500+ MDL)";
    default:
      return "Price not available";
  }
}

const fetchFoursquarePlaces = async (theme = "restaurant", radius = 5000, near = "Chisinau") => {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: process.env.FOURSQUARE_API_KEY
    }
  };

  try {
    
    const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(theme)}&near=${encodeURIComponent(near)}&radius=${radius}&limit=15&fields=fsq_id,name,price`;
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Status ${response.status}: ${errorBody}`);
    }
    
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results.map(place => ({
        name: place.name,
        fsq_id: place.fsq_id,
        priceLevel: place.price || null,
        priceLabel: formatPriceLabel(place.price)
      }));
    }
  } catch (error) {
    console.warn("Foursquare API warning, switching to fallback data:", error.message);
  }

  return [
    { name: "Andys Pizza", fsq_id: "fallback_fsq_1", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)" },     { name: "Draft Pizza", fsq_id: "fallback_fsq_2", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)" },
    { name: "Pizza Mania", fsq_id: "fallback_fsq_3", priceLevel: 1, priceLabel: "$ (Budget: ~50-120 MDL)" },     { name: "Mi Piace", fsq_id: "fallback_fsq_4", priceLevel: 3, priceLabel: "$$$ (Expensive: ~250-500 MDL)" }
  ];
};

module.exports = { fetchFoursquarePlaces };