import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import apiroute from './routes/apiroute.js';
import loginroute from './routes/login.js';
import connectdb from './database/config.js';
import passport from 'passport';
import session from 'express-session';
import './passportconfig.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';


//standard express and should run at local host 3001

const url = process.env.frontend;
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors({ origin: url, credentials: true }));
app.set('trust proxy', 1);
app.use(
  session({
    // `secret` for session ID cookie.
    //  Uses the SESSION_SECRET 
    proxy : true, 
    secret: process.env.SESSION_SECRET || "your_secret_key",
    
    resave: false,
    // `saveUninitialized: false` means that a session that is new but not modified will not be saved.
    // This is useful for reducing server storage usage and complying with cookie laws.
    saveUninitialized: false,
    cookie: {
      // `secure: true` ensures the cookie is only sent over HTTPS. This should be true in production.
      // It's set based on the NODE_ENV environment variable.
      secure: true,
      // `maxAge` sets the maximum age of the cookie
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      // `sameSite: 'strict'` helps protect against CSRF (Cross-Site Request Forgery) attacks
      // by restricting when the browser sends the cookie.
      sameSite: "none",
    },
  })
);


app.use(express.json());
// used swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // load the swagger ui page on the provided endpoint with the swagger spec we have configured



app.use(passport.initialize());

app.use(passport.session());
// In non-production environments, accept an Authorization header as mock authentication.
// This middleware is added early so route-level `ensureAuthenticated` checks see it.
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const authHeader = req.get("Authorization") || req.get("authorization");
    if (authHeader) {
      req.isAuthenticated = () => true;
      req.user = { username: "test-user", role: "admin" };
    }
    next();
  });
}
connectdb();

// static front end in order to run well with the passport
//app.use(express.static('../Frontend'));

// main route one for login the to other for note 
app.use('/', apiroute);
app.use('/login', loginroute);





app.listen(PORT, () =>
  console.log(`Example app listening at http://localhost:${PORT}`)
);

export default app;