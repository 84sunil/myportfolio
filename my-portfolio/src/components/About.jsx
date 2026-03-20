import "./about.css";

const About = () => {
  return (
    <section className="about-section" id="about">
      <div className="about-container glass-box">
        <div className="about-image">
          <img src="image/sun.jpg" alt="About" />
        </div>
        <div className="about-content">
          <h2><strong>About Me</strong></h2>
          <p>
            I'm Sunil Luhar, a passionate web developer with 6 months of experience. 
            I specialize in concept development, execution, and collaboration to bring 
            your vision to life.
          </p>
          <ul>
            <li><strong>Name:</strong> SUNIL LUHAR</li>
            <li><strong>Phone:</strong> +91 8469396610</li>
            <li><strong>Email:</strong> sbk8469@gmaail.com</li>
            <li><strong>Twitter:</strong> Sunil Bk</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default About;
