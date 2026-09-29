require('dotenv').config();
const express = require('express');
const { searchRestaurants } = require('./utils/foursquarePlaces');
const roomRoutes = require('./routes/roomRoutes');

const app = express();

app.use(express.json());

app.use('/api/v1/rooms', roomRoutes);

app.get('/api/v1/test-foursquare', async (req, res) => {
    try {
        const restaurants = await searchRestaurants({
            latitude: 47.0105,
            longitude: 28.8638,
            radius: 5000,
        });

        res.json({
            success: true,
            count: restaurants.length,
            restaurants,
        });
    } catch (error) {
        console.error('Foursquare error:', error);

        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});



app.use((err, req, res, next) => {
  console.error(`[Error]: ${err.message}`);
  
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.name || 'SERVER_ERROR',
    message: err.message || 'An unexpected error occurred.',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});