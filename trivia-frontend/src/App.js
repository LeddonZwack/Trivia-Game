// src/App.js

import React, { useState, useEffect } from 'react';
import { Container, Typography, Snackbar, Alert, CircularProgress } from '@mui/material';
import QuestionCard from './components/QuestionCard';
import ScoreBoard from './components/ScoreBoard';
import Controls from './components/Controls';
import Hint from './components/Hint';
import {
  fetchQuestion,
  submitAnswer,
  getScore,
  resetGame,
  getHint,
  switchMode
} from './services/api';

const App = () => {
  const [questionData, setQuestionData] = useState(null);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentMode, setCurrentMode] = useState('API');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false); // Loading state
  const [buttonsDisabled, setButtonsDisabled] = useState(false); // Disable answer buttons after submission

  // Fetch initial score and question
  useEffect(() => {
    fetchCurrentScore();
    fetchNewQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMode]);

  const fetchCurrentScore = async () => {
    try {
      const response = await getScore();
      setScore(response.data.score);
      setQuestionsAnswered(response.data.questions_answered);
      setGameOver(response.data.game_over);
    } catch (error) {
      console.error('Error fetching score:', error);
      showSnackbar('Failed to fetch score.', 'error');
    }
  };

  const fetchNewQuestion = async () => {
    if (gameOver) {
      showSnackbar('Game is over. Please reset to play again.', 'info');
      return;
    }

    setLoading(true);
    setButtonsDisabled(false); // Enable buttons when loading a new question
    try {
      const response = await fetchQuestion();
      setQuestionData(response.data);
    } catch (error) {
      console.error('Error fetching question:', error);
      // Handle mode switch if backend indicates
      if (error.response && error.response.status === 429) {
        showSnackbar(error.response.data.error || 'API rate limit exceeded. Switched to CSV mode.', 'warning');
      } else {
        showSnackbar(error.response?.data?.error || 'Failed to fetch question.', 'error');
      }
    }
    setLoading(false);
  };

  const handleAnswer = async (answer) => {
    if (buttonsDisabled) return; // Prevent multiple submissions
    setButtonsDisabled(true); // Disable buttons after an answer is clicked

    try {
      const response = await submitAnswer(answer);
      const { correct, correct_answer, current_score, questions_answered, game_over } = response.data;

      setScore(current_score);
      setQuestionsAnswered(questions_answered);
      setGameOver(game_over);

      if (correct) {
        showSnackbar('Correct Answer!', 'success');
      } else {
        showSnackbar(`Incorrect! The correct answer was ${correct_answer}.`, 'error');
      }

      if (!game_over) {
        // Introduce a short delay before fetching the next question for better UX
        setTimeout(() => {
          fetchNewQuestion();
        }, 1000); // 1-second delay
      } else {
        showSnackbar('Game Over! Please reset to play again.', 'info');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      showSnackbar(error.response?.data?.error || 'Failed to submit answer.', 'error');
      setButtonsDisabled(false); // Re-enable buttons if submission failed
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const response = await resetGame();
      setScore(0);
      setQuestionsAnswered(0);
      setGameOver(false);
      setQuestionData(null);
      showSnackbar(response.data.message, 'success');
      fetchNewQuestion();
    } catch (error) {
      console.error('Error resetting game:', error);
      showSnackbar('Failed to reset game.', 'error');
    }
    setLoading(false);
  };

  const handleModeChange = async (mode) => {
    setLoading(true);
    try {
      await switchMode(mode);
      setCurrentMode(mode);
      showSnackbar(`Mode switched to ${mode}.`, 'success');
      fetchNewQuestion();
    } catch (error) {
      console.error('Error switching mode:', error);
      showSnackbar('Failed to switch mode.', 'error');
    }
    setLoading(false);
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', marginTop: 4 }}>
      <Typography variant="h3" gutterBottom>
        Geography Trivia
      </Typography>

      <ScoreBoard score={score} questionsAnswered={questionsAnswered} gameOver={gameOver} />

      {loading ? (
        <CircularProgress sx={{ marginTop: 4 }} />
      ) : (
        questionData && !gameOver && (
          <QuestionCard questionData={questionData} handleAnswer={handleAnswer} buttonsDisabled={buttonsDisabled} />
        )
      )}

      {/* Placeholder for Hint functionality */}
      <Hint hint={'/* Hint functionality to be implemented */'} />

      <Controls reset={handleReset} currentMode={currentMode} changeMode={handleModeChange} />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default App;
