require("dotenv").config();
const express = require("express");
const fs = require("fs-extra");
const { Client, GatewayIntentBits } = require("discord.js");

// Para Node.js onde fetch não é global
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

// ----------- Configurações do Discord -----------
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;
const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID;

// ----------- Inicializa o Bot -----------
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });
bot.login(BOT_TOKEN);

bot.once("ready", () => {
  console.log(`🤖 Bot online: ${bot.user.tag}`);
});

// ----------- URL OAuth2 -----------
const OAUTH_URL = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;

// ----------- Rotas Express -----------
app.get("/", (req, res) => {
  res.send(`<h3>Login com Discord</h3><p><a href="/login">Clique para autorizar</a></p>`);
});

app.get("/login", (req, res) => res.redirect(OAUTH_URL));

app.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send("Usuário rejeitou a autorização.");
  if (!code) return res.status(400).send("Código não informado.");

  try {
    // Troca code por access token
    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (!tokenRes.ok) return res.status(500).send("Erro ao trocar code por token.");
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Pega dados do usuário
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userData = await userRes.json();

    // Pega servidores do usuário
    const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const guilds = await guildsRes.json();

    // Salva no log
    const loginsFile = "./logins.json";
    let logins = [];
    if (await fs.pathExists(loginsFile)) {
      logins = await fs.readJSON(loginsFile);
    }

    const loginEntry = {
      code,
      username: userData.username,
      discriminator: userData.discriminator,
      id: userData.id,
      guilds: guilds.map(g => ({ id: g.id, name: g.name, owner: g.owner })),
      date: new Date().toISOString()
    };

    logins.push(loginEntry);
    await fs.writeJSON(loginsFile, logins, { spaces: 2 });

    // Envia pro canal do Discord
    const channel = await bot.channels.fetch(REPORT_CHANNEL_ID).catch(() => null);
    if (channel?.isTextBased?.()) {
      let msg = `📥 **Novo login registrado**\nUsuário: ${userData.username}#${userData.discriminator}\nID: ${userData.id}\nServidores:\n`;
      let guildsText = "";
      guilds.forEach((g) => {
        const line = `- ${g.name} (ID: ${g.id}) | Owner: ${g.owner ? "✅" : "❌"}\n`;
        if (guildsText.length + line.length > 1900) {
          channel.send(msg + guildsText);
          guildsText = line;
        } else {
          guildsText += line;
        }
      });
      if (guildsText.length > 0) channel.send(msg + guildsText);
    }

    res.send(`<h3>✅ Sucesso!</h3><p>Olá ${userData.username}#${userData.discriminator}! Seu login foi registrado.</p>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro interno.");
  }
});

// ----------- Rota para ver logins -----------
app.get("/logins", async (req, res) => {
  const loginsFile = "./logins.json";
  if (!await fs.pathExists(loginsFile)) return res.send("Nenhum login registrado ainda.");
  const logins = await fs.readJSON(loginsFile);
  res.json(logins);
});

// ----------- Inicializa servidor -----------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🌍 Servidor rodando na porta ${PORT}`));
