var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var LocalStrategy = require('passport-local').Strategy;

var UserModel = require('../db.models/user.model');
var GroupModel = require('../db.models/group.model');
var OrganizationModel = require('../db.models/organization.model');

var log = require("../functions/logs");
var accountprefill = require("../functions/accountprefill");
var randommod = require("../functions/random");
var usersfunctions = require('../functions/users');
var emailfunctions 	= require("../functions/email");
var fbfunctions 	= require("../functions/fb.api");
var orgfunctions = require('../functions/organizations');

// expose this function to our app using module.exports
module.exports = function(app, passport, manager, hashids) {

    // Configure the Facebook strategy for use by Passport.
    //
    // OAuth 2.0-based strategies require a `verify` function which receives the
    // credential (`accessToken`) for accessing the Facebook API on the user's
    // behalf, along with the user's profile.  The function must invoke `cb`
    // with a user object, which will be set at `req.user` in route handlers after
    // authentication.
    passport.use('facebook', new FacebookStrategy({
            clientID: '669514259923041',
            clientSecret: 'd8b44aeaa9a26c211c7605049fe45e93',
            callbackURL: 'https://www.questionsly.com/users/login/facebook/return',
            profileFields: ['id', 'displayName', 'email', 'hometown', 'about', 'birthday','education','favorite_athletes',
                'favorite_teams','first_name','gender','inspirational_people','interested_in','is_verified','languages',
                'last_name','link','locale','location','middle_name','meeting_for','name_format','political', 'quotes',
                'relationship_status','religion','significant_other','sports','timezone','website','work']
        },
        function(accessToken, refreshToken, profile, cb) {
            // In this example, the user's Facebook profile is supplied as the user
            // record.  In a production-quality application, the Facebook profile should
            // be associated with a user record in the application's database, which
            // allows for account linking and authentication with other identity
            // providers.
            return cb(null, profile);
        }));

    // =========================================================================
    // Google OpenID SIGNIN ====================================================
    // =========================================================================
    // Use the GoogleStrategy within Passport.
    //   Strategies in passport require a `validate` function, which accept
    //   credentials (in this case, an OpenID identifier and profile), and invoke a
    //   callback with a user object.
    passport.use('google', new GoogleStrategy({
        clientID: '286013008783-kt74enhegfeu7p1hg3ej15kf5k40si2v.apps.googleusercontent.com',
        clientSecret: 'DJdZaLMJP5zMpf8ridc8u_SU',
        callbackURL: "http://www.questionsly.com/auth/google/callback"
      },
      function(accessToken, refreshToken, profile, cb) {
           return cb(null, profile);
      }
      ));

    // =========================================================================
    // LOCAL SIGNIN ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use(new LocalStrategy({
            usernameField: 'email',
            passwordField: 'password'
        },
        function(email, password, done) {
            UserModel.findOne({ "local.email": email }, function (err, user) {
                if (err) {
                    return done(err);
                } else {
                    if (!user) {
                        return done(null, false, { message: 'Unknown user' });
                    }

                    if (user.emailConfirmed != null) {
                        if (user.emailConfirmed.value === true) {
                            if (!user.validPassword(password)) {
                                //console.log("wrong password");
                                return done(null, false, {message: 'Invalid password'});
                            } else {
                                //console.log("logged in");
                                return done(null, user);
                            }

                        } else {
                            return done(null, false, { message: 'Account has not been confirmed' });
                        }

                    } else {
                        return done(null, false, { message: 'Account has not been confirmed' });
                    }


                }
            });
        }
    ));


    // Configure Passport authenticated session persistence.
    //
    // In order to restore authentication state across HTTP requests, Passport needs
    // to serialize users into and deserialize users out of the session.  In a
    // production-quality application, this would typically be as simple as
    // supplying the user ID when serializing, and querying the user record by ID
    // from the database when deserializing.  However, due to the fact that this
    // example does not have a database, the complete Facebook profile is serialized
    // and deserialized.
    passport.serializeUser(function(user, cb) {
        if (user.facebookID !== null) {
            cb(null, {facebookID: user.id});
        } else {
            cb(null, {_id: user.id});
        }
    });

    passport.deserializeUser(function(obj, cb) {
        var temp = {};
        UserModel.findOne(obj, function(err, user) {
            if (user) {
                temp.id = user._id;
                temp.location = user.location;
                temp.name = user.name;
                temp.pic = user.pic;
                temp.gender = user.gender;
                if (user.facebookID !== null) {
                    temp.fb = true;
                    temp.fbid = user.facebookID;
                } else {
                    temp.fb = false;
                    temp.fbid = null;
                }
                temp.role = user.role;
            }

            cb(err, temp);
        });
    });

    // Check if the email address belongs to an existing account or existing organization
    app.post("/users/status", function(req, res) {
        var data = req.body;

        var doesUserExist, doesOrgExist, orgName;

        var userExists = new Promise(function(resolve, reject) {
            UserModel.findOne({ $or:[ {"local.email": data.email}, {'email': data.email} ]}, function (err, user) {
                if (err) {
                    reject()
                } else {
                    doesUserExist = (user != null);
                    resolve();
                }
            })
        });

        var orgExists = new Promise(function(resolve, reject) {
            orgfunctions.getOrganizationForEmailAddress(data.email, function (err, org) {
                if (err) {
                    reject();
                } else {
                    doesOrgExist = (org != null);
                    if (doesOrgExist) {
                        orgName = org.name;
                    }
                    resolve();
                }
            });
        });

        return Promise.all([userExists, orgExists]).then(function () {
            res.json({status: 1, userExists: doesUserExist, orgExists: doesOrgExist, orgName: orgName});
        })
        .catch(function(err) {
            res.json({status: 0});
        });
    });

    app.post('/users/login/local',
        passport.authenticate('local', { failureFlash: 'Invalid email or password.' }),
        function(req, res) {
            req.session.userid = req.user._id;
            log.writeLog(req.user._id, 'local signin', req.ip);
            usersfunctions.updateUserTags(req.session.userid);
            res.json({
                status: 1,
                firstname: req.user.name.first,
                lastname: req.user.name.last,
                dbid: hashids.encodeHex(req.session.userid),
                location: req.user.location,
                picdata: req.user.pic,
                gender: req.user.gender,
                fbid:req.user.fbid,
                fb: req.user.fb,
                role: req.user.role,
            });
        });

    app.get('/auth/google',
      passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }));

    app.get('/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login' }),
      function(req, res) {
        res.redirect('/');
      });

    app.get('/users/login/facebook',
        passport.authenticate('facebook', { scope: ['public_profile', 'email', 'user_birthday', 'user_location']}));

    app.get('/users/login/facebook/return',
        passport.authenticate('facebook', { failureRedirect: '/users/login' }),
        function(req, res) {
            // does this user exist?
            UserModel.findOne({'facebookID' : req.user.id}, function (err, person) {
                if (err) {
                    console.log(err);
                } else {
                    if (person != null) {
                        // existing fb user
                        req.session.userid = person._id;
                        log.writeLog(person._id, 'fb signin - existing user', req.ip);
                        usersfunctions.updateUserTags(req.session.userid);
                        res.redirect('/');

                    } else {
                        // new fb user
                        var templocation;
                        var tempemail;

                        // run this as a promise:
                        return new Promise(function(resolve, reject) {
                            // extract email
                            if (req.user.emails) {
                                tempemail = req.user.emails[0].value;
                            } else {
                                tempemail = " ";
                            }

                            // location
                            if (req.user._json.location == null) {
                                templocation = {city: "", state: "", country: ""};
                                resolve();

                            } else {
                                // parse the information
                                fbfunctions.FBLocation(req.user._json.location.id)
                                    .then(function(templocationfb) {
                                        if (templocationfb !== null) {
                                            templocation = {city: templocationfb.city,
                                                state: templocationfb.state,
                                                country: templocationfb.country};
                                        } else {
                                            templocation = {city: "", state: "", country: ""};
                                        }
                                        resolve();
                                    })
                                    .catch(function() {
                                        templocation = {city: "", state: "", country: ""};
                                        resolve();
                                    });
                            }

                        })
                            .then(function() {

                                // write to DB
                                UserModel.create({name: {
                                        first: req.user.name.givenName,
                                        last: req.user.name.familyName,
                                        middle: req.user.name.middleName},
                                    email: tempemail,
                                    searchname: req.user.name.givenName+" "+req.user.name.familyName,
                                    location: templocation,
                                    gender: req.user.gender,
                                    dob: {fbdate: req.user.dob},
                                    pic: null,
                                    facebookID: req.user.id,
                                    facebookProfile: req.user,
                                    notifications: {networkrequest: true, formrequest: true, discussion: true, formactivity: true, summary: true},
                                    public: true}, function(err, k) {
                                    if (!err) {
                                        req.session.userid = k._id;
                                        log.writeLog(k._id, 'fb signin - new user', req.ip);
                                        res.redirect('/');
                                    }
                                });

                            })
                            .catch(function() {
                                res.redirect('/');
                            });

                    }
                }
            });
        });

    app.get('/users/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    app.post('/users/signup', function(req, res) {
        // prepare the data
        var data = req.body;
        data.pic = req.body.profilePic;

        var commToJoinWith = req.body.commToJoinWith;

        // test whether a user already exists with this email address
        var userfound = 10; // set default to 'reject' value
        var findUserPromise = new Promise(function(resolve, reject) {
            UserModel.findOne({ $or:[ {"local.email": data.email}, {'email': data.email} ]}, function (err, k) {
                if (err) {
                    reject(err);
                } else {
                    if (k != null) {
                        userfound = 1;
                        resolve();

                    } else {
                        userfound = 0;
                        resolve();
                    }
                }
            })
        });

        var existingOrg;
        var orgExistsPromise = new Promise(function(resolve, reject) {
            orgfunctions.getOrganizationForEmailAddress(data.email, function (err, org) {
                if (err) {
                    reject();
                } else {
                    existingOrg = org;
                    resolve();
                }
            });
        });

        Promise.all([findUserPromise, orgExistsPromise])
            .then(function () {

                if (userfound == 0 && existingOrg) {
                    // so no user has been found with this email address

                    // safe to create a new user
                    var testuser = new UserModel();

                    //
                    var randomkey = randommod.makeRandomEmailVerificationKey();

                    if (!data.pic) {
                        if (data.gender == "male") {
                            data.pic = "https://questionsly1.s3.amazonaws.com/0y0PSn8KAPutNjxuyYpxLsW3sAbxiUsRUBHQxPdo6EICGeaxfv.jpg";
                        } else {
                            data.pic = "https://questionsly1.s3.amazonaws.com/Z9fJ4Q7sEdsGCjInkXvpJtnlKfmieFPGftrK8E3nJFCI9d7CXl.jpg";
                        }
                    }

                    // mongodb create operation
                    UserModel.create({
                        name: {first: data.name.firstname, last: data.name.lastname},
                        searchname: data.name.firstname+" "+data.name.lastname,
                        email: data.email,
                        emailConfirmed: {value: true, key: randomkey},
                        // location: {city: data.city, state: data.state, country: data.country},
                        location: {city: "", state: "", country: ""},
                        gender: data.gender,
                        dob: data.dob,
                        pic: data.pic,
                        local: {
                            email: data.email,
                            password: testuser.generateHash(data.password)
                        },
                        facebookID: null,
                        facebookProfile: null,
                        notifications: {networkrequest: true, formrequest: true, discussion: true, formactivity: true, summary: true},
                        public: true,
                        timestamp: Date.now(),
                        organization: existingOrg._id,
                        role: accountprefill.getInitialAccountRole(data.email),
                    }, function (err, k) {
                        if (err) {
                            // failed
                            console.log("Error: manual signup - " + err);
                            res.json({status: 0});

                        } else {
                            req.session.userid = k._id;
                            // send email validation
                            var confirmlink = "https://www.questionsly.com/users/settings/confirmemail/"+randomkey;
                            // send email
                            emailfunctions.sendEmailVerification(data.email, confirmlink, data.name.firstname);

                            if (req.body.commToJoinWith) {
                                var commid = hashids.decodeHex(req.body.commToJoinWith);
                                GroupModel.findById(commid, function (err, comm) {
                                    if (err) {
                                        console.log("Could not join community at signup");
                                    } else {
                                        if (comm) {
                                            var members = comm.members;
                                            var mInd = members.findIndex(m => m == k._id);
                                            if (mInd != -1) {
                                                members.push(k._id);
                                            }
                                            comm.save(function(err) {
                                                if (err) console.log("Error saving community in login");
                                            })
                                        }
                                    }
                                });
                            }


                            // return
                            log.writeLog(k._id, 'manual signup - new user', req.ip);
                            accountprefill.doGroupsPrefill(k);
                            res.json({
                                status: 1,
                            });
                        }
                    });

                } else {
                    // failed
                    res.json({status: 0});

                }

            })
            .catch(function() {
                // failed
                res.json({status: 0});

            });

    });

};
