import AddIcon from "@mui/icons-material/Add";
import BackupIcon from "@mui/icons-material/Backup";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DataArrayIcon from "@mui/icons-material/DataArray";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import HomeIcon from "@mui/icons-material/Home";
import InfoIcon from "@mui/icons-material/Info";
import KeyboardCommandKeyIcon from "@mui/icons-material/KeyboardCommandKey";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PhotoSizeSelectSmallIcon from "@mui/icons-material/PhotoSizeSelectSmall";
import SettingsIcon from "@mui/icons-material/Settings";
import StarIcon from "@mui/icons-material/Star";
import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useNavigate } from "src/frontend/utils/commonUtils";
import { useEffect } from "react";
import dataApi from "src/frontend/data/api";
import DropdownButton from "src/frontend/components/DropdownButton";
import { useCommands } from "src/frontend/components/MissionControl";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useGetCurrentSession } from "src/frontend/hooks/useSession";
import ToastHistoryList from "src/frontend/components/ToastHistoryList";
import { useToastHistoryCount } from "src/frontend/hooks/useToaster";
import appPackage from "src/package.json";
import { getBuildBadge } from "src/frontend/utils/buildInfo";
import { useGetServerConfigs } from "src/frontend/hooks/useServerConfigs";

/**
 * Application header bar with session management, navigation, notifications, and command palette access.
 * @returns The rendered app header toolbar.
 */
/**
 * Detects portal mode by reading the global injected by the portal server's
 * served `index.html`. Returns false on the desktop app and dev mode.
 */
function isPortalMode(): boolean {
  try {
    return typeof (window as any).__SQLUI_PORTAL_SESSION__ === "string" && !!(window as any).__SQLUI_PORTAL_SESSION__;
  } catch {
    return false;
  }
}

export default function AppHeader() {
  const navigate = useNavigate();
  const { data: currentSession, isLoading } = useGetCurrentSession();
  const { selectCommand } = useCommands();
  const { modal } = useActionDialogs();
  const toastHistoryCount = useToastHistoryCount();
  const { data: serverConfigs } = useGetServerConfigs();

  const portalMode = isPortalMode();
  // Build the suffix shown in the title bar in portal mode:
  //   "Portal (PID=82242) — 127.0.0.1:19378 — /Users/syle/.sqlui-portal"
  // Each segment is conditionally appended so we don't render trailing
  // separators when the data hasn't loaded yet (or PID isn't available).
  const portalSuffix = (() => {
    if (!portalMode) return null;
    const pid = serverConfigs?.serverPid;
    const host = typeof window !== "undefined" ? window.location.host : "";
    const storage = serverConfigs?.storageDir;
    const head = pid ? `Portal (PID=${pid})` : "Portal";
    const parts: string[] = [head];
    if (host) parts.push(host);
    if (storage) parts.push(storage);
    return parts.join(" — ");
  })();

  const options = [
    {
      label: currentSession?.name || "",
      onClick: () => selectCommand({ event: "clientEvent/navigate", data: "/" }),
      startIcon: <HomeIcon />,
    },
    {
      label: "divider",
    },
    {
      label: "New Session",
      onClick: () => selectCommand({ event: "clientEvent/session/new" }),
      startIcon: <AddIcon />,
    },
    {
      label: "Change Session",
      onClick: () => selectCommand({ event: "clientEvent/session/switch" }),
      startIcon: <PhotoSizeSelectSmallIcon />,
    },
    {
      label: "Rename Session",
      onClick: () => selectCommand({ event: "clientEvent/session/rename" }),
      startIcon: <EditIcon />,
    },
    {
      label: "Clone Session",
      onClick: () => selectCommand({ event: "clientEvent/session/clone" }),
      startIcon: <ContentCopyIcon />,
    },
    {
      label: "Delete Session",
      onClick: () => selectCommand({ event: "clientEvent/session/delete" }),
      startIcon: <DeleteIcon />,
    },
    {
      label: "divider",
    },
    {
      label: "Command Palette",
      onClick: () => selectCommand({ event: "clientEvent/showCommandPalette" }),
      startIcon: <KeyboardCommandKeyIcon />,
    },
    {
      label: "Search Schema",
      onClick: () => selectCommand({ event: "clientEvent/schema/search" }),
      startIcon: <SearchIcon />,
    },
    {
      label: "Data Migration",
      onClick: () => navigate("/migration"),
      startIcon: <BackupIcon />,
    },
    {
      label: "Bookmarks",
      onClick: () => selectCommand({ event: "clientEvent/bookmark/show" }), // () => navigate('/bookmarks')
      startIcon: <StarIcon />,
    },
    {
      label: "Recycle Bin",
      onClick: () => navigate("/recycle_bin"),
      startIcon: <DeleteIcon />,
    },
    {
      label: "Query History",
      onClick: () => navigate("/query_history"),
      startIcon: <HistoryIcon />,
    },
    {
      label: "Data Snapshots",
      onClick: () => selectCommand({ event: "clientEvent/openAppWindow", data: "/data_snapshot" }),
      startIcon: <DataArrayIcon />,
    },
    {
      label: "divider",
    },
    {
      label: "Settings",
      onClick: () => selectCommand({ event: "clientEvent/showSettings" }),
      startIcon: <SettingsIcon />,
    },
    {
      label: "Backup Database",
      onClick: async () => {
        try {
          await dataApi.backupDatabase();
        } catch (err) {
          console.error("AppHeader:backupDatabase", err);
        }
      },
      startIcon: <CloudDownloadIcon />,
    },

    {
      label: "divider",
    },
    {
      label: "Check for update",
      onClick: () => selectCommand({ event: "clientEvent/checkForUpdate" }),
      startIcon: <InfoIcon />,
    },
  ];

  useEffect(() => {
    let newTitle;
    if (currentSession?.name) {
      newTitle = `${currentSession?.name}`;
    } else {
      newTitle = `SQLUI Native`;
    }
    window.document.title = newTitle;
  }, [currentSession?.name]);

  return (
    <AppBar
      position="static"
      // Tint the bar in portal mode so it's visually distinct from the desktop app.
      // `primary` (blue) — neutral, calmer than red/error, but still clearly
      // different from desktop's `default` dark grey. Desktop keeps default.
      //
      // `enableColorOnDark` is REQUIRED — MUI v5+ ignores the `color` prop on
      // AppBar in dark mode unless this is set, which silently makes the bar
      // render as the same dark grey regardless of the chosen palette token.
      color={portalMode ? "primary" : "default"}
      enableColorOnDark
    >
      <Toolbar variant="dense">
        {/*
          No per-element color overrides — every text/icon in the toolbar
          inherits from the AppBar's `color` prop above. That way the whole
          bar tints uniformly when portal mode flips it to `secondary`, and
          the desktop bar stays consistent with the theme's contrastText.
        */}
        <Typography variant="h5" onClick={() => navigate("/")} sx={{ cursor: "pointer", fontWeight: "bold", mr: 3 }}>
          SQLUI NATIVE {appPackage.version} {getBuildBadge()}
        </Typography>

        {portalSuffix ? (
          // Portal mode: show host:port and storage dir inline so users always
          // know where they're connected and where state is persisted.
          <Tooltip title="Portal mode — host:port and storage directory.">
            <Typography variant="subtitle1" sx={{ mr: "auto", fontFamily: "monospace" }}>
              ({portalSuffix})
            </Typography>
          </Tooltip>
        ) : (
          <Tooltip title="This is the current session name. Click to rename it.">
            <Typography
              variant="subtitle1"
              sx={{ cursor: "pointer", mr: "auto", fontFamily: "monospace" }}
              onClick={() => selectCommand({ event: "clientEvent/session/rename" })}
            >
              ({currentSession?.name})
            </Typography>
          </Tooltip>
        )}

        <Tooltip title="Notification History">
          <IconButton
            aria-label="Notification History"
            color="inherit"
            onClick={async () => {
              try {
                await modal({
                  title: "Notification History",
                  message: <ToastHistoryList />,
                  showCloseButton: true,
                  isFullScreen: true,
                });
              } catch (_err) {}
            }}
          >
            <Badge badgeContent={toastHistoryCount} color="error" max={99}>
              <NotificationsIcon fontSize="inherit" />
            </Badge>
          </IconButton>
        </Tooltip>

        <DropdownButton id="session-action-split-button" options={options} isLoading={isLoading}>
          <IconButton aria-label="Table Actions" color="inherit">
            <MenuIcon fontSize="inherit" color="inherit" />
          </IconButton>
        </DropdownButton>
      </Toolbar>
    </AppBar>
  );
}
