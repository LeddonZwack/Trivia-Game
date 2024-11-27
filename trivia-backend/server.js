// server.js

// Import necessary modules
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const { decode } = require('html-entities'); // To decode HTML entities in API questions

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies

// ======================
// Global Variables
// ======================

let mode = 'API'; // Current mode: 'API' or 'CSV'
let score = 0; // User's score
let questionCount = 0; // Number of questions answered
const MAX_QUESTIONS = 15; // Maximum number of questions per game

let currentQuestion = null; // Holds the current question object

let csvQuestions = []; // Array to store CSV questions

// List of countries for generating incorrect answers
const countries = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus",
  "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso",
  "Burundi", "Cambodia", "Cameroon", "Canada", "Chad",
  "Chile", "China", "Colombia", "Comoros", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark",
  "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Estonia", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany",
  "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
  "Guyana", "Haiti", "Honduras", "Hungary", "Iceland",
  "India", "Indonesia", "Iran", "Iraq", "Ireland",
  "Israel", "Italy", "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Laos",
  "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi",
  "Malaysia", "Maldives", "Mali", "Malta", "Mexico",
  "Monaco", "Mongolia", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand",
  "Nicaragua", "Niger", "Nigeria", "Norway", "Oman",
  "Pakistan", "Palau", "Panama", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal", "Qatar", "Romania",
  "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia",
  "Slovenia", "Somalia", "South Africa", "South Korea", "Spain",
  "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia",
  "Zimbabwe"
];

// ======================
// Helper Functions
// ======================

/**
 * Loads CSV questions from 'geography_questions.csv' into the csvQuestions array.
 * This function should be called initially and whenever the game is reset.
 */
function loadCSVQuestions() {
  csvQuestions = []; // Clear existing questions
  fs.createReadStream('geography_questions.csv')
    .pipe(csv())
    .on('data', (row) => {
      // Assuming CSV has 'Question' and 'Answer' columns
      csvQuestions.push({
        question: row.Question,
        correct_answer: row.Answer
      });
    })
    .on('end', () => {
      console.log(`Loaded ${csvQuestions.length} questions from CSV.`);
    })
    .on('error', (err) => {
      console.error('Error reading CSV file:', err);
    });
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 * @returns {Array} - The shuffled array.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Selects a random question from the CSV questions array.
 * @returns {Object|null} - A question object with question, correct_answer, and incorrect_answers.
 */
function getRandomCSVQuestion() {
  if (csvQuestions.length === 0) {
    return null;
  }

  // Select a random question
  const randomIndex = Math.floor(Math.random() * csvQuestions.length);
  const selectedQuestion = csvQuestions[randomIndex];

  // Remove the selected question from the array to prevent repeats
  csvQuestions.splice(randomIndex, 1);

  // Generate 3 incorrect answers by selecting random countries excluding the correct answer
  const incorrect_answers = [];
  const availableCountries = countries.filter(
    (country) => country.toLowerCase() !== selectedQuestion.correct_answer.toLowerCase()
  );

  while (incorrect_answers.length < 3 && availableCountries.length > 0) {
    const randIndex = Math.floor(Math.random() * availableCountries.length);
    const country = availableCountries[randIndex];
    if (!incorrect_answers.includes(country)) {
      incorrect_answers.push(country);
    }
  }

  // Shuffle all answers
  const allAnswers = shuffleArray([selectedQuestion.correct_answer, ...incorrect_answers]);

  return {
    question: selectedQuestion.question,
    correct_answer: selectedQuestion.correct_answer,
    answers: allAnswers,
    type: 'multiple'
    // hint: '/* Add hint here */' // Placeholder for hints
  };
}

/**
 * Checks if a given answer is a valid country.
 * @param {String} answer - The answer to check.
 * @returns {Boolean} - True if the answer is a country, else false.
 */
function isCountry(answer) {
  return countries.some(
    (country) => country.toLowerCase() === answer.trim().toLowerCase()
  );
}

/**
 * Extracts the country name from a question string.
 * @param {String} question - The question text.
 * @returns {String|null} - The country name if found, else null.
 */
function extractCountryFromQuestion(question) {
  for (const country of countries) {
    // Using word boundaries to match whole words only
    const regex = new RegExp(`\\b${country}\\b`, 'i');
    if (regex.test(question)) {
      return country;
    }
  }
  return null;
}

// ======================
// Initialize CSV Questions
// ======================
loadCSVQuestions();

// ======================
// API Question Cache with Enhanced Strategies
// ======================

let apiQuestionCache = []; // Cache to store fetched API questions
const CACHE_SIZE = 10; // Increased cache size to reduce API calls
const MAX_PREFETCH_ATTEMPTS = 3; // Max attempts to prefetch on failure
let isInFallbackMode = false; // Indicates if the system is in CSV mode due to rate limits
let isPrefetching = false; // Indicates if prefetching is in progress
let cooldownTimer = null; // Timer for cooldown before switching back to API mode

/**
 * Pre-fetches a batch of questions from the API and stores them in the cache.
 * Implements exponential backoff on 429 errors.
 */
async function prefetchAPIQuestions(attempt = 1) {
  if (isPrefetching) {
    // Prevent multiple prefetch attempts
    return;
  }

  isPrefetching = true;

  try {
    const response = await axios.get('https://opentdb.com/api.php', {
      params: {
        amount: CACHE_SIZE,
        category: 22, // Geography
        type: 'multiple', // Fetch only multiple choice to simplify
        encode: 'url3986' // To handle special characters
      },
      timeout: 5000 // 5 seconds timeout
    });

    if (response.data.response_code !== 0) {
      console.error('API returned a non-zero response_code:', response.data.response_code);
      isPrefetching = false;
      return;
    }

    const fetchedQuestions = response.data.results;

    for (const q of fetchedQuestions) {
      const questionText = decode(decodeURIComponent(q.question));
      const correctAnswer = decode(decodeURIComponent(q.correct_answer));
      const incorrectAnswers = q.incorrect_answers.map(ans => decode(decodeURIComponent(ans)));

      // Adjusted Filtering: Include questions mentioning a country in the question text
      const countryInQuestion = extractCountryFromQuestion(questionText);
      if (!countryInQuestion) {
        console.warn(`Skipped question because it does not mention any country: ${questionText}`);
        continue;
      }

      const allAnswers = shuffleArray([correctAnswer, ...incorrectAnswers]);

      apiQuestionCache.push({
        question: questionText,
        correct_answer: correctAnswer,
        answers: allAnswers,
        type: 'multiple'
        // hint: '/* Add hint here */' // Placeholder for hints
      });

      // Stop if cache is full
      if (apiQuestionCache.length >= CACHE_SIZE) {
        break;
      }
    }

    console.log(`Prefetched ${apiQuestionCache.length} API questions.`);

    if (apiQuestionCache.length > 0) {
      // If we have successfully prefetched questions, switch to API mode
      mode = 'API';
      isInFallbackMode = false;
      console.log('Switched back to API mode.');
    }

  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error(`Rate limit exceeded while prefetching API questions. Attempt ${attempt} of ${MAX_PREFETCH_ATTEMPTS}.`);
      if (attempt < MAX_PREFETCH_ATTEMPTS) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2^attempt seconds
        console.log(`Retrying in ${delay / 1000} seconds...`);
        setTimeout(() => prefetchAPIQuestions(attempt + 1), delay);
      } else {
        console.error('Max prefetch attempts reached. Switching to CSV mode.');
        switchToCSVMode();
      }
    } else {
      console.error('Error prefetching API questions:', error.message);
      // Optionally switch to CSV mode or handle differently
      switchToCSVMode();
    }
  } finally {
    isPrefetching = false;
  }
}


/**
 * Switches the system to CSV mode and sets a cooldown before attempting to switch back to API mode.
 */
function switchToCSVMode() {
  mode = 'CSV';
  isInFallbackMode = true;
  console.warn('Switched to CSV mode due to API rate limits.');

  // Clear the API question cache to free up memory
  apiQuestionCache = [];

  // Set a cooldown to attempt switching back to API mode
  if (cooldownTimer) {
    clearTimeout(cooldownTimer);
  }

  cooldownTimer = setTimeout(() => {
    console.log('Attempting to switch back to API mode.');
    mode = 'API';
    isInFallbackMode = false;
    prefetchAPIQuestions(1, 5); // Try fetching 5 questions first
  }, 60); // 1 minute cooldown
}


/**
 * Loads CSV questions and resets relevant variables.
 */
function resetGameState() {
  score = 0;
  questionCount = 0;
  currentQuestion = null;
  loadCSVQuestions(); // Reload CSV questions in case they were modified

  // Clear and refill the API cache
  apiQuestionCache = [];
  prefetchAPIQuestions();
}

// ======================
// API Endpoints
// ======================

/**
 * GET /question
 * Fetches a new question based on the current mode ('API' or 'CSV').
 */
app.get('/question', async (req, res) => {
  if (questionCount >= MAX_QUESTIONS) {
    return res.status(400).json({ error: 'Maximum number of questions reached. Please reset the game.' });
  }

  try {
    if (mode === 'API') {
      // Check if cache has available questions
      if (apiQuestionCache.length === 0) {
        // If cache is empty, try to prefetch more
        await prefetchAPIQuestions();

        if (apiQuestionCache.length === 0) {
          // If prefetching failed, switch to CSV mode
          switchToCSVMode();
          return res.status(429).json({ error: 'API rate limit exceeded. Switched to CSV mode.' });
        }
      }

      // Serve a question from the cache
      const apiQuestion = apiQuestionCache.shift(); // Remove the first question from the cache
      currentQuestion = apiQuestion;
      res.json(currentQuestion);
    } else if (mode === 'CSV') {
      // Fetch question from CSV
      const csvQuestion = getRandomCSVQuestion();
      if (!csvQuestion) {
        return res.status(500).json({ error: 'No more CSV questions available. Please reset the game.' });
      }
      currentQuestion = csvQuestion;
      res.json(currentQuestion);
    } else {
      res.status(400).json({ error: 'Invalid mode. Please use "API" or "CSV".' });
    }
  } catch (error) {
    console.error('Error in GET /question:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /answer
 * Validates the user's answer and updates the score.
 * Expects JSON body: { "answer": "User's Answer" }
 */
app.post('/answer', (req, res) => {
  const userAnswer = req.body.answer;

  if (!currentQuestion) {
    return res.status(400).json({ error: 'No active question. Please request a new question.' });
  }

  let isCorrect = false;

  if (currentQuestion.type === 'multiple') {
    // For multiple choice questions
    isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();
  } else if (currentQuestion.type === 'boolean') {
    // For true/false questions
    isCorrect = userAnswer.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();
    // Associate the correct answer with the country mentioned in the question
    const country = extractCountryFromQuestion(currentQuestion.question);
    currentQuestion.country = country; // Add country information to the current question
  }

  if (isCorrect) {
    score += 1;
  }

  questionCount += 1;

  const response = {
    correct: isCorrect,
    correct_answer: currentQuestion.correct_answer,
    current_score: score,
    questions_answered: questionCount,
    game_over: questionCount >= MAX_QUESTIONS
  };

  // Reset currentQuestion
  currentQuestion = null;

  res.json(response);
});

/**
 * GET /score
 * Retrieves the current score and question count.
 */
app.get('/score', (req, res) => {
  res.json({
    score,
    questions_answered: questionCount,
    game_over: questionCount >= MAX_QUESTIONS
  });
});

/**
 * POST /reset
 * Resets the game by clearing the score, question count, and reloading CSV questions.
 */
app.post('/reset', async (req, res) => {
  resetGameState();

  res.json({ message: 'Game has been reset.' });
});

/**
 * GET /hint
 * Provides a hint for the current question.
 * Currently not implemented. Placeholder for future enhancement.
 */
app.get('/hint', (req, res) => {
  // TODO: Implement hints functionality
  res.json({ hint: '/* Hint functionality to be implemented */' });
});

/**
 * POST /mode
 * Switches the mode between 'API' and 'CSV'.
 * Expects JSON body: { "mode": "API" } or { "mode": "CSV" }
 */
app.post('/mode', async (req, res) => {
  const newMode = req.body.mode;

  if (newMode !== 'API' && newMode !== 'CSV') {
    return res.status(400).json({ error: 'Invalid mode. Use "API" or "CSV".' });
  }

  mode = newMode;
  isInFallbackMode = (newMode === 'CSV');
  currentQuestion = null; // Reset current question when mode changes

  if (mode === 'API') {
    // Attempt to prefetch API questions when switching back to API mode
    await prefetchAPIQuestions();

    if (apiQuestionCache.length === 0) {
      // If prefetching failed due to rate limits, inform the user
      switchToCSVMode(); // Switch back to CSV mode
      return res.status(429).json({ error: 'API rate limit still exceeded. Switched back to CSV mode.' });
    }
  }

  res.json({ message: `Mode has been switched to ${mode}.` });
});


// ======================
// Start the Server
// ======================

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
