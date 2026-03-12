import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import SessionSelectionForm from "src/frontend/components/SessionSelectionForm";

/**
 * Page shown on first visit when no session ID is set.
 * Displays the session selection form so the user can pick or create a session.
 */
export default function SessionSelectPage() {
  return (
    <Box sx={{ maxWidth: 600, margin: "0 auto", padding: 3 }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        Welcome to SQLUI Native. Please select or create a session to get started.
      </Alert>
      <SessionSelectionForm isFirstTime={true} />
    </Box>
  );
}
