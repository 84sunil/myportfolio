import { Link } from "react-router-dom";
import logo from "../assets/yas.png";
const Navbar = () => {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4">
     <Link to="/" className="navbar-brand fw-bold text-primary d-flex align-items-center">
        <img 
          src={logo} 
          alt="Logo" 
          style={{ width: "100px", height: "100px", marginRight: "10px" }} 
        />
      </Link>
      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
        <ul className="navbar-nav">
          {["Home", "About", "Services", "Portfolio", "Contact"].map((item) => (
            <li className="nav-item mx-2" key={item}>
              <a className="nav-link" href={`#${item.toLowerCase()}`}>{item}</a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
