
const Services = () => (
  <section className="bg-black text-white py-5" id="services">
    <div className="container">
      <h2 className="text-center mb-5">Services</h2>
      <div className="row">
        {["Web Developer", "Front-end Developer","Python developer"].map(service => (
          <div className="col-md-4" key={service}>
            <div className="p-4 bg-dark rounded text-center h-100">
              <h5>{service}</h5>
              <p>Professional {service} services to make your brand shine.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Services;
