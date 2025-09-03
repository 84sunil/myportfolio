import { useNavigate } from "react-router-dom";
import "./Hero.css";

const Hero = () => {
  const navigate = useNavigate();

  const handleHireMe = () => {
    navigate("/contact");
  };

  const handleMyWork = () => {
    navigate("/portfolio");
  };

  return (
    <section className="hero-section text-white text-center py-5" id="home">
      <div className="container">
     
        <div className="mb-3 social-icons">
          <a href="https://www.facebook.com/share/1CNoexRpj3/" target="_blank" rel="noreferrer">
            <i className="bi bi-facebook"></i>
          </a>
          <a href="https://github.com/84sunil" target="_blank" rel="noreferrer">
            <i className="bi bi-github"></i>
          </a>
          <a href="https://www.linkedin.com/in/sunil-luhar-a89392287?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" target="_blank" rel="noreferrer">
            <i className="bi bi-linkedin"></i>
          </a>
        </div>

        <h1 className="display-4 fw-bold">I'm a Developer</h1>


        <p className="lead animated-text">
          Experienced designer creating websites, Developing and more.
        </p>

       
        <div className="mt-4">
          <button className="btn btn-primary me-3" onClick={handleMyWork}>
            My Work
          </button>
          <button className="btn btn-outline-light" onClick={handleHireMe}>
            Hire Me
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
