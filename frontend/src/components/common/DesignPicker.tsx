import { useEffect, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardActionArea from '@mui/material/CardActionArea';
import Grid from '@mui/material/Grid2';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import type { ItemDesign } from '../../types';

interface DesignPickerProps {
  designs: ItemDesign[];
  selectedDesignId?: number;
  onDesignSelect: (designId: number) => void;
}

function DesignPicker({ 
  designs, 
  selectedDesignId, 
  onDesignSelect 
}: DesignPickerProps): ReactElement {
  useEffect(() => {
    if (!selectedDesignId && designs.length > 0) {
      const primaryDesign = designs.find(d => d.isPrimary) || designs[0];
      onDesignSelect(primaryDesign.id);
    }
  }, [designs, selectedDesignId, onDesignSelect]);

  if (designs.length === 0) {
    return (
      <Box 
        sx={{ 
          p: 2, 
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          textAlign: 'center',
          bgcolor: 'background.default'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No design variants available for this item
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
        Select Design Variant
      </Typography>
      <Grid container spacing={2}>
        {designs.map((design) => {
          const isSelected = selectedDesignId === design.id;
          
          return (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={design.id}>
              <Card 
                variant={isSelected ? 'elevation' : 'outlined'}
                sx={{
                  position: 'relative',
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
              >
                <CardActionArea onClick={() => onDesignSelect(design.id)}>
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      height="120"
                      image={design.imageUrl}
                      alt={design.designName}
                      sx={{ objectFit: 'cover' }}
                    />
                    
                    {isSelected && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          bgcolor: 'primary.main',
                          color: 'white',
                          borderRadius: '50%',
                          width: 28,
                          height: 28,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <CheckCircleIcon fontSize="small" />
                      </Box>
                    )}
                    
                    {design.isPrimary && (
                      <Chip
                        label="Primary"
                        size="small"
                        icon={<StarIcon />}
                        sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          right: 8,
                          height: 24,
                          fontSize: '0.7rem'
                        }}
                      />
                    )}
                  </Box>
                  
                  <Box sx={{ p: 1, textAlign: 'center' }}>
                    <Typography 
                      variant="caption" 
                      fontWeight={isSelected ? 600 : 400}
                      color={isSelected ? 'primary' : 'text.secondary'}
                      sx={{ 
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {design.designName}
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

export default DesignPicker;
