import SaveIcon from "@mui/icons-material/Save";
import LoadingButton from "@mui/lab/LoadingButton";
import { Alert, Box, Button, Link, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import { getDialectTypeFromConnectionString } from "src/common/adapters/DataScriptFactory";
import ConnectionHint from "src/frontend/components/ConnectionForm/ConnectionHint";
import { useCommands } from "src/frontend/components/MissionControl";
import TestConnectionButton from "src/frontend/components/TestConnectionButton";
import { useGetConnectionById, useUpsertConnection } from "src/frontend/hooks/useConnection";
import useToaster from "src/frontend/hooks/useToaster";
import { createSystemNotification, useNavigate } from "src/frontend/utils/commonUtils";
import { SqluiCore } from "typings";

/** Props for the EditConnectionForm component. */
type ConnectionFormProps = {
  id?: string;
};

/**
 * Form for creating a new database connection, starting with a dialect selection hint screen.
 * @returns The rendered new connection form or dialect selection screen.
 */
export function NewConnectionForm() {
  const [name, setName] = useState("");
  const [connection, setConnection] = useState("");
  const [showHint, setShowHint] = useState(true);
  const { mutateAsync, isLoading: saving } = useUpsertConnection();
  const navigate = useNavigate();

  const onSave = async () => {
    await mutateAsync({
      name,
      connection,
    });

    createSystemNotification(`Connection "${name}" created`);

    // when done, go back to the main page (added delay to prevent operation on unmounted component errors)
    setTimeout(() => navigate(`/`, { replace: true }), 0);
  };

  const onApplyConnectionHint = (dialect, connection) => {
    setName(`${dialect} Connection - ${new Date().toLocaleDateString()}`);
    setConnection(connection);
    setShowHint(false);
  };

  const onStartBlankConnection = () => {
    setName(`Connection - ${new Date().toLocaleDateString()}`);
    setShowHint(false);
  };

  if (showHint) {
    return (
      <Box className="FormInput__Container">
        <Typography>
          Select one of the following connection type. Or <Link onClick={onStartBlankConnection}>get started with an empty connection</Link>
          .
        </Typography>
        <ConnectionHint onChange={onApplyConnectionHint} showBookmarks={true} />
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" type="button" onClick={onStartBlankConnection}>
            New Blank Connection
          </Button>
          <Button variant="outlined" type="button" onClick={() => navigate("/")}>
            Cancel
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <MainConnectionForm
      onSave={onSave}
      name={name}
      setName={setName}
      connection={connection}
      setConnection={setConnection}
      saving={saving}
    />
  );
}

/**
 * Form for editing an existing database connection, loading its current name and connection string.
 * @param props - Props containing the connection ID to edit.
 * @returns The rendered edit connection form, a loading indicator, or an error message if not found.
 */
export function EditConnectionForm(props: ConnectionFormProps): JSX.Element | null {
  const { id } = props;
  const [name, setName] = useState("");
  const [connection, setConnection] = useState("");
  const { data: initialConnection, isLoading: loading } = useGetConnectionById(id);
  const { mutateAsync, isLoading: saving } = useUpsertConnection();
  const navigate = useNavigate();

  const onSave = async () => {
    await mutateAsync({
      id,
      name,
      connection,
    });

    // when done, go back to the main page
    navigate(`/`, { replace: true });
  };

  // set the data for existing form
  useEffect(() => {
    setName(initialConnection?.name || "");
    setConnection(initialConnection?.connection || "");
  }, [initialConnection]);

  if (!loading && !initialConnection) {
    return (
      <Alert severity="error">
        This connection couldn't be found. It might have been deleted....
        <strong onClick={() => navigate(`/`, { replace: true })} style={{ cursor: "pointer" }}>
          Click here to go back to the main query page
        </strong>
      </Alert>
    );
  }

  return (
    <MainConnectionForm
      onSave={onSave}
      name={name}
      setName={setName}
      connection={connection}
      setConnection={setConnection}
      saving={saving}
      loading={loading}
    />
  );
}

/** Props for the internal MainConnectionForm component. */
type MainConnectionFormProps = {
  onSave: () => Promise<void>;
  name: string;
  setName: (newVal: string) => void;
  connection: string;
  setConnection: (newVal: string) => void;
  saving?: boolean;
  loading?: boolean;
};

/**
 * The core connection form with name/connection string fields, hint panel, and save/test actions.
 * @param props - Form state, setters, and submit handler.
 * @returns The rendered connection form.
 */
function MainConnectionForm(props: MainConnectionFormProps): JSX.Element | null {
  const navigate = useNavigate();
  const [showHint, setShowHint] = useState(false);
  const [showSqliteDatabasePathSelection, setShowSqliteDatabasePathSelection] = useState(false);
  const { add: addToast } = useToaster();
  const { selectCommand } = useCommands();

  // effects
  useEffect(() => {
    setShowSqliteDatabasePathSelection(props.connection?.indexOf("sqlite://") === 0);
  }, [props.connection]);

  // events
  const onSqliteDatabaseFileSelectionChange = (files: FileList | null) => {
    try {
      if (files && files.length > 0) {
        const [file] = files;
        const { path, name } = file;
        const pathToUse = path || name; // this is a fallback for mocked webserver
        props.setConnection(`sqlite://${pathToUse}`);
      }
    } catch (err) {
      console.error("index.tsx:setConnection", err);
    }
  };

  const onSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const toast = await addToast({
      message: "Saving Connection",
    });

    try {
      await props.onSave();
    } catch (err) {
      console.error("index.tsx:onSave", err);
    }

    await toast?.dismiss();
  };

  if (props.loading) {
    return <Alert severity="info">Loading connection. Please wait....</Alert>;
  }

  const connection: SqluiCore.CoreConnectionProps = {
    name: props.name,
    connection: props.connection,
  };

  const parsedConnectionProps = BaseDataAdapter.getConnectionParameters(connection.connection);
  const restOfConnectionString = connection.connection.replace(/[a-z0-9+]:\/\/+/, "");

  const onApplyConnectionHint = (dialect, connection) => {
    props.setName(`${dialect} Connection - ${new Date().toLocaleDateString()}`);
    props.setConnection(connection);
    setShowHint(false);
  };

  return (
    <form className="ConnectionForm FormInput__Container" onSubmit={onSave}>
      <div className="FormInput__Row">
        <TextField
          label="Name"
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          required
          size="small"
          fullWidth={true}
          autoComplete="off"
          autoFocus
        />
      </div>
      <div className="FormInput__Row">
        <TextField
          label="Connection"
          value={props.connection}
          onChange={(e) => props.setConnection(e.target.value)}
          required
          size="small"
          fullWidth={true}
        />
      </div>
      {getDialectTypeFromConnectionString(props.connection) === "sfdc" && (
        <Alert severity="info" sx={{ my: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 0.5 }}>
            Salesforce Setup Checklist
          </Typography>
          <Typography variant="body2" component="div">
            <ol style={{ margin: 0, paddingLeft: "1.2em" }}>
              <li>
                <strong>Security Token</strong> -- Go to Salesforce{" "}
                <strong>Setup &gt; My Personal Information &gt; Reset My Security Token</strong> and add the token from your email to the
                connection.
              </li>
              <li>
                <strong>Enable SOAP API Login</strong> -- Go to <strong>Setup &gt; Profiles &gt; [Your Profile] &gt; Edit</strong> and check{" "}
                <strong>"SOAP API Login Allowed"</strong> under Administrative Permissions.
              </li>
              <li>
                <strong>Enable OAuth Username-Password Flows</strong> -- Go to <strong>Setup &gt; OAuth and OpenID Connect Settings</strong>{" "}
                and turn on <strong>"Allow OAuth Username-Password Flows"</strong>.
              </li>
              <li>
                <strong>Connected App (optional)</strong> -- If SOAP API cannot be enabled, create a Connected App in{" "}
                <strong>Setup &gt; App Manager</strong> and add <code>clientId</code> and <code>clientSecret</code> to the connection JSON.
              </li>
            </ol>
            <Link
              href="https://github.com/synle/sqlui-native/blob/main/CONTRIBUTING.md#salesforce-sfdc"
              target="_blank"
              rel="noopener"
              sx={{ mt: 0.5, display: "inline-block" }}
            >
              Full Salesforce setup guide
            </Link>
          </Typography>
        </Alert>
      )}
      {showSqliteDatabasePathSelection && (
        <div className="FormInput__Row">
          <input
            type="file"
            style={{ display: "none" }}
            onChange={(e) => onSqliteDatabaseFileSelectionChange(e.target.files)}
            id="sqlite-file-selection"
          />
          <label htmlFor="sqlite-file-selection">
            <Button variant="contained" component="span">
              Browse for sqlite database
            </Button>
          </label>
        </div>
      )}
      <div className="FormInput__Row">
        <LoadingButton variant="contained" type="submit" loading={props.saving} startIcon={<SaveIcon />}>
          Save
        </LoadingButton>
        <Button variant="outlined" type="button" disabled={props.saving} onClick={() => navigate("/")}>
          Cancel
        </Button>
        <TestConnectionButton connection={connection} />
        <Button type="button" disabled={props.saving} onClick={() => setShowHint(!showHint)}>
          {showHint ? "Hide Connection Hints" : "Show Connection Hints"}
        </Button>
        <Button
          type="button"
          onClick={() =>
            selectCommand({
              event: "clientEvent/showConnectionHelper",
              data: {
                scheme: parsedConnectionProps?.scheme || connection.connection.match(/^[a-z0-9]+/)?.[0] || 0,
                username: parsedConnectionProps?.username,
                password: parsedConnectionProps?.password,
                host: parsedConnectionProps?.hosts[0]?.host,
                port: parsedConnectionProps?.hosts[0]?.port,
                restOfConnectionString,
                onApply: (newConnection: string) => {
                  props.setConnection(newConnection);
                },
              },
            })
          }
        >
          Show Connection Helper
        </Button>
      </div>
      {showHint && (
        <div className="FormInput__Container">
          <ConnectionHint onChange={onApplyConnectionHint} />
        </div>
      )}
    </form>
  );
}
