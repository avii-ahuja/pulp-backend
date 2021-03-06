const express = require('express');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

const router = express.Router();

// For facebook authentication
passport.use(new FacebookStrategy({
	clientID: global.gConfig.FB_APP_ID,
	clientSecret: global.gConfig.FB_APP_SECRET,
	callbackURL: 'https://localhost:'+global.gConfig.port+'/auth/facebook/callback', 
	profileFields: ['id', 'email', 'name', 'gender', 'friends'], // profileFields: 'birthday'
	},
	// Creates/finds FB profile and returns with callback
	function(accessToken, refreshToken, profile, done) {
		// Info on user. Check http://www.passportjs.org/docs/profile/ for more fields if needed
		let friends = profile._json.friends.data;
		let friends_id = [];
		for (let i = 0; i < friends.length; i++) {
			friends_id.push(friends[i].id);
		}
		let user_info = {
			first_name: profile.name.givenName,
			last_name: profile.name.familyName,
			//birthday: profile._json.birthday,
			gender: profile.gender,
			email: profile.emails[0].value,
			facebook_login: profile.id,
			friends: friends_id
		}
		User.findOrCreate(user_info, 'facebook', function(err, user, is_new) {
			done(err, user, is_new);
		});
	}
));

router.get('/', passport.authenticate('facebook', { scope: ['email', 'user_friends'] })); //scope: 'user_birthday'

router.get('/callback', function(req,res,next) {
	passport.authenticate('facebook', function(err, user, is_new) {
		if (err) {
			res.status(400).send("Error Logging in");
		}
		if (!user) {
			res.status(400).send("Error creating account. Email registered with Facebook already has an account.");
		}
		else {
			req.logIn(user, function(err) {
				if (err) {
					return next(err);
				}
				if (is_new == 1) {
					User.updateFriends(user.facebook_login, user.friends);
					res.status(200).redirect('/add_info');
				}
				else {
					res.status(200).send("Successfully logged in existing user");
				}
			});
		}
	})(req, res, next);
});

module.exports = router;