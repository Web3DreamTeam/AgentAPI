export interface UtilityContractCredential {
    phonestring:string; 
    startDate:string; 
    accountHolderName:string; 
    accountHolderAddress:string; 
    accountstring:string; 
    companyName: string; 
}

export interface PassportCredential {
    firstName:string; 
    lastName:string; 
    issueDate:string; 
    expiryDate:string; 
    dateOfBirth:string; 
    nationality:string; 
    issuanceCountry:string; 
    passportstring:string; 
}

export interface EmploymentCredential {
    firstName:string; 
    lastName:string; 
    startDate:string;
    jobTitle:string; 
    employerName:string; 
    employerAddress:string; 
    salary:string
}

export interface BusinessLicenceCredential {
    businessLegalName: string; 
    taxIdentificationstring:string; 
    issueDate:string; 
    licensestring:string; 
    mailingAddress:string; 
    city:string;
    zipCode:string; 
}

export interface IncomeYearlyStatementCredential {
    businessLegalName:string; 
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
    receiptstring:string; 
    date:string; 
    paymentMethod:string; 
    shipToCompanyName:string;
    sellerCompanyName:string; 
    total:string;
}