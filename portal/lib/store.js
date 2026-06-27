const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../data/store.json');

const defaultStore = () => ({
  accounts: [],
  licenses: [],
  purchaseTokens: []
});

const load = () => {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    const empty = defaultStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  return { ...defaultStore(), ...JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) };
};

const save = (store) => {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
};

const findAccountByEmail = (store, email) =>
  store.accounts.find(a => a.email.toLowerCase() === email.toLowerCase());

const findAccountById = (store, id) =>
  store.accounts.find(a => a.id === id);

module.exports = {
  load,
  save,
  findAccountByEmail,
  findAccountById,
  STORE_PATH
};
