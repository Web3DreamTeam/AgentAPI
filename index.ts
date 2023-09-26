import express from 'express';
import bodyParser from 'body-parser';
import { Agent } from './src/agent';
import { Store } from './src/store';
import cors from 'cors'
import { IssuanceMessage } from './src/interface/IAgent';

const app = express();
const PORT = 8000;

// Using a Map to manage multiple Agent instances
const agents: Map<string, Agent> = new Map();
const store = new Store("test.sqlite");
store.init()

// Middleware
app.use(bodyParser.json());
app.use(cors())

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
    
    res.json(result);
});

// Request a presentation from a target DID
app.post('/request-presentation', async (req, res) => {
    const { did, targetDID, credentialTypes } = req.body;
    const agent = agents.get(did);

    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }

    const result = await agent.requestPresentation(targetDID, credentialTypes);
    res.json(result);
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
    res.json(result);
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

app.get('/get-credentials/:did', async (req,res) => {
    const did = req.params.did
    const agent = agents.get(did)

    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }
    let creds = await agent.getCredentials()
    res.send(creds)
})

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
