# Description 
This is a backend for the application or web service suspicious encounter. It has a login feature and user can interact with it. 

# Features
## Server
Main listening point
Pass all request to the route
Establish connection database
Configure express such as cookie or cros 

## Apiroute
Take all request and route to control
This is where swagger live
## login/ passport
A route for login and also controls passport
## Control
Process all request for the application
Also edits database
Uses helping method for Util
Uses information from login/ passport to authenticate user
### List of request call: 
- newuser: Register a new user (post)
- user: login a user (post)
- logout: logout a user (get)
- encounterOne: User requests to view a specific encounter post
- checksession: Checks whether the current session is authenticated
- encounter: Gets all the posted encounter. Query is allowed.
- myEncounter: Gets all the encounters posted by the authenticated user
- encounter: Creates new encounter
- 

## Database
Mongoose database more information in data section
## Util
Helping function to help process request
