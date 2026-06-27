/** TurnerTech portal URL — local dev default; production: https://turneratech.com/mantis */
export const PORTAL_URL = process.env.REACT_APP_PORTAL_URL || 'http://localhost:4000';

export const PORTAL_PRODUCT_PATH = process.env.REACT_APP_PORTAL_PRODUCT_PATH || '/';

export const portalRegisterUrl = () => `${PORTAL_URL}${PORTAL_PRODUCT_PATH}`;
