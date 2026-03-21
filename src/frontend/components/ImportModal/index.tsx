/** Import modal component for importing connections, queries, and bookmarks. */
import FileOpenIcon from "@mui/icons-material/FileOpen";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import React, { useRef, useState } from "react";
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
  const hasValue = !!value.trim();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { add: addToast } = useToaster();

  /** Reads a file and sets its text content into the editor. */
  const loadFile = (file: File) => {
    if (!file.name.endsWith(".json")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setValue(reader.result);
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
          onChange={setValue}
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
        <Button variant="text" size="small" startIcon={<FileOpenIcon />} onClick={() => fileInputRef.current?.click()}>
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
