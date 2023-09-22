import { Database, OPEN_CREATE } from "sqlite3";
import { DIDWithKeys, KEY_ALG, KeyPair } from "@jpmorganchase/onyx-ssi-sdk";

interface AccountRow {
    algorithm: KEY_ALG;
    publicKey: string;
    privateKey: string;
    did: string;
}

interface CredentialRow {
    jwt: string;
    sd: boolean;
    type: string;
}


export class Store{

    db

    constructor(filename?: string){
        if(filename == undefined){
            this.db = new Database(':memory:')
        }else{
            this.db = new Database(filename)
        }
        
    }

    close(){
        this.db.close()
    }

    async init(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.createTable(`
                    CREATE TABLE IF NOT EXISTS Credentials (
                        did TEXT NOT NULL,
                        jwt TEXT NOT NULL,
                        sd BOOLEAN NOT NULL,
                        type TEXT NOT NULL,
                        FOREIGN KEY(did) REFERENCES Accounts(did)
                    );
                `);
    
                await this.createTable(`
                    CREATE TABLE IF NOT EXISTS Accounts (
                        username TEXT NOT NULL UNIQUE,
                        password TEXT NOT NULL,
                        did TEXT NOT NULL UNIQUE,
                        algorithm TEXT NOT NULL,
                        publicKey TEXT NOT NULL,
                        privateKey TEXT NOT NULL,
                        PRIMARY KEY(did)
                    );
                `);
    
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }
    
    private createTable(sql: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run(sql, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    


    select(stmt:string, params:any[]=[]){
        let res: any[] = []
        this.db.all(stmt, params,
            (err:any, row:any) => {
                if(err) console.log(err.message)
                res.push(row)
            }
        )
        return res
    }

    usernameExists(username: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT 1 FROM Accounts WHERE username = ?`, [username], (err, row) => {
                if (err) reject(err);
                resolve(!!row);  // Returns true if a row is found, otherwise false.
            });
        });
    }
    

    register(username: string, password: string, did: string, didWithKeys: DIDWithKeys): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(typeof didWithKeys.keyPair.publicKey)
            // const publicKey = (typeof didWithKeys.keyPair.publicKey === 'string')
            //     ? new TextEncoder().encode(didWithKeys.keyPair.publicKey)
            //     : didWithKeys.keyPair.publicKey;
                
            // const privateKey = (typeof didWithKeys.keyPair.privateKey === 'string')
            //     ? new TextEncoder().encode(didWithKeys.keyPair.privateKey)
            //     : didWithKeys.keyPair.privateKey;

            this.db.run(`INSERT INTO Accounts (username, password, did, algorithm, publicKey, privateKey) 
                         VALUES (?, ?, ?, ?, ?, ?)`, 
                         [username, password, did, didWithKeys.keyPair.algorithm, didWithKeys.keyPair.publicKey, didWithKeys.keyPair.privateKey], 
                         (err) => {
                             if (err) reject(err);
                             resolve();
                         });
        });
    }

    login(username: string, password: string): Promise<DIDWithKeys> {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT did, algorithm, publicKey, privateKey FROM Accounts WHERE username = ? AND password = ?`, 
                        [username, password], 
                        (err, row: AccountRow) => {
                            if (err) reject(err);
                            if (!row) reject(new Error("Invalid credentials"));

                            console.log(row)
                            
                            const keyPair: KeyPair = {
                                algorithm: row.algorithm,
                                publicKey: row.publicKey,
                                privateKey: row.privateKey
                            };
                            resolve({ did: row.did, keyPair });
                        });
        });
    }

    saveCredential(did: string, jwt: string, type: string): Promise<void> {
        let sd = (jwt.indexOf("~") != -1)
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO Credentials (did, jwt, sd, type) VALUES (?, ?, ?, ?)`, [did, jwt, sd, type], (err) => {
                if (err) reject(err);
                resolve();
            });
        });
    }

    fetchAllCredentials(did: string, type?: string | string[]): Promise<CredentialRow[]> {
        return new Promise((resolve, reject) => {
            let query = `SELECT jwt, sd, type FROM Credentials WHERE did = ?`;
            const params = [did];
    
            if (type) {
                if (Array.isArray(type)) {
                    query += ` AND type IN (${type.map(() => '?').join(', ')})`;
                    params.push(...type);
                } else {
                    query += ` AND type = ?`;
                    params.push(type);
                }
            }
    
            this.db.all(query, params, (err, rows: CredentialRow[]) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    }



}