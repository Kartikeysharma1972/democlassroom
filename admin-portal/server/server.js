require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getAdminDb } = require('./lib/adminDb');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Everything this portal shows comes out of Classroom AI's SQLite file, so
// there is no database server to wait for - open the admin accounts file and
// start serving.
getAdminDb();

app.use('/api/auth', require('./routes/auth'));
app.use('/api/teacher-auth', require('./routes/teacherAuth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/export', require('./routes/export'));
app.use('/api/management', require('./routes/management'));

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Admin server running on port ${PORT}`);
});
