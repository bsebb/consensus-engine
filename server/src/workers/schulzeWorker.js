const { parentPort, workerData } = require('worker_threads');
const { calculateSchulzeWinner } = require('../utils/schulze');

try {
  
  const winner = calculateSchulzeWinner(workerData.submissions);
  parentPort.postMessage({ success: true, winner });
} catch (error) {
  parentPort.postMessage({ success: false, error: error.message });
}