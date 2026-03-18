const bcrypt = require('bcryptjs');
bcrypt.hash('1234!', 12).then(hash => {
  console.log(hash);
  process.exit();
});