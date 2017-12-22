# pf-sample-js

Simple personal finance app that illustrates Token.io's Access Tokens

This sample app shows how to use Token's Access Tokens to inform a personal finance app.

### Setup

To install, `npm install`

To run, `node server.js`

This starts up a server.

The first time you run the server, it creates a new Member (Token user account).
It saves the Member's private keys in the `keys` directory.
In subsequent runs, the server uses this ID these keys to log the Member in.

The server operates in Token's Sandbox environment. This testing environment
lets you try out UI and account flows without exposing real bank accounts.

The server shows a web page at `localhost:3000`. The page has a Link with Token button.
Clicking the button requests an Access Token, which the app can later use to fetch
account information. Once the app has an Access Token, click the Fetch button
to get account balances.

This code uses a publicly-known developer key (the devKey line in the
initializeSDK method). This normally works, but don't be surprised if
it's sometimes rate-limited or disabled. If your organization will do
more Token development and doesn't already have a developer key, contact
Token to get one.

### Troubleshooting

If anything goes wrong, try to update the token SDK dependency:

`npm update token-io`

Otherwise, email Token support: support@token.io, or one of the Token engineers.
