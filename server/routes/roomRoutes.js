const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const asyncHandler = require('../utils/asyncHandler');

router.post('/', asyncHandler(roomController.createNewRoom));
router.get('/:pin', asyncHandler(roomController.getRoom));
router.patch('/:id/config', asyncHandler(roomController.updateConfig));

module.exports = router;