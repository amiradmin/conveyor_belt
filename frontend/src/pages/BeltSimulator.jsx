import ConveyorSimulator from "../components/conveyor/ConveyorSimulator";
import { Box, Typography } from '@mui/material';

export default function BeltSimulator() {
  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(255, 204, 0, 0.02) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 204, 0, 0.01) 0%, transparent 50%)',
        pointerEvents: 'none',
      }
    }}>
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <ConveyorSimulator />
      </Box>
    </Box>
  );
}
