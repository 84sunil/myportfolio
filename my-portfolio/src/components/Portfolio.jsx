const projects = [
  {
    title: "Portfolio Website",
    image: "image/khil.png",
    link: "https://github.com/84sunil/portfolio-2.git",
  },
  {
    title: "E-commerce Store",
    image: "image/suya.png",
    link: "https://github.com/84sunil/E-commerce.git",
  },
  {
    title: "expense tracker",
    image: "image/yasu.png",
    link: "https://github.com/84sunil/expen",
  },
];

const Portfolio = () => (
  <section className="bg-dark text-white py-5" id="portfolio">
    <div className="container">
      <h2 className="text-center mb-5">Portfolio</h2>
      <div className="row">
        {projects.map((project, index) => (
          <div className="col-md-4 mb-4" key={index}>
            <div className="bg-secondary text-center p-4 rounded h-100">
              <h5 className="mb-3">{project.title}</h5>
              <a href={project.link} target="_blank" rel="noopener noreferrer">
                <img
                  src={project.image}
                  alt={project.title}
                  className="img-fluid rounded mb-2"
                />
              </a>
              <a
                href={project.link}
                className="btn btn-outline-light mt-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Project
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Portfolio;
