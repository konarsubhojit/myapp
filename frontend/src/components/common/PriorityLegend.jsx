import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

function PriorityLegend() {
  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Priority Indicators:
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Overdue" color="error" size="small" />
          <Typography variant="caption" color="text.secondary">Past</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Due Today" color="warning" size="small" />
          <Typography variant="caption" color="text.secondary">Today</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="1-3d" color="warning" variant="outlined" size="small" />
          <Typography variant="caption" color="text.secondary">Soon</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Normal" color="success" size="small" />
          <Typography variant="caption" color="text.secondary">Later</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default PriorityLegend;
