# TwinFlame - Truth or Dare App

Welcome to TwinFlame, a multi-player "Truth or Dare" application designed for couples and friends. 

## Tech Stack

This project is built using the MERN stack (well, Vite + React + Node.js + Express + MongoDB).
- **Client:** React, TypeScript, Vite, TailwindCSS, Zustand
- **Server:** Node.js, Express, TypeScript, Mongoose/MongoDB
- **Monorepo Management:** pnpm workspaces

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation) (If you don't have it, you can install via `npm install -g pnpm`)

### Installation

1. Clone the repository and navigate to the root directory:
   ```bash
   cd twinflame
   ```

2. Install dependencies for the root, client, and server:
   ```bash
   pnpm install
   ```

3. Setup Environment Variables:
   - Make sure your MongoDB connection string and any necessary environment variables are set up in the `server/.env` file.

### Running the Application

From the root directory, you can start both the client and server concurrently using the provided script:

```bash
pnpm run dev
```

This will run:
- The Express/Node backend on `http://localhost:8000`
- The Vite/React frontend on `http://localhost:5173`

---

## Testing on a Mobile Device (Local Network)

To truly experience the multiplayer nature of this Truth or Dare app, you and your partner can play together using your own phones while the app runs on your computer. 

Since the Vite development server is configured to expose the app to your local network (`host: true`), connecting is easy!

**Follow these steps to connect a phone:**

1. **Connect to the same Wi-Fi:** Ensure that both your computer (running the app) and your phone are connected to the very same Wi-Fi network.
2. **Start the app:** Run `pnpm run dev` in your terminal.
3. **Find your Network IP:** Look at the Vite output in your terminal. It will look something like this:
   ```
   vite vX.X.X ready in XXX ms

   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.5:5173/    <-- (Use this one!)
   ```
4. **Open on Phone:** Open the browser on your phone(s) and go to the `Network` URL provided (e.g., `http://192.168.1.5:5173/`).

5. **Play:** The Vite proxy will securely route API requests to your local backend, giving you a seamless multiplayer experience from your phone!

6. **Play:** To try the web app on same phone you can use the same link in incognito as well and crate two accounts, Add any partner code in another and you will be connected to each other, Test and Enjoy the app
---

## Project Structure

- `/client` - React frontend application
- `/server` - Express/Node backend application
- `/shared` - Shared types/utils (if applicable)

## Scripts

- `pnpm run dev` - Starts both frontend and backend development servers.
- `pnpm run save` - Adds, commits, and pushes changes to the `main` branch.
