import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  const handleHireMe = () => {
    navigate("/contact");
  };

  const handleMyWork = () => {
    navigate("/portfolio");
  };

  return (
    <section className="bg-dark text-white text-center py-5" id="home">
      <div className="container">
        <div className="mb-3">
          <i className="bi bi-facebook mx-2"></i>
          <i className="bi bi-twitter mx-2"></i>
          <i className="bi bi-linkedin mx-2"></i>
          
        </div>
        <h1 className="display-4 fw-bold">I'm a Developer</h1>
        <p className="lead">Experienced designer creating websites, Developing and more.</p>
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
