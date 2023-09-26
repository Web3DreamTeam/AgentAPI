import { ethers } from "ethers";

// change to the network we wanr
const rpcURL = "https://sepolia.infura.io/v3/9dca3d6945ad4cc4a18741bf02b4e44e";

export const provider: ethers.providers.JsonRpcProvider =  new ethers.providers.JsonRpcProvider(rpcURL); 
