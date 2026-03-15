const path = require("path");
const express = require("express");
const { app } = require("./app");

const PORT = 3000;
const distPath = path.join(__dirname, "..", "dist");

app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`App running at http://localhost:${PORT}`);
});
