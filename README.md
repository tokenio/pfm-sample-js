# pfm-sample-js

Simple personal finance app that illustrates Token.io's Access Tokens

This sample app shows how to request Token's Access Tokens, useful
for fetching account information.

### Setup

To install, `npm install`

To run, `node server.js`

This starts up a server.

The server operates against Token's Sandbox environment by default.
This testing environment lets you try out UI and account flows without
exposing real bank accounts.

The server shows a web page at `localhost:3000`. The page has a Link with Token button.
Clicking the button displays Token UI that requests an Access Token.
When the app has an Access Token, it uses that Access Token to get account balances.

### Troubleshooting

If anything goes wrong, try to update the token SDK dependency:

`npm update @token-io/tpp`

Otherwise, email Token support: support@token.io, or one of the Token engineers.
