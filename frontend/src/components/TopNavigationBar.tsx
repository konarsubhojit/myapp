import { useState, type ReactElement, type MouseEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { NAVIGATION_GROUPS, type NavigationGroup, type NavigationRoute } from '../constants/navigation'

interface TopNavigationBarProps {
  currentRoute: string
  onNavigate: (routeId: string) => void
}

interface GroupMenuState {
  anchorEl: HTMLElement | null
  groupId: string | null
}

function TopNavigationBar({ currentRoute, onNavigate }: TopNavigationBarProps): ReactElement {
  const [menuState, setMenuState] = useState<GroupMenuState>({
    anchorEl: null,
    groupId: null,
  })

  const handleGroupClick = (event: MouseEvent<HTMLButtonElement>, groupId: string) => {
    setMenuState({
      anchorEl: event.currentTarget,
      groupId,
    })
  }

  const handleMenuClose = () => {
    setMenuState({
      anchorEl: null,
      groupId: null,
    })
  }

  const handleRouteClick = (routeId: string) => {
    onNavigate(routeId)
    handleMenuClose()
  }

  const isRouteInGroup = (group: NavigationGroup): boolean => {
    return group.routes.some((route) => route.id === currentRoute)
  }

  return (
    <Box
      component="nav"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {NAVIGATION_GROUPS.map((group: NavigationGroup) => {
        const isActive = isRouteInGroup(group)
        const isMenuOpen = menuState.groupId === group.id

        return (
          <Box key={group.id}>
            <Button
              onClick={(e) => handleGroupClick(e, group.id)}
              endIcon={<ExpandMoreIcon />}
              sx={{
                color: isActive ? '#5568d3' : '#64748b',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                textTransform: 'none',
                px: 2,
                py: 1,
                borderRadius: 1,
                position: 'relative',
                '&:hover': {
                  bgcolor: '#f0f4ff',
                  color: '#5568d3',
                },
                '&::after': isActive
                  ? {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '80%',
                      height: '2px',
                      bgcolor: '#5568d3',
                      borderRadius: '2px 2px 0 0',
                    }
                  : {},
              }}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              aria-controls={isMenuOpen ? `${group.id}-menu` : undefined}
            >
              {group.label}
            </Button>
            <Menu
              id={`${group.id}-menu`}
              anchorEl={menuState.anchorEl}
              open={isMenuOpen && menuState.groupId === group.id}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              sx={{
                '& .MuiPaper-root': {
                  mt: 0.5,
                  minWidth: 200,
                  borderRadius: 2,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #e2e8f0',
                },
              }}
            >
              {group.routes.map((route: NavigationRoute) => (
                <MenuItem
                  key={route.id}
                  onClick={() => handleRouteClick(route.id)}
                  selected={currentRoute === route.id}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&.Mui-selected': {
                      bgcolor: '#f0f4ff',
                      '&:hover': {
                        bgcolor: '#e0eaff',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: currentRoute === route.id ? '#5568d3' : '#64748b',
                    }}
                  >
                    {route.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={route.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: currentRoute === route.id ? 600 : 400,
                      color: currentRoute === route.id ? '#1e293b' : '#475569',
                    }}
                  />
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )
      })}
    </Box>
  )
}

export default TopNavigationBar
