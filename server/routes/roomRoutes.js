const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const asyncHandler = require('../utils/asyncHandler');

router.post('/', asyncHandler(roomController.createNewRoom));
router.get('/:pin', asyncHandler(roomController.getRoom));
router.patch('/:id/config', asyncHandler(roomController.updateConfig));
//Lilia: added Step Zero budget constraints endpoint
router.post('/:pin/constraints', asyncHandler(roomController.submitConstraints));
module.exports = router;
router.post('/:pin/finalize', asyncHandler(roomController.finalizeVoting));