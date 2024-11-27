import express from "express";
const port = process.env.PORT || 3000;

const app = express();

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

app.get("/", async (req, res) => {
  res.json(`Get successfully`);
});