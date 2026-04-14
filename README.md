# Full Stack Portfolio Project

Welcome to my full-stack portfolio repository. This project consists of a React frontend and a Django backend.

## Project Structure

- **[`my-portfolio/`](./my-portfolio/)**: The frontend React application built with Vite, React Router, and Bootstrap. [Read the Frontend README](./my-portfolio/README.md).
- **[`backend/`](./backend/)**: The backend API built with Django and Django REST Framework for handling contact form submissions and email. [Read the Backend README](./backend/README.md).

## Getting Started

To run the whole project locally, you will need to start both the frontend development server and the backend Django server.

### 1. Start the Backend API

1. Navigate to the `backend/` directory.
2. Activate your virtual environment and install dependencies.
3. Configure your MySQL database settings in `settings.py`.
4. Run migrations: `python manage.py migrate`
5. Start the server: `python manage.py runserver`
6. The API will start on `http://localhost:8000/`.

*For detailed instructions, see the [Backend README](./backend/README.md).*

### 2. Start the Frontend Application

1. Navigate to the `my-portfolio/` directory.
2. Install Node dependencies: `npm install`
3. Run the Vite development server: `npm run dev`
4. Access the frontend at `http://localhost:5173/`.

*For detailed instructions, see the [Frontend README](./my-portfolio/README.md).*
