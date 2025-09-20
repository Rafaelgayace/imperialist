const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs-extra");
const app = express();

// URL de autorização COMPLETA
const OAUTH_URL = "https://discord.com/api/oauth2/authorize?client_id=1413933552533241990&redirect_uri=https%3A%2F%2Fimperialist-1.onrender.com%2Fcallback&response_type=code&scope=identify%20guilds%20connections%20guilds%20guilds.members.read";

// Rota para iniciar login
app.get("/oauth2/authorize", (req, res) => {
  res.redirect(OAUTH_URL);
});

// Rota callback do Discord
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  console.log("Código recebido:", code);

  if (!code) return res.send("Código não encontrado.");

  // Hardcoded diretamente no data.append
  const data = new URLSearchParams();
  data.append("client_id", "1413933552533241990");
  data.append("client_secret", "ST7euR0805MzA_za8eimv_hXXiIyt_Z_");
  data.append("grant_type", "authorization_code");
  data.append("code", code);
  data.append("redirect_uri", "https://imperialist-1.onrender.com/callback");
  data.append("scope", "identify guilds connections guilds guilds.members.read");

  try {
    // Troca code por access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: data,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const tokenData = await tokenRes.json();
    console.log("Access token:", tokenData.access_token);

    if (!tokenData.access_token) return res.send("Erro ao pegar access token.");

    // Pega dados do usuário
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userData = await userRes.json();
    console.log("Dados do usuário:", userData);

    // Grava login em logins.json
    const loginsFile = "./logins.json";
    let logins = [];
    if (await fs.pathExists(loginsFile)) {
      logins = await fs.readJSON(loginsFile);
    }
    logins.push({
      code: code,
      username: userData.username,
      discriminator: userData.discriminator,
      id: userData.id,
      date: new Date().toISOString()
    });
    await fs.writeJSON(loginsFile, logins, { spaces: 2 });

    res.send(`Olá ${userData.username}#${userData.discriminator}! Seu login foi registrado.`);
  } catch (err) {
    console.error(err);
    res.send("Ocorreu um erro.");
  }
});

const PORT = 10000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
