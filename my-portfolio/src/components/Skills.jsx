
const Skills = () => (
  <section className="bg-dark text-white py-5" id="skills">
    <div className="container">
      <h2 className="text-center mb-5">My Skills</h2>
      {[
        { name: 'HTML', level: '100%' },
        { name: 'CSS', level: '95%' },
        { name: 'JAVASCRIPT', level: '90%' },
        { name: 'PYTHON', level: '85%' },
        { name: 'REACT JS', level: '85%' },
        { name: 'BOOTSTRAP', level: '85%' },
        { name: 'DJANGO', level: '50%' },
        { name: 'MYSQL ', level: '85%' }

      ].map(skill => (
        <div className="mb-4" key={skill.name}>
          <h5>{skill.name}</h5>
          <div className="progress">
            <div className="progress-bar bg-info" style={{ width: skill.level }}>{skill.level}</div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default Skills;
