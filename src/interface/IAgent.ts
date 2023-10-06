import { CredentialSubject } from "@jpmorganchase/onyx-ssi-sdk";
import { CredentialPayload } from "did-jwt-vc";


export interface IssuanceMessage {
    type: "Issue",
    data: {
        target: string,
        credential: string,
        issuer: string,
    }
}

export interface PresentationRequestMessage {
    type: "PresentationRequest",
    data: {
        target: string,
        credentialTypes: string[],
        verifier: string,
        id: string,
    }
}

export interface PresentationMessage {
    type: "Presentation",
    data: {
        target: string,
        presentation: string,
        holder: string,
        id: string
    }
}

export interface IAgent {
    login(username: string, password: string): Promise<void>;
    register(username: string, password: string, type:string): Promise<void>;
    requestPresentation(targetDID: string, credentialTypes: string[]): Promise<PresentationRequestMessage>;
    issue(targetDID: string, subjectData: CredentialSubject, credentialType: string, claimValues?: CredentialSubject, additionalParams?: Partial<CredentialPayload>): Promise<IssuanceMessage>;
    present(targetDID: string, credentialTypes:string[], claims?: string[][]): Promise<PresentationMessage>;
    verify(vp: string): Promise<any>; // Specify the return type based on what verifyPresentationJWT returns
    save(jwt: string): void; // Define the type for JWT if it's different from string
}