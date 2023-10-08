import { Database, OPEN_CREATE } from "sqlite3";
import { DIDWithKeys, KEY_ALG, KeyPair } from "@jpmorganchase/onyx-ssi-sdk";
import { v4 as uuidv4 } from "uuid";

interface LoginInfo {
  did?: string;
  username?: string;
  password?: string;
}

interface AccountRow {
  username?: string;
  password?: string;
  algorithm?: KEY_ALG;
  publicKey?: string;
  privateKey?: string;
  did?: string;
}

interface CredentialRow {
  jwt: string;
  sd: boolean;
  type: string;
}

interface PresentationRow {
  presentation: string;
}

interface VerifiedParticipantRow {
  id?: string;
  did?: string;
  name?: string;
  logo?: string;
  type?: string;
  role?: string;
}

export class Store {
  db;

  constructor(filename?: string) {
    if (filename == undefined) {
      this.db = new Database(":memory:");
    } else {
      this.db = new Database(filename);
    }
  }

  close() {
    this.db.close();
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

        await this.createTable(`
                    CREATE TABLE IF NOT EXISTS Verifications (
                        id TEXT NOT NULL UNIQUE,
                        target TEXT NOT NULL,
                        presentation TEXT,
                        PRIMARY KEY(id)
                    );
                `);

        await this.createTable(`
                CREATE TABLE IF NOT EXISTS VerifiedParticipants (
                    id TEXT NOT NULL UNIQUE,
                    did TEXT NOT NULL,
                    name TEXT NOT NULL,
                    logo TEXT NOT NULL,
                    type TEXT NOT NULL,
                    role TEXT NOT NULL,
                    PRIMARY KEY(id)
                );
            `);

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async startSession(uniqueId: any, targetDID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO Verifications (id, target) 
                            VALUES (?, ?)`,
        [uniqueId, targetDID],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  updateSession(id: string, presentation: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE Verifications
            SET presentation = ?
            WHERE id = ?`,
        [presentation, id],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }
  getSession(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT presentation FROM Verifications WHERE id = ?`,
        [id],
        (err, row: PresentationRow) => {
          console.log(row);
          if (err) reject(err);
          if (!row) resolve("");
          else if (row === undefined) resolve("");
          else if (row.presentation == undefined) resolve("");
          else resolve(row.presentation);
        }
      );
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

  select(stmt: string, params: any[] = []) {
    let res: any[] = [];
    this.db.all(stmt, params, (err: any, row: any) => {
      if (err) console.log(err.message);
      res.push(row);
    });
    return res;
  }

  usernameExists(username: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 1 FROM Accounts WHERE username = ?`,
        [username],
        (err, row) => {
          if (err) reject(err);

          resolve(!!row); // Returns true if a row is found, otherwise false.
        }
      );
    });
  }

  resolveUsername(username: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT did FROM Accounts WHERE username = ?`,
        [username],
        (err, row: AccountRow) => {
          if (err) reject(err);
          if (!row) resolve("");
          else resolve(row.did!); // Returns true if a row is found, otherwise false.
        }
      );
    });
  }

    register(username: string, password: string, did: string, didWithKeys: DIDWithKeys): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('register method ', typeof didWithKeys.keyPair.publicKey)

      this.db.run(
        `INSERT INTO Accounts (username, password, did, algorithm, publicKey, privateKey)

                         VALUES (?, ?, ?, ?, ?, ?)`,

        [
          username,
          password,
          did,
          didWithKeys.keyPair.algorithm,
          didWithKeys.keyPair.publicKey,
          didWithKeys.keyPair.privateKey,
        ],

        (err) => {
          if (err) reject(err);

          resolve();
        }
      );
    });
  }

  login(username: string, password: string): Promise<DIDWithKeys> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT did, algorithm, publicKey, privateKey FROM Accounts WHERE username = ? AND password = ?`,
        [username, password],
        (err, row: AccountRow) => {
          if (err) reject(err);
          if (!row) reject(new Error("Invalid credentials"));

          console.log(row);

          const keyPair: KeyPair = {
            algorithm: row.algorithm!,
            publicKey: row.publicKey!,
            privateKey: row.privateKey!,
          };
          resolve({ did: row.did!, keyPair });
        }
      );
    });
  }

  async fetchAgents(): Promise<LoginInfo[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT did, username, password FROM Accounts;`,
        (err, rows: AccountRow[]) => {
          if (err) {
            reject(err);
            return;
          }
          const agents = rows.map((row) => ({
            did: row.did,
            username: row.username,
            password: row.password,
          }));
          resolve(agents);
        }
      );
    });
  }

  saveCredential(did: string, jwt: string, type: string): Promise<void> {
    let sd = jwt.indexOf("~") != -1;
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO Credentials (did, jwt, sd, type) VALUES (?, ?, ?, ?)`,
        [did, jwt, sd, type],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  deleteCredential(did: string, jwt: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM Credentials WHERE did = ? AND jwt = ?`,
        [did, jwt],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  fetchAllCredentials(
    did: string,
    type?: string | string[]
  ): Promise<CredentialRow[]> {
    return new Promise((resolve, reject) => {
      let query = `SELECT jwt, sd, type FROM Credentials WHERE did = ?`;
      const params = [did];

      if (type) {
        if (Array.isArray(type)) {
          query += ` AND type IN (${type.map(() => "?").join(", ")})`;
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

  addParticipant(
    did: string,
    name: string,
    logo: string,
    type: string,
    role: string
  ): void {
    let id = uuidv4();
    this.db.run(
      `INSERT INTO VerifiedParticipants (id, did, name, logo, type, role) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, did, name, logo, type, role]
    );
  }

  fetchParticipant(
    did: string,
    type: string|undefined,
    role: string
  ): Promise<VerifiedParticipantRow> {
    return new Promise((resolve, reject) => {
      if (type !== undefined){
        this.db.get(
          `SELECT did, name, logo FROM VerifiedParticipants WHERE did = ? AND type = ? AND role = ?`,
          [did, type, role],
          (err, row: VerifiedParticipantRow) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      }else{
        this.db.get(
          `SELECT did, name, logo FROM VerifiedParticipants WHERE did = ? AND role = ?`,
          [did, role],
          (err, row: VerifiedParticipantRow) => {
            if (err) reject(err);
            resolve(row);
          }
        );
      }
      
    });
  }
}
