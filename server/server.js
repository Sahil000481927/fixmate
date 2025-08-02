require('dotenv').config();
const app = require('./app');
const { ensureAdminUserExists } = require('./scripts/createAdminUser');
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

(async () => {
    await ensureAdminUserExists();
})();
