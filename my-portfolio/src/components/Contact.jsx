import axios from 'axios';
import { useState } from 'react';
import './contact.css'; // Custom CSS

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/contact/", formData);

      if (response.status === 201) {
        setStatus('Message sent successfully!');
        setFormData({ name: '', email: '', message: '' });
      }
    } catch (error) {
      if (error.response) {
        const errorData = error.response.data;
        const errorMessages = Object.values(errorData).flat().join(' ');
        setStatus(`Error: ${errorMessages}`);
      } else if (error.request) {
        setStatus('An error occurred. No response from server.');
      } else {
        setStatus('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-container">
      <div className="contact-box">
        <h1 className="contact-title">Contact Us</h1>
        <p className="contact-subtitle">
          We'd love to hear from you! Please fill out the form below and we'll get in touch shortly.
        </p>

        <form onSubmit={handleSubmit} className="contact-form">
          {/* Status Message */}
          {status && (
            <div className={`status ${status.includes('Error') ? 'error' : 'success'}`}>
              {status}
            </div>
          )}

          {/* Name */}
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your Name"
            required
          />

          {/* Email */}
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />

          {/* Message */}
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            rows="4"
            value={formData.message}
            onChange={handleChange}
            placeholder="Type your message here..."
            required
          ></textarea>

          {/* Submit */}
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}
