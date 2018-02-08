var log = require("./logs");
var FB = require('fb');
FB.options({appId: '669514259923041', appSecret: '5c8625d2b8d7a5edd938725ab0490e86'});

exports.FBLocation = function FBLocation(locid) {
    // get location info
    new Promise(function(resolve, reject) {
        FB.api('oauth/access_token', {
            client_id: '669514259923041',
            client_secret: '5c8625d2b8d7a5edd938725ab0490e86',
            grant_type: 'client_credentials'
        }, function (res) {
            if (!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                reject();
            } else {
                FB.setAccessToken(res.access_token);
                resolve();
            }
        })
    })
        .then(function() {
            FB.api(locid, { fields: 'location' }, function (res) {
                if(!res || res.error) {
                    console.log(!res ? 'error occurred' : res.error);
                    return null;
                } else {
                    console.log(res);
                    return res.location;
                }
            });

        });

};

