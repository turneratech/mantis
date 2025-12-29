import axios from 'axios';

const instance = axios.create({
  baseURL: window.location.pathname.includes('bugtracker') ? '/bugtracker' : ''
});

export default instance;
