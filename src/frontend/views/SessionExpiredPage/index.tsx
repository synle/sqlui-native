import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import SessionSelectionForm from "src/frontend/components/SessionSelectionForm";

/**
 * Page shown when the current session has been deleted or is no longer valid.
 * Displays a warning and the session selection form so the user can pick or create a new session.
 */
export default function SessionExpiredPage() {
  return (
    <Box sx={{ maxWidth: 600, margin: "0 auto", padding: 3 }}>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Your session has been deleted and is no longer valid.
      </Alert>
      <SessionSelectionForm isFirstTime={true} />
    </Box>
  );
}
