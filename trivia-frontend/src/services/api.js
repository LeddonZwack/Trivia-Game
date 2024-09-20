// src/services/api.js

import axios from 'axios';

// Create an Axios instance with the backend base URL
const API = axios.create({
  baseURL: 'http://localhost:5001', // Adjust the port if necessary
});

// Fetch a new question
export const fetchQuestion = () => API.get('/question');

// Submit an answer
export const submitAnswer = (answer) => API.post('/answer', { answer });

// Get current score
export const getScore = () => API.get('/score');

// Reset the game
export const resetGame = () => API.post('/reset');

// Get a hint
export const getHint = () => API.get('/hint');

// Switch mode (API or CSV)
export const switchMode = (mode) => API.post('/mode', { mode });
