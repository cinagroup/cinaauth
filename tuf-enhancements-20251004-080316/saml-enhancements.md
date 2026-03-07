# Enhancements found in: src\methods\saml\mod-TUF-Laptop.rs
# Size difference: +221 bytes
# Analysis date: 10/04/2025 08:03:16

## Line 109 difference:
Working: struct SamlResponse {
TUF-Laptop: #[allow(dead_code)]

## Line 110 difference:
Working:     #[serde(rename = "Issuer")]
TUF-Laptop: struct SamlResponse {

## Line 111 difference:
Working:     issuer: Option<SamlIssuer>,
TUF-Laptop:     #[serde(rename = "Issuer")]

## Line 112 difference:
Working:     #[serde(rename = "Assertion")]
TUF-Laptop:     issuer: Option<SamlIssuer>,

## Line 113 difference:
Working:     assertions: Option<Vec<SamlAssertionXml>>,
TUF-Laptop:     #[serde(rename = "Assertion")]

## Line 114 difference:
Working: }
TUF-Laptop:     assertions: Option<Vec<SamlAssertionXml>>,

## Line 115 difference:
Working: 
TUF-Laptop: }

## Line 116 difference:
Working: #[derive(Debug, Deserialize)]
TUF-Laptop: 

## Line 117 difference:
Working: struct SamlIssuer {
TUF-Laptop: #[derive(Debug, Deserialize)]

## Line 118 difference:
Working:     #[serde(rename = "$text")]
TUF-Laptop: struct SamlIssuer {

## Line 119 difference:
Working:     value: String,
TUF-Laptop:     #[serde(rename = "$text")]

## Line 120 difference:
Working: }
TUF-Laptop:     value: String,

## Line 121 difference:
Working: 
TUF-Laptop: }

## Line 122 difference:
Working: #[derive(Debug, Deserialize)]
TUF-Laptop: 

## Line 123 difference:
Working: struct SamlAssertionXml {
TUF-Laptop: #[derive(Debug, Deserialize)]

## Line 124 difference:
Working:     #[serde(rename = "Issuer")]
TUF-Laptop: struct SamlAssertionXml {

## Line 125 difference:
Working:     issuer: SamlIssuer,
TUF-Laptop:     #[serde(rename = "Issuer")]

## Line 126 difference:
Working:     #[serde(rename = "Subject")]
TUF-Laptop:     issuer: SamlIssuer,

## Line 127 difference:
Working:     subject: Option<SamlSubject>,
TUF-Laptop:     #[serde(rename = "Subject")]

## Line 128 difference:
Working:     #[serde(rename = "AttributeStatement")]
TUF-Laptop:     subject: Option<SamlSubject>,

## Line 129 difference:
Working:     attribute_statements: Option<Vec<SamlAttributeStatement>>,
TUF-Laptop:     #[serde(rename = "AttributeStatement")]

## Line 130 difference:
Working:     #[serde(rename = "AuthnStatement")]
TUF-Laptop:     attribute_statements: Option<Vec<SamlAttributeStatement>>,

## Line 131 difference:
Working:     authn_statements: Option<Vec<SamlAuthnStatement>>,
TUF-Laptop:     #[serde(rename = "AuthnStatement")]

## Line 132 difference:
Working:     #[serde(rename = "Conditions")]
TUF-Laptop:     authn_statements: Option<Vec<SamlAuthnStatement>>,

## Line 133 difference:
Working:     conditions: Option<SamlConditions>,
TUF-Laptop:     #[serde(rename = "Conditions")]

... (truncated - too many differences)
