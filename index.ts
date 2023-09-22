import { Agent } from "./agent";

const runDemo = async () => {

    let issuer = new Agent()
    await issuer.init()
    let holder = new Agent()
    await holder.init()
    let verifier = new Agent()
    await verifier.init()

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

    // // ISSUANCE

    // let jwt = await issuer.createCredentialJWT(holder.did, subjectData, [credentialType], additionalParams)
    // console.log('--- JWT ---')
    // console.log(holder.extractCredentialfromJWT(jwt))
    // holder.saveJWT(jwt)
    
    // // VERIFICATION

    // let vp = await holder.createPresentationJWT([credentialType])
    // console.log('--- VP ---')
    // console.log(vp)
    // let success = await verifier.verifyPresentationJWT(vp)
    // console.log('--- VP Outcome ---')
    // console.log(success)


    // ISSUANCE

    let sdjwt = await issuer.createCredentialSDJWT(holder.did, subjectData, [credentialType], claims, additionalParams)
    console.log('--- SDJWT ---')
    console.log(holder.extractCredentialfromSDJWT(sdjwt))
    holder.saveSDJWT(sdjwt)


    console.log('--- My Creds ---')
    let creds = await holder.getCredentials()
    console.log(creds)
    console.log('------')
    
    // VERIFICATION

    let sdvp = await holder.createPresentationSDJWT(credentialType, ['name'])
    console.log('--- SD VP ---')
    console.log(sdvp)
    let sdsuccess = await verifier.verifyPresentationSDJWT(sdvp)
    console.log('--- SD VP Outcome ---')
    console.log(sdsuccess)


    let sdvp2 = await holder.createPresentationFromJwtSDJWT(creds[0]!.jwt, ['name'])
    console.log('--- SD VP ---')
    console.log(sdvp2)
    let sdsuccess2 = await verifier.verifyPresentationSDJWT(sdvp)
    console.log('--- SD VP Outcome ---')
    console.log(sdsuccess2)



}

runDemo()

