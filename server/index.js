const { app } = require("./app");

const PORT = Number(process.env.PORT) || 3001;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`API server listening on http://${HOST}:${PORT}`);
});
