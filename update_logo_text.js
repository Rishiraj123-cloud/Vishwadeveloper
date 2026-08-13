const fs = require('fs');
const path = require('path');

const files = [
  'reset-password.html', 'login.html', 'contact.html', 'property-details.html',
  'signup.html', 'agents.html', 'user-dashboard.html', 'forgot-password.html',
  'about.html', 'index.html', 'listings.html'
];

const target = '<a href="index.html" class="logo"><img src="logoVD.png" alt="Vishwa Developers Logo" class="nav-logo"></a>';
const replacement = '<a href="index.html" class="logo"><img src="logoVD.png" alt="Vishwa Developers Logo" class="nav-logo">VISHWA<span>DEVELOPERS</span></a>';

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

// For owner dashboard
const ownerPath = path.join(__dirname, 'owner-dashboard.html');
if (fs.existsSync(ownerPath)) {
  let content = fs.readFileSync(ownerPath, 'utf8');
  content = content.replace(
    '<a href="index.html" class="logo"><img src="logoVD.png" alt="Vishwa Developers Logo" class="nav-logo"></a>',
    '<a href="index.html" class="logo"><img src="logoVD.png" alt="Vishwa Developers Logo" class="nav-logo">VISHWA<span>CRM</span></a>'
  );
  fs.writeFileSync(ownerPath, content, 'utf8');
  console.log('Updated owner-dashboard.html');
}
