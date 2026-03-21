/** Import modal component for importing connections, queries, and bookmarks. */
import FileOpenIcon from "@mui/icons-material/FileOpen";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import React, { useCallback, useRef, useState } from "react";
import CodeEditorBox from "src/frontend/components/CodeEditorBox";
import useToaster from "src/frontend/hooks/useToaster";

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
  const [hasContent, setHasContent] = useState(!!props.initialValue?.trim());
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveValueRef = useRef(props.initialValue || "");
  const { add: addToast } = useToaster();

  /** Supported _type values for import rows. */
  const VALID_TYPES = ["connection", "query", "bookmark"];

  /**
   * Validates the raw JSON string and returns an error message or empty string if valid.
   * @param raw - The raw JSON string to validate.
   * @returns Error message string, or empty string if valid.
   */
  const validate = (raw: string): string => {
    if (!raw.trim()) return "";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (_err) {
      return "Invalid JSON format. Please check your input.";
    }
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    for (const row of rows) {
      if (!row._type || !VALID_TYPES.includes(row._type)) {
        return `Each entry must have a valid _type (${VALID_TYPES.join(", ")}). Please check your input.`;
      }
    }
    return "";
  };

  /** Handles live content changes from the editor without updating value state. */
  const onLiveChange = useCallback((newValue: string) => {
    liveValueRef.current = newValue;
    const trimmed = newValue.trim();
    setHasContent(!!trimmed);
    setError(trimmed ? validate(trimmed) : "");
  }, []);

  /** Updates value state and syncs hasContent flag, live ref, and validation. */
  const updateValue = (newValue: string) => {
    setValue(newValue);
    liveValueRef.current = newValue;
    const trimmed = newValue.trim();
    setHasContent(!!trimmed);
    setError(trimmed ? validate(trimmed) : "");
  };

  /** Reads a file and sets its text content into the editor. */
  const loadFile = (file: File) => {
    if (!file.name.endsWith(".json")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateValue(reader.result);
      }
    };
    reader.readAsText(file);
  };

  /** Handles file selection from the hidden input and loads JSON content into the editor. */
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = "";
  };

  /** Handles file drop onto the modal and loads JSON content into the editor. */
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) {
      addToast({ message: "No file detected. Please drop a .json file.", autoHideDuration: 4000 });
      return;
    }
    if (files.length > 1) {
      addToast({ message: "Only one file can be imported at a time.", autoHideDuration: 4000 });
      return;
    }
    const file = files[0];
    if (!file.name.endsWith(".json")) {
      addToast({ message: "Only .json files are supported.", autoHideDuration: 4000 });
      return;
    }
    loadFile(file);
  };

  /** Prevents default browser behavior on drag over to enable drop. */
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", gap: 1 }} onDrop={onDrop} onDragOver={onDragOver}>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <CodeEditorBox
          value={value}
          onChange={updateValue}
          onLiveChange={onLiveChange}
          language="json"
          autoFocus={true}
          wordWrap={true}
          fillHeight={true}
          hideEditorSize={true}
          hideEditorSyntax={true}
        />
      </Box>
      <Box>
        <input ref={fileInputRef} type="file" accept=".json" onChange={onFileSelected} style={{ display: "none" }} />
        <Button variant="outlined" size="small" startIcon={<FileOpenIcon />} onClick={() => fileInputRef.current?.click()}>
          Load from File
        </Button>
      </Box>
      <FormControl>
        <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as ImportMode)}>
          <FormControlLabel value="keepIds" control={<Radio size="small" />} label="Update existing if IDs match (upsert)" />
          <FormControlLabel value="stripIds" control={<Radio size="small" />} label="Import as new (ignore IDs)" />
        </RadioGroup>
      </FormControl>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
        {!hasContent && (
          <Alert severity="error" sx={{ py: 0 }}>
            This input is required
          </Alert>
        )}
        {hasContent && error && (
          <Alert severity="error" sx={{ py: 0 }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          disabled={!hasContent || !!error}
          onClick={() => {
            const raw = (liveValueRef.current || value).trim();
            const validationError = validate(raw);
            if (validationError) {
              setError(validationError);
              return;
            }
            props.onImport(raw, mode);
          }}
        >
          Import
        </Button>
      </Box>
    </Box>
  );
}
