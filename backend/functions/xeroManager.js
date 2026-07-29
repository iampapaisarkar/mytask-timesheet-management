import { XeroClient } from "xero-node";

let xero;
export const setupXero = () => {
  // Initialize without a secret if you want to be strictly PKCE compliant,
  xero = new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET, // You can keep this
    redirectUris: [process.env.XERO_CALLBACK_URL],
    scopes: process.env.XERO_SCOPES ? process.env.XERO_SCOPES.split(" ") : [],
    httpTimeout: 3000, // Optional: good practice
  });
};

export const getXero = () => {
  if (!xero) {
    setupXero(); // Auto-initialize if someone calls getXero before setup
  }
  return xero;
};
