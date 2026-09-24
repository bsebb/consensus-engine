const express = require('express');
const roomRoutes = require('./routes/roomRoutes');

const app = express();

app.use(express.json());

app.use('/api/v1/rooms', roomRoutes);

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