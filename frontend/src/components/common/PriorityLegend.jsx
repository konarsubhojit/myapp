import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

function PriorityLegend() {
  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={600}>
        Priority Levels (Production Time: 1-2 weeks)
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Overdue" color="error" size="small" />
          <Typography variant="caption" color="text.secondary">Past due date</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Critical" color="error" size="small" />
          <Typography variant="caption" color="text.secondary">≤3 days (rush needed)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Urgent" color="warning" size="small" />
          <Typography variant="caption" color="text.secondary">4-7 days (tight)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Medium" color="info" size="small" />
          <Typography variant="caption" color="text.secondary">8-14 days (standard)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label="Normal" color="success" size="small" />
          <Typography variant="caption" color="text.secondary">>14 days (comfortable)</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default PriorityLegend;
