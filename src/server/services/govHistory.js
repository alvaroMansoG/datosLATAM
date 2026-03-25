const govHistory = require('../../../data/generated/gov_history.json');

function getGovHistory() {
  return govHistory;
}

module.exports = {
  getGovHistory,
};
