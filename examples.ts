import { Agent } from "./src/agent";
import { Store } from "./src/store";

const runDemo = async () => {
    let store = new Store()
    await store.init()

    let issuer = new Agent(store)
    await issuer.login("issuer", "123")
    let holder = new Agent(store)
    await holder.login("holder", "123")
    let verifier = new Agent(store)
    await verifier.login("verifier", "123")

    let credentialType = "Booking"
    let subjectData = {
        'name': 'John Doe',
        'roomType': 'Superior Deluxe',
        'checkIn': '2024-01-01T11:00:00Z',
        'checkOut' : '2024-01-04T11:00:00Z',
        'dateOfBirth': '1998-01-04',
        'smoker': false,
        'accessibilityNeeds': false,
    }
    const additionalParams = {
        expirationDate: "2024-01-04T11:00:00Z",
    }

    // These are the claims that will be hidden by default in a presentation, unless the user decides to share them (in this case, all personal data)
    let claims = {
        'name': 'John Doe',
        'dateOfBirth': '1998-01-04',
        'smoker': false,
        'accessibilityNeeds': false,
    }

    // ISSUANCE

    let issuance_msg = await issuer.issue(holder.did, subjectData, credentialType, undefined, additionalParams)
    console.log('--- JWT ---')
    console.log(issuance_msg)
    holder.save(issuance_msg.data.credential)

    console.log('--- My Creds ---')
    let creds = await holder.getCredentials()
    console.log(creds)
    console.log('------')
    
    // VERIFICATION

    let present = await verifier.requestPresentation(holder.did, [credentialType])
    console.log(present)

    let vp = await holder.present(present.data.verifier, credentialType)
    console.log('--- VP ---')
    console.log(vp)
    let success = await verifier.verify(vp.data.presentation)
    console.log('--- VP Outcome ---')
    console.log(success)


    // ISSUANCE

    // let sdjwt = await issuer.createCredentialSDJWT(holder.did, subjectData, [credentialType], claims, additionalParams)
    // console.log('--- SDJWT ---')
    // console.log(holder.extractCredentialfromSDJWT(sdjwt))
    // holder.saveSDJWT(sdjwt)


    // console.log('--- My Creds ---')
    // let creds = await holder.getCredentials()
    // console.log(creds)
    // console.log('------')
    
    // // VERIFICATION

    // let sdvp = await holder.createPresentationSDJWT(credentialType, ['name'])
    // console.log('--- SD VP ---')
    // console.log(sdvp)
    // let sdsuccess = await verifier.verifyPresentationSDJWT(sdvp)
    // console.log('--- SD VP Outcome ---')
    // console.log(sdsuccess)


    // let sdvp2 = await holder.createPresentationFromJwtSDJWT(creds[0]!.jwt, ['name'])
    // console.log('--- SD VP ---')
    // console.log(sdvp2)
    // let sdsuccess2 = await verifier.verifyPresentationSDJWT(sdvp)
    // console.log('--- SD VP Outcome ---')
    // console.log(sdsuccess2)



}

runDemo()

