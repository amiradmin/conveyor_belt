# Conveyor Belt Monitoring & Vision System Dashboard

## Project Overview

This project is a React.js-based web dashboard designed for monitoring conveyor belt systems with integrated video feed and AI detection metrics. It features a SCADA/HMI dark mode style user interface optimized for industrial environments. The dashboard provides live conveyor status indicators, a central video feed with controls, AI detection cards, and bottom tab navigation for analytics and system settings.

### Features

- Responsive grid layout with header, left panel, center video feed, right panel, and bottom tabs
- Dark mode styling with toggle support
- Live conveyor status indicators (status, belt speed, load volume, material type, camera connection)
- Center video feed placeholder with overlay controls (switch camera, freeze frame, capture issue, diagnostics)
- Right panel with AI detection metrics cards showing status and confidence
- Bottom tabs for analytics (volume flow, belt alignment & speed, anomaly history) and system settings
- Accessible UI components with proper ARIA attributes
- Jest and React Testing Library tests for all main components
- Dockerized development and production environment

---

## Prerequisites

- Node.js version 18 or higher
- npm (comes with Node.js)
- Docker (optional, for containerized development and production builds)

---

## Installation

1. Clone the repository:

    git clone https://github.com/yourusername/conveyor-belt-monitoring-dashboard.git
    cd conveyor-belt-monitoring-dashboard

2. Install dependencies:

    npm install

3. Copy and configure environment variables:

    cp .env.example .env

   Edit `.env` file if you want to customize backend API URL or video feed URL.

---

## Running the Application

### Development Mode

Start the development server with:

    npm start

This opens the app on [http://localhost:3000](http://localhost:3000) with hot reloading.

### Running Tests

Run all tests once (no watch mode):

    npm test

### Production Build

Create an optimized production build:

    npm run build

---

## Docker Usage

### Development with Docker Compose

Make sure Docker is installed and running.

Start development server inside container:

    docker-compose up --build

The app will be available at [http://localhost:3000](http://localhost:3000).

### Production Build and Serve with Nginx

Build the Docker image:

    docker build -t conveyor-dashboard .

Run container:

    docker run -p 3000:80 conveyor-dashboard

Access at [http://localhost:3000](http://localhost:3000).

---

## Configuration

- `.env` file holds environment variables:
  - `REACT_APP_API_URL` - Backend API base URL (optional)
  - `REACT_APP_VIDEO_FEED_URL` - Video feed source URL (placeholder used by default)

- Dark mode can be toggled by clicking the moon/sun icon in the header or pressing Ctrl+D.

---

## Usage Examples

- Monitor real-time conveyor status on the left panel.
- View live video feed and control cameras in the center.
- Review AI detection alerts and confidence scores on the right panel.
- Switch between analytics and settings tabs at the bottom.
- Capture issues or run diagnostics using overlay controls.

---

## Troubleshooting

- **App doesn't start or crashes**: Ensure Node.js 18+ and npm are installed. Delete `node_modules` and `package-lock.json` then run `npm install`.
- **Docker issues**: Verify Docker daemon is running. Use `docker-compose logs` for error details.
- **Tests failing**: Update dependencies or clear Jest cache with `npm test -- --clearCache`.
- **Environment variables not loading**: Confirm `.env` file is in project root. Restart development server after changes.

---

## Project Structure

