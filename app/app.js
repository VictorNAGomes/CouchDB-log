import express from "express";
const port = process.env.PORT || 3000;
const ichacara_url = process.env.ICHACARA_URL || "http://192.168.18.7:3001"
import Nano from "nano";
const nano = Nano("http://admin:password@couchdb:5984");

const app = express();

let db;

app.listen(port, async () => {  
  const dbList = await nano.db.list();
  
  if (!dbList.includes("logs")) {
    await nano.db.create("logs");
  }
  
  db = nano.db.use('logs');

  console.log(`Servidor rodando na porta ${port}`);
});

app.get("/", async (req, res) => {
  res.json(`Get successfully`);
});

app.post("/fetch-metrics", async (req, res) => {
  try {
    const response = await fetch(`${ichacara_url}/event`);

    if (!response.ok) {
      throw new Error(`Erro ao buscar eventos: ${response.status} - ${response.statusText}`);
    }

    const events = await response.json();

    const listedFarms = events.filter(ev => ev.event.includes("Chácara id:"));

    const countPerFarm = listedFarms.reduce((cont, ev) => {
      const match = ev.event.match(/Chácara id:(\d+)/);
      if (match) {
        const id = match[1];
        cont[id] = (cont[id] || 0) + 1;
      }
      return cont;
    }, {});

    const createdUsers = events.filter(ev => ev.event.includes("Conta criada")).length;

    db.get('createdUsers').then(document => {
      document.createdUsersCount = createdUsers
      db.insert(document);
    }).catch(err => {
      db.insert({createdUsersCount: createdUsers}, "createdUsers");
    });

    const topThreeFarms = Object.entries(countPerFarm)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({ farmId: id, count: count }));

    db.get('topThreeFarms').then(document => {
      document.topThreeFarms = topThreeFarms
      db.insert(document);
    }).catch(err => {
      db.insert({topThreeFarms}, "topThreeFarms");
    });

    const countPerFarmFormated = Object.entries(countPerFarm).map(([id, count]) => ({ farmId: id, count: count }));

    db.get('countPerFarm').then(document => {
      document.countPerFarm = countPerFarmFormated
      db.insert(document);
    }).catch(err => {
      db.insert({countPerFarm: countPerFarmFormated}, "countPerFarm");
    });



    res.json({msg: "Métricas geradas com sucesso!"});

  } catch (err) {
    console.log(err)
    console.error("Erro ao buscar métricas:", err.message);
    res.status(500).json({ error: "Erro ao buscar métricas" });
  }
});

app.get("/metrics", async (req, res) => {
  try {
    const createdUsers = await db.get('createdUsers')
    const topThreeFarms = await db.get('topThreeFarms')
    const countPerFarm = await db.get('countPerFarm')

    const metrics = {
      createdUsers: createdUsers.createdUsersCount,
      topThreeFarms: topThreeFarms.topThreeFarms,
      countPerFarm: countPerFarm.countPerFarm
    }
    
    res.json(metrics);
  } catch (err) {
    res.status(400).json({ error: "Você precisa rodar a rota /fetch-metrics primeiro" });
  }
});

app.get("/metrics/created-users-count", async (req, res) => {
  try {
    const createdUsers = await db.get('createdUsers')
    res.json({CreatedUserCount: createdUsers.createdUsersCount});
  } catch (err) {
    res.status(400).json({ error: "Você precisa rodar a rota /fetch-metrics primeiro" });
  }
});

app.get("/metrics/top-three-farms", async (req, res) => {
  try {
    const topThreeFarms = await db.get('topThreeFarms')
    res.json({topThreeFarms: topThreeFarms.topThreeFarms});
  } catch (err) {
    res.status(400).json({ error: "Você precisa rodar a rota /fetch-metrics primeiro" });
  }
});

app.get("/metrics/count-per-farm", async (req, res) => {
  try {
    const countPerFarm = await db.get('countPerFarm')
    res.json({countPerFarm: countPerFarm.countPerFarm});
  } catch (err) {
    res.status(400).json({ error: "Você precisa rodar a rota /fetch-metrics primeiro" });
  }
});