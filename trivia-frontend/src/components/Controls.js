// src/components/Controls.js

import React from 'react';
import { Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const Controls = ({ reset, currentMode, changeMode, isResetting }) => {
  return (
    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Button variant="outlined" color="secondary" onClick={reset} disabled={isResetting}>
        {isResetting ? 'Resetting...' : 'Reset Game'}
      </Button>
      <FormControl variant="outlined" size="small">
        <InputLabel id="mode-select-label">Mode</InputLabel>
        <Select
          labelId="mode-select-label"
          value={currentMode}
          onChange={(e) => changeMode(e.target.value)}
          label="Mode"
        >
          <MenuItem value="API">API</MenuItem>
          <MenuItem value="CSV">CSV</MenuItem>
        </Select>
      </FormControl>
    </div>
  );
};

export default Controls;
