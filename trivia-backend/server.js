const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const { decode } = require('html-entities');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

let mode = 'API';
let score = 0;
let questionCount = 0;
const MAX_QUESTIONS = 15;
let currentQuestion = null;
let csvQuestions = [];
let apiQuestionCache = [];

const countries = ["United States", "Canada", "Brazil", "Germany", "France"];

// Load CSV questions
function loadCSVQuestions() {
  csvQuestions = [];
  fs.createReadStream('geography_questions.csv')
    .pipe(csv())
    .on('data', (row) => {
      csvQuestions.push({ question: row.Question, correct_answer: row.Answer });
    })
    .on('end', () => console.log('CSV loaded'));
}

// Shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Fetch API questions and store in cache
async function prefetchAPIQuestions() {
  try {
    const response = await axios.get('https://opentdb.com/api.php', {
      params: { amount: 10, category: 22, type: 'multiple', encode: 'url3986' }
    });
    const fetchedQuestions = response.data.results.map(q => ({
      question: decode(decodeURIComponent(q.question)),
      correct_answer: decode(decodeURIComponent(q.correct_answer)),
      incorrect_answers: q.incorrect_answers.map(a => decode(decodeURIComponent(a))),
      type: q.type
    }));
    apiQuestionCache.push(...fetchedQuestions);
  } catch (error) {
    console.error('Error fetching API questions:', error);
  }
}

// Get a new question
app.get('/question', async (req, res) => {
  if (questionCount >= MAX_QUESTIONS) return res.status(400).json({ error: 'Max questions reached' });

  if (mode === 'API') {
    if (apiQuestionCache.length === 0) await prefetchAPIQuestions();
    currentQuestion = apiQuestionCache.shift();
  } else if (mode === 'CSV') {
    if (csvQuestions.length === 0) return res.status(500).json({ error: 'No CSV questions available' });
    currentQuestion = csvQuestions.shift();
  }

  res.json(currentQuestion);
});

// Submit answer
app.post('/answer', (req, res) => {
  const userAnswer = req.body.answer;
  if (!currentQuestion) return res.status(400).json({ error: 'No active question' });

  const isCorrect = userAnswer.toLowerCase() === currentQuestion.correct_answer.toLowerCase();
  if (isCorrect) score++;
  questionCount++;

  res.json({ correct: isCorrect, correct_answer: currentQuestion.correct_answer, score });
  currentQuestion = null;
});

// Reset the game
app.post('/reset', (req, res) => {
  score = 0;
  questionCount = 0;
  currentQuestion = null;
  loadCSVQuestions();
  apiQuestionCache = [];
  prefetchAPIQuestions();
  res.json({ message: 'Game reset' });
});

// Switch mode
app.post('/mode', (req, res) => {
  const newMode = req.body.mode;
  if (newMode !== 'API' && newMode !== 'CSV') return res.status(400).json({ error: 'Invalid mode' });
  mode = newMode;
  currentQuestion = null;
  res.json({ message: `Mode switched to ${mode}` });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
