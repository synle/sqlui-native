import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { Button } from '@mui/material';
import Box from '@mui/material/Box';
import { useCommands } from 'src/frontend/components/MissionControl';
import SplitButton from 'src/frontend/components/SplitButton';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useNavigate } from 'react-router-dom';

export default function NewConnectionButton() {
  const navigate = useNavigate();
  const { selectCommand } = useCommands();

  const options = [
    {
      label: 'Import',
      onClick: () => selectCommand({ event: 'clientEvent/import' }),
      startIcon: <ArrowDownwardIcon />,
    },
    {
      label: 'Export All',
      onClick: () => selectCommand({ event: 'clientEvent/exportAll' }),
      startIcon: <ArrowUpwardIcon />,
    },
    {
      label: 'Connection / Data Migration',
      onClick: () => navigate('/migration'),
      startIcon: <CompareArrowsIcon />,
    },
    {
      label: 'Collapse All Connections',
      onClick: () => selectCommand({ event: 'clientEvent/clearShowHides' }),
      startIcon: <UnfoldLessIcon />,
    },
  ];

  return (
    <Box sx={{ textAlign: 'center', marginBottom: 2, marginTop: 1 }}>
      <SplitButton
        id='new-connection-split-button'
        label='Connection'
        startIcon={<AddIcon />}
        onClick={() => selectCommand({ event: 'clientEvent/connection/new' })}
        options={options}
      />
    </Box>
  );
}
