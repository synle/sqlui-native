/** Standalone About / Check for Update dialog.
 * Can be triggered from any page (including session select) without MissionControl.
 */
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useGetServerConfigs } from "src/frontend/hooks/useServerConfigs";
import { getArchLabel } from "src/frontend/utils/buildInfo";
import { platform } from "src/frontend/platform";
import appPackage from "src/package.json";

/** Compares two semver strings. Returns true if local >= remote. */
function isVersionUpToDate(local: string, remote: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [lMajor, lMinor = 0, lPatch = 0] = parse(local);
  const [rMajor, rMinor = 0, rPatch = 0] = parse(remote);
  if (lMajor !== rMajor) return lMajor > rMajor;
  if (lMinor !== rMinor) return lMinor > rMinor;
  return lPatch >= rPatch;
}

/** Hook that returns a function to show the About dialog. */
export function useShowAboutDialog() {
  const { modal } = useActionDialogs();
  const { data: serverConfigs } = useGetServerConfigs();

  return async () => {
    const newVersion = await fetch("https://api.github.com/repos/synle/sqlui-native/releases/latest")
      .then((r) => r.json())
      .then((r) => r.tag_name)
      .catch(() => "unknown");

    const isUpToDate = isVersionUpToDate(appPackage.version, newVersion);
    const releasePageUrl = `https://github.com/synle/sqlui-native/releases/tag/${newVersion}`;

    const buildLabel =
      __BUILD_CHANNEL__ === "production" ? "Release" : `${__BUILD_CHANNEL__ === "beta" ? "Beta" : "Dev"} (${__BUILD_COMMIT__})`;
    const archLabel = getArchLabel();

    const infoRows: [string, React.ReactNode][] = [
      ["Version", appPackage.version],
      ["Latest", newVersion],
      ["Engine", `${(appPackage as any).engine || "Unknown"}${archLabel ? ` (${archLabel})` : ""}`],
      ["Build", buildLabel],
    ];

    const storageDir = serverConfigs?.storageDir || "";

    const contentDom = (
      <>
        <Chip
          label={isUpToDate ? "Up to date" : "Update available"}
          color={isUpToDate ? "success" : "warning"}
          size="small"
          sx={{ mb: 2 }}
        />
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& td": { py: 0.5, verticalAlign: "top" } }}>
          <tbody>
            {infoRows.map(([label, value]) => (
              <tr key={label}>
                <Box component="td" sx={{ fontWeight: "bold", pr: 2, whiteSpace: "nowrap", opacity: 0.7 }}>
                  {label}
                </Box>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </Box>
        {!isUpToDate && (
          <>
            <Divider sx={{ my: 2 }} />
            <Link onClick={() => platform.openExternalUrl(releasePageUrl)} sx={{ cursor: "pointer" }}>
              Download latest version
            </Link>
          </>
        )}
        <Divider sx={{ my: 2 }} />
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& td": { py: 0.5, verticalAlign: "top" } }}>
          <tbody>
            {storageDir && (
              <tr>
                <Box component="td" sx={{ fontWeight: "bold", pr: 2, whiteSpace: "nowrap", opacity: 0.7 }}>
                  Data
                </Box>
                <td>
                  <Link onClick={() => navigator.clipboard.writeText(storageDir)} sx={{ cursor: "pointer" }}>
                    {storageDir}
                  </Link>
                </td>
              </tr>
            )}
            <tr>
              <Box component="td" sx={{ fontWeight: "bold", pr: 2, whiteSpace: "nowrap", opacity: 0.7 }}>
                Home
              </Box>
              <td>
                <Link onClick={() => platform.openExternalUrl("https://synle.github.io/sqlui-native/")} sx={{ cursor: "pointer" }}>
                  synle.github.io/sqlui-native
                </Link>
              </td>
            </tr>
          </tbody>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" sx={{ opacity: 0.6 }}>
          <strong>macOS Troubleshooting:</strong> If you see "app is damaged", run in Terminal:
        </Typography>
        <Box sx={{ mt: 0.5, p: 1, bgcolor: "action.hover", borderRadius: 1, fontFamily: "monospace", fontSize: 12 }}>
          xattr -cr /Applications/sqlui-native.app
        </Box>
      </>
    );

    try {
      await modal({ title: "About", message: contentDom });
    } catch (_err) {
      // user dismissed dialog
    }
  };
}
