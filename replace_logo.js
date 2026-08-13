const fs = require('fs');
const path = require('path');

const files = [
  'reset-password.html', 'login.html', 'contact.html', 'property-details.html',
  'signup.html', 'agents.html', 'user-dashboard.html', 'forgot-password.html',
  'about.html', 'index.html', 'listings.html'
];

const target = '<div class="logo">VISHWA<span>DEVELOPERS</span></div>';
const replacement = '<a href="index.html" class="logo"><img src="logoVD.png" alt="Vishwa Developers Logo" class="nav-logo"></a>';

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + file);
    }
  }
});
