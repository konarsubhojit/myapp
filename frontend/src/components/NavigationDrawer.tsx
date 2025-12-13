import { useState, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import MenuIcon from '@mui/icons-material/Menu'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { NAVIGATION_GROUPS, type NavigationGroup } from '../constants/navigation.tsx'

const DRAWER_WIDTH = 240
// Match AppBar heights from App.tsx
const APPBAR_HEIGHT_MOBILE = 56
const APPBAR_HEIGHT_DESKTOP = 64

interface NavigationDrawerProps {
  currentRoute: string
  onNavigate: (routeId: string) => void
}

function NavigationDrawer({ currentRoute, onNavigate }: NavigationDrawerProps): ReactElement {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    orders: true,
    items: true,
    analytics: true,
  })

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleGroupToggle = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  const handleNavigate = (routeId: string) => {
    onNavigate(routeId)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box
          sx={{
            fontWeight: 700,
            fontSize: '1.25rem',
            background: 'linear-gradient(135deg, #5568d3 0%, #667eea 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Navigation
        </Box>
      </Box>
      <Divider />
      <List>
        {NAVIGATION_GROUPS.map((group: NavigationGroup) => (
          <Box key={group.id}>
            <ListItemButton onClick={() => handleGroupToggle(group.id)}>
              <ListItemText
                primary={group.label}
                primaryTypographyProps={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              />
              {expandedGroups[group.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </ListItemButton>
            <Collapse in={expandedGroups[group.id]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {group.routes.map((route) => (
                  <ListItem key={route.id} disablePadding>
                    <ListItemButton
                      selected={currentRoute === route.id}
                      onClick={() => handleNavigate(route.id)}
                      sx={{
                        pl: 4,
                        '&.Mui-selected': {
                          bgcolor: 'primary.50',
                          borderRight: '3px solid',
                          borderColor: 'primary.main',
                          '&:hover': {
                            bgcolor: 'primary.100',
                          },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 40,
                          color: currentRoute === route.id ? 'primary.main' : 'text.secondary',
                        }}
                      >
                        {route.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={route.label}
                        primaryTypographyProps={{
                          fontWeight: currentRoute === route.id ? 600 : 400,
                          fontSize: '0.875rem',
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>
        ))}
      </List>
    </Box>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH,
            borderRight: '1px solid',
            borderColor: 'divider',
            top: { xs: APPBAR_HEIGHT_MOBILE, sm: APPBAR_HEIGHT_DESKTOP },
            height: `calc(100% - ${APPBAR_HEIGHT_DESKTOP}px)`,
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  )
}

export default NavigationDrawer
export { DRAWER_WIDTH }
