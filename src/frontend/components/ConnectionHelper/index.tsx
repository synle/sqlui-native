import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import { getConnectionFormInputs, getConnectionStringFormat, SUPPORTED_DIALECTS } from "src/common/adapters/DataScriptFactory";
import Select from "src/frontend/components/Select";

/** Form input fields for building a database connection string. */
type ConnectionHelperFormInputs = {
  scheme: string;
  username: string;
  password: string;
  host: string;
  port: string;
  restOfConnectionString: string;
};

/** Props for the ConnectionHelper component, extending form inputs with callbacks. */
type ConnectionHelperProps = ConnectionHelperFormInputs & {
  /** Called with the generated connection string when the user clicks Apply (dialog) or on every change (inline). */
  onChange: (newConnection: string) => void;
  /** Called when the user cancels the connection helper. Optional in inline mode. */
  onClose?: () => void;
  /** When true, renders inline without Apply/Cancel buttons and auto-syncs on every change. */
  inline?: boolean;
};

/**
 * Builds a connection string from form values based on the dialect's format.
 * @param formValues - All form field values keyed by field name.
 * @param formInputs - The dialect-specific form input definitions.
 * @returns The generated connection string.
 */
function buildConnectionString(formValues: Record<string, string>, formInputs: string[][]): string {
  const format = getConnectionStringFormat(formValues.scheme);

  let connection = `${formValues.scheme}://`;

  if (format === "json") {
    // JSON format: scheme://{"field1":"val1","field2":"val2"}
    const jsonObj: Record<string, string> = {};
    for (const [inputKey] of formInputs) {
      if (formValues[inputKey]) {
        jsonObj[inputKey] = formValues[inputKey];
      }
    }
    connection += JSON.stringify(jsonObj);
  } else if (formInputs.length === 1) {
    connection += `${formValues[formInputs[0][0]] || ""}`;
  } else {
    if (formValues.username && formValues.password) {
      connection += `${encodeURIComponent(formValues.username)}:${encodeURIComponent(formValues.password)}`;
    }
    connection += `@${formValues.host || ""}`;
    if (formValues.port) {
      connection += `:${formValues.port}`;
    }
  }

  return connection;
}

/**
 * A form-based helper for constructing database connection strings.
 * Displays dialect-specific input fields and generates the connection URL.
 * Supports URL-based (default) and JSON-based connection string formats.
 * @param props - Connection helper properties including initial values and callbacks.
 * @returns The connection helper form.
 */
export default function ConnectionHelper(props: ConnectionHelperProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({
    scheme: props.scheme || "",
    username: props.username || "",
    password: props.password || "",
    host: props.host || "",
    port: props.port || "",
    restOfConnectionString: props.restOfConnectionString || "",
  });

  const formInputs = getConnectionFormInputs(formValues.scheme);
  const connection = buildConnectionString(formValues, formInputs);

  const onChange = (fieldKey: string, fieldValue: string) => {
    setFormValues((prev) => ({ ...prev, [fieldKey]: fieldValue }));
  };

  // In inline mode, auto-sync the generated connection string to the parent on every change.
  useEffect(() => {
    if (props.inline) {
      props.onChange(connection);
    }
  }, [connection, props.inline]);

  // construct the final
  const onApply = () => props.onChange(connection);

  const formDom =
    formInputs.length === 0 ? (
      <div className="FormInput__Row">This database scheme is not supported by the connection helper</div>
    ) : (
      formInputs.map(([inputKey, inputLabel, optionalFlag], idx) => {
        const isRequired = optionalFlag !== "optional";
        return (
          <div className="FormInput__Row" key={idx + inputKey}>
            <TextField
              label={inputLabel}
              value={formValues[inputKey] || ""}
              onChange={(e) => onChange(inputKey, e.target.value)}
              required={isRequired}
              size="small"
              fullWidth={true}
            />
          </div>
        );
      })
    );

  const schemeSelectorDom = (
    <div className="FormInput__Row">
      <Select required onChange={(newScheme) => onChange("scheme", newScheme)} value={formValues.scheme}>
        <option value="">Select a Scheme</option>
        {SUPPORTED_DIALECTS.sort().map((dialect) => (
          <option key={dialect} value={dialect}>
            {dialect}
          </option>
        ))}
      </Select>
    </div>
  );

  const generatedConnectionDom = (
    <div className="FormInput__Row">
      <TextField
        label="Generated Connection String"
        value={connection}
        disabled={true}
        required
        size="small"
        fullWidth={true}
        slotProps={{ input: { readOnly: true } }}
      />
    </div>
  );

  if (props.inline) {
    return (
      <div className="FormInput__Container">
        {schemeSelectorDom}
        {formDom}
        {generatedConnectionDom}
      </div>
    );
  }

  return (
    <form
      className="FormInput__Container"
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
    >
      {schemeSelectorDom}
      {formDom}
      {generatedConnectionDom}
      <Box sx={{ display: "flex", justifyContent: "end", gap: 2 }}>
        <Button type="submit" variant="contained">
          Apply
        </Button>
        <Button type="button" onClick={props.onClose}>
          Cancel
        </Button>
      </Box>
    </form>
  );
}
