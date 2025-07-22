# 🤖 BitBot - College Chatbot & Admin Panel

A comprehensive college management system with an intelligent chatbot interface and powerful admin panel for Bhagwant Institute of Technology.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Admin Panel](#admin-panel)
- [Chatbot](#chatbot)
- [Technologies Used](#technologies-used)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 🤖 Chatbot Features
- **Intelligent Responses**: AI-powered responses to student queries
- **College Information**: Comprehensive information about courses, faculty, facilities
- **Real-time Chat**: Instant messaging with typing indicators
- **Voice Support**: Text-to-speech and speech-to-text capabilities
- **Multi-language Support**: Support for multiple languages
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 🛡️ Admin Panel Features
- **Dashboard**: Overview of system statistics and recent activities
- **Course Management**: Complete CRUD operations for courses
- **Bulk Operations**: Import/Export courses via CSV files
- **Faculty Management**: Manage faculty information and assignments
- **Student Management**: Handle student records and enrollment
- **Timetable Management**: Create and manage class schedules
- **Notice Management**: Publish and manage college notices
- **Fee Structure**: Manage course fees and payment structures
- **Settings**: System configuration and customization options

## 📁 Project Structure

```
ChatBot/
├── admin/                          # Admin Panel
│   ├── css/
│   │   ├── admin-panel.css        # Main admin panel styles
│   │   ├── courses.css            # Course management styles
│   │   └── library-theme.css      # Third-party library themes
│   ├── js/
│   │   ├── admin-panel.js         # Main admin panel functionality
│   │   ├── courses.js             # Course management functionality
│   │   ├── auth.js                # Authentication system
│   │   ├── firebase-config.js     # Firebase configuration
│   │   └── firebase-service.js    # Firebase service layer
│   ├── admin-panel.html           # Main admin dashboard
│   ├── courses.html               # Course management page
│   ├── all-courses.html           # View all courses page
│   ├── timetables.html            # Timetable management
│   ├── syllabus.html              # Syllabus management
│   ├── notices.html               # Notice management
│   ├── fee-structure.html         # Fee structure management
│   ├── faculty.html               # Faculty management
│   ├── college-info.html          # College information
│   ├── students.html              # Student management
│   └── settings.html              # System settings
├── assets/                        # Static assets
│   ├── favicon.ico
│   ├── favicon.svg
│   └── images/
├── css/                           # Chatbot styles
│   └── style.css
├── js/                            # Chatbot JavaScript
│   └── script.js                  # Main chatbot functionality
├── index.html                     # Main chatbot interface
└── README.md                      # This file
```

## 🚀 Installation

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase account (for database and authentication)
- Web server (for local development)

### Setup Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/bitbot-chatbot.git
   cd bitbot-chatbot
   ```

2. **Firebase Configuration**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Enable Authentication (optional)
   - Copy your Firebase configuration
   - Update `js/firebase-config.js` with your Firebase credentials

3. **Local Development Server**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Access the Application**
   - Chatbot: `http://localhost:8000`
   - Admin Panel: `http://localhost:8000/admin/admin-panel.html`

## 💻 Usage

### Chatbot Interface
1. Open `index.html` in your browser
2. Start typing your questions in the chat input
3. The bot will respond with relevant information
4. Use voice commands by clicking the microphone icon
5. Toggle between light and dark themes

### Admin Panel
1. Navigate to `admin/admin-panel.html`
2. Use the sidebar to access different management sections
3. Add, edit, or delete records as needed
4. Use bulk import/export features for efficient data management

## 🛡️ Admin Panel

### Course Management
- **Add Courses**: Create new course entries with detailed information
- **View All Courses**: Browse all courses in a searchable, sortable table
- **Edit Courses**: Modify existing course information
- **Delete Courses**: Remove courses with confirmation dialogs
- **Import/Export**: Bulk operations using CSV files

### Key Features
- **Responsive Design**: Works on all device sizes
- **Real-time Validation**: Form validation with instant feedback
- **Modern UI**: Clean, professional interface with smooth animations
- **Data Persistence**: All data stored in Firebase Firestore
- **Search & Filter**: Advanced filtering and search capabilities

## 🤖 Chatbot

### Capabilities
- **Natural Language Processing**: Understands various question formats
- **Context Awareness**: Maintains conversation context
- **Rich Responses**: Provides detailed, formatted responses
- **Quick Actions**: Predefined quick response buttons
- **Multimedia Support**: Can display images, links, and formatted content

### Supported Queries
- Course information and details
- Faculty information
- College facilities and infrastructure
- Admission procedures and requirements
- Fee structure and payment information
- Academic calendar and important dates
- Contact information and location

## 🛠️ Technologies Used

### Frontend
- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript (ES6+)**: Modern JavaScript features
- **Font Awesome**: Icon library
- **Google Fonts**: Typography (Poppins font family)

### Libraries & Frameworks
- **Tabulator.js**: Advanced data tables
- **SweetAlert2**: Beautiful alert dialogs
- **Toastify.js**: Toast notifications
- **Firebase SDK**: Backend services

### Backend Services
- **Firebase Firestore**: NoSQL database
- **Firebase Authentication**: User authentication (optional)
- **Firebase Hosting**: Web hosting (optional)

## ⚙️ Configuration

### Firebase Setup
```javascript
// js/firebase-config.js
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### Database Structure
```
courses/
├── courseId1/
│   ├── courseName: "BCA"
│   ├── department: "Computer Applications"
│   ├── courseAffiliation: "AKTU"
│   ├── duration: "3 years"
│   ├── totalSeats: 60
│   ├── feeStructure: "₹25,000"
│   ├── hodName: "Dr. John Doe"
│   └── ...
```

### Customization
- **Themes**: Modify CSS variables in `admin-panel.css` and `courses.css`
- **Colors**: Update color schemes in the CSS files
- **Branding**: Replace logos and brand information
- **Content**: Update college-specific information in the chatbot responses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow consistent code formatting
- Add comments for complex functionality
- Test thoroughly before submitting
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Bhagwant Institute of Technology** - For the project requirements and support
- **Firebase** - For providing excellent backend services
- **Open Source Community** - For the amazing libraries and tools used

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Made with ❤️ for Bhagwant Institute of Technology**
