import { EthrDIDMethod,verifyDisclosures, DIDWithKeys, JWT, createAndSignCredentialJWT, DID, CredentialSubject, createAndSignPresentationJWT, verifyPresentationJWT,verifyPresentationSDJWT, JWTService, createAndSignCredentialSDJWT, createAndSignPresentationSDJWT } from '@jpmorganchase/onyx-ssi-sdk'
import { CredentialPayload, JwtCredentialPayload } from 'did-jwt-vc';
import { getResolver as getKeyResolver} from 'key-did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { Resolver } from 'did-resolver'
import { Store } from './store';
import { unescapeLeadingUnderscores } from 'typescript';
import { IAgent, IssuanceMessage, PresentationMessage, PresentationRequestMessage } from './interface/IAgent';

interface myCredential {
    jwt: JWT,
    cred: JwtCredentialPayload,
    disclosed?: Object
}



export class Agent implements IAgent {
    private didWithKeys!: DIDWithKeys;
    public did!: DID;
    private JWTService: JWTService
    didResolver;
    store:Store

    private ethrProvider = {
        name: 'maticmum', 
        rpcUrl: 'https://rpc-mumbai.maticvigil.com/', 
        registry: "0x41D788c9c5D335362D713152F407692c5EEAfAae"
    }

    constructor(store: Store) {
        const ethrResolver = getEthrResolver(this.ethrProvider)
        const keyResolver = getKeyResolver()
        this.didResolver = new Resolver({
            ...ethrResolver, 
            ...keyResolver})
        
        this.JWTService = new JWTService()
        this.store = store
    }

    async login(username: string, password: string){
        if(await this.store.usernameExists(username)){
            this.didWithKeys = await this.store.login(username, password)
            this.did = this.didWithKeys.did
        } else {
            // throw("User not found")
            this.register(username, password)
        }
        
    }

    async register(username: string, password: string){
        if(await this.store.usernameExists(username)){
            throw("User already exists")
        }
        let didEthrProvider = new EthrDIDMethod(this.ethrProvider)
        this.didWithKeys = await didEthrProvider.create()
        this.did = this.didWithKeys.did
        this.store.register(username, password, this.did, this.didWithKeys)
    }

    async requestPresentation(targetDID: DID, credentialTypes: string[]): Promise<PresentationRequestMessage>{
        return {
            "type": "PresentationRequest",
            "data": {
                "target": targetDID,
                "credentialTypes": credentialTypes,
                "verifier": this.did
            }
            
        }
    }

    async issue(targetDID:DID, subjectData:CredentialSubject, credentialType: string, claimValues?: CredentialSubject, additionalParams?:Partial<CredentialPayload> ):Promise<IssuanceMessage>{
        return {
            "type": "Issue",
            "data": {
                "target": targetDID,
                "credential": claimValues == undefined ? await this.createCredentialJWT(targetDID, subjectData, [credentialType, "VerifiableCredential"], additionalParams) : await this.createCredentialSDJWT(targetDID, subjectData, [credentialType, "VerifiableCredential"] ,claimValues, additionalParams),
                "issuer": this.did
            }
        }
    }

    async present(targetDID: DID, credentialTypes: string | string[], claims?: string[]): Promise<PresentationMessage>{

        let sd = false
        if(claims !== undefined) sd = true
        if(typeof credentialTypes == "string" && !sd) credentialTypes = [credentialTypes]


        return {
            "type": "Presentation",
            "data": {
                "target": targetDID,
                "presentation":  sd ?  await this.createPresentationSDJWT(credentialTypes as string, claims!) : await this.createPresentationJWT(credentialTypes as string[]),
                "holder": this.did
            }
        }
    }

    async verify(vp:string){
        return await verifyPresentationJWT(vp, this.didResolver)
    }

    async save(jwt: JWT){ 
        let type = this.extractCredentialType(jwt)
        this.store.saveCredential(this.did, jwt, type)
    }

    // .
    // .
    // .
    // .
    // .
    // .
    // .
    // .
    // .
    // .
    // .
    // .
    // .

    async createCredentialJWT(targetDID:DID, subjectData:CredentialSubject, credentialType:string[], additionalParams?:Partial<CredentialPayload>){
        let jwt = await createAndSignCredentialJWT(this.didWithKeys, targetDID, subjectData, credentialType, additionalParams)
        return jwt
    }

    async createCredentialSDJWT(targetDID:DID, subjectData:CredentialSubject, credentialType:string[],  claimValues: CredentialSubject, additionalParams?:Partial<CredentialPayload>,){
        let sdjwt = await createAndSignCredentialSDJWT(this.didWithKeys, targetDID, subjectData, credentialType, claimValues, additionalParams)
        return sdjwt
    }

    extractCredentialType(jwt: string): string {
        if(jwt.indexOf("~") != 1) jwt = jwt.split('~')[0]
        let payload = this.JWTService.decodeJWT(jwt)!.payload as JwtCredentialPayload
        let arr = payload.vc.type as string[]

        for (const item of arr) {
            if (item !== "VerifiableCredential") {
                return item;
            }
        }
        return "VerifiableCredential";  // or return a default value if needed
    }

    async getCredentials(){
        let allCreds = await this.store.fetchAllCredentials(this.did)
        let jwts = allCreds.filter(item => !item.sd)
        let sdjwts = allCreds.filter(item => item.sd)

        let credentials: myCredential[] = []
        if (jwts.length > 0){
            jwts.forEach(cred => {
                credentials.push({
                    jwt: cred.jwt,
                    cred: this.JWTService.decodeJWT(cred.jwt)!.payload as JwtCredentialPayload
                })
            });
        }
        
        if (sdjwts.length > 0){
            sdjwts.forEach(async cred => {
                let jwt = cred.jwt.split('~')[0]
                let baseCred = this.JWTService.decodeJWT(jwt)!.payload as JwtCredentialPayload
                let disclosures = cred.jwt.split('~').splice(1)
                let disclosedClaims = await verifyDisclosures(disclosures, baseCred.vc._sd_alg, baseCred.vc.credentialSubject._sd)
                credentials.push({
                    jwt: cred.jwt,
                    cred: baseCred,
                    disclosed: disclosedClaims
                })

            })
        }

        return credentials
    }

    async saveSDJWT(sdjwt: JWT){
        let type = this.extractCredentialType(sdjwt)
        this.store.saveCredential(this.did, sdjwt, type)
    }


    

    async createPresentationJWT(credentialTypes: string[]){
        let vcs = await this.store.fetchAllCredentials(this.did, credentialTypes)
        return await createAndSignPresentationJWT(this.didWithKeys, vcs.map(elem => elem.jwt))
    }

    // private findCredentialTypeinJWT(jwt: JWT, acceptableTypes: string[]): boolean{
    //     let jwtCredentialPayload: JwtCredentialPayload;;
    //     try{
    //         jwtCredentialPayload = this.extractCredentialfromJWT(jwt)
    //     }catch{
    //         return false
    //     }
    
    //     let verifiableCredential = jwtCredentialPayload.vc

    //     if (typeof verifiableCredential.type == 'string'){
    //         if (verifiableCredential.type in acceptableTypes) return true
    //     } else {
    //         return verifiableCredential.type.some((type: string) => acceptableTypes.includes(type))
    //     }
    //     return false
    // }


    // private findCredentialTypeinSDJWT(sdjwt: JWT, acceptableTypes: string[]): boolean{
    //     let jwtCredentialPayload: JwtCredentialPayload;;
    //     try{
    //         jwtCredentialPayload = this.extractCredentialfromSDJWT(sdjwt).jwtCredentialPayload
    //     }catch{
    //         return false
    //     }
    
    //     let verifiableCredential = jwtCredentialPayload.vc

    //     if (typeof verifiableCredential.type == 'string'){
    //         if (verifiableCredential.type in acceptableTypes) return true
    //     } else {
    //         return verifiableCredential.type.some((type: string) => acceptableTypes.includes(type))
    //     }
    //     return false
    // }

    extractCredentialfromJWT(jwt:JWT): JwtCredentialPayload{
        let jwtCredentialPayload: JwtCredentialPayload;
        let cred = this.JWTService.decodeJWT(jwt)
        if (cred == null) throw("Invalid JWT")
        let json = cred.payload
        if (typeof json == 'string') jwtCredentialPayload = JSON.parse(json) as JwtCredentialPayload
        jwtCredentialPayload = json as JwtCredentialPayload
        return jwtCredentialPayload
    }

    extractCredentialfromSDJWT(sdjwt: JWT){
        let parts = sdjwt.split('~')
        let jwt = parts[0]
        let jwtCredentialPayload: JwtCredentialPayload;
        let cred = this.JWTService.decodeJWT(jwt)
        if (cred == null) throw("Invalid JWT")
        let json = cred.payload
        if (typeof json == 'string') jwtCredentialPayload = JSON.parse(json) as JwtCredentialPayload
        jwtCredentialPayload = json as JwtCredentialPayload

        let disclosures = parts.splice(1)
        return {jwtCredentialPayload, disclosures}
    }

    async createPresentationSDJWT(credentialType: string, claims: string[]){
        let vcs = await this.store.fetchAllCredentials(this.did, credentialType)
        if (vcs.length == 0) throw("Can't find credential of this type")
        return await createAndSignPresentationSDJWT(this.didWithKeys, vcs[0].jwt, claims)
    }

    async createPresentationFromJwtSDJWT(credential: string, claims: string[]){
        return await createAndSignPresentationSDJWT(this.didWithKeys, credential, claims)
    }

    async verifyPresentationJWT(vp: JWT){
        return await verifyPresentationJWT(vp, this.didResolver)
    }

    async verifyPresentationSDJWT(vp: JWT){
        return await verifyPresentationSDJWT(vp, this.didResolver)
        
    }
    
}