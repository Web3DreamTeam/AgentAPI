import express from 'express';
import bodyParser from 'body-parser';
import { Agent } from './src/agent';
import { Store } from './src/store';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3000;

// Using a Map to manage multiple Agent instances
const agents: Map<string, Agent> = new Map();
const store = new Store();

// Middleware
app.use(bodyParser.json());

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

    const result = await agent.issue(targetDID, subjectData, credentialType, claimValues, additionalParams);
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

// Present credentials to a target DID
app.post('/present', async (req, res) => {
    const { did, targetDID, credentialTypes, claims } = req.body;
    const agent = agents.get(did);

    if (!agent) {
        return res.status(404).json({ message: 'Agent not found for this tenant.' });
    }

    const result = await agent.present(targetDID, credentialTypes, claims);
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

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});
