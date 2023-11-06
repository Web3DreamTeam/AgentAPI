export interface UtilityContractCredential {
    phoneNumber:string; 
    name:string; 
    address:string; 
    country:string;
    state:string;
    city:string
    zipCode:string;
    accountNumber:string; 
    companyName: string; 
}

export interface PassportCredential {
    firstName:string; 
    lastName:string; 
    dateOfBirth:string; 
    nationality:string; 
    issuanceCountry:string; 
    passportNumber:string; 
    gender:string;
}

export interface EmploymentCredential {
    firstName:string; 
    lastName:string; 
    jobTitle:string; 
    employerName:string; 
    employerAddress:string; 
    salary:string
}

export interface BusinessLicenceCredential {
    legalName: string; 
    taxIdentificationNumber:string; 
    licenseNumber:string; 
    mailingAddress:string; 
    city:string;
    zipCode:string; 
}

export interface IncomeStatementCredential {
    legalName:string; 
    statementId: string; 
    year:string; 
    grossProfit:string;
    operatingExpenses:string;
    taxRate:string; 
    incomeBeforeTaxes:string; 
    incomeAfterTaxes:string; 
}

export interface PharmaProductCredential {
    id:string; 
    GTIN:string;
    SERIAL:string; 
    LOT:string; 
    EXP:string; 
}

export interface ReceiptCredential {
    id:string; 
    date:string; 
    paymentMethod:string; 
    buyer:string;
    seller:string; 
    total:string;
}