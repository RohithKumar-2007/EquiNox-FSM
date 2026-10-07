import { useContext } from 'react';

import {
  alpha,
  Box,
  Divider,
  IconButton,
  lighten,
  Stack,
  styled,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import MenuTwoToneIcon from '@mui/icons-material/MenuTwoTone';
import { SidebarContext } from 'src/contexts/SidebarContext';
import ArrowBackTwoToneIcon from '@mui/icons-material/ArrowBackTwoTone';
import CloseTwoToneIcon from '@mui/icons-material/CloseTwoTone';
import DarkModeTwoToneIcon from '@mui/icons-material/DarkModeTwoTone';
import LightModeTwoToneIcon from '@mui/icons-material/LightModeTwoTone';
import { ThemeContext } from 'src/theme/ThemeProvider';

import HeaderButtons from './Buttons';
import HeaderUserbox from './Userbox';
import { useTranslation } from 'react-i18next';
import { TitleContext } from '../../../contexts/TitleContext';
import { useNavigate, useLocation } from 'react-router-dom';

const HeaderWrapper = styled(Box)(
  ({ theme }) => `
        height: ${theme.header.height};
        color: ${theme.header.textColor};
        padding: ${theme.spacing(0, 2)};
        right: 0;
        z-index: 6;
        background-color: ${alpha(theme.header.background, 0.95)};
        backdrop-filter: blur(3px);
        position: fixed;
        justify-content: space-between;
        width: 100%;
        @media (min-width: ${theme.breakpoints.values.lg}px) {
            left: ${theme.sidebar.width};
            width: auto;
        }
`
);

function Header() {
  const { sidebarToggle, toggleSidebar } = useContext(SidebarContext);
  const { title } = useContext(TitleContext);
  const theme = useTheme();
  const setThemeName = useContext(ThemeContext);
  const isDark = theme.palette.mode === 'dark';
  const themeToggleLabel = isDark
    ? 'Switch to light mode'
    : 'Switch to dark mode';

  const toggleTheme = () => {
    if (isDark) {
      setThemeName(localStorage.getItem('appLightTheme') || 'PureLightTheme');
    } else {
      localStorage.setItem(
        'appLightTheme',
        localStorage.getItem('appTheme') || 'PureLightTheme'
      );
      setThemeName('DarkTheme');
    }
  };
  const { t }: { t: any } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <HeaderWrapper
      display="flex"
      alignItems="center"
      sx={{
        boxShadow:
          theme.palette.mode === 'dark'
            ? `0 1px 0 ${alpha(
                lighten(theme.colors.primary.main, 0.7),
                0.15
              )}, 0px 2px 8px -3px rgba(0, 0, 0, 0.2), 0px 5px 22px -4px rgba(0, 0, 0, .1)`
            : `0px 2px 8px -3px ${alpha(
                theme.colors.alpha.black[100],
                0.2
              )}, 0px 5px 22px -4px ${alpha(
                theme.colors.alpha.black[100],
                0.1
              )}`
      }}
    >
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        alignItems="center"
        spacing={2}
      >
        <IconButton
          onClick={() => navigate(-1)}
          disabled={location.key === 'default'}
        >
          <ArrowBackTwoToneIcon />
        </IconButton>
        <Typography variant="h2">{title}</Typography>
      </Stack>
      <Box display="flex" alignItems="center">
        <Tooltip arrow title={t(themeToggleLabel)}>
          <IconButton
            onClick={toggleTheme}
            aria-label={t(themeToggleLabel)}
            aria-pressed={isDark}
            color="inherit"
            sx={{ mr: 1 }}
          >
            {isDark ? <LightModeTwoToneIcon /> : <DarkModeTwoToneIcon />}
          </IconButton>
        </Tooltip>
        <HeaderButtons />
        <HeaderUserbox />
        <Box
          component="span"
          sx={{
            ml: 2,
            display: { lg: 'none', xs: 'inline-block' }
          }}
        >
          <Tooltip arrow title={t('toggle_menu')}>
            <IconButton color="primary" onClick={toggleSidebar}>
              {!sidebarToggle ? (
                <MenuTwoToneIcon fontSize="small" />
              ) : (
                <CloseTwoToneIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </HeaderWrapper>
  );
}

export default Header;
