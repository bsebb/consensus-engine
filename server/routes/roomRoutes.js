const express = require('express');
const router = express.Router();
const roomController = require('../src/controllers/roomController');
const asyncHandler = require('../src/utils/asyncHandler');
const { createRateLimiter } = require('../src/utils/rateLimiter');

const roomCreateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 120,
  message: 'Too many rooms created from this IP. Please wait a minute before creating another.',
});

const pinLookupLimiter = createRateLimiter({
  windowMs: 60000,
  max: 600,
  message: 'Too many PIN lookups. Please slow down.',
});

const finalizeLimiter = createRateLimiter({
  windowMs: 60000,
  max: 120,
  message: 'Too many finalize requests. Please wait a moment.',
});

const morePlacesLimiter = createRateLimiter({
  windowMs: 60000,
  max: 120,
  message: 'Too many requests for more places. Please wait a moment.',
});

const reportClosedLimiter = createRateLimiter({
  windowMs: 60000,
  max: 30,
  message: 'Too many reports submitted. Please wait a moment.',
});

const voteLimiter = createRateLimiter({
  windowMs: 60000,
  max: 300,
  message: 'Too many vote submissions. Please slow down.',
});

const constraintLimiter = createRateLimiter({
  windowMs: 60000,
  max: 200,
  message: 'Too many constraint updates. Please slow down.',
});

const feedbackLimiter = createRateLimiter({
  windowMs: 60000,
  max: 120,
  message: 'Too many feedback submissions. Please slow down.',
});

const configLimiter = createRateLimiter({
  windowMs: 60000,
  max: 200,
  message: 'Too many configuration updates. Please slow down.',
});

router.post('/', roomCreateLimiter, asyncHandler(roomController.createNewRoom));
// Ephemeral Crowd-Sourced Self-Healing: report closed/outdated venue
router.post('/report-closed', reportClosedLimiter, asyncHandler(roomController.reportClosedVenueHandler));
// added batched votes endpoint for Sprint 3
router.post('/:pin/votes', voteLimiter, asyncHandler(roomController.submitVotes));
router.get('/:pin', pinLookupLimiter, asyncHandler(roomController.getRoom));
router.patch('/:id/config', configLimiter, asyncHandler(roomController.updateConfig));
// Lilia: added Step Zero budget constraints endpoint
router.post('/:pin/constraints', constraintLimiter, asyncHandler(roomController.submitConstraints));
router.post('/:pin/more-places', morePlacesLimiter, asyncHandler(roomController.getMorePlaces));
router.post('/:pin/finalize', finalizeLimiter, asyncHandler(roomController.finalizeVoting));
// Afina: endpoint for Post-Event Feedback Loop
router.post('/:pin/feedback', feedbackLimiter, asyncHandler(roomController.submitFeedback));

module.exports = router;