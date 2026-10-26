const { withRoomState } = require('./roomCoordinator');
const store = require('../sockets/socketSessionStore');
function durableRoomHandler(handler) {
  return async (req, res) => {
    const pin = req.params.pin || req.body?.pin;
    const originalJson = res.json;
    let body;
    res.json = value => { body = value; return res; };
    try {
      await withRoomState(pin, store, () => handler(req, res));
      res.json = originalJson;
      if (body !== undefined) return res.json(body);
    } catch (error) {
      res.json = originalJson;
      throw error;
    }
  };
}
module.exports = { durableRoomHandler };
