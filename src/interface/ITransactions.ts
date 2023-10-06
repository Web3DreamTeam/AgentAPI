export interface TransactionDetails {
    did:string; 
    targetDID:string; 
    value:string; 
    smartContractAddress?:string
    calldata?:string; 
}