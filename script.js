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
            $('#fetch').prop('disabled', false);
        }
    },
    function(error) { // fail
        alert('Something\'s wrong! ' + error);
    }
);

function doFetch() {
    $.getJSON(
        `/fetch-data`,
        {tokenId: tokenId},
        function (gotJSON) {
            if (gotJSON.replacedBy) {
                tokenId = gotJSON.replacedBy;
                doFetch();
                return;
            }
        }
    );
}

$('#fetch').click(doFetch);
