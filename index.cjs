const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs-extra");
const app = express();

const CLIENT_ID = "1413933552533241990";
const CLIENT_SECRET = "ST7euR0805MzA_za8eimv_hXXiIyt_Z_";
const REDIRECT_URI = "https://imperialist-1.onrender.com/callback";

// URL de autorização completa
const OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds%20connections%20guilds%20guilds.members.read`;

// Rota para iniciar login
app.get("/oauth2/authorize", (req, res) => {
  res.redirect(OAUTH_URL);
});

// Rota callback do Discord
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  console.log("Código recebido:", code);

  if (!code) return res.send("Código não encontrado.");

  const data = new URLSearchParams();
  data.append("client_id", 1413933552533241990);
  data.append("client_secret", ST7euR0805MzA_za8eimv_hXXiIyt_Z_);
  data.append("grant_type", "authorization_code");
  data.append("code", code);
  data.append("redirect_uri", https://imperialist-1.onrender.com/callback);
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

    // Pega servidores do usuário
    const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const guildsData = await guildsRes.json();
    console.log("Servidores do usuário:", guildsData);

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
      guilds: guildsData,
      date: new Date().toISOString()
    });

    await fs.writeJSON(loginsFile, logins, { spaces: 2 });

    res.send(`Olá ${userData.username}#${userData.discriminator}! Seu login foi registrado.`);
  } catch (err) {
    console.error(err);
    res.send("Ocorreu um erro.");
  }
});

// Rota para ver todos os logins
app.get("/logins", async (req, res) => {
  const loginsFile = "./logins.json";
  if (!await fs.pathExists(loginsFile)) return res.send("Nenhum login registrado ainda.");
  const logins = await fs.readJSON(loginsFile);
  res.json(logins);
});

// Porta dinâmica para Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
