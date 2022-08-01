import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputLabel from '@mui/material/InputLabel';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import set from 'lodash.set';
import { useNavigate, useSearchParams } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import {
  getInsert as getInsertForAzCosmosDB,
  getUpdateWithValues as getUpdateWithValuesForAzCosmosDB,
} from 'src/common/adapters/AzureCosmosDataAdapter/scripts';
import {
  AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE,
  getInsert as getInsertForAzTable,
  getUpdateWithValues as getUpdateWithValuesForAzTable,
} from 'src/common/adapters/AzureTableStorageAdapter/scripts';
import {
  getInsert as getInsertForCassandra,
  getUpdateWithValues as getUpdateWithValuesForCassandra,
} from 'src/common/adapters/CassandraDataAdapter/scripts';
import {
  isDialectSupportCreateRecordForm,
  isDialectSupportEditRecordForm,
} from 'src/common/adapters/DataScriptFactory';
import {
  getInsert as getInsertForMongoDB,
  getUpdateWithValues as getUpdateWithValuesForMongoDB,
} from 'src/common/adapters/MongoDBDataAdapter/scripts';
import {
  getInsert as getInsertForRdmbs,
  getUpdateWithValues as getUpdateWithValuesForRdmbs,
} from 'src/common/adapters/RelationalDataAdapter/scripts';
import Breadcrumbs from 'src/frontend/components/Breadcrumbs';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import JsonFormatData from 'src/frontend/components/JsonFormatData';
import { useCommands } from 'src/frontend/components/MissionControl';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import ConnectionDatabaseSelector from 'src/frontend/components/QueryBox/ConnectionDatabaseSelector';
import Tabs from 'src/frontend/components/Tabs';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useGetColumns, useGetConnectionById } from 'src/frontend/hooks/useConnection';
import {
  useActiveConnectionQuery,
  useConnectionQueries,
} from 'src/frontend/hooks/useConnectionQuery';
import useToaster from 'src/frontend/hooks/useToaster';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';
import { sortColumnNamesForUnknownData } from 'src/frontend/utils/commonUtils';
import { formatJS, formatSQL } from 'src/frontend/utils/formatter';
import { SqluiCore, SqluiFrontend } from 'typings';

type RecordData = any;

type RecordFormProps = {
  onSave: (response: RecordFormReponse) => void;
  onCancel: () => void;
  onConnectionChanges?: (query: Partial<SqluiFrontend.ConnectionQuery>) => void;
  query?: SqluiCore.ConnectionQuery;
  data?: RecordData;
  rawValue?: string;
  isEditMode?: boolean;
  mode: 'edit' | 'create';
};

type RecordFormReponse = {
  query: Partial<SqluiFrontend.ConnectionQuery>;
  connection?: SqluiCore.ConnectionProps;
  columns?: SqluiCore.ColumnMetaData[];
  data: RecordData;
  deltaFields: string[];
};
/**
 * render the form in read only mode
 * @param {[type]} props: RecordDetailsPageProps [description]
 */
function RecordView(props: RecordDetailsPageProps): JSX.Element | null {
  const { data } = props;
  const columnNames = sortColumnNamesForUnknownData(Object.keys(data || {}));

  return (
    <>
      {columnNames.map((columnName) => {
        const columnValue = data[columnName];
        const columnLabelDom = <InputLabel sx={{ mt: 1, fontWeight: 'bold' }}>{columnName}</InputLabel>;

        let contentColumnValueView = (
          <TextField label={columnName} value={columnValue} size='small' margin='dense' disabled={true} multiline />
        );
        if (columnValue === true || columnValue === false) {
          // boolean
          const booleanLabel = columnValue ? '<TRUE>' : '<FALSE>';
          contentColumnValueView = (
            <TextField label={columnName} value={columnValue} size='small' margin='dense' disabled={true} />
          );
        } else if (columnValue === null) {
          // null value
          contentColumnValueView = (
            <TextField label={columnName} value='NULL' size='small' margin='dense' disabled={true} />
          );
        } else if (columnValue === undefined) {
          // undefined
          contentColumnValueView = (
            <TextField label={columnName} value='undefined' size='small' margin='dense' disabled={true} />
          );
        } else if (
          columnValue?.toString()?.match(/<[a-z0-9]>+/gi) ||
          columnValue?.toString()?.match(/<\/[a-z0-9]+>/gi)
        ) {
          // raw HTML
          contentColumnValueView = (
            <>
              {columnLabelDom}
              <Box
                className='RawHtmlRender'
                dangerouslySetInnerHTML={{ __html: columnValue }}
                sx={{ border: 1, borderRadius: 1, borderColor: 'divider', p: 1 }}
              />
            </>
          );
        } else if (Array.isArray(columnValue) || typeof columnValue === 'object') {
          // complex object (array or plain object)
          contentColumnValueView = (
            <TextField
              label={columnName}
              value={JSON.stringify(columnValue, null, 2)}
              size='small'
              margin='dense'
              disabled={true}
              multiline
              inputProps={{ style: { fontFamily: 'monospace' } }}
            />
          );
        }

        return (
          <React.Fragment key={columnName}>

            {contentColumnValueView}
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * render the form in editable / creatable mode
 * @param {[type]} props [description]
 */
function RecordForm(props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [deltaFields, setDeltaFields] = useState<Set<string>>(new Set());
  const [rawValue, setRawValue] = useState('');
  const [data, setData] = useState<RecordData>(props.data || {});
  const [query, setQuery] = useState<Partial<SqluiFrontend.ConnectionQuery>>({
    id: 'migration_from_query_' + Date.now(),
    ...props?.query,
  });
  const { data: connection } = useGetConnectionById(query?.connectionId);
  const { data: columns, isLoading: loadingColumns } = useGetColumns(
    query?.connectionId,
    query?.databaseId,
    query?.tableId,
  );

  const onDatabaseConnectionChange = (
    connectionId?: string,
    databaseId?: string,
    tableId?: string,
  ) => {
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
        connectionId: query.connectionId || '',
        databaseId: query.databaseId || '',
        tableId: query.tableId || '',
      },
      { replace: true },
    );
  }, [query]);

  // generate the dummy data when selector changes
  useEffect(() => {
    if (props.data) {
      let newData: any, newRawValue: any;
      switch (connection?.dialect) {
        case 'mysql':
        case 'mariadb':
        case 'mssql':
        case 'postgres':
        case 'sqlite':
        case 'cassandra':
          newData = props.data;
          break;
        case 'mongodb':
        // case 'redis': // TODO: to be implemented
        case 'cosmosdb':
          newRawValue = { ...props.data };
          break;
        case 'aztable':
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
        case 'mysql':
        case 'mariadb':
        case 'mssql':
        case 'postgres':
        case 'sqlite':
        case 'cassandra':
          for (const column of columns) {
            set(newData, column.propertyPath || column.name, '');
          }
          setData(newData);
          break;
        case 'mongodb':
          for (const column of columns.filter((targetColumn) => !targetColumn.primaryKey)) {
            set(newData, column.propertyPath || column.name, '');
          }
          setRawValue(JSON.stringify(newData, null, 2));
          break;
        // case 'redis': // TODO: to be implemented
        case 'cosmosdb':
          for (const column of columns.filter(
            (targetColumn) => targetColumn.name[0] !== '_' && !targetColumn.primaryKey,
          )) {
            set(newData, column.propertyPath || column.name, '');
          }
          setRawValue(JSON.stringify(newData, null, 2));
          break;
        case 'aztable':
          for (const column of columns.filter(
            (targetColumn) =>
              AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE.indexOf(targetColumn.name) === -1,
          )) {
            set(newData, column.propertyPath || column.name, '');
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
      connectionId: searchParams.get('connectionId') || '',
      databaseId: searchParams.get('databaseId') || '',
      tableId: searchParams.get('tableId') || '',
    });
  }, []);

  const contentFormDataView: JSX.Element[] = [];
  if (!isDialectSupportCreateRecordForm(connection?.dialect)) {
    contentFormDataView.push(
      <React.Fragment key='non_supported_dialect'>
        The dialect of this connection is not supported for RecordForm
      </React.Fragment>,
    );
  } else {
    switch (connection?.dialect) {
      case 'mysql':
      case 'mariadb':
      case 'mssql':
      case 'postgres':
      case 'sqlite':
        if (columns && columns.length > 0) {
          for (const column of columns) {
            const baseInputProps: TextFieldProps = {
              label: `${column.name} (${column.type.toLowerCase()}) ${
                column.primaryKey ? '(Primary Key)' : ''
              }`,
              defaultValue: data[column.name],
              onChange: (e) => onSetData(column.name, e.target.value),
              required: !column.allowNull,
              size: 'small',
              margin: 'dense',
              fullWidth: true,
              autoComplete: 'off',
            };
            let contentColumnValueInputView = (
              <TextField {...baseInputProps} type='text' multiline />
            );

            if (
              column.type?.toLowerCase()?.includes('int') ||
              column.type?.toLowerCase()?.includes('float') ||
              column.type?.toLowerCase()?.includes('number')
            ) {
              contentColumnValueInputView = <TextField {...baseInputProps} type='number' />;
            }

            contentFormDataView.push(
              <React.Fragment key={column.name}>
                <div className='FormInput__Row'>{contentColumnValueInputView}</div>
              </React.Fragment>,
            );
          }
        } else {
          contentFormDataView.push(
            <React.Fragment key='connection_required'>
              No meta data found. Please select a connection, database and table from the above
            </React.Fragment>,
          );
        }
        break;
      case 'cassandra':
        if (columns && columns.length > 0) {
          for (const column of columns) {
            const required = column.kind !== 'regular';
            const baseInputProps: TextFieldProps = {
              label: `${column.name} (${column.type.toLowerCase()}) ${
                column.kind !== 'regular' ? column.kind : ''
              }`,
              defaultValue: data[column.name],
              onChange: (e) => onSetData(column.name, e.target.value),
              size: 'small',
              margin: 'dense',
              fullWidth: true,
              required,
              autoComplete: 'off',
            };
            let contentColumnValueInputView = (
              <TextField {...baseInputProps} type='text' multiline />
            );
            if (
              column.type?.toLowerCase()?.includes('int') ||
              column.type?.toLowerCase()?.includes('number')
            ) {
              contentColumnValueInputView = <TextField {...baseInputProps} type='number' />;
            }

            contentFormDataView.push(
              <React.Fragment key={column.name}>
                <div className='FormInput__Row'>{contentColumnValueInputView}</div>
              </React.Fragment>,
            );
          }
        } else {
          contentFormDataView.push(
            <React.Fragment key='connection_required'>
              No meta data found. Please select a connection, database and table from the above
            </React.Fragment>,
          );
        }
        break;
      case 'mongodb':
      // case 'redis': // TODO: to be implemented
      case 'cosmosdb':
      case 'aztable':
        // js raw value
        if (query?.tableId) {
          contentFormDataView.push(
            <CodeEditorBox
              key='rawValue'
              value={rawValue}
              onChange={(newValue) => setRawValue(newValue)}
              required={true}
              language='json'
            />,
          );
        } else {
          contentFormDataView.push(
            <React.Fragment key='connection_required'>
              Please select a connection, database and table from the above
            </React.Fragment>,
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
      }}>
      <Box className='FormInput__Container'>
        <div className='FormInput__Row'>
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

        <div className='FormInput__Row'>
          <Button variant='contained' type='submit' disabled={isDisabled}>
            Generate Script
          </Button>
          <Button variant='outlined' type='button' onClick={props.onCancel}>
            Cancel
          </Button>
        </div>
      </Box>
    </form>
  );
}

export function NewRecordPage() {
  const navigate = useNavigate();
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();
  const { onAddQuery } = useConnectionQueries();
  const { add: addToast } = useToaster();
  const { selectCommand } = useCommands();

  const onSave = async ({ query, connection, columns, data, rawValue }) => {
    let sql: string = '';
    switch (connection?.dialect) {
      case 'mysql':
      case 'mariadb':
      case 'mssql':
      case 'postgres':
      case 'sqlite':
        sql = formatSQL(
          getInsertForRdmbs(
            {
              ...query,
              dialect: connection.dialect,
              columns,
            },
            data,
          )?.query || '',
        );
        break;
      case 'cassandra':
        sql = formatSQL(
          getInsertForCassandra(
            {
              ...query,
              dialect: connection.dialect,
              columns,
            },
            data,
          )?.query || '',
        );
        break;
      case 'mongodb':
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
            )?.query || '',
          );
        } catch (err) {
          await addToast({
            message: `Dialect "${connection?.dialect}" value needs to be a valid JSON object. Input provided is not a valid JSON...`,
          });
          return;
        }
        break;
      // case 'redis': // TODO: to be implemented
      case 'cosmosdb':
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
            )?.query || '',
          );
        } catch (err) {
          await addToast({
            message: `Dialect "${connection?.dialect}" value needs to be a valid JSON object. Input provided is not a valid JSON...`,
          });
          return;
        }
        break;
      case 'aztable':
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
            )?.query || '',
          );
        } catch (err) {
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

    navigate('/');
    await addToast({
      message: `New Record Query attached, please review and execute the query manually...`,
    });
  };

  const onCancel = () => {
    navigate('/');
  };
  const onConnectionChanges = (query) => {
    selectCommand({ event: 'clientEvent/query/revealThisOnly', data: query });
  };

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className='Page Page__NewRecord'>
      <>
        <NewConnectionButton />
        <ConnectionDescription />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: (
                <>
                  <EditIcon fontSize='inherit' />
                  New Record
                </>
              ),
            },
          ]}
        />
        <RecordForm
          onSave={onSave}
          onCancel={onCancel}
          onConnectionChanges={onConnectionChanges}
          mode='create'
        />
      </>
    </LayoutTwoColumns>
  );
}

export function EditRecordPage(props: RecordDetailsPageProps): JSX.Element | null {
  const { data } = props;
  const navigate = useNavigate();
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();
  const { onAddQuery } = useConnectionQueries();
  const [isEdit, setIsEdit] = useState(!!props.isEditMode);
  const { query: activeQuery } = useActiveConnectionQuery();
  const { data: connection } = useGetConnectionById(activeQuery?.connectionId);
  const { dismiss } = useActionDialogs();
  const { add: addToast } = useToaster();
  // TODO: intelligently pick up the table name from schema of data

  const onSave = async ({ query, connection, columns, data, rawValue, deltaFields }) => {
    let sql = '';

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
      case 'mysql':
      case 'mariadb':
      case 'mssql':
      case 'postgres':
      case 'sqlite':
        // find out the main condition
        for (const column of columns) {
          if (column.primaryKey) {
            conditions[column.name] = data[column.name];
          }
        }

        if (Object.keys(conditions).length === 0) {
          for (const column of columns) {
            if (column.name?.toString().toLowerCase()?.includes('id')) {
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
          )?.query || '',
        );
        setIsEdit(false);
        break;
      case 'cassandra':
        // find out the main condition
        for (const column of columns) {
          if (column.kind === 'partition_key') {
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
          )?.query || '',
        );
        setIsEdit(false);
        break;
      case 'mongodb':
        try {
          const jsonValue = JSON.parse(rawValue);

          // filter out the id inside of delta
          delete jsonValue['_id'];

          sql = formatJS(
            getUpdateWithValuesForMongoDB(
              {
                ...query,
                dialect: connection.dialect,
                columns,
              },
              jsonValue,
              conditions,
            )?.query || '',
          );

          setIsEdit(false);
        } catch (err) {
          await addToast({
            message: `Dialect "${connection?.dialect}" value needs to be a valid JSON object. Input provided is not a valid JSON...`,
          });
          return;
        }
        break;
      // case 'redis': // TODO: to be implemented
      case 'cosmosdb':
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
            )?.query || '',
          );

          setIsEdit(false);
        } catch (err) {
          await addToast({
            message: `Dialect "${connection?.dialect}" value needs to be a valid JSON object. Input provided is not a valid JSON...`,
          });
          return;
        }
        break;
      case 'aztable':
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
            )?.query || '',
          );

          setIsEdit(false);
        } catch (err) {
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
          <RecordForm
            data={data}
            query={activeQuery}
            onSave={onSave}
            onCancel={onCancel}
            isEditMode={true}
            mode='edit'
          />
        </>
      ) : (
        <>
          {isDialectSupportEditRecordForm(connection?.dialect) && (
            <Box>
              <Button variant='contained' onClick={() => setIsEdit(true)}>
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
type RecordDetailsPageProps = {
  data: any;
  isEditMode?: boolean;
};

export function RecordDetailsPage(props: RecordDetailsPageProps): JSX.Element | null {
  const { data, isEditMode } = props;
  const [tabIdx, setTabIdx] = useState(0);

  const tabHeaders = [<>Form Display</>, <>Raw JSON</>];

  const tabContents = [
    <Box className='FormInput__Container' key='formDisplay'>
      <EditRecordPage data={data} isEditMode={!!isEditMode} />
    </Box>,

    <Box className='FormInput__Container' key='rawJsonDisplay'>
      <JsonFormatData data={data} />
    </Box>,
  ];

  return (
    <Tabs
      tabIdx={tabIdx}
      tabHeaders={tabHeaders}
      tabContents={tabContents}
      onTabChange={(newTabIdx) => setTabIdx(newTabIdx)}></Tabs>
  );
}
