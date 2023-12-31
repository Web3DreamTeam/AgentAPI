import express from 'express';
import bodyParser from 'body-parser';
import { Agent } from './src/agent';
import { Store } from './src/store';
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid';
import { TransactionDetails } from './src/interface/ITransactions';

const app = express();
const PORT = 8000;

// Using a Map to manage multiple Agent instances
const agents: Map<string, Agent> = new Map();
const qrCodes: Map<string, string> = new Map();
const store = new Store("blankdemo.sqlite");
store.init();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/health", async (req, res) => {
  if (agents.size == 0) {
    let logins = await store.fetchAgents();
    console.log(logins);
    logins.forEach((login) => {
      let agent = new Agent(store);
      if (login.did && login.username && login.password) {
        agent.login(login.username, login.password);
        agents.set(login.did, agent);
      }
    });
    res.sendStatus(201);
    console.log("health method ", agents);
  } else {
    res.sendStatus(200);
  }
});

app.get("/fetch/:uuid", (req, res) => {
  let uuid = req.params.uuid;
  let response = qrCodes.get(uuid);

  if (!response) {
    return res.status(404).json({ message: "Request not found" });
  }

  res.json(JSON.parse(response));
});

app.get("/discover/:username", async (req, res) => {
  const username = req.params.username;
  let _did = await store.resolveUsername(username);
  res.json({ did: _did });
});

// Register a new agent for a tenant
app.post("/register", async (req, res) => {
  const { username, password, type = "ethr" } = req.body;

  const agent = new Agent(store);
  await agent.register(username, password, type);
  agents.set(agent.did, agent);

  res.json({ did: agent.did });
});

// Login an existing agent for a tenant
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const agent = new Agent(store);
  await agent.login(username, password);

  agents.set(agent.did, agent);

  res.json({ did: agent.did });
});

// Issue a credential to a target DID
app.post("/issue", async (req, res) => {
  const {
    did,
    targetDID,
    subjectData,
    credentialType,
    claimValues,
    additionalParams,
  } = req.body;
  const agent = agents.get(did);

  if (!agent) {
    return res
      .status(404)
      .json({ message: "Agent not found for this tenant." });
  }

  let result = await agent.issue(
    targetDID,
    subjectData,
    credentialType,
    claimValues,
    additionalParams
  );

  let id = uuidv4();
  qrCodes.set(id, JSON.stringify(result));

  res.json({
    ...result,
    qrcodeurl: "http://localhost:8000/fetch/" + id,
  });
});

// Request a presentation from a target DID
app.post("/request-presentation", async (req, res) => {
  const { did, targetDID, credentialTypes } = req.body;
  const agent = agents.get(did);

  if (!agent) {
    return res
      .status(404)
      .json({ message: "Agent not found for this tenant." });
  }

  const result = await agent.requestPresentation(targetDID, credentialTypes);

  let id = uuidv4();
  qrCodes.set(id, JSON.stringify(result));

  res.json({
    ...result,
    qrcodeurl: "http://localhost:8000/fetch/" + id,
  });
});

app.post("/request-presentation-status", async (req, res) => {
  const { did, id } = req.body;
  const agent = agents.get(did);

  if (!agent) {
    return res
      .status(404)
      .json({ message: "Agent not found for this tenant." });
  }

  const result = await agent.requestPresentationStatus(id);
  res.json(result);
});

// Present credentials to a target DID
app.post("/present", async (req, res) => {
  const { did, targetDID, credentials, credentialTypes, claims, id } = req.body;
  const agent = agents.get(did);

  if (!agent) {
    return res
      .status(404)
      .json({ message: "Agent not found for this tenant." });
  }

  if (credentialTypes === undefined && credentials == undefined) {
    return res.status(400).json({
      message:
        "Must provide an array of types to search from or an array of JWTs to present",
    });
  }
  let result;

  if (credentialTypes === undefined) {
    result = await agent.presentVCs(targetDID, credentials, claims, id);
  } else if (credentials === undefined) {
    result = await agent.present(targetDID, credentialTypes, claims, id);
  }

  let uuid = uuidv4();
  qrCodes.set(uuid, JSON.stringify(result));

  res.json({
    ...result,
    qrcodeurl: "http://localhost:8000/fetch/" + uuid,
  });
});

// Verify a presentation
app.post("/verify", async (req, res) => {
  const { did, vp, id } = req.body; // vp: Verifiable Presentation in JWT format
  const agent = agents.get(did);

  if (!agent) {
    return res
      .status(404)
      .json({ message: "Agent not found for this tenant." });
  }
  let result;

    try{
        if(id !== undefined){
            let storedRes = await agent.store.getSession(id)
            console.log('storedRes', storedRes)
            if(storedRes === '') return res.status(404).json({message: 'Presentation not found for id ', id})
            result = await agent.verify(storedRes);
        }else{
            result = await agent.verify(vp);
        }

    }catch{
        res.status(500).json({message: 'There was an error processing the VP, please check the id and the vp being passed in'})
    }
    

    res.json(result);
});

app.post("/save", async (req, res) => {
  const { did, vc } = req.body;
  const agent = agents.get(did);
  if (!agent) {
    return res
      .status(404)
      .json({ message: "Agent not found for this tenant." });
  }
  await agent.save(vc);
  res.sendStatus(200);
});

app.post("/delete", async (req, res) => {
  const { did, vc } = req.body;
  const agent = agents.get(did);
  if (!agent) {
    return res
      .status(404)
      .json({ message: "Agent not found for this tenant." });
  }
  await agent.delete(vc);
  res.sendStatus(200);
});

app.get("/get-credentials/:did", async (req, res) => {
  const did = req.params.did;
  const agent = agents.get(did);

  if (!agent) {
    return res
      .status(404)
      .json({ message: "Agent not found for this tenant." });
  }
  let creds = await agent.getCredentials();
  res.send({
    credentials: creds,
  });
});

app.post("/trust-registry/participant", async (req, res) => {
  const { did, name, logo, type, role } = req.body;
  store.addParticipant(did, name, logo, type, role);
  res.sendStatus(200);
});

app.get("/trust-registry/participant", async (req, res) => {
  const { did, type, role } = req.query;
  let participant
  participant = await store.fetchParticipant(
    did as string,
    type as string|undefined,
    role as string
  );
  res.send(participant);
});

app.get('/get-balance/:did', async (req,res) => {
    const did = req.params.did; 
    const agent = agents.get(did); 

    if(!agent) {
        return res.status(404).json({message: 'Agent not found for this tenant.'}); 
    }

    let balance = await agent.getBalance(did); 

    res.send(
        {
            balance:balance
        }
    )
})

app.get('/get-address/:did', async (req,res) => {
    const did = req.params.did; 
    const agent = agents.get(did); 

    if(!agent) {
        return res.status(404).json({message: 'Agent not found for this tenant.'}); 
    }

    let address = agent.getAddress(did); 

    res.send(
        {
            address:address
        }
    )
})

app.post('/transact-with-receipt', async (req,res) => {
    const txDetails:TransactionDetails = req.body; 
    const agent = agents.get(txDetails.did); 

    if(!agent) {
        return res.status(404).json({message: 'Agent not found for this tenant.'}); 
    }

    let receipt = await agent.transactWithReceipt(txDetails); 

    let uuid = uuidv4()
    qrCodes.set(uuid, JSON.stringify(receipt))


    res.json({
        ...receipt,
        qrcodeurl: "http://localhost:8000/fetch/"+uuid
    });
})



app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
