// src/components/ScoreBoard.js

import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

const ScoreBoard = ({ score, questionsAnswered, gameOver }) => {
  return (
    <Card variant="outlined" sx={{ marginTop: 2 }}>
      <CardContent>
        <Typography variant="h6">
          Score: {score} / {questionsAnswered}
        </Typography>
        {gameOver && (
          <Typography variant="h5" color="primary">
            Game Over! Your final score is {score}.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreBoard;
