const fs = require('fs');
const path = require('path');

const files = ['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html'];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace old .logo rule
    const oldLogoRule = ".logo { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; letter-spacing: -0.5px; color: #0b1a2f; }";
    const newLogoRule = ".logo { font-family: 'Fraunces', serif; font-size: 1.7rem; font-weight: 700; letter-spacing: -0.5px; color: #0b1a2f; display: flex; align-items: center; gap: 10px; text-decoration: none; }";
    
    if (content.includes(oldLogoRule)) {
      content = content.replace(oldLogoRule, newLogoRule);
    }
    
    // Add .nav-logo rule before </style> if not present
    if (!content.includes('.nav-logo {')) {
      const navLogoRule = "\n    .nav-logo { max-height: 60px; width: auto; display: block; }\n  </style>";
      content = content.replace('</style>', navLogoRule);
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + file);
  }
});
