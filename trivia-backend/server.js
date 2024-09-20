const express = require('express');
const axios = require('axios');

// List of country names (you can extend this as needed)
const countries = ['United States', 'Canada', 'Russia', 'Japan', 'Germany', 'China', 'Brazil', 'Albania', 'Spain', 'Italy', 'France', 'Australia', 'Mexico'];

const app = express();
const port = 3000;

// Helper function to check if a question or answer involves a country
function getAssociatedCountry(questionData) {
  const { question, correct_answer } = questionData;

  // Check if any country name is present in the question or the correct answer
  for (let country of countries) {
    if (question.includes(country) || correct_answer.includes(country)) {
      return country; // Return the associated country
    }
  }
  return null; // No country found
}

app.get('/trivia', async (req, res) => {
  try {
    const response = await axios.get('https://opentdb.com/api.php?amount=10&category=22');
    const triviaQuestions = response.data.results;

    // Filter questions and attribute countries
    const countryRelatedQuestions = triviaQuestions.map(q => {
      const country = getAssociatedCountry(q);
      if (country) {
        return { ...q, associated_country: country }; // Attach the associated country to the question
      }
      return null; // Exclude questions that don't pertain to any country
    }).filter(q => q !== null); // Filter out nulls

    res.json(countryRelatedQuestions);
  } catch (error) {
    console.error('Error fetching trivia:', error);
    res.status(500).json({ error: 'Failed to fetch trivia questions' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
