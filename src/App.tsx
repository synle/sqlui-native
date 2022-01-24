import './App.scss';
import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import EditConnectionPage from 'src/views/EditConnectionPage';
import NewConnectionPage from 'src/views/NewConnectionPage';
import MainPage from 'src/views/MainPage';

export default function App() {
  return (
    <HashRouter>
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
            <Route path='/*' element={<MainPage />} />
          </Routes>
        </section>
      </div>
    </HashRouter>
  );
}
