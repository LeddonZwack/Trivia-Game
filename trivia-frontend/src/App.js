// src/App.js

import React, { useState, useEffect } from 'react';
import { Container, Typography, Snackbar, Alert } from '@mui/material';
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

    try {
      const response = await fetchQuestion();
      setQuestionData(response.data);
    } catch (error) {
      console.error('Error fetching question:', error);
      showSnackbar(error.response?.data?.error || 'Failed to fetch question.', 'error');
    }
  };

  const handleAnswer = async (answer) => {
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
        fetchNewQuestion();
      } else {
        showSnackbar('Game Over! Please reset to play again.', 'info');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      showSnackbar(error.response?.data?.error || 'Failed to submit answer.', 'error');
    }
  };

  const handleReset = async () => {
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
  };

  const handleModeChange = async (mode) => {
    try {
      await switchMode(mode);
      setCurrentMode(mode);
      showSnackbar(`Mode switched to ${mode}.`, 'success');
    } catch (error) {
      console.error('Error switching mode:', error);
      showSnackbar('Failed to switch mode.', 'error');
    }
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

      {questionData && !gameOver && (
        <QuestionCard questionData={questionData} handleAnswer={handleAnswer} />
      )}

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
