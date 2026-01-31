const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/google/callback`
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if user already exists with this Google ID
                let user = await User.findOne({ 'socialLogins.google': profile.id });

                if (!user) {
                    // Check if user exists with this email
                    user = await User.findOne({ email: profile.emails[0].value });

                    if (user) {
                        // Link Google account to existing user
                        user.socialLogins = user.socialLogins || {};
                        user.socialLogins.google = profile.id;
                        if (!user.avatar && profile.photos && profile.photos[0]) {
                            user.avatar = profile.photos[0].value;
                        }
                        await user.save();
                    } else {
                        // Create new user
                        user = await User.create({
                            firstName: profile.name.givenName || profile.displayName.split(' ')[0],
                            lastName: profile.name.familyName || profile.displayName.split(' ').slice(1).join(' ') || 'User',
                            email: profile.emails[0].value,
                            password: Math.random().toString(36).slice(-16) + 'Aa1!', // Random secure password
                            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : undefined,
                            socialLogins: { google: profile.id },
                            isEmailVerified: true,
                            role: 'student' // Default role for OAuth users
                        });
                    }
                }

                const token = generateToken(user._id);
                return done(null, { user, token });
            } catch (error) {
                return done(error, null);
            }
        }));
    console.log('✅ Google OAuth configured');
} else {
    console.warn('⚠️ Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
}

// Configure GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5001'}/api/auth/github/callback`,
        scope: ['user:email']
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Get primary email from GitHub
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.local`;

                // Check if user already exists with this GitHub ID
                let user = await User.findOne({ 'socialLogins.github': profile.id });

                if (!user) {
                    // Check if user exists with this email
                    user = await User.findOne({ email });

                    if (user) {
                        // Link GitHub account to existing user
                        user.socialLogins = user.socialLogins || {};
                        user.socialLogins.github = profile.id;
                        if (!user.avatar && profile.photos && profile.photos[0]) {
                            user.avatar = profile.photos[0].value;
                        }
                        await user.save();
                    } else {
                        // Create new user
                        const nameParts = (profile.displayName || profile.username || 'GitHub User').split(' ');
                        user = await User.create({
                            firstName: nameParts[0],
                            lastName: nameParts.slice(1).join(' ') || 'User',
                            email: email,
                            password: Math.random().toString(36).slice(-16) + 'Aa1!', // Random secure password
                            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : undefined,
                            socialLogins: { github: profile.id },
                            isEmailVerified: true,
                            role: 'student' // Default role for OAuth users
                        });
                    }
                }

                const token = generateToken(user._id);
                return done(null, { user, token });
            } catch (error) {
                return done(error, null);
            }
        }));
    console.log('✅ GitHub OAuth configured');
} else {
    console.warn('⚠️ GitHub OAuth not configured (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET)');
}

// Serialize user for session (not used but required by passport)
passport.serializeUser((data, done) => {
    done(null, data);
});

passport.deserializeUser((data, done) => {
    done(null, data);
});

module.exports = passport;
