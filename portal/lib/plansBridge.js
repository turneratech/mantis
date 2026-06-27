/**
 * Shared tier catalog from main Mantis server config.
 */
const { getPlan, getAllPlans, PLANS, TIERS } = require('../../server/config/plans');

module.exports = { getPlan, getAllPlans, PLANS, TIERS };
