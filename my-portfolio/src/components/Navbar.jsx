import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import logo from "../assets/yas.png";
import "./Navbar.css"; // custom CSS

const Navbar = () => {
  const { user, login, register, logout } = useContext(AuthContext);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginState, setIsLoginState] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isLoginState) {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
      setShowAuthModal(false);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || "Authentication Failed");
    }
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-logo">
          <img src={logo} alt="Logo" className="logo" />
        </Link>

        {/* Hamburger Menu */}
        <input type="checkbox" id="menu-toggle" className="menu-toggle" />
        <label htmlFor="menu-toggle" className="menu-icon">&#9776;</label>

        <ul className="navbar-links">
          {["Home", "About", "Services", "Portfolio", "Courses", "Contact"].map((item) => (
            <li key={item}>
              <a href={item === "Home" ? "/" : `/#${item.toLowerCase()}`}>{item}</a>
            </li>
          ))}
          
          <li className="auth-nav-item">
            {user ? (
              <div className="user-dropdown">
                <span className="user-greeting">Hi, {user.username} <i className="bi bi-person-circle"></i></span>
                <div className="dropdown-menu">
                  <Link to="/dashboard">My Dashboard</Link>
                  <button onClick={logout} className="logout-btn">Logout</button>
                </div>
              </div>
            ) : (
              <button 
                className="nav-auth-btn" 
                onClick={() => { setIsLoginState(true); setShowAuthModal(true); }}
              >
                Login <i className="bi bi-box-arrow-in-right"></i>
              </button>
            )}
          </li>
        </ul>
      </nav>

      {/* Auth Modal Inline */}
      {showAuthModal && (
        <div className="auth-overlay" onClick={(e) => { if (e.target.className === "auth-overlay") setShowAuthModal(false); }}>
          <div className="auth-modal">
            <button className="auth-close" onClick={() => setShowAuthModal(false)}>×</button>
            <h2 style={{color: '#fff', marginBottom: '20px'}}>{isLoginState ? "Welcome Back" : "Create Account"}</h2>
            {error && <div style={{background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '10px', borderRadius: '8px', marginBottom: '15px'}}>{error}</div>}
            
            <form onSubmit={handleAuthSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              <input 
                type="text" 
                placeholder="Username" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
                style={{padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff'}}
              />
              {!isLoginState && (
                <input 
                  type="email" 
                  placeholder="Email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  style={{padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff'}}
                />
              )}
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff'}}
              />
              <button type="submit" style={{padding: '12px', borderRadius: '8px', background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer'}}>
                {isLoginState ? "Login" : "Sign Up"}
              </button>
            </form>
            
            <p style={{textAlign: 'center', marginTop: '15px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)'}}>
              {isLoginState ? "Don't have an account? " : "Already have an account? "}
              <strong style={{color: '#6366f1', cursor: 'pointer'}} onClick={() => setIsLoginState(!isLoginState)}>
                {isLoginState ? "Sign up" : "Login"}
              </strong>
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
