import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputLabel from "@mui/material/InputLabel";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import set from "lodash.set";
import { useSearchParams } from "react-router";
import { useNavigate } from "src/frontend/utils/commonUtils";
import React, { useEffect, useState } from "react";
import {
  getInsert as getInsertForAzCosmosDB,
  getUpdateWithValues as getUpdateWithValuesForAzCosmosDB,
} from "src/common/adapters/AzureCosmosDataAdapter/scripts";
import {
  AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE,
  getInsert as getInsertForAzTable,
  getUpdateWithValues as getUpdateWithValuesForAzTable,
} from "src/common/adapters/AzureTableStorageAdapter/scripts";
import {
  getInsert as getInsertForCassandra,
  getUpdateWithValues as getUpdateWithValuesForCassandra,
} from "src/common/adapters/CassandraDataAdapter/scripts";
import { isDialectSupportCreateRecordForm, isDialectSupportEditRecordForm } from "src/common/adapters/DataScriptFactory";
import {
  getInsert as getInsertForMongoDB,
  getUpdateWithValues as getUpdateWithValuesForMongoDB,
} from "src/common/adapters/MongoDBDataAdapter/scripts";
import {
  getInsert as getInsertForRdmbs,
  getUpdateWithValues as getUpdateWithValuesForRdmbs,
} from "src/common/adapters/RelationalDataAdapter/scripts";
import Breadcrumbs from "src/frontend/components/Breadcrumbs";
import CodeEditorBox from "src/frontend/components/CodeEditorBox";
import VirtualizedConnectionTree from "src/frontend/components/VirtualizedConnectionTree";
import JsonFormatData from "src/frontend/components/JsonFormatData";
import { useCommands } from "src/frontend/components/MissionControl";
import NewConnectionButton from "src/frontend/components/NewConnectionButton";
import ConnectionDatabaseSelector from "src/frontend/components/QueryBox/ConnectionDatabaseSelector";
import Tabs from "src/frontend/components/Tabs";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useSideBarWidthPreference } from "src/frontend/hooks/useClientSidePreference";
import { useGetColumns, useGetConnectionById } from "src/frontend/hooks/useConnection";
import { useActiveConnectionQuery, useConnectionQueries } from "src/frontend/hooks/useConnectionQuery";
import useToaster from "src/frontend/hooks/useToaster";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";
import LayoutTwoColumns from "src/frontend/layout/LayoutTwoColumns";
import { formatJS, formatSQL } from "src/frontend/utils/formatter";
import { SqluiFrontend } from "typings";

/**
 * Generic type for a database record represented as a plain key-value object.
 */
type RecordData = any;

/**
 * render the form in read only mode
 * @param {[type]} props: RecordDetailsPageProps [description]
 */
function RecordView(props: RecordDetailsPageProps): React.JSX.Element | null {
  const { data } = props;
  const columnNames = Object.keys(data || {});

  return (
    <>
      {columnNames.map((columnName) => {
        const columnValue = data[columnName];
        const columnLabelDom = <InputLabel sx={{ mt: 1, fontWeight: "bold" }}>{columnName}</InputLabel>;

        let contentColumnValueView = (
          <TextField label={columnName} value={columnValue} size="small" margin="dense" disabled={true} multiline />
        );
        if (columnValue === true || columnValue === false) {
          // boolean
          contentColumnValueView = <TextField label={columnName} value={columnValue} size="small" margin="dense" disabled={true} />;
        } else if (columnValue === null) {
          // null value
          contentColumnValueView = <TextField label={columnName} value="NULL" size="small" margin="dense" disabled={true} />;
        } else if (columnValue === undefined) {
          // undefined
          contentColumnValueView = <TextField label={columnName} value="undefined" size="small" margin="dense" disabled={true} />;
        } else if (columnValue?.toString()?.match(/<[a-z0-9]>+/gi) || columnValue?.toString()?.match(/<\/[a-z0-9]+>/gi)) {
          // raw HTML
          contentColumnValueView = (
            <>
              {columnLabelDom}
              <Box
                className="RawHtmlRender"
                dangerouslySetInnerHTML={{ __html: columnValue }}
                sx={{ border: 1, borderRadius: 1, borderColor: "divider", p: 1 }}
              />
            </>
          );
        } else if (Array.isArray(columnValue) || typeof columnValue === "object") {
          // complex object (array or plain object)
          contentColumnValueView = (
            <TextField
              label={columnName}
              value={JSON.stringify(columnValue, null, 2)}
              size="small"
              margin="dense"
              disabled={true}
              multiline
              slotProps={{ htmlInput: { style: { fontFamily: "monospace" } } }}
            />
          );
        }

        return <React.Fragment key={columnName}>{contentColumnValueView}</React.Fragment>;
      })}
    </>
  );
}

/**
 * Form for creating or editing a database record. Renders dialect-specific input fields
 * and a code editor for document-style databases (MongoDB, CosmosDB, AzTable).
 * @param props - Record data, query context, mode flags, and save/cancel callbacks.
 */
function RecordForm(props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [deltaFields, setDeltaFields] = useState<Set<string>>(new Set());
  const [rawValue, setRawValue] = useState("");
  const [data, setData] = useState<RecordData>(props.data || {});
  const [query, setQuery] = useState<Partial<SqluiFrontend.ConnectionQuery>>({
    id: "migration_from_query_" + Date.now(),
    ...props?.query,
  });
  const { data: connection } = useGetConnectionById(query?.connectionId);
  const { data: columns } = useGetColumns(query?.connectionId, query?.databaseId, query?.tableId);

  const onDatabaseConnectionChange = (connectionId?: string, databaseId?: string, tableId?: string) => {
    if (props.onConnectionChanges) {
      props.onConnectionChanges({
        connectionId,
        databaseId,
        tableId,
      });
    }

    setQuery({
      ...query,
      connectionId,
      databaseId,
      tableId,
    });
  };

  const onSetData = (key: string, value: any) => {
    deltaFields.add(key);
    setDeltaFields(deltaFields);
    setData({ ...data, [key]: value });
  };

  // when query changes update the form field
  useEffect(() => {
    if (props.isEditMode === true) {
      return;
    }
    setSearchParams(
      {
        connectionId: query.connectionId || "",
        databaseId: query.databaseId || "",
        tableId: query.tableId || "",
      },
      { replace: true },
    );
  }, [query]);

  // generate the dummy data when selector changes
  useEffect(() => {
    if (props.data) {
      let newData: any, newRawValue: any;
      switch (connection?.dialect) {
        case "mysql":
        case "mariadb":
        case "mssql":
        case "postgres":
        case "postgresql":
        case "sqlite":
        case "cassandra":
          newData = props.data;
          break;
        case "mongodb":
        // case 'redis': // TODO: to be implemented
        // case 'rediss': // TODO: to be implemented
        case "cosmosdb":
          newRawValue = { ...props.data };
          break;
        case "aztable":
          newRawValue = { ...props.data };
          // for these, let's delete the system key
          for (const keyToDelete of AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE) {
            delete newRawValue[keyToDelete];
          }
          break;
      }

      if (newData) {
        setData(newData);
      }
      if (newRawValue) {
        setRawValue(JSON.stringify(newRawValue, null, 2));
      }
      return;
    }

    const newData = {};
    if (columns) {
      switch (connection?.dialect) {
        case "mysql":
        case "mariadb":
        case "mssql":
        case "postgres":
        case "postgresql":
        case "sqlite":
        case "cassandra":
          for (const column of columns) {
            set(newData, column.propertyPath || column.name, "");
          }
          setData(newData);
          break;
        case "mongodb":
          for (const column of columns.filter((targetColumn) => !targetColumn.primaryKey)) {
            set(newData, column.propertyPath || column.name, "");
          }
          setRawValue(JSON.stringify(newData, null, 2));
          break;
        // case 'redis': // TODO: to be implemented
        // case 'rediss': // TODO: to be implemented
        case "cosmosdb":
          for (const column of columns.filter((targetColumn) => targetColumn.name[0] !== "_" && !targetColumn.primaryKey)) {
            set(newData, column.propertyPath || column.name, "");
          }
          setRawValue(JSON.stringify(newData, null, 2));
          break;
        case "aztable":
          for (const column of columns.filter(
            (targetColumn) => AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE.indexOf(targetColumn.name) === -1,
          )) {
            set(newData, column.propertyPath || column.name, "");
          }
          setRawValue(JSON.stringify(newData, null, 2));
          break;
      }
    }
  }, [connection, columns, props.data]);

  useEffect(() => {
    if (props.isEditMode === true) {
      return;
    }

    setQuery({
      ...query,
      connectionId: searchParams.get("connectionId") || "",
      databaseId: searchParams.get("databaseId") || "",
      tableId: searchParams.get("tableId") || "",
    });
  }, []);

  const contentFormDataView: React.JSX.Element[] = [];
  if (!isDialectSupportCreateRecordForm(connection?.dialect)) {
    contentFormDataView.push(
      <React.Fragment key="non_supported_dialect">The dialect of this connection is not supported for RecordForm</React.Fragment>,
    );
  } else {
    switch (connection?.dialect) {
      case "mysql":
      case "mariadb":
      case "mssql":
      case "postgres":
      case "postgresql":
      case "sqlite":
        if (columns && columns.length > 0) {
          for (const column of columns) {
            const baseInputProps: TextFieldProps = {
              label: `${column.name} (${column.type.toLowerCase()}) ${column.primaryKey ? "(Primary Key)" : ""}`,
              defaultValue: data[column.name],
              onChange: (e) => onSetData(column.name, e.target.value),
              required: !column.allowNull,
              size: "small",
              margin: "dense",
              fullWidth: true,
              autoComplete: "off",
            };
            let contentColumnValueInputView = <TextField {...baseInputProps} type="text" multiline />;

            if (
              column.type?.toLowerCase()?.includes("int") ||
              column.type?.toLowerCase()?.includes("float") ||
              column.type?.toLowerCase()?.includes("number")
            ) {
              contentColumnValueInputView = <TextField {...baseInputProps} type="number" />;
            }

            contentFormDataView.push(
              <React.Fragment key={column.name}>
                <div className="FormInput__Row">{contentColumnValueInputView}</div>
              </React.Fragment>,
            );
          }
        } else {
          contentFormDataView.push(
            <React.Fragment key="connection_required">
              No meta data found. Please select a connection, database and table from the above
            </React.Fragment>,
          );
        }
        break;
      case "cassandra":
        if (columns && columns.length > 0) {
          for (const column of columns) {
            const required = column.kind !== "regular";
            const baseInputProps: TextFieldProps = {
              label: `${column.name} (${column.type.toLowerCase()}) ${column.kind !== "regular" ? column.kind : ""}`,
              defaultValue: data[column.name],
              onChange: (e) => onSetData(column.name, e.target.value),
              size: "small",
              margin: "dense",
              fullWidth: true,
              required,
              autoComplete: "off",
            };
            let contentColumnValueInputView = <TextField {...baseInputProps} type="text" multiline />;
            if (column.type?.toLowerCase()?.includes("int") || column.type?.toLowerCase()?.includes("number")) {
              contentColumnValueInputView = <TextField {...baseInputProps} type="number" />;
            }

            contentFormDataView.push(
              <React.Fragment key={column.name}>
                <div className="FormInput__Row">{contentColumnValueInputView}</div>
              </React.Fragment>,
            );
          }
        } else {
          contentFormDataView.push(
            <React.Fragment key="connection_required">
              No meta data found. Please select a connection, database and table from the above
            </React.Fragment>,
          );
        }
        break;
      case "mongodb":
      // case 'redis': // TODO: to be implemented
      // case 'rediss': // TODO: to be implemented
      case "cosmosdb":
      case "aztable":
        // js raw value
        if (query?.tableId) {
          contentFormDataView.push(
            <CodeEditorBox
              key="rawValue"
              value={rawValue}
              onChange={(newValue) => setRawValue(newValue)}
              required={true}
              language="json"
            />,
          );
        } else {
          contentFormDataView.push(
            <React.Fragment key="connection_required">Please select a connection, database and table from the above</React.Fragment>,
          );
        }
        break;
    }
  }

  const isDisabled = !!(!query.connectionId || !query.databaseId || !query.tableId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSave({
          query,
          connection,
          columns,
          data,
          rawValue,
          deltaFields: [...deltaFields],
        });
      }}
    >
      <Box className="FormInput__Container">
        <div className="FormInput__Row">
          <ConnectionDatabaseSelector
            isTableIdRequired={true}
            value={query}
            onChange={onDatabaseConnectionChange}
            disabledConnection={!!props.isEditMode}
            disabledDatabase={!!props.isEditMode}
            required
          />
        </div>

        {contentFormDataView}

        <div className="FormInput__Row">
          <Button variant="contained" type="submit" disabled={isDisabled}>
            Generate Script
          </Button>
          <Button variant="outlined" type="button" onClick={props.onCancel}>
            Cancel
          </Button>
        </div>
      </Box>
    </form>
  );
}

/**
 * Page for creating a new database record. Generates dialect-specific insert queries
 * and attaches them as new query tabs.
 */
export function NewRecordPage() {
  const navigate = useNavigate();
  useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();
  const { onAddQuery } = useConnectionQueries();
  const { add: addToast } = useToaster();
  const { selectCommand } = useCommands();

  const onSave = async ({ query, connection, columns, data, rawValue }) => {
    let sql: string = "";
    switch (connection?.dialect) {
      case "mysql":
      case "mariadb":
      case "mssql":
      case "postgres":
      case "postgresql":
      case "sqlite":
        sql = formatSQL(
          getInsertForRdmbs(
            {
              ...query,
              dialect: connection.dialect,
              columns,
            },
            data,
          )?.query || "",
        );
        break;
      case "cassandra":
        sql = formatSQL(
          getInsertForCassandra(
            {
              ...query,
              dialect: connection.dialect,
              columns,
            },
            data,
          )?.query || "",
        );
        break;
      case "mongodb":
        try {
          const jsonValue = JSON.parse(rawValue);

          sql = formatJS(
            getInsertForMongoDB(
              {
                ...query,
                dialect: connection.dialect,
                columns,
              },
              jsonValue,
            )?.query || "",
          );
        } catch (err) {
          console.error("index.tsx:getInsertForMongoDB", err);
          await addToast({
            message: `Dialect "${connection?.dialect}" value needs to be a valid JSON object. Input provided is not a valid JSON...`,
          });
          return;
        }
        break;
      // case 'redis': // TODO: to be implemented
      // case 'rediss': // TODO: to be implemented
      case "cosmosdb":
        try {
          const jsonValue = JSON.parse(rawValue);

          sql = formatJS(
            getInsertForAzCosmosDB(
              {
                ...query,
                dialect: connection.dialect,
                columns,
              },
              jsonValue,
            )?.query || "",
          );
        } catch (err) {
          console.error("index.tsx:getInsertForAzCosmosDB", err);
          await addToast({
            message: `Dialect "${connection?.dialect}" value needs to be a valid JSON object. Input provided is not a valid JSON...`,
          });
          return;
        }
        break;
      case "aztable":
        try {
          const jsonValue = JSON.parse(rawValue);

          sql = formatJS(
            getInsertForAzTable(
              {
                ...query,
                dialect: connection.dialect,
                columns,
              },
              jsonValue,
            )?.query || "",
          );
        } catch (err) {
          console.error("index.tsx:getInsertForAzTable", err);
          await addToast({
            message: `Dialect "${connection?.dialect}" value needs to be a valid JSON object. Input provided is not a valid JSON...`,
          });
          return;
        }
        break;
      // default:
      //   break;
    }
    onAddQuery({
      name: `New Record Query - ${new Date().toLocaleDateString()}`,
      ...query,
      sql,
    });

    navigate("/");
    await addToast({
      message: `New Record Query attached, please review and execute the query manually...`,
    });
  };

  const onCancel = () => {
    navigate("/");
  };
  const onConnectionChanges = (query) => {
    selectCommand({ event: "clientEvent/query/revealThisOnly", data: query });
  };

  useEffect(() => {
    setTreeActions({
      showContextMenu: true,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className="Page Page__NewRecord">
      <>
        <NewConnectionButton />
        <VirtualizedConnectionTree />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: (
                <>
                  <EditIcon fontSize="inherit" />
                  New Record
                </>
              ),
            },
          ]}
        />
        <RecordForm onSave={onSave} onCancel={onCancel} onConnectionChanges={onConnectionChanges} mode="create" />
      </>
    </LayoutTwoColumns>
  );
}

/**
 * Component for viewing and editing a database record. Generates dialect-specific update queries.
 * @param props - Contains record data and edit mode flag.
 * @returns The record view/edit form or null if no active query/connection.
 */
export function EditRecordPage(props: RecordDetailsPageProps): React.JSX.Element | null {
  const { data } = props;
  const { onAddQuery } = useConnectionQueries();
  const [isEdit, setIsEdit] = useState(!!props.isEditMode);
  const { query: activeQuery } = useActiveConnectionQuery();
  const { data: connection } = useGetConnectionById(activeQuery?.connectionId);
  const { dismiss } = useActionDialogs();
  const { add: addToast } = useToaster();
  // TODO: intelligently pick up the table name from schema of data

  const onSave = async ({ query, connection, columns, data, rawValue, deltaFields }) => {
    let sql = "";

    // find out the delta
    let deltaData = {};
    for (const deltaField of deltaFields) {
      deltaData[deltaField] = data[deltaField];
    }
    if (Object.keys(deltaData).length === 0) {
      deltaData = data;
    }

    const conditions = {};

    switch (connection?.dialect) {
      case "mysql":
      case "mariadb":
      case "mssql":
      case "postgres":
      case "postgresql":
      case "sqlite":
        // find out the main condition
        for (const column of columns) {
          if (column.primaryKey) {
            conditions[column.name] = data[column.name];
          }
        }

        if (Object.keys(conditions).length === 0) {
          for (const column of columns) {
            if (column.name?.toString().toLowerCase()?.includes("id")) {
              // otherwise include any of the id
              conditions[column.name] = data[column.name];
            }
          }
        }

        sql = formatSQL(
          getUpdateWithValuesForRdmbs(
            {
              ...query,
              dialect: connection.dialect,
              columns,
            },
            deltaData,
            conditions,
          )?.query || "",
        );
        setIsEdit(false);
        break;
      case "cassandra":
        // find out the main condition
        for (const column of columns) {
          if (column.kind === "partition_key") {
            conditions[column.name] = data[column.name];
          }
        }

        sql = formatSQL(
          getUpdateWithValuesForCassandra(
            {
              ...query,
              dialect: connection.dialect,
              columns,
            },
            deltaData,
            conditions,
          )?.query || "",
        );
        setIsEdit(false);
        break;
      case "mongodb":
        try {
          const jsonValue = JSON.parse(rawValue);

          // filter out the id inside of delta
          delete jsonValue["_id"];

          sql = formatJS(
            getUpdateWithValuesForMongoDB(
              {
                ...query,
                dialect: connection.dialect,
                columns,
              },
              jsonValue,
              conditions,
            )?.query || "",
          );

          setIsEdit(false);
        } catch (err) {
          console.error("index.tsx:setIsEdit", err);
          await addToast({
            message: `Dialect "${connection?.dialect}" value needs to be a valid JSON object. Input provided is not a valid JSON...`,
          });
          return;
        }
        break;
      // case 'redis': // TODO: to be implemented
      // case 'rediss': // TODO: to be implemented
      case "cosmosdb":
        try {
          const jsonValue = JSON.parse(rawValue);

          sql = formatJS(
            getUpdateWithValuesForAzCosmosDB(
              {
                ...query,
                dialect: connection.dialect,
                columns,
              },
              jsonValue,
              conditions,
            )?.query || "",
          );

          setIsEdit(false);
        } catch (err) {
          console.error("index.tsx:setIsEdit", err);
          await addToast({
            message: `Dialect "${connection?.dialect}" value needs to be a valid JSON object. Input provided is not a valid JSON...`,
          });
          return;
        }
        break;
      case "aztable":
        try {
          const jsonValue = JSON.parse(rawValue);

          sql = formatJS(
            getUpdateWithValuesForAzTable(
              {
                ...query,
                dialect: connection.dialect,
                columns,
              },
              jsonValue,
              conditions,
            )?.query || "",
          );

          setIsEdit(false);
        } catch (err) {
          console.error("index.tsx:setIsEdit", err);
          await addToast({
            message: `Dialect "${connection?.dialect}" value needs to be a valid JSON object. Input provided is not a valid JSON...`,
          });
          return;
        }
        break;
      // default:
      //   break;
    }
    onAddQuery({
      name: `New Record Query - ${new Date().toLocaleDateString()}`,
      ...query,
      sql,
    });

    await addToast({
      message: `Edit Record Query attached, please review and execute the query manually...`,
    });

    // close modal
    dismiss();
  };

  const onCancel = () => {
    setIsEdit(false);
  };

  if (!activeQuery || !connection) {
    return null;
  }

  return (
    <>
      {isEdit ? (
        <>
          <RecordForm data={data} query={activeQuery} onSave={onSave} onCancel={onCancel} isEditMode={true} mode="edit" />
        </>
      ) : (
        <>
          {isDialectSupportEditRecordForm(connection?.dialect) && (
            <Box>
              <Button variant="contained" onClick={() => setIsEdit(true)}>
                Edit
              </Button>
            </Box>
          )}
          <RecordView data={data} />
        </>
      )}
    </>
  );
}
/** Props for RecordDetailsPage and EditRecordPage components. */
type RecordDetailsPageProps = {
  /** The record data to display or edit. */
  data: any;
  /** Whether the form starts in edit mode. */
  isEditMode?: boolean;
};

/**
 * Tabbed view of a record with a form display tab and a raw JSON tab.
 * @param props - Contains record data and optional edit mode flag.
 * @returns Tabbed record detail view.
 */
export function RecordDetailsPage(props: RecordDetailsPageProps): React.JSX.Element | null {
  const { data, isEditMode } = props;
  const [tabIdx, setTabIdx] = useState(0);

  const tabHeaders = [<>Form Display</>, <>Raw JSON</>];

  const tabContents = [
    <Box className="FormInput__Container" key="formDisplay">
      <EditRecordPage data={data} isEditMode={!!isEditMode} />
    </Box>,

    <Box className="FormInput__Container" key="rawJsonDisplay">
      <JsonFormatData data={data} />
    </Box>,
  ];

  return <Tabs tabIdx={tabIdx} tabHeaders={tabHeaders} tabContents={tabContents} onTabChange={(newTabIdx) => setTabIdx(newTabIdx)}></Tabs>;
}
