import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import { useNavigate, useSearchParams } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { getInsert as getInsertForRdmbs } from 'src/common/adapters/RelationalDataAdapter/scripts';
import Breadcrumbs from 'src/frontend/components/Breadcrumbs';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import JsonFormatData from 'src/frontend/components/JsonFormatData';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import ConnectionDatabaseSelector from 'src/frontend/components/QueryBox/ConnectionDatabaseSelector';
import Tabs from 'src/frontend/components/Tabs';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useGetColumns, useGetConnectionById } from 'src/frontend/hooks/useConnection';
import { useConnectionQueries } from 'src/frontend/hooks/useConnectionQuery';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';
import { formatSQL } from 'src/frontend/utils/formatter';
import { SqluiCore, SqluiFrontend } from 'typings';

type RecordData = any;

type RecordFormProps = {
  onSave: (
    query: Partial<SqluiFrontend.ConnectionQuery>,
    connection: SqluiCore.ConnectionProps,
    item: RecordData,
  ) => void;
  onCancel: () => void;
  query?: SqluiCore.ConnectionQuery;
  data?: RecordData;
};

export function isRecordFormSupportedForDialect(dialect?: string) {
  switch (dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      return true;
    case 'cassandra':
    case 'mongodb':
    case 'redis':
    case 'cosmosdb':
    case 'aztable':
    default:
      return false;
  }
}

type RecordFormReponse = {
  query: Partial<SqluiFrontend.ConnectionQuery>;
  connection?: SqluiCore.ConnectionProps;
  columns?: SqluiCore.ColumnMetaData[];
  data: RecordData;
};

function RecordForm(props) {
  const [searchParams, setSearchParams] = useSearchParams();
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

  const isDisabled = true;

  const onDatabaseConnectionChange = (
    connectionId?: string,
    databaseId?: string,
    tableId?: string,
  ) => {
    // set things
    setQuery({
      ...query,
      connectionId,
      databaseId,
      tableId,
    });
  };

  const onSetData = (key: string, value: any) => {
    setData({ ...data, [key]: value });
  };

  // when query changes update the form field
  useEffect(() => {
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
    const newData = {};

    if (columns) {
      for (const column of columns) {
        newData[column.name] = '';
      }
    }

    setData(newData);
  }, [columns]);

  useEffect(() => {
    setQuery({
      ...query,
      connectionId: searchParams.get('connectionId') || '',
      databaseId: searchParams.get('databaseId') || '',
      tableId: searchParams.get('tableId') || '',
    });
  }, []);

  const contentFormDataView: React.ReactElement[] = [];
  if (!isRecordFormSupportedForDialect(connection?.dialect)) {
    contentFormDataView.push(
      <React.Fragment key='non_supported_dialect'>
        The dialect of this connection is not supported for RecordForm
      </React.Fragment>,
    );
  } else if (columns && columns.length > 0) {
    for (const column of columns) {
      let type = 'text';
      if (column.type?.toLowerCase()?.includes('int')) {
        type = 'number';
      }

      contentFormDataView.push(
        <React.Fragment key={column.name}>
          <div className='FormInput__Row'>
            <TextField
              label={`${column.name} (${column.type.toLowerCase()}) ${
                column.primaryKey ? '(Primary Key)' : ''
              }`}
              defaultValue={data[column.name]}
              onChange={(e) => onSetData(column.name, e.target.value)}
              required={!column.allowNull}
              size='small'
              fullWidth={true}
              autoComplete='off'
              type={type}
            />
          </div>
        </React.Fragment>,
      );
    }
  } else {
    contentFormDataView.push(
      <React.Fragment key='connection_required'>
        Please select a connection, database and table from the above
      </React.Fragment>,
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.onSave({
          query,
          connection,
          columns,
          data,
        });
      }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className='FormInput__Row'>
          <ConnectionDatabaseSelector
            isTableIdRequired={true}
            value={query}
            onChange={onDatabaseConnectionChange}
          />
        </div>

        {/*TODO: render the real form here*/}
        {contentFormDataView}

        <div className='FormInput__Row'>
          <Button variant='contained' type='submit'>
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

  const onSave = async ({ query, connection, columns, data }) => {
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
      // case 'cassandra':
      // case 'mongodb':
      // case 'redis':
      // case 'cosmosdb':
      // case 'aztable':
      // default:
      //   break;
    }

    onAddQuery({
      name: `New Record Query - ${new Date().toLocaleDateString()}`,
      ...query,
      sql,
    });
    navigate('/');
  };

  const onCancel = () => {
    navigate('/');
  };

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className='NewRecordPage'>
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
        <RecordForm onSave={onSave} onCancel={onCancel} />
      </>
    </LayoutTwoColumns>
  );
}

export function EditRecordPage() {
  // TODO: to be implemented
  return null;
}
type RecordDetailsPageProps = {
  data: any;
};

export function RecordDetailsPage(props: RecordDetailsPageProps) {
  const { data } = props;
  const [tabIdx, setTabIdx] = useState(0);
  const columnNames = Object.keys(data || {});

  const tabHeaders = [<>Form Display</>, <>Raw JSON</>];

  const tabContents = [
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }} key='formDisplay'>
      {columnNames.map((columnName) => {
        const columnValue = data[columnName];

        let contentColumnValue = (
          <TextField value={columnValue} size='small' margin='dense' disabled={true} />
        );
        if (columnValue === true || columnValue === false) {
          // boolean
          const booleanLabel = columnValue ? '<TRUE>' : '<FALSE>';
          contentColumnValue = (
            <TextField value={columnValue} size='small' margin='dense' disabled={true} />
          );
        } else if (columnValue === null) {
          // null value
          contentColumnValue = (
            <TextField value='<NULL>' size='small' margin='dense' disabled={true} />
          );
        } else if (columnValue === undefined) {
          // undefined
          contentColumnValue = (
            <TextField value='<undefined>' size='small' margin='dense' disabled={true} />
          );
        } else if (
          columnValue?.toString()?.match(/<[a-z0-9]>+/gi) ||
          columnValue?.toString()?.match(/<\/[a-z0-9]+>/gi)
        ) {
          // raw HTML
          contentColumnValue = (
            <Box
              className='RawHtmlRender'
              dangerouslySetInnerHTML={{ __html: columnValue }}
              sx={{ border: 1, borderRadius: 1, borderColor: 'divider', p: 1 }}
            />
          );
        } else if (Array.isArray(columnValue) || typeof columnValue === 'object') {
          // complex object (array or plain object)
          contentColumnValue = (
            <TextField
              value={JSON.stringify(columnValue, null, 2)}
              size='small'
              margin='dense'
              disabled={true}
              multiline
              inputProps={{ style: { fontFamily: 'monospace' } }}
            />
          );
        } else if (columnValue?.toString()?.length > 200) {
          // greater than a limit, then render as a multiple lines
          contentColumnValue = (
            <TextField value={columnValue} size='small' margin='dense' disabled={true} multiline />
          );
        }

        return (
          <React.Fragment key={columnName}>
            <InputLabel sx={{ mt: 1, fontWeight: 'bold' }}>{columnName}</InputLabel>
            {contentColumnValue}
          </React.Fragment>
        );
      })}
    </Box>,

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} key='rawJsonDisplay'>
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
