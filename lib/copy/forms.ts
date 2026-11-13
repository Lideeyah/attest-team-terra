export const agreementFields = [
 {key:'percentage',label:'Community share (% of project income)',help:'The total percentage promised to the community in the project agreement.',type:'number',required:true},
 {key:'householdPercent',label:'Share paid directly to households (%)',help:'The percentage of project income paid to individual households.',type:'number',required:true},
 {key:'fundPercent',label:'Share paid into a community fund (%)',help:'Use 0 if the agreement does not include a separate community fund.',type:'number',required:true},
 {key:'basis',label:'Calculated from',help:'Choose whether agreed costs are taken out before calculating the community share.',type:'select',required:true,options:[['gross','Total income (before costs)'],['net','Income after agreed costs']]},
 {key:'method',label:'How households share it',help:'Use the sharing rule stated in the agreement. Unequal shares need agreed household weights.',type:'select',required:true,options:[['equal','Equal amounts to every household'],['weighted','By another agreed rule']]},
 {key:'reportingCadence',label:'How often you report',help:'Choose the reporting frequency stated in the agreement.',type:'select',required:true,options:[['monthly','Monthly'],['quarterly','Quarterly'],['annual','Yearly']]},
 {key:'deadlineDays',label:'Pay within (days) of receiving income',help:'Enter the agreed payment deadline. Use 0 only when no deadline is specified.',type:'number',required:true},
 {key:'beneficiaries',label:'Who receives the community share',help:'List the households, communities or groups named in the agreement.',type:'textarea',required:false},
 {key:'deductions',label:'Costs taken out before the share is worked out',help:'List only the costs allowed by the agreement. Leave blank if none are specified.',type:'textarea',required:false},
 {key:'allocationNotes',label:'Notes about how the money is split',help:'Explain any agreed weights, eligibility requirements or other sharing rules.',type:'textarea',required:false},
] as const;

const fields:Record<string,{label:string;help:string}>={
 'bvn':{label:'Bank verification number (BVN)',help:'Enter the 11-digit number used for the bank identity check. It is handled privately.'},
 'first name':{label:'First name',help:'Enter the first name shown on the person’s identity record.'},
 'last name':{label:'Last name',help:'Enter the family name shown on the person’s identity record.'},
 'date of birth':{label:'Date of birth',help:'Choose the date shown on the identity record used for verification.'},
 'phone':{label:'Phone number',help:'Use the full phone number, including country code, for example +2348000000001.'},
 'latitude':{label:'Latitude (decimal degrees)',help:'Enter a coordinate between -90 and 90, for example 6.5244.'},
 'longitude':{label:'Longitude (decimal degrees)',help:'Enter a coordinate between -180 and 180, for example 3.3792.'},
 'gross revenue':{label:'Total project income before costs (₦)',help:'Enter confirmed project income in naira, using two decimal places, for example 100000.00.'},
 'eligible net revenue':{label:'Income after agreed costs (₦)',help:'Subtract only costs allowed by the agreement. Use two decimal places.'},
 'gross revenue (ngn)':{label:'Total project income before costs (₦)',help:'Enter the project income for this reporting period, for example 100000.00.'},
 'net revenue (ngn)':{label:'Income after agreed costs (₦)',help:'Enter income remaining after costs allowed by the community agreement.'},
 'funding allocated (ngn)':{label:'Funds available for this distribution (₦)',help:'Enter the amount reserved for these payments. Bank charges are tracked separately.'},
 'reporting period':{label:'Reporting period',help:'Use a year, quarter or month, for example 2026, 2026-Q4 or 2026-11.'},
 'invited email':{label:'Invited email',help:'Use the email address the project operator entered on your invitation.'},
 'password (12 or more characters)':{label:'Password',help:'Choose at least 12 characters. You will use this password to sign in.'},
 'household share percent':{label:'Share paid directly to households (%)',help:'Enter the share of project income going directly to households.'},
 'community fund share percent':{label:'Share paid into a community fund (%)',help:'Use 0 when there is no separate community fund.'},
 'allocation method':{label:'How households share it',help:'Choose equal amounts or the agreed household weights.'},
 'verified weights if required':{label:'Agreed household weights',help:'Optional. Enter one member reference and whole-number weight per line, separated by a comma.'},
 'release condition':{label:'When payments can start',help:'Choose whether payments begin after income arrives or after an agreed milestone.'},
 'automation state':{label:'Automatic payments',help:'Save a draft, turn on future payments, or pause new payments.'},
 'review reason':{label:'Why are you making this change?',help:'Explain the agreement or evidence supporting this change.'},
 'registry project reference':{label:'Project registry reference',help:'Enter the project reference used by the carbon registry.'},
 'your project':{label:'Choose your project',help:'Select the project whose saved setup you want to continue.'},
 'account number':{label:'Bank account number',help:'Enter the 10-digit account number provided by the bank.'},
 'six-digit bank code':{label:'Bank code',help:'Enter the bank’s six-digit code, including any leading zeros.'},
 'email':{label:'Email',help:'Use the email address you will sign in with. No email confirmation is required.'},
 'password':{label:'Password',help:'Keep your password private. New passwords need at least 12 characters.'},
 'organisation':{label:'Organisation name',help:'Enter the organisation responsible for operating this project.'},
 'review evidence and reason':{label:'Reason for approval',help:'Describe what you checked against the project agreement. Use at least 10 characters.'},
};
export function formCopy(label:string){const readable=label.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');return fields[readable.toLowerCase()]??{label:readable.charAt(0).toUpperCase()+readable.slice(1),help:`Enter ${readable.charAt(0).toLowerCase()+readable.slice(1)} as recorded in the project or supporting evidence.`};}
export const moneyViews=[['wallet','Wallet'],['automation','Payment rules'],['documents','Agreement & documents'],['ledger','Funds history'],['messages','Messages']] as const;
export const incomeBasis=(value:unknown)=>value==='net'?'Income after agreed costs':'Total income (before costs)';
export const reportingFrequency=(value:unknown)=>({monthly:'Monthly',quarterly:'Quarterly',annual:'Yearly',staged:'At agreed milestones'}[String(value)]??'Not specified');
export const csvFieldCopy:Record<string,{label:string;help:string}>={
 first_name:{label:'First name column',help:'Choose the column containing each person’s first name.'},
 last_name:{label:'Last name column',help:'Choose the column containing each person’s family name.'},
 date_of_birth:{label:'Date of birth column',help:'Choose dates written as year-month-day, for example 1990-01-31.'},
 phone:{label:'Phone number column',help:'Choose full phone numbers including the country code, for example +2348000000001.'},
 identity_type:{label:'Identity document type column',help:'Choose the column containing BVN or NIN for each person.'},
 identity_number:{label:'Identity number column',help:'Choose the column containing each person’s 11-digit BVN or NIN. These values are handled privately.'},
 consent:{label:'Permission to enrol column',help:'Choose the column containing true only where the person gave permission. Never assume permission.'},
 captured_at:{label:'Collection date and time column',help:'Choose the column recording when each person’s details were originally collected.'},
};
