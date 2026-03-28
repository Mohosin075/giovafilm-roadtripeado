# Express TypeScript Starter Kit

A modern, scalable, and feature-rich backend starter kit built with Node.js, TypeScript, Express, MongoDB, and Socket.IO. This template is designed to accelerate the development of robust web applications.

## Features

- **Authentication**: JWT-based auth with signup, login, password reset, and role-based access control (RBAC).
- **Social Auth**: Passport integration for Google and Facebook login.
- **Database**: MongoDB with Mongoose ODM.
- **Real-time**: Socket.IO for real-time communication.
- **File Uploads**: AWS S3 integration with image processing using Sharp.
- **Validation**: Request validation using Zod.
- **Error Handling**: Centralized error handling with custom API error classes.
- **Email/SMS**: Integration with Nodemailer, Resend, and Twilio.
- **Payments**: Stripe integration with webhook support.
- **Task Scheduling**: Cron jobs for automated tasks.
- **Logging**: Structured logging with Winston.
- **Development Tools**: ESLint, Prettier, Husky for code quality.

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.IO
- **Validation**: Zod
- **Logging**: Winston
- **Cloud Storage**: AWS S3
- **Payment Gateway**: Stripe
- **Email**: Nodemailer, Resend
- **SMS**: Twilio

## Project Structure

```
src/
├── builder/        # Query builders
├── config/         # Configuration files
├── enum/           # Enums and constants
├── errors/         # Error handling
├── helpers/        # Helper functions
├── interfaces/     # TypeScript interfaces
├── middleware/     # Express middlewares
├── modules/        # Feature modules (Auth, User, etc.)
├── routes/         # API route definitions
├── shared/         # Shared utilities
├── task/           # Scheduled tasks
├── utils/          # Utility functions
├── app.ts          # Express app setup
└── server.ts       # Server entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Redis (Optional, for BullMQ)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start development server:
   ```bash
   npm run start
   ```

### Production

1. Build the project:

   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm run start:prod
   ```

## Scripts

- `npm run start`: Start development server with `ts-node-dev`.
- `npm run build`: Compile TypeScript to JavaScript.
- `npm run start:prod`: Run the compiled production server.
- `npm run lint:check`: Run ESLint check.
- `npm run lint:fix`: Fix ESLint issues.
- `npm run prettier:check`: Check code formatting.
- `npm run prettier:fix`: Fix code formatting.

## License

This project is licensed under the ISC License.
