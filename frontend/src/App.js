import './App.css';
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import Landing from './pages/auth/landingpage';
import Forgot     from './pages/auth/forgot-password';  
import ResetPassword from './components/auth/ResetPassword';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div>
      <Router>
        <Routes>
          <Route path='/' element={<Landing />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/forgot-password' element={<Forgot />} />
          <Route path='/reset-password/:token' element={<ResetPassword />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
