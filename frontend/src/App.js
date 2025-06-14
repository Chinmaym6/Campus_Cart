import './App.css';
import login from './pages/auth/login';
import Footer from './components/common/Footer';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div>
      <login />
    </div>
  );
}

export default App;
