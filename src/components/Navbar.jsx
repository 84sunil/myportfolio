import { Link } from "react-router-dom";
import logo from "../assets/yas.png";
import "./Navbar.css"; // custom CSS

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <img
          src={logo}
          alt="Logo"
          className="logo"
        />
      </Link>

      {/* Hamburger Menu */}
      <input type="checkbox" id="menu-toggle" className="menu-toggle" />
      <label htmlFor="menu-toggle" className="menu-icon">&#9776;</label>

      <ul className="navbar-links">
        {["Home", "About", "Services", "Portfolio", "Contact"].map((item) => (
          <li key={item}>
            <a href={item === "Home" ? "/" : `/#${item.toLowerCase()}`}>{item}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
