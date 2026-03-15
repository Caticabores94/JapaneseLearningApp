const path = require("path");
const express = require("express");
const { app } = require("./app");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const distPath = path.join(__dirname, "..", "dist");

app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`App running at http://${HOST}:${PORT}`);
});
