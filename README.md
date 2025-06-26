# Simple Registration/Login Page

A modern, responsive registration and login system built with React, Express.js, and SQLite for local development and testing.

**🚀 Now with GitHub → Vercel automatic deployment!**

## 🚀 Features

- **User Registration**: Create new accounts with email and password
- **User Login**: Secure authentication with JWT tokens
- **Dashboard**: Protected user dashboard with profile information
- **Responsive Design**: Works on desktop and mobile devices
- **Form Validation**: Client-side and server-side validation
- **Secure Authentication**: Password hashing with bcrypt
- **Local Database**: SQLite for data persistence
- **Modern UI**: Clean, professional interface with animations
- **Automatic Deployment**: GitHub → Vercel CI/CD pipeline

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **CSS3** - Modern styling with gradients and animations

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **SQLite3** - Local database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-validator** - Input validation
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
project/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Auth.css
│   │   │   └── Dashboard.css
│   │   ├── App.jsx         # Main app component
│   │   └── App.css         # Global styles
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── server/                 # Backend Express app
│   ├── index.js            # Main server file
│   ├── users.db            # SQLite database (created automatically)
│   └── package.json        # Backend dependencies
└── README.md               # Project documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (version 14 or higher)
- npm (version 6 or higher)

### Installation

1. **Clone or download the project**
   ```bash
   cd /path/to/project
   ```

2. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../server
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   The server will start on `http://localhost:5000`

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```
   The frontend will start on `http://localhost:3000`

3. **Open your browser**
   Navigate to `http://localhost:3000` to access the application

## 📖 Usage

### Registration
1. Click "Register here" on the login page
2. Fill in your name, email, and password
3. Confirm your password
4. Click "Register" to create your account

### Login
1. Enter your email and password
2. Click "Login" to access your dashboard

### Dashboard
- View your profile information
- Check account status
- Use the logout button to sign out

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login user
- `GET /api/profile` - Get user profile (protected)

### Health Check
- `GET /api/health` - Server health status

## 🔒 Security Features

- **Password Hashing**: Passwords are hashed using bcrypt with salt rounds
- **JWT Tokens**: Secure authentication tokens with 24-hour expiration
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured for local development
- **Error Handling**: Generic error messages (no sensitive data exposure)

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Works on all screen sizes
- **Smooth Animations**: CSS transitions and keyframe animations
- **Loading States**: Visual feedback during API calls
- **Error Handling**: Clear error messages and validation
- **Accessibility**: Keyboard navigation and focus management

## 🛠️ Development

### Frontend Development
```bash
cd client
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend Development
```bash
cd server
npm run dev          # Start with nodemon (auto-restart)
npm start            # Start production server
```

### Database
The SQLite database (`users.db`) is created automatically when the server starts. The database file is stored in the `server/` directory.

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the `server/` directory:

```env
PORT=5000
JWT_SECRET=your-secret-key-here
```

### Default Configuration
- **Frontend Port**: 3000
- **Backend Port**: 5000
- **JWT Secret**: 'your-secret-key' (change in production)
- **JWT Expiration**: 24 hours

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the port in the server configuration
   - Kill processes using the ports

2. **Database errors**
   - Delete the `users.db` file and restart the server
   - Check file permissions

3. **CORS errors**
   - Ensure the backend is running on port 5000
   - Check that the frontend is making requests to the correct URL

4. **Module not found errors**
   - Run `npm install` in both client and server directories
   - Check that all dependencies are properly installed

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or issues, please open an issue in the repository.

---

**Built with ❤️ using React, Express, and SQLite** 