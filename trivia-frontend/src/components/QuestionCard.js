// src/components/QuestionCard.js

import React from 'react';
import { Card, CardContent, Typography, Button, Grid } from '@mui/material';

const QuestionCard = ({ questionData, handleAnswer, buttonsDisabled }) => {
  const { question, answers } = questionData;

  return (
    <Card variant="outlined" sx={{ marginTop: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {question}
        </Typography>
        <Grid container spacing={2}>
          {answers.map((answer, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => handleAnswer(answer)}
                disabled={buttonsDisabled}
              >
                {answer}
              </Button>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default QuestionCard;
