// src/components/Hint.js

import React from 'react';
import { Button, Typography } from '@mui/material';

const Hint = ({ hint }) => {
  return (
    <div style={{ marginTop: '20px' }}>
      <Button variant="contained" disabled>
        Get Hint
      </Button>
      <Typography variant="body1" color="textSecondary" sx={{ marginTop: 1 }}>
        Hint: {/* Hint functionality to be implemented */}
      </Typography>
    </div>
  );
};

export default Hint;
