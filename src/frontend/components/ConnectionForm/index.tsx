import SaveIcon from "@mui/icons-material/Save";
import LoadingButton from "@mui/lab/LoadingButton";
import { Alert, Box, Button, Link, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import { getConnectionSetupGuide, getDialectTypeFromConnectionString } from "src/common/adapters/DataScriptFactory";
import ConnectionHint from "src/frontend/components/ConnectionForm/ConnectionHint";
import HTMLContent from "src/frontend/components/HTMLContent";
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
          multiline
          minRows={1}
          maxRows={10}
        />
      </div>
      <ConnectionSetupGuideAlert dialect={getDialectTypeFromConnectionString(props.connection)} />
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

/**
 * Renders a setup guide alert for the detected dialect, showing connection string format and setup steps.
 * @param props - Contains the detected dialect string.
 * @returns The rendered alert, or null if no guide is available.
 */
function ConnectionSetupGuideAlert(props: { dialect: string }): JSX.Element | null {
  const guide = getConnectionSetupGuide(props.dialect);
  if (!guide) {
    return null;
  }

  return (
    <Alert severity="info" sx={{ my: 1 }}>
      <HTMLContent html={guide} />
    </Alert>
  );
}
