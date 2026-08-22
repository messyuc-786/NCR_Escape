const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

// Stub endpoints reserved for future save/progression (Phase 6). Not used yet.
app.get('/api/status', (req, res) => {
  res.json({ ok: true, game: 'NCR ESCAPE', phase: 'vertical-slice' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`NCR ESCAPE server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
