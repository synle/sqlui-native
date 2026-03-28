/** Modal body for editing a folder's name and variables. */

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";

/** A single variable entry. */
type Variable = {
  /** Variable name. */
  key: string;
  /** Variable value. */
  value: string;
  /** Whether this variable is active. */
  enabled: boolean;
};

/** Props for the EditFolderModalBody component. */
type EditFolderModalBodyProps = {
  /** Current folder name. */
  name: string;
  /** Current folder variables. */
  variables: Variable[];
  /** Callback when user clicks Save. */
  onSave: (name: string, variables: Variable[]) => void;
  /** Callback when user clicks Cancel. */
  onCancel: () => void;
};

/**
 * Modal body for editing a folder's name and variables.
 * @param props - Current name/variables and save/cancel callbacks.
 * @returns The edit folder form.
 */
export default function EditFolderModalBody(props: EditFolderModalBodyProps): JSX.Element {
  const [name, setName] = useState(props.name);
  const [variables, setVariables] = useState<Variable[]>(props.variables);

  /** Adds a new empty variable row. */
  const onAddVariable = () => {
    setVariables([...variables, { key: "", value: "", enabled: true }]);
  };

  /** Updates a variable field at the given index. */
  const onUpdateVariable = (index: number, field: keyof Variable, val: string | boolean) => {
    setVariables(variables.map((v, i) => (i === index ? { ...v, [field]: val } : v)));
  };

  /** Removes a variable at the given index. */
  const onRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 400 }}>
      <TextField
        label="Folder Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="small"
        fullWidth
        required
        autoFocus
        autoComplete="off"
      />
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <Typography variant="subtitle2">Folder Variables</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={onAddVariable}>
            Add Variable
          </Button>
        </div>
        <Typography variant="body2" sx={{ opacity: 0.6, fontSize: "0.75rem", mb: 1 }}>
          Folder variables override connection variables with the same name.
        </Typography>
        {variables.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Name</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {variables.map((variable, idx) => (
                  <TableRow key={idx}>
                    <TableCell padding="checkbox">
                      <Tooltip title={variable.enabled ? "Enabled" : "Disabled"}>
                        <Checkbox
                          checked={variable.enabled}
                          onChange={(e) => onUpdateVariable(idx, "enabled", e.target.checked)}
                          size="small"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={variable.key}
                        onChange={(e) => onUpdateVariable(idx, "key", e.target.value)}
                        size="small"
                        variant="standard"
                        placeholder="VARIABLE_NAME"
                        fullWidth
                        autoComplete="off"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={variable.value}
                        onChange={(e) => onUpdateVariable(idx, "value", e.target.value)}
                        size="small"
                        variant="standard"
                        placeholder="value"
                        fullWidth
                        autoComplete="off"
                      />
                    </TableCell>
                    <TableCell padding="checkbox">
                      <Tooltip title="Remove variable">
                        <IconButton size="small" onClick={() => onRemoveVariable(idx)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button variant="contained" size="small" onClick={() => props.onSave(name, variables)} disabled={!name.trim()}>
          Save
        </Button>
        <Button variant="outlined" size="small" onClick={props.onCancel}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
