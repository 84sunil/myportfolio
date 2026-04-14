import { useNavigate } from "react-router-dom";
import "./Hero.css";

const Hero = () => {
  const navigate = useNavigate();

  const handleHireMe = () => {
    const contactSection = document.getElementById("contact");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/contact");
    }
  };

  const handleMyWork = () => {
    const portfolioSection = document.getElementById("portfolio");
    if (portfolioSection) {
      portfolioSection.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/portfolio");
    }
  };

  return (
    <section className="hero-section" id="home">
      <div className="hero-container">
        {/* Social Icons */}
        <div className="social-icons">
          <a
            href="https://www.facebook.com/share/1CNoexRpj3/"
            target="_blank"
            rel="noreferrer"
          >
            <i className="bi bi-facebook"></i>
          </a>
          <a
            href="https://github.com/84sunil"
            target="_blank"
            rel="noreferrer"
          >
            <i className="bi bi-github"></i>
          </a>
          <a
            href="https://www.linkedin.com/in/sunil-luhar-a89392287?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
            target="_blank"
            rel="noreferrer"
          >
            <i className="bi bi-linkedin"></i>
          </a>
        </div>

        {/* Heading */}
        <h1 className="hero-title">I'm a Developer</h1>

        {/* Subtext */}
        <p className="hero-subtext">
          Experienced designer creating websites, Developing and more.
        </p>

        {/* Buttons */}
        <div className="hero-buttons">
          <button className="btn-primary" onClick={handleMyWork}>
            My Work
          </button>
          <button className="btn-outline" onClick={handleHireMe}>
            Hire Me
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
