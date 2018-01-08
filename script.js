'use strict';
var tokenId = '';
Token.styleButton({            // Sets up the Link with Token button
    id: 'tokenAccessBtn',
    label: 'Link with Token'
}).bindAccessButton(
    {
        alias: {
            type: 'EMAIL',
            value: '{alias}'        // address filled in by server.js
        },
        resources: [
            { type: Token.RESOURCE_TYPE_ALL_ACCOUNTS },
            { type: Token.RESOURCE_TYPE_ALL_BALANCES },
        ]
    },
    function(data) { // success, have access token
        console.log('success callback got ' + JSON.stringify(data));
        if (data.tokenId) {
            tokenId = data.tokenId;
            $.get(`/fetch-data`, {tokenId: tokenId}); // pass token id to server code
        }
    },
    function(error) { // fail
        alert('Something\'s wrong! ' + error);
    }
);
