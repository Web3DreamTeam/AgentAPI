
## Motivation

### Cloud Agent

Custodial vs Non-Custodial wallets has been a fierce battle in web3 and SSI. Due to Onyx SDK only running in Node environments and not in React environments, we decided to take the cloud agent/custodial approach. This afford us a number of advantages:

- Familiar authentication for users
- Backup and recovery 
- Multidevice support

However we lose:

- Security/Privacy - as keys are stored and managed by the cloud agent, not the wallet/user device directly
- Some offline capabilities

With more time, we may have been able to implement creative solutions to allow key generation and storage on the edge while still using the Onyx-powered cloud agent for SSI actions.

The user wallet and all the websites utilise the single Cloud Agent to create and manage their identity and verifiable credential actions.



### Trust Registry

Governance is a key feature of a successful SSI ecosystem. Decentralisation without governance is anarchy and chaotic.

We have taken an 'informing' rather than a 'enforcing' approach to our governance system. A trust registry has been created which spans across all the industry which has a simple mapping of dids to credential types they are trusted to issue and/or verify. 

At no point do we stop an untrusted issuer from being able to issue a credential, or an untrusted issuer from being able to make a presentation request of verify a presentation. 

Instead, we inform the user (via the wallet) whether the party issuing/requesting a presentation is verified or not and it is up to the user to decide whether they want to accept it or not. Similary, a verifier can decide whether to accept or reject a presentation if the credential issuer is not a verified participant.


Within this Node project, we've also included the code for our trust registry. Ideally, this would be separated but for the sake of the POC it was easier for us to have everything in a single application to reduce complexity.

## Running the project

API for multitenanted agent, you can find the docs in the docs.yaml file. You can copy and paste this into https://editor.swagger.io/

Uses the Onyx SDK fork, which is required to run this locally. See https://github.com/Web3DreamTeam/onyx-ssi-sdk#running-the-fork for instructions on how to do this.

```
npm install
npm run start
```


