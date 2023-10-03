import express from 'express';
import bodyParser from 'body-parser';
import { Agent } from './src/agent';
import { Store } from './src/store';
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 8000;

// Using a Map to manage multiple Agent instances
const agents: Map<string, Agent> = new Map();
const qrCodes: Map<string, string> = new Map();
const store = new Store("test.sqlite");
store.init()

// Middleware
app.use(express.json());
app.use(cors())
app.use(express.urlencoded({ extended: true }));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/fetch/:uuid', (req,res) => {
    let uuid = req.params.uuid
    let response = qrCodes.get(uuid)

    if(!response){
        return res.status(404).json({message: 'Request not found'})
    }

    res.json(JSON.parse(response))
})

app.get('/discover/:username', async (req,res ) => {
    const username = req.params.username
    let _did = await store.resolveUsername(username)
    res.json({did: _did})
    
})

// Register a new agent for a tenant
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    const agent = new Agent(store);
    await agent.register(username, password);
    agents.set(agent.did, agent);

    res.json({ did: agent.did });
});

// Login an existing agent for a tenant
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const agent = new Agent(store);
    await agent.login(username, password);
    
    agents.set(agent.did, agent);

    res.json({ did: agent.did });
});

// Issue a credential to a target DID
app.post('/issue', async (req, res) => {
    const { did, targetDID, subjectData, credentialType, claimValues, additionalParams } = req.body;
    const agent = agents.get(did);

    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }

    let result = await agent.issue(targetDID, subjectData, credentialType, claimValues, additionalParams);

    let id = uuidv4()
    qrCodes.set(id, JSON.stringify(result))
    
    res.json({
        ...result,
        qrcodeurl: "http://localhost:8000/fetch/"+id
    });
});

// Request a presentation from a target DID
app.post('/request-presentation', async (req, res) => {
    const { did, targetDID, credentialTypes } = req.body;
    const agent = agents.get(did);

    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }

    const result = await agent.requestPresentation(targetDID, credentialTypes);

    let id = uuidv4()
    qrCodes.set(id, JSON.stringify(result))

    res.json({
        ...result,
        qrcodeurl: "http://localhost:8000/fetch/"+id
    });
});

app.post('/request-presentation-status', async (req, res) => {
    const { did, id } = req.body;
    const agent = agents.get(did);

    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }

    const result = await agent.requestPresentationStatus(id);
    res.json(result);
});

// Present credentials to a target DID
app.post('/present', async (req, res) => {
    const { did, targetDID, credentials, credentialTypes, claims, id } = req.body;
    const agent = agents.get(did);

    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }

    if (credentialTypes === undefined && credentials == undefined){
        return res.status(400).json({ message: "Must provide an array of types to search from or an array of JWTs to present" })
    }
    let result

    if(credentialTypes === undefined){
        result = await agent.presentVCs(targetDID, credentials, claims, id);
    }else if(credentials === undefined){
        result = await agent.present(targetDID, credentialTypes, claims, id);
    }

    let uuid = uuidv4()
    qrCodes.set(uuid, JSON.stringify(result))


    res.json({
        ...result,
        qrcodeurl: "http://localhost:8000/fetch/"+uuid
    });
});

// Verify a presentation
app.post('/verify', async (req, res) => {
    const { did, vp } = req.body; // vp: Verifiable Presentation in JWT format
    const agent = agents.get(did);

    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }

    const result = await agent.verify(vp);
    res.json(result);
});

app.post('/save', async (req,res) => {
    const {did, vc} = req.body
    const agent = agents.get(did)
    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }
    await agent.save(vc)
    res.sendStatus(200)
})

app.post('/delete', async (req,res) => {
    const {did, vc} = req.body
    const agent = agents.get(did)
    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }
    await agent.delete(vc)
    res.sendStatus(200)

})

app.get('/get-credentials/:did', async (req,res) => {
    const did = req.params.did
    const agent = agents.get(did)

    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }
    let creds = await agent.getCredentials()
    res.send(
        {
            credentials: creds
        }
        )
})

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
