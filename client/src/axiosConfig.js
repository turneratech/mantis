import axios from 'axios';

const instance = axios.create({
  baseURL: window.location.pathname.includes('mantis') ? '/mantis' : ''
});

export default instance;
