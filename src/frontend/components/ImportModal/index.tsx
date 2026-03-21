/** Import modal component for importing connections, queries, and bookmarks. */
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import React, { useState } from "react";
import CodeEditorBox from "src/frontend/components/CodeEditorBox";

/** Import mode determining how IDs are handled during import. */
export type ImportMode = "keepIds" | "stripIds";

/** Props for the ImportModal content component. */
type ImportModalProps = {
  onImport: (rawJson: string, mode: ImportMode) => void;
  initialValue?: string;
};

/**
 * Modal content for importing connections, queries, and bookmarks.
 * Provides a code editor for pasting JSON, a mode selector for ID handling, and an import button.
 * @param props - Import modal configuration including onImport callback.
 * @returns The rendered import modal content.
 */
export default function ImportModal(props: ImportModalProps): JSX.Element {
  const [value, setValue] = useState(props.initialValue || "");
  const [mode, setMode] = useState<ImportMode>("keepIds");
  const hasValue = !!value.trim();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", gap: 1 }}>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <CodeEditorBox
          value={value}
          onChange={setValue}
          language="json"
          autoFocus={true}
          wordWrap={true}
          fillHeight={true}
          hideEditorSize={true}
          hideEditorSyntax={true}
        />
      </Box>
      <FormControl>
        <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as ImportMode)}>
          <FormControlLabel value="keepIds" control={<Radio size="small" />} label="Update existing if IDs match (upsert)" />
          <FormControlLabel value="stripIds" control={<Radio size="small" />} label="Import as new (ignore IDs)" />
        </RadioGroup>
      </FormControl>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
        {!hasValue && (
          <Alert severity="error" sx={{ py: 0 }}>
            This input is required
          </Alert>
        )}
        <Button variant="outlined" disabled={!hasValue} onClick={() => props.onImport(value.trim(), mode)}>
          Import
        </Button>
      </Box>
    </Box>
  );
}
