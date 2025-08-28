
const About = () => {
  return (
    <section className="bg-black text-white py-5" id="about">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-4 mb-3">
            <img
              src="image/sun.jpg"
              className="img-fluid rounded"
              alt="About"
            />
          </div>
          <div className="col-md-7">
            <h2>About Me</h2>
            <p>
              I'm Sunil Luhar, a passionate web developer with 6 months of experience. I specialize in concept development, execution, and collaboration to bring your vision to life.
            </p>
            <ul className="list-unstyled text-secondary">
              <li><strong>Name:</strong> SUNIL LUHAR </li>
              <li><strong>Phone:</strong> +91 8469396610</li>
              <li><strong>Email:</strong> sbk8469@gmaail.com </li>
              <li><strong>Twitter:</strong> Sunil Bk</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
