const { AsyncLocalStorage } = require('node:async_hooks');
const roomTransaction = new AsyncLocalStorage();
function afterCommit(effect) {
  const context = roomTransaction.getStore();
  if (context && !context.finished) context.effects.push(effect);
  else return effect();
}
module.exports = { roomTransaction, afterCommit };
