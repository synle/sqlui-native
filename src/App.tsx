import './App.scss';
import React from 'react';
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';

function MainPage() {
  return (
    <div>
      <div>
        <h1>MainPage</h1>
      </div>
      <ConnectionExplorer />
      <NewConnectionButton />
      <QueryBox />
      <ResultBox />
    </div>
  );
}

function ConnectionExplorer() {
  // TODO: hard code for now
  const connections = [1, 2, 3].map((id) => ({ id: `connection.${id}` }));
  return (
    <div>
      {connections.map((connection) => (
        <>
          <h3>Connection {connection.id}:</h3>
          <div>
            <Link to={`/connection/edit/${connection.id}`}>Edit Connection</Link>
          </div>
          <ConnectionDatabaseDescription id={connection.id} key={connection.id} />
        </>
      ))}
    </div>
  );
}

type ConnectionDatabaseDescriptionProps = {
  /**
   * @type String : connectionId
   */
  id: string;
};

function ConnectionDatabaseDescription(props: ConnectionDatabaseDescriptionProps) {
  const connectionId = props.id;

  // TODO: hard code for now
  const databases = [4, 5, 6].map((id) => ({ id: `db.${connectionId}.${id}` }));

  return (
    <div>
      {databases.map((database) => (
        <>
          <div>
            <h4>Database {database.id}:</h4>
          </div>
          <TableDatabaseDescription id={database.id} key={database.id} />
        </>
      ))}
    </div>
  );
}

type TableDatabaseDescriptionProps = {
  /**
   * @type String : databaseId
   */
  id: string;
};

function TableDatabaseDescription(props: TableDatabaseDescriptionProps) {
  const databaseId = props.id;

  // TODO: hard code for now
  const tables = [7, 8, 9].map((id) => ({ id: `tbl.${databaseId}.${id}` }));

  return (
    <div>
      {tables.map((table) => (
        <>
          <div>
            <h4>Table {table.id}:</h4>
          </div>
          <ColumnDatabaseDescription id={table.id} key={table.id} />
        </>
      ))}
    </div>
  );
}

type ColumnDatabaseDescriptionProps = {
  /**
   * @type String : tableId
   */
  id: string;
};

function ColumnDatabaseDescription(props: ColumnDatabaseDescriptionProps) {
  const tableId = props.id;

  // TODO: hard code for now
  const columns = ['a', 'b', 'c'].map((id) => ({ id: `column.${tableId}.${id}` }));

  return (
    <div>
      {columns.map((column) => (
        <>
          <div>
            <h4>column {column.id}:</h4>
          </div>
        </>
      ))}
    </div>
  );
}

function QueryBox() {
  return <div>QueryBox</div>;
}

function ResultBox() {
  return <div>ResultBox</div>;
}

function NewConnectionButton() {
  return (
    <div>
      <Link to='/connection/new'>NewConnectionButton</Link>
    </div>
  );
}

function NewConnectionPage() {
  return (
    <div>
      NewConnectionPage
      <ConnectionForm />
    </div>
  );
}

function EditConnectionPage() {
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;

  if (!connectionId) {
    return null;
  }

  return (
    <div>
      EditConnectionPage
      <ConnectionForm id={connectionId} />
    </div>
  );
}

type ConnectionFormProps = {
  id?: string;
};
function ConnectionForm(props: ConnectionFormProps) {
  return <div>ConnectionForm {props.id}</div>;
}

function App() {
  return (
    <BrowserRouter>
      <div className='App'>
        <header className='mb2'>
          <h1>SQL UI Native</h1>
        </header>

        {/* this is a test section for link nav*/}
        <nav>
          <div>
            <Link to='/'>Main Page</Link>
          </div>
          <div>
            <Link to='/connection/new'>New Connection Page</Link>
          </div>
        </nav>

        <section>
          <Routes>
            <Route path='/' element={<MainPage />} />
            <Route path='/connection/new' element={<NewConnectionPage />} />
            <Route path='/connection/edit/:connectionId' element={<EditConnectionPage />} />
          </Routes>
        </section>
      </div>
    </BrowserRouter>
  );
}

export default App;
