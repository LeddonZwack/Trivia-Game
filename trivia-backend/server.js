const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Global variables
let score = 0;
let questionCount = 0;
const MAX_QUESTIONS = 15;
let currentQuestion = null;

// Fetch questions from the API
async function fetchAPIQuestions() {
  try {
    const response = await axios.get('https://opentdb.com/api.php', {
      params: { amount: 1, category: 22, type: 'multiple', encode: 'url3986' }
    });
    if (response.data.response_code === 0) {
      const question = response.data.results[0];
      currentQuestion = {
        question: decodeURIComponent(question.question),
        correct_answer: decodeURIComponent(question.correct_answer),
        incorrect_answers: question.incorrect_answers.map(a => decodeURIComponent(a)),
        type: question.type
      };
    }
  } catch (error) {
    console.error('Error fetching questions:', error);
  }
}

// Get a new question
app.get('/question', async (req, res) => {
  if (questionCount >= MAX_QUESTIONS) {
    return res.status(400).json({ error: 'Maximum questions reached' });
  }

  await fetchAPIQuestions();
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
  res.json({ message: 'Game reset' });
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
