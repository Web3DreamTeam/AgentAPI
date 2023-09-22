import { EthrDIDMethod,verifyDisclosures, DIDWithKeys, JWT, createAndSignCredentialJWT, DID, CredentialSubject, createAndSignPresentationJWT, verifyPresentationJWT,verifyPresentationSDJWT, JWTService, createAndSignCredentialSDJWT, createAndSignPresentationSDJWT } from '@jpmorganchase/onyx-ssi-sdk'
import { CredentialPayload, JwtCredentialPayload } from 'did-jwt-vc';
import { getResolver as getKeyResolver} from 'key-did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { Resolver } from 'did-resolver'

interface myCredential {
    jwt: JWT,
    cred: JwtCredentialPayload,
    disclosed?: Object
}

export class Agent {

    private didEthrProvider: EthrDIDMethod;
    private didEthr!: DIDWithKeys;
    public did!: DID;
    private JWTService: JWTService
    jwts: JWT[];
    sdjwts: JWT[];
    didResolver;

    constructor() {
        const ethrProvider = {
            name: 'maticmum', 
            rpcUrl: 'https://rpc-mumbai.maticvigil.com/', 
            registry: "0x41D788c9c5D335362D713152F407692c5EEAfAae"
        }
               
        //create DID for Issuer (did:ethr)
        this.didEthrProvider = new EthrDIDMethod(ethrProvider)
        this.jwts = []
        this.sdjwts = []
        this.JWTService = new JWTService()

        const ethrResolver = getEthrResolver(ethrProvider)
        const keyResolver = getKeyResolver()
        this.didResolver = new Resolver({
            ...ethrResolver, 
            ...keyResolver})
    }

    async init(){
        this.didEthr = await this.didEthrProvider.create()
        this.did = this.didEthr.did
    }

    async createCredentialJWT(targetDID:DID, subjectData:CredentialSubject, credentialType:string[], additionalParams?:Partial<CredentialPayload>){
        let jwt = await createAndSignCredentialJWT(this.didEthr, targetDID, subjectData, credentialType, additionalParams)
        return jwt
    }

    async createCredentialSDJWT(targetDID:DID, subjectData:CredentialSubject, credentialType:string[],  claimValues: CredentialSubject, additionalParams?:Partial<CredentialPayload>,){
        let sdjwt = await createAndSignCredentialSDJWT(this.didEthr, targetDID, subjectData, credentialType, claimValues, additionalParams)
        return sdjwt
    }

    async saveJWT(jwt: JWT){
        this.jwts.push(jwt)
    }

    

    async getCredentials(){
        let credentials: myCredential[] = []
        if (this.jwts.length > 0){
            this.jwts.forEach(jwt => {
                credentials.push({
                    jwt: jwt,
                    cred: this.JWTService.decodeJWT(jwt)!.payload as JwtCredentialPayload
                })
            });
        }
        
        if (this.sdjwts.length > 0){
            this.sdjwts.forEach(async sdjwt => {
                let jwt = sdjwt.split('~')[0]
                let baseCred = this.JWTService.decodeJWT(jwt)!.payload as JwtCredentialPayload
                let disclosures = sdjwt.split('~').splice(1)
                let disclosedClaims = await verifyDisclosures(disclosures, baseCred.vc._sd_alg, baseCred.vc.credentialSubject._sd)
                credentials.push({
                    jwt: sdjwt,
                    cred: baseCred,
                    disclosed: disclosedClaims
                })

            })
        }

        return credentials
    }

    async saveSDJWT(sdjwt: JWT){
        this.sdjwts.push(sdjwt)
    }


    async requestPresentationJWT(targetDID: DID, credentialTypes: string[]){
        //todo
    }

    async createPresentationJWT(credentialTypes: string[]){
        //todo
        let vcs = this.jwts.filter((jwt:string) => this.findCredentialTypeinJWT(jwt, credentialTypes))
        return await createAndSignPresentationJWT(this.didEthr, vcs)
    }

    private findCredentialTypeinJWT(jwt: JWT, acceptableTypes: string[]): boolean{
        let jwtCredentialPayload: JwtCredentialPayload;;
        try{
            jwtCredentialPayload = this.extractCredentialfromJWT(jwt)
        }catch{
            return false
        }
    
        let verifiableCredential = jwtCredentialPayload.vc

        if (typeof verifiableCredential.type == 'string'){
            if (verifiableCredential.type in acceptableTypes) return true
        } else {
            return verifiableCredential.type.some((type: string) => acceptableTypes.includes(type))
        }
        return false
    }


    private findCredentialTypeinSDJWT(sdjwt: JWT, acceptableTypes: string[]): boolean{
        let jwtCredentialPayload: JwtCredentialPayload;;
        try{
            jwtCredentialPayload = this.extractCredentialfromSDJWT(sdjwt).jwtCredentialPayload
        }catch{
            return false
        }
    
        let verifiableCredential = jwtCredentialPayload.vc

        if (typeof verifiableCredential.type == 'string'){
            if (verifiableCredential.type in acceptableTypes) return true
        } else {
            return verifiableCredential.type.some((type: string) => acceptableTypes.includes(type))
        }
        return false
    }

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
        let vcs = this.sdjwts.filter((sdjwt:string) => this.findCredentialTypeinSDJWT(sdjwt, [credentialType]))
        if (vcs.length == 0) throw("Can't find credential of this type")
        return await createAndSignPresentationSDJWT(this.didEthr, vcs[0], claims)
    }

    async createPresentationFromJwtSDJWT(credential: string, claims: string[]){
        return await createAndSignPresentationSDJWT(this.didEthr, credential, claims)
    }

    async verifyPresentationJWT(vp: JWT){
        //todo
        return await verifyPresentationJWT(vp, this.didResolver)
    }

    async verifyPresentationSDJWT(vp: JWT){
        //todo
        return await verifyPresentationSDJWT(vp, this.didResolver)
        
    }
    
}